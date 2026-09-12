import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from '@/env'

const DATA_KEY_MIN_LENGTH = 32

function getDataKey(): Buffer {
  const value = env.EASYMD_WECHAT_DATA_KEY?.trim() ?? ''
  if (value.length < DATA_KEY_MIN_LENGTH) {
    throw new Error('EASYMD_WECHAT_DATA_KEY must contain at least 32 characters.')
  }
  return createHash('sha256').update(value, 'utf8').digest()
}

function encode(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url')
}

function decode(value: string): Buffer {
  return Buffer.from(value, 'base64url')
}

export function hashWechatValue(value: string): string {
  return createHmac('sha256', getDataKey()).update(value, 'utf8').digest('hex')
}

export function signWechatValue(value: string): string {
  return encode(createHmac('sha256', getDataKey()).update(value, 'utf8').digest())
}

export function verifyWechatSignature(value: string, signature: string): boolean {
  const expected = Buffer.from(signWechatValue(value))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function encryptWechatJson(value: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getDataKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ])
  return [
    'v1',
    encode(iv),
    encode(cipher.getAuthTag()),
    encode(ciphertext),
  ].join('.')
}

export function decryptWechatJson<T>(value: string): T {
  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split('.')
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error('Invalid encrypted WeChat record.')
  }

  const decipher = createDecipheriv('aes-256-gcm', getDataKey(), decode(encodedIv))
  decipher.setAuthTag(decode(encodedTag))
  const plaintext = Buffer.concat([
    decipher.update(decode(encodedCiphertext)),
    decipher.final(),
  ]).toString('utf8')
  return JSON.parse(plaintext) as T
}

export function getWechatDataKeyRequirement(): number {
  return DATA_KEY_MIN_LENGTH
}
