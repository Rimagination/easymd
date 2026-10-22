import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// easymd 的 Markdown 管线在打包时被内联为单文件（AGPL-3.0-only）。
// 这里只做两件事：把 4 个确定性能力注册成 DSH 原生工具，并注册 easymd skill。
const packageRoot = dirname(fileURLToPath(import.meta.url))
const enginePath = resolve(packageRoot, 'lib/easymd-markdown.mjs')
// npm tarball 里是 prepack 生成的副本；仓库 checkout 里直接读 skills/ 源文件。
const SKILL_CANDIDATES = [
  resolve(packageRoot, 'skills/easymd/SKILL.md'),
  resolve(packageRoot, '../skills/easymd/SKILL.md'),
]

const SKILL_NOTE = [
  '> DSH 已把 easymd 的确定性能力注册为原生工具：`easymd_render`、`easymd_lint`、`easymd_parse`、`easymd_extract`，',
  '> 以及列出全部主题与可用参数的 `easymd_options`。',
  '> 下文若提到 `mcp__easymd__*` 或 easymd MCP，请改用上面的原生工具，不要再去连远程 MCP。',
  '',
  '',
].join('\n')

const MARKDOWN_STYLES = [
  'thu-classic',
  'qing',
  'ayu-light',
  'bauhaus',
  'blueprint',
  'botanical',
  'coral-notes',
  'green-simple',
  'mdnice-classic',
  'maximalism',
  'neo-brutalism',
  'newsprint',
  'organic',
  'playful-geometric',
  'professional',
  'qingying',
  'retro',
  'sketch',
  'terminal',
]

const CODE_THEMES = [
  'catppuccin-frappe',
  'catppuccin-latte',
  'catppuccin-macchiato',
  'catppuccin-mocha',
  'kimbie-dark',
  'kimbie-light',
  'panda-syntax-dark',
  'panda-syntax-light',
  'paraiso-dark',
  'paraiso-light',
  'rose-pine',
  'rose-pine-dawn',
  'tokyo-night-dark',
  'tokyo-night-light',
]

const PLATFORMS = ['wechat', 'zhihu', 'html']

export const inject = ['skills', 'tools']

