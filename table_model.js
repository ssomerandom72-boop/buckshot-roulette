import * as THREE from 'three';

export class TableModel {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.build();
    }

    build() {
        const darkWood  = new THREE.MeshStandardMaterial({ color: 0x1a0d06, roughness: 0.8, metalness: 0.05 });
        const midWood   = new THREE.MeshStandardMaterial({ color: 0x2e1a0e, roughness: 0.75, metalness: 0.05 });
        const feltGreen = new THREE.MeshStandardMaterial({ color: 0x0d3b1e, roughness: 0.95, metalness: 0.0 });
        const brassmat  = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.3, metalness: 0.8 });

        // --- FELT SURFACE ---
        const felt = new THREE.Mesh(
            new THREE.CylinderGeometry(1.05, 1.05, 0.015, 64),
            feltGreen
        );
        felt.position.y = 0.015;
        felt.receiveShadow = true;
        this.group.add(felt);

        // Felt inset ring (decorative border on the felt)
        const feltRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.88, 0.025, 8, 64),
            new THREE.MeshStandardMaterial({ color: 0x0a2e16, roughness: 0.95 })
        );
        feltRing.rotation.x = Math.PI / 2;
        feltRing.position.y = 0.022;
        this.group.add(feltRing);

        // --- WOOD RIM (top lip) ---
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(1.08, 0.075, 12, 64),
            darkWood
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.015;
        rim.castShadow = true;
        rim.receiveShadow = true;
        this.group.add(rim);

        // Outer edge of tabletop (the thick wood disc around the felt)
        const outerEdge = new THREE.Mesh(
            new THREE.CylinderGeometry(1.16, 1.16, 0.06, 64),
            darkWood
        );
        outerEdge.position.y = 0.0;
        outerEdge.castShadow = true;
        outerEdge.receiveShadow = true;
        this.group.add(outerEdge);

        // Slight overhang underside bevel
        const bevel = new THREE.Mesh(
            new THREE.CylinderGeometry(1.1, 1.16, 0.04, 64),
            midWood
        );
        bevel.position.y = -0.05;
        bevel.castShadow = true;
        this.group.add(bevel);

        // Brass inlay strip on the rim
        const brassRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.115, 0.012, 6, 64),
            brassmat
        );
        brassRing.rotation.x = Math.PI / 2;
        brassRing.position.y = 0.02;
        this.group.add(brassRing);

        // --- APRON (skirt below the tabletop) ---
        const apron = new THREE.Mesh(
            new THREE.CylinderGeometry(1.08, 1.0, 0.14, 64),
            midWood
        );
        apron.position.y = -0.1;
        apron.castShadow = true;
        apron.receiveShadow = true;
        this.group.add(apron);

        // Decorative carved panels on the apron (8 flat blocks around the ring)
        const panelCount = 8;
        for (let i = 0; i < panelCount; i++) {
            const angle = (i / panelCount) * Math.PI * 2;
            const panel = new THREE.Mesh(
                new THREE.BoxGeometry(0.22, 0.09, 0.02),
                new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.9 })
            );
            panel.position.set(
                Math.sin(angle) * 1.04,
                -0.1,
                Math.cos(angle) * 1.04
            );
            panel.rotation.y = -angle;
            panel.castShadow = true;
            this.group.add(panel);
        }

        // --- PEDESTAL COLUMN ---
        // Upper column taper
        const colTop = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.26, 0.3, 32),
            darkWood
        );
        colTop.position.y = -0.32;
        colTop.castShadow = true;
        this.group.add(colTop);

        // Main column shaft
        const colShaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 0.5, 32),
            midWood
        );
        colShaft.position.y = -0.65;
        colShaft.castShadow = true;
        this.group.add(colShaft);

        // Column decorative ring
        const colRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.2, 0.025, 8, 32),
            brassmat
        );
        colRing.rotation.x = Math.PI / 2;
        colRing.position.y = -0.48;
        this.group.add(colRing);

        // Lower column flare
        const colBottom = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.38, 0.25, 32),
            darkWood
        );
        colBottom.position.y = -0.9;
        colBottom.castShadow = true;
        this.group.add(colBottom);

        // --- BASE PLATFORM ---
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.6, 0.08, 32),
            darkWood
        );
        base.position.y = -1.07;
        base.castShadow = true;
        base.receiveShadow = true;
        this.group.add(base);

        // Base feet (4 brass feet)
        const footCount = 4;
        for (let i = 0; i < footCount; i++) {
            const angle = (i / footCount) * Math.PI * 2 + Math.PI / 4;
            const foot = new THREE.Mesh(
                new THREE.CylinderGeometry(0.045, 0.06, 0.06, 16),
                brassmat
            );
            foot.position.set(
                Math.sin(angle) * 0.45,
                -1.13,
                Math.cos(angle) * 0.45
            );
            foot.castShadow = true;
            this.group.add(foot);
        }

        // Floor shadow catcher disc
        const shadow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.65, 0.65, 0.005, 32),
            new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, transparent: true, opacity: 0.35 })
        );
        shadow.position.y = -1.16;
        shadow.receiveShadow = true;
        this.group.add(shadow);
    }

    getGroup() {
        return this.group;
    }

    setPosition(x, y, z) {
        this.group.position.set(x, y, z);
    }
}

export default TableModel;
