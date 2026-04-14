export interface ExtractedStyleColor {
  hex: string
  preview: string
  usageCount: number
  lightness: number
  saturation: number
}

export interface MarkdownRecolorPalette {
  id: string
  name: string
  description: string
  colors: string[]
}

interface RgbColor {
  r: number
  g: number
  b: number
  alpha: number
}

interface StyleColorToken {
  raw: string
  start: number
  end: number
  color: RgbColor
  hex: string
}

export const markdownRecolorPalettes: MarkdownRecolorPalette[] = [
  {
    id: 'wechat-warm',
    name: '公众号暖橙',
    description: '温暖、亲和，适合长文和品牌叙事。',
    colors: ['#2f261d', '#9a4d00', '#e88522', '#f7c982', '#fff3df', '#fffaf3'],
  },
  {
    id: 'zhihu-blue',
    name: '知乎冷蓝',
    description: '清爽理性，适合知识型文章。',
    colors: ['#172033', '#1d4ed8', '#2563eb', '#38bdf8', '#dbeafe', '#f8fbff'],
  },
  {
    id: 'ink-gold',
    name: '墨黑金',
    description: '克制高级，适合观点和商业内容。',
    colors: ['#171717', '#4a3417', '#b7791f', '#f2d16b', '#f7efd8', '#fffaf0'],
  },
  {
    id: 'botanical-green',
    name: '草木绿',
    description: '自然松弛，适合生活方式和产品介绍。',
    colors: ['#1f2d24', '#2f6f4e', '#4f9d69', '#9ccc8a', '#e7f2df', '#fbfff7'],
  },
  {
    id: 'berry-red',
    name: '莓果红',
    description: '醒目但不刺眼，适合活动和重点提醒。',
    colors: ['#2f1720', '#8a1538', '#d93262', '#f58aa8', '#fde2ea', '#fff8fa'],
  },
  {
    id: 'quiet-gray',
    name: '静默灰',
    description: '低噪声排版，适合正式文档和教程。',
    colors: ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#e4e4e7', '#fafafa'],
  },
]

export function extractStyleColors(css: string, limit = 8): ExtractedStyleColor[] {
  const colorMap = new Map<string, {
    color: RgbColor
    usageCount: number
    score: number
  }>()

  for (const token of collectStyleColorTokens(css)) {
    if (token.color.alpha <= 0.02) {
      continue
    }

    const hsl = rgbToHsl(token.color)
    const current = colorMap.get(token.hex)
    const usageCount = (current?.usageCount ?? 0) + 1
    const balancedLightness = 1 - Math.abs(hsl.lightness - 0.5) * 0.7
    const score = Math.log2(usageCount + 1) + hsl.saturation * 3 + balancedLightness

    colorMap.set(token.hex, {
      color: { ...token.color, alpha: 1 },
      usageCount,
      score,
    })
  }

  return [...colorMap.entries()]
    .map(([hex, item]) => {
      const hsl = rgbToHsl(item.color)
      return {
        hex,
        preview: hex,
        usageCount: item.usageCount,
        lightness: hsl.lightness,
        saturation: hsl.saturation,
        score: item.score,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...color }) => color)
}

export function replaceStyleColor(css: string, sourceHex: string, targetHex: string): string {
  const source = parseColorToken(sourceHex)
  const target = parseColorToken(targetHex)
  if (!source || !target) {
    return css
  }

  return replaceColorsByMap(css, new Map([[toHex(source), toHex(target)]]))
}

export function replaceStylePalette(css: string, paletteColors: string[]): string {
  const sourceColors = extractStyleColors(css, Number.POSITIVE_INFINITY)
  const targetColors = paletteColors
    .map(color => parseColorToken(color))
    .filter((color): color is RgbColor => Boolean(color))
    .map(color => ({
      hex: toHex(color),
      lightness: rgbToHsl(color).lightness,
    }))
    .sort((a, b) => a.lightness - b.lightness)

  if (!sourceColors.length || !targetColors.length) {
    return css
  }

  const sourceByLightness = [...sourceColors].sort((a, b) => a.lightness - b.lightness)
  const colorMap = new Map<string, string>()

  sourceByLightness.forEach((source, index) => {
    const targetIndex = sourceByLightness.length === 1
      ? Math.floor(targetColors.length / 2)
      : Math.round((index / (sourceByLightness.length - 1)) * (targetColors.length - 1))

    colorMap.set(source.hex, targetColors[targetIndex]?.hex ?? targetColors[0].hex)
  })

  return replaceColorsByMap(css, colorMap)
}

