import * as THREE from 'three';
import { ShotgunModel } from './shotgun_model.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 8, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);

// Create shotgun model
const shotgun = new ShotgunModel(scene);
shotgun.setPosition(0, 0, 0);
shotgun.setRotation(0, 0, 0);

// Floor for shadows
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a2a2a,
  metalness: 0.1,
  roughness: 0.8,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2;
floor.receiveShadow = true;
scene.add(floor);

// Animation loop
const clock = new THREE.Clock();
let fireQueued = false;

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // Gentle rotation for demo
  shotgun.getGroup().rotation.y = Math.sin(elapsed * 0.5) * 0.3;
  shotgun.getGroup().rotation.x = Math.cos(elapsed * 0.3) * 0.2;

  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    // Space to fire
    shotgun.firePump(0.4);
  }
  if (e.key === 'ArrowUp') {
    shotgun.aim(-0.1, 0);
  }
  if (e.key === 'ArrowDown') {
    shotgun.aim(0.1, 0);
  }
  if (e.key === 'ArrowLeft') {
    shotgun.aim(0, 0.1);
  }
  if (e.key === 'ArrowRight') {
    shotgun.aim(0, -0.1);
  }
});

// UI instructions
const instructions = document.createElement('div');
instructions.style.cssText = `
  position: absolute;
  top: 20px;
  left: 20px;
  color: #00ff00;
  font-family: "Courier New", monospace;
  font-size: 14px;
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border: 2px solid #00ff00;
`;
instructions.innerHTML = `
  <strong>BUCKSHOT ROULETTE - SHOTGUN MODEL</strong><br>
  SPACE: Fire (Pump Action)<br>
  Arrow Keys: Aim<br>
`;
document.body.appendChild(instructions);

// Add some style to the body
document.body.style.cssText = `
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #0a0a0a;
`;
