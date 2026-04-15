import { debounce } from 'es-toolkit'
import { ImageUp, Link2, MousePointer2, Palette, PencilLine, Type } from 'lucide-react'
import morphdom from 'morphdom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { usePreviewScrollSync } from '@/components/markdown/hooks/use-scroll-sync'
import { Phone } from '@/components/mockups/iphone'
import { Safari } from '@/components/mockups/safari'
import { Button } from '@/components/ui/button'
import { triggerFileDialog } from '@/lib/actions/import-file'
import { getMarkdownLocaleTexts } from '@/lib/locale'
import {
  applyPreviewTextStyle,
  normalizePreviewSelection,
  replacePreviewImageSource,
  replacePreviewText,
} from '@/lib/markdown/visual-edit'
import { uploadImage } from '@/services/upload'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { PREVIEW_WIDTH_MOBILE, usePreviewStore } from '@/stores/preview'
import { resolveMarkdownRenderStyle } from '@/themes/markdown-style/custom'
import iframeShell from './iframe-shell.html?raw'

const RENDER_DEBOUNCE_MS = 100
const VISUAL_EDIT_STYLE_ID = 'easymd-visual-edit-style'
const FONT_SIZE_OPTIONS = ['14px', '16px', '18px', '20px', '22px', '24px', '28px']

interface VisualSelectionState {
  imageSrc: string | null
  text: string
}

function installVisualEditStyle(doc: Document) {
  if (doc.getElementById(VISUAL_EDIT_STYLE_ID)) {
    return
  }

  const style = doc.createElement('style')
  style.id = VISUAL_EDIT_STYLE_ID
  style.textContent = `
body[data-easymd-visual-edit='true'] #easymd {
  user-select: text;
}

body[data-easymd-visual-edit='true'] #easymd img {
  cursor: pointer;
  transition: outline-color 0.16s ease, outline-offset 0.16s ease;
}

body[data-easymd-visual-edit='true'] #easymd img:hover,
body[data-easymd-visual-edit='true'] #easymd img[data-easymd-selected-image='true'] {
  outline: 3px solid #f59e0b;
  outline-offset: 4px;
}

body[data-easymd-visual-edit='true'] ::selection {
  background: rgba(245, 158, 11, 0.28);
}
`
  doc.head.appendChild(style)
}

function clearSelectedImages(doc: Document) {
  doc
    .querySelectorAll('img[data-easymd-selected-image="true"]')
    .forEach(img => img.removeAttribute('data-easymd-selected-image'))
}

interface VisualEditPanelProps {
  color: string
  enabled: boolean
  fontSize: string
  imageUrl: string
  replacementText: string
  selection: VisualSelectionState
  onApplyTextStyle: () => void
  onColorChange: (color: string) => void
  onFontSizeChange: (fontSize: string) => void
  onImageUrlChange: (url: string) => void
  onReplaceImageFile: () => void
  onReplaceImageUrl: () => void
  onReplaceText: () => void
  onReplacementTextChange: (text: string) => void
  onToggle: () => void
}

