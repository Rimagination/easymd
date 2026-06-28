import { createFileRoute } from '@tanstack/react-router'
import { createEasymdMcpServer } from '@/lib/mcp/easymd-server'
import { handleMcpRequest } from '@/utils/mcp-handler'

const server = createEasymdMcpServer()

export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      GET: () => new Response(null, {
        status: 302,
        headers: { Location: '/docs/mcp' },
      }),
      POST: async ({ request }) => handleMcpRequest(request, server),
    },
  },
})
