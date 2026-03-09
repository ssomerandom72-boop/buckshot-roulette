import * as THREE from 'three';
import { ShotgunModel } from './shotgun_model.js';
import { TableModel } from './table_model.js';
import { DealerModel } from './dealer_model.js';
import { createItemMesh } from './item_models.js';

const debug = document.getElementById('debug-status');
debug.textContent = 'JS Started. Three.js import complete.';

// =========== GLOBALS ===========
let scene, camera, renderer, shotgun, audioCtx;
let particles = [];
let dealer, dealerHead;
let bulbLight, flickerTimer = 0;
let offerMesh = null, offerGlow = null, offerMeshBaseY = 0, offerMeshSpawnTime = 0;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const shotgunInitialPos = new THREE.Vector3(0, 1.25, 0.4);
const ROUND_MAX_CHARGES = 3; // Same HP every round (best 2 of 3)

const state = {
    round: 1,
    playerRoundWins: 0,
    dealerRoundWins: 0,
    playerCharges: ROUND_MAX_CHARGES,
    dealerCharges: ROUND_MAX_CHARGES,
    maxCharges: ROUND_MAX_CHARGES,
    chamber: [],
    liveRounds: 0,
    blankRounds: 0,
    isPlayerTurn: true,
    isAnimating: false,
    // Item system
    playerInventory: [],   // max 3 items
    dealerInventory: [],   // max 3 items
    sawActive: false,      // saw doubles next shot damage
    dealerCuffed: false,   // dealer must shoot self next turn
    playerCuffed: false,   // player must shoot self next turn
    dealerKnowsNextShell: false, // dealer used magnifying glass
    dealerNextShellIsLive: false,
};
const ui = {
    playerCharges: document.getElementById('player-charges'),
    dealerCharges: document.getElementById('dealer-charges'),
    roundDisplay: document.getElementById('round-display'),
    shellInfo: document.getElementById('shell-info'),
    playerActions: document.getElementById('player-actions'),
    shootDealerBtn: document.getElementById('shoot-dealer'),
    shootSelfBtn: document.getElementById('shoot-self'),
    messageBox: document.getElementById('message-box'),
    gameOverScreen: document.getElementById('game-over-screen'),
    restartBtn: document.getElementById('restart-btn'),
    bloodOverlay: document.getElementById('blood-overlay'),
    playerInventory: document.getElementById('player-inventory'),
    itemOffer: document.getElementById('item-offer'),
    offerItemName: document.getElementById('offer-item-name'),
    offerTimer: document.getElementById('offer-timer'),
    offerPickupBtn: document.getElementById('offer-pickup-btn'),
    offerLeaveBtn: document.getElementById('offer-leave-btn'),
};

// =========== ITEM SYSTEM ===========
const ITEM_NAMES = {
    cigarettes:   'CIGARETTES',
    medication:   'MEDICATION',
    magnifying:   'MAGNIFYING GLASS',
    beer:         'BEER',
    handcuffs:    'HANDCUFFS',
    phone:        'PHONE',
    saw:          'SAW',
    inverter:     'INVERTER',
    knife:        'KNIFE',
    expired_med:  'EXPIRED MED',
};

// Weighted item pool: each entry is [type, weight]
const ITEM_WEIGHTS = [
    ['cigarettes',  15],
    ['medication',  15],
    ['magnifying',  12],
    ['beer',        12],
    ['saw',         12],
    ['handcuffs',   10],
    ['phone',       10],
    ['inverter',    10],
    ['knife',        8],
    ['expired_med',  6],
];
const TOTAL_WEIGHT = ITEM_WEIGHTS.reduce((s, [, w]) => s + w, 0);

function getRandomItem() {
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const [type, weight] of ITEM_WEIGHTS) {
        roll -= weight;
        if (roll <= 0) return type;
    }
    return ITEM_WEIGHTS[ITEM_WEIGHTS.length - 1][0];
}

function trySpawnItem(forPlayer) {
    if (Math.random() > 0.70) return;
    const item = getRandomItem();
    if (forPlayer) {
        if (state.playerInventory.length < 3) state.playerInventory.push(item);
    } else {
        if (state.dealerInventory.length < 3) state.dealerInventory.push(item);
    }
    updateUI();
}

// Offer an item to the player with a 5-second UI prompt + 3D model on the table
async function offerItemToPlayer() {
    if (Math.random() > 0.70) return;
    if (state.playerInventory.length >= 3) return;
    const item = getRandomItem();

    sounds.playPickup();

    // Spawn 3D item mesh on the table
    offerMesh = createItemMesh(item);
    offerMeshBaseY = 1.22;
    offerMeshSpawnTime = Date.now();
    offerMesh.position.set(0, offerMeshBaseY, 0.1);
    offerMesh.scale.setScalar(0.9);
    scene.add(offerMesh);

    // Glow point light around the item
    offerGlow = new THREE.PointLight(0xffcc44, 2.0, 1.2);
    offerGlow.position.set(0, offerMeshBaseY + 0.1, 0.1);
    scene.add(offerGlow);

    return new Promise(resolve => {
        ui.offerItemName.textContent = ITEM_NAMES[item] || item;
        ui.itemOffer.classList.remove('hidden');

        let secondsLeft = 5;
        ui.offerTimer.textContent = secondsLeft + 's';

        const interval = setInterval(() => {
            secondsLeft--;
            ui.offerTimer.textContent = secondsLeft + 's';
            if (secondsLeft <= 0) {
                clearInterval(interval);
                cleanup();
                resolve();
            }
        }, 1000);

        const cleanup = () => {
            clearInterval(interval);
            ui.itemOffer.classList.add('hidden');
            ui.offerPickupBtn.removeEventListener('click', onPickup);
            ui.offerLeaveBtn.removeEventListener('click', onLeave);
            if (offerMesh) { scene.remove(offerMesh); offerMesh = null; }
            if (offerGlow) { scene.remove(offerGlow); offerGlow = null; }
        };

        const onPickup = () => {
            if (state.playerInventory.length < 3) {
                state.playerInventory.push(item);
                updateUI();
            }
            cleanup();
            resolve();
        };

        const onLeave = () => {
            cleanup();
            resolve();
        };

        ui.offerPickupBtn.addEventListener('click', onPickup, { once: true });
        ui.offerLeaveBtn.addEventListener('click', onLeave, { once: true });
    });
}

// =========== ITEM ANIMATIONS ===========

function lerpV(a, b, t) { return a + (b - a) * t; }

