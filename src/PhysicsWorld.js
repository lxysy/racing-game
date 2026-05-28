import * as RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  constructor() {
    this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  }

  createVehicleController(chassis) {
    return this.world.createVehicleController(chassis);
  }

  addTerrainCollider(geometry) {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    const groundBody = this.world.createRigidBody(bodyDesc);

    const pos = geometry.attributes.position;
    const vertices = [];
    for (let i = 0; i < pos.count; i++) {
      vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }

    const index = geometry.index;
    const indices = [];
    for (let i = 0; i < index.count; i++) {
      indices.push(index.getX(i));
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
