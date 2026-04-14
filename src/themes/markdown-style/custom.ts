import { markdownStyleIds } from './index'
import resetCss from './reset.css?raw'

export const MARKDOWN_STYLE_SCOPE_SELECTOR = '#easymd'
export const CUSTOM_MARKDOWN_STYLE_PREFIX = 'custom:'
export const MAX_IMPORTED_MARKDOWN_STYLE_LENGTH = 200_000
const FALLBACK_RESET_CSS = `
#easymd *,
#easymd *::before,
#easymd *::after {
  box-sizing: border-box;
}

#easymd * {
  margin: 0;
}

#easymd {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-autospace: normal;
  font-family: sans-serif;
  text-align: left;
}

#easymd img,
#easymd picture,
#easymd video,
#easymd canvas,
#easymd svg {
  display: block;
  max-width: 100%;
}

#easymd input,
#easymd button,
#easymd textarea,
#easymd select {
  font: inherit;
}

#easymd p,
#easymd h1,
#easymd h2,
#easymd h3,
#easymd h4,
#easymd h5,
#easymd h6 {
  overflow-wrap: break-word;
}

#easymd figure.figure-table {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

#easymd figure.figure-table table {
  margin: 0;
}
`.trim()
const scopedResetCss = resetCss.trim() || FALLBACK_RESET_CSS

const CONTAINER_AT_RULES = new Set([
  'container',
  'document',
  'layer',
  'media',
  'scope',
  'starting-style',
  'supports',
])

const ROOT_SELECTOR_PREFIXES = [
  ':root',
  'html',
  'body',
  '.markdown-body',
  '.mdnice',
  '#write',
  '#nice',
  '#mdnice',
]

export interface ImportedMarkdownStyle {
  id: string
  name: string
  css: string
  sourceName: string
  importedAt: number
}

export interface ImportedMarkdownStyleParseResult {
  style: ImportedMarkdownStyle
  normalized: boolean
}

export interface ResolvedMarkdownRenderStyle {
  markdownStyle?: string
  customCss: string
}

export function createImportedMarkdownStyle(
  sourceName: string,
  sourceCss: string,
): ImportedMarkdownStyleParseResult {
  const css = sourceCss.trim()
  if (!css) {
    throw new Error('The style file is empty and cannot be imported.')
  }

  if (css.length > MAX_IMPORTED_MARKDOWN_STYLE_LENGTH) {
    throw new Error(`The style file cannot exceed ${MAX_IMPORTED_MARKDOWN_STYLE_LENGTH.toLocaleString()} characters.`)
  }

  const { css: normalizedCss, normalized } = normalizeImportedMarkdownStyleCss(css)
  const name = extractImportedStyleName(css, sourceName)

  return {
    style: {
      id: `${CUSTOM_MARKDOWN_STYLE_PREFIX}${createStableStyleSlug(sourceName)}`,
      name,
      css: [scopedResetCss, normalizedCss].filter(Boolean).join('\n').trim(),
      sourceName,
      importedAt: Date.now(),
    },
    normalized,
  }
}

export function resolveMarkdownRenderStyle(
  styleId: string,
  importedStyles: ImportedMarkdownStyle[],
  customCss: string,
): ResolvedMarkdownRenderStyle {
  const importedStyle = importedStyles.find(style => style.id === styleId)
  if (importedStyle) {
    return {
      customCss: [importedStyle.css, customCss].filter(Boolean).join('\n'),
    }
  }

  if (isBuiltInMarkdownStyleId(styleId)) {
    return {
      markdownStyle: styleId,
      customCss,
    }
  }

  return {
    markdownStyle: markdownStyleIds[0],
    customCss,
  }
}

export function normalizeImportedMarkdownStyleCss(sourceCss: string): { css: string, normalized: boolean } {
  const { css, normalized } = transformCssBlock(sourceCss, 0)
  return {
    css: css.trim(),
    normalized,
  }
}

export function isBuiltInMarkdownStyleId(id: string): boolean {
  return (markdownStyleIds as readonly string[]).includes(id)
}

