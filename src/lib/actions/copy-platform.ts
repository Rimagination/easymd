import type { SupportedPlatform } from '@/config'
import { toast } from 'sonner'
import { platformConfig } from '@/config'
import { trackEvent } from '@/lib/analytics'
import { copyHtml } from '@/lib/clipboard'

const developingPlatforms: SupportedPlatform[] = ['zhihu']

interface CopyPlatformOptions {
  platform: SupportedPlatform
  markdownStyle: string
  codeTheme: string
  mermaidTheme: string
  infographicTheme: string
  infographicPalette: string
  source: 'button' | 'menu'
  getHtml: () => Promise<string>
}

export async function copyPlatform({
  platform,
  markdownStyle,
  codeTheme,
  mermaidTheme,
  infographicTheme,
  infographicPalette,
  source,
  getHtml,
}: CopyPlatformOptions) {
  if (developingPlatforms.includes(platform)) {
    toast.info('Zhihu support is still in progress.')
    return
  }

  const config = platformConfig[platform]
  try {
    const html = await getHtml()
    if (!html.trim()) {
      toast.error('Nothing to copy.')
      return
    }
    const success = await copyHtml(html)
    if (success) {
      toast.success(config.successMessage)
      trackEvent('copy', platform, source, {
        markdownStyle,
        codeTheme,
        mermaidTheme,
        infographicTheme,
        infographicPalette,
      })
    }
    else {
      toast.error('Copy failed.')
    }
  }
  catch {
    toast.error('Render failed.')
  }
}
