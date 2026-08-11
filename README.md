<p align="right"><a href="README.zh-CN.md">简体中文</a></p>

![Spatialfolio — interactive academic portfolio template](docs/assets/readme-hero.svg)

# Spatialfolio — Interactive Academic Portfolio

A cinematic, interactive academic portfolio template for researchers who want their website to explain a **research system**, not merely reproduce a CV.

[Live reference](https://zhuqinfeng1999.github.io/) · [Customization guide](docs/CUSTOMIZE.md) · [Codex visual guide](docs/CODEX_VISUALS.md) · [中文说明](README.zh-CN.md)

> The live reference is Qinfeng Zhu's production portfolio. This repository ships fictional sample content so you can safely replace it with your own work.

## Why Spatialfolio

- **Interactive Canvas hero** with four responsive sensing modes and pointer/tap interactions.
- **Connected research atlas** driven by one structured JSON file.
- **Searchable publication library** with year/type filters and one-click BibTeX copying.
- **Project index and long-form project pages** for methods, datasets and research maps.
- **Command palette** for fast search across pages, topics, projects and papers.
- **Zero-build deployment**: semantic HTML, custom CSS and vanilla JavaScript work directly on GitHub Pages.
- **Responsive and considerate**: keyboard access, meaningful fallback content and reduced-motion support are built in.
- **Designed for adaptation**: replace the visual field with a Codex-generated scene for your discipline.

## Quick start

1. Click **Use this template** on GitHub.
2. Name the new repository `yourusername.github.io` for a user site, or choose any name for a project site.
3. Replace the identity placeholders in the HTML files and update `assets/data/research.json`.
4. In **Settings → Pages**, deploy from your default branch and repository root.
5. Run `npm run validate` before publishing. No package installation is required.

Local preview:

```bash
npm run serve
```

Open `http://127.0.0.1:4173/`.

## Customize the content

| What | Where |
| --- | --- |
| Name, biography, contact links, SEO metadata | HTML files in `/`, `research/`, `publications/`, `projects/`, and `explorer/` |
| Research areas, papers, projects and news | `assets/data/research.json` |
| Homepage editorial selection | `index.html` |
| Colors, typography and layouts | `assets/css/cosmic.css` and `assets/css/subpages.css` |
| Interactive Canvas scenes | `assets/js/spatial-world.js` |
| Research illustrations | `assets/images/directions/` and `assets/images/publications/` |

The detailed checklist in [docs/CUSTOMIZE.md](docs/CUSTOMIZE.md) covers identity replacement, publication metadata, project pages, SEO, accessibility and deployment.

## Make the interaction belong to your research

The included point-cloud, Earth-observation, spherical and embodied-AI modes are examples—not a visual identity you must keep.

Ask Codex to study your research concepts and redesign `assets/js/spatial-world.js` while preserving its public interface and accessibility constraints. The guide includes ready-to-use briefs for:

- world models and autonomous systems;
- medical image segmentation and volumetric uncertainty;
- condensed-matter physics, lattices and spin textures;
- remote sensing, robotics and multimodal scientific data.

See [docs/CODEX_VISUALS.md](docs/CODEX_VISUALS.md).

## Attribution requirement

Public websites built substantially from Spatialfolio must keep a visible footer credit linking to this repository. The template already includes:

```html
<a href="https://github.com/zhuqinfeng1999/interactive-academic-portfolio">
  Spatialfolio template ↗
</a>
```

You may restyle or reword the credit, but the source link must remain readable and accessible. See [LICENSE](LICENSE) for the complete terms.

## Project structure

```text
.
├── index.html                     # Homepage
├── research/                     # Interactive research atlas
├── publications/                 # Searchable publication library
├── projects/                     # Project index and detail pages
├── explorer/                     # Full-screen interactive scene
├── assets/
│   ├── css/                      # Visual system and responsive layouts
│   ├── data/research.json        # Shared structured research content
│   ├── images/                   # Original SVG example visuals
│   └── js/                       # UI, atlas, library and Canvas engine
├── docs/                         # English and Chinese customization guides
└── scripts/                      # Dependency-free preview and validation
```

## Validation

```bash
npm run validate
```

The validator checks JSON integrity, internal assets and routes, filename case, duplicate HTML IDs, publication/domain relationships and the required attribution link.

## Repository discoverability

Recommended GitHub **About** text:

> A cinematic, interactive academic portfolio template for researchers, with live Canvas scenes, a research atlas, searchable publications and zero-build GitHub Pages deployment.

Recommended topics:

`academic-website` · `academic-portfolio` · `portfolio-template` · `researcher-portfolio` · `github-pages` · `interactive-website` · `canvas-animation` · `research-website` · `vanilla-javascript`

## Contributing

Bug fixes, accessibility improvements and discipline-specific visual modes are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Spatialfolio is released under the **Spatialfolio Attribution License 1.0**. Reuse and modification are permitted, including commercial use, provided the source notice is retained and public deployments keep the visible footer credit.

Created by [Qinfeng Zhu](https://zhuqinfeng1999.github.io/).
