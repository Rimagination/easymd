import { Buffer } from 'node:buffer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { publishWechatDraft } from './service'

const pngData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
const privateEnvKeys = [
  'WECHAT_APPID',
  'WECHAT_APPSECRET',
  'EASYMD_WECHAT_PUBLISH_TOKEN',
  'WECHAT_DEFAULT_COVER_MEDIA_ID',
  'WECHAT_IMAGE_HOSTS',
] as const
const originalEnv = Object.fromEntries(privateEnvKeys.map(key => [key, process.env[key]]))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  for (const key of privateEnvKeys) {
    const value = originalEnv[key]
    if (value === undefined) {
      delete process.env[key]
    }
    else {
      process.env[key] = value
    }
  }
})

describe('wechat draft publisher', () => {
  it('stages article images and cover before creating a draft', async () => {
    process.env.WECHAT_APPID = 'test-appid'
    process.env.WECHAT_APPSECRET = 'test-secret'
    process.env.EASYMD_WECHAT_PUBLISH_TOKEN = 'a'.repeat(32)

    const calls: Array<{ url: string, init?: RequestInit }> = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ init, url })

      if (url.includes('/cgi-bin/token')) {
        return Response.json({ access_token: 'access-token', expires_in: 7200 })
      }
      if (url.includes('/cgi-bin/media/uploadimg')) {
        return Response.json({ url: 'https://mmbiz.qpic.cn/article-image' })
      }
      if (url.includes('/cgi-bin/material/add_material')) {
        return Response.json({ media_id: 'cover-media-id' })
      }
      if (url.includes('/cgi-bin/draft/add')) {
        return Response.json({ media_id: 'draft-media-id' })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const image = `data:image/png;base64,${pngData}`
    const result = await publishWechatDraft({
      allowedImageHosts: ['example.com'],
      author: '作者',
      cover: new Blob([Buffer.from(pngData, 'base64')], { type: 'image/png' }),
      coverFilename: 'cover.png',
      digest: '摘要',
      html: `<section id="easymd"><h1>标题</h1><p>正文<img src="${image}"><img src="${image}"></p><script>alert(1)</script></section>`,
      needOpenComment: true,
      onlyFansCanComment: true,
      showCoverPic: true,
      sourceUrl: 'https://example.com/source',
      title: '标题',
    })

    expect(result).toMatchObject({
      coverMediaId: 'cover-media-id',
      draftMediaId: 'draft-media-id',
      imageCount: 1,
    })
    expect(calls.map(call => new URL(call.url).pathname)).toEqual([
      '/cgi-bin/token',
      '/cgi-bin/media/uploadimg',
      '/cgi-bin/material/add_material',
      '/cgi-bin/draft/add',
    ])

    const draftCall = calls[3]
    const draftRequest = new Request(draftCall.url, draftCall.init)
    const draftPayload = await draftRequest.json() as {
      articles: Array<Record<string, string | number>>
    }
    const article = draftPayload.articles[0]
    expect(article).toMatchObject({
      author: '作者',
      content_source_url: 'https://example.com/source',
      digest: '摘要',
      need_open_comment: 1,
      only_fans_can_comment: 1,
      show_cover_pic: 1,
      thumb_media_id: 'cover-media-id',
      title: '标题',
    })
    const content = String(article.content)
    expect(content).toContain('https://mmbiz.qpic.cn/article-image')
    expect(content).not.toContain('data:image')
    expect(content).not.toContain('<script')
  })

  it('rejects loopback article images even when explicitly listed', async () => {
    process.env.WECHAT_APPID = 'test-appid'
    process.env.WECHAT_APPSECRET = 'test-secret'
    process.env.EASYMD_WECHAT_PUBLISH_TOKEN = 'a'.repeat(32)
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ access_token: 'access-token', expires_in: 7200 })))

    await expect(publishWechatDraft({
      allowedImageHosts: ['127.0.0.1'],
      coverMediaId: 'cover-media-id',
      html: '<section id="easymd"><p><img src="https://127.0.0.1/private.png"></p></section>',
      title: '标题',
    })).rejects.toThrow('正文图片地址指向受限网络')
  })

  it('publishes with a per-account token without global account credentials', async () => {
    delete process.env.WECHAT_APPID
    delete process.env.WECHAT_APPSECRET
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('/cgi-bin/draft/add')) {
        return Response.json({ media_id: 'draft-media-id' })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await publishWechatDraft({
      coverMediaId: 'cover-media-id',
      html: '<section id="easymd"><p>正文</p></section>',
      title: '标题',
    }, 'authorizer-access-token')

    expect(result.draftMediaId).toBe('draft-media-id')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('access_token=authorizer-access-token')
  })
})
