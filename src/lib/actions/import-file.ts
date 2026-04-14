import { toast } from 'sonner'
import { importFilesAsNewTabs, isImageFile } from '@/lib/file-importer'

const ACCEPT_TYPES = 'text/html,text/markdown,.md,image/*'
const STYLE_ACCEPT_TYPES = 'text/css,.css'

interface TriggerFileDialogOptions {
  accept: string
  multiple?: boolean
}

export function triggerFileDialog({
  accept,
  multiple = true,
}: TriggerFileDialogOptions): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = multiple
    input.accept = accept

    let resolved = false

    function cleanup() {
      input.onchange = null
      window.removeEventListener('focus', handleWindowFocus)
    }

    function handleWindowFocus() {
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve([])
        }
      }, 300)
    }

    input.onchange = (e) => {
      if (resolved)
        return
      resolved = true
      cleanup()
      const target = e.target as HTMLInputElement
      resolve(target.files ? Array.from(target.files) : [])
    }

    window.addEventListener('focus', handleWindowFocus, { once: true })
    input.click()
  })
}

export function triggerImportDialog(): Promise<File[]> {
  return triggerFileDialog({ accept: ACCEPT_TYPES })
}

export async function triggerStyleImportDialog(): Promise<File | null> {
  const [file] = await triggerFileDialog({ accept: STYLE_ACCEPT_TYPES, multiple: false })
  return file ?? null
}

export async function handleImportFiles() {
  const files = await triggerImportDialog()
  if (!files.length)
    return

  const textFiles = files.filter(f => !isImageFile(f))
  const imageFiles = files.filter(isImageFile)

  if (textFiles.length > 0) {
    await importFilesAsNewTabs(textFiles)
    return
  }

  if (imageFiles.length > 0) {
    const { getImportEditorView, importFilesToEditor } = await import(
      '@/components/markdown/editor/file-import',
    )
    const view = getImportEditorView()
    if (view) {
      await importFilesToEditor(view, imageFiles, { insertPos: view.state.selection.main.anchor })
    }
    else {
      toast.error('编辑器尚未就绪')
    }
  }
}
