import type { Pluggable } from 'unified'
import type { AdapterOptions, Platform, PlatformAdapter } from './types'
import { wechatAdapter } from './wechat'
import { zhihuAdapter } from './zhihu'

const htmlAdapter: PlatformAdapter = {
  id: 'html',
  name: 'HTML',
  getPlugins: () => [],
}

const adapters: Record<Platform, PlatformAdapter> = {
  html: htmlAdapter,
  wechat: wechatAdapter,
  zhihu: zhihuAdapter,
}

export function getAdapterPlugins(platform: Platform, options?: AdapterOptions): Pluggable[] {
  return adapters[platform].getPlugins(options)
}

export { type AdapterOptions, type Platform, type PlatformAdapter, platforms } from './types'
