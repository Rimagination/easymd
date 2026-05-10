import { describe, expect, it } from 'vitest'
import { parseWechatArticleUrl } from './url'

describe('parseWechatArticleUrl', () => {
  it('accepts mp.weixin.qq.com article URLs', () => {
    expect(parseWechatArticleUrl('https://mp.weixin.qq.com/s/abc123')).toEqual({
      ok: true,
      url: 'https://mp.weixin.qq.com/s/abc123',
    })
  })

  it('normalizes http and strips hash fragments', () => {
    expect(parseWechatArticleUrl('http://mp.weixin.qq.com/s/abc123#wechat_redirect')).toEqual({
      ok: true,
      url: 'https://mp.weixin.qq.com/s/abc123',
    })
  })

  it('trims surrounding whitespace', () => {
    expect(parseWechatArticleUrl('  https://mp.weixin.qq.com/s/abc123  ')).toEqual({
      ok: true,
      url: 'https://mp.weixin.qq.com/s/abc123',
    })
  })

  it('accepts long-form WeChat article URLs', () => {
    expect(parseWechatArticleUrl('https://mp.weixin.qq.com/s?__biz=MzA&mid=1&idx=1&sn=abc')).toEqual({
      ok: true,
      url: 'https://mp.weixin.qq.com/s?__biz=MzA&mid=1&idx=1&sn=abc',
    })
  })

  it('rejects non-WeChat hosts', () => {
    expect(parseWechatArticleUrl('https://example.com/s/abc')).toEqual({
      ok: false,
      error: '仅支持单篇微信公众号文章链接。',
    })
  })

  it('rejects non-article paths', () => {
    expect(parseWechatArticleUrl('https://mp.weixin.qq.com/cgi-bin/appmsg')).toEqual({
      ok: false,
      error: '仅支持单篇微信公众号文章链接。',
    })
  })

  it('rejects invalid URLs', () => {
    expect(parseWechatArticleUrl('not a url')).toEqual({
      ok: false,
      error: '请输入有效的文章链接。',
    })
  })

  it('rejects non-http protocols', () => {
    expect(parseWechatArticleUrl('ftp://mp.weixin.qq.com/s/abc123')).toEqual({
      ok: false,
      error: '请输入有效的文章链接。',
    })
  })
})
