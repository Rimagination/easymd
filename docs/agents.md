# Agent 集成

easymd 不是某一个 Agent 的插件。同一套 Markdown 管线（`src/lib/markdown` + `src/themes`）通过四种形态对外提供能力，按宿主的能力选一种即可。

| 形态       | 包 / 入口                                                         | 适用宿主                                              | 需要联网 |
| ---------- | ----------------------------------------------------------------- | ----------------------------------------------------- | -------- |
| Skill      | `skills/*/SKILL.md`（`easymd` 排版 + `tech-review` 科技评论写作） | Codex、Claude Code、DSH 等读 skill 的 Agent           | 否       |
| 本地 MCP   | `easymd-mcp`（stdio，`agents/mcp/`）                              | Claude Desktop、Cursor、Cline、Codex、任何 MCP 客户端 | 否       |
| 远程 MCP   | `https://easymd.vercel.app/mcp`                                   | 支持 HTTP MCP 的客户端                                | 是       |
| DSH bundle | `easymd-dsh`（`agents/dsh/`，原生工具 + skill）                   | DeepSeek Harness                                      | 否       |
| 网页       | `pnpm dev` → `localhost:2663`                                     | 人                                                    | 否       |

## 目录

```
agent-build/        # 两种产物共用一套构建
├── entry.ts        #   → 单文件引擎（DSH bundle 内联）
├── entry-mcp.ts    #   → stdio MCP server
└── build.mjs
agents/
├── dsh/            # easymd-dsh：DSH bundle
└── mcp/            # easymd-mcp：stdio MCP server
skills/             # 各宿主共用的 skill 源（easymd、tech-review）
```

## 构建与发布

```bash
pnpm agent:build   # 两个产物都构建
pnpm dsh:pack      # easymd-dsh 打包（prepack 自动构建 + 同步 skill + 拷 LICENSE）
pnpm mcp:pack      # easymd-mcp 打包
pnpm agent:publish # 依次发布两个包
```

两个包的 `version` 都必须等于仓库根 `package.json` 的 `version`，prepack 会校验并拒绝不一致的发布。

## 为什么 MCP 和 DSH bundle 是两个包

DSH 能在 Host 进程内直接注册工具，不必为每个工具开子进程，所以 `easymd-dsh` 只内联引擎（约 4.6 MB）并附带 skill；而其他 Agent 只能通过 MCP 协议对话，所以 `easymd-mcp` 额外内联了 MCP SDK 与 zod（约 4.9 MB）并带 `bin`。两者共用同一份工具定义，行为一致，避免让不需要 MCP 的宿主装一堆协议代码。
