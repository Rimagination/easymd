// @ts-expect-error Nitro generates this module for deployment builds.
import server from 'node_modules/.nitro/vite/services/ssr/index.js'
import { preloadEdgeKVEnv } from './env'

export default {
  async fetch(request: Request) {
    await preloadEdgeKVEnv()
    // console.warn('Aliyun ESA fetch handler invoked')
    return server.fetch(request)
  },
}
