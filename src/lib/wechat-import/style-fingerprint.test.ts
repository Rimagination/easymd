import { describe, expect, it } from 'vitest'
import { extractWechatStyleFingerprint } from './style-fingerprint'

describe('extractWechatStyleFingerprint', () => {
  it('extracts bounded style signals from inline styles', () => {
    const fingerprint = extractWechatStyleFingerprint(`
      <p style="font-size:16px;line-height:1.9;color:#333333;margin: 12px 0;">正文</p>
      <h2 style="font-size:22px;border-left:4px solid #2f80ed;padding-left:12px;">标题</h2>
      <blockquote style="background:#f4f8ff;border-left:4px solid #2f80ed;">引用</blockquote>
      <img style="border-radius:18px" src="x.png">
      <table style="border-collapse: collapse"><tr><td>1</td></tr></table>
    `)

    expect(fingerprint.colors.text).toBe('#333333')
    expect(fingerprint.colors.accent).toBe('#2f80ed')
    expect(fingerprint.colors.quoteBorder).toBe('#2f80ed')
    expect(fingerprint.typography.bodyFontSize).toBe(16)
    expect(fingerprint.typography.bodyLineHeight).toBe(1.9)
    expect(fingerprint.typography.h2FontSize).toBe(22)
    expect(fingerprint.spacing.paragraphMarginBlock).toBe(12)
    expect(fingerprint.decoration.headingPattern).toBe('bar')
    expect(fingerprint.decoration.quotePattern).toBe('card')
    expect(fingerprint.decoration.imageRadius).toBe(18)
    expect(fingerprint.decoration.tablePattern).toBe('bordered')
  })

  it('falls back to safe defaults when no style exists', () => {
    const fingerprint = extractWechatStyleFingerprint('<p>正文</p><h2>标题</h2>')

    expect(fingerprint.colors.text).toBe('#2f3437')
    expect(fingerprint.colors.accent).toBe('#2f80ed')
    expect(fingerprint.typography.bodyFontSize).toBe(16)
    expect(fingerprint.typography.bodyLineHeight).toBe(1.8)
    expect(fingerprint.decoration.headingPattern).toBe('plain')
  })
})
