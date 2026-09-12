import { AwsClient } from 'aws4fetch'
import { env } from '@/env'
import { decryptWechatJson, encryptWechatJson, getWechatDataKeyRequirement, hashWechatValue } from './crypto'

const OBJECT_PREFIX = 'easymd-private/wechat'

function isStorageConfigured(): boolean {
  return Boolean(
    env.S3_ENDPOINT?.trim()
    && env.S3_BUCKET?.trim()
    && env.S3_ACCESS_KEY_ID?.trim()
    && env.S3_SECRET_ACCESS_KEY?.trim()
    && (env.EASYMD_WECHAT_DATA_KEY?.trim().length ?? 0) >= getWechatDataKeyRequirement(),
  )
}

export function isWechatStateStorageConfigured(): boolean {
  return isStorageConfigured()
}

function getS3Client(): AwsClient {
  if (!isStorageConfigured()) {
    throw new Error('微信公众号授权存储尚未配置。')
  }
  return new AwsClient({
    accessKeyId: env.S3_ACCESS_KEY_ID?.trim() ?? '',
    secretAccessKey: env.S3_SECRET_ACCESS_KEY?.trim() ?? '',
    region: env.S3_REGION?.trim() || 'auto',
    service: 's3',
  })
}

function getObjectUrl(key: string): string {
  const endpoint = env.S3_ENDPOINT?.trim()
  const bucket = env.S3_BUCKET?.trim()
  if (!endpoint || !bucket) {
    throw new Error('S3 存储配置缺失。')
  }

  const base = new URL(endpoint)
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/${encodeURIComponent(bucket)}`
  base.pathname += `/${key.split('/').map(part => encodeURIComponent(part)).join('/')}`
  return base.toString()
}

async function requestObject(key: string, init?: RequestInit): Promise<Response> {
  return getS3Client().fetch(getObjectUrl(key), init)
}

async function readEncrypted(key: string): Promise<string | undefined> {
  const response = await requestObject(key)
  if (response.status === 404) {
    return undefined
  }
  if (!response.ok) {
    throw new Error(`读取授权存储失败（HTTP ${response.status}）。`)
  }
  return response.text()
}

async function writeEncrypted(key: string, value: string): Promise<void> {
  const response = await requestObject(key, {
    method: 'PUT',
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: value,
  })
  if (!response.ok) {
    throw new Error(`写入授权存储失败（HTTP ${response.status}）。`)
  }
}

async function deleteObject(key: string): Promise<void> {
  const response = await requestObject(key, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    throw new Error(`删除授权存储失败（HTTP ${response.status}）。`)
  }
}

export const wechatObjectKeys = {
  account(browserId: string) {
    return `${OBJECT_PREFIX}/accounts/${hashWechatValue(browserId)}.txt`
  },
  component() {
    return `${OBJECT_PREFIX}/component.txt`
  },
  oauthState(state: string) {
    return `${OBJECT_PREFIX}/oauth/${hashWechatValue(state)}.txt`
  },
}

export async function readWechatRecord<T>(key: string): Promise<T | undefined> {
  const encrypted = await readEncrypted(key)
  if (!encrypted) {
    return undefined
  }
  try {
    return decryptWechatJson<T>(encrypted)
  }
  catch {
    throw new Error('授权存储内容无法解密，请检查 EASYMD_WECHAT_DATA_KEY 是否发生变化。')
  }
}

export async function writeWechatRecord<T>(key: string, value: T): Promise<void> {
  await writeEncrypted(key, encryptWechatJson(value))
}

export async function deleteWechatRecord(key: string): Promise<void> {
  await deleteObject(key)
}
