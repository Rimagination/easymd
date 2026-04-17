import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { ColorTargetPatch, TextStylePatch, TextTargetPatch } from '@/lib/markdown/visual-edit'
import { debounce } from 'es-toolkit'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold as BoldIcon,
  Highlighter,
  ImageUp,
  Italic,
  Link2,
  Palette,
  Strikethrough,
  Subscript,
  Superscript,
  Type,
  Underline as UnderlineIcon,
} from 'lucide-react'
import morphdom from 'morphdom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { suppressScrollSync, usePreviewScrollSync } from '@/components/markdown/hooks/use-scroll-sync'
import { Phone } from '@/components/mockups/iphone'
import { Safari } from '@/components/mockups/safari'
import { Button } from '@/components/ui/button'
import { triggerFileDialog } from '@/lib/actions/import-file'
import { getMarkdownLocaleTexts } from '@/lib/locale'
import {
  applyPreviewTextStyle,
  normalizePreviewSelection,
  replacePreviewColor,
  replacePreviewImageSource,
  replacePreviewText,
} from '@/lib/markdown/visual-edit'
import { uploadImage } from '@/services/upload'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { PREVIEW_WIDTH_MOBILE, usePreviewStore } from '@/stores/preview'
import { resolveMarkdownRenderStyle } from '@/themes/markdown-style/custom'
import iframeShell from './iframe-shell.html?raw'

const RENDER_DEBOUNCE_MS = 100
const VISUAL_EDIT_STYLE_ID = 'easymd-visual-edit-style'
const PREVIEW_CODE_COLLAPSE_STYLE_ID = 'easymd-code-collapse-style'
const PREVIEW_CODE_COLLAPSED_LINE_COUNT = 16
const PREVIEW_CODE_SCROLL_RESTORE_FRAMES = 5
const VISUAL_TOOLBAR_EDGE_INSET = 8
const VISUAL_TOOLBAR_FALLBACK_WIDTH = 760
const VISUAL_TOOLBAR_FALLBACK_HEIGHT = 176
const VISUAL_TOOLBAR_SELECTION_GAP = 96
const FONT_SIZE_OPTIONS = ['14px', '16px', '18px', '20px', '22px', '24px', '28px']
const FONT_FAMILY_OPTIONS = [
  { label: '默认字体', value: '' },
  { label: '微软雅黑', value: 'Microsoft YaHei, PingFang SC, sans-serif' },
  { label: '苹方', value: 'PingFang SC, Microsoft YaHei, sans-serif' },
  { label: '宋体', value: 'Songti SC, SimSun, serif' },
  { label: '楷体', value: 'KaiTi, Kaiti SC, serif' },
  { label: 'Optima', value: 'Optima, Microsoft YaHei, serif' },
]
const LINE_HEIGHT_OPTIONS = ['1.2', '1.5', '1.6', '1.8', '2']
const LETTER_SPACING_OPTIONS = ['0', '0.04em', '0.08em', '0.12em', '0.18em']
const TEXT_ALIGN_OPTIONS = [
  { icon: AlignLeft, label: '左对齐', value: 'left' },
  { icon: AlignCenter, label: '居中', value: 'center' },
  { icon: AlignRight, label: '右对齐', value: 'right' },
  { icon: AlignJustify, label: '两端对齐', value: 'justify' },
] as const
const COLOR_SIGNATURE_ATTRIBUTES = [
  'd',
  'points',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'transform',
]

interface VisualSelectionState {
  backgroundColorTarget: ColorTargetPatch | null
  colorTarget: ColorTargetPatch | null
  imageSrc: string | null
  text: string
  textTarget: TextTargetPatch | null
}

interface VisualPanelPosition {
  x: number
  y: number
}

function clampPanelPosition(
  position: VisualPanelPosition,
  container: HTMLElement | null,
  panel: HTMLElement | null,
): VisualPanelPosition {
  if (!container) {
    return {
      x: Math.max(VISUAL_TOOLBAR_EDGE_INSET, position.x),
      y: Math.max(VISUAL_TOOLBAR_EDGE_INSET, position.y),
    }
  }

  const containerRect = container.getBoundingClientRect()
  const panelRect = panel?.getBoundingClientRect()
  const panelWidth = panelRect?.width ?? VISUAL_TOOLBAR_FALLBACK_WIDTH
  const panelHeight = panelRect?.height ?? VISUAL_TOOLBAR_FALLBACK_HEIGHT
  const maxX = Math.max(
    VISUAL_TOOLBAR_EDGE_INSET,
    containerRect.width - panelWidth - VISUAL_TOOLBAR_EDGE_INSET,
  )
  const maxY = Math.max(
    VISUAL_TOOLBAR_EDGE_INSET,
    containerRect.height - panelHeight - VISUAL_TOOLBAR_EDGE_INSET,
  )

  return {
    x: Math.min(Math.max(VISUAL_TOOLBAR_EDGE_INSET, position.x), maxX),
    y: Math.min(Math.max(VISUAL_TOOLBAR_EDGE_INSET, position.y), maxY),
  }
}

function normalizeHexColor(value: string | null | undefined): string | null {
  const color = value?.trim()
  if (!color || color === 'none' || color === 'transparent' || color.startsWith('url(')) {
    return null
  }

  const shortHex = color.match(/^#([0-9a-f]{3})$/i)
  if (shortHex) {
    return `#${shortHex[1].split('').map(char => `${char}${char}`).join('')}`.toLowerCase()
  }

  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color.toLowerCase()
  }

  const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/i)
  if (!rgb) {
    return null
  }
  if (rgb[4] !== undefined && Number(rgb[4]) <= 0.02) {
    return null
  }

  return `#${
    [rgb[1], rgb[2], rgb[3]]
      .map(channel => Math.max(0, Math.min(255, Number(channel))).toString(16).padStart(2, '0'))
      .join('')
  }`
}

function isSelectableColor(value: string | null | undefined): value is string {
  const color = value?.trim().toLowerCase()
  return Boolean(
    color
    && color !== 'none'
    && color !== 'transparent'
    && color !== 'currentcolor'
    && !color.startsWith('url('),
  )
}

function getInlineStyleColor(element: Element, property: string): string | null {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
    return null
  }

  const value = element.style.getPropertyValue(property)
  return isSelectableColor(value) ? value : null
}

function getElementColorCandidate(
  element: Element,
): Pick<ColorTargetPatch, 'attributeName' | 'currentColor'> | null {
  const tagName = element.tagName.toLowerCase()
  if (tagName === 'img') {
    return null
  }

  if (element instanceof SVGElement) {
    for (const attributeName of ['fill', 'stroke'] as const) {
      const attributeColor = element.getAttribute(attributeName)
      if (isSelectableColor(attributeColor)) {
        return { attributeName, currentColor: attributeColor }
      }

      const styleColor = getInlineStyleColor(element, attributeName)
      if (styleColor) {
        return { attributeName, currentColor: styleColor }
      }
    }
    return null
  }

  if (element instanceof HTMLElement) {
    for (const attributeName of ['background-color', 'border-color', 'color'] as const) {
      const styleColor = getInlineStyleColor(element, attributeName)
      if (styleColor) {
        return { attributeName, currentColor: styleColor }
      }
    }
  }

  return null
}

