import { describe, expect, it } from 'vitest'
import { createEasymdMcpServer } from '@/lib/mcp/easymd-server'
import { handleMcpRequest } from './mcp-handler'

function createMcpPost(body: unknown) {
  return new Request('https://easymd.test/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('handleMcpRequest', () => {
  it('handles an initialize request', async () => {
    const response = await handleMcpRequest(
      createMcpPost({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'easymd-test', version: '0.0.0' },
        },
      }),
      createEasymdMcpServer(),
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.result.serverInfo.name).toBe('easymd')
  })

  it('handles a tools/list request after the server has been initialized', async () => {
    const server = createEasymdMcpServer()

    await handleMcpRequest(
      createMcpPost({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'easymd-test', version: '0.0.0' },
        },
      }),
      server,
    )

    const response = await handleMcpRequest(
      createMcpPost({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
      server,
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual(['extract', 'lint', 'parse', 'render'])
  })
})
