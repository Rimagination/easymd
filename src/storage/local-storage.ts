/**
 * Local storage provider (store files on local filesystem)
 */

import type { StorageProvider, UploadOptions, UploadResult } from './types'
import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { env } from '@/env'
import { StorageError } from './types'

export const DEFAULT_LOCAL_UPLOAD_DIR = './.local-uploads'

export function shouldUseDefaultLocalUploads(): boolean {
  return !import.meta.env.PROD && process.env.NODE_ENV !== 'production'
}

export function getLocalUploadDir(): string | undefined {
  const configuredDir = env.LOCAL_UPLOAD_DIR?.trim()
  if (configuredDir) {
    return configuredDir
  }

  return shouldUseDefaultLocalUploads() ? DEFAULT_LOCAL_UPLOAD_DIR : undefined
}

export function getLocalUploadPublicPath(): string {
  return (env.LOCAL_UPLOAD_PUBLIC_PATH || '/uploads').replace(/\/$/, '')
}

function safeExt(filename: string, contentType: string): string {
  const raw = filename.split('.').pop() || ''
  const ext = raw.trim().toLowerCase()
  if (ext)
    return ext
  if (contentType.includes('png'))
    return 'png'
  if (contentType.includes('jpeg'))
    return 'jpg'
  if (contentType.includes('gif'))
    return 'gif'
  if (contentType.includes('webp'))
    return 'webp'
  if (contentType.includes('svg'))
    return 'svg'
  return 'bin'
}

function createKey(ext: string): { key: string, dir: string } {
  const date = new Date().toISOString().split('T')[0]
  const id = typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return { key: `${date}/${id}.${ext}`, dir: date }
}

export class LocalStorage implements StorageProvider {
  readonly type = 'local' as const

  private baseDir: string
  private publicBasePath: string

  constructor() {
    const dir = getLocalUploadDir()
    if (!dir) {
      throw new StorageError('LOCAL_UPLOAD_DIR 未配置', 'local')
    }
    this.baseDir = path.resolve(dir)
    this.publicBasePath = getLocalUploadPublicPath()
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const { file, filename, contentType } = options

    try {
      const ext = safeExt(filename, contentType)
      const { key, dir } = createKey(ext)

      const targetDir = path.join(this.baseDir, dir)
      await mkdir(targetDir, { recursive: true })

      const arrayBuffer = await file.arrayBuffer()
      const targetPath = path.join(this.baseDir, key)
      await writeFile(targetPath, Buffer.from(arrayBuffer))

      const url = `${this.publicBasePath}/${key.replace(/^\//, '')}`
      return { url }
    }
    catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError('本地写入失败', 'local', error)
    }
  }
}
