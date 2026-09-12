import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { wechatDraftMiddleware } from '@/lib/middleware/wechat-draft'
import {
  clearDraftSessionCookie,
  clearPublishTokenFailures,
  createDraftSessionCookie,
  hasDefaultCoverMediaId,
  isDraftSessionAuthorized,
  isPublishTokenAttemptAllowed,
  isWechatDraftConfigured,
  recordPublishTokenFailure,
  verifyPublishToken,
  WECHAT_DRAFT_PUBLISH_TOKEN_MIN_LENGTH,
} from '@/lib/wechat-draft/auth'

const sessionSchema = z.object({
  token: z.string().trim().min(WECHAT_DRAFT_PUBLISH_TOKEN_MIN_LENGTH).max(256),
})

function sessionStatus(request: Request) {
  return {
    authenticated: isDraftSessionAuthorized(request),
    configured: isWechatDraftConfigured(),
    defaultCoverConfigured: hasDefaultCoverMediaId(),
  }
}

export const Route = createFileRoute('/api/wechat/draft/session')({
  server: {
    middleware: [wechatDraftMiddleware],
    handlers: {
      GET: ({ request }) => Response.json(sessionStatus(request)),
      POST: async ({ request }) => {
        if (!isWechatDraftConfigured()) {
          return Response.json(
            { error: '线上公众号接口尚未配置。' },
            { status: 503 },
          )
        }
        if (!isPublishTokenAttemptAllowed(request)) {
          return Response.json({ error: '尝试次数过多，请 15 分钟后重试。' }, { status: 429 })
        }

        try {
          const body = sessionSchema.parse(await request.json())
          if (!verifyPublishToken(body.token)) {
            recordPublishTokenFailure(request)
            return Response.json({ error: '发布口令不正确。' }, { status: 401 })
          }

          clearPublishTokenFailures(request)
          return Response.json(
            { authenticated: true, configured: true, defaultCoverConfigured: hasDefaultCoverMediaId() },
            { headers: { 'Set-Cookie': createDraftSessionCookie(request) } },
          )
        }
        catch (error) {
          recordPublishTokenFailure(request)
          if (error instanceof z.ZodError) {
            return Response.json({ error: '发布口令格式不正确。' }, { status: 400 })
          }
          return Response.json({ error: '发布认证失败，请稍后重试。' }, { status: 400 })
        }
      },
      DELETE: () => Response.json(
        { authenticated: false, configured: isWechatDraftConfigured(), defaultCoverConfigured: hasDefaultCoverMediaId() },
        { headers: { 'Set-Cookie': clearDraftSessionCookie() } },
      ),
    },
  },
})
