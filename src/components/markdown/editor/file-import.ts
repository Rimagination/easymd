import { EditorView, ViewPlugin } from '@codemirror/view'
import { toast } from 'sonner'
import { importFilesAsNewTabs, isImageFile, isTextFile } from '@/lib/file-importer'
import { uploadImage } from '@/services/upload'

let currentEditorView: EditorView | null = null

export function getImportEditorView(): EditorView | null {
  return currentEditorView
}

function getFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) {
    return []
  }

  const items = Array.from(dataTransfer.items ?? [])
  const filesFromItems = items
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter((file): file is File => Boolean(file))

  return filesFromItems.length
    ? filesFromItems
    : Array.from(dataTransfer.files ?? [])
}

function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|\*\*|__|```|^\s*[-*+]\s|\[.+\]\(.+\)/m.test(text)
}

export const importViewTrackerExtension = ViewPlugin.fromClass(
  class {
    private view: EditorView

    constructor(view: EditorView) {
      this.view = view
      currentEditorView = view
    }

    destroy() {
      if (currentEditorView === this.view) {
        currentEditorView = null
      }
    }
  },
)

export async function importFilesToEditor(
  view: EditorView,
  files: File[],
  options: { insertPos?: number, replaceAll?: boolean } = {},
): Promise<void> {
  if (!files.length) {
    return
  }

  const { insertPos, replaceAll = false } = options
  const selection = view.state.selection.main
  let currentInsertPos = insertPos ?? selection.from

  for (const file of files) {
    if (file.type === 'text/html') {
      try {
        const html = await file.text()
        const { markdown } = await import('@/lib/markdown/browser')
        const { result: md } = await markdown.parse({ html })
        const from = replaceAll ? 0 : (insertPos ?? selection.from)
        const to = replaceAll ? view.state.doc.length : (insertPos ?? selection.to)
        view.dispatch({
          changes: { from, to, insert: md },
          selection: { anchor: from + md.length },
        })
        toast.success(`HTML 导入成功：${file.name}`)
        break
      }
      catch (error) {
        console.error('HTML parse error:', error)
        toast.error(`HTML 导入失败：${file.name}`)
      }
      continue
    }

    if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      try {
        const md = await file.text()
        const from = replaceAll ? 0 : (insertPos ?? selection.from)
        const to = replaceAll ? view.state.doc.length : (insertPos ?? selection.to)
        view.dispatch({
          changes: { from, to, insert: md },
          selection: { anchor: from + md.length },
        })
        toast.success(`Markdown 导入成功：${file.name}`)
        break
      }
      catch (error) {
        console.error('Markdown read error:', error)
        toast.error(`Markdown 导入失败：${file.name}`)
      }
      continue
    }

    if (file.type.startsWith('image/')) {
      const toastId = toast.loading(`正在上传：${file.name}...`)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)
        const result = await uploadImage(formData)

        const imageMarkdown = `\n![${file.name}](${result.url})\n`

        view.dispatch({
          changes: { from: currentInsertPos, insert: imageMarkdown },
          selection: { anchor: currentInsertPos + imageMarkdown.length },
        })
        currentInsertPos += imageMarkdown.length
        toast.success(`图片上传成功：${file.name}`, { id: toastId })
      }
      catch (error: any) {
        console.error('Image upload error:', error)
        const imageMarkdown = `\n![${file.name}](upload_failed)\n`
        view.dispatch({
          changes: { from: currentInsertPos, insert: imageMarkdown },
          selection: { anchor: currentInsertPos + imageMarkdown.length },
        })
        currentInsertPos += imageMarkdown.length
        toast.error(error.message || `图片上传失败：${file.name}`, { id: toastId })
      }
      continue
    }
  }
}

export const importDropPasteExtension = EditorView.domEventHandlers({
  drop(event, view) {
    const files = getFilesFromDataTransfer(event.dataTransfer)
    if (!files.length) {
      return
    }

    event.preventDefault()

    const textFiles = files.filter(isTextFile)
    const imageFiles = files.filter(isImageFile)

    if (textFiles.length > 0) {
      void importFilesAsNewTabs(textFiles)
      return
    }

    if (imageFiles.length > 0) {
      void importFilesToEditor(view, imageFiles, { insertPos: view.state.selection.main.anchor })
    }
  },
  paste(event, view) {
    const files = getFilesFromDataTransfer(event.clipboardData)
    if (files.length) {
      event.preventDefault()
      const insertPos = view.state.selection.main.anchor
      void importFilesToEditor(view, files, { insertPos })
      return
    }

    const html = event.clipboardData?.getData('text/html') ?? ''
    const text = event.clipboardData?.getData('text/plain') ?? ''

    // Markdown-looking plain text should stay plain; otherwise prefer HTML conversion.
    if (!html || looksLikeMarkdown(text)) {
      return
    }

    event.preventDefault()
    const selection = view.state.selection.main
    void (async () => {
      try {
        const { markdown } = await import('@/lib/markdown/browser')
        const { result: md } = await markdown.parse({ html })
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: md },
          selection: { anchor: selection.from + md.length },
        })
        toast.success('HTML 已转换为 Markdown')
      }
      catch (error) {
        console.error('HTML parse error:', error)
        toast.error('HTML 转换失败')
      }
    })()
  },
})
