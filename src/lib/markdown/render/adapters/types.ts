import type { Pluggable } from 'unified'

export const platforms = ['html', 'wechat', 'zhihu'] as const

export type Platform = typeof platforms[number]

export interface AdapterOptions {
  referenceTitle?: string
  markdownStyle?: string
}

export interface PlatformAdapter {
  id: Platform
  name: string
  getPlugins: (options?: AdapterOptions) => Pluggable[]
}
