import type { Element, Root } from 'hast'
import { Buffer } from 'node:buffer'
import rehypeParse from 'rehype-parse'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { env } from '@/env'
import { sanitizeSchema } from '@/lib/markdown/render/sanitize-schema'

const WECHAT_API_BASE = 'https://api.weixin.qq.com'
const MAX_HTML_INPUT_CHARS = 4_000_000
const MAX_CONTENT_CHARS = 20_000
const MAX_CONTENT_BYTES = 1024 * 1024
const MAX_CONTENT_IMAGES = 20
const MAX_ARTICLE_IMAGE_BYTES = 1024 * 1024
const MAX_COVER_BYTES = 10 * 1024 * 1024
const MAX_REQUEST_BYTES = 16 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 30_000

const styledTags = [
  'a',
  'blockquote',
  'code',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'p',
  'pre',
  'section',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]

const wechatDraftSanitizeSchema = {
  ...sanitizeSchema,
  protocols: {
    ...sanitizeSchema.protocols,
    src: ['http', 'https', 'data'],
  },
  attributes: {
    ...sanitizeSchema.attributes,
    ...Object.fromEntries(
      styledTags.map(tag => [
        tag,
        [...((sanitizeSchema.attributes?.[tag] as string[] | undefined) ?? []), 'style'],
      ]),
    ),
  },
}

export interface WechatDraftPublishInput {
  html: string
  title: string
  author?: string
  digest?: string
  sourceUrl?: string
  showCoverPic?: boolean
  needOpenComment?: boolean
  onlyFansCanComment?: boolean
  cover?: Blob
  coverFilename?: string
  coverMediaId?: string
  allowedImageHosts?: string[]
}

export interface WechatDraftPublishResult {
  draftMediaId: string
  coverMediaId: string
  contentChars: number
  contentBytes: number
  imageCount: number
}

export class WechatDraftError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code?: number,
  ) {
    super(message)
    this.name = 'WechatDraftError'
  }
}

interface WechatApiErrorPayload {
  errcode?: number
  errmsg?: string
}

interface WechatImagePayload {
  blob: Blob
  contentType: 'image/jpeg' | 'image/png'
  filename: string
}

interface AccessTokenCache {
  value: string
  expiresAt: number
}

let accessTokenCache: AccessTokenCache | null = null
let accessTokenPromise: Promise<string> | null = null

function getErrorMessage(code: number | undefined, fallback: string): string {
  switch (code) {
    case 40001:
    case 40014:
    case 42001:
      return '微信接口凭据无效，请检查 AppID、AppSecret 和公众号配置。'
    case 40005:
    case 40009:
      return '正文图片格式或大小不符合微信要求。'
    case 40125:
      return '微信 AppSecret 无效，请检查公众号配置。'
    case 40164:
      return '微信接口拒绝了当前服务器 IP，请把线上服务的出口 IP 加入公众号接口 IP 白名单。'
    case 45009:
      return '微信接口调用过于频繁，请稍后重试。'
    default:
      return fallback
  }
}

function createApiError(prefix: string, payload: WechatApiErrorPayload, status?: number): WechatDraftError {
  const code = typeof payload.errcode === 'number' ? payload.errcode : undefined
  return new WechatDraftError(
    getErrorMessage(code, code ? `${prefix}（错误码 ${code}）。` : `${prefix}。`),
    status && status >= 400 ? 502 : 400,
    code,
  )
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMessage: string,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  }
  catch (error) {
    if (controller.signal.aborted) {
      throw new WechatDraftError(timeoutMessage, 504)
    }
    throw error
  }
  finally {
    clearTimeout(timeout)
  }
}

function assertConfigured() {
  if (!env.WECHAT_APPID?.trim() || !env.WECHAT_APPSECRET?.trim()) {
    throw new WechatDraftError('线上公众号接口尚未配置，请先配置服务端环境变量。', 503)
  }
}

function getPropertyString(node: Element, name: string): string {
  const value = node.properties?.[name]
  return typeof value === 'string' ? value : ''
}

function findEasymdSection(tree: Root): Element | undefined {
  let section: Element | undefined
  visit(tree, 'element', (node: Element) => {
    if (!section && node.tagName === 'section' && getPropertyString(node, 'id') === 'easymd') {
      section = node
    }
  })
  return section
}

