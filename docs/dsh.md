# DeepSeek Harness 插件

`agents/dsh/` 是本仓库的 DSH 发行层，发布为 npm 包 **`easymd-dsh`**。它和 easymd 本体同源同版本：`pnpm agent:build` 从 `src/lib/markdown` 和 `src/themes` 生成引擎，`pnpm dsh:pack` 打包，没有第二份实现。

其它宿主（Claude Desktop / Cursor / Codex…）走 [`easymd-mcp`](./agents.md)，不要在 DSH 里装它。

## 它做了什么

| 层       | 内容                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| 原生工具 | `easymd_render`、`easymd_lint`、`easymd_parse`、`easymd_extract`、`easymd_options`，在 DSH Host 进程内直接执行            |
| skill    | 仓库里**全部** skill（`skills/*/SKILL.md`）：`easymd`（排版规范、组件库、模板、自查清单）与 `tech-review`（科技评论写作） |
| 引擎     | `agents/dsh/lib/easymd-markdown.mjs`，esbuild 打成的单文件 ESM，约 4.6 MB，首次调用才加载                                 |

之所以走原生工具而不是 stdio MCP：easymd 的 `/mcp` 是 TanStack Start 的一个路由，不是独立进程；内联构建既能离线用，也没有 PATH / 子进程路径问题。需要 MCP 的宿主用 `easymd-mcp`，远程 MCP 也仍然保留。

## 安装

DSH 里 **Plugins → Add plugin**，三种来源任选：

1. npm 包名：`easymd-dsh`
2. tarball：`pnpm dsh:pack` 产出的 `agents/dsh/easymd-dsh-<version>.tgz`
3. 本地目录：`<repo>/agents/dsh`（先 `pnpm agent:build`）

装完重启 DSH（bundle 选择在启动时读取），新会话里能看到 5 个工具和 `easymd` 技能。

## 配置

```yaml
- id: easymd
  name: easymd-dsh
  config:
    tools: true # false = 只注册 skill
    skill: true # false = 只注册工具
```

## 发布

```bash
pnpm dsh:publish
```

`prepack`（`agents/dsh/scripts/prepare-package.mjs`）会依次：校验 `agents/dsh/package.json` 版本与仓库根一致 → 重建引擎 → 同步 `skills/easymd` → 拷贝 `LICENSE`。所以：

- 改 skill 只改仓库根 `skills/easymd/`，不要在 `agents/dsh/skills/` 里改（那是生成物，已 gitignore）。
- 发版时同时改仓库根、`agents/dsh/package.json`、`agents/mcp/package.json` 三个 `version`。
- `lib/`、`skills/`、`LICENSE` 都不进 git；npm tarball 里由 `prepack` 生成。

## 许可

内联了本仓库代码，因此随仓库一起按 AGPL-3.0-only 发布；`NOTICE` 里写明对应源码就是本仓库，`pnpm agent:build` 可重建引擎。
