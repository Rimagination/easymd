import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CodeThemeMenu } from '../../previewer/action-bar/code-theme-menu'
import { CustomCssDialog } from '../../previewer/action-bar/custom-css-dialog'
import { InfographicSettingsMenu } from '../../previewer/action-bar/infographic-settings-menu'
import { MarkdownStyleMenu } from '../../previewer/action-bar/markdown-style-menu'
import { MermaidThemeMenu } from '../../previewer/action-bar/mermaid-theme-menu'
import { PaletteRecolorMenu } from '../../previewer/action-bar/palette-recolor-menu'
import { BlockSnippetMenu } from './block-snippet-menu'
import { ExportButton } from './export-button'
import { FormatButton } from './format-button'
import { ImportButton } from './import-button'
import { SettingsMenu } from './settings-menu'

interface EditorActionBarProps {
  showBlockSnippetMenu?: boolean
}

export function EditorActionBar({ showBlockSnippetMenu = true }: EditorActionBarProps) {
  return (
    <TooltipProvider>
      <ImportButton />
      <ExportButton />
      <Separator orientation="vertical" className="mx-2" />
      <FormatButton />
      <SettingsMenu />
      <Separator orientation="vertical" className="mx-2" />
      {showBlockSnippetMenu && <BlockSnippetMenu />}
      <MarkdownStyleMenu />
      <PaletteRecolorMenu />
      <CustomCssDialog />
      <CodeThemeMenu />
      <MermaidThemeMenu />
      <InfographicSettingsMenu />
    </TooltipProvider>
  )
}
