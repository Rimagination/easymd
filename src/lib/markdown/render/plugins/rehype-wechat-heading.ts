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
    children: [],
  }
}

function createDiamond(): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      style: 'display:inline-block;width:10px;height:10px;border:1.5px solid #7a4d9a;border-radius:1px;transform:rotate(45deg);vertical-align:middle;margin-right:8px',
    },
    children: [],
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
        node.children.unshift(createDiamond())
      }
    })
  }
}

export default rehypeWechatHeading
