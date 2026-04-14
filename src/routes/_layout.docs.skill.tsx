import type { PageMeta } from '@/lib/seo'
import { createFileRoute } from '@tanstack/react-router'
import { Terminal } from 'lucide-react'

import { CopyButton } from '@/components/copy-button'
import PageDialog from '@/components/dialog/page'
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { createPageHead } from '@/lib/seo'
import markdown from '@/skills/easymd/SKILL.md?raw'

export const Route = createFileRoute('/_layout/docs/skill')({
  loader: () => {
    const meta: PageMeta = {
      title: '技能',
      description: '让 AI 助手掌握 easymd 的 Markdown 排版技能',
    }
    return { markdown, meta }
  },
  head: ({ loaderData, match }) => loaderData
    ? createPageHead({ pathname: match.pathname, meta: loaderData.meta })
    : {},
  component: SkillModal,
})

function SkillModal() {
  const { markdown, meta } = Route.useLoaderData()
  const installCommand = 'npx skills add your-org/easymd'

  return (
    <PageDialog
      title={meta.title}
      description={meta.description}
      render={(
        <div className="space-y-4">
          <Item variant="outline">
            <ItemMedia variant="icon">
              <Terminal />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>快速安装</ItemTitle>
              <ItemDescription>
                使用
                {' '}
                <code className="bg-muted px-1 py-0.5 font-mono text-foreground">{installCommand}</code>
                {' '}
                即可安装。
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <CopyButton text={installCommand} />
            </ItemActions>
          </Item>

          <div className="relative rounded-md bg-muted">
            <CopyButton text={markdown} className="absolute top-2 right-2" />
            <pre className="overflow-x-auto p-3 text-xs">
              <code>{markdown}</code>
            </pre>
          </div>
        </div>
      )}
    />
  )
}
