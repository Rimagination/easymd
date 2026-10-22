// 把 easymd 的 Markdown 管线打成单文件 ESM，供 DSH bundle 内联使用。
// 用法：node dsh-build/build.mjs [outfile]
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 处理 Vite 的 `?raw` 导入：读取文件原文并作为 default 导出。 */
const rawTextPlugin = {
  name: 'vite-raw-text',
  setup(b) {
    b.onResolve({ filter: /\?raw$/ }, (args) => {
      const specifier = args.path.replace(/\?raw$/, '')
      if (specifier.startsWith('.') || isAbsolute(specifier)) {
        return { path: resolve(args.resolveDir, specifier), namespace: 'raw-text' }
      }
      const requireFromImporter = createRequire(resolve(args.resolveDir, 'noop.js'))
      return { path: requireFromImporter.resolve(specifier), namespace: 'raw-text' }
    })
    b.onLoad({ filter: /.*/, namespace: 'raw-text' }, async args => ({
      contents: `export default ${JSON.stringify(await readFile(args.path, 'utf8'))}`,
      loader: 'js',
    }))
  },
}

async function main() {
  const outfile = resolve(process.argv[2] ?? resolve(repoRoot, '../dsh-easymd/lib/easymd-markdown.mjs'))

  await build({
    absWorkingDir: repoRoot,
    entryPoints: [resolve(repoRoot, 'dsh-build/entry.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    tsconfig: resolve(repoRoot, 'tsconfig.json'),
    plugins: [rawTextPlugin],
    define: {
      'import.meta.env.DEV': 'false',
      'import.meta.env.PROD': 'true',
      'import.meta.env.MODE': '"production"',
      'process.env.NODE_ENV': '"production"',
    },
    // CJS 依赖（juice/cheerio 等）会在运行时 require 内建模块，ESM 产物必须补 require。
    banner: {
      js: [
        '// Bundled from easymd (AGPL-3.0-only). https://github.com/Rimagination/easymd',
        'import { createRequire as __easymdCreateRequire } from \'node:module\'',
        'const require = __easymdCreateRequire(import.meta.url)',
      ].join('\n'),
    },
    minify: true,
    legalComments: 'none',
    logLevel: 'info',
  })

  console.info(`built ${outfile}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
