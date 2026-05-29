# Cliveman 3.1 — Game & Modding Guide

A browser-based, text-driven detective game with a green-phosphor CRT terminal
look, a procedural music engine, retro minigames, and a pseudo-3D (raycast)
first-person navigation mode. It runs entirely client-side — **open
`index.html` in any modern browser to play.** No build step, no server, no
dependencies.

This README doubles as a modding reference: it explains how the project is laid
out and what every script does, so you can read it once and start adding scenes,
items, rooms, minigames, music, or translations.

---

## 1. How the game is built (the big picture)

The whole game is **plain ("classic") JavaScript files loaded in order by
`<script>` tags in `index.html`.** There are no modules, no `import`/`export`,
no bundler. Every file shares **one global scope**, so a function defined in
one file (say `typeLine` in `ui-core.js`) is callable from any other file
(say `ch2.js`) with no imports. This is the single most important thing to
understand before modding:

- To add a function/scene, just declare it in the relevant file. It is
  instantly global.
- **Load order matters.** A file can only call things defined in files loaded
  before it — except story content, which is all wired together and only runs
  later, after every script has loaded. `engine/boot.js` is always last and is
  what actually starts the game.
- Do **not** reorder the `<script>` tags unless you understand the dependency
  chain below.

The game is essentially a long chain of `async` functions that `await` each
other. Each scene types out text, optionally waits for input, and then calls
the next scene. Player progress is a single global `state` object, and a
checkpoint number in `state` lets saves resume mid-game.

### The core loop in one paragraph

`boot()` plays the CRT power-on + BIOS sequence, then calls `main()`.
`main()` shows the title screen; on "new game" it runs the intro and then
`runFrom(1)`. `runFrom(cp)` is the **chapter dispatcher** — a cascade of
`if(startCp<=N)` blocks that calls each chapter's scene functions in order,
updating `state.checkpoint` as it goes. On "load game" it decodes the save
code and calls `runFrom()` from the saved checkpoint instead.

---

## 2. Folder layout

```
cliveman/
├── index.html          open this to play; defines script load order
├── styles.css          all styling, animations, CRT overlay, responsive/mobile rules
├── README.md           this file
├── engine/             RUNTIME — generic machinery, no story content
│   ├── anti-tamper.js       blocks right-click / devtools shortcuts (dev: comment out to disable)
│   ├── i18n.js              translation tables + window.t() lookup
│   ├── dom-refs.js          grabs DOM elements into globals (screenEl, input…) + IS_MOBILE
│   ├── audio.js             WebAudio SFX + procedural multi-track music + mute
│   ├── easter-egg-audio.js  the secret MP3, embedded as a base64 data URI
│   ├── save-state.js        the `state` object, save-code encode/decode, inventory
│   ├── ui-core.js           typeLine / appendLine / clearScreen / scroll / fullscreen
│   ├── prompts.js           ask, yes/no, choice buttons, slider — all player input
│   ├── transitions.js       car / floor transitions + the Bevan death effect
│   ├── raycaster.js         the pseudo-3D first-person renderer + wall/floor textures
│   ├── controls-ui.js       on-screen button row + keyboard/pad label helpers
│   ├── navigation.js        grid-based room walking (navigateRoom) + city skyline art
│   ├── menus.js             pause menu, inventory screen, save screen, mute toggle
│   ├── input-extras.js      gamepad polling, focus, button-repeat, pad toast
│   └── boot.js              debug jump menu, boot/BIOS sequence, main() — LOADS LAST
└── story/              CONTENT — the actual narrative and gameplay
    ├── title.js             title screen, intro, section() banners, numpad/load screen
    ├── ch1.js               Chapter 1 — the dream, the phone call, the Mayo factory (5 floors), rooftop
    ├── ch2.js               Chapter 2 — Bevan's apartment, crime scene, Central Dudley, Pete's Subs, the death, panic, arrest
    ├── minigames.js         blackjack, rock-paper-scissors combat, horse racing, Snake
    ├── ch3.js               Central Dudley open-world money grind, Chapter 3 (evidence + trial)
    └── finale.js            credits, fireworks, TV-static sign-off, the Easter-egg crew credits
```

### Load order (as written in `index.html`)

```
engine: anti-tamper → i18n → dom-refs → audio → easter-egg-audio →
        save-state → ui-core → prompts → transitions → raycaster →
        controls-ui → navigation
story:  title → ch1 → ch2 → minigames → ch3 → finale
engine: menus → input-extras → boot   ← boot.js is always last
```

---

## 3. The systems you will mod most

### 3a. Printing text — `ui-core.js`

Almost every line of the game goes through these:

- `await typeLine(text, cls, speed)` — types text out character-by-character
  (typewriter effect). `cls` is a CSS class that colors it (see the palette
  below). `speed` is optional ms-per-char (default 14).
