import { describe, expect, it } from 'vitest'
import { extractWechatDraftMetadata } from './metadata'

describe('wechat draft metadata', () => {
  it('uses frontmatter values and falls back to the first heading', () => {
    expect(extractWechatDraftMetadata(`---
title: "Frontmatter title"
author: "作者"
summary: "摘要"
source: https://example.com/article
---

# Heading title
`)).toEqual({
      author: '作者',
      digest: '摘要',
      sourceUrl: 'https://example.com/article',
      title: 'Frontmatter title',
    })

    expect(extractWechatDraftMetadata('# **可用标题**')).toMatchObject({
      title: '可用标题',
    })
  })
})
