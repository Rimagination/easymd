---
name: easymd
description: "Use when Codex needs easymd for 微信公众号/知乎文章排版、Markdown/HTML 精排、富文本复制、SVG 信息图、封面交付、MCP render/parse/lint/extract，或上传草稿路由。"
---

# easymd Suite Router

`easymd` 是 Liang 的公众号与知乎发布工作流总入口。先路由，再执行：写作、排版、封面、预览、复制、上传和 MCP 确定性转换都从这里分流。

## 路由优先

| 用户需求                                                 | 默认委派                              | 交付物                          |
| -------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| 普通公众号写作、改写、结构、标题、语气、故事化           | `$wxwrite`                            | Markdown 草稿或修订稿           |
| 科技评论、深度科技图文、技术机制与现实影响解读           | `$tech-review`                        | 有来源的图文稿或选题方案        |
| Markdown 清理、HTML 渲染、富文本复制、主题排版、格式转换 | `$mdstyle` 或 easymd MCP              | 可复制 HTML / Markdown / 纯文本 |
| 公众号封面、首图、AI4S/THU 紫色封面                      | `$wxcover`                            | 封面图路径和使用建议            |
| 上传、推送、提交到公众号草稿箱                           | `$wxpush`                             | 明确用户授权后的上传结果        |
| 组件化公众号精排、SVG 信息图、复杂文章包装               | 本 skill + `references/` + easymd MCP | 精排 HTML 和必要素材            |

如果任务跨多个阶段，维护一个 handoff manifest：`title`、`summary`、`markdownPath`、`htmlPath`、`assets`、`coverPath`、`target`、`stage`、`nextAction`。

## 产品边界

| 产品         | 面向谁       | 做什么                                                       |
| ------------ | ------------ | ------------------------------------------------------------ |
| easymd Web   | 普通用户     | 编辑 Markdown、预览主题、复制到公众号/知乎/富文本编辑器      |
| easymd Skill | Agent        | 理解文章、设计结构、选择组件、生成 SVG 信息图、交付精排 HTML |
| easymd MCP   | Agent/工具链 | 提供 `render`、`parse`、`lint`、`extract` 等确定性能力       |

平台只使用 `html`、`wechat`、`zhihu`。不要使用已移除的平台、旧 REST API 示例或掘金链路。

## 资料包

只有在需要正式文章精排、组件化包装或 SVG 信息图时读取资料包：

1. `references/components.md`：标题、卡片、callout、金句框、步骤、信息图、结尾组件。
2. `references/article-template.html`：公众号文章 HTML 基础结构、主题变量和内联样式写法。
3. `references/delivery-checklist.md`：最终交付自检清单。

简单的 Markdown 渲染、HTML 转 Markdown、格式修复、纯文本提取，优先直接用 MCP 或对应子 skill，不加载整套资料包。

## 执行流程

1. 判断目标：写作、排版、封面、上传、确定性转换，还是正式公众号精排。
2. 能委派给窄技能时先委派；需要组合交付时由 `easymd` 维护 manifest。
3. 对确定性转换，优先调用 easymd MCP：`lint` 修复 Markdown，`render` 生成 HTML，`parse` 从 HTML 回转 Markdown，`extract` 提取纯文本。
4. 对正式公众号精排，先读原文并提炼标题、导读、核心论点和读者行动；再读取 `references/components.md`，选择 4 到 8 个组件组合，不要整篇只套一个模板。
5. 需要信息图时生成内联 SVG；SVG 必须可独立复制，文字不贴边，移动端宽度友好。
6. 使用 `references/article-template.html` 组织最终 HTML，尽量内联样式，避免依赖外部 CSS。
7. 交付前按 `references/delivery-checklist.md` 自检。

## 推荐参数

| 场景                 | platform | markdownStyle            | codeTheme                 |
| -------------------- | -------- | ------------------------ | ------------------------- |
| 微信公众号正式文章   | `wechat` | `thu-classic` 或用户指定 | `kimbie-light`            |
| 知乎专栏             | `zhihu`  | `ayu-light` 或用户指定   | `kimbie-light`            |
| 通用网页 / HTML 导出 | `html`   | 用户指定或 `ayu-light`   | 用户指定或 `kimbie-light` |

## 微信文章引用

- 从可编辑的公众号 Markdown 初稿开始使用引用格式。交给 `$wxwrite` 或 `$tech-review` 写作时明确传递这项要求；Humanizer Pass 保留角标与文末资料表。
- 正文在有来源的事实后写 `<sup>[1]</sup>`；文末写 `## 参考资料` 或 `## 参考文献`，再用编号列表逐条写出作者或机构、标题、日期或 DOI（已知时）和完整可见网址。编号按首次出现顺序排列，同一来源复用编号；没有外部来源时不虚构资料表。
- 草稿示例：`研究结论<sup>[1]</sup>`；文末 `1. 作者. 标题. 年份. https://example.com/paper`。来源网址写成普通文字，不用 Markdown 超链接、HTML `<a>` 或行内代码。把收到的来源超链接改成此格式后再交付草稿。
- 渲染微信稿时保留已有编号表，将网址输出为可复制明文，避免重复生成资料表。`thu-classic` 优先检查角标、编号对应关系和长网址换行。

## 没有 MCP 时

继续完成任务，不要中断：

1. 正式精排仍然读取 `references/` 资料包。
2. 手写可复制 HTML，使用 `article-template.html` 的结构和组件样式。
3. 如需用户可视化微调，再引导打开 `https://easymd.vercel.app` 或本地 `http://localhost:2663`。

## 网页预览交接

用户说“把这份 Markdown 放到网页预览/编辑”时，可直接使用一句话路由：

> 打开 easymd Web，导入这份 Markdown；同次选择的本地图片会自动上传并替换相对路径，完成后在网页中预览、编辑，最后导出 Markdown。

交接时保留原文结构和图片引用；YAML frontmatter 仅作为元数据保留，预览与复制默认隐藏，不要把它当成文章正文。只有用户明确要求文章化展示时，才清理 YAML frontmatter 或改写标题。Web 编辑内容保存在浏览器本地，交付文件必须通过“导出 Markdown”拿回本机。

## 边界

- 不要向用户索要 `AppSecret`、`access_token`、cookies、公众号后台登录地址或其它凭据。
- 上传草稿必须由用户明确要求；不要因为完成渲染就自动上传。
- 最终交付应是可复制 HTML、Markdown、素材路径或 manifest；不要把网站截图当成最终稿。
- 说明和注释保持简洁，优先使用简体中文。
