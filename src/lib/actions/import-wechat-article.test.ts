import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('@/services/import-wechat', () => ({
  importWechatArticleByUrl: vi.fn(),
}))

vi.mock('@/stores/files', () => ({
  useFilesStore: {
    getState: vi.fn(),
  },
}))

vi.mock('@/stores/preview', () => ({
  usePreviewStore: {
    getState: vi.fn(),
  },
}))

vi.mock('@/themes/markdown-style/custom', () => ({
  createImportedMarkdownStyle: vi.fn(),
}))

const { toast } = await import('sonner')
const { trackEvent } = await import('@/lib/analytics')
const { importWechatArticleByUrl } = await import('@/services/import-wechat')
const { useFilesStore } = await import('@/stores/files')
const { usePreviewStore } = await import('@/stores/preview')
const { createImportedMarkdownStyle } = await import('@/themes/markdown-style/custom')
const { importWechatArticle } = await import('./import-wechat-article')

describe('importWechatArticle', () => {
  const createFile = vi.fn()
  const switchFile = vi.fn()
  const setMarkdownStyle = vi.fn()
  const upsertImportedMarkdownStyle = vi.fn()
  const style = {
    id: 'custom:wechat-style-demo',
    name: 'Wechat Style Demo',
    sourceName: 'wechat-style-demo.css',
    css: '#easymd {}',
    importedAt: 1,
  }

  beforeEach(() => {
    vi.mocked(importWechatArticleByUrl).mockReset()
    vi.mocked(createImportedMarkdownStyle).mockReset()
    vi.mocked(trackEvent).mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.warning).mockReset()
    createFile.mockReset()
    switchFile.mockReset()
    setMarkdownStyle.mockReset()
    upsertImportedMarkdownStyle.mockReset()

    vi.mocked(useFilesStore.getState).mockReturnValue({
      createFile,
      switchFile,
    } as unknown as ReturnType<typeof useFilesStore.getState>)
    vi.mocked(usePreviewStore.getState).mockReturnValue({
      setMarkdownStyle,
      upsertImportedMarkdownStyle,
    } as unknown as ReturnType<typeof usePreviewStore.getState>)
    vi.mocked(createImportedMarkdownStyle).mockReturnValue({ style, normalized: false })
    createFile.mockResolvedValue('file-1')
  })

  it('imports article content and switches to the generated theme', async () => {
    vi.mocked(importWechatArticleByUrl).mockResolvedValueOnce({
      article: {
        title: 'Demo Article',
        sourceUrl: 'https://mp.weixin.qq.com/s/demo',
        markdown: '# Demo Article',
      },
      theme: {
        sourceName: 'wechat-style-demo.css',
        css: '#easymd {}',
        fingerprint: {
          colors: {},
          typography: {},
          spacing: {},
          decoration: {},
        },
      },
      warnings: ['部分图片仍引用原地址。'],
    })

    await importWechatArticle('https://mp.weixin.qq.com/s/demo')

    expect(importWechatArticleByUrl).toHaveBeenCalledWith('https://mp.weixin.qq.com/s/demo')
    expect(createImportedMarkdownStyle).toHaveBeenCalledWith('wechat-style-demo.css', '#easymd {}')
    expect(upsertImportedMarkdownStyle).toHaveBeenCalledWith(style)
    expect(setMarkdownStyle).toHaveBeenCalledWith('custom:wechat-style-demo')
    expect(createFile).toHaveBeenCalledWith('Demo Article', '# Demo Article')
    expect(switchFile).toHaveBeenCalledWith('file-1')
    expect(trackEvent).toHaveBeenCalledWith('import', 'wechat-article', 'menu', {
      styleId: 'custom:wechat-style-demo',
      warnings: 1,
    })
    expect(toast.success).toHaveBeenCalledWith('已导入文章并生成主题草稿。')
    expect(toast.warning).toHaveBeenCalledWith('部分图片仍引用原地址。')
  })
})
