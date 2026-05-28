import * as THREE from 'three';
import { Car } from './Car.js';
import { Track } from './Track.js';
import { FollowCamera } from './FollowCamera.js';
import { Environment } from './Environment.js';
import { HUD } from './HUD.js';

// --- Scene setup ---
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 500);

// --- Input state ---
const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

// --- Game objects ---
const track = new Track(scene);
const car = new Car(scene);
const followCamera = new FollowCamera(camera);
const environment = new Environment(scene);
const hud = new HUD();

async function init() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app').appendChild(renderer.domElement);

  // Create track first (needed by environment)
  track.create();

  // Create environment
  environment.create(track.curve);

  // Load car model
  await car.load();

  // Set initial car position at track start
  const startData = track.getTrackData(0);
  car.position.copy(startData.point);
  car.yaw = Math.atan2(startData.tangent.x, startData.tangent.z);
  car.group.position.copy(car.position);
  car.group.rotation.y = car.yaw;

  // Initialize camera position
  const forward = car.getForward();
  const camPos = car.position.clone()
    .addScaledVector(forward, -8)
    .add(new THREE.Vector3(0, 5, 0));
  const lookPos = car.position.clone().addScaledVector(forward, 8);
  followCamera.target.copy(camPos);
  followCamera.lookTarget.copy(lookPos);
  camera.position.copy(camPos);
  camera.lookAt(lookPos);

  // Setup input
  setupInput();

  // Start game loop
  lastTime = performance.now();
  requestAnimationFrame(animate);
}

let lastTime = performance.now();

function animate(time) {
  requestAnimationFrame(animate);

  let dt = (time - lastTime) / 1000;
  if (dt <= 0) dt = 0.016;
  if (dt > 0.1) dt = 0.1;
  lastTime = time;

  car.update(dt, input);
  followCamera.update(dt, car);
  hud.update(car);

  renderer.render(scene, camera);
}

function setupInput() {
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = true; e.preventDefault(); break;
      case 'KeyS': case 'ArrowDown':  input.backward = true; e.preventDefault(); break;
      case 'KeyA': case 'ArrowLeft':  input.left = true; e.preventDefault(); break;
      case 'KeyD': case 'ArrowRight': input.right = true; e.preventDefault(); break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = false; break;
      case 'KeyS': case 'ArrowDown':  input.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  input.left = false; break;
      case 'KeyD': case 'ArrowRight': input.right = false; break;
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

init();