// Smoke particle burst (for cigarettes/expired_med)
function spawnSmoke(position, count = 18) {
    const positions = [], velocities = [], sizes = [];
    for (let i = 0; i < count; i++) {
        positions.push(position.x, position.y, position.z);
        velocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 0.012,
            0.018 + Math.random() * 0.018,
            (Math.random() - 0.5) * 0.012
        ));
        sizes.push(0.04 + Math.random() * 0.08);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.06, transparent: true, depthWrite: false, opacity: 0.7 });
    const system = new THREE.Points(geo, mat);
    scene.add(system);
    particles.push({ system, velocities, sizes, pool: null, poolMat: null, startTime: Date.now(), lifetime: 1800 });
}

// Spark burst (for saw)
function spawnSparks(position) {
    const count = 20;
    const positions = [], velocities = [], sizes = [];
    for (let i = 0; i < count; i++) {
        positions.push(position.x, position.y, position.z);
        const v = new THREE.Vector3((Math.random()-0.5)*0.18, (Math.random()*0.12), (Math.random()-0.5)*0.18);
        velocities.push(v);
        sizes.push(0.02 + Math.random() * 0.03);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.04, transparent: true, depthWrite: false, opacity: 1.0 });
    const system = new THREE.Points(geo, mat);
    scene.add(system);
    particles.push({ system, velocities, sizes, pool: null, poolMat: null, startTime: Date.now(), lifetime: 500 });
}

async function animateCigarettes() {
    const cig = createItemMesh('cigarettes');
    cig.scale.setScalar(1.4);
    cig.position.set(0.18, 1.08, 0.65);
    cig.rotation.z = -0.3;
    scene.add(cig);

    // Rise toward camera
    const startTime = Date.now();
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - startTime) / 650);
            cig.position.y = 1.08 + t * 0.45;
            cig.position.z = 0.65 + t * 0.2;
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });

    // Smoke puffs
    for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 180));
        spawnSmoke(new THREE.Vector3(cig.position.x, cig.position.y + 0.1, cig.position.z), 12);
    }

    await new Promise(r => setTimeout(r, 500));
    scene.remove(cig);
}

async function animateExpiredMed() {
    const bottle = createItemMesh('expired_med');
    bottle.scale.setScalar(1.3);
    bottle.position.set(0.15, 1.1, 0.6);
    scene.add(bottle);

    // Tip over
    const startTime = Date.now();
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - startTime) / 500);
            bottle.rotation.z = t * 1.5;
            bottle.position.y = 1.1 - t * 0.05;
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });

    // Camera shake like a cough
    shakeCamera(0.06, 350);
    spawnSmoke(new THREE.Vector3(bottle.position.x, bottle.position.y + 0.1, bottle.position.z), 10);
    await new Promise(r => setTimeout(r, 600));
    scene.remove(bottle);
}

async function animateMagnifying() {
    const originalPos = camera.position.clone();
    const zoomPos = new THREE.Vector3(0.12, 1.55, 1.35);

    // Zoom in toward shotgun chamber
    const zoomIn = Date.now();
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - zoomIn) / 500);
            const ease = 1 - Math.pow(1 - t, 2);
            camera.position.lerpVectors(originalPos, zoomPos, ease);
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });

    // Glow at chamber — red = live, blue = blank
    const isLive = state.chamber[0];
    const glowCol = isLive ? 0xff2200 : 0x2244ff;
    const shellGlow = new THREE.PointLight(glowCol, 4, 0.6);
    const chamberPos = shotgun.getGroup().position.clone();
    chamberPos.y += 0.04;
    shellGlow.position.copy(chamberPos);
    scene.add(shellGlow);

    // Pulse the glow
    const pulseStart = Date.now();
    await new Promise(resolve => {
        const pulse = () => {
            const elapsed = Date.now() - pulseStart;
            shellGlow.intensity = 3 + Math.sin(elapsed / 120) * 1.5;
            if (elapsed < 1400) requestAnimationFrame(pulse); else resolve();
        };
        pulse();
    });
    scene.remove(shellGlow);

    // Zoom back out
    const zoomOut = Date.now();
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - zoomOut) / 400);
            camera.position.lerpVectors(zoomPos, originalPos, t);
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });
}

async function animateBeer(isLive) {
    // Shell ejects from shotgun chamber
    const shellMat = new THREE.MeshStandardMaterial({
        color: isLive ? 0xcc2200 : 0x2244bb,
        metalness: 0.5, roughness: 0.4
    });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.065, 10), shellMat);
    const startPos = shotgun.getGroup().position.clone();
    startPos.y += 0.04;
    shell.position.copy(startPos);
    scene.add(shell);

    const endPos = startPos.clone().add(new THREE.Vector3(0.55, 0.25, -0.1));
    const ejStart = Date.now();
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - ejStart) / 550);
            shell.position.lerpVectors(startPos, endPos, t);
            shell.position.y = lerpV(startPos.y, endPos.y, t) + Math.sin(t * Math.PI) * 0.12;
            shell.rotation.z += 0.22;
            shell.rotation.x += 0.12;
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });
    scene.remove(shell);
}

async function animateSaw() {
    const sawMesh = createItemMesh('saw');
    sawMesh.scale.setScalar(2.0);

    // Position at the barrel near the stock
    const shotgunGroup = shotgun.getGroup();
    const barrelStart = new THREE.Vector3();
    shotgunGroup.localToWorld(barrelStart.set(-0.2, 0, 0));
    const barrelEnd = new THREE.Vector3();
    shotgunGroup.localToWorld(barrelEnd.set(0.5, 0, 0));

    sawMesh.position.copy(barrelStart);
    sawMesh.rotation.copy(shotgunGroup.rotation);
    sawMesh.rotation.z += Math.PI / 2;
    scene.add(sawMesh);

    // Slide along the barrel spawning sparks
    const sawStart = Date.now();
    const sawDuration = 900;
    let lastSpark = 0;
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - sawStart) / sawDuration);
            sawMesh.position.lerpVectors(barrelStart, barrelEnd, t);
            sawMesh.rotation.y += 0.2;

            const now = Date.now();
            if (now - lastSpark > 70) {
                spawnSparks(sawMesh.position.clone());
                lastSpark = now;
            }

            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });

    shakeCamera(0.04, 200);
    scene.remove(sawMesh);
}

async function animateInverter() {
    const disc = createItemMesh('inverter');
    disc.scale.setScalar(1.8);
    disc.position.copy(shotgun.getGroup().position);
    disc.position.y += 0.18;
    scene.add(disc);

    // Flash of color when it flips
    const isNowLive = state.chamber[0]; // already flipped at this point
    const flashColor = isNowLive ? 0xff2200 : 0x2244ff;
    const flash = new THREE.PointLight(flashColor, 5, 1.5);
    flash.position.copy(disc.position);
    scene.add(flash);

    const start = Date.now();
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - start) / 800);
            disc.rotation.y += 0.18;
            disc.rotation.x = Math.sin(t * Math.PI) * 0.5;
            flash.intensity = 5 * (1 - t);
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });

    scene.remove(disc);
    scene.remove(flash);
}

