import { defaultSchema } from 'rehype-sanitize'

const styledBlockAttributes = ['className', 'style']
const styledImageAttributes = ['className', 'style', 'src', 'alt', 'title', 'width', 'height']

/**
 * Sanitize schema for rehype-sanitize
 *
 * 注意：SVG 相关元素不需要在此配置，因为 rehypeMermaid 在 sanitize 之后执行
 */
export const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...(defaultSchema.protocols || {}),
    href: ['http', 'https', 'mailto', 'tel'],
    src: ['http', 'https'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'figure',
    'figcaption',
    'section',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
    div: [...(defaultSchema.attributes?.div || []), ...styledBlockAttributes],
    figcaption: [...(defaultSchema.attributes?.figcaption || []), ...styledBlockAttributes],
    figure: [...(defaultSchema.attributes?.figure || []), ...styledBlockAttributes],
    h2: [...(defaultSchema.attributes?.h2 || []), ...styledBlockAttributes],
    h3: [...(defaultSchema.attributes?.h3 || []), ...styledBlockAttributes],
    img: [...(defaultSchema.attributes?.img || []), ...styledImageAttributes],
    p: [...(defaultSchema.attributes?.p || []), ...styledBlockAttributes],
    section: [...(defaultSchema.attributes?.section || []), ...styledBlockAttributes],
    span: [...(defaultSchema.attributes?.span || []), ...styledBlockAttributes],
  },
}
