import type { Element, Properties, Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface RehypeDecorativeHrOptions {
  enabled?: boolean
}

function createElement(tagName: string, properties: Properties, children: Array<Element | { type: 'text', value: string }> = []): Element {
  return {
    type: 'element',
    tagName,
    properties,
    children,
  }
}

function createDividerSvg(): Element {
  return createElement('svg', {
    'xmlns': 'http://www.w3.org/2000/svg',
    'viewBox': '0 0 560 96',
    'width': '100%',
    'height': '34',
    'aria-hidden': 'true',
    'preserveAspectRatio': 'xMidYMid meet',
  }, [
    createElement('path', {
      'd': 'M122 48h316',
      'fill': 'none',
      'stroke': '#6f857b',
      'stroke-width': '5.5',
      'stroke-linecap': 'round',
    }),
    createElement('path', {
      'd': 'M122 48c-18 0-30-11-35-28c-2 11-8 19-17 24c-8 4-18 5-29 4',
      'fill': 'none',
      'stroke': '#6f857b',
      'stroke-width': '5.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
    createElement('path', {
      'd': 'M438 48c18 0 30-11 35-28c2 11 8 19 17 24c8 4 18 5 29 4',
      'fill': 'none',
      'stroke': '#6f857b',
      'stroke-width': '5.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
    createElement('path', {
      'd': 'M41 50c-14 0-25 11-25 25s11 21 25 21c15 0 28-12 28-27c0-16-13-28-28-28c-5 0-11 1-16 5c7-11 16-18 29-18c22 0 39 16 39 38c0 20-15 34-35 34',
      'fill': 'none',
      'stroke': '#6f857b',
      'stroke-width': '5.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
    createElement('path', {
      'd': 'M519 50c14 0 25 11 25 25s-11 21-25 21c-15 0-28-12-28-27c0-16 13-28 28-28c5 0 11 1 16 5c-7-11-16-18-29-18c-22 0-39 16-39 38c0 20 15 34 35 34',
      'fill': 'none',
      'stroke': '#6f857b',
      'stroke-width': '5.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  ])
}

const rehypeDecorativeHr: Plugin<[RehypeDecorativeHrOptions?], Root> = (options = {}) => {
  const { enabled = false } = options

  return (tree) => {
    if (!enabled) {
      return
    }

    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || typeof index !== 'number' || node.tagName !== 'hr') {
        return
      }

      parent.children.splice(index, 1, createElement('section', {
        className: ['decorative-hr'],
      }, [createDividerSvg()]))

      return index
    })
  }
}

export default rehypeDecorativeHr
