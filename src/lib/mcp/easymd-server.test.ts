import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, describe, expect, it } from 'vitest'
import { createEasymdMcpServer } from './easymd-server'

const clients: Client[] = []

async function connectTestClient() {
  const server = createEasymdMcpServer()
  const client = new Client({ name: 'easymd-test', version: '0.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  clients.push(client)
  return client
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map(client => client.close()))
})

describe('createEasymdMcpServer', () => {
  it('lists easymd markdown tools', async () => {
    const client = await connectTestClient()
    const result = await client.listTools()
    expect(result.tools.map(tool => tool.name).sort()).toEqual(['extract', 'lint', 'parse', 'render'])
  })

  it('renders markdown through the MCP render tool', async () => {
    const client = await connectTestClient()
    const result = await client.callTool({
      name: 'render',
      arguments: {
        markdown: '# 标题\n\n正文',
        platform: 'wechat',
        markdownStyle: 'professional',
      },
    })
    expect(result.structuredContent).toEqual(
      expect.objectContaining({
        result: expect.stringContaining('标题'),
      }),
    )
  })

  it('rejects unsupported platforms through the render input schema', async () => {
    const client = await connectTestClient()
    const result = await client.callTool({
      name: 'render',
      arguments: {
        markdown: '# 标题',
        platform: 'juejin',
      },
    })
    expect(result.isError).toBe(true)
    expect(result.content).toEqual([
      expect.objectContaining({
        text: expect.stringContaining('html'),
      }),
    ])
  })
})
