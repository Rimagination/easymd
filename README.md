# easymd

[https://easymd.vercel.app](https://easymd.vercel.app)

本项目基于 [miantiao-me/bm.md](https://github.com/miantiao-me/bm.md) 二次开发，感谢原项目的开源基础。

聚焦微信公众号与知乎排版的 Markdown 工具。

源代码：[Rimagination/easymd](https://github.com/Rimagination/easymd)

---

## 特性

- 实时编辑与预览，适合长文排版
- 一键复制为微信公众号格式
- 保留知乎复制入口，便于继续完善适配
- 支持导出 HTML、图片、PDF 和打印预览
- 支持导入自定义 `.css` 样式并保存为可选排版样式
- 支持 MCP 协议，方便 AI Agent 调用排版能力

## 快速开始

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:2663`。

## 当前取舍

- 已移除额外内容平台适配，聚焦微信公众号与知乎
- 已移除旧接口文档页，保留 MCP 配置入口
- 已移除 PWA、安装到桌面和文件关联能力
- 已移除命令面板，保留普通按钮栏操作

## 技术栈

- TanStack Start
- React 19
- Vite 7
- Tailwind CSS 4
- shadcn/ui
- TypeScript
- pnpm

## 文档

- [功能说明](./docs/features.md)
- [架构设计](./docs/architecture.md)
- [UI 设计](./docs/design.md)
- AI 使用入口：运行项目后查看 `/docs/skill` 与 `/docs/mcp`

## 许可证

本项目以 [AGPL-3.0](./LICENSE) 发布。软件按许可证原样提供，不附带任何担保；你可以在许可证条款下复制、分发和修改本项目。
