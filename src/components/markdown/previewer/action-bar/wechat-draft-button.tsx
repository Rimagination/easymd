import { Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePlatformCopy } from './use-platform-copy'
import { WechatDraftDialog } from './wechat-draft-dialog'

export function WechatDraftButton() {
  const [open, setOpen] = useState(false)
  const { getHtml, isLoading } = usePlatformCopy('wechat')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    const connected = url.searchParams.get('wechat') === 'connected'
    const error = url.searchParams.get('wechat_error')
    if (!connected && !error) {
      return
    }

    if (connected) {
      toast.success('公众号已连接，请打开同步按钮继续。')
    }
    else {
      toast.error(error === 'authorization_cancelled'
        ? '公众号授权已取消。'
        : '公众号连接失败，请稍后重试。')
    }
    url.searchParams.delete('wechat')
    url.searchParams.delete('wechat_error')
    window.history.replaceState(window.history.state, '', url)
  }, [])

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={(
            <Button
              variant="ghost"
              size="icon"
              aria-label="同步到我的公众号草稿箱"
              onClick={() => setOpen(true)}
              disabled={isLoading}
            >
              <Send className="size-4 text-[#07C160]" />
            </Button>
          )}
        />
        <TooltipContent>同步到我的公众号草稿箱</TooltipContent>
      </Tooltip>
      <WechatDraftDialog
        open={open}
        onOpenChange={setOpen}
        getHtml={getHtml}
      />
    </>
  )
}
