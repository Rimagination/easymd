import type { WechatStyleFingerprint } from './types'

function value<T>(input: T | undefined, fallback: T): T {
  return input ?? fallback
}

function softFill(color: string, alpha: number): string {
  const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1]
  if (!hex) {
    return `rgba(47, 128, 237, ${alpha})`
  }

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function headingDecoration(fingerprint: WechatStyleFingerprint): string {
  const accent = value(fingerprint.colors.accent, '#2f80ed')

  switch (fingerprint.decoration.headingPattern) {
    case 'bar':
      return [
        '  padding-left: 12px;',
        `  border-left: 4px solid ${accent};`,
      ].join('\n')
    case 'underline':
      return [
        '  padding-bottom: 8px;',
        `  border-bottom: 2px solid ${accent};`,
      ].join('\n')
    case 'badge':
      return [
        '  display: inline-block;',
        '  padding: 4px 12px;',
        '  color: #ffffff;',
        `  background: ${accent};`,
        '  border-radius: 4px;',
      ].join('\n')
    case 'plain':
    default:
      return `  color: ${accent};`
  }
}

export function generateWechatThemeCss(fingerprint: WechatStyleFingerprint): string {
  const text = value(fingerprint.colors.text, '#2f3437')
  const muted = value(fingerprint.colors.muted, '#6b7280')
  const background = value(fingerprint.colors.background, '#ffffff')
  const accent = value(fingerprint.colors.accent, '#2f80ed')
  const quoteBorder = value(fingerprint.colors.quoteBorder, accent)
  const codeBackground = value(fingerprint.colors.codeBackground, '#f6f8fa')
  const bodyFontSize = value(fingerprint.typography.bodyFontSize, 16)
  const bodyLineHeight = value(fingerprint.typography.bodyLineHeight, 1.8)
  const h1FontSize = value(fingerprint.typography.h1FontSize, 24)
  const h2FontSize = value(fingerprint.typography.h2FontSize, 21)
  const h3FontSize = value(fingerprint.typography.h3FontSize, 18)
  const paragraphMargin = value(fingerprint.spacing.paragraphMarginBlock, 12)
  const sectionMargin = value(fingerprint.spacing.sectionMarginBlock, 24)
  const headingMargin = value(fingerprint.spacing.headingMarginBlock, 24)
  const imageRadius = value(fingerprint.decoration.imageRadius, 0)
  const quoteIsCard = fingerprint.decoration.quotePattern === 'card'
  const tableIsBordered = fingerprint.decoration.tablePattern === 'bordered'
  const tableBorder = tableIsBordered ? '1px solid rgba(47, 52, 55, 0.16)' : '0'
  const accentSoftFill = softFill(accent, 0.08)

  return `
#easymd {
  color: ${text};
  background-color: ${background};
  font-size: ${bodyFontSize}px;
  line-height: ${bodyLineHeight};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#easymd p {
  margin: ${paragraphMargin}px 0;
  color: ${text};
}

#easymd p:last-child {
  margin-bottom: 0;
}

#easymd h1 {
  margin: 0 0 ${headingMargin}px;
  color: ${text};
  font-size: ${h1FontSize}px;
  line-height: 1.35;
  font-weight: 700;
}

#easymd h2 {
  margin: ${headingMargin}px 0 14px;
  color: ${text};
  font-size: ${h2FontSize}px;
  line-height: 1.45;
  font-weight: 700;
${headingDecoration(fingerprint)}
}

#easymd h3 {
  margin: 22px 0 10px;
  color: ${accent};
  font-size: ${h3FontSize}px;
  line-height: 1.45;
  font-weight: 700;
}

#easymd h4,
#easymd h5,
#easymd h6 {
  margin: 18px 0 8px;
  color: ${muted};
  font-size: 1em;
  line-height: 1.45;
  font-weight: 600;
}

#easymd > h1:first-child,
#easymd > h2:first-child,
#easymd > h3:first-child,
#easymd > h4:first-child,
#easymd > h5:first-child,
#easymd > h6:first-child {
  margin-top: 0;
}

#easymd blockquote {
  margin: ${sectionMargin}px 0;
  padding: ${quoteIsCard ? '14px 16px' : '4px 0 4px 14px'};
  color: ${muted};
  border-left: 4px solid ${quoteBorder};
  background: ${quoteIsCard ? accentSoftFill : 'transparent'};
  border-radius: ${quoteIsCard ? Math.min(imageRadius, 12) : 0}px;
}

#easymd blockquote p {
  margin: 0 0 8px;
  color: inherit;
}

#easymd blockquote p:last-child {
  margin-bottom: 0;
}

#easymd img {
  display: block;
  max-width: 100%;
  margin: ${sectionMargin}px auto;
  border-radius: ${imageRadius}px;
}

#easymd pre {
  margin: ${sectionMargin}px 0;
  padding: 14px;
  overflow-x: auto;
  background: ${codeBackground};
  border-radius: 8px;
}

#easymd code {
  padding: 1px 4px;
  background: ${codeBackground};
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}

#easymd pre code {
  padding: 0;
  background: transparent;
  border-radius: 0;
  font-size: inherit;
}

#easymd table {
  width: 100%;
  margin: ${sectionMargin}px 0;
  border-collapse: ${tableIsBordered ? 'collapse' : 'separate'};
  border-spacing: 0;
}

#easymd th,
#easymd td {
  padding: 8px 10px;
  border: ${tableBorder};
}

#easymd th {
  color: ${text};
  background: ${accentSoftFill};
  font-weight: 700;
}

#easymd tbody tr:nth-child(even) {
  background: rgba(47, 52, 55, 0.04);
}
`.trim()
}
