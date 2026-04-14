import { toast } from 'sonner'
import { getPreviewIframe } from './preview'

let isExporting = false

const BLOCK_SELECTORS = 'p, li, blockquote, pre, img, figure, table, tr, dl, details, .markdown-alert, .math-display'
const HEADING_SELECTORS = 'h1, h2, h3, h4, h5, h6'

interface ElementBoundary {
  top: number
  bottom: number
  isHeading: boolean
}

function findSafePageBreaks(
  content: HTMLElement,
  canvasWidth: number,
  canvasHeight: number,
  pageHeight: number,
): number[] {
  const breaks: number[] = []
  const contentRect = content.getBoundingClientRect()

  const domToCanvasRatio = canvasWidth / contentRect.width

  const elements = content.querySelectorAll(BLOCK_SELECTORS)
  const headings = content.querySelectorAll(HEADING_SELECTORS)

  const boundaries: ElementBoundary[] = []

  for (const el of elements) {
    const rect = el.getBoundingClientRect()
    const top = (rect.top - contentRect.top) * domToCanvasRatio
    const bottom = (rect.bottom - contentRect.top) * domToCanvasRatio
    if (bottom - top < pageHeight) {
      boundaries.push({ top, bottom, isHeading: false })
    }
  }

  for (const el of headings) {
    const rect = el.getBoundingClientRect()
    boundaries.push({
      top: (rect.top - contentRect.top) * domToCanvasRatio,
      bottom: (rect.bottom - contentRect.top) * domToCanvasRatio,
      isHeading: true,
    })
  }

  boundaries.sort((a, b) => a.top - b.top)

  let idealBreak = pageHeight

  while (idealBreak < canvasHeight) {
    let safeBreak = idealBreak
    let foundConflict = false

    for (const { top, bottom, isHeading } of boundaries) {
      if (top < idealBreak && bottom > idealBreak) {
        foundConflict = true
        if (top > safeBreak - pageHeight) {
          safeBreak = Math.max(safeBreak === idealBreak ? 0 : safeBreak, top)
        }
      }

      const headingThreshold = 50 * domToCanvasRatio
      if (isHeading && bottom <= idealBreak && idealBreak - bottom < headingThreshold) {
        if (!foundConflict || top < safeBreak) {
          safeBreak = top
          foundConflict = true
        }
      }
    }

    if (foundConflict && safeBreak === 0) {
      safeBreak = idealBreak
    }

    const lastBreak = breaks.length > 0 ? breaks[breaks.length - 1] : 0
    if (safeBreak <= lastBreak + 100) {
      safeBreak = idealBreak
    }

    breaks.push(safeBreak)
    idealBreak = safeBreak + pageHeight
  }

  return breaks
}

export async function exportPdf() {
  if (isExporting) {
    toast.info('正在导出中，请稍候...')
    return
  }

  const preview = getPreviewIframe()
  if (!preview)
    return

  isExporting = true
  const loadingToast = toast.loading('正在生成 PDF...')

  try {
    const { snapdom } = await import('@zumer/snapdom')
    const { default: JsPDF } = await import('jspdf')

    const snapshot = await snapdom(preview.content)
    const canvas = await snapshot.toCanvas({ scale: 2 })

    if (canvas.width === 0 || canvas.height === 0) {
      toast.error('没有可导出的内容', { id: loadingToast })
      return
    }

    const a4Width = 210
    const a4Height = 297
    const padding = 8

    const contentWidth = a4Width - padding * 2
    const contentHeight = a4Height - padding * 3

    const scale = contentWidth / canvas.width
    const canvasPageHeight = contentHeight / scale

    const pageBreaks = findSafePageBreaks(
      preview.content,
      canvas.width,
      canvas.height,
      canvasPageHeight,
    )

    const bgColor = getComputedStyle(preview.content).backgroundColor || '#ffffff'

    const pdf = new JsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    let prevBreak = 0
    for (let i = 0; i <= pageBreaks.length; i++) {
      if (i > 0) {
        pdf.addPage()
      }

      pdf.setFillColor(bgColor)
      pdf.rect(0, 0, a4Width, a4Height, 'F')

      const sourceY = prevBreak
      const sourceHeight = i < pageBreaks.length
        ? pageBreaks[i] - prevBreak
        : canvas.height - prevBreak

      if (sourceHeight <= 0)
        continue

      const targetHeight = sourceHeight * scale

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sourceHeight

      const ctx = pageCanvas.getContext('2d')
      if (!ctx) {
        throw new Error('无法创建 canvas context')
      }

      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sourceHeight,
        0,
        0,
        canvas.width,
        sourceHeight,
      )

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92)
      pdf.addImage(pageImgData, 'JPEG', padding, padding * 1.5, contentWidth, targetHeight)

      prevBreak = pageBreaks[i] ?? canvas.height
    }

    pdf.save('easymd.pdf')
    toast.success('已导出 PDF', { id: loadingToast })
  }
  catch (error) {
    console.error(error)
    if (error instanceof Error && error.message.includes('import')) {
      toast.error('PDF 组件加载失败，请刷新重试', { id: loadingToast })
    }
    else {
      toast.error('导出 PDF 失败', { id: loadingToast })
    }
  }
  finally {
    isExporting = false
  }
}

export function printPreview() {
  const preview = getPreviewIframe()
  if (!preview)
    return

  try {
    const contentWindow = preview.iframe.contentWindow
    if (!contentWindow) {
      toast.error('无法访问预览窗口')
      return
    }
    contentWindow.print()
  }
  catch (error) {
    toast.error('打印失败')
    console.error(error)
  }
}
