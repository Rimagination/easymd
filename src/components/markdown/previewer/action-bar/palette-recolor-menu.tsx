import type { MarkdownRecolorPalette } from '@/themes/markdown-style/palette'
import { Palette } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { usePreviewStore } from '@/stores/preview'
import { loadMarkdownStyleCss, markdownStyles } from '@/themes/markdown-style'
import {
  extractStyleColors,
  markdownRecolorPalettes,
  replaceStyleColor,
  replaceStylePalette,
} from '@/themes/markdown-style/palette'

const MAX_DISPLAY_COLORS = 8

interface StylePaletteSnapshot {
  css: string
  colors: ReturnType<typeof extractStyleColors>
  sourceName: string
}

export function PaletteRecolorMenu() {
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const importedMarkdownStyles = usePreviewStore(state => state.importedMarkdownStyles)
  const customCss = usePreviewStore(state => state.customCss)
  const paletteOverrideCss = usePreviewStore(state => state.paletteOverrideCss)
  const setPaletteOverrideCss = usePreviewStore(state => state.setPaletteOverrideCss)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<StylePaletteSnapshot | null>(null)
  const [activeHex, setActiveHex] = useState<string | null>(null)
  const [pickedHex, setPickedHex] = useState('#f29718')
  const [reloadKey, setReloadKey] = useState(0)
  const hasPaletteOverride = paletteOverrideCss.trim().length > 0

  useEffect(() => {
    if (!open) {
      return
    }

    let canceled = false

    async function loadCurrentStylePalette() {
      setLoading(true)
      setError(null)

      try {
        const importedStyle = importedMarkdownStyles.find(style => style.id === markdownStyle)
        const builtInStyle = markdownStyles.find(style => style.id === markdownStyle)
        const baseCss = importedStyle?.css
          ?? await loadMarkdownStyleCss(markdownStyle)
          ?? ''
        const css = paletteOverrideCss.trim()
          ? paletteOverrideCss
          : [baseCss, customCss].filter(Boolean).join('\n')
        const colors = extractStyleColors(css, MAX_DISPLAY_COLORS)

        if (canceled) {
          return
        }

        setSnapshot({
          css,
          colors,
          sourceName: importedStyle?.name ?? builtInStyle?.name ?? 'Current style',
        })

        const nextActiveHex = colors[0]?.hex ?? null

        setActiveHex(nextActiveHex)
        setPickedHex(nextActiveHex ?? '#f29718')
      }
      catch (loadError) {
        if (!canceled) {
          setError(loadError instanceof Error ? loadError.message : '无法识别当前样式配色')
          setSnapshot(null)
          setActiveHex(null)
        }
      }
      finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    void loadCurrentStylePalette()

    return () => {
      canceled = true
    }
  }, [open, markdownStyle, importedMarkdownStyles, customCss, paletteOverrideCss, reloadKey])

  const activeColor = snapshot?.colors.find(color => color.hex === activeHex)

  const handleApplyColor = () => {
    if (!snapshot || !activeHex) {
      return
    }

    const nextCss = replaceStyleColor(snapshot.css, activeHex, pickedHex)
    setPaletteOverrideCss(nextCss)
    trackEvent('style', 'replace-style-color', 'button')
    toast.success(`已将 ${activeHex} 替换为 ${pickedHex}`)
  }

  const handleApplyPalette = (palette: MarkdownRecolorPalette) => {
    if (!snapshot) {
      return
    }

    const nextCss = replaceStylePalette(snapshot.css, palette.colors)
    setPaletteOverrideCss(nextCss)
    trackEvent('style', 'replace-style-palette', 'button', { paletteId: palette.id })
    toast.success(`已应用「${palette.name}」配色`)
  }

  const handleClearPalette = () => {
    setPaletteOverrideCss('')
    setReloadKey(key => key + 1)
    trackEvent('style', 'clear-style-palette', 'button')
    toast.success('已恢复当前样式原配色')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={(
            <PopoverTrigger
              render={(
                <Button variant="ghost" size="icon" aria-label="样式配色">
                  <Palette className={hasPaletteOverride
                    ? 'size-4 text-primary'
                    : 'size-4'}
                  />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>样式配色</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        className={`
          w-[22rem] gap-3 rounded-2xl border border-border/70 bg-background/95
          p-3 shadow-2xl backdrop-blur-xl
        `}
      >
        <PopoverHeader>
          <PopoverTitle>样式配色</PopoverTitle>
          <PopoverDescription>
            自动识别当前排版样式里的主要颜色，点选色块后可微调，也可一键套用整组配色。
          </PopoverDescription>
        </PopoverHeader>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-muted-foreground">
            {loading
              ? '正在识别...'
              : snapshot
                ? `当前样式：${snapshot.sourceName}`
                : '当前样式'}
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setReloadKey(key => key + 1)}
            disabled={loading}
          >
            重新识别
          </Button>
        </div>

        {error && (
          <div className={`
            rounded-xl border border-destructive/20 bg-destructive/10 p-3
            text-xs text-destructive
          `}
          >
            {error}
          </div>
        )}

        {!error && (
          <div className="grid grid-cols-4 gap-2">
            {(snapshot?.colors ?? []).map(color => (
              <button
                key={color.hex}
                type="button"
                className={cn(
                  `
                    group rounded-xl border border-border/70 bg-card p-2
                    text-left transition
                    hover:-translate-y-0.5 hover:border-primary/60
                    hover:shadow-sm
                  `,
                  activeHex === color.hex && `
                    border-primary shadow-sm ring-2 ring-primary/20
                  `,
                )}
                onClick={() => {
                  setActiveHex(color.hex)
                  setPickedHex(color.hex)
                }}
              >
                <span
                  className={`
                    block h-8 rounded-lg border border-black/10 shadow-inner
                  `}
                  style={{ background: color.preview }}
                />
                <span className={`
                  mt-1 block font-mono text-[10px] text-foreground
                `}
                >
                  {color.hex}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {color.usageCount}
                  {' '}
                  处
                </span>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && snapshot?.colors.length === 0 && (
          <div className={`
            rounded-xl border border-dashed border-border p-4 text-center
            text-xs text-muted-foreground
          `}
          >
            这个样式里暂时没有识别到可替换的颜色。
          </div>
        )}

        {activeColor && (
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <div
                className={`
                  size-10 rounded-full border border-black/10 shadow-inner
                `}
                style={{ background: activeColor.preview }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">微调选中色</p>
                <p className="font-mono text-[11px] text-muted-foreground">{activeColor.hex}</p>
              </div>
              <input
                type="color"
                value={pickedHex}
                onChange={event => setPickedHex(event.target.value)}
                aria-label="选择替换颜色"
                className={`
                  h-9 w-12 rounded-md border border-border bg-background p-1
                `}
              />
            </div>
            <Button
              className="mt-3 w-full rounded-xl"
              variant="outline"
              size="sm"
              onClick={handleApplyColor}
            >
              替换这个颜色
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">一键更换配色</p>
          <div className="grid gap-2">
            {markdownRecolorPalettes.map(palette => (
              <button
                key={palette.id}
                type="button"
                className={`
                  rounded-2xl border border-border/70 bg-card p-2 text-left
                  transition
                  hover:border-primary/50 hover:bg-muted/30
                `}
                onClick={() => handleApplyPalette(palette)}
                disabled={!snapshot?.colors.length}
              >
                <span className={`
                  flex h-7 overflow-hidden rounded-xl border border-black/10
                `}
                >
                  {palette.colors.map(color => (
                    <span
                      key={color}
                      className="flex-1"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="mt-2 block text-xs font-medium">{palette.name}</span>
                <span className={`
                  block text-[11px] leading-5 text-muted-foreground
                `}
                >
                  {palette.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {hasPaletteOverride && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-muted-foreground"
            onClick={handleClearPalette}
          >
            清除配色替换，恢复原样式
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
