import { articleBlockTemplates } from '@/config/article-blocks'

const articleBlockById = new Map(
  articleBlockTemplates.map(template => [template.id, template]),
)

const readableReferencePattern = /^@组件\[[^\]\n]*\]\(easymd:block\/([a-z0-9-]+)\)\s*$/gm
const compactReferencePattern = /^\{\{easymd:block ([^}\n]+)\}\}\s*$/gm
const attributePattern = /([a-z][\w-]*)=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/gi

export interface ArticleBlockReference {
  end: number
  id: string
  match: string
  name?: string
  source?: string
  start: number
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=')
    const binary = atob(normalized)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))

    return new TextDecoder().decode(bytes)
  }
  catch {
    return null
  }
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {}

  for (const match of source.matchAll(attributePattern)) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return attributes
}

function getReferenceName(match: string): string | undefined {
  return match.match(/^@组件\[([^\]\n]*)\]/)?.[1]
}

export function encodeArticleBlockSource(source: string): string {
  return encodeBase64Url(source)
}

export function decodeArticleBlockSource(source: string): string | null {
  return decodeBase64Url(source)
}

export function createEditedArticleBlockReference(id: string, source: string): string {
  return `{{easymd:block id="${escapeAttribute(id)}" source="${encodeArticleBlockSource(source)}"}}`
}

export function createArticleBlockReference(id: string, name: string): string {
  return `@组件[${name}](easymd:block/${id})`
}

export function getArticleBlockReferences(markdown: string): ArticleBlockReference[] {
  const references: ArticleBlockReference[] = []

  for (const match of markdown.matchAll(readableReferencePattern)) {
    if (match.index === undefined || !match[1]) {
      continue
    }

    references.push({
      end: match.index + match[0].length,
      id: match[1],
      match: match[0],
      name: getReferenceName(match[0]),
      start: match.index,
    })
  }

  for (const match of markdown.matchAll(compactReferencePattern)) {
    if (match.index === undefined || !match[1]) {
      continue
    }

    const attributes = parseAttributes(match[1])
    const id = attributes.id
    if (!id) {
      continue
    }

    references.push({
      end: match.index + match[0].length,
      id,
      match: match[0],
      source: attributes.source,
      start: match.index,
    })
  }

  return references.sort((left, right) => left.start - right.start)
}

export function resolveArticleBlockReferenceSource(reference: ArticleBlockReference): string | null {
  if (reference.source) {
    return decodeArticleBlockSource(reference.source) ?? articleBlockById.get(reference.id)?.markdown ?? null
  }

  return articleBlockById.get(reference.id)?.markdown ?? null
}

function replaceReference(match: string, idOrAttributes: string): string {
  if (match.startsWith('@组件[')) {
    return articleBlockById.get(idOrAttributes)?.markdown ?? match
  }

  const attributes = parseAttributes(idOrAttributes)
  const id = attributes.id
  if (!id) {
    return match
  }

  if (attributes.source) {
    return decodeArticleBlockSource(attributes.source) ?? articleBlockById.get(id)?.markdown ?? match
  }

  return articleBlockById.get(id)?.markdown ?? match
}

export function expandArticleBlockReferences(markdown: string): string {
  return markdown
    .replace(readableReferencePattern, replaceReference)
    .replace(compactReferencePattern, replaceReference)
}
