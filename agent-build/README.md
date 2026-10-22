# dsh-build

给 DeepSeek Harness 适配用的构建入口：把 `src/lib/markdown`（render / lint / parse / extract）和 `src/themes` 打成一个单文件 ESM，供 `dsh-easymd` bundle 内联注册原生工具。

```bash
node dsh-build/build.mjs [outfile]
# 默认输出 ../dsh-easymd/lib/easymd-markdown.mjs
```

- `entry.ts`：只导出确定性能力，不碰 UI / ORPC / 路由。
- `build.mjs`：esbuild + 一个 `?raw` 插件（Vite 的主题 CSS 导入方式），并在产物头部注入 `createRequire`，让 juice / cheerio 这类 CJS 依赖能在 ESM 里 `require` 内建模块。
- 需要 `pnpm install`（esbuild 已列为 devDependency）。

产物约 4.6 MB（minify 后），首次调用时才加载，不影响 DSH 启动。
