import * as THREE from 'three';

export class DealerModel {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.headMesh = null;
        this.build();
    }

    build() {
        const suitMat    = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.85, metalness: 0.05 });
        const shirtMat   = new THREE.MeshStandardMaterial({ color: 0xddd8c4, roughness: 0.9 });
        const skinMat    = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.8 });
        const tieMat     = new THREE.MeshStandardMaterial({ color: 0x1a0000, roughness: 0.7 });
        const buttonMat  = new THREE.MeshStandardMaterial({ color: 0xc8a84b, roughness: 0.3, metalness: 0.7 });

        // --- TORSO ---
        // Main jacket body — tall and gaunt
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.22), suitMat);
        torso.position.set(0, 0, 0);
        torso.castShadow = true;
        this.group.add(torso);

        // Shirt strip (visible between lapels)
        const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.23), shirtMat);
        shirt.position.set(0, 0.05, 0);
        this.group.add(shirt);

        // Bow tie
        const tieL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.055, 0.05), tieMat);
        tieL.position.set(-0.055, 0.34, 0.115);
        this.group.add(tieL);
        const tieR = tieL.clone();
        tieR.position.x = 0.055;
        this.group.add(tieR);
        const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.055), tieMat);
        tieKnot.position.set(0, 0.34, 0.115);
        this.group.add(tieKnot);

        // Lapels (left and right)
        const lapelGeo = new THREE.BufferGeometry();
        // Left lapel — a flat triangle/quad angled inward
        const lv = new Float32Array([
            -0.26, 0.36, 0.112,
            -0.05, 0.36, 0.112,
            -0.26, -0.02, 0.112,
            -0.05, 0.18, 0.112,
        ]);
        lapelGeo.setAttribute('position', new THREE.Float32BufferAttribute(lv, 3));
        lapelGeo.setIndex([0,2,1, 1,2,3]);
        lapelGeo.computeVertexNormals();
        const lapelL = new THREE.Mesh(lapelGeo, suitMat);
        this.group.add(lapelL);

        const lapelGeoR = lapelGeo.clone();
        const rv = new Float32Array([
            0.26, 0.36, 0.112,
            0.05, 0.36, 0.112,
            0.26, -0.02, 0.112,
            0.05, 0.18, 0.112,
        ]);
        lapelGeoR.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3));
        lapelGeoR.setIndex([0,1,2, 1,3,2]);
        lapelGeoR.computeVertexNormals();
        const lapelR = new THREE.Mesh(lapelGeoR, suitMat);
        this.group.add(lapelR);

        // Buttons
        for (let i = 0; i < 3; i++) {
            const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8), buttonMat);
            btn.rotation.x = Math.PI / 2;
            btn.position.set(0, 0.0 - i * 0.13, 0.118);
            this.group.add(btn);
        }

        // Pocket square (left chest)
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.01), shirtMat);
        pocket.position.set(-0.16, 0.18, 0.118);
        pocket.rotation.z = 0.15;
        this.group.add(pocket);

        // --- SHOULDERS ---
        const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), suitMat);
        shoulderL.position.set(-0.33, 0.3, 0);
        shoulderL.castShadow = true;
        this.group.add(shoulderL);
        const shoulderR = shoulderL.clone();
        shoulderR.position.x = 0.33;
        this.group.add(shoulderR);

        // --- ARMS --- (thin, slightly angled down like resting on table)
        const armGeo = new THREE.BoxGeometry(0.1, 0.55, 0.13);

        const armL = new THREE.Mesh(armGeo, suitMat);
        armL.position.set(-0.36, -0.06, 0);
        armL.rotation.z = 0.12;
        armL.castShadow = true;
        this.group.add(armL);

        // Cuffs
        const cuffGeo = new THREE.BoxGeometry(0.105, 0.07, 0.135);
        const cuffMat = new THREE.MeshStandardMaterial({ color: 0xd0cbb8, roughness: 0.9 });

        const cuffL = new THREE.Mesh(cuffGeo, cuffMat);
        cuffL.position.set(-0.36, -0.36, 0);
        this.group.add(cuffL);

        // Hands (bony, dark)
        const handGeo = new THREE.BoxGeometry(0.1, 0.14, 0.1);
        const handL = new THREE.Mesh(handGeo, skinMat);
        handL.position.set(-0.37, -0.46, 0.02);
        handL.castShadow = true;
        this.group.add(handL);

        // Fingers (left hand — 4 thin boxes)
        for (let i = 0; i < 4; i++) {
            const finger = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.09, 0.018), skinMat);
            finger.position.set(-0.41 + i * 0.025, -0.56, 0.02);
            finger.rotation.z = (i - 1.5) * 0.08;
            this.group.add(finger);
        }

        // --- RIGHT ARM (articulated) — pivot at shoulder joint for reach animation ---
        // Pivot sits at the shoulder-arm junction in group-local space
        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set(0.36, 0.25, 0);
        this.group.add(this.rightArmPivot);

        // All right-arm parts are positioned relative to the pivot
        const armR = new THREE.Mesh(armGeo, suitMat);
        armR.position.set(0, -0.31, 0);   // world equiv: (0.36, -0.06, 0)
        armR.rotation.z = -0.12;
        armR.castShadow = true;
        this.rightArmPivot.add(armR);

        const cuffR = new THREE.Mesh(cuffGeo, cuffMat);
        cuffR.position.set(0, -0.61, 0);   // world equiv: (0.36, -0.36, 0)
        this.rightArmPivot.add(cuffR);

        const handR = new THREE.Mesh(handGeo, skinMat);
        handR.position.set(0.01, -0.71, 0.02);  // world equiv: (0.37, -0.46, 0.02)
        handR.castShadow = true;
        this.rightArmPivot.add(handR);

        for (let i = 0; i < 4; i++) {
            const finger = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.09, 0.018), skinMat);
            finger.position.set(-0.04 + i * 0.025, -0.81, 0.02);  // world equiv: (0.32+i*0.025, -0.56, 0.02)
            finger.rotation.z = (i - 1.5) * 0.08;
            this.rightArmPivot.add(finger);
        }

        // --- NECK ---
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.2, 12), skinMat);
        neck.position.set(0, 0.42, 0);
        neck.castShadow = true;
        this.group.add(neck);

        // --- HEAD --- (load texture onto a box-ish head)
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('Thedealer.webp', (texture) => {
            const headMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            const headGeo = new THREE.PlaneGeometry(0.42, 0.42);
            this.headMesh = new THREE.Mesh(headGeo, headMat);
            this.headMesh.position.set(0, 0.64, 0);
            this.group.add(this.headMesh);

            // Dark box behind the face for depth
            const skull = new THREE.Mesh(
                new THREE.BoxGeometry(0.38, 0.4, 0.28),
                new THREE.MeshStandardMaterial({ color: 0x080503, roughness: 0.9 })
            );
            skull.position.set(0, 0.64, -0.05);
            this.group.add(skull);

            // Re-add face plane on top of skull
            this.group.remove(this.headMesh);
            this.group.add(skull);
            this.group.add(this.headMesh);
        });

        // Hat brim
        const hatBrim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 0.03, 32),
            new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.85 })
        );
        hatBrim.position.set(0, 0.87, 0);
        this.group.add(hatBrim);

        // Hat crown
        const hatCrown = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.19, 0.38, 32),
            new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.85 })
        );
        hatCrown.position.set(0, 1.07, 0);
        this.group.add(hatCrown);

        // Hat band
        const hatBand = new THREE.Mesh(
            new THREE.CylinderGeometry(0.191, 0.191, 0.04, 32),
            new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.6 })
        );
        hatBand.position.set(0, 0.9, 0);
        this.group.add(hatBand);

        // --- CHAIR ---
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x140c05, roughness: 0.9 });

        // Seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.46), woodMat);
        seat.position.set(0, -0.38, 0.06);
        seat.castShadow = true;
        this.group.add(seat);

        // Chair back
        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.55, 0.05), woodMat);
        chairBack.position.set(0, -0.1, -0.17);
        chairBack.castShadow = true;
        this.group.add(chairBack);

        // Chair back top rail
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.08), woodMat);
        topRail.position.set(0, 0.17, -0.17);
        this.group.add(topRail);

        // 4 legs
        const legGeo = new THREE.CylinderGeometry(0.025, 0.02, 1.42, 8);
        [[-0.21, -0.3], [0.21, -0.3], [-0.21, 0.28], [0.21, 0.28]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(legGeo, woodMat);
            leg.position.set(x, -1.09, z);
            leg.castShadow = true;
            this.group.add(leg);
        });
    }

    // Slam back and stay dead (no recovery)
    deathFall() {
        return new Promise(resolve => {
            const fallDuration = 380;
            const maxAngle = 2.0;

            const pivot = new THREE.Group();
            pivot.position.copy(this.group.position);
            this.group.parent.add(pivot);
            this.group.position.set(0, 0, 0);
            pivot.add(this.group);
            this._deathPivot = pivot; // store so resetPose can clean it up

            const fallStart = Date.now();
            const fall = () => {
                const t = Math.min(1, (Date.now() - fallStart) / fallDuration);
                pivot.rotation.x = maxAngle * (t * t);
                if (t < 1) requestAnimationFrame(fall); else resolve();
            };
            fall();
        });
    }

    // Restore upright pose (call after deathFall between rounds)
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

    // Animate dealer falling back in chair, then getting back up
    fallBack() {
        return new Promise(resolve => {
            const fallDuration  = 320;
            const pauseDuration = 1100;
            const riseDuration  = 600;
            const maxAngle      = 1.75; // radians — how far back they fall

            // Pivot is roughly at the chair seat, offset from group origin
            // We move the pivot by temporarily shifting the group's parent
            const pivot = new THREE.Group();
            pivot.position.copy(this.group.position);
            this.group.parent.add(pivot);
            this.group.position.set(0, 0, 0);
            pivot.add(this.group);

            const fallStart = Date.now();
            const fall = () => {
                const t = Math.min(1, (Date.now() - fallStart) / fallDuration);
                const ease = t * t; // ease-in
                pivot.rotation.x = maxAngle * ease;
                if (t < 1) {
                    requestAnimationFrame(fall);
                } else {
                    setTimeout(rise, pauseDuration);
                }
            };

            let riseStart = 0;
            const rise = () => {
                if (!riseStart) riseStart = Date.now();
                const t = Math.min(1, (Date.now() - riseStart) / riseDuration);
                const ease = 1 - Math.pow(1 - t, 2); // ease-out
                pivot.rotation.x = maxAngle * (1 - ease);
                if (t < 1) {
                    requestAnimationFrame(rise);
                } else {
                    pivot.rotation.x = 0;
                    // Restore group to scene directly
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

    // Animate right arm swinging forward to grab the gun
    reachOut() {
        const targetAngle = -1.55; // roughly horizontal toward camera
        const duration = 550;
        const startTime = Date.now();
        const startAngle = this.rightArmPivot.rotation.x;
        return new Promise(resolve => {
            const tick = () => {
                const t = Math.min(1, (Date.now() - startTime) / duration);
                const ease = 1 - Math.pow(1 - t, 2);
                this.rightArmPivot.rotation.x = startAngle + (targetAngle - startAngle) * ease;
                if (t < 1) requestAnimationFrame(tick); else resolve();
            };
            tick();
        });
    }

    // Animate right arm returning to rest
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

    getHeadMesh() {
        return this.headMesh;
    }

    getGroup() {
        return this.group;
    }

    setPosition(x, y, z) {
        this.group.position.set(x, y, z);
    }
}

export default DealerModel;
