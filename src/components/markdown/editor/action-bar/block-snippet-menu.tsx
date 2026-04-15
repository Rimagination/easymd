import type { ArticleBlockCategory, ArticleBlockTemplate } from '@/config/article-blocks'
import { LayoutTemplate, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { articleBlockCategories, articleBlockTemplates } from '@/config/article-blocks'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { getImportEditorView } from '../file-import'

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

export function BlockSnippetMenu() {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<ArticleBlockCategory>(defaultCategory)

  const visibleTemplates = useMemo(
    () => articleBlockTemplates.filter(template => template.category === activeCategory),
    [activeCategory],
  )

  const insertTemplate = (template: ArticleBlockTemplate) => {
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
    setOpen(false)
    toast.success(`已插入：${template.name}`)
    trackEvent('editor', 'insert-block', 'toolbar', {
      block: template.id,
      category: template.category,
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={(
            <PopoverTrigger
              render={(
                <Button variant="ghost" size="icon" aria-label="插入组件">
                  <LayoutTemplate className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>插入组件</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[min(25rem,calc(100vw-2rem))] gap-3 p-3"
      >
        <PopoverHeader>
          <PopoverTitle>组件库</PopoverTitle>
          <PopoverDescription>
            像搭积木一样插入标题、卡片、图片和关注引导，适合公众号与知乎图文排版。
          </PopoverDescription>
        </PopoverHeader>

        <div className="grid grid-cols-4 gap-1">
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

        <ScrollArea className="h-80 pr-2">
          <div className="grid gap-2">
            {visibleTemplates.map((template) => {
              const Icon = template.icon

              return (
                <button
                  key={template.id}
                  type="button"
                  className={`
                    group rounded-none border border-border bg-background p-3
                    text-left transition-colors
                    hover:border-primary/50 hover:bg-muted/70
                  `}
                  onClick={() => insertTemplate(template)}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`
                        flex size-9 shrink-0 items-center justify-center
                        rounded-none border
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
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          可编辑
                        </Badge>
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {template.description}
                      </span>
                    </span>
                    <Plus className={`
                      mt-1 size-4 text-muted-foreground transition-colors
                      group-hover:text-primary
                    `}
                    />
                  </span>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
