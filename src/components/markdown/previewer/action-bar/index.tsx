import { TooltipProvider } from '@/components/ui/tooltip'
import { CopyButton } from './copy-button'
import { ExportButton } from './export-button'
import { WechatDraftButton } from './wechat-draft-button'

export function PreviewerActionBar() {
  return (
    <TooltipProvider>
      <CopyButton platform="wechat" />
      <WechatDraftButton />
      <CopyButton platform="zhihu" />
      <CopyButton platform="html" />
      <ExportButton />
    </TooltipProvider>
  )
}