function buildElementSignature(element: Element): Record<string, string> {
  const signature: Record<string, string> = {}

  for (const attribute of COLOR_SIGNATURE_ATTRIBUTES) {
    const value = element.getAttribute(attribute)
    if (value) {
      signature[attribute.toLowerCase()] = value
    }
  }

  return signature
}

function getTextTargetOccurrenceIndex(element: Element): number | undefined {
  const tagName = element.tagName.toLowerCase()
  const text = normalizePreviewSelection(element.textContent ?? '')
  if (!tagName || !text) {
    return undefined
  }

  let occurrenceIndex = 0
  for (const candidate of element.ownerDocument.querySelectorAll(tagName)) {
    if (normalizePreviewSelection(candidate.textContent ?? '') !== text) {
      continue
    }

    if (candidate === element) {
      return occurrenceIndex
    }

    occurrenceIndex += 1
  }

  return undefined
}

function buildTextTargetPatch(element: HTMLElement | SVGElement): TextTargetPatch {
  return {
    occurrenceIndex: getTextTargetOccurrenceIndex(element),
    signature: buildElementSignature(element),
    tagName: element.tagName.toLowerCase(),
    text: normalizePreviewSelection(element.textContent ?? ''),
  }
}

function findColorTarget(
  target: Element | null,
): { color: string | null, element: Element, patch: ColorTargetPatch } | null {
  let element: Element | null = target

  while (element && element.id !== 'easymd') {
    const candidate = getElementColorCandidate(element)
    if (candidate) {
      const text = element.tagName.toLowerCase() === 'text'
        ? normalizePreviewSelection(element.textContent ?? '')
        : undefined
      const patch: ColorTargetPatch = {
        ...candidate,
        signature: buildElementSignature(element),
        tagName: element.tagName.toLowerCase(),
        text,
      }

      return {
        color: normalizeHexColor(candidate.currentColor),
        element,
        patch,
      }
    }

    element = element.parentElement
  }

  return null
}

function findBackgroundColorTarget(
  target: Element | null,
): { color: string, element: HTMLElement, patch: ColorTargetPatch } | null {
  let element: Element | null = target

  while (element && element.id !== 'easymd') {
    if (element instanceof HTMLElement && !element.closest('img')) {
      const computed = element.ownerDocument.defaultView?.getComputedStyle(element)
      const color = normalizeHexColor(computed?.backgroundColor)
      if (color) {
        return {
          color,
          element,
          patch: {
            attributeName: 'background-color',
            currentColor: computed?.backgroundColor,
            signature: buildElementSignature(element),
            tagName: element.tagName.toLowerCase(),
            text: normalizePreviewSelection(element.textContent ?? ''),
          },
        }
      }
    }

    element = element.parentElement
  }

  return null
}

function hasVisualSelection(selection: VisualSelectionState): boolean {
  return Boolean(selection.text || selection.imageSrc || selection.colorTarget || selection.backgroundColorTarget)
}

function getSelectionRect(selection: Selection | null): DOMRect | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }

  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  if (rect.width > 0 || rect.height > 0) {
    return rect
  }

  return range.getClientRects()[0] ?? null
}

const TEXT_EDIT_TARGET_SELECTOR = [
  'span',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'mark',
  'small',
  'a',
  'p',
  'li',
  'blockquote',
  'figcaption',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'td',
  'th',
  'text',
  'tspan',
].join(',')

function hasDirectReadableText(element: Element): boolean {
  return Array.from(element.childNodes).some(node =>
    node.nodeType === 3
    && Boolean(normalizePreviewSelection(node.textContent ?? '')),
  )
}

function getTextEditTarget(target: Element | null): HTMLElement | SVGElement | null {
  if (!target || target.closest('img')) {
    return null
  }

  const closestTextTarget = target.closest(TEXT_EDIT_TARGET_SELECTOR)
  if (closestTextTarget) {
    return closestTextTarget as HTMLElement | SVGElement
  }

  let element: Element | null = target
  while (element && element.id !== 'easymd') {
    if (hasDirectReadableText(element)) {
      return element as HTMLElement | SVGElement
    }
    element = element.parentElement
  }

  return null
}

function getTextEditTargetFromPoint(
  doc: Document,
  event: MouseEvent,
  target: Element | null,
): HTMLElement | SVGElement | null {
  const directTarget = getTextEditTarget(target)
  if (directTarget) {
    return directTarget
  }

  for (const element of doc.elementsFromPoint(event.clientX, event.clientY)) {
    const textTarget = getTextEditTarget(element)
    if (textTarget) {
      return textTarget
    }
  }

  return null
}

function positionToolbarNearIframeRect(
  rect: DOMRect,
  iframe: HTMLIFrameElement | null,
  container: HTMLElement | null,
  panel: HTMLElement | null,
): VisualPanelPosition {
  if (!iframe || !container) {
    return { x: 8, y: 8 }
  }

  const iframeRect = iframe.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const panelRect = panel?.getBoundingClientRect()
  const panelHeight = panelRect?.height ?? VISUAL_TOOLBAR_FALLBACK_HEIGHT
  const x = iframeRect.left - containerRect.left + rect.left
  const anchorTop = iframeRect.top - containerRect.top + rect.top
  const anchorBottom = iframeRect.top - containerRect.top + rect.bottom
  const above = clampPanelPosition({
    x,
    y: anchorTop - panelHeight - VISUAL_TOOLBAR_SELECTION_GAP,
  }, container, panel)
  const below = clampPanelPosition({
    x,
    y: anchorBottom + VISUAL_TOOLBAR_SELECTION_GAP,
  }, container, panel)
  const aboveGap = anchorTop - (above.y + panelHeight)
  const belowGap = below.y - anchorBottom

  if (aboveGap >= VISUAL_TOOLBAR_SELECTION_GAP) {
    return above
  }

  if (belowGap > aboveGap) {
    return below
  }

  return above
}

function getTextAlign(value: string): TextStylePatch['textAlign'] {
  return TEXT_ALIGN_OPTIONS.some(option => option.value === value)
    ? value as TextStylePatch['textAlign']
    : 'left'
}

function readTextFormat(element: Element | null) {
  const computed = element ? element.ownerDocument.defaultView?.getComputedStyle(element) : null
  const fontWeight = Number.parseInt(computed?.fontWeight ?? '', 10)
  const textDecoration = computed?.textDecorationLine ?? ''
  const verticalAlign = computed?.verticalAlign ?? ''

  return {
    backgroundColor: normalizeHexColor(computed?.backgroundColor) ?? '#fff0ec',
    bold: Number.isFinite(fontWeight) ? fontWeight >= 600 : computed?.fontWeight === 'bold',
    color: normalizeHexColor(computed?.color) ?? '#111827',
    fontFamily: '',
    fontSize: computed?.fontSize && FONT_SIZE_OPTIONS.includes(computed.fontSize)
      ? computed.fontSize
      : '16px',
    italic: computed?.fontStyle === 'italic',
    letterSpacing: computed?.letterSpacing && computed.letterSpacing !== 'normal'
      ? computed.letterSpacing
      : '0',
    lineHeight: computed?.lineHeight && !computed.lineHeight.endsWith('px')
      ? computed.lineHeight
      : '1.8',
    strike: textDecoration.includes('line-through'),
    subscript: verticalAlign === 'sub',
    superscript: verticalAlign === 'super',
    textAlign: getTextAlign(computed?.textAlign ?? 'left'),
    underline: textDecoration.includes('underline'),
  }
}

