import { afterEach, describe, expect, it } from 'vitest'
import { decryptWechatJson, encryptWechatJson, hashWechatValue } from './crypto'

const originalDataKey = process.env.EASYMD_WECHAT_DATA_KEY

afterEach(() => {
  if (originalDataKey === undefined) {
    delete process.env.EASYMD_WECHAT_DATA_KEY
  }
  else {
    process.env.EASYMD_WECHAT_DATA_KEY = originalDataKey
  }
})

describe('wechat credential encryption', () => {
  it('round-trips records without exposing plaintext', () => {
    process.env.EASYMD_WECHAT_DATA_KEY = 'a'.repeat(64)
    const record = {
      authorizerRefreshToken: 'refresh-token-secret',
      authorizerAppId: 'wx123456',
    }

    const encrypted = encryptWechatJson(record)
    expect(encrypted).not.toContain('refresh-token-secret')
    expect(decryptWechatJson<typeof record>(encrypted)).toEqual(record)
    expect(hashWechatValue('browser-id')).toBe(hashWechatValue('browser-id'))
  })

  it('rejects records encrypted with a different key', () => {
    process.env.EASYMD_WECHAT_DATA_KEY = 'a'.repeat(64)
    const encrypted = encryptWechatJson({ value: 'secret' })
    process.env.EASYMD_WECHAT_DATA_KEY = 'b'.repeat(64)

    expect(() => decryptWechatJson(encrypted)).toThrow()
  })
})
