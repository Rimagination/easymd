import { toast } from 'sonner'
import { trackEvent } from '@/lib/analytics'
import { usePreviewStore } from '@/stores/preview'
import { createImportedMarkdownStyle } from '@/themes/markdown-style/custom'
import { triggerStyleImportDialog } from './import-file'

export async function importMarkdownStyle(source: 'menu' | 'command' = 'menu') {
  const file = await triggerStyleImportDialog()
  if (!file) {
    return null
  }

  try {
    const css = await file.text()
    const { style, normalized } = createImportedMarkdownStyle(file.name, css)
    const {
      importedMarkdownStyles,
      setMarkdownStyle,
      upsertImportedMarkdownStyle,
    } = usePreviewStore.getState()
    const existingStyle = importedMarkdownStyles.find(item => item.id === style.id)

    upsertImportedMarkdownStyle(style)
    setMarkdownStyle(style.id)
    trackEvent('style', 'import-markdown-style', source, {
      styleId: style.id,
      normalized,
    })

    toast.success(
      existingStyle
        ? `Updated style "${style.name}" and switched to it.`
        : normalized
          ? `Imported "${style.name}" and auto-scoped it to #easymd.`
          : `Imported "${style.name}".`,
    )

    return style
  }
  catch (error) {
    console.error('Import markdown style error:', error)
    toast.error(error instanceof Error ? error.message : 'Failed to import style.')
    return null
  }
}
