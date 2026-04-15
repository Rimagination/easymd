import type { LucideIcon } from 'lucide-react'
import { Heading2, Image, MessageSquareText, PanelsTopLeft, SquareStack } from 'lucide-react'

export type ArticleBlockCategory = 'title' | 'card' | 'image' | 'follow'

export interface ArticleBlockTemplate {
  id: string
  category: ArticleBlockCategory
  name: string
  description: string
  accent: string
  icon: LucideIcon
  markdown: string
}

export const articleBlockCategories: Array<{
  id: ArticleBlockCategory
  name: string
  description: string
}> = [
  {
    id: 'title',
    name: '标题',
    description: '用于章节开头、观点强调',
  },
  {
    id: 'card',
    name: '卡片',
    description: '承载重点、步骤、引用',
  },
  {
    id: 'image',
    name: '图片',
    description: '圆角图、图注、组合图',
  },
  {
    id: 'follow',
    name: '引导关注',
    description: '适合文末关注与行动召唤',
  },
]

export const articleBlockTemplates: ArticleBlockTemplate[] = [
  {
    id: 'title-center-line',
    category: 'title',
    name: '居中短线标题',
    description: '适合文章开篇或大章节标题',
    accent: '#F59E0B',
    icon: Heading2,
    markdown: `
<section style="margin: 30px 0 22px; text-align: center;">
  <p style="margin: 0 0 8px; color: #f59e0b; font-size: 12px; font-weight: 700; letter-spacing: 0.22em;">EASYMD</p>
  <h2 style="margin: 0; color: #111827; font-size: 22px; font-weight: 800; line-height: 1.35;">把标题写在这里</h2>
  <span style="display: inline-block; width: 46px; height: 3px; margin-top: 12px; border-radius: 999px; background: #f59e0b;"></span>
</section>
`.trim(),
  },
  {
    id: 'title-side-label',
    category: 'title',
    name: '侧标章节标题',
    description: '左侧色块让标题更有节奏',
    accent: '#2563EB',
    icon: PanelsTopLeft,
    markdown: `
<section style="margin: 26px 0 18px; padding-left: 14px; border-left: 5px solid #2563eb;">
  <p style="margin: 0 0 4px; color: #2563eb; font-size: 12px; font-weight: 700; letter-spacing: 0.18em;">SECTION 01</p>
  <h2 style="margin: 0; color: #172033; font-size: 21px; font-weight: 800; line-height: 1.4;">这里是一句醒目的小标题</h2>
</section>
`.trim(),
  },
  {
    id: 'card-highlight-note',
    category: 'card',
    name: '暖色重点卡片',
    description: '用来收束观点或提示重点',
    accent: '#EA580C',
    icon: SquareStack,
    markdown: `
<section style="margin: 22px 0; padding: 18px 18px 16px; border: 1px solid #fed7aa; border-radius: 18px; background: #fff7ed;">
  <p style="margin: 0 0 8px; color: #9a3412; font-size: 15px; font-weight: 800;">重点提示</p>
  <p style="margin: 0; color: #7c2d12; font-size: 15px; line-height: 1.85;">把想让读者记住的结论写在这里。它可以是一句话，也可以是两三句紧凑的说明。</p>
</section>
`.trim(),
  },
  {
    id: 'card-step-list',
    category: 'card',
    name: '三步流程卡片',
    description: '适合教程、清单、发布流程',
    accent: '#16A34A',
    icon: MessageSquareText,
    markdown: `
<section style="margin: 22px 0; padding: 18px; border-radius: 20px; background: #f0fdf4;">
  <p style="margin: 0 0 14px; color: #166534; font-size: 16px; font-weight: 800;">可以这样做</p>
  <p style="margin: 0 0 10px; color: #14532d; line-height: 1.75;"><span style="display: inline-block; width: 24px; height: 24px; margin-right: 8px; border-radius: 999px; background: #16a34a; color: #ffffff; font-size: 13px; font-weight: 800; line-height: 24px; text-align: center;">1</span>先写下核心观点。</p>
  <p style="margin: 0 0 10px; color: #14532d; line-height: 1.75;"><span style="display: inline-block; width: 24px; height: 24px; margin-right: 8px; border-radius: 999px; background: #16a34a; color: #ffffff; font-size: 13px; font-weight: 800; line-height: 24px; text-align: center;">2</span>补充案例或证据。</p>
  <p style="margin: 0; color: #14532d; line-height: 1.75;"><span style="display: inline-block; width: 24px; height: 24px; margin-right: 8px; border-radius: 999px; background: #16a34a; color: #ffffff; font-size: 13px; font-weight: 800; line-height: 24px; text-align: center;">3</span>给读者一个明确行动。</p>
</section>
`.trim(),
  },
  {
    id: 'image-rounded-caption',
    category: 'image',
    name: '圆角大图',
    description: '一张主图加简短图注',
    accent: '#0F766E',
    icon: Image,
    markdown: `
<figure style="margin: 24px 0; padding: 10px; border-radius: 20px; background: #f8fafc;">
  <img src="https://placehold.co/900x520/png?text=easymd" alt="替换为图片说明" style="display: block; width: 100%; border-radius: 14px;" />
  <figcaption style="margin-top: 9px; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">这里写一句图片说明</figcaption>
</figure>
`.trim(),
  },
  {
    id: 'image-two-grid',
    category: 'image',
    name: '双图对照',
    description: '适合前后对比、左右观点',
    accent: '#DB2777',
    icon: Image,
    markdown: `
<section style="margin: 24px 0;">
  <section style="font-size: 0; text-align: center;">
    <img src="https://placehold.co/440x440/png?text=before" alt="图片一" style="display: inline-block; width: 48%; margin-right: 2%; border-radius: 16px; vertical-align: top;" />
    <img src="https://placehold.co/440x440/png?text=after" alt="图片二" style="display: inline-block; width: 48%; border-radius: 16px; vertical-align: top;" />
  </section>
  <p style="margin: 9px 0 0; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">这里写一句对照说明</p>
</section>
`.trim(),
  },
  {
    id: 'follow-dark-card',
    category: 'follow',
    name: '深色关注卡片',
    description: '适合文末收尾和关注提醒',
    accent: '#111827',
    icon: MessageSquareText,
    markdown: `
<section style="margin: 30px 0 12px; padding: 22px 18px; border-radius: 22px; background: #111827; text-align: center;">
  <p style="margin: 0 0 8px; color: #fbbf24; font-size: 12px; font-weight: 800; letter-spacing: 0.22em;">FOLLOW ME</p>
  <p style="margin: 0; color: #ffffff; font-size: 19px; font-weight: 800; line-height: 1.45;">喜欢这篇文章，欢迎关注我</p>
  <p style="margin: 10px 0 0; color: #cbd5e1; font-size: 14px; line-height: 1.75;">持续分享写作、排版和效率工具。</p>
</section>
`.trim(),
  },
  {
    id: 'follow-qr-placeholder',
    category: 'follow',
    name: '二维码关注位',
    description: '替换图片地址即可使用',
    accent: '#07C160',
    icon: Image,
    markdown: `
<section style="margin: 30px 0 12px; padding: 18px; border: 1px solid #bbf7d0; border-radius: 22px; background: #f0fdf4; text-align: center;">
  <p style="margin: 0 0 10px; color: #166534; font-size: 18px; font-weight: 800;">扫码关注，不错过下一篇</p>
  <img src="https://placehold.co/240x240/png?text=QR" alt="替换为二维码" style="display: block; width: 138px; height: 138px; margin: 0 auto 10px; border-radius: 12px;" />
  <p style="margin: 0; color: #15803d; font-size: 13px; line-height: 1.7;">把这里替换成你的公众号、知乎或个人介绍。</p>
</section>
`.trim(),
  },
]
