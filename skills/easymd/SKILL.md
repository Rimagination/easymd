---
name: easymd
description: "Use when Codex needs easymd for 微信公众号/知乎文章排版、Markdown/HTML 精排、富文本复制、SVG 信息图、封面交付、MCP render/parse/lint/extract，或上传草稿路由。"
---

# easymd Suite Router

`easymd` 是 Liang 的公众号与知乎发布工作流总入口。先路由，再执行：写作、排版、封面、预览、复制、上传和 MCP 确定性转换都从这里分流。

## 路由优先

| 用户需求                                                 | 默认委派                              | 交付物                          |
| -------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| 写作、改写、结构、标题、语气、故事化                     | `$wxwrite`                            | Markdown 草稿或修订稿           |
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

| 场景                 | platform | markdownStyle             | codeTheme                 |
| -------------------- | -------- | ------------------------- | ------------------------- |
| 微信公众号正式文章   | `wechat` | `professional` 或用户指定 | `kimbie-light`            |
| 知乎专栏             | `zhihu`  | `ayu-light` 或用户指定    | `kimbie-light`            |
| 通用网页 / HTML 导出 | `html`   | 用户指定或 `ayu-light`    | 用户指定或 `kimbie-light` |

## 没有 MCP 时

继续完成任务，不要中断：

1. 正式精排仍然读取 `references/` 资料包。
2. 手写可复制 HTML，使用 `article-template.html` 的结构和组件样式。
3. 如需用户可视化微调，再引导打开 `https://easymd.vercel.app` 或本地 `http://localhost:2663`。

## 边界

- 不要向用户索要 `AppSecret`、`access_token`、cookies、公众号后台登录地址或其它凭据。
- 上传草稿必须由用户明确要求；不要因为完成渲染就自动上传。
- 最终交付应是可复制 HTML、Markdown、素材路径或 manifest；不要把网站截图当成最终稿。
- 说明和注释保持简洁，优先使用简体中文。
