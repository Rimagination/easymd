import { createRequire } from 'node:module'
import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
// import { analyzer } from 'vite-bundle-analyzer'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { name } from './package.json'
import { cssRawMinifyPlugin, fixNitroInlineDynamicImports, htmlRawMinifyPlugin, markdownPlugin } from './scripts/vite'

const require = createRequire(import.meta.url)
const isAliyunESA = Boolean(process.env.AliUid)
const isTencentEdgeOne = process.env.HOME === '/dev/shm/home' && process.env.TMPDIR === '/dev/shm/tmp'

let customPreset: string | undefined
if (isAliyunESA) {
  // 阿里云 ESA
  customPreset = './preset/aliyun-esa/nitro.config.ts'
}
else if (isTencentEdgeOne) {
  // 腾讯云 EdgeOne
  customPreset = './preset/tencent-edgeone/nitro.config.ts'
}

console.info('Using Nitro Preset:', customPreset || 'auto')

const config = defineConfig({
  plugins: [
    fixNitroInlineDynamicImports(),
    // analyzer(),
    cssRawMinifyPlugin(),
    htmlRawMinifyPlugin(),
    markdownPlugin(),
    devtools(),
    ...(
      process.env.NODE_ENV !== 'test'
        ? [nitro({
            preset: customPreset,
            cloudflare: {
              wrangler: {
                name,
                observability: { enabled: true },
                keep_vars: true,
              },
            },
            vercel: {
              functions: {
                runtime: 'bun1.x',
              },
            },
          })]
        : []),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: isAliyunESA,
        filter: ({ path }) =>
          path === '/'
          || path === '/about'
          || path.startsWith('/docs'),
      },
    }),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  resolve: {
    alias: {
      'decode-named-character-reference': require.resolve('decode-named-character-reference'),
      'hast-util-from-html-isomorphic': require.resolve('hast-util-from-html-isomorphic'),
    },
  },
  worker: {
    format: 'es',
    plugins: () => [
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
})

export default config
