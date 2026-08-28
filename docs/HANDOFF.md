# Cliveman — Handoff

## Current release: 2.0.20

### 2.0.20 — continuous factory stair world and procedural NAV items

- The Mayo Corp factory is a single persistent NAV world with five original room grids stacked at distinct elevations.
- Each floor reaches a continuous stair tower through a short east hallway. Walking between floors does not load a room, snap to a spawn, or call a transition hook.
- `engine/raycaster.js` owns the canonical local grids and their mapped world positions; `story/ch1.js` launches the single world; `engine/nav3d.js` renders and traverses it.
- `tests/test_factory_layout_identity.js`, `test_factory_stability.js`, `test_factory_tower.js`, `test_factory_layered_nav.js`, `test_factory_external_stair_world.js`, and `test_factory_world_geometry_safety.js` protect the no-teleport route, coordinates, reachability, step rise, camera headroom, and legacy save landings.
- Floor evidence can render as lightweight procedural low-poly meshes. Unknown item keys retain the established cross-plane fallback.
- The GitHub developer layout is normalized at repository root so `index.html` remains directly playable while tests, scripts, and documentation stay alongside the editable source.

### 2.0.19 — NAV item presentation

- Added procedural Three.js models for known floor evidence while preserving fallback rendering for unmodeled items.
- Kept story item keys and pickup behavior unchanged.

### 2.0.18 — maintainable file consolidation

Reduced the shipped project file count without creating giant modules:
- `engine/foundation.js` combines the tamper guard and global DOM/runtime foundation.
- `engine/cinematic-state.js` combines the cutscene layer and save-state lifecycle.
- `engine/navigation-hud.js` combines compass and minimap HUD utilities.
- `engine/audio.js` now also contains the small contextual-stings section.

The consolidation removes seven tiny source files, adds three focused replacements, and therefore reduces the project by four files. Large systems, chapters, translations, and editable drive sources remain separate.

2.0.13: approved title-logo replacement.
- Added `assets/cliveman-logo.png` with transparency.
- Updated `story/title.js` to render it inside the existing responsive SVG wrapper.


2.0.13: verification/release-consistency pass. Files:
- `engine/dom-refs.js`: synchronized the visible `CLIVEMAN_VERSION`.
- `tools/test_drive_minimap_runtime.js`: dependency-free runtime exercise of the exact source minimap renderer with desktop/mobile sizes, multiple headings, all building types, GPS route, destination blip, north marker, and player chevron.
- `tools/test_consistency.js`: release metadata agreement checks.
- Real Chromium/Xvfb validation additionally exercised the shipped bundle with WebGL on desktop and mobile; movement changed the radar and pause held the radar pixel-identical.

2.0.11: city-drive minimap depth pass. Building metadata now drives distinct church/grocery/tower footprints, height-sensitive roof insets and shadows, and restrained spire markers.


2.0.10: city-drive minimap/objective-boundary pass. Files:
`minigame/clivesbuick.js`, the shipped drive bundle,
`engine/transitions.js`, `engine/dom-refs.js`, `tools/test_drive_city.js`,
docs. Notes:

- `CITY_MIN`/`CITY_MAX` are now the shared source of truth for the drive
  physics, minimap footprint, and road clipping. Keep new map rendering or
  collision code tied to those values rather than reconstructing bounds.
- `chooseGoalPoint()` hashes `goalKey`, `destLabel`, or `title` and selects a
  deterministic interior street intersection. The candidate grid intentionally
  leaves a two-block perimeter buffer and enforces distance from the spawn.
  New drive objectives automatically inherit this placement rule when their
  destination label is passed to `startClivesBuick()`.
- The car clamp uses `CAR_RADIUS` so the entire rotated vehicle remains inside
  the real city footprint. The minimap clips roads to that same footprint,
  shades out-of-city space, adds a boundary/N marker, and eases zoom with speed.
- `engine/transitions.js` passes `destLabel` and describes the red GPS
  route/compass dot; do not restore the obsolete green-arrow copy.
- The bundle was synchronized with the source manually because esbuild was not
  available in the repair environment. Both files are covered by
  `node tools/test_drive_city.js`.
- Validation: `node tools/test_drive_city.js`,
  `node tools/test_consistency.js`, `node tools/test_dialogue_parsing.js`,
  every-file `node --check`, HTML/script audit, ZIP integrity, and a
  fresh-extraction retest.

2.0.9: pause/save/localization consistency pass. Files:
`engine/ui-core.js`, `engine/cutscene.js`, `engine/transitions.js`,
`engine/controls-ui.js`, `engine/save-state.js`, `engine/i18n/core.js`, all seven
`engine/i18n/*.js` dictionaries, `engine/menus.js`, `engine/boot.js`,
`story/title.js`, `minigame/clivesbuick.js`, the shipped drive bundle,
`engine/dom-refs.js`, tests/docs. Notes:

- Pause is a global state dispatched through `clivepausechange`. The shared
  `sleep()` excludes paused time; dialogue/read/continue gates ignore keyboard,
  click, and gamepad confirmation while paused. The drive source and prebuilt
  bundle both freeze their tick loops and clear held input.
- The compact numeric save code is unchanged. CLIVE1 payload version 2 layers
  `heading` and `secretEnding` around it. `decodeSave()` accepts numeric codes,
  v1 objects, and v2 objects; `story/title.js` must pass the whole parsed object
  through rather than extracting only `.code`.
- `state.resumeHeading` is transient and consumed on the first matching room
  load. Free movement updates cardinal `state.heading` while turning in place.
- All seven dictionaries receive the same 29 UI/save consistency keys via a
  final `Object.assign` block. Keep `{CONFIRM}` intact in translated controller
  prompts so runtime glyph substitution still works.
- Invalid saved/requested language codes normalize to English, preventing an
  asynchronous `setLanguage()` retry loop.
- Validation: `node tools/test_consistency.js`,
  `node tools/test_dialogue_parsing.js`, every-file `node --check`, HTML/script
  audit, ZIP integrity, and fresh-extraction retest.

2.0.8: dialogue parsing/presentation + keyboard focus cleanup. Files:
`engine/dom-refs.js`, `engine/voice.js`, `engine/ui-core.js`, `engine/menus.js`,
`engine/boot.js`, `index.html`, tests/docs. Notes:

- `window.CLIVE_SPEAKER_RE` in `dom-refs.js` is now the single speaker-prefix
  grammar used by both voice/color and the dialogue plate. It accepts ASCII
  `:` and full-width Chinese `：`, with or without whitespace after it. Do not
  fork this regex again: Chinese has 71 translated named lines and all use
  `：` immediately before the opening quote.
- `setDlgName()` still leaves ordinary full-screen nav untouched, but now
  allows `nav-mode.nav-dialog` through. CSS has a matching display selector
  for `#dlgName.show`; both halves are required or the body prefix/plate can
  disagree.
- Desktop title choices focus NEW GAME after paint. The document-level click
  handler now ignores interactive descendants and modal dialogs instead of
  blindly refocusing `#cmd`. Settings/pause overlays carry dialog semantics
  and focus their first useful control.
- The debug-menu state reset now includes `state.atDriveStart=false`.
- Validation: every JS file passes `node --check`; the new dependency-free
  `node tools/test_dialogue_parsing.js` passes 24 checks, including all seven
  translated dictionaries (71 named lines each).

## Previous release: 2.0.7

2.0.7: hand scale 2.4 (was 2.7) + aspect-correct horizontal anchoring. One
file: `engine/handmodel.js` (+ version bump). Notes:

- The fov is vertical, so only the HORIZONTAL anchor needed compensation.
  follow() translates the group in camera-local x by
  `_anchorX * (cam.aspect/(4/3) - 1)` each frame; `_anchorX = centroidX + dx`
  is stored at build. The translation multiplies the anchor's camera-space x
  by aspect/REF, exactly cancelling the aspect divisor in ndcX = x/(-z*tan37*
  aspect). REF is 4/3 because that is the aspect the dx tune was chosen at —
  if the framing is ever re-tuned at a different aspect, update REF in
  follow() to match.
- Compensation is exact at the anchor depth; residual grows with |aspect-REF|
  for verts at other depths. Landscape aspects are visually identical; at
  9:16 portrait ~13% of hand verts sit past the right edge (knuckle sliver) —
  accepted. Without compensation the whole hand would be off-screen there.
