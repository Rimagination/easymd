import { describe, expect, it } from 'vitest'
import { expandArticleBlockReferences } from './render/article-blocks'
import {
  applyPreviewTextStyle,
  replacePreviewColor,
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

  it('keeps repeated single-property text style edits compact', () => {
    const firstResult = applyPreviewTextStyle('# Title', 'Title', {
      fontSize: '20px',
    })

    expect(firstResult.changed).toBe(true)
    expect(firstResult.markdown).toBe('# <span style="font-size: 20px;">Title</span>')

    const secondResult = applyPreviewTextStyle(firstResult.markdown, 'Title', {
      fontSize: '24px',
    })

    expect(secondResult.changed).toBe(true)
    expect(secondResult.markdown).toContain('font-size: 24px')
    expect(secondResult.markdown).not.toContain('background-color')
    expect(secondResult.markdown).not.toContain('line-height')
    expect(secondResult.markdown.match(/<span/g)).toHaveLength(1)
  })

  it('writes font family styles without escaped quote noise', () => {
    const result = applyPreviewTextStyle('- CodeMirror 6', 'CodeMirror 6', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    })

    expect(result.changed).toBe(true)
    expect(result.markdown).toBe(
      `- <span style="font-family: PingFang SC, Microsoft YaHei, sans-serif;">CodeMirror 6</span>`,
    )
    expect(result.markdown).not.toContain('&quot;')
  })

  it('repairs malformed font family attributes from earlier edits', () => {
    const result = applyPreviewTextStyle(
      `- <span style="font-family: &quot;PingFang SC&quot;, &quot;Microsoft YaHei&quot;, sans-serif"Microsoft YaHei", "PingFang SC", sans-serif;">CodeMirror 6</span>`,
      'CodeMirror 6',
      {
        fontFamily: 'Microsoft YaHei, PingFang SC, sans-serif',
      },
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('font-family: Microsoft YaHei, PingFang SC, sans-serif')
    expect(result.markdown.match(/font-family/g)).toHaveLength(1)
    expect(result.markdown).not.toContain('&quot;')
    expect(result.markdown).not.toContain('sans-serif"Microsoft')
  })

  it('updates an existing inline span instead of nesting another span', () => {
    const result = applyPreviewTextStyle(
      '<p><span style="font-size: 16px; color: #111827;">Hello</span></p>',
      'Hello',
      {
        backgroundColor: '#fff0ec',
        color: '#ef4444',
        fontSize: '22px',
        fontWeight: '700',
        letterSpacing: '0.08em',
        lineHeight: '1.8',
        textAlign: 'center',
        textDecoration: 'underline line-through',
        verticalAlign: 'super',
      },
    )

    expect(result.changed).toBe(true)
    expect(result.markdown.match(/<span/g)).toHaveLength(1)
    expect(result.markdown).toContain('font-size: 22px')
    expect(result.markdown).toContain('color: #ef4444')
    expect(result.markdown).toContain('background-color: #fff0ec')
    expect(result.markdown).toContain('font-weight: 700')
    expect(result.markdown).toContain('text-decoration: underline line-through')
    expect(result.markdown).toContain('line-height: 1.8')
    expect(result.markdown).toContain('letter-spacing: 0.08em')
    expect(result.markdown).toContain('text-align: center')
    expect(result.markdown).toContain('vertical-align: super')
  })

  it('updates svg text attributes instead of nesting html spans', () => {
    const result = applyPreviewTextStyle(
      '<svg><text x="10" y="20" fill="#111827" font-size="21">先收藏，慢慢</text></svg>',
      '先收藏，慢慢',
      {
        color: '#d96363',
        fontSize: '14px',
        fontWeight: '900',
      },
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('fill="#d96363"')
    expect(result.markdown).toContain('font-size="14"')
    expect(result.markdown).toContain('font-weight="900"')
    expect(result.markdown).not.toContain('<span')
  })

  it('replaces selected svg shape colors', () => {
    const result = replacePreviewColor(
      '<svg><path d="M1 1L4 4" fill="#111827" /></svg>',
      {
        attributeName: 'fill',
        currentColor: '#111827',
        signature: { d: 'M1 1L4 4' },
        tagName: 'path',
      },
      '#22c55e',
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('fill="#22c55e"')
  })

  it('changes themed markdown heading block colors instead of adding text highlight spans', () => {
    const result = replacePreviewColor(
      '## 核心能力\n\n正文',
      {
        attributeName: 'background-color',
        currentColor: 'rgb(242, 151, 24)',
        tagName: 'h2',
        text: '核心能力',
      },
      '#22c55e',
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toBe('<h2 style="background-color: #22c55e">核心能力</h2>\n\n正文')
    expect(result.markdown).not.toContain('<span')
  })

  it('updates existing html heading block colors', () => {
    const result = replacePreviewColor(
      '<h2 style="background-color: #f29718; color: #fcfcfc;">核心能力</h2>',
      {
        attributeName: 'background-color',
        currentColor: '#f29718',
        tagName: 'h2',
        text: '核心能力',
      },
      '#22c55e',
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('background-color: #22c55e')
    expect(result.markdown).toContain('color: #fcfcfc')
    expect(result.markdown).not.toContain('<span')
  })

  it('applies text alignment as a block style for markdown headings', () => {
    const result = applyPreviewTextStyle('## Platform API', 'Platform API', {
      textAlign: 'center',
    })

    expect(result.changed).toBe(true)
    expect(result.markdown).toBe('<h2 style="display: block; text-align: center">Platform API</h2>')
  })

  it('applies and updates text alignment on markdown list item bodies', () => {
    const first = applyPreviewTextStyle(
      '1. Write Markdown\n2. Choose a style',
      'Choose a style',
      { textAlign: 'center' },
    )
    const second = applyPreviewTextStyle(first.markdown, 'Choose a style', {
      textAlign: 'right',
    })

    expect(first.changed).toBe(true)
    expect(first.markdown).toBe(
      '1. Write Markdown\n2. <span style="display: block; text-align: center;">Choose a style</span>',
    )
    expect(second.changed).toBe(true)
    expect(second.markdown).toBe(
      '1. Write Markdown\n2. <span style="display: block; text-align: right">Choose a style</span>',
    )
    expect(second.markdown.match(/<span/g)).toHaveLength(1)
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

  it('keeps article block edits in a compact shortcode when replacing text', () => {
    const result = replacePreviewText(titleBlockReference, '把标题写在这里', '新的组件标题')

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('{{easymd:block id="title-center-line" source="')
    expect(expandArticleBlockReferences(result.markdown)).toContain('新的组件标题')
  })

  it('keeps article block edits in a compact shortcode when applying text styles', () => {
    const result = applyPreviewTextStyle(cardBlockReference, '重点提示', {
      color: '#ef4444',
      fontSize: '22px',
    })

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('{{easymd:block id="card-highlight-note" source="')
    expect(expandArticleBlockReferences(result.markdown)).toContain('<span style="font-size: 22px; color: #ef4444;">重点提示</span>')
  })

  it('keeps article block edits in a compact shortcode when replacing preview images', () => {
    const result = replacePreviewImageSource(
      imageBlockReference,
      'https://placehold.co/900x520/png?text=easymd',
      'https://example.com/replaced.png',
    )

    expect(result.changed).toBe(true)
    expect(result.markdown).toContain('{{easymd:block id="image-rounded-caption" source="')
    expect(expandArticleBlockReferences(result.markdown)).toContain('https://example.com/replaced.png')
  })
})
