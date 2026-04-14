import { Palette, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { importMarkdownStyle } from '@/lib/actions'
import { usePreviewStore } from '@/stores/preview'
import { markdownStyles } from '@/themes/markdown-style'

const styleTooltip = 'Markdown styles'
const styleAriaLabel = 'Markdown styles'

export function MarkdownStyleMenu() {
  const currentStyle = usePreviewStore(state => state.markdownStyle)
  const setMarkdownStyle = usePreviewStore(state => state.setMarkdownStyle)
  const importedMarkdownStyles = usePreviewStore(state => state.importedMarkdownStyles)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DropdownMenuTrigger
              render={(
                <Button variant="ghost" size="icon" aria-label={styleAriaLabel}>
                  <Palette className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>{styleTooltip}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Built-in styles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={currentStyle} onValueChange={setMarkdownStyle}>
            {markdownStyles.map(style => (
              <DropdownMenuRadioItem
                key={style.id}
                value={style.id}
                className="cursor-pointer"
              >
                {style.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {importedMarkdownStyles.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Imported styles</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={currentStyle} onValueChange={setMarkdownStyle}>
                {importedMarkdownStyles.map(style => (
                  <DropdownMenuRadioItem
                    key={style.id}
                    value={style.id}
                    className="cursor-pointer"
                  >
                    {style.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              void importMarkdownStyle('menu')
            }}
          >
            <Upload className="size-4" />
            Import custom style...
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