- The offset applies every frame (not only while moving) — the old sway-only
  gate would have left stationary frames uncompensated. Sway/lag still gate
  on movement inside the same block.

## Previous release: 2.0.6

2.0.6 reverts 2.0.5's arm flip and reframes the viewmodel instead. One file:
`engine/handmodel.js` (+ version bump). Key technical notes:

- **2.0.5's flip was a misdiagnosis.** Definitive anatomy came from boundary
  topology: edges used by exactly one triangle mark the open shoulder cut,
  and its 6 verts sit at y~+0.04, z~-0.18 — high and NEAR. The bake (shoulder
  near, elbow forward-far, hand hanging low-near) was correct as exported.
  The "backwards" look came from the hand being cropped below the screen at
  scale 0.62.
- **Reframe rotation**: `tune.rotX`/`tune.rotY` (degrees), yaw about Y then
  pitch about X, both about the geometry centroid, folded into build()'s
  transform. Defaults rotX:170, rotY:-40, scale:2.7, dx:0.14, dy:-0.14,
  dz:-0.17 — turns the hanging arm into a raised hand (fingers up, wrist at
  the bottom-right edge). Rotation is proper (det +1): chirality and winding
  survive. Deltas and normals MUST get the same rotation (vector form).
- **Static painter's sort**: material renders depthTest-off, so draw order =
  self-occlusion. The mesh is camera-locked, so back-to-front order is
  constant: build() presorts a COPY of the index buffer by triangle centroid
  z (far first). GEO.i itself is never mutated (build runs per room).
  Breathing (~0.02*s) is negligible for ordering.
- At these defaults no verts cross the 0.04 near plane (nearest z -0.154);
  the crop is purely by screen edges. If future tunes push geometry behind
  the camera that is fine — the GPU clips it (frustumCulled already false).
- Tooling: `/home/claude/work/handtest/ascii_hand.js` — terminal software
  rasterizer (z-buffered, fov 74, depth-shaded chars, H/S/E anatomy markers)
  used because headless image inspection was intermittently unavailable.
  Usage: `node ascii_hand.js flip pitchDeg yawDeg scale dx dy dz`.

## Previous release: 2.0.5

2.0.5 fixes the nav-mode right-arm viewmodel showing backwards. One file:
`engine/handmodel.js` (+ version bump). The baked camera-space geometry had
its forward axis flipped — diagnosis: fingers (dense verts, y down to -0.44)
were at the NEAR z band while the shoulder (coarse verts, y up to +0.10) was
at the FAR band, i.e. the arm as seen from in front of the character.

The fix rotates positions 180° about the vertical axis through the centroid
inside `build()`, folding it into the existing centroid-scale loop
(`(c - src)*s + c + offset` instead of `(src - c)*s + c + offset` on x and z).
Normals and the breathing morph deltas get the vector form of the same
rotation (negate x,z, no pivot). Things worth remembering:

- It is a rotation (det +1), NOT a mirror — do not "fix" this by negating a
  single axis, which would turn the right arm into a left arm and invert
  triangle winding.
- Pivoting on the centroid preserves the on-screen bounding envelope, so the
  tuned framing (`CMHAND.tune`, retuned in 1.9.31) needed no changes —
  verified: post-flip x range 0.42..0.60, z range -0.48..-0.68, matching the
  pre-flip envelope, comfortably clear of the 0.04 near plane.
- The morph deltas MUST be rotated with the positions or the breathing idle
  would push the flipped verts along un-flipped directions (arm would
  "breathe" sideways/inward).
- Verified with single-frame A/B WebGL renders in headless Chromium (nav fov
  74, texture-decode awaited via `CMHAND._tex.image.complete` before the
  render, per the known async data-URI decode trap).

## Previous release: 2.0.4

2.0.4 is a size-reduction release; behaviour is unchanged. Files touched:
`minigame/clivesbuick.bundle.js` (rebuilt, now minified), `assets/easteregg.mp3`
(re-encoded VBR ~85 kbps), `minigame/vendor/draco/draco_decoder.js` (DELETED —
redundant), plus version bump in `engine/dom-refs.js` and docs. Zip shrank
from 3.9 MB to ~2.6 MB; on-disk from 8.8 MB to ~6.5 MB.

Technical notes worth keeping:

- **The shipped bundle had silently regressed to unminified.** The README's
  esbuild command has `--minify`, but the 2.0.3 bundle didn't — easy to miss
  because everything still works. When rebuilding, sanity-check the first line
  of the output: it should start `(()=>{var` with mangled locals, not
  `(() => {\n  // minigame/vendor/three.module.js`. esbuild does not mangle
  *property* names, so `window.startClivesBuick`, `draco._loadLibrary`, and
  every other property-based contract survives minification untouched.

- **`vendor/draco/decoder-src.js` is now the ONLY copy of the Draco decoder.**
  The standalone `draco_decoder.js` was an identical-content duplicate used by
  neither the build (source imports `decoder-src.js` as a string) nor the
  runtime (`draco._loadLibrary` override short-circuits DRACOLoader's fetch of
  `draco_decoder.js`). If the decoder is ever upgraded, regenerate
  `decoder-src.js` as `export default <JSON.stringify(decoderSource)>`.

- **Do not re-encode the embedded car GLB with gltf-transform defaults.**
  Measured: a straight re-encode (dedup+weld+draco, encodeSpeed 0, qp11/qn7)
  produced 788 KB from the 620 KB original — the shipped encode is already
  tighter than what current gltf-transform emits from decoded attributes.
  Also remember the hard constraint from `_collectWheels()`: wheel meshes are
  found by NAME regex (`/wheel|tyre|tire|(?<![a-z])rim/i`), so `join`/`flatten`
  transforms that merge or rename nodes will break wheel spin.

- Validation for this release: `node --check` on the bundle + dom-refs, jsdom
  concat-eval boot harness (BOOT: OK, 26 files), and a Playwright/Chromium
  smoke over HTTP: boot → `ensureDriveBundle()` → asserts
  `typeof startClivesBuick === 'function'` with zero page errors.

## Previous release: 2.0.3

2.0.3 is a presentation consistency pass: five independent root causes, listed
below, all of them a case of the story surface contradicting itself. No story,
gameplay or layout changes — each fix makes an existing behaviour apply
uniformly instead of only sometimes. Files touched: `story/title.js`,
`engine/voice.js`, `engine/ui-core.js`, `engine/story-art.js`,
`engine/save-state.js`, plus the version bump in `engine/dom-refs.js`.
`index.html` untouched. No renderer, no nav mode, no drive bundle rebuild.

### 1. `section()` must keyword-match the UNTRANSLATED title

This is the sharp edge worth remembering. `section()` fires three keyword
matchers off the title:

    ClassicalMusic.cue(title)   <- raw title
    CMSTING.hint(title)         <- raw title
    STORYART.hint(title)        <- was getting the TRANSLATED title

`window.t()` was applied before the art block, so `hint()` — whose rules are
English regexes and always will be — was matching against translated text in
seven of the eight languages. Two failure modes, and the second is the nasty
one:

- **Miss.** Most titles matched no rule at all. A null hint is a **no-op, not a
  clear**, so the panel kept showing the *previous* scene rather than going
  blank. Nothing looked broken; you just got the last illustration again.
- **Mismatch.** A translated title could still hit — on the wrong rule. In
  French, `DUDLEY MILLS HORSE TRACK` becomes `HIPPODROME DE DUDLEY MILLS`,
  which loses `horse|track` but keeps `dudley`, so the horse track drew the
  generic city skyline instead of the track.

(Titles that survived untranslated — `A DREAM`, `E N D O F P A R T O N E` have
no dictionary entry — kept working by accident, which muddied the symptom
further.) Coverage over the 17 section titles was en 17, es/pt 9, fr 8, ru 4,
hi/ar 3, zh 2.

The translation now happens *after* the art block, so all three matchers see the
same raw string. The printed title is still translated. **If you add anything
else keyed off a section title, key it off the raw title, above the `window.t()`
line.**

### 2. `CHAR_COLOR()` and `speakerOf()` have to agree

