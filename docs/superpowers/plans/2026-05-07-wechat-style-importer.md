# WeChat Style Importer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-version WeChat article importer that accepts one public `mp.weixin.qq.com` article URL, imports readable Markdown, and saves an easymd custom theme generated from a style fingerprint.

**Architecture:** Keep parsing and theme generation in pure `src/lib/wechat-import/*` modules so they are testable without React or server routes. Add one TanStack Start server route for URL fetch/import, a small client service/action, and a dialog entry in the existing markdown style menu that creates a file and switches to the generated `custom:*` style.

**Tech Stack:** TypeScript, TanStack Start file routes, React 19, Zustand, Vitest, unified/rehype/remark, existing `createImportedMarkdownStyle()`, existing `filesStore` and `previewStore`.

---

## File Structure

- Create `src/lib/wechat-import/types.ts`: shared result, article, warning, and fingerprint types.
- Create `src/lib/wechat-import/url.ts`: validate and normalize single WeChat article URLs.
- Create `src/lib/wechat-import/dom.ts`: parse WeChat HTML into title, author, publish time, body HTML, Markdown, and source block.
- Create `src/lib/wechat-import/style-fingerprint.ts`: inspect body HTML structure and inline style fragments to produce a bounded fingerprint.
- Create `src/lib/wechat-import/theme-css.ts`: convert fingerprints into original `#easymd` scoped CSS.
- Create `src/lib/wechat-import/index.ts`: orchestrate HTML import with `importWechatArticleFromHtml()`.
- Create tests beside the pure modules: `url.test.ts`, `dom.test.ts`, `style-fingerprint.test.ts`, `theme-css.test.ts`, `index.test.ts`.
- Create `src/routes/api.import.wechat.ts`: server route that validates URL, fetches HTML, calls the importer, and returns JSON.
- Create `src/services/import-wechat.ts`: client API wrapper around `/api/import/wechat`.
- Create `src/lib/actions/import-wechat-article.ts`: UI action that calls the service, creates the file, saves the generated theme, switches style, and emits toast/analytics.
- Create `src/components/markdown/previewer/action-bar/wechat-style-import-dialog.tsx`: dialog with URL input, scope warning, loading state, and result handling.
- Modify `src/components/markdown/previewer/action-bar/markdown-style-menu.tsx`: add the dialog/menu entry below custom CSS import.
- Modify `src/lib/actions/index.ts`: export `importWechatArticle`.

## Task 1: URL Validation

**Files:**
- Create: `src/lib/wechat-import/types.ts`
- Create: `src/lib/wechat-import/url.ts`
- Test: `src/lib/wechat-import/url.test.ts`

- [ ] **Step 1: Write failing URL validation tests**

Create `src/lib/wechat-import/url.test.ts`:

```ts
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

  it('rejects invalid URLs', () => {
    expect(parseWechatArticleUrl('not a url')).toEqual({
      ok: false,
      error: '请输入有效的文章链接。',
    })
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm test src/lib/wechat-import/url.test.ts
```

Expected: FAIL because `src/lib/wechat-import/url.ts` does not exist.

- [ ] **Step 3: Add shared types and URL parser**

Create `src/lib/wechat-import/types.ts`:

```ts
export interface WechatArticleImportArticle {
  title: string
  author?: string
  publishTime?: string
  sourceUrl: string
  markdown: string
}

export interface WechatStyleFingerprint {
  colors: {
    text?: string
    muted?: string
    accent?: string
    background?: string
    quoteBorder?: string
    codeBackground?: string
  }
  typography: {
    bodyFontSize?: number
    bodyLineHeight?: number
    h1FontSize?: number
    h2FontSize?: number
    h3FontSize?: number
    fontFamilyKind?: 'system' | 'serif' | 'sans' | 'mixed'
  }
  spacing: {
    paragraphMarginBlock?: number
    sectionMarginBlock?: number
    headingMarginBlock?: number
  }
  decoration: {
    headingPattern?: 'plain' | 'bar' | 'underline' | 'badge'
    quotePattern?: 'left-border' | 'background' | 'card'
    imageRadius?: number
    tablePattern?: 'minimal' | 'bordered' | 'striped'
  }
}

export interface WechatArticleImportTheme {
  sourceName: string
  css: string
  fingerprint: WechatStyleFingerprint
}

export interface WechatArticleImportResult {
  article: WechatArticleImportArticle
  theme: WechatArticleImportTheme
  warnings: string[]
}
```

Create `src/lib/wechat-import/url.ts`:

```ts
export type WechatArticleUrlParseResult =
  | { ok: true, url: string }
  | { ok: false, error: string }

export function parseWechatArticleUrl(input: string): WechatArticleUrlParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, error: '请输入有效的文章链接。' }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  }
  catch {
    return { ok: false, error: '请输入有效的文章链接。' }
  }

  if (url.hostname !== 'mp.weixin.qq.com') {
    return { ok: false, error: '仅支持单篇微信公众号文章链接。' }
  }

  if (url.pathname !== '/s' && !url.pathname.startsWith('/s/')) {
    return { ok: false, error: '仅支持单篇微信公众号文章链接。' }
  }

  url.protocol = 'https:'
  url.hash = ''
  return { ok: true, url: url.href }
}
```

- [ ] **Step 4: Run URL tests and verify they pass**

Run:

```bash
pnpm test src/lib/wechat-import/url.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/wechat-import/types.ts src/lib/wechat-import/url.ts src/lib/wechat-import/url.test.ts
git commit -m "feat: validate WeChat article URLs"
```

## Task 2: WeChat HTML To Markdown

**Files:**
- Create: `src/lib/wechat-import/dom.ts`
- Test: `src/lib/wechat-import/dom.test.ts`