function transformCssBlock(
  input: string,
  startIndex: number,
  stopChar?: string,
): { css: string, index: number, normalized: boolean } {
  let index = startIndex
  let css = ''
  let normalized = false

  while (index < input.length) {
    const char = input[index]

    if (stopChar && char === stopChar) {
      return { css, index: index + 1, normalized }
    }

    if (startsWithComment(input, index)) {
      const end = findCommentEnd(input, index)
      css += input.slice(index, end)
      index = end
      continue
    }

    if (char === '@') {
      const statement = readUntilTopLevel(input, index, new Set(['{', ';']))
      if (!statement.terminator) {
        css += input.slice(index)
        return { css, index: input.length, normalized }
      }

      if (statement.terminator === ';') {
        css += `${statement.content};`
        index = statement.nextIndex
        continue
      }

      const atRuleName = getAtRuleName(statement.content)
      if (CONTAINER_AT_RULES.has(atRuleName)) {
        const inner = transformCssBlock(input, statement.nextIndex, '}')
        css += `${statement.content}{${inner.css}}`
        index = inner.index
        normalized ||= inner.normalized
        continue
      }

      const rawBlock = readRawBlock(input, statement.nextIndex)
      css += `${statement.content}{${rawBlock.content}}`
      index = rawBlock.index
      continue
    }

    if (stopChar && char !== '}' && char.trim() === '') {
      css += char
      index += 1
      continue
    }

    if (char.trim() === '') {
      css += char
      index += 1
      continue
    }

    const selectorStatement = readUntilTopLevel(input, index, new Set(['{']))
    if (selectorStatement.terminator !== '{') {
      css += input.slice(index)
      return { css, index: input.length, normalized }
    }

    const ruleBlock = readRawBlock(input, selectorStatement.nextIndex)
    const scopedSelector = normalizeSelectorList(selectorStatement.content)
    normalized ||= scopedSelector !== selectorStatement.content.trim()
    css += `${scopedSelector}{${ruleBlock.content}}`
    index = ruleBlock.index
  }

  return { css, index, normalized }
}

function normalizeSelectorList(selectorText: string): string {
  return splitTopLevel(selectorText, ',')
    .map(selector => normalizeSingleSelector(selector))
    .filter(Boolean)
    .join(', ')
}

function normalizeSingleSelector(selectorText: string): string {
  const selector = selectorText.trim()
  if (!selector) {
    return ''
  }

  if (selector.includes(MARKDOWN_STYLE_SCOPE_SELECTOR)) {
    return selector
  }

  const strippedSelector = stripLeadingRootCompounds(selector)
  if (strippedSelector !== null) {
    return prefixScope(strippedSelector)
  }

  return prefixScope(selector)
}

function prefixScope(selectorText: string): string {
  const selector = selectorText.trim()
  if (!selector) {
    return MARKDOWN_STYLE_SCOPE_SELECTOR
  }

  if (/^::?/.test(selector)) {
    return `${MARKDOWN_STYLE_SCOPE_SELECTOR}${selector}`
  }

  if (/^[>+~]/.test(selector)) {
    return `${MARKDOWN_STYLE_SCOPE_SELECTOR} ${selector}`
  }

  return `${MARKDOWN_STYLE_SCOPE_SELECTOR} ${selector}`
}

function stripLeadingRootCompounds(selectorText: string): string | null {
  let selector = selectorText.trim()
  let changed = false

  while (selector) {
    const { compound, rest } = splitLeadingCompound(selector)
    if (!compound || !isRootCompound(compound)) {
      break
    }

    selector = rest.trimStart()
    changed = true
  }

  return changed ? selector : null
}

function splitLeadingCompound(selectorText: string): { compound: string, rest: string } {
  let index = 0
  let bracketDepth = 0
  let parenDepth = 0
  let quote: '"' | '\'' | null = null

  while (index < selectorText.length) {
    if (startsWithComment(selectorText, index)) {
      index = findCommentEnd(selectorText, index)
      continue
    }

    const char = selectorText[index]
    if (quote) {
      if (char === '\\') {
        index += 2
        continue
      }

      if (char === quote) {
        quote = null
      }

      index += 1
      continue
    }

    if (char === '"' || char === '\'') {
      quote = char
      index += 1
      continue
    }

    if (char === '[') {
      bracketDepth += 1
      index += 1
      continue
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1)
      index += 1
      continue
    }

    if (char === '(') {
      parenDepth += 1
      index += 1
      continue
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      index += 1
      continue
    }

    if (bracketDepth === 0 && parenDepth === 0) {
      if (/\s/.test(char) || char === '>' || char === '+' || char === '~') {
        break
      }
    }

    index += 1
  }

  return {
    compound: selectorText.slice(0, index).trim(),
    rest: selectorText.slice(index),
  }
}

function isRootCompound(compound: string): boolean {
  return ROOT_SELECTOR_PREFIXES.some(prefix =>
    compound === prefix
    || compound.startsWith(`${prefix}.`)
    || compound.startsWith(`${prefix}#`)
    || compound.startsWith(`${prefix}[`)
    || compound.startsWith(`${prefix}:`),
  )
}

