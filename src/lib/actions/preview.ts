import { toast } from 'sonner'

export interface PreviewIframe {
  iframe: HTMLIFrameElement
  content: HTMLElement
}

export function getPreviewIframe(): PreviewIframe | null {
  try {
    const iframe = document.querySelector('#bm-preview-iframe') as HTMLIFrameElement | null
    if (!iframe?.contentDocument?.body) {
      toast.error('预览区域尚未就绪')
      return null
    }

    const content = iframe.contentDocument.getElementById('easymd')
    if (!content) {
      toast.error('没有可操作的内容')
      return null
    }

    return { iframe, content }
  }
  catch {
    toast.error('无法访问预览内容')
    return null
  }
}

export function getPreviewElement(): HTMLElement | null {
  return getPreviewIframe()?.content ?? null
}
