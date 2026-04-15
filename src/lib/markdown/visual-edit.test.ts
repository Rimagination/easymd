import { describe, expect, it } from 'vitest'
import {
  applyPreviewTextStyle,
  replacePreviewImageSource,
  replacePreviewText,
} from './visual-edit'

describe('preview visual edit helpers', () => {
  it('replaces selected preview text in markdown', () => {
    const result = replacePreviewText('这是旧标题\n\n正文', '旧标题', '新标题')

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('这是新标题')
  })

  it('maps collapsed preview whitespace back to markdown source', () => {
    const result = replacePreviewText('第一行\n第二行\n\n正文', '第一行 第二行', '合并内容')

    expect(result.changed).toBe(true)
    expect(result.markdown).toBe('合并内容\n\n正文')
  })

  it('wraps selected preview text with inline style', () => {
    const result = applyPreviewTextStyle('# 标题', '标题', {
      color: '#ef4444',
      fontSize: '22px',
    })

    expect(result.changed).toBe(true)
    expect(result.markdown).toBe('# <span style="font-size: 22px; color: #ef4444;">标题</span>')
  })

  it('replaces image source without touching alt text', () => {
    const result = replacePreviewImageSource(
      '![说明](https://example.com/old.png)',
      'https://example.com/old.png',
      'https://example.com/new.png',
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toBe('![说明](https://example.com/new.png)')
  })

  it('prefers image sources when the same url appears earlier as text', () => {
    const result = replacePreviewImageSource(
      '备用地址：https://example.com/old.png\n\n![说明](https://example.com/old.png)',
      'https://example.com/old.png',
      'https://example.com/new.png',
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toBe('备用地址：https://example.com/old.png\n\n![说明](https://example.com/new.png)')
  })

  it('replaces html image src values', () => {
    const result = replacePreviewImageSource(
      '<img alt="说明" src="https://example.com/old.png" />',
      'https://example.com/old.png',
      'https://example.com/new.png',
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toBe('<img alt="说明" src="https://example.com/new.png" />')
  })
})
