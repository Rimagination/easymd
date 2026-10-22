// 发布/打包前准备：构建 stdio MCP server、拷贝 LICENSE，并校验版本与仓库根一致。
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { buildMcpServer } from '../../../agent-build/build.mjs'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(packageRoot, '../..')

const readManifest = file => JSON.parse(readFileSync(file, 'utf8'))
const packageManifest = readManifest(resolve(packageRoot, 'package.json'))
const repoManifest = readManifest(resolve(repoRoot, 'package.json'))

if (packageManifest.version !== repoManifest.version) {
  console.error(
    `[prepare-package] 版本不一致：agents/mcp ${packageManifest.version} / 仓库根 ${repoManifest.version}；`
    + '请先把两者改成同一个版本再发布。',
  )
  process.exit(1)
}

mkdirSync(resolve(packageRoot, 'dist'), { recursive: true })
const outfile = await buildMcpServer(resolve(packageRoot, 'dist/easymd-mcp.mjs'))
console.info(`[prepare-package] mcp -> ${outfile}`)

copyFileSync(resolve(repoRoot, 'LICENSE'), resolve(packageRoot, 'LICENSE'))
console.info('[prepare-package] LICENSE copied')
