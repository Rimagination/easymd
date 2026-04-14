import { describe, expect, it } from 'vitest'
import {
  createImportedMarkdownStyle,
  MARKDOWN_STYLE_SCOPE_SELECTOR,
  normalizeImportedMarkdownStyleCss,
  resolveMarkdownRenderStyle,
} from './custom'

describe('custom markdown styles', () => {
  it('scopes common root selectors to the preview container', () => {
    const { css } = normalizeImportedMarkdownStyleCss(`
      body { color: red; }
      .markdown-body h1, h2 { color: blue; }
    `)

    expect(css).toContain(`${MARKDOWN_STYLE_SCOPE_SELECTOR}{ color: red; }`)
    expect(css).toContain(`${MARKDOWN_STYLE_SCOPE_SELECTOR} h1, ${MARKDOWN_STYLE_SCOPE_SELECTOR} h2{ color: blue; }`)
  })

  it('keeps nested at-rules while scoping their selectors', () => {
    const { css } = normalizeImportedMarkdownStyleCss(`
      @media screen {
        body > h1 { color: red; }
      }
    `)

    expect(css).toContain(`@media screen{`)
    expect(css).toContain(`${MARKDOWN_STYLE_SCOPE_SELECTOR} > h1{ color: red; }`)
  })

  it('prepends the scoped reset css when importing a style file', () => {
    const { style } = createImportedMarkdownStyle('my-theme.css', 'body { color: red; }')

    expect(style.id).toBe('custom:my-theme')
    expect(style.name).toBe('My Theme')
    expect(style.css).toContain(`${MARKDOWN_STYLE_SCOPE_SELECTOR} *`)
    expect(style.css).toContain(`${MARKDOWN_STYLE_SCOPE_SELECTOR}{ color: red; }`)
  })

  it('routes imported styles through customCss for rendering', () => {
    const importedStyle = createImportedMarkdownStyle('my-theme.css', 'body { color: red; }').style
    const resolved = resolveMarkdownRenderStyle(importedStyle.id, [importedStyle], '#easymd p { line-height: 1.8; }')

    expect(resolved.markdownStyle).toBeUndefined()
    expect(resolved.customCss).toContain(`${MARKDOWN_STYLE_SCOPE_SELECTOR}{ color: red; }`)
    expect(resolved.customCss).toContain('#easymd p { line-height: 1.8; }')
  })
})
