import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { corsMiddleware } from '@/lib/middleware/cors'
import { importWechatArticleFromHtml, parseWechatArticleUrl } from '@/lib/wechat-import'

const MAX_WECHAT_HTML_SIZE = 2_000_000

const importWechatSchema = z.object({
  url: z.string().min(1),
})

async function readBoundedText(response: Response): Promise<string> {
  const text = await response.text()
  if (text.length > MAX_WECHAT_HTML_SIZE) {
    throw new Error('文章内容过大，无法导入。')
  }

  return text
}

function isClientImportError(message: string): boolean {
  return message.includes('正文结构') || message.includes('过大')
}

export const Route = createFileRoute('/api/import/wechat')({
  server: {
    middleware: [corsMiddleware],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = importWechatSchema.parse(await request.json())
          const parsedUrl = parseWechatArticleUrl(body.url)

          if (!parsedUrl.ok) {
            return Response.json({ error: parsedUrl.error }, { status: 400 })
          }

          const response = await fetch(parsedUrl.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 easymd article importer',
              'Accept': 'text/html,application/xhtml+xml',
            },
          })

          if (!response.ok) {
            return Response.json(
              { error: '无法读取这篇文章，请确认链接可公开访问。' },
              { status: 400 },
            )
          }

          const html = await readBoundedText(response)
          const result = await importWechatArticleFromHtml({
            html,
            sourceUrl: parsedUrl.url,
          })

          return Response.json(result)
        }
        catch (error) {
          const message = error instanceof Error ? error.message : '公众号文章导入失败。'
          const status = isClientImportError(message) ? 400 : 500
          return Response.json({ error: message }, { status })
        }
      },
    },
  },
})
