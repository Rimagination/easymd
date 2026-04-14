import { describe, expect, it } from 'vitest'
import {
  extractStyleColors,
  replaceStyleColor,
  replaceStylePalette,
} from './palette'

describe('markdown style palette tools', () => {
  it('extracts declaration colors and ignores comments, strings, and selectors', () => {
    const colors = extractStyleColors(`
      /* color: #ff0000; */
      #face { color: #123456; }
      #easymd p::before { content: "#abcdef"; }
      #easymd h1 { color: rgb(242 151 24 / 80%); }
      #easymd h2 { border-color: hsl(210 80% 50%); }
    `, 10)

    expect(colors.map(color => color.hex)).toEqual(
      expect.arrayContaining(['#123456', '#f29718', '#197fe6']),
    )
    expect(colors.map(color => color.hex)).not.toContain('#ff0000')
    expect(colors.map(color => color.hex)).not.toContain('#abcdef')
  })

  it('replaces the selected color while preserving alpha values', () => {
    const css = replaceStyleColor(
      '#easymd p { color: #123456; box-shadow: 0 0 8px rgba(18, 52, 86, 0.2); }',
      '#123456',
      '#e88522',
    )

    expect(css).toContain('color: #e88522')
    expect(css).toContain('rgba(232, 133, 34, 0.2)')
  })

  it('remaps an entire style palette by lightness', () => {
    const css = replaceStylePalette(
      `
      #easymd { color: #101010; background: #ffffff; }
      #easymd a { color: #f29718; border-color: #cccccc; }
      `,
      ['#000000', '#1d4ed8', '#dbeafe', '#ffffff'],
    )

    expect(css).toContain('#000000')
    expect(css).toContain('#ffffff')
    expect(css).not.toContain('#f29718')
  })
})
