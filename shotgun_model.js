import * as THREE from 'three';

export class ShotgunModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.createShotgun();
  }

  createShotgun() {
    // Main barrel - long cylindrical tube
    const barrelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 3, 32);
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c1c1c,
      metalness: 0.96,
      roughness: 0.07,
      envMapIntensity: 1.2,
    });
    const barrel = new THREE.Mesh(barrelGeometry, metalMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.x = 1.5;
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    this.group.add(barrel);

    // Barrel end cap
    const barrelCapGeometry = new THREE.CylinderGeometry(0.18, 0.15, 0.2, 32);
    const barrelCap = new THREE.Mesh(barrelCapGeometry, metalMaterial);
    barrelCap.rotation.z = Math.PI / 2;
    barrelCap.position.x = 3.2;
    barrelCap.castShadow = true;
    this.group.add(barrelCap);

    // Receiver/breach block - the main body
    const receiverGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.25);
    const receiverMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.92,
      roughness: 0.12,
    });
    const receiver = new THREE.Mesh(receiverGeometry, receiverMaterial);
    receiver.position.set(0.2, 0, 0);
    receiver.castShadow = true;
    receiver.receiveShadow = true;
    this.group.add(receiver);

    // Stock/buttstock - wooden part
    const stockGeometry = new THREE.BoxGeometry(1.2, 0.25, 0.2);
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x3e1f08,
      metalness: 0.0,
      roughness: 0.85,
    });
    const stock = new THREE.Mesh(stockGeometry, woodMaterial);
    stock.position.set(-0.7, -0.05, 0);
    stock.castShadow = true;
    stock.receiveShadow = true;
    this.group.add(stock);

    // Pump/slide handle
    const pumpGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.35);
    const pumpMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      metalness: 0.6,
      roughness: 0.4,
    });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.position.set(1.0, 0.15, 0);
    pump.castShadow = true;
    pump.userData.isPump = true;
    this.group.add(pump);

    // Trigger guard
    const triggerGuardGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, metalMaterial);
    triggerGuard.position.set(-0.1, -0.1, 0);
    triggerGuard.castShadow = true;
    this.group.add(triggerGuard);

    // Trigger
    const triggerGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.08);
    const trigger = new THREE.Mesh(triggerGeometry, metalMaterial);
    trigger.position.set(-0.1, -0.2, 0);
    trigger.castShadow = true;
    this.group.add(trigger);

    // Grip/handle
    const gripGeometry = new THREE.BoxGeometry(0.12, 0.35, 0.18);
    const grip = new THREE.Mesh(gripGeometry, woodMaterial);
    grip.position.set(-0.4, -0.15, 0);
    grip.rotation.z = -0.2;
    grip.castShadow = true;
    this.group.add(grip);

    // Front sight
    const sightGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.08);
    const sight = new THREE.Mesh(sightGeometry, metalMaterial);
    sight.position.set(2.5, 0.2, 0);
    sight.castShadow = true;
    this.group.add(sight);

    // Rear sight
    const rearSight = new THREE.Mesh(sightGeometry, metalMaterial);
    rearSight.position.set(0.5, 0.2, 0);
    rearSight.castShadow = true;
    this.group.add(rearSight);

    // Magazine tube (under barrel)
    const magTubeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 24);
    const magTube = new THREE.Mesh(magTubeGeometry, metalMaterial);
    magTube.rotation.z = Math.PI / 2;
    magTube.position.set(1.2, -0.2, 0);
    magTube.castShadow = true;
    this.group.add(magTube);

    // Magazine cap (front of mag tube)
    const magCapGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const magCap = new THREE.Mesh(magCapGeometry, metalMaterial);
    magCap.position.set(2.8, -0.2, 0);
    magCap.castShadow = true;
    this.group.add(magCap);

    // Shells/ammo in magazine (visible part)
    for (let i = 0; i < 3; i++) {
      const shellGeometry = new THREE.CylinderGeometry(0.085, 0.085, 0.25, 16);
      const shellMaterial = new THREE.MeshStandardMaterial({
        color: 0xcc0000,
        metalness: 0.5,
        roughness: 0.5,
      });
      const shell = new THREE.Mesh(shellGeometry, shellMaterial);
      shell.rotation.z = Math.PI / 2;
      shell.position.set(0.8 + i * 0.35, -0.2, 0);
      shell.castShadow = true;
      this.group.add(shell);
    }

    // Position the entire shotgun at origin
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
  }

  // Animate pump action when firing
  firePump(duration = 0.3) {
    const pump = this.group.children.find(child => child.userData.isPump);
    if (!pump) {
        console.error("Pump mesh not found!");
        return;
    }

    const startPos = pump.position.x;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.5) {
        // Pump backward
        pump.position.x = startPos - progress * 2 * 0.3;
      } else {
        // Pump forward
        pump.position.x = startPos - (1 - progress) * 2 * 0.3;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        pump.position.x = startPos;
      }
    };

    animate();
  }

  // Rotate shotgun for aiming
  aim(angleX = 0, angleY = 0) {
    this.group.rotation.x += angleX;
    this.group.rotation.y += angleY;
  }

  // Get the group for positioning
  getGroup() {
    return this.group;
  }

  // Set position
  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  // Set rotation
  setRotation(x, y, z) {
    this.group.rotation.set(x, y, z);
  }

  // Scale the entire shotgun
  setScale(scale) {
    this.group.scale.set(scale, scale, scale);
  }
}

// Export for use in Node.js/game engine
export default ShotgunModel;
