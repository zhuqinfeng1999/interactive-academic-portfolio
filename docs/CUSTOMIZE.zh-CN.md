# Spatialfolio 中文定制指南

[English](CUSTOMIZE.md)

建议按照“身份与内容 → 数据 → 视觉 → 交互”的顺序修改。先把信息做准确，再追求动效，能够显著减少返工。

## 1. 修改前准备

提前整理：

- 姓名、职位、城市和学校/机构；
- 50–90 词个人简介与一句话核心研究问题；
- 邮箱、GitHub、Google Scholar、ORCID、LinkedIn；
- 当前求职或合作状态；
- 完整且已核实的论文信息与链接；
- 4–7 个研究方向及简短说明；
- 2–6 个值得单独展示的项目；
- 需要下载的 CV PDF；
- 你拥有版权或获准再发布的图片。

## 2. 替换身份占位内容

全仓库搜索：

```text
Your Name
YN
Your University
Your City
yourusername
hello@example.com
https://yourusername.github.io/
```

逐一替换所有 HTML 文件中的正文、页面标题、canonical URL、Open Graph、schema.org 数据、页脚版权、社交链接和邮箱。`YN` 是导航栏中的姓名缩写，可以替换成任意两个简短字符。

## 3. 修改研究数据

主要数据位于 `assets/data/research.json`。

### 研究方向

每个方向需要唯一 `id`、编号、标题、短标签、说明、图片、图谱坐标和关联论文 ID。

```json
{
  "id": "medical-imaging",
  "number": "01",
  "title": "Medical Imaging",
  "kicker": "Clinical evidence",
  "description": "Learning reliable representations from multimodal clinical images.",
  "image": "/assets/images/directions/medical-imaging.svg",
  "position": { "x": 18, "y": 25 },
  "publicationIds": ["your-paper-id"]
}
```

如果修改了研究方向 ID，还需要同步修改 `assets/js/research-atlas.js` 中的 `edges` 连接关系和中心节点 ID。

### 论文

论文 ID 建议使用稳定的小写英文。作者使用对象格式，便于突出本人和共同一作。

```json
{
  "id": "your-paper-id",
  "year": 2026,
  "venue": "Full Venue Name",
  "venueShort": "VENUE",
  "type": "Journal",
  "title": "Your Verified Paper Title",
  "authors": [
    { "name": "Your Name", "self": true, "coFirst": true },
    { "name": "Collaborator", "coFirst": true }
  ],
  "featuredRank": 1,
  "image": "/assets/images/publications/your-paper.svg",
  "imageAlt": "准确解释图片科学信息的文字",
  "summary": "一句话贡献说明。",
  "keywords": ["Topic A", "Topic B"],
  "links": {
    "Journal": "https://publisher.example/paper",
    "Project": "/projects/your-project/",
    "GitHub": "https://github.com/yourusername/your-project"
  },
  "bibtex": "@article{...}"
}
```

`type` 要和论文库筛选按钮一致，例如 `Journal`、`Conference`、`Preprint`。只有真正拥有合适图片的条目才设置 `featuredRank`。

### 项目与动态

项目 `type` 决定筛选分类。默认包括 `Dataset`、`Method` 和 `Research map`。脚本生成的 slug 必须与按钮的 `data-project-filter` 一致。

Research news 建议只保留三到四条最重要的接收、获奖、开源或发布信息。

## 4. 编辑首页精选内容

论文库与研究图谱是数据驱动的，首页则有意保留“编辑式”排版。请在 `index.html` 中手动选择最重要的成果与顺序。

建议：

- 3–5 篇全栏重点论文；
- 最多 2 篇半栏/紧凑论文；
- 其余论文使用简洁列表；
- 只突出 2 个最强项目；
- 不要在首页下方重复首屏个人简介。

论文卡片中的 `.paper-ambient` 和 `.paper-artwork` 使用同一张图片：前者负责融合虚化背景，后者保持主体清晰。

## 5. 新建项目详情页

复制以下任一目录：

- `projects/featured-project/`：适合方法、模型或系统；
- `projects/medical-ai/`：适合数据集或评测基准。

重命名目录、修改元信息，并在 `research.json` 中更新链接。建议保持“问题 → 方法 → 证据与限制 → 论文/代码/数据 → 相关研究”的叙事顺序。

## 6. 合理替换图片

- 优先使用 SVG、WebP 或 AVIF；
- 首页不要放入数 MB 的原始论文图片；
- 图片裁切应服务于信息表达；
- 没有授权时不要再发布带出版社版权的图片；
- `alt` 应解释图片表达的科学信息；
- 纯装饰的虚化图片使用 `alt=""` 和 `aria-hidden="true"`。

## 7. 添加 CV

将 PDF 放进 `assets/docs/`，然后加入：

```html
<a href="/assets/docs/your-name-cv.pdf" download>Download CV ↓</a>
```

链接中建议注明版本日期，并与文件同步更新。

## 8. 修改配色与排版

优先修改 `assets/css/cosmic.css` 顶部的 CSS 变量。请检查颜色对比度，并同时在普通笔记本屏幕、深色显示器和手机上测试。

不要为了填空而不断增加边框、卡片和动画。Spatialfolio 最适合用“有意义的动效”解释研究概念，并通过深浅区块切换区分信息层级。

## 9. 定制 Canvas 科研动效

阅读 [CODEX_VISUALS.zh-CN.md](CODEX_VISUALS.zh-CN.md)。修改时必须保留：

- `data-spatial-world` Canvas 选择器；
- 模式按钮与模式名称的对应关系；
- `canvas.spatialWorld`、`setMode()` 和指针交互；
- `prefers-reduced-motion` 处理；
- 移动端性能和 resize 行为；
- Canvas 之外可被搜索和阅读的文字内容。

## 10. SEO 与分享

- 替换所有 `yourusername.github.io`；
- 更新 `robots.txt` 和 `sitemap.xml`；
- 如果目标平台不支持 SVG 分享图，将 `social-preview.svg` 换成 1200×630 的 PNG/WebP；
- 每个页面使用不同且准确的 title 与 description；
- 按 README 建议设置 GitHub About 和 Topics；
- 在 GitHub Profile、Scholar、ORCID 和 CV 中加入主页链接。

## 11. 署名

Spatialfolio 允许用于非商业的个人、学术、教育、科研、慈善与非营利项目。
付费客户建站、转售、集成到商业产品、商业托管服务或企业营销用途，需要事先
取得 Qinfeng Zhu 的书面许可。完整条款见仓库中的 [LICENSE](../LICENSE)。

保留指向以下地址的可见链接：

```text
https://github.com/zhuqinfeng1999/interactive-academic-portfolio
```

模板已在所有示例页脚中加入该链接。允许修改文字与字体，但不得删除、遮挡或通过低对比度隐藏。

## 12. 校验与部署

```bash
npm run validate
npm run serve
```

请分别检查桌面、平板和手机宽度，并测试键盘导航、命令搜索、论文筛选、项目筛选、四种 Canvas 模式、全部内部链接和减少动画偏好。

全部通过后，再通过 GitHub Pages 从仓库根目录部署。
