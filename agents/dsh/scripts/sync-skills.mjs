// 把仓库里的规范 skill 复制进 npm 包；npm 只上传 files 里的内容。
// 源目录默认 ../../skills/easymd（仓库根），可用 EASYMD_SRC 覆盖。
import { cpSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = resolve(process.env.EASYMD_SRC ?? resolve(pluginRoot, '../../skills/easymd'))
const targetRoot = resolve(pluginRoot, 'skills/easymd')
const checkOnly = process.argv.includes('--check')

function listFiles(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory())
      out.push(...listFiles(full, base))
    else out.push(relative(base, full))
  }
  return out.sort()
}

if (!existsSync(sourceRoot)) {
  if (existsSync(targetRoot)) {
    console.info(`[sync-skills] 源目录不存在，保留已生成的副本：${targetRoot}`)
    process.exit(0)
  }
  console.error(`[sync-skills] 找不到源目录：${sourceRoot}`)
  process.exit(1)
}

if (checkOnly) {
  const sourceFiles = listFiles(sourceRoot)
  const targetFiles = existsSync(targetRoot) ? listFiles(targetRoot) : []
  const missing = sourceFiles.filter(file => !targetFiles.includes(file))
  const extra = targetFiles.filter(file => !sourceFiles.includes(file))
  const readNode = (root, file) => readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n')
  const drifted = sourceFiles.filter(file =>
    targetFiles.includes(file) && readNode(sourceRoot, file) !== readNode(targetRoot, file),
  )
  if (missing.length || extra.length || drifted.length) {
    console.error('[sync-skills] 副本与源不一致', { missing, extra, drifted })
    process.exit(1)
  }
  console.info('[sync-skills] 副本与源一致')
  process.exit(0)
}

cpSync(sourceRoot, targetRoot, { recursive: true })
console.info(`[sync-skills] ${sourceRoot} -> ${targetRoot}`)