- [ ] **Step 1: Write failing DOM extraction tests**

Create `src/lib/wechat-import/dom.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { extractWechatArticleFromHtml } from './dom'

const html = `
  <html>
    <body>
      <h1 id="activity-name">  示例文章  </h1>
      <span id="js_name"> easymd 作者 </span>
      <em id="publish_time">2026-05-07</em>
      <div id="js_content">
        <p style="font-size:16px;color:#333;line-height:1.8">第一段正文</p>
        <p><img data-src="https://img.example.com/a.png" alt="配图"></p>
        <blockquote style="border-left:4px solid #2f80ed">引用内容</blockquote>
        <section><h2 style="border-left: 4px solid #2f80ed;">小标题</h2></section>
      </div>
    </body>
  </html>
`

describe('extractWechatArticleFromHtml', () => {
  it('extracts article metadata and markdown', async () => {
    const result = await extractWechatArticleFromHtml(html, 'https://mp.weixin.qq.com/s/demo')

    expect(result.article.title).toBe('示例文章')
    expect(result.article.author).toBe('easymd 作者')
    expect(result.article.publishTime).toBe('2026-05-07')
    expect(result.article.sourceUrl).toBe('https://mp.weixin.qq.com/s/demo')
    expect(result.article.markdown).toContain('# 示例文章')
    expect(result.article.markdown).toContain('> 来源：easymd 作者，https://mp.weixin.qq.com/s/demo')
    expect(result.article.markdown).toContain('第一段正文')
    expect(result.article.markdown).toContain('![配图](https://img.example.com/a.png)')
    expect(result.article.markdown).toContain('> 引用内容')
    expect(result.bodyHtml).toContain('https://img.example.com/a.png')
  })

  it('throws when article body is missing', async () => {
    await expect(
      extractWechatArticleFromHtml('<h1 id="activity-name">空文章</h1>', 'https://mp.weixin.qq.com/s/demo'),
    ).rejects.toThrow('这篇文章的正文结构无法识别。')
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm test src/lib/wechat-import/dom.test.ts
```

Expected: FAIL because `dom.ts` does not exist.

- [ ] **Step 3: Implement extraction and Markdown conversion**

Create `src/lib/wechat-import/dom.ts`:

```ts
import type { Root } from 'hast'
import rehypeParse from 'rehype-parse'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { parse as parseHtmlToMarkdown } from '@/lib/markdown/parse/html'

interface ExtractedWechatArticle {
  article: {
    title: string
    author?: string
    publishTime?: string
    sourceUrl: string
    markdown: string
  }
  bodyHtml: string
}

function toText(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const node = value as { type?: string, value?: string, children?: unknown[] }
  if (node.type === 'text') {
    return node.value ?? ''
  }

  return Array.isArray(node.children)
    ? node.children.map(toText).join('')
    : ''
}

function trimText(value: unknown): string {
  return toText(value).replace(/\s+/g, ' ').trim()
}

function getProperty(node: unknown, name: string): unknown {
  if (!node || typeof node !== 'object') {
    return undefined
  }
  return (node as { properties?: Record<string, unknown> }).properties?.[name]
}

function getId(node: unknown): string {
  const id = getProperty(node, 'id')
  return typeof id === 'string' ? id : ''
}

function findElementById(tree: Root, id: string): unknown {
  let found: unknown
  visit(tree, 'element', (node) => {
    if (!found && getId(node) === id) {
      found = node
    }
  })
  return found
}

function normalizeWechatImages(tree: Root) {
  visit(tree, 'element', (node: any) => {
    if (node.tagName !== 'img') {
      return
    }

    const props = node.properties ??= {}
    const dataSrc = typeof props.dataSrc === 'string' ? props.dataSrc : ''
    const dataOriginal = typeof props.dataOriginal === 'string' ? props.dataOriginal : ''
    const src = typeof props.src === 'string' ? props.src : ''
    props.src = src || dataSrc || dataOriginal
  })
}

function stringifyFragment(node: any): string {
  const processor = unified().use(rehypeStringify)
  return processor.stringify({
    type: 'root',
    children: node.children ?? [],
  } as Root)
}

function frontmatter(sourceUrl: string, author?: string): string {
  return [
    '---',
    `source: "${sourceUrl.replaceAll('"', '\\"')}"`,
    author ? `author: "${author.replaceAll('"', '\\"')}"` : '',
    `importedAt: "${new Date().toISOString()}"`,
    '---',
  ].filter(Boolean).join('\n')
}

export async function extractWechatArticleFromHtml(
  html: string,
  sourceUrl: string,
): Promise<ExtractedWechatArticle> {
  const tree = unified().use(rehypeParse).parse(html) as Root
  normalizeWechatImages(tree)

  const titleNode = findElementById(tree, 'activity-name')
  const authorNode = findElementById(tree, 'js_name')
  const publishNode = findElementById(tree, 'publish_time')
  const bodyNode = findElementById(tree, 'js_content') as { children?: unknown[] } | undefined

  if (!bodyNode || !Array.isArray(bodyNode.children) || bodyNode.children.length === 0) {
    throw new Error('这篇文章的正文结构无法识别。')
  }

  const title = trimText(titleNode) || '公众号文章'
  const author = trimText(authorNode) || undefined
  const publishTime = trimText(publishNode) || undefined
  const bodyHtml = stringifyFragment(bodyNode)
  const bodyMarkdown = (await parseHtmlToMarkdown(bodyHtml)).trim()
  const sourceLine = author
    ? `> 来源：${author}，${sourceUrl}`
    : `> 来源：${sourceUrl}`

  const markdown = [
    frontmatter(sourceUrl, author),
    '',
    `# ${title}`,
    '',
    sourceLine,
    '',
    bodyMarkdown,
  ].join('\n').trimEnd()

  return {
    article: {
      title,
      author,
      publishTime,
      sourceUrl,
      markdown,
    },
    bodyHtml,
  }
}
```

- [ ] **Step 4: Run DOM tests and verify they pass**

Run:

```bash
pnpm test src/lib/wechat-import/dom.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/wechat-import/dom.ts src/lib/wechat-import/dom.test.ts
git commit -m "feat: extract WeChat articles as markdown"
```

## Task 3: Style Fingerprint Extraction

**Files:**
- Create: `src/lib/wechat-import/style-fingerprint.ts`
- Test: `src/lib/wechat-import/style-fingerprint.test.ts`

- [ ] **Step 1: Write failing fingerprint tests**

Create `src/lib/wechat-import/style-fingerprint.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { extractWechatStyleFingerprint } from './style-fingerprint'

