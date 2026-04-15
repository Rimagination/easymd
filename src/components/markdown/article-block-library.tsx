import type { ArticleBlockCategory, ArticleBlockTemplate } from '@/config/article-blocks'
/* eslint-disable react-dom/no-dangerously-set-innerhtml -- Previews render trusted local article block templates. */
import { Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
  const Icon = template.icon

  const handleInsert = () => insertArticleBlock(template, onInserted)

  return (
    <article
      role="button"
      tabIndex={0}
      className={`
        group cursor-pointer rounded-none border border-border bg-background
        p-2.5 text-left transition-colors
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
      <div className="flex items-center gap-2">
        <span
          className={`
            flex size-8 shrink-0 items-center justify-center rounded-none border
          `}
          style={{
            backgroundColor: `${template.accent}14`,
            borderColor: `${template.accent}55`,
            color: template.accent,
          }}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold">{template.name}</span>
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              插入
            </Badge>
          </span>
          <span className={`
            mt-0.5 block truncate text-[11px] text-muted-foreground
          `}
          >
            {template.description}
          </span>
        </span>
        <Plus className={`
          size-4 text-muted-foreground transition-colors
          group-hover:text-primary
        `}
        />
      </div>

      <div
        className={`
          mt-2 h-28 overflow-hidden border border-border/70 bg-white p-2
          shadow-inner
        `}
      >
        <div
          className="pointer-events-none origin-top-left"
          style={{ width: 520, transform: 'scale(0.45)' }}
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
          ? 'space-y-3 p-4'
          : 'space-y-3 p-3 pb-2',
      )}
      >
        <div className="flex items-start gap-2">
          <span className={`
            mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-none
            bg-primary/10 text-primary
          `}
          >
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">组件库</p>
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              参考秀米的素材库思路，点击样式即可插入到当前光标。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {articleBlockCategories.map(category => (
            <button
              key={category.id}
              type="button"
              className={cn(
                `
                  rounded-none border px-2 py-2 text-left text-xs
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
              <span className="block font-medium">{category.name}</span>
              <span className={cn(
                'mt-1 block truncate text-[10px]',
                activeCategory === category.id
                  ? 'text-primary-foreground/80'
                  : 'text-muted-foreground',
              )}
              >
                {category.description}
              </span>
            </button>
          ))}
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className={cn(
          'grid gap-2.5',
          isPanel
            ? 'p-3'
            : 'px-3 pb-3',
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
