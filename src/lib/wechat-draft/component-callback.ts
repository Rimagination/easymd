import { Buffer } from 'node:buffer'
import { createDecipheriv, createHash, timingSafeEqual } from 'node:crypto'
import {
  getComponentAppId,
  getComponentToken,
  getEncodingAesKey,
  saveComponentVerifyTicket,
} from './platform'
import { WechatDraftError } from './service'

const MAX_CALLBACK_BYTES = 128 * 1024
const CALLBACK_TIMESTAMP_SKEW_SECONDS = 15 * 60

function readXmlTag(xml: string, tag: string): string {
  const match = new RegExp(
    `<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`,
    'i',
  ).exec(xml)
  return match?.[1]?.trim() ?? ''
}

function isSignatureValid(token: string, timestamp: string, nonce: string, encrypted: string, signature: string): boolean {
  const expected = createHash('sha1')
    .update([token, timestamp, nonce, encrypted].sort().join(''), 'utf8')
    .digest('hex')
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(signature)
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}

function assertFreshTimestamp(timestamp: string): number {
  const value = Number(timestamp)
  if (!Number.isInteger(value) || Math.abs(Math.floor(Date.now() / 1000) - value) > CALLBACK_TIMESTAMP_SKEW_SECONDS) {
    throw new WechatDraftError('微信第三方平台回调已过期。', 403)
  }
  return value
}

function decryptComponentMessage(encrypted: string): string {
  const encodedKey = getEncodingAesKey()
  const key = Buffer.from(`${encodedKey}=`, 'base64')
  if (key.length !== 32) {
    throw new WechatDraftError('微信第三方平台 EncodingAESKey 配置无效。', 503)
  }

  let decipher: ReturnType<typeof createDecipheriv>
  try {
    decipher = createDecipheriv('aes-256-cbc', key, key.subarray(0, 16))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ])
    if (plaintext.length < 20) {
      throw new Error('message too short')
    }

    const messageLength = plaintext.readUInt32BE(16)
    const messageStart = 20
    const messageEnd = messageStart + messageLength
    if (messageEnd > plaintext.length) {
      throw new Error('invalid message length')
    }

    const appId = plaintext.subarray(messageEnd).toString('utf8')
    if (appId !== getComponentAppId()) {
      throw new Error('component app id mismatch')
    }
    return plaintext.subarray(messageStart, messageEnd).toString('utf8')
  }
  catch {
    throw new WechatDraftError('微信第三方平台回调解密失败。', 400)
  }
}

export async function handleWechatComponentCallback(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_CALLBACK_BYTES) {
    throw new WechatDraftError('微信第三方平台回调内容过大。', 413)
  }

  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > MAX_CALLBACK_BYTES) {
    throw new WechatDraftError('微信第三方平台回调内容过大。', 413)
  }

  const url = new URL(request.url)
  const encrypted = readXmlTag(body, 'Encrypt')
  const timestamp = url.searchParams.get('timestamp')?.trim() || readXmlTag(body, 'TimeStamp')
  const nonce = url.searchParams.get('nonce')?.trim() || readXmlTag(body, 'Nonce')
  const signature = url.searchParams.get('msg_signature')?.trim()
    || url.searchParams.get('signature')?.trim()
    || readXmlTag(body, 'MsgSignature')
  if (!encrypted || !timestamp || !nonce || !signature) {
    throw new WechatDraftError('微信第三方平台回调参数不完整。', 400)
  }
  const callbackTimestamp = assertFreshTimestamp(timestamp)
  if (!isSignatureValid(getComponentToken(), timestamp, nonce, encrypted, signature)) {
    throw new WechatDraftError('微信第三方平台回调签名无效。', 403)
  }

  const message = decryptComponentMessage(encrypted)
  const infoType = readXmlTag(message, 'InfoType')
  if (infoType === 'component_verify_ticket') {
    const ticket = readXmlTag(message, 'ComponentVerifyTicket')
    if (!ticket) {
      throw new WechatDraftError('微信第三方平台回调缺少验证票据。', 400)
    }
    await saveComponentVerifyTicket(ticket, callbackTimestamp)
  }

  return new Response('success', {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

export const wechatComponentCallbackLimits = {
  maxCallbackBytes: MAX_CALLBACK_BYTES,
}
