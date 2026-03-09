import * as THREE from 'three';

const metal   = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
const darkMet = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
const wood    = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.8 });
const glass   = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6, roughness: 0.1 });

function box(w, h, d, mat) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
function cyl(rt, rb, h, seg, mat) {
    return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}
function tor(r, tube, seg, mat) {
    return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, seg), mat);
}

export function createItemMesh(type) {
    const g = new THREE.Group();

    switch (type) {

        case 'cigarettes': {
            // Pack
            const pack = box(0.12, 0.16, 0.05,
                new THREE.MeshStandardMaterial({ color: 0xe8d8b0, roughness: 0.7 }));
            g.add(pack);
            // Red stripe
            const stripe = box(0.121, 0.04, 0.051,
                new THREE.MeshStandardMaterial({ color: 0xcc2200 }));
            stripe.position.y = 0.04;
            g.add(stripe);
            // 3 cigarette sticks poking out top
            for (let i = -1; i <= 1; i++) {
                const stick = cyl(0.008, 0.008, 0.1, 8,
                    new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.9 }));
                stick.position.set(i * 0.028, 0.13, 0);
                g.add(stick);
                // Filter tip
                const tip = cyl(0.009, 0.009, 0.025, 8,
                    new THREE.MeshStandardMaterial({ color: 0xd4a070, roughness: 0.8 }));
                tip.position.set(i * 0.028, 0.165, 0);
                g.add(tip);
            }
            break;
        }

        case 'medication': {
            // Pill bottle
            const bottle = cyl(0.055, 0.05, 0.18, 16,
                new THREE.MeshStandardMaterial({ color: 0xff6600, transparent: true, opacity: 0.85, roughness: 0.3 }));
            g.add(bottle);
            // White cap
            const cap = cyl(0.058, 0.055, 0.05, 16,
                new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 }));
            cap.position.y = 0.115;
            g.add(cap);
            // Label
            const label = box(0.1, 0.08, 0.111,
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
            label.position.set(0, -0.02, 0);
            g.add(label);
            break;
        }

        case 'expired_med': {
            const bottle = cyl(0.055, 0.05, 0.18, 16,
                new THREE.MeshStandardMaterial({ color: 0x550000, transparent: true, opacity: 0.85, roughness: 0.3 }));
            g.add(bottle);
            const cap = cyl(0.058, 0.055, 0.05, 16,
                new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
            cap.position.y = 0.115;
            g.add(cap);
            // Red X label
            const label = box(0.1, 0.08, 0.111,
                new THREE.MeshStandardMaterial({ color: 0x880000, roughness: 0.9 }));
            label.position.set(0, -0.02, 0);
            g.add(label);
            break;
        }

        case 'magnifying': {
            // Lens ring
            const ring = tor(0.07, 0.015, 24,
                new THREE.MeshStandardMaterial({ color: 0xc8a030, metalness: 0.7, roughness: 0.3 }));
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.05;
            g.add(ring);
            // Glass inside
            const lens = new THREE.Mesh(
                new THREE.CircleGeometry(0.055, 20),
                new THREE.MeshStandardMaterial({ color: 0x99ddff, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
            );
            lens.rotation.x = Math.PI / 2;
            lens.position.y = 0.05;
            g.add(lens);
            // Handle
            const handle = box(0.022, 0.1, 0.022, wood);
            handle.position.set(0.088, -0.02, 0);
            handle.rotation.z = 0.5;
            g.add(handle);
            break;
        }

        case 'beer': {
            // Bottle body
            const body = cyl(0.045, 0.05, 0.14, 12,
                new THREE.MeshStandardMaterial({ color: 0x5a3a10, transparent: true, opacity: 0.9, roughness: 0.3 }));
            g.add(body);
            // Shoulder
            const shoulder = cyl(0.025, 0.045, 0.04, 12,
                new THREE.MeshStandardMaterial({ color: 0x5a3a10, transparent: true, opacity: 0.9, roughness: 0.3 }));
            shoulder.position.y = 0.09;
            g.add(shoulder);
            // Neck
            const neck = cyl(0.02, 0.025, 0.06, 12,
                new THREE.MeshStandardMaterial({ color: 0x5a3a10, transparent: true, opacity: 0.9, roughness: 0.3 }));
            neck.position.y = 0.14;
            g.add(neck);
            // Cap
            const cap = cyl(0.022, 0.022, 0.018, 12,
                new THREE.MeshStandardMaterial({ color: 0xddcc00, metalness: 0.5 }));
            cap.position.y = 0.178;
            g.add(cap);
            // Foam
            const foam = cyl(0.019, 0.019, 0.01, 12,
                new THREE.MeshStandardMaterial({ color: 0xfff8e0, roughness: 1 }));
            foam.position.y = 0.192;
            g.add(foam);
            break;
        }

        case 'handcuffs': {
            const cuffMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.85, roughness: 0.15 });
            // Left cuff
            const cuffL = tor(0.055, 0.012, 20, cuffMat);
            cuffL.rotation.x = Math.PI / 2;
            cuffL.position.set(-0.075, 0, 0);
            g.add(cuffL);
            // Right cuff
            const cuffR = tor(0.055, 0.012, 20, cuffMat);
            cuffR.rotation.x = Math.PI / 2;
            cuffR.position.set(0.075, 0, 0);
            g.add(cuffR);
            // Chain links (3 small tori connecting them)
            for (let i = -1; i <= 1; i++) {
                const link = tor(0.014, 0.006, 10, cuffMat);
                link.rotation.x = Math.PI / 2;
                link.rotation.z = i === 0 ? 0 : Math.PI / 2;
                link.position.set(i * 0.022, 0, 0);
                g.add(link);
            }
            break;
        }

        case 'phone': {
            // Body
            const body = box(0.1, 0.17, 0.012,
                new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.5 }));
            body.rotation.x = Math.PI / 2;
            g.add(body);
            // Screen
            const screen = box(0.086, 0.148, 0.013,
                new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x1133aa, emissiveIntensity: 0.8, roughness: 0.1 }));
            screen.rotation.x = Math.PI / 2;
            screen.position.z = 0.001;
            g.add(screen);
            // Home button
            const btn = cyl(0.008, 0.008, 0.014, 10,
                new THREE.MeshStandardMaterial({ color: 0x333333 }));
            btn.rotation.x = Math.PI / 2;
            btn.position.set(0, -0.074, 0);
            g.add(btn);
            break;
        }

        case 'saw': {
            // Handle
            const handle = box(0.035, 0.14, 0.025, wood);
            handle.position.set(-0.045, 0, 0);
            g.add(handle);
            // Blade back edge
            const blade = box(0.14, 0.06, 0.008,
                new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 }));
            blade.position.set(0.055, 0.01, 0);
            g.add(blade);
            // Teeth (6 small triangular boxes)
            for (let i = 0; i < 6; i++) {
                const tooth = box(0.018, 0.022, 0.009,
                    new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9 }));
                tooth.position.set(-0.015 + i * 0.024, -0.04, 0);
                tooth.rotation.z = 0.3;
                g.add(tooth);
            }
            break;
        }

        case 'inverter': {
            // Split disc — one side black, one side white
            const discMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
            const geoHalf = new THREE.CylinderGeometry(0.08, 0.08, 0.025, 32, 1, false, 0, Math.PI);
            const white = new THREE.Mesh(geoHalf, discMat(0xeeeeee));
            g.add(white);
            const black = new THREE.Mesh(geoHalf, discMat(0x111111));
            black.rotation.y = Math.PI;
            g.add(black);
            // Edge ring
            const rim = tor(0.08, 0.008, 32,
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 }));
            rim.rotation.x = Math.PI / 2;
            g.add(rim);
            break;
        }

        case 'knife': {
            // Blade
            const bladeGeo = new THREE.BufferGeometry();
            const verts = new Float32Array([
                0.0,  0.0,   0.005,
                0.18, 0.0,   0.005,
                0.0,  0.04,  0.005,
                0.0,  0.0,  -0.005,
                0.18, 0.0,  -0.005,
                0.0,  0.04, -0.005,
            ]);
            bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
            bladeGeo.setIndex([0,1,2, 3,5,4, 0,3,1, 1,3,4, 1,4,2, 2,4,5, 2,5,0, 0,5,3]);
            bladeGeo.computeVertexNormals();
            const blade = new THREE.Mesh(bladeGeo, metal);
            blade.position.set(0, -0.02, 0);
            g.add(blade);
            // Guard
            const guard = box(0.012, 0.065, 0.015,
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 }));
            guard.position.set(0, -0.02, 0);
            g.add(guard);
            // Handle
            const hndl = box(0.02, 0.1, 0.018, wood);
            hndl.position.set(-0.058, -0.02, 0);
            g.add(hndl);
            break;
        }

        default: {
            // Fallback: generic glowing orb
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 12, 12),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaff, emissiveIntensity: 1 })
            );
            g.add(orb);
            break;
        }
    }

    return g;
}
