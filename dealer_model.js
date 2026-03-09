import * as THREE from 'three';

export class DealerModel {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.headMesh = null;
        this._deathPivot = null;
        this.rightArmPivot = null;
        this.build();
    }

    build() {
        const suitMat   = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.75, metalness: 0.08 });
        const lapelMat  = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.6,  metalness: 0.14 });
        const shirtMat  = new THREE.MeshStandardMaterial({ color: 0xe0dac6, roughness: 0.9 });
        const skinMat   = new THREE.MeshStandardMaterial({ color: 0x0e0b06, roughness: 0.85 });
        const tieMat    = new THREE.MeshStandardMaterial({ color: 0x1a0000, roughness: 0.7 });
        const buttonMat = new THREE.MeshStandardMaterial({ color: 0xc8a84b, roughness: 0.3, metalness: 0.8 });
        const cuffMat   = new THREE.MeshStandardMaterial({ color: 0xd0cbb8, roughness: 0.9 });
        const hatMat    = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.85 });
        const hatBandMat= new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.6 });
        const woodMat   = new THREE.MeshStandardMaterial({ color: 0x100c05, roughness: 0.92 });
        const eyeMat    = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff1100, emissiveIntensity: 4.0 });
        const skullMat  = new THREE.MeshStandardMaterial({ color: 0x060402, roughness: 0.9 });

        // ── TORSO ──
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.82, 0.24), suitMat);
        torso.castShadow = true;
        this.group.add(torso);

        // Shirt strip
        const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.52, 0.245), shirtMat);
        shirt.position.set(0, 0.06, 0);
        this.group.add(shirt);

        // Bow tie
        const tieL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.055, 0.05), tieMat);
        tieL.position.set(-0.055, 0.37, 0.122);
        this.group.add(tieL);
        const tieR = tieL.clone(); tieR.position.x = 0.055; this.group.add(tieR);
        const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.055), tieMat);
        tieKnot.position.set(0, 0.37, 0.122);
        this.group.add(tieKnot);

        // Lapels
        const makeLapel = (verts, idx) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
            g.setIndex(idx);
            g.computeVertexNormals();
            return new THREE.Mesh(g, lapelMat);
        };
        this.group.add(makeLapel([
            -0.29, 0.40, 0.122,  -0.05, 0.40, 0.122,
            -0.29, -0.02, 0.122, -0.05, 0.19, 0.122,
        ], [0,2,1, 1,2,3]));
        this.group.add(makeLapel([
             0.29, 0.40, 0.122,  0.05, 0.40, 0.122,
             0.29, -0.02, 0.122, 0.05, 0.19, 0.122,
        ], [0,1,2, 1,3,2]));

        // Buttons
        for (let i = 0; i < 3; i++) {
            const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 8), buttonMat);
            btn.rotation.x = Math.PI / 2;
            btn.position.set(0, 0.02 - i * 0.14, 0.122);
            this.group.add(btn);
        }

        // Pocket square
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.065, 0.01), shirtMat);
        pocket.position.set(-0.18, 0.21, 0.122); pocket.rotation.z = 0.15;
        this.group.add(pocket);

        // ── SHOULDERS (rounded) ──
        const shGeo = new THREE.CapsuleGeometry(0.072, 0.1, 4, 8);
        shGeo.rotateZ(Math.PI / 2);
        const shL = new THREE.Mesh(shGeo, suitMat); shL.position.set(-0.36, 0.34, 0); shL.castShadow = true; this.group.add(shL);
        const shR = shL.clone();                    shR.position.x = 0.36;              this.group.add(shR);

        // ── LEFT ARM (static, capsule) ──
        const armGeo = new THREE.CapsuleGeometry(0.05, 0.44, 4, 10);
        const armL = new THREE.Mesh(armGeo, suitMat);
        armL.position.set(-0.39, -0.04, 0); armL.rotation.z = 0.15; armL.castShadow = true;
        this.group.add(armL);

        const cuffL = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.068, 12), cuffMat);
        cuffL.position.set(-0.40, -0.34, 0);
        this.group.add(cuffL);

        const handGeo = new THREE.BoxGeometry(0.1, 0.13, 0.09);
        const handL = new THREE.Mesh(handGeo, skinMat);
        handL.position.set(-0.41, -0.445, 0.02); handL.castShadow = true;
        this.group.add(handL);

        for (let i = 0; i < 4; i++) {
            const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.065, 3, 6), skinMat);
            f.position.set(-0.435 + i * 0.027, -0.535, 0.02);
            f.rotation.z = (i - 1.5) * 0.07;
            this.group.add(f);
        }

        // ── RIGHT ARM (articulated pivot) ──
        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set(0.39, 0.28, 0);
        this.group.add(this.rightArmPivot);

        const armR = new THREE.Mesh(armGeo, suitMat);
        armR.position.set(0, -0.29, 0); armR.rotation.z = -0.15; armR.castShadow = true;
        this.rightArmPivot.add(armR);

        const cuffR = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.068, 12), cuffMat);
        cuffR.position.set(0, -0.615, 0);
        this.rightArmPivot.add(cuffR);

        const handR = new THREE.Mesh(handGeo, skinMat);
        handR.position.set(0.01, -0.71, 0.02); handR.castShadow = true;
        this.rightArmPivot.add(handR);

        for (let i = 0; i < 4; i++) {
            const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.065, 3, 6), skinMat);
            f.position.set(-0.04 + i * 0.027, -0.805, 0.02);
            f.rotation.z = (i - 1.5) * 0.07;
            this.rightArmPivot.add(f);
        }

        // ── NECK ──
        const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.16, 4, 10), skinMat);
        neck.position.set(0, 0.48, 0); neck.castShadow = true;
        this.group.add(neck);

        // ── HEAD ──
        // Skull box behind the face
        const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.32), skullMat);
        skull.position.set(0, 0.79, -0.04); skull.castShadow = true;
        this.group.add(skull);

        // Glowing red eyes (orbs + point lights)
        for (const ex of [-0.11, 0.11]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), eyeMat);
            eye.position.set(ex, 0.82, 0.135);
            this.group.add(eye);
            const glow = new THREE.PointLight(0xff1100, 1.5, 0.7);
            glow.position.copy(eye.position);
            this.group.add(glow);
        }

        // Face texture — big and prominent
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('Thedealer.webp', (texture) => {
            const headMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            this.headMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.52), headMat);
            this.headMesh.position.set(0, 0.79, 0.165);
            this.group.add(this.headMesh);
        });

        // ── HAT ──
        const hatBrim  = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.036, 32), hatMat);
        hatBrim.position.set(0, 1.07, 0); this.group.add(hatBrim);

        const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.205, 0.44, 32), hatMat);
        hatCrown.position.set(0, 1.29, 0); this.group.add(hatCrown);

        const hatTop   = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.19, 0.022, 32), hatMat);
        hatTop.position.set(0, 1.512, 0); this.group.add(hatTop);

        const hatBand  = new THREE.Mesh(new THREE.CylinderGeometry(0.206, 0.206, 0.048, 32), hatBandMat);
        hatBand.position.set(0, 1.093, 0); this.group.add(hatBand);

        // ── CHAIR ──
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.055, 0.5), woodMat);
        seat.position.set(0, -0.445, 0.06); seat.castShadow = true; this.group.add(seat);

        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.6, 0.055), woodMat);
        chairBack.position.set(0, -0.13, -0.21); chairBack.castShadow = true; this.group.add(chairBack);

        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.058, 0.095), woodMat);
        topRail.position.set(0, 0.175, -0.21); this.group.add(topRail);

        // Vertical slats on chair back
        for (let i = -1; i <= 1; i++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.03), woodMat);
            slat.position.set(i * 0.17, -0.13, -0.185);
            this.group.add(slat);
        }

        const legGeo = new THREE.CylinderGeometry(0.026, 0.021, 1.46, 8);
        [[-0.22, -0.34], [0.22, -0.34], [-0.22, 0.32], [0.22, 0.32]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(legGeo, woodMat);
            leg.position.set(x, -1.17, z); leg.castShadow = true; this.group.add(leg);
        });
    }

    // Slam back and stay dead
    deathFall() {
        return new Promise(resolve => {
            const pivot = new THREE.Group();
            pivot.position.copy(this.group.position);
            this.group.parent.add(pivot);
            this.group.position.set(0, 0, 0);
            pivot.add(this.group);
            this._deathPivot = pivot;

            const fallStart = Date.now();
            const fall = () => {
                const t = Math.min(1, (Date.now() - fallStart) / 380);
                pivot.rotation.x = 2.0 * (t * t);
                if (t < 1) requestAnimationFrame(fall); else resolve();
            };
            fall();
        });
    }

    // Restore upright between rounds
    resetPose() {
        if (this._deathPivot) {
            this._deathPivot.rotation.x = 0;
            const worldPos = new THREE.Vector3();
            this.group.getWorldPosition(worldPos);
            this._deathPivot.parent.add(this.group);
            this.group.position.copy(worldPos);
            this._deathPivot.parent.remove(this._deathPivot);
            this._deathPivot = null;
        }
        this.rightArmPivot.rotation.x = 0;
    }

    // Fall back when hit, then recover
    fallBack() {
        return new Promise(resolve => {
            const fallDuration  = 320;
            const pauseDuration = 1100;
            const riseDuration  = 600;
            const maxAngle      = 1.75;

            const pivot = new THREE.Group();
            pivot.position.copy(this.group.position);
            this.group.parent.add(pivot);
            this.group.position.set(0, 0, 0);
            pivot.add(this.group);

            const fallStart = Date.now();
            const fall = () => {
                const t = Math.min(1, (Date.now() - fallStart) / fallDuration);
                pivot.rotation.x = maxAngle * (t * t);
                if (t < 1) { requestAnimationFrame(fall); } else { setTimeout(rise, pauseDuration); }
            };

            let riseStart = 0;
            const rise = () => {
                if (!riseStart) riseStart = Date.now();
                const t = Math.min(1, (Date.now() - riseStart) / riseDuration);
                pivot.rotation.x = maxAngle * (1 - (1 - Math.pow(1 - t, 2)));
                if (t < 1) {
                    requestAnimationFrame(rise);
                } else {
                    pivot.rotation.x = 0;
                    const worldPos = new THREE.Vector3();
                    this.group.getWorldPosition(worldPos);
                    pivot.parent.add(this.group);
                    this.group.position.copy(worldPos);
                    pivot.parent.remove(pivot);
                    resolve();
                }
            };
            fall();
        });
    }

    reachOut() {
        const targetAngle = -1.55;
        const duration = 550;
        const startTime = Date.now();
        const startAngle = this.rightArmPivot.rotation.x;
        return new Promise(resolve => {
            const tick = () => {
                const t = Math.min(1, (Date.now() - startTime) / duration);
                this.rightArmPivot.rotation.x = startAngle + (targetAngle - startAngle) * (1 - Math.pow(1 - t, 2));
                if (t < 1) requestAnimationFrame(tick); else resolve();
            };
            tick();
        });
    }

    retractArm() {
        const duration = 500;
        const startTime = Date.now();
        const startAngle = this.rightArmPivot.rotation.x;
        return new Promise(resolve => {
            const tick = () => {
                const t = Math.min(1, (Date.now() - startTime) / duration);
                this.rightArmPivot.rotation.x = startAngle * (1 - t);
                if (t < 1) requestAnimationFrame(tick); else resolve();
            };
            tick();
        });
    }

    getHeadMesh() { return this.headMesh; }
    getGroup()    { return this.group; }
    setPosition(x, y, z) { this.group.position.set(x, y, z); }
}

export default DealerModel;
