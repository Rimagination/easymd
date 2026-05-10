import type { Element, Root, RootContent } from 'hast'
import type { WechatArticleImportArticle } from './types'
import rehypeParse from 'rehype-parse'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { parse as parseHtmlToMarkdown } from '@/lib/markdown/parse/html'

interface ExtractedWechatArticle {
  article: WechatArticleImportArticle
  bodyHtml: string
  fingerprintHtml: string
}

function toText(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const node = value as { type?: string, value?: string, children?: unknown[] }
  if (node.type === 'text') {
    return node.value ?? ''
  }

  return Array.isArray(node.children)
    ? node.children.map(toText).join('')
    : ''
}

function trimText(value: unknown): string {
  return toText(value).replace(/\s+/g, ' ').trim()
}

function getProperty(node: Element, name: string): unknown {
  return node.properties?.[name]
}

function getId(node: Element): string {
  const id = getProperty(node, 'id')
  return typeof id === 'string' ? id : ''
}

function findElementById(tree: Root, id: string): Element | undefined {
  let found: Element | undefined
  visit(tree, 'element', (node) => {
    if (!found && getId(node) === id) {
      found = node
    }
  })
  return found
}

function normalizeWechatImages(tree: Root) {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'img') {
      return
    }

    const props = node.properties ??= {}
    const dataSrc = typeof props.dataSrc === 'string' ? props.dataSrc : ''
    const dataOriginal = typeof props.dataOriginal === 'string' ? props.dataOriginal : ''
    const src = typeof props.src === 'string' ? props.src : ''
    props.src = src || dataSrc || dataOriginal
  })
}

function stringifyFragment(node: { children?: RootContent[] }): string {
  const processor = unified().use(rehypeStringify)
  return processor.stringify({
    type: 'root',
    children: node.children ?? [],
  } as Root)
}

async function sanitizeFragmentHtml(html: string): Promise<string> {
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize)
    .use(rehypeStringify)

  const processed = await processor.process(html)
  return processed.toString()
}

function frontmatter(sourceUrl: string, author?: string): string {
  return [
    '---',
    `source: ${JSON.stringify(sourceUrl)}`,
    author ? `author: ${JSON.stringify(author)}` : '',
    `importedAt: ${JSON.stringify(new Date().toISOString())}`,
    '---',
  ].filter(Boolean).join('\n')
}

export async function extractWechatArticleFromHtml(
  html: string,
  sourceUrl: string,
): Promise<ExtractedWechatArticle> {
  const tree = unified().use(rehypeParse).parse(html) as Root
  normalizeWechatImages(tree)

  const titleNode = findElementById(tree, 'activity-name')
  const authorNode = findElementById(tree, 'js_name')
  const publishNode = findElementById(tree, 'publish_time')
  const bodyNode = findElementById(tree, 'js_content')

  if (!bodyNode || !Array.isArray(bodyNode.children) || bodyNode.children.length === 0) {
    throw new Error('这篇文章的正文结构无法识别。')
  }

  const title = trimText(titleNode) || '公众号文章'
  const author = trimText(authorNode) || undefined
  const publishTime = trimText(publishNode) || undefined
  const fingerprintHtml = stringifyFragment(bodyNode)
  const bodyHtml = await sanitizeFragmentHtml(fingerprintHtml)
  const bodyMarkdown = (await parseHtmlToMarkdown(bodyHtml)).trim()
  if (!bodyMarkdown) {
    throw new Error('这篇文章的正文结构无法识别。')
  }

  const sourceLine = author
    ? `> 来源：${author}，${sourceUrl}`
    : `> 来源：${sourceUrl}`

  const markdown = [
    frontmatter(sourceUrl, author),
    '',
    `# ${title}`,
    '',
    sourceLine,
    '',
    bodyMarkdown,
  ].join('\n').trimEnd()

  return {
    article: {
      title,
      author,
      publishTime,
      sourceUrl,
      markdown,
    },
    bodyHtml,
    fingerprintHtml,
  }
}
