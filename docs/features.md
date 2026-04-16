# 把一篇技术文章打磨到可以发布

写技术文章最难的地方，往往不是把代码贴上去，而是让读者能顺着你的思路走完。标题要有层次，示例要能复现，结论要能落地，排版则负责把这些信息分出轻重缓急。

这篇默认文章不绑定某个框架，示例围绕“前端性能排查”展开。你可以切换不同主题，观察标题、引用、列表、代码块、表格和图片在不同样式下的差异。

![桌面上的代码与笔记](https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80)

---

## 一、先确定文章骨架

一篇面向公众号或知识社区的技术文章，建议先分成三层：

1. **问题场景**：告诉读者为什么要读。
2. **分析过程**：展示你如何定位问题。
3. **可复用方法**：把经验沉淀成清单、代码或流程。

### 1. 用导读降低进入门槛

导读不需要写得很长，但要让读者知道自己会获得什么。

> 好的导读像路牌：不替读者走路，但会告诉他下一段路为什么值得继续。

可以用三句话完成导读：

- 这篇文章解决什么问题。
- 适合什么背景的读者。
- 读完后可以直接拿走什么。

### 2. 让标题承担信息层级

标题不是装饰，而是结构。下面是一组常见层级：

#### H4：局部观察

适合放在某个小节里，用来说明一个具体发现，例如“首屏资源过大”“接口瀑布流明显”“字体加载阻塞渲染”。

##### H5：补充说明

适合用来补充一个边界情况，不建议频繁使用。

---

## 二、用一个性能问题做示例

假设我们维护一个内容编辑器，用户反馈“打开文章详情页很慢”。这时不要一上来就重构，先把问题拆成可以验证的指标。

| 指标 | 观察方式          | 常见原因             | 优先级 |
| ---- | ----------------- | -------------------- | ------ |
| FCP  | Performance 面板  | CSS 阻塞、字体加载慢 | 高     |
| LCP  | Lighthouse / RUM  | 首屏图片过大、接口慢 | 高     |
| TBT  | Performance 面板  | 大包执行、长任务     | 中     |
| CLS  | Layout Shift 记录 | 图片无尺寸、广告插入 | 中     |

### 1. 先收集最小证据

排查之前先记录环境，避免“我这里很快”的争论：

- 网络：Fast 3G、4G、公司 Wi-Fi 都测一次。
- 设备：低端安卓机比高配桌面更能暴露问题。
- 页面状态：首次打开和二次打开要分开看。
- 数据量：空数据、普通数据、大数据要分别记录。

> [!TIP]
> 如果只看本地开发环境，很多线上问题会被热缓存、调试配置和本机性能掩盖。

### 2. 再看资源瀑布

下面的代码展示一个简单的资源汇总脚本。它不是完整监控系统，但足够帮助我们快速发现“大资源”和“慢资源”。

```ts
interface ResourceSummary {
  name: string
  duration: number
  transferSize: number
}

export function collectSlowResources(limit = 10): ResourceSummary[] {
  return performance
    .getEntriesByType('resource')
    .map(entry => entry as PerformanceResourceTiming)
    .filter(entry => entry.duration > 300 || entry.transferSize > 100_000)
    .sort((left, right) => right.duration - left.duration)
    .slice(0, limit)
    .map(entry => ({
      name: entry.name,
      duration: Math.round(entry.duration),
      transferSize: entry.transferSize,
    }))
}
```

### 3. 最后确认是否真的变快

优化前后要用同一套指标比较。只凭肉眼判断很容易误判，尤其是动画、骨架屏和缓存都会影响体感。

```bash
pnpm build
pnpm preview
npx lighthouse http://localhost:4173 --view
```

---

## 三、常见优化策略

不同项目的瓶颈不一样，但下面这几类问题出现频率很高。

### 图片与媒体资源

图片通常是首屏体积的大头。优先处理这几件事：

- 给图片设置明确的 `width` 和 `height`。
- 首屏图使用合适尺寸，避免把 3000px 宽图塞进 360px 容器。
- 非首屏图片使用懒加载。
- 同一张图不要在列表里重复请求多个尺寸。

```html
<img src="/cover-960.webp" width="960" height="540" loading="lazy" alt="文章封面" />
```

### JavaScript 执行成本

当页面交互卡顿时，问题不一定在接口，也可能是主线程被脚本占满。

```js
const heavyTasks = tasks.filter(task => task.duration > 50)

for (const task of heavyTasks) {
  console.log(`${task.name}: ${task.duration}ms`)
}
```

可以优先尝试：

1. 把非首屏组件延迟加载。
2. 把纯计算移到 Web Worker。
3. 减少全量状态订阅。
4. 避免在滚动事件里同步读取和写入布局。

### CSS 与字体

字体会影响首屏稳定性。中文字体文件尤其大，最好明确策略：

```css
@font-face {
  font-family: 'Article Sans';
  src: url('/fonts/article-sans.woff2') format('woff2');
  font-display: swap;
}

.article-title {
  font-family: 'Article Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
```

> 字体不是越多越好。标题、正文、代码三类场景通常已经足够，过多字体会让页面显得散，也会增加加载成本。

---

## 四、把经验整理成发布清单

发布前可以按下面的清单走一遍：

- [ ] 标题是否能让读者判断主题。
- [ ] 每个二级标题下面是否有清晰结论。
- [ ] 代码能否独立复制运行。
- [ ] 图片是否有说明文字或上下文。
- [ ] 关键结论是否用引用、列表或表格强调。
- [ ] 文章结尾是否给出下一步行动。

### 一个小型复盘模板

| 问题 | 记录                           |
| ---- | ------------------------------ |
| 现象 | 首屏白屏约 2 秒，低端机更明显  |
| 根因 | 首屏图片过大，编辑器包提前加载 |
| 处理 | 图片改为 WebP，编辑器按需加载  |
| 结果 | LCP 从 4.8s 降到 2.1s          |

---

## 五、结尾：让文章成为可复用资产

写技术文章不是把一次排查过程“贴出来”，而是把它变成别人也能复用的方法。结构清楚，样式自然会帮你放大重点；结构混乱，再漂亮的主题也只能补救一小部分。

最后送一个简单原则：

> 先写清楚，再写好看。排版不是给内容化妆，而是帮内容找到秩序。

[^perf-note]: FCP、LCP、TBT、CLS 是常见 Web 性能指标，实际项目中可以结合浏览器 Performance 面板、Lighthouse 和真实用户监控一起判断。
