import type { SupportedPlatform } from '@/config'
import { toast } from 'sonner'
import { platformConfig } from '@/config'
import { trackEvent } from '@/lib/analytics'
import { copyHtml } from '@/lib/clipboard'

const developingPlatforms: SupportedPlatform[] = ['zhihu']

interface CopyPlatformOptions {
  platform: SupportedPlatform
  markdownStyle: string
  codeTheme: string
  mermaidTheme: string
  infographicTheme: string
  infographicPalette: string
  source: 'button' | 'menu'
  getHtml: () => Promise<string>
}

interface PrepareWechatHtmlOptions {
  baseUrl?: string
  imageToDataUrl?: (src: string) => Promise<string>
}

interface ImageSrcAttribute {
  src: string
  valueStart: number
  valueEnd: number
}

function getCurrentBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.href
  }

  return 'http://localhost/'
}

function isPrivateIp(hostname: string): boolean {
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) {
    return true
  }

  const match = hostname.match(/^172\.(\d{1,2})\./)
  if (!match) {
    return false
  }

  const second = Number(match[1])
  return second >= 16 && second <= 31
}

function isWhitespace(value: string): boolean {
  return value === ' ' || value === '\n' || value === '\r' || value === '\t' || value === '\f'
}

function isImageTagStart(html: string, lowerHtml: string, start: number): boolean {
  if (lowerHtml.slice(start, start + 4) !== '<img') {
    return false
  }

  const next = html[start + 4]
  return !next || next === '>' || next === '/' || isWhitespace(next)
}

function findImageTagStart(html: string, lowerHtml: string, fromIndex: number): number {
  let index = lowerHtml.indexOf('<img', fromIndex)
  while (index !== -1 && !isImageTagStart(html, lowerHtml, index)) {
    index = lowerHtml.indexOf('<img', index + 4)
  }

  return index
}

function findTagEnd(html: string, start: number): number {
  let quote: string | undefined
  for (let index = start; index < html.length; index += 1) {
    const value = html[index]
    if (quote) {
      if (value === quote) {
        quote = undefined
      }
      continue
    }

    if (value === '"' || value === '\'') {
      quote = value
      continue
    }

    if (value === '>') {
      return index + 1
    }
  }

  return -1
}

function findImageSrcAttribute(tag: string): ImageSrcAttribute | undefined {
  let index = 4
  while (index < tag.length) {
    while (index < tag.length && (isWhitespace(tag[index]) || tag[index] === '/')) {
      index += 1
    }

    if (index >= tag.length || tag[index] === '>') {
      return undefined
    }

    const nameStart = index
    while (
      index < tag.length
      && !isWhitespace(tag[index])
      && tag[index] !== '='
      && tag[index] !== '>'
      && tag[index] !== '/'
    ) {
      index += 1
    }

    const name = tag.slice(nameStart, index).toLowerCase()
    while (index < tag.length && isWhitespace(tag[index])) {
      index += 1
    }

    if (tag[index] !== '=') {
      continue
    }

    index += 1
    while (index < tag.length && isWhitespace(tag[index])) {
      index += 1
    }

    const quote = tag[index]
    if (quote !== '"' && quote !== '\'') {
      continue
    }

    const valueStart = index + 1
    const valueEnd = tag.indexOf(quote, valueStart)
    if (valueEnd === -1) {
      return undefined
    }

    index = valueEnd + 1
    if (name === 'src') {
      return {
        src: tag.slice(valueStart, valueEnd),
        valueStart,
        valueEnd,
      }
    }
  }

  return undefined
}

export function isWechatLocalImageSource(src: string, baseUrl = getCurrentBaseUrl()): boolean {
  const value = src.trim()
  if (!value || value.startsWith('data:')) {
    return false
  }

  if (value.startsWith('/uploads/')) {
    return true
  }

  if (value.startsWith('blob:')) {
    return true
  }

  try {
    const url = new URL(value, baseUrl)
    const hostname = url.hostname.toLowerCase()
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '0.0.0.0'
      || hostname === '[::1]'
      || hostname === '::1'
      || hostname.endsWith('.local')
      || isPrivateIp(hostname)
  }
  catch {
    return false
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      }
      else {
        reject(new Error('图片读取失败'))
      }
    })
    reader.addEventListener('error', () => reject(reader.error ?? new Error('图片读取失败')))
    reader.readAsDataURL(blob)
  })
}

async function defaultImageToDataUrl(src: string, baseUrl = getCurrentBaseUrl()): Promise<string> {
  const absoluteSrc = src.startsWith('blob:')
    ? src
    : new URL(src, baseUrl).toString()
  const response = await fetch(absoluteSrc)
  if (!response.ok) {
    throw new Error(`图片读取失败：${response.status}`)
  }

  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) {
    throw new Error('图片类型无效')
  }

  return blobToDataUrl(blob)
}

export async function prepareWechatHtmlForCopy(html: string, options: PrepareWechatHtmlOptions = {}): Promise<string> {
  const baseUrl = options.baseUrl ?? getCurrentBaseUrl()
  const imageToDataUrl = options.imageToDataUrl ?? (src => defaultImageToDataUrl(src, baseUrl))
  const replacements: Array<Promise<string>> = []
  const parts: string[] = []
  const lowerHtml = html.toLowerCase()

  let cursor = 0
  let searchIndex = 0
  while (searchIndex < html.length) {
    const tagStart = findImageTagStart(html, lowerHtml, searchIndex)
    if (tagStart === -1) {
      break
    }

    const tagEnd = findTagEnd(html, tagStart)
    if (tagEnd === -1) {
      break
    }

    const tag = html.slice(tagStart, tagEnd)
    const srcAttribute = findImageSrcAttribute(tag)
    if (!srcAttribute || !isWechatLocalImageSource(srcAttribute.src, baseUrl)) {
      searchIndex = tagEnd
      continue
    }

    const absoluteValueStart = tagStart + srcAttribute.valueStart
    const absoluteValueEnd = tagStart + srcAttribute.valueEnd
    const token = `__EASYMD_WECHAT_IMAGE_${replacements.length}__`
    parts.push(html.slice(cursor, absoluteValueStart), token)
    replacements.push(imageToDataUrl(srcAttribute.src))
    cursor = absoluteValueEnd
    searchIndex = tagEnd
  }

  if (replacements.length === 0) {
    return html
  }

  parts.push(html.slice(cursor))
  const marked = parts.join('')
  const values = await Promise.all(replacements)
  return values.reduce((result, value, index) => {
    return result.replace(`__EASYMD_WECHAT_IMAGE_${index}__`, value)
  }, marked)
}

export async function copyPlatform({
  platform,
  markdownStyle,
  codeTheme,
  mermaidTheme,
  infographicTheme,
  infographicPalette,
  source,
  getHtml,
}: CopyPlatformOptions) {
  if (developingPlatforms.includes(platform)) {
    toast.info('Zhihu support is still in progress.')
    return
  }

  const config = platformConfig[platform]
  try {
    let html = await getHtml()
    if (!html.trim()) {
      toast.error('Nothing to copy.')
      return
    }
    if (platform === 'wechat') {
      html = await prepareWechatHtmlForCopy(html)
    }
    const success = await copyHtml(html)
    if (success) {
      toast.success(config.successMessage)
      trackEvent('copy', platform, source, {
        markdownStyle,
        codeTheme,
        mermaidTheme,
        infographicTheme,
        infographicPalette,
      })
    }
    else {
      toast.error('Copy failed.')
    }
  }
  catch {
    toast.error('Render failed.')
  }
}
