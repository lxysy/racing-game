import * as THREE from 'three';

export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
  }

  update(dt, car) {
    const carPos = car.getPosition();
    const forward = car.getForward();
    const speedRatio = car.getSpeedRatio();

    // Offset behind and above the car
    const behind = -6 - speedRatio * 4;
    const above = 3 + speedRatio * 1.5;

    // Desired camera position
    const desiredPos = carPos.clone()
      .addScaledVector(forward, behind)
      .add(new THREE.Vector3(0, above, 0));

    // Look at point slightly ahead of the car
    const lookAhead = carPos.clone().addScaledVector(forward, 8);

    // Smooth lerp
    const lerpFactor = 1 - Math.exp(-4 * dt);
    this.target.lerp(desiredPos, lerpFactor);
    this.lookTarget.lerp(lookAhead, lerpFactor * 1.5);

    this.camera.position.copy(this.target);
    this.camera.lookAt(this.lookTarget);
  }
}
