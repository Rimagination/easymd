import { LayoutTemplate } from 'lucide-react'
import { useState } from 'react'
import { ArticleBlockLibrary } from '@/components/markdown/article-block-library'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function BlockSnippetMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={(
            <PopoverTrigger
              render={(
                <Button variant="ghost" size="icon" aria-label="插入组件">
                  <LayoutTemplate className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>插入组件</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[min(25rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        <ArticleBlockLibrary mode="popover" onInserted={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