Both live in `engine/voice.js`, both parse a line with the same `SPEAKER_RE`,
and they disagreed on the untagged case. A `speaker` line with no `Name:`
prefix is Cliveman's internal monologue — `speakerOf()` routes it to
`__narrator`. `CHAR_COLOR()` instead fell through to `normName(input)` on the
*whole sentence*, hashed that into a colour, and cached it into `CAST` under a
key that was an entire line of dialogue. Result: every monologue line rendered
a different purple/blue, and the `CAST` table slowly filled with garbage.

`CHAR_COLOR()` now only treats the input as a bare name if it could plausibly
be one — 2-30 characters (the length bound `SPEAKER_RE` uses) and no quote
characters — and returns null otherwise, so the line keeps the amber its
`.speaker` class gives it. Note this is a looser test than `SPEAKER_RE`, which
also excludes `:`; the guard only has to separate a name from a sentence. Bare-name lookups (`CHAR_COLOR('Bevan')`) still work; nothing in-tree uses
them today, but the documented API kept them.

### 3. The speaker plate retires on anything that isn't a named line

`setDlgName()` had an allowlist — `narration`, `sys`, `err`, `dim`, `credits`
cleared the plate, and every other class silently left it up. So an untagged
monologue printed under whichever character spoke last. Inverted: the plate
shows for a *named* speaker line, retires for everything else.

Audited before changing, and the reason it's a no-op everywhere except the case
it fixes is worth stating precisely, because it isn't the obvious reason. Only
`typeLine()` and `instantLine()` call `setDlgName()`; `appendLine()` does not.
So `car`, `press-continue` and `stair-anim` — and the `ascii` art inside the
minigames — never went through the allowlist at all, because they are appended
directly. That leaves `ascii` (in `cutscene()`), `savebox`, `version` and
`input-echo` as the only classes the change can actually reach, and each of
those either follows a `sys`/`narration` line that had already retired the
plate, or renders on a screen reached through `clearScreen()`, which clears it.
`instantArt()` likewise uses `appendLine()` and never touched the plate.

### 4. `STORYART.set()` retires the character figure

A figure belongs to the scene it walked into. `set()` swapped `.story-scene` and
left `.story-char`, so the rooftop shooter stayed layered over the Chapter 3
skyline until something happened to call `clearScreen()`. `set()` now calls
`clearChar()` when the scene key actually changes. Two things make this safe:
`set()` already early-returns when the key is unchanged, and **every call site
sets the scene first and the figure second** (verified with an AST pass over all
of `story/`). If you ever write `char()` before `set()`, that ordering breaks.

### 5. One save/load box geometry

Three ASCII boxes at 44, 45 and 46 columns. The "SAVE FILE ACCEPTED" checkpoint
row was hand-spaced for a two-character checkpoint, but `decodeSave()` rejects
anything outside 1-7, so it's always one digit and that row's right border was
permanently one column short. All three are 46 columns now, and the checkpoint
row is padded programmatically rather than by eye. If you add a box, 46.

### Validation

    node tools/validate_boot.js                  # 26 files, one shared scope
    node tools/test_presentation.js              # 44 checks
    node tools/test_presentation_regress.js      # 8 checks

Plus a Chromium pass at 1280x800 confirming on screen: the plate renders at the
dialogue box edge with the prefix stripped from the body, a `section()` change
swaps the scene *and* drops the figure, French routes the rooftop art while
still printing `LE TOIT`, and the save box borders line up. No page errors.

The regression harness has one wrinkle worth knowing: `typeLine()` with
`cls==='speaker'` awaits `dlgAdvanceGate()`, which blocks on player input. A
headless test must poll `window._dlgAdvance()` to release it or it hangs
forever.

## Previous release: 2.0.2

2.0.2 is a dead-code and performance pass. No gameplay, story or visual design
changes. Both renderers are verified pixel-identical to 2.0.1 (see below).

### Boot path: what is and isn't parser-blocking now

`index.html` went from 35 parser-blocking scripts / 3.84 MB to 27 / 1.21 MB.
Two rules to keep in mind if you add scripts:

1. **Language dictionaries are no longer static tags.** `engine/i18n/*.js` are
   fetched one at a time. `core.js` decides which, and *how*, based on
   `document.readyState`:

       readyState === 'loading'  -> document.write (parser-blocking, ordered)
       otherwise                 -> injected <script> + onload callback

   The `document.write` branch is load-bearing, not legacy sloppiness. It is
   what guarantees the dictionary is resident before any later script runs, the
   way the old static tags did. `fetch()` is not an option: the game must run
   from `file://`. The `readyState` guard is also what keeps `validate_boot.js`
   safe — a `document.write` after load would wipe the jsdom document.

   `window.I18N_LANGS` is now the authoritative list of shipped dictionaries.
   **Adding a language means adding it there as well as dropping in the file**,
   otherwise `loadLanguage()` will refuse to fetch it. `menus.js` keeps its own
   display list (code/label/native) — that one is for the buttons.

   `setLanguage(lang, cb)` is now async-capable: if the dictionary isn't
   resident it loads it and re-enters. Anything that repaints after a language
   change must go in the callback, not on the next line. The title-screen
   rebuild in `menus.js` was moved for exactly this reason.

2. **The drive bundle is fetched on demand.** `window.ensureDriveBundle()` in
   `engine/transitions.js` returns a promise that resolves `true`/`false` and
   coalesces concurrent calls. `driveClivesBuick()` awaits it *after* the
   `ClassicalMusic.cue()` (the cue must still fire first — see the CUE_RULES
   note further down) and before the `startClivesBuick` availability check, so
   the existing ASCII-transit fallback covers a failed load unchanged.

   A `requestIdleCallback` warms it in the background so the first drive is
   instant. That prefetch fires almost immediately on an idle page — which is
   correct and is *not* the same as loading it eagerly: the parser never blocks
   on it, so first paint and time-to-title are unaffected. When asserting on
   this in a test, snapshot requests at `domcontentloaded`, not later, or you'll
   see the prefetch and think the deferral failed.

### Per-frame allocation: the pattern to watch

Three allocations-per-frame were removed, and they're worth remembering as a
class of bug because none of them looked expensive at the call site:

    engine/minimap.js   P() returned a fresh [x,y]      ~1000 arrays/frame
    engine/raycaster.js window._rcLast = {...}          1 object/frame, x2 paths
    engine/nav3d.js     floorHAt()'s inner at()         1 closure/frame

The minimap one was by far the worst: `P()` is called four times per wall cell
over a ~13×13 window, in two passes, plus once per blip, and the radar redraws
on every nav frame. It now writes into a module-level `Float64Array(8)` —
eight slots because four corners is the most any caller needs live at once. If
you add a pass that needs more than four points simultaneously, grow `_PT`;
don't go back to returning pairs.

### Verifying render changes: pixel equality

Any change to `raycaster.js` or `minimap.js` should be proven output-identical
before it ships. The harness pattern that works:

  * render the same scenes with the old and new file in two Chromium pages,
    FNV-1a hash the full `getImageData` buffer, compare;
  * **seed `Math.random` first.** Wall and floor textures are generated with
    random grain, so an unseeded RNG makes every run differ for reasons that
    have nothing to do with the code under test. This is not optional — without
    it every single frame reports a mismatch and the test is useless;
  * sweep grids × themes × angles, and run mobile *and* desktop separately:
    `IS_MOBILE` selects different row/pixel step sizes, so a change can be
    identical on one and wrong on the other.

2.0.2 was verified this way: 192/192 raycaster frames (2 grids × 6 themes ×
8 angles × 2 device modes) and 24/24 minimap frames, all bit-identical.

