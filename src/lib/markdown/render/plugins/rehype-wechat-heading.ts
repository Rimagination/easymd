import type { Element, Root, Text } from 'hast'
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
      style: 'display:inline-block;width:18px;height:32px;background:#5c307d;vertical-align:middle;margin-right:10px',
    },
    children: [{ type: 'text', value: '\u00A0' }],
  }
}

function createDiamondText(): Text {
  return {
    type: 'text',
    value: '\u25C7\u00A0',
  }
}

function prependDiamondText(node: Element) {
  const firstChild = node.children[0]
  if (firstChild?.type === 'text') {
    firstChild.value = `\u25C7\u00A0${firstChild.value}`
    return
  }

  node.children.unshift(createDiamondText())
}

const rehypeWechatHeading: Plugin<[Options?], Root> = (options = {}) => {
  if (options?.markdownStyle !== 'thu-classic') {
    return tree => tree
  }

  return (tree) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'h2' && options.inlineH2Bar !== false) {
        node.children.unshift(createBar())
      }
      if (node.tagName === 'h3') {
        node.properties = {
          ...node.properties,
          dataEasymdWechatHeading: 'true',
        }
        prependDiamondText(node)
      }
    })
  }
}

export default rehypeWechatHeading
