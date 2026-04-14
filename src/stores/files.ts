import { toast } from 'sonner'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import defaultMarkdown from '@/docs/features.md?raw'
import { deleteFileContent, getFileContent, saveFileContent } from '@/lib/file-storage'

export { defaultMarkdown }

export interface MarkdownFile {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

interface FilesState {
  files: MarkdownFile[]
  activeFileId: string | null
  currentContent: string
  isInitialized: boolean
  hasHydrated: boolean
  lastSaveError: string | null

  setCurrentContent: (content: string) => void
  createFile: (name?: string, content?: string) => Promise<string>
  deleteFile: (id: string) => Promise<void>
  renameFile: (id: string, name: string) => void
  switchFile: (id: string) => Promise<void>
  getActiveFile: () => MarkdownFile | undefined
  initialize: () => Promise<void>
  setHasHydrated: (value: boolean) => void
}

const DEFAULT_FILE_NAME = 'easymd'

function extractH1Title(content: string): string | null {
  const lines = content.split('\n')
  for (const line of lines) {
    if (line.startsWith('# ')) {
      const title = line.slice(2).trim().replace(/[*_`[\]]/g, '').trim()
      return title || null
    }
  }
  return null
}

function normalizeFileName(name: string): string {
  let normalized = name.trim()
  if (!normalized) {
    normalized = DEFAULT_FILE_NAME
  }
  if (!/\.md$/i.test(normalized)) {
    normalized = `${normalized}.md`
  }
  return normalized
}

function ensureUniqueName(name: string, files: MarkdownFile[], excludeId?: string): string {
  const normalized = normalizeFileName(name)
  const baseName = normalized.replace(/\.md$/i, '')
  const ext = '.md'

  const existingNames = new Set(
    files.filter(f => f.id !== excludeId).map(f => f.name.toLowerCase()),
  )

  if (!existingNames.has(normalized.toLowerCase())) {
    return normalized
  }

  let i = 1
  while (existingNames.has(`${baseName} (${i})${ext}`.toLowerCase())) {
    i++
  }
  return `${baseName} (${i})${ext}`
}

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>()

function cancelPendingSave(id: string) {
  const timeout = pendingSaves.get(id)
  if (timeout) {
    clearTimeout(timeout)
    pendingSaves.delete(id)
  }
}

function debouncedSave(id: string, content: string, onSuccess: () => void, onError: (err: Error) => void) {
  cancelPendingSave(id)
  const timeout = setTimeout(async () => {
    pendingSaves.delete(id)
    try {
      await saveFileContent(id, content)
      onSuccess()
    }
    catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }, 500)
  pendingSaves.set(id, timeout)
}

let switchSeq = 0
let initPromise: Promise<void> | null = null

export const useFilesStore = create<FilesState>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      currentContent: '',
      isInitialized: false,
      hasHydrated: false,
      lastSaveError: null,

      setHasHydrated: (value) => {
        set({ hasHydrated: value })
      },

      setCurrentContent: (content) => {
        const { activeFileId } = get()
        set({ currentContent: content, lastSaveError: null })

        if (activeFileId) {
          debouncedSave(
            activeFileId,
            content,
            () => {
              const { files } = get()
              set({
                files: files.map(f =>
                  f.id === activeFileId ? { ...f, updatedAt: Date.now() } : f,
                ),
              })
            },
            (err) => {
              set({ lastSaveError: err.message })
              toast.error(`保存失败: ${err.message}`)
            },
          )
        }
      },

      createFile: async (name, content = '') => {
        const { files } = get()
        const id = crypto.randomUUID()
        const rawName = name ?? extractH1Title(content) ?? DEFAULT_FILE_NAME
        const fileName = ensureUniqueName(rawName, files)
        const newFile: MarkdownFile = {
          id,
          name: fileName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        try {
          await saveFileContent(id, content)
        }
        catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          toast.error(`创建文件失败: ${message}`)
          throw err
        }
        set({ files: [...files, newFile] })
        return id
      },

      deleteFile: async (id) => {
        const { files, activeFileId, switchFile, createFile } = get()

        cancelPendingSave(id)

        try {
          await deleteFileContent(id)
        }
        catch (err) {
          console.error('删除文件内容失败:', err)
        }

        const newFiles = files.filter(f => f.id !== id)

        if (newFiles.length === 0) {
          set({ files: [] })
          const newId = await createFile(undefined, defaultMarkdown)
          await switchFile(newId)
          return
        }

        set({ files: newFiles })

        if (id === activeFileId) {
          await switchFile(newFiles[0].id)
        }
      },

      renameFile: (id, name) => {
        const { files } = get()
        const newName = ensureUniqueName(name, files, id)
        set({
          files: files.map(f =>
            f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f,
          ),
        })
      },

      switchFile: async (id) => {
        const { activeFileId, currentContent } = get()
        const thisSeq = ++switchSeq

        // 取消旧文件的 pending save，防止 500ms 后覆盖错误数据
        if (activeFileId) {
          cancelPendingSave(activeFileId)
        }

        if (activeFileId && activeFileId !== id) {
          try {
            await saveFileContent(activeFileId, currentContent)
          }
          catch (err) {
            console.error('切换前保存失败:', err)
          }
        }

        if (thisSeq !== switchSeq) {
          return
        }

        try {
          const content = await getFileContent(id)
          if (thisSeq !== switchSeq) {
            return
          }
          set({ activeFileId: id, currentContent: content })
        }
        catch (err) {
          console.error('加载文件内容失败:', err)
          if (thisSeq === switchSeq) {
            set({ activeFileId: id, currentContent: '' })
          }
        }
      },

      getActiveFile: () => {
        const { files, activeFileId } = get()
        return files.find(f => f.id === activeFileId)
      },

      initialize: async () => {
        if (initPromise) {
          return initPromise
        }

        const { isInitialized, hasHydrated } = get()
        if (isInitialized || !hasHydrated) {
          return
        }

        initPromise = (async () => {
          let { files, activeFileId } = get()

          if (files.length === 0) {
            const id = crypto.randomUUID()
            const h1Title = extractH1Title(defaultMarkdown)
            const newFile: MarkdownFile = {
              id,
              name: normalizeFileName(h1Title ?? DEFAULT_FILE_NAME),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }
            try {
              await saveFileContent(id, defaultMarkdown)
            }
            catch (err) {
              console.error('初始化保存失败:', err)
            }
            files = [newFile]
            activeFileId = id
            set({ files, activeFileId })
          }

          if (!activeFileId && files.length > 0) {
            activeFileId = files[0].id
            set({ activeFileId })
          }

          if (activeFileId) {
            try {
              const content = await getFileContent(activeFileId)
              set({ currentContent: content, isInitialized: true })
            }
            catch (err) {
              console.error('加载初始内容失败:', err)
              set({ currentContent: '', isInitialized: true })
            }
          }
          else {
            set({ isInitialized: true })
          }
        })()

        return initPromise
      },
    }),
    {
      name: 'easymd.files',
      partialize: state => ({
        files: state.files,
        activeFileId: state.activeFileId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Zustand rehydration error:', error)
        }
        state?.setHasHydrated(true)
      },
    },
  ),
)