async function animateKnife() {
    const knife = createItemMesh('knife');
    knife.scale.setScalar(2.0);
    // Start off to the left, slash across to the right
    knife.position.set(-0.7, 1.4, 0.8);
    knife.rotation.z = -0.6;
    scene.add(knife);

    const startPos = knife.position.clone();
    const endPos = new THREE.Vector3(0.7, 1.2, 0.8);
    const slashStart = Date.now();
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - slashStart) / 220);
            knife.position.lerpVectors(startPos, endPos, t);
            knife.rotation.z = -0.6 + t * 0.8;
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });

    await new Promise(r => setTimeout(r, 120));
    scene.remove(knife);
}

async function animatePhone() {
    const phone = createItemMesh('phone');
    phone.scale.setScalar(2.5);
    // Slide up from below center
    phone.position.set(0, 1.0, 1.1);
    scene.add(phone);

    // Phone screen glow
    const screenGlow = new THREE.PointLight(0x2255ff, 2.0, 0.8);
    screenGlow.position.copy(phone.position);
    scene.add(screenGlow);

    const slideStart = Date.now();
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - slideStart) / 400);
            const ease = 1 - Math.pow(1 - t, 2);
            phone.position.y = lerpV(1.0, 1.4, ease);
            screenGlow.position.y = phone.position.y;
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });

    await new Promise(r => setTimeout(r, 1200));

    // Slide back down
    const slideDown = Date.now();
    const fromY = phone.position.y;
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - slideDown) / 350);
            phone.position.y = lerpV(fromY, 0.9, t);
            screenGlow.position.y = phone.position.y;
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });

    scene.remove(phone);
    scene.remove(screenGlow);
}

async function animateHandcuffs() {
    const cuffs = createItemMesh('handcuffs');
    cuffs.scale.setScalar(2.2);
    // Drop from above onto the table toward the dealer
    cuffs.position.set(0, 1.8, -0.5);
    scene.add(cuffs);

    const dropStart = Date.now();
    await new Promise(resolve => {
        const anim = () => {
            const t = Math.min(1, (Date.now() - dropStart) / 400);
            const bounce = t < 0.7 ? t / 0.7 : 1 - ((t - 0.7) / 0.3) * 0.15;
            cuffs.position.y = lerpV(1.8, 1.12, bounce);
            cuffs.rotation.z += 0.08;
            if (t < 1) requestAnimationFrame(anim); else resolve();
        };
        anim();
    });

    await new Promise(r => setTimeout(r, 600));
    scene.remove(cuffs);
}

// Use a player item — returns a Promise that resolves when done
async function usePlayerItem(itemType) {
    const idx = state.playerInventory.indexOf(itemType);
    if (idx === -1) return;
    state.playerInventory.splice(idx, 1);
    sounds.playItemUse();
    updateUI();

    switch (itemType) {
        case 'cigarettes':
        case 'medication':
            if (state.playerCharges < state.maxCharges) {
                state.playerCharges++;
                updateUI();
                await Promise.all([animateCigarettes(), showMessage(`Used ${ITEM_NAMES[itemType]}. +1 HP.`, 1800)]);
            } else {
                await Promise.all([animateCigarettes(), showMessage(`Used ${ITEM_NAMES[itemType]}. Already at max HP!`, 1800)]);
            }
            break;

        case 'expired_med':
            state.playerCharges = Math.max(0, state.playerCharges - 1);
            updateUI();
            await Promise.all([animateExpiredMed(), showMessage('EXPIRED MED. Lost 1 HP!', 1800)]);
            break;

        case 'magnifying': {
            const next = state.chamber[0];
            const label = next ? 'LIVE' : 'BLANK';
            await Promise.all([animateMagnifying(), showMessage(`Next shell: ${label}`, 2500)]);
            break;
        }

        case 'beer': {
            const ejected = state.chamber.shift();
            if (ejected) state.liveRounds--; else state.blankRounds--;
            const label = ejected ? 'LIVE' : 'BLANK';
            await Promise.all([animateBeer(ejected), showMessage(`Beer: Ejected a ${label} shell.`, 2200)]);
            updateUI();
            break;
        }

        case 'handcuffs':
            state.dealerCuffed = true;
            await Promise.all([animateHandcuffs(), showMessage('Handcuffs! Dealer must shoot themselves next turn.', 2200)]);
            break;

        case 'phone':
            await Promise.all([animatePhone(), showMessage(`Phone: Dealer has ${state.dealerCharges} HP.`, 2200)]);
            break;

        case 'saw':
            state.sawActive = true;
            await Promise.all([animateSaw(), showMessage('SAW! Next shot deals double damage.', 2000)]);
            break;

        case 'inverter': {
            if (state.chamber.length > 0) {
                state.chamber[0] = !state.chamber[0];
                if (state.chamber[0]) { state.liveRounds++; state.blankRounds--; }
                else { state.liveRounds--; state.blankRounds++; }
                await Promise.all([animateInverter(), showMessage('Inverter: Next shell flipped!', 2000)]);
            } else {
                await showMessage('Inverter: Chamber is empty!', 1800);
            }
            break;
        }

        case 'knife': {
            if (state.dealerInventory.length === 0) {
                await Promise.all([animateKnife(), showMessage('Knife: Dealer has no items!', 1800)]);
            } else {
                const rIdx = Math.floor(Math.random() * state.dealerInventory.length);
                const stolen = state.dealerInventory.splice(rIdx, 1)[0];
                await Promise.all([animateKnife(), showMessage(`Knife: Removed dealer's ${ITEM_NAMES[stolen]}!`, 2200)]);
            }
            break;
        }

        default:
            break;
    }

    updateUI();
}

// Dealer AI item usage
async function dealerUseItems() {
    // Dealer uses magnifying glass first if available
    const magIdx = state.dealerInventory.indexOf('magnifying');
    if (magIdx !== -1) {
        state.dealerInventory.splice(magIdx, 1);
        state.dealerKnowsNextShell = true;
        state.dealerNextShellIsLive = state.chamber.length > 0 ? state.chamber[0] : false;
        await showMessage('Dealer uses MAGNIFYING GLASS.', 1600);
        sounds.playItemUse();
    }

    // If health == 1, use cigarettes or medication
    if (state.dealerCharges === 1) {
        const medIdx = state.dealerInventory.indexOf('cigarettes') !== -1
            ? state.dealerInventory.indexOf('cigarettes')
            : state.dealerInventory.indexOf('medication');
        if (medIdx !== -1) {
            const used = state.dealerInventory.splice(medIdx, 1)[0];
            if (state.dealerCharges < state.maxCharges) {
                state.dealerCharges++;
                updateUI();
            }
            await showMessage(`Dealer uses ${ITEM_NAMES[used]}.`, 1600);
            sounds.playItemUse();
        }
    }

    // If player has 1 charge, use saw to go for the kill
    if (state.playerCharges === 1 && !state.sawActive) {
        const sawIdx = state.dealerInventory.indexOf('saw');
        if (sawIdx !== -1) {
            state.dealerInventory.splice(sawIdx, 1);
            state.sawActive = true;
            await showMessage('Dealer uses SAW!', 1600);
            sounds.playItemUse();
        }
    }

    // Otherwise 40% chance to use a random item
    if (state.dealerInventory.length > 0 && Math.random() < 0.40) {
        const rIdx = Math.floor(Math.random() * state.dealerInventory.length);
        const item = state.dealerInventory.splice(rIdx, 1)[0];
        await applyDealerItem(item);
    }
}

