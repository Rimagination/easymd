import type { LucideIcon } from 'lucide-react'
import { Heading2, Image, MessageCircleHeart, MessageSquareText, PanelsTopLeft, SquareStack } from 'lucide-react'

export type ArticleBlockCategory = 'title' | 'card' | 'image' | 'follow' | 'interaction'

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
  {
    id: 'interaction',
    name: '文末互动',
    description: '点赞、分享、在看等动态组件',
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
    id: 'title-mint-wave',
    category: 'follow',
    name: '薄荷波浪标题',
    description: '清爽柔和，适合生活方式内容',
    accent: '#7FB8A6',
    icon: Heading2,
    markdown: `
<section style="margin: 28px 0 20px;">
  <section style="font-size: 0; white-space: nowrap;">
    <span style="display: inline-block; width: 36px; height: 16px; margin-right: 10px; border-bottom: 3px solid #8bc5b3; border-radius: 50%; vertical-align: middle;"></span>
    <h2 style="display: inline-block; margin: 0; color: #7fb8a6; font-size: 21px; font-weight: 700; line-height: 1.4; vertical-align: middle;">点击蓝字 关注我们</h2>
    <span style="display: inline-block; width: 170px; height: 12px; margin-left: 14px; border-bottom: 2px solid #7fb8a6; border-radius: 50%; vertical-align: middle;"></span>
    <span style="display: inline-block; width: 10px; height: 10px; margin-left: 10px; border-radius: 999px; background: #f3b5c1; vertical-align: middle;"></span>
  </section>
</section>
`.trim(),
  },
  {
    id: 'title-brush-underline',
    category: 'follow',
    name: '黄刷下划线',
    description: '像荧光笔划过，适合强调关注',
    accent: '#FACC15',
    icon: PanelsTopLeft,
    markdown: `
<section style="margin: 28px 0 20px; text-align: left;">
  <section style="display: inline-block; position: relative; padding: 0 46px 6px 8px;">
    <span style="position: absolute; left: 0; right: 34px; bottom: 5px; z-index: 0; display: block; height: 10px; background: #facc15;"></span>
    <h2 style="position: relative; z-index: 1; margin: 0; color: #2f3437; font-size: 22px; font-weight: 800; line-height: 1.35;">点击蓝字，关注我们</h2>
    <span style="position: absolute; right: 14px; top: 7px; width: 16px; height: 16px; border: 4px solid #111827; transform: rotate(24deg);"></span>
    <span style="position: absolute; right: -14px; top: 24px; width: 22px; height: 18px; border: 4px solid #111827; transform: rotate(-12deg);"></span>
  </section>
</section>
`.trim(),
  },
  {
    id: 'title-cyan-dot-line',
    category: 'follow',
    name: '蓝点长线标题',
    description: '清晰利落，适合知识类文章',
    accent: '#17B8C9',
    icon: Heading2,
    markdown: `
<section style="margin: 28px 0 20px;">
  <h2 style="margin: 0 0 10px; color: #17b8c9; font-size: 23px; font-weight: 800; line-height: 1.35;">点击蓝字 关注我们</h2>
  <section style="font-size: 0;">
    <span style="display: inline-block; width: 8px; height: 8px; margin-right: 14px; border-radius: 999px; background: #f08bb3; vertical-align: middle;"></span>
    <span style="display: inline-block; width: 8px; height: 8px; margin-right: 14px; border-radius: 999px; background: #17b8c9; vertical-align: middle;"></span>
    <span style="display: inline-block; width: 8px; height: 8px; margin-right: 18px; border-radius: 999px; background: #f5a6c8; vertical-align: middle;"></span>
    <span style="display: inline-block; width: 270px; height: 1px; background: #17b8c9; vertical-align: middle;"></span>
  </section>
</section>
`.trim(),
  },
  {
    id: 'title-pencil-wave',
    category: 'follow',
    name: '铅笔波浪标题',
    description: '居中轻快，适合清单和教程',
    accent: '#6EAEDB',
    icon: Heading2,
    markdown: `
<section style="margin: 30px 0 22px; text-align: center;">
  <h2 style="display: inline-block; margin: 0; color: #6eaedb; font-size: 23px; font-weight: 800; line-height: 1.35;">点击蓝字 关注我们</h2>
  <span style="display: inline-block; width: 16px; height: 36px; margin-left: 10px; background: #f7b6c7; transform: rotate(38deg); vertical-align: middle;"></span>
  <section style="margin-top: 6px;">
    <span style="display: inline-block; width: 104px; height: 10px; border-bottom: 4px solid #f7c9d0; border-radius: 50%;"></span>
  </section>
</section>
`.trim(),
  },
  {
    id: 'title-leaf-rays',
    category: 'follow',
    name: '青柠放射标题',
    description: '更活泼，适合活动和新品推送',
    accent: '#7BAA16',
    icon: Heading2,
    markdown: `
<section style="margin: 30px 0 22px; text-align: center;">
  <section style="display: inline-block; position: relative; padding: 0 42px;">
    <span style="position: absolute; left: 12px; top: 4px; width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 12px solid #f7d34e; transform: rotate(-22deg);"></span>
    <span style="position: absolute; right: 10px; top: 4px; width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 12px solid #f7d34e; transform: rotate(20deg);"></span>
    <h2 style="margin: 0; color: #7baa16; font-size: 23px; font-weight: 800; line-height: 1.35;">点击蓝字 关注我们</h2>
    <span style="display: inline-block; width: 120px; height: 10px; margin-top: 5px; border-bottom: 4px solid #d5ea67; border-radius: 50%;"></span>
  </section>
</section>
`.trim(),
  },
  {
    id: 'title-ribbon-stack',
    category: 'follow',
    name: '双色斜切标题',
    description: '视觉冲击强，适合活动标题',
    accent: '#6ECBE7',
    icon: PanelsTopLeft,
    markdown: `
<section style="margin: 30px 0 22px; text-align: center;">
  <section style="display: inline-block; position: relative;">
    <p style="margin: 0; padding: 8px 30px; background: #6ecbe7; color: #ffffff; font-size: 20px; font-weight: 800; line-height: 1.2; transform: skew(-16deg);"><span style="display: inline-block; transform: skew(16deg);">点击蓝字</span></p>
    <p style="margin: -2px 0 0 54px; padding: 8px 30px; background: #c7ed18; color: #294324; font-size: 20px; font-weight: 800; line-height: 1.2; transform: skew(-16deg);"><span style="display: inline-block; transform: skew(16deg);">关注我们</span></p>
    <span style="position: absolute; left: -26px; bottom: 2px; width: 0; height: 0; border-top: 9px solid transparent; border-bottom: 9px solid transparent; border-right: 13px solid #8ad5ef;"></span>
    <span style="position: absolute; right: -24px; top: 12px; width: 0; height: 0; border-top: 9px solid transparent; border-bottom: 9px solid transparent; border-left: 13px solid #8ad5ef;"></span>
  </section>
</section>
`.trim(),
  },
  {
    id: 'title-flower-line',
    category: 'follow',
    name: '小花横线标题',
    description: '低调可爱，适合文末关注',
    accent: '#436B54',
    icon: Heading2,
    markdown: `
<section style="margin: 28px 0 20px;">
  <span style="display: inline-block; margin-right: 12px; color: #436b54; font-size: 34px; line-height: 1; vertical-align: middle;">✿</span>
  <h2 style="display: inline-block; margin: 0; color: #333333; font-size: 22px; font-weight: 500; line-height: 1.35; vertical-align: middle;">点击蓝字 关注我们</h2>
  <section style="margin-left: 68px; margin-top: 8px;">
    <span style="display: inline-block; width: 86px; height: 1px; background: #436b54;"></span>
  </section>
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
    id: 'card-red-brackets',
    category: 'card',
    name: '红色括号卡片',
    description: '适合强调一段金句或摘要',
    accent: '#DC2626',
    icon: SquareStack,
    markdown: `
<section style="margin: 22px 0; padding: 18px 22px; border-left: 4px solid #dc2626; border-right: 4px solid #dc2626; border-radius: 16px; background: #ffffff;">
  <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.85;">敢强，但敢之强已为其他不利的因素减杀。不过此时还没有减杀到已以破坏改之优势的必要程度。</p>
</section>
`.trim(),
  },
  {
    id: 'card-soft-ticket',
    category: 'card',
    name: '柔色票券卡片',
    description: '适合短句、活动提示和重点信息',
    accent: '#F1E8E5',
    icon: SquareStack,
    markdown: `
<section style="margin: 22px 0; padding: 18px 22px; border-radius: 18px; background: #f1e8e5; text-align: center;">
  <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.8;">输入文字输入文字<br />输入文字输入文字</p>
</section>
`.trim(),
  },
  {
    id: 'card-corner-frame',
    category: 'card',
    name: '折角边框卡片',
    description: '轻量边框，适合清单和摘录',
    accent: '#9CA3AF',
    icon: SquareStack,
    markdown: `
<section style="margin: 22px 0; padding: 18px 22px; border: 1px solid #cbd5e1; background: #ffffff;">
  <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.8; text-align: center;">输入文字输入文字<br />输入文字输入文字</p>
</section>
`.trim(),
  },
  {
    id: 'card-yellow-corners',
    category: 'card',
    name: '黄色折角卡片',
    description: '醒目但不重，适合提示框',
    accent: '#FDE68A',
    icon: SquareStack,
    markdown: `
<section style="margin: 22px 0; padding: 18px 22px; background: #fde68a; text-align: center;">
  <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.8;">输入文字输入文字<br />输入文字输入文字</p>
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
  {
    id: 'interaction-floating-asks',
    category: 'interaction',
    name: '三连求一求',
    description: '点赞、分享、喜欢三个气泡轻轻浮动',
    accent: '#111827',
    icon: MessageCircleHeart,
    markdown: `
<section style="margin: 30px 0 14px; text-align: center;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 112" width="100%" height="112" style="display: block; max-width: 360px; margin: 0 auto;">
    <g transform="translate(65 55)">
      <circle cx="0" cy="22" r="26" fill="#f4f4f5" opacity="0.95">
        <animate attributeName="opacity" values="0.72;1;0.72" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <path d="M-37 -28 H37 Q45 -28 45 -20 V-4 Q45 4 37 4 H10 L2 16 L-6 4 H-37 Q-45 4 -45 -4 V-20 Q-45 -28 -37 -28Z" fill="#111827" />
      <text x="0" y="-10" fill="#ffffff" font-size="15" font-weight="800" text-anchor="middle">求点赞</text>
      <path d="M-7 20 C-13 15 -21 18 -21 27 C-21 39 0 50 0 50 C0 50 21 39 21 27 C21 18 13 15 7 20 C4 16 -4 16 -7 20Z" fill="#d4d4d8" />
      <animateTransform attributeName="transform" type="translate" values="65 59;65 49;65 59" dur="1.8s" repeatCount="indefinite" />
    </g>
    <g transform="translate(180 55)">
      <circle cx="0" cy="22" r="26" fill="#f4f4f5" opacity="0.9">
        <animate attributeName="opacity" values="0.62;1;0.62" dur="2s" begin="0.25s" repeatCount="indefinite" />
      </circle>
      <path d="M-37 -28 H37 Q45 -28 45 -20 V-4 Q45 4 37 4 H10 L2 16 L-6 4 H-37 Q-45 4 -45 -4 V-20 Q-45 -28 -37 -28Z" fill="#374151" />
      <text x="0" y="-10" fill="#ffffff" font-size="15" font-weight="800" text-anchor="middle">求分享</text>
      <path d="M-18 32 C-2 16 12 14 23 18 L14 8 L36 12 L28 34 L22 23 C12 22 0 27 -12 40Z" fill="#e5e7eb" />
      <animateTransform attributeName="transform" type="translate" values="180 54;180 45;180 54" dur="2s" begin="0.25s" repeatCount="indefinite" />
    </g>
    <g transform="translate(295 55)">
      <circle cx="0" cy="22" r="26" fill="#f4f4f5" opacity="0.95">
        <animate attributeName="opacity" values="0.72;1;0.72" dur="1.9s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <path d="M-37 -28 H37 Q45 -28 45 -20 V-4 Q45 4 37 4 H10 L2 16 L-6 4 H-37 Q-45 4 -45 -4 V-20 Q-45 -28 -37 -28Z" fill="#111827" />
      <text x="0" y="-10" fill="#ffffff" font-size="15" font-weight="800" text-anchor="middle">求喜欢</text>
      <path d="M-22 21 Q0 1 22 21 Q0 50 -22 21Z" fill="none" stroke="#9ca3af" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <animateTransform attributeName="transform" type="translate" values="295 58;295 48;295 58" dur="1.9s" begin="0.5s" repeatCount="indefinite" />
    </g>
  </svg>
</section>
`.trim(),
  },
  {
    id: 'interaction-outline-buttons',
    category: 'interaction',
    name: '手绘互动按钮',
    description: '黑白描边气泡，适合简洁文末',
    accent: '#111827',
    icon: MessageCircleHeart,
    markdown: `
<section style="margin: 30px 0 14px; text-align: center;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 96" width="100%" height="96" style="display: block; max-width: 360px; margin: 0 auto;">
    <g transform="translate(70 42)">
      <path d="M-47 -17 Q-44 -28 -28 -28 H28 Q44 -28 47 -17 Q50 -4 39 8 H11 L4 23 L-4 8 H-39 Q-50 -4 -47 -17Z" fill="#ffffff" stroke="#111827" stroke-width="3" stroke-linejoin="round" />
      <text x="0" y="0" fill="#111827" font-size="22" font-weight="900" text-anchor="middle">点赞</text>
      <animateTransform attributeName="transform" type="translate" values="70 44;70 36;70 44" dur="1.6s" repeatCount="indefinite" />
    </g>
    <g transform="translate(180 42)">
      <path d="M-47 -17 Q-44 -28 -28 -28 H28 Q44 -28 47 -17 Q50 -4 39 8 H11 L4 23 L-4 8 H-39 Q-50 -4 -47 -17Z" fill="#ffffff" stroke="#111827" stroke-width="3" stroke-linejoin="round" />
      <text x="0" y="0" fill="#111827" font-size="22" font-weight="900" text-anchor="middle">分享</text>
      <animateTransform attributeName="transform" type="translate" values="180 42;180 34;180 42" dur="1.8s" begin="0.2s" repeatCount="indefinite" />
    </g>
    <g transform="translate(290 42)">
      <path d="M-47 -17 Q-44 -28 -28 -28 H28 Q44 -28 47 -17 Q50 -4 39 8 H11 L4 23 L-4 8 H-39 Q-50 -4 -47 -17Z" fill="#ffffff" stroke="#111827" stroke-width="3" stroke-linejoin="round" />
      <text x="0" y="0" fill="#111827" font-size="22" font-weight="900" text-anchor="middle">喜欢</text>
      <animateTransform attributeName="transform" type="translate" values="290 45;290 37;290 45" dur="1.7s" begin="0.4s" repeatCount="indefinite" />
    </g>
  </svg>
</section>
`.trim(),
  },
  {
    id: 'interaction-pastel-bubbles',
    category: 'interaction',
    name: '马卡龙三连',
    description: '柔和色块交替呼吸，适合生活方式内容',
    accent: '#8BD3E6',
    icon: MessageCircleHeart,
    markdown: `
<section style="margin: 30px 0 14px; text-align: center;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 96" width="100%" height="96" style="display: block; max-width: 360px; margin: 0 auto;">
    <g transform="translate(72 43)">
      <path d="M-42 -19 H34 Q44 -19 44 -9 V11 Q44 21 34 21 H9 L3 34 L-4 21 H-34 Q-44 21 -44 11 V-9 Q-44 -19 -42 -19Z" fill="#f8c8d6" />
      <text x="0" y="7" fill="#ffffff" font-size="24" font-weight="900" text-anchor="middle">点赞</text>
      <animateTransform attributeName="transform" type="translate" values="72 45;72 38;72 45" dur="1.7s" repeatCount="indefinite" />
    </g>
    <g transform="translate(180 43)">
      <path d="M-42 -19 H34 Q44 -19 44 -9 V11 Q44 21 34 21 H9 L3 34 L-4 21 H-34 Q-44 21 -44 11 V-9 Q-44 -19 -42 -19Z" fill="#9dd7ea" />
      <text x="0" y="7" fill="#ffffff" font-size="24" font-weight="900" text-anchor="middle">分享</text>
      <animateTransform attributeName="transform" type="translate" values="180 42;180 35;180 42" dur="1.9s" begin="0.2s" repeatCount="indefinite" />
    </g>
    <g transform="translate(288 43)">
      <path d="M-42 -19 H34 Q44 -19 44 -9 V11 Q44 21 34 21 H9 L3 34 L-4 21 H-34 Q-44 21 -44 11 V-9 Q-44 -19 -42 -19Z" fill="#a6dfe6" />
      <text x="0" y="7" fill="#ffffff" font-size="24" font-weight="900" text-anchor="middle">喜欢</text>
      <animateTransform attributeName="transform" type="translate" values="288 46;288 39;288 46" dur="1.8s" begin="0.4s" repeatCount="indefinite" />
    </g>
  </svg>
</section>
`.trim(),
  },
  {
    id: 'interaction-look-heart',
    category: 'interaction',
    name: '点个看一看',
    description: '文末一句话加跳动爱心',
    accent: '#FB5A78',
    icon: MessageCircleHeart,
    markdown: `
<section style="margin: 30px 0 14px; text-align: center;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 104" width="100%" height="104" style="display: block; max-width: 360px; margin: 0 auto;">
    <text x="162" y="58" fill="#374151" font-size="22" font-weight="900" text-anchor="middle">点个“看一看”吧</text>
    <g transform="translate(292 36)">
      <path d="M0 9 C0 -3 14 -8 22 3 C30 -8 44 -3 44 9 C44 28 22 42 22 42 C22 42 0 28 0 9Z" fill="#fb5a78">
        <animate attributeName="opacity" values="0.82;1;0.82" dur="1.1s" repeatCount="indefinite" />
      </path>
      <animateTransform attributeName="transform" type="translate" values="292 38;292 31;292 38" dur="1.1s" repeatCount="indefinite" />
    </g>
    <circle cx="332" cy="29" r="4" fill="#fb7185">
      <animate attributeName="opacity" values="0;1;0" dur="1.1s" begin="0.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="318" cy="18" r="3" fill="#fda4af">
      <animate attributeName="opacity" values="0;1;0" dur="1.1s" begin="0.45s" repeatCount="indefinite" />
    </circle>
  </svg>
</section>
`.trim(),
  },
  {
    id: 'interaction-comment-dots',
    category: 'interaction',
    name: '留言冒泡',
    description: '用跳动省略号邀请读者评论',
    accent: '#14B8A6',
    icon: MessageCircleHeart,
    markdown: `
<section style="margin: 30px 0 14px; text-align: center;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 104" width="100%" height="104" style="display: block; max-width: 360px; margin: 0 auto;">
    <path d="M46 20 H314 Q330 20 330 36 V58 Q330 74 314 74 H204 L184 92 L170 74 H46 Q30 74 30 58 V36 Q30 20 46 20Z" fill="#ecfeff" stroke="#14b8a6" stroke-width="3" stroke-linejoin="round" />
    <text x="146" y="54" fill="#0f766e" font-size="21" font-weight="900" text-anchor="middle">留言聊聊你的想法</text>
    <circle cx="250" cy="48" r="5" fill="#14b8a6">
      <animate attributeName="cy" values="48;40;48" dur="1s" repeatCount="indefinite" />
    </circle>
    <circle cx="270" cy="48" r="5" fill="#14b8a6">
      <animate attributeName="cy" values="48;40;48" dur="1s" begin="0.16s" repeatCount="indefinite" />
    </circle>
    <circle cx="290" cy="48" r="5" fill="#14b8a6">
      <animate attributeName="cy" values="48;40;48" dur="1s" begin="0.32s" repeatCount="indefinite" />
    </circle>
  </svg>
</section>
`.trim(),
  },
  {
    id: 'interaction-share-ribbon',
    category: 'interaction',
    name: '转发小纸条',
    description: '轻快飘动的转发提醒',
    accent: '#F59E0B',
    icon: MessageCircleHeart,
    markdown: `
<section style="margin: 30px 0 14px; text-align: center;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 112" width="100%" height="112" style="display: block; max-width: 360px; margin: 0 auto;">
    <g transform="translate(180 56)">
      <path d="M-130 -22 H108 L130 0 L108 22 H-130 L-108 0Z" fill="#fff7ed" stroke="#f59e0b" stroke-width="3" stroke-linejoin="round" />
      <text x="-4" y="8" fill="#b45309" font-size="22" font-weight="900" text-anchor="middle">转发给需要的朋友</text>
      <animateTransform attributeName="transform" type="translate" values="180 58;180 50;180 58" dur="1.7s" repeatCount="indefinite" />
    </g>
    <path d="M288 27 C310 21 324 30 332 47" fill="none" stroke="#f97316" stroke-width="4" stroke-linecap="round" stroke-dasharray="8 8">
      <animate attributeName="stroke-dashoffset" values="16;0;16" dur="1.4s" repeatCount="indefinite" />
    </path>
    <path d="M326 47 L333 48 L329 39" fill="none" stroke="#f97316" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</section>
`.trim(),
  },
]
