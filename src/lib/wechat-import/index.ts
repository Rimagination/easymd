import type { WechatArticleImportResult, WechatStyleFingerprint } from './types'
import { extractWechatArticleFromHtml } from './dom'
import { extractWechatStyleFingerprint } from './style-fingerprint'
import { generateWechatThemeCss } from './theme-css'
import { parseWechatArticleUrl } from './url'

interface ImportWechatArticleFromHtmlOptions {
  html: string
  sourceUrl: string
}

function sanitizeSourceName(title: string): string {
  const safe = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 40)

  return `wechat-style-${safe || 'article'}.css`
}

export async function importWechatArticleFromHtml({
  html,
  sourceUrl,
}: ImportWechatArticleFromHtmlOptions): Promise<WechatArticleImportResult> {
  const extracted = await extractWechatArticleFromHtml(html, sourceUrl)
  const fingerprint = extractWechatStyleFingerprint(extracted.fingerprintHtml)
  const css = generateWechatThemeCss(fingerprint)

  return {
    article: extracted.article,
    theme: {
      sourceName: sanitizeSourceName(extracted.article.title),
      css,
      fingerprint,
    },
    warnings: [],
  }
}

export type { WechatArticleImportResult, WechatStyleFingerprint }
export { parseWechatArticleUrl }
