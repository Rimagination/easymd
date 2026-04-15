import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PanelLeftOpen } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ArticleBlockLibrary } from '@/components/markdown/article-block-library'
import MarkdownEditor from '@/components/markdown/editor'
import { FooterBar } from '@/components/markdown/footer-bar'
import MarkdownPreviewer from '@/components/markdown/previewer'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useFilesSync } from '@/hooks/use-files-sync'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_layout')({ component: App })

type MobilePanel = 'editor' | 'preview'
type LibraryPanelMode = 'auto' | 'expanded' | 'collapsed'

const COMPACT_WORKSPACE_QUERY = '(max-width: 1600px), (max-height: 960px)'

function subscribeCompactWorkspace(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const matcher = window.matchMedia(COMPACT_WORKSPACE_QUERY)
  matcher.addEventListener('change', onStoreChange)
  return () => matcher.removeEventListener('change', onStoreChange)
}

function getCompactWorkspaceSnapshot() {
  return typeof window !== 'undefined'
    && window.matchMedia(COMPACT_WORKSPACE_QUERY).matches
}

function getServerCompactWorkspaceSnapshot() {
  return false
}

function App() {
  useFilesSync()
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('editor')
  const [libraryPanelMode, setLibraryPanelMode] = useState<LibraryPanelMode>('auto')
  const isCompactWorkspace = useSyncExternalStore(
    subscribeCompactWorkspace,
    getCompactWorkspaceSnapshot,
    getServerCompactWorkspaceSnapshot,
  )
  const isBlockLibraryCollapsed = libraryPanelMode === 'collapsed'
    || (libraryPanelMode === 'auto' && isCompactWorkspace)

  useEffect(() => {
    const prepareWorker = async () => {
      const { worker } = await import('@/lib/markdown/browser')
      worker.prepare()
    }

    prepareWorker()
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className={`
        pointer-events-none absolute inset-0
        bg-[radial-gradient(circle_at_10%_8%,rgb(238_156_60_/_0.1),transparent_28rem),radial-gradient(circle_at_90%_0%,rgb(69_128_132_/_0.12),transparent_26rem)]
      `}
      />

      <main className={`
        easymd-shell relative mx-auto flex h-screen max-w-[1920px] flex-col
      `}
      >
        <section className={`
          easymd-workspace flex min-h-0 flex-1 flex-col overflow-hidden border
          border-border/70 bg-background/95
          shadow-[0_24px_70px_rgb(0_0_0_/_0.12)] backdrop-blur-xl
        `}
        >
          <div className={`
            border-b border-border/70 bg-background/90 p-3
            lg:hidden
          `}
          >
            <div className={`
              grid grid-cols-2 rounded-full border border-border bg-muted p-1
            `}
            >
              {(['editor', 'preview'] as MobilePanel[]).map(panel => (
                <button
                  key={panel}
                  type="button"
                  className={cn(
                    'rounded-full px-3 py-2 text-xs font-medium transition',
                    mobilePanel === panel
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => setMobilePanel(panel)}
                >
                  {panel === 'editor' ? '编辑' : '预览'}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-editor/50">
            <ResizablePanelGroup
              key={isBlockLibraryCollapsed ? 'library-collapsed' : 'library-open'}
              tagName="div"
              className={`
                hidden h-full
                lg:flex
              `}
              direction="horizontal"
            >
              <ResizablePanel
                defaultSize={isBlockLibraryCollapsed ? 3 : 16}
                minSize={isBlockLibraryCollapsed ? 3 : 12}
                maxSize={isBlockLibraryCollapsed ? 3 : 24}
                style={{ minWidth: isBlockLibraryCollapsed ? 44 : 220 }}
              >
                {isBlockLibraryCollapsed
                  ? (
                      <aside
                        className={`
                          flex h-full items-start justify-center border-r
                          border-border/70 bg-background pt-2
                        `}
                      >
                        <button
                          type="button"
                          className={`
                            flex size-8 items-center justify-center rounded-none
                            text-muted-foreground transition-colors
                            hover:bg-muted hover:text-foreground
                          `}
                          onClick={() => setLibraryPanelMode('expanded')}
                          aria-label="展开组件面板"
                          title="展开组件面板"
                        >
                          <PanelLeftOpen className="size-4" />
                        </button>
                      </aside>
                    )
                  : (
                      <ArticleBlockLibrary onCollapse={() => setLibraryPanelMode('collapsed')} />
                    )}
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={isBlockLibraryCollapsed ? 51 : 44} style={{ minWidth: 300 }}>
                <MarkdownEditor />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={isBlockLibraryCollapsed ? 46 : 40} style={{ minWidth: 300 }}>
                <MarkdownPreviewer />
              </ResizablePanel>
            </ResizablePanelGroup>

            <div className={`
              relative h-full
              lg:hidden
            `}
            >
              <div className={cn('absolute inset-0', mobilePanel === 'editor'
                ? `block`
                : `hidden`)}
              >
                <MarkdownEditor />
              </div>
              <div className={cn('absolute inset-0', mobilePanel === 'preview'
                ? `block`
                : `hidden`)}
              >
                <MarkdownPreviewer />
              </div>
            </div>
          </div>

          <FooterBar />
        </section>

        <Outlet />
      </main>
    </div>
  )
}
