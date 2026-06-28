# 组件化精排组件库

这个文件给 easymd Skill 使用。目标不是把 Markdown 套进固定模板，而是让 Agent 根据文章内容现场选择组件，做出适合微信公众号、知乎或通用富文本编辑器的精排 HTML。

## 使用原则

- 一篇正式公众号文章通常选择 4 到 8 个组件，不要为了炫技堆满所有样式。
- 组件服务信息层级：标题负责导航，卡片负责聚合，callout 负责提醒，金句框负责记忆点，SVG 信息图负责解释结构。
- 组件可以共享 easymd Web 的主题色、字体和间距，但 Skill 输出必须独立可复制，不依赖网站运行时代码。
- 微信公众号优先使用内联样式；复杂布局用 `section`、`p`、`span`、`svg` 等稳定标签。
- 不生成外链 CSS，不依赖脚本，不把关键文字放进不可复制的图片。

## 组件清单

| 组件         | 适合场景               | 设计要点                       |
| ------------ | ---------------------- | ------------------------------ |
| 开篇导读卡   | 说明读者会获得什么     | 2 到 4 行，浅底色，避免过长    |
| 章节标题     | 长文章分段             | 带编号或侧标，标题文字必须清楚 |
| 信息卡片     | 总结概念、工具、结论   | 每张卡只放一个观点             |
| callout 提醒 | 风险、限制、前提条件   | 用柔和背景，不要像错误提示     |
| 金句框       | 强观点、可传播句子     | 短句优先，留白足够             |
| 步骤列表     | 教程、流程、迁移指南   | 数字清楚，步骤动词开头         |
| 对比表       | 方案选择、优缺点       | 列数少，移动端可读             |
| SVG 信息图   | 架构、流程、矩阵、关系 | 文字大于 12px，宽度自适应      |
| 文末行动     | 关注、留言、下一步     | 只保留一个主要动作             |

## HTML 组件示例

### 开篇导读卡

```text
<section style="margin: 24px 0; padding: 18px 20px; border-radius: 10px; background: #f6f8fb; border: 1px solid #e4e8f0;">
  <p style="margin: 0 0 8px; color: #2f5d8c; font-weight: 700;">导读</p>
  <p style="margin: 0; color: #263238; line-height: 1.8;">用两三句话告诉读者：这篇文章解决什么问题、适合谁、读完能拿走什么。</p>
</section>
```

### 章节标题

```text
<section style="margin: 32px 0 16px;">
  <p style="margin: 0 0 4px; color: #6b8bb3; font-size: 13px; letter-spacing: 0;">SECTION 01</p>
  <h2 style="margin: 0; padding-left: 12px; border-left: 4px solid #2f5d8c; color: #1f2933; font-size: 22px; line-height: 1.35;">把小标题写在这里</h2>
</section>
```

### callout 提醒

```text
<section style="margin: 20px 0; padding: 14px 16px; background: #fff8ed; border-left: 4px solid #d9902f;">
  <p style="margin: 0; color: #4a3420; line-height: 1.75;">这里放前提、风险、边界或容易忽略的提醒。</p>
</section>
```

### 金句框

```text
<section style="margin: 28px 0; padding: 22px 20px; text-align: center; border-top: 1px solid #d8dee8; border-bottom: 1px solid #d8dee8;">
  <p style="margin: 0; color: #1f2933; font-size: 20px; line-height: 1.6; font-weight: 700;">一句真正能被读者记住的话。</p>
</section>
```

## SVG 信息图规范

- 使用内联 `<svg>`，不要引用外部图片。
- `viewBox` 固定，外层 `style` 使用 `width: 100%; max-width: 640px; height: auto;`。
- 色彩使用 2 到 4 个主色，避免整张图只有一种颜色。
- 图中文字用真实 `<text>`，不要转路径，保证可检索和可修改。
- 对流程图使用从左到右或从上到下的单一阅读方向。

```text
<section style="margin: 28px 0; text-align: center;">
  <svg viewBox="0 0 640 260" style="width: 100%; max-width: 640px; height: auto;" role="img" aria-label="文章制作流程">
    <rect x="24" y="32" width="160" height="72" rx="12" fill="#eef5ff" stroke="#9bb9e0" />
    <text x="104" y="76" text-anchor="middle" font-size="18" fill="#1f3b57">读懂原文</text>
    <rect x="240" y="32" width="160" height="72" rx="12" fill="#f4f7ef" stroke="#adc58f" />
    <text x="320" y="76" text-anchor="middle" font-size="18" fill="#344922">选择组件</text>
    <rect x="456" y="32" width="160" height="72" rx="12" fill="#fff4e6" stroke="#e0b36f" />
    <text x="536" y="76" text-anchor="middle" font-size="18" fill="#654113">交付 HTML</text>
    <path d="M184 68 H232" stroke="#7b8794" stroke-width="3" marker-end="url(#arrow)" />
    <path d="M400 68 H448" stroke="#7b8794" stroke-width="3" marker-end="url(#arrow)" />
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#7b8794" />
      </marker>
    </defs>
  </svg>
</section>
```

## 组合建议

正式文章推荐顺序：开篇导读卡、章节标题、正文段落、信息卡片或步骤列表、SVG 信息图、callout、金句框、文末行动。短文章可以只用导读卡、章节标题、callout 和文末行动。