function VisualEditPanel({
  color,
  enabled,
  fontSize,
  imageUrl,
  replacementText,
  selection,
  onApplyTextStyle,
  onColorChange,
  onFontSizeChange,
  onImageUrlChange,
  onReplaceImageFile,
  onReplaceImageUrl,
  onReplaceText,
  onReplacementTextChange,
  onToggle,
}: VisualEditPanelProps) {
  return (
    <div
      className={`
        pointer-events-none absolute top-2 left-2 z-20 flex
        max-w-[calc(100%-1rem)] flex-col items-start gap-2
      `}
    >
      <Button
        type="button"
        size="sm"
        variant={enabled ? 'default' : 'outline'}
        className="pointer-events-auto shadow-lg shadow-black/10"
        onClick={onToggle}
      >
        {enabled
          ? (
              <MousePointer2 className="size-3.5" />
            )
          : (
              <PencilLine className="size-3.5" />
            )}
        {enabled ? '预览编辑中' : '预览编辑'}
      </Button>

      {enabled && (
        <section
          className={`
            pointer-events-auto w-[min(24rem,calc(100vw-2rem))] border
            border-border/80 bg-background/95 p-2 shadow-xl shadow-black/10
            backdrop-blur
          `}
        >
          <div
            className={`
              mb-2 flex items-center justify-between gap-2 text-[11px]
              text-muted-foreground
            `}
          >
            <span>
              {selection.text
                ? `已选文字：${selection.text.slice(0, 18)}${selection.text.length > 18 ? '…' : ''}`
                : '选中文字后可改内容、字号、颜色'}
            </span>
            <span>{selection.imageSrc ? '已选图片' : '点图片可替换'}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] gap-1.5">
            <select
              value={fontSize}
              onChange={event => onFontSizeChange(event.target.value)}
              className={`
                h-8 border border-border bg-background px-2 text-xs outline-none
                focus:border-ring
              `}
              aria-label="字号"
            >
              {FONT_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <input
              type="color"
              value={color}
              onChange={event => onColorChange(event.target.value)}
              className="h-8 w-9 border border-border bg-background p-1"
              aria-label="颜色"
            />
            <Button type="button" size="sm" variant="outline" onClick={onApplyTextStyle}>
              <Palette className="size-3.5" />
              应用
            </Button>
          </div>

          <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5">
            <input
              value={replacementText}
              onChange={event => onReplacementTextChange(event.target.value)}
              placeholder="选中文字后可在这里改内容"
              className={`
                h-8 border border-border bg-background px-2 text-xs outline-none
                focus:border-ring
              `}
              aria-label="替换文字"
            />
            <Button type="button" size="sm" variant="ghost" onClick={onReplaceText}>
              <Type className="size-3.5" />
              改文字
            </Button>
          </div>

          <div className="mt-1.5 grid grid-cols-[1fr_auto_auto] gap-1.5">
            <input
              value={imageUrl}
              onChange={event => onImageUrlChange(event.target.value)}
              placeholder="点图片后可替换地址"
              className={`
                h-8 border border-border bg-background px-2 text-xs outline-none
                focus:border-ring
              `}
              aria-label="图片地址"
            />
            <Button type="button" size="sm" variant="ghost" onClick={onReplaceImageUrl}>
              <Link2 className="size-3.5" />
              地址
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onReplaceImageFile}>
              <ImageUp className="size-3.5" />
              换图
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

export default function MarkdownRender() {
  const content = useFilesStore(state => state.currentContent)
  const setContent = useFilesStore(state => state.setCurrentContent)
  const enableScrollSync = useEditorStore(state => state.enableScrollSync)
  const enableFootnoteLinks = useEditorStore(state => state.enableFootnoteLinks)
  const openLinksInNewWindow = useEditorStore(state => state.openLinksInNewWindow)
  const previewWidth = usePreviewStore(state => state.previewWidth)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const mermaidTheme = usePreviewStore(state => state.mermaidTheme)
  const infographic = usePreviewStore(state => state.infographic)
  const importedMarkdownStyles = usePreviewStore(state => state.importedMarkdownStyles)
  const customCss = usePreviewStore(state => state.customCss)
  const paletteOverrideCss = usePreviewStore(state => state.paletteOverrideCss)
  const renderedHtml = usePreviewStore(state => state.getRenderedHtml('html'))
  const setRenderedHtml = usePreviewStore(state => state.setRenderedHtml)
  const clearRenderedHtmlCache = usePreviewStore(state => state.clearRenderedHtmlCache)
  const resolvedStyle = useMemo(
    () => {
      const style = resolveMarkdownRenderStyle(markdownStyle, importedMarkdownStyles, customCss)
      return {
        ...style,
        customCss: [style.customCss, paletteOverrideCss].filter(Boolean).join('\n'),
      }
    },
    [markdownStyle, importedMarkdownStyles, customCss, paletteOverrideCss],
  )

  const { iframeRef, onIframeLoad: onScrollSyncLoad } = usePreviewScrollSync({
    enabled: enableScrollSync,
  })

  const iframeReadyRef = useRef(false)
  const pendingHtmlRef = useRef<string | null>(null)
  const canceledRef = useRef(false)
  const renderedHtmlRef = useRef(renderedHtml)
  const [iframeRevision, setIframeRevision] = useState(0)
  const [isVisualEditEnabled, setIsVisualEditEnabled] = useState(false)
  const [visualSelection, setVisualSelection] = useState<VisualSelectionState>({
    imageSrc: null,
    text: '',
  })
  const [visualFontSize, setVisualFontSize] = useState('18px')
  const [visualColor, setVisualColor] = useState('#f59e0b')
  const [visualReplacementText, setVisualReplacementText] = useState('')
  const [visualImageUrl, setVisualImageUrl] = useState('')

  useEffect(() => {
    renderedHtmlRef.current = renderedHtml
  }, [renderedHtml])

  const updateIframeContent = useCallback((html: string) => {
    const iframe = iframeRef.current
    const body = iframe?.contentDocument?.body

    if (!body) {
      pendingHtmlRef.current = html
      return
    }

    const wrapper = document.createElement('body')
    wrapper.innerHTML = html

    morphdom(body, wrapper, {
      childrenOnly: true,
      onBeforeElUpdated(fromEl, toEl) {
        if (fromEl.isEqualNode(toEl)) {
          return false
        }
        return true
      },
    })
  }, [iframeRef])

  const updateVisualSelection = useCallback(() => {
    const selection = iframeRef.current?.contentDocument?.getSelection()
    const text = normalizePreviewSelection(selection?.toString() ?? '')

    setVisualSelection(current => (
      current.text === text ? current : { ...current, text }
    ))
    setVisualReplacementText(text)
  }, [iframeRef])

  const handleVisualPreviewClick = useCallback((event: MouseEvent) => {
    if (!isVisualEditEnabled) {
      return
    }

    const doc = iframeRef.current?.contentDocument
    const target = event.target as HTMLElement | null
    if (!doc || !target) {
      return
    }

    const image = target.closest('img') as HTMLImageElement | null
    clearSelectedImages(doc)

    if (image) {
      event.preventDefault()
      const imageSrc = image.getAttribute('src') || image.currentSrc || null
      image.setAttribute('data-easymd-selected-image', 'true')
      setVisualSelection(current => ({
        ...current,
        imageSrc,
      }))
      setVisualImageUrl(imageSrc ?? '')
      return
    }

    setVisualSelection(current => (
      current.imageSrc ? { ...current, imageSrc: null } : current
    ))
    setVisualImageUrl('')
  }, [iframeRef, isVisualEditEnabled])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    const body = doc?.body
    if (!doc || !body) {
      return
    }

    installVisualEditStyle(doc)

    if (!isVisualEditEnabled) {
      body.removeAttribute('data-easymd-visual-edit')
      clearSelectedImages(doc)
      return
    }

    body.setAttribute('data-easymd-visual-edit', 'true')
    doc.addEventListener('mouseup', updateVisualSelection)
    doc.addEventListener('keyup', updateVisualSelection)
    doc.addEventListener('click', handleVisualPreviewClick, true)

    return () => {
      doc.removeEventListener('mouseup', updateVisualSelection)
      doc.removeEventListener('keyup', updateVisualSelection)
      doc.removeEventListener('click', handleVisualPreviewClick, true)
    }
  }, [
    iframeRef,
    iframeRevision,
    isVisualEditEnabled,
    renderedHtml,
    handleVisualPreviewClick,
    updateVisualSelection,
  ])

  const handleToggleVisualEdit = useCallback(() => {
    setIsVisualEditEnabled((enabled) => {
      if (enabled) {
        setVisualSelection({ imageSrc: null, text: '' })
        setVisualReplacementText('')
        setVisualImageUrl('')
      }
      return !enabled
    })
  }, [])

  const applyTextResult = useCallback((nextMarkdown: string, changed: boolean, successMessage: string) => {
    if (!changed) {
      toast.error('没有在 Markdown 源文档中找到这段内容')
      return
    }

    setContent(nextMarkdown)
    toast.success(successMessage)
  }, [setContent])

  const handleApplyTextStyle = useCallback(() => {
    if (!visualSelection.text) {
      toast.error('请先在预览里选中一段文字')
      return
    }

    const result = applyPreviewTextStyle(content, visualSelection.text, {
      color: visualColor,
      fontSize: visualFontSize,
    })

    applyTextResult(result.markdown, result.changed, '已同步文字样式')
  }, [applyTextResult, content, visualColor, visualFontSize, visualSelection.text])

  const handleReplaceText = useCallback(() => {
    if (!visualSelection.text) {
      toast.error('请先在预览里选中一段文字')
      return
    }

    if (!visualReplacementText.trim()) {
      return
    }

    const result = replacePreviewText(content, visualSelection.text, visualReplacementText)
    applyTextResult(result.markdown, result.changed, '已同步文字修改')
  }, [applyTextResult, content, visualReplacementText, visualSelection.text])

  const applyImageResult = useCallback((nextSrc: string) => {
    if (!visualSelection.imageSrc) {
      toast.error('请先在预览里点击一张图片')
      return
    }

    const result = replacePreviewImageSource(content, visualSelection.imageSrc, nextSrc)
    if (!result.changed) {
      toast.error('没有在 Markdown 源文档中找到这张图片地址')
      return
    }

    setContent(result.markdown)
    toast.success('已同步图片替换')
  }, [content, setContent, visualSelection.imageSrc])

  const handleReplaceImageUrl = useCallback(() => {
    if (!visualImageUrl.trim()) {
      return
    }

    applyImageResult(visualImageUrl)
  }, [applyImageResult, visualImageUrl])

  const handleReplaceImageFile = useCallback(async () => {
    if (!visualSelection.imageSrc) {
      toast.error('请先在预览里点击一张图片')
      return
    }

    const [file] = await triggerFileDialog({ accept: 'image/*', multiple: false })
    if (!file) {
      return
    }

    const toastId = toast.loading(`正在上传：${file.name}`)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      const result = await uploadImage(formData)
      applyImageResult(result.url)
      toast.success(`已替换图片：${file.name}`, { id: toastId })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(`图片上传失败：${message}`, { id: toastId })
    }
  }, [applyImageResult, visualSelection.imageSrc])

  const onIframeLoad = useCallback(() => {
    iframeReadyRef.current = true
    setIframeRevision(revision => revision + 1)
    onScrollSyncLoad()

    const htmlToRender = pendingHtmlRef.current ?? renderedHtmlRef.current
    if (htmlToRender) {
      updateIframeContent(htmlToRender)
      pendingHtmlRef.current = null
    }

    // 拦截 iframe 内的链接点击
    const iframeDoc = iframeRef.current?.contentDocument
    if (iframeDoc) {
      iframeDoc.addEventListener('click', (e: MouseEvent) => {
        const link = (e.target as HTMLElement).closest('a')
        if (!link)
          return

        const href = link.getAttribute('href')
        if (!href)
          return

        e.preventDefault()

        // 页内锚点跳转（脚注引用、返回链接等）
        if (href.startsWith('#')) {
          let targetHref = href
          if (href.includes('-fnref-')) {
            targetHref = href.replace('-fnref-', '-fn-')
          }
          else if (href.includes('-fn-')) {
            targetHref = href.replace('-fn-', '-fnref-')
          }
          const target = iframeDoc.querySelector(`[href="${CSS.escape(targetHref)}"]`)
          if (target) {
            target.scrollIntoView({ behavior: 'auto' })
          }
          return
        }

        // 外部链接 - 顶层窗口新开标签页
        window.open(href, '_blank', 'noopener')
      })
    }
  }, [onScrollSyncLoad, updateIframeContent, iframeRef])

  useEffect(() => {
    if (!renderedHtml) {
      return
    }

    if (iframeReadyRef.current) {
      updateIframeContent(renderedHtml)
    }
    else {
      pendingHtmlRef.current = renderedHtml
    }
  }, [renderedHtml, updateIframeContent])

  const scheduleRender = useMemo(
    () => debounce(async (
      nextContent: string,
      styleId: string,
      themeId: string,
      mermaidThemeId: string,
      infographicThemeId: string,
      infographicPaletteId: string,
      customCssValue: string,
      enableRefLinks: boolean,
      openNewWin: boolean,
    ) => {
      try {
        const { markdown } = await import('@/lib/markdown/browser')
        const result = await markdown.render({
          markdown: nextContent,
          markdownStyle: styleId,
          codeTheme: themeId,
          mermaidTheme: mermaidThemeId,
          infographicTheme: infographicThemeId,
          infographicPalette: infographicPaletteId,
          customCss: customCssValue,
          enableFootnoteLinks: enableRefLinks,
          openLinksInNewWindow: openNewWin,
          ...getMarkdownLocaleTexts(),
        })

        if (!canceledRef.current) {
          setRenderedHtml('html', result.result)
        }
      }
      catch (error) {
        if (!canceledRef.current) {
          const message = error instanceof Error ? error.message : '转换失败'
          setRenderedHtml('html', message)
        }
      }
    }, RENDER_DEBOUNCE_MS),
    [setRenderedHtml],
  )

  useEffect(() => {
    clearRenderedHtmlCache()
    canceledRef.current = false
    scheduleRender(
      content,
      resolvedStyle.markdownStyle ?? '',
      codeTheme,
      mermaidTheme,
      infographic.theme,
      infographic.palette,
      resolvedStyle.customCss,
      enableFootnoteLinks,
      openLinksInNewWindow,
    )

    return () => {
      canceledRef.current = true
      scheduleRender.cancel()
    }
  }, [content, codeTheme, mermaidTheme, infographic, enableFootnoteLinks, openLinksInNewWindow, resolvedStyle, scheduleRender, clearRenderedHtmlCache])

  const isMobile = previewWidth === PREVIEW_WIDTH_MOBILE

  const iframeContent = (
    <iframe
      ref={iframeRef}
      id="easymd-preview-iframe"
      title="Markdown 预览"
      className="h-full w-full border-0"
      sandbox="allow-same-origin allow-modals"
      srcDoc={iframeShell}
      onLoad={onIframeLoad}
    />
  )

  const previewSurface = isMobile
    ? (
        <Phone>
          {iframeContent}
        </Phone>
      )
    : (
        <Safari
          className="h-full w-full"
          style={{ maxWidth: previewWidth }}
          url="easymd"
          mode="simple"
        >
          {iframeContent}
        </Safari>
      )

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {previewSurface}
      <VisualEditPanel
        enabled={isVisualEditEnabled}
        selection={visualSelection}
        fontSize={visualFontSize}
        color={visualColor}
        replacementText={visualReplacementText}
        imageUrl={visualImageUrl}
        onToggle={handleToggleVisualEdit}
        onFontSizeChange={setVisualFontSize}
        onColorChange={setVisualColor}
        onReplacementTextChange={setVisualReplacementText}
        onImageUrlChange={setVisualImageUrl}
        onApplyTextStyle={handleApplyTextStyle}
        onReplaceText={handleReplaceText}
        onReplaceImageFile={handleReplaceImageFile}
        onReplaceImageUrl={handleReplaceImageUrl}
      />
    </div>
  )
}
