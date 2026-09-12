import { afterEach, describe, expect, it } from 'vitest'
import {
  getBrowserSession,
  getOrCreateBrowserSession,
  WECHAT_BROWSER_SESSION_COOKIE,
} from './browser-session'

const originalDataKey = process.env.EASYMD_WECHAT_DATA_KEY

afterEach(() => {
  if (originalDataKey === undefined) {
    delete process.env.EASYMD_WECHAT_DATA_KEY
  }
  else {
    process.env.EASYMD_WECHAT_DATA_KEY = originalDataKey
  }
})

describe('wechat browser session', () => {
  it('creates and verifies a signed session cookie', () => {
    process.env.EASYMD_WECHAT_DATA_KEY = 'a'.repeat(64)
    const request = new Request('https://example.com/', {
      headers: { 'x-forwarded-proto': 'https' },
    })
    const created = getOrCreateBrowserSession(request)
    const cookie = created.setCookie?.split(';', 1)[0] ?? ''
    const authorizedRequest = new Request(request, {
      headers: { cookie },
    })

    expect(created.browserId).toBeTruthy()
    expect(cookie).toContain(`${WECHAT_BROWSER_SESSION_COOKIE}=`)
    expect(getBrowserSession(authorizedRequest)?.browserId).toBe(created.browserId)
    expect(getOrCreateBrowserSession(authorizedRequest).setCookie).toBeUndefined()
  })

  it('rejects a tampered cookie', () => {
    process.env.EASYMD_WECHAT_DATA_KEY = 'a'.repeat(64)
    const request = new Request('https://example.com/', {
      headers: { 'x-forwarded-proto': 'https' },
    })
    const cookie = getOrCreateBrowserSession(request).setCookie?.split(';', 1)[0] ?? ''
    const tampered = `${cookie.slice(0, -1)}x`

    expect(getBrowserSession(new Request(request, { headers: { cookie: tampered } }))).toBeUndefined()
  })
})