describe('extractWechatStyleFingerprint', () => {
  it('extracts bounded style signals from inline styles', () => {
    const fingerprint = extractWechatStyleFingerprint(`
      <p style="font-size:16px;line-height:1.9;color:#333333;margin: 12px 0;">正文</p>
      <h2 style="font-size:22px;border-left:4px solid #2f80ed;padding-left:12px;">标题</h2>
      <blockquote style="background:#f4f8ff;border-left:4px solid #2f80ed;">引用</blockquote>
      <img style="border-radius:18px" src="x.png">
      <table style="border-collapse: collapse"><tr><td>1</td></tr></table>
    `)

    expect(fingerprint.colors.text).toBe('#333333')
    expect(fingerprint.colors.accent).toBe('#2f80ed')
    expect(fingerprint.colors.quoteBorder).toBe('#2f80ed')
    expect(fingerprint.typography.bodyFontSize).toBe(16)
    expect(fingerprint.typography.bodyLineHeight).toBe(1.9)
    expect(fingerprint.typography.h2FontSize).toBe(22)
    expect(fingerprint.spacing.paragraphMarginBlock).toBe(12)
    expect(fingerprint.decoration.headingPattern).toBe('bar')
    expect(fingerprint.decoration.quotePattern).toBe('card')
    expect(fingerprint.decoration.imageRadius).toBe(18)
    expect(fingerprint.decoration.tablePattern).toBe('bordered')
  })

  it('falls back to safe defaults when no style exists', () => {
    const fingerprint = extractWechatStyleFingerprint('<p>正文</p><h2>标题</h2>')

    expect(fingerprint.colors.text).toBe('#2f3437')
    expect(fingerprint.colors.accent).toBe('#2f80ed')
    expect(fingerprint.typography.bodyFontSize).toBe(16)
    expect(fingerprint.typography.bodyLineHeight).toBe(1.8)
    expect(fingerprint.decoration.headingPattern).toBe('plain')
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm test src/lib/wechat-import/style-fingerprint.test.ts
```

Expected: FAIL because `style-fingerprint.ts` does not exist.

- [ ] **Step 3: Implement fingerprint extraction**

Create `src/lib/wechat-import/style-fingerprint.ts`:

```ts
import type { WechatStyleFingerprint } from './types'

const DEFAULT_FINGERPRINT: WechatStyleFingerprint = {
  colors: {
    text: '#2f3437',
    muted: '#6b7280',
    accent: '#2f80ed',
    background: '#ffffff',
    quoteBorder: '#2f80ed',
    codeBackground: '#f6f8fa',
  },
  typography: {
    bodyFontSize: 16,
    bodyLineHeight: 1.8,
    h1FontSize: 24,
    h2FontSize: 21,
    h3FontSize: 18,
    fontFamilyKind: 'system',
  },
  spacing: {
    paragraphMarginBlock: 12,
    sectionMarginBlock: 24,
    headingMarginBlock: 24,
  },
  decoration: {
    headingPattern: 'plain',
    quotePattern: 'left-border',
    imageRadius: 0,
    tablePattern: 'minimal',
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeColor(value: string): string | undefined {
  const hex = value.trim().match(/#[0-9a-f]{3,8}\b/i)?.[0]
  if (!hex) {
    return undefined
  }
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase()
  }
  return hex.slice(0, 7).toLowerCase()
}

function readStyleAttributes(html: string, tagName: string): string[] {
  const pattern = new RegExp(`<${tagName}\\b[^>]*\\bstyle=(["'])([\\s\\S]*?)\\1`, 'gi')
  return Array.from(html.matchAll(pattern), match => match[2] ?? '')
}

function readProperty(style: string, property: string): string | undefined {
  const pattern = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i')
  return style.match(pattern)?.[1]?.trim()
}

function readPx(style: string, property: string): number | undefined {
  const value = readProperty(style, property)
  const match = value?.match(/(-?\d+(?:\.\d+)?)px/i)
  return match ? Number(match[1]) : undefined
}

function readLineHeight(style: string): number | undefined {
  const value = readProperty(style, 'line-height')
  if (!value) {
    return undefined
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return clamp(Number(numeric.toFixed(2)), 1.4, 2.2)
  }
  const px = value.match(/(\d+(?:\.\d+)?)px/i)
  const fontSize = readPx(style, 'font-size') ?? DEFAULT_FINGERPRINT.typography.bodyFontSize ?? 16
  return px ? clamp(Number((Number(px[1]) / fontSize).toFixed(2)), 1.4, 2.2) : undefined
}

function firstDefined<T>(values: Array<T | undefined>, fallback: T): T {
  return values.find(value => value !== undefined) ?? fallback
}

export function extractWechatStyleFingerprint(html: string): WechatStyleFingerprint {
  const paragraphStyles = readStyleAttributes(html, 'p')
  const h1Styles = readStyleAttributes(html, 'h1')
  const h2Styles = readStyleAttributes(html, 'h2')
  const h3Styles = readStyleAttributes(html, 'h3')
  const quoteStyles = readStyleAttributes(html, 'blockquote')
  const imgStyles = readStyleAttributes(html, 'img')
  const tableStyles = readStyleAttributes(html, 'table')

  const paragraphStyle = paragraphStyles[0] ?? ''
  const h2Style = h2Styles[0] ?? ''
  const quoteStyle = quoteStyles[0] ?? ''
  const imgStyle = imgStyles[0] ?? ''
  const tableStyle = tableStyles[0] ?? ''

  const headingAccent = normalizeColor(readProperty(h2Style, 'border-left') ?? '')
    ?? normalizeColor(readProperty(h2Style, 'border-bottom') ?? '')
    ?? normalizeColor(readProperty(h2Style, 'color') ?? '')
  const quoteBorder = normalizeColor(readProperty(quoteStyle, 'border-left') ?? '')

  const bodyFontSize = clamp(
    firstDefined(paragraphStyles.map(style => readPx(style, 'font-size')), DEFAULT_FINGERPRINT.typography.bodyFontSize ?? 16),
    14,
    18,
  )
  const bodyLineHeight = firstDefined(paragraphStyles.map(readLineHeight), DEFAULT_FINGERPRINT.typography.bodyLineHeight ?? 1.8)
  const paragraphMarginBlock = clamp(readPx(paragraphStyle, 'margin') ?? DEFAULT_FINGERPRINT.spacing.paragraphMarginBlock ?? 12, 8, 24)

  const hasHeadingBar = /border-left\s*:/i.test(h2Style)
  const hasHeadingUnderline = /border-bottom\s*:/i.test(h2Style)
  const quoteHasBackground = Boolean(readProperty(quoteStyle, 'background') || readProperty(quoteStyle, 'background-color'))

  return {
    colors: {
      text: normalizeColor(readProperty(paragraphStyle, 'color') ?? '') ?? DEFAULT_FINGERPRINT.colors.text,
      muted: DEFAULT_FINGERPRINT.colors.muted,
      accent: headingAccent ?? DEFAULT_FINGERPRINT.colors.accent,
      background: DEFAULT_FINGERPRINT.colors.background,
      quoteBorder: quoteBorder ?? headingAccent ?? DEFAULT_FINGERPRINT.colors.quoteBorder,
      codeBackground: DEFAULT_FINGERPRINT.colors.codeBackground,
    },
    typography: {
      bodyFontSize,
      bodyLineHeight,
      h1FontSize: clamp(readPx(h1Styles[0] ?? '', 'font-size') ?? DEFAULT_FINGERPRINT.typography.h1FontSize ?? 24, 22, 30),
      h2FontSize: clamp(readPx(h2Style, 'font-size') ?? DEFAULT_FINGERPRINT.typography.h2FontSize ?? 21, 18, 26),
      h3FontSize: clamp(readPx(h3Styles[0] ?? '', 'font-size') ?? DEFAULT_FINGERPRINT.typography.h3FontSize ?? 18, 16, 22),
      fontFamilyKind: DEFAULT_FINGERPRINT.typography.fontFamilyKind,
    },
    spacing: {
      paragraphMarginBlock,
      sectionMarginBlock: DEFAULT_FINGERPRINT.spacing.sectionMarginBlock,
      headingMarginBlock: DEFAULT_FINGERPRINT.spacing.headingMarginBlock,
    },
    decoration: {
      headingPattern: hasHeadingBar ? 'bar' : hasHeadingUnderline ? 'underline' : 'plain',
      quotePattern: quoteHasBackground ? 'card' : 'left-border',
      imageRadius: clamp(readPx(imgStyle, 'border-radius') ?? DEFAULT_FINGERPRINT.decoration.imageRadius ?? 0, 0, 28),
      tablePattern: /border-collapse\s*:\s*collapse/i.test(tableStyle) ? 'bordered' : 'minimal',
    },
  }
}
```

- [ ] **Step 4: Run fingerprint tests and verify they pass**

Run:

```bash
pnpm test src/lib/wechat-import/style-fingerprint.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/lib/wechat-import/style-fingerprint.ts src/lib/wechat-import/style-fingerprint.test.ts
git commit -m "feat: extract WeChat style fingerprints"
```

## Task 4: Theme CSS Generation

**Files:**
- Create: `src/lib/wechat-import/theme-css.ts`
- Test: `src/lib/wechat-import/theme-css.test.ts`

- [ ] **Step 1: Write failing CSS generation tests**

Create `src/lib/wechat-import/theme-css.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { generateWechatThemeCss } from './theme-css'
import type { WechatStyleFingerprint } from './types'

const fingerprint: WechatStyleFingerprint = {
  colors: {
    text: '#333333',
    muted: '#6b7280',
    accent: '#2f80ed',
    background: '#ffffff',
    quoteBorder: '#2f80ed',
    codeBackground: '#f6f8fa',
  },
  typography: {
    bodyFontSize: 16,
    bodyLineHeight: 1.9,
    h1FontSize: 26,
    h2FontSize: 22,
    h3FontSize: 18,
    fontFamilyKind: 'system',
  },
  spacing: {
    paragraphMarginBlock: 14,
    sectionMarginBlock: 24,
    headingMarginBlock: 28,
  },
  decoration: {
    headingPattern: 'bar',
    quotePattern: 'card',
    imageRadius: 16,
    tablePattern: 'bordered',
  },
}

describe('generateWechatThemeCss', () => {
  it('generates scoped CSS without WeChat class names', () => {
    const css = generateWechatThemeCss(fingerprint)

    expect(css).toContain('#easymd {')
    expect(css).toContain('font-size: 16px;')
    expect(css).toContain('line-height: 1.9;')
    expect(css).toContain('#easymd h2')
    expect(css).toContain('border-left: 4px solid #2f80ed;')
    expect(css).toContain('#easymd blockquote')
    expect(css).toContain('border-radius: 16px;')
    expect(css).not.toContain('js_content')
    expect(css).not.toContain('rich_media')
  })

  it('uses underline headings when requested', () => {
    const css = generateWechatThemeCss({
      ...fingerprint,
      decoration: { ...fingerprint.decoration, headingPattern: 'underline' },
    })

    expect(css).toContain('border-bottom: 2px solid #2f80ed;')
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm test src/lib/wechat-import/theme-css.test.ts
```

Expected: FAIL because `theme-css.ts` does not exist.

- [ ] **Step 3: Implement CSS generator**

Create `src/lib/wechat-import/theme-css.ts`:

```ts
import type { WechatStyleFingerprint } from './types'

function value<T>(input: T | undefined, fallback: T): T {
  return input ?? fallback
}

function headingDecoration(fingerprint: WechatStyleFingerprint): string {
  const accent = value(fingerprint.colors.accent, '#2f80ed')
  switch (fingerprint.decoration.headingPattern) {
    case 'bar':
      return [
        `  padding-left: 12px;`,
        `  border-left: 4px solid ${accent};`,
      ].join('\n')
    case 'underline':
      return [
        `  padding-bottom: 8px;`,
        `  border-bottom: 2px solid ${accent};`,
      ].join('\n')
    case 'badge':
      return [
        `  display: inline-block;`,
        `  padding: 4px 12px;`,
        `  color: #ffffff;`,
        `  background: ${accent};`,
      ].join('\n')
    case 'plain':
    default:
      return `  color: ${accent};`
  }
}

export function generateWechatThemeCss(fingerprint: WechatStyleFingerprint): string {
  const text = value(fingerprint.colors.text, '#2f3437')
  const muted = value(fingerprint.colors.muted, '#6b7280')
  const accent = value(fingerprint.colors.accent, '#2f80ed')
  const quoteBorder = value(fingerprint.colors.quoteBorder, accent)
  const codeBackground = value(fingerprint.colors.codeBackground, '#f6f8fa')
  const bodyFontSize = value(fingerprint.typography.bodyFontSize, 16)
  const bodyLineHeight = value(fingerprint.typography.bodyLineHeight, 1.8)
  const h1FontSize = value(fingerprint.typography.h1FontSize, 24)
  const h2FontSize = value(fingerprint.typography.h2FontSize, 21)
  const h3FontSize = value(fingerprint.typography.h3FontSize, 18)
  const paragraphMargin = value(fingerprint.spacing.paragraphMarginBlock, 12)
  const headingMargin = value(fingerprint.spacing.headingMarginBlock, 24)
  const imageRadius = value(fingerprint.decoration.imageRadius, 0)
  const quoteIsCard = fingerprint.decoration.quotePattern === 'card'
  const tableIsBordered = fingerprint.decoration.tablePattern === 'bordered'

  return `
#easymd {
  color: ${text};
  font-size: ${bodyFontSize}px;
  line-height: ${bodyLineHeight};
  letter-spacing: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

#easymd p {
  margin: ${paragraphMargin}px 0;
  color: ${text};
}

#easymd h1 {
  margin: 0 0 ${headingMargin}px;
  color: ${text};
  font-size: ${h1FontSize}px;
  line-height: 1.35;
  font-weight: 700;
}

#easymd h2 {
  margin: ${headingMargin}px 0 14px;
  color: ${text};
  font-size: ${h2FontSize}px;
  line-height: 1.45;
  font-weight: 700;
${headingDecoration(fingerprint)}
}

#easymd h3 {
  margin: 22px 0 10px;
  color: ${accent};
  font-size: ${h3FontSize}px;
  line-height: 1.45;
  font-weight: 700;
}

#easymd blockquote {
  margin: 18px 0;
  padding: ${quoteIsCard ? '14px 16px' : '4px 0 4px 14px'};
  color: ${muted};
  border-left: 4px solid ${quoteBorder};
  background: ${quoteIsCard ? 'rgba(47, 128, 237, 0.08)' : 'transparent'};
}

#easymd img {
  margin: 18px auto;
  border-radius: ${imageRadius}px;
}

#easymd pre {
  margin: 18px 0;
  padding: 14px;
  overflow-x: auto;
  background: ${codeBackground};
  border-radius: 8px;
}

#easymd code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

#easymd table {
  width: 100%;
  margin: 18px 0;
  border-collapse: ${tableIsBordered ? 'collapse' : 'separate'};
}

#easymd th,
#easymd td {
  padding: 8px 10px;
  border: ${tableIsBordered ? '1px solid rgba(47, 52, 55, 0.16)' : '0'};
}
`.trim()
}
```

- [ ] **Step 4: Run CSS tests and verify they pass**

Run:

```bash
pnpm test src/lib/wechat-import/theme-css.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/lib/wechat-import/theme-css.ts src/lib/wechat-import/theme-css.test.ts
git commit -m "feat: generate WeChat-inspired themes"
```

## Task 5: Import Orchestrator

**Files:**
- Create: `src/lib/wechat-import/index.ts`
- Test: `src/lib/wechat-import/index.test.ts`

- [ ] **Step 1: Write failing orchestrator tests**

Create `src/lib/wechat-import/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { importWechatArticleFromHtml } from './index'

describe('importWechatArticleFromHtml', () => {
  it('returns article markdown and generated theme', async () => {
    const result = await importWechatArticleFromHtml({
      html: `
        <h1 id="activity-name">风格文章</h1>
        <span id="js_name">作者</span>
        <div id="js_content">
          <p style="font-size:16px;line-height:1.9;color:#333333;">正文</p>
          <h2 style="border-left:4px solid #2f80ed;font-size:22px;">小标题</h2>
        </div>
      `,
      sourceUrl: 'https://mp.weixin.qq.com/s/demo',
    })

    expect(result.article.title).toBe('风格文章')
    expect(result.article.markdown).toContain('正文')
    expect(result.theme.sourceName).toBe('wechat-style-风格文章.css')
    expect(result.theme.css).toContain('#easymd')
    expect(result.theme.fingerprint.colors.accent).toBe('#2f80ed')
    expect(result.warnings).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm test src/lib/wechat-import/index.test.ts
```

Expected: FAIL because `index.ts` does not exist.

- [ ] **Step 3: Implement orchestrator**

Create `src/lib/wechat-import/index.ts`:

```ts
import type { WechatArticleImportResult } from './types'
import { extractWechatArticleFromHtml } from './dom'
import { extractWechatStyleFingerprint } from './style-fingerprint'
import { generateWechatThemeCss } from './theme-css'

interface ImportWechatArticleFromHtmlOptions {
  html: string
  sourceUrl: string
}

function sanitizeSourceName(title: string): string {
  const safe = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 40)
  return `wechat-style-${safe || 'article'}.css`
}

export async function importWechatArticleFromHtml({
  html,
  sourceUrl,
}: ImportWechatArticleFromHtmlOptions): Promise<WechatArticleImportResult> {
  const extracted = await extractWechatArticleFromHtml(html, sourceUrl)
  const fingerprint = extractWechatStyleFingerprint(extracted.bodyHtml)
  const css = generateWechatThemeCss(fingerprint)

  return {
    article: extracted.article,
    theme: {
      sourceName: sanitizeSourceName(extracted.article.title),
      css,
      fingerprint,
    },
    warnings: [],
  }
}

export type { WechatArticleImportResult, WechatStyleFingerprint } from './types'
export { parseWechatArticleUrl } from './url'
```

- [ ] **Step 4: Run orchestrator and pure module tests**

Run:

```bash
pnpm test src/lib/wechat-import/url.test.ts src/lib/wechat-import/dom.test.ts src/lib/wechat-import/style-fingerprint.test.ts src/lib/wechat-import/theme-css.test.ts src/lib/wechat-import/index.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add src/lib/wechat-import/index.ts src/lib/wechat-import/index.test.ts
git commit -m "feat: assemble WeChat article imports"
```

## Task 6: Server Route And Client Service

**Files:**
- Create: `src/routes/api.import.wechat.ts`
- Create: `src/services/import-wechat.ts`
- Test: `src/services/import-wechat.test.ts`

- [ ] **Step 1: Write failing client service tests**

Create `src/services/import-wechat.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}))

const { apiFetch } = await import('@/lib/api')
const { importWechatArticleByUrl } = await import('./import-wechat')

describe('importWechatArticleByUrl', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
  })

  it('posts the URL to the import endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true })

    const result = await importWechatArticleByUrl('https://mp.weixin.qq.com/s/demo')

    expect(result).toEqual({ ok: true })
    expect(apiFetch).toHaveBeenCalledWith('/api/import/wechat', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://mp.weixin.qq.com/s/demo' }),
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('normalizes API errors', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce({ data: { error: '无法读取这篇文章，请确认链接可公开访问。' } })

    await expect(importWechatArticleByUrl('https://mp.weixin.qq.com/s/demo')).rejects.toThrow(
      '无法读取这篇文章，请确认链接可公开访问。',
    )
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
pnpm test src/services/import-wechat.test.ts
```

Expected: FAIL because `src/services/import-wechat.ts` does not exist.

- [ ] **Step 3: Add service wrapper**

Create `src/services/import-wechat.ts`:

```ts
import type { WechatArticleImportResult } from '@/lib/wechat-import'
import { apiFetch } from '@/lib/api'

export async function importWechatArticleByUrl(url: string): Promise<WechatArticleImportResult> {
  try {
    return await apiFetch<WechatArticleImportResult>('/api/import/wechat', {
      method: 'POST',
      body: JSON.stringify({ url }),
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error: any) {
    const message = error?.data?.error || error?.message
    throw new Error(message || '公众号文章导入失败。')
  }
}
```

- [ ] **Step 4: Add server route**

Create `src/routes/api.import.wechat.ts`:

```ts
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { importWechatArticleFromHtml, parseWechatArticleUrl } from '@/lib/wechat-import'
import { corsMiddleware } from '@/lib/middleware/cors'

const MAX_WECHAT_HTML_SIZE = 2_000_000

const importWechatSchema = z.object({
  url: z.string().min(1),
})

async function readBoundedText(response: Response): Promise<string> {
  const text = await response.text()
  if (text.length > MAX_WECHAT_HTML_SIZE) {
    throw new Error('文章内容过大，无法导入。')
  }
  return text
}

export const Route = createFileRoute('/api/import/wechat')({
  server: {
    middleware: [corsMiddleware],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = importWechatSchema.parse(await request.json())
          const parsedUrl = parseWechatArticleUrl(body.url)

          if (!parsedUrl.ok) {
            return Response.json({ error: parsedUrl.error }, { status: 400 })
          }

          const response = await fetch(parsedUrl.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 easymd article importer',
              Accept: 'text/html,application/xhtml+xml',
            },
          })

          if (!response.ok) {
            return Response.json(
              { error: '无法读取这篇文章，请确认链接可公开访问。' },
              { status: 400 },
            )
          }

          const html = await readBoundedText(response)
          const result = await importWechatArticleFromHtml({
            html,
            sourceUrl: parsedUrl.url,
          })

          return Response.json(result)
        }
        catch (error) {
          const message = error instanceof Error ? error.message : '公众号文章导入失败。'
          const status = message.includes('正文结构') || message.includes('过大') ? 400 : 500
          return Response.json({ error: message }, { status })
        }
      },
    },
  },
})
```

- [ ] **Step 5: Run service and import tests**

Run:

```bash
pnpm test src/services/import-wechat.test.ts src/lib/wechat-import/url.test.ts src/lib/wechat-import/dom.test.ts src/lib/wechat-import/style-fingerprint.test.ts src/lib/wechat-import/theme-css.test.ts src/lib/wechat-import/index.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

```bash
git add src/routes/api.import.wechat.ts src/services/import-wechat.ts src/services/import-wechat.test.ts
git commit -m "feat: expose WeChat article import API"
```

## Task 7: UI Action And Style Menu Dialog

**Files:**
- Create: `src/lib/actions/import-wechat-article.ts`
- Create: `src/components/markdown/previewer/action-bar/wechat-style-import-dialog.tsx`
- Modify: `src/lib/actions/index.ts`
- Modify: `src/components/markdown/previewer/action-bar/markdown-style-menu.tsx`

- [ ] **Step 1: Add action implementation**

Create `src/lib/actions/import-wechat-article.ts`:

```ts
import { toast } from 'sonner'
import { trackEvent } from '@/lib/analytics'
import { importWechatArticleByUrl } from '@/services/import-wechat'
import { useFilesStore } from '@/stores/files'
import { usePreviewStore } from '@/stores/preview'
import { createImportedMarkdownStyle } from '@/themes/markdown-style/custom'

export async function importWechatArticle(url: string): Promise<void> {
  const result = await importWechatArticleByUrl(url)
  const { createFile, switchFile } = useFilesStore.getState()
  const {
    setMarkdownStyle,
    upsertImportedMarkdownStyle,
  } = usePreviewStore.getState()

  const { style } = createImportedMarkdownStyle(result.theme.sourceName, result.theme.css)
  upsertImportedMarkdownStyle(style)
  setMarkdownStyle(style.id)

  const fileId = await createFile(result.article.title, result.article.markdown)
  await switchFile(fileId)

  trackEvent('import', 'wechat-article', 'menu', {
    styleId: style.id,
    warnings: result.warnings.length,
  })

  toast.success('已导入文章并生成主题草稿。')
  for (const warning of result.warnings) {
    toast.warning(warning)
  }
}
```

Modify `src/lib/actions/index.ts`:

```ts
export { copyPlatform } from './copy-platform'
export { copyImage, exportImage } from './export-image'
export { exportMarkdown } from './export-markdown'
export { exportPdf, printPreview } from './export-pdf'
export { formatMarkdown } from './format'
export { handleImportFiles, triggerImportDialog } from './import-file'
export { importMarkdownStyle } from './import-markdown-style'
export { importWechatArticle } from './import-wechat-article'
export { toggleTheme } from './toggle-theme'
```

- [ ] **Step 2: Add dialog component**

Create `src/components/markdown/previewer/action-bar/wechat-style-import-dialog.tsx`:

```tsx
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { importWechatArticle } from '@/lib/actions'
import { parseWechatArticleUrl } from '@/lib/wechat-import'

interface WechatStyleImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WechatStyleImportDialog({
  open,
  onOpenChange,
}: WechatStyleImportDialogProps) {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const parsed = url.trim() ? parseWechatArticleUrl(url) : null
  const error = parsed && !parsed.ok ? parsed.error : ''
  const canSubmit = Boolean(parsed?.ok) && !submitting

  const handleSubmit = async () => {
    const parsedUrl = parseWechatArticleUrl(url)
    if (!parsedUrl.ok) {
      toast.error(parsedUrl.error)
      return
    }

    setSubmitting(true)
    try {
      await importWechatArticle(parsedUrl.url)
      setUrl('')
      onOpenChange(false)
    }
    catch (err) {
      toast.error(err instanceof Error ? err.message : '公众号文章导入失败。')
    }
    finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>从公众号生成主题</DialogTitle>
          <DialogDescription>
            输入单篇公开微信公众号文章链接。easymd 会导入正文 Markdown，并生成一个相似气质的原创主题草稿；第一版不镜像图片。
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="wechat-article-url">
              文章链接
            </FieldLabel>
            <Input
              id="wechat-article-url"
              value={url}
              onChange={event => setUrl(event.target.value)}
              placeholder="https://mp.weixin.qq.com/s/..."
              disabled={submitting}
            />
            <FieldDescription>
              仅支持用户主动输入的单篇公众号文章；导入结果默认保留来源信息。
            </FieldDescription>
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <Sparkles className="size-4" />
            {submitting ? '生成中...' : '导入并生成主题'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Replace style menu with wired dialog entry**

Replace `src/components/markdown/previewer/action-bar/markdown-style-menu.tsx` with:

```tsx
import { Sparkles, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import MarkdownStyleIcon from '@/icons/markdown-style'
import { importMarkdownStyle } from '@/lib/actions'
import { usePreviewStore } from '@/stores/preview'
import { markdownStyles } from '@/themes/markdown-style'
import { WechatStyleImportDialog } from './wechat-style-import-dialog'

const styleTooltip = '排版样式'
const styleAriaLabel = '排版样式'

export function MarkdownStyleMenu() {
  const currentStyle = usePreviewStore(state => state.markdownStyle)
  const setMarkdownStyle = usePreviewStore(state => state.setMarkdownStyle)
  const importedMarkdownStyles = usePreviewStore(state => state.importedMarkdownStyles)
  const [wechatImportOpen, setWechatImportOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={(
              <DropdownMenuTrigger
                render={(
                  <Button variant="ghost" size="icon" aria-label={styleAriaLabel}>
                    <MarkdownStyleIcon className="size-4" />
                  </Button>
                )}
              />
            )}
          />
          <TooltipContent>{styleTooltip}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>内置样式</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={currentStyle} onValueChange={setMarkdownStyle}>
              {markdownStyles.map(style => (
                <DropdownMenuRadioItem
                  key={style.id}
                  value={style.id}
                  className="cursor-pointer"
                >
                  {style.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {importedMarkdownStyles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>导入样式</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={currentStyle} onValueChange={setMarkdownStyle}>
                  {importedMarkdownStyles.map(style => (
                    <DropdownMenuRadioItem
                      key={style.id}
                      value={style.id}
                      className="cursor-pointer"
                    >
                      {style.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setWechatImportOpen(true)}
            >
              <Sparkles className="size-4" />
              从公众号生成主题...
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                void importMarkdownStyle('menu')
              }}
            >
              <Upload className="size-4" />
              导入自定义样式...
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <WechatStyleImportDialog
        open={wechatImportOpen}
        onOpenChange={setWechatImportOpen}
      />
    </>
  )
}
```

- [ ] **Step 4: Typecheck UI integration**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit Task 7**

```bash
git add src/lib/actions/import-wechat-article.ts src/lib/actions/index.ts src/components/markdown/previewer/action-bar/wechat-style-import-dialog.tsx src/components/markdown/previewer/action-bar/markdown-style-menu.tsx
git commit -m "feat: add WeChat style import dialog"
```

## Task 8: Router Generation And End-To-End Verification

**Files:**
- Verify generated route files if TanStack Router updates `src/routeTree.gen.ts`.
- No manual route tree edits unless the generator is unavailable and the route is missing at runtime.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm test src/lib/wechat-import/url.test.ts src/lib/wechat-import/dom.test.ts src/lib/wechat-import/style-fingerprint.test.ts src/lib/wechat-import/theme-css.test.ts src/lib/wechat-import/index.test.ts src/services/import-wechat.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS or only pre-existing warnings unrelated to changed files. If changed files fail, fix them before continuing.

- [ ] **Step 4: Run build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Start dev server**

Run:

```bash
pnpm dev
```

Expected: server starts on `http://localhost:2663`.

- [ ] **Step 6: Manual UI check**

Open `http://localhost:2663`, then:

1. Open the markdown style menu.
2. Click `从公众号生成主题...`.
3. Verify the dialog rejects `https://example.com/demo`.
4. Paste a public `https://mp.weixin.qq.com/s/...` article URL.
5. Click `导入并生成主题`.
6. Confirm a new file appears with frontmatter, title, source quote, and Markdown body.
7. Confirm the generated theme appears under imported styles and is selected.
8. Confirm existing WeChat copy still works from the preview.

- [ ] **Step 7: Commit verification fixes**

If verification required changes in already planned feature files, stage only the files touched by this plan that changed during verification. The expected feature file set is:

- `src/lib/wechat-import/types.ts`
- `src/lib/wechat-import/url.ts`
- `src/lib/wechat-import/url.test.ts`
- `src/lib/wechat-import/dom.ts`
- `src/lib/wechat-import/dom.test.ts`
- `src/lib/wechat-import/style-fingerprint.ts`
- `src/lib/wechat-import/style-fingerprint.test.ts`
- `src/lib/wechat-import/theme-css.ts`
- `src/lib/wechat-import/theme-css.test.ts`
- `src/lib/wechat-import/index.ts`
- `src/lib/wechat-import/index.test.ts`
- `src/routes/api.import.wechat.ts`
- `src/services/import-wechat.ts`
- `src/services/import-wechat.test.ts`
- `src/lib/actions/import-wechat-article.ts`
- `src/lib/actions/index.ts`
- `src/components/markdown/previewer/action-bar/wechat-style-import-dialog.tsx`
- `src/components/markdown/previewer/action-bar/markdown-style-menu.tsx`

Use this exact staging command when all planned files exist:

```bash
git add src/lib/wechat-import/types.ts src/lib/wechat-import/url.ts src/lib/wechat-import/url.test.ts src/lib/wechat-import/dom.ts src/lib/wechat-import/dom.test.ts src/lib/wechat-import/style-fingerprint.ts src/lib/wechat-import/style-fingerprint.test.ts src/lib/wechat-import/theme-css.ts src/lib/wechat-import/theme-css.test.ts src/lib/wechat-import/index.ts src/lib/wechat-import/index.test.ts src/routes/api.import.wechat.ts src/services/import-wechat.ts src/services/import-wechat.test.ts src/lib/actions/import-wechat-article.ts src/lib/actions/index.ts src/components/markdown/previewer/action-bar/wechat-style-import-dialog.tsx src/components/markdown/previewer/action-bar/markdown-style-menu.tsx
git commit -m "fix: stabilize WeChat style importer"
```

If no code changes were required, do not create an empty commit.

## Self-Review

- Spec coverage: URL input, single public WeChat article, Markdown import, generated original `custom:*` theme, source retention, no image mirroring, no batch scraping, and fallback errors are covered.
- Placeholder scan: no unresolved placeholder markers or undefined task references remain in this plan.
- Type consistency: route, service, action, and UI all use `WechatArticleImportResult`; the generated theme flows through `createImportedMarkdownStyle()` and `previewStore.setMarkdownStyle()`.
- Risk note: current repository has pre-existing uncommitted changes and a broken `node_modules` junction path. Before executing, verify whether dependency reinstall is acceptable; if pre-commit hooks still fail from old pnpm junctions, report that separately instead of mixing dependency repair into feature commits.
