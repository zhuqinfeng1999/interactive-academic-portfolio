# Choosing an edition / 版本选择

## Embodied · 2.0.3

For embodied AI and robotics researchers. The default homepage and Explorer share
`assets/js/robot-stage.js`; the four modes are `arm`, `hand`, `vla` and `wam`.
The original visual-perception work remains a research foundation, not erased history.

默认新版适合具身智能和机器人研究者。四种模式统一材质与灯光，但主体分别是机械臂、灵巧手、终端控制的移动机器人，以及理想化动力学装置。
研究方向不等于已发表成果，请在简介与 JSON 中准确区分。

`arm` supports reversible stacking with an automatic opening demonstration.
`hand` explores three coordinated poses. `vla` is a preset navigation terminal,
not a language-model endpoint. `wam` illustrates predicted physical consequences
with an idealized Newton's cradle, not a learned world–action model.

## Perception · preserved edition

Open `/editions/perception/` for the original homepage. Its sensing renderer is retained,
but its navigation leads to the current shared subpages. For the complete earlier site,
use the [pinned source](https://github.com/zhuqinfeng1999/interactive-academic-portfolio/tree/5a9e7d3baf8532922c6961b75143788e00440742).

旧首页保留在上述路径，但导航仍共用新版子页。如果需要整套旧站，请选择固定版本源码。

## Release policy

- Candidate versions use `-rc.N` in `package.json`.
- Review all four scenes, responsive layouts and fallback behavior before release.
- Run `npm run validate`; verify publication data and attribution.
- After owner approval, publish the commit and create a matching version tag.
- Keep the previous edition accessible; do not rewrite its published history.

候选版本须经过站点所有者审核后才能推送、部署和创建正式版本标签。
