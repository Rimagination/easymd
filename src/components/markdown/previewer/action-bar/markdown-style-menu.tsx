import { Sparkles, Upload } from 'lucide-react'
import { useState } from 'react'
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
import MarkdownStyleIcon from '@/icons/markdown-style'
import { importMarkdownStyle } from '@/lib/actions'
import { usePreviewStore } from '@/stores/preview'
import { markdownStyles } from '@/themes/markdown-style'
import { WechatStyleImportDialog } from './wechat-style-import-dialog'

const styleTooltip = '排版样式'
const styleAriaLabel = '排版样式'

export function MarkdownStyleMenu() {
  const currentStyle = usePreviewStore(state => state.markdownStyle)
  const setMarkdownStyle = usePreviewStore(state => state.setMarkdownStyle)
  const importedMarkdownStyles = usePreviewStore(state => state.importedMarkdownStyles)
  const [wechatImportOpen, setWechatImportOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={(
              <DropdownMenuTrigger
                render={(
                  <Button variant="ghost" size="icon" aria-label={styleAriaLabel}>
                    <MarkdownStyleIcon className="size-4" />
                  </Button>
                )}
              />
            )}
          />
          <TooltipContent>{styleTooltip}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>内置样式</DropdownMenuLabel>
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
                <DropdownMenuLabel>导入样式</DropdownMenuLabel>
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
              onClick={() => setWechatImportOpen(true)}
            >
              <Sparkles className="size-4" />
              从公众号生成主题...
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                void importMarkdownStyle('menu')
              }}
            >
              <Upload className="size-4" />
              导入自定义样式...
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <WechatStyleImportDialog
        open={wechatImportOpen}
        onOpenChange={setWechatImportOpen}
      />
    </>
  )
}
