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
})
