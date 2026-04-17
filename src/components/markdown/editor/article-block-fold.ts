import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view'

const readableReferencePattern = /^@组件\[([^\]\n]*)\]\(easymd:block\/([a-z0-9-]+)\)\s*$/
const compactReferencePattern = /^\{\{easymd:block ([^}\n]+)\}\}\s*$/
const attributePattern = /([a-z][\w-]*)=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/gi

type FoldKind = 'block' | 'visual'

interface FoldSummary {
  detail?: string
  id: string
  isEdited: boolean
  kind: FoldKind
  name: string
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {}

  for (const match of source.matchAll(attributePattern)) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return attributes
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/gi, '\'')
    .replace(/&#39;/g, '\'')
}

function stripHtmlTags(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateSummary(value: string): string {
  return value.length > 36 ? `${value.slice(0, 36)}…` : value
}

function getVisualTextDetail(value: string): string | undefined {
  const text = truncateSummary(stripHtmlTags(value))
  return text || undefined
}

function hasStyleAttribute(value: string): boolean {
  return /\bstyle\s*=\s*(?:"[^"]*"|'[^']*')/i.test(value)
}

function getStyledMarkdownSummary(line: string): FoldSummary | null {
  const heading = line.match(/^(#{1,6})[ \t]+/)
  if (heading) {
    const body = line.slice(heading[0].length)
    if (!hasStyleAttribute(body)) {
      return null
    }

    return {
      detail: getVisualTextDetail(body),
      id: `visual-heading-${heading[1].length}`,
      isEdited: true,
      kind: 'visual',
      name: `H${heading[1].length} 样式标题`,
    }
  }

  const listItem = line.match(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/)
  if (listItem) {
    const body = line.slice(listItem[0].length)
    if (!hasStyleAttribute(body)) {
      return null
    }

    return {
      detail: getVisualTextDetail(body),
      id: 'visual-list-item',
      isEdited: true,
      kind: 'visual',
      name: '样式列表',
    }
  }

  return null
}

function getStyledHtmlSummary(line: string): FoldSummary | null {
  if (!hasStyleAttribute(line)) {
    return null
  }

  const htmlElement = line.match(/^<([a-z][\w:-]*)\b[^>]*>([\s\S]*)<\/\1>\s*$/i)
  if (htmlElement) {
    const tagName = htmlElement[1].toLowerCase()
    const label = /^h[1-6]$/.test(tagName)
      ? `${tagName.toUpperCase()} 样式标题`
      : tagName === 'span'
        ? '样式文字'
        : `${tagName} 样式块`

    return {
      detail: getVisualTextDetail(htmlElement[2]),
      id: `visual-html-${tagName}`,
      isEdited: true,
      kind: 'visual',
      name: label,
    }
  }

  const inlineSpan = line.match(/<span\b[^>]*>/i)
  if (inlineSpan && hasStyleAttribute(inlineSpan[0])) {
    const bodyStart = (inlineSpan.index ?? 0) + inlineSpan[0].length
    const bodyEnd = line.toLowerCase().indexOf('</span>', bodyStart)
    const body = bodyEnd === -1 ? '' : line.slice(bodyStart, bodyEnd)

    return {
      detail: getVisualTextDetail(body),
      id: 'visual-inline-span',
      isEdited: true,
      kind: 'visual',
      name: '样式文字',
    }
  }

  return null
}

function getFoldSummary(line: string): FoldSummary | null {
  const readable = line.match(readableReferencePattern)
  if (readable) {
    return {
      id: readable[2],
      isEdited: false,
      kind: 'block',
      name: readable[1] || readable[2],
    }
  }

  const compact = line.match(compactReferencePattern)
  if (compact) {
    const attributes = parseAttributes(compact[1])
    if (!attributes.id) {
      return null
    }

    return {
      id: attributes.id,
      isEdited: Boolean(attributes.source),
      kind: 'block',
      name: attributes.name || attributes.id,
    }
  }

  return getStyledMarkdownSummary(line) ?? getStyledHtmlSummary(line.trim())
}

class ArticleBlockFoldWidget extends WidgetType {
  constructor(
    private readonly lineFrom: number,
    private readonly summary: FoldSummary,
    private readonly expanded: boolean,
  ) {
    super()
  }

  eq(other: ArticleBlockFoldWidget): boolean {
    return (
      other.lineFrom === this.lineFrom
      && other.expanded === this.expanded
      && other.summary.id === this.summary.id
      && other.summary.isEdited === this.summary.isEdited
      && other.summary.kind === this.summary.kind
      && other.summary.name === this.summary.name
      && other.summary.detail === this.summary.detail
    )
  }

  toDOM(): HTMLElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.easymdBlockFold = 'true'
    button.dataset.easymdFoldKind = this.summary.kind
    button.dataset.lineFrom = String(this.lineFrom)
    button.className = [
      'cm-easymd-block-fold',
      this.summary.kind === 'visual' ? 'cm-easymd-block-fold-visual' : '',
      this.expanded ? 'cm-easymd-block-fold-expanded' : '',
    ].filter(Boolean).join(' ')
    const detail = this.summary.detail ? ` · ${this.summary.detail}` : ''
    const edited = this.summary.kind === 'block' && this.summary.isEdited ? ' · 已编辑' : ''
    button.textContent = this.expanded
      ? `收起${this.summary.kind === 'block' ? '组件' : '样式'}代码 · ${this.summary.name}`
      : `${this.summary.kind === 'block' ? '组件' : '样式'} · ${this.summary.name}${detail}${edited}`
    button.title = this.expanded ? '点击收起源代码' : '点击展开源代码'

    return button
  }

  ignoreEvent(): boolean {
    return false
  }
}

class ArticleBlockFoldPlugin {
  decorations: DecorationSet
  private readonly expandedLines = new Set<number>()

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view)
    }
  }

  toggle(lineFrom: number, view: EditorView) {
    if (this.expandedLines.has(lineFrom)) {
      this.expandedLines.delete(lineFrom)
    }
    else {
      this.expandedLines.add(lineFrom)
    }

    this.decorations = this.buildDecorations(view)
    view.dispatch({})
  }

  private buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()

    for (const range of view.visibleRanges) {
      let position = range.from

      while (position <= range.to) {
        const line = view.state.doc.lineAt(position)
        const summary = getFoldSummary(line.text)

        if (summary) {
          const expanded = this.expandedLines.has(line.from)
          const widget = new ArticleBlockFoldWidget(line.from, summary, expanded)

          if (expanded) {
            builder.add(line.from, line.from, Decoration.widget({ side: -1, widget }))
          }
          else {
            builder.add(line.from, line.to, Decoration.replace({ widget }))
          }
        }

        if (line.to >= range.to) {
          break
        }

        position = line.to + 1
      }
    }

    return builder.finish()
  }
}