- `instantLine(text, cls)` — prints a whole line at once, no typewriter.
- `blank(n)` — prints `n` empty lines (default 1) for spacing.
- `clearScreen()` — wipes the text area.
- `await sleep(ms)` — pauses (used between lines for pacing).

**Text color classes** (defined in `styles.css`, pass as the `cls` argument):

| class       | meaning / color                 |
|-------------|---------------------------------|
| `narration` | default story prose (pale green)|
| `speaker`   | spoken dialogue (amber)         |
| `sys`       | system / UI text (amber)        |
| `err`       | danger / emphasis (red)         |
| `dim`       | quiet / faded (dim green)       |
| `glitch`    | chromatic-aberration glitch fx  |
| `credits`   | credits styling                 |

Example scene:
```js
async function my_scene(){
  clearScreen();
  await typeLine('"The rain has not stopped in three days."','narration');
  await typeLine('Bevan: "I blame the mayonnaise."','speaker');
  blank();
  await pressEnterToContinue();
}
```

### 3b. Asking the player something — `prompts.js`

- `await yn(question)` → returns `true`/`false`. Shows YES / NO buttons.
- `await askChoice(prompt, opts)` / `await askClick(prompt, opts)` → shows a
  row of buttons, returns the chosen option object. Each option is
  `{keys:['id'], label:'TEXT SHOWN'}`. Read the result with
  `result.keys.indexOf('id') !== -1`.
- `await pressEnterToContinue()` (a.k.a. `pressAnyToContinue`) → a single
  CONTINUE button; also triggered by Enter/Space.
- `await ask()` → free-text input from the command line (returns the typed
  string, lowercased).
- `await askNumber(prompt, min, max)` → a slider (used for placing bets).

Example branching:
```js
const a = await askChoice('What do you do?', [
  {keys:['knock'], label:'Knock on the door'},
  {keys:['leave'], label:'Walk away'}
]);
if(a.keys.indexOf('knock') !== -1){ /* ... */ }
```

### 3c. Game state, items & saving — `save-state.js`

There is one global object: **`state`**. It holds the checkpoint, current room,
grid position, money, level, and a set of boolean story flags (e.g.
`state.ch2_poison`, `state.bevan_room_known`). To track a new piece of progress,
add a property to `state` and read/write it from your scenes.

- `addItem("name")` — adds an inventory item and prints an "ITEM OBTAINED"
  banner. `state.inventory` is the array; `showInv()` prints it.
- `encodeSave()` / `decodeSave(code)` / `restoreState(dec)` — pack the whole
  `state` into a single number (then a `.clive` file) and back. **Important:**
  the save format is a hand-packed bitfield. If you add a new story flag that
  must survive saves, you have to add a bit for it in all three functions, and
  rebuild the inventory list in `restoreState`. If your flag does not need to
  survive a save/load, you can ignore this.
- `window.showSaveCode()` — writes the downloadable `cliveman_save.clive` file.

The save bitfield currently packs: checkpoint (3 bits), room id (4), row (4),
col (4), eight story flags (8 bits), money (10 bits), mechanic-paid (1 bit).

### 3d. First-person navigation rooms — `navigation.js` + `raycaster.js`

Explorable rooms are grids of characters rendered as a pseudo-3D corridor
(Wolfenstein-style raycasting). You define a room as a 2D array of single-char
symbols and hand it to `navigateRoom`:

```js
await navigateRoom(roomId, grid, start, events, exits, opts);
```

- `roomId` — a unique number (the `ROOM_*` constants). Used for save/resume.
- `grid` — array of rows, each row an array of symbol strings.
- `start` — `[row, col]` the player spawns at.
- `events` — map of `'row,col' → async function`. Runs when the player
  "checks" (presses C / the Check button) on that tile. If the function
  returns a non-empty string, that string is treated as an exit code and the
  room ends.
- `exits` — map of `'row,col' → 'exitCode'`. Checking that tile leaves the
  room and `navigateRoom` resolves with that code.
- `opts` — `{title, startHeading, exitGate, onMove}`. `title` picks the visual
  theme (see below). `exitGate(code)` can block an exit (return false).
  `onMove(pos)` runs after each step — used for random encounters & ambient
  lines.

**Grid symbols** (`FP_GLYPH` in `raycaster.js`):

| symbol | meaning                                            |
|--------|----------------------------------------------------|
| `#`    | solid wall (blocks movement, drawn as a wall)      |
| `.`    | open floor                                         |
| `X`    | open floor that was an item/event, now spent       |
| `I`    | interactable (one-shot pickup/clue — marked spent) |
| `U`    | interactable (one-shot, as above)                  |
| `E`    | exit tile                                           |
| `S`    | stairs                                             |
| `K`    | a kneel/interact spot (e.g. waking Bevan)          |
| `B`,`D`,`L`,`M`,`G`,`H`,`A`,`v` | scenery / labelled props    |
| `1`–`6`| numbered interaction points (doors, desks, etc.)   |

