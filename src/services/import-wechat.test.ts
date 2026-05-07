import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}))

const { apiFetch } = await import('@/lib/api')
const { importWechatArticleByUrl } = await import('./import-wechat')

const importResult = {
  article: {
    title: 'Demo',
    sourceUrl: 'https://mp.weixin.qq.com/s/demo',
    markdown: '# Demo',
  },
  theme: {
    sourceName: 'wechat-style-Demo.css',
    css: '#easymd {}',
    fingerprint: {
      colors: {},
      typography: {},
      spacing: {},
      decoration: {},
    },
  },
  warnings: [],
}

describe('importWechatArticleByUrl', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
  })

  it('posts the URL to the import endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(importResult)

    const result = await importWechatArticleByUrl('https://mp.weixin.qq.com/s/demo')

    expect(result).toEqual(importResult)
    expect(apiFetch).toHaveBeenCalledWith('/api/import/wechat', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://mp.weixin.qq.com/s/demo' }),
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('normalizes API errors', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce({
      data: { error: '无法读取这篇文章，请确认链接可公开访问。' },
    })

    await expect(importWechatArticleByUrl('https://mp.weixin.qq.com/s/demo')).rejects.toThrow(
      '无法读取这篇文章，请确认链接可公开访问。',
    )
  })
})
