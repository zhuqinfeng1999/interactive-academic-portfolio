<p align="right"><a href="README.zh-CN.md">简体中文</a></p>

![Spatialfolio — interactive academic portfolio template](docs/assets/readme-hero.svg)

# Spatialfolio — Interactive Academic Portfolio

**Make your research feel alive.** A cinematic academic website template with interactive 3D research studies, an editorial publication layout and a searchable research library. Static files. No build step.

<p align="center">
  <strong><a href="https://zhuqinfeng1999.github.io/">Explore Qinfeng Zhu’s personal website ↗</a></strong><br>
  <sub>The live portfolio behind Spatialfolio — from computer vision to embodied intelligence</sub>
</p>

[Customization](docs/CUSTOMIZE.md) · [Design with Codex](docs/CODEX_VISUALS.md) · [Edition guide](docs/EDITIONS.md) · [中文说明](README.zh-CN.md)

> **2.0.1 · Embodied edition.** All sample names, institutions, placement dates and publications in this template are fictional. Replace them with your own verified information before publishing.

## Choose your research edition

| Edition | Best suited to | Included visual |
| --- | --- | --- |
| **Embodied — current edition** | Embodied intelligence, agentic robotics, WAM, VLA and dexterous manipulation | Reversible cube stacking, a Shadow hand, a VLA-style rover terminal and an idealized dynamics study |
| **Perception — previous design** | Computer vision, remote sensing, 3D and panoramic perception | One interactive urban district with four connected sensing views |

The current homepage uses the Embodied edition. Preview the previous homepage at `/editions/perception/`. For the complete prior release, use the [pinned Perception source](https://github.com/zhuqinfeng1999/interactive-academic-portfolio/tree/5a9e7d3baf8532922c6961b75143788e00440742). See [CHANGELOG](CHANGELOG.md) for version history.

## Preview

![Embodied edition homepage with a metallic robotic arm](docs/assets/screenshots/embodied-hero.png)

![Embodied research directions and visual-perception foundations](docs/assets/screenshots/embodied-research.png)

| Language → action | Predict → release |
| --- | --- |
| ![Code-style terminal commanding a mobile robot](docs/assets/screenshots/embodied-terminal.png) | ![Interactive metallic kinetic apparatus](docs/assets/screenshots/embodied-dynamics.png) |

The arm and hand use real, Apache-2.0-licensed geometry with CC0 studio lighting. The rover and kinetic apparatus are original procedural geometry. These are **illustrations, not live policy inference or experimental results**. Asset names identify the hardware and do not imply manufacturer endorsement.

The arm performs one opening grasp, then lets visitors stack three cubes and return them from the top. The terminal runs a fixed set of navigation instructions with synchronized observe → ground → act → verify feedback. The dynamics study previews idealized momentum transfer; it is not a learned WAM. Automatic motion respects reduced-motion settings.

Hover near a cube to see its illuminated outline and the available action. In the dynamics view, click to release, click during motion to pause, then click again to resume from the same position. **Enter** follows the same behavior. Dragging only changes the viewpoint. Use **Replay impulse** or choose another impulse to deliberately restart. **Play**, **Pause** and **Resume** provide equivalent playback controls outside the canvas. Under reduced motion, actions show a static result by default; pressing **Play** explicitly opts into animation for that scene until reset or switching scenes.

## Features

- Four interactive studies with object selection, articulated motion, pointer inspection, touch and keyboard controls.
- Viewport-filling desktop composition with fluid typography and scene sizing, plus a stacked mobile layout.
- Clear separation between current work, future directions and published research foundations.
- Searchable publications with year/type filters and BibTeX copying.
- Complete homepage publication list, project pages and research timeline.
- Site-wide command palette.
- Google Fonts, dark/light editorial sections and integrated publication figures.
- Reduced motion, pause/reset, offscreen suspension and static model posters when 3D is unavailable.
- Local model assets: no external 3D service or runtime model CDN.

## Quick start

1. Choose **Use this template** and name the repository `yourusername.github.io`.
2. Replace the identity and biography in the HTML; edit `assets/data/research.json`.
3. Add your verified papers, project links, CV and figures. Keep future interests separate from completed work.
4. Run the checks below, then enable **Settings → Pages → deploy from branch → repository root**.

```bash
npm run serve
npm run validate
```

Open `http://127.0.0.1:4173/`. No package installation is required. The template uses root-relative links; deployment under a repository subpath needs a base-path adaptation first.

## Where to customize

| Content | File |
| --- | --- |
| Name, biography, availability, links and SEO | HTML pages, starting with `index.html` |
| Topics, all publications, projects and news | `assets/data/research.json` |
| Homepage editorial selection | `index.html` |
| Scene controls, stacking and shared renderer | `assets/js/robot-stage.js` |
| Rover, preset navigation and idealized dynamics | `assets/js/robot-studies.js` |
| Model geometry and joint-limited motion | `assets/models/` |
| Embodied layout | `assets/css/embodied.css` |
| Base design and publication treatments | `assets/css/cosmic.css`, `subpages.css`, `refinement.css` |
| Previous Perception renderer | `assets/js/spatial-cloud.js`, `spatial-world.js` |

The hand loads after the arm, and only one renderer is used. Compressed robot meshes total approximately 4 MB; the HDR environment and static posters are stored locally. Test real loading and GPU performance before adding heavier assets.

## Make the scene belong to your research

The new edition is a starting point for embodied-intelligence researchers, not a requirement to use robotics imagery. Ask Codex to study your scientific question, propose a visual concept and implement a meaningful interaction:

- **World models:** compare predicted futures, then execute a selected action.
- **Medical imaging:** inspect a segmented volume and its uncertainty, with no patient data.
- **Condensed-matter physics:** explore lattice structure, spin alignment and a phase parameter.
- **Computer vision:** adapt the retained Perception edition.

Keep controls understandable, use licensed assets and distinguish an illustration from measured results. Detailed prompts and technical contracts are in [the Codex guide](docs/CODEX_VISUALS.md).

## Attribution and license

Keep the visible footer link to [this repository](https://github.com/zhuqinfeng1999/interactive-academic-portfolio). The included **Built with Spatialfolio** GitHub credit is designed to be readable without competing with your research.

The original website code and design use the **Spatialfolio Non-Commercial Attribution License 1.0**. Personal, academic, educational, research and nonprofit use is allowed with attribution. Paid client work, resale, company marketing and other commercial use require written permission. See [LICENSE](LICENSE).

Third-party components retain their own licenses: Three.js (MIT), Franka and Shadow model assets (Apache-2.0), and Poly Haven lighting (CC0). Details: [asset notices](assets/models/NOTICE.md).

## GitHub About and topics

Suggested About:

> A cinematic academic portfolio template with interactive 3D robotics, an embodied-intelligence edition, research atlas and searchable publications. Zero-build GitHub Pages.

Topics: `academic-website` · `academic-portfolio` · `portfolio-template` · `embodied-ai` · `robotics` · `threejs` · `github-pages` · `research-website` · `non-commercial`

Created by [Qinfeng Zhu](https://zhuqinfeng1999.github.io/). Contributions welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).