function replaceColorsByMap(css: string, colorMap: Map<string, string>): string {
  if (!colorMap.size) {
    return css
  }

  const tokens = collectStyleColorTokens(css)
  if (!tokens.length) {
    return css
  }

  let nextCss = ''
  let cursor = 0

  for (const token of tokens) {
    const replacement = colorMap.get(token.hex)
    if (!replacement) {
      continue
    }

    nextCss += css.slice(cursor, token.start)
    nextCss += formatReplacementColor(replacement, token.color.alpha)
    cursor = token.end
  }

  nextCss += css.slice(cursor)
  return nextCss
}

function collectStyleColorTokens(css: string): StyleColorToken[] {
  const tokens: StyleColorToken[] = []
  let index = 0

  while (index < css.length) {
    if (startsWithComment(css, index)) {
      index = findCommentEnd(css, index)
      continue
    }

    const char = css[index]
    if (char === '"' || char === '\'') {
      index = findStringEnd(css, index, char)
      continue
    }

    const rawToken = readRawColorToken(css, index)
    if (rawToken && isDeclarationValue(css, index)) {
      const color = parseColorToken(rawToken.raw)
      if (color) {
        tokens.push({
          ...rawToken,
          color,
          hex: toHex(color),
        })
      }
      index = rawToken.end
      continue
    }

    index += 1
  }

  return tokens
}

function readRawColorToken(css: string, index: number): { raw: string, start: number, end: number } | null {
  if (css[index] === '#') {
    let end = index + 1
    while (/[0-9a-f]/iu.test(css[end] ?? '')) {
      end += 1
    }

    const raw = css.slice(index, end)
    const length = raw.length - 1
    const nextChar = css[end] ?? ''
    if ([3, 4, 6, 8].includes(length) && !/[\w-]/u.test(nextChar)) {
      return { raw, start: index, end }
    }

    return null
  }

  const functionName = ['rgba', 'rgb', 'hsla', 'hsl'].find(name =>
    css.slice(index, index + name.length).toLowerCase() === name
    && css[index + name.length] === '(',
  )

  if (!functionName) {
    return null
  }

  const end = findFunctionEnd(css, index + functionName.length)
  if (end === -1) {
    return null
  }

  return {
    raw: css.slice(index, end),
    start: index,
    end,
  }
}

function parseColorToken(token: string): RgbColor | null {
  const trimmed = token.trim()

  if (trimmed.startsWith('#')) {
    return parseHexColor(trimmed)
  }

  const functionMatch = trimmed.match(/^(rgba?|hsla?)\(([\s\S]*)\)$/iu)
  if (!functionMatch) {
    return null
  }

  const name = functionMatch[1].toLowerCase()
  const body = functionMatch[2].trim()

  if (name.startsWith('rgb')) {
    return parseRgbColor(body)
  }

  return parseHslColor(body)
}

function parseHexColor(hex: string): RgbColor | null {
  const value = hex.slice(1)
  if (![3, 4, 6, 8].includes(value.length) || !/^[0-9a-f]+$/iu.test(value)) {
    return null
  }

  const parts = value.length <= 4
    ? value.split('').map(char => Number.parseInt(`${char}${char}`, 16))
    : [
        Number.parseInt(value.slice(0, 2), 16),
        Number.parseInt(value.slice(2, 4), 16),
        Number.parseInt(value.slice(4, 6), 16),
        value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) : 255,
      ]

  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    alpha: clamp((parts[3] ?? 255) / 255, 0, 1),
  }
}

function parseRgbColor(body: string): RgbColor | null {
  const { values, alpha } = splitColorFunctionBody(body)
  if (values.length < 3) {
    return null
  }

  const channels = values.slice(0, 3).map(parseRgbChannel)
  if (!isRgbChannelTuple(channels)) {
    return null
  }

  return {
    r: channels[0],
    g: channels[1],
    b: channels[2],
    alpha: parseAlpha(alpha ?? values[3]),
  }
}

function isRgbChannelTuple(channels: Array<number | null>): channels is [number, number, number] {
  return channels.length === 3 && channels.every(channel => channel !== null)
}

function parseHslColor(body: string): RgbColor | null {
  const { values, alpha } = splitColorFunctionBody(body)
  if (values.length < 3) {
    return null
  }

  const hue = parseHue(values[0])
  const saturation = parsePercent(values[1])
  const lightness = parsePercent(values[2])
  if (hue === null || saturation === null || lightness === null) {
    return null
  }

  const rgb = hslToRgb(hue, saturation, lightness)
  return {
    ...rgb,
    alpha: parseAlpha(alpha ?? values[3]),
  }
}

function splitColorFunctionBody(body: string): { values: string[], alpha?: string } {
  if (body.includes(',')) {
    const values = body.split(',').map(part => part.trim()).filter(Boolean)
    return { values }
  }

  const slashIndex = body.indexOf('/')
  const valueText = slashIndex === -1 ? body : body.slice(0, slashIndex)
  const alpha = slashIndex === -1 ? undefined : body.slice(slashIndex + 1).trim()

  return {
    values: valueText.trim().split(/\s+/u).filter(Boolean),
    alpha,
  }
}

