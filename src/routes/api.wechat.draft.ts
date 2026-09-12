import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { wechatDraftMiddleware } from '@/lib/middleware/wechat-draft'
import { isDraftSessionAuthorized } from '@/lib/wechat-draft/auth'
import { publishWechatDraft, WechatDraftError, wechatDraftLimits } from '@/lib/wechat-draft/service'

const draftFieldsSchema = z.object({
  author: z.string().trim().max(64).default(''),
  coverMediaId: z.string().trim().max(512).default(''),
  digest: z.string().trim().max(120).default(''),
  html: z.string().trim().min(1).max(wechatDraftLimits.maxHtmlInputChars),
  needOpenComment: z.enum(['0', '1']).default('0'),
  onlyFansCanComment: z.enum(['0', '1']).default('0'),
  showCoverPic: z.enum(['0', '1']).default('0'),
  sourceUrl: z.string().trim().max(2048).default(''),
  title: z.string().trim().min(1).max(64),
})

function readFormString(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return Response.json({ error: '草稿参数不符合要求。' }, { status: 400 })
  }
  if (error instanceof WechatDraftError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error('WeChat draft publish error:', error)
  return Response.json({ error: '同步草稿箱失败，请稍后重试。' }, { status: 500 })
}

export const Route = createFileRoute('/api/wechat/draft')({
  server: {
    middleware: [wechatDraftMiddleware],
    handlers: {
      POST: async ({ request }) => {
        if (!isDraftSessionAuthorized(request)) {
          return Response.json({ error: '请先完成公众号发布认证。' }, { status: 401 })
        }

        try {
          const contentLength = Number(request.headers.get('content-length'))
          if (Number.isFinite(contentLength) && contentLength > wechatDraftLimits.maxRequestBytes) {
            return Response.json({ error: '请求内容过大，请减少封面或正文内容。' }, { status: 413 })
          }

          const formData = await request.formData()
          const fields = draftFieldsSchema.parse({
            author: readFormString(formData, 'author'),
            coverMediaId: readFormString(formData, 'coverMediaId'),
            digest: readFormString(formData, 'digest'),
            html: readFormString(formData, 'html'),
            needOpenComment: readFormString(formData, 'needOpenComment') || '0',
            onlyFansCanComment: readFormString(formData, 'onlyFansCanComment') || '0',
            showCoverPic: readFormString(formData, 'showCoverPic') || '0',
            sourceUrl: readFormString(formData, 'sourceUrl'),
            title: readFormString(formData, 'title'),
          })

          const coverValue = formData.get('cover')
          const cover = coverValue instanceof Blob && coverValue.size > 0 ? coverValue : undefined
          const coverFilename = coverValue && typeof coverValue === 'object' && 'name' in coverValue
            ? String(coverValue.name)
            : undefined

          const result = await publishWechatDraft({
            ...fields,
            cover,
            coverFilename,
            needOpenComment: fields.needOpenComment === '1',
            onlyFansCanComment: fields.onlyFansCanComment === '1',
            showCoverPic: fields.showCoverPic === '1',
          })

          return Response.json({
            contentBytes: result.contentBytes,
            contentChars: result.contentChars,
            coverMediaId: result.coverMediaId,
            draftMediaId: result.draftMediaId,
            imageCount: result.imageCount,
          })
        }
        catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})
