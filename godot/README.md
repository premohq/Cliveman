# Cliveman — Godot port

Godot 4.7.2, GDScript, GL Compatibility renderer. The browser build in the
parent directory (`index.html`, `engine/`, `story/`, `minigame/`) is the
reference: the port aims to look, sound, read and play the same, and is
checked against it screen by screen.

```bash
godot --path . --import     # once, and after adding a class_name script
godot --path .
```

## Why GDScript and GL Compatibility

The game shipped as a browser build and should be able to again. GDScript
exports to web without qualification; C# historically has not. GL Compatibility
is the renderer with the widest web and low-end reach. The stock Godot download
has no C# support compiled in either, so picking C# would mean a different
install as well as a different export story.

## What is ported

All of it: the power-on and POST boot, the title screen with its night-city
flyover, all three chapters, every room, the night drive, blackjack, the horse
track, snake and street combat, the finale's fireworks, credits and static,
the secret ending and the crew-credits easter egg, the pause and settings
menus, save and load, all eight languages, character voices, the score and
sound effects, and keyboard, mouse and gamepad controls.

## Where things live

| Path | Contents |
| --- | --- |
| `scripts/terminal.gd` | The terminal: header, story screen, choices, prompts, overlays (`engine/ui-core.js`) |
| `scripts/game.gd` | Boot, power-on, the chapter runner and the debug menu (`engine/boot.js`) |
| `scripts/story/` | Title, chapters 1–3 and the minigames (`story/*.js`) |
| `scripts/nav/` | Rooms: the grid, the 3D view, the HUD, compass and radar (`engine/nav3d.js`, `controls-ui.js`, `navigation-hud.js`) |
| `scripts/drive/` | The night drive (`minigame/clivesbuick.js`) |
| `scripts/title_flyover.gd` | The title flyover (`engine/title-flyover.js`) |
| `scripts/ui/` | CSS-faithful widgets: text, buttons, menus, story art, finale, pad glyphs |
| `scripts/audio/` | Synthesiser, score, sound effects, stings, voices |
| `scripts/pad.gd` | Gamepad support (`engine/menus.js` padTick) |
| `scripts/save_store.gd` | Saved games in `user://saves` |
| `scripts/game_state.gd` | Story flags and the save codec (`engine/cinematic-state.js`) |
| `shaders/` | CRT glass, terminal tilt, power-on, static, and a port of three.js's materials |
| `data/` | Music, translations and the hand model, lifted from the JS |
| `assets/` | Art, audio and models extracted or rendered from the browser build |
| `tools/` | Checks, the comparison harnesses, and the asset exporters |

## Deliberate differences

Everything else follows the browser. These do not, on purpose:

- **Saves** go to `user://saves` (on Windows,
  `%APPDATA%\Godot\app_userdata\Cliveman\saves`) and the load screen lists
  them, newest first. The browser can only download a `.clive` file and load it
  back through a file picker. The format is unchanged, so saves still move
  between the builds, and IMPORT A .CLIVE FILE on the load screen reads one
  from the browser.
- **The gamepad moves Clive in rooms.** In the browser build every room uses
  free movement, which clears the handler the pad's movement map steers
  through, so the d-pad and stick do nothing there. The map is plainly meant
  to work, so here it does.
- **No fallbacks for missing WebGL.** The browser draws a small pixel-art city
  on the title and a raycaster in rooms when WebGL is unavailable. Godot always
  has its renderer, so neither is ported.
- **No touch controls.** The browser's swipe and on-screen buttons are for
  phones; this is a desktop build.
- **No `~` console.** In rooms the browser shows a `C:\DUDLEY>` input on `~`,
  but its command loop only runs in grid-step rooms, and none remain, so it
  does nothing there.
- **Voices** come from the operating system (see below), so there are fewer to
  cast from than Chrome offers.

## How parity is checked

Two harnesses drive the builds the same way and save frames to compare:

```bash
# the browser: serve the parent directory on port 8765, then
node tools/shoot.js steps.json
# the port
godot --path . -- --scenario steps.json
```

Both read a JSON list of steps (`wait`, `eval`, `key`, `hold`, `shot`; the
browser adds `click`, the port adds `choose` for the Nth choice button, `pad`
to simulate a controller, and `fixed_random` to pin the minigames' dice as
`Math.random = () => x` does in the browser). Compare the frames with a mean
absolute difference and by eye. Background runs keep their windows unfocusable
and write any saves to `user://test_saves`.

The story flow has its own check:

```bash
godot --path . -- --autoplay             # first option everywhere, to the end
godot --path . -- --autoplay --seed 3    # random choices, visits room events
```

It prints each section, room, event and choice. A few seeds cover the branches
the first-option walkthrough never takes: the minigames, the secret ending and
the rest.

And the quick ones:

```bash
godot --headless --path . tools/check_scripts.tscn     # every script and shader parses
godot --headless --path . tools/minigames_check.tscn   # deck, aces, money cap, levels
```

The browser build's own suite is still the oracle for game logic, from the
parent directory: `npm install && npm test`.

## Rendering notes

- **Colour.** The Compatibility renderer does no colour conversion at all:
  `source_color` hints are ignored and ALBEDO is written raw.
  `shaders/three_common.gdshaderinc` therefore decodes and encodes sRGB by
  hand, as three.js r160 does with physically-correct lights, and applies fog
  after the encode, where three.js applies it. `tools/light_probe.tscn` is how
  this was measured.
