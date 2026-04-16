import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view'

const readableReferencePattern = /^@组件\[([^\]\n]*)\]\(easymd:block\/([a-z0-9-]+)\)\s*$/
const compactReferencePattern = /^\{\{easymd:block ([^}\n]+)\}\}\s*$/
const attributePattern = /([a-z][\w-]*)=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/gi

interface BlockSummary {
  id: string
  isEdited: boolean
  name: string
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {}

  for (const match of source.matchAll(attributePattern)) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return attributes
}

function getBlockSummary(line: string): BlockSummary | null {
  const readable = line.match(readableReferencePattern)
  if (readable) {
    return {
      id: readable[2],
      isEdited: false,
      name: readable[1] || readable[2],
    }
  }

  const compact = line.match(compactReferencePattern)
  if (!compact) {
    return null
  }

  const attributes = parseAttributes(compact[1])
  if (!attributes.id) {
    return null
  }

  return {
    id: attributes.id,
    isEdited: Boolean(attributes.source),
    name: attributes.name || attributes.id,
  }
}

class ArticleBlockFoldWidget extends WidgetType {
  constructor(
    private readonly lineFrom: number,
    private readonly summary: BlockSummary,
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
      && other.summary.name === this.summary.name
    )
  }

  toDOM(): HTMLElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.easymdBlockFold = 'true'
    button.dataset.lineFrom = String(this.lineFrom)
    button.className = this.expanded
      ? 'cm-easymd-block-fold cm-easymd-block-fold-expanded'
      : 'cm-easymd-block-fold'
    button.textContent = this.expanded
      ? `收起组件 · ${this.summary.name}`
      : `组件 · ${this.summary.name}${this.summary.isEdited ? ' · 已编辑' : ''}`
    button.title = this.expanded ? '点击收起短代码' : '点击展开短代码'

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
        const summary = getBlockSummary(line.text)

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
    '.cm-easymd-block-fold-expanded': {
      background: 'color-mix(in srgb, var(--muted) 70%, transparent)',
      borderColor: 'var(--border)',
      marginRight: '8px',
    },
  }),
]
