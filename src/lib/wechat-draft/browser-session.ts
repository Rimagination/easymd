import { Buffer } from 'node:buffer'
import { randomBytes } from 'node:crypto'
import { signWechatValue, verifyWechatSignature } from './crypto'

export const WECHAT_BROWSER_SESSION_COOKIE = 'easymd_wechat_browser'
export const WECHAT_BROWSER_SESSION_MAX_AGE = 180 * 24 * 60 * 60

interface BrowserSessionPayload {
  browserId: string
  expiresAt: number
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function readCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) {
    return undefined
  }

  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=')
    if (separator === -1 || item.slice(0, separator).trim() !== name) {
      continue
    }
    try {
      return decodeURIComponent(item.slice(separator + 1).trim())
    }
    catch {
      return undefined
    }
  }
  return undefined
}

function parseSession(value: string | undefined): BrowserSessionPayload | undefined {
  if (!value) {
    return undefined
  }

  const separator = value.lastIndexOf('.')
  if (separator === -1) {
    return undefined
  }

  const payload = value.slice(0, separator)
  const signature = value.slice(separator + 1)
  try {
    if (!verifyWechatSignature(payload, signature)) {
      return undefined
    }
  }
  catch {
    return undefined
  }

  try {
    const [browserId, expiresAtValue] = decode(payload).split('.')
    const expiresAt = Number(expiresAtValue)
    if (!browserId || !Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
      return undefined
    }
    return { browserId, expiresAt }
  }
  catch {
    return undefined
  }
}

function isSecureRequest(request: Request): boolean {
  return request.headers.get('x-forwarded-proto') === 'https'
    || new URL(request.url).protocol === 'https:'
}

export function createBrowserSessionCookie(request: Request, browserId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + WECHAT_BROWSER_SESSION_MAX_AGE
  const payload = encode(`${browserId}.${expiresAt}`)
  const value = `${payload}.${signWechatValue(payload)}`
  return [
    `${WECHAT_BROWSER_SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${WECHAT_BROWSER_SESSION_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
    isSecureRequest(request) ? 'Secure' : '',
  ].filter(Boolean).join('; ')
}

export function getBrowserSession(request: Request): BrowserSessionPayload | undefined {
  return parseSession(readCookie(request, WECHAT_BROWSER_SESSION_COOKIE))
}

export function getOrCreateBrowserSession(request: Request): {
  browserId: string
  setCookie?: string
} {
  const current = getBrowserSession(request)
  if (current) {
    return { browserId: current.browserId }
  }

  const browserId = randomBytes(24).toString('base64url')
  return {
    browserId,
    setCookie: createBrowserSessionCookie(request, browserId),
  }
}
