import type { ReactNode } from 'react'
import type { SupportedPlatform } from '@/config'
import { Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { platformConfig } from '@/config'
import WechatIcon from '@/icons/wechat'
import ZhihuIcon from '@/icons/zhihu'
import { copyPlatform } from '@/lib/actions'
import { usePreviewStore } from '@/stores/preview'
import { usePlatformCopy } from './use-platform-copy'

const platformIcons: Record<SupportedPlatform, ReactNode> = {
  wechat: <WechatIcon className="size-4" />,
  zhihu: <ZhihuIcon className="size-4" />,
  html: <Code2 className="size-4" />,
}

interface CopyButtonProps {
  platform: SupportedPlatform
}

export function CopyButton({ platform }: CopyButtonProps) {
  const { getHtml, isLoading } = usePlatformCopy(platform)
  const config = platformConfig[platform]
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const mermaidTheme = usePreviewStore(state => state.mermaidTheme)
  const infographic = usePreviewStore(state => state.infographic)

  const onCopyClick = async () => {
    await copyPlatform({ platform, markdownStyle, codeTheme, mermaidTheme, infographicTheme: infographic.theme, infographicPalette: infographic.palette, source: 'button', getHtml })
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            variant="ghost"
            size="icon"
            aria-label={config.label}
            onClick={onCopyClick}
            disabled={isLoading}
          >
            {platformIcons[platform]}
          </Button>
        )}
      />
      <TooltipContent>{config.label}</TooltipContent>
    </Tooltip>
  )
}
