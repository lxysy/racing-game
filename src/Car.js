import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Car {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.group = new THREE.Group();

    // Physics objects
    this.chassisBody = null;
    this.vehicle = null;
    this.wheelIndices = [];

    // Wheel meshes (for rotation animation)
    this.wheelNodes = [];
    this.wheelRadius = 0.18;

    // Tuning
    this.maxEngineForce = 800;
    this.maxBrakeForce = 50;
    this.maxSteerAngle = 0.55;
  }

  async load() {
    const loader = new GLTFLoader();
    const url = '/low_poly_car/scene.gltf';

    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.01, 0.01, 0.01);
        // GLTF internal transforms already face +Z

        // Find wheel nodes for animation
        model.traverse((node) => {
          if (node.isObject3D) {
            const name = node.name.toLowerCase();
            if (name.startsWith('wr') || name.startsWith('wf')) {
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

        this._initPhysics();

        resolve();
      }, undefined, reject);
    });
  }

  _initPhysics() {
    const world = this.physicsWorld.world;

    // Chassis rigid body
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0.5, 0)
      .setLinearDamping(0.05)
      .setAngularDamping(0.3);
    this.chassisBody = world.createRigidBody(bodyDesc);

    // Collider centered on chassis (box)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.7, 0.2, 1.0)
      .setDensity(1.5)
      .setFriction(0.3);
    world.createCollider(colliderDesc, this.chassisBody);

    // Vehicle controller with 4 wheels
    this.vehicle = new RAPIER.DynamicRayCastVehicleController(this.chassisBody);

    const wheelConfigs = [
      { connection: { x: -0.6, y: -0.15, z: 0.75 } },   // FL
      { connection: { x: 0.6, y: -0.15, z: 0.75 } },    // FR
      { connection: { x: -0.6, y: -0.15, z: -0.75 } },  // RL
      { connection: { x: 0.6, y: -0.15, z: -0.75 } },   // RR
    ];

    for (const cfg of wheelConfigs) {
      const idx = this.vehicle.addWheel(
        cfg.connection,
        { x: 0.0, y: -1.0, z: 0.0 },  // suspension direction (down)
        { x: -1.0, y: 0.0, z: 0.0 },  // axle direction
        0.35,                          // suspension rest length
        this.wheelRadius,
      );
      this.wheelIndices.push(idx);
    }

    // Suspension tuning (same for all 4 wheels)
    for (let i = 0; i < 4; i++) {
      this.vehicle.setWheelSuspensionStiffness(i, 35.0);
      this.vehicle.setWheelSuspensionCompression(i, 5.0);
      this.vehicle.setWheelSuspensionRelaxation(i, 5.0);
      this.vehicle.setWheelMaxSuspensionTravel(i, 0.3);
      this.vehicle.setWheelFrictionSlip(i, 10.5);
      this.vehicle.setWheelMaxSuspensionForce(i, 10000.0);
    }
  }

  setInitialTransform(position, yaw) {
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), yaw,
    );
    this.chassisBody.setTranslation(
      { x: position.x, y: position.y + 0.6, z: position.z }, true,
    );
    this.chassisBody.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);

    // Sync Three.js group
    this.group.position.set(position.x, position.y + 0.6, position.z);
    this.group.quaternion.copy(q);
  }

  update(dt, input) {
    const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);

    // Steering — only front wheels
    const targetSteer = steerInput * this.maxSteerAngle;
    this.vehicle.setWheelSteering(0, targetSteer);
    this.vehicle.setWheelSteering(1, targetSteer);

    // Engine / Brake
    if (input.forward) {
      for (let i = 0; i < 4; i++) {
        this.vehicle.setWheelEngineForce(i, this.maxEngineForce);
        this.vehicle.setWheelBrake(i, 0.0);
      }
    } else if (input.backward) {
      const speed = this.vehicle.currentVehicleSpeed();
      if (speed > 0.5) {
        // Brake
        for (let i = 0; i < 4; i++) {
          this.vehicle.setWheelEngineForce(i, 0.0);
          this.vehicle.setWheelBrake(i, this.maxBrakeForce);
        }
      } else {
        // Reverse
        for (let i = 0; i < 4; i++) {
          this.vehicle.setWheelEngineForce(i, -this.maxEngineForce * 0.3);
          this.vehicle.setWheelBrake(i, 0.0);
        }
      }
    } else {
      // Coast — light resistance
      for (let i = 0; i < 4; i++) {
        this.vehicle.setWheelEngineForce(i, 0.0);
        this.vehicle.setWheelBrake(i, 2.0);
      }
    }

    // Step physics
    this.physicsWorld.step(dt);

    // Sync Three.js from physics chassis
    this._syncTransform();

    // Spin wheels visually
    this._rotateWheels(dt);
  }

  _syncTransform() {
    const pos = this.chassisBody.translation();
    const rot = this.chassisBody.rotation();
    this.group.position.set(pos.x, pos.y, pos.z);
    this.group.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  }

  _rotateWheels(dt) {
    const speed = this.vehicle.currentVehicleSpeed();
    const spin = speed * dt / this.wheelRadius;
    for (const wheel of this.wheelNodes) {
      wheel.rotation.x += spin;
    }
  }

  getForward() {
    const rot = this.chassisBody.rotation();
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    return new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
  }

  getPosition() {
    const p = this.chassisBody.translation();
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  getSpeedRatio() {
    return Math.min(Math.abs(this.vehicle.currentVehicleSpeed()) / 50, 1);
  }
}
