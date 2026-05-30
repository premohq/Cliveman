# Cliveman 3.1

A browser-based text detective game. It's got a green CRT terminal look, a
procedural music engine, a few retro minigames, and a fake-3D (raycast)
first-person mode for walking around rooms. Everything runs client-side, so to
play it you just open `index.html` in a browser. There's no build step, no
server, and nothing to install.

This file is also the modding reference. It walks through how the project is
organized and what each script does so you can add scenes, items, rooms,
minigames, music, or translations without having to reverse-engineer the whole
thing first.


## How it's put together

The game is a pile of plain JavaScript files loaded in order by `<script>` tags
in `index.html`. No modules, no import/export, no bundler. Every file shares one
global scope, which means a function defined in one file (like `typeLine` in
ui-core.js) can be called from any other file (like ch2.js) with no import.
That's the main thing to know before you start:

- To add a function or scene, just declare it in the relevant file. It's
  global immediately.
- Load order matters. A file can only call things from files loaded before it.
  The exception is story content, which is all hooked together and only runs
  later, after everything has loaded. `engine/boot.js` is always last and is
  what kicks the game off.
- Don't reorder the `<script>` tags unless you know the dependency chain below.

Under the hood the game is one long chain of async functions that await each
other. Each scene prints some text, maybe waits for input, then calls the next
scene. Player progress lives in a single global `state` object, and a checkpoint
number in there lets saved games resume partway through.

The flow, briefly: `boot()` runs the CRT power-on and fake BIOS text, then calls
`main()`. `main()` shows the title screen. On a new game it runs the intro and
calls `runFrom(1)`. `runFrom(cp)` is the dispatcher that runs each chapter's
scenes in order, bumping `state.checkpoint` as it goes. On a loaded game it
decodes the save and calls `runFrom()` starting from the saved checkpoint.


## Folder layout

```
cliveman/
├── index.html          open this to play; sets the script load order
├── styles.css          styling, animations, CRT overlay, mobile rules
├── README.md           this file
├── engine/             generic machinery, no story content
│   ├── anti-tamper.js       blocks right-click and devtools shortcuts
│   ├── i18n.js              translation tables and the t() lookup
│   ├── dom-refs.js          grabs DOM elements into globals, sets IS_MOBILE
│   ├── audio.js             sound effects, procedural music, mute
│   ├── easter-egg-audio.js  the secret song, stored as base64
│   ├── save-state.js        the state object, save encode/decode, inventory
│   ├── ui-core.js           typeLine, appendLine, clearScreen, scrolling, fullscreen
│   ├── prompts.js           yes/no, choice buttons, slider, text input
│   ├── transitions.js       car/floor transitions, the Bevan death effect
│   ├── raycaster.js         the fake-3D first-person renderer and textures
│   ├── controls-ui.js       on-screen button row, keyboard/pad labels
│   ├── navigation.js        grid room walking (navigateRoom), city skyline art
│   ├── menus.js             pause menu, inventory, save screen, mute toggle
│   ├── input-extras.js      gamepad polling, focus, button repeat
│   └── boot.js              debug jump menu, boot sequence, main() - loads last
└── story/              the actual narrative and gameplay
    ├── title.js             title screen, intro, section() banners, load screen
    ├── ch1.js               Chapter 1: the dream, the phone call, the factory, rooftop
    ├── ch2.js               Chapter 2: apartment, crime scene, Dudley, Pete's Subs, death, arrest
    ├── minigames.js         blackjack, rock-paper-scissors combat, horse racing, Snake
    ├── ch3.js               Dudley open-world money grind, Chapter 3 (evidence and trial)
    └── finale.js            credits, fireworks, TV static, the easter-egg crew credits
```

Load order in index.html:

```
engine: anti-tamper, i18n, dom-refs, audio, easter-egg-audio, save-state,
        ui-core, prompts, transitions, raycaster, controls-ui, navigation
story:  title, ch1, ch2, minigames, ch3, finale
engine: menus, input-extras, boot   (boot.js is always last)
```


## Printing text (ui-core.js)

Nearly every line in the game goes through these:

- `await typeLine(text, cls, speed)` types text out one character at a time.
  `cls` is a CSS class that colors it (see below). `speed` is optional
  ms-per-char, default 14.
