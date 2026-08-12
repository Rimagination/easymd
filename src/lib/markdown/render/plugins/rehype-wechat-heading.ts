import type { Element, Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface Options {
  markdownStyle?: string
  inlineH2Bar?: boolean
}

function createBar(): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      style: 'display:inline-block;width:6px;height:31px;background:#5c307d;vertical-align:middle;margin-right:12px',
    },
    children: [{ type: 'text', value: '\u00A0' }],
  }
}

function createDiamond(): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      style: 'display:inline-block;flex:none;color:#5c307d;font-size:24px;font-weight:700;line-height:1;vertical-align:middle;margin-right:0',
    },
    children: [{ type: 'text', value: '\u25C7' }],
  }
}

function prependDiamond(node: Element) {
  node.children.unshift(createDiamond())
}

const rehypeWechatHeading: Plugin<[Options?], Root> = (options = {}) => {
  if (options?.markdownStyle !== 'thu-classic') {
    return tree => tree
  }

  return (tree) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'h2' && options.inlineH2Bar !== false) {
        node.properties = {
          ...node.properties,
          dataEasymdInlineBar: 'true',
        }
        node.children.unshift(createBar())
      }
      if (node.tagName === 'h3') {
        node.properties = {
          ...node.properties,
          dataEasymdWechatHeading: 'true',
        }
        prependDiamond(node)
      }
    })
  }
}

export default rehypeWechatHeading
