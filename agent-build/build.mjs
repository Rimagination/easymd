// 把 easymd 的 Agent 适配产物打出来（全部来自同一份 src/lib/markdown + src/themes）：
//   engine → agents/dsh/lib/easymd-markdown.mjs   （DSH bundle 内联的原生工具）
//   mcp    → agents/mcp/dist/easymd-mcp.mjs       （stdio MCP server，任何 Agent 可用）
// 用法：node agent-build/build.mjs [all|engine|mcp] [outfile]
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENGINE_OUT = resolve(repoRoot, 'agents/dsh/lib/easymd-markdown.mjs')
const MCP_OUT = resolve(repoRoot, 'agents/mcp/dist/easymd-mcp.mjs')

const BANNER = [
  '// Bundled from easymd (AGPL-3.0-only). https://github.com/Rimagination/easymd',
  'import { createRequire as __easymdCreateRequire } from \'node:module\'',
  'const require = __easymdCreateRequire(import.meta.url)',
].join('\n')

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

function common(outfile, entry, banner = BANNER) {
  return {
    absWorkingDir: repoRoot,
    entryPoints: [resolve(repoRoot, entry)],
    outfile: resolve(outfile),
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
    banner: { js: banner },
    minify: true,
    legalComments: 'none',
    logLevel: 'info',
  }
}

/**
 * DSH 用的单文件引擎。
 * @param {string} [outfile] 默认 agents/dsh/lib/easymd-markdown.mjs
 * @returns {Promise<string>} 产物绝对路径
 */
export async function buildEngine(outfile = ENGINE_OUT) {
  const target = resolve(outfile)
  await build(common(target, 'agent-build/entry.ts'))
  return target
}

/**
 * 通用 stdio MCP server（带 shebang，可直接当 bin 用）。
 * @param {string} [outfile] 默认 agents/mcp/dist/easymd-mcp.mjs
 * @returns {Promise<string>} 产物绝对路径
 */
export async function buildMcpServer(outfile = MCP_OUT) {
  const target = resolve(outfile)
  await build(common(target, 'agent-build/entry-mcp.ts', `#!/usr/bin/env node\n${BANNER}`))
  return target
}

async function main() {
  const [mode = 'all', customOut] = process.argv.slice(2)

  if (mode !== 'all' && mode !== 'engine' && mode !== 'mcp') {
    console.error('用法：node agent-build/build.mjs [all|engine|mcp] [outfile]')
    process.exitCode = 1
    return
  }

  if (mode !== 'mcp')
    console.info(`built ${await buildEngine(customOut ?? ENGINE_OUT)}`)
  if (mode !== 'engine')
    console.info(`built ${await buildMcpServer(customOut ?? MCP_OUT)}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
