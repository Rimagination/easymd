import {
  createEditedArticleBlockReference,
  getArticleBlockReferences,
  resolveArticleBlockReferenceSource,
} from '@/lib/markdown/render/article-blocks'

export interface VisualEditResult {
  changed: boolean
  markdown: string
}

export interface TextStylePatch {
  backgroundColor?: string
  color?: string
  display?: 'block'
  fontFamily?: string
  fontSize?: string
  fontStyle?: 'italic' | 'normal'
  fontWeight?: string
  letterSpacing?: string
  lineHeight?: string
  textAlign?: 'center' | 'justify' | 'left' | 'right'
  textDecoration?: 'line-through' | 'none' | 'underline' | 'underline line-through'
  verticalAlign?: 'baseline' | 'sub' | 'super'
}

export interface ColorTargetPatch {
  attributeName: 'background-color' | 'border-color' | 'color' | 'fill' | 'stroke'
  currentColor?: string
  signature?: Record<string, string>
  tagName: string
  text?: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildStyle(style: TextStylePatch): string {
  return [
    style.display ? `display: ${style.display}` : '',
    style.fontFamily ? `font-family: ${style.fontFamily}` : '',
    style.fontSize ? `font-size: ${style.fontSize}` : '',
    style.color ? `color: ${style.color}` : '',
    style.backgroundColor ? `background-color: ${style.backgroundColor}` : '',
    style.fontWeight ? `font-weight: ${style.fontWeight}` : '',
    style.fontStyle ? `font-style: ${style.fontStyle}` : '',
    style.textDecoration ? `text-decoration: ${style.textDecoration}` : '',
    style.lineHeight ? `line-height: ${style.lineHeight}` : '',
    style.letterSpacing ? `letter-spacing: ${style.letterSpacing}` : '',
    style.textAlign ? `text-align: ${style.textAlign}` : '',
    style.verticalAlign ? `vertical-align: ${style.verticalAlign}` : '',
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

function applyToArticleBlockReference(
  markdown: string,
  editBlockMarkdown: (blockMarkdown: string) => VisualEditResult,
): VisualEditResult {
  for (const reference of getArticleBlockReferences(markdown)) {
    const source = resolveArticleBlockReferenceSource(reference)
    if (!source) {
      continue
    }

    const result = editBlockMarkdown(source)
    if (!result.changed) {
      continue
    }

    return replaceRange(
      markdown,
      reference,
      createEditedArticleBlockReference(reference.id, result.markdown),
    )
  }

  return { changed: false, markdown }
}

const htmlAttributePattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function parseTagAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  const attributeSource = tag
    .replace(/^<\/?[\w:-]+\s*/, '')
    .replace(/\/?>$/, '')

  for (const match of attributeSource.matchAll(htmlAttributePattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return attributes
}

function findAttributeValueEnd(tag: string, valueStart: number, quote: string): number {
  for (let index = valueStart; index < tag.length; index += 1) {
    if (tag[index] !== quote) {
      continue
    }

    const rest = tag.slice(index + 1)
    if (/^\s*(?:\/?>|[:@\w-]+\s*=)/.test(rest)) {
      return index
    }
  }

  const tagEnd = tag.lastIndexOf('>')
  const fallbackEnd = tagEnd === -1 ? tag.lastIndexOf(quote) : tag.lastIndexOf(quote, tagEnd)
  return fallbackEnd >= valueStart ? fallbackEnd : -1
}

function upsertAttribute(tag: string, name: string, value: string): string {
  const pattern = new RegExp(`\\s${escapeRegExp(name)}\\s*=\\s*(["'])`, 'i')
  const match = pattern.exec(tag)
  if (match?.index !== undefined) {
    const valueStart = match.index + match[0].length
    const valueEnd = findAttributeValueEnd(tag, valueStart, match[1])
    if (valueEnd !== -1) {
      return `${tag.slice(0, valueStart)}${escapeAttribute(value)}${tag.slice(valueEnd)}`
    }
  }

  return tag.replace(/\s*\/?>$/, (ending) => {
    const suffix = ending.includes('/') ? ' />' : '>'
    return ` ${name}="${escapeAttribute(value)}"${suffix}`
  })
}

function getStyleProperty(style: string, property: string): string | null {
  const propertyPattern = new RegExp(`(?:^|;)\\s*${escapeRegExp(property)}\\s*:\\s*([^;]+)`, 'i')
  return style.match(propertyPattern)?.[1]?.trim() ?? null
}

function normalizeStyleAttributeValue(style: string): string {
  return style
    .replace(/&amp;quot;/gi, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;apos;/gi, '\'')
    .replace(/&apos;/gi, '\'')
    .replace(/&#39;/g, '\'')
}

function setStyleProperty(style: string, property: string, value: string): string {
  const declarations = normalizeStyleAttributeValue(style)
    .split(';')
    .map(declaration => declaration.trim())
    .filter(Boolean)
  let didSet = false
  const nextDeclarations = declarations.map((declaration) => {
    const separatorIndex = declaration.indexOf(':')
    if (separatorIndex === -1) {
      return declaration
    }

    const name = declaration.slice(0, separatorIndex).trim()
    if (name.toLowerCase() !== property.toLowerCase()) {
      return declaration
    }

    didSet = true
    return `${name}: ${value}`
  })

  if (!didSet) {
    nextDeclarations.push(`${property}: ${value}`)
  }

  return nextDeclarations.join('; ')
}

function upsertStyleProperty(tag: string, property: string, value: string): string {
  const attributes = parseTagAttributes(tag)
  return upsertAttribute(tag, 'style', setStyleProperty(attributes.style ?? '', property, value))
}

function normalizeColorValue(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function getColorFromTag(tag: string, attributeName: ColorTargetPatch['attributeName']): string | null {
  const attributes = parseTagAttributes(tag)
  const style = attributes.style ?? ''

  if (attributeName === 'fill' || attributeName === 'stroke') {
    return attributes[attributeName] ?? getStyleProperty(style, attributeName)
  }

  return getStyleProperty(style, attributeName) ?? attributes[attributeName] ?? null
}

function updateColorInTag(tag: string, attributeName: ColorTargetPatch['attributeName'], color: string): string {
  if (attributeName === 'fill' || attributeName === 'stroke') {
    const attributes = parseTagAttributes(tag)
    if (attributes[attributeName] !== undefined) {
      return upsertAttribute(tag, attributeName, color)
    }

    if (getStyleProperty(attributes.style ?? '', attributeName)) {
      return upsertStyleProperty(tag, attributeName, color)
    }

    return upsertAttribute(tag, attributeName, color)
  }

  return upsertStyleProperty(tag, attributeName, color)
}

interface ElementRange {
  closeEnd: number
  closeStart: number
  openEnd: number
  openStart: number
  openTag: string
}

function findEnclosingElementRange(
  markdown: string,
  range: { end: number, start: number },
  tagName: string,
): ElementRange | null {
  const pattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>`, 'gi')
  const lowerMarkdown = markdown.toLowerCase()
  const closeTag = `</${tagName.toLowerCase()}>`
  let candidate: ElementRange | null = null

  for (const match of markdown.matchAll(pattern)) {
    if (match.index === undefined) {
      continue
    }
    if (match.index > range.start) {
      break
    }

    const openStart = match.index
    const openEnd = openStart + match[0].length
    const closeStart = lowerMarkdown.indexOf(closeTag, openEnd)

    if (openEnd <= range.start && closeStart >= range.end) {
      candidate = {
        closeEnd: closeStart + closeTag.length,
        closeStart,
        openEnd,
        openStart,
        openTag: match[0],
      }
    }
  }

  return candidate
}

function normalizeSvgFontSize(fontSize: string): string {
  return fontSize.endsWith('px') ? fontSize.slice(0, -2) : fontSize
}

function applyTextStyleToHtmlTag(tag: string, style: TextStylePatch): string {
  let nextTag = tag

  if (style.fontFamily) {
    nextTag = upsertStyleProperty(nextTag, 'font-family', style.fontFamily)
  }
  if (style.fontSize) {
    nextTag = upsertStyleProperty(nextTag, 'font-size', style.fontSize)
  }
  if (style.color) {
    nextTag = upsertStyleProperty(nextTag, 'color', style.color)
  }
  if (style.display) {
    nextTag = upsertStyleProperty(nextTag, 'display', style.display)
  }
  if (style.backgroundColor) {
    nextTag = upsertStyleProperty(nextTag, 'background-color', style.backgroundColor)
  }
  if (style.fontWeight) {
    nextTag = upsertStyleProperty(nextTag, 'font-weight', style.fontWeight)
  }
  if (style.fontStyle) {
    nextTag = upsertStyleProperty(nextTag, 'font-style', style.fontStyle)
  }
  if (style.textDecoration) {
    nextTag = upsertStyleProperty(nextTag, 'text-decoration', style.textDecoration)
  }
  if (style.lineHeight) {
    nextTag = upsertStyleProperty(nextTag, 'line-height', style.lineHeight)
  }
  if (style.letterSpacing) {
    nextTag = upsertStyleProperty(nextTag, 'letter-spacing', style.letterSpacing)
  }
  if (style.textAlign) {
    nextTag = upsertStyleProperty(nextTag, 'text-align', style.textAlign)
  }
  if (style.verticalAlign) {
    nextTag = upsertStyleProperty(nextTag, 'vertical-align', style.verticalAlign)
  }

  return nextTag
}

function stripSingleHtmlSpan(value: string): string {
  const match = value.trim().match(/^<span\b[^>]*>([\s\S]*?)<\/span>$/i)
  return match?.[1] ?? value
}

function applySvgTextStyleAtRange(
  markdown: string,
  range: { end: number, start: number },
  style: TextStylePatch,
): VisualEditResult | null {
  const svgTextRange = findEnclosingElementRange(markdown, range, 'text')
  if (!svgTextRange) {
    return null
  }

  let nextOpenTag = svgTextRange.openTag
  if (style.color) {
    nextOpenTag = upsertAttribute(nextOpenTag, 'fill', style.color)
  }
  if (style.fontSize) {
    nextOpenTag = upsertAttribute(nextOpenTag, 'font-size', normalizeSvgFontSize(style.fontSize))
  }
  if (style.fontWeight) {
    nextOpenTag = upsertAttribute(nextOpenTag, 'font-weight', style.fontWeight)
  }
  if (style.fontStyle) {
    nextOpenTag = upsertAttribute(nextOpenTag, 'font-style', style.fontStyle)
  }
  if (style.textDecoration) {
    nextOpenTag = upsertAttribute(nextOpenTag, 'text-decoration', style.textDecoration)
  }

  const body = markdown.slice(svgTextRange.openEnd, svgTextRange.closeStart)
  const nextBody = stripSingleHtmlSpan(body)

  return replaceRange(
    markdown,
    {
      end: svgTextRange.closeStart,
      start: svgTextRange.openStart,
    },
    `${nextOpenTag}${nextBody}`,
  )
}

function applyHtmlTextStyleAtRange(
  markdown: string,
  range: { end: number, start: number },
  style: TextStylePatch,
): VisualEditResult | null {
  const spanRange = findEnclosingElementRange(markdown, range, 'span')
  if (!spanRange) {
    return null
  }

  return replaceRange(
    markdown,
    {
      end: spanRange.openEnd,
      start: spanRange.openStart,
    },
    applyTextStyleToHtmlTag(spanRange.openTag, style),
  )
}

function getMarkdownListMarkerEnd(line: string): number {
  let index = 0
  while (isMarkdownHeadingSpace(line[index])) {
    index += 1
  }

  const marker = line[index]
  if (
    (marker === '-' || marker === '*' || marker === '+')
    && isMarkdownHeadingSpace(line[index + 1])
  ) {
    index += 2
    while (isMarkdownHeadingSpace(line[index])) {
      index += 1
    }
    return index
  }

  const numberStart = index
  while (line[index] && line[index] >= '0' && line[index] <= '9') {
    index += 1
  }
  if (
    index > numberStart
    && (line[index] === '.' || line[index] === ')')
    && isMarkdownHeadingSpace(line[index + 1])
  ) {
    index += 2
    while (isMarkdownHeadingSpace(line[index])) {
      index += 1
    }
    return index
  }

  return 0
}

function getLineRange(markdown: string, range: { end: number, start: number }): { end: number, start: number } {
  const previousLineBreak = markdown.lastIndexOf('\n', Math.max(0, range.start - 1))
  const nextLineBreak = markdown.indexOf('\n', range.end)

  return {
    end: nextLineBreak === -1 ? markdown.length : nextLineBreak,
    start: previousLineBreak === -1 ? 0 : previousLineBreak + 1,
  }
}

function updateSingleSpanBody(value: string, style: TextStylePatch): string | null {
  const match = value.match(/^(\s*)(<span\b[^>]*>)([\s\S]*?)<\/span>(\s*)$/i)
  if (!match) {
    return null
  }

  return `${match[1]}${applyTextStyleToHtmlTag(match[2], style)}${match[3]}</span>${match[4]}`
}

function renderInlineBodyAsHtml(body: string): string {
  return body.includes('<') ? body : escapeHtml(body)
}

function createAlignedSpan(body: string, textAlign: NonNullable<TextStylePatch['textAlign']>): string {
  const style: TextStylePatch = { display: 'block', textAlign }
  return `<span style="${escapeAttribute(buildStyle(style))};">${renderInlineBodyAsHtml(body.trim())}</span>`
}

function applyBlockTextAlignAtRange(
  markdown: string,
  range: { end: number, start: number },
  textAlign: NonNullable<TextStylePatch['textAlign']>,
): VisualEditResult | null {
  for (const tagName of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote', 'figcaption']) {
    const elementRange = findEnclosingElementRange(markdown, range, tagName)
    if (!elementRange) {
      continue
    }

    const style: TextStylePatch = {
      textAlign,
      ...(tagName.startsWith('h') ? { display: 'block' as const } : {}),
    }

    return replaceRange(
      markdown,
      {
        end: elementRange.openEnd,
        start: elementRange.openStart,
      },
      applyTextStyleToHtmlTag(elementRange.openTag, style),
    )
  }

  const lineRange = getLineRange(markdown, range)
  const line = markdown.slice(lineRange.start, lineRange.end)
  const headingMarkerLength = getMarkdownHeadingMarkerLength(line)
  if (headingMarkerLength > 0) {
    const body = trimClosingMarkdownHeadingMarker(line.slice(headingMarkerLength))
    const tagName = `h${headingMarkerLength}`
    const openTag = applyTextStyleToHtmlTag(`<${tagName}>`, {
      display: 'block',
      textAlign,
    })

    return replaceRange(
      markdown,
      lineRange,
      `${openTag}${renderHeadingBodyAsHtml(body)}</${tagName}>`,
    )
  }

  const listMarkerEnd = getMarkdownListMarkerEnd(line)
  if (listMarkerEnd > 0) {
    const marker = line.slice(0, listMarkerEnd)
    const body = line.slice(listMarkerEnd)
    const style: TextStylePatch = { display: 'block', textAlign }
    const nextBody = updateSingleSpanBody(body, style) ?? createAlignedSpan(body, textAlign)

    return replaceRange(markdown, lineRange, `${marker}${nextBody}`)
  }

  if (!line.trim()) {
    return null
  }

  const style: TextStylePatch = { display: 'block', textAlign }
  const nextLine = updateSingleSpanBody(line, style) ?? createAlignedSpan(line, textAlign)
  return replaceRange(markdown, lineRange, nextLine)
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

  const range = findTextRange(markdown, normalizedSelection)
  if (!range) {
    return { changed: false, markdown }
  }

  if (style.textAlign) {
    const inlineStyle: TextStylePatch = { ...style, textAlign: undefined }
    if (buildStyle(inlineStyle)) {
      const inlineResult = applyPreviewTextStyleInSource(markdown, selectedText, inlineStyle)
      const inlineMarkdown = inlineResult.changed ? inlineResult.markdown : markdown
      const inlineRange = findTextRange(inlineMarkdown, normalizedSelection)
      if (inlineRange) {
        const blockTextAlignResult = applyBlockTextAlignAtRange(inlineMarkdown, inlineRange, style.textAlign)
        if (blockTextAlignResult) {
          return blockTextAlignResult
        }
      }
      return inlineResult
    }

    const blockTextAlignResult = applyBlockTextAlignAtRange(markdown, range, style.textAlign)
    if (blockTextAlignResult) {
      return blockTextAlignResult
    }
  }

  const svgTextResult = applySvgTextStyleAtRange(markdown, range, style)
  if (svgTextResult) {
    return svgTextResult
  }

  const htmlTextResult = applyHtmlTextStyleAtRange(markdown, range, style)
  if (htmlTextResult) {
    return htmlTextResult
  }

  const replacement = `<span style="${escapeAttribute(styleText)};">${escapeHtml(normalizedSelection)}</span>`
  return replaceRange(markdown, range, replacement)
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

function getElementBodyText(markdown: string, openEnd: number, tagName: string): string {
  const closeTag = `</${tagName.toLowerCase()}>`
  const lowerMarkdown = markdown.toLowerCase()
  const closeStart = lowerMarkdown.indexOf(closeTag, openEnd)
  if (closeStart === -1) {
    return ''
  }

  return normalizePreviewSelection(
    markdown
      .slice(openEnd, closeStart)
      .replace(/<[^>]+>/g, ' '),
  )
}

function scoreColorTargetTag(
  markdown: string,
  tag: string,
  openEnd: number,
  target: ColorTargetPatch,
): number {
  const attributes = parseTagAttributes(tag)
  const signature = target.signature ?? {}
  let score = 0

  for (const [name, expectedValue] of Object.entries(signature)) {
    const actualValue = attributes[name.toLowerCase()]
    if (!actualValue || actualValue !== expectedValue) {
      return -1
    }
    score += 3
  }

  if (target.text) {
    const bodyText = getElementBodyText(markdown, openEnd, target.tagName)
    if (!bodyText.includes(normalizePreviewSelection(target.text))) {
      return -1
    }
    score += 4
  }

  const currentColor = getColorFromTag(tag, target.attributeName)
  if (
    target.currentColor
    && normalizeColorValue(currentColor) === normalizeColorValue(target.currentColor)
  ) {
    score += 2
  }

  return score
}

function findColorTargetTagRange(
  markdown: string,
  target: ColorTargetPatch,
): { end: number, start: number, tag: string } | null {
  const pattern = new RegExp(`<${escapeRegExp(target.tagName)}\\b[^>]*>`, 'gi')
  let bestMatch: { end: number, score: number, start: number, tag: string } | null = null

  for (const match of markdown.matchAll(pattern)) {
    if (match.index === undefined) {
      continue
    }

    const start = match.index
    const tag = match[0]
    const end = start + tag.length
    const score = scoreColorTargetTag(markdown, tag, end, target)

    if (score < 0) {
      continue
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { end, score, start, tag }
    }
  }

  return bestMatch
}

function replacePreviewColorInSource(
  markdown: string,
  target: ColorTargetPatch,
  nextColor: string,
): VisualEditResult {
  const normalizedColor = nextColor.trim()
  if (!normalizedColor) {
    return { changed: false, markdown }
  }

  const tagRange = findColorTargetTagRange(markdown, target)
  if (!tagRange) {
    return replaceMarkdownHeadingColorInSource(markdown, target, normalizedColor)
  }

  return replaceRange(
    markdown,
    tagRange,
    updateColorInTag(tagRange.tag, target.attributeName, normalizedColor),
  )
}

function stripInlineMarkdownSyntax(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~]+/g, '')
}

function isHeadingTagName(tagName: string): boolean {
  return /^h[1-6]$/i.test(tagName)
}

function isMarkdownHeadingSpace(char: string | undefined): boolean {
  return char === ' ' || char === '\t'
}

function getMarkdownHeadingMarkerLength(line: string): number {
  let markerLength = 0
  while (markerLength < line.length && line[markerLength] === '#' && markerLength < 6) {
    markerLength += 1
  }

  return isMarkdownHeadingSpace(line[markerLength]) ? markerLength : 0
}

function trimClosingMarkdownHeadingMarker(value: string): string {
  let end = value.length
  while (end > 0 && isMarkdownHeadingSpace(value[end - 1])) {
    end -= 1
  }

  let markerStart = end
  while (markerStart > 0 && value[markerStart - 1] === '#') {
    markerStart -= 1
  }

  const markerLength = end - markerStart
  if (
    markerLength > 0
    && markerLength <= 6
    && markerStart > 0
    && isMarkdownHeadingSpace(value[markerStart - 1])
  ) {
    return value.slice(0, markerStart).trim()
  }

  return value.trim()
}

function findMarkdownHeadingLineRange(
  markdown: string,
  target: ColorTargetPatch,
): { body: string, end: number, start: number } | null {
  if (!target.text || !isHeadingTagName(target.tagName)) {
    return null
  }

  const expectedLevel = Number(target.tagName.slice(1))
  const expectedText = normalizePreviewSelection(target.text)
  let lineStart = 0

  while (lineStart <= markdown.length) {
    const nextLineBreak = markdown.indexOf('\n', lineStart)
    const lineEnd = nextLineBreak === -1 ? markdown.length : nextLineBreak
    const line = markdown.slice(lineStart, lineEnd)
    const markerLength = getMarkdownHeadingMarkerLength(line)

    if (markerLength === expectedLevel) {
      const body = trimClosingMarkdownHeadingMarker(line.slice(markerLength))
      const bodyText = normalizePreviewSelection(stripInlineMarkdownSyntax(body))
      if (bodyText === expectedText || bodyText.includes(expectedText)) {
        return { body, end: lineEnd, start: lineStart }
      }
    }

    if (nextLineBreak === -1) {
      break
    }
    lineStart = nextLineBreak + 1
  }

  return null
}

function renderHeadingBodyAsHtml(body: string): string {
  return body.includes('<') ? body : escapeHtml(body)
}

function replaceMarkdownHeadingColorInSource(
  markdown: string,
  target: ColorTargetPatch,
  nextColor: string,
): VisualEditResult {
  if (!isHeadingTagName(target.tagName)) {
    return { changed: false, markdown }
  }

  const headingRange = findMarkdownHeadingLineRange(markdown, target)
  if (!headingRange) {
    return { changed: false, markdown }
  }

  const openTag = updateColorInTag(`<${target.tagName}>`, target.attributeName, nextColor)
  return replaceRange(
    markdown,
    headingRange,
    `${openTag}${renderHeadingBodyAsHtml(headingRange.body)}</${target.tagName}>`,
  )
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

export function replacePreviewColor(
  markdown: string,
  target: ColorTargetPatch,
  nextColor: string,
): VisualEditResult {
  const result = replacePreviewColorInSource(markdown, target, nextColor)
  if (result.changed) {
    return result
  }

  return applyToArticleBlockReference(
    markdown,
    blockMarkdown => replacePreviewColorInSource(blockMarkdown, target, nextColor),
  )
}
