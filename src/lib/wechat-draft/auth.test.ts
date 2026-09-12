import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPublishTokenFailures,
  createDraftSessionCookie,
  isDraftSessionAuthorized,
  isPublishTokenAttemptAllowed,
  recordPublishTokenFailure,
  verifyPublishToken,
  WECHAT_DRAFT_SESSION_COOKIE,
} from './auth'

const privateEnvKeys = [
  'WECHAT_APPID',
  'WECHAT_APPSECRET',
  'EASYMD_WECHAT_PUBLISH_TOKEN',
] as const
const originalEnv = Object.fromEntries(privateEnvKeys.map(key => [key, process.env[key]]))

afterEach(() => {
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

describe('wechat draft authentication', () => {
  it('signs a short-lived session cookie and rejects tampering', () => {
    process.env.WECHAT_APPID = 'test-appid'
    process.env.WECHAT_APPSECRET = 'test-secret'
    process.env.EASYMD_WECHAT_PUBLISH_TOKEN = 'a'.repeat(32)

    expect(verifyPublishToken('a'.repeat(32))).toBe(true)
    expect(verifyPublishToken('wrong-token')).toBe(false)

    const request = new Request('https://example.com/api/wechat/draft/session', {
      headers: { 'x-forwarded-proto': 'https' },
    })
    const setCookie = createDraftSessionCookie(request)
    const cookieValue = setCookie.split(';', 1)[0]
    const authorizedRequest = new Request(request, {
      headers: { cookie: cookieValue },
    })
    expect(setCookie).toContain(`${WECHAT_DRAFT_SESSION_COOKIE}=`)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(isDraftSessionAuthorized(authorizedRequest)).toBe(true)

    const tamperedCookie = `${cookieValue.slice(0, -1)}x`
    const tamperedRequest = new Request(request, {
      headers: { cookie: tamperedCookie },
    })
    expect(isDraftSessionAuthorized(tamperedRequest)).toBe(false)

    const malformedRequest = new Request(request, {
      headers: { cookie: `${WECHAT_DRAFT_SESSION_COOKIE}=%` },
    })
    expect(isDraftSessionAuthorized(malformedRequest)).toBe(false)

    expect(isPublishTokenAttemptAllowed(request)).toBe(true)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      recordPublishTokenFailure(request)
    }
    expect(isPublishTokenAttemptAllowed(request)).toBe(false)
    clearPublishTokenFailures(request)
    expect(isPublishTokenAttemptAllowed(request)).toBe(true)
  })
})
