import { Buffer } from 'node:buffer'
import { createCipheriv, createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleWechatComponentCallback } from './component-callback'
import { decryptWechatJson } from './crypto'

const privateEnvKeys = [
  'WECHAT_COMPONENT_APPID',
  'WECHAT_COMPONENT_APPSECRET',
  'WECHAT_COMPONENT_TOKEN',
  'WECHAT_COMPONENT_ENCODING_AES_KEY',
  'EASYMD_WECHAT_DATA_KEY',
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_REGION',
] as const
const originalEnv = Object.fromEntries(privateEnvKeys.map(key => [key, process.env[key]]))

afterEach(() => {
  vi.unstubAllGlobals()
  for (const key of privateEnvKeys) {
    const value = originalEnv[key]
    if (value === undefined) {
      delete process.env[key]
    }
    else {
      process.env[key] = value
    }
  }
})

function encryptComponentMessage(message: string, appId: string, key: Buffer): string {
  const random = Buffer.alloc(16, 7)
  const messageBytes = Buffer.from(message, 'utf8')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(messageBytes.length, 0)
  const plaintext = Buffer.concat([random, length, messageBytes, Buffer.from(appId, 'utf8')])
  const cipher = createCipheriv('aes-256-cbc', key, key.subarray(0, 16))
  return Buffer.concat([cipher.update(plaintext), cipher.final()]).toString('base64')
}

describe('wechat component callback', () => {
  it('verifies, decrypts and persists a component verify ticket', async () => {
    const appId = 'component-appid'
    const token = 'component-token'
    const key = Buffer.alloc(32, 3)
    const encodingAesKey = key.toString('base64').replace(/=+$/, '')
    process.env.WECHAT_COMPONENT_APPID = appId
    process.env.WECHAT_COMPONENT_APPSECRET = 'component-secret'
    process.env.WECHAT_COMPONENT_TOKEN = token
    process.env.WECHAT_COMPONENT_ENCODING_AES_KEY = encodingAesKey
    process.env.EASYMD_WECHAT_DATA_KEY = 'data-key'.repeat(8)
    process.env.S3_ENDPOINT = 'https://s3.example.com'
    process.env.S3_BUCKET = 'easymd'
    process.env.S3_ACCESS_KEY_ID = 'access-key'
    process.env.S3_SECRET_ACCESS_KEY = 'secret-key'
    process.env.S3_REGION = 'auto'

    let persistedBody = ''
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init)
      if (request.method === 'PUT') {
        persistedBody = await request.text()
        return new Response(null, { status: 200 })
      }
      return new Response(null, { status: 404 })
    }))

    const timestamp = String(Math.floor(Date.now() / 1000))
    const nonce = 'nonce'
    const message = '<xml><AppId><![CDATA[component-appid]]></AppId><InfoType><![CDATA[component_verify_ticket]]></InfoType><ComponentVerifyTicket><![CDATA[ticket-value]]></ComponentVerifyTicket></xml>'
    const encrypted = encryptComponentMessage(message, appId, key)
    const signature = createHash('sha1')
      .update([token, timestamp, nonce, encrypted].sort().join(''), 'utf8')
      .digest('hex')
    const request = new Request(`https://example.com/api/wechat/component?msg_signature=${signature}&timestamp=${timestamp}&nonce=${nonce}`, {
      method: 'POST',
      body: `<xml><Encrypt><![CDATA[${encrypted}]]></Encrypt></xml>`,
    })

    const response = await handleWechatComponentCallback(request)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('success')
    expect(decryptWechatJson<{ verifyTicket: string }>(persistedBody).verifyTicket).toBe('ticket-value')
  })
})