function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = []
  let current = ''
  let bracketDepth = 0
  let parenDepth = 0
  let quote: '"' | '\'' | null = null
  let index = 0

  while (index < input.length) {
    if (startsWithComment(input, index)) {
      const end = findCommentEnd(input, index)
      current += input.slice(index, end)
      index = end
      continue
    }

    const char = input[index]
    if (quote) {
      current += char
      if (char === '\\') {
        current += input[index + 1] ?? ''
        index += 2
        continue
      }

      if (char === quote) {
        quote = null
      }

      index += 1
      continue
    }

    if (char === '"' || char === '\'') {
      quote = char
      current += char
      index += 1
      continue
    }

    if (char === '[') {
      bracketDepth += 1
      current += char
      index += 1
      continue
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1)
      current += char
      index += 1
      continue
    }

    if (char === '(') {
      parenDepth += 1
      current += char
      index += 1
      continue
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      current += char
      index += 1
      continue
    }

    if (char === separator && bracketDepth === 0 && parenDepth === 0) {
      parts.push(current)
      current = ''
      index += 1
      continue
    }

    current += char
    index += 1
  }

  if (current || !parts.length) {
    parts.push(current)
  }

  return parts
}

function readUntilTopLevel(
  input: string,
  startIndex: number,
  terminators: Set<string>,
): { content: string, terminator?: string, nextIndex: number } {
  let index = startIndex
  let bracketDepth = 0
  let parenDepth = 0
  let quote: '"' | '\'' | null = null

  while (index < input.length) {
    if (startsWithComment(input, index)) {
      index = findCommentEnd(input, index)
      continue
    }

    const char = input[index]
    if (quote) {
      if (char === '\\') {
        index += 2
        continue
      }

      if (char === quote) {
        quote = null
      }

      index += 1
      continue
    }

    if (char === '"' || char === '\'') {
      quote = char
      index += 1
      continue
    }

    if (char === '[') {
      bracketDepth += 1
      index += 1
      continue
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1)
      index += 1
      continue
    }

    if (char === '(') {
      parenDepth += 1
      index += 1
      continue
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      index += 1
      continue
    }

    if (bracketDepth === 0 && parenDepth === 0 && terminators.has(char)) {
      return {
        content: input.slice(startIndex, index).trim(),
        terminator: char,
        nextIndex: index + 1,
      }
    }

    index += 1
  }

  return {
    content: input.slice(startIndex).trim(),
    nextIndex: input.length,
  }
}

function readRawBlock(input: string, startIndex: number): { content: string, index: number } {
  let index = startIndex
  let depth = 1
  let quote: '"' | '\'' | null = null

  while (index < input.length) {
    if (startsWithComment(input, index)) {
      index = findCommentEnd(input, index)
      continue
    }

    const char = input[index]
    if (quote) {
      if (char === '\\') {
        index += 2
        continue
      }

      if (char === quote) {
        quote = null
      }

      index += 1
      continue
    }

    if (char === '"' || char === '\'') {
      quote = char
      index += 1
      continue
    }

    if (char === '{') {
      depth += 1
      index += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return {
          content: input.slice(startIndex, index),
          index: index + 1,
        }
      }
    }

    index += 1
  }

  return {
    content: input.slice(startIndex),
    index: input.length,
  }
}

function startsWithComment(input: string, index: number): boolean {
  return input[index] === '/' && input[index + 1] === '*'
}

function findCommentEnd(input: string, startIndex: number): number {
  const endIndex = input.indexOf('*/', startIndex + 2)
  return endIndex === -1 ? input.length : endIndex + 2
}

function getAtRuleName(statement: string): string {
  return statement.slice(1).split(/[\s{(]/, 1)[0]?.toLowerCase() ?? ''
}

function extractImportedStyleName(sourceCss: string, sourceName: string): string {
  const commentBlocks = sourceCss.match(/\/\*[\s\S]*?\*\//g) ?? []
  const commentMatch = commentBlocks
    .flatMap((block) => {
      const body = block.slice(2, -2)
      return body
        .split(/\r?\n/u)
        .map(line => line.replace(/^\s*\*\s?/u, '').trim())
    })
    .map((line) => {
      const separatorIndex = line.indexOf(':')
      if (separatorIndex === -1) {
        return undefined
      }

      const label = line.slice(0, separatorIndex).trim().toLowerCase().replace(/\s+/g, ' ')
      if (!['@name', 'theme name', 'name'].includes(label)) {
        return undefined
      }

      return line.slice(separatorIndex + 1).trim()
    })
    .find(Boolean)

  if (commentMatch) {
    return commentMatch
  }

  const baseName = sourceName.replace(/\.[^.]+$/u, '').trim()
  if (!baseName) {
    return 'Custom Style'
  }

  return baseName
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(part => /^[a-z0-9]+$/i.test(part)
      ? `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`
      : part)
    .join(' ')
}

function createStableStyleSlug(sourceName: string): string {
  const normalized = sourceName
    .replace(/\.[^.]+$/u, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (normalized) {
    return normalized
  }

  return `style-${Math.abs(hashString(sourceName)).toString(36)}`
}

function hashString(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }
  return hash
}
