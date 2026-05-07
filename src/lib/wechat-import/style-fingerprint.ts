import type { WechatStyleFingerprint } from './types'

const DEFAULT_FINGERPRINT: WechatStyleFingerprint = {
  colors: {
    text: '#2f3437',
    muted: '#6b7280',
    accent: '#2f80ed',
    background: '#ffffff',
    quoteBorder: '#2f80ed',
    codeBackground: '#f6f8fa',
    panelBackground: '#f7f7f7',
    panelBorder: '#dfe2e5',
  },
  typography: {
    bodyFontSize: 16,
    bodyLineHeight: 1.8,
    h1FontSize: 24,
    h2FontSize: 21,
    h3FontSize: 18,
    fontFamilyKind: 'system',
  },
  spacing: {
    paragraphMarginBlock: 12,
    sectionMarginBlock: 24,
    headingMarginBlock: 24,
  },
  decoration: {
    headingPattern: 'plain',
    quotePattern: 'left-border',
    panelPattern: 'none',
    imageRadius: 0,
    tablePattern: 'minimal',
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeColor(value: string): string | undefined {
  const hex = value.trim().match(/#[0-9a-f]{3,8}\b/i)?.[0]
  if (hex) {
    if (hex.length === 4) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase()
    }
    return hex.slice(0, 7).toLowerCase()
  }

  const rgb = value.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)/i)
  if (!rgb) {
    return undefined
  }

  const alpha = rgb[4] === undefined ? 1 : Number(rgb[4])
  if (!Number.isFinite(alpha) || alpha <= 0.05) {
    return undefined
  }

  return `#${[rgb[1], rgb[2], rgb[3]]
    .map(value => clamp(Number(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`.toLowerCase()
}

function parseStyleDeclarations(style: string): Map<string, string> {
  const declarations = new Map<string, string>()
  for (const declaration of style.split(';')) {
    const separatorIndex = declaration.indexOf(':')
    if (separatorIndex === -1) {
      continue
    }

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase()
    const value = declaration.slice(separatorIndex + 1).trim()
    if (property && value) {
      declarations.set(property, value)
    }
  }
  return declarations
}

function readStyleAttributes(html: string, tagName: string): string[] {
  const pattern = new RegExp(`<${tagName}\\b[^>]*\\sstyle=(["'])([\\s\\S]*?)\\1`, 'gi')
  return Array.from(html.matchAll(pattern), match => match[2] ?? '')
}

interface StyleRecord {
  tagName: string
  declarations: Map<string, string>
  style: string
}

