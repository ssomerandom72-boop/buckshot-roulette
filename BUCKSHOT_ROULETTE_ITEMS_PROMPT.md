# BUCKSHOT ROULETTE - COMPLETE ITEMS & MECHANICS GUIDE

## CORE GAME MECHANICS

### Game Loop
1. Load a random chamber with 2-8 shells total
2. Live rounds and blank rounds are randomly distributed in the chamber
3. Players take turns shooting (either at opponent or themselves)
4. Each round fired removes a shell from the chamber
5. When chamber is empty, reload with a new random distribution
6. First player to reach 0 health loses

### Health System
- Both player and dealer start with 3 health
- Taking a live round = lose 1 health
- Taking a blank round = survive, no damage
- Game ends when someone reaches 0 health

---

## ITEMS (PICKUPS)

Items appear randomly after each turn. Players can use them during their turn. Each item can only be used once per pickup.

### 1. **CIGARETTES** 🚬
- **Effect:** Restore 1 health (max 3)
- **Visual:** A pack of cigarettes
- **Animation:** Player smokes, health increases
- **Code Logic:**
  ```
  if (playerHealth < maxHealth):
    playerHealth += 1
    remove item from inventory
    play smoke animation
  ```

### 2. **MEDICATION** 💊
- **Effect:** Restore 1 health (max 3)
- **Visual:** A pill bottle or medical cross
- **Animation:** Player takes pill, health increases
- **Code Logic:** Same as cigarettes
- **Note:** Can stack with cigarettes (both restore 1 HP, same effect)

### 3. **MAGNIFYING GLASS** 🔍
- **Effect:** Peek at the next shell in the chamber
- **Visual:** A magnifying glass icon
- **Shows:** Either "LIVE" (red) or "BLANK" (blue) shell
- **Animation:** Screen zoom in on chamber, reveal shell type
- **Code Logic:**
  ```
  show nextShell = chamber[0]
  if nextShell == true:
    display "LIVE ROUND"
  else:
    display "BLANK ROUND"
  remove item from inventory
  ```
- **Strategy:** Helps decide whether to shoot dealer or yourself

### 4. **BEER** 🍺
- **Effect:** Eject (remove) the next shell from the chamber
- **Visual:** A beer bottle or glass
- **Animation:** Shell ejects, slides away from gun
- **Code Logic:**
  ```
  ejected_shell = chamber.removeAt(0)
  display "Shell ejected: [LIVE/BLANK]"
  if chamber.length == 0:
    trigger reload
  remove item from inventory
  ```
- **Strategy:** Removes a live round to make it safer, OR removes a blank to make it more dangerous for opponent

### 5. **HANDCUFFS** 🔗
- **Effect:** Lock the opponent in place for their next turn
- **Visual:** Metal handcuffs or chain link icon
- **Animation:** Opponent is visually restrained
- **Code Logic:**
  ```
  if item == "handcuffs":
    opponent.isLocked = true
  when opponent.turn == true:
    if opponent.isLocked:
      opponent.canPlay = false
      opponent.takesExtraDamage = true (or just skip their turn)
      opponent.isLocked = false
  ```
- **Effect Details:** When locked, opponent MUST shoot themselves and cannot choose to shoot you
- **Duration:** Only affects the opponent's next immediate turn

### 6. **PHONE** 📱
- **Effect:** See the dealer's current health
- **Visual:** A smartphone or mobile device
- **Animation:** Phone screen shows dealer's HP bar
- **Code Logic:**
  ```
  if item == "phone":
    show dealerHealth (e.g., "Dealer: I I O" or 2/3 health)
  remove item from inventory
  ```
- **Strategy:** Know if dealer is close to death

### 7. **SAW** 🪚
- **Effect:** Makes the next shot deal double damage (2 HP instead of 1)
- **Visual:** A handsaw or blade
- **Animation:** Gun transforms/darkens, saw effect on barrel
- **Code Logic:**
  ```
  if item == "saw":
    nextShot.damage = 2
    sawActive = true
  
  when player shoots:
    if sawActive && wasLive:
      target.health -= 2
    else:
      target.health -= 1
    sawActive = false
  ```
