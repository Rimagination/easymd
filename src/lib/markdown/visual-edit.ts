import { articleBlockTemplates } from '@/config/article-blocks'

export interface VisualEditResult {
  changed: boolean
  markdown: string
}

export interface TextStylePatch {
  color?: string
  fontSize?: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildStyle(style: TextStylePatch): string {
  return [
    style.fontSize ? `font-size: ${style.fontSize}` : '',
    style.color ? `color: ${style.color}` : '',
  ].filter(Boolean).join('; ')
}

function replaceRange(
  markdown: string,
  range: { end: number, start: number } | null,
  replacement: string,
): VisualEditResult {
  if (!range) {
    return { changed: false, markdown }
  }

  return {
    changed: true,
    markdown: `${markdown.slice(0, range.start)}${replacement}${markdown.slice(range.end)}`,
  }
}

function getArticleBlockReferences(markdown: string): Array<{
  end: number
  id: string
  start: number
}> {
  const references: Array<{ end: number, id: string, start: number }> = []
  const patterns = [
    /^@组件\[[^\]\n]*\]\(easymd:block\/([a-z0-9-]+)\)\s*$/gm,
    /^\{\{easymd:block\s+id=["']([a-z0-9-]+)["']\s*\}\}\s*$/gm,
  ]

  for (const pattern of patterns) {
    for (const match of markdown.matchAll(pattern)) {
      if (match.index === undefined || !match[1]) {
        continue
      }

      references.push({
        end: match.index + match[0].length,
        id: match[1],
        start: match.index,
      })
    }
  }

  return references.sort((left, right) => left.start - right.start)
}

function applyToArticleBlockReference(
  markdown: string,
  editBlockMarkdown: (blockMarkdown: string) => VisualEditResult,
): VisualEditResult {
  const templateById = new Map(articleBlockTemplates.map(template => [template.id, template]))

  for (const reference of getArticleBlockReferences(markdown)) {
    const template = templateById.get(reference.id)
    if (!template) {
      continue
    }

    const result = editBlockMarkdown(template.markdown)
    if (!result.changed) {
      continue
    }

    return replaceRange(markdown, reference, result.markdown)
  }

  return { changed: false, markdown }
}

function isLineBreakTag(tag: string): boolean {
  return /^<\/?(?:br|p|h[1-6]|section|div|figcaption|li|tr|td|th)\b/i.test(tag)
}

function buildVisibleTextMap(markdown: string): Array<{ char: string, sourceIndex: number }> {
  const visible: Array<{ char: string, sourceIndex: number }> = []

  for (let index = 0; index < markdown.length; index += 1) {
    const char = markdown[index]

    if (char === '<') {
      const tagEnd = markdown.indexOf('>', index + 1)
      if (tagEnd !== -1) {
        const tag = markdown.slice(index, tagEnd + 1)
        if (isLineBreakTag(tag)) {
          visible.push({ char: ' ', sourceIndex: index })
        }
        index = tagEnd
        continue
      }
    }

    visible.push({ char, sourceIndex: index })
  }

  return visible
}

function findMappedTextRange(markdown: string, search: string): { end: number, start: number } | null {
  const visible = buildVisibleTextMap(markdown)

  for (let start = 0; start < visible.length; start += 1) {
    let sourceIndex = start
    let searchIndex = 0

    while (sourceIndex < visible.length && searchIndex < search.length) {
      const sourceChar = visible[sourceIndex].char
      const searchChar = search[searchIndex]

      if (/\s/.test(sourceChar)) {
        if (searchChar !== ' ') {
          break
        }

        while (sourceIndex < visible.length && /\s/.test(visible[sourceIndex].char)) {
          sourceIndex += 1
        }

        while (search[searchIndex] === ' ') {
          searchIndex += 1
        }
        continue
      }

      if (sourceChar !== searchChar) {
        break
      }

      sourceIndex += 1
      searchIndex += 1
    }

    if (searchIndex === search.length) {
      const firstVisible = visible[start]
      const lastVisible = visible[Math.max(start, sourceIndex - 1)]

      if (!firstVisible || !lastVisible) {
        return null
      }

      return {
        end: lastVisible.sourceIndex + 1,
        start: firstVisible.sourceIndex,
      }
    }
  }

  return null
}

function findTextRange(markdown: string, search: string): { end: number, start: number } | null {
  const exactIndex = markdown.indexOf(search)

  if (exactIndex !== -1) {
    return { start: exactIndex, end: exactIndex + search.length }
  }

  // The preview collapses Markdown line breaks and extra spaces. Match those
  // collapsed selections back to the source without making the whole iframe editable.
  for (let start = 0; start < markdown.length; start += 1) {
    let sourceIndex = start
    let searchIndex = 0

    while (sourceIndex < markdown.length && searchIndex < search.length) {
      const sourceChar = markdown[sourceIndex]
      const searchChar = search[searchIndex]

      if (/\s/.test(sourceChar)) {
        if (searchChar !== ' ') {
          break
        }

        while (sourceIndex < markdown.length && /\s/.test(markdown[sourceIndex])) {
          sourceIndex += 1
        }

        while (search[searchIndex] === ' ') {
          searchIndex += 1
        }
        continue
      }

      if (sourceChar !== searchChar) {
        break
      }

      sourceIndex += 1
      searchIndex += 1
    }

    if (searchIndex === search.length) {
      return { start, end: sourceIndex }
    }
  }

  return findMappedTextRange(markdown, search)
}

function findImageSourceRange(markdown: string, currentSrc: string): { end: number, start: number } | null {
  const candidates: Array<{ end: number, start: number }> = []
  let index = markdown.indexOf(currentSrc)

  while (index !== -1) {
    candidates.push({ start: index, end: index + currentSrc.length })
    index = markdown.indexOf(currentSrc, index + currentSrc.length)
  }

  if (candidates.length === 0) {
    return null
  }

  const imageCandidate = candidates.find(({ start }) => {
    const prefix = markdown.slice(Math.max(0, start - 500), start)
    const markdownImageStart = prefix.lastIndexOf('![')
    const markdownImageSourceStart = prefix.lastIndexOf('](')
    const lastLineBreak = prefix.lastIndexOf('\n')
    const lowerPrefix = prefix.toLowerCase()
    const lastImageTag = lowerPrefix.lastIndexOf('<img')
    const lastTagClose = lowerPrefix.lastIndexOf('>')
    const lastSrcAttr = lowerPrefix.lastIndexOf('src=')

    return (
      (
        prefix.endsWith('](')
        && markdownImageStart > lastLineBreak
        && markdownImageStart < markdownImageSourceStart
      )
      || (
        lastImageTag > lastTagClose
        && lastSrcAttr > lastImageTag
      )
    )
  })

  return imageCandidate ?? candidates[0]
}

export function normalizePreviewSelection(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function replacePreviewTextInSource(
  markdown: string,
  selectedText: string,
  replacementText: string,
): VisualEditResult {
  const normalizedSelection = normalizePreviewSelection(selectedText)
  const normalizedReplacement = replacementText.trim()

  if (!normalizedSelection || !normalizedReplacement) {
    return { changed: false, markdown }
  }

  return replaceRange(markdown, findTextRange(markdown, normalizedSelection), normalizedReplacement)
}

function applyPreviewTextStyleInSource(
  markdown: string,
  selectedText: string,
  style: TextStylePatch,
): VisualEditResult {
  const normalizedSelection = normalizePreviewSelection(selectedText)
  const styleText = buildStyle(style)

  if (!normalizedSelection || !styleText) {
    return { changed: false, markdown }
  }

  const replacement = `<span style="${styleText};">${escapeHtml(normalizedSelection)}</span>`
  return replaceRange(markdown, findTextRange(markdown, normalizedSelection), replacement)
}

function replacePreviewImageSourceInSource(
  markdown: string,
  currentSrc: string,
  nextSrc: string,
): VisualEditResult {
  const normalizedCurrent = currentSrc.trim()
  const normalizedNext = nextSrc.trim()

  if (!normalizedCurrent || !normalizedNext) {
    return { changed: false, markdown }
  }

  return replaceRange(markdown, findImageSourceRange(markdown, normalizedCurrent), normalizedNext)
}

export function replacePreviewText(
  markdown: string,
  selectedText: string,
  replacementText: string,
): VisualEditResult {
  const result = replacePreviewTextInSource(markdown, selectedText, replacementText)
  if (result.changed) {
    return result
  }

  return applyToArticleBlockReference(
    markdown,
    blockMarkdown => replacePreviewTextInSource(blockMarkdown, selectedText, replacementText),
  )
}

export function applyPreviewTextStyle(
  markdown: string,
  selectedText: string,
  style: TextStylePatch,
): VisualEditResult {
  const result = applyPreviewTextStyleInSource(markdown, selectedText, style)
  if (result.changed) {
    return result
  }

  return applyToArticleBlockReference(
    markdown,
    blockMarkdown => applyPreviewTextStyleInSource(blockMarkdown, selectedText, style),
  )
}

export function replacePreviewImageSource(
  markdown: string,
  currentSrc: string,
  nextSrc: string,
): VisualEditResult {
  const result = replacePreviewImageSourceInSource(markdown, currentSrc, nextSrc)
  if (result.changed) {
    return result
  }

  return applyToArticleBlockReference(
    markdown,
    blockMarkdown => replacePreviewImageSourceInSource(blockMarkdown, currentSrc, nextSrc),
  )
}
