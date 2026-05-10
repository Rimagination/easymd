import { describe, expect, it } from 'vitest'
import { MAX_WECHAT_HTML_SIZE, readWechatArticleHtml } from './fetch'

describe('readWechatArticleHtml', () => {
  it('allows typical WeChat pages with large inline payloads', async () => {
    const html = `
      <html>
        <body>
          <h1 id="activity-name">Large WeChat page</h1>
          <div id="js_content"><p>Readable body</p></div>
          <script>${'x'.repeat(3_200_000)}</script>
        </body>
      </html>
    `

    await expect(readWechatArticleHtml(new Response(html))).resolves.toContain('Readable body')
  })

  it('rejects pages beyond the bounded import size', async () => {
    const html = `<div>${'x'.repeat(MAX_WECHAT_HTML_SIZE + 1)}</div>`

    await expect(readWechatArticleHtml(new Response(html))).rejects.toThrow('文章内容过大，无法导入。')
  })
})
