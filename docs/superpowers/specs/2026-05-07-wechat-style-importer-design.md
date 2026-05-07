# 微信公众号风格导入器设计

日期：2026-05-07

## 背景

easymd 当前已经具备 Markdown 编辑、实时预览、微信公众号复制、自定义 CSS 导入、`custom:*` 样式持久化和 `#easymd` CSS 作用域归一化能力。用户希望从微信公众号文章中学习排版风格，让内置样式不再局限于少量预设。

第一版选择“URL 一键生成主题”：用户输入单篇 `mp.weixin.qq.com/s/...` 链接，系统提取文章内容和风格特征，生成一篇新的 Markdown 文件，并保存一个新的 easymd 自定义主题草稿。

## 目标

- 支持从单篇微信公众号文章 URL 导入正文 Markdown。
- 从文章可见样式中提取风格指纹，生成“相似气质”的原创 CSS 主题。
- 将生成主题保存到现有 `importedMarkdownStyles` / `custom:*` 体系。
- 默认保留来源链接、标题、作者等元信息，避免把导入结果包装成无来源原创。
- 提供可预览、可编辑、可放弃的主题草稿体验。

## 非目标

- 不做批量抓取。
- 不绕过登录、权限、付费墙或平台风控。
- 不复制原文章 CSS、内联样式或完整视觉资产。
- 不在第一版镜像图片；图片先保留原始 URL。
- 不做浏览器扩展骨架；后续可作为成功率增强方案。
- 不自动发布或同步到微信公众号后台。

## 用户流程

1. 用户在预览器样式菜单或导入入口选择“从公众号文章生成主题”。
2. 弹窗中输入 `mp.weixin.qq.com/s/...` URL。
3. 系统显示说明：单篇导入、保留来源、生成原创主题、图片暂不镜像。
4. 用户确认后，系统抓取文章 HTML。
5. 系统解析文章标题、作者、发布时间、来源 URL、正文结构和样式指纹。
6. 系统生成 Markdown 文件与 CSS 主题草稿。
7. easymd 新建一个文件，内容为导入后的 Markdown，并切换到生成主题。
8. 用户在现有预览中检查效果，可以继续手动编辑 Markdown 或自定义 CSS。

## 入口设计

优先放在预览侧的样式菜单中，因为用户动机是“生成一个排版样式”。菜单项文案为：

- `从公众号生成主题`

导入成功后的 toast：

- `已导入文章并生成主题草稿`

失败时使用明确错误：

- `无法读取这篇文章，请确认链接可公开访问`
- `这篇文章的正文结构无法识别`
- `生成主题失败，但已导入正文`

## 数据流

```
微信公众号 URL
  -> URL 校验
  -> 文章 HTML 获取
  -> 正文 DOM 解析
  -> Markdown 转换
  -> 风格指纹提取
  -> 原创主题 CSS 生成
  -> createImportedMarkdownStyle()
  -> filesStore 新建文件
  -> previewStore 选择 custom:* 主题
```

第一版可以先由服务端路由完成 URL 抓取和解析，例如新增：

- `src/routes/api.import.wechat.ts`

客户端通过 `src/services/import-wechat.ts` 调用该路由。服务端第一版不假设存在浏览器布局环境，只读取 HTML 结构、内联样式和可解析的样式片段；若微信页面拒绝服务端抓取，返回可解释错误，并为后续浏览器插件方案保留接口边界。

## 数据模型

```ts
interface WechatArticleImportResult {
  article: {
    title: string
    author?: string
    publishTime?: string
    sourceUrl: string
    markdown: string
  }
  theme: {
    sourceName: string
    css: string
    fingerprint: WechatStyleFingerprint
  }
  warnings: string[]
}

interface WechatStyleFingerprint {
  colors: {
    text?: string
    muted?: string
    accent?: string
    background?: string
    quoteBorder?: string
    codeBackground?: string
  }
  typography: {
    bodyFontSize?: number
    bodyLineHeight?: number
    h1FontSize?: number
    h2FontSize?: number
    h3FontSize?: number
    fontFamilyKind?: 'system' | 'serif' | 'sans' | 'mixed'
  }
  spacing: {
    paragraphMarginBlock?: number
    sectionMarginBlock?: number
    headingMarginBlock?: number
  }
  decoration: {
    headingPattern?: 'plain' | 'bar' | 'underline' | 'badge'
    quotePattern?: 'left-border' | 'background' | 'card'
    imageRadius?: number
    tablePattern?: 'minimal' | 'bordered' | 'striped'
  }
}
```

