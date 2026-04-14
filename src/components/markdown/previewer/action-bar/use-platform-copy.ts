import type { Platform } from '@/lib/markdown/render/adapters'
import { useCallback, useState } from 'react'
import { getMarkdownLocaleTexts } from '@/lib/locale'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { usePreviewStore } from '@/stores/preview'
import { resolveMarkdownRenderStyle } from '@/themes/markdown-style/custom'

export interface PlatformCopyResult {
  getHtml: () => Promise<string>
  isLoading: boolean
  error: Error | null
}

export function usePlatformCopy(platform: Platform): PlatformCopyResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const content = useFilesStore(state => state.currentContent)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const importedMarkdownStyles = usePreviewStore(state => state.importedMarkdownStyles)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const customCss = usePreviewStore(state => state.customCss)
  const enableFootnoteLinks = useEditorStore(state => state.enableFootnoteLinks)
  const openLinksInNewWindow = useEditorStore(state => state.openLinksInNewWindow)
  const getRenderedHtml = usePreviewStore(state => state.getRenderedHtml)
  const setRenderedHtml = usePreviewStore(state => state.setRenderedHtml)
  const resolvedStyle = resolveMarkdownRenderStyle(markdownStyle, importedMarkdownStyles, customCss)

  const getHtml = useCallback(async (): Promise<string> => {
    const cached = getRenderedHtml(platform)
    if (cached) {
      setError(null)
      return cached
    }

    setIsLoading(true)
    setError(null)

    try {
      const { markdown } = await import('@/lib/markdown/browser')
      const result = await markdown.render({
        markdown: content,
        markdownStyle: resolvedStyle.markdownStyle ?? '',
        codeTheme,
        customCss: resolvedStyle.customCss,
        enableFootnoteLinks,
        openLinksInNewWindow,
        platform,
        ...getMarkdownLocaleTexts(),
      })
      setRenderedHtml(platform, result.result)
      return result.result
    }
    catch (err) {
      const error = err instanceof Error ? err : new Error('渲染失败')
      setError(error)
      console.error(`[${platform}] 渲染失败:`, err)
      throw error
    }
    finally {
      setIsLoading(false)
    }
  }, [content, codeTheme, enableFootnoteLinks, openLinksInNewWindow, platform, getRenderedHtml, resolvedStyle, setRenderedHtml])

  return { getHtml, isLoading, error }
}
