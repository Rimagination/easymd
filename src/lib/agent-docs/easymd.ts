export const EASYMD_SKILL_INSTALL_COMMAND = 'npx skills add Rimagination/easymd --skill easymd'

export const EASYMD_SUPPORTED_PLATFORMS = ['html', 'wechat', 'zhihu'] as const

export const EASYMD_PRODUCT_BOUNDARY = [
  {
    id: 'web',
    title: 'easymd Web',
    role: '普通用户使用的可视化 Markdown 排版工作台，负责编辑、预览、主题调试和复制到富文本编辑器。',
  },
  {
    id: 'skill',
    title: 'easymd Skill',
    role: 'Agent 使用的公众号文章制作产品，负责理解文章意图、选择组件、生成 SVG 信息图和交付精排 HTML。',
  },
  {
    id: 'mcp',
    title: 'easymd MCP',
    role: '确定性能力层，供 Skill 或其他 Agent 调用 render、parse、lint、extract 等可测试工具。',
  },
] as const

export const EASYMD_SKILL_REFERENCES = [
  {
    path: 'skills/easymd/references/components.md',
    title: '组件化精排组件库',
    description: '给 Agent 使用的公众号组件、适用场景和组合规则。',
  },
  {
    path: 'skills/easymd/references/article-template.html',
    title: '文章 HTML 模板',
    description: '给 Agent 生成独立公众号 HTML 时使用的基础结构和样式变量。',
  },
  {
    path: 'skills/easymd/references/delivery-checklist.md',
    title: '交付检查清单',
    description: '给 Agent 在交付前检查标题、图片、SVG、表格和复制风险。',
  },
] as const

export const EASYMD_MCP_TOOLS = [
  {
    name: 'render',
    title: '渲染 Markdown',
    description: '将 Markdown 渲染为带内联样式的 HTML，适合复制到微信公众号、知乎或通用富文本编辑器。',
  },
  {
    name: 'parse',
    title: 'HTML 转 Markdown',
    description: '把已有 HTML 片段转换回 Markdown，适合导入网页内容、清理富文本或迁移文章。',
  },
  {
    name: 'lint',
    title: '修复 Markdown',
    description: '用 markdownlint 规则整理 Markdown 结构，修复标题、列表、空行和行尾空格等格式问题。',
  },
  {
    name: 'extract',
    title: '提取纯文本',
    description: '从 Markdown 中提取无格式纯文本，适合摘要、字数统计、口播稿和二次分析。',
  },
] as const
