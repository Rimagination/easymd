import { randomBytes } from 'node:crypto'
import { env } from '@/env'
import { deleteWechatRecord, isWechatStateStorageConfigured, readWechatRecord, wechatObjectKeys, writeWechatRecord } from './persistence'
import { WechatDraftError } from './service'

const WECHAT_API_BASE = 'https://api.weixin.qq.com'
const ACCESS_TOKEN_SAFETY_WINDOW_MS = 2 * 60 * 1000
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
const REQUEST_TIMEOUT_MS = 30_000

export interface WechatAuthorizerRecord {
  browserId: string
  authorizerAppId: string
  authorizerAccessToken?: string
  authorizerAccessTokenExpiresAt?: number
  authorizerRefreshToken: string
  headImg?: string
  nickname?: string
  principalName?: string
  updatedAt: string
  username?: string
}

interface ComponentRecord {
  componentAccessToken?: string
  componentAccessTokenExpiresAt?: number
  updatedAt: string
  verifyTicket?: string
  verifyTicketTimestamp?: number
}

export interface WechatOAuthStateRecord {
  browserId: string
  createdAt: string
  expiresAt: number
  returnTo: string
}

interface WechatApiErrorPayload {
  errcode?: number
  errmsg?: string
}

interface ComponentTokenPayload extends WechatApiErrorPayload {
  component_access_token?: string
  expires_in?: number
}

interface PreAuthCodePayload extends WechatApiErrorPayload {
  pre_auth_code?: string
  expires_in?: number
}

interface AuthorizationPayload extends WechatApiErrorPayload {
  authorization_info?: {
    authorizer_access_token?: string
    authorizer_appid?: string
    authorizer_refresh_token?: string
    expires_in?: number
    func_info?: unknown
  }
  authorizer_info?: {
    head_img?: string
    nick_name?: string
    principal_name?: string
    user_name?: string
  }
}

interface AuthorizerTokenPayload extends WechatApiErrorPayload {
  authorizer_access_token?: string
  authorizer_refresh_token?: string
  expires_in?: number
}

export function getComponentAppId(): string {
  return env.WECHAT_COMPONENT_APPID?.trim() ?? ''
}

function getComponentSecret(): string {
  return env.WECHAT_COMPONENT_APPSECRET?.trim() ?? ''
}

function getComponentToken(): string {
  return env.WECHAT_COMPONENT_TOKEN?.trim() ?? ''
}

function getEncodingAesKey(): string {
  return env.WECHAT_COMPONENT_ENCODING_AES_KEY?.trim() ?? ''
}

export function isWechatPlatformConfigured(): boolean {
  return Boolean(
    getComponentAppId()
    && getComponentSecret()
    && getComponentToken()
    && getEncodingAesKey()
    && isWechatStateStorageConfigured(),
  )
}

function assertPlatformConfigured(): void {
  if (!isWechatPlatformConfigured()) {
    throw new WechatDraftError('公众号连接服务尚未配置，请联系 easymd 管理员。', 503)
  }
}

function getErrorMessage(code: number | undefined, fallback: string): string {
  switch (code) {
    case 40001:
    case 40014:
    case 42001:
      return '微信授权已失效，请重新连接公众号。'
    case 40164:
      return '微信接口拒绝了当前服务器 IP，请联系 easymd 管理员处理接口 IP 白名单。'
    case 48001:
      return '当前公众号没有开放所需接口权限。'
    case 45009:
      return '微信接口调用过于频繁，请稍后重试。'
    default:
      return fallback
  }
}

function createApiError(prefix: string, payload: WechatApiErrorPayload, status?: number): WechatDraftError {
  const code = typeof payload.errcode === 'number' ? payload.errcode : undefined
  const suffix = payload.errmsg?.trim() ? `：${payload.errmsg.trim()}` : ''
  return new WechatDraftError(
    getErrorMessage(code, code ? `${prefix}（错误码 ${code}）${suffix}。` : `${prefix}。`),
    status && status >= 400 ? 502 : 400,
    code,
  )
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMessage: string,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  }
  catch (error) {
    if (controller.signal.aborted) {
      throw new WechatDraftError(timeoutMessage, 504)
    }
    throw error
  }
  finally {
    clearTimeout(timeout)
  }
}

async function fetchWechatJson<T extends WechatApiErrorPayload>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetchWithTimeout(url, init, '连接微信接口超时，请稍后重试。')
  }
  catch (error) {
    if (error instanceof WechatDraftError) {
      throw error
    }
    throw new WechatDraftError('连接微信接口失败，请稍后重试。', 502)
  }

  let payload: T
  try {
    payload = await response.json() as T
  }
  catch {
    throw new WechatDraftError('微信接口返回了无法识别的响应。', 502)
  }

  if (!response.ok || (typeof payload.errcode === 'number' && payload.errcode !== 0)) {
    throw createApiError('微信接口调用失败', payload, response.status)
  }
  return payload
}

