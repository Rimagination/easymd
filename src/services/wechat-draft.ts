import { apiFetch } from '@/lib/api'

export interface WechatDraftSession {
  account: WechatAccount | null
  configured: boolean
  connected: boolean
  setup?: {
    configured: boolean
    storageConfigured: boolean
  }
}

export interface WechatAccount {
  appid: string
  headImg: string
  nickname: string
  principalName: string
  username: string
}

export interface WechatDraftPublishResult {
  contentBytes: number
  contentChars: number
  coverMediaId: string
  draftMediaId: string
  imageCount: number
}

function normalizeWechatDraftError(error: unknown): string {
  if (error && typeof error === 'object') {
    const data = 'data' in error ? error.data : undefined
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error
    }

    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
  }
  return '同步草稿箱失败。'
}

export async function getWechatDraftSession(): Promise<WechatDraftSession> {
  try {
    return await apiFetch<WechatDraftSession>('/api/wechat/account')
  }
  catch (error) {
    throw new Error(normalizeWechatDraftError(error))
  }
}

export async function disconnectWechatAccount(): Promise<WechatDraftSession> {
  try {
    return await apiFetch<WechatDraftSession>('/api/wechat/account', { method: 'DELETE' })
  }
  catch (error) {
    throw new Error(normalizeWechatDraftError(error))
  }
}

export interface PublishWechatDraftOptions {
  author: string
  cover?: File
  coverMediaId?: string
  digest: string
  html: string
  needOpenComment: boolean
  onlyFansCanComment: boolean
  showCoverPic: boolean
  sourceUrl: string
  title: string
}

export async function publishWechatDraft(options: PublishWechatDraftOptions): Promise<WechatDraftPublishResult> {
  const formData = new FormData()
  formData.append('author', options.author)
  formData.append('coverMediaId', options.coverMediaId ?? '')
  formData.append('digest', options.digest)
  formData.append('html', options.html)
  formData.append('needOpenComment', options.needOpenComment ? '1' : '0')
  formData.append('onlyFansCanComment', options.onlyFansCanComment ? '1' : '0')
  formData.append('showCoverPic', options.showCoverPic ? '1' : '0')
  formData.append('sourceUrl', options.sourceUrl)
  formData.append('title', options.title)
  if (options.cover) {
    formData.append('cover', options.cover, options.cover.name)
  }

  try {
    return await apiFetch<WechatDraftPublishResult>('/api/wechat/draft', {
      method: 'POST',
      body: formData,
    })
  }
  catch (error) {
    throw new Error(normalizeWechatDraftError(error))
  }
}
