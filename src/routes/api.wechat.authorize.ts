import { createFileRoute } from '@tanstack/react-router'
import { wechatDraftMiddleware } from '@/lib/middleware/wechat-draft'
import { getOrCreateBrowserSession } from '@/lib/wechat-draft/browser-session'
import { createWechatAuthorizationUrl, getPublicOrigin, isWechatPlatformConfigured } from '@/lib/wechat-draft/platform'

function redirectToApp(request: Request, error: string): Response {
  const url = new URL(getPublicOrigin(request))
  url.searchParams.set('wechat_error', error)
  return Response.redirect(url, 302)
}

export const Route = createFileRoute('/api/wechat/authorize')({
  server: {
    middleware: [wechatDraftMiddleware],
    handlers: {
      GET: async ({ request }) => {
        if (!isWechatPlatformConfigured()) {
          return redirectToApp(request, 'service_unavailable')
        }

        try {
          const session = getOrCreateBrowserSession(request)
          const returnTo = new URL(request.url).searchParams.get('returnTo')
          const authorizationUrl = await createWechatAuthorizationUrl(request, session.browserId, returnTo)
          const headers = new Headers({
            'Cache-Control': 'no-store',
            'Location': authorizationUrl,
          })
          if (session.setCookie) {
            headers.set('Set-Cookie', session.setCookie)
          }
          return new Response(null, { status: 302, headers })
        }
        catch (error) {
          console.error('WeChat authorization start error:', error)
          return redirectToApp(request, 'service_unavailable')
        }
      },
    },
  },
})
