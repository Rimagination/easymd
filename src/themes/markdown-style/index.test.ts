import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { markdownStyles } from './index'

describe('markdown styles', () => {
  it('registers mdnice-classic in the style list', () => {
    expect(markdownStyles.some(style => style.id === 'mdnice-classic')).toBe(true)
  })

  it('maps mdnice-classic to a css file with the expected selectors', () => {
    const loaderSource = readFileSync(new URL('./loader.ts', import.meta.url), 'utf8')
    const css = readFileSync(new URL('./mdnice-classic.css', import.meta.url), 'utf8')

    expect(loaderSource).toContain(`'mdnice-classic': () => import('./mdnice-classic.css?raw')`)
    expect(css).toContain('#easymd h1')
    expect(css).toContain('#easymd blockquote')
  })
})
