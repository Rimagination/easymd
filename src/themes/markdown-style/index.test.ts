import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { markdownStyles } from './index'

describe('markdown styles', () => {
  it('registers mdnice-classic in the style list', () => {
    expect(markdownStyles.some(style => style.id === 'mdnice-classic')).toBe(true)
  })

  it('registers coral-notes in the style list', () => {
    expect(markdownStyles.some(style => style.id === 'coral-notes')).toBe(true)
  })

  it('registers qingying in the style list', () => {
    expect(markdownStyles).toContainEqual({ id: 'qingying', name: '清影' })
  })

  it('shows thu-classic as the first style with the expected visible label', () => {
    expect(markdownStyles[0]).toEqual({ id: 'thu-classic', name: 'THU-classic' })
  })

  it('registers qing as the article-inspired style', () => {
    expect(markdownStyles).toContainEqual({ id: 'qing', name: 'qing' })
  })

  it('maps mdnice-classic to a css file with the expected selectors', () => {
    const loaderSource = readFileSync(new URL('./loader.ts', import.meta.url), 'utf8')
    const css = readFileSync(new URL('./mdnice-classic.css', import.meta.url), 'utf8')

    expect(loaderSource).toContain(`'mdnice-classic': () => import('./mdnice-classic.css?raw')`)
    expect(css).toContain('#easymd h1')
    expect(css).toContain('#easymd blockquote')
  })

  it('maps coral-notes to a css file with the imported style selectors', () => {
    const loaderSource = readFileSync(new URL('./loader.ts', import.meta.url), 'utf8')
    const css = readFileSync(new URL('./coral-notes.css', import.meta.url), 'utf8')

    expect(loaderSource).toContain(`'coral-notes': () => import('./coral-notes.css?raw')`)
    expect(css).toContain('#easymd h2 > span:first-child')
    expect(css).toContain('#easymd blockquote')
  })

  it('maps qingying to mdnice classic plus rounded image overrides', () => {
    const loaderSource = readFileSync(new URL('./loader.ts', import.meta.url), 'utf8')
    const css = readFileSync(new URL('./qingying.css', import.meta.url), 'utf8')

    expect(loaderSource).toContain(`'qingying': async () =>`)
    expect(loaderSource).toContain(`import('./qingying.css?raw')`)
    expect(css).toContain('#easymd h1')
    expect(css).toContain('padding-top: 16px')
    expect(css).toContain('padding-bottom: 16px')
    expect(css).toContain('border-radius: 18px')
    expect(css).toContain('box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18)')
    expect(css).toContain('#easymd table')
    expect(css).toContain('border-collapse: separate')
    expect(css).toContain('border-radius: 14px')
    expect(css).toContain('#easymd .figure-table')
    expect(css).toContain('border-top-left-radius: 13px')
  })

  it('maps qing to the article-inspired white and teal overrides', () => {
    const loaderSource = readFileSync(new URL('./loader.ts', import.meta.url), 'utf8')
    const css = readFileSync(new URL('./qing.css', import.meta.url), 'utf8')

    expect(loaderSource).toContain(`'qing': async () =>`)
    expect(loaderSource).toContain(`import('./qing.css?raw')`)
    expect(css).toContain('#easymd h2')
    expect(css).toContain('border-left: 4px solid #0f766e')
    expect(css).toContain('background: #ffffff')
    expect(css).toContain('border-radius: 6px')
    expect(css).not.toContain('#5c307d')
  })

  it('keeps thu-classic mapped to the original purple style', () => {
    const css = readFileSync(new URL('./thu-classic.css', import.meta.url), 'utf8')

    expect(css).toContain('#5c307d')
    expect(css).toContain('background: #faf7fc')
    expect(css).toContain('border-left: 6px solid #5c307d')
    expect(css).toContain('display: flex')
    expect(css).toContain('align-items: center')
    expect(css).toContain('#easymd h3::before')
    expect(css).not.toContain('h3:not([data-easymd-wechat-heading])::before')
  })
})
