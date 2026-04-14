import fileSaver from 'file-saver'
import { toast } from 'sonner'
import { useFilesStore } from '@/stores/files'

const { saveAs } = fileSaver

export function exportMarkdown(content: string, fileName?: string) {
  if (!content.trim()) {
    toast.error('没有可导出的内容')
    return
  }

  const activeFile = useFilesStore.getState().getActiveFile()
  const exportFileName = fileName ?? activeFile?.name ?? 'easymd'

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  saveAs(blob, exportFileName)
  toast.success('已导出 Markdown 文件')
}
