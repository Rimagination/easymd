import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  EASYMD_MCP_TOOLS,
  EASYMD_PRODUCT_BOUNDARY,
  EASYMD_SKILL_INSTALL_COMMAND,
  EASYMD_SKILL_REFERENCES,
  EASYMD_SUPPORTED_PLATFORMS,
} from './easymd'

const skillMarkdown = readFileSync(
  new URL('../../../skills/easymd/SKILL.md', import.meta.url),
  'utf8',
)

describe('easymd agent metadata', () => {
  it('uses the real public skill install command', () => {
    expect(EASYMD_SKILL_INSTALL_COMMAND).toBe('npx skills add Rimagination/easymd --skill easymd')
  })

  it('lists only currently supported render platforms', () => {
    expect(EASYMD_SUPPORTED_PLATFORMS).toEqual(['html', 'wechat', 'zhihu'])
    expect(EASYMD_SUPPORTED_PLATFORMS).not.toContain('juejin')
  })

  it('documents the four MCP tools exposed by easymd', () => {
    expect(EASYMD_MCP_TOOLS.map(tool => tool.name)).toEqual(['render', 'parse', 'lint', 'extract'])
    for (const tool of EASYMD_MCP_TOOLS) {
      expect(tool.title.length).toBeGreaterThan(0)
      expect(tool.description.length).toBeGreaterThan(16)
      expect(`${tool.title}${tool.description}`).not.toContain('\uFFFD')
    }
  })

  it('treats the website and skill as separate products with a shared capability layer', () => {
    expect(EASYMD_PRODUCT_BOUNDARY.map(item => item.id)).toEqual(['web', 'skill', 'mcp'])
    expect(EASYMD_PRODUCT_BOUNDARY.find(item => item.id === 'web')?.role).toContain('普通用户')
    expect(EASYMD_PRODUCT_BOUNDARY.find(item => item.id === 'skill')?.role).toContain('Agent')
    expect(EASYMD_PRODUCT_BOUNDARY.find(item => item.id === 'mcp')?.role).toContain('确定性')
    expect(EASYMD_PRODUCT_BOUNDARY.map(item => item.role).join('\n')).not.toContain('\uFFFD')
  })

  it('ships a standalone skill reference pack for article composition', () => {
    expect(EASYMD_SKILL_REFERENCES.map(reference => reference.path)).toEqual([
      'skills/easymd/references/components.md',
      'skills/easymd/references/article-template.html',
      'skills/easymd/references/delivery-checklist.md',
    ])

    for (const reference of EASYMD_SKILL_REFERENCES) {
      const text = readFileSync(new URL(`../../../${reference.path}`, import.meta.url), 'utf8')
      expect(text.length).toBeGreaterThan(400)
      expect(text).toContain(reference.title)
    }
  })

  it('keeps docs metadata ready for rendering install and MCP tool lists', () => {
    expect(EASYMD_SKILL_INSTALL_COMMAND).toContain('Rimagination/easymd')
    expect(EASYMD_MCP_TOOLS.every(tool => ['render', 'parse', 'lint', 'extract'].includes(tool.name))).toBe(true)
  })

  it('keeps the skill workflow aligned with current product boundaries', () => {
    expect(skillMarkdown).toContain('## 路由优先')
    expect(skillMarkdown).toContain('## 产品边界')
    expect(skillMarkdown).toContain('easymd Web')
    expect(skillMarkdown).toContain('easymd Skill')
    expect(skillMarkdown).toContain('easymd MCP')
    expect(skillMarkdown).toContain('references/components.md')
    expect(skillMarkdown).toContain('组件化公众号精排')
    expect(skillMarkdown).toContain('微信公众号')
    expect(skillMarkdown).toContain('优先调用 easymd MCP')
    expect(skillMarkdown).not.toContain('\uFFFD')
    expect(skillMarkdown).not.toMatch(/juejin|api\/markdown|curl -X POST/)
  })
})
