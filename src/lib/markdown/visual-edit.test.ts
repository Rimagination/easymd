import { describe, expect, it } from 'vitest'
import {
  applyPreviewTextStyle,
  replacePreviewImageSource,
  replacePreviewText,
} from './visual-edit'

const titleBlockReference = '@组件[居中短线标题](easymd:block/title-center-line)'
const cardBlockReference = '@组件[暖色重点卡片](easymd:block/card-highlight-note)'
const imageBlockReference = '@组件[圆角大图](easymd:block/image-rounded-caption)'

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

  it('materializes article block references before replacing their preview text', () => {
    const result = replacePreviewText(titleBlockReference, '把标题写在这里', '新的组件标题')

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('新的组件标题')
    expect(result.markdown).not.toContain('easymd:block/title-center-line')
  })

  it('materializes article block references before applying preview text styles', () => {
    const result = applyPreviewTextStyle(cardBlockReference, '重点提示', {
      color: '#ef4444',
      fontSize: '22px',
    })

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('<span style="font-size: 22px; color: #ef4444;">重点提示</span>')
    expect(result.markdown).not.toContain('easymd:block/card-highlight-note')
  })

  it('materializes article block references before replacing preview images', () => {
    const result = replacePreviewImageSource(
      imageBlockReference,
      'https://placehold.co/900x520/png?text=easymd',
      'https://example.com/replaced.png',
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('https://example.com/replaced.png')
    expect(result.markdown).not.toContain('easymd:block/image-rounded-caption')
  })
})
