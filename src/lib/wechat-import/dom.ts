import type { Root } from 'hast'
import rehypeParse from 'rehype-parse'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { parse as parseHtmlToMarkdown } from '@/lib/markdown/parse/html'

interface ExtractedWechatArticle {
  article: {
    title: string
    author?: string
    publishTime?: string
    sourceUrl: string
    markdown: string
  }
  bodyHtml: string
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

function getProperty(node: unknown, name: string): unknown {
  if (!node || typeof node !== 'object') {
    return undefined
  }
  return (node as { properties?: Record<string, unknown> }).properties?.[name]
}

function getId(node: unknown): string {
  const id = getProperty(node, 'id')
  return typeof id === 'string' ? id : ''
}

function findElementById(tree: Root, id: string): unknown {
  let found: unknown
  visit(tree, 'element', (node) => {
    if (!found && getId(node) === id) {
      found = node
    }
  })
  return found
}

function normalizeWechatImages(tree: Root) {
  visit(tree, 'element', (node: any) => {
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

function stringifyFragment(node: any): string {
  const processor = unified().use(rehypeStringify)
  return processor.stringify({
    type: 'root',
    children: node.children ?? [],
  } as Root)
}

function frontmatter(sourceUrl: string, author?: string): string {
  return [
    '---',
    `source: "${sourceUrl.replaceAll('"', '\\"')}"`,
    author ? `author: "${author.replaceAll('"', '\\"')}"` : '',
    `importedAt: "${new Date().toISOString()}"`,
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
  const bodyNode = findElementById(tree, 'js_content') as { children?: unknown[] } | undefined

  if (!bodyNode || !Array.isArray(bodyNode.children) || bodyNode.children.length === 0) {
    throw new Error('这篇文章的正文结构无法识别。')
  }

  const title = trimText(titleNode) || '公众号文章'
  const author = trimText(authorNode) || undefined
  const publishTime = trimText(publishNode) || undefined
  const bodyHtml = stringifyFragment(bodyNode)
  const bodyMarkdown = (await parseHtmlToMarkdown(bodyHtml)).trim()
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
  }
}
