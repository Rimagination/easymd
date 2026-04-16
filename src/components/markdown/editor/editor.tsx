import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useEditorScrollSync } from '@/components/markdown/hooks/use-scroll-sync'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { getAyuCodeMirrorTheme } from '@/themes/codemirror'
import { articleBlockFoldExtension } from './article-block-fold'
import { importDropPasteExtension, importViewTrackerExtension } from './file-import'

const lineNumbersTheme = EditorView.theme({
  '.cm-lineNumbers': {
    minWidth: '2em',
  },
})

export default function CodeMirrorEditor() {
  const content = useFilesStore(state => state.currentContent)
  const setContent = useFilesStore(state => state.setCurrentContent)
  const enableScrollSync = useEditorStore(state => state.enableScrollSync)
  const { theme } = useTheme()
  const editorViewRef = useRef<EditorView | null>(null)

  const { editorExtensions, onCreateEditor } = useEditorScrollSync({
    enabled: enableScrollSync,
  })

  const editorTheme = useMemo(
    () => getAyuCodeMirrorTheme(theme as 'light' | 'dark'),
    [theme],
  )

  const extensions = useMemo(
    () => [
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'Markdown 编辑器' }),
      lineNumbersTheme,
      ...editorExtensions,
      articleBlockFoldExtension,
      importViewTrackerExtension,
      importDropPasteExtension,
    ],
    [editorExtensions],
  )

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorViewRef.current = view
    onCreateEditor(view)
  }, [onCreateEditor])

  useEffect(() => {
    const view = editorViewRef.current
    if (!view) {
      return
    }

    const current = view.state.doc.toString()
    if (current === content) {
      return
    }

    const scrollElement = view.scrollDOM
    const scrollTop = scrollElement.scrollTop
    const scrollLeft = scrollElement.scrollLeft

    view.dispatch({
      changes: {
        from: 0,
        insert: content,
        to: current.length,
      },
    })

    requestAnimationFrame(() => {
      scrollElement.scrollTop = Math.min(
        scrollTop,
        Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight),
      )
      scrollElement.scrollLeft = scrollLeft
    })
  }, [content])

  return (
    <CodeMirror
      value={content}
      width="100%"
      height="100%"
      theme={editorTheme}
      extensions={extensions}
      onChange={setContent}
      className="size-full"
      basicSetup={{
        autocompletion: false,
      }}
      onCreateEditor={handleCreateEditor}
    />
  )
}
