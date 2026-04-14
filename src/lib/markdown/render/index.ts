import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
import { codeThemeIds } from '@/themes/code-theme'
import { infographicPaletteIds, infographicThemeIds } from '@/themes/infographic-theme'
import { markdownStyleIds } from '@/themes/markdown-style'
import { mermaidThemeIds } from '@/themes/mermaid-theme'
import { INPUT_SIZE_ERROR, MAX_INPUT_SIZE } from '../constants'
import { platforms } from './adapters'

export const platformSchema = z.enum(platforms)
export const markdownStyleSchema = z.enum(markdownStyleIds)
export const markdownStyleInputSchema = z.union([markdownStyleSchema, z.literal('')])
export const codeThemeSchema = z.enum(codeThemeIds)
export const mermaidThemeSchema = z.enum(mermaidThemeIds)
export const infographicThemeSchema = z.enum(infographicThemeIds)
export const infographicPaletteSchema = z.enum(infographicPaletteIds)

export const renderDefinition = {
  name: 'render',
  title: 'Render Markdown to HTML',
  description: 'Render Markdown into platform-friendly HTML with inline CSS for rich text editors.',
  inputSchema: z.object({
    markdown: z.string().max(MAX_INPUT_SIZE, INPUT_SIZE_ERROR).describe('Markdown source text to render.'),
    markdownStyle: markdownStyleInputSchema.optional().default('ayu-light').describe('Markdown style id. Pass an empty string to skip built-in styles.'),
    codeTheme: codeThemeSchema.optional().default('kimbie-light').describe('Code block highlight theme id.'),
    mermaidTheme: mermaidThemeSchema.optional().default('').describe('Mermaid theme id. Use an empty string for the default theme.'),
    infographicTheme: infographicThemeSchema.optional().default('default').describe('Infographic theme id.'),
    infographicPalette: infographicPaletteSchema.optional().default('antv').describe('Infographic palette id.'),
    customCss: z.string().max(250000, 'Custom CSS cannot exceed 250000 characters').optional().default('').describe('Custom CSS applied after the selected theme. Scope selectors under #easymd, for example: #easymd h1 { color: red; }'),
    enableFootnoteLinks: z.boolean().optional().default(true).describe('Whether to transform links into footnotes when supported.'),
    openLinksInNewWindow: z.boolean().optional().default(true).describe('Whether to add target="_blank" to external links.'),
    platform: platformSchema.optional().default('html').describe('Target platform used for output-specific adaptations.'),
    footnoteLabel: z.string().max(50).optional().default('Footnotes').describe('Footnote section title.'),
    referenceTitle: z.string().max(50).optional().default('References').describe('Reference section title for collected links.'),
  }),
  outputSchema: z.object({
    result: z.string().describe('Rendered HTML fragment with inline CSS.'),
  }),
}

export async function render(input: z.infer<typeof renderDefinition.inputSchema>) {
  try {
    const { render } = await import('./html')
    return render(input)
  }
  catch (error) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', error)
  }
}

export const handler = os
  .route({
    method: 'POST',
    path: '/markdown/render',
  })
  .input(renderDefinition.inputSchema)
  .output(renderDefinition.outputSchema)
  .handler(async ({ input }) => ({
    result: await render(input),
  }))
