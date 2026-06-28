import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { extract, extractDefinition } from '@/lib/markdown/extract'
import { lint, lintDefinition } from '@/lib/markdown/lint'
import { parse, parseDefinition } from '@/lib/markdown/parse'
import { render, renderDefinition } from '@/lib/markdown/render'
import { name, version } from '@/package.json'

function jsonToolResult(output: { result: string }) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(output) }],
    structuredContent: output,
  }
}

export function createEasymdMcpServer() {
  const server = new McpServer({ name, version })

  server.registerTool(extractDefinition.name, extractDefinition, async (input) => {
    return jsonToolResult({ result: await extract(input) })
  })

  server.registerTool(lintDefinition.name, lintDefinition, async (input) => {
    return jsonToolResult({ result: await lint(input) })
  })

  server.registerTool(parseDefinition.name, parseDefinition, async (input) => {
    return jsonToolResult({ result: await parse(input) })
  })

  server.registerTool(renderDefinition.name, renderDefinition, async (input) => {
    return jsonToolResult({ result: await render(input) })
  })

  return server
}
