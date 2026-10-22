/**
 * DSH 适配入口：只导出确定性 Markdown 能力，不引入 UI / ORPC / 路由。
 * 由 dsh-build/build.mjs 用 esbuild 打成单文件，供 dsh-easymd 插件在 Host 进程内注册工具。
 */
import { extract } from '@/lib/markdown/extract/text'
import { lint } from '@/lib/markdown/lint/markdown'
import { parse } from '@/lib/markdown/parse/html'
import { render } from '@/lib/markdown/render/html'
import { codeThemeIds } from '@/themes/code-theme'
import { infographicPaletteIds, infographicThemeIds } from '@/themes/infographic-theme'
import { markdownStyleIds } from '@/themes/markdown-style'
import { mermaidThemeIds } from '@/themes/mermaid-theme'

export {
  codeThemeIds,
  extract,
  infographicPaletteIds,
  infographicThemeIds,
  lint,
  markdownStyleIds,
  mermaidThemeIds,
  parse,
  render,
}

export type { RenderOptions } from '@/lib/markdown/render/html'