async function applyDealerItem(itemType) {
    sounds.playItemUse();
    switch (itemType) {
        case 'cigarettes':
        case 'medication':
            if (state.dealerCharges < state.maxCharges) {
                state.dealerCharges++;
                updateUI();
            }
            await showMessage(`Dealer uses ${ITEM_NAMES[itemType]}.`, 1600);
            break;

        case 'expired_med':
            state.dealerCharges = Math.max(0, state.dealerCharges - 1);
            updateUI();
            await showMessage('Dealer uses EXPIRED MED. Oops.', 1600);
            break;

        case 'beer': {
            const ejected = state.chamber.shift();
            if (ejected) state.liveRounds--; else state.blankRounds--;
            const label = ejected ? 'LIVE' : 'BLANK';
            await showMessage(`Dealer uses BEER. Ejected a ${label}.`, 1800);
            // Reset dealer's knowledge since chamber shifted
            state.dealerKnowsNextShell = false;
            updateUI();
            break;
        }

        case 'handcuffs':
            state.playerCuffed = true;
            await showMessage('Dealer uses HANDCUFFS on you!', 1800);
            break;

        case 'phone':
            // Dealer already knows own HP, do nothing meaningful
            await showMessage('Dealer picks up the PHONE...', 1400);
            break;

        case 'saw':
            state.sawActive = true;
            await showMessage('Dealer uses SAW!', 1600);
            break;

        case 'inverter': {
            if (state.chamber.length > 0) {
                state.chamber[0] = !state.chamber[0];
                if (state.chamber[0]) {
                    state.liveRounds++;
                    state.blankRounds--;
                } else {
                    state.liveRounds--;
                    state.blankRounds++;
                }
                // Update dealer's knowledge
                state.dealerNextShellIsLive = state.chamber.length > 0 ? state.chamber[0] : false;
                await showMessage('Dealer uses INVERTER.', 1600);
            }
            break;
        }

        case 'knife': {
            if (state.playerInventory.length > 0) {
                const rIdx = Math.floor(Math.random() * state.playerInventory.length);
                const stolen = state.playerInventory.splice(rIdx, 1)[0];
                updateUI();
                await showMessage(`Dealer uses KNIFE. Your ${ITEM_NAMES[stolen]} is gone!`, 2000);
            } else {
                await showMessage('Dealer uses KNIFE. You had nothing.', 1600);
            }
            break;
        }

        case 'magnifying': {
            state.dealerKnowsNextShell = true;
            state.dealerNextShellIsLive = state.chamber.length > 0 ? state.chamber[0] : false;
            await showMessage('Dealer uses MAGNIFYING GLASS.', 1600);
            break;
        }

        default:
            break;
    }
    updateUI();
}

// =========== INITIALIZATION ===========
function init() {
    debug.textContent = 'init() called.';

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    document.getElementById('scene-container').appendChild(renderer.domElement);
    debug.textContent = 'Renderer created and attached.';

    // Scene & Camera
    scene = new THREE.Scene();
    new THREE.TextureLoader().load('claudeusetsasthebackround.jpg', (tex) => {
        scene.background = tex;
    });
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.8, 2);
    camera.lookAt(0, 1, 0);
    debug.textContent = 'Scene and Camera created.';

    // Lighting — single hanging bulb
    scene.add(new THREE.AmbientLight(0xfff0e0, 4.5));

    bulbLight = new THREE.PointLight(0xfff0c0, 18.0, 20, 1.2);
    bulbLight.position.set(0, 3.1, 0);
    bulbLight.castShadow = true;
    bulbLight.shadow.mapSize.width = 512;
    bulbLight.shadow.mapSize.height = 512;
    scene.add(bulbLight);

    // Visible bulb mesh
    const bulbMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffcc44, emissiveIntensity: 4 })
    );
    bulbMesh.position.set(0, 3.1, 0);
    scene.add(bulbMesh);

    // Cord from ceiling
    const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.9, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    cord.position.set(0, 3.55, 0);
    scene.add(cord);

    // Red hell-glow from under the table
    const underLight = new THREE.PointLight(0x8b0000, 1.0, 3.0, 2.0);
    underLight.position.set(0, 0.2, 0);
    scene.add(underLight);

    // Red backlight behind dealer
    const dealerBackLight = new THREE.PointLight(0x550000, 0.8, 4, 1.8);
    dealerBackLight.position.set(0, 2.0, -3.8);
    scene.add(dealerBackLight);

    debug.textContent = 'Lighting created.';

    // Room
    const floorMat    = new THREE.MeshStandardMaterial({ color: 0x1c1008, roughness: 1.0 });
    const wallTopMat  = new THREE.MeshStandardMaterial({ color: 0x1f0a0a, roughness: 1.0 });
    const wallBaseMat = new THREE.MeshStandardMaterial({ color: 0x120505, roughness: 1.0 });
    const ceilMat     = new THREE.MeshStandardMaterial({ color: 0x100808, roughness: 1.0 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);

    // Each wall has an upper panel and a darker wainscoting base
    function makeWall(rotY, px, pz) {
        const upper = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.8), wallTopMat);
        upper.rotation.y = rotY;
        upper.position.set(px, 2.6, pz);
        scene.add(upper);
        const base = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.2), wallBaseMat);
        base.rotation.y = rotY;
        base.position.set(px, 0.6, pz);
        scene.add(base);
        // Chair rail strip between panels
        const rail = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x3a1010, roughness: 0.7 }));
        rail.rotation.y = rotY;
        rail.position.set(px, 1.22, pz);
        scene.add(rail);
    }

    makeWall(0,           0,  -4);   // back wall
    makeWall(Math.PI / 2, -4,  0);   // left wall
    makeWall(-Math.PI / 2, 4,  0);   // right wall

    // Models
    const table = new TableModel(scene);
    table.setPosition(0, 1.0, 0);
    dealer = new DealerModel(scene);
    dealer.setPosition(0, 1.05, -1.05);
    setTimeout(() => { dealerHead = dealer.getHeadMesh(); }, 1000);
    shotgun = new ShotgunModel(scene);
    shotgun.setScale(0.2);
    shotgun.setPosition(shotgunInitialPos.x, shotgunInitialPos.y, shotgunInitialPos.z);
    shotgun.setRotation(0, -Math.PI / 2, 0);
    debug.textContent = 'Models created.';

    // Listeners
    ui.shootDealerBtn.addEventListener('click', () => handlePlayerChoice(true));
    ui.shootSelfBtn.addEventListener('click', () => handlePlayerChoice(false));
    renderer.domElement.addEventListener('click', (e) => {
        if (!offerMesh) return;
        mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.intersectObject(offerMesh, true).length > 0) {
            ui.offerPickupBtn.click();
        }
    });
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    debug.textContent = 'Event Listeners attached.';

    // Start
    updateUI();
    animate();
    runState();
    debug.textContent = 'Game loop started. Initialization complete.';
}