**Room visual themes** are chosen automatically from the room `title` string by
`pickTheme()` in `raycaster.js`. Available themes: `factory`, `apartment`,
`lobby`, `crime`, `street`, `default`. Each defines wall/floor/ceiling colors
and textures. To add a theme, add an entry to `RC_THEMES` and a matching rule
in `pickTheme()` (e.g. "if the title contains 'morgue', use the morgue theme").

Movement and rendering are already optimized (DDA raycaster, reused pixel
buffer, mobile downsampling). On mobile the canvas auto-fits the map area; you
should not need to touch the render code to add rooms — only `navigateRoom`
calls.

### 3e. The story chapters — `story/ch1.js`, `ch2.js`, `ch3.js`

Each chapter is a series of `async` scene functions named by location, e.g.
`ch1_house`, `ch1_factory`, `ch2_petes`, `ch2_arrest`. They are strung together
by **`runFrom(startCp)`** at the bottom of `ch3.js`, the dispatcher that also
maps checkpoints to chapters. To insert a new scene, write the function and
`await` it from the appropriate place in the chain (either inside an existing
scene, or by adding it to `runFrom`).

`section('B I G   T I T L E')` (defined in `title.js`) prints a framed banner —
used for chapter headers.

Story beats are gated by flags on `state` and by items, and a few rooms feed
into minigames or the raycaster. The ending (the death at Pete's → panic →
arrest → evidence → trial → prison) lives across the end of `ch2.js`
(`ch2_petes`, `ch2_alley_grief`, `ch2_arrest`) and `ch3.js` (`ch3`, `epilogue`).

### 3f. Minigames — `story/minigames.js`

Four self-contained games, each an `async` function that resolves when done:
`playBlackjack()`, `rpsCombat()` (rock-paper-scissors "combat"),
`playHorseRace()`, and `playSnake()`. They are launched from the Central Dudley
open-world room in `ch3.js`. Winnings/losses adjust `state.money`; combat wins
adjust `state.enemiesBeat` and can level the player up (`levelUpCheck`). To add
a minigame, write a new `async function`, then call it from a room `events`
handler.

### 3g. Music & sound — `audio.js`

Pure WebAudio — there are **no music files**; every track is generated in code.

- `playMusic('title' | 'investigate' | 'lonely' | 'descent')` — start/crossfade
  to a track.
- `stopMusic()` — fade the current track out.
- `setMuted(bool)` / `toggleMute()` / `isMuted()` — global mute (silences music
  AND sound effects). The pause menu's 🔊/🔇 button calls these.
- SFX helpers: `playKeyClick()`, `playCharClick(ch)` (typewriter clicks),
  `playMoveBlip()`, `playEngine()`, and the low-level `beep(freq,dur,vol,type)`.

| track         | mood                       | used during                  |
|---------------|----------------------------|------------------------------|
| `title`       | slow noir jazz             | title screen                 |
| `investigate` | tense, sparse, ticking     | Ch.1 & Ch.2 investigation    |
| `lonely`      | warm, slow, melancholy     | Pete's Subs scene            |
| `descent`     | dark, dissonant, unstable  | after Bevan dies, Ch.3       |

To add a track, add an entry to the `_TRACKS` object: a function returning
`{step, vol, bar(master, baseTime, step)}`, where `bar()` schedules one 16-step
musical bar using the little synth-voice helpers (`_mkBass`, `_mkLead`,
`_mkPad`, `_mkBrush`, `_mkTick`). Then call `playMusic('yourtrack')` from a
scene. (`startNoirMusic`/`stopNoirMusic` are legacy aliases for the title
track and `stopMusic`.)

Browsers block audio until the first user gesture; the engine handles this with
a one-time listener that resumes the audio context and re-arms whatever track
should be playing.

### 3h. The secret MP3 — `easter-egg-audio.js`

The one real audio asset (the crew-credits song) is stored as a base64 data URI
inside this file and wired onto the hidden `#easterEggAudio` element on load —
which is why the project has no loose media files or `assets/` folder. It is
triggered by clicking the title logo 5 times, and `playFinaleEasterEgg()` in
`finale.js` plays it (stopping procedural music first, restarting the title
track after).

### 3i. Transitions & the death effect — `transitions.js`

- `carTransition(fromLabel, toLabel)` and `floorTransition(dir, from, to)` —
  little animated interstitials between locations / floors.
- `bevanDeathEffect()` — the screen glitch-shake + red vignette pulse + harsh
  audio sting when Bevan dies. It stops the music, respects mute, and **fully
  resets the screen to normal before the next scene runs** (no lingering red).
  `clearDeathVignette()` is a kept-for-safety no-op.