function createContentRoot(html: string): Root {
  if (!html.trim()) {
    throw new WechatDraftError('文章内容为空。')
  }
  if (html.length > MAX_HTML_INPUT_CHARS) {
    throw new WechatDraftError('文章内容过大，请减少正文或自定义样式。')
  }

  const tree = unified().use(rehypeParse).parse(html) as Root
  const section = findEasymdSection(tree)
  if (!section) {
    throw new WechatDraftError('无法识别 easymd 文章内容。请重新渲染后再试。')
  }

  return {
    type: 'root',
    children: section.children,
  }
}

async function sanitizeContent(root: Root): Promise<Root> {
  const sanitized = await unified()
    .use(rehypeSanitize, wechatDraftSanitizeSchema)
    .run(root) as Root

  visit(sanitized, 'element', (node: Element) => {
    const style = node.properties?.style
    if (
      typeof style === 'string'
      && /expression\s*\(|javascript:|@import|url\s*\(\s*data:/i.test(style)
    ) {
      delete node.properties?.style
    }
  })

  return sanitized
}

function walkText(node: Root | Element): string {
  let result = ''
  for (const child of node.children) {
    if (child.type === 'text') {
      result += child.value
    }
    else if (child.type === 'element') {
      result += walkText(child)
    }
  }
  return result
}

function collectImageNodes(root: Root): Element[] {
  const images: Element[] = []
  visit(root, 'element', (node: Element) => {
    if (node.tagName === 'img') {
      images.push(node)
    }
  })
  return images
}

function parseHostname(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined
  }

  try {
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`)
    return url.hostname.toLowerCase()
  }
  catch {
    return undefined
  }
}

function getAllowedImageHosts(extraHosts: string[] = []): Set<string> {
  const configuredHosts = env.WECHAT_IMAGE_HOSTS
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean) ?? []
  const values = [
    ...extraHosts,
    ...configuredHosts,
    env.VITE_APP_URL,
    env.VITE_API_URL,
    env.S3_PUBLIC_BASE_URL,
    env.DC_UPLOAD_URL,
  ]

  return new Set(values.map(parseHostname).filter((value): value is string => Boolean(value)))
}

function isPrivateHostname(hostname: string): boolean {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    normalizedHostname === 'localhost'
    || normalizedHostname === '::'
    || normalizedHostname === '::1'
    || normalizedHostname.endsWith('.local')
  ) {
    return true
  }

  if (normalizedHostname.includes(':')) {
    const mappedIpv4 = normalizedHostname.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
    if (mappedIpv4) {
      return isPrivateHostname(mappedIpv4[1])
    }
    return normalizedHostname.startsWith('fc')
      || normalizedHostname.startsWith('fd')
      || normalizedHostname.startsWith('fe80:')
  }

  const ipv4 = normalizedHostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4) {
    return false
  }

  const [first, second, third] = ipv4.slice(1).map(Number)
  if ([first, second, third].some(value => value > 255)) {
    return false
  }
  return first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 192 && second === 0 && third === 0)
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 198 && (second === 18 || second === 19))
    || first === 0
    || first >= 224
}

function isAllowedImageHost(hostname: string, allowedHosts: Set<string>): boolean {
  return [...allowedHosts].some((allowedHost) => {
    if (allowedHost.startsWith('*.')) {
      return hostname.endsWith(allowedHost.slice(1))
    }
    return hostname === allowedHost
  })
}

function validateRemoteImageUrl(source: string, allowedHosts: Set<string>): URL {
  let url: URL
  try {
    url = new URL(source)
  }
  catch {
    throw new WechatDraftError('正文中存在无法识别的图片地址。')
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new WechatDraftError('正文图片只支持公开的 HTTP/HTTPS 地址。')
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new WechatDraftError('正文图片地址包含不支持的端口。')
  }
  if (isPrivateHostname(url.hostname)) {
    throw new WechatDraftError('正文图片地址指向受限网络，无法同步。')
  }
  if (!isAllowedImageHost(url.hostname, allowedHosts)) {
    throw new WechatDraftError(`正文图片来源 ${url.hostname} 未加入线上图片白名单。`)
  }
  return url
}

function normalizeImageType(value: string | undefined): 'image/jpeg' | 'image/png' | undefined {
  const type = value?.split(';')[0].trim().toLowerCase()
  if (type === 'image/png') {
    return 'image/png'
  }
  if (type === 'image/jpeg' || type === 'image/jpg') {
    return 'image/jpeg'
  }
  return undefined
}

function detectImageType(bytes: Uint8Array, declaredType?: string): 'image/jpeg' | 'image/png' {
  const declared = normalizeImageType(declaredType)
  const isPng = bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4E
    && bytes[3] === 0x47
    && bytes[4] === 0x0D
    && bytes[5] === 0x0A
    && bytes[6] === 0x1A
    && bytes[7] === 0x0A
  const isJpeg = bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8

  if (isPng) {
    return 'image/png'
  }
  if (isJpeg) {
    return 'image/jpeg'
  }
  if (declared) {
    throw new WechatDraftError('正文图片内容与文件类型不匹配。')
  }
  throw new WechatDraftError('正文图片格式无法识别，请使用 JPG 或 PNG。')
}

function filenameForType(type: 'image/jpeg' | 'image/png', index: number): string {
  return `article-image-${index + 1}.${type === 'image/png' ? 'png' : 'jpg'}`
}

function parseDataImage(source: string, index: number): WechatImagePayload {
  const match = source.match(/^data:(image\/(?:png|jpeg|jpg));base64,([a-z\d+/=\s]+)$/i)
  if (!match) {
    throw new WechatDraftError('正文内嵌图片只支持 JPG 或 PNG 的 Base64 数据。')
  }

  const declaredType = normalizeImageType(match[1])
  const bytes = Uint8Array.from(Buffer.from(match[2].replace(/\s/g, ''), 'base64'))
  if (bytes.length === 0 || bytes.length > MAX_ARTICLE_IMAGE_BYTES) {
    throw new WechatDraftError('正文图片大小必须小于 1 MB。')
  }

  const contentType = detectImageType(bytes, declaredType)
  return {
    blob: new Blob([Buffer.from(bytes)], { type: contentType }),
    contentType,
    filename: filenameForType(contentType, index),
  }
}

async function readLimitedBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new WechatDraftError('正文图片大小必须小于 1 MB。')
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.length > maxBytes) {
      throw new WechatDraftError('正文图片大小必须小于 1 MB。')
    }
    return bytes
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (value) {
        total += value.byteLength
        if (total > maxBytes) {
          throw new WechatDraftError('正文图片大小必须小于 1 MB。')
        }
        chunks.push(value)
      }
    }
  }
  catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  }
  finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

async function fetchRemoteImage(url: URL, allowedHosts: Set<string>, index: number): Promise<WechatImagePayload> {
  let currentUrl = url
  for (let attempt = 0; attempt < 3; attempt += 1) {
    validateRemoteImageUrl(currentUrl.toString(), allowedHosts)
    let response: Response
    try {
      response = await fetchWithTimeout(currentUrl, {
        headers: {
          'Accept': 'image/png,image/jpeg;q=0.9,*/*;q=0.1',
          'User-Agent': 'easymd WeChat draft publisher',
        },
        redirect: 'manual',
      }, '读取正文图片超时，请稍后重试。')
    }
    catch (error) {
      if (error instanceof WechatDraftError) {
        throw error
      }
      throw new WechatDraftError('读取正文图片失败，请检查图片地址是否公开可访问。', 502)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw new WechatDraftError('正文图片重定向地址无效。')
      }
      currentUrl = new URL(location, currentUrl)
      continue
    }

    if (!response.ok) {
      throw new WechatDraftError(`读取正文图片失败（HTTP ${response.status}）。`, 502)
    }

    const bytes = await readLimitedBytes(response, MAX_ARTICLE_IMAGE_BYTES)
    const contentType = detectImageType(bytes, response.headers.get('content-type') ?? undefined)
    return {
      blob: new Blob([Buffer.from(bytes)], { type: contentType }),
      contentType,
      filename: filenameForType(contentType, index),
    }
  }

  throw new WechatDraftError('正文图片重定向次数过多。')
}

async function resolveImageSource(
  source: string,
  allowedHosts: Set<string>,
  index: number,
): Promise<WechatImagePayload> {
  if (source.startsWith('data:')) {
    return parseDataImage(source, index)
  }
  return fetchRemoteImage(validateRemoteImageUrl(source, allowedHosts), allowedHosts, index)
}

async function fetchWechatJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetchWithTimeout(url, init, '连接微信接口超时，请稍后重试。')
  }
  catch (error) {
    if (error instanceof WechatDraftError) {
      throw error
    }
    throw new WechatDraftError('连接微信接口失败，请稍后重试。', 502)
  }

  let payload: WechatApiErrorPayload & T
  try {
    payload = await response.json() as WechatApiErrorPayload & T
  }
  catch {
    throw new WechatDraftError('微信接口返回了无法识别的响应。', 502)
  }

  if (!response.ok || (typeof payload.errcode === 'number' && payload.errcode !== 0)) {
    throw createApiError('微信接口调用失败', payload, response.status)
  }
  return payload
}

async function loadAccessToken(): Promise<string> {
  assertConfigured()
  const appid = env.WECHAT_APPID?.trim() ?? ''
  const secret = env.WECHAT_APPSECRET?.trim() ?? ''
  const query = new URLSearchParams({
    appid,
    grant_type: 'client_credential',
    secret,
  })
  const payload = await fetchWechatJson<{ access_token?: string, expires_in?: number }>(
    `${WECHAT_API_BASE}/cgi-bin/token?${query.toString()}`,
  )
  if (!payload.access_token) {
    throw new WechatDraftError('微信接口未返回 access_token。', 502)
  }

  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 7200
  accessTokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  }
  return payload.access_token
}

async function getAccessToken(): Promise<string> {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.value
  }
  if (!accessTokenPromise) {
    accessTokenPromise = loadAccessToken().finally(() => {
      accessTokenPromise = null
    })
  }
  return accessTokenPromise
}

async function uploadArticleImage(accessToken: string, image: WechatImagePayload): Promise<string> {
  const form = new FormData()
  form.append('media', image.blob, image.filename)
  const query = new URLSearchParams({ access_token: accessToken })
  const payload = await fetchWechatJson<{ url?: string }>(
    `${WECHAT_API_BASE}/cgi-bin/media/uploadimg?${query.toString()}`,
    { method: 'POST', body: form },
  )
  if (!payload.url) {
    throw new WechatDraftError('微信接口未返回正文图片地址。', 502)
  }
  return payload.url
}

async function uploadCover(accessToken: string, cover: Blob, filename: string): Promise<string> {
  if (cover.size === 0 || cover.size > MAX_COVER_BYTES) {
    throw new WechatDraftError('封面图片大小必须在 10 MB 以内。')
  }
  const contentType = normalizeImageType(cover.type)
  if (!contentType) {
    throw new WechatDraftError('封面只支持 JPG 或 PNG 图片。')
  }

  const bytes = new Uint8Array(await cover.arrayBuffer())
  detectImageType(bytes, contentType)
  const form = new FormData()
  form.append('media', new Blob([Buffer.from(bytes)], { type: contentType }), filename || `cover.${contentType === 'image/png' ? 'png' : 'jpg'}`)
  const query = new URLSearchParams({ access_token: accessToken, type: 'image' })
  const payload = await fetchWechatJson<{ media_id?: string }>(
    `${WECHAT_API_BASE}/cgi-bin/material/add_material?${query.toString()}`,
    { method: 'POST', body: form },
  )
  if (!payload.media_id) {
    throw new WechatDraftError('微信接口未返回封面素材 ID。', 502)
  }
  return payload.media_id
}

async function serializeContent(root: Root): Promise<string> {
  return unified().use(rehypeStringify).stringify(root)
}

export async function publishWechatDraft(
  input: WechatDraftPublishInput,
  authorizerAccessToken?: string,
): Promise<WechatDraftPublishResult> {
  if (!authorizerAccessToken?.trim()) {
    assertConfigured()
  }

  const title = input.title.trim()
  const author = input.author?.trim() ?? ''
  const digest = input.digest?.trim() ?? ''
  const sourceUrl = input.sourceUrl?.trim() ?? ''
  const coverMediaId = input.coverMediaId?.trim()
    || (authorizerAccessToken ? '' : env.WECHAT_DEFAULT_COVER_MEDIA_ID?.trim() || '')

  if (!title) {
    throw new WechatDraftError('标题不能为空。')
  }
  if ([...title].length > 64) {
    throw new WechatDraftError('标题不能超过 64 个字符。')
  }
  if ([...author].length > 64) {
    throw new WechatDraftError('作者不能超过 64 个字符。')
  }
  if ([...digest].length > 120) {
    throw new WechatDraftError('摘要不能超过 120 个字符。')
  }
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl)
      if (!['http:', 'https:'].includes(url.protocol) || Buffer.byteLength(sourceUrl, 'utf8') > 1024) {
        throw new Error('invalid source URL')
      }
    }
    catch {
      throw new WechatDraftError('原文链接必须是 1 KB 以内的 HTTP/HTTPS 地址。')
    }
  }
  if (!coverMediaId && !input.cover) {
    throw new WechatDraftError('请上传封面，或配置默认封面素材 ID。')
  }

  const contentRoot = await sanitizeContent(createContentRoot(input.html))
  const images = collectImageNodes(contentRoot)
  if (images.length > MAX_CONTENT_IMAGES) {
    throw new WechatDraftError(`正文图片不能超过 ${MAX_CONTENT_IMAGES} 张。`)
  }

  const accessToken = authorizerAccessToken?.trim() || await getAccessToken()
  const allowedImageHosts = getAllowedImageHosts(input.allowedImageHosts)
  const uploadedImages = new Map<string, string>()
  let imageIndex = 0
  for (const image of images) {
    const source = getPropertyString(image, 'src').trim()
    if (!source) {
      throw new WechatDraftError('正文中存在没有地址的图片。')
    }

    let uploadedUrl = uploadedImages.get(source)
    if (!uploadedUrl) {
      const resolved = await resolveImageSource(source, allowedImageHosts, imageIndex)
      uploadedUrl = await uploadArticleImage(accessToken, resolved)
      uploadedImages.set(source, uploadedUrl)
      imageIndex += 1
    }
    image.properties ??= {}
    image.properties.src = uploadedUrl
  }

  const content = await serializeContent(contentRoot)
  const contentChars = [...walkText(contentRoot)].length
  const contentBytes = Buffer.byteLength(content, 'utf8')
  if (contentChars > MAX_CONTENT_CHARS || contentBytes >= MAX_CONTENT_BYTES) {
    throw new WechatDraftError('正文超过微信草稿箱限制：少于 2 万字符且小于 1 MB。')
  }

  const resolvedCoverMediaId = coverMediaId || await uploadCover(
    accessToken,
    input.cover as Blob,
    input.coverFilename?.trim() || 'cover.jpg',
  )
  const payload = await fetchWechatJson<{ media_id?: string }>(
    `${WECHAT_API_BASE}/cgi-bin/draft/add?${new URLSearchParams({ access_token: accessToken }).toString()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articles: [{
          author,
          content,
          content_source_url: sourceUrl,
          digest,
          need_open_comment: input.needOpenComment ? 1 : 0,
          only_fans_can_comment: input.onlyFansCanComment ? 1 : 0,
          show_cover_pic: input.showCoverPic ? 1 : 0,
          thumb_media_id: resolvedCoverMediaId,
          title,
        }],
      }),
    },
  )
  if (!payload.media_id) {
    throw new WechatDraftError('微信接口未返回草稿 ID。', 502)
  }

  return {
    draftMediaId: payload.media_id,
    coverMediaId: resolvedCoverMediaId,
    contentChars,
    contentBytes,
    imageCount: uploadedImages.size,
  }
}

export const wechatDraftLimits = {
  maxArticleImageBytes: MAX_ARTICLE_IMAGE_BYTES,
  maxContentBytes: MAX_CONTENT_BYTES,
  maxContentChars: MAX_CONTENT_CHARS,
  maxContentImages: MAX_CONTENT_IMAGES,
  maxCoverBytes: MAX_COVER_BYTES,
  maxHtmlInputChars: MAX_HTML_INPUT_CHARS,
  maxRequestBytes: MAX_REQUEST_BYTES,
} as const