function expiresAt(expiresIn: number | undefined): number {
  const seconds = typeof expiresIn === 'number' && expiresIn > 60 ? expiresIn : 7200
  return Date.now() + Math.max(60_000, seconds * 1000 - ACCESS_TOKEN_SAFETY_WINDOW_MS)
}

export function getPublicOrigin(request: Request): string {
  const configuredUrl = env.VITE_APP_URL?.trim()
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin
    }
    catch {
      // Use the current request origin when the optional public URL is malformed.
    }
  }
  return new URL(request.url).origin
}

function normalizeReturnTo(value: string | null): string {
  if (!value) {
    return '/'
  }

  try {
    const base = new URL('https://easymd.invalid')
    const url = new URL(value, base)
    if (url.origin !== base.origin || !url.pathname.startsWith('/')) {
      return '/'
    }
    return `${url.pathname}${url.search}${url.hash}`
  }
  catch {
    return '/'
  }
}

export function getWechatCallbackUrl(request: Request): string {
  return `${getPublicOrigin(request)}/api/wechat/callback`
}

export function getWechatComponentCallbackUrl(request: Request): string {
  return `${getPublicOrigin(request)}/api/wechat/component`
}

async function getComponentRecord(): Promise<ComponentRecord> {
  return await readWechatRecord<ComponentRecord>(wechatObjectKeys.component()) ?? {
    updatedAt: new Date(0).toISOString(),
  }
}

export async function saveComponentVerifyTicket(verifyTicket: string, callbackTimestamp?: number): Promise<void> {
  assertPlatformConfigured()
  const current = await getComponentRecord()
  if (
    typeof callbackTimestamp === 'number'
    && typeof current.verifyTicketTimestamp === 'number'
    && callbackTimestamp <= current.verifyTicketTimestamp
  ) {
    return
  }

  const sameTicket = current.verifyTicket === verifyTicket
  await writeWechatRecord(wechatObjectKeys.component(), {
    ...current,
    componentAccessToken: sameTicket ? current.componentAccessToken : undefined,
    componentAccessTokenExpiresAt: sameTicket ? current.componentAccessTokenExpiresAt : undefined,
    updatedAt: new Date().toISOString(),
    verifyTicket,
    verifyTicketTimestamp: callbackTimestamp ?? current.verifyTicketTimestamp,
  } satisfies ComponentRecord)
}

export async function getComponentAccessToken(): Promise<string> {
  assertPlatformConfigured()
  const current = await getComponentRecord()
  if (
    current.componentAccessToken
    && current.componentAccessTokenExpiresAt
    && current.componentAccessTokenExpiresAt > Date.now()
  ) {
    return current.componentAccessToken
  }
  if (!current.verifyTicket) {
    throw new WechatDraftError('公众号连接服务正在等待微信验证票据，请联系 easymd 管理员。', 503)
  }

  const payload = await fetchWechatJson<ComponentTokenPayload>(
    `${WECHAT_API_BASE}/cgi-bin/component/api_component_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: getComponentAppId(),
        component_appsecret: getComponentSecret(),
        component_verify_ticket: current.verifyTicket,
      }),
    },
  )
  if (!payload.component_access_token) {
    throw new WechatDraftError('微信接口未返回第三方平台 access_token。', 502)
  }

  await writeWechatRecord(wechatObjectKeys.component(), {
    ...current,
    componentAccessToken: payload.component_access_token,
    componentAccessTokenExpiresAt: expiresAt(payload.expires_in),
    updatedAt: new Date().toISOString(),
  } satisfies ComponentRecord)
  return payload.component_access_token
}

export async function createWechatAuthorizationUrl(
  request: Request,
  browserId: string,
  returnTo: string | null,
): Promise<string> {
  const componentAccessToken = await getComponentAccessToken()
  const payload = await fetchWechatJson<PreAuthCodePayload>(
    `${WECHAT_API_BASE}/cgi-bin/component/api_create_preauthcode?component_access_token=${encodeURIComponent(componentAccessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ component_appid: getComponentAppId() }),
    },
  )
  if (!payload.pre_auth_code) {
    throw new WechatDraftError('微信接口未返回授权码，请稍后重试。', 502)
  }

  const state = randomBytes(24).toString('base64url')
  await writeWechatRecord(wechatObjectKeys.oauthState(state), {
    browserId,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    returnTo: normalizeReturnTo(returnTo),
  } satisfies WechatOAuthStateRecord)

  const query = new URLSearchParams({
    auth_type: '3',
    component_appid: getComponentAppId(),
    pre_auth_code: payload.pre_auth_code,
    redirect_uri: getWechatCallbackUrl(request),
  })
  return `https://mp.weixin.qq.com/cgi-bin/componentloginpage?${query.toString()}`
}

