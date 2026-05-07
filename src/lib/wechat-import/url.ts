export type WechatArticleUrlParseResult =
  | { ok: true, url: string }
  | { ok: false, error: string }

export function parseWechatArticleUrl(input: string): WechatArticleUrlParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, error: '请输入有效的文章链接。' }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  }
  catch {
    return { ok: false, error: '请输入有效的文章链接。' }
  }

  if (url.hostname !== 'mp.weixin.qq.com') {
    return { ok: false, error: '仅支持单篇微信公众号文章链接。' }
  }

  if (url.pathname !== '/s' && !url.pathname.startsWith('/s/')) {
    return { ok: false, error: '仅支持单篇微信公众号文章链接。' }
  }

  url.protocol = 'https:'
  url.hash = ''
  return { ok: true, url: url.href }
}
