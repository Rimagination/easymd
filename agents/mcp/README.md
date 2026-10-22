# easymd-mcp

easymd 的本地 stdio MCP server：把 `render` / `lint` / `parse` / `extract` 四个确定性工具暴露给任何支持 MCP 的 Agent。不需要打开网页，不需要联网，也不依赖 `easymd.vercel.app`。

工具定义和网页端 `/mcp` 共用同一份 `src/lib/mcp/easymd-server.ts`，所以 schema 与返回格式完全一致。

| 工具      | 作用                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `render`  | Markdown → 内联 CSS 的 HTML（微信公众号 / 知乎 / HTML），可选 19 个排版主题、14 个代码高亮主题、Mermaid 与信息图主题 |
| `lint`    | markdownlint 校验 + 自动修复                                                                                         |
| `parse`   | HTML → Markdown，自动清理不安全标签                                                                                  |
| `extract` | Markdown → 纯文本                                                                                                    |

## 用法

直接跑，用在任何 MCP 客户端里：

```bash
npx -y easymd-mcp
```

### Claude Desktop

`claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "easymd": {
      "command": "npx",
      "args": ["-y", "easymd-mcp"]
    }
  }
}
```

### Codex

`~/.codex/config.toml`：

```toml
[mcp_servers.easymd]
command = "npx"
args = [
  "-y",
  "easymd-mcp"
]
```

### Cursor / Cline / 其他

```json
{
  "mcpServers": {
    "easymd": { "command": "npx", "args": ["-y", "easymd-mcp"] }
  }
}
```

### DeepSeek Harness

DSH 不用这个包，用 [`easymd-dsh`](https://www.npmjs.com/package/easymd-dsh)：它在 Host 进程内注册原生工具并附带 skill，省掉一层 MCP 子进程。

## 从源码构建

```bash
pnpm install
node agent-build/build.mjs mcp   # → agents/mcp/dist/easymd-mcp.mjs
```

产物约 4.9 MB（含 MCP SDK 与 zod），启动约 40 ms 量级；单文件，无运行期依赖。

## 许可

内联了本仓库代码，随仓库一起按 AGPL-3.0-only 发布，见 `LICENSE` 与 `NOTICE`。
