import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Car {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Physics state
    this.speed = 0;
    this.maxSpeed = 50;
    this.accelForce = 22;
    this.brakeForce = 30;

    // Air resistance (quadratic drag) — makes high speed feel different
    this.dragCoeff = 0.001;
    // Rolling resistance — natural deceleration when coasting
    this.rollResistance = 1.5;

    this.yaw = 0; // rotation around Y axis, 0 = facing +Z
    this.position = new THREE.Vector3(0, 0, 0);

    // Wheel references (for rotation animation)
    this.wheelNodes = [];
    this.wheelRadius = 0.35;

    // Visual effects state
    this.currentLean = 0;
    this.currentPitch = 0;
    this.leanSpeed = 4;
    this.maxLean = 0.15;
  }

  async load() {
    const loader = new GLTFLoader();
    const url = '/low_poly_car/scene.gltf';

    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => {
        const model = gltf.scene;

        // Scale down — the model is in large units
        model.scale.set(0.01, 0.01, 0.01);
        // GLTF 内部变换已将车头朝向 +Z，无需额外旋转

        // Find wheel nodes by name and enable matrix auto-update
        model.traverse((node) => {
          if (node.isObject3D) {
            const name = node.name.toLowerCase();
            if (name.startsWith('wr') || name.startsWith('wf')) {
              // Decompose matrix so we can animate rotation
              node.matrixAutoUpdate = true;
              node.matrix.decompose(node.position, node.quaternion, node.scale);
              this.wheelNodes.push(node);
            }
          }
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        this.model = model;
        this.group.add(model);
        this.scene.add(this.group);
        resolve();
      }, undefined, reject);
    });
  }

  update(dt, input) {
    const prevSpeed = this.speed;

    // --- Engine torque curve ---
    let engineForce = 0;

    if (input.forward) {
      // Torque drops as speed increases (more realistic feel)
      const torqueFactor = 1 - (this.speed / this.maxSpeed) * 0.55;
      engineForce = this.accelForce * Math.max(torqueFactor, 0.15);
    }

    if (input.backward) {
      if (this.speed > 0) {
        // Braking
        engineForce = -this.brakeForce;
      } else {
        // Reverse
        const torqueFactor = 1 - (Math.abs(this.speed) / (this.maxSpeed * 0.3)) * 0.5;
        engineForce = -this.accelForce * 0.35 * Math.max(torqueFactor, 0.2);
      }
    }

    // Apply engine force
    this.speed += engineForce * dt;

    // --- Resistances ---
    const sign = this.speed > 0 ? 1 : -1;
    const absSpeed = Math.abs(this.speed);

    // Aerodynamic drag (quadratic — proportional to v²)
    const dragForce = this.dragCoeff * absSpeed * absSpeed;

    // Rolling resistance (linear — always opposes motion)
    const rollForce = this.rollResistance;

    // Coasting: if no pedal input, apply both drag + rolling resistance
    // If pedals are active, only apply drag (engine handles the rest)
    const coasting = !input.forward && !input.backward;
    if (coasting) {
      const totalResistance = Math.min(dragForce + rollForce, absSpeed / dt);
      this.speed -= sign * totalResistance * dt;
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    } else if (input.forward) {
      // Drag while accelerating (high speed feels different)
      this.speed -= sign * dragForce * dt;
    }

    // Clamp speed
    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    if (this.speed < -this.maxSpeed * 0.3) this.speed = -this.maxSpeed * 0.3;

    // --- Steering ---
    const speedFactor = Math.max(Math.min(absSpeed / 8, 1), 0.3);
    const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    let steerAmount = steerInput * 2.0 * dt * speedFactor * (this.speed < 0 ? -1 : 1);

    // Understeer at very high speed (less effective steering)
    const understeerFactor = 1 - (absSpeed / this.maxSpeed) * 0.35;
    steerAmount *= Math.max(understeerFactor, 0.45);

    this.yaw -= steerAmount;

    // --- Movement ---
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.position.addScaledVector(forward, this.speed * dt);

    // Update group transform
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;

    // --- Visual effects ---
    this._updateVisualEffects(dt, steerInput, prevSpeed);

    // --- Wheel rotation ---
    this._rotateWheels(dt);
  }

  _updateVisualEffects(dt, steerInput, prevSpeed) {
    // Body lean during turns
    // steerInput > 0 → car turns left → lean right (outward) → negative lean
    const speedFactor = Math.max(Math.min(Math.abs(this.speed) / 8, 1), 0.3);
    const targetLean = -steerInput * this.maxLean * speedFactor;
    this.currentLean += (targetLean - this.currentLean) * Math.min(1, this.leanSpeed * dt);

    // Nose dive/squat during braking/acceleration
    const accel = (this.speed - prevSpeed) / dt;
    // positive accel → squat (nose up) → negative pitch
    // negative accel (braking) → dive (nose down) → positive pitch
    const targetPitch = -accel * 0.002;
    this.currentPitch += (targetPitch - this.currentPitch) * Math.min(1, 5 * dt);

    // Apply to model (Euler XYZ order)
    this.model.rotation.set(this.currentPitch, 0, this.currentLean);
  }

  _rotateWheels(dt) {
    const rotationSpeed = this.speed * dt / this.wheelRadius;
    for (const wheel of this.wheelNodes) {
      wheel.rotation.x += rotationSpeed;
    }
  }

  getForward() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  getPosition() {
    return this.position.clone();
  }

  getSpeedRatio() {
    return Math.abs(this.speed) / this.maxSpeed;
  }
}
