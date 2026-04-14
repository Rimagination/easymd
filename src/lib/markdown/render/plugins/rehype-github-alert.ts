import type { Element, Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

const ALERT_LABELS = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
} as const

const ALERT_PATTERN = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:[ \t]*\r?\n)?/i

function getTextContent(node: any): string {
  if (!node) {
    return ''
  }

  if (node.type === 'text') {
    return node.value ?? ''
  }

  if (!Array.isArray(node.children)) {
    return ''
  }

  return node.children.map(getTextContent).join('')
}

function isParagraph(node: any): node is Element {
  return node?.type === 'element' && node.tagName === 'p'
}

const rehypeGithubAlert: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'blockquote') {
        return
      }

      const firstParagraphIndex = node.children.findIndex(isParagraph)
      if (firstParagraphIndex < 0) {
        return
      }

      const firstParagraph = node.children[firstParagraphIndex] as Element
      const firstParagraphText = getTextContent(firstParagraph).trimStart()
      const match = firstParagraphText.match(ALERT_PATTERN)
      if (!match) {
        return
      }

      const alertType = match[1].toLowerCase() as keyof typeof ALERT_LABELS
      const remainingText = firstParagraphText.slice(match[0].length).trim()
      const remainingChildren = node.children.filter((_, index) => index !== firstParagraphIndex)

      if (remainingText) {
        firstParagraph.children = [{ type: 'text', value: remainingText }]
        remainingChildren.unshift(firstParagraph)
      }

      node.tagName = 'div'
      node.properties = {
        ...node.properties,
        className: ['markdown-alert', `markdown-alert-${alertType}`],
      }
      node.children = [
        {
          type: 'element',
          tagName: 'p',
          properties: { className: ['markdown-alert-title'] },
          children: [{ type: 'text', value: ALERT_LABELS[alertType] }],
        },
        ...remainingChildren,
      ]
    })
  }
}

export default rehypeGithubAlert
