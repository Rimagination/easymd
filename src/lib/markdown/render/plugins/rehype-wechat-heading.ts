import type { Element, Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface Options {
  markdownStyle?: string
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

function createDiamond(): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      style: 'display:inline-block;color:#7a4d9a;font-size:18px;font-weight:700;line-height:1;vertical-align:middle;margin-right:8px',
    },
    children: [{ type: 'text', value: '\u25C7' }],
  }
}

const rehypeWechatHeading: Plugin<[Options?], Root> = (options = {}) => {
  if (options?.markdownStyle !== 'thu-classic') {
    return tree => tree
  }

  return (tree) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'h2') {
        node.children.unshift(createBar())
      }
      if (node.tagName === 'h3') {
        node.properties = {
          ...node.properties,
          dataEasymdWechatHeading: 'true',
        }
        node.children.unshift(createDiamond())
      }
    })
  }
}

export default rehypeWechatHeading