- **Duration:** Only affects the very next shot (whether it's live or blank doesn't matter)
- **Stack Note:** Saw damage stacks with multiple shots (each shot with saw does 2 damage)

### 8. **INVERTER** ⚫⚪
- **Effect:** Swap the next shell - live becomes blank, blank becomes live
- **Visual:** A circle half black/half white (yin-yang style)
- **Animation:** Shell in chamber inverts/flips color
- **Code Logic:**
  ```
  if item == "inverter":
    chamber[0] = !chamber[0]  // true becomes false, false becomes true
    display "Shell inverted"
  remove item from inventory
  ```
- **Strategy:** Turn a dangerous live round into a blank, or vice versa
- **Use Cases:** 
  - If you see a live round with magnifying glass, invert it to make it blank
  - Invert a blank to make opponent's shot dangerous

### 9. **KNIFE** 🔪
- **Effect:** Remove an item from the opponent's inventory
- **Visual:** A blade or dagger
- **Animation:** Knife swipes across screen, item disappears from opponent's UI
- **Code Logic:**
  ```
  if item == "knife":
    if opponent.inventory.length > 0:
      randomItem = opponent.inventory[random(0, length)]
      opponent.inventory.remove(randomItem)
      display "Stole [ITEM NAME]"
    else:
      display "Opponent has no items"
  remove item from inventory
  ```
- **Strategy:** Steal a powerful item before opponent can use it

### 10. **EXPIRED MEDICATION** 💊❌
- **Effect:** Lose 1 health (negative effect - a trap!)
- **Visual:** A pill bottle with an X or red tint
- **Animation:** Player takes pill, coughs, loses HP
- **Code Logic:**
  ```
  if item == "expired_med":
    if playerHealth > 0:
      playerHealth -= 1
    display "Expired medication - health decreased!"
  remove item from inventory
  ```
- **Strategy:** Avoid picking this up, or force opponent to take it with knife
- **Spawn Rate:** Lower than other items (rare)

---

## ITEM INVENTORY SYSTEM

### Inventory Mechanics
- Player can hold **up to 3 items** at a time
- New items appear after each round (dealer or player turn)
- Items stack in order (queue-like)
- Player chooses which item to use during their turn
- If inventory is full, new items disappear (cannot pick up)

### UI Display
```
Player Inventory:
[1] ITEM_NAME  <- Can select and use
[2] ITEM_NAME
[3] ITEM_NAME
(Full - no new items will drop)
```

### Code Structure
```javascript
class Player {
  inventory: Item[] = [];
  maxInventorySize = 3;
  
  addItem(item) {
    if (this.inventory.length < this.maxInventorySize) {
      this.inventory.push(item);
      return true;
    }
    return false; // Inventory full
  }
  
  useItem(itemIndex) {
    if (itemIndex < this.inventory.length) {
      let item = this.inventory[itemIndex];
      item.activate(); // Execute item effect
      this.inventory.splice(itemIndex, 1);
    }
  }
}
```

---

## ITEM DROP SYSTEM

### WHEN ITEMS APPEAR (Critical!)
Items spawn **automatically after each turn completes**:

1. **After player shoots** → Item appears
2. **After dealer shoots** → Item appears
3. Happens regardless of whether shot was live or blank
4. Happens regardless of who won the exchange

### HOW ITEMS SPAWN (Step by Step)