function getPreviewScrollElement(doc: Document | null | undefined): HTMLElement | null {
  return (doc?.scrollingElement || doc?.documentElement) as HTMLElement | null
}

function createCodeBlockKey(pre: HTMLPreElement, index: number): string {
  const text = pre.textContent ?? ''
  const head = text.slice(0, 80)
  const tail = text.slice(-80)
  return `${index}:${text.length}:${head}:${tail}`
}

function shouldCollapseCodeBlock(pre: HTMLPreElement): boolean {
  const text = pre.textContent ?? ''
  return text.split(/\r\n|\r|\n/).length > PREVIEW_CODE_COLLAPSED_LINE_COUNT
}

function setCodeBlockCollapsed(wrapper: HTMLElement, button: HTMLButtonElement, collapsed: boolean) {
  wrapper.dataset.collapsed = String(collapsed)
  button.setAttribute('aria-expanded', String(!collapsed))
  button.textContent = collapsed ? '展开代码' : '收起代码'
}

function installPreviewCodeCollapseStyle(doc: Document) {
  if (doc.getElementById(PREVIEW_CODE_COLLAPSE_STYLE_ID)) {
    return
  }

  const style = doc.createElement('style')
  style.id = PREVIEW_CODE_COLLAPSE_STYLE_ID
  style.textContent = `
#easymd .easymd-code-fold {
  position: relative;
  display: flow-root;
}

#easymd .easymd-code-fold[data-collapsed='true'] > pre {
  max-height: 18rem !important;
  overflow: hidden !important;
  -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
}

#easymd .easymd-code-fold__toggle {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  z-index: 2;
  height: 1.75rem;
  border: 1px solid rgba(148, 163, 184, 0.55);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: #334155;
  cursor: pointer;
  font: 500 12px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0;
  padding: 0 0.55rem;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

#easymd .easymd-code-fold__toggle:hover {
  border-color: rgba(15, 23, 42, 0.35);
  background: rgba(255, 255, 255, 0.98);
  color: #0f172a;
}

#easymd .easymd-code-fold__toggle:focus-visible {
  outline: 2px solid #f59e0b;
  outline-offset: 2px;
}
`
  doc.head.appendChild(style)
}

function enhancePreviewCodeBlocks(doc: Document, collapsedStates: Map<string, boolean>) {
  installPreviewCodeCollapseStyle(doc)

  const preBlocks = Array.from(doc.querySelectorAll<HTMLPreElement>('#easymd pre'))
  preBlocks.forEach((pre, index) => {
    const key = createCodeBlockKey(pre, index)
    let wrapper = pre.closest<HTMLElement>('[data-easymd-code-block="true"]')
    let button = wrapper?.querySelector<HTMLButtonElement>('[data-easymd-code-toggle="true"]') ?? null

    if (!wrapper) {
      wrapper = doc.createElement('div')
      wrapper.className = 'easymd-code-fold'
      wrapper.dataset.easymdCodeBlock = 'true'
      pre.parentNode?.insertBefore(wrapper, pre)
      wrapper.appendChild(pre)
    }

    if (!button) {
      button = doc.createElement('button')
      button.type = 'button'
      button.className = 'easymd-code-fold__toggle'
      button.dataset.easymdCodeToggle = 'true'
      wrapper.insertBefore(button, pre)
    }

    wrapper.dataset.easymdCodeKey = key

    const collapsed = collapsedStates.get(key) ?? shouldCollapseCodeBlock(pre)
    collapsedStates.set(key, collapsed)
    setCodeBlockCollapsed(wrapper, button, collapsed)

    button.onclick = (event) => {
      event.preventDefault()
      event.stopPropagation()
      const nextCollapsed = wrapper.dataset.collapsed !== 'true'
      collapsedStates.set(key, nextCollapsed)
      setCodeBlockCollapsed(wrapper, button, nextCollapsed)
    }
  })
}

function restorePreviewScroll(iframe: HTMLIFrameElement, scrollTop: number, scrollLeft: number) {
  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  const scrollElement = getPreviewScrollElement(doc)
  if (!win || !scrollElement) {
    return
  }

  let frame = 0
  const applyScroll = () => {
    scrollElement.scrollTop = Math.min(
      scrollTop,
      Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight),
    )
    scrollElement.scrollLeft = scrollLeft
    frame += 1

    if (frame < PREVIEW_CODE_SCROLL_RESTORE_FRAMES) {
      win.requestAnimationFrame(applyScroll)
    }
  }

  win.requestAnimationFrame(applyScroll)
}

function installVisualEditStyle(doc: Document) {
  if (doc.getElementById(VISUAL_EDIT_STYLE_ID)) {
    return
  }

  const style = doc.createElement('style')
  style.id = VISUAL_EDIT_STYLE_ID
  style.textContent = `
body[data-easymd-visual-edit='true'] #easymd {
  user-select: text;
}

body[data-easymd-visual-edit='true'] #easymd p,
body[data-easymd-visual-edit='true'] #easymd li,
body[data-easymd-visual-edit='true'] #easymd blockquote,
body[data-easymd-visual-edit='true'] #easymd figcaption,
body[data-easymd-visual-edit='true'] #easymd h1,
body[data-easymd-visual-edit='true'] #easymd h2,
body[data-easymd-visual-edit='true'] #easymd h3,
body[data-easymd-visual-edit='true'] #easymd h4,
body[data-easymd-visual-edit='true'] #easymd h5,
body[data-easymd-visual-edit='true'] #easymd h6,
body[data-easymd-visual-edit='true'] #easymd span,
body[data-easymd-visual-edit='true'] #easymd text {
  cursor: text;
}

body[data-easymd-visual-edit='true'] #easymd img {
  cursor: pointer;
  transition: outline-color 0.16s ease, outline-offset 0.16s ease;
}

body[data-easymd-visual-edit='true'] #easymd img:hover,
body[data-easymd-visual-edit='true'] #easymd img[data-easymd-selected-image='true'] {
  outline: 3px solid #f59e0b;
  outline-offset: 4px;
}

body[data-easymd-visual-edit='true'] #easymd [data-easymd-selected-color-target='true'] {
  outline: 2px solid #f59e0b;
  outline-offset: 3px;
}

body[data-easymd-visual-edit='true'] #easymd [data-easymd-selected-text-target='true'] {
  outline: 2px solid rgba(245, 158, 11, 0.7);
  outline-offset: 4px;
}

body[data-easymd-visual-edit='true'] #easymd svg [data-easymd-selected-color-target='true'] {
  filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.75));
  outline: none;
}

body[data-easymd-visual-edit='true'] ::selection {
  background: rgba(245, 158, 11, 0.28);
}
`
  doc.head.appendChild(style)
}

