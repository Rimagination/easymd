import type { Platform } from '@/lib/markdown/render/adapters'
import type { InfographicPaletteId, InfographicThemeId } from '@/themes/infographic-theme'
import type { ImportedMarkdownStyle } from '@/themes/markdown-style/custom'
import type { MermaidThemeId } from '@/themes/mermaid-theme'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const PREVIEW_WIDTH_MOBILE = 415
export const PREVIEW_WIDTH_DESKTOP = 768

type PreviewWidth = typeof PREVIEW_WIDTH_MOBILE | typeof PREVIEW_WIDTH_DESKTOP

export interface InfographicSettings {
  theme: InfographicThemeId
  palette: InfographicPaletteId
}

interface PreviewState {
  previewWidth: PreviewWidth
  setPreviewWidth: (width: PreviewWidth) => void

  userPreferredWidth: PreviewWidth
  setUserPreferredWidth: (width: PreviewWidth) => void

  markdownStyle: string
  setMarkdownStyle: (id: string) => void

  paletteOverrideCss: string
  setPaletteOverrideCss: (css: string) => void

  codeTheme: string
  setCodeTheme: (theme: string) => void

  mermaidTheme: MermaidThemeId
  setMermaidTheme: (theme: MermaidThemeId) => void

  infographic: InfographicSettings
  setInfographic: (settings: Partial<InfographicSettings>) => void

  importedMarkdownStyles: ImportedMarkdownStyle[]
  upsertImportedMarkdownStyle: (style: ImportedMarkdownStyle) => void

  customCss: string
  setCustomCss: (css: string) => void

  renderedHtmlMap: Partial<Record<Platform, string>>
  setRenderedHtml: (platform: Platform, html: string) => void
  getRenderedHtml: (platform: Platform) => string
  clearRenderedHtmlCache: () => void
}

export const usePreviewStore = create<PreviewState>()(
  persist(
    (set, get) => ({
      previewWidth: PREVIEW_WIDTH_MOBILE,
      setPreviewWidth: previewWidth => set({ previewWidth }),

      userPreferredWidth: PREVIEW_WIDTH_MOBILE,
      setUserPreferredWidth: userPreferredWidth => set({ previewWidth: userPreferredWidth, userPreferredWidth }),

      markdownStyle: 'ayu-light',
      setMarkdownStyle: markdownStyle => set({
        markdownStyle,
        paletteOverrideCss: '',
        renderedHtmlMap: {},
      }),

      paletteOverrideCss: '',
      setPaletteOverrideCss: paletteOverrideCss => set({ paletteOverrideCss, renderedHtmlMap: {} }),

      codeTheme: 'kimbie-light',
      setCodeTheme: codeTheme => set({ codeTheme, renderedHtmlMap: {} }),

      mermaidTheme: '',
      setMermaidTheme: mermaidTheme => set({ mermaidTheme, renderedHtmlMap: {} }),

      infographic: { theme: 'default', palette: 'antv' },
      setInfographic: settings => set(state => ({
        infographic: { ...state.infographic, ...settings },
        renderedHtmlMap: {},
      })),

      importedMarkdownStyles: [],
      upsertImportedMarkdownStyle: importedMarkdownStyle => set((state) => {
        const currentIndex = state.importedMarkdownStyles.findIndex(
          style => style.id === importedMarkdownStyle.id,
        )

        if (currentIndex === -1) {
          return {
            importedMarkdownStyles: [...state.importedMarkdownStyles, importedMarkdownStyle],
            renderedHtmlMap: {},
          }
        }

        const importedMarkdownStyles = [...state.importedMarkdownStyles]
        importedMarkdownStyles[currentIndex] = importedMarkdownStyle
        return {
          importedMarkdownStyles,
          renderedHtmlMap: {},
        }
      }),

      customCss: '',
      setCustomCss: customCss => set({
        customCss,
        paletteOverrideCss: '',
        renderedHtmlMap: {},
      }),

      renderedHtmlMap: {},
      setRenderedHtml: (platform, html) => set(state => ({
        renderedHtmlMap: { ...state.renderedHtmlMap, [platform]: html },
      })),
      getRenderedHtml: platform => get().renderedHtmlMap[platform] ?? '',
      clearRenderedHtmlCache: () => set({ renderedHtmlMap: {} }),
    }),
    {
      name: 'easymd.preview',
      skipHydration: true,
      partialize: state => ({
        userPreferredWidth: state.userPreferredWidth,
        markdownStyle: state.markdownStyle,
        paletteOverrideCss: state.paletteOverrideCss,
        codeTheme: state.codeTheme,
        mermaidTheme: state.mermaidTheme,
        infographic: state.infographic,
        importedMarkdownStyles: state.importedMarkdownStyles,
        customCss: state.customCss,
      }),
    },
  ),
)
