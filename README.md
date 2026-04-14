# easymd

[https://easymd.vercel.app](https://easymd.vercel.app)

聚焦微信公众号与知乎排版的 Markdown 工具。

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

- 已移除掘金相关支持
- 已移除 REST API 与 Scalar 文档页
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

## 许可证

[AGPL-3.0](./LICENSE)
