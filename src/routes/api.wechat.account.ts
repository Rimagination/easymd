import { createFileRoute } from '@tanstack/react-router'
import { wechatDraftMiddleware } from '@/lib/middleware/wechat-draft'
import {
  disconnectWechatAccount,
  getWechatAccountSession,
  getWechatSetupStatus,
} from '@/lib/wechat-draft/account'

function jsonResponse(
  body: unknown,
  setCookie?: string,
  status = 200,
): Response {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  })
  if (setCookie) {
    headers.set('Set-Cookie', setCookie)
  }
  return new Response(JSON.stringify(body), { status, headers })
}

function unavailableResponse(): Response {
  return jsonResponse({
    account: null,
    configured: false,
    connected: false,
    setup: getWechatSetupStatus(),
  })
}

export const Route = createFileRoute('/api/wechat/account')({
  server: {
    middleware: [wechatDraftMiddleware],
    handlers: {
      GET: async ({ request }) => {
        try {
          const result = await getWechatAccountSession(request)
          return jsonResponse({ ...result.session, setup: getWechatSetupStatus() }, result.context.setCookie)
        }
        catch (error) {
          console.error('WeChat account status error:', error)
          return unavailableResponse()
        }
      },
      DELETE: async ({ request }) => {
        try {
          const context = await disconnectWechatAccount(request)
          const result = await getWechatAccountSession(request)
          return jsonResponse({ ...result.session, setup: getWechatSetupStatus() }, context.setCookie ?? result.context.setCookie)
        }
        catch (error) {
          console.error('WeChat account disconnect error:', error)
          return jsonResponse({ error: '解除公众号连接失败，请稍后重试。' }, undefined, 500)
        }
      },
    },
  },
})
