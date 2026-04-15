import { TooltipProvider } from '@/components/ui/tooltip'
import { CopyButton } from './copy-button'
import { ExportButton } from './export-button'

export function PreviewerActionBar() {
  return (
    <TooltipProvider>
      <CopyButton platform="wechat" />
      <CopyButton platform="zhihu" />
      <CopyButton platform="html" />
      <ExportButton />
    </TooltipProvider>
  )
}