### Measured

    raster raycaster, mobile 640x360    2.123 -> 1.777 ms/frame   -16.3%
    raster raycaster, mobile 960x540    3.426 -> 2.556 ms/frame   -25.4%
    raster raycaster, desktop 640x360                             no change
    minimap drawGrid                                              -1 to -2%
    DOMContentLoaded (file://)            439 -> 258 ms           -41.2%

SwiftShader, so absolute numbers are inflated; the deltas are the point. Two
honest caveats, because it's worth knowing which of these actually bought
anything:

* **The mobile raycaster win is real and repeatable** — it reproduced at -14%
  and -16% at 640×360 across separate runs, -23% and -25% at 960×540. That one
  is the `copyWithin`.
* **Desktop raycaster and the minimap are within noise.** Desktop never takes
  the row-skipping path, so `copyWithin` can't help it; across runs it measured
  anywhere from -3.4% to +4.0%, i.e. nothing. The minimap allocation fix
  measured -5.5% once and +0.2% another time; a careful interleaved A/B put it
  at about -1 to -2.5%. Canvas rasterisation dominates that function, not the
  allocation. Don't quote a bigger number for it than that.

An attempt to demonstrate the minimap win via `usedJSHeapSize` deltas over
3000 frames produced garbage (it reported the *new* code allocating more),
because intermediate scavenges make that delta meaningless. If you want to
prove an allocation change here, use the allocation profiler, not heap-size
sampling.

### Removed

`buildStairwell()` (raycaster.js), `navigateStairwell()` and `STAIR_ROOM_ID`
(controls-ui.js) — orphaned by the 1.9.34 five-floor factory rebuild. Two
never-read locals in `rcRender` (`stepXMul`, and `rowStart2` which was
recomputed every row of every frame).

Deliberately kept: the `freeMove:false` discrete-stepping branch in
`navigateRoom()`. No room opts into it today, so a static pass flags it, but
README documents it as a modding hook and removing it would break that contract.

---

## Previous release: 2.0.1


2.0.1 is a housekeeping pass: one architectural fix (the audio bus) plus three
hot-path optimizations in the finale/render code. No gameplay, story or visual
design changes.

### The master audio bus (the important one)

Before 2.0.1 there were SIX independent paths to the speakers:

    engine/audio.js         beep()            -> audioCtx.destination
    engine/stings.js        CMSTING.play()    -> c.destination
    engine/transitions.js   death sting x2    -> audioCtx.destination
    engine/music-classical  master gain       -> ctx.destination
    story/ch3.js            finale hiss       -> audioCtx.destination   (no mute check)
    minigame/clivesbuick.js engine drone      -> ITS OWN AudioContext   (no mute check)

Mute was a boolean each subsystem agreed to consult. Two never did, so muting
the game and then triggering the finale, or driving the Buick, still made noise.
The drive bundle additionally created `window.__cvAudio`, a *second*
AudioContext — meaning two graphs, two suspend/resume lifecycles, and no
possible global volume.

`engine/audio.js` now owns one master `GainNode`:

    window.audioBus()   -> the master GainNode (lazily created on audioCtx)
    window.CMAUDIO      -> { ctx, bus, setMuted, isMuted, toggleMute,
                             setVolume, getVolume }

Every emitter connects to `(window.audioBus() || ctx.destination)` — the
fallback keeps each module independently survivable if audio.js ever fails to
init. `setMuted()` now ramps the bus gain exponentially over 80ms (a hard cut
clipped when muting mid-chord). The per-caller `_muted` early-returns were kept
deliberately: they avoid *scheduling* work while muted, and the bus is the
backstop that catches anything already scheduled.

**Invariant to preserve: the bus must be the only node connected to
`ctx.destination`.** `test_audio_bus.js` asserts exactly this by recording every
`connect()` edge against a mock WebAudio graph and walking the graph from each
emitter. If you add a sound source, connect it to `window.audioBus()`.

Both harnesses ship in `tools/` (`node tools/validate_boot.js`,
`node tools/test_audio_bus.js`) and need only `jsdom` installed.

Gotcha in the bus test: an oscillator modulating an AudioParam
(`lfo.connect(osc.frequency)`) is a legitimate terminal that never reaches the
speakers, so the graph walk treats AudioParam mocks as valid sinks. Without that
the test flaked — the music engine picks voices randomly, so only runs that
happened to select a modulated instrument failed.

The drive bundle is a separate esbuild scope and cannot see audio.js locals,
which is why the handles are on `window`. `clivesbuick.js` now prefers
`CMAUDIO.ctx()` and only falls back to constructing its own context if audio.js
is absent; `window.__cvAudio` is still set for back-compat. **Bundle was rebuilt**
— the diff against the old bundle is exactly the two intended changes and
nothing else, which is a good way to confirm the esbuild invocation still
matches whatever produced the shipped artifact.

### Finale effects (story/ch3.js)

- `startStatic()` allocated a full-window `ImageData` per frame and randomized
  every subpixel. Measured 43.7 ms/frame at 1080p (7.9 MB alloc, 8.3M RNG calls)
  — it could not hold 30fps on noise generation alone. Now quarter-resolution
  (`STATIC_SCALE=4`) into one reused buffer, alpha filled once at setup since it
  never changes, upscaled nearest-neighbour: 2.3 ms/frame, zero per-frame
  allocation. ~19x. Chunkier grain suits the phosphor aesthetic better anyway.
- `fwLoop()` set `shadowBlur`/`shadowColor` per particle. Canvas2D re-rasterises
  shadows on every draw call and the credits run 500+ live particles. Replaced
  with one pre-baked 32px radial-gradient sprite per colour (`fwSprite()`,
  cached in `_fwSprites`), blitted at `p.size*3.2` since the sprite is mostly
  falloff. Visually equivalent.
- **There was no `stopStatic()` at all.** `startStatic()` was the final statement
  of `playFinale()`, so its rAF loop and looping noise source ran until page
  reload. Added `stopStatic()` (also on `window`); `playFinale()` and
  `playFinaleEasterEgg()` both call it on entry so re-running the credits can't
  stack loops. `startStatic`/`startFireworks` are now idempotent, and
  `startFireworks` no longer adds a duplicate `resize` listener per run — both
  finale paths call it, so it was leaking one handler each time.

### Raycaster

`_hexRGB()` is memoized into `_hexCache`. It sat in the per-frame path and
allocated a fresh 3-element array from three `parseInt`s 3-4x/frame. Themes are
a fixed small set so the cache is bounded by design. Callers only read the
triple — **do not mutate the returned array.**

### Verifying render changes

The raycaster is **nondeterministic run-to-run** (procedural noise + time-based
terms), so naive screenshot/hash diffing produces false positives — an
original-vs-original control run differs on every scene. To diff renders, seed
determinism via `addInitScript` before load:

    let s=0x2f6e2b1;
    Math.random=function(){s^=s<<13;s^=s>>>17;s^=s<<5;return ((s>>>0)/4294967296);};
    performance.now=()=>1234567; Date.now=()=>1234567;

With that, 2.0.1 hashes bit-identical to 2.0.0 across all seven RC_THEMES.
Also note: when constructing a test theme, use a real `RC_THEMES` entry — an
invented object missing fields throws inside `_hexRGB`.

Environment note: `fonts.googleapis.com` is blocked by the sandbox egress proxy,
so a 403 for the VT323/Share Tech Mono stylesheet in headless runs is expected
and not a regression.


2.0.0 is a version relabel of 1.9.36 (no code change) — the 2.0 milestone after
the Part One work: factory restored to five stacked floors + walk-up stairs
(1.9.34), mobile radar moved off the thumb buttons (1.9.35), and radar kept fully
on-screen at every window aspect (1.9.36). Details for each are below.

Most recent code work (1.9.36): guaranteed the nav radar stays fully on-screen at any
window aspect. The raster radar is baked into the 384x216 (mobile) / 768x432
(desktop) canvas buffer. Mobile displays that buffer with `object-fit:contain`
(letterboxed) so the whole buffer — radar included — is always visible; but
DESKTOP nav uses `object-fit:cover` (index.html ~line 517, full-bleed), which
crops the buffer edges when the window isn't 16:9. The radar lived at the buffer
bottom-right, so on common 16:10 windows (1440x900 -> ~30-60px, 1280x800) the
cover-crop sliced its right side off the screen; ultrawide crops top/bottom.

Fix (engine/raycaster.js, rcRender minimap block): compute the visible un-cropped
buffer rect from the canvas content box and the cover scale, then pin the radar
to that edge:
  _dw=canvas.clientWidth||window.innerWidth; _dh=canvas.clientHeight||innerHeight;
  cover=max(_dw/W,_dh/H); cx=(W-_dw/cover)/2; cy=(H-_dh/cover)/2;
  visR=W-cx (if cx>0); visB=H-cy, visT=cy (if cy>0);
  mmX=max(pad, visR-mmSize-pad); mmY(desktop)=max(visT+pad, visB-mmSize-mmBottom).
Guarded to only run when !IS_MOBILE (mobile keeps buffer-edge top-right since
contain shows everything). On a true 16:9 window cx=cy=0 so nothing moves (no
regression). clientWidth is the content box object-fit actually uses (excludes
the 2px bezel border), with innerWidth as a first-frame fallback.

Verified: pure-math check of the clamp + object-fit transform across 1920x1080,
1440x900, 1366x768, 1280x800, 2560x1080, 1024x768, 3440x1440, 800x1200 (desktop
cover) and 390x844/844x390/360x780/768x1024 (mobile contain) -> radar rect fully
within the viewport in ALL cases. Browser (Playwright, raster forced): on
1440x900 the radar renders in the buffer bottom-right but INSET from the buffer
edge (arrow+blip pixels present x600-740, zero in the x740-768 edge strip), and a
right-edge screen scan finds zero radar-ring pixels touching the screen edge (no
clip). Only engine/raycaster.js changed; drive bundle untouched.

Prior release (1.9.35): moved the mobile radar to the top-right so the thumb
buttons stop covering it (see below).

Most recent work (1.9.35): fixed the mobile nav minimap being covered by the
on-screen buttons. In nav mode the touch controls take both bottom corners
(`.fp-pad` D-pad bottom-left, `.fp-acts` C/SAV/INV bottom-right, positioned by
the `@media (max-width:767px),(pointer:coarse)` blocks in index.html), while the
GTA-style radar was drawn bottom-right in BOTH renderers — so `.fp-acts` overlaid
it. Measured overlap on an 844x390 phone: ~86x141px. Fix moves the radar to the
top-right on mobile only (compass is a centred 168px strip, stats are top-left,
the header/pause is display:none in nav mode, so top-right is free):
  * Raster path (`engine/raycaster.js`, in `rcRender`'s minimap block): `mmY` is
    now `IS_MOBILE ? mmPad : (H-mmSize-mmBottom)`; `mmX` unchanged (right edge).
    Radar is baked into the 384x216 buffer at buffer top-right (x292, y8).
  * WebGL path (`.fp-mm` overlay canvas, index.html): added
    `@media (max-width:767px),(pointer:coarse){body.nav-mode .fp-mm{top:12px!important;
    right:12px!important;bottom:auto!important;}}`. It's `position:fixed`, so this
    pins it to the viewport top-right. Desktop keeps `right:14px;bottom:64px`.

Verified (Playwright, iPhone-ish viewports, nav3d forced OFF so the raster path
renders): computed overlap of the radar rect vs `.fp-acts` and `.fp-pad` is 0px²
in both portrait (390x844) and landscape (844x390); canvas `object-fit` is
`contain` (letterboxed), not cover — earlier reasoning that assumed cover was
wrong, so positions were re-derived from the live layout. Buffer pixel check:
minimap player-arrow + POI blips now score in the buffer's top-right and 0 in the
old bottom-right. `.fp-mm` computed position confirmed top:12/right:12 on mobile
viewports and bottom:64/right:14 on desktop. Only `engine/raycaster.js` and
`index.html` changed; no story/JS logic touched; drive bundle untouched.

Prior release (1.9.34): restored the factory to five stacked flat floors joined
by walk-up stairs (see below).

Most recent work (1.9.34): reverted the factory from the "continuous tower" to
five separate stacked floors joined by walk-up stairs. Background: 1.9.6 fused
the Mayo Corp interior into ONE height-mapped room (`buildFactoryTower` in
`engine/raycaster.js`) drawn by the sector renderer (`rcRenderSector`) — five
decks at rising floor heights (0.0→3.6) in a single open shaft. In practice that
renderer produced a corrupted, sloped, spaced-out space that never read as a
building. Fix is entirely in `story/ch1.js`: `ch1_factory(startFloor)` is now an
orchestrator loop over five plain flat rooms `factory_f1`…`factory_f5`
(`ROOM_F1`…`ROOM_F5`), each a ~5×7 grid rendered by the ordinary flat raycaster
(NO `_floorH`, so it never touches the sector path). Stair tiles (`S` up / `v`
down) resolve their room; the loop then plays `floorTransition('up'|'down', …)`
(the apartment-building stair cutscene) and re-enters the next floor. Clue
placement is the classic layout: F1 worker+mop, F2 locked door+badge, F3
bystander+rat poison, F4 shadowy suspect, F5 ROOF ACCESS door. Convention every
floor: arrive SW landing, climb to NE stairs.

Gating: F4 has an `exitGate` that blocks `up` until `state.kw2_found` (you must
confront the suspect first — he then bolts for the roof). The roof door on F5 is
a checked (`D`) exit still gated by the pre-existing `factoryGate` (badge +
poison + kw2). `factoryGate`'s kw2 message was reworded so it doesn't say "you
haven't reached the top floor" while standing on it. Going down is never gated.

Engine change (`engine/controls-ui.js`, `navigateRoom`): the resume branch now
validates `state.resumePos` against the target grid — out-of-bounds or on-a-wall
(e.g. a stale save from inside the retired tower, whose grid was ~30 rows while
save row/col are 4-bit) falls back to the room's `start` instead of stranding the
player. Every floor is its own `roomId` again, so mid-factory saves + in-session
floor moves record the exact floor.

Left dormant/unused in the engine: `buildFactoryTower`, `rcRenderSector`, and
the `_floorH`/`_ceilH` sector plumbing (nav3d still reads `_floorH` if a grid
ever carries it) — kept in case a real multi-storey shaft is wanted later.
(`buildStairwell`, `navigateStairwell` and `STAIR_ROOM_ID` were also left
dormant here, but 2.0.2 deleted them as dead code — see its Removed list. The
four symbols above are the ones still in the tree.)

Validation: `node --check` on all touched files; jsdom concat-eval boot harness
(shared-scope) with an in-scope behavioral test — grids rectangular, every exit
sits on a stair/door tile, clue events flip their flags + add items, F4 gate and
roof gate correct, a full climb fires exactly 4 floor transitions, and
`ch1_factory(3)` (resume) fires 2. Playwright/Chromium (nav3d forced off → raster
flat renderer): floors 1, 4, 5 render as clean flat rooms — metal factory walls,
correct perspective, the roof door as a wall panel, the suspect as a person
glyph. No sloped decks. (Headless note: entering a floor synthetically leaves
body without `nav-mode` because the real boot/menu flow is bypassed, but drawFP
still renders the room; read the canvas backing buffer via `toDataURL`, not an
element screenshot, since the game container is `display:none` until the real
start flow runs.)

Prior release (1.9.33): fixed nav and drive being invisible on desktop.
Root cause: the desktop full-screen block positions `.fp-canvas`/`.cv-canvas`
`absolute; inset:0` expecting `.fp-wrap` (100vw x 100vh) as the positioning
context, but the 1.9.10 compass work wrapped both canvases in `.fp-stage`
(`position:relative`, unsized inline-block) - the canvas resolved against that
0x0 stage and displayed at 4x4px (borders only) while the backing buffer kept
rendering normally. Mobile got this exact fix in the v1.8.4 block; desktop
never did. Fix: the desktop full-screen block now sizes
`body.nav-mode .fp-stage, body.cv-driving .fp-stage` as
`absolute; inset:0; width/height:100% !important` (inserted right after the
`.fp-wrap` rule it depends on, BEFORE the v1.8.4 mobile block so mobile keeps
winning its cascade). Compass and crosshair anchor against the stage, so both
snap back to their intended spots (top-centre / dead-centre). Second edit: the
`@media (max-height:500px) and (orientation:landscape)` phone block now carries
the `and (pointer:coarse)` guard its own comment always claimed, so short
desktop windows (e.g. devtools docked bottom) can't pick up phone styling.
index.html only; no JS changed; drive bundle untouched.

Verified (Playwright/SwiftShader): desktop 1280x800 real flow (DEV menu ->
apartment) - fp-stage/fp-canvas 1280x800, compass y~44 top-centre, crosshair
centred, WASD movement crosses cells; desktop drive canvas 1280x800; mobile
390x844 portrait and 844x390 landscape (pointer:coarse) unchanged full-size.
NOTE for headless testing: rAF runs at 2-4fps under SwiftShader compositing
(main thread idle, no long tasks) - hold movement keys for seconds, not
milliseconds, or free-move velocity never accumulates. Also: canvas-buffer
screenshots (rAF->drawImage->toDataURL) prove the ENGINE renders but say
nothing about on-screen layout - always pair them with getBoundingClientRect
audits. That gap is how this bug hid.

## Previous release: 1.9.32

Most recent work (1.9.32): second illustrated scene, the Chapter 1 head-on
collision. `assets/scenes/collision.jpg` (16:9 crop, 320x180, JPEG q62, ~14 KB)
registered as `collision` in `SCENE_IMG_DEFS`; cued by `STORYART.set('collision')`
at the top of `ch1_drive_to_factory()` in `story/ch1.js`, just before the drive
minigame. No new code paths — reuses the 1.9.27 raster pipeline. The scene stays
up through the drive transition until the next `set()`/`clear()`.

## Previous release: 1.9.27

Most recent work (1.9.27): first illustrated scene. The opening nightmare
(Cliveman's wife, hotel room) now shows a raster illustration instead of the
wireframe vector. Pipeline, for consistency as more images are added:

- Source image cropped to 16:9 (matches the 640x360 scene viewBox), downscaled
  to 320x180 (slight pixelation), saved JPEG quality ~62 -> ~13 KB. Lives at
  `assets/scenes/dream.jpg`.
- `engine/story-art.js` gained `imgDoc(src)`: wraps the image in the SAME
  640x360 SVG frame as `doc()` with identical vignette + scanline overlays
  (own defs ids `scVigI`/`scScanI`), `preserveAspectRatio="xMidYMid slice"`,
  `image-rendering:pixelated` (so the 320x180 upscales chunky, not blurry).
- New registry `SCENE_IMG_DEFS` (scene key -> asset path). `STORYART.set()`
  checks it FIRST; falls back to `SCENE_ART_DEFS`. Vector `dream` def left in
  place as fallback.
- To add the next illustrated scene: crop 16:9, resize 320x180, JPEG ~q60 into
  `assets/scenes/<key>.jpg`, add one line to `SCENE_IMG_DEFS`. No other edits.
- Validated: node --check, jsdom concat-eval boot harness (STORYART.set('dream')
  emits the <image> wrapper; vector scenes unaffected), Playwright/Chromium
  visual check of the rendered scene in the storyArt frame.

Previous release notes (1.9.26): hand viewmodel FRAMING fix (engine/handmodel.js
`tune` only). At 1.9.25's `scale 0.6, dx 0.04, dy 0` the on-screen slice was the
shoulder/upper-arm block (the baked mesh is a full right arm: shoulder->elbow->
forearm->hand), so the hand+forearm hung below the bottom edge and the visible
lump read as a "hunk of meat," not a fist. Raised + nudged the anchor to
`scale 0.62, dx 0.10, dy 0.26, dz 0` so the FOREARM + relaxed HAND frame into the
lower-right like a proper FPS arm. Verified by projecting GEO.p through the nav
camera (fov 74, wide aspect): the forearm/hand now land on-screen and the
shoulder crops off the top-right. Breathing morph (deltas are vectors, no
offset) and walk-sway untouched.

Previous release notes (1.9.25): hand viewmodel size + sprite-occlusion fix
(engine/handmodel.js only). (a) tune rescaled for the half-human-scale nav
world: scale 0.6, dx 0.04, dy 0, dz 0 - fist in the lower-right, arm running
off the bottom edge. (b) hand material is now transparent:true: the nav sprites
are all transparent and render in three's transparent pass AFTER opaques, so an
opaque hand (even renderOrder 1000 / depthTest off) got painted over by them.
In the transparent list renderOrder sorts before depth, so 1000 = drawn last,
always on top. Gotcha for headless visual tests: the data-URI hand texture
decodes async; wait for CMHAND._tex.image.complete before screenshotting or the
hand renders black.

Previous release notes (1.9.24) below.

Most recent work: hand viewmodel ANIMATION + placement fix (engine/handmodel.js).
Breathing idle: relax anim is a pure 2s sinusoid, so it bakes to base + ONE
peak-delta frame; follow() CPU-lerps the position attribute each frame with a
cosine influence (skips the write when |d inf|<0.004). CPU lerp is DELIBERATE -
three r152+ uploads GPU morphs as float data textures and that path is
unreliable on SwiftShader-class GL; direct attribute writes (DynamicDrawUsage)
run everywhere. Walk sway: nav3d render() now also computes mv=min(1,d*70) and
calls CMHAND.follow(cam,bob,mv,NAV3D._bobPhase); the hand lags the camera bob
(lagY fraction, camera-local Y) plus slow side sway (swayX, camera-local X),
smoothed via CMHAND._mv lerp. Placement fix: 1.9.23's tune spanned the FULL
frame height (fingertips off the top edge). Retuned with a near-plane-aware
silhouette renderer at the real 74-deg vfov: tune={scale:1.3,dx:0.06,dy:-0.17,
dz:-0.08,breathe:1,swayX:0.012,lagY:0.55} -> silhouette x 66-94%, y 35-100%,
11.7% area, near margin 0.14.

VALIDATION NOTES (important for future sessions): SwiftShader tabs in this
container die ~5s after the nav render loop starts (nondeterministic; ANY
pixel readback - toDataURL, drawImage, page.screenshot - can also kill them).
Two reliable patterns: (1) speed-run probes - front-load all evaluates into
the first ~2s after navigateRoom; (2) NO-READBACK verification - project the
live geometry through the live camera matrices in-page (pure JS math,
projectionMatrix * matrixWorldInverse * mesh.matrixWorld, coarse triangle
raster to an ASCII mask) and compare bbox/area against the offline tuner.
Driving nav mode directly from Playwright: addInitScript localStorage
cliveman_nav3d=1, wait ~2.3s for boot, then evaluate: TitleFlyover.stop();
body.classList.add('game-started'); navJustExited=true; navigateRoom(0,grid,
[2,1],{},{},{title:'TEST'}) fire-and-forget. In-game checks passed: live tune
served, geometry bbox matches offline prediction, in-page projected silhouette
x 66-94% / y 35-100% / 11.7% (exact match), breath influence ramping on-curve
with tipY following, sway deviation growing with movement; plus jsdom
shared-scope unit tests on real THREE r160 (peak vertex travel 0.0426 =
0.0328*1.3 exactly).

Previous (1.9.23): first-person RIGHT-HAND viewmodel in nav 3D mode
(`engine/handmodel.js`, `CMHAND`). Static baked slice of the PSX First-Person
Arms pack - right arm only, relaxed idle pose, pre-skinned in Blender and
exported into CAMERA-RELATIVE space (verts already in view space), so it needs
no runtime GLTFLoader (the global three.global.js has none; only the drive
bundle does) and no runtime skinning. Bare-skin NO-GLOVE texture PSX-reduced to
256px/128-color and embedded as a data URI (works under file:// and http://).
nav3d.js: build() adds `CMHAND.build(T)` -> a follow-Group to the scene at the
end of NAV3D.build (right after the scene is assembled); render() calls
`CMHAND.follow(cam)` right after the light-position line, copying cam
position+quaternion so the camera-space verts land exactly in view. Material is
unlit MeshBasic, depthTest=false / depthWrite=false, renderOrder=1000 -> draws
over walls (viewmodel). Texture flagged `__cachedByNav3d` so NAV3D._disposeScene
spares it; geometry/material are rebuilt per room (cheap, 379 verts / 588 tris).
Drive mode has its own scene and never adds the hand -> nav-only; raster
fallback never renders NAV3D.scene -> also hidden there. Placement tuned about
the mesh CENTROID (uniform scale about the camera origin is a projective no-op),
live-editable via `CMHAND.tune={scale:1.7,dx:0.05,dy:-0.05,dz:-0.02}`; dz kept
negative so the nearest wrist vert sits at |z|=0.065, clear of the camera near
plane (0.04) - no near-plane slice, and stable because the hand follows the cam
rigidly (bob/pitch don't change its view-space depth). Validated: node --check
x3, jsdom shared-scope build/follow unit test on real THREE r160 (379 verts,
depthTest off, follow copies transform, tuned bbox right+front), and a
standalone Playwright/Chromium WebGL harness rendering the hand over a nav-like
scene (floor + wall boxes + blue cubes) - confirmed bottom-right, on top, bare
skin, texture decoded, zero page errors.

Previous (1.9.22): context-aware audio stings (`engine/stings.js`, CMSTING).
Six procedural synths (hit/dread/riser/resolve/shimmer/gavel) keyword-routed
from section() titles - hook added in story/title.js next to the
ClassicalMusic cue, firing on the UNTRANSLATED title (same ordering rule as
the music director: cue before window.t()). Direct plays at four
section-less beats: trial open + GUILTY (ch3), arrest + crime scene (ch2).
Script tag added to index.html after audio.js; uses the shared-scope
`audioCtx` + `isMuted()` from engine/audio.js, connects to
audioCtx.destination like beep(). Throttle: 2.5s global, 8s per-kind;
RESUMED titles excluded. Validated: node --check x4, unit test (6 synths on
a stubbed ctx, throttle timings, mute/suspend guards, 24 hint cases
covering every section title), boot harness, and Playwright with
--autoplay-policy=no-user-gesture-required confirming all six graphs play
on a real running AudioContext with zero page errors.

Previous (1.9.21): scene-art size stability. `#storyArt .story-scene svg` is
now viewport-sized (`height:min(46dvh,53vw,428px);width:auto;max-width:94%`)
instead of container-sized, so dialogue length / choice panel / char art /
name plate can no longer rescale the illustration; the band crops into the
vignette instead (overflow:hidden already present, center-aligned so the
crop is symmetric). Short-landscape query: 30dvh + `max-height:100%` fit
guard. Playwright-verified (chromium-1194): size invariant across 6 UI
states at desktop + portrait; crop <= 5.7%/side at the worst viewport,
under the 8.3% ground-line margin; landscape fits exactly. Control run with
the old CSS reproduced the warp.

Previous (1.9.20): full story-beat art coverage for Part One. Five new scenes
in `engine/story-art.js` (dream, ruins, garage, arrest, sunrise) + hint
routing (arrest moved out of the street rule; secret ending matched in its
spaced-letter form; clemons/tubley -> factory) + four `STORYART.set()`
one-liners in story/ch2.js for beats with no section() or following
clearScreen() (crime scene, breakdown, alley panic, arrest). The arrest
scene introduces a single red accent (#ff5555 beacon + window wash), the
one deliberate palette break, consistent with the red death-sting vignette.
Validated: node --check (story-art.js, ch2.js), jsdom concat-eval harness
with all 11 post-1.9.18 scenes mounted through #storyArt, 25 hint cases
covering every section title in the game, cairosvg renders + pixel checks
(amber/red accent presence, coverage, span).

Previous (1.9.19): six new scene illustrations added to `engine/story-art.js`
(docks, tavern, track, arcade, yard, hall) in the established phosphor
line-art style, with `hint()` keyword routing so existing minigame sections
(Gumshoe Tavern, horse track, arcade) leave the generic street art, and the
Part Two beats (prison escape -> yard, Pyne -> hall, Mr. Sun -> docks) have
art waiting. Hint order: yard rule sits *before* the prison/cell rule so
escape titles inside the prison get yard art; the six new rules sit before
the street catch-all, which lost dock|tavern|arcade|track. Validated with
node --check, the jsdom concat-eval boot harness (scenes mounted via
STORYART.set through the real #storyArt path, viewBox + glow/scan defs
asserted), hint() routing unit cases, and cairosvg renders of all 14 scenes.

Previous release (1.9.18): `buildFactoryTower()` in engine/raycaster.js was rebuilt so
the one-room Mayo Corp tower reproduces the classic per-floor layouts (F1-F3
3x5 with wall stubs, F4 3x3, F5 2x4 roof floor) while keeping continuous
height-mapped walkable stairs. Flights ascend east->west with per-cell tread
heights (0.15-0.3u rises, < SECTOR_STEP_MAX 0.34); non-tread flight cells are
'#'. The builder returns the same contract (`grid`, `cells`, `landing`,
`furniture`, `itemArt`, `start`, `probe`, `startHeading`) so story/ch1.js is
untouched. Validated with node --check, the jsdom concat-eval boot harness,
a movement-rule BFS (start -> every clue -> roof, and descent), and a
Playwright/SwiftShader render smoke test at start/probe/roof.


Historical title-screen architecture note originally written for 2.0.13. Current release metadata is **2.0.20**; the source of truth is `engine/foundation.js` → `window.CLIVEMAN_VERSION`.

## Previous release (1.9.17): landmark low-rises (churches & corner stores)
Both night-city scenes now roll landmark lots so the grid isn't all towers:

- **Lot roll.** Drive (`minigame/clivesbuick.js`): 5% of lots become a
  landmark (32% church / 68% store) via an early `continue` in the building
  loop. Flyover (`engine/title-flyover.js`): 4% (35% church), rolled after
  the vacant-lot check, before the skyscraper push.
- **Construction.** Landmarks are built facing local +Z, then rotated in
  90-degree steps (every lot borders four streets, so any facing fronts a
  road) and dropped on the lot center. Church: 12×20 nave + pyramid roof
  (`ConeGeometry(√½,1,4)` rotated 45° → unit-box-base pyramid, shared with
  the nave and steeple), 7×16 steeple with cross, six warm stained-glass
  planes + rose window (`MeshBasicMaterial` → self-lit, fog still applies).
  Store: 20×16 flat-roof box, fluorescent storefront strip, neon sign — a
  256×52 canvas (`signTex`) with shadow-blur double-pass text from a name
  pool (GROCERY, MARKET, DELI, LIQUOR, 24 HR MART, BODEGA, DINER, and
  **BIG SMILES** as a story wink) and 4 neon colors — plus a random rooftop
  HVAC box.
- **Collision (drive).** Still the plain per-lot AABB list, sized to the
  landmark footprint (church 12×20, store 20×16, halves swapped when the
  facing index is odd). Radar rectangles follow automatically.
- **Flyover sharing.** `_landmarkKit()` builds shared geos/materials once per
  `_buildCity`; `stop()`'s traverse disposes them (double-dispose is safe).
  Groups are named `cv-church` / `cv-grocery` for scene-graph testing.
- Validation: `node --check` both files + bundle, jsdom boot harness OK,
  Playwright/SwiftShader zero page errors in both scenes; screenshot palette
  scan (PIL) confirmed stained-glass amber in both scenes and a neon sign +
  storefront strip in the drive frame. Bundle rebuilt.

## Previous release (1.9.16): rooftop spires + distant skyline (drive + title flyover)
Both night-city scenes gained vertical interest and a horizon:

- **Spires.** Shared `ConeGeometry(0.5,1,4)` tapered mast (base translated to
  y=0, scaled per instance). Drive (`minigame/clivesbuick.js`): individual
  meshes on buildings with `h > 38` at p=0.3, height 6–20, centered on the
  footprint (above car height → **no collision AABB change**); tips collected
  into one static `THREE.Points` (dim red, `depthWrite:false`). Flyover
  (`engine/title-flyover.js`): one `InstancedMesh`; the building loop now
  computes jitter **before** pushing, so spires *and* beacons align with the
  jittered buildings (beacons previously used un-jittered grid coords); the
  7% "tall" buildings always get a spire and their blinking beacon now rides
  the spire tip; other buildings `h > 42` spire at p=0.3.
- **Distant skyline ring.** `skylineTex()` / `_skylineTexture()` paint a
  2048×256 canvas: far band `#080c13`, near band `#0c111c` with sparse dim
  windows, thin texture-spires with red warning dots, and an 18px solid base
  strip so the ring meets the ground with no gap. Mapped (repeat 3×) onto an
  open-ended `CylinderGeometry(..., 64, 1, true)` with
  `MeshBasicMaterial({ transparent, side:BackSide, fog:false,
  depthWrite:false })`. **`fog:false` is load-bearing**: drive FogExp2 0.022
  (and the volumetric override) would erase anything at that radius, so the
  haze dimness is baked into the texture instead. Drive: radius `span*1.05`,
  height 200, y = H/2−6. Flyover: radius 900 (beyond the 595-max orbit),
  height 190.
- **Ground.** Drive ground plane `span*1.4` → `span*2.6` so it reaches the
  skyline base. Flyover keeps its textured ground untouched (its road-pixel
  mapping depends on `spanG`) and instead adds a plain dark **apron plane**
  (`skyR*2.3`, y=−0.06) underneath, out to the ring.
- The ring is decor only — beyond the road grid, not reachable, no gameplay
  boundary added.
- Validation: `node --check` on both files + bundle; jsdom concat-eval boot
  harness (since 2.0.1 it ships as `tools/validate_boot.js`; at the time of this
  release it was recreated per-session in scratch) → BOOT OK;
  Playwright/SwiftShader: flyover pixels confirm lit skyline + red beacons,
  drive scene runs with zero page errors and a non-black horizon band;
  screenshots eyeballed. Bundle rebuilt with the usual esbuild aliases (note:
  loader aliases are `minigame/vendor/jsm/loaders/*.js` — the `loaders/`
  segment matters).

## Previous release (1.9.15): shortest-route guarantee for the drive radar
`routeToGoal()` in `minigame/clivesbuick.js` reworked:

- **`snapToward(v,target)`** replaces plain nearest-street snap: picks the
  nearest street centre *between* the car and the goal (inclusive — the goal
  is itself a street, so one always exists). No leg can backtrack; route
  length always equals the Manhattan minimum.
- Both L orders (A: lateral→run z→cross; B: lateral→run x→cross) are built as
  candidate polylines; **`firstDot()`** takes the first leg longer than 0.6 wu
  and dots it with the heading vector `(sin h, cos h)`; the better-aligned
  candidate wins. Since both are equal length on a full grid, this only
  decides presentation (no U-turn), never length.
- `build()` dedupe tightened to 0.05 wu true-duplicates only: the old 0.6 wu
  merge could drop a snap point and skew a long leg fractionally off its
  street line. Sub-unit legs are harmless (rounded caps).
- Verified by a standalone Node unit test (extract `routeToGoal` via
  slice+eval with mocked `streetCenters`/`GOAL`/`pos`/`heading`): 2M random
  positions/headings — route ≤ Manhattan, all legs axis-aligned, terminates
  within dedupe tolerance of the goal (blip covers it), tie-break correct.
  Plus jsdom boot + Playwright/SwiftShader runtime (drove past an
  intersection; route points forward, no backtrack leg). Bundle rebuilt.

## Previous release (1.9.14): drive radar GPS route
The drive minimap's destination indicator is now a road-following route instead
of a straight centre→blip line that clipped through building blocks.

- **`minigame/clivesbuick.js`** — new `routeToGoal()` (just above
  `drawMiniMap()`): snaps the car to its nearest street centre (whichever axis
  is closer decides whether the first leg runs north-south or east-west), runs
  along that street to the goal's row/column, then turns onto the cross street
  to `GOAL`. Every leg lies on a `streetCenters` line, so the polyline can
  never cross a block. Degenerate legs (<0.6 wu) are skipped. `drawMiniMap()`
  draws it as a rounded-join red polyline (`rgba(255,42,26,0.8)`, width
  `max(2.5, ROAD*scale*0.42)`) inside the disc clip; the rim-clamped goal blip
  is unchanged. Route recomputes every frame (3-point polyline; trivially cheap).
- Drive bundle rebuilt (`minigame/clivesbuick.bundle.js`). Note the esbuild
  loader aliases point at `minigame/vendor/jsm/loaders/` (not `jsm/` root).
- Validated: `node --check`, jsdom concat-eval boot (needs a `matchMedia`
  stub), Playwright/SwiftShader runtime — drive launched, car driven/turned,
  minimap 2D canvas sampled: red route pixels present, polyline hugs the road
  channels, no page errors.

## Previous release (1.9.13): GTA-IV-style minimaps
All three in-game minimaps now share one look: a **circular, player-up radar**
— the map rotates so facing is always up, a yellow chevron marks the player at
the centre, walls/blocks are dark, floor/roads are light, POIs are coloured
blips, all inside a bordered disc with a soft dark rim.

- **`engine/minimap.js` (NEW)** — `window.CMMINIMAP`, the shared interior
  renderer. `drawGrid(ctx, size, grid, px, py, angRad)` plus `ring()`,
  `arrow()`, `PAL`. Angle convention matches the raycaster: `0 = east/+col`,
  `0.5π = south/+row`; screen up = forward, screen +x = player's right =
  `(-sin a, cos a)`. Reads `rcWallHeight` / `FP_GLYPH` / `DOOR_SYMS` via
  `typeof` guards, so it's load-order-agnostic. Draws only inside the disc (no
  square clear), so it composites over the live 3D view. Loaded in
  `index.html` right after `compass.js`, before `raycaster.js`.
- **`engine/raycaster.js`** — the raster first-person minimap block (was the
  square amber floorplan w/ FOV cone) now just translates the ctx to the
  bottom-right slot and calls `CMMINIMAP.drawGrid`. Size `IS_MOBILE?84:96`.
  The in-canvas compass letter + interact-hint below it are unchanged.
- **`engine/nav3d.js`** — `NAV3D.drawMinimap` clears its `.fp-mm` canvas and
  defers to `CMMINIMAP.drawGrid`.
- **`minigame/clivesbuick.js`** — new `drawMiniMap()` renders a bottom-left
  street radar (`.cv-mm`, `IS_MOBILE?92:150`) from the live city: dark
  building blocks (`buildings` AABBs) over darker ground, lighter road
  channels (one strip per `streetCenters` value in both axes), the `GOAL` as a
  red route line + blip (clamped to the rim when off-radar), and the heading-up
  yellow chevron. World→radar: forward = `(sin h, cos h)`, north = `+Z`;
  `ahead = dx·sin h + dz·cos h` (up), `right = dx·cos h − dz·sin h` (+x).
  Called each frame beside the compass update. CSS `.cv-mm` added in
  `index.html` next to `.cv-speed` (mobile portrait lifts it above the D-pad).

## Build / validation done (1.9.13 — historical)

This block belongs to the 1.9.13 minimap release above; it is kept for the
esbuild and harness detail, not as a statement about the current build. For
what 2.0.3 actually ran, see **Validation** at the top of this document.

- Drive bundle rebuilt (source changed): esbuild command in README →
  "Rebuilding the bundle". New `minigame/clivesbuick.bundle.js`, `node --check`
  clean; radar strings (`cv-mm`, `#3b4a3d`, `#16241b`, `rgba(206,224,214`)
  confirmed present post-minify.
- `node --check` clean on `minimap.js`, `raycaster.js`, `nav3d.js`,
  `clivesbuick.js`, and the bundle.
- jsdom concat-eval boot harness (recreated in scratch — it only became a
  shipped file, `tools/validate_boot.js`, in 2.0.1): all `index.html` scripts
  concatenated into ONE `win.eval` (shared scope); boots to
  `version=1.9.13 CMMINIMAP=ok drawGrid=ran`, exercising `drawGrid` across
  angles/positions with door/stair/POI cells. Benign "Multiple instances of
  Three.js" warning (bundle vendors its own THREE) is pre-existing.
- Playwright/Chromium: `CMMINIMAP.drawGrid` rendered to real canvases —
  circular dark-rim discs, dark walls, light floor, coloured blips, fixed
  up-pointing chevron, map rotates with heading. Drive-radar algorithm rendered
  standalone with the game's city grid — building-block grid, light road
  channels, red destination route/blip clamping, chevron. (Both screenshots
  were scratch artifacts and were never shipped.) The full WebGL drive
  scene (rcRender + GLB load) is left for in-browser verification per usual.

## Next / on the horizon (current)
- Part Two story implementation (Hollis cell visit → escape → companion → Pyne
  → Mr. Sun/docks).
- Diegetic reveals / interrogation mechanics; reduce reading-vs-doing gap.
- i18n entries for the VOICE SFX toggle labels.
- Mouse / right-stick camera look (deferred).
- Nav-dialog speaker presentation was fixed in 2.0.8: suspended navigation
  conversations now share the normal speaker plate while full-screen nav
  toasts remain unchanged.
