import { describe, expect, it } from 'vitest'
import { extractWechatArticleFromHtml } from './dom'

const html = `
  <html>
    <body>
      <h1 id="activity-name">  示例文章  </h1>
      <span id="js_name"> easymd 作者 </span>
      <em id="publish_time">2026-05-07</em>
      <div id="js_content">
        <p style="font-size:16px;color:#333;line-height:1.8">第一段正文</p>
        <p><img data-src="https://img.example.com/a.png" alt="配图"></p>
        <blockquote style="border-left:4px solid #2f80ed">引用内容</blockquote>
        <section><h2 style="border-left: 4px solid #2f80ed;">小标题</h2></section>
      </div>
    </body>
  </html>
`

describe('extractWechatArticleFromHtml', () => {
  it('extracts article metadata and markdown', async () => {
    const result = await extractWechatArticleFromHtml(html, 'https://mp.weixin.qq.com/s/demo')

    expect(result.article.title).toBe('示例文章')
    expect(result.article.author).toBe('easymd 作者')
    expect(result.article.publishTime).toBe('2026-05-07')
    expect(result.article.sourceUrl).toBe('https://mp.weixin.qq.com/s/demo')
    expect(result.article.markdown).toContain('# 示例文章')
    expect(result.article.markdown).toContain('> 来源：easymd 作者，https://mp.weixin.qq.com/s/demo')
    expect(result.article.markdown).toContain('第一段正文')
    expect(result.article.markdown).toContain('![配图](https://img.example.com/a.png)')
    expect(result.article.markdown).toContain('> 引用内容')
    expect(result.bodyHtml).toContain('https://img.example.com/a.png')
  })

  it('throws when article body is missing', async () => {
    await expect(
      extractWechatArticleFromHtml('<h1 id="activity-name">空文章</h1>', 'https://mp.weixin.qq.com/s/demo'),
    ).rejects.toThrow('这篇文章的正文结构无法识别。')
  })
})
