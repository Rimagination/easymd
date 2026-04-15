import type { IconName } from '@/lib/icon-map'
import type { EditorBooleanKey, EditorBooleanSetterKey } from '@/stores/editor'
import { appConfig } from './app'

interface HotkeyConfig {
  key: string
  shift: boolean
}

interface PlatformConfigItem {
  label: string
  successMessage: string
  icon: IconName
  hotkey: HotkeyConfig
}

interface EditorSettingItem {
  id: string
  label: string
  icon: IconName
  storeKey: EditorBooleanKey
  setterKey: EditorBooleanSetterKey
  separator?: boolean
}

interface ViewModeItem {
  label: string
  icon: IconName
}

interface InternalNavItem {
  path: string
  label: string
  icon: IconName
}

interface ExternalNavItem {
  url: string
  label: string
  icon: IconName
}

export const platformConfig = {
  wechat: {
    label: '导出到微信',
    successMessage: '已复制微信格式',
    icon: 'Wechat',
    hotkey: { key: '7', shift: true },
  },
  zhihu: {
    label: '导出到知乎',
    successMessage: '已复制知乎格式',
    icon: 'Zhihu',
    hotkey: { key: '8', shift: true },
  },
  html: {
    label: '导出 HTML',
    successMessage: '已复制 HTML',
    icon: 'Code2',
    hotkey: { key: '0', shift: true },
  },
} as const satisfies Record<string, PlatformConfigItem>

export type SupportedPlatform = keyof typeof platformConfig

export const supportedPlatforms = Object.keys(platformConfig) as SupportedPlatform[]

export const editorCommandConfig = {
  import: {
    label: '导入文件',
    icon: 'FileUp' as IconName,
    hotkey: { key: 'o', shift: false },
  },
  export: {
    label: '导出 Markdown',
    icon: 'FileDown' as IconName,
    hotkey: { key: 's', shift: false },
  },
  format: {
    label: '格式化内容',
    icon: 'Wand' as IconName,
    hotkey: { key: 'l', shift: true },
  },
  exportImage: {
    label: '导出图片',
    icon: 'ImageDown' as IconName,
  },
  copyImage: {
    label: '复制图片',
    icon: 'ClipboardCopy' as IconName,
  },
  exportPdf: {
    label: '导出 PDF',
    icon: 'FileText' as IconName,
  },
  printPreview: {
    label: '打印预览',
    icon: 'Printer' as IconName,
  },
  themeToggle: {
    labelLight: '切换到深色模式',
    labelDark: '切换到浅色模式',
    iconLight: 'Moon' as IconName,
    iconDark: 'Sun' as IconName,
  },
} as const

export const editorSettingsConfig: readonly EditorSettingItem[] = [
  {
    id: 'footnoteLinks',
    label: '参考链接',
    icon: 'Link',
    storeKey: 'enableFootnoteLinks',
    setterKey: 'setEnableFootnoteLinks',
  },
  {
    id: 'openLinksInNewWindow',
    label: '新窗口打开链接',
    icon: 'ExternalLink',
    storeKey: 'openLinksInNewWindow',
    setterKey: 'setOpenLinksInNewWindow',
  },
  {
    id: 'scrollSync',
    label: '滚动同步',
    icon: 'RefreshCw',
    storeKey: 'enableScrollSync',
    setterKey: 'setEnableScrollSync',
    separator: true,
  },
]

export const viewModeConfig = {
  mobile: { label: '手机预览', icon: 'Smartphone' },
  desktop: { label: '桌面预览', icon: 'Monitor' },
} as const satisfies Record<string, ViewModeItem>

export const navigationConfig = {
  internal: [
    { path: '/docs/mcp', label: 'MCP 配置', icon: 'MCP' },
    { path: '/docs/skill', label: '技能文档', icon: 'Skill' },
  ] as const satisfies readonly InternalNavItem[],
  external: [
    ...(appConfig.github
      ? [{ url: appConfig.github, label: 'GitHub', icon: 'Github' as IconName }]
      : []),
  ] satisfies readonly ExternalNavItem[],
}

if (import.meta.env.DEV) {
  const hotkeyToCommand = new Map<string, string>()

  const checkHotkey = (key: string, shift: boolean, command: string) => {
    const hotkeyId = `${shift ? 'shift+' : ''}${key.toLowerCase()}`
    if (hotkeyToCommand.has(hotkeyId)) {
      console.warn(
        `[easymd] Hotkey conflict: Cmd/Ctrl+${hotkeyId.toUpperCase()} is bound to "${hotkeyToCommand.get(hotkeyId)}" and "${command}"`,
      )
    }
    hotkeyToCommand.set(hotkeyId, command)
  }

  Object.entries(platformConfig).forEach(([name, config]) => {
    checkHotkey(config.hotkey.key, config.hotkey.shift, `platform copy: ${name}`)
  })

  Object.entries(editorCommandConfig).forEach(([name, config]) => {
    if ('hotkey' in config) {
      checkHotkey(config.hotkey.key, config.hotkey.shift, `editor command: ${name}`)
    }
  })
}