function readStyleRecords(html: string): StyleRecord[] {
  const pattern = /<([a-z0-9]+)\b[^>]*\sstyle=(["'])([\s\S]*?)\2/gi
  return Array.from(html.matchAll(pattern), match => ({
    tagName: (match[1] ?? '').toLowerCase(),
    declarations: parseStyleDeclarations(match[3] ?? ''),
    style: match[3] ?? '',
  }))
}

function readProperty(style: string, property: string): string | undefined {
  return parseStyleDeclarations(style).get(property.toLowerCase())
}

function readPx(style: string, property: string): number | undefined {
  const value = readProperty(style, property)
  const match = value?.match(/(-?\d+(?:\.\d+)?)px/i)
  return match ? Number(match[1]) : undefined
}

function readLineHeight(style: string): number | undefined {
  const value = readProperty(style, 'line-height')
  if (!value) {
    return undefined
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return clamp(Number(numeric.toFixed(2)), 1.4, 2.2)
  }
  const px = value.match(/(\d+(?:\.\d+)?)px/i)
  const fontSize = readPx(style, 'font-size') ?? DEFAULT_FINGERPRINT.typography.bodyFontSize ?? 16
  return px ? clamp(Number((Number(px[1]) / fontSize).toFixed(2)), 1.4, 2.2) : undefined
}

function readMarginTokenPx(token: string | undefined): number | undefined {
  if (!token) {
    return undefined
  }
  if (/^-?0(?:\.0+)?$/.test(token)) {
    return 0
  }
  const px = token.match(/^(-?\d+(?:\.\d+)?)px$/i)
  return px ? Number(px[1]) : undefined
}

function readMarginBlock(style: string): number | undefined {
  const marginTop = readPx(style, 'margin-top')
  const marginBottom = readPx(style, 'margin-bottom')
  if (marginTop !== undefined || marginBottom !== undefined) {
    return Math.max(marginTop ?? 0, marginBottom ?? 0)
  }

  const margin = readProperty(style, 'margin')
  if (!margin) {
    return undefined
  }

  const tokens = margin.trim().split(/\s+/)
  const topToken = tokens[0]
  const bottomToken = tokens.length >= 3 ? tokens[2] : tokens[0]
  const values = [readMarginTokenPx(topToken), readMarginTokenPx(bottomToken)]
    .filter(value => value !== undefined)

  return values.length > 0 ? Math.max(...values) : undefined
}

function firstDefined<T>(values: Array<T | undefined>, fallback: T): T {
  return values.find(value => value !== undefined) ?? fallback
}

function hexToRgb(color: string): [number, number, number] | undefined {
  const match = color.match(/^#([0-9a-f]{6})$/i)
  if (!match) {
    return undefined
  }

  const value = match[1]
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

function colorLuminance(color: string): number {
  const rgb = hexToRgb(color)
  return rgb ? (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255 : 1
}

function colorSaturation(color: string): number {
  const rgb = hexToRgb(color)
  if (!rgb) {
    return 0
  }

  const max = Math.max(...rgb)
  const min = Math.min(...rgb)
  return max === 0 ? 0 : (max - min) / max
}

function isNearWhite(color: string): boolean {
  return colorLuminance(color) > 0.98 && colorSaturation(color) < 0.08
}

function isNeutral(color: string): boolean {
  return colorSaturation(color) < 0.08
}

function isAccentCandidate(color: string): boolean {
  return colorSaturation(color) >= 0.16 && colorLuminance(color) < 0.78
}

function isSoftHighlightCandidate(color: string): boolean {
  return colorSaturation(color) >= 0.04 && colorLuminance(color) >= 0.72
}

function addColorCandidate(candidates: Map<string, number>, color: string | undefined, weight = 1) {
  if (!color) {
    return
  }

  candidates.set(color, (candidates.get(color) ?? 0) + weight)
}

function topColor(candidates: Map<string, number>): string | undefined {
  return Array.from(candidates.entries()).sort((left, right) => right[1] - left[1])[0]?.[0]
}

function readDeclarationColor(declarations: Map<string, string>, ...properties: string[]): string | undefined {
  for (const property of properties) {
    const color = normalizeColor(declarations.get(property) ?? '')
    if (color) {
      return color
    }
  }
  return undefined
}

function readRecordPx(record: StyleRecord, property: string): number | undefined {
  const value = record.declarations.get(property)
  const match = value?.match(/(-?\d+(?:\.\d+)?)px/i)
  return match ? Number(match[1]) : undefined
}

function isPanelRecord(record: StyleRecord): boolean {
  if (!['section', 'div', 'blockquote'].includes(record.tagName)) {
    return false
  }

  return Boolean(
    record.declarations.get('padding')
    || record.declarations.get('padding-left')
    || record.declarations.get('border')
    || record.declarations.get('border-color')
    || record.declarations.get('border-radius'),
  )
}

function findStructuralAccent(records: StyleRecord[]): string | undefined {
  const candidates = new Map<string, number>()

  for (const record of records) {
    const background = readDeclarationColor(record.declarations, 'background-color', 'background')
    const border = readDeclarationColor(record.declarations, 'border-left', 'border-bottom', 'border-top', 'border', 'border-color')
    const text = readDeclarationColor(record.declarations, 'color')

    for (const color of [background, border, text]) {
      if (color && isAccentCandidate(color)) {
        addColorCandidate(candidates, color, record.tagName === 'section' ? 3 : 1)
      }
    }
  }

  return topColor(candidates)
}

function hasVerticalAccentBlock(records: StyleRecord[], accent: string | undefined): boolean {
  if (!accent) {
    return false
  }

  return records.some((record) => {
    const background = readDeclarationColor(record.declarations, 'background-color', 'background')
    const width = readRecordPx(record, 'width')
    return background === accent && width !== undefined && width <= 24
  })
}

function findHighlightBackground(records: StyleRecord[]): string | undefined {
  const candidates = new Map<string, number>()

  for (const record of records) {
    const background = readDeclarationColor(record.declarations, 'background-color', 'background')
    if (background && isSoftHighlightCandidate(background) && !isNearWhite(background)) {
      addColorCandidate(candidates, background, record.tagName === 'span' ? 3 : 1)
    }
  }

  return topColor(candidates)
}

function findPanelBackground(records: StyleRecord[]): string | undefined {
  const candidates = new Map<string, number>()

  for (const record of records) {
    if (!isPanelRecord(record)) {
      continue
    }

    const background = readDeclarationColor(record.declarations, 'background-color', 'background')
    if (background && !isNearWhite(background) && (isNeutral(background) || colorLuminance(background) > 0.85)) {
      addColorCandidate(candidates, background, 2)
    }
  }

  return topColor(candidates)
}

function findPanelBorder(records: StyleRecord[]): string | undefined {
  const candidates = new Map<string, number>()

  for (const record of records) {
    if (!isPanelRecord(record)) {
      continue
    }

    const border = readDeclarationColor(record.declarations, 'border-color', 'border', 'border-left', 'border-bottom', 'border-top')
    if (border && !isNearWhite(border)) {
      addColorCandidate(candidates, border, 2)
    }
  }

  return topColor(candidates)
}

function findPanelRadius(records: StyleRecord[]): number | undefined {
  const values = records
    .filter(isPanelRecord)
    .map(record => readRecordPx(record, 'border-radius'))
    .filter(value => value !== undefined)

  return values.length > 0 ? Math.max(...values) : undefined
}

export function extractWechatStyleFingerprint(html: string): WechatStyleFingerprint {
  const styleRecords = readStyleRecords(html)
  const paragraphStyles = readStyleAttributes(html, 'p')
  const h1Styles = readStyleAttributes(html, 'h1')
  const h2Styles = readStyleAttributes(html, 'h2')
  const h3Styles = readStyleAttributes(html, 'h3')
  const quoteStyles = readStyleAttributes(html, 'blockquote')
  const imgStyles = readStyleAttributes(html, 'img')
  const tableStyles = readStyleAttributes(html, 'table')

  const paragraphStyle = paragraphStyles[0] ?? ''
  const h2Style = h2Styles[0] ?? ''
  const quoteStyle = quoteStyles[0] ?? ''
  const imgStyle = imgStyles[0] ?? ''
  const tableStyle = tableStyles[0] ?? ''
  const structuralAccent = findStructuralAccent(styleRecords)
  const panelBackground = findPanelBackground(styleRecords)
  const panelBorder = findPanelBorder(styleRecords)
  const highlightBackground = findHighlightBackground(styleRecords)
  const panelRadius = findPanelRadius(styleRecords)

  const headingAccent = normalizeColor(readProperty(h2Style, 'border-left') ?? '')
    ?? normalizeColor(readProperty(h2Style, 'border-bottom') ?? '')
    ?? normalizeColor(readProperty(h2Style, 'color') ?? '')
    ?? structuralAccent
  const quoteBorder = normalizeColor(readProperty(quoteStyle, 'border-left') ?? '')

  const bodyFontSize = clamp(
    firstDefined(paragraphStyles.map(style => readPx(style, 'font-size')), DEFAULT_FINGERPRINT.typography.bodyFontSize ?? 16),
    14,
    18,
  )
  const bodyLineHeight = firstDefined(paragraphStyles.map(readLineHeight), DEFAULT_FINGERPRINT.typography.bodyLineHeight ?? 1.8)
  const paragraphMarginBlock = clamp(readMarginBlock(paragraphStyle) ?? DEFAULT_FINGERPRINT.spacing.paragraphMarginBlock ?? 12, 8, 24)

  const hasHeadingBar = /border-left\s*:/i.test(h2Style) || hasVerticalAccentBlock(styleRecords, headingAccent)
  const hasHeadingUnderline = /border-bottom\s*:/i.test(h2Style)
  const quoteHasBackground = Boolean(readProperty(quoteStyle, 'background') || readProperty(quoteStyle, 'background-color'))
  const panelPattern = panelBorder ? 'bordered-card' : panelBackground ? 'card' : 'none'

  return {
    colors: {
      text: normalizeColor(readProperty(paragraphStyle, 'color') ?? '') ?? DEFAULT_FINGERPRINT.colors.text,
      muted: DEFAULT_FINGERPRINT.colors.muted,
      accent: headingAccent ?? DEFAULT_FINGERPRINT.colors.accent,
      background: DEFAULT_FINGERPRINT.colors.background,
      quoteBorder: quoteBorder ?? headingAccent ?? DEFAULT_FINGERPRINT.colors.quoteBorder,
      codeBackground: DEFAULT_FINGERPRINT.colors.codeBackground,
      panelBackground,
      panelBorder,
      highlightBackground,
    },
    typography: {
      bodyFontSize,
      bodyLineHeight,
      h1FontSize: clamp(readPx(h1Styles[0] ?? '', 'font-size') ?? DEFAULT_FINGERPRINT.typography.h1FontSize ?? 24, 22, 30),
      h2FontSize: clamp(readPx(h2Style, 'font-size') ?? DEFAULT_FINGERPRINT.typography.h2FontSize ?? 21, 18, 26),
      h3FontSize: clamp(readPx(h3Styles[0] ?? '', 'font-size') ?? DEFAULT_FINGERPRINT.typography.h3FontSize ?? 18, 16, 22),
      fontFamilyKind: DEFAULT_FINGERPRINT.typography.fontFamilyKind,
    },
    spacing: {
      paragraphMarginBlock,
      sectionMarginBlock: DEFAULT_FINGERPRINT.spacing.sectionMarginBlock,
      headingMarginBlock: DEFAULT_FINGERPRINT.spacing.headingMarginBlock,
    },
    decoration: {
      headingPattern: hasHeadingBar ? 'bar' : hasHeadingUnderline ? 'underline' : 'plain',
      quotePattern: quoteHasBackground || panelPattern !== 'none' ? 'card' : 'left-border',
      panelPattern,
      imageRadius: clamp(readPx(imgStyle, 'border-radius') ?? panelRadius ?? DEFAULT_FINGERPRINT.decoration.imageRadius ?? 0, 0, 28),
      tablePattern: /border-collapse\s*:\s*collapse/i.test(tableStyle) ? 'bordered' : 'minimal',
    },
  }
}
