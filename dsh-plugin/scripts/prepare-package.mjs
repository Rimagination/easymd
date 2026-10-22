// 发布/打包前准备：构建单文件引擎、同步 skill、拷贝 LICENSE，并校验版本与仓库根一致。
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { buildEngine } from '../../dsh-build/build.mjs'

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(pluginRoot, '..')

const readManifest = file => JSON.parse(readFileSync(file, 'utf8'))
const pluginManifest = readManifest(resolve(pluginRoot, 'package.json'))
const repoManifest = readManifest(resolve(repoRoot, 'package.json'))

if (pluginManifest.version !== repoManifest.version) {
  console.error(
    `[prepare-package] 版本不一致：dsh-plugin ${pluginManifest.version} / 仓库根 ${repoManifest.version}；`
    + '请先把两者改成同一个版本再发布。',
  )
  process.exit(1)
}

mkdirSync(resolve(pluginRoot, 'lib'), { recursive: true })
const outfile = await buildEngine(resolve(pluginRoot, 'lib/easymd-markdown.mjs'))
console.info(`[prepare-package] engine -> ${outfile}`)

await import('./sync-skills.mjs')

copyFileSync(resolve(repoRoot, 'LICENSE'), resolve(pluginRoot, 'LICENSE'))
console.info('[prepare-package] LICENSE copied')