function clearSelectedImages(doc: Document) {
  doc
    .querySelectorAll('img[data-easymd-selected-image="true"]')
    .forEach(img => img.removeAttribute('data-easymd-selected-image'))
}

function clearSelectedColorTargets(doc: Document) {
  doc
    .querySelectorAll('[data-easymd-selected-color-target="true"]')
    .forEach(element => element.removeAttribute('data-easymd-selected-color-target'))
}

function clearSelectedTextTargets(doc: Document) {
  doc
    .querySelectorAll('[data-easymd-selected-text-target="true"]')
    .forEach(element => element.removeAttribute('data-easymd-selected-text-target'))
}

interface VisualEditToolbarProps {
  active: boolean
  backgroundColor: string
  bold: boolean
  containerRef: RefObject<HTMLDivElement | null>
  color: string
  fontFamily: string
  fontSize: string
  imageUrl: string
  italic: boolean
  letterSpacing: string
  lineHeight: string
  position: VisualPanelPosition
  replacementText: string
  selection: VisualSelectionState
  strike: boolean
  subscript: boolean
  superscript: boolean
  textAlign: TextStylePatch['textAlign']
  underline: boolean
  onBackgroundColorChange: (color: string) => void
  onBoldChange: (enabled: boolean) => void
  onColorChange: (color: string) => void
  onFontFamilyChange: (fontFamily: string) => void
  onFontSizeChange: (fontSize: string) => void
  onImageUrlChange: (url: string) => void
  onItalicChange: (enabled: boolean) => void
  onLetterSpacingChange: (letterSpacing: string) => void
  onLineHeightChange: (lineHeight: string) => void
  onPositionChange: (position: VisualPanelPosition) => void
  onReady: (panel: HTMLDivElement) => void
  onReplaceImageFile: () => void
  onReplacementTextChange: (text: string) => void
  onStrikeChange: (enabled: boolean) => void
  onSubscriptChange: (enabled: boolean) => void
  onSuperscriptChange: (enabled: boolean) => void
  onTextAlignChange: (align: TextStylePatch['textAlign']) => void
  onUnderlineChange: (enabled: boolean) => void
}

