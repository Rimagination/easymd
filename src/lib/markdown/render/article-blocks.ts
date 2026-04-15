import { articleBlockTemplates } from '@/config/article-blocks'

const articleBlockById = new Map(
  articleBlockTemplates.map(template => [template.id, template]),
)

const readableReferencePattern = /^@组件\[[^\]\n]*\]\(easymd:block\/([a-z0-9-]+)\)\s*$/gm
const compactReferencePattern = /^\{\{easymd:block\s+id=["']([a-z0-9-]+)["']\s*\}\}\s*$/gm

function replaceReference(match: string, id: string): string {
  return articleBlockById.get(id)?.markdown ?? match
}

export function createArticleBlockReference(id: string, name: string): string {
  return `@组件[${name}](easymd:block/${id})`
}

export function expandArticleBlockReferences(markdown: string): string {
  return markdown
    .replace(readableReferencePattern, replaceReference)
    .replace(compactReferencePattern, replaceReference)
}