// =========== CORE GAME STATE MACHINE ===========
async function runState() {
    state.isAnimating = true;

    while (true) {
        // Player died → dealer wins this round
        if (state.playerCharges <= 0) {
            state.dealerRoundWins++;
            if (state.dealerRoundWins >= 2) {
                await showMessage('DEALER WINS', 3500);
                showGameOver();
                return;
            }
            await showMessage(`DEALER WINS ROUND ${state.round}`, 2500);
            state.round++;
            state.playerCharges = ROUND_MAX_CHARGES;
            state.dealerCharges = ROUND_MAX_CHARGES;
            state.maxCharges    = ROUND_MAX_CHARGES;
            state.playerInventory = [];
            state.dealerInventory = [];
            state.sawActive       = false;
            state.dealerCuffed    = false;
            state.playerCuffed    = false;
            state.dealerKnowsNextShell = false;
            state.chamber = [];
            updateUI();
            await showMessage(`ROUND ${state.round}`, 2500);
        }

        // Dealer died → player wins this round
        if (state.dealerCharges <= 0) {
            state.playerRoundWins++;
            await dealer.deathFall();
            if (state.playerRoundWins >= 2) {
                await showMessage('YOU WIN', 5000);
                showGameOver();
                return;
            }
            await showMessage(`YOU WIN ROUND ${state.round}`, 2500);
            state.round++;
            state.playerCharges = ROUND_MAX_CHARGES;
            state.dealerCharges = ROUND_MAX_CHARGES;
            state.maxCharges    = ROUND_MAX_CHARGES;
            state.playerInventory = [];
            state.dealerInventory = [];
            state.sawActive       = false;
            state.dealerCuffed    = false;
            state.playerCuffed    = false;
            state.dealerKnowsNextShell = false;
            state.chamber = [];
            dealer.resetPose();
            updateUI();
            await showMessage(`ROUND ${state.round}`, 2500);
        }

        // Check for reload
        if (state.chamber.length === 0) {
            await showMessage("Reloading...", 1500);
            loadNewRound();
            state.isPlayerTurn = true; // player always gets the gun after reload
            updateUI(true);
            await showMessage(`Loaded ${state.liveRounds} Live, ${state.blankRounds} Blank.`, 2500);
            updateUI();
            // Distribute items to both sides on reload
            trySpawnItem(false); // dealer gets item silently
            await offerItemToPlayer(); // player gets offered an item
        }

        // Determine whose turn it is
        if (state.isPlayerTurn) {
            ui.playerActions.classList.remove('hidden');
            state.isAnimating = false;
            return; // Exit the loop to wait for player input
        } else {
            await dealerTurn();
        }
    }
}

function showGameOver() {
    ui.gameOverScreen.classList.remove('hidden');
    ui.restartBtn.addEventListener('click', () => {
        window.location.reload();
    }, { once: true });
}

async function handlePlayerChoice(isShootingDealer) {
    if (state.isAnimating) return;
    initAudio();
    state.isAnimating = true;
    ui.playerActions.classList.add('hidden');

    // Handle player cuffed — force self-shot
    if (state.playerCuffed) {
        isShootingDealer = false;
        state.playerCuffed = false;
        await showMessage('You are cuffed! Forced to shoot self.', 2000);
    }

    const targetPos = isShootingDealer ? new THREE.Vector3(0, 1.5, -0.6) : new THREE.Vector3(0, 1.5, 0.6);
    const targetRot = isShootingDealer
        ? new THREE.Euler(0, Math.PI / 2, 0)
        : new THREE.Euler(-0.3, -Math.PI / 2, 0);
    await animateShotgun(targetPos, targetRot);

    const wasLive = fireShell();
    if (wasLive) {
        sounds.playShot();
        createMuzzleFlash();
        ejectShell(true);
        await triggerShotEffects();
    } else {
        sounds.playClick();
        ejectShell(false);
    }

    // Saw damage calculation
    const damage = (wasLive && state.sawActive) ? 2 : 1;
    if (wasLive) state.sawActive = false;
    // If not live, clear saw anyway (shot was wasted)
    if (!wasLive) state.sawActive = false;

    if (isShootingDealer) {
        if (wasLive) {
            state.dealerCharges = Math.max(0, state.dealerCharges - damage);
            createBloodSplatter(targetPos);
            const hitMsg = damage > 1 ? `BANG. Dealer hit for ${damage} damage!` : 'BANG. Dealer hit.';
            await Promise.all([dealer.fallBack(), showMessage(hitMsg)]);
        } else {
            await showMessage("Click. Blank.");
        }
        state.isPlayerTurn = false;
    } else {
        if (wasLive) {
            state.playerCharges = Math.max(0, state.playerCharges - damage);
            const hitMsg = damage > 1 ? `BANG. You shot yourself for ${damage} damage!` : 'BANG. You shot yourself.';
            flashBloodScreen();
            await showMessage(hitMsg);
            createBloodSplatter(targetPos);
            state.isPlayerTurn = false;
        } else {
            await showMessage("Click. Blank. Your turn again.");
            state.isPlayerTurn = true;
        }
    }

    await animateShotgun(shotgunInitialPos, new THREE.Euler(0, -Math.PI / 2, 0));
    updateUI();
    state.isAnimating = false;

    // Offer item to player after their turn
    await offerItemToPlayer();

    runState();
}

