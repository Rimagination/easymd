export interface WechatDraftMetadata {
  title: string
  author: string
  digest: string
  sourceUrl: string
}

function parseFrontmatterValue(value: string): string {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }

  try {
    const parsed = JSON.parse(normalized) as unknown
    return typeof parsed === 'string' ? parsed : normalized
  }
  catch {
    return normalized.replace(/^['"]|['"]$/g, '')
  }
}

function parseFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) {
    return {}
  }

  const values: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator === -1) {
      continue
    }
    const key = line.slice(0, separator).trim()
    if (key) {
      values[key] = parseFrontmatterValue(line.slice(separator + 1))
    }
  }
  return values
}

function cleanInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()
}

function extractTitle(markdown: string): string {
  const line = markdown.split(/\r?\n/).find(value => /^#\s+/.test(value.trim()))
  return line ? cleanInlineMarkdown(line.trim().slice(2)) : ''
}

export function extractWechatDraftMetadata(markdown: string): WechatDraftMetadata {
  const frontmatter = parseFrontmatter(markdown)
  return {
    title: frontmatter.title || extractTitle(markdown) || '未命名草稿',
    author: frontmatter.author || '',
    digest: frontmatter.summary || '',
    sourceUrl: frontmatter.source || '',
  }
}