```javascript
// After each turn:
function endTurn() {
  // ... finish turn logic ...
  
  // ITEM SPAWNING
  if (Math.random() < 0.9) { // 90% chance an item spawns
    let randomItem = getRandomItem(); // Pick from weighted list
    spawnItemOnScreen(randomItem);
  }
}

function spawnItemOnScreen(item) {
  // 1. Choose random position (center area of screen)
  let posX = screenWidth/2 + random(-200, 200);
  let posY = screenHeight/2 + random(-150, 150);
  
  // 2. Create visual representation
  // - Glowing 3D model or 2D sprite
  // - Animated bob up and down
  // - Particle effects around it
  
  // 3. Wait for player input
  // - If player clicks item: attempt pickup
  // - If 5 seconds pass: item disappears
  
  // 4. On click/pickup
  if (currentPlayer.inventory.length < 3) {
    currentPlayer.addItem(item);
    removeItemFromScreen();
    playPickupSound();
  } else {
    showMessage("Inventory full!");
    // Item disappears after 3 more seconds
  }
}
```

### VISUAL FLOW
```
Turn ends
    ↓
[60-90% chance] Random item spawns in center
    ↓
Item floats on screen with glow effect
    ↓
Player has 5 seconds to click it
    ↓
   /                    \
  /                      \
Player clicks          Time expires
(Inventory < 3)        (Inventory full)
   |                      |
 Pickup!              Disappear
   |                      |
Add to inventory      Item gone
```

### Spawn Probabilities (Weighted Random Selection)
When an item IS going to spawn, use these weights:

```
Total weight = 100

CIGARETTES:     15% ███░░░░░░░
MEDICATION:     15% ███░░░░░░░
MAGNIFYING:     12% ██░░░░░░░░
BEER:           12% ██░░░░░░░░
SAW:            12% ██░░░░░░░░
HANDCUFFS:      10% ██░░░░░░░░
PHONE:          10% ██░░░░░░░░
INVERTER:       10% ██░░░░░░░░
KNIFE:           8% █░░░░░░░░░
EXPIRED_MED:     6% █░░░░░░░░░
(No item):      10% ██░░░░░░░░ (nothing spawns this turn)
```

**Implementation:**
```javascript
function getRandomItem() {
  const itemWeights = {
    "cigarettes": 15,
    "medication": 15,
    "magnifying": 12,
    "beer": 12,
    "saw": 12,
    "handcuffs": 10,
    "phone": 10,
    "inverter": 10,
    "knife": 8,
    "expired_med": 6
  };
  
  let random = Math.random() * 100;
  let sum = 0;
  
  for (let [item, weight] of Object.entries(itemWeights)) {
    sum += weight;
    if (random < sum) return item;
  }
}
```

### ITEM PICKUP REQUIREMENTS

For item to be picked up:
1. ✅ Item must be on screen
2. ✅ Player clicks/taps on item
3. ✅ Player inventory must have space (< 3 items)
4. ✅ Turn must be waiting for player action

If ANY condition fails:
- Item disappears after 5 seconds
- No pickup occurs
- Message displays (e.g., "Inventory full!")

### RESPAWN RULES

**Items do NOT respawn if:**
- Picked up (obvious)
- Inventory is full and timer expires
- Another turn starts before pickup

**Items always spawn fresh after each turn** - previous items are gone

### VISUAL PRESENTATION (How items look on screen)

Each item should have:
1. **3D Model or Sprite** - Recognizable icon/object
2. **Glow/Shine Effect** - Makes it stand out
3. **Floating Animation** - Bobs up/down slightly
4. **Label Text** - Name displayed below (e.g., "CIGARETTES")
5. **Rarity Color** - Optional (common = blue, rare = orange)
6. **Pickup Prompt** - "Click to pick up" on hover
7. **Timer Display** - Show remaining time (optional)

### EXAMPLE: Complete Item Spawn Sequence

