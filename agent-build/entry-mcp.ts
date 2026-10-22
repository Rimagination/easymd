// stdio MCP server：任何支持 MCP 的 Agent（Claude Desktop / Cursor / Codex / DSH…）都能直接用。
// 与网页端 /mcp 共用同一套工具定义，因此 schema 与行为保持一致。
// 注意：stdout 是协议通道，日志一律走 stderr。
import process from 'node:process'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createEasymdMcpServer } from '@/lib/mcp/easymd-server'

async function main() {
  const server = createEasymdMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[easymd-mcp] ready on stdio')
}

main().catch((error) => {
  console.error('[easymd-mcp] failed to start:', error)
  process.exitCode = 1
})
