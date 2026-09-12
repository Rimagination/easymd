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
      style: 'display:block;flex:0 0 6px;width:6px;min-height:31px;height:auto;align-self:stretch;background:#5c307d;margin-right:12px',
    },
    children: [{ type: 'text', value: '\u00A0' }],
  }
}

function wrapHeadingContent(node: Element): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      style: 'display:block;min-width:0;flex:1 1 auto',
    },
    children: node.children,
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
        const currentStyle = typeof node.properties?.style === 'string'
          ? node.properties.style
          : ''
        node.properties = {
          ...node.properties,
          dataEasymdInlineBar: 'true',
          style: [currentStyle, 'display:flex;align-items:center;padding:0;border-left:none'].filter(Boolean).join(';'),
        }
        node.children = [createBar(), wrapHeadingContent(node)]
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
