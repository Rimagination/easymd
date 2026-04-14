import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CodeThemeMenu } from './code-theme-menu'
import { CopyButton } from './copy-button'
import { CustomCssDialog } from './custom-css-dialog'
import { ExportButton } from './export-button'
import { InfographicSettingsMenu } from './infographic-settings-menu'
import { MarkdownStyleMenu } from './markdown-style-menu'
import { MermaidThemeMenu } from './mermaid-theme-menu'
import { PaletteRecolorMenu } from './palette-recolor-menu'

export function PreviewerActionBar() {
  return (
    <TooltipProvider>
      <CopyButton platform="wechat" />
      <CopyButton platform="zhihu" />
      <CopyButton platform="html" />
      <ExportButton />
      <Separator orientation="vertical" className="mx-2" />
      <MarkdownStyleMenu />
      <PaletteRecolorMenu />
      <CodeThemeMenu />
      <MermaidThemeMenu />
      <InfographicSettingsMenu />
      <CustomCssDialog />
    </TooltipProvider>
  )
}
