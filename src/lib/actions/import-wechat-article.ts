import { toast } from 'sonner'
import { trackEvent } from '@/lib/analytics'
import { importWechatArticleByUrl } from '@/services/import-wechat'
import { useFilesStore } from '@/stores/files'
import { usePreviewStore } from '@/stores/preview'
import { createImportedMarkdownStyle } from '@/themes/markdown-style/custom'

export async function importWechatArticle(url: string): Promise<void> {
  const result = await importWechatArticleByUrl(url)
  const { createFile, switchFile } = useFilesStore.getState()
  const {
    setMarkdownStyle,
    upsertImportedMarkdownStyle,
  } = usePreviewStore.getState()

  const { style } = createImportedMarkdownStyle(result.theme.sourceName, result.theme.css)
  upsertImportedMarkdownStyle(style)
  setMarkdownStyle(style.id)

  const fileId = await createFile(result.article.title, result.article.markdown)
  await switchFile(fileId)

  trackEvent('import', 'wechat-article', 'menu', {
    styleId: style.id,
    warnings: result.warnings.length,
  })

  toast.success('已导入文章并生成主题草稿。')
  for (const warning of result.warnings) {
    toast.warning(warning)
  }
}
