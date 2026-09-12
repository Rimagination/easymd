import { createHash } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { wechatDraftMiddleware } from '@/lib/middleware/wechat-draft'
import { handleWechatComponentCallback } from '@/lib/wechat-draft/component-callback'
import { getComponentToken } from '@/lib/wechat-draft/platform'
import { WechatDraftError } from '@/lib/wechat-draft/service'

function isPlainSignatureValid(timestamp: string, nonce: string, signature: string): boolean {
  const expected = createHash('sha1')
    .update([getComponentToken(), timestamp, nonce].sort().join(''), 'utf8')
    .digest('hex')
  return expected === signature
}

function errorResponse(error: unknown): Response {
  if (error instanceof WechatDraftError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error('WeChat component callback error:', error)
  return Response.json({ error: '微信第三方平台回调处理失败。' }, { status: 500 })
}

export const Route = createFileRoute('/api/wechat/component')({
  server: {
    middleware: [wechatDraftMiddleware],
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url)
        const timestamp = url.searchParams.get('timestamp')?.trim() ?? ''
        const nonce = url.searchParams.get('nonce')?.trim() ?? ''
        const signature = url.searchParams.get('signature')?.trim() ?? ''
        const echostr = url.searchParams.get('echostr') ?? ''
        if (!timestamp || !nonce || !signature || !echostr || !isPlainSignatureValid(timestamp, nonce, signature)) {
          return new Response('invalid', { status: 403 })
        }
        return new Response(echostr, {
          headers: { 'Cache-Control': 'no-store' },
        })
      },
      POST: async ({ request }) => {
        try {
          return await handleWechatComponentCallback(request)
        }
        catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})