- **Canvas textures** (wall and floor textures, the flyover's glyph facades,
  the drive's asphalt) are rendered by the browser's own canvas code in
  headless Chrome (`tools/render_*_textures.js`) rather than reimplemented.
  They are random in the browser too, so any one render is as faithful as
  another.
- **The terminal tilt** (`.terminal{transform:perspective(2000px)
  rotateX(0.6deg)}`) is `shaders/terminal_tilt.gdshader` over a SubViewport.
- **CSS animations** apply their timing function to each keyframe step, not
  across the whole animation. The power-on flash is the clearest case.
- **Text** follows Blink's rules: ascent and descent rounded to whole pixels,
  `line-height:normal` sized by every fallback face on the line, and
  inline-block lines (the race, the snake board, save boxes) placed on
  `#screen`'s strut with the half-leading floored, several to a line when they
  fit.
- **Arabic** runs right to left, as `<html dir="rtl">` does in the browser:
  text shapes with an RTL base direction, and the rows the browser reverses
  (header, title buttons, choices, settings grid, the room and drive bars)
  are reversed. Only those containers get `layout_direction` RTL, because
  Godot also mirrors anchored controls, which would throw overlays off
  screen. Arabic glyphs come from Times New Roman, as in Chrome.

## Controls

Keyboard and mouse as in the browser. With a pad: the d-pad or stick moves
(LB/RB strafe), A selects or skips text, B backs out, X checks, Y opens the
inventory and Select saves. In the drive, RT/RB/A accelerate, LT/LB/X brake,
the stick or d-pad steers, B is the handbrake and Start saves. The Konami code
on the title screen opens the debug menu, as typing D-E-V does.

## Music and sound

`synth.gd` is a small software synthesiser in WebAudio's place. Notes are
scheduled ahead and mixed sample by sample into an AudioStreamGenerator,
through the same voices as `engine/music-classical.js`. The details are
WebAudio's: its RBJ biquad lowpass (Q in decibels), exponential envelopes, a
sawtooth table at 0.8485 of an ideal saw, oscillators starting at the rising
zero crossing. `tools/render_music_ref.js` renders reference notes through
WebAudio offline and `tools/music_ref.tscn` renders the same notes from the
port, for sample-level comparison. Sound effects are rendered from the
original graphs by `tools/render_audio.js`.

```bash
godot --headless --path . tools/music_render.tscn -- dream 20 out.wav
godot --headless --path . tools/sfx_render.tscn -- out.wav
```

## Character voices

Godot exposes the host's speech engine through `DisplayServer`, which lines up
almost exactly with the Web Speech API the browser build uses, so the casting
engine in `voice.gd` is a port rather than a redesign. Voices are
quality-scored, gender-matched and handed out so none repeats until every
eligible one is taken; when the pool is smaller than the cast, reused voices
get a pitch offset.

```bash
godot --path . tools/voice_check.tscn    # needs a display; speech is not available headless
```

Quality depends on what the operating system offers, and anything with
`natural` or `neural` in its name outranks the rest automatically. On Windows:
Settings, Accessibility, Narrator, Add natural voices; or add language packs
with Speech ticked (English UK and Australia each add voices).

## Assets

- **The car** is a Draco-compressed, quantized GLB inlined in
  `minigame/clivesbuick.js`. Godot's importer reads neither extension, so
  `tools/decode_car_glb.js` decodes it with the decoder the bundle ships and
  writes `assets/models/crown_vic.glb`, dividing out the `normalized`
  accessors (missing that makes the car 32767 times too large).
  `tools/car_probe.tscn` checks its scale.
- **The first-person hand** is lifted from `engine/handmodel.js` by
  `tools/export_hand.js` into `data/hand.json` and `hand_skin.png`: the
  reframed mesh, breathing deltas and presorted index buffer, as `CMHAND.build()`
  prepares them.
- **UI art** the port cannot draw natively (the title wordmark and its glow,
  and similar CSS/SVG pieces) is rendered in headless Chrome by
  `tools/render_ui_art.js`.
- **Translations** are the browser's dictionaries, copied verbatim into
  `data/i18n/*.json` by `tools/export_i18n.js`. They are keyed by the exact
  English string, so editing a line of story text without updating the
  dictionaries drops that line back to English in the other languages.

Verify a model change by rendering it, since a clean importer log does not
prove the mesh survived:

```bash
godot --path . tools/model_preview.tscn -- res://assets/models/crown_vic.glb out.png
```

## Traps worth knowing

- Container layout settles a frame after content is assigned, so anything
  positioned against a container's rect is recomputed each frame.
- A multi-line lambda inside a dictionary literal is a GDScript parse error;
  assign the lambda to a variable first.
- An apostrophe in single-quoted GDScript ends the string and surfaces as a
  syntax error several lines away. Transcribe long scenes with a script that
  re-encodes each literal, not by hand.
- The Compatibility renderer clears SubViewport targets even with
  `CLEAR_MODE_NEVER`; the finale's firework trails ping-pong between two
  viewports for that reason.
- A new `class_name` script is invisible to other scripts until the class
  cache is rebuilt with `--import`.