async function dealerTurn() {
    await showMessage("Dealer's turn.", 1500);

    // Handle dealer cuffed
    if (state.dealerCuffed) {
        state.dealerCuffed = false;
        await showMessage("Dealer is cuffed! Skipping turn.", 2200);
        state.isPlayerTurn = true;
        await animateShotgun(shotgunInitialPos, new THREE.Euler(0, -Math.PI / 2, 0));
        updateUI();
        // Spawn item for dealer silently
        trySpawnItem(false);
        return;
    }

    // Dealer uses items before deciding
    await dealerUseItems();

    // Dealer decision: use knowledge if available, otherwise go by probability
    let shootPlayer;
    if (state.dealerKnowsNextShell) {
        // Dealer knows next shell
        if (state.dealerNextShellIsLive) {
            // Next is live — shoot player for damage
            shootPlayer = true;
        } else {
            // Next is blank — shoot self to keep turn
            shootPlayer = false;
        }
        state.dealerKnowsNextShell = false;
    } else {
        shootPlayer = state.liveRounds > state.blankRounds;
    }

    const targetPos = shootPlayer ? new THREE.Vector3(0, 1.5, 0.6) : new THREE.Vector3(0, 1.5, -0.6);
    const targetRot = shootPlayer
        ? new THREE.Euler(-0.3, -Math.PI / 2, 0)
        : new THREE.Euler(0, Math.PI / 2, 0);

    // Dealer reaches out to grab the gun; gun slides toward their hand simultaneously
    const grabPos = new THREE.Vector3(0.18, 1.3, -0.15);
    const grabRot = new THREE.Euler(0, Math.PI / 2, 0);
    await Promise.all([
        dealer.reachOut(),
        animateShotgun(grabPos, grabRot),
    ]);
    await new Promise(r => setTimeout(r, 250));

    // Dealer aims and fires
    await animateShotgun(targetPos, targetRot);

    const wasLive = fireShell();
    if (wasLive) {
        sounds.playShot();
        createMuzzleFlash();
        ejectShell(true);
        await triggerShotEffects();
    } else {
        sounds.playClick();
        ejectShell(false);
    }

    // Saw damage calculation for dealer
    const damage = (wasLive && state.sawActive) ? 2 : 1;
    state.sawActive = false;

    if (shootPlayer) {
        if (wasLive) {
            state.playerCharges = Math.max(0, state.playerCharges - damage);
            const hitMsg = damage > 1 ? `BANG. You've been hit for ${damage} damage!` : "BANG. You've been hit.";
            flashBloodScreen();
            await showMessage(hitMsg);
            createBloodSplatter(targetPos);
        } else {
            await showMessage("Click. Dealer shot a blank.");
        }
        state.isPlayerTurn = true;
    } else {
        if (wasLive) {
            state.dealerCharges = Math.max(0, state.dealerCharges - damage);
            createBloodSplatter(targetPos);
            const hitMsg = damage > 1 ? `BANG. Dealer shot himself for ${damage} damage!` : 'BANG. Dealer shot himself.';
            await Promise.all([dealer.fallBack(), showMessage(hitMsg)]);
            state.isPlayerTurn = true;
        } else {
            await showMessage("Click. Dealer shot a blank. His turn again.");
            state.isPlayerTurn = false;
        }
    }

    await Promise.all([
        animateShotgun(shotgunInitialPos, new THREE.Euler(0, -Math.PI / 2, 0)),
        dealer.retractArm(),
    ]);
    updateUI();

    // Spawn item for dealer silently
    trySpawnItem(false);
}

// =========== HELPERS & ANIMATIONS ===========
function loadNewRound() {
    sounds.playReload();
    const total = Math.floor(Math.random() * 5) + 2;
    state.liveRounds = Math.max(1, Math.floor(total / 2) + (Math.random() > 0.5 ? 1 : -1));
    state.blankRounds = total - state.liveRounds;
    state.chamber = [...Array(state.liveRounds).fill(true), ...Array(state.blankRounds).fill(false)];
    for (let i = state.chamber.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.chamber[i], state.chamber[j]] = [state.chamber[j], state.chamber[i]];
    }
    // Reset shell knowledge on reload
    state.dealerKnowsNextShell = false;
}

function fireShell() {
    const shell = state.chamber.shift();
    if (shell) state.liveRounds--; else state.blankRounds--;
    return shell;
}

async function triggerShotEffects() {
    shakeCamera(0.14, 300);
    await animateRecoil();
}

function updateUI(showShells = false) {
    const pWins = '★'.repeat(state.playerRoundWins) + '☆'.repeat(2 - state.playerRoundWins);
    const dWins = '★'.repeat(state.dealerRoundWins) + '☆'.repeat(2 - state.dealerRoundWins);
    ui.roundDisplay.textContent = `Round ${state.round}  |  You ${pWins} vs ${dWins} Dealer`;

    let playerHTML = '';
    for (let i = 0; i < state.playerCharges; i++) playerHTML += '<span class="charge-live">&#9679;</span> ';
    for (let i = 0; i < state.maxCharges - state.playerCharges; i++) playerHTML += '<span class="charge-dead">&#9675;</span> ';
    ui.playerCharges.innerHTML = playerHTML.trim();

    let dealerHTML = '';
    for (let i = 0; i < state.dealerCharges; i++) dealerHTML += '<span class="charge-live">&#9679;</span> ';
    for (let i = 0; i < state.maxCharges - state.dealerCharges; i++) dealerHTML += '<span class="charge-dead">&#9675;</span> ';
    ui.dealerCharges.innerHTML = dealerHTML.trim();

    if (showShells) {
        ui.shellInfo.innerHTML = `Loaded: <span style="color:#f55">${state.liveRounds} LIVE</span>, <span style="color:#5bf">${state.blankRounds} BLANK</span>`;
        ui.shellInfo.classList.remove('hidden');
    } else {
        ui.shellInfo.classList.add('hidden');
    }

    // Render player inventory
    ui.playerInventory.innerHTML = '';
    for (const item of state.playerInventory) {
        const btn = document.createElement('button');
        btn.className = 'item-btn';
        btn.textContent = ITEM_NAMES[item] || item;
        btn.addEventListener('click', async () => {
            if (state.isAnimating) return;
            // Prevent clicks during item use by setting animating flag briefly
            state.isAnimating = true;
            ui.playerActions.classList.add('hidden');
            await usePlayerItem(item);
            // Check game over conditions after item use
            if (state.playerCharges <= 0 || state.dealerCharges <= 0) {
                state.isAnimating = false;
                runState();
                return;
            }
            // Check if chamber became empty (e.g. beer ejected last shell)
            if (state.chamber.length === 0) {
                state.isAnimating = false;
                runState();
                return;
            }
            state.isAnimating = false;
            ui.playerActions.classList.remove('hidden');
            updateUI();
        });
        ui.playerInventory.appendChild(btn);
    }
}

function showMessage(msg, duration = 2000) {
    return new Promise(resolve => {
        ui.messageBox.textContent = msg;
        ui.messageBox.classList.remove('hidden');
        setTimeout(() => {
            ui.messageBox.classList.add('hidden');
            resolve();
        }, duration);
    });
}

function flashBloodScreen() {
    const ov = ui.bloodOverlay;
    if (!ov) return;
    ov.classList.remove('blood-flash');
    void ov.offsetWidth; // force reflow to restart animation
    ov.classList.add('blood-flash');
    setTimeout(() => ov.classList.remove('blood-flash'), 900);
}

