import { Send } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePlatformCopy } from './use-platform-copy'
import { WechatDraftDialog } from './wechat-draft-dialog'

export function WechatDraftButton() {
  const [open, setOpen] = useState(false)
  const { getHtml, isLoading } = usePlatformCopy('wechat')

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={(
            <Button
              variant="ghost"
              size="icon"
              aria-label="同步到草稿箱"
              onClick={() => setOpen(true)}
              disabled={isLoading}
            >
              <Send className="size-4 text-[#07C160]" />
            </Button>
          )}
        />
        <TooltipContent>同步到草稿箱</TooltipContent>
      </Tooltip>
      <WechatDraftDialog
        open={open}
        onOpenChange={setOpen}
        getHtml={getHtml}
      />
    </>
  )
}