function parseRgbChannel(value: string): number | null {
  if (value.endsWith('%')) {
    const percent = Number.parseFloat(value)
    return Number.isFinite(percent) ? Math.round(clamp(percent, 0, 100) * 2.55) : null
  }

  const channel = Number.parseFloat(value)
  return Number.isFinite(channel) ? Math.round(clamp(channel, 0, 255)) : null
}

function parseAlpha(value?: string): number {
  if (!value) {
    return 1
  }

  if (value.endsWith('%')) {
    const percent = Number.parseFloat(value)
    return Number.isFinite(percent) ? clamp(percent / 100, 0, 1) : 1
  }

  const alpha = Number.parseFloat(value)
  return Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 1
}

function parseHue(value: string): number | null {
  const hue = Number.parseFloat(value)
  if (!Number.isFinite(hue)) {
    return null
  }

  if (value.endsWith('turn')) {
    return hue * 360
  }

  if (value.endsWith('rad')) {
    return hue * (180 / Math.PI)
  }

  if (value.endsWith('grad')) {
    return hue * 0.9
  }

  return hue
}

function parsePercent(value: string): number | null {
  if (!value.endsWith('%')) {
    return null
  }

  const percent = Number.parseFloat(value)
  return Number.isFinite(percent) ? clamp(percent / 100, 0, 1) : null
}

function hslToRgb(hue: number, saturation: number, lightness: number): Omit<RgbColor, 'alpha'> {
  const normalizedHue = (((hue % 360) + 360) % 360) / 360
  if (saturation === 0) {
    const value = Math.round(lightness * 255)
    return { r: value, g: value, b: value }
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q

  return {
    r: Math.round(hueToRgb(p, q, normalizedHue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, normalizedHue) * 255),
    b: Math.round(hueToRgb(p, q, normalizedHue - 1 / 3) * 255),
  }
}

function hueToRgb(p: number, q: number, t: number): number {
  let nextT = t
  if (nextT < 0)
    nextT += 1
  if (nextT > 1)
    nextT -= 1
  if (nextT < 1 / 6)
    return p + (q - p) * 6 * nextT
  if (nextT < 1 / 2)
    return q
  if (nextT < 2 / 3)
    return p + (q - p) * (2 / 3 - nextT) * 6
  return p
}

function rgbToHsl(color: Pick<RgbColor, 'r' | 'g' | 'b'>): { saturation: number, lightness: number } {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2

  if (max === min) {
    return { saturation: 0, lightness }
  }

  const delta = max - min
  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min)

  return { saturation, lightness }
}

function toHex(color: Pick<RgbColor, 'r' | 'g' | 'b'>): string {
  return `#${toHexPart(color.r)}${toHexPart(color.g)}${toHexPart(color.b)}`
}

function toHexPart(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')
}

function formatReplacementColor(hex: string, alpha: number): string {
  const color = parseHexColor(hex)
  if (!color) {
    return hex
  }

  if (alpha >= 0.999) {
    return hex
  }

  return `rgba(${color.r}, ${color.g}, ${color.b}, ${formatAlpha(alpha)})`
}

function formatAlpha(alpha: number): string {
  return Number(alpha.toFixed(3)).toString()
}

function isDeclarationValue(css: string, index: number): boolean {
  let cursor = index - 1
  while (cursor >= 0) {
    const char = css[cursor]
    if (char === '{' || char === ';' || char === '}') {
      break
    }
    cursor -= 1
  }

  const segment = css.slice(cursor + 1, index)
  return segment.includes(':')
}

function startsWithComment(input: string, index: number): boolean {
  return input[index] === '/' && input[index + 1] === '*'
}

function findCommentEnd(input: string, startIndex: number): number {
  const endIndex = input.indexOf('*/', startIndex + 2)
  return endIndex === -1 ? input.length : endIndex + 2
}

function findStringEnd(input: string, startIndex: number, quote: '"' | '\''): number {
  let index = startIndex + 1
  while (index < input.length) {
    if (input[index] === '\\') {
      index += 2
      continue
    }

    if (input[index] === quote) {
      return index + 1
    }

    index += 1
  }

  return input.length
}

function findFunctionEnd(input: string, openParenIndex: number): number {
  let index = openParenIndex
  let depth = 0
  let quote: '"' | '\'' | null = null

  while (index < input.length) {
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

    if (char === '(') {
      depth += 1
    }

    if (char === ')') {
      depth -= 1
      if (depth === 0) {
        return index + 1
      }
    }

    index += 1
  }

  return -1
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
