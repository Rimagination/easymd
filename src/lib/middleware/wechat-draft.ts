import { createMiddleware } from '@tanstack/react-start'
import { env } from '@/env'

function getAllowedOrigin(request: Request): string {
  const configuredOrigin = env.VITE_APP_URL?.trim()
  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin
    }
    catch {
      // Fall back to the current request origin when the optional value is malformed.
    }
  }
  return new URL(request.url).origin
}

export const wechatDraftMiddleware = createMiddleware().server(async ({ request, next }) => {
  const origin = request.headers.get('Origin')
  const allowedOrigin = getAllowedOrigin(request)

  if (origin && origin !== allowedOrigin) {
    return new Response(JSON.stringify({ error: '请求来源不受信任。' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-store',
      },
    })
  }

  const result = await next()
  result.response.headers.set('Cache-Control', 'no-store')
  if (origin) {
    result.response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    result.response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  return result
})
