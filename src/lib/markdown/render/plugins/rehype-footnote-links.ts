import type { Element, Root, Text } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface FootnoteLink {
  id: number
  href: string
  text: string
}

interface Options {
  referenceTitle?: string
  plainTextLinks?: boolean
}

const rehypeFootnoteLinks: Plugin<[Options?], Root> = (options = {}) => {
  const { referenceTitle = 'References', plainTextLinks = false } = options

  return (tree) => {
    const links: FootnoteLink[] = []
    const seenUrls = new Set<string>()
    let counter = 1
    let inReferenceSection = false
    let hasManualCitation = false
    let hasReferenceSection = false

    visit(tree, 'element', (node: Element) => {
      if (/^h[1-6]$/.test(node.tagName) && /^(?:参考资料|参考文献)$/.test(extractReferenceText(node).trim())) {
        hasReferenceSection = true
      }
      if (node.tagName === 'sup' && node.children.length === 1 && node.children[0].type === 'text' && /^\[\d+\]$/.test(node.children[0].value)) {
        hasManualCitation = true
      }
    })
    const usePlainTextLinks = plainTextLinks || (hasManualCitation && hasReferenceSection)

    visit(tree, 'element', (node: Element, index, parent) => {
      if (usePlainTextLinks && /^h[1-6]$/.test(node.tagName)) {
        inReferenceSection = /^(?:参考资料|参考文献)$/.test(extractReferenceText(node).trim())
        return
      }

      if (node.tagName !== 'a' || !node.properties?.href) {
        return
      }

      const href = String(node.properties.href)
      if (!/^(?:https?:\/\/|mailto:|tel:)/i.test(href)) {
        return
      }

      const text = extractReferenceText(node)
      if (usePlainTextLinks) {
        node.tagName = 'span'
        delete node.properties.href
        delete node.properties.target
        delete node.properties.rel

        if (inReferenceSection) {
          node.properties.style = 'word-break: break-all;'
          return
        }
      }

      if (seenUrls.has(href)) {
        const existingLink = links.find(l => l.href === href)
        if (existingLink && parent && typeof index === 'number') {
          const sup: Element = {
            type: 'element',
            tagName: 'sup',
            properties: { className: ['footnote-ref'] },
            children: [{ type: 'text', value: `[${existingLink.id}]` }],
          }
          parent.children.splice(index + 1, 0, sup)
        }
        return
      }

      const id = counter++
      links.push({ id, href, text })
      seenUrls.add(href)

      if (parent && typeof index === 'number') {
        const sup: Element = {
          type: 'element',
          tagName: 'sup',
          properties: { className: ['footnote-ref'] },
          children: [{ type: 'text', value: `[${id}]` }],
        }
        parent.children.splice(index + 1, 0, sup)
      }
    })

    if (links.length === 0) {
      return
    }

    const footnoteSection: Element = {
      type: 'element',
      tagName: 'section',
      properties: { className: ['footnotes'], dataFootnotes: '' },
      children: [
        {
          type: 'element',
          tagName: 'h4',
          properties: {},
          children: [{ type: 'text', value: referenceTitle }],
        },
        {
          type: 'element',
          tagName: 'ol',
          properties: {},
          children: links.map(link => ({
            type: 'element',
            tagName: 'li',
            properties: { id: `user-content-fn-${link.id}` },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: {},
                children: [{ type: 'text', value: `${link.text}: ` }],
              },
              {
                type: 'element',
                tagName: usePlainTextLinks ? 'span' : 'a',
                properties: usePlainTextLinks ? { style: 'word-break: break-all;' } : { href: link.href },
                children: [{ type: 'text', value: link.href }],
              },
            ],
          } as Element)),
        },
      ],
    }

    tree.children.push(footnoteSection)
  }
}

function extractReferenceText(node: Element): string {
  const title = typeof node.properties?.title === 'string'
    ? node.properties.title.trim()
    : ''
  if (title) {
    return title
  }

  const texts: string[] = []

  function walk(n: Element | Text) {
    if (n.type === 'text') {
      texts.push(n.value)
    }
    else if (n.type === 'element' && n.children) {
      for (const child of n.children) {
        if (child.type === 'text' || child.type === 'element') {
          walk(child)
        }
      }
    }
  }

  walk(node)
  return texts.join('').trim() || node.properties?.href?.toString() || ''
}

export default rehypeFootnoteLinks
