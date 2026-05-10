import type { WechatStyleFingerprint } from './types'
import { describe, expect, it } from 'vitest'
import { generateWechatThemeCss } from './theme-css'

const fingerprint: WechatStyleFingerprint = {
  colors: {
    text: '#333333',
    muted: '#6b7280',
    accent: '#2f80ed',
    background: '#ffffff',
    quoteBorder: '#2f80ed',
    codeBackground: '#f6f8fa',
    panelBackground: '#f7f7f7',
    panelBorder: '#dfdedd',
    highlightBackground: '#e9deec',
  },
  typography: {
    bodyFontSize: 16,
    bodyLineHeight: 1.9,
    h1FontSize: 26,
    h2FontSize: 22,
    h3FontSize: 18,
    fontFamilyKind: 'system',
  },
  spacing: {
    paragraphMarginBlock: 14,
    sectionMarginBlock: 24,
    headingMarginBlock: 28,
  },
  decoration: {
    headingPattern: 'bar',
    quotePattern: 'card',
    panelPattern: 'bordered-card',
    imageRadius: 16,
    tablePattern: 'bordered',
  },
}

describe('generateWechatThemeCss', () => {
  it('generates scoped CSS without WeChat class names', () => {
    const css = generateWechatThemeCss(fingerprint)

    expect(css).toContain('#easymd {')
    expect(css).toContain('font-size: 16px;')
    expect(css).toContain('line-height: 1.9;')
    expect(css).toContain('#easymd h2')
    expect(css).toContain('border-left: 4px solid #2f80ed;')
    expect(css).toContain('#easymd blockquote')
    expect(css).toContain('background: #f7f7f7;')
    expect(css).toContain('border: 1px solid #dfdedd;')
    expect(css).toContain('#easymd strong,')
    expect(css).toContain('background: #e9deec;')
    expect(css).toContain('border-radius: 16px;')
    expect(css).toContain('#easymd pre')
    expect(css).toContain('#easymd table')
    expect(css).toContain('#easymd th,')
    expect(css).not.toContain('js_content')
    expect(css).not.toContain('rich_media')
  })

  it('uses underline headings when requested', () => {
    const css = generateWechatThemeCss({
      ...fingerprint,
      decoration: { ...fingerprint.decoration, headingPattern: 'underline' },
    })

    expect(css).toContain('border-bottom: 2px solid #2f80ed;')
  })

  it('derives soft fills from the accent color', () => {
    const css = generateWechatThemeCss({
      ...fingerprint,
      colors: { ...fingerprint.colors, accent: '#d9480f' },
    })

    expect(css).toContain('background: rgba(217, 72, 15, 0.08);')
  })

  it('uses safe fallbacks for sparse fingerprints', () => {
    const css = generateWechatThemeCss({
      colors: {},
      typography: {},
      spacing: {},
      decoration: {},
    })

    expect(css).toContain('color: #2f3437;')
    expect(css).toContain('font-size: 16px;')
    expect(css).toContain('line-height: 1.8;')
    expect(css).toContain('background: #f6f8fa;')
  })
})