- `instantLine(text, cls)` prints a whole line at once, no typewriter.
- `blank(n)` prints n empty lines (default 1) for spacing.
- `clearScreen()` wipes the text area.
- `await sleep(ms)` pauses, used between lines for pacing.

Color classes, passed as the `cls` argument (defined in styles.css):

- `narration` - default story prose, pale green
- `speaker` - spoken dialogue, amber
- `sys` - system/UI text, amber
- `err` - danger or emphasis, red
- `dim` - quiet, faded green
- `glitch` - chromatic-aberration glitch effect
- `credits` - credits styling

A scene looks like this:

```js
async function my_scene(){
  clearScreen();
  await typeLine('"The rain has not stopped in three days."','narration');
  await typeLine('Bevan: "I blame the mayonnaise."','speaker');
  blank();
  await pressEnterToContinue();
}
```


## Asking the player something (prompts.js)

- `await yn(question)` returns true/false, shows YES/NO buttons.
- `await askChoice(prompt, opts)` (or `askClick`) shows a row of buttons and
  returns the chosen option. Each option is `{keys:['id'], label:'TEXT'}`. Read
  the result with `result.keys.indexOf('id') !== -1`.
- `await pressEnterToContinue()` is a single CONTINUE button, also triggered by
  Enter/Space.
- `await ask()` reads free text from the command line (returns it lowercased).
- `await askNumber(prompt, min, max)` is a slider, used for placing bets.

Branching example:

```js
const a = await askChoice('What do you do?', [
  {keys:['knock'], label:'Knock on the door'},
  {keys:['leave'], label:'Walk away'}
]);
if(a.keys.indexOf('knock') !== -1){ /* ... */ }
```


## Game state, items, and saving (save-state.js)

There's one global object, `state`. It holds the checkpoint, current room, grid
position, money, level, and a bunch of boolean story flags (like
`state.ch2_poison` or `state.bevan_room_known`). To track new progress, add a
property to `state` and read/write it from your scenes.

- `addItem("name")` adds an inventory item and prints an "ITEM OBTAINED"
  banner. `state.inventory` is the array, `showInv()` prints it.
- `encodeSave()`, `decodeSave(code)`, `restoreState(dec)` pack the whole state
  into one number (then a .clive file) and back. Heads up: the save format is a
  hand-packed bitfield. If you add a story flag that needs to survive a
  save/load, you have to add a bit for it in all three functions and rebuild
  the inventory list in restoreState. If the flag doesn't need to survive a
  save, you can ignore all that.
- `window.showSaveCode()` writes the downloadable cliveman_save.clive file.

The bitfield currently packs checkpoint (3 bits), room id (4), row (4), col (4),
eight story flags (8 bits), money (10 bits), and a mechanic-paid flag (1 bit).


## First-person rooms (navigation.js and raycaster.js)

Explorable rooms are grids of characters drawn as a fake-3D corridor (the old
Wolfenstein trick). You define a room as a 2D array of single-character symbols
and hand it to navigateRoom:

```js
await navigateRoom(roomId, grid, start, events, exits, opts);
```

- `roomId` is a unique number (the ROOM_* constants), used for save/resume.
- `grid` is an array of rows, each row an array of symbol strings.
- `start` is [row, col] where the player spawns.
- `events` is a map of 'row,col' to an async function. It runs when the player
  checks (presses C or the Check button) on that tile. If the function returns
  a non-empty string, that string is treated as an exit code and the room ends.
- `exits` is a map of 'row,col' to an exit code string. Checking that tile
  leaves the room and navigateRoom resolves with that code.
- `opts` is {title, startHeading, exitGate, onMove}. `title` picks the visual
  theme. `exitGate(code)` can block an exit by returning false. `onMove(pos)`
  runs after each step, used for random encounters and ambient lines.

Grid symbols (the FP_GLYPH table in raycaster.js):

- `#` solid wall, blocks movement, drawn as a wall
- `.` open floor
- `X` floor that used to be an item/event, now spent
- `I` or `U` one-shot interactable (a pickup or clue, marked spent after use)
- `E` exit tile
- `S` stairs
- `K` a kneel/interact spot, like waking Bevan
- `B D L M G H A v` scenery and labelled props
- `1` through `6` numbered interaction points (doors, desks, etc.)

