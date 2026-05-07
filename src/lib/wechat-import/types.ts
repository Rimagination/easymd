export interface WechatArticleImportArticle {
  title: string
  author?: string
  publishTime?: string
  sourceUrl: string
  markdown: string
}

export interface WechatStyleFingerprint {
  colors: {
    text?: string
    muted?: string
    accent?: string
    background?: string
    quoteBorder?: string
    codeBackground?: string
  }
  typography: {
    bodyFontSize?: number
    bodyLineHeight?: number
    h1FontSize?: number
    h2FontSize?: number
    h3FontSize?: number
    fontFamilyKind?: 'system' | 'serif' | 'sans' | 'mixed'
  }
  spacing: {
    paragraphMarginBlock?: number
    sectionMarginBlock?: number
    headingMarginBlock?: number
  }
  decoration: {
    headingPattern?: 'plain' | 'bar' | 'underline' | 'badge'
    quotePattern?: 'left-border' | 'background' | 'card'
    imageRadius?: number
    tablePattern?: 'minimal' | 'bordered' | 'striped'
  }
}

export interface WechatArticleImportTheme {
  sourceName: string
  css: string
  fingerprint: WechatStyleFingerprint
}

export interface WechatArticleImportResult {
  article: WechatArticleImportArticle
  theme: WechatArticleImportTheme
  warnings: string[]
}