const articleBlockFoldPlugin = ViewPlugin.fromClass(ArticleBlockFoldPlugin, {
  decorations: plugin => plugin.decorations,
  eventHandlers: {
    click(event, view) {
      const target = event.target as HTMLElement | null
      const button = target?.closest<HTMLButtonElement>('[data-easymd-block-fold="true"]')
      if (!button) {
        return false
      }

      const lineFrom = Number(button.dataset.lineFrom)
      const plugin = view.plugin(articleBlockFoldPlugin)
      if (Number.isFinite(lineFrom) && plugin) {
        plugin.toggle(lineFrom, view)
      }

      event.preventDefault()
      return true
    },
  },
})

export const articleBlockFoldExtension = [
  articleBlockFoldPlugin,
  EditorView.theme({
    '.cm-easymd-block-fold': {
      alignItems: 'center',
      background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
      border: '1px solid color-mix(in srgb, var(--primary) 34%, transparent)',
      borderRadius: '6px',
      color: 'var(--foreground)',
      display: 'inline-flex',
      font: 'inherit',
      fontSize: '12px',
      gap: '6px',
      lineHeight: '1.6',
      margin: '2px 0',
      maxWidth: '100%',
      overflow: 'hidden',
      padding: '2px 8px',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    '.cm-easymd-block-fold::before': {
      background: 'var(--primary)',
      borderRadius: '999px',
      content: '""',
      display: 'inline-block',
      height: '6px',
      width: '6px',
    },
    '.cm-easymd-block-fold-visual': {
      background: 'color-mix(in srgb, #f59e0b 12%, transparent)',
      borderColor: 'color-mix(in srgb, #f59e0b 34%, transparent)',
    },
    '.cm-easymd-block-fold-visual::before': {
      background: '#f59e0b',
    },
    '.cm-easymd-block-fold-expanded': {
      background: 'color-mix(in srgb, var(--muted) 70%, transparent)',
      borderColor: 'var(--border)',
      marginRight: '8px',
    },
  }),
]
