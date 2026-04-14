import type { Plugin } from 'unified'
import type { Platform } from './adapters'
import juice from 'juice'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { loadCodeThemeCss } from '@/themes/code-theme/loader'
import { loadMarkdownStyleCss } from '@/themes/markdown-style/loader'
import { loadKatexCss } from '../utils'
import { getAdapterPlugins } from './adapters'
import { rehypeDivToSection, rehypeFigureWrapper, rehypeFootnoteLinks, rehypeGithubAlert, rehypeInfographic, rehypeMermaid, rehypeSvgHeading, rehypeWrapTextNodes, remarkFrontmatterTable } from './plugins'
import { sanitizeSchema } from './sanitize-schema'

export interface RenderOptions {
  markdown: string
  markdownStyle?: string
  codeTheme?: string
  mermaidTheme?: string
  infographicTheme?: string
  infographicPalette?: string
  customCss?: string
  enableFootnoteLinks?: boolean
  openLinksInNewWindow?: boolean
  platform?: Platform
  footnoteLabel?: string
  referenceTitle?: string
}

interface ProcessorOptions {
  enableFootnoteLinks?: boolean
  openLinksInNewWindow?: boolean
  mermaidTheme?: string
  infographicTheme?: string
  infographicPalette?: string
  platform?: Platform
  footnoteLabel?: string
  referenceTitle?: string
}

function createProcessor({ enableFootnoteLinks, openLinksInNewWindow, mermaidTheme, infographicTheme, infographicPalette, platform = 'html', footnoteLabel = 'Footnotes', referenceTitle = 'References' }: ProcessorOptions) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkFrontmatterTable)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      footnoteLabel,
      footnoteLabelTagName: 'h4',
    })

  if (openLinksInNewWindow) {
    processor.use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noreferrer', 'noopener'],
    })
  }

  processor
    .use(rehypeRaw)
    .use(rehypeGithubAlert)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeSvgHeading, { enabled: false })
    .use(rehypeMermaid, { theme: mermaidTheme })
    .use(rehypeInfographic, { theme: infographicTheme, palette: infographicPalette })
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeFigureWrapper)

  if (enableFootnoteLinks && platform !== 'wechat') {
    processor.use(rehypeFootnoteLinks, { referenceTitle })
  }

  const adapterPlugins = getAdapterPlugins(platform, { referenceTitle })
  for (const plugin of adapterPlugins) {
    if (Array.isArray(plugin)) {
      processor.use(plugin[0] as Plugin, plugin[1])
    }
    else {
      processor.use(plugin as Plugin)
    }
  }

  processor.use(rehypeDivToSection)
  processor.use(rehypeWrapTextNodes)

  processor.use(rehypeStringify, { allowDangerousHtml: true })

  return processor
}

export async function render(options: RenderOptions): Promise<string> {
  const {
    markdown,
    markdownStyle,
    codeTheme,
    mermaidTheme,
    infographicTheme,
    infographicPalette,
    customCss = '',
    enableFootnoteLinks = true,
    openLinksInNewWindow = true,
    platform = 'html',
    footnoteLabel = 'Footnotes',
    referenceTitle = 'References',
  } = options

  const processor = createProcessor({ enableFootnoteLinks, openLinksInNewWindow, mermaidTheme, infographicTheme, infographicPalette, platform, footnoteLabel, referenceTitle })
  const html = (await processor.process(markdown)).toString()

  const hasKatex = html.includes('class="katex"')
    || html.includes('class="katex-display"')
    || html.includes('class="katex-mathml"')

  if (!markdownStyle && !codeTheme && !hasKatex && !customCss) {
    return html
  }

  const [markdownStyleCss, codeThemeCss, katexCss] = await Promise.all([
    markdownStyle ? loadMarkdownStyleCss(markdownStyle) : Promise.resolve(''),
    codeTheme ? loadCodeThemeCss(codeTheme) : Promise.resolve(''),
    hasKatex ? loadKatexCss() : Promise.resolve(''),
  ])
  const css = [
    markdownStyleCss ?? '',
    codeThemeCss ?? '',
    katexCss ?? '',
    customCss,
  ].filter(Boolean).join('\n')

  const wrapped = `<section id="easymd">${html}</section>`

  try {
    return juice.inlineContent(wrapped, css, {
      inlinePseudoElements: true,
      preserveImportant: true,
    })
  }
  catch (error) {
    console.error('Juice inline error:', error)
    return wrapped
  }
}