### 3j. Title, intro, credits — `title.js` & `finale.js`

`title.js` has `titleScreen()` (the menu), `intro()`, `section()` (banner
helper), and the load-game numpad/`loadScreen`. `finale.js` has `playFinale()`
(the fireworks-and-static end credits), `playFinaleEasterEgg()`, and the
firework/static canvas routines.

---

## 4. Look & feel

### CRT screen effect — `styles.css`

A single fixed, click-through overlay (`#crtVignette`, `z-index:9002`) sits on
top of everything and gives the curved-glass look: scanlines, a phosphor dot
grid, a corner vignette, soft glare, and a faint green glow. It is
GPU-promoted (its own compositor layer) so it does not get repainted as text
streams underneath — keeping the game smooth. It does not change layout; the
title screen and all content render normally beneath it.

### Performance notes (for modders)

The game was tuned to stay smooth even with the full CRT overlay:
- The typewriter's auto-scroll is **coalesced to one scroll per animation
  frame** instead of one per character (`scrollScreenToBottom` in `ui-core.js`).
- `#screen` uses `contain:layout style`; the `.crt` flicker layer and the
  perspective-tilted `.terminal` are GPU-promoted.
- The raycaster reuses its pixel buffer and downsamples on mobile.

If you add heavy per-frame work, keep these patterns: batch DOM writes, avoid
reading layout (`scrollHeight`, `offsetWidth`) inside loops, and prefer CSS
transforms/opacity (cheap to composite) over properties that force reflow.

### Mobile / responsive

`dom-refs.js` sets the global `IS_MOBILE` (`(pointer:coarse)` or touch). Media
queries in `styles.css` (`max-width:600px` / `767px`) shrink fonts, switch to
the on-screen button nav, and cap the 3D viewport so it always fits. The
raycaster also renders a smaller buffer on mobile for speed.

---

## 5. Translations — `i18n.js`

`window.t(string)` looks the string up in `_translations[_lang]` and returns
the translation, or the original string if there is none — so English text in
the source acts as both the default and the lookup key. Bundled languages:
French (`fr`), Spanish (`es`), Chinese (`zh`), Portuguese (`pt`), Russian
(`ru`), Hindi (`hi`), Arabic (`ar`). The active language is read from
`localStorage['cliveman_lang']`, defaulting to `en`. To translate new text,
add the English string as a key under each language object in `_translations`.
Strings you do not translate still display fine (in English).

---

## 6. Input — keyboard, on-screen, gamepad

- **Keyboard:** typing goes to the command line; in nav mode, arrow keys / WASD
  move and turn, Q/E strafe, C checks. Enter/Space advances text.
- **On-screen buttons:** `controls-ui.js` draws the nav button row (move, turn,
  check, inventory, save) for touch/mobile.
- **Gamepad:** `input-extras.js` polls the Gamepad API, detects pad type
  (Xbox/PlayStation/generic) for correct button labels, handles focus
  navigation of on-screen buttons, button-repeat, and shows a "controller
  connected" toast. Confirm/Cancel/Check labels adapt via `labelConfirm()` /
  `labelCheck()` in `controls-ui.js`.

---

## 7. Quick-start modding recipes

**Add a new dialogue scene between two existing ones**
1. Write `async function my_scene(){ ... }` in the relevant `story/` file.
2. `await my_scene();` from the scene that should precede it (or add it to
   `runFrom` in `ch3.js`).

**Add an item**
- `addItem("brass key");` then gate a later scene with
  `if(state.inventory.includes("brass key")){ ... }`.
- If it must survive save/load, also wire a bit into `encodeSave`/`decodeSave`/
  `restoreState` in `save-state.js`.

**Add an explorable room**
- Build a `grid`, define `events` and `exits`, give it a unique `ROOM_*` id,
  and `await navigateRoom(...)`. Pick a `title` that maps to an existing theme,
  or add a new theme in `raycaster.js`.

**Add a music track** — add a `_TRACKS` entry in `audio.js`, call
`playMusic('yourtrack')`.

**Add a language** — add a `xx:{ ... }` object in `_translations` (`i18n.js`).

**Develop with devtools open** — comment out the
`<script src="engine/anti-tamper.js"></script>` line in `index.html` while
working; it blocks right-click and devtools shortcuts.

**Jump straight to any scene while testing** — there is a built-in debug menu
(`debugMenu()` in `boot.js`) that resets state and jumps to any checkpoint
(the apartment, factory floors, Pete's Subs, Chapter 3, the epilogue, etc.).

---

## 8. Reminders

- All scripts share one global scope — no imports needed, but **load order is
  load-bearing**. `boot.js` must stay last.
- It is all vanilla JS/CSS/HTML; just edit and refresh the browser.
- Keep new visual effects cheap (transforms/opacity) so the CRT overlay stays
  smooth.
