# easymd × DeepSeek Harness

easymd 的 DSH 发行层：把本仓库的确定性 Markdown 能力注册成 DSH 原生工具，并附带 `easymd` skill。这个目录不是一个独立项目——它随 easymd 仓库一起版本化，`pnpm dsh:pack` / `pnpm dsh:publish` 从仓库根发起。

其它宿主（Claude Desktop / Cursor / Codex…）用 `easymd-mcp`，见 [docs/agents.md](../../docs/agents.md)。

装完即用，**不需要**联网访问 `easymd.vercel.app`，也不需要另外跑 MCP server。

## 提供的工具

| 工具             | 作用                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `easymd_render`  | Markdown → 内联 CSS 的 HTML，可直接粘进微信公众号 / 知乎 / 富文本编辑器；19 个排版主题、14 个代码高亮主题、Mermaid 与信息图主题可选 |
| `easymd_lint`    | markdownlint 校验 + 自动修复（标题层级、列表缩进、空行、行尾空格…）                                                                 |
| `easymd_parse`   | HTML（整篇或片段）→ Markdown，自动清理不安全标签                                                                                    |
| `easymd_extract` | Markdown → 纯文本（去标记，保留段落）                                                                                               |
| `easymd_options` | 列出当前可用的主题 / 配色 / 平台 id（JSON）                                                                                         |

外加 skill `easymd`：微信公众号 / 知乎排版规范、组件库、HTML 模板与交付自查清单（`skills/easymd/references/`，来自仓库根 `skills/easymd`）。

## 安装

三种方式都走 DSH 的 **Plugins → Add plugin**：

1. **npm 包名**（推荐）：`easymd-dsh`
2. **tarball**：`pnpm dsh:pack` 产出的 `agents/dsh/easymd-dsh-<version>.tgz` 绝对路径
3. **本地目录**：本目录的绝对路径（需先 `pnpm agent:build` 生成 `lib/easymd-markdown.mjs`）

装完确认 bundle 是 **On**，然后新开一个会话：工具列表里应出现 `easymd_render` 等 5 个工具，技能目录里应出现 `easymd`。

## 配置

```yaml
- id: easymd
  name: easymd-dsh
  config:
    tools: true # false = 只注册 skill，不注册工具
    skill: true # false = 只要工具
```

## 维护

```bash
pnpm agent:build   # 重建引擎 → agents/dsh/lib/easymd-markdown.mjs
pnpm dsh:pack      # 构建 + 同步 skill + 拷贝 LICENSE，然后 npm pack
pnpm dsh:publish   # 同上，并发布到 registry.npmjs.org
```

- 引擎是一个约 4.6 MB 的单文件 ESM，首次调用工具时才加载，不影响 DSH 启动。
- `lib/`、`skills/`、`LICENSE` 都是 `scripts/prepare-package.mjs` 生成的，已在 `.gitignore` 里；改 skill 请改仓库根 `skills/easymd/`。
- `package.json` 的 `version` 必须和仓库根一致，`prepack` 会校验。

## 许可

本包内联了本仓库的 Markdown 管线，因此随仓库一起按 **AGPL-3.0-only** 发布，见 `LICENSE` 与 `NOTICE`。
