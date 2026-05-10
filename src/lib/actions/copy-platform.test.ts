import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { isWechatLocalImageSource, prepareWechatHtmlForCopy } from './copy-platform'

describe('wechat platform copy image preparation', () => {
  it('detects local image sources that WeChat cannot fetch', () => {
    expect(isWechatLocalImageSource('/uploads/2026-05-08/a.png', 'http://localhost:55316/')).toBe(true)
    expect(isWechatLocalImageSource('http://localhost:55316/uploads/a.png')).toBe(true)
    expect(isWechatLocalImageSource('http://127.0.0.1:55316/uploads/a.png')).toBe(true)
    expect(isWechatLocalImageSource('https://cdn.example.com/a.png')).toBe(false)
    expect(isWechatLocalImageSource('data:image/png;base64,abc')).toBe(false)
  })

  it('inlines local images before copying to WeChat', async () => {
    const html = '<section><p>demo</p><img alt="local" src="/uploads/2026-05-08/a.png"><img alt="remote" src="https://cdn.example.com/b.png"></section>'

    const prepared = await prepareWechatHtmlForCopy(html, {
      baseUrl: 'http://localhost:55316/',
      imageToDataUrl: async src => `data:image/png;base64,${Buffer.from(src).toString('base64')}`,
    })

    expect(prepared).toContain('src="data:image/png;base64,')
    expect(prepared).not.toContain('src="/uploads/2026-05-08/a.png"')
    expect(prepared).toContain('src="https://cdn.example.com/b.png"')
  })

  it('inlines local images when src is the first image attribute', async () => {
    const html = '<p><img src="/uploads/2026-05-08/a.png" alt="local"></p>'

    const prepared = await prepareWechatHtmlForCopy(html, {
      baseUrl: 'http://localhost:55316/',
      imageToDataUrl: async src => `data:image/png;base64,${Buffer.from(src).toString('base64')}`,
    })

    expect(prepared).toContain('<img src="data:image/png;base64,')
    expect(prepared).toContain('alt="local"')
    expect(prepared).not.toContain('/uploads/2026-05-08/a.png')
  })

  it('keeps html unchanged when there are no local images', async () => {
    const html = '<section><img src="https://cdn.example.com/b.png"></section>'

    await expect(prepareWechatHtmlForCopy(html, {
      baseUrl: 'http://localhost:55316/',
      imageToDataUrl: async () => {
        throw new Error('should not inline remote images')
      },
    })).resolves.toBe(html)
  })
})
