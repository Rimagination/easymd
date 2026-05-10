export const MAX_WECHAT_HTML_SIZE = 8_000_000
export const WECHAT_HTML_TOO_LARGE_ERROR = '文章内容过大，无法导入。'

export async function readWechatArticleHtml(response: Response): Promise<string> {
  const text = await response.text()

  if (text.length > MAX_WECHAT_HTML_SIZE) {
    throw new Error(WECHAT_HTML_TOO_LARGE_ERROR)
  }

  return text
}
