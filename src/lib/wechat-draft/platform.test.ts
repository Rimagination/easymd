import { afterEach, describe, expect, it, vi } from 'vitest'
import { consumeWechatOAuthState } from './platform'

const persistenceMock = vi.hoisted(() => ({
  deleteWechatRecord: vi.fn(),
  isWechatStateStorageConfigured: vi.fn(() => true),
  readWechatRecord: vi.fn(),
  wechatObjectKeys: {
    account: (browserId: string) => `account:${browserId}`,
    component: () => 'component',
    oauthState: (state: string) => `oauth:${state}`,
  },
  writeWechatRecord: vi.fn(),
}))

vi.mock('./persistence', () => persistenceMock)

afterEach(() => {
  vi.clearAllMocks()
})

describe('wechat OAuth state', () => {
  it('does not consume a state created for another browser session', async () => {
    const record = {
      browserId: 'browser-a',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 60_000,
      returnTo: '/',
    }
    persistenceMock.readWechatRecord.mockResolvedValue(record)

    expect(await consumeWechatOAuthState('state-a', 'browser-b')).toBeUndefined()
    expect(persistenceMock.deleteWechatRecord).not.toHaveBeenCalled()

    expect(await consumeWechatOAuthState('state-a', 'browser-a')).toEqual(record)
    expect(persistenceMock.deleteWechatRecord).toHaveBeenCalledWith('oauth:state-a')
  })
})
