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
    label: 'Copy as WeChat format',
    successMessage: 'Copied as WeChat format',
    icon: 'Wechat',
    hotkey: { key: '7', shift: true },
  },
  zhihu: {
    label: 'Copy as Zhihu format',
    successMessage: 'Copied as Zhihu format',
    icon: 'Zhihu',
    hotkey: { key: '8', shift: true },
  },
  html: {
    label: 'Copy HTML',
    successMessage: 'Copied HTML',
    icon: 'Code2',
    hotkey: { key: '0', shift: true },
  },
} as const satisfies Record<string, PlatformConfigItem>

export type SupportedPlatform = keyof typeof platformConfig

export const supportedPlatforms = Object.keys(platformConfig) as SupportedPlatform[]

export const editorCommandConfig = {
  import: {
    label: 'Import file',
    icon: 'FileUp' as IconName,
    hotkey: { key: 'o', shift: false },
  },
  export: {
    label: 'Export Markdown',
    icon: 'FileDown' as IconName,
    hotkey: { key: 's', shift: false },
  },
  format: {
    label: 'Format content',
    icon: 'Wand' as IconName,
    hotkey: { key: 'l', shift: true },
  },
  exportImage: {
    label: 'Export image',
    icon: 'ImageDown' as IconName,
  },
  copyImage: {
    label: 'Copy image',
    icon: 'ClipboardCopy' as IconName,
  },
  exportPdf: {
    label: 'Export PDF',
    icon: 'FileText' as IconName,
  },
  printPreview: {
    label: 'Print preview',
    icon: 'Printer' as IconName,
  },
  themeToggle: {
    labelLight: 'Switch to dark mode',
    labelDark: 'Switch to light mode',
    iconLight: 'Moon' as IconName,
    iconDark: 'Sun' as IconName,
  },
} as const

export const editorSettingsConfig: readonly EditorSettingItem[] = [
  {
    id: 'footnoteLinks',
    label: 'Reference links',
    icon: 'Link',
    storeKey: 'enableFootnoteLinks',
    setterKey: 'setEnableFootnoteLinks',
  },
  {
    id: 'openLinksInNewWindow',
    label: 'Open links in a new window',
    icon: 'ExternalLink',
    storeKey: 'openLinksInNewWindow',
    setterKey: 'setOpenLinksInNewWindow',
  },
  {
    id: 'scrollSync',
    label: 'Scroll sync',
    icon: 'RefreshCw',
    storeKey: 'enableScrollSync',
    setterKey: 'setEnableScrollSync',
    separator: true,
  },
]

export const viewModeConfig = {
  mobile: { label: 'Mobile view', icon: 'Smartphone' },
  desktop: { label: 'Desktop view', icon: 'Monitor' },
} as const satisfies Record<string, ViewModeItem>

export const navigationConfig = {
  internal: [
    { path: '/docs/mcp', label: 'MCP config', icon: 'MCP' },
    { path: '/docs/skill', label: 'Skill docs', icon: 'Skill' },
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
