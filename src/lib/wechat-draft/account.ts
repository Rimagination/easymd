import type { WechatAuthorizerRecord } from './platform'
import { getOrCreateBrowserSession } from './browser-session'
import { deleteWechatRecord, wechatObjectKeys } from './persistence'
import {
  getWechatAuthorizer,
  getWechatPlatformConfigSummary,
  isWechatPlatformConfigured,
  toPublicWechatAccount,
} from './platform'

export interface WechatAccountSession {
  account: ReturnType<typeof toPublicWechatAccount>
  configured: boolean
  connected: boolean
}

export interface WechatAccountContext {
  browserId?: string
  record?: WechatAuthorizerRecord
  setCookie?: string
}

export async function getWechatAccountContext(request: Request): Promise<WechatAccountContext> {
  if (!isWechatPlatformConfigured()) {
    return {}
  }

  const session = getOrCreateBrowserSession(request)
  return {
    browserId: session.browserId,
    record: await getWechatAuthorizer(session.browserId),
    setCookie: session.setCookie,
  }
}

export async function getWechatAccountSession(request: Request): Promise<{
  context: WechatAccountContext
  session: WechatAccountSession
}> {
  const context = await getWechatAccountContext(request)
  const configured = isWechatPlatformConfigured()
  const account = toPublicWechatAccount(context.record)
  return {
    context,
    session: {
      account,
      configured,
      connected: Boolean(account),
    },
  }
}

export async function disconnectWechatAccount(request: Request): Promise<WechatAccountContext> {
  const context = await getWechatAccountContext(request)
  if (context.browserId) {
    await deleteWechatRecord(wechatObjectKeys.account(context.browserId))
  }
  return context
}

export function getWechatSetupStatus() {
  const summary = getWechatPlatformConfigSummary()
  return {
    configured: summary.configured,
    storageConfigured: summary.storageConfigured,
  }
}