function VisualEditToolbar({
  active,
  backgroundColor,
  bold,
  containerRef,
  color,
  fontFamily,
  fontSize,
  imageUrl,
  italic,
  letterSpacing,
  lineHeight,
  position,
  replacementText,
  selection,
  strike,
  subscript,
  superscript,
  textAlign,
  underline,
  onBackgroundColorChange,
  onBoldChange,
  onColorChange,
  onFontFamilyChange,
  onFontSizeChange,
  onImageUrlChange,
  onItalicChange,
  onLetterSpacingChange,
  onLineHeightChange,
  onPositionChange,
  onReady,
  onReplaceImageFile,
  onReplacementTextChange,
  onStrikeChange,
  onSubscriptChange,
  onSuperscriptChange,
  onTextAlignChange,
  onUnderlineChange,
}: VisualEditToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const setToolbarRef = useCallback((node: HTMLDivElement | null) => {
    toolbarRef.current = node
    if (node) {
      onReady(node)
    }
  }, [onReady])

  const handleDragStart = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    const startX = event.clientX
    const startY = event.clientY
    const startPosition = position

    const handlePointerMove = (moveEvent: PointerEvent) => {
      onPositionChange(clampPanelPosition(
        {
          x: startPosition.x + moveEvent.clientX - startX,
          y: startPosition.y + moveEvent.clientY - startY,
        },
        containerRef.current,
        toolbarRef.current,
      ))
    }

    const stopDragging = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    event.preventDefault()
  }, [containerRef, onPositionChange, position])

  if (!active) {
    return null
  }

  const toggleButtonClass = `
    h-8 min-w-8 border border-slate-200/80 bg-white/55 px-2 text-slate-700
    hover:bg-white/85 data-[active=true]:border-emerald-500/60
    data-[active=true]:bg-emerald-500 data-[active=true]:text-white
  `

  return (
    <div
      data-easymd-visual-toolbar="true"
      ref={setToolbarRef}
      className={`
        pointer-events-auto absolute top-0 left-0 z-30
        w-[min(74rem,calc(100%-1rem))] max-w-[calc(100%-1rem)] rounded-lg border
        border-white/70 bg-white/70 p-2 text-slate-800 shadow-2xl
        shadow-slate-900/15 backdrop-blur-xl
      `}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      onMouseDown={(event) => {
        const target = event.target as HTMLElement | null
        if (target?.closest('input, select, textarea, label')) {
          return
        }
        event.preventDefault()
      }}
    >
      <div
        onPointerDown={handleDragStart}
        className={`
          mb-2 flex cursor-move items-center justify-between gap-3 text-xs
          text-slate-600 select-none
        `}
      >
        <span className="truncate">
          {selection.text
            ? `文字：${selection.text.slice(0, 32)}${selection.text.length > 32 ? '…' : ''}`
            : selection.imageSrc
              ? '图片已选中'
              : selection.colorTarget
                ? `图形：${selection.colorTarget.attributeName}`
                : '选择预览元素后编辑'}
        </span>
        <span className="shrink-0 text-[11px] text-slate-500">随改随渲染</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={fontFamily}
          onChange={event => onFontFamilyChange(event.target.value)}
          className={`
            h-8 w-36 border border-slate-200/80 bg-white/70 px-2 text-sm
            text-slate-800 outline-none
            disabled:opacity-45
          `}
          aria-label="字体"
          disabled={!selection.text}
        >
          {FONT_FAMILY_OPTIONS.map(option => (
            <option key={option.label} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          value={fontSize}
          onChange={event => onFontSizeChange(event.target.value)}
          className={`
            h-8 w-20 border border-slate-200/80 bg-white/70 px-2 text-sm
            text-slate-800 outline-none
            disabled:opacity-45
          `}
          aria-label="字号"
          disabled={!selection.text}
        >
          {FONT_SIZE_OPTIONS.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>

        <label
          className={`
            flex h-8 items-center gap-1 border border-slate-200/80 bg-white/70
            px-2 text-xs text-slate-700
          `}
          title="文字或图形颜色"
        >
          <Palette className="size-3.5" />
          <input
            type="color"
            value={color}
            onChange={event => onColorChange(event.target.value)}
            className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
            aria-label="颜色"
          />
        </label>

        <label
          className={`
            flex h-8 items-center gap-1 border border-slate-200/80 bg-white/70
            px-2 text-xs text-slate-700
          `}
          title={selection.backgroundColorTarget ? '背景或色块颜色' : '文字底色'}
        >
          <Highlighter className="size-3.5" />
          <input
            type="color"
            value={backgroundColor}
            onChange={event => onBackgroundColorChange(event.target.value)}
            className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
            aria-label={selection.backgroundColorTarget ? '背景或色块颜色' : '文字底色'}
            disabled={!selection.text && !selection.backgroundColorTarget}
          />
        </label>

        <div className="mx-1 h-8 w-px bg-slate-200/80" />

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={toggleButtonClass}
          data-active={bold}
          disabled={!selection.text}
          title="加粗"
          onClick={() => onBoldChange(!bold)}
        >
          <BoldIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={toggleButtonClass}
          data-active={italic}
          disabled={!selection.text}
          title="斜体"
          onClick={() => onItalicChange(!italic)}
        >
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={toggleButtonClass}
          data-active={underline}
          disabled={!selection.text}
          title="下划线"
          onClick={() => onUnderlineChange(!underline)}
        >
          <UnderlineIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={toggleButtonClass}
          data-active={strike}
          disabled={!selection.text}
          title="删除线"
          onClick={() => onStrikeChange(!strike)}
        >
          <Strikethrough className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={toggleButtonClass}
          data-active={superscript}
          disabled={!selection.text}
          title="文字上标"
          onClick={() => onSuperscriptChange(!superscript)}
        >
          <Superscript className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={toggleButtonClass}
          data-active={subscript}
          disabled={!selection.text}
          title="文字下标"
          onClick={() => onSubscriptChange(!subscript)}
        >
          <Subscript className="size-4" />
        </Button>

        <div className="mx-1 h-8 w-px bg-slate-200/80" />

        {TEXT_ALIGN_OPTIONS.map(({ icon: Icon, label, value }) => (
          <Button
            key={value}
            type="button"
            size="icon-sm"
            variant="ghost"
            className={toggleButtonClass}
            data-active={textAlign === value}
            disabled={!selection.text}
            title={label}
            onClick={() => onTextAlignChange(value)}
          >
            <Icon className="size-4" />
          </Button>
        ))}

        <select
          value={lineHeight}
          onChange={event => onLineHeightChange(event.target.value)}
          className={`
            h-8 w-20 border border-slate-200/80 bg-white/70 px-2 text-sm
            text-slate-800 outline-none
            disabled:opacity-45
          `}
          aria-label="行高"
          disabled={!selection.text}
        >
          {LINE_HEIGHT_OPTIONS.map(value => (
            <option key={value} value={value}>{`行距 ${value}`}</option>
          ))}
        </select>

        <select
          value={letterSpacing}
          onChange={event => onLetterSpacingChange(event.target.value)}
          className={`
            h-8 w-24 border border-slate-200/80 bg-white/70 px-2 text-sm
            text-slate-800 outline-none
            disabled:opacity-45
          `}
          aria-label="字间距"
          disabled={!selection.text}
        >
          {LETTER_SPACING_OPTIONS.map(value => (
            <option key={value} value={value}>{value === '0' ? '字距 0' : `字距 ${value}`}</option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <div className="flex min-w-64 flex-1 items-center gap-1.5">
          <Type className="size-4 text-slate-500" />
          <input
            value={replacementText}
            onChange={event => onReplacementTextChange(event.target.value)}
            placeholder="文字内容"
            className={`
              h-8 min-w-0 flex-1 border border-slate-200/80 bg-white/70 px-2
              text-sm text-slate-800 outline-none
              placeholder:text-slate-400
              disabled:opacity-45
            `}
            aria-label="替换文字"
            disabled={!selection.text}
          />
        </div>

        {(selection.imageSrc || imageUrl) && (
          <div className="flex min-w-72 flex-1 items-center gap-1.5">
            <Link2 className="size-4 text-slate-500" />
            <input
              value={imageUrl}
              onChange={event => onImageUrlChange(event.target.value)}
              placeholder="图片地址"
              className={`
                h-8 min-w-0 flex-1 border border-slate-200/80 bg-white/70 px-2
                text-sm text-slate-800 outline-none
                placeholder:text-slate-400
              `}
              aria-label="图片地址"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`
                h-8 border border-slate-200/80 bg-white/55 px-2 text-slate-700
                hover:bg-white/85
              `}
              onClick={onReplaceImageFile}
            >
              <ImageUp className="size-3.5" />
              换图
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MarkdownRender() {
  const content = useFilesStore(state => state.currentContent)
  const setContent = useFilesStore(state => state.setCurrentContent)
  const enableScrollSync = useEditorStore(state => state.enableScrollSync)
  const enableFootnoteLinks = useEditorStore(state => state.enableFootnoteLinks)
  const openLinksInNewWindow = useEditorStore(state => state.openLinksInNewWindow)
  const previewWidth = usePreviewStore(state => state.previewWidth)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const mermaidTheme = usePreviewStore(state => state.mermaidTheme)
  const infographic = usePreviewStore(state => state.infographic)
  const importedMarkdownStyles = usePreviewStore(state => state.importedMarkdownStyles)
  const customCss = usePreviewStore(state => state.customCss)
  const paletteOverrideCss = usePreviewStore(state => state.paletteOverrideCss)
  const renderedHtml = usePreviewStore(state => state.getRenderedHtml('html'))
  const setRenderedHtml = usePreviewStore(state => state.setRenderedHtml)
  const clearRenderedHtmlCache = usePreviewStore(state => state.clearRenderedHtmlCache)
  const resolvedStyle = useMemo(
    () => {
      const style = resolveMarkdownRenderStyle(markdownStyle, importedMarkdownStyles, customCss)
      return {
        ...style,
        customCss: [style.customCss, paletteOverrideCss].filter(Boolean).join('\n'),
      }
    },
    [markdownStyle, importedMarkdownStyles, customCss, paletteOverrideCss],
  )

  const { iframeRef, onIframeLoad: onScrollSyncLoad } = usePreviewScrollSync({
    enabled: enableScrollSync,
  })

  const iframeReadyRef = useRef(false)
  const pendingHtmlRef = useRef<string | null>(null)
  const canceledRef = useRef(false)
  const contentRef = useRef(content)
  const renderedHtmlRef = useRef(renderedHtml)
  const previewPanelContainerRef = useRef<HTMLDivElement>(null)
  const codeBlockCollapsedStatesRef = useRef(new Map<string, boolean>())
  const visualAnchorRectRef = useRef<DOMRect | null>(null)
  const [iframeRevision, setIframeRevision] = useState(0)
  const [visualSelection, setVisualSelection] = useState<VisualSelectionState>({
    backgroundColorTarget: null,
    colorTarget: null,
    imageSrc: null,
    text: '',
    textTarget: null,
  })
  const [visualFontFamily, setVisualFontFamily] = useState('')
  const [visualFontSize, setVisualFontSize] = useState('16px')
  const [visualColor, setVisualColor] = useState('#111827')
  const [visualBackgroundColor, setVisualBackgroundColor] = useState('#fff0ec')
  const [visualBold, setVisualBold] = useState(false)
  const [visualItalic, setVisualItalic] = useState(false)
  const [visualUnderline, setVisualUnderline] = useState(false)
  const [visualStrike, setVisualStrike] = useState(false)
  const [visualSuperscript, setVisualSuperscript] = useState(false)
  const [visualSubscript, setVisualSubscript] = useState(false)
  const [visualLineHeight, setVisualLineHeight] = useState('1.8')
  const [visualLetterSpacing, setVisualLetterSpacing] = useState('0')
  const [visualTextAlign, setVisualTextAlign] = useState<TextStylePatch['textAlign']>('left')
  const [visualReplacementText, setVisualReplacementText] = useState('')
  const [visualImageUrl, setVisualImageUrl] = useState('')
  const [visualToolbarPosition, setVisualToolbarPosition] = useState<VisualPanelPosition>({
    x: 8,
    y: 8,
  })

  useEffect(() => {
    contentRef.current = content
  }, [content])

  useEffect(() => {
    renderedHtmlRef.current = renderedHtml
  }, [renderedHtml])

  const updateIframeContent = useCallback((html: string) => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    const body = doc?.body

    if (!body) {
      pendingHtmlRef.current = html
      return
    }

    const scrollElement = getPreviewScrollElement(doc)
    const shouldPreserveScroll = Boolean(scrollElement && body.querySelector('#easymd'))
    const scrollTop = shouldPreserveScroll ? scrollElement?.scrollTop ?? 0 : 0
    const scrollLeft = shouldPreserveScroll ? scrollElement?.scrollLeft ?? 0 : 0
    const wrapper = document.createElement('body')
    wrapper.innerHTML = html

    morphdom(body, wrapper, {
      childrenOnly: true,
      onBeforeElUpdated(fromEl, toEl) {
        if (fromEl.isEqualNode(toEl)) {
          return false
        }
        return true
      },
    })

    enhancePreviewCodeBlocks(doc, codeBlockCollapsedStatesRef.current)

    if (shouldPreserveScroll && iframe) {
      restorePreviewScroll(iframe, scrollTop, scrollLeft)
    }
  }, [iframeRef])

  const syncTextControlsFromElement = useCallback((element: Element | null) => {
    const format = readTextFormat(element)

    setVisualBackgroundColor(format.backgroundColor)
    setVisualBold(format.bold)
    setVisualColor(format.color)
    setVisualFontFamily(format.fontFamily)
    setVisualFontSize(format.fontSize)
    setVisualItalic(format.italic)
    setVisualLetterSpacing(format.letterSpacing)
    setVisualLineHeight(format.lineHeight)
    setVisualStrike(format.strike)
    setVisualSubscript(format.subscript)
    setVisualSuperscript(format.superscript)
    setVisualTextAlign(format.textAlign)
    setVisualUnderline(format.underline)
  }, [])

  const moveToolbarToRect = useCallback((rect: DOMRect) => {
    visualAnchorRectRef.current = rect
    const toolbar = previewPanelContainerRef.current?.querySelector<HTMLElement>(
      '[data-easymd-visual-toolbar="true"]',
    ) ?? null

    setVisualToolbarPosition(positionToolbarNearIframeRect(
      rect,
      iframeRef.current,
      previewPanelContainerRef.current,
      toolbar,
    ))
  }, [iframeRef])

  const clearVisualSelection = useCallback(() => {
    visualAnchorRectRef.current = null
    const doc = iframeRef.current?.contentDocument
    if (doc) {
      clearSelectedImages(doc)
      clearSelectedColorTargets(doc)
      clearSelectedTextTargets(doc)
    }

    setVisualSelection({
      backgroundColorTarget: null,
      colorTarget: null,
      imageSrc: null,
      text: '',
      textTarget: null,
    })
    setVisualImageUrl('')
    setVisualReplacementText('')
  }, [iframeRef])

  const handleToolbarReady = useCallback((toolbar: HTMLDivElement) => {
    if (!hasVisualSelection(visualSelection) || !visualAnchorRectRef.current) {
      return
    }

    setVisualToolbarPosition(positionToolbarNearIframeRect(
      visualAnchorRectRef.current,
      iframeRef.current,
      previewPanelContainerRef.current,
      toolbar,
    ))
  }, [iframeRef, visualSelection])

  const updateVisualSelection = useCallback(() => {
    const doc = iframeRef.current?.contentDocument
    const selection = doc?.getSelection()
    const text = normalizePreviewSelection(selection?.toString() ?? '')
    const rect = getSelectionRect(selection ?? null)

    if (!doc || !text || !rect) {
      return
    }

    clearSelectedImages(doc)
    clearSelectedColorTargets(doc)
    clearSelectedTextTargets(doc)

    const anchorElement = selection?.anchorNode instanceof Element
      ? selection.anchorNode
      : selection?.anchorNode?.parentElement ?? null
    const textTarget = getTextEditTarget(anchorElement)
    const backgroundColorTarget = findBackgroundColorTarget(textTarget ?? anchorElement)
    backgroundColorTarget?.element.setAttribute('data-easymd-selected-color-target', 'true')

    setVisualSelection({
      backgroundColorTarget: backgroundColorTarget?.patch ?? null,
      colorTarget: null,
      imageSrc: null,
      text,
      textTarget: textTarget ? buildTextTargetPatch(textTarget) : null,
    })
    setVisualReplacementText(text)
    setVisualImageUrl('')
    syncTextControlsFromElement(textTarget ?? anchorElement)
    if (backgroundColorTarget) {
      setVisualBackgroundColor(backgroundColorTarget.color)
    }
    moveToolbarToRect(rect)
  }, [iframeRef, moveToolbarToRect, syncTextControlsFromElement])

  const handleVisualPreviewClick = useCallback((event: MouseEvent) => {
    const doc = iframeRef.current?.contentDocument
    const target = event.target as Element | null
    if (!doc || !target) {
      return
    }

    if (target.closest('[data-easymd-code-toggle="true"]')) {
      return
    }

    const selectionText = normalizePreviewSelection(doc.getSelection()?.toString() ?? '')
    if (selectionText) {
      updateVisualSelection()
      return
    }

    clearSelectedImages(doc)
    clearSelectedColorTargets(doc)
    clearSelectedTextTargets(doc)

    const image = target.closest('img') as HTMLImageElement | null
    if (image) {
      event.preventDefault()
      const imageSrc = image.getAttribute('src') || image.currentSrc || null
      image.setAttribute('data-easymd-selected-image', 'true')
      setVisualSelection({
        backgroundColorTarget: null,
        colorTarget: null,
        imageSrc,
        text: '',
        textTarget: null,
      })
      setVisualImageUrl(imageSrc ?? '')
      setVisualReplacementText('')
      moveToolbarToRect(image.getBoundingClientRect())
      return
    }

    const textTarget = getTextEditTargetFromPoint(doc, event, target)
    const targetText = normalizePreviewSelection(textTarget?.textContent ?? '')
    if (textTarget && targetText) {
      const backgroundColorTarget = findBackgroundColorTarget(textTarget)
      textTarget.setAttribute('data-easymd-selected-text-target', 'true')
      backgroundColorTarget?.element.setAttribute('data-easymd-selected-color-target', 'true')
      setVisualSelection({
        backgroundColorTarget: backgroundColorTarget?.patch ?? null,
        colorTarget: null,
        imageSrc: null,
        text: targetText,
        textTarget: buildTextTargetPatch(textTarget),
      })
      setVisualReplacementText(targetText)
      setVisualImageUrl('')
      syncTextControlsFromElement(textTarget)
      if (backgroundColorTarget) {
        setVisualBackgroundColor(backgroundColorTarget.color)
      }
      moveToolbarToRect(textTarget.getBoundingClientRect())
      return
    }

    const colorTarget = findColorTarget(target)
    if (colorTarget) {
      event.preventDefault()
      colorTarget.element.setAttribute('data-easymd-selected-color-target', 'true')
      setVisualSelection({
        backgroundColorTarget: null,
        colorTarget: colorTarget.patch,
        imageSrc: null,
        text: '',
        textTarget: null,
      })
      if (colorTarget.color) {
        setVisualColor(colorTarget.color)
      }
      setVisualImageUrl('')
      setVisualReplacementText('')
      moveToolbarToRect(colorTarget.element.getBoundingClientRect())
      return
    }

    clearVisualSelection()
  }, [
    clearVisualSelection,
    iframeRef,
    moveToolbarToRect,
    syncTextControlsFromElement,
    updateVisualSelection,
  ])

  const handlePreviewContainerPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (
      target?.closest('[data-easymd-visual-toolbar="true"]')
      || target?.closest('iframe')
    ) {
      return
    }

    clearVisualSelection()
  }, [clearVisualSelection])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    const body = doc?.body
    if (!doc || !body) {
      return
    }

    installVisualEditStyle(doc)

    body.setAttribute('data-easymd-visual-edit', 'true')
    doc.addEventListener('mouseup', updateVisualSelection)
    doc.addEventListener('keyup', updateVisualSelection)
    doc.addEventListener('click', handleVisualPreviewClick, true)

    return () => {
      doc.removeEventListener('mouseup', updateVisualSelection)
      doc.removeEventListener('keyup', updateVisualSelection)
      doc.removeEventListener('click', handleVisualPreviewClick, true)
    }
  }, [
    iframeRef,
    iframeRevision,
    renderedHtml,
    handleVisualPreviewClick,
    updateVisualSelection,
  ])

  const commitVisualEdit = useCallback((
    result: { changed: boolean, markdown: string },
    nextSelection?: Partial<VisualSelectionState>,
  ) => {
    if (!result.changed) {
      return false
    }

    suppressScrollSync()
    contentRef.current = result.markdown
    setContent(result.markdown)
    if (nextSelection) {
      setVisualSelection(current => ({ ...current, ...nextSelection }))
    }
    return true
  }, [setContent])

  const getTextDecoration = useCallback((underline: boolean, strike: boolean): TextStylePatch['textDecoration'] => {
    if (underline && strike) {
      return 'underline line-through'
    }
    if (underline) {
      return 'underline'
    }
    if (strike) {
      return 'line-through'
    }
    return 'none'
  }, [])

  const applyTextStyleImmediately = useCallback((overrides: Partial<TextStylePatch> = {}) => {
    if (!visualSelection.text) {
      return false
    }

    return commitVisualEdit(
      applyPreviewTextStyle(
        contentRef.current,
        visualSelection.text,
        overrides,
        visualSelection.textTarget,
      ),
    )
  }, [commitVisualEdit, visualSelection.text, visualSelection.textTarget])

  const handleTextColorChange = useCallback((color: string) => {
    setVisualColor(color)
    if (visualSelection.colorTarget) {
      commitVisualEdit(replacePreviewColor(contentRef.current, visualSelection.colorTarget, color))
      return
    }
    applyTextStyleImmediately({ color })
  }, [applyTextStyleImmediately, commitVisualEdit, visualSelection.colorTarget])

  const handleBackgroundColorChange = useCallback((color: string) => {
    setVisualBackgroundColor(color)
    if (visualSelection.backgroundColorTarget) {
      commitVisualEdit(replacePreviewColor(
        contentRef.current,
        visualSelection.backgroundColorTarget,
        color,
      ))
      return
    }
    applyTextStyleImmediately({ backgroundColor: color })
  }, [applyTextStyleImmediately, commitVisualEdit, visualSelection.backgroundColorTarget])

  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    setVisualFontFamily(fontFamily)
    applyTextStyleImmediately({ fontFamily: fontFamily || undefined })
  }, [applyTextStyleImmediately])

  const handleFontSizeChange = useCallback((fontSize: string) => {
    setVisualFontSize(fontSize)
    applyTextStyleImmediately({ fontSize })
  }, [applyTextStyleImmediately])

  const handleBoldChange = useCallback((enabled: boolean) => {
    setVisualBold(enabled)
    applyTextStyleImmediately({ fontWeight: enabled ? '700' : '400' })
  }, [applyTextStyleImmediately])

  const handleItalicChange = useCallback((enabled: boolean) => {
    setVisualItalic(enabled)
    applyTextStyleImmediately({ fontStyle: enabled ? 'italic' : 'normal' })
  }, [applyTextStyleImmediately])

  const handleUnderlineChange = useCallback((enabled: boolean) => {
    setVisualUnderline(enabled)
    applyTextStyleImmediately({ textDecoration: getTextDecoration(enabled, visualStrike) })
  }, [applyTextStyleImmediately, getTextDecoration, visualStrike])

  const handleStrikeChange = useCallback((enabled: boolean) => {
    setVisualStrike(enabled)
    applyTextStyleImmediately({ textDecoration: getTextDecoration(visualUnderline, enabled) })
  }, [applyTextStyleImmediately, getTextDecoration, visualUnderline])

  const handleSuperscriptChange = useCallback((enabled: boolean) => {
    setVisualSuperscript(enabled)
    if (enabled) {
      setVisualSubscript(false)
    }
    applyTextStyleImmediately({ verticalAlign: enabled ? 'super' : 'baseline' })
  }, [applyTextStyleImmediately])

  const handleSubscriptChange = useCallback((enabled: boolean) => {
    setVisualSubscript(enabled)
    if (enabled) {
      setVisualSuperscript(false)
    }
    applyTextStyleImmediately({ verticalAlign: enabled ? 'sub' : 'baseline' })
  }, [applyTextStyleImmediately])

  const handleTextAlignChange = useCallback((align: TextStylePatch['textAlign']) => {
    setVisualTextAlign(align)
    applyTextStyleImmediately({ textAlign: align })
  }, [applyTextStyleImmediately])

  const handleLineHeightChange = useCallback((lineHeight: string) => {
    setVisualLineHeight(lineHeight)
    applyTextStyleImmediately({ lineHeight })
  }, [applyTextStyleImmediately])

  const handleLetterSpacingChange = useCallback((letterSpacing: string) => {
    setVisualLetterSpacing(letterSpacing)
    applyTextStyleImmediately({ letterSpacing })
  }, [applyTextStyleImmediately])

  const handleReplacementTextChange = useCallback((nextText: string) => {
    setVisualReplacementText(nextText)
    if (!visualSelection.text || !nextText.trim()) {
      return
    }

    const result = replacePreviewText(
      contentRef.current,
      visualSelection.text,
      nextText,
      visualSelection.textTarget,
    )
    const nextTextTarget = visualSelection.textTarget
      ? { ...visualSelection.textTarget, text: nextText }
      : null
    if (commitVisualEdit(result, { text: nextText, textTarget: nextTextTarget })) {
      setVisualReplacementText(nextText)
    }
  }, [commitVisualEdit, visualSelection.text, visualSelection.textTarget])

  const applyImageResult = useCallback((nextSrc: string) => {
    if (!visualSelection.imageSrc || !nextSrc.trim()) {
      return false
    }

    const result = replacePreviewImageSource(contentRef.current, visualSelection.imageSrc, nextSrc)
    return commitVisualEdit(result, { imageSrc: nextSrc })
  }, [commitVisualEdit, visualSelection.imageSrc])

  const handleImageUrlChange = useCallback((nextUrl: string) => {
    setVisualImageUrl(nextUrl)
    applyImageResult(nextUrl)
  }, [applyImageResult])

  const handleReplaceImageFile = useCallback(async () => {
    if (!visualSelection.imageSrc) {
      toast.error('请先在预览里点击一张图片')
      return
    }

    const [file] = await triggerFileDialog({ accept: 'image/*', multiple: false })
    if (!file) {
      return
    }

    const toastId = toast.loading(`正在上传：${file.name}`)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      const result = await uploadImage(formData)
      applyImageResult(result.url)
      toast.success(`已替换图片：${file.name}`, { id: toastId })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(`图片上传失败：${message}`, { id: toastId })
    }
  }, [applyImageResult, visualSelection.imageSrc])

  const onIframeLoad = useCallback(() => {
    iframeReadyRef.current = true
    setIframeRevision(revision => revision + 1)
    onScrollSyncLoad()

    const htmlToRender = pendingHtmlRef.current ?? renderedHtmlRef.current
    if (htmlToRender) {
      updateIframeContent(htmlToRender)
      pendingHtmlRef.current = null
    }

    // 拦截 iframe 内的链接点击
    const iframeDoc = iframeRef.current?.contentDocument
    if (iframeDoc) {
      iframeDoc.addEventListener('click', (e: MouseEvent) => {
        const link = (e.target as HTMLElement).closest('a')
        if (!link)
          return

        const href = link.getAttribute('href')
        if (!href)
          return

        e.preventDefault()

        // 页内锚点跳转（脚注引用、返回链接等）
        if (href.startsWith('#')) {
          let targetHref = href
          if (href.includes('-fnref-')) {
            targetHref = href.replace('-fnref-', '-fn-')
          }
          else if (href.includes('-fn-')) {
            targetHref = href.replace('-fn-', '-fnref-')
          }
          const target = iframeDoc.querySelector(`[href="${CSS.escape(targetHref)}"]`)
          if (target) {
            target.scrollIntoView({ behavior: 'auto' })
          }
          return
        }

        // 外部链接 - 顶层窗口新开标签页
        window.open(href, '_blank', 'noopener')
      })
    }
  }, [onScrollSyncLoad, updateIframeContent, iframeRef])

  useEffect(() => {
    if (!renderedHtml) {
      return
    }

    if (iframeReadyRef.current) {
      updateIframeContent(renderedHtml)
    }
    else {
      pendingHtmlRef.current = renderedHtml
    }
  }, [renderedHtml, updateIframeContent])

  const scheduleRender = useMemo(
    () => debounce(async (
      nextContent: string,
      styleId: string,
      themeId: string,
      mermaidThemeId: string,
      infographicThemeId: string,
      infographicPaletteId: string,
      customCssValue: string,
      enableRefLinks: boolean,
      openNewWin: boolean,
    ) => {
      try {
        const { markdown } = await import('@/lib/markdown/browser')
        const result = await markdown.render({
          markdown: nextContent,
          markdownStyle: styleId,
          codeTheme: themeId,
          mermaidTheme: mermaidThemeId,
          infographicTheme: infographicThemeId,
          infographicPalette: infographicPaletteId,
          customCss: customCssValue,
          enableFootnoteLinks: enableRefLinks,
          openLinksInNewWindow: openNewWin,
          ...getMarkdownLocaleTexts(),
        })

        if (!canceledRef.current) {
          setRenderedHtml('html', result.result)
        }
      }
      catch (error) {
        if (!canceledRef.current) {
          const message = error instanceof Error ? error.message : '转换失败'
          setRenderedHtml('html', message)
        }
      }
    }, RENDER_DEBOUNCE_MS),
    [setRenderedHtml],
  )

  useEffect(() => {
    clearRenderedHtmlCache()
    canceledRef.current = false
    scheduleRender(
      content,
      resolvedStyle.markdownStyle ?? '',
      codeTheme,
      mermaidTheme,
      infographic.theme,
      infographic.palette,
      resolvedStyle.customCss,
      enableFootnoteLinks,
      openLinksInNewWindow,
    )

    return () => {
      canceledRef.current = true
      scheduleRender.cancel()
    }
  }, [content, codeTheme, mermaidTheme, infographic, enableFootnoteLinks, openLinksInNewWindow, resolvedStyle, scheduleRender, clearRenderedHtmlCache])

  const isMobile = previewWidth === PREVIEW_WIDTH_MOBILE

  const iframeContent = (
    <iframe
      ref={iframeRef}
      id="easymd-preview-iframe"
      title="Markdown 预览"
      className="h-full w-full border-0"
      sandbox="allow-same-origin allow-modals"
      srcDoc={iframeShell}
      onLoad={onIframeLoad}
    />
  )

  const previewSurface = isMobile
    ? (
        <Phone>
          {iframeContent}
        </Phone>
      )
    : (
        <Safari
          className="h-full w-full"
          style={{ maxWidth: previewWidth }}
          url="easymd"
          mode="simple"
        >
          {iframeContent}
        </Safari>
      )

  return (
    <div
      ref={previewPanelContainerRef}
      className="relative flex h-full w-full items-center justify-center"
      onPointerDown={handlePreviewContainerPointerDown}
    >
      {previewSurface}
      <VisualEditToolbar
        active={hasVisualSelection(visualSelection)}
        selection={visualSelection}
        containerRef={previewPanelContainerRef}
        fontFamily={visualFontFamily}
        fontSize={visualFontSize}
        color={visualColor}
        backgroundColor={visualBackgroundColor}
        bold={visualBold}
        italic={visualItalic}
        underline={visualUnderline}
        strike={visualStrike}
        superscript={visualSuperscript}
        subscript={visualSubscript}
        textAlign={visualTextAlign}
        lineHeight={visualLineHeight}
        letterSpacing={visualLetterSpacing}
        position={visualToolbarPosition}
        replacementText={visualReplacementText}
        imageUrl={visualImageUrl}
        onFontFamilyChange={handleFontFamilyChange}
        onFontSizeChange={handleFontSizeChange}
        onColorChange={handleTextColorChange}
        onBackgroundColorChange={handleBackgroundColorChange}
        onBoldChange={handleBoldChange}
        onItalicChange={handleItalicChange}
        onUnderlineChange={handleUnderlineChange}
        onStrikeChange={handleStrikeChange}
        onSuperscriptChange={handleSuperscriptChange}
        onSubscriptChange={handleSubscriptChange}
        onTextAlignChange={handleTextAlignChange}
        onLineHeightChange={handleLineHeightChange}
        onPositionChange={setVisualToolbarPosition}
        onReady={handleToolbarReady}
        onLetterSpacingChange={handleLetterSpacingChange}
        onReplacementTextChange={handleReplacementTextChange}
        onImageUrlChange={handleImageUrlChange}
        onReplaceImageFile={handleReplaceImageFile}
      />
    </div>
  )
}