```javascript
// Turn ends
playerTurn(); // Returns
dealerTurn(); // Returns

// Item spawn check
if (Math.random() < 0.9) { // 90% chance
  
  // Get random item from weighted pool
  const itemType = getRandomItem(); // "magnifying" for example
  
  // Create item object
  const newItem = {
    type: itemType,
    name: "Magnifying Glass",
    position: { x: 400, y: 300 }, // Center screen
    spawnTime: Date.now(),
    visible: true
  };
  
  // Add to screen
  addItemToScene(newItem);
  
  // Start 5 second timer
  setTimeout(() => {
    if (newItem.visible) {
      removeItemFromScene(newItem);
    }
  }, 5000);
  
  // Listen for clicks
  onItemClick(newItem, () => {
    if (player.inventory.length < 3) {
      player.addItem(newItem);
      removeItemFromScene(newItem);
      playSound("pickup.mp3");
    } else {
      showMessage("Inventory Full!");
    }
  });
}

// Wait for player action
waitForPlayerInput(); // Player chooses: use item, shoot dealer, or shoot self
```

### KEY POINTS FOR IMPLEMENTATION

- Items spawn **after turn ends**, before next turn begins
- **Automatic spawning** - no player action needed to trigger
- **Random selection** from weighted pool
- **Time limit** of 5 seconds
- **Space requirement** - need inventory slot
- **No persistence** - items don't carry between rounds/reloads

---

## DEALER AI (How Dealer Uses Items)

The dealer should intelligently use items:

1. **MAGNIFYING GLASS** - Look at next shell to decide strategy
2. **BEER** - If next shell is live and dealer is at low health, eject it
3. **INVERTER** - If next shell is live, invert it
4. **SAW** - Use if player is at 1-2 health
5. **HANDCUFFS** - Use if dealer is at low health to force player to shoot self
6. **CIGARETTES/MEDICATION** - Use if at 1 health
7. **KNIFE** - Steal dangerous items like SAW or MAGNIFYING GLASS
8. **PHONE** - Less priority (mostly cosmetic)
9. **EXPIRED_MED** - Never use on self (only steal with knife to give to player)

---

## GAME FLOW WITH ITEMS

```
1. Start of turn -> Item appears (if applicable)
2. Player chooses:
   a) Use an item from inventory
   b) Shoot dealer
   c) Shoot self
3. If item used -> Execute item effect
4. If shoot -> Roll chamber, apply damage
5. End turn -> Check win condition
6. Dealer's turn (same as above)
7. Repeat
```

---

## CODE INTEGRATION CHECKLIST

- [ ] Item class with name, description, effect function
- [ ] Player inventory system (max 3 items)
- [ ] Item spawning after each turn
- [ ] Item UI display (show available items)
- [ ] Item activation/usage logic
- [ ] Dealer AI for intelligent item use
- [ ] Item animations (visual feedback)
- [ ] Sound effects for each item
- [ ] Inventory full warning
- [ ] Item pickup detection

---

## EXAMPLE: MAGNIFYING GLASS IMPLEMENTATION

```javascript
class Item {
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }
  
  activate(player, dealer, chamber) {
    if (this.type === "magnifying_glass") {
      const nextShell = chamber[0];
      const shellType = nextShell ? "LIVE" : "BLANK";
      showMessage(`Next shell: ${shellType}`);
      return { success: true, message: shellType };
    }
  }
}

// Usage:
let mag = new Item("Magnifying Glass", "magnifying_glass");
let result = mag.activate(player, dealer, chamber);
// Result: { success: true, message: "LIVE" }
```

---

## TIPS FOR IMPLEMENTATION

1. **Item Effects Should Be Atomic** - Each item completes its effect immediately
2. **Order Matters** - Process item use BEFORE shooting
3. **Animations Are Optional** - But improve UX significantly
4. **Test Edge Cases** - What if player uses beer and chamber becomes empty?
5. **Sound Design** - Each item should have a distinct sound
6. **Dealer Logic** - Make dealer use items strategically, not randomly
7. **Item Descriptions** - Show tooltip when hovering over items
8. **Particle Effects** - Add visual flair to item pickup/use

---

## FINAL NOTES

- Items are THE core strategic element of Buckshot Roulette
- They transform the game from pure chance to strategic decision-making
- Balance is crucial - no item should be overpowered
- Dealer AI should make the game challenging but fair
- Items should feel impactful when used

Good luck with implementation! 🎮🔫
