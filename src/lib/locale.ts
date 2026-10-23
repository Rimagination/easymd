export interface MarkdownLocaleTexts {
  footnoteLabel: string
  referenceTitle: string
}

const ZH_HANS: MarkdownLocaleTexts = {
  footnoteLabel: '脚注',
  referenceTitle: '参考资料',
}

const ZH_HANT: MarkdownLocaleTexts = {
  footnoteLabel: '註腳',
  referenceTitle: '參考資料',
}

const LOCALE_TEXTS: Record<string, MarkdownLocaleTexts> = {
  'zh-CN': ZH_HANS,
  'zh-SG': ZH_HANS,
  'zh-TW': ZH_HANT,
  'zh-HK': ZH_HANT,
  'zh-MO': ZH_HANT,
}

export function getMarkdownLocaleTexts(): MarkdownLocaleTexts | undefined {
  if (typeof navigator === 'undefined') {
    return undefined
  }
  return LOCALE_TEXTS[navigator.language]
}
