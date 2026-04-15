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

  return null
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

export function replacePreviewText(
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

export function applyPreviewTextStyle(
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

export function replacePreviewImageSource(
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
