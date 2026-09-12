import { Buffer } from 'node:buffer'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from '@/env'

export const WECHAT_DRAFT_SESSION_COOKIE = 'easymd_wechat_draft_session'
export const WECHAT_DRAFT_SESSION_MAX_AGE = 12 * 60 * 60
export const WECHAT_DRAFT_PUBLISH_TOKEN_MIN_LENGTH = 32

const AUTH_FAILURE_WINDOW_MS = 15 * 60 * 1000
const AUTH_FAILURE_LIMIT = 5
const MAX_FAILURE_RECORDS = 10_000

interface AuthFailureRecord {
  count: number
  resetAt: number
}

const authFailures = new Map<string, AuthFailureRecord>()

function getPublishToken(): string {
  return env.EASYMD_WECHAT_PUBLISH_TOKEN?.trim() ?? ''
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function sign(value: string): string {
  return createHmac('sha256', getPublishToken()).update(value).digest('base64url')
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function readCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) {
    return undefined
  }

  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=')
    if (separator === -1) {
      continue
    }
    if (item.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(item.slice(separator + 1).trim())
      }
      catch {
        return undefined
      }
    }
  }

  return undefined
}

export function isWechatDraftConfigured(): boolean {
  return Boolean(
    env.WECHAT_APPID?.trim()
    && env.WECHAT_APPSECRET?.trim()
    && getPublishToken().length >= WECHAT_DRAFT_PUBLISH_TOKEN_MIN_LENGTH,
  )
}

export function hasDefaultCoverMediaId(): boolean {
  return Boolean(env.WECHAT_DEFAULT_COVER_MEDIA_ID?.trim())
}

export function verifyPublishToken(value: string): boolean {
  const expected = getPublishToken()
  return Boolean(expected && safeEqual(value, expected))
}

function getClientKey(request: Request): string {
  return request.headers.get('cf-connecting-ip')?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

export function isPublishTokenAttemptAllowed(request: Request): boolean {
  const key = getClientKey(request)
  const record = authFailures.get(key)
  if (!record) {
    return true
  }
  if (record.resetAt <= Date.now()) {
    authFailures.delete(key)
    return true
  }
  return record.count < AUTH_FAILURE_LIMIT
}

export function recordPublishTokenFailure(request: Request): void {
  const now = Date.now()
  const key = getClientKey(request)
  const current = authFailures.get(key)
  if (!current || current.resetAt <= now) {
    if (authFailures.size >= MAX_FAILURE_RECORDS) {
      authFailures.clear()
    }
    authFailures.set(key, { count: 1, resetAt: now + AUTH_FAILURE_WINDOW_MS })
    return
  }
  current.count += 1
}

export function clearPublishTokenFailures(request: Request): void {
  authFailures.delete(getClientKey(request))
}

export function createDraftSessionCookie(request: Request): string {
  const expiresAt = Math.floor(Date.now() / 1000) + WECHAT_DRAFT_SESSION_MAX_AGE
  const payload = encode(`${expiresAt}.${randomBytes(16).toString('hex')}`)
  const value = `${payload}.${sign(payload)}`
  const forwardedProtocol = request.headers.get('x-forwarded-proto')
  const secure = forwardedProtocol === 'https' || new URL(request.url).protocol === 'https:'
  return [
    `${WECHAT_DRAFT_SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${WECHAT_DRAFT_SESSION_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Strict',
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ')
}

export function clearDraftSessionCookie(): string {
  return [
    `${WECHAT_DRAFT_SESSION_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Strict',
  ].join('; ')
}

export function isDraftSessionAuthorized(request: Request): boolean {
  if (!isWechatDraftConfigured()) {
    return false
  }

  const raw = readCookie(request, WECHAT_DRAFT_SESSION_COOKIE)
  if (!raw) {
    return false
  }

  const separator = raw.lastIndexOf('.')
  if (separator === -1) {
    return false
  }

  const payload = raw.slice(0, separator)
  const signature = raw.slice(separator + 1)
  if (!safeEqual(signature, sign(payload))) {
    return false
  }

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    const expiresAt = Number(decoded.split('.')[0])
    return Number.isFinite(expiresAt) && expiresAt > Math.floor(Date.now() / 1000)
  }
  catch {
    return false
  }
}
