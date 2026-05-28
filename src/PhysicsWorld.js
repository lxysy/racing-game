import * as RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  constructor() {
    this.world = null;
  }

  init() {
    this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  }

  createVehicleController(chassis) {
    return this.world.createVehicleController(chassis);
  }

  addTerrainCollider(geometry) {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    const groundBody = this.world.createRigidBody(bodyDesc);

    const pos = geometry.attributes.position;
    const vertices = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      vertices[i * 3] = pos.getX(i);
      vertices[i * 3 + 1] = pos.getY(i);
      vertices[i * 3 + 2] = pos.getZ(i);
    }

    const index = geometry.index;
    const indices = new Uint32Array(index.count);
    for (let i = 0; i < index.count; i++) {
      indices[i] = index.getX(i);
    }

    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(0.8);
    this.world.createCollider(colliderDesc, groundBody);
  }

  step(dt) {
    this.world.timestep = dt;
    this.world.step();
  }
}