## 正文导入规则

从微信公众号页面优先识别：

- 标题：`#activity-name`
- 作者：`#js_name`
- 发布时间：`#publish_time`
- 正文容器：`#js_content`

Markdown 顶部加入来源块：

```md
---
source: "https://mp.weixin.qq.com/s/..."
author: "作者"
importedAt: "2026-05-07T00:00:00.000Z"
---

# 文章标题

> 来源：作者，微信公众号原文链接
```

转换正文时保留常见结构：

- `p` -> 段落
- `h1` 到 `h4` -> Markdown 标题
- `blockquote` -> 引用
- `ul` / `ol` -> 列表
- `img` -> `![alt](src)`
- `table` -> GFM 表格，无法稳定转换时保留 HTML
- 微信自定义复杂布局 -> 尽量提取文字和图片，无法表达的装饰丢弃

## 风格生成规则

风格提取只读取结构化特征，不复制原始 CSS：

- 第一版从正文区域采样 `h1`、`h2`、`h3`、`p`、`blockquote`、`pre`、`table`、`img` 的标签结构、内联样式和局部样式片段。
- 后续浏览器插件版本可以补充真实 computed style，提高风格指纹准确度。
- 将颜色聚类为主文本色、弱文本色、强调色、边框色、背景色。
- 将字号、行高、段落间距映射到 easymd 的固定选择范围，避免生成异常值。
- 根据标题装饰识别 `plain`、`bar`、`underline`、`badge` 等模式，再由 easymd 自己的模板生成 CSS。
- 所有选择器必须以 `#easymd` 为作用域。
- CSS 不保留原始类名、ID、动画、背景图、外链字体或平台特定属性。

生成主题示例：

```css
#easymd {
  color: #2f3437;
  font-size: 16px;
  line-height: 1.82;
}

#easymd h2 {
  margin: 28px 0 14px;
  padding-left: 12px;
  border-left: 4px solid #2f80ed;
}
```

## 错误处理

- URL 不是 `mp.weixin.qq.com`：拒绝并提示仅支持单篇公众号文章。
- 抓取失败：返回错误，不创建文件。
- 正文解析成功但样式生成失败：导入 Markdown，使用当前主题，并显示 warning。
- 部分图片缺少 URL：跳过该图片并记录 warning。
- 文章 DOM 过大：限制 HTML 大小，避免服务端内存和解析耗时失控。

## 安全与合规

- 仅支持用户主动输入的单篇 URL。
- 不实现搜索、批量列表、自动翻页或批量下载。
- 不移除来源、作者或原文链接。
- 不复制第三方 CSS；只生成 easymd 模板化 CSS。
- 不读取需要认证的用户私有内容；第一版只处理公开可访问页面。

## 测试范围

- URL 校验：只接受 `https://mp.weixin.qq.com/s/...` 等公众号文章链接。
- 正文解析：标题、作者、正文、图片、列表、引用、表格。
- Markdown 转换：复杂微信布局降级后仍保留可读内容。
- 风格指纹：颜色、字号、行高、标题模式、引用模式、图片圆角。
- CSS 生成：选择器全部带 `#easymd`，无原始微信类名。
- Store 集成：生成主题能通过 `createImportedMarkdownStyle()` 保存并切换。
- 失败路径：抓取失败、正文缺失、样式缺失、部分图片缺失。

## 后续扩展

- 增加图片镜像，接入现有 `/api/upload/image` 与 `PublicMirrorStorage`。
- 增加浏览器插件当前页提取，提高公众号页面读取成功率。
- 增加“样式工坊”手动微调，允许用户在保存前调整颜色、标题装饰、段落密度。
- 增加主题相似度提示，帮助用户理解这是原创主题草稿而不是复制原样式。
