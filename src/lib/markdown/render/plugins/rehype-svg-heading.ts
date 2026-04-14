import type { Element, ElementContent, Properties, Root, Text } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface RehypeSvgHeadingOptions {
  enabled?: boolean
}

function isText(node: ElementContent): node is Text {
  return node.type === 'text'
}

function isElement(node: ElementContent): node is Element {
  return node.type === 'element'
}

function extractText(children: ElementContent[]): string {
  return children.map((child) => {
    if (isText(child)) {
      return child.value
    }
    if (isElement(child)) {
      return extractText(child.children)
    }
    return ''
  }).join('')
}

function weightedLength(text: string): number {
  return Array.from(text).reduce((total, char) => {
    if (/\s/.test(char)) {
      return total + 0.5
    }
    return total + (char.charCodeAt(0) <= 0xFF ? 0.65 : 1)
  }, 0)
}

function wrapTitle(text: string, maxUnits = 15): string[] {
  const lines: string[] = []
  let current = ''
  let units = 0

  const pushCurrent = () => {
    const value = current.trim()
    if (value) {
      lines.push(value)
    }
    current = ''
    units = 0
  }

  for (const char of Array.from(text)) {
    const charUnits = /\s/.test(char) ? 0.5 : (char.charCodeAt(0) <= 0xFF ? 0.65 : 1)
    if (current && units + charUnits > maxUnits) {
      pushCurrent()
    }

    current += char
    units += charUnits
  }

  pushCurrent()

  return lines.length > 0 ? lines : [text]
}

function createTextNode(value: string): Text {
  return { type: 'text', value }
}

function createElement(tagName: string, properties: Properties, children: ElementContent[] = []): Element {
  return {
    type: 'element',
    tagName,
    properties,
    children,
  }
}

function createAnimatedSvg(title: string, index: number): Element {
  const lines = wrapTitle(title, 15)
  const longestLine = Math.max(...lines.map(weightedLength))
  const fontSize = longestLine > 13 ? 42 : 48
  const lineHeight = fontSize + 10
  const baseHeight = 150
  const height = baseHeight + (lines.length - 1) * lineHeight
  const viewBoxWidth = 720
  const textStartY = height / 2 - ((lines.length - 1) * lineHeight) / 2

  const backgroundId = `easymd-title-bg-${index}`
  const glowId = `easymd-title-glow-${index}`
  const facetId = `easymd-title-facet-${index}`

  return createElement('svg', {
    'xmlns': 'http://www.w3.org/2000/svg',
    'viewBox': `0 0 ${viewBoxWidth} ${height}`,
    'width': '100%',
    'role': 'img',
    'aria-label': title,
    'preserveAspectRatio': 'xMidYMid meet',
  }, [
    createElement('title', {}, [createTextNode(title)]),
    createElement('defs', {}, [
      createElement('linearGradient', {
        id: backgroundId,
        x1: '0%',
        y1: '0%',
        x2: '100%',
        y2: '100%',
      }, [
        createElement('stop', { offset: '0%', stopColor: '#00897b' }),
        createElement('stop', { offset: '52%', stopColor: '#19b7a2' }),
        createElement('stop', { offset: '100%', stopColor: '#00695c' }),
        createElement('animateTransform', {
          attributeName: 'gradientTransform',
          type: 'rotate',
          values: `0 ${viewBoxWidth / 2} ${height / 2};5 ${viewBoxWidth / 2} ${height / 2};0 ${viewBoxWidth / 2} ${height / 2}`,
          dur: '7s',
          repeatCount: 'indefinite',
        }),
      ]),
      createElement('linearGradient', {
        id: glowId,
        x1: '0%',
        y1: '0%',
        x2: '100%',
        y2: '0%',
      }, [
        createElement('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: '0' }),
        createElement('stop', { offset: '24%', stopColor: '#ffffff', stopOpacity: '0' }),
        createElement('stop', { offset: '40%', stopColor: '#ffffff', stopOpacity: '0.04' }),
        createElement('stop', { offset: '50%', stopColor: '#ffffff', stopOpacity: '0.16' }),
        createElement('stop', { offset: '60%', stopColor: '#ffffff', stopOpacity: '0.04' }),
        createElement('stop', { offset: '76%', stopColor: '#ffffff', stopOpacity: '0' }),
        createElement('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: '0' }),
        createElement('animateTransform', {
          attributeName: 'gradientTransform',
          type: 'translate',
          values: `-${viewBoxWidth * 1.5} 0;${viewBoxWidth * 1.5} 0`,
          dur: '14s',
          repeatCount: 'indefinite',
        }),
      ]),
      createElement('linearGradient', {
        id: facetId,
        x1: '0%',
        y1: '0%',
        x2: '100%',
        y2: '100%',
      }, [
        createElement('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: '0.22' }),
        createElement('stop', { offset: '22%', stopColor: '#ffffff', stopOpacity: '0.08' }),
        createElement('stop', { offset: '54%', stopColor: '#ffffff', stopOpacity: '0' }),
        createElement('stop', { offset: '100%', stopColor: '#002f2a', stopOpacity: '0.18' }),
      ]),
    ]),
    createElement('rect', {
      x: '18',
      y: '16',
      width: String(viewBoxWidth - 36),
      height: String(height - 32),
      rx: '34',
      fill: `url(#${backgroundId})`,
    }),
    createElement('rect', {
      x: '18',
      y: '16',
      width: String(viewBoxWidth - 36),
      height: String(height - 32),
      rx: '34',
      fill: `url(#${facetId})`,
    }),
    createElement('rect', {
      x: '18',
      y: '16',
      width: String(viewBoxWidth - 36),
      height: String(height - 32),
      rx: '34',
      fill: `url(#${glowId})`,
    }),
    createElement('rect', {
      x: '18',
      y: '16',
      width: String(viewBoxWidth - 36),
      height: String(height - 32),
      rx: '34',
      fill: 'none',
      stroke: '#ffffff',
      strokeOpacity: '0.3',
      strokeWidth: '2',
    }),
    createElement('text', {
      x: String(viewBoxWidth / 2),
      y: String(textStartY),
      fill: '#ffffff',
      fontSize: String(fontSize),
      fontWeight: '700',
      fontFamily: `Optima, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif`,
      letterSpacing: '1.2',
      textAnchor: 'middle',
      dominantBaseline: 'middle',
    }, lines.map((line, lineIndex) => createElement('tspan', {
      x: String(viewBoxWidth / 2),
      dy: lineIndex === 0 ? '0' : String(lineHeight),
    }, [createTextNode(line)]))),
  ])
}

const rehypeSvgHeading: Plugin<[RehypeSvgHeadingOptions?], Root> = (options = {}) => {
  const { enabled = false } = options

  return (tree) => {
    if (!enabled) {
      return
    }

    let headingIndex = 0

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h1') {
        return
      }

      const title = extractText(node.children).replace(/\s+/g, ' ').trim()
      if (!title) {
        return
      }

      headingIndex += 1
      node.properties = {
        ...(node.properties || {}),
        className: ['svg-heading', 'svg-heading-h1'],
      }
      node.children = [createAnimatedSvg(title, headingIndex)]
    })
  }
}

export default rehypeSvgHeading
