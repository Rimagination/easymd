import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ExportButton } from './export-button'
import { FormatButton } from './format-button'
import { ImportButton } from './import-button'
import { SettingsMenu } from './settings-menu'

export function EditorActionBar() {
  return (
    <TooltipProvider>
      <ImportButton />
      <ExportButton />
      <Separator orientation="vertical" className="mx-2" />
      <FormatButton />
      <SettingsMenu />
    </TooltipProvider>
  )
}
