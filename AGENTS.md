# AGENTS.md

本文档为 AI 编程助手提供 easymd 项目协作说明。

## 语言

- 始终使用简体中文交流
- 注释与说明优先保持简洁

## 项目概览

easymd 是一个面向微信公众号和知乎排版的 Markdown 工具。

- 保留微信公众号、知乎、HTML 输出链路
- 保留 MCP 协议能力
- 已移除掘金支持
- 已移除 REST API、Scalar 文档页、PWA、文件关联与命令面板

## 常用命令

```bash
pnpm dev
pnpm build
pnpm lint:fix
pnpm test
```

## 代码约定

- 使用 `@/` 路径别名
- 优先使用 `import type`
- 避免引入新的全局状态，除非确有必要
- UI 改动尽量延续现有按钮栏与编辑/预览布局

## 路由说明

- `src/routeTree.gen.ts` 由 TanStack Router 生成
- 常规情况下不要手动修改
- 如果本地缺少生成工具且必须收口失效路由，可以临时手动维护

## 当前产品边界

- 普通按钮栏是主要操作入口
- `/docs/mcp` 与 `/docs/skill` 继续保留
- `/mcp` 继续提供 MCP Server 能力
- 不再维护 `/docs` Scalar 页面和 `/api/*` 的 REST API
