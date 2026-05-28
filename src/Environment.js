import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class Environment {
  constructor(scene) {
    this.scene = scene;
  }

  create(trackCurve) {
    this._createSky();
    this._createLighting();
    this.terrainMesh = this._createTerrain(trackCurve);
    this._createTrees(trackCurve);
  }

  getTerrainGeometry() {
    return this.terrainMesh?.geometry;
  }

  _createSky() {
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 150, 400);
  }

  _createLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(100, 150, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);
  }

  _createTerrain(trackCurve) {
    const size = 300;
    const segments = 120;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    const noise2D = createNoise2D();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Terrain height from simplex noise
      let height = noise2D(x * 0.008, z * 0.008) * 8;
      height += noise2D(x * 0.02, z * 0.02) * 3;

      // Flatten track area
      if (trackCurve) {
        const nearestT = this._findNearestTrackT(trackCurve, x, z);
        if (nearestT !== null) {
          const trackPoint = trackCurve.getPointAt(nearestT);
          const dx = x - trackPoint.x;
          const dz = z - trackPoint.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < 20) {
            const t = dist / 20;
            const flatten = 1 - t; // linear falloff
            height *= (1 - flatten * flatten);
          }
        }
      }

      positions.setY(i, height);

      // Vertex color: green (low) to brown (high)
      const h = (height + 10) / 20; // normalize roughly 0-1
      const r = 0.2 + h * 0.4;
      const g = 0.5 + (1 - h) * 0.3;
      const b = 0.15;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    this.scene.add(terrain);
  }

  _findNearestTrackT(curve, x, z) {
    // Sample track at 200 points, find closest
    let bestDist = Infinity;
    let bestT = null;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const pt = curve.getPointAt(t);
      const dx = x - pt.x;
      const dz = z - pt.z;
      const dist = dx * dx + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        bestT = t;
      }
    }
    return bestT;
  }

  _createTrees(trackCurve) {
    const treeGroup = new THREE.Group();

    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 120;

      let x = Math.cos(theta) * radius;
      let z = Math.sin(theta) * radius;

      // Keep trees away from track
      if (trackCurve) {
        const nearestT = this._findNearestTrackT(trackCurve, x, z);
        if (nearestT !== null) {
          const trackPoint = trackCurve.getPointAt(nearestT);
          const dx = x - trackPoint.x;
          const dz = z - trackPoint.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 25) continue;
        }
      }

      const tree = this._createTreeMesh();
      tree.position.set(x, 0, z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      const scale = 0.6 + Math.random() * 1.2;
      tree.scale.set(scale, scale, scale);
      treeGroup.add(tree);
    }

    this.scene.add(treeGroup);
  }

  _createTreeMesh() {
    const group = new THREE.Group();

    const trunkH = 2 + Math.random() * 2;
    const trunkR = 0.15 + Math.random() * 0.15;

    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Canopy (2-3 layers)
    const layers = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < layers; i++) {
      const coneR = 1.2 + Math.random() * 0.6;
      const coneH = 1.5 + Math.random() * 1.5;
      const coneGeo = new THREE.ConeGeometry(coneR, coneH, 7);
      const green = 0.15 + Math.random() * 0.3;
      const coneMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(green * 0.5, green, green * 0.4),
        roughness: 0.8,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = trunkH + i * coneH * 0.6;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    }

    return group;
  }
}
