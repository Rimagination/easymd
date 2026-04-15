import type { ArticleBlockCategory, ArticleBlockTemplate } from '@/config/article-blocks'
/* eslint-disable react-dom/no-dangerously-set-innerhtml -- Previews render trusted local article block templates. */
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { articleBlockCategories, articleBlockTemplates } from '@/config/article-blocks'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { getImportEditorView } from './editor/file-import'

interface ArticleBlockLibraryProps {
  className?: string
  mode?: 'panel' | 'popover'
  onInserted?: () => void
}

const defaultCategory: ArticleBlockCategory = 'title'

function buildInsertion(markdown: string, from: number, to: number, doc: string): string {
  const before = doc.slice(0, from)
  const after = doc.slice(to)
  const prefix = from === 0
    ? ''
    : before.endsWith('\n\n')
      ? ''
      : before.endsWith('\n')
        ? '\n'
        : '\n\n'
  const suffix = to === doc.length
    ? '\n'
    : after.startsWith('\n\n')
      ? ''
      : after.startsWith('\n')
        ? '\n'
        : '\n\n'

  return `${prefix}${markdown.trim()}${suffix}`
}

function insertArticleBlock(template: ArticleBlockTemplate, onInserted?: () => void) {
  const view = getImportEditorView()
  if (!view) {
    toast.error('编辑器还没有准备好，请先点击正文区域')
    return
  }

  const selection = view.state.selection.main
  const doc = view.state.doc.toString()
  const insertion = buildInsertion(template.markdown, selection.from, selection.to, doc)

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: insertion },
    selection: { anchor: selection.from + insertion.length },
  })
  view.focus()
  toast.success(`已插入：${template.name}`)
  trackEvent('editor', 'insert-block', 'library', {
    block: template.id,
    category: template.category,
  })
  onInserted?.()
}

function ArticleBlockCard({
  template,
  onInserted,
}: {
  template: ArticleBlockTemplate
  onInserted?: () => void
}) {
  const handleInsert = () => insertArticleBlock(template, onInserted)

  return (
    <article
      role="button"
      tabIndex={0}
      title={`${template.name}：${template.description}`}
      aria-label={`插入${template.name}`}
      className={`
        group cursor-pointer rounded-none border border-border/80 bg-background
        p-1.5 text-left transition-colors
        hover:border-primary/50 hover:bg-muted/70
        focus-visible:border-ring focus-visible:ring-1
        focus-visible:ring-ring/50 focus-visible:outline-none
      `}
      onClick={handleInsert}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleInsert()
        }
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor: template.accent,
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-medium">{template.name}</span>
        </span>
        <Plus className={`
          size-3.5 text-muted-foreground transition-colors
          group-hover:text-primary
        `}
        />
      </div>

      <div
        className={`
          easymd-block-preview mt-1 overflow-hidden border border-border/60
          bg-white p-1 shadow-inner
        `}
      >
        <div
          className={`
            easymd-block-preview-content pointer-events-none origin-top-left
          `}
          dangerouslySetInnerHTML={{ __html: template.markdown }}
        />
      </div>
    </article>
  )
}

export function ArticleBlockLibrary({
  className,
  mode = 'panel',
  onInserted,
}: ArticleBlockLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<ArticleBlockCategory>(defaultCategory)
  const isPanel = mode === 'panel'
  const visibleTemplates = useMemo(
    () => articleBlockTemplates.filter(template => template.category === activeCategory),
    [activeCategory],
  )
  const categoryCounts = useMemo(
    () => articleBlockTemplates.reduce<Record<ArticleBlockCategory, number>>((counts, template) => {
      counts[template.category] += 1
      return counts
    }, {
      title: 0,
      card: 0,
      image: 0,
      follow: 0,
      interaction: 0,
    }),
    [],
  )
  const activeCategoryName = articleBlockCategories.find(
    category => category.id === activeCategory,
  )?.name

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-background',
        isPanel && 'border-r border-border/70',
        className,
      )}
    >
      <header className={cn(
        'shrink-0 border-b border-border/70',
        isPanel
          ? 'space-y-2 p-2.5'
          : 'space-y-2 p-2',
      )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">组件</p>
          <span className="text-[10px] text-muted-foreground">
            {activeCategoryName}
            {' '}
            ·
            {visibleTemplates.length}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {articleBlockCategories.map(category => (
            <button
              key={category.id}
              type="button"
              className={cn(
                `
                  rounded-none border px-1.5 py-1 text-left text-[11px]
                  transition-colors
                `,
                activeCategory === category.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : `
                    border-border bg-background
                    hover:bg-muted
                  `,
              )}
              onClick={() => setActiveCategory(category.id)}
              aria-pressed={activeCategory === category.id}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="truncate font-medium">{category.name}</span>
                <span className="text-[9px] opacity-70">{categoryCounts[category.id]}</span>
              </span>
            </button>
          ))}
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className={cn(
          'grid gap-1.5',
          isPanel
            ? 'p-2'
            : 'px-2 pb-2',
        )}
        >
          {visibleTemplates.map(template => (
            <ArticleBlockCard
              key={template.id}
              template={template}
              onInserted={onInserted}
            />
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
