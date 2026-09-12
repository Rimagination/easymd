import { createFileRoute } from '@tanstack/react-router'
import { wechatDraftMiddleware } from '@/lib/middleware/wechat-draft'
import { createBrowserSessionCookie, getBrowserSession } from '@/lib/wechat-draft/browser-session'
import {
  consumeWechatOAuthState,
  exchangeWechatAuthorizationCode,
  getPublicOrigin,
  isWechatPlatformConfigured,
} from '@/lib/wechat-draft/platform'

function redirectToApp(request: Request, error: string, returnTo = '/'): Response {
  const url = new URL(returnTo, getPublicOrigin(request))
  url.searchParams.set('wechat_error', error)
  return Response.redirect(url, 302)
}

export const Route = createFileRoute('/api/wechat/callback')({
  server: {
    middleware: [wechatDraftMiddleware],
    handlers: {
      GET: async ({ request }) => {
        if (!isWechatPlatformConfigured()) {
          return redirectToApp(request, 'service_unavailable')
        }

        const url = new URL(request.url)
        const state = url.searchParams.get('state')?.trim() ?? ''
        const authorizationCode = url.searchParams.get('auth_code')?.trim() ?? ''
        if (!state || !authorizationCode) {
          return redirectToApp(request, 'authorization_cancelled')
        }

        try {
          const browserSession = getBrowserSession(request)
          const oauthState = browserSession
            ? await consumeWechatOAuthState(state, browserSession.browserId)
            : undefined
          if (!oauthState) {
            return redirectToApp(request, 'authorization_expired')
          }

          await exchangeWechatAuthorizationCode(authorizationCode, oauthState.browserId)
          const returnUrl = new URL(oauthState.returnTo, getPublicOrigin(request))
          returnUrl.searchParams.set('wechat', 'connected')
          return new Response(null, {
            status: 302,
            headers: {
              'Cache-Control': 'no-store',
              'Location': returnUrl.toString(),
              'Set-Cookie': createBrowserSessionCookie(request, oauthState.browserId),
            },
          })
        }
        catch (error) {
          console.error('WeChat authorization callback error:', error)
          return redirectToApp(request, 'authorization_failed')
        }
      },
    },
  },
})