export async function consumeWechatOAuthState(
  state: string,
  expectedBrowserId?: string,
): Promise<WechatOAuthStateRecord | undefined> {
  const key = wechatObjectKeys.oauthState(state)
  const record = await readWechatRecord<WechatOAuthStateRecord>(key)
  if (record && expectedBrowserId && record.browserId !== expectedBrowserId) {
    return undefined
  }
  if (!record || record.expiresAt <= Date.now()) {
    if (record) {
      await deleteWechatRecord(key)
    }
    return undefined
  }
  await deleteWechatRecord(key)
  return record
}

export async function exchangeWechatAuthorizationCode(
  authorizationCode: string,
  browserId: string,
): Promise<WechatAuthorizerRecord> {
  const componentAccessToken = await getComponentAccessToken()
  const payload = await fetchWechatJson<AuthorizationPayload>(
    `${WECHAT_API_BASE}/cgi-bin/component/api_query_auth?component_access_token=${encodeURIComponent(componentAccessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorization_code: authorizationCode,
        component_appid: getComponentAppId(),
      }),
    },
  )
  const authorizationInfo = payload.authorization_info
  const authorizerAppId = authorizationInfo?.authorizer_appid?.trim() ?? ''
  const refreshToken = authorizationInfo?.authorizer_refresh_token?.trim() ?? ''
  const accessToken = authorizationInfo?.authorizer_access_token?.trim() ?? ''
  if (!authorizerAppId || !refreshToken || !accessToken) {
    throw new WechatDraftError('微信未返回完整的公众号授权信息，请重新授权。', 502)
  }

  const authorizerInfo = payload.authorizer_info
  const record: WechatAuthorizerRecord = {
    authorizerAccessToken: accessToken,
    authorizerAccessTokenExpiresAt: expiresAt(authorizationInfo?.expires_in),
    authorizerAppId,
    authorizerRefreshToken: refreshToken,
    browserId,
    headImg: authorizerInfo?.head_img?.trim() || undefined,
    nickname: authorizerInfo?.nick_name?.trim() || undefined,
    principalName: authorizerInfo?.principal_name?.trim() || undefined,
    updatedAt: new Date().toISOString(),
    username: authorizerInfo?.user_name?.trim() || undefined,
  }
  await writeWechatRecord(wechatObjectKeys.account(browserId), record)
  return record
}

export async function getWechatAuthorizer(browserId: string): Promise<WechatAuthorizerRecord | undefined> {
  return readWechatRecord<WechatAuthorizerRecord>(wechatObjectKeys.account(browserId))
}

export async function getWechatAuthorizerAccessToken(browserId: string): Promise<string> {
  const current = await getWechatAuthorizer(browserId)
  if (!current) {
    throw new WechatDraftError('请先连接你的公众号。', 401)
  }
  if (
    current.authorizerAccessToken
    && current.authorizerAccessTokenExpiresAt
    && current.authorizerAccessTokenExpiresAt > Date.now()
  ) {
    return current.authorizerAccessToken
  }

  const componentAccessToken = await getComponentAccessToken()
  const payload = await fetchWechatJson<AuthorizerTokenPayload>(
    `${WECHAT_API_BASE}/cgi-bin/component/api_authorizer_token?component_access_token=${encodeURIComponent(componentAccessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorizer_appid: current.authorizerAppId,
        authorizer_refresh_token: current.authorizerRefreshToken,
        component_appid: getComponentAppId(),
      }),
    },
  )
  if (!payload.authorizer_access_token) {
    throw new WechatDraftError('微信未返回公众号 access_token，请重新连接公众号。', 502)
  }

  await writeWechatRecord(wechatObjectKeys.account(browserId), {
    ...current,
    authorizerAccessToken: payload.authorizer_access_token,
    authorizerAccessTokenExpiresAt: expiresAt(payload.expires_in),
    authorizerRefreshToken: payload.authorizer_refresh_token?.trim() || current.authorizerRefreshToken,
    updatedAt: new Date().toISOString(),
  } satisfies WechatAuthorizerRecord)
  return payload.authorizer_access_token
}

export function maskWechatAppId(appId: string): string {
  if (appId.length <= 8) {
    return `${appId.slice(0, 2)}****${appId.slice(-2)}`
  }
  return `${appId.slice(0, 4)}****${appId.slice(-4)}`
}

export function toPublicWechatAccount(record: WechatAuthorizerRecord | undefined) {
  if (!record) {
    return null
  }
  return {
    appid: maskWechatAppId(record.authorizerAppId),
    headImg: record.headImg ?? '',
    nickname: record.nickname || record.username || '已连接公众号',
    principalName: record.principalName ?? '',
    username: record.username ?? '',
  }
}

export function getWechatPlatformConfigSummary() {
  return {
    configured: isWechatPlatformConfigured(),
    storageConfigured: isWechatStateStorageConfigured(),
  }
}

export { getComponentToken, getEncodingAesKey, normalizeReturnTo }
