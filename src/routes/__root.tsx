import type { DetailedHTMLProps, LinkHTMLAttributes, MetaHTMLAttributes } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'

import { NotFound } from '@/components/not-found'
import { ThemeColorMeta } from '@/components/theme-color-meta'
import { Toaster } from '@/components/ui/sonner'
import { appConfig } from '@/config'
import { env } from '@/env'

import appCss from '../styles.css?url'

// Google Fonts URL - used by the brand mark and the editorial website shell.
const fontUrl = 'https://fonts.googleapis.cn/css2?family=Doto:wght@700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@600;700&display=swap'
type MetaTag = DetailedHTMLProps<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>
type LinkTag = DetailedHTMLProps<LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>

export const Route = createRootRoute({
  head: () => {
    const meta: MetaTag[] = [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: appConfig.title },
      { name: 'description', content: appConfig.description },
      { name: 'keywords', content: appConfig.keywords },
      { name: 'author', content: appConfig.name },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: appConfig.title },
      { property: 'og:description', content: appConfig.description },
      { property: 'og:site_name', content: appConfig.name },
      { property: 'og:locale', content: 'zh_CN' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: appConfig.title },
      { name: 'twitter:description', content: appConfig.description },
    ]

    const links: LinkTag[] = [
      // Preconnect
      { rel: 'preconnect', href: 'https://fonts.googleapis.cn' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.cn', crossOrigin: 'anonymous' as const },
      // Preload 关键资源
      { rel: 'preload', href: fontUrl, as: 'style', crossOrigin: 'anonymous' as const },
      { rel: 'preload', href: appCss, as: 'style' },
      { rel: 'preload', href: '/blur-mask.svg', as: 'image', type: 'image/svg+xml' },
      // Stylesheets
      { rel: 'stylesheet', href: fontUrl },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    ]

    if (appConfig.url) {
      meta.push(
        { property: 'og:url', content: appConfig.url },
        { property: 'og:image', content: `${appConfig.url}/banner.png` },
        { name: 'twitter:image', content: `${appConfig.url}/banner.png` },
      )
      links.push({ rel: 'canonical', href: appConfig.url })
    }

    return { meta, links }
  },
  beforeLoad: () => {
    return {
      analytics: {
        scriptUrl: env.ANALYTICS_SCRIPT_URL,
        siteId: env.ANALYTICS_SITE_ID,
      },
    }
  },
  component: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument() {
  const { analytics } = Route.useRouteContext()
  const analyticsEnabled = analytics.scriptUrl && analytics.siteId

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableColorScheme
        >
          <Outlet />
          <ThemeColorMeta />
        </ThemeProvider>
        <Scripts />
        <Toaster />
        {analyticsEnabled && (
          <script
            src={analytics.scriptUrl}
            data-site-id={analytics.siteId}
            defer
          />
        )}
      </body>
    </html>
  )
}
