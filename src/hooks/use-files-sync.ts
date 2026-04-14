import { useEffect } from 'react'
import { useFilesStore } from '@/stores/files'

const STORAGE_KEY = 'easymd.files'

interface PersistedState {
  state: {
    files: Array<{ id: string, name: string, createdAt: number, updatedAt: number }>
    activeFileId: string | null
  }
}

function computeFilesSignature(files: PersistedState['state']['files']): string {
  return files.map(f => `${f.id}:${f.name}:${f.updatedAt}`).join('|')
}

export function useFilesSync() {
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) {
        return
      }

      let remote: PersistedState['state']
      try {
        const parsed = JSON.parse(e.newValue) as PersistedState
        remote = parsed.state
      }
      catch {
        console.error('解析远程状态失败')
        return
      }

      const local = useFilesStore.getState()

      const filesChanged = computeFilesSignature(remote.files) !== computeFilesSignature(local.files)
      if (filesChanged) {
        useFilesStore.setState({ files: remote.files })
      }

      const currentFileExists = remote.files.some(f => f.id === local.activeFileId)
      if (!currentFileExists && remote.files.length > 0) {
        await useFilesStore.getState().switchFile(remote.files[0].id)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
}
