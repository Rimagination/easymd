import { EditorActionBar } from '../editor/action-bar'
import { PreviewerActionBar } from '../previewer/action-bar'

export function FooterBar() {
  return (
    <footer
      className="shrink-0 border-t bg-background/95 backdrop-blur"
    >
      <div className={`
        easymd-toolbar-desktop hidden items-center gap-2
        lg:flex
      `}
      >
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
          <EditorActionBar showBlockSnippetMenu={false} />
        </div>
        <div className={`
          flex min-w-0 flex-1 items-center justify-end overflow-x-auto
        `}
        >
          <PreviewerActionBar />
        </div>
      </div>

      <div className={`
        space-y-2 px-3 py-3
        lg:hidden
      `}
      >
        <div className="overflow-x-auto">
          <div className="flex w-max items-center">
            <EditorActionBar />
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex w-max items-center">
            <PreviewerActionBar />
          </div>
        </div>
      </div>
    </footer>
  )
}