export function apply(ctx, config = {}) {
  const wantTools = config.tools !== false
  const wantSkill = config.skill !== false

  let enginePromise
  const engine = () => {
    enginePromise ??= import(pathToFileURL(enginePath).href).catch((error) => {
      enginePromise = undefined
      throw new Error(`easymd 引擎加载失败（${enginePath}）：${error.message}`)
    })
    return enginePromise
  }

  if (wantTools) {
    const textOutput = {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    }

    const tools = [
      {
        name: 'easymd_render',
        description:
          '把 Markdown 渲染成可直接粘贴进微信公众号 / 知乎 / 富文本编辑器的 HTML（CSS 已内联）。'
          + '可选主题见 easymd_options；platform 决定输出适配（wechat 会去掉脚注链接等不适合公众号的结构）。',
        parameters: {
          type: 'object',
          properties: {
            markdown: { type: 'string', description: 'Markdown 原文。' },
            platform: {
              type: 'string',
              enum: PLATFORMS,
              description: '目标平台，默认 html。微信公众号用 wechat，知乎用 zhihu。',
            },
            markdownStyle: {
              type: 'string',
              enum: MARKDOWN_STYLES,
              description: '排版主题 id，默认 ayu-light；传空字符串表示不套内置主题。',
            },
            codeTheme: {
              type: 'string',
              enum: CODE_THEMES,
              description: '代码块高亮主题 id，默认 kimbie-light。',
            },
            mermaidTheme: {
              type: 'string',
              description: 'Mermaid 主题 id，默认空字符串（默认主题）。',
            },
            infographicTheme: {
              type: 'string',
              description: '信息图主题 id，默认 default。',
            },
            infographicPalette: {
              type: 'string',
              description: '信息图配色 id，默认 antv。',
            },
            customCss: {
              type: 'string',
              description: '追加 CSS，作用于 #easymd 作用域，例如 #easymd h1 { color: red; }',
            },
            enableFootnoteLinks: {
              type: 'boolean',
              description: '是否把外链收集成脚注，默认 true（wechat 平台恒不启用）。',
            },
            openLinksInNewWindow: {
              type: 'boolean',
              description: '外链是否加 target="_blank"，默认 true。',
            },
            footnoteLabel: { type: 'string', description: '脚注区标题，默认 Footnotes。' },
            referenceTitle: { type: 'string', description: '参考链接区标题，默认 References。' },
          },
          required: ['markdown'],
          additionalProperties: false,
        },
        output: textOutput,
        timeoutMs: 180000,
        isConcurrencySafe: () => true,
        async execute(args) {
          const { render } = await engine()
          return render({
            markdown: args.markdown,
            platform: args.platform ?? 'html',
            markdownStyle: args.markdownStyle ?? 'ayu-light',
            codeTheme: args.codeTheme ?? 'kimbie-light',
            mermaidTheme: args.mermaidTheme ?? '',
            infographicTheme: args.infographicTheme ?? 'default',
            infographicPalette: args.infographicPalette ?? 'antv',
            customCss: args.customCss ?? '',
            enableFootnoteLinks: args.enableFootnoteLinks ?? true,
            openLinksInNewWindow: args.openLinksInNewWindow ?? true,
            footnoteLabel: args.footnoteLabel ?? 'Footnotes',
            referenceTitle: args.referenceTitle ?? 'References',
          })
        },
      },
      {
        name: 'easymd_lint',
        description: '按 markdownlint 规则校验 Markdown 并自动修复可修复项（标题层级、列表缩进、空行、行尾空格等）。返回修复后的 Markdown。',
        parameters: {
          type: 'object',
          properties: {
            markdown: { type: 'string', description: '待校验并修复的 Markdown 原文。' },
          },
          required: ['markdown'],
          additionalProperties: false,
        },
        output: textOutput,
        timeoutMs: 120000,
        isConcurrencySafe: () => true,
        async execute(args) {
          const { lint } = await engine()
          return lint(args.markdown)
        },
      },
      {
        name: 'easymd_parse',
        description: '把 HTML（整篇或片段）反向转成 Markdown，自动清理不安全标签，适合把网页/公众号文章转回 Markdown 继续编辑。',
        parameters: {
          type: 'object',
          properties: {
            html: { type: 'string', description: '待转换的 HTML 源码。' },
          },
          required: ['html'],
          additionalProperties: false,
        },
        output: textOutput,
        timeoutMs: 120000,
        isConcurrencySafe: () => true,
        async execute(args) {
          const { parse } = await engine()
          return parse(args.html)
        },
      },
      {
        name: 'easymd_extract',
        description: '从 Markdown 中提取纯文本，去掉标题符号、链接、图片、代码块等标记，用于字数统计、摘要或语音稿。',
        parameters: {
          type: 'object',
          properties: {
            markdown: { type: 'string', description: '待提取纯文本的 Markdown 原文。' },
          },
          required: ['markdown'],
          additionalProperties: false,
        },
        output: textOutput,
        timeoutMs: 120000,
        isConcurrencySafe: () => true,
        async execute(args) {
          const { extract } = await engine()
          return extract(args.markdown)
        },
      },
      {
        name: 'easymd_options',
        description: '列出 easymd 当前可用的排版主题、代码高亮主题、Mermaid 主题、信息图主题与配色（JSON）。',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        output: textOutput,
        timeoutMs: 60000,
        isConcurrencySafe: () => true,
        async execute() {
          const m = await engine()
          return JSON.stringify({
            platforms: PLATFORMS,
            markdownStyles: m.markdownStyleIds,
            codeThemes: m.codeThemeIds,
            mermaidThemes: m.mermaidThemeIds,
            infographicThemes: m.infographicThemeIds,
            infographicPalettes: m.infographicPaletteIds,
          }, null, 2)
        },
      },
    ]

    for (const tool of tools) {
      ctx.effect(() => ctx.tools.register(tool))
    }
  }

  if (wantSkill) {
    let skillPath
    let raw
    for (const candidate of SKILL_CANDIDATES) {
      try {
        raw = readFileSync(candidate, 'utf8')
        skillPath = candidate
        break
      }
      catch {
        // npm tarball 与仓库 checkout 的 skill 位置不同，按顺序回退。
      }
    }

    if (!raw) {
      console.warn(`[easymd] 读不到 skill 文件，已尝试：${SKILL_CANDIDATES.join(', ')}`)
    }

    if (raw) {
      const { meta, body } = parseFrontmatter(raw)
      const name = meta.name || 'easymd'
      const description = meta.description
      if (!description) {
        console.warn(`[easymd] skill ${skillPath} 缺少 description`)
      }
      else {
        const skill = {
          name,
          description,
          source: 'runtime',
          content: SKILL_NOTE + body.replace(/^\s+/, ''),
          resourceBase: { kind: 'directory', path: dirname(skillPath) },
        }
        if (meta.whenToUse)
          skill.whenToUse = meta.whenToUse
        ctx.effect(() => ctx.skills.register(skill))
      }
    }
  }
}

/** 读取 SKILL.md 头部那种很小的 YAML 子集（name/description/whenToUse）。 */
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw)
  if (!match)
    return { meta: {}, body: raw }

  const lines = match[1].split(/\r?\n/)
  const meta = {}

  for (let index = 0; index < lines.length; index += 1) {
    const field = /^([\w-]+):(.*)$/.exec(lines[index])
    if (!field)
      continue

    const key = field[1]
    let value = field[2].trim()

    if (/^[>|][+-]?$/.test(value)) {
      const parts = []
      while (index + 1 < lines.length && /^[ \t]+\S/.test(lines[index + 1])) {
        parts.push(lines[index + 1].trim())
        index += 1
      }
      value = (value.startsWith('|') ? parts.join('\n') : parts.join(' ')).trim()
    }
    else {
      value = value.replace(/^(['"])(.*)\1$/, '$2')
    }

    meta[key] = value
  }

  return { meta, body: raw.slice(match[0].length) }
}
