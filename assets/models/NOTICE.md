# Robot study assets

The 3D studies use redistributed models from [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie), accessed 26 September 2026.

- **Franka Emika Panda**: [source](https://github.com/google-deepmind/mujoco_menagerie/tree/main/franka_emika_panda), derived from Franka Emika's public robot description. Apache License 2.0; complete terms in `panda/LICENSE`.
- **Shadow Hand E3M5**: [source](https://github.com/google-deepmind/mujoco_menagerie/tree/main/shadow_hand). Copyright 2022 Shadow Robot Company Ltd. Apache License 2.0; complete terms in `shadow/LICENSE`.

Changes: original OBJ visual meshes were converted into indexed, gzip-compressed geometry buffers; joint frames were retained in JSON. The hand's display orientation was changed. Materials, studio lighting and illustrative, joint-limited motion were authored for this website. The models are not affiliated with or endorsed by the manufacturers. These interactions are kinematic illustrations, not learned policies, physics experiments or reported research results.

The robot assets retain their Apache-2.0 licenses independently of the website's non-commercial license. Names and marks identify the modeled hardware only.

Studio lighting: **Studio Small 09**, [Poly Haven](https://polyhaven.com/a/studio_small_09), distributed under [CC0](https://polyhaven.com/license). The original 1K HDR is stored in `../environments/`.

Rendering: **Three.js 0.160.1**, MIT license in `../vendor/three/LICENSE`. RGBELoader's module import was changed to a local relative path.

Additional studies: the rover and kinetic apparatus in `../js/robot-studies.js` are original procedural geometry. The rover follows fixed navigation commands; it is not live VLA inference. The cradle uses a closed-form, damped, ideal equal-mass transfer illustration, not a general physics engine or learned world model. Franka stacking trajectories were solved offline with joint limits, and returns follow top-first support constraints.

Interface references (visual inspiration only; no component or paid prompt copied): [Magic UI Terminal](https://magicui.design/docs/components/terminal), and [MotionSites robotics](https://motionsites.ai/?prompt=nex-robotics). Original terminal markup and behavior were written for this site.
