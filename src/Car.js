import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Car {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.group = new THREE.Group();

    this.chassisBody = null;
    this.vehicle = null;

    // Wheel meshes (for rotation animation)
    this.wheelNodes = [];
    this.wheelRadius = 0.18;

    // Tuning
    this.maxEngineForce = 350;
    this.maxBrakeForce = 50;
    this.maxSteerAngle = 0.5;
    this.topSpeed = 55; // m/s (~200 km/h)
  }

  async load() {
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load('/low_poly_car/scene.gltf', (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.01, 0.01, 0.01);

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

    // Chassis rigid body — medium weight for feel
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 2.0, 0)
      .setLinearDamping(0.3)
      .setAngularDamping(1.5)
      .setCanSleep(false);
    this.chassisBody = world.createRigidBody(bodyDesc);

    // Chassis collider
    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.9, 0.2, 2.1)
      .setDensity(25.0)
      .setFriction(0.4);
    world.createCollider(colliderDesc, this.chassisBody);

    // Vehicle controller via world
    this.vehicle = this.physicsWorld.createVehicleController(this.chassisBody);
    this.vehicle.setIndexForwardAxis = 2;
    this.vehicle.indexUpAxis = 1;

    // 4 wheels
    const w = 0.65;
    const fz = 0.85;
    const rz = -0.85;

    const wheelConfigs = [
      { x: -w, y: -0.15, z: fz }, // FL
      { x:  w, y: -0.15, z: fz }, // FR
      { x: -w, y: -0.15, z: rz }, // RL
      { x:  w, y: -0.15, z: rz }, // RR
    ];

    for (const cfg of wheelConfigs) {
      this.vehicle.addWheel(
        cfg,
        { x: 0, y: -1, z: 0 },
        { x: -1, y: 0, z: 0 },
        0.35,
        this.wheelRadius,
      );
    }

    // Suspension
    for (let i = 0; i < 4; i++) {
      this.vehicle.setWheelSuspensionStiffness(i, 60.0);
      this.vehicle.setWheelSuspensionCompression(i, 8.0);
      this.vehicle.setWheelSuspensionRelaxation(i, 8.0);
      this.vehicle.setWheelMaxSuspensionTravel(i, 0.25);
      this.vehicle.setWheelMaxSuspensionForce(i, 20000.0);
      this.vehicle.setWheelFrictionSlip(i, 6.0);
      this.vehicle.setWheelSideFrictionStiffness(i, 1.5);
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

    this.group.position.set(position.x, position.y + 0.6, position.z);
    this.group.quaternion.copy(q);
  }

  update(dt, input) {
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);

    // Steering (front wheels: 0=FL, 1=FR)
    this.vehicle.setWheelSteering(0, steer * this.maxSteerAngle);
    this.vehicle.setWheelSteering(1, steer * this.maxSteerAngle);

    // Rear wheels (2, 3) always straight
    this.vehicle.setWheelSteering(2, 0);
    this.vehicle.setWheelSteering(3, 0);

    const absSpeed = Math.abs(this.vehicle.currentVehicleSpeed());

    // Torque curve: full power up to 30% top speed, then tapers
    const torqueRatio = 1.0 - Math.max(0, (absSpeed - this.topSpeed * 0.3) / (this.topSpeed * 0.7)) * 0.75;
    const effectiveForce = this.maxEngineForce * Math.max(torqueRatio, 0.25);

    for (let i = 0; i < 4; i++) {
      if (input.forward) {
        this.vehicle.setWheelEngineForce(i, effectiveForce);
        this.vehicle.setWheelBrake(i, 0.0);
      } else if (input.backward) {
        if (absSpeed > 0.5) {
          this.vehicle.setWheelEngineForce(i, 0.0);
          this.vehicle.setWheelBrake(i, this.maxBrakeForce);
        } else {
          this.vehicle.setWheelEngineForce(i, -this.maxEngineForce * 0.3);
          this.vehicle.setWheelBrake(i, 0.0);
        }
      } else {
        this.vehicle.setWheelEngineForce(i, 0.0);
        this.vehicle.setWheelBrake(i, 3.0);
      }
    }

    // Update vehicle first: applies wheel suspension + engine forces to chassis
    this.vehicle.updateVehicle(dt);

    // Then step the world to integrate forces
    this.physicsWorld.step(dt);

    // Sync Three.js
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
    return new THREE.Vector3(0, 0, 1)
      .applyQuaternion(new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w))
      .normalize();
  }

  getPosition() {
    const p = this.chassisBody.translation();
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  getSpeedRatio() {
    return Math.min(Math.abs(this.vehicle.currentVehicleSpeed()) / this.topSpeed, 1);
  }
}
