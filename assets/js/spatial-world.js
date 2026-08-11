(() => {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const smoothstep = (edge0, edge1, value) => {
    const t = clamp((value - edge0) / (edge1 - edge0 || 1), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class SpatialWorld {
    constructor(canvas) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!this.context) return;

      this.scene = canvas.dataset.scene || 'hero';
      this.mode = canvas.dataset.mode || 'pointcloud';
      this.width = 1;
      this.height = 1;
      this.ratio = 1;
      this.seed = 71993;
      this.points = [];
      this.stars = [];
      this.frame = 0;
      this.lastTime = 0;
      this.visible = true;
      this.documentVisible = !document.hidden;
      this.mobile = window.matchMedia('(max-width: 720px)').matches;
      this.quality = this.getQuality();
      this.pointer = {
        active: false,
        down: false,
        x: .63,
        y: .46,
        smoothX: .63,
        smoothY: .46,
        lastInteraction: 0
      };
      this.probe = {
        x: 0,
        y: 0,
        radius: 112,
        targetRadius: 112,
        pulses: [],
        focus: null
      };
      this.camera = null;
      this.cameraRig = null;
      this.swathZ = 0;
      this.aerial = { x: 0, z: -.4, capture: null };
      this.panorama = { yaw: .35, pitch: .06, pulseBorn: -Infinity };
      this.robot = { x: 0, z: 4.8, planStartX: 0, planStartZ: 4.8, goalX: -.18, goalZ: -3.6, goalBorn: -Infinity };
      this.semanticColors = {
        ground: '#7994ad',
        road: '#a6b0bf',
        marking: '#d8e8ee',
        building: '#77b9ef',
        vegetation: '#72dfb2',
        street: '#b6a1e5',
        vehicle: '#ef9e79',
        water: '#58c9df'
      };
      this.semanticLabels = {
        ground: ['GROUND', 'surface geometry'],
        road: ['ROAD', 'drivable surface'],
        marking: ['ROAD MARKING', 'lane structure'],
        building: ['BUILDING', 'urban structure'],
        vegetation: ['VEGETATION', 'natural structure'],
        street: ['STREET OBJECT', 'urban furniture'],
        vehicle: ['VEHICLE', 'traffic participant'],
        water: ['WATER', 'surface class']
      };
      this.modeCopy = {
        pointcloud: ['Semantic probe', 'Move to reveal local classes · click to expand the neighbourhood', 'Urban point cloud', 'Move pointer · click to query'],
        aerial: ['Multispectral footprint', 'Move the observation window · click to capture a local sample', 'Remote sensing', 'Move footprint · click to capture'],
        panoramic: ['Spherical gaze', 'Steer a latitude–longitude view across the 360° field', 'Panoramic vision', 'Move gaze · click to confirm'],
        robotics: ['Navigation planner', 'Preview a road target · click to send the ground agent', 'Robotic perception', 'Move target · click to set goal']
      };

      this.generateWorld();
      this.bind();
      this.resize();
      this.updateReadout();
      this.draw(0, true);
    }

    getQuality() {
      const memory = navigator.deviceMemory || 8;
      if (this.mobile || memory <= 4) return .62;
      if (window.innerWidth < 1180) return .82;
      return 1;
    }

    random() {
      this.seed = (this.seed * 16807) % 2147483647;
      return (this.seed - 1) / 2147483646;
    }

    terrainHeight(x, z) {
      return Math.sin(x * .48) * .025 + Math.cos(z * .41) * .022;
    }

    addPoint(x, y, z, kind = 'ground', size = 1, alpha = .56) {
      this.points.push({ x, y, z, kind, size, alpha });
    }

    addBoxSurface(cx, baseY, cz, sx, sy, sz, kind, density = 1) {
      const step = (.105 / this.quality) / density;
      for (let y = step; y <= sy; y += step) {
        for (let x = -sx / 2; x <= sx / 2; x += step) {
          this.addPoint(cx + x, baseY + y, cz - sz / 2, kind, .94, .62);
          this.addPoint(cx + x, baseY + y, cz + sz / 2, kind, .9, .54);
        }
        for (let z = -sz / 2 + step; z < sz / 2; z += step) {
          this.addPoint(cx - sx / 2, baseY + y, cz + z, kind, .9, .56);
          this.addPoint(cx + sx / 2, baseY + y, cz + z, kind, .94, .62);
        }
      }
      for (let x = -sx / 2; x <= sx / 2; x += step * 1.12) {
        for (let z = -sz / 2; z <= sz / 2; z += step * 1.12) {
          this.addPoint(cx + x, baseY + sy, cz + z, kind, .96, .64);
        }
      }
    }

    addBuilding(cx, cz, sx, sz, height, roof = 'flat') {
      const base = this.terrainHeight(cx, cz);
      this.addBoxSurface(cx, base, cz, sx, height, sz, 'building');
      const step = .12 / this.quality;

      if (roof === 'ridge') {
        for (let x = -sx / 2; x <= sx / 2; x += step) {
          for (let z = -sz / 2; z <= sz / 2; z += step) {
            const rise = .28 * (1 - Math.abs(x) / (sx / 2));
            if (this.random() > .18) this.addPoint(cx + x, base + height + rise, cz + z, 'building', .94, .65);
          }
        }
      }

      if (roof === 'tower') {
        const mastTop = height + .72;
        for (let y = height; y <= mastTop; y += step * .7) {
          this.addPoint(cx, base + y, cz, 'street', .82, .7);
        }
      }

      /* Slightly brighter window rows make each façade legible without turning it into a solid mesh. */
      for (let y = .52; y < height - .22; y += .58) {
        for (let x = -sx * .36; x <= sx * .36; x += .28) {
          this.addPoint(cx + x, base + y, cz - sz / 2 - .006, 'building', 1.22, .8);
        }
      }
    }

    addTree(cx, cz, height = 1.12, radius = .43) {
      const base = this.terrainHeight(cx, cz);
      const trunkStep = .075 / this.quality;
      for (let y = 0; y <= height * .52; y += trunkStep) {
        this.addPoint(cx, base + y, cz, 'street', .72, .62);
        if (this.random() > .5) this.addPoint(cx + .025, base + y, cz - .018, 'street', .62, .48);
      }
      const count = Math.round(170 * this.quality);
      for (let index = 0; index < count; index += 1) {
        const theta = this.random() * Math.PI * 2;
        const phi = Math.acos(2 * this.random() - 1);
        const localRadius = radius * Math.cbrt(this.random());
        this.addPoint(
          cx + Math.sin(phi) * Math.cos(theta) * localRadius,
          base + height * .72 + Math.cos(phi) * localRadius * .8,
          cz + Math.sin(phi) * Math.sin(theta) * localRadius,
          'vegetation',
          .95 + this.random() * .28,
          .56 + this.random() * .18
        );
      }
    }

    addStreetlight(cx, cz, direction = 1) {
      const base = this.terrainHeight(cx, cz);
      const step = .065 / this.quality;
      for (let y = 0; y <= 1.28; y += step) this.addPoint(cx, base + y, cz, 'street', .72, .62);
      for (let x = 0; x <= .34; x += step) this.addPoint(cx + direction * x, base + 1.28, cz, 'street', .78, .72);
      this.addPoint(cx + direction * .35, base + 1.24, cz, 'marking', 1.35, .9);
    }

    addVehicle(cx, cz, heading = 1) {
      const base = this.terrainHeight(cx, cz) + .045;
      const sx = heading ? .86 : .46;
      const sz = heading ? .46 : .86;
      this.addBoxSurface(cx, base, cz, sx, .36, sz, 'vehicle', 1.15);
      const wheelOffsetX = sx * .42;
      const wheelOffsetZ = sz * .42;
      [[-wheelOffsetX,-wheelOffsetZ],[wheelOffsetX,-wheelOffsetZ],[-wheelOffsetX,wheelOffsetZ],[wheelOffsetX,wheelOffsetZ]].forEach(([x,z]) => {
        for (let a = 0; a < Math.PI * 2; a += .34) {
          this.addPoint(cx + x, base + .09 + Math.cos(a) * .09, cz + z + Math.sin(a) * .035, 'street', .76, .62);
        }
      });
    }

    generateWorld() {
      const groundStep = .145 / this.quality;
      for (let x = -7.8; x <= 7.8; x += groundStep) {
        for (let z = -8.2; z <= 7.6; z += groundStep) {
          const road = Math.abs(x) < 1.42;
          const sidewalk = Math.abs(x) >= 1.42 && Math.abs(x) < 2.02;
          const plaza = x > 2.02 && x < 4.35 && z > -1.2 && z < 2.3;
          const kind = road ? 'road' : (sidewalk || plaza ? 'ground' : 'ground');
          const density = road ? .93 : (sidewalk || plaza ? .82 : .68);
          if (this.random() > density) continue;
          const y = this.terrainHeight(x, z) + (sidewalk || plaza ? .055 : 0);
          this.addPoint(x, y, z, kind, .72 + this.random() * .34, .34 + this.random() * .19);
        }
      }

      /* Lane markings are points on the road surface, so every bright trace has a real spatial role. */
      const markStep = .075 / this.quality;
      for (let z = -8; z <= 7.4; z += markStep) {
        const broken = Math.floor((z + 8) / 1.15) % 2 === 0;
        if (broken) {
          this.addPoint(-.05, this.terrainHeight(-.05, z) + .028, z, 'marking', .72, .72);
          this.addPoint(.05, this.terrainHeight(.05, z) + .028, z, 'marking', .72, .72);
        }
        this.addPoint(-1.21, this.terrainHeight(-1.21, z) + .025, z, 'marking', .66, .52);
        this.addPoint(1.21, this.terrainHeight(1.21, z) + .025, z, 'marking', .66, .52);
      }

      const buildings = [
        [-5.95,-5.65,2.22,2.15,2.52,'tower'],[-3.28,-5.72,1.95,2.05,1.72,'flat'],
        [3.36,-5.58,2.08,2.22,2.85,'tower'],[5.92,-5.46,2.15,2.34,1.88,'ridge'],
        [-5.72,-2.38,2.36,2.18,1.72,'ridge'],[-3.18,-2.43,1.86,1.98,2.35,'flat'],
        [5.55,-2.34,2.65,2.12,2.18,'flat'],
        [-5.86,1.15,2.15,2.18,2.82,'tower'],[-3.32,1.15,1.95,2.0,1.62,'ridge'],
        [5.75,3.25,2.54,2.35,2.5,'tower'],[-5.46,4.9,2.72,2.28,1.92,'flat'],[-2.85,4.86,1.72,2.08,2.18,'ridge'],
        [3.28,5.0,1.92,2.12,1.78,'flat'],[5.58,5.08,2.18,2.18,2.28,'tower']
      ];
      buildings.forEach((building) => this.addBuilding(...building));

      const treePositions = [
        [-1.86,-6.8],[1.83,-6.15],[-1.84,-4.85],[1.84,-4.15],[-1.83,-2.82],[1.86,-2.15],
        [-1.84,-.55],[1.84,.18],[-1.86,1.68],[1.84,2.45],[-1.84,3.78],[1.84,4.52],
        [-1.84,6.05],[1.84,6.72],[2.75,-.55],[3.75,-.62],[2.72,1.62],[3.78,1.58]
      ];
      treePositions.forEach(([x,z], index) => this.addTree(x, z, 1.02 + (index % 3) * .08, .39 + (index % 2) * .045));

      [-6.2,-3.7,-1.15,1.4,3.95,6.45].forEach((z, index) => {
        this.addStreetlight(-1.66, z, 1);
        if (index % 2 === 0) this.addStreetlight(1.66, z + .72, -1);
      });

      this.addVehicle(-.66, -3.25, 0);
      this.addVehicle(.64, 1.82, 0);
      this.addVehicle(-.62, 5.42, 0);

      for (let index = 0; index < 82; index += 1) {
        this.stars.push({ x: this.random(), y: this.random() * .56, alpha: .025 + this.random() * .12, size: this.random() > .9 ? 1.25 : .65 });
      }
    }

    bind() {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);

      const pointerMove = (event) => {
        const bounds = this.canvas.getBoundingClientRect();
        this.pointer.active = true;
        this.pointer.x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
        this.pointer.y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
        this.pointer.lastInteraction = performance.now();
        if (reducedMotion) this.draw(performance.now(), true);
      };
      this.canvas.addEventListener('pointermove', pointerMove, { passive: true });
      this.canvas.addEventListener('pointerdown', (event) => {
        pointerMove(event);
        this.pointer.down = true;
        this.activateModeInteraction(performance.now());
        if (reducedMotion) this.draw(performance.now(), true);
      }, { passive: true });
      window.addEventListener('pointerup', () => {
        this.pointer.down = false;
        if (reducedMotion) this.draw(performance.now(), true);
      }, { passive: true });
      window.addEventListener('pointercancel', () => {
        this.pointer.down = false;
        if (reducedMotion) this.draw(performance.now(), true);
      }, { passive: true });
      this.canvas.addEventListener('pointerleave', () => {
        this.pointer.active = false;
        this.pointer.down = false;
      });

      this.visibilityObserver = new IntersectionObserver((entries) => {
        this.visible = entries[0]?.isIntersecting ?? true;
        if (this.visible && this.documentVisible && !reducedMotion && !this.frame) {
          this.frame = requestAnimationFrame((time) => this.draw(time));
        }
      }, { threshold: .01 });
      this.visibilityObserver.observe(this.canvas);

      document.addEventListener('visibilitychange', () => {
        this.documentVisible = !document.hidden;
        if (this.documentVisible && this.visible && !reducedMotion && !this.frame) {
          this.frame = requestAnimationFrame((time) => this.draw(time));
        }
      });

      document.querySelectorAll('[data-explorer-mode], [data-world-mode]').forEach((button) => {
        button.addEventListener('click', () => this.setMode(button.dataset.explorerMode || button.dataset.worldMode));
      });
    }

    resize() {
      const bounds = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, bounds.width);
      this.height = Math.max(1, bounds.height);
      this.mobile = this.width < 700;
      this.ratio = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.25 : 1.6);
      this.canvas.width = Math.round(this.width * this.ratio);
      this.canvas.height = Math.round(this.height * this.ratio);
      this.context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
      this.cameraRig = null;
      if (reducedMotion) this.draw(performance.now(), true);
    }

    setMode(mode) {
      if (!this.modeCopy[mode]) return;
      this.mode = mode;
      document.querySelectorAll('[data-explorer-mode], [data-world-mode]').forEach((button) => {
        const buttonMode = button.dataset.explorerMode || button.dataset.worldMode;
        const active = buttonMode === mode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      const role = document.querySelector('[data-roles]');
      const roleCopy = { pointcloud: '3D environments', aerial: 'remote sensing', panoramic: 'panoramic worlds', robotics: 'robotic perception' };
      if (role && roleCopy[mode]) {
        role.dataset.modeLocked = mode;
        role.textContent = roleCopy[mode];
        role.classList.remove('is-changing');
      }
      this.updateReadout();
      if (reducedMotion) this.draw(performance.now(), true);
    }

    updateReadout() {
      const copy = this.modeCopy[this.mode] || this.modeCopy.pointcloud;
      document.querySelectorAll('[data-world-title]').forEach((node) => { node.textContent = copy[0]; });
      document.querySelectorAll('[data-world-detail]').forEach((node) => { node.textContent = copy[1]; });
      document.querySelectorAll('[data-world-status]').forEach((node) => { node.textContent = copy[2]; });
      document.querySelectorAll('[data-world-interaction]').forEach((node) => { node.textContent = copy[3]; });
      document.querySelectorAll('.semantic-legend').forEach((node) => { node.hidden = this.mode !== 'pointcloud'; });
    }

    groundPointAtScreen(screenX, screenY, groundY = .08) {
      if (!this.camera) return null;
      const cameraX = (screenX - this.camera.centerX) / this.camera.focal;
      const cameraY = -(screenY - this.camera.centerY) / this.camera.focal;
      const ray = {
        x: this.camera.forward.x + this.camera.right.x * cameraX + this.camera.up.x * cameraY,
        y: this.camera.forward.y + this.camera.right.y * cameraX + this.camera.up.y * cameraY,
        z: this.camera.forward.z + this.camera.right.z * cameraX + this.camera.up.z * cameraY
      };
      if (Math.abs(ray.y) < .0001) return null;
      const distance = (groundY - this.camera.position.y) / ray.y;
      if (distance <= 0) return null;
      return {
        x: this.camera.position.x + ray.x * distance,
        y: groundY,
        z: this.camera.position.z + ray.z * distance
      };
    }

    activateModeInteraction(time) {
      if (this.mode === 'pointcloud') {
        if (!reducedMotion) {
          this.probe.pulses.push({ x: this.pointer.x, y: this.pointer.y, born: time });
          if (this.probe.pulses.length > 3) this.probe.pulses.shift();
        }
        return;
      }

      if (this.mode === 'panoramic') {
        this.panorama.pulseBorn = time;
        return;
      }

      const ground = this.groundPointAtScreen(this.pointer.x * this.width, this.pointer.y * this.height);
      if (!ground) return;
      if (this.mode === 'aerial') {
        this.aerial.x = clamp(ground.x, -5.4, 5.4);
        this.aerial.z = clamp(ground.z, -6.5, 6.5);
        this.aerial.capture = { x: this.aerial.x, z: this.aerial.z, born: time };
      } else if (this.mode === 'robotics') {
        this.robot.planStartX = this.robot.x;
        this.robot.planStartZ = this.robot.z;
        this.robot.goalX = clamp(ground.x, -.92, .92);
        this.robot.goalZ = clamp(ground.z, -6.5, 6.5);
        this.robot.goalBorn = time;
      }
    }

    normalize(vector) {
      const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
      return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
    }

    cross(a, b) {
      return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
      };
    }

    cameraFor(time) {
      const idleX = .64 + Math.sin(time * .000085) * .085;
      const idleY = .47 + Math.cos(time * .000071) * .055;
      const targetX = this.pointer.active ? this.pointer.x : idleX;
      const targetY = this.pointer.active ? this.pointer.y : idleY;
      const ease = reducedMotion ? 1 : .055;
      this.pointer.smoothX += (targetX - this.pointer.smoothX) * ease;
      this.pointer.smoothY += (targetY - this.pointer.smoothY) * ease;

      const pointerYaw = (this.pointer.smoothX - .57) * 1.28;
      const pointerPitch = (this.pointer.smoothY - .47) * .92;
      let position = { x: 8.4 + pointerYaw * .72, y: 5.0 + pointerPitch * .42, z: 11.8 - pointerYaw * .28 };
      let target = { x: .1 - pointerYaw * .2, y: .78 - pointerPitch * .08, z: -.75 };
      let focal = Math.min(this.width, this.height) * 1.08;
      let centerX = this.scene === 'explorer' ? this.width * .66 : this.width * .58;
      let centerY = this.height * .52;

      if (this.mode === 'aerial') {
        position = { x: 1.7 + pointerYaw * .35, y: 17.4, z: 2.7 + pointerPitch * .18 };
        target = { x: 0, y: 0, z: -.35 };
        focal *= 1.03;
        centerX = this.scene === 'explorer' ? this.width * .64 : this.width * .57;
        centerY = this.height * .52;
      } else if (this.mode === 'panoramic') {
        position = { x: 6.9 + pointerYaw, y: 3.35 + pointerPitch * .45, z: 8.8 };
        target = { x: .05, y: 1.22, z: .2 };
        focal *= 1.12;
        centerX = this.scene === 'explorer' ? this.width * .68 : this.width * .59;
      } else if (this.mode === 'robotics') {
        position = { x: 4.8 + pointerYaw, y: 2.35 + pointerPitch * .25, z: 7.8 };
        target = { x: 0, y: .62, z: -2.25 };
        focal *= 1.14;
        centerX = this.scene === 'explorer' ? this.width * .66 : this.width * .58;
        centerY = this.height * .54;
      }

      if (this.mobile) {
        centerX = this.width * .5;
        centerY = this.height * .51;
        const focalScale = this.mode === 'panoramic' ? 1.12 : .73;
        const distanceScale = this.mode === 'panoramic' ? 1.02 : 1.08;
        focal *= focalScale;
        position.x *= distanceScale;
        position.z *= distanceScale;
      }

      if (!this.cameraRig) {
        this.cameraRig = {
          position: { ...position },
          target: { ...target },
          focal,
          centerX,
          centerY
        };
      } else {
        const rigEase = reducedMotion ? 1 : .085;
        ['x', 'y', 'z'].forEach((axis) => {
          this.cameraRig.position[axis] = mix(this.cameraRig.position[axis], position[axis], rigEase);
          this.cameraRig.target[axis] = mix(this.cameraRig.target[axis], target[axis], rigEase);
        });
        this.cameraRig.focal = mix(this.cameraRig.focal, focal, rigEase);
        this.cameraRig.centerX = mix(this.cameraRig.centerX, centerX, rigEase);
        this.cameraRig.centerY = mix(this.cameraRig.centerY, centerY, rigEase);
      }

      position = { ...this.cameraRig.position };
      target = { ...this.cameraRig.target };
      focal = this.cameraRig.focal;
      centerX = this.cameraRig.centerX;
      centerY = this.cameraRig.centerY;

      const forward = this.normalize({ x: target.x - position.x, y: target.y - position.y, z: target.z - position.z });
      const worldUp = { x: 0, y: 1, z: 0 };
      /* Correct right-handed camera basis: right = forward × worldUp; up = right × forward. */
      const right = this.normalize(this.cross(forward, worldUp));
      const up = this.normalize(this.cross(right, forward));
      this.camera = { position, forward, right, up, focal, centerX, centerY };
    }

    updateModeInteraction(time) {
      if (this.mode === 'aerial') {
        const ground = this.pointer.active
          ? this.groundPointAtScreen(this.pointer.x * this.width, this.pointer.y * this.height)
          : null;
        const targetX = ground ? clamp(ground.x, -5.4, 5.4) : Math.sin(time * .00019) * 3.8;
        const targetZ = ground ? clamp(ground.z, -6.5, 6.5) : Math.cos(time * .00016 + .7) * 4.8;
        const ease = reducedMotion ? 1 : (this.pointer.active ? .28 : .045);
        this.aerial.x += (targetX - this.aerial.x) * ease;
        this.aerial.z += (targetZ - this.aerial.z) * ease;
        this.swathZ = this.aerial.z;
      } else if (this.mode === 'panoramic') {
        const targetYaw = this.pointer.active
          ? (this.pointer.x - .5) * Math.PI * 1.6
          : Math.sin(time * .00014) * 1.25;
        const targetPitch = this.pointer.active
          ? clamp((.5 - this.pointer.y) * 1.3, -.62, .62)
          : Math.sin(time * .00011 + 1.1) * .24;
        const ease = reducedMotion ? 1 : (this.pointer.active ? .22 : .045);
        this.panorama.yaw += (targetYaw - this.panorama.yaw) * ease;
        this.panorama.pitch += (targetPitch - this.panorama.pitch) * ease;
      } else if (this.mode === 'robotics') {
        const dx = this.robot.goalX - this.robot.x;
        const dz = this.robot.goalZ - this.robot.z;
        const distance = Math.hypot(dx, dz);
        if (distance > .02) {
          const step = reducedMotion ? distance : Math.min(.105, distance);
          this.robot.x += dx / distance * step;
          this.robot.z += dz / distance * step;
        }
      }
    }

    project(point) {
      const relative = {
        x: point.x - this.camera.position.x,
        y: point.y - this.camera.position.y,
        z: point.z - this.camera.position.z
      };
      const x = relative.x * this.camera.right.x + relative.y * this.camera.right.y + relative.z * this.camera.right.z;
      const y = relative.x * this.camera.up.x + relative.y * this.camera.up.y + relative.z * this.camera.up.z;
      const depth = relative.x * this.camera.forward.x + relative.y * this.camera.forward.y + relative.z * this.camera.forward.z;
      if (depth < 1.1) return null;
      const scale = this.camera.focal / depth;
      return { x: this.camera.centerX + x * scale, y: this.camera.centerY - y * scale, depth, scale };
    }

    drawBackground(time) {
      const context = this.context;
      const gradient = context.createLinearGradient(0, 0, this.width, this.height);
      gradient.addColorStop(0, '#06080c');
      gradient.addColorStop(.54, this.scene === 'explorer' ? '#07111a' : '#081019');
      gradient.addColorStop(1, '#030609');
      context.fillStyle = gradient;
      context.fillRect(0, 0, this.width, this.height);

      const glow = context.createRadialGradient(this.width * .68, this.height * .43, 20, this.width * .68, this.height * .5, Math.max(this.width, this.height) * .62);
      glow.addColorStop(0, 'rgba(72,126,177,.14)');
      glow.addColorStop(.48, 'rgba(35,69,101,.05)');
      glow.addColorStop(1, 'rgba(3,6,9,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, this.width, this.height);

      context.save();
      context.fillStyle = '#a8cae7';
      this.stars.forEach((star, index) => {
        context.globalAlpha = star.alpha;
        const drift = reducedMotion ? 0 : Math.sin(time * .00016 + index) * 1.4;
        context.fillRect(star.x * this.width + drift, star.y * this.height, star.size, star.size);
      });
      context.restore();
    }

    updateProbe(time) {
      const minDimension = Math.min(this.width, this.height);
      const idleX = .64 + Math.sin(time * .00017) * .13;
      const idleY = .47 + Math.cos(time * .00013 + .8) * .12;
      const normalizedX = this.pointer.active ? this.pointer.x : idleX;
      const normalizedY = this.pointer.active ? this.pointer.y : idleY;
      const targetX = normalizedX * this.width;
      const targetY = normalizedY * this.height;
      const ease = reducedMotion ? 1 : (this.pointer.active ? .44 : .055);

      if (!this.probe.x || !this.probe.y) {
        this.probe.x = targetX;
        this.probe.y = targetY;
      } else {
        this.probe.x += (targetX - this.probe.x) * ease;
        this.probe.y += (targetY - this.probe.y) * ease;
      }

      const normalRadius = clamp(minDimension * (this.scene === 'explorer' ? .165 : .145), 76, 132);
      this.probe.targetRadius = this.pointer.down ? Math.min(normalRadius * 1.58, 198) : normalRadius;
      this.probe.radius += (this.probe.targetRadius - this.probe.radius) * (reducedMotion ? 1 : .1);
      this.probe.pulses = this.probe.pulses.filter((pulse) => time - pulse.born < 1150);
    }

    semanticAmount(point, projection, time) {
      if (this.mode === 'aerial') {
        const footprintDistance = Math.max(
          Math.abs(point.x - this.aerial.x) / 2.45,
          Math.abs(point.z - this.aerial.z) / 1.28
        );
        return .045 + .955 * (1 - smoothstep(.74, 1, footprintDistance));
      }
      if (this.mode === 'panoramic') return point.kind === 'road' ? .18 : .34;
      if (this.mode === 'robotics') {
        const corridor = 1 - smoothstep(1.2, 3.3, Math.abs(point.x));
        return .22 + corridor * .5;
      }

      const distance = Math.hypot(projection.x - this.probe.x, projection.y - this.probe.y);
      let amount = .018 + .982 * (1 - smoothstep(this.probe.radius * .56, this.probe.radius, distance));

      this.probe.pulses.forEach((pulse) => {
        const progress = clamp((time - pulse.born) / 1150, 0, 1);
        const pulseX = pulse.x * this.width;
        const pulseY = pulse.y * this.height;
        const pulseDistance = Math.hypot(projection.x - pulseX, projection.y - pulseY);
        const waveRadius = mix(this.probe.radius * .45, this.probe.radius * 2.25, progress);
        const wave = 1 - smoothstep(10, 34, Math.abs(pulseDistance - waveRadius));
        amount = Math.max(amount, wave * (1 - progress) * .82);
      });

      return clamp(amount, .018, 1);
    }

    drawPoints(time) {
      const context = this.context;
      const projected = [];
      const semanticBuckets = new Map(Object.keys(this.semanticColors).map((kind) => [kind, []]));
      const probeScores = new Map(Object.keys(this.semanticColors).map((kind) => [kind, { score: 0, item: null, distance: Infinity }]));
      const scoreWeight = { ground: .14, road: .3, marking: .58, building: 1, vegetation: 1.08, street: .68, vehicle: 1.42, water: .9 };

      for (let index = 0; index < this.points.length; index += 1) {
        const point = this.points[index];
        const projection = this.project(point);
        if (!projection || projection.x < -24 || projection.x > this.width + 24 || projection.y < -24 || projection.y > this.height + 24) continue;
        const farFade = clamp(1 - (projection.depth - 11) / 16, .32, 1);
        const size = clamp(point.size * projection.scale * .015, .58, this.mobile ? 1.75 : 2.25);
        const semantic = this.semanticAmount(point, projection, time);
        const item = { point, projection, farFade, size, semantic };
        projected.push(item);
        semanticBuckets.get(point.kind)?.push(item);
        if (this.mode === 'pointcloud') {
          const distance = Math.hypot(projection.x - this.probe.x, projection.y - this.probe.y);
          if (distance < this.probe.radius * .78) {
            const score = (1 - distance / (this.probe.radius * .78)) * (scoreWeight[point.kind] || .5);
            const bucket = probeScores.get(point.kind);
            bucket.score += score;
            if (distance < bucket.distance) {
              bucket.distance = distance;
              bucket.item = item;
            }
          }
        }
      }

      if (this.mode === 'pointcloud') {
        const ranked = [...probeScores.entries()]
          .filter(([, value]) => value.item)
          .sort((a, b) => b[1].score - a[1].score);
        this.probe.focus = ranked[0] ? { kind: ranked[0][0], item: ranked[0][1].item } : null;
      }

      context.save();
      context.fillStyle = '#8299b0';
      context.globalAlpha = this.mode === 'panoramic' ? .24 : .38;
      projected.forEach(({ point, projection, farFade, size }) => {
        context.globalAlpha = point.alpha * farFade * (this.mode === 'panoramic' ? .36 : .58);
        context.fillRect(projection.x, projection.y, size, size);
      });

      semanticBuckets.forEach((items, kind) => {
        context.fillStyle = this.semanticColors[kind];
        items.forEach(({ point, projection, farFade, size, semantic }) => {
          if (semantic < .07) return;
          context.globalAlpha = clamp(point.alpha * farFade * semantic * .92, .03, .86);
          const semanticSize = size * (1 + semantic * .16);
          context.fillRect(projection.x - semanticSize * .08, projection.y - semanticSize * .08, semanticSize, semanticSize);
        });
      });
      context.restore();
    }

    worldCurve(points, style, width = 1, dash = []) {
      const context = this.context;
      context.save();
      context.strokeStyle = style;
      context.lineWidth = width;
      context.setLineDash(dash);
      context.beginPath();
      let started = false;
      points.forEach((point) => {
        const projected = this.project(point);
        if (!projected) return;
        if (!started) {
          context.moveTo(projected.x, projected.y);
          started = true;
        } else {
          context.lineTo(projected.x, projected.y);
        }
      });
      if (started) context.stroke();
      context.restore();
    }

    drawAerialOverlay(time) {
      if (this.mode !== 'aerial') return;
      const context = this.context;
      const halfX = 2.45;
      const halfZ = 1.28;
      const xStops = [0, .25, .5, .75, 1].map((amount) => this.aerial.x - halfX + halfX * 2 * amount);
      const bandColors = [
        'rgba(104,174,230,.085)',
        'rgba(114,222,178,.068)',
        'rgba(190,160,229,.074)',
        'rgba(239,158,121,.06)'
      ];
      for (let index = 0; index < xStops.length - 1; index += 1) {
        const corners = [
          { x: xStops[index], y: .09, z: this.aerial.z - halfZ },
          { x: xStops[index + 1], y: .09, z: this.aerial.z - halfZ },
          { x: xStops[index + 1], y: .09, z: this.aerial.z + halfZ },
          { x: xStops[index], y: .09, z: this.aerial.z + halfZ }
        ].map((corner) => this.project(corner));
        if (corners.some((corner) => !corner)) continue;
        context.save();
        context.beginPath();
        corners.forEach((corner, cornerIndex) => cornerIndex ? context.lineTo(corner.x, corner.y) : context.moveTo(corner.x, corner.y));
        context.closePath();
        context.fillStyle = bandColors[index];
        context.fill();
        context.restore();
      }

      const outline = [
        { x: this.aerial.x - halfX, y: .1, z: this.aerial.z - halfZ },
        { x: this.aerial.x + halfX, y: .1, z: this.aerial.z - halfZ },
        { x: this.aerial.x + halfX, y: .1, z: this.aerial.z + halfZ },
        { x: this.aerial.x - halfX, y: .1, z: this.aerial.z + halfZ },
        { x: this.aerial.x - halfX, y: .1, z: this.aerial.z - halfZ }
      ];
      this.worldCurve(outline, 'rgba(156,231,239,.62)', 1, [4, 5]);

      const centerPoint = this.project({ x: this.aerial.x, y: .13, z: this.aerial.z });
      if (centerPoint) {
        context.save();
        context.strokeStyle = 'rgba(156,231,239,.82)';
        context.lineWidth = .8;
        context.beginPath();
        context.moveTo(centerPoint.x - 8, centerPoint.y); context.lineTo(centerPoint.x - 3, centerPoint.y);
        context.moveTo(centerPoint.x + 3, centerPoint.y); context.lineTo(centerPoint.x + 8, centerPoint.y);
        context.moveTo(centerPoint.x, centerPoint.y - 8); context.lineTo(centerPoint.x, centerPoint.y - 3);
        context.moveTo(centerPoint.x, centerPoint.y + 3); context.lineTo(centerPoint.x, centerPoint.y + 8);
        context.stroke();
        context.restore();
      }

      const labelPoint = this.project({ x: this.aerial.x + halfX, y: .12, z: this.aerial.z + halfZ });
      if (labelPoint) {
        context.save();
        context.fillStyle = 'rgba(202,233,239,.78)';
        context.font = '7px "DM Mono", monospace';
        context.fillText('OBSERVATION FOOTPRINT · RGB / NIR', labelPoint.x - 178, labelPoint.y - 8);
        context.restore();
      }

      if (this.aerial.capture) {
        const progress = reducedMotion ? 0 : clamp((time - this.aerial.capture.born) / 950, 0, 1);
        if (reducedMotion || progress < 1) {
          const expansion = 1 + progress * .22;
          const alpha = reducedMotion ? .68 : (1 - progress) * .78;
          const captureOutline = [
            { x: this.aerial.capture.x - halfX * expansion, y: .14, z: this.aerial.capture.z - halfZ * expansion },
            { x: this.aerial.capture.x + halfX * expansion, y: .14, z: this.aerial.capture.z - halfZ * expansion },
            { x: this.aerial.capture.x + halfX * expansion, y: .14, z: this.aerial.capture.z + halfZ * expansion },
            { x: this.aerial.capture.x - halfX * expansion, y: .14, z: this.aerial.capture.z + halfZ * expansion },
            { x: this.aerial.capture.x - halfX * expansion, y: .14, z: this.aerial.capture.z - halfZ * expansion }
          ];
          this.worldCurve(captureOutline, `rgba(216,244,247,${alpha})`, 1.15);
        }
      }
    }

    drawPanoramicOverlay(time) {
      if (this.mode !== 'panoramic') return;
      const context = this.context;
      const center = { x: 0, y: 1.54, z: .3 };
      const radius = 1.48;
      const longitudes = 10;
      for (let longitude = 0; longitude < longitudes; longitude += 1) {
        const theta = longitude / longitudes * Math.PI;
        const curve = [];
        for (let step = 0; step <= 54; step += 1) {
          const phi = step / 54 * Math.PI;
          curve.push({
            x: center.x + Math.sin(phi) * Math.cos(theta) * radius,
            y: center.y + Math.cos(phi) * radius,
            z: center.z + Math.sin(phi) * Math.sin(theta) * radius
          });
        }
        this.worldCurve(curve, longitude % 5 === 0 ? 'rgba(156,231,239,.52)' : 'rgba(156,231,239,.22)', longitude % 5 === 0 ? 1.05 : .6);
      }
      [-60,-30,0,30,60].forEach((latitude) => {
        const phi = (90 - latitude) / 180 * Math.PI;
        const curve = [];
        for (let step = 0; step <= 80; step += 1) {
          const theta = step / 80 * Math.PI * 2;
          curve.push({
            x: center.x + Math.sin(phi) * Math.cos(theta) * radius,
            y: center.y + Math.cos(phi) * radius,
            z: center.z + Math.sin(phi) * Math.sin(theta) * radius
          });
        }
        this.worldCurve(curve, latitude === 0 ? 'rgba(182,161,229,.62)' : 'rgba(182,161,229,.24)', latitude === 0 ? 1.05 : .6);
      });

      const activeLongitude = [];
      for (let step = 0; step <= 90; step += 1) {
        const phi = step / 90 * Math.PI * 2;
        activeLongitude.push({
          x: center.x + Math.sin(phi) * Math.cos(this.panorama.yaw) * radius,
          y: center.y + Math.cos(phi) * radius,
          z: center.z + Math.sin(phi) * Math.sin(this.panorama.yaw) * radius
        });
      }
      this.worldCurve(activeLongitude, 'rgba(156,231,239,.82)', 1.15);

      const activeLatitude = [];
      const latitudeRadius = Math.cos(this.panorama.pitch) * radius;
      const latitudeY = center.y + Math.sin(this.panorama.pitch) * radius;
      for (let step = 0; step <= 90; step += 1) {
        const theta = step / 90 * Math.PI * 2;
        activeLatitude.push({
          x: center.x + Math.cos(theta) * latitudeRadius,
          y: latitudeY,
          z: center.z + Math.sin(theta) * latitudeRadius
        });
      }
      this.worldCurve(activeLatitude, 'rgba(114,223,178,.7)', 1);

      const gazePoint = {
        x: center.x + Math.cos(this.panorama.pitch) * Math.cos(this.panorama.yaw) * radius,
        y: center.y + Math.sin(this.panorama.pitch) * radius,
        z: center.z + Math.cos(this.panorama.pitch) * Math.sin(this.panorama.yaw) * radius
      };
      const gaze = this.project(gazePoint);
      if (gaze) {
        const yawDegrees = Math.round(this.panorama.yaw * 180 / Math.PI);
        const pitchDegrees = Math.round(this.panorama.pitch * 180 / Math.PI);
        context.save();
        context.strokeStyle = 'rgba(221,248,242,.9)';
        context.lineWidth = 1;
        context.beginPath();
        context.arc(gaze.x, gaze.y, 5, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = 'rgba(221,248,242,.95)';
        context.fillRect(gaze.x - 1, gaze.y - 1, 2, 2);
        context.font = '7px "DM Mono", monospace';
        context.fillText(`GAZE · ${yawDegrees >= 0 ? '+' : ''}${yawDegrees}° / ${pitchDegrees >= 0 ? '+' : ''}${pitchDegrees}°`, gaze.x + 11, gaze.y - 8);

        const pulseProgress = reducedMotion
          ? (Number.isFinite(this.panorama.pulseBorn) ? 0 : 1)
          : clamp((time - this.panorama.pulseBorn) / 900, 0, 1);
        if (pulseProgress < 1) {
          context.globalAlpha = reducedMotion ? .7 : 1 - pulseProgress;
          context.strokeStyle = 'rgba(156,231,239,.8)';
          context.beginPath();
          context.arc(gaze.x, gaze.y, 8 + pulseProgress * 42, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }

      const origin = this.project(center);
      if (origin) {
        const south = this.project({ x: center.x, y: center.y - radius, z: center.z });
        context.save();
        context.fillStyle = 'rgba(212,235,240,.78)';
        context.font = '7px "DM Mono", monospace';
        context.fillText('360° SPHERICAL FIELD · LAT / LON', origin.x - 78, (south?.y || origin.y + 90) + 14);
        context.globalAlpha = .75;
        context.fillRect(origin.x - 2, origin.y - 2, 4, 4);
        context.restore();
      }
    }

    drawProjectedBox(center, size, label, color) {
      const x0 = center.x - size.x / 2;
      const x1 = center.x + size.x / 2;
      const y0 = center.y;
      const y1 = center.y + size.y;
      const z0 = center.z - size.z / 2;
      const z1 = center.z + size.z / 2;
      const corners = [
        {x:x0,y:y0,z:z0},{x:x1,y:y0,z:z0},{x:x1,y:y1,z:z0},{x:x0,y:y1,z:z0},
        {x:x0,y:y0,z:z1},{x:x1,y:y0,z:z1},{x:x1,y:y1,z:z1},{x:x0,y:y1,z:z1}
      ].map((point) => this.project(point));
      if (corners.some((corner) => !corner)) return;
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      const context = this.context;
      context.save();
      context.strokeStyle = color;
      context.lineWidth = .8;
      context.beginPath();
      edges.forEach(([a,b]) => { context.moveTo(corners[a].x,corners[a].y); context.lineTo(corners[b].x,corners[b].y); });
      context.stroke();
      context.fillStyle = color;
      context.font = '7px "DM Mono", monospace';
      context.fillText(label, corners[2].x + 7, corners[2].y - 4);
      context.restore();
    }

    drawRoboticsOverlay(time) {
      if (this.mode !== 'robotics') return;
      const context = this.context;
      const path = [];
      for (let index = 0; index <= 48; index += 1) {
        const progress = index / 48;
        const z = mix(this.robot.planStartZ, this.robot.goalZ, progress);
        const x = mix(this.robot.planStartX, this.robot.goalX, progress) + Math.sin(progress * Math.PI) * .08;
        path.push({ x, y: this.terrainHeight(x, z) + .055, z });
      }
      this.worldCurve(path, 'rgba(114,223,178,.7)', 1.3, [5,7]);

      const agent = this.project({ x: this.robot.x, y: this.terrainHeight(this.robot.x, this.robot.z) + .11, z: this.robot.z });
      if (agent) {
        context.save();
        context.translate(agent.x, agent.y);
        context.strokeStyle = 'rgba(222,244,238,.92)';
        context.lineWidth = 1;
        context.strokeRect(-5,-3,10,6);
        context.beginPath();
        context.moveTo(-3,3); context.lineTo(-3,6);
        context.moveTo(3,3); context.lineTo(3,6);
        context.stroke();
        context.fillStyle = 'rgba(187,237,218,.86)';
        context.font = '7px "DM Mono", monospace';
        context.fillText('GROUND AGENT', 10, 1);
        context.restore();
      }

      const pathMidX = mix(this.robot.planStartX, this.robot.goalX, .55) + .08;
      const pathMidZ = mix(this.robot.planStartZ, this.robot.goalZ, .55);
      const pathLabel = this.project({ x: pathMidX, y: .08, z: pathMidZ });
      if (pathLabel) {
        context.save();
        context.fillStyle = 'rgba(177,225,211,.72)';
        context.font = '7px "DM Mono", monospace';
        context.fillText('PLANNED PATH', pathLabel.x + 8, pathLabel.y - 4);
        context.restore();
      }

      const goal = this.project({ x: this.robot.goalX, y: this.terrainHeight(this.robot.goalX, this.robot.goalZ) + .09, z: this.robot.goalZ });
      if (goal) {
        const goalProgress = clamp((time - this.robot.goalBorn) / 1100, 0, 1);
        context.save();
        context.strokeStyle = 'rgba(114,223,178,.9)';
        context.lineWidth = 1;
        context.beginPath();
        context.arc(goal.x, goal.y, 6, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = 'rgba(187,237,218,.9)';
        context.font = '7px "DM Mono", monospace';
        context.fillText('NAV GOAL', goal.x + 10, goal.y - 6);
        if (goalProgress < 1) {
          context.globalAlpha = 1 - goalProgress;
          context.beginPath();
          context.arc(goal.x, goal.y, 9 + goalProgress * 35, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }

      if (this.pointer.active) {
        const previewGround = this.groundPointAtScreen(this.pointer.x * this.width, this.pointer.y * this.height);
        if (previewGround) {
          const previewX = clamp(previewGround.x, -.92, .92);
          const previewZ = clamp(previewGround.z, -6.5, 6.5);
          const overlapsCommittedGoal = Math.hypot(previewX - this.robot.goalX, previewZ - this.robot.goalZ) < .28;
          const preview = this.project({ x: previewX, y: this.terrainHeight(previewX, previewZ) + .12, z: previewZ });
          if (preview && !overlapsCommittedGoal) {
            context.save();
            context.setLineDash([3, 4]);
            context.strokeStyle = 'rgba(216,244,247,.7)';
            context.beginPath();
            context.arc(preview.x, preview.y, 9, 0, Math.PI * 2);
            context.stroke();
            context.setLineDash([]);
            context.fillStyle = 'rgba(207,230,234,.72)';
            context.font = '7px "DM Mono", monospace';
            context.fillText('CLICK TO SET GOAL', preview.x + 14, preview.y + 3);
            context.restore();
          }
        }
      }

      this.drawProjectedBox({ x: -.66, y: .045, z: -3.25 }, { x: .52, y: .43, z: .93 }, 'VEHICLE', 'rgba(239,158,121,.72)');
      this.drawProjectedBox({ x: 1.84, y: .03, z: -2.15 }, { x: .54, y: .92, z: .54 }, 'VEGETATION', 'rgba(114,223,178,.48)');
    }

    drawSemanticProbe(time) {
      if (this.mode !== 'pointcloud') return;
      const context = this.context;
      const x = this.probe.x;
      const y = this.probe.y;
      const radius = this.probe.radius;
      const focusKind = this.probe.focus?.kind || 'building';
      const color = this.semanticColors[focusKind] || '#9ce7ef';

      context.save();
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 1.12);
      gradient.addColorStop(0, `${color}12`);
      gradient.addColorStop(.62, `${color}08`);
      gradient.addColorStop(1, `${color}00`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius * 1.12, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = `${color}86`;
      context.lineWidth = .85;
      const rotation = reducedMotion ? 0 : time * .00018;
      [[-.12, .18], [.42, .14], [.92, .16], [1.42, .13]].forEach(([start, length]) => {
        context.beginPath();
        context.arc(x, y, radius, rotation + start * Math.PI, rotation + (start + length) * Math.PI);
        context.stroke();
      });

      context.strokeStyle = `${color}b8`;
      context.lineWidth = 1;
      const tickInner = 7;
      const tickOuter = 13;
      context.beginPath();
      context.moveTo(x - tickOuter, y); context.lineTo(x - tickInner, y);
      context.moveTo(x + tickInner, y); context.lineTo(x + tickOuter, y);
      context.moveTo(x, y - tickOuter); context.lineTo(x, y - tickInner);
      context.moveTo(x, y + tickInner); context.lineTo(x, y + tickOuter);
      context.stroke();
      context.fillStyle = `${color}e6`;
      context.fillRect(x - 1, y - 1, 2, 2);

      this.probe.pulses.forEach((pulse) => {
        const progress = clamp((time - pulse.born) / 1150, 0, 1);
        const waveRadius = mix(radius * .45, radius * 2.25, progress);
        context.globalAlpha = (1 - progress) * .58;
        context.strokeStyle = color;
        context.lineWidth = .8;
        context.beginPath();
        context.arc(pulse.x * this.width, pulse.y * this.height, waveRadius, 0, Math.PI * 2);
        context.stroke();
      });

      context.globalAlpha = 1;
      if (!this.mobile && this.probe.focus) {
        const labels = this.semanticLabels[focusKind] || [focusKind.toUpperCase(), 'semantic class'];
        const labelWidth = 142;
        const labelHeight = 38;
        const labelX = clamp(x + radius * .68, 12, this.width - labelWidth - 12);
        const labelY = clamp(y - radius * .62, 70, this.height - labelHeight - 42);
        context.strokeStyle = `${color}58`;
        context.beginPath();
        context.moveTo(x + radius * .48, y - radius * .34);
        context.lineTo(labelX - 6, labelY + labelHeight * .5);
        context.stroke();
        context.fillStyle = 'rgba(5,10,15,.78)';
        context.strokeStyle = `${color}52`;
        context.lineWidth = .7;
        context.beginPath();
        context.roundRect(labelX, labelY, labelWidth, labelHeight, 9);
        context.fill();
        context.stroke();
        context.fillStyle = color;
        context.font = '8px "DM Mono", monospace';
        context.fillText(labels[0], labelX + 12, labelY + 15);
        context.fillStyle = 'rgba(188,204,218,.68)';
        context.font = '7px "DM Mono", monospace';
        context.fillText(labels[1].toUpperCase(), labelX + 12, labelY + 28);
      }
      context.restore();
    }

    drawFog() {
      const context = this.context;
      const fog = context.createLinearGradient(0, 0, 0, this.height);
      fog.addColorStop(0, 'rgba(3,6,9,0)');
      fog.addColorStop(.76, 'rgba(3,6,9,.015)');
      fog.addColorStop(1, 'rgba(3,6,9,.66)');
      context.fillStyle = fog;
      context.fillRect(0, 0, this.width, this.height);
    }

    draw(time = 0, force = false) {
      this.frame = 0;
      if (!force && (!this.visible || !this.documentVisible)) return;
      if (!force && time - this.lastTime < 30) {
        this.frame = requestAnimationFrame((next) => this.draw(next));
        return;
      }
      this.lastTime = time;
      this.cameraFor(time);
      this.updateModeInteraction(time);
      this.updateProbe(time);
      this.drawBackground(time);
      this.drawPoints(time);
      this.drawAerialOverlay(time);
      this.drawPanoramicOverlay(time);
      this.drawRoboticsOverlay(time);
      this.drawFog();
      this.drawSemanticProbe(time);
      if (!reducedMotion && this.visible && this.documentVisible) {
        this.frame = requestAnimationFrame((next) => this.draw(next));
      }
    }
  }

  window.SpatialWorld = SpatialWorld;
  document.querySelectorAll('[data-spatial-world]').forEach((canvas) => {
    const world = new SpatialWorld(canvas);
    canvas.spatialWorld = world;
  });
})();
