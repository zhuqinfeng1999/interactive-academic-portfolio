<p align="right"><a href="README.md">English</a></p>

![Spatialfolio——交互式学术主页模板](docs/assets/readme-hero.svg)

# Spatialfolio——交互式学术主页模板

一款面向研究人员的沉浸式、交互式学术主页模板。它的目标不是把简历搬到网页上，而是用清晰的视觉层级解释你的**研究体系、代表成果与学术身份**。

[在线参考](https://zhuqinfeng1999.github.io/) · [中文定制指南](docs/CUSTOMIZE.zh-CN.md) · [Codex 动效指南](docs/CODEX_VISUALS.zh-CN.md) · [English](README.md)

> 在线参考是 Qinfeng Zhu 的正式个人主页。本仓库使用明确标注的虚构示例内容，不会把作者的论文、简历或论文图片混入模板默认数据。

## 为什么选择 Spatialfolio

- **交互式 Canvas 首屏**：内置四种研究场景，支持鼠标、触摸和模式切换。
- **研究方向图谱**：通过一份 JSON 数据展示研究方向、论文和项目之间的联系。
- **可检索论文库**：支持关键词搜索、年份/类型筛选和一键复制 BibTeX。
- **项目索引与长项目页**：适合展示方法、数据集、代码、演示和研究地图。
- **全站命令搜索**：快速检索页面、研究方向、论文与项目。
- **零构建部署**：语义化 HTML、CSS 与原生 JavaScript 可以直接部署到 GitHub Pages。
- **响应式与可访问性**：兼顾键盘操作、移动端、无动画偏好和可读的后备内容。
- **适合二次设计**：可以让 Codex 根据你的学科重新制作首屏科研动效。

## 快速开始

1. 在 GitHub 点击 **Use this template**。
2. 如果要部署个人主页，将新仓库命名为 `你的用户名.github.io`；项目主页可使用任意仓库名。
3. 替换各 HTML 文件中的身份占位内容，并编辑 `assets/data/research.json`。
4. 前往 **Settings → Pages**，选择从默认分支的仓库根目录部署。
5. 发布前运行 `npm run validate`。本项目不需要安装任何依赖。

本地预览：

```bash
npm run serve
```

随后访问 `http://127.0.0.1:4173/`。

## 内容修改位置

| 内容 | 文件位置 |
| --- | --- |
| 姓名、简介、联系方式、SEO 信息 | 根目录及各子页面中的 HTML 文件 |
| 研究方向、论文、项目和动态 | `assets/data/research.json` |
| 首页精选内容与顺序 | `index.html` |
| 配色、字体和排版 | `assets/css/cosmic.css`、`assets/css/subpages.css` |
| 首屏和 Explorer 交互动效 | `assets/js/spatial-world.js` |
| 研究方向与论文示意图 | `assets/images/directions/`、`assets/images/publications/` |

更完整的身份替换、论文数据、项目页面、SEO、可访问性和部署检查清单见 [中文定制指南](docs/CUSTOMIZE.zh-CN.md)。

## 让动效真正属于你的研究

模板自带的点云、地球观测、球面视觉和具身智能模式只是示例，不要求所有人都保留。

你可以让 Codex 先理解你的研究概念，再重新设计 `assets/js/spatial-world.js`，同时保持原有接口、响应式表现和可访问性。我们准备了以下方向的提示词与验收标准：

- 世界模型、自动驾驶与机器人轨迹预测；
- 医学图像分割、三维体数据与不确定性；
- 凝聚态物理、晶格、自旋纹理与能带；
- 遥感、多模态科学数据和其他研究方向。

详见 [Codex 科研动效定制指南](docs/CODEX_VISUALS.zh-CN.md)。

## 署名要求

如果公开网站大量使用了 Spatialfolio，需要在网页底部保留一个清晰可见、可访问的来源链接。模板已经在每个页面中默认加入：

```html
<a href="https://github.com/zhuqinfeng1999/interactive-academic-portfolio">
  Spatialfolio template ↗
</a>
```

你可以调整文字和样式，但不能隐藏或删除来源链接。完整条款见 [LICENSE](LICENSE)。

## 项目结构

```text
.
├── index.html                     # 首页
├── research/                     # 交互式研究图谱
├── publications/                 # 可检索论文库
├── projects/                     # 项目索引与项目详情页
├── explorer/                     # 全屏科研交互场景
├── assets/
│   ├── css/                      # 视觉系统与响应式布局
│   ├── data/research.json        # 全站共享研究数据
│   ├── images/                   # 原创 SVG 示例图
│   └── js/                       # 界面、图谱、论文库与 Canvas 引擎
├── docs/                         # 中英文定制文档
└── scripts/                      # 无依赖的预览与校验脚本
```

## 自动校验

```bash
npm run validate
```

校验器会检查 JSON、内部资源与路由、文件名大小写、重复 HTML ID、论文与研究方向关系，以及每个公开页面中的模板来源链接。

## GitHub 搜索优化

建议的 GitHub **About**：

> A cinematic, interactive academic portfolio template for researchers, with live Canvas scenes, a research atlas, searchable publications and zero-build GitHub Pages deployment.

建议 Topics：

`academic-website` · `academic-portfolio` · `portfolio-template` · `researcher-portfolio` · `github-pages` · `interactive-website` · `canvas-animation` · `research-website` · `vanilla-javascript`

## 许可证

Spatialfolio 使用 **Spatialfolio Attribution License 1.0**。允许修改、再发布与商业使用，但需要保留源代码声明，并在公开部署的网站底部保留模板来源链接。

由 [Qinfeng Zhu](https://zhuqinfeng1999.github.io/) 创建。
