# Designing a Research Visual with Codex

[中文版本](CODEX_VISUALS.zh-CN.md)

The strongest homepage interaction is not a generic particle effect. It is a simplified scientific model with a clear visual grammar, a meaningful response to the pointer and a short explanation outside the canvas.

## Before prompting

Give Codex:

1. the repository and this guide;
2. a 3–5 sentence explanation of your research;
3. the entities that should appear;
4. the relationship or process the interaction should reveal;
5. one or two visual references, if available;
6. the device and performance constraints below.

Avoid requests such as “make it more futuristic” without explaining the research concept. Ask for a visual hypothesis first, then implementation.

## Required technical contract

Ask Codex to preserve these behaviors in `assets/js/spatial-world.js`:

- canvases are discovered through `[data-spatial-world]`;
- the instance remains available as `canvas.spatialWorld`;
- `setMode(mode)` updates the scene and the active button;
- pointer, touch, click and resize interactions remain functional;
- status copy updates through `[data-world-title]`, `[data-world-detail]`, `[data-world-status]` and `[data-world-interaction]`;
- `prefers-reduced-motion: reduce` produces a stable, meaningful frame;
- rendering stops or throttles when the page is not visible;
- the scene remains legible at 390 px, 768 px and 1440 px widths;
- the interaction does not depend on a mouse hover alone;
- the rest of the site and the required template credit remain unchanged.

Performance targets:

- smooth interaction on an ordinary integrated-GPU laptop;
- no unbounded object allocation inside the animation loop;
- device-pixel-ratio capped at a reasonable value;
- no network-loaded 3D models or heavy framework unless clearly justified;
- no console errors and no layout overflow.

## Recommended workflow

Use three Codex passes.

### Pass 1 — concept

```text
Study my research summary and the existing Spatialfolio interaction. Do not edit files yet.
Propose three distinct visual metaphors. For each, explain:
1. what scientific entities are shown;
2. what changes over time;
3. what pointer movement means;
4. what click/tap means;
5. how the visual stays understandable without labels inside the canvas;
6. why it is scientifically defensible rather than decorative.
Recommend one concept and identify likely failure modes.
```

### Pass 2 — implementation

```text
Implement the selected concept in assets/js/spatial-world.js.
Preserve the Spatialfolio public interface, all existing page hooks, mobile behavior,
reduced-motion support and the visible template attribution. Use only Canvas 2D and
repository-local assets unless I explicitly approve another dependency. Keep the
interaction responsive, semantically meaningful and visually integrated with the
dark cyan visual system. Update the mode labels and status text where necessary.
```

### Pass 3 — adversarial review

```text
Audit the result as a skeptical interaction designer, domain researcher and frontend
performance engineer. Test desktop, tablet, mobile, touch, reduced motion and rapid
mode switching. Explain what each visual element means. Remove any line, particle,
ring or animation that has no defensible meaning. Fix overlap, sparse composition,
slow response, excessive motion, unclear controls, console errors and overflow.
Iterate until all checks pass, then summarize the scientific visual grammar.
```

## Prompt brief: world models and autonomous systems

```text
Redesign the hero as an interactive world-model field. Show a coherent bird's-eye
scene with static map structure, observed agents, short history trails and multiple
probabilistic future trajectories. Pointer movement should reposition an inspection
window and reveal local occupancy, velocity and uncertainty. Click/tap should advance
one prediction step or expand alternative futures. Do not use meaningless rays or a
generic lidar sweep. Density must remain balanced across the right half of the hero.
Use color consistently: cyan for observed structure, orange for uncertain futures,
violet for latent hypotheses and pale green for the selected prediction.
```

## Prompt brief: medical image segmentation

```text
Redesign the hero as a volumetric medical-segmentation explorer. Use a stack of
semi-transparent axial slices or an abstract volume, with two or three anatomically
plausible regions and uncertainty contours. Pointer movement should scrub through
depth while preserving spatial context. Click/tap should toggle prediction,
annotation and uncertainty views. Avoid decorative ECG lines unless the research
actually uses temporal cardiac signals. Keep the palette clinical but consistent
with Spatialfolio, and ensure no real patient data is embedded in the repository.
```

## Prompt brief: condensed-matter physics

```text
Redesign the hero around a reciprocal-space or lattice model. Show a finite crystal
lattice with meaningful bonds and a controllable spin, orbital or order-parameter
texture. Pointer movement should perturb a local field or move through momentum
space; click/tap should switch between real-space texture, band structure and Berry
curvature (only if these quantities match my research). Encode sign and magnitude
consistently. Avoid random particle motion and explain the symmetry represented by
every repeated motif.
```

## Prompt brief: multimodal scientific learning

```text
Redesign the hero as a multimodal inference system. Give each modality a distinct
observation geometry, then show how evidence aligns into a shared representation and
returns to task-specific predictions. Pointer movement should inspect cross-modal
correspondence; click/tap should mute one modality and reveal how uncertainty changes.
Do not represent fusion as arbitrary lines converging on a glowing circle. The layout
must make missing-modality robustness and information flow visually testable.
```

## Acceptance checklist

- A first-time visitor can describe the concept after ten seconds.
- Every persistent line, point, region and animation has a research meaning.
- Pointer response feels immediate but not nervous.
- Click/tap causes a discoverable state change.
- The scene fills its intended area without colliding with hero text.
- Mode buttons accurately predict the resulting scene.
- Status text explains the current interaction in plain language.
- The reduced-motion frame still communicates the core idea.
- Mobile controls do not cover essential content.
- No canvas text carries information unavailable in HTML.
- The validator and browser console are clean.

## What Codex should not change automatically

- verified publication metadata;
- your biography, job-seeking statements or external links;
- the attribution license and visible repository credit;
- domain claims it cannot infer from your supplied sources.

Treat the interaction as a scientific illustration with behavior—not a screensaver.
