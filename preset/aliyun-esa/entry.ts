// eslint-disable-next-line ts/ban-ts-comment -- Nitro generates this module for deployment builds.
// @ts-ignore
import server from 'node_modules/.nitro/vite/services/ssr/index.js'
import { preloadEdgeKVEnv } from './env'

export default {
  async fetch(request: Request) {
    await preloadEdgeKVEnv()
    // console.warn('Aliyun ESA fetch handler invoked')
    return server.fetch(request)
  },
}
