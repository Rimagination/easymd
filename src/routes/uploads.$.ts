import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import { getLocalUploadDir } from '@/storage/local-storage'

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    default: return 'application/octet-stream'
  }
}

export const Route = createFileRoute('/uploads/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const baseDir = getLocalUploadDir()
        if (!baseDir) {
          return new Response('Not Found', { status: 404 })
        }

        const url = new URL(request.url)
        const rawPath = url.pathname.replace(/^\/uploads\/?/, '')
        const safePath = decodeURIComponent(rawPath).replace(/^\/+/, '')

        const resolvedBase = path.resolve(baseDir)
        const targetPath = path.resolve(resolvedBase, safePath)

        const relative = path.relative(resolvedBase, targetPath)
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          return new Response('Not Found', { status: 404 })
        }

        try {
          const info = await stat(targetPath)
          if (!info.isFile()) {
            return new Response('Not Found', { status: 404 })
          }

          const ext = path.extname(targetPath).slice(1).toLowerCase()
          const body = await readFile(targetPath)
          return new Response(body, {
            headers: {
              'Content-Type': contentTypeForExt(ext),
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        }
        catch {
          return new Response('Not Found', { status: 404 })
        }
      },
    },
  },
})
