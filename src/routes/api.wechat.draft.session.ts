import { createFileRoute } from '@tanstack/react-router'
import { wechatDraftMiddleware } from '@/lib/middleware/wechat-draft'
import {
  disconnectWechatAccount,
  getWechatAccountSession,
  getWechatSetupStatus,
} from '@/lib/wechat-draft/account'

function responseForSession(
  session: Awaited<ReturnType<typeof getWechatAccountSession>>['session'],
  setCookie?: string,
): Response {
  return Response.json({
    ...session,
    setup: getWechatSetupStatus(),
  }, {
    headers: setCookie
      ? { 'Set-Cookie': setCookie, 'Cache-Control': 'no-store' }
      : { 'Cache-Control': 'no-store' },
  })
}

export const Route = createFileRoute('/api/wechat/draft/session')({
  server: {
    middleware: [wechatDraftMiddleware],
    handlers: {
      GET: async ({ request }) => {
        try {
          const result = await getWechatAccountSession(request)
          return responseForSession(result.session, result.context.setCookie)
        }
        catch {
          return Response.json({
            account: null,
            configured: false,
            connected: false,
            setup: getWechatSetupStatus(),
          })
        }
      },
      POST: () => Response.json({ error: '旧版发布口令已停用，请连接自己的公众号。' }, { status: 410 }),
      DELETE: async ({ request }) => {
        try {
          const context = await disconnectWechatAccount(request)
          const result = await getWechatAccountSession(request)
          return responseForSession(result.session, context.setCookie ?? result.context.setCookie)
        }
        catch {
          return Response.json({ error: '解除公众号连接失败，请稍后重试。' }, { status: 500 })
        }
      },
    },
  },
})
