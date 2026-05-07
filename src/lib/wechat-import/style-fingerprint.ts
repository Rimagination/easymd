import type { WechatStyleFingerprint } from './types'

const DEFAULT_FINGERPRINT: WechatStyleFingerprint = {
  colors: {
    text: '#2f3437',
    muted: '#6b7280',
    accent: '#2f80ed',
    background: '#ffffff',
    quoteBorder: '#2f80ed',
    codeBackground: '#f6f8fa',
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
    imageRadius: 0,
    tablePattern: 'minimal',
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeColor(value: string): string | undefined {
  const hex = value.trim().match(/#[0-9a-f]{3,8}\b/i)?.[0]
  if (!hex) {
    return undefined
  }
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase()
  }
  return hex.slice(0, 7).toLowerCase()
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
  const pattern = new RegExp(`<${tagName}\\b[^>]*(?:^|\\s)style=(["'])([\\s\\S]*?)\\1`, 'gi')
  return Array.from(html.matchAll(pattern), match => match[2] ?? '')
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
  if (/^-?0(?:\.0+)?$/i.test(token)) {
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

export function extractWechatStyleFingerprint(html: string): WechatStyleFingerprint {
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

  const headingAccent = normalizeColor(readProperty(h2Style, 'border-left') ?? '')
    ?? normalizeColor(readProperty(h2Style, 'border-bottom') ?? '')
    ?? normalizeColor(readProperty(h2Style, 'color') ?? '')
  const quoteBorder = normalizeColor(readProperty(quoteStyle, 'border-left') ?? '')

  const bodyFontSize = clamp(
    firstDefined(paragraphStyles.map(style => readPx(style, 'font-size')), DEFAULT_FINGERPRINT.typography.bodyFontSize ?? 16),
    14,
    18,
  )
  const bodyLineHeight = firstDefined(paragraphStyles.map(readLineHeight), DEFAULT_FINGERPRINT.typography.bodyLineHeight ?? 1.8)
  const paragraphMarginBlock = clamp(readMarginBlock(paragraphStyle) ?? DEFAULT_FINGERPRINT.spacing.paragraphMarginBlock ?? 12, 8, 24)

  const hasHeadingBar = /border-left\s*:/i.test(h2Style)
  const hasHeadingUnderline = /border-bottom\s*:/i.test(h2Style)
  const quoteHasBackground = Boolean(readProperty(quoteStyle, 'background') || readProperty(quoteStyle, 'background-color'))

  return {
    colors: {
      text: normalizeColor(readProperty(paragraphStyle, 'color') ?? '') ?? DEFAULT_FINGERPRINT.colors.text,
      muted: DEFAULT_FINGERPRINT.colors.muted,
      accent: headingAccent ?? DEFAULT_FINGERPRINT.colors.accent,
      background: DEFAULT_FINGERPRINT.colors.background,
      quoteBorder: quoteBorder ?? headingAccent ?? DEFAULT_FINGERPRINT.colors.quoteBorder,
      codeBackground: DEFAULT_FINGERPRINT.colors.codeBackground,
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
      quotePattern: quoteHasBackground ? 'card' : 'left-border',
      imageRadius: clamp(readPx(imgStyle, 'border-radius') ?? DEFAULT_FINGERPRINT.decoration.imageRadius ?? 0, 0, 28),
      tablePattern: /border-collapse\s*:\s*collapse/i.test(tableStyle) ? 'bordered' : 'minimal',
    },
  }
}
