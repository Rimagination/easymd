import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DCStorage, getStorageProvider, isLocalConfigured, LocalStorage } from './index'
import { DEFAULT_LOCAL_UPLOAD_DIR, getLocalUploadDir } from './local-storage'

const ORIGINAL_ENV = process.env

function clearStorageEnv() {
  delete process.env.LOCAL_UPLOAD_DIR
  delete process.env.LOCAL_UPLOAD_PUBLIC_PATH
  delete process.env.S3_ENDPOINT
  delete process.env.S3_BUCKET
  delete process.env.S3_ACCESS_KEY_ID
  delete process.env.S3_SECRET_ACCESS_KEY
  delete process.env.S3_REGION
  delete process.env.S3_PUBLIC_BASE_URL
  delete process.env.DC_UPLOAD_URL
}

describe('storage provider selection', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    clearStorageEnv()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('uses local uploads by default in development', () => {
    process.env.NODE_ENV = 'development'

    expect(getLocalUploadDir()).toBe(DEFAULT_LOCAL_UPLOAD_DIR)
    expect(isLocalConfigured()).toBe(true)
    expect(getStorageProvider()).toBeInstanceOf(LocalStorage)
  })

  it('keeps the remote fallback in production when local uploads are not configured', () => {
    process.env.NODE_ENV = 'production'

    expect(getLocalUploadDir()).toBeUndefined()
    expect(isLocalConfigured()).toBe(false)
    expect(getStorageProvider()).toBeInstanceOf(DCStorage)
  })

  it('uses an explicit local upload directory in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.LOCAL_UPLOAD_DIR = './custom-uploads'

    expect(getLocalUploadDir()).toBe('./custom-uploads')
    expect(getStorageProvider()).toBeInstanceOf(LocalStorage)
  })
})
