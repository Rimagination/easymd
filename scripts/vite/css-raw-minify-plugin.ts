import type { Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import { transform } from 'lightningcss'

export function cssRawMinifyPlugin(): Plugin {
  return {
    name: 'css-raw-minify',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css?raw'))
        return

      const exportDefaultMatch = code.match(/^export default ("[\s\S]*")\s*;?$/m)
      const css = exportDefaultMatch
        ? JSON.parse(exportDefaultMatch[1])
        : code

      const { code: minified } = transform({
        filename: id.replace('?raw', ''),
        code: Buffer.from(css),
        minify: true,
      })

      const minifiedCss = minified.toString()

      return {
        code: exportDefaultMatch
          ? `export default ${JSON.stringify(minifiedCss)}`
          : minifiedCss,
        map: null,
      }
    },
  }
}