function ejectShell(isLive) {
    const shellMat = new THREE.MeshStandardMaterial({
        color: isLive ? 0xcc3300 : 0x3355aa,
        metalness: 0.7, roughness: 0.3, transparent: true
    });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.013, 0.07, 10), shellMat);
    const startPos = shotgun.getGroup().position.clone();
    startPos.y += 0.04;
    shell.position.copy(startPos);
    scene.add(shell);

    const endPos = startPos.clone().add(new THREE.Vector3(
        0.65 + Math.random() * 0.35,
        0.22 + Math.random() * 0.18,
        (Math.random() - 0.5) * 0.3
    ));
    const ejStart = Date.now();
    const anim = () => {
        const t = Math.min(1, (Date.now() - ejStart) / 520);
        shell.position.lerpVectors(startPos, endPos, t);
        shell.position.y = lerpV(startPos.y, endPos.y, t) + Math.sin(t * Math.PI) * 0.22;
        shell.rotation.z += 0.32;
        shell.rotation.x += 0.18;
        shellMat.opacity = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
        if (t < 1) requestAnimationFrame(anim); else scene.remove(shell);
    };
    anim();
}

function spawnMuzzleSmoke() {
    const barrelEnd = new THREE.Vector3(3.2, 0.05, 0);
    shotgun.getGroup().localToWorld(barrelEnd);
    spawnSmoke(barrelEnd, 28);
}

function createWallBlood(hitPos) {
    const splatMat = new THREE.MeshStandardMaterial({ color: 0x550000, roughness: 1.0, transparent: true, opacity: 0.88, depthWrite: false });
    const count = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
        const r = 0.05 + Math.random() * 0.16;
        const splat = new THREE.Mesh(new THREE.CircleGeometry(r, 16), splatMat.clone());
        splat.position.set(
            hitPos.x + (Math.random() - 0.5) * 1.4,
            hitPos.y + (Math.random() - 0.5) * 0.9 + Math.random() * 0.2,
            -3.96
        );
        scene.add(splat);

        // Drip streak
        if (Math.random() < 0.6) {
            const dripH = 0.12 + Math.random() * 0.5;
            const drip = new THREE.Mesh(
                new THREE.PlaneGeometry(0.02 + Math.random() * 0.025, dripH),
                splatMat.clone()
            );
            drip.position.set(splat.position.x + (Math.random()-0.5)*0.08, splat.position.y - dripH/2 - r, -3.96);
            scene.add(drip);
        }
    }
}

function createMuzzleFlash() {
    const barrelEnd = new THREE.Vector3(3.2, 0.05, 0);
    shotgun.getGroup().localToWorld(barrelEnd);

    // White core + orange bloom
    const flashCore = new THREE.PointLight(0xffffff, 22, 2.8, 2);
    flashCore.position.copy(barrelEnd);
    scene.add(flashCore);
    const flashBloom = new THREE.PointLight(0xff6600, 9, 4.5, 1.5);
    flashBloom.position.copy(barrelEnd);
    scene.add(flashBloom);

    setTimeout(() => {
        scene.remove(flashCore);
        scene.remove(flashBloom);
        spawnMuzzleSmoke();
    }, 140);
}

function animateShotgun(targetPos, targetRot) {
    return new Promise(resolve => {
        const startPos = shotgun.getGroup().position.clone();
        const startQuat = shotgun.getGroup().quaternion.clone();
        const targetQuat = new THREE.Quaternion().setFromEuler(targetRot);
        const duration = 400;
        const startTime = Date.now();
        const anim = () => {
            const t = Math.min(1, (Date.now() - startTime) / duration);
            shotgun.getGroup().position.lerpVectors(startPos, targetPos, t);
            shotgun.getGroup().quaternion.slerpQuaternions(startQuat, targetQuat, t);
            if (t < 1) {
                requestAnimationFrame(anim);
            } else {
                setTimeout(resolve, 300);
            }
        };
        anim();
    });
}

function animateRecoil() {
    shotgun.firePump(0.2);

    const recoilAmount = 0.2;
    const recoilDuration = 50;
    const returnDuration = 300;
    const startPos = shotgun.getGroup().position.clone();

    const yRotation = shotgun.getGroup().rotation.y;
    const isFacingDealer = Math.abs(yRotation - Math.PI / 2) < 0.1;
    const recoilDirection = isFacingDealer ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 0, -1);
    const recoilPos = startPos.clone().add(recoilDirection.multiplyScalar(recoilAmount));

    const startTime = Date.now();
    const animLoop = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < recoilDuration) {
            const t = elapsed / recoilDuration;
            shotgun.getGroup().position.lerpVectors(startPos, recoilPos, t);
        } else if (elapsed < recoilDuration + returnDuration) {
            const t = (elapsed - recoilDuration) / returnDuration;
            shotgun.getGroup().position.lerpVectors(recoilPos, startPos, t);
        } else {
            shotgun.getGroup().position.copy(startPos);
            return;
        }
        requestAnimationFrame(animLoop);
    };
    animLoop();

    return new Promise(resolve => setTimeout(resolve, recoilDuration + returnDuration));
}

function shakeCamera(intensity, duration) {
    const start = Date.now();
    const originalPos = camera.position.clone();
    const shake = () => {
        if (Date.now() - start < duration) {
            camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity;
            camera.position.y = originalPos.y + (Math.random() - 0.5) * intensity;
            requestAnimationFrame(shake);
        } else {
            camera.position.copy(originalPos);
        }
    };
    shake();
}

