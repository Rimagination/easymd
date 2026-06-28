import type { PageMeta } from '@/lib/seo'
import { createFileRoute } from '@tanstack/react-router'
import { Terminal } from 'lucide-react'

import { CopyButton } from '@/components/copy-button'
import PageDialog from '@/components/dialog/page'
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import {
  EASYMD_PRODUCT_BOUNDARY,
  EASYMD_SKILL_INSTALL_COMMAND,
  EASYMD_SKILL_REFERENCES,
} from '@/lib/agent-docs/easymd'
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
  const installCommand = EASYMD_SKILL_INSTALL_COMMAND

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

          <Item variant="outline">
            <ItemContent>
              <ItemTitle>两个产品，一套能力</ItemTitle>
              <ItemDescription>
                Web 给普通用户可视化编辑，Skill 给 Agent 制作精排文章，MCP 负责可测试的确定性转换。
              </ItemDescription>
            </ItemContent>
          </Item>

          <div className="grid gap-2">
            {EASYMD_PRODUCT_BOUNDARY.map(item => (
              <div key={item.id} className="rounded-md border px-3 py-2">
                <div className="text-sm font-medium">{item.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{item.role}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Skill 资料包</p>
            <div className="grid gap-2">
              {EASYMD_SKILL_REFERENCES.map(reference => (
                <div
                  key={reference.path}
                  className="rounded-md border px-3 py-2"
                >
                  <div className="text-sm font-medium">{reference.title}</div>
                  <code className="text-xs text-muted-foreground">{reference.path}</code>
                  <p className="mt-1 text-xs text-muted-foreground">{reference.description}</p>
                </div>
              ))}
            </div>
          </div>

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
