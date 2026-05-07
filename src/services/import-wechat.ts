import type { WechatArticleImportResult } from '@/lib/wechat-import'
import { apiFetch } from '@/lib/api'

function normalizeImportError(error: unknown): string {
  if (error && typeof error === 'object') {
    const data = 'data' in error ? error.data : undefined
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error
    }

    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
  }

  return '公众号文章导入失败。'
}

export async function importWechatArticleByUrl(url: string): Promise<WechatArticleImportResult> {
  try {
    return await apiFetch<WechatArticleImportResult>('/api/import/wechat', {
      method: 'POST',
      body: JSON.stringify({ url }),
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    throw new Error(normalizeImportError(error))
  }
}