function createBloodSplatter(position) {
    const LIFETIME = 3200;
    const particleCount = 180;
    const sprayDir = new THREE.Vector3(0, 0.35, 1).normalize();
    const positions = [];
    const velocities = [];
    const sizes = [];

    for (let i = 0; i < particleCount; i++) {
        positions.push(position.x, position.y, position.z);
        const spread = new THREE.Vector3(
            (Math.random() - 0.5) * 2.6,
            (Math.random() - 0.5) * 2.6,
            (Math.random() - 0.5) * 2.6
        );
        const vel = sprayDir.clone().add(spread).normalize();
        vel.multiplyScalar(0.04 + Math.random() * 0.09);
        velocities.push(vel);
        sizes.push(0.04 + Math.random() * 0.30);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        color: 0xaa0000,
        size: 0.16,
        transparent: true,
        depthWrite: false,
        opacity: 1.0,
    });
    const system = new THREE.Points(geo, mat);
    scene.add(system);

    // Larger persistent pool
    const poolGeo = new THREE.CircleGeometry(0.26 + Math.random() * 0.22, 32);
    const poolMat = new THREE.MeshStandardMaterial({
        color: 0x3a0000,
        transparent: true,
        opacity: 0,
        roughness: 1,
        depthWrite: false,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    const poolY = position.y > 1.1 ? 1.03 : 0.02;
    pool.position.set(
        position.x + (Math.random() - 0.5) * 0.3,
        poolY,
        position.z + (Math.random() - 0.5) * 0.3
    );
    scene.add(pool);

    // Wall blood when hitting dealer side
    if (position.z < 0) createWallBlood(position);

    particles.push({ system, velocities, sizes, pool, poolMat, startTime: Date.now(), lifetime: LIFETIME });
}

function animate() {
    requestAnimationFrame(animate);

    // Flicker overhead bulb
    if (bulbLight) {
        const nowF = Date.now();
        if (nowF - flickerTimer > 60 + Math.random() * 140) {
            flickerTimer = nowF;
            bulbLight.intensity = Math.random() < 0.07
                ? 0.4 + Math.random() * 1.5   // rare hard flicker
                : 5.0 + Math.random() * 0.8;  // normal slight variation
        }
    }

    const now = Date.now();
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const elapsedTime = now - p.startTime;
        const t = elapsedTime / p.lifetime;

        if (elapsedTime > p.lifetime) {
            scene.remove(p.system);
            if (p.pool) scene.remove(p.pool);
            if (p.poolMat) p.poolMat.dispose();
            particles.splice(i, 1);
            continue;
        }

        const positions = p.system.geometry.attributes.position.array;
        for (let j = 0; j < p.velocities.length; j++) {
            p.velocities[j].y -= 0.0022;
            positions[j * 3]     += p.velocities[j].x;
            positions[j * 3 + 1] += p.velocities[j].y;
            positions[j * 3 + 2] += p.velocities[j].z;
        }
        p.system.geometry.attributes.position.needsUpdate = true;
        p.system.material.opacity = t < 0.6 ? 1.0 : 1.0 - ((t - 0.6) / 0.4);

        if (p.poolMat) {
            p.poolMat.opacity = Math.min(0.82, elapsedTime / 600 * 0.82);
        }
    }

    if (dealerHead) {
        dealerHead.lookAt(camera.position);
    }

    // Animate offered item — bob and spin
    if (offerMesh) {
        const t = (Date.now() - offerMeshSpawnTime) / 1000;
        offerMesh.position.y = offerMeshBaseY + Math.sin(t * 2.5) * 0.04;
        offerMesh.rotation.y += 0.025;
        if (offerGlow) {
            offerGlow.position.y = offerMesh.position.y + 0.1;
            offerGlow.intensity = 1.8 + Math.sin(t * 3) * 0.4;
        }
    }

    renderer.render(scene, camera);
}

// =========== AUDIO ===========
function makeNoise(duration) {
    const samples = Math.ceil(audioCtx.sampleRate * duration);
    const buf = audioCtx.createBuffer(1, samples, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    return src;
}

const sounds = {
    playShot: () => {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;

        const thump = audioCtx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(120, t);
        thump.frequency.exponentialRampToValueAtTime(30, t + 0.18);
        const thumpGain = audioCtx.createGain();
        thumpGain.gain.setValueAtTime(2.5, t);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        thump.connect(thumpGain).connect(audioCtx.destination);
        thump.start(t); thump.stop(t + 0.25);

        const crack = makeNoise(0.08);
        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1800;
        bandpass.Q.value = 0.8;
        const crackGain = audioCtx.createGain();
        crackGain.gain.setValueAtTime(3.0, t);
        crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        crack.connect(bandpass).connect(crackGain).connect(audioCtx.destination);
        crack.start(t); crack.stop(t + 0.08);

        const blast = makeNoise(0.45);
        const hipass = audioCtx.createBiquadFilter();
        hipass.type = 'highpass';
        hipass.frequency.value = 300;
        const blastGain = audioCtx.createGain();
        blastGain.gain.setValueAtTime(0.8, t);
        blastGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        blast.connect(hipass).connect(blastGain).connect(audioCtx.destination);
        blast.start(t); blast.stop(t + 0.45);
    },

    playClick: () => {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;

        const tick = makeNoise(0.025);
        const hp = audioCtx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 4000;
        const tickGain = audioCtx.createGain();
        tickGain.gain.setValueAtTime(1.2, t);
        tickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        tick.connect(hp).connect(tickGain).connect(audioCtx.destination);
        tick.start(t); tick.stop(t + 0.025);

        const ring = audioCtx.createOscillator();
        ring.type = 'sine';
        ring.frequency.setValueAtTime(3200, t);
        ring.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
        const ringGain = audioCtx.createGain();
        ringGain.gain.setValueAtTime(0.25, t);
        ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        ring.connect(ringGain).connect(audioCtx.destination);
        ring.start(t); ring.stop(t + 0.12);
    },

    playReload: () => {
        if (!audioCtx) return;

        [0, 0.18, 0.36].forEach(offset => {
            const t = audioCtx.currentTime + offset;

            const clack = makeNoise(0.06);
            const bp = audioCtx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 900;
            bp.Q.value = 1.5;
            const clackGain = audioCtx.createGain();
            clackGain.gain.setValueAtTime(0.9, t);
            clackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            clack.connect(bp).connect(clackGain).connect(audioCtx.destination);
            clack.start(t); clack.stop(t + 0.06);

            const tone = audioCtx.createOscillator();
            tone.type = 'sine';
            tone.frequency.setValueAtTime(280 + Math.random() * 80, t);
            const toneGain = audioCtx.createGain();
            toneGain.gain.setValueAtTime(0.15, t);
            toneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            tone.connect(toneGain).connect(audioCtx.destination);
            tone.start(t); tone.stop(t + 0.08);
        });

        const pumpT = audioCtx.currentTime + 0.6;
        const pump = makeNoise(0.1);
        const pumpBp = audioCtx.createBiquadFilter();
        pumpBp.type = 'bandpass';
        pumpBp.frequency.value = 500;
        pumpBp.Q.value = 0.7;
        const pumpGain = audioCtx.createGain();
        pumpGain.gain.setValueAtTime(1.4, pumpT);
        pumpGain.gain.exponentialRampToValueAtTime(0.001, pumpT + 0.1);
        pump.connect(pumpBp).connect(pumpGain).connect(audioCtx.destination);
        pump.start(pumpT); pump.stop(pumpT + 0.1);
    },

    playPickup: () => {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(800, t + 0.15);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.15);
    },

    playItemUse: () => {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.10);
    },
};

function initAudio() {
    if (!audioCtx) {
        audioCtx = new window.AudioContext();
    }
}

// =========== GO! ===========
try {
    init();
} catch (e) {
    debug.style.display = 'block';
    debug.textContent = `FATAL ERROR: ${e.message}`;
    console.error(e);
}
