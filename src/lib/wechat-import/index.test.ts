import { describe, expect, it } from 'vitest'
import { importWechatArticleFromHtml } from './index'

describe('importWechatArticleFromHtml', () => {
  it('returns article markdown and generated theme', async () => {
    const result = await importWechatArticleFromHtml({
      html: `
        <h1 id="activity-name">Style / Article?</h1>
        <span id="js_name">easymd author</span>
        <div id="js_content">
          <p style="font-size:16px;line-height:1.9;color:#333333;">Body text</p>
          <h2 style="border-left:4px solid #d9480f;font-size:22px;">Section</h2>
        </div>
      `,
      sourceUrl: 'https://mp.weixin.qq.com/s/demo',
    })

    expect(result.article.title).toBe('Style / Article?')
    expect(result.article.markdown).toContain('Body text')
    expect(result.theme.sourceName).toBe('wechat-style-Style---Article-.css')
    expect(result.theme.css).toContain('#easymd')
    expect(result.theme.fingerprint.colors.accent).toBe('#d9480f')
    expect(result.warnings).toEqual([])
  })
})