Room themes are chosen automatically from the room title string by pickTheme()
in raycaster.js. The themes are factory, apartment, lobby, crime, street, and
default. Each one sets wall/floor/ceiling colors and textures. To add a theme,
add an entry to RC_THEMES and a matching rule in pickTheme (for example, "if
the title contains 'morgue', use the morgue theme").

The movement and rendering are already optimized (DDA raycaster, reused pixel
buffer, smaller buffer on mobile). To add rooms you only need navigateRoom
calls, not changes to the render code.


## The story chapters (ch1.js, ch2.js, ch3.js)

Each chapter is a set of async scene functions named after their location, like
`ch1_house`, `ch1_factory`, `ch2_petes`, `ch2_arrest`. They get strung together
by `runFrom(startCp)` at the bottom of ch3.js, which also maps checkpoints to
chapters. To insert a new scene, write the function and await it from wherever
it belongs, either inside an existing scene or by adding it to runFrom.

`section('B I G   T I T L E')`, defined in title.js, prints a framed banner.
It's used for chapter headers.

Story beats are gated by flags on `state` and by inventory items, and a few
rooms hand off to minigames or the raycaster. The ending (the death at Pete's,
then panic, arrest, evidence, trial, prison) is spread across the end of ch2.js
(`ch2_petes`, `ch2_alley_grief`, `ch2_arrest`) and ch3.js (`ch3`, `epilogue`).


## Minigames (minigames.js)

Four self-contained games, each an async function that resolves when it's done:
`playBlackjack()`, `rpsCombat()` (rock-paper-scissors "combat"),
`playHorseRace()`, and `playSnake()`. They're launched from the Central Dudley
open-world room in ch3.js. Winnings and losses change `state.money`; combat
wins bump `state.enemiesBeat` and can level the player up (levelUpCheck). To add
one, write a new async function and call it from a room's events handler.


## Music and sound (audio.js)

It's all WebAudio. There are no music files; every track is generated in code.

- `playMusic('title' | 'investigate' | 'lonely' | 'descent')` starts or
  crossfades to a track.
- `stopMusic()` fades the current track out.
- `setMuted(bool)`, `toggleMute()`, `isMuted()` control global mute (silences
  both music and sound effects). The pause menu's mute button calls these.
- Sound effects: `playKeyClick()`, `playCharClick(ch)` (the typewriter clicks),
  `playMoveBlip()`, `playEngine()`, and the low-level `beep(freq,dur,vol,type)`.

The tracks and where they play:

- `title` - slow noir jazz, on the title screen
- `investigate` - tense and sparse with a ticking pulse, during Ch.1 and Ch.2
- `lonely` - warm and slow, during the Pete's Subs scene
- `descent` - dark and dissonant, after Bevan dies and through Ch.3

To add a track, add an entry to the `_TRACKS` object: a function that returns
{step, vol, bar(master, baseTime, step)}, where bar() schedules one 16-step
musical bar using the small synth-voice helpers (_mkBass, _mkLead, _mkPad,
_mkBrush, _mkTick). Then call playMusic('yourtrack') from a scene.
(startNoirMusic and stopNoirMusic are old aliases for the title track and
stopMusic.)

Browsers won't play audio until the first user interaction, so the engine has a
one-time listener that resumes the audio context and re-arms whatever track
should be playing.


## The secret song (easter-egg-audio.js)

The one real audio asset (the crew-credits song) is stored as a base64 data URI
in this file and attached to the hidden #easterEggAudio element on load. That's
why the project has no loose media files or assets folder. It's triggered by
clicking the title logo five times, and playFinaleEasterEgg() in finale.js
plays it (stopping the procedural music first, restarting the title track
after).


## Transitions and the death effect (transitions.js)

- `carTransition(fromLabel, toLabel)` and `floorTransition(dir, from, to)` are
  the little animated interstitials between locations and floors.
- `bevanDeathEffect()` is the screen glitch-shake, red vignette pulse, and harsh
  audio sting when Bevan dies. It stops the music, respects mute, and resets the
  screen fully to normal before the next scene runs, so no red haze lingers.
  `clearDeathVignette()` is a no-op kept around for safety.


## Title and credits (title.js, finale.js)

title.js has `titleScreen()` (the menu), `intro()`, `section()` (the banner
helper), and the load-game numpad and loadScreen. finale.js has `playFinale()`
(the fireworks-and-static end credits), `playFinaleEasterEgg()`, and the
firework and static canvas routines.


## Look and feel

The CRT effect is one fixed, click-through overlay (#crtVignette, z-index 9002)
sitting on top of everything. It does the curved-glass look: scanlines, a
phosphor dot grid, a corner vignette, soft glare, and a faint green glow. It's
on its own GPU layer so it doesn't get repainted as text streams underneath,
which keeps things smooth. It doesn't change layout, so the title screen and
everything else render normally under it.

A few performance notes if you're adding heavy stuff:

- The typewriter's auto-scroll is batched to one scroll per animation frame
  instead of one per character (scrollScreenToBottom in ui-core.js).
- #screen uses contain:layout style, and the flicker layer and the
  perspective-tilted .terminal are on their own GPU layers.
- The raycaster reuses its pixel buffer and renders smaller on mobile.

If you add per-frame work, keep to those patterns: batch DOM writes, don't read
layout properties (scrollHeight, offsetWidth) inside loops, and prefer CSS
transforms and opacity (cheap to composite) over things that force a reflow.

For mobile, dom-refs.js sets the global IS_MOBILE ((pointer:coarse) or touch).
The media queries in styles.css (max-width 600px and 767px) shrink fonts, swap
in the on-screen button nav, and cap the 3D viewport so it always fits.


## Translations (i18n.js)

`window.t(string)` looks the string up in `_translations[_lang]` and returns the
translation, or the original string if there isn't one. So the English text in
the source acts as both the default and the lookup key. The bundled languages
are French, Spanish, Chinese, Portuguese, Russian, Hindi, and Arabic. The active
language is read from localStorage under 'cliveman_lang', defaulting to English.
To translate new text, add the English string as a key under each language
object in _translations. Anything you don't translate still shows up fine, just
in English.


## Input

- Keyboard: typing goes to the command line. In nav mode, arrow keys or WASD
  move and turn, Q/E strafe, C checks. Enter/Space advances text.
- On-screen buttons: controls-ui.js draws the nav button row (move, turn, check,
  inventory, save) for touch and mobile.
- Gamepad: input-extras.js polls the Gamepad API, detects the pad type
  (Xbox/PlayStation/generic) so the button labels are right, handles focus
  navigation of the on-screen buttons, button repeat, and the
  "controller connected" toast. The Confirm/Cancel/Check labels adapt through
  labelConfirm() and labelCheck() in controls-ui.js.


## Quick recipes

Add a dialogue scene between two existing ones:

1. Write `async function my_scene(){ ... }` in the right story file.
2. Await it from the scene that should come before it, or add it to runFrom in
   ch3.js.

Add an item:

- `addItem("brass key")`, then gate a later scene with
  `if(state.inventory.includes("brass key")){ ... }`.
- If it has to survive save/load, also wire a bit into encodeSave, decodeSave,
  and restoreState in save-state.js.

Add an explorable room: build a grid, define events and exits, give it a unique
ROOM_* id, and call navigateRoom. Use a title that maps to an existing theme, or
add a theme in raycaster.js.

Add a music track: add a _TRACKS entry in audio.js, then call
playMusic('yourtrack').

Add a language: add an `xx:{ ... }` object in _translations in i18n.js.

Develop with devtools open: comment out the anti-tamper.js script line in
index.html while you work. It blocks right-click and the devtools shortcuts.

Jump straight to a scene while testing: there's a built-in debug menu
(debugMenu() in boot.js) that resets state and jumps to any checkpoint (the
apartment, the factory floors, Pete's Subs, Chapter 3, the epilogue, and so on).


## A few reminders

- All scripts share one global scope, so no imports are needed, but the load
  order matters. boot.js has to stay last.
- It's all plain JS, CSS, and HTML. Edit a file, refresh the browser.
- Keep new visual effects cheap (transforms and opacity) so the CRT overlay
  stays smooth.
