# Cliveman 2.0.18

A browser-based text detective game. It's got a green CRT terminal look, a
live classical score engine with a context-aware music director, spoken
character voices (Web Speech API), scene illustrations over the dialogue box,
a few retro minigames, a fake-3D (raycast) first-person mode for walking
around rooms, and a real-time WebGL night-drive minigame (Clive's Buick)
built on three.js. Everything runs client-side, so to
play it you just open `index.html` in a browser - no server and nothing to
install. The only part with a build step is the drive minigame, whose three.js
bundle is pre-built and shipped, so to *play* you still don't build anything.

This file is also the modding reference. It walks through how the project is
organized and what each script does so you can add scenes, items, rooms,
minigames, music, or translations without having to reverse-engineer the whole
thing first.


## What's new in 2.0.13

- Replaced the embedded phosphor title artwork with the approved transparent chrome **CLIVEMAN — DETECTIVE ADVENTURE** logo asset.

Verification and minimap-runtime pass. The depth-enhanced city-drive minimap now has browser-level coverage in addition to dependency-free source checks. Desktop and mobile WebGL runs verify that the radar draws, changes during movement, freezes exactly while paused, and remains inside the mobile viewport. The displayed game version is synchronized with this release.

## What's new in 2.0.11

The city-drive radar now uses the generated city's real building metadata—type, footprint rotation, height, and spire state—to draw distinct church, grocery, and tower silhouettes with restrained roof insets and shadows. Roads, GPS routing, and player markers remain visually dominant.

## What's new in 2.0.10

City-drive minimap and destination-placement pass.

- **The minimap now matches the real drivable city.** Streets stop at the same
  boundaries used by the driving physics instead of continuing beyond the map.
  The city footprint and edge are visible, outside space is dimmed, the North
  marker rotates correctly, and the view eases its zoom slightly with speed.

- **Objectives stay inside the city.** Big Smiles Mayo Corp HQ, Bevan's
  Apartment, Pete's Subs, and future drive destinations are assigned
  deterministic interior road intersections with a two-block perimeter buffer.
  Destinations also avoid spawning too close to the player's starting point.

- **Driving boundaries account for the whole car.** The clamp uses the Buick's
  rotated footprint rather than only its center, preventing the vehicle from
  visually hanging outside the city at edge roads.

- **Directions match the actual HUD.** Story instructions now refer to the red
  GPS route and compass dot instead of an obsolete green arrow.

A new dependency-free `tools/test_drive_city.js` suite checks destination
placement on both mobile and desktop city sizes, minimap/world-boundary
agreement, source/bundle parity, and the updated story handoff.

## What's new in 2.0.9

Consistency, pause, save-state, and localization pass.

- **Pause now freezes the game instead of only covering it.** Story typing,
  cinematic holds, floor transitions, first-person movement, driving physics,
  and confirmation gates stop while the pause dialog is open. Inputs held
  before pausing are cleared, and controller/keyboard confirmation cannot
  advance hidden dialogue behind the modal.

- **Save files preserve the complete player position.** New version-2 `.clive`
  payloads keep facing direction and the secret-ending flag in addition to the
  original compact numeric code. Old numeric saves and version-1 files remain
  fully compatible, while files for another game are rejected cleanly.

- **Turning and loading are internally consistent.** First-person heading now
  updates even when the player turns without changing cells, turning in place
  no longer plays a footstep, and a restored heading is consumed exactly once
  when the saved room opens.

- **Menus and load screens agree across input methods and languages.** Settings,
  pause, load-file, betting, mute, voice, error, and continue labels now have
  entries in all seven shipped translations. The load dialog keeps keyboard
  focus, controller Back targets the active modal, and stale Escape listeners
  are removed whenever a dialog closes.

- **Damaged language preferences recover safely.** Unsupported values in local
  storage or calls to `setLanguage()` now fall back to English instead of
  recursively trying to load a dictionary that does not exist.

A new dependency-free `tools/test_consistency.js` suite covers save-format
compatibility, translated UI coverage, pause paths, modal cleanup, navigation
heading restoration, load-file metadata, and both the source and shipped
night-drive bundle.

## What's new in 2.0.8

Dialogue and keyboard usability pass.

- **Navigation conversations now match normal story dialogue.** When a room
  event suspends the first-person view for a multi-line conversation, named
  dialogue now uses the same colored speaker plate and prefix-free body text
  as the rest of the story. Full-screen navigation toasts remain unchanged.

- **Chinese named dialogue is parsed correctly.** All 71 translated speaker
  lines use the full-width Chinese colon (`：`) without a following space.
  The old English-only parser treated every one as anonymous narration, so
  names stayed inside the body and character voice/color selection was lost.
  Voice, color, and speaker-plate code now share one Unicode-aware parser.

- **Keyboard focus is less surprising.** The title screen focuses START NEW
  GAME on desktop so Enter works immediately, settings and pause dialogs
  identify themselves as modal dialogs and receive focus, and background
  terminal focus no longer steals focus from buttons or modal controls.

- **Debug jumps reset drive-resume state.** Returning to the developer jump
  menu after a drive can no longer leak `atDriveStart` into the next segment.

A new zero-dependency `tools/test_dialogue_parsing.js` check covers ASCII and
full-width speaker prefixes, every translated speaker line, and the
nav-dialog presentation route. Files changed: `engine/dom-refs.js`,
`engine/voice.js`, `engine/ui-core.js`, `engine/menus.js`, `engine/boot.js`,
`index.html`, and validation/docs.


## What's new in 2.0.7

Viewmodel polish: the hand is slightly smaller (tune scale 2.7 -> 2.4, same
anchor/rotation), and it now sits correctly on every display shape.

The nav camera fov (74) is vertical, so the hand's vertical framing was
already display-independent — but its horizontal anchor was a fixed
camera-space x tuned at 4:3, which drifted toward centre on wide monitors and
would have pushed the hand almost entirely off-screen on portrait aspects.
`CMHAND.follow()` now applies a per-frame camera-local x offset of
`anchorX * (aspect/(4/3) - 1)`, which cancels the aspect term in the
projection: the hand holds the same fraction of screen width everywhere.
Reading `camera.aspect` live also covers window resizes, since NAV3D.resize
updates the camera without rebuilding the hand. Verified analytically at
21:9, 16:9, 3:2, 4:3 (hand fully on screen, identical composition) and 9:16
portrait (hand remains usable with only the knuckle edge at the border), and
at runtime in headless Chromium (applied offsets match theory to 5 decimals).
Only `engine/handmodel.js` changed (plus the version bump).


## What's new in 2.0.6

Nav viewmodel reframe: the hand + wrist now fill the lower-right of the
screen like a proper first-person viewmodel, instead of the whole doll-sized
arm floating in the corner.

2.0.5's diagnosis is corrected: boundary-edge topology (the open shoulder-cut
ring sits high and NEAR the camera) proves the bake orientation was
anatomically correct as exported, so 2.0.5's 180° flip is reverted. The real
problem was framing — at scale 0.62 the hand was cropped below the screen and
only the receding forearm chunk was visible, which is what read as
"backwards".

`CMHAND.tune` gains `rotX`/`rotY` (degrees, pitch/yaw about the geometry
centroid). The new defaults (rotX 170, rotY -40, scale 2.7) rotate the
hanging relax arm into a raised right hand: fingers up, wrist rooted at the
bottom-right edge, forearm cropping off-frame. Values were chosen by a
constrained 6-knob sweep (hand cluster centered lower-right and fully on
screen, shoulder cluster 100% cropped and never exiting the top edge) and
verified by rendering the actual built geometry.

Because the material draws with depthTest off (so walls never clip the hand),
triangle draw order decides self-occlusion; the index buffer is now presorted
far-to-near at build time — valid permanently since the mesh is camera-locked
— so the enlarged hand self-occludes correctly. Breathing morph deltas and
normals receive the same reframe rotation as positions. Only
`engine/handmodel.js` changed (plus the version bump).


## What's new in 2.0.5

Nav-mode viewmodel orientation fix. The first-person right arm (CMHAND) was
displaying backwards: the bake shipped with its forward axis flipped, so the
fine finger geometry sat NEAR the camera and the shoulder mass FAR — an arm as
seen from in front of the character, hand pointing back at the player.
Verified numerically (nearest-neighbour vertex density vs depth: dense
hand-detail verts clustered at z ~ -0.2..-0.3, coarse shoulder verts at
z ~ -0.45) and by A/B renders.

`CMHAND.build()` now rotates the baked positions 180° about the vertical axis
through the geometry centroid, and applies the same rotation to the normals
and the breathing morph deltas (vectors: negate x and z). It is a proper
rotation, not a mirror — the arm stays a RIGHT arm and triangle winding stays
valid — and because it pivots on the centroid, the arm's bounding envelope on
screen is unchanged, so the 1.9.31 placement tune (scale/dx/dy/dz) carries
over untouched. Only `engine/handmodel.js` changed (plus the version bump).


## What's new in 2.0.4

Size-reduction release. The game plays identically; it is just ~2.3 MB lighter
on disk and ~1 MB lighter over the wire for anyone who reaches a drive scene.
No code paths changed — three artifacts were shrunk and one dead file removed.

- **Drive bundle is now actually minified (2.35 MB → 1.84 MB).** The rebuild
  command documented under "Rebuilding the bundle" has always included
  `--minify`, but the shipped `minigame/clivesbuick.bundle.js` was built
  without it at some point and never noticed — it still contained three.js
  comments and full identifiers. Rebuilt with the documented command,
  byte-identical embedded GLB and Draco decoder payloads, verified in
  Chromium: loads with zero page errors and exports `startClivesBuick`.

- **Easter-egg credits song re-encoded (1.31 MB → 0.88 MB).** 128 kbps CBR →
  LAME VBR `-q:a 5` (~85 kbps average), same 82-second runtime, same file
  path, near-transparent at this quality tier. Nothing else references the
  file, so no code changed.

- **Removed `minigame/vendor/draco/draco_decoder.js` (503 KB).** It was a
  duplicate of the decoder already inlined as a string in
  `vendor/draco/decoder-src.js` — the only copy the build imports, and the
  only copy the runtime uses (`draco._loadLibrary` is overridden to return
  that string, so DRACOLoader never fetches the standalone file). Zero
  references anywhere outside the vendor dir. `decoder-src.js` is now the
  canonical copy; regenerate it from upstream draco 1.5.x if the decoder ever
  needs updating.

- **What was deliberately NOT shrunk:** the embedded Crown Vic GLB. It is
  already Draco-compressed with quantized attributes; re-encoding it with
  gltf-transform (max effort, edgebreaker, qp11/qn7) came out *larger* than
  the shipped 620 KB, and meaningful savings required 50% triangle
  decimation of a hero asset for only ~120 KB — not worth it. Engine and
  story sources were also left readable on purpose; they are the dev
  workspace, not build output.


## What's new in 2.0.3

Presentation consistency pass. Five places where the story surface contradicted
itself. No story, gameplay or layout changes — every fix makes an existing
behaviour apply uniformly instead of only sometimes.

- **Scene illustrations now work in every language.** `section()` ran the title
  through `window.t()` *before* handing it to `STORYART.hint()`, while the two
  lines directly above it — `ClassicalMusic.cue()` and `CMSTING.hint()` — both
  got the raw English title. `hint()` only knows English keywords, so a
  translated title matched nothing; and because a null hint is a no-op, the
  *previous* scene stayed on screen rather than the panel going blank. Measured
  over the game's 17 section titles, French kept 8, Spanish and Portuguese 9,
  Russian 4, Hindi and Arabic 3, and Chinese 2. All eight languages now route
  17/17. The printed title is still translated — only the keyword match moved.

- **Untagged dialogue no longer picks a random colour under the wrong name.**
  A `speaker` line with no `Name:` prefix is Cliveman's internal monologue;
  `speakerOf()` in `engine/voice.js` has always treated it that way. But
  `CHAR_COLOR()`, four functions down in the same file, did not — with no prefix
  to match it hashed the *entire sentence* into a name and minted a colour from
  it, then cached that under `CAST`. Every monologue line therefore came out a
  different purple or blue instead of the amber its `.speaker` class already
  gives it. `CHAR_COLOR()` now agrees with `speakerOf()` and returns null for
  anything that isn't plausibly a bare name.

- **The speaker plate retires properly.** `setDlgName()` cleared the plate for
  five named classes (`narration`, `sys`, `err`, `dim`, `credits`) and left it
  up for everything else, so an untagged monologue line printed under whichever
  character spoke last. The rule is now the obvious one: the plate shows for a
  *named* speaker line and retires for anything else.

- **Character figures retire when the scene changes.** `STORYART.set()` swapped
  `.story-scene` but left `.story-char` alone, so the rooftop shooter stayed
  layered over the Chapter 3 skyline until something happened to call
  `clearScreen()`. A figure belongs to the scene it walked into, so a real scene
  change now clears it. Re-setting the same scene key still doesn't (it already
  early-returns), and every call site places the scene first and the figure
  second, so this can't eat a figure that was just set.

- **One save/load box geometry.** The three ASCII boxes were 44, 45 and 46
  columns wide. Worse, the "SAVE FILE ACCEPTED" checkpoint row was hand-spaced
  for a two-character checkpoint while `decodeSave()` clamps it to 1-7 — always
  one digit — so that row's right border was permanently one column short. All
  three boxes are 46 columns now and the checkpoint row is built by padding.

Validation: `tools/test_presentation.js` (44 checks) and
`tools/test_presentation_regress.js` (8 checks) both run on the jsdom
concat-eval harness; plus a Chromium pass confirming the plate, the figure
handoff between two scenes, French routing, and box alignment on screen.

## What's new in 2.0.2

Dead-code and performance pass. No gameplay, story or visual design changes —
the raycaster and the minimap radar are both verified pixel-identical to 2.0.1.

- **2.63 MB (69%) removed from the boot path.** `index.html` was pulling 3.84 MB
  of parser-blocking JavaScript on every single page load. Two things dominated
  it and neither was needed up front:

  *All seven translation dictionaries* (~320 KB) were loaded eagerly, even
  though only one can ever be active — and English, the default, needs none of
  them at all. `engine/i18n/core.js` now pulls in just the active language.
  During initial parse it uses `document.write`, which keeps the dictionary
  strictly ordered ahead of every later script exactly as the old static tags
  did; a language switch mid-game injects a `<script>` and repaints in its
  callback. Both paths are plain classic scripts, so dictionaries still land in
  the same shared global scope, and both work from `file://` (which rules out
  `fetch`). New: `window.loadLanguage(lang, cb)`; `setLanguage()` takes an
  optional callback and resolves the dictionary before repainting.

  *The drive minigame bundle* (2.4 MB — it carries its own copy of three.js) was
  a plain `<script>` tag, so every player compiled it on every load including
  the ones who never drive anywhere. `engine/transitions.js` now fetches it on
  demand via `window.ensureDriveBundle()`, and warms it on `requestIdleCallback`
  so the first drive doesn't stall waiting for it. A failed load is still not an
  error: `driveClivesBuick()` already fell back to the ASCII transit whenever
  `startClivesBuick` was unavailable, and that path is unchanged.

  Measured on a local `file://` load: DOMContentLoaded 439 ms → 258 ms (-41%),
  parser-blocking scripts 35 → 27. The gap widens on slower hardware, where
  compiling 2.4 MB of three.js hurts most.

- **Faster floor/ceiling casting on mobile.** The raster raycaster renders
  floor and ceiling at quarter resolution on touch devices and replicated the
  skipped rows by hand, storing every skipped subpixel individually from inside
  the x loop. The sampled row is complete once that loop ends, so each skipped
  row is now one `copyWithin` — a native memmove. Raster render time drops
  16-25% on the mobile path (measured -16.3% at 640×360, -25.4% at 960×540).
  Desktop doesn't skip rows, so this doesn't apply there and desktop render time
  is unchanged.

- **The minimap radar no longer allocates on every frame.** Its projection
  helper `P()` returned a fresh `[x, y]` array, and it runs four times per wall
  cell across a ~13×13 window, twice (full-height and half-height passes), plus
  once per blip — on the order of a thousand throwaway arrays per frame, every
  frame the radar is on screen. It now writes into one reused `Float64Array`
  holding the four corners any caller needs live at once. To be straight about
  the payoff: this is strictly less garbage, but the wall-clock difference is
  only about 1-2%, because what the radar actually spends its time on is canvas
  rasterisation, not the allocation. It's a cleanliness win more than a speed
  one.

- **Smaller per-frame allocations elsewhere.** `window._rcLast` — the record of
  the last frame's arguments that `rcRedraw()` replays — was a fresh object
  literal written by *both* render paths on every frame; it is now one reused
  record. `nav3d.js`'s `floorHAt()` defined its clamped sampler as an inner
  function on every call, i.e. a closure per frame; it is hoisted. Neither is
  individually measurable against a multi-millisecond frame; they're here
  because they were free to fix and they're in the hot path.

- **Dead code removed.** `buildStairwell()` (raycaster.js) and its only caller
  `navigateStairwell()` plus `STAIR_ROOM_ID` (controls-ui.js) were orphaned when
  1.9.34 rebuilt the factory as five real stacked floors joined by walk-up
  stairs — nothing has called them since. Also two locals in `rcRender` that
  were computed and never read, one of them (`rowStart2`) recomputed on every
  row of every frame. A full static pass over all 27 shared-scope files now
  reports zero unreferenced top-level declarations.

  The documented `freeMove:false` discrete-stepping path was deliberately
  *kept*, even though no room currently opts into it: it's a modding hook this
  file describes, not an accident.

## What's new in 2.0.1

Housekeeping release: one architectural fix and three hot-path optimizations.
No gameplay, story, or visual design changes — the raycaster's output is
bit-identical to 2.0.0 across every theme.

- **All audio now runs through one master bus.** Previously every subsystem
  owned its own wire to `audioCtx.destination` — SFX, stings, transition hits,
  the classical music engine, the finale static, and the Buick's engine drone —
  and honoured mute purely by convention. Two of them never got the memo: the
  finale static hiss and the drive minigame's engine both played straight
  through a muted game. The drive minigame also spun up a **second
  AudioContext** of its own, so mute state, volume and the first-gesture resume
  were split across two graphs. `engine/audio.js` now owns a single master
  `GainNode`; every emitter connects to it via `window.audioBus()`, and mute is
  one 80ms exponential ramp on that node rather than six independent flags.
  Muting mid-chord used to clip; now it fades. Adds `CMAUDIO.setVolume()` — a
  master volume dial was impossible to implement before this. Touches
  `engine/audio.js`, `engine/stings.js`, `engine/transitions.js`,
  `engine/music-classical.js`, `story/ch3.js`, `minigame/clivesbuick.js`.

- **The finale static is ~19x cheaper.** It was allocating a fresh full-window
  `ImageData` and calling `Math.random()` on every subpixel, every frame: at
  1080p that's 7.9 MB allocated and 8.3M RNG calls per frame, measured at
  43.7 ms/frame — the noise generation alone couldn't hold 30fps before
  compositing. It now generates at quarter resolution into one reused buffer
  (alpha filled once, since it never changes) and upscales nearest-neighbour:
  2.3 ms/frame, zero per-frame allocation. The chunkier grain also reads better
  against the phosphor look than fine-grained noise did.

- **The credits fireworks no longer use canvas shadows.** Each particle set
  `shadowBlur`/`shadowColor` and filled an arc; Canvas2D re-rasterises shadows
  per draw call, and a six-burst credit card puts 500+ particles on screen.
  Each colour now gets one pre-baked 32px radial-gradient sprite that's blitted
  instead. Same glow, no per-draw rasterisation.

- **Finale effects now tear down.** `startStatic()` was the last statement of
  the finale and had no counterpart — its rAF loop and looping noise source ran
  until the tab was reloaded, including behind the pause menu. There is now a
  `stopStatic()`, `startStatic()`/`startFireworks()` are idempotent, and
  `startFireworks()` no longer stacks a duplicate `resize` listener each time
  the credits run (both the normal and easter-egg finales call it).

- **Raycaster hex parsing is memoized.** `_hexRGB()` re-parsed three hex pairs
  and allocated a fresh array 3-4x per frame inside the render path. Themes are
  a fixed small set, so the results are now cached — matching the
  `theme._cached*` pattern already used for floor/ceiling textures.

## Cliveman 2.0.0

Version milestone. No code change from 1.9.36 — this marks the 2.0 release after
the Part One overhaul: the factory rebuilt as five real stacked floors joined by
walk-up stairs (1.9.34), and the first-person radar reworked so it never sits
under the mobile thumb controls (1.9.35) and never clips off the screen at any
window size on desktop or mobile (1.9.36). The detailed notes for those changes
are below.

## What's new in 1.9.36

- **The radar now stays fully on-screen on every window size.** On desktop the
  nav viewport fills the screen with `object-fit:cover`, which crops the 16:9
  frame's edges whenever the window isn't exactly 16:9 — a 16:10 laptop
  (1440x900, 1280x800) crops the sides and used to slice ~30-60px off the
  bottom-right radar; an ultrawide crops the top/bottom. The raster radar now
  derives the visible (un-cropped) region from the live viewport and pins itself
  to THAT edge, so it sits just inside the frame at any aspect ratio instead of
  hanging off it. On a true 16:9 window nothing moves. Mobile already letterboxes
  (`object-fit:contain`) so its top-right radar was always fully visible, and the
  WebGL nav overlay radar is a viewport-fixed element that can't clip — both
  verified. Change is in `engine/raycaster.js`.

## What's new in 1.9.35

- **Mobile: the minimap no longer hides behind the on-screen buttons.** In
  first-person nav mode the touch controls occupy BOTH bottom corners — the
  D-pad bottom-left, the C / SAV / INV action buttons bottom-right — but the
  radar was still drawn in the bottom-right, so the action buttons sat right on
  top of it. The radar now moves to the TOP-RIGHT on mobile, clear of both
  thumb clusters, the top-left stats readout, and the top-centre compass.
  Desktop is unchanged (its bottom-right radar has nothing over it). Fixed in
  both render paths: the raster raycaster draws its radar into the top-right of
  the frame (`engine/raycaster.js`), and the WebGL nav overlay radar (`.fp-mm`)
  gets a mobile CSS override to `top:12px; right:12px` (`index.html`).

## What's new in 1.9.34

- **The factory is five real, stacked floors again — you climb it by walking
  up stairs, floor by floor.** Since 1.9.6 the whole Mayo Corp interior had been
  a single continuous *height-mapped tower* rendered by the Doom-style sector
  renderer (`buildFactoryTower` / `rcRenderSector`): five decks ramped together
  at rising heights in one open shaft. That renderer is what produced the
  corrupted, sloped, spaced-out layout. `ch1_factory()` (`story/ch1.js`) now
  drops back to the classic pre-tower design — five separate flat rooms
  (`factory_f1`…`factory_f5`, room ids `ROOM_F1`…`ROOM_F5`) drawn by the ordinary
  flat raycaster, exactly like every other room in the game. Stepping onto a
  stair tile fires the animated `floorTransition` (the same up/down stair
  cutscene the apartment building uses) and lands you on the next floor. No
  sloped decks, no `_floorH`, no atrium math — just a normal building.
- **Layout matches the old versions and is deliberately simple.** Each floor is a
  compact 5×7-ish room with the same clue placement it always had: worker + mop
  on 1, locked door + access badge on 2, bystander + rat poison on 3, the
  shadowy suspect on 4, the ROOF ACCESS door on 5. Every floor keeps one
  convention — you arrive at the south-west landing and climb to the north-east
  stairs (`S` up / `v` down, both auto-firing on step-on).
- **Tighter flow.** You can only climb 4 → 5 after you've actually confronted the
  suspect (who then bolts for the roof), so the chase reads correctly. The roof
  door is still a checked exit gated by `factoryGate` (Floor-2 badge + Floor-3
  poison + the Floor-4 confrontation); its "not ready" message was reworded so it
  no longer claims you "haven't reached the top floor" while you're standing on
  it. Going *down* is never gated — you can freely revisit a floor to grab a
  clue you missed.
- **Save-resume hardening.** `navigateRoom` now validates a restored position
  against the room's grid: if a saved row/col is out of bounds or on a wall (e.g.
  an old save made inside the retired tower), it falls back to the room's normal
  start tile instead of stranding you in geometry. Because each floor is its own
  room again, in-session floor moves and mid-factory saves both record the exact
  floor you're on.
- The old sector renderer, `buildFactoryTower`, `buildStairwell`, and
  `navigateStairwell` are left in the engine, dormant and unused, in case a true
  multi-storey shaft is ever wanted again.

## What's new in 1.9.33

- **Fixed: nav and drive were invisible on desktop (viewport collapsed to a
  4x4-pixel dot).** The desktop full-screen layout positions the game canvas
  `absolute; inset:0`, expecting it to fill the 100vw x 100vh `.fp-wrap`. But the
  1.9.10 compass work wrapped both game canvases in `.fp-stage`
  (`position:relative`, unsized inline-block), which became the canvas's
  positioning context and collapsed it to a 0x0 point. Mobile received exactly
  this fix in the v1.8.4 block; desktop never did - the engine kept rendering
  into the backing buffer, invisibly. The desktop full-screen block now sizes
  `.fp-stage` as a full-size positioning context (`absolute; inset:0;
  width/height:100%`), restoring the full-screen nav viewport and drive canvas.
  Compass (top-centre) and crosshair (dead-centre) also anchor correctly again,
  since both position against the stage.
- **Short-landscape phone styling can no longer leak onto desktop.** The
  `@media (max-height:500px) and (orientation:landscape)` block documented a
  coarse-pointer guard ("desktop untouched") that was never actually in the
  query; a desktop window under 500px tall picked up phone nav styling that
  fought the full-screen layout. The guard is now real:
  `and (pointer:coarse)`. Phones are unaffected (they are coarse-pointer).

## What's new in 1.9.32

- **The dead-wife dream image now clears when Bevan calls.** The opening dream
  cutscene (`ch1_dream`) sets the story-art scene to the dead-wife illustration,
  but only called `blank()` on exit, so the image lingered in the scene panel
  through the entire phone call. `ch1_phone` now clears the story art at the top
  of the call, so the image leaves the moment the phone sequence begins.

## What's new in 1.9.31

- **Fixed: first-person hand rendered as a tall column pinned to the right edge.**
  This was a placement bug in the `CMHAND` viewmodel, separate from the 1.9.30
  rebuild fix. The baked arm sat only ~0.2-0.4 units from the camera, so its
  ~0.34-unit height projected to roughly 1.9x the screen's vertical range and
  clipped off the right edge (measured NDC bbox x:0.69..1.07, y:-0.66..1.24).
  Retuned `CMHAND.tune` (dx 0.10->0.30, dy 0.26->-0.04, dz 0.0->-0.30) to push the
  hand back and seat it in the lower-right corner (now NDC x:0.59..0.73,
  y:-1.02..-0.23 - anchored to the bottom edge, fully on-screen otherwise, near
  plane clear). scale/breathe/sway/lag are unchanged. These knobs are live-editable
  in `engine/handmodel.js` for final in-browser fine-tuning.

## What's new in 1.9.30

- **Nav-mode pickup hardening (three related fixes).** All three of the "weird"
  nav bugs shared one root: the pickup branch of `handleCheck` did heavy
  mid-interaction work that stomped its neighbours.
  - *Arm no longer glitches when spamming pickups.* A successful pickup used to
    call the full `drawFP()`, which recreates the nav canvas, re-attaches the
    WebGL renderer and rebuilds the first-person hand every time — rapid pickups
    churned WebGL contexts and corrupted the arm. Pickups now call the new
    `navRepaintRoom()` (`engine/raycaster.js`), which marks the 3D scene dirty so
    the existing renderer rebuilds only its geometry next frame (same canvas, same
    renderer, same hand) and repaints the raster canvas in place. The item sprite
    still vanishes; the viewport is never torn down.
  - *Pickup toast can no longer cover the screen or get stuck.* The held "item
    read" toast (`_navToastHold`) now has a `max-height:38vh` cap with scroll
    (`.view-toast`), and `handleCheck` clears the hold and hides the toast from a
    single `finally` teardown, so no exit path can leave it up.
  - *Re-entrancy latch.* A `_navCheckBusy` guard serialises checks, so spammed
    check inputs can't overlap mid-interaction.

## What's new in 1.9.29

- **Fixed: items could be re-picked-up within the same room visit.** In nav mode,
  checking a pickup cell rewrote its grid symbol to `'X'` *and* set the `checked`
  flag. But the "already taken" guard in `handleCheck` (`engine/controls-ui.js`)
  re-derived `isPickup` from the *current* symbol, which was now `'X'` - so the
  guard was skipped and aiming back at the same tile re-fired the whole pickup
  (narration + `addItem`). The guard now also treats any cell already in `checked`
  as a pickup, so a taken item reliably returns "Nothing more here." regardless of
  its rewritten symbol.

## What's new in 1.9.28

- **Second illustrated scene: the head-on collision.** The Chapter 1 drive to the
  factory ("you witness a head-on collision. You keep driving.") now shows
  `assets/scenes/collision.jpg` (320x180 pixelated raster, ~14 KB) in the story-art
  frame before the drive minigame starts. Added via the 1.9.27 pipeline: one asset
  file plus one line in `SCENE_IMG_DEFS`, and a single `STORYART.set('collision')`
  at the collision beat in `story/ch1.js`.

## What's new in 1.9.27

- **The dream is now illustrated.** The opening nightmare (Cliveman's wife in the
  hotel room) replaces its wireframe vector scene with a real illustration:
  `assets/scenes/dream.jpg`, a small pixelated raster (320x180, ~13 KB) shown in
  the same 640x360 frame with the same vignette + scanline overlays as every
  vector scene. New `SCENE_IMG_DEFS` registry in `engine/story-art.js` maps scene
  key -> asset path and takes precedence over `SCENE_ART_DEFS` in `STORYART.set()`.
  To add more illustrated scenes: drop a 16:9 JPEG (target ~320x180, quality ~60)
  into `assets/scenes/` and add one line to `SCENE_IMG_DEFS`. The vector def stays
  in place as an offline fallback if the registry entry is removed.

## What's new in 1.9.26

- **Fixed the first-person hand viewmodel (nav 3D mode).** The baked right-arm mesh
  was anchored so that only the shoulder/upper-arm block sat on screen — it read as
  an unrecognizable "hunk of meat" in the lower-right while the hand and forearm hung
  far below the bottom edge. Re-framed the viewmodel (`engine/handmodel.js` `tune`:
  `scale 0.6->0.62`, `dx 0.04->0.10`, `dy 0.0->0.26`) so the forearm and relaxed hand
  now read correctly as a proper FPS arm anchored to the lower-right. Breathing idle
  and walk-sway are unchanged.

## What's new in 1.9.25
Hand viewmodel: **size + sprite-occlusion fix**. Two bugs from 1.9.24:

1. **Wrong size.** The bake is in real metres, but the nav world is ~half human
   scale (eye height 0.5); the 1.9.24 `scale:1.3` tune therefore projected the
   arm across more than the full frame height (screen-space v span -3.09..+0.29
   at 74-degree vfov - the previous "silhouette-metric" verification was wrong).
   Retuned to `scale:0.6, dx:0.04, dy:0, dz:0`: the fist now sits in the
   lower-right (v top ~ -0.34, off-screen below), classic FPS placement.
   Breathing deltas scale with it automatically.

2. **Sprites painting over the hand.** All nav sprites (people, furniture,
   glyph crosses, wall art) use `transparent:true` materials, so three.js
   renders them in the TRANSPARENT pass, after every opaque object. The hand
   material was opaque, so despite `renderOrder:1000` + `depthTest:false` it
   drew in the OPAQUE pass and every nearby sprite then painted straight over
   it ("phasing"). Fix: `mat.transparent=true` moves the hand into the
   transparent list, where renderOrder sorts BEFORE depth - 1000 guarantees it
   draws dead last, on top of everything.

Verified in real Chromium/SwiftShader via Playwright: hand renders at correct
scale in the lower-right, and with a person billboard rotated to overlap the
hand's screen region the fist visibly draws on top of the sprite. (Test note:
the embedded data-URI texture decodes async - a screenshot taken on the first
rAF after build shows the hand untextured/black; wait for
`CMHAND._tex.image.complete` before judging visuals headlessly.)

## What's new in 1.9.24
Hand viewmodel: **animation + placement fix**. The right-hand viewmodel now
breathes and sways. Breathing: the source relax animation is a 2s sinusoidal
cycle (its t=0.5 frame sits at exactly half the t=1.0 peak delta), so the whole
loop collapses losslessly into base + one peak-delta frame, lerped on the CPU
each frame (379 verts - trivial) with a cosine influence. CPU lerp is
deliberate: three r152+ uploads GPU morph targets as float data textures, which
SwiftShader-class GL stacks choke on; writing the position attribute directly
(`DynamicDrawUsage`) runs everywhere. Walk sway: nav3d passes its bob value,
smoothed move amount, and bob phase into `CMHAND.follow(cam,bob,move,phase)`;
the hand lags the camera bob (counter-offset in camera-local axes, `lagY`) plus
a slow side sway (`swayX`), so it bounces while walking and settles when still.
Placement fix: the 1.9.23 tune projected the hand across the FULL frame height
with fingertips off the top edge (mis-read during review). Retuned against the
real camera (74-degree vfov, near 0.04) with a silhouette-metric renderer:
`tune={scale:1.3,dx:0.06,dy:-0.17,dz:-0.08}` puts the hand at x 66-94%,
y 35-100% of frame, 11.7% area - fingers just above centre height, wrist
anchored to the bottom edge, matching the reference, with a 0.14 near-plane
margin. Verified IN THE RUNNING GAME via Playwright: live tune + geometry bbox
read from the page, an in-page software projection of the live mesh through the
live camera matrices reproducing the target silhouette exactly, breath
influence ramping on-curve with vertex positions following, and sway deviation
growing with movement. New tune knobs: `breathe` (morph amplitude), `swayX`,
`lagY`.


## What's new in 1.9.23
First-person **right-hand viewmodel** in nav 3D mode. New `engine/handmodel.js`
(`CMHAND` singleton) carries a static, baked slice of the PSX First-Person Arms
pack - the RIGHT arm only, in the relaxed idle pose, pre-skinned and exported
into camera-relative space so it needs no runtime GLTFLoader and no runtime
skinning (the global THREE build ships without a loader; only the drive bundle
has one). The bare-skin **no-glove** texture is PSX-reduced (256px) and embedded
as a data URI, so it loads identically under file:// and http://. `nav3d.js`
rebuilds the ~380-vert / ~590-tri mesh per room (cheap) via `CMHAND.build(T)`,
adds it to the scene, and `CMHAND.follow(cam)` syncs a follow-group to
`NAV3D.camera` each frame; the unlit material draws depth-test-free with a high
renderOrder so walls never clip the hand (classic viewmodel behaviour). Placement
is a bottom-right open hand matched to the reference, tuned about the mesh
centroid (a uniform scale about the camera origin is a projective no-op) and kept
live-editable via `CMHAND.tune` (scale/dx/dy/dz). Drive mode has its own scene and
never touches this, so the hand appears in nav mode only, and the texture is
flagged `__cachedByNav3d` so the scene-disposal pass spares it across rooms.


## What's new in 1.9.22
Context-aware audio stings. New `engine/stings.js` (`CMSTING` singleton)
synthesizes six short (0.9-2.4s) procedural WebAudio accents: **hit** (noir
sforzando stab - low A-minor saw cluster through a closing lowpass with a
sub thump), **dread** (sub-bass slide 62->37Hz under a beating minor-second
sine pair), **riser** (detuned saw + noise sweep up, capped with a thump),
**resolve** (two warm detuned-triangle chords, F to C), **shimmer** (quiet
tritone dyad under a 6Hz tremolo LFO), **gavel** (three woody knocks -
pitched 185->68Hz thumps with highpassed click transients). `section()` now
consults `CMSTING.hint(title)` exactly the way it consults the art hints
and the music director - keyword-matched, zero metadata in story code:
dream/epilogue/crime-scene -> dread, rooftop/chase/escape -> riser,
arrest -> hit, trial/court/verdict -> gavel, secret ending -> resolve,
investigation/docks -> shimmer. RESUMED checkpoint titles never sting, and
the table is deliberately sparse so stings stay special. Four direct calls
cover beats without a section(): the trial opening, the G U I L T Y
verdict, the arrest, and the crime scene. Politeness: play() checks
audioCtx, isMuted(), and context state at call time (silent no-op
otherwise), throttles to one sting per 2.5s and one per kind per 8s, and
never touches the music director's hold/somber state - stings sit briefly
on top of whatever is playing.

## What's new in 1.9.21
Scene illustrations no longer rescale with dialogue length. The scene SVG
was sized against #storyArt (`width:min(94%,760px);max-height:96%`), and
#storyArt is the flexible band that absorbs whatever the dialogue box,
choice panel, name plate, and mounted character art don't claim - so every
panel toggle re-derived the art size. The SVG is now sized from the
viewport only: `height:min(46dvh,53vw,428px)` (vh fallback first, per house
style), with `width:auto;max-width:94%`. When the band runs shorter than
the art, overflow:hidden crops symmetrically into the vignette instead of
shrinking the drawing - worst measured case (700px-tall desktop, full text
+ choices + char + name plate) crops 5.7% per side, inside the 8.3% margin
above the ground line. The short-landscape media query gets 30dvh plus a
`max-height:100%` fit guard, since a 390px-tall landscape band can drop
below any sane fixed size and clipping the ground line is worse than
scaling there. Verified with Playwright at 4 viewports: SVG rect identical
(within 1px rounding) across short text, capped-height text wall, open
choice panel, mounted char art, name plate, and scene swap; control run
against the old CSS reproduced the drift (427 -> 414 -> 400 on desktop).

## What's new in 1.9.20
Every major Part One beat now has scene art. Five new illustrations in
`engine/story-art.js`: **dream** (the opening nightmare - hotel room, bed,
TV stand, the pendant lamp), **ruins** (the collapsed factory crime scene -
jagged remnants, smoke, POLICE LINE barricade, the fallen Big Smiles sign
cracked mid-grin), **garage** (the breakdown - roll-door shop, the Buick
with its hood up), **arrest** (outside Pete's - cruiser light bar, red
light filling the shop window; first and only use of a red accent, matching
the death-sting vignette), **sunrise** (the secret ending - road out of
Dudley, sun coming up, skyline shrinking behind). Routing: `hint()` gains
dream/nightmare, crime scene/collapsed, mechanic/garage, arrest (moved out
of the street rule), and secret->sunrise (spaced-letter form included, so
S E C R E T   E N D I N G no longer falls through to city); clemons/tubley
now route to factory (the interrogation happens on-site). Four one-line
`STORYART.set()` calls in story/ch2.js wire beats that have no section() or
that follow clearScreen(): ruins after the carTransition to the crime
scene, garage at the breakdown, diner restored for the alley panic, arrest
for the arrest - which previously played over a blank art area.

## What's new in 1.9.19
Six new scene illustrations in `engine/story-art.js`, same green-phosphor
line-art style: **docks** (pier, container crane, freighter — Mr. Sun's
territory), **tavern** (Gumshoe back bar, stools, neon sign), **track**
(Dudley Mills grandstand, tote board, horse and jockey), **arcade** (cabinet
row, middle screen running Snake), **yard** (Dudley State wall, razor wire,
guard tower with searchlight beam), **hall** (City Hall pediment and columns,
for the Comptroller's office). `hint()` now routes tavern/blackjack, horse
track, arcade/snake, docks/pier, escape/yard, and comptroller/pyne/city-hall
titles to their own art instead of the generic street scene; the street rule
was narrowed accordingly. Part Two beats (escape, Pyne, Mr. Sun) have scene
art ready before the story lands.

## What's new in 1.9.18

Factory tower restored to the classic floor plans. `buildFactoryTower()`
(engine/raycaster.js) now rebuilds each of the five Mayo Corp decks to match
the original per-floor rooms from the pre-tower builds: F1-F3 keep their 3x5
footprints with the interior wall stubs and clue nooks (worker + mop, locked
door + badge, bystander + rat poison), F4 is the small dark 3-wide room with
the suspect, and F5 is the short 4-wide top floor with the ROOF ACCESS door on
the north cap. The continuous height-mapped stair system is unchanged in
spirit but reshaped: every flight now ascends east-to-west with per-cell tread
heights (rises of 0.15-0.3u, all under SECTOR_STEP_MAX), so you leave each
floor at its north-east corner and arrive on the next at its south-west corner
- the same "down stairs left, up stairs right" traversal the classic rooms
had. Non-tread cells of each flight row are solid, so a deck's north edge
reads as a wall with a single stair opening. Clue coordinates, furniture and
item art are re-stamped to their classic spots via the returned `cells` map,
so story/ch1.js needed no changes.

## What's new in 1.9.17

- Landmark low-rises: some city lots in the drive minigame and the title
  flyover now hold churches (gabled nave, steeple with cross, warm stained
  glass) or corner stores (flat-roof storefronts with fluorescent windows and
  glowing neon signs -- GROCERY, DELI, BODEGA, LIQUOR, and the occasional
  BIG SMILES) instead of towers.

## What's new in 1.9.16

- Rooftop spires: tall buildings in both the drive minigame and the title
  flyover now carry tapered masts, some tipped with red aircraft-warning
  beacons.
- Distant skyline: a decorative, unreachable silhouette ring (baked haze, dim
  lit windows, its own spires and beacons) now surrounds both scenes, and the
  ground extends out to meet it, so the drivable district reads as one
  neighbourhood of a larger city instead of a slab floating in the void.

## What's new in 1.9.15
- **Drive radar route is now always the shortest route.** `routeToGoal()` snaps the car toward the goal instead of to the nearest street, so the route never backtracks — total length always equals the grid's Manhattan minimum (verified over 2M random positions). The two equal-length L orders are tie-broken by which first leg best matches the car's current heading, so the drawn route never implies a needless U-turn. Dedupe now only drops true duplicate points (a near-degenerate snap point previously skewed a long leg fractionally off its street line).

## What's new in 1.9.14
- **Drive radar GPS route**: the minimap's destination indicator is now a red route that snakes along the street grid to the waypoint, GTA-style, instead of a straight line clipping through building blocks. The route snaps the car onto its nearest street, runs the leg to the goal's row/column, then turns onto the cross street — every segment lies on a road. Goal blip (rim-clamped when off-radar) retained.

## What's new in 1.9.13
- **GTA-IV-style minimaps everywhere.** All three in-game minimaps were
  reworked into the same circular, player-up radar: the map rotates so the
  player's facing is always straight up, a yellow chevron marks the player
  pinned to the centre, walls/blocks read dark, walkable floor/roads read
  light, and points of interest are coloured blips — all clipped inside a
  bordered disc with a soft dark rim. A new shared module `engine/minimap.js`
  (`window.CMMINIMAP`) owns the two interior nav renders; it exposes
  `drawGrid(ctx,size,grid,px,py,angRad)` plus `ring()`/`arrow()`/`PAL`, uses
  the raycaster angle convention (0 = east/+col, 0.5π = south/+row), and
  draws into any 2D context at the caller's offset without touching anything
  outside the disc (so it composites cleanly over the live 3D view). It reads
  `rcWallHeight`, `FP_GLYPH`, and `DOOR_SYMS` via `typeof` guards, so load
  order is irrelevant. `engine/raycaster.js` (raster first-person) and
  `NAV3D.drawMinimap` (`engine/nav3d.js`, the 3D nav overlay canvas) both now
  defer to it, replacing the old square amber floorplan / filled-cell maps.
- **Drive mode gets a street radar.** Clive's Buick now shows a matching
  circular radar (bottom-left, `.cv-mm`) that renders the actual city: dark
  **building blocks** over a darker ground, lighter **road channels** drawn as
  a strip per street centre in both axes (so the road grid and building shapes
  are legible at a glance), the **destination** as a red route line + blip
  (clamped to the rim when it's off-radar), and the same heading-up yellow
  chevron. Implemented as `drawMiniMap()` inside `minigame/clivesbuick.js`
  using the existing `buildings` AABBs, `streetCenters`, `GOAL`, `pos`, and
  `heading` (forward = (sin,cos), north = +Z), called each frame beside the
  compass update. The drive bundle was rebuilt.
- **Radar sizing/placement.** Interiors keep the bottom-right corner
  (`IS_MOBILE?84:96`px); the drive radar sits bottom-left
  (`IS_MOBILE?92:150`px, lifted above the D-pad in mobile portrait) so it
  never collides with the speed readout or touch controls.


- **Persistent stats HUD in nav mode.** A small `$ · LVL` readout (`.fp-stats`,
  `#fpStats`) floats at the top-left of the 3D viewport, sibling to the compass,
  so money and level are always visible while walking around — tying the rest
  of the game to the central Dudley economy. Created by `drawFP()` alongside the
  compass mount, refreshed by `window.fpStatsUpdate()` from `_updateStatus()`
  (every move) and from `navResume()` (so post-combat / shop changes show
  immediately). Torn down with the rest of the nav overlay by `clearMap()`.
  The readout is hosted by the full-viewport `.fp-wrap` (not `.fp-stage`,
  which collapses to a zero-size point in desktop nav-mode) and sets
  `line-height:1.2` to escape the stage's `line-height:0`.
- **Nav HUD de-cluttered.** The top band previously stacked the room title,
  the compass, and (on desktop) the HERE/FACING status bar on top of each
  other. Now the compass owns the top-centre; the room title renders as a
  smaller subhead directly beneath it (nav + drive, desktop + mobile
  fullscreen); the status bar pins to the bottom-centre on desktop (fixed,
  64px up to clear `#navRow`) and hides when empty (`.fp-status:empty`);
  and `_updateStatus()` drops the redundant "FACING: …" text whenever the
  compass is active, leaving only "HERE: …" context. Verified with a
  Playwright bounding-box overlap audit at desktop, mobile-portrait, and
  mobile-landscape viewports: zero HUD overlaps.
- **Level & XP now survive saves.** `enemiesBeat` (clamped 0–127) is packed
  into 7 previously-unused bits of the save code's high word (bits 12–18);
  `restoreState()` recomputes `state.level` from it using the same doubling
  thresholds as `levelUpCheck()`. Old save codes still load (those bits decode
  as 0 → XP 0, level 1, matching the old behaviour). The 42-bit range check in
  `decodeSave()` is unchanged — the high word now uses exactly 19 bits.

## What's new in 1.9.11
- Compass HUD redesigned to a minimal FO4-style strip: backing plate and
  border removed (frameless floating glyphs), height reduced (16px / 14px
  mobile), intercardinals shown as taller ticks instead of text, fixed
  centre caret replaces the double notch, glyphs dissolve fully at the
  strip's edges. Waypoint dot slightly smaller. Same mount points and API.

## What's new in 1.9.10

- **Bethesda-style compass HUD** (`engine/compass.js`, `CMCOMPASS`). A small
  semi-transparent scrolling compass strip centred at the top of the 3D
  viewport, shown in both nav mode and the drive minigame. Cardinal letters
  (N/E/S/W in amber, intercardinals in dim green) and tick marks slide past a
  fixed centre notch as you turn. One shared singleton; mounted into the
  `.fp-stage` overlay host by `drawFP()` and by the drive minigame, fed
  per-frame from `rcRender()` (nav) and the drive tick, unmounted by
  `exitNavMode()` and the drive `cleanup()`.
- **Drive waypoint moved onto the compass.** The floating green 3D arrow over
  the Buick is gone; the destination now shows as a glowing **red dot** on the
  compass strip (clamped to the strip edge at reduced alpha when it's behind
  you). The red ring/beam goal beacon in the world is unchanged. HUD hint text
  updated to match.
- **Desktop nav canvas now sits in an `.fp-stage` wrapper** (previously
  mobile-only), so nav overlays have the same positioning host on both
  layouts.
- Verified in-browser (Playwright, desktop + iPhone-13 viewport): factory
  stairwell stage renders and accepts input on mobile; compass mounts, tracks
  heading, and shows the red destination dot in drive mode on both profiles.

## What's new in 1.9.9

**Music director — the score is now truly context-aware.**

- The classical engine gained a director: `ClassicalMusic.cue(text)` is fired
  automatically with every section title, room title, cutscene title, and
  drive title (hooked in `section()`, `navigateRoom()`, `window.cutscene`,
  and `driveClivesBuick()`). A first-match rule table maps each moment of
  Part One to the piece that fits it — no per-scene wiring needed in story
  scripts. Titles are matched pre-i18n and normalized (letter-spaced section
  cards like `C H A P T E R  3` parse fine).
- The moment-to-music map: waking at 3 AM → *Morning Mood* (ironically);
  night drives → *Eine kleine Nachtmusik*; interrogations → *Für Elise*;
  sneaking Big Smiles tower → *Moonlight Sonata*; the rooftop chase →
  *In the Hall of the Mountain King*; the crime scene → *Dies Irae*; the
  Gumshoe Tavern → *Greensleeves*; the horse track → **William Tell Overture**
  (new 18th piece, galloping finale); Pete's Subs → *Gymnopédie No. 1*; the
  trial → *Lacrimosa*; the prison epilogue → *Swan Lake*; end of Part One →
  *Ode to Joy*.
- **Priority is protected**: explicit story pins (`dream`, `bevan_death`)
  hold the music — auto-cues cannot interrupt Bach's Air during the dream or
  Bevan's death; only an explicit `playMusic()` releases the hold. Cues
  steer music that is already playing (they never start it), consecutive
  identical titles are deduped, and unmapped screens leave the score alone.
- **The score remembers the story**: once Bevan dies, a somber flag makes
  every calm-pool cue resolve to the grief pool instead — nothing jaunty can
  play over the aftermath. Returning to the title screen (new game) lifts it.

## What's new in 1.9.7

**Classical score engine v2 — 17-piece live repertoire + story-context music.**

- `engine/music-classical.js` rewritten. The repertoire grows from 5 to 17
  public-domain works, all performed live in WebAudio as original simplified
  arrangements: Bach (Air on the G String, Prelude in C, Toccata in D minor),
  Beethoven (Ode to Joy, Für Elise, Moonlight Sonata), Mozart (Eine kleine
  Nachtmusik, Lacrimosa), Grieg (Morning Mood, In the Hall of the Mountain
  King), Chopin (Funeral March), Tchaikovsky (Swan Lake), Pachelbel (Canon in
  D), Satie (Gymnopédie No. 1), Petzold (Minuet in G), Greensleeves, and the
  Dies Irae plainchant.
- **New "strings" voice**: solemn pieces are bowed by a detuned two-saw
  section with slow attack, vibrato LFO, and a dark lowpass; lighter pieces
  keep the plucky triangle lead. Pieces may now carry an inner **harmony
  voice** (Air, Gymnopédie, Moonlight) on top of the sine bass.
- **Story contexts**: `ClassicalMusic.setContext(name)` /
  `ClassicalMusic.playPiece(id,{loop,pool})`. `playMusic(name)` in
  `engine/audio.js` now forwards every name to the engine, so story scripts
  stay one-liners. Contexts: `dream`, `bevan_death`, `grief`, `chase`,
  `calm`, plus the legacy tension moods (`title`/`investigate`/`lonely`/
  `descent`). Pools now include a **grief** rotation (Air, Funeral March,
  Lacrimosa, Moonlight, Swan Lake).
- **Bach's Air on the G String** (Orchestral Suite No. 3 in D major) is
  pinned to the two emotional poles of Part One: it loops under the opening
  "A DREAM" cutscene, and it begins the instant Bevan dies at Pete's Subs,
  carrying the death, the grief, and the sub-shop breakdown. The dark
  `descent` cue now enters at the arrest (red-and-blue lights) instead of
  cutting the Air off mid-death.

## What's new in 1.9.6

- **The factory is now one real five-storey building.** The Mayo Corp
  investigation used to be five separate rooms (`factory_f1`…`factory_f5`) with
  a stairwell interstitial that faded out and *teleported* you to the next
  floor. It's now a single continuous, height-mapped room
  (`buildFactoryTower()`, `engine/raycaster.js`): five stepped floor-decks
  (heights 0.0 → 3.6) joined by real, walkable stair flights in one shaft. You
  physically climb from Floor 1 to the roof door — no fade, no room swap — and
  every clue lives on its own deck exactly where it did before (worker + mop on
  1, access badge + locked door on 2, bystander + rat poison on 3, the figure
  who shoves past you on 4, roof access on 5). One story = 0.9u split into four
  0.225u steps, all under `SECTOR_STEP_MAX`, so the ascent is climbable and the
  descent glides.
- **The sector renderer now draws props.** The Doom-style height-mapped
  renderer (`rcRenderSector`) previously drew only geometry, which is why the
  old open stairwell was empty. It now has a height-aware billboard pass: items,
  people, and furniture are placed with their feet on their cell's floor height
  and occluded by walls via a per-column depth buffer, so a badge on the 2nd
  deck sits *on* that deck. The per-sprite drawing was factored into a shared
  `_rcSpriteBody()` used by both the flat and sector renderers, so props look
  identical in every room. The true-3D `nav3d` path already handled height-mapped
  props and needs no change.
- **Configurable atrium ceiling.** Sector grids can carry `grid._ceilH`; the
  factory sets it to `4.6` so the roof clears the top deck (an open shaft rather
  than the enclosed-stairwell default of `2.4`). `nav3d` derives the same
  clearance from the tallest deck.
- `ch1_factory()` is now a single `navigateRoom` call; the roof door is a gated
  exit (`factoryGate` still requires the Floor-2 badge and Floor-3 poison, and
  now also that you've been up to Floor 4). The old `navigateStairwell` /
  `buildStairwell` helpers remain in the engine, unused, in case a two-level
  well is wanted again.

## What's new in 1.9.5

- **New title wordmark.** Rebuilt the `CLIVEMAN` logo (`CLIVE_LOGO_SVG` in
  `story/title.js`) as a pulp-noir poster mark: Montserrat Black letterforms
  (outlines converted to paths — no runtime font dependency) with a phosphor
  gradient, extruded depth, bloom, and scanlines, plus the `DETECTIVE ADVENTURE`
  tagline arced beneath in Oswald Bold amber with a dark keyline. Keeps the
  magenta evidence-notch underline and a faint chroma split for continuity.
  Element ids are `cm-` prefixed to avoid DOM collisions.
- The tagline is now baked into the logo SVG, so `drawTitleArt()` only emits the
  separate `.snatcher-sub` div for non-English locales (where `t('detective
  adventure')` differs), avoiding a duplicate line. Logo width bumped to
  `min(540px,92%)` to give the taller mark room.

## What's new in 1.9.4

- **Dialogue advance gate.** Character (speaker) lines no longer fly past: after a
  speaker line finishes typing, a blinking amber `▼` appears on the line and the
  story waits for the player (Enter/Space, tap/click on the dialogue box, or
  gamepad A). Skipping the typing animation only completes the current line — a
  second press advances. Implemented as `dlgAdvanceGate()` at the end of
  `typeLine()` (engine/ui-core.js); only active when the dialogue box is actually
  on screen (`_dlgBoxVisible()`: story mode / nav-dialog — never nav toasts or the
  driving HUD). `window._dlgAdvance` is exposed while a gate is open (test hook).
- **Scrollback in the dialogue box.** `cutscene()` no longer wipes the box between
  beats, so you can scroll up and reread earlier beats of a scene. The
  `> PRESS TO CONTINUE <` prompt line is now removed after use and the
  `C:\DUDLEY> CONTINUE` echo is gone, so the scrollback reads as pure story.
  Advancing (gate or CONTINUE) clears `_userScrolledUp` and snaps back to the
  bottom; scrolling up mid-scene holds position as before. Also fixed a leaked
  capture-phase keydown listener in `pressAnyToContinue()` (was removed without
  the capture flag).
- **Centered section titles.** `section()` (story/title.js) dropped the 3-space
  left pad on the title line, so headers like `A DREAM` sit dead-centre between
  the `====` bars (`#screen` is text-align:center; the pad was skewing it left).
- **VOICE SFX mute toggle.** The TTS toggle is now a clearly-labelled mute button:
  settings modal (gear) section renamed to `VOICE SFX` with a `🔊 VOICE SFX: ON` /
  `🔇 VOICE SFX: MUTED` button, and the pause-menu voices button uses the same
  labels. Same underlying `VOICE.toggle()` + `cliveman_voice` localStorage key.
  (New labels are English-only for now — no i18n entries yet.)

## What's new in 1.9.3

- **Open factory stairwells.** `buildStairwell()` (engine/raycaster.js) now builds an
  open multilevel room instead of the enclosed 3-wide shaft: an upper deck (h=1.0)
  across the north end, an exposed central flight of four treads (0.8/0.6/0.4/0.2),
  and floor-level aisles either side. You can walk off a tread or the deck edge and
  drop to the floor; climbing back up is only possible via the treads
  (`SECTOR_STEP_MAX` rule). Landings still auto-fire (`S` -> `stair_top`,
  `v` -> `stair_bottom`) and the flight remains bidirectional, so
  `navigateStairwell()` and the ch1 factory loop needed no changes.
- **Fixed the camera snap when falling off stairs.** The sector renderer computed
  eye height straight from the player's current cell, so any height drop teleported
  the view down in a single frame (and straddling a tread edge made the horizon
  flicker). New `_secEyeSmooth()` eases the eye toward the stood-on floor height
  (time-based, `min(1, dt*12)` per frame; ~345ms glide for a full-unit drop),
  snapping only on grid change so room entries are unaffected. The real cell height
  still feeds `hPrev`, so floor geometry never rides the camera.

## What's new in 1.9.2

- **Drive goal no longer spawns out of bounds on mobile.** The red waypoint
  marker was hardcoded at (238, 238) — a road intersection on the desktop
  18x18 city, but *outside* the 12x12 city the 1.8.6 mobile GPU fix uses, so
  on phones it floated on empty ground. The goal is now derived from the grid
  (the intersection between building rows N-3 and N-2): desktop is unchanged
  at exactly (238, 238); mobile lands at (136, 136), on a road beside
  buildings. Bundle rebuilt.

## What's new in 1.9.1

- **The last cutscene presentation is gone.** `cutscene(beats, opts)` (the old
  fullscreen card overlay used by the Chapter 1 dream) now plays its beats in
  the dialogue box: title banner on every card, typewriter narration, press to
  continue between beats. The `.cutscene-overlay` layer and its CSS are
  removed.
- **Scene art is event-driven, not persistent.** A scene SVG appears when a
  story-relevant moment sets it (a section card or an explicit beat like
  Pete's Subs / the trial) and is cleared with the next screen clear — the
  space above the dialogue box stays blank the rest of the time.

## What's new in 1.9.0

- **The fullscreen cutscene stage is retired.** The whole story is told in the
  terminal's dialogue box again — no more jarring swaps between the terminal
  frame and a separate cinema screen. `engine/cinema.js` is removed;
  `engine/story-art.js` replaces it.
- **Speaker name plate.** When a character talks, their name appears on an
  amber plate at the top-left edge of the dialogue box, and the line prints
  without the `Name:` prefix. Narration retires the plate. Voice profiles are
  unaffected (the voice engine still receives the full prefixed line).
- **Scene illustrations.** The blank space above the dialogue box now shows a
  green-phosphor SVG of the current scene — eight hand-drawn scenes (Dudley
  skyline, apartment blinds, Big Smiles HQ, the rooftop, a lamplit street with
  the Buick, Pete's Subs, the courtroom, the prison cell). `section()` picks
  the scene from its title automatically; the big beats (Pete's Subs, the
  trial) set theirs explicitly. Character figures (`instantArt`) now appear in
  the same space, layered over the scene.
- Nav mode, nav dialogs, all minigames, and the drive keep their existing
  presentation untouched.

## What's new in 1.8.2

**Volumetric fog in the drive minigame.** The night drive now has genuinely
volumetric fog instead of a flat distance haze. For each pixel the shader computes
the closed-form integral of an exponential *height*-density field along the view
ray from the camera to that fragment, with the density also varying across the
ground plane via cheap value noise (drifting fog banks). Because it integrates a
real 3D density field, two points at the same distance from the camera but at
different heights get different amounts of fog: the streets and low ground sink
into a thick haze while the tops of tall buildings stay comparatively clear, and
the fog reads as a volume you drive *through* rather than a curtain at a fixed
range.

It is deliberately analytic — no ray marching, no second render pass, no depth
texture, no extra render target — so it costs a couple of varyings and a few dozen
shader instructions on geometry that's already being drawn, is WebGL1-compatible,
and (with the drive already rendering at devicePixelRatio 1) stays cheap on
integrated / low-end GPUs. The tradeoff for that budget is that there's no in-fog
light scattering or god-rays, which would require ray marching; the gameplay
markers (goal ring, nav arrow) and car effects (smoke, tail-light glow) render
crisp through the fog so the drive stays readable. Only the drive minigame is
affected — the fog shader override lives on that minigame's own private copy of
three.js.

## What's new in 1.8.1

**Drive minigame (Clive's Buick) fixes.** Two long-standing bugs in the night
drive are gone:

- **Detached wheels.** The Crown Vic GLB bakes large translations into its wheel
  nodes, so the wheel meshes' geometry is not centred on their own origin.
  Rotating those meshes in place spun them around a far-off local pivot and the
  wheels visibly flew off the car. Each wheel mesh is now re-parented (world
  transform preserved via `Object3D.attach`) under a fresh pivot placed at the
  wheel's true centre in `carRig` space, and the *pivot* spins about the axle, so
  wheels rotate correctly and stay attached. The wheel-name filter was also
  tightened: bare `rim` no longer matches body `trim`/`reartrim`/`moulding_trim`
  meshes (a lookbehind excludes them), so chrome body trim is no longer spun as if
  it were a wheel. Oversized/undersized matches are skipped by world bounding size.

- **Getting stuck on buildings.** Collision used a boolean footprint test that
  blocked *any* move once the car's rectangle was even slightly embedded in a
  building AABB, so a wedged car froze. Collision now measures penetration depth:
  a per-axis move is allowed when the destination is clear **or** when it reduces
  an existing overlap, so the car can always steer or reverse out. Steering is
  likewise guarded so turning can't rotate a corner deeper into a wall, and a
  depenetration nudge eases the car out along the shallowest axis as a safety net
  (covering old saves and edge cases). Only the drive minigame changed.

## What's new in 1.8.0

**Terminal storytelling is phased out.** Cinema mode is no longer a per-scene
treat — it is THE story surface. The moment the game is running story flow
(started, not in first-person nav), any narration, dialogue, system line,
choice, or character art automatically summons the cinema stage and plays
there: animated backdrop, letterbox, name-plate dialogue box, voiced lines,
advance gating. No scene wrapping required; story code is just typeLine /
askChoice / instantArt as it always was.

- `section(title)` is now a film title card on the stage, and picks a fitting
  backdrop from the title itself (interrogations get venetian blinds,
  rooftops get rain and lightning, streets get the lamplight cone).
- Choices always render inside the scene — including auto-summoning the stage
  if a choice is the first thing that happens.
- `sys` lines (status readouts, prompts) stack beneath the dialogue instead
  of wiping it.
- Handoffs are clean: entering first-person nav, the Buick drive, or the
  ASCII transit drops the stage instantly under their own transition, and the
  next story line summons it right back. Nav events, nav dialogs and the
  casino minigames keep their own presentation, untouched.
- The engine guard is one predicate (`cinemaShouldEnsure()` in ui-core) plus
  an escape hatch: set `window._cinemaHold = true` to force terminal
  presentation for a stretch of story.

## What's new in 1.7.0

**Cutscenes are actual scenes now.** New presentation engine
(`engine/cinema.js`): when a story beat enters cinema mode, dialogue stops
printing into the terminal and plays fullscreen — animated noir backdrop,
letterbox bars sliding in like a film gate, the character art presented big
under a spotlight with entrance/glitch animation, and a Snatcher-style
dialogue box with an amber name plate, typewriter text, and a pulsing advance
arrow. Click / tap / Enter / Space / gamepad to advance; tap or Enter during
typing skips to the full line, exactly like the terminal.

Backdrops are procedural and animated: `blinds` (moonlight through venetian
blinds with drifting dust — the interrogation look), `rooftop` (rain over a
lit-window skyline with occasional lightning), `street` (a lamplight cone in
the rain), `plain` (film grain and vignette). Film grain and scanlines run on
all of them so it still reads as the same CRT.

The integration is at the presentation layer, so scenes convert in two lines:
`await CINEMA.begin({backdrop:'blinds',art:'bevan',title:'...'})` ...existing
typeLine / askChoice / instantArt code unchanged... `await CINEMA.end()`.
While a scene is live, typeLine types into the dialogue box with the speaker
parsed onto the name plate, story CHOICES render inside the scene (same
`.choice-btn` class, so gamepad focus drives them untouched), instantArt swaps
the on-stage character, and every line is still voiced. Converted so far:
the Clemons interrogation (blinds), Convincing Bevan (blinds), and The Rooftop
(rain + skyline + lightning).

## What's new in 1.6.0

**Everyone has a voice now.** A new character voice engine (`engine/voice.js`,
Web Speech API — no files, no network, works offline) speaks every narration
and dialogue line. The narrator has a steady noir read; Cliveman is low and
gravelled; Bevan is deep, slow and four whiskeys in; the desk clerk drones;
the suspect panics at high pitch. Any character *without* a tuned profile gets
a deterministic voice hashed from their name — so every speaker in Part One
and everything still to come sounds distinct, and always sounds the same.
Voices follow the UI language (a French playthrough speaks French where the
device has French voices), long lines are chunked so Chrome never stalls, and
racing through text can never build a speech backlog. Toggle lives in the
pause menu and Settings, persists, and defaults on where supported.

**Cutscenes stop slamming.** A shared cinematic layer (`engine/cutscene.js`)
fades every cutscene in and out through black with an amber title card — the
Buick night drives, the ASCII transit fallback, and anything future. The drive
no longer hard-cuts a WebGL canvas into the terminal: fade to black, title
card, black lifts on the moving city; on arrival the teardown happens under
black and you land on a clean terminal with the arrival line spoken. One of
the two awkward "press enter" stops around every drive is gone. Character art
reveals with a flash-settle animation and a soft sting instead of popping into
the scroll. Scene changes silence whoever was talking.

## What's new in 1.5.0

**3D nav now looks like the game.** The true-3D renderer reaches full texture
parity with the classic raster mode by sampling the *same* procedural texture
generators: themed walls (wood, metal, rubble, brick, wallpaper, panels),
floors (planks, concrete, cobble, tile), ceilings (stucco, grates, night sky),
door panels with room-number labels, and stairwell openings.

**Nothing follows you around anymore.** Props are stationary geometry:
doors and EXIT markers mount flush on their walls; clocks, photos, TVs and
badge boards hang on walls; furniture stands backed against its nearest wall;
floor items are fixed cross-quads readable from any angle. Only *people* still
turn to face you — because they're people.

**The factory stairwell is real 3D now.** Height-mapped grids build stepped
floor slabs, risers and mini-steps, and the camera eye smoothly rides the
interpolated floor height — plus a motion-driven walk-bob. Climbing between
factory floors is one continuous walk: the fade-to-black floor card is
replaced by a corner toast in 3D, so there are no loading screens between
floors.

**New title logo.** A hand-built pixel-art CLIVEMAN wordmark — phosphor
gradient, dark extrude, amber rule, and a noir fedora tipped on the "I" —
drawn procedurally on canvas (no webfont race), glowing over the title
flyover. The 5-click secret still lives on the logo.

## What's new in 1.4.0

**The title screen opens like a movie now.** When WebGL is available, the
pixel-art skyline is replaced by a full-screen Lakitu-style drone shot of the
night city — the same visual language as the Clive's Buick drive (ASCII-glyph
window facades, amber/green lights, moonlit fog). The camera starts at street
level rolling up the central avenue, then cranes up into a slow endless orbit
between rooftop height and high in the sky. A dark vignette sits between the
city and the terminal so the title text and buttons stay readable on top of
the moving background.

- New file: `engine/title-flyover.js` — fully self-contained
  (`TitleFlyover.available() / start() / stop()`), instanced buildings
  (a handful of draw calls), pixel-ratio capped, smaller city on mobile.
- Falls back automatically to the classic pixel-art city when WebGL is
  missing or `prefers-reduced-motion` is set. Nothing else changes.
- The renderer is fully disposed (context released) the moment a game
  starts, so it never competes with the in-game 3D renderers.

## What's new in 1.3.2

A hardening pass on top of 1.3.1 - still no story or gameplay changes:

- **Idle gamepad polling is gone.** The pad-reactivation watcher ran a 60fps
  requestAnimationFrame loop calling getGamepads() forever, for every player,
  pad or no pad. It's now a 150ms timer chain that skips the scan entirely
  while the pad UI is active. Unplugging one of two pads no longer kills
  input for the one still connected.
- **tSub() rewritten as a single-pass scanner.** The old split/join loop could
  let one translation's output be re-matched by another key and come out
  mangled. The scanner replaces the longest key at each position and moves
  past it - verified byte-identical to t() for every key in all 7 languages -
  and keys are bucketed by first character, so it's also much faster.
- **Corrupt saves can't crash or hang anything.** decodeSave() rejects
  non-numeric / out-of-range input, main() falls back to a fresh case instead
  of throwing on a null decode, and the load screen handles FileReader errors
  (which used to hang it silently).
- **i18n survives locked-down storage.** localStorage access in i18n/core.js
  is guarded; if it throws (some file:// / private-mode contexts), the game
  runs in English instead of losing the whole translation system.
- **Long sessions can't bloat the DOM.** The terminal keeps a 400-line
  scrollback, trimming from the top only.
- **Audio nodes are freed.** Every typewriter click used to leave its
  oscillator+gain pair connected; they now disconnect when the beep ends.
- **Zero per-frame allocations in the raycaster.** The z-buffer, ray hit pool,
  and wall-direction list are reused across frames like the frame buffer
  already was.

## What's new in 1.3.1

A housekeeping release: nothing about the story or gameplay changed, the
foundations just got honest. If you last read this guide at 1.3.0:

- **The i18n engine moved** out of anti-tamper.js into its own file,
  `engine/i18n/core.js`. anti-tamper.js is now genuinely self-contained and
  its "comment me out while developing" note is finally true.
- **The secret song is a real file now** (`assets/easteregg.mp3`) instead of
  1.7 MB of base64 inside audio.js. audio.js went from 1.7 MB to ~6 KB, and
  the mp3 is only fetched if the egg is actually triggered.
- **The retired procedural music engine was deleted** from audio.js. Music has
  played through music-classical.js since it was introduced; the dead synth
  tracks are gone. `playMusic('mood')` still works exactly the same.
- **One version constant.** `window.CLIVEMAN_VERSION` (top of dom-refs.js) now
  drives the tab title, the title-screen "ver" line, and the save-file
  payload. Bump it in one place.
- **A terminal fault trap.** An uncaught error used to be a silent freeze; now
  the terminal prints a red `[ SYSTEM FAULT ]` line telling the player to save
  and reload.
- **Dead code removed** from transitions.js, including an old `renderCity()`
  that silently shadowed the live canvas skyline of the same name.
- **anti-tamper is less hostile**: Ctrl/Cmd+A works again (it's a text game -
  players select text), and the window-size devtools detector that
  false-positived on browser zoom and blurred the game behind ACCESS DENIED
  is gone. Right-click and devtools shortcuts are still blocked.
- Every file header now names the file's real path instead of a `js/NN-*.js`
  layout that hasn't existed for versions.

## What's new in 1.0.0

- **Clive's Buick night drive.** The Chapter 1 transit to Big Smiles Mayo Corp
  HQ is now a real-time, drivable WebGL scene (three.js) instead of the ASCII
  car cutscene — on desktop and mobile. Chapter 2 reuses the same drive for a
  **second leg to Pete's Subs**, with its own drunk-Bevan banter.
- **Controller support in the drive**, GTA-V-style: RT throttle, LT
  brake/reverse, left stick steer, B handbrake, Start to save. Input is
  forgiving - throttle/brake also accept the shoulder buttons, A/X, or pushing
  the left stick up/down, so it works across controllers that report triggers
  differently.
- **Mobile racing controls.** On touch, the drive draws an on-screen steering
  wheel with left/right arrows plus red BRAKE / green GAS pedals, so phones drive
  too.
- **Viewport rework.** Nav-mode and the drive now hide the under-viewport text
  box and let the view fill the screen. Nav result text appears as a brief toast
  near the top that fades; the drive shows quips in an MMO-style chat bubble
  above the car. The desktop control bar and the same CHECK / SAVE / INV buttons
  (CHECK and INV print "You can't do that now.", SAVE saves) remain.
- **Translations restored & expanded.** All seven languages (French, Spanish,
  Chinese, Portuguese, Russian, Hindi, Arabic) now ship as one self-registering
  file each under `engine/i18n/`, and the new drive dialogue is translated too.
- **Save from inside the drive** (P on keyboard, Start/SAVE on a pad). It shows
  the same save box nav uses and downloads the `.clive` file; loading that save
  drops you back at the *start* of the drive, not your exact car position.
- **Self-contained 3D.** three.js and the Draco mesh decoder are vendored and
  inlined, so the drive works offline, behind firewalls, and over `file://`
  with no CDN. A simple box-car stands in if the detailed model ever fails.
- A green goal arrow that points at the marker, collision matched to the car's
  actual footprint (no invisible edges), and city bounds so you can't drive off
  into the void.

See "The Clive's Buick night drive" below for how it all fits together.


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
├── index.html          open this to play; all CSS inline; sets the script load order
├── README.md           this file
├── package.json        dev-only (jsdom, for the offline boot-test harness); not needed to play
├── assets/
│   └── easteregg.mp3        the secret crew-credits song (lazy-loaded)
├── engine/             generic machinery, no story content
│   ├── i18n/                translation data + engine
│   │   ├── fr.js es.js zh.js pt.js ru.js hi.js ar.js   (one dictionary per language)
│   │   └── core.js          _lang, t(), tSub(), setLanguage(), RTL handling
│   ├── three.global.js      three.js as a classic-script IIFE (window.THREE)
│   ├── title-flyover.js     title-screen 3D drone shot of the night city
│   ├── anti-tamper.js       right-click / devtools-shortcut blocking; safe to comment out
│   ├── dom-refs.js          CLIVEMAN_VERSION, the fault trap, DOM refs, IS_MOBILE
│   ├── audio.js             sound effects, mute, and the playMusic -> music-engine bridge
│   ├── voice.js             character voice engine (Web Speech API, window.VOICE)
│   ├── cutscene.js          shared fade-to-black cinematic layer (window.CUTSCENE)
│   ├── story-art.js         scene illustrations above the dialogue box (window.STORYART)
│   ├── music-classical.js   the live classical score engine + music director (window.ClassicalMusic)
│   ├── save-state.js        the state object, save encode/decode, inventory
│   ├── ui-core.js           typeLine, appendLine, clearScreen, scrolling, fullscreen, plus the prompts (yes/no, choice buttons, slider, text input)
│   ├── transitions.js       car/floor transitions, the Bevan death effect, plus the SVG character art (instantArt)
│   ├── raycaster.js         the fake-3D first-person renderer and textures
│   ├── nav3d.js             optional true-3D (three.js) drop-in for the raycaster's draw
│   ├── controls-ui.js       on-screen button row, keyboard/pad labels, plus grid room walking (navigateRoom) and the city skyline art
│   ├── menus.js             pause menu, inventory, save screen, mute toggle, plus gamepad polling, focus, button repeat
│   └── boot.js              debug jump menu, boot sequence, main() - loads last
├── story/              the actual narrative and gameplay
│   ├── title.js             title screen, intro, section() banners, load screen
│   ├── ch1.js               Chapter 1: the dream, the phone call, the factory, rooftop
│   ├── ch2.js               Chapter 2: apartment, crime scene, Dudley, Pete's Subs, death, arrest
│   ├── minigames.js         blackjack, rock-paper-scissors combat, horse racing, Snake
│   └── ch3.js               Dudley open-world money grind, Chapter 3 (evidence and trial), plus the finale: credits, fireworks, TV static, the easter-egg crew credits
└── minigame/           the WebGL night-drive (Clive's Buick)
    ├── clivesbuick.js          three.js drive scene - SOURCE (ES module). Edit this.
    ├── clivesbuick.bundle.js   classic IIFE bundle built from the source - fetched on demand, see ensureDriveBundle()
    └── vendor/                 vendored three.js (three.module.js, GLTFLoader, DRACOLoader, BufferGeometryUtils) + inlined Draco decoder
```

Several files that used to be separate have been folded into the file they're
most closely related to, to keep the file count down without mixing unrelated
concerns. If you're looking for something an older version of this guide
mentioned as its own file: the i18n *engine* is engine/i18n/core.js (and the
translation *data* is split into engine/i18n/<lang>.js), the easter-egg audio
is assets/easteregg.mp3 (wired up at the end of audio.js), the prompts are in ui-core.js, the character art is in
transitions.js, navigation is in controls-ui.js, the gamepad/input-extras code
is in menus.js, and the finale is at the end of ch3.js.

Load order in index.html:

```
i18n:   engine/i18n/core.js                     (the t()/setLanguage engine, which
                                                 in turn pulls in the ONE active
                                                 dictionary - see Translations)
        engine/three.global.js                  (window.THREE for nav3d)
        engine/title-flyover.js                 (title drone shot; needs THREE)
engine: anti-tamper, dom-refs, audio, voice, cutscene, story-art,
        music-classical, save-state, ui-core, compass, minimap, transitions,
        raycaster, handmodel, nav3d, controls-ui
story:  title, ch1, ch2, minigames, ch3
engine: menus, boot   (boot.js is always last)
```

Two things are deliberately NOT in that list, because they are fetched on
demand rather than being parser-blocking `<script>` tags:

```
engine/i18n/<lang>.js         only the active language, pulled in by core.js
minigame/clivesbuick.bundle.js  2.4 MB; fetched by ensureDriveBundle() when a
                                drive starts, and warmed on requestIdleCallback
```

Between them that's 2.63 MB — 69% of what index.html used to load up front —
kept off the boot path. If you add a script tag, think about whether it needs
to block first paint.


## Printing text (ui-core.js)

Nearly every line in the game goes through these:

- `await typeLine(text, cls, speed)` types text out one character at a time.
  `cls` is a CSS class that colors it (see below). `speed` is optional
  ms-per-char, default 14.
- `instantLine(text, cls)` prints a whole line at once, no typewriter.
- `blank(n)` prints n empty lines (default 1) for spacing.
- `clearScreen()` wipes the text area.
- `await sleep(ms)` pauses, used between lines for pacing.

Color classes, passed as the `cls` argument (defined in the inline CSS in
index.html):

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


## Asking the player something (prompts, in ui-core.js)

- `await yn(question)` returns true/false, shows YES/NO buttons.
- `await askChoice(prompt, opts)` (or `askClick`) shows a row of buttons and
  returns the chosen option. Each option is `{keys:['id'], label:'TEXT'}`. Read
  the result with `result.keys.indexOf('id') !== -1`.
- `await pressEnterToContinue()` is a single CONTINUE button, also triggered by
  Enter/Space.
- `await ask()` reads free text from the command line (returns it lowercased).
- `await askNumber(prompt, min, max)` is a slider, used for placing bets.

A note on the keyboard and prompts: a prompt with two or more options (yes/no,
any `askChoice` with real choices) ignores Enter on purpose, so a player
spamming Enter to skip through text can't accidentally auto-pick the first
option. Those prompts only advance on a click (or, on a gamepad, by moving focus
to a button and confirming it). Enter still advances single-option CONTINUE
prompts, which is the normal "next" flow. The guard for this lives in
`showChoiceButtons` in ui-core.js (it only lets Enter fire when there's exactly
one option).

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
eight story flags (8 bits), money (10 bits), a mechanic-paid flag (1 bit), and
an at-drive-start flag (1 bit, so a save made mid-drive resumes at the start of
the drive).


## First-person rooms (controls-ui.js and raycaster.js)

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
- `D` or `E` door (renders as a door texture painted onto the adjacent wall face; the tile stays walkable so exit/event logic works normally)
- `S` stairs up / `v` stairs down (walking onto either triggers the stair-climb bob animation; pair them between floors so the player can go back)
- `K` witness/suspect NPC — rendered as a red person silhouette in 3D; attach dialogue at the same `'row,col'` key in the events map
- `B` bystander NPC — rendered as a blue person silhouette in 3D
- `L` exit direction marker (an arrow indicator, use alongside an exits entry)
- `M` `G` `H` `A` service/location markers: mechanic, tavern, horse track, arcade
- `1` through `6` numbered room doors (render as door wall textures, labeled 201–206)

Room themes are chosen automatically from the room title string by pickTheme()
in raycaster.js. The themes are factory, apartment, lobby, crime, street, and
default. Each one sets wall/floor/ceiling colors and textures. To add a theme,
add an entry to RC_THEMES and a matching rule in pickTheme (for example, "if
the title contains 'morgue', use the morgue theme").

The movement and rendering are already optimized (DDA raycaster, reused pixel
buffer, smaller buffer on mobile). To add rooms you only need navigateRoom
calls, not changes to the render code.

If you're building a multi-floor room (like the factory), call
`await stairClimbBob(dir, steps)` (defined in raycaster.js) before switching
rooms — it plays the camera-bob stair-climb animation. `dir` is `'up'` or
`'down'`, `steps` is how many steps to animate (4 is the default used in the
factory). And `floorLabelFade(text)` (in transitions.js) briefly overlays a
centered floor-name banner, useful right after the bob.


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


## Music and sound (audio.js + music-classical.js)

It's all WebAudio - there are no music files. Sound effects live in audio.js;
the music itself is performed live by the classical score engine in
music-classical.js (`window.ClassicalMusic`): an 18-piece public-domain
repertoire — Bach (Air on the G String, Prelude in C, Toccata in D minor),
Beethoven (Ode to Joy, Für Elise, Moonlight Sonata), Mozart (Eine kleine
Nachtmusik, Lacrimosa), Grieg (Morning Mood, In the Hall of the Mountain King),
Chopin (Funeral March), Tchaikovsky (Swan Lake), Pachelbel (Canon in D), Satie
(Gymnopédie No. 1), Petzold (Minuet in G), Rossini (William Tell Overture),
Greensleeves, and the Dies Irae plainchant — played as original simplified
arrangements by two voices: a plucky triangle lead for lighter pieces and a
bowed detuned-saw "strings" section for solemn ones, over a sine bass (some
pieces add an inner harmony voice).

The engine picks music three ways, in order of authority:

1. **Story contexts** — `ClassicalMusic.setContext(name)` pins a piece or a
   pool. `dream` and `bevan_death` pin Bach's Air and *hold* it (auto-cues
   can't interrupt; only an explicit `playMusic()` releases the hold).
   `bevan_death` also sets a **somber flag**: for the rest of the game every
   calm-pool cue resolves to the grief pool instead, and returning to the
   title screen lifts it. Other contexts: `grief`, `chase`, `calm`, plus the
   legacy tension moods (`title` 0.18, `investigate` 0.5, `lonely` 0.62,
   `descent` 0.92) which rotate ambient pools (calm / mid / tense) by a 0..1
   tension dial.
2. **The music director** — `ClassicalMusic.cue(text)` fires automatically
   with every section title, room title, cutscene title, and drive title
   (hooked in `section()`, `navigateRoom()`, `window.cutscene`, and
   `driveClivesBuick()`). A first-match rule table (`CUE_RULES`) maps titles
   to pieces, pre-i18n and normalized. Cues steer music that's already
   playing (they never start it), consecutive identical titles are deduped,
   and unmapped titles leave the score alone. Note: the `/^DRIVE/` rule must
   stay first, since drive titles contain destination names.
3. **Direct** — `ClassicalMusic.playPiece(id, {loop, pool})`.

The story scripts never talk to the engine directly. They call
`playMusic(name)` in audio.js, which forwards every name to `setContext` (or
the legacy tension dial as a fallback) and starts the engine.

- `playMusic('title' | 'investigate' | 'lonely' | 'descent' | 'dream' |
  'bevan_death' | 'grief' | 'chase' | 'calm')` starts music for that context.
- `stopMusic()` fades the music out.
- `setMuted(bool)`, `toggleMute()`, `isMuted()` control global mute (silences
  both music and sound effects). The pause menu's mute button calls these.
- Sound effects: `playKeyClick()`, `playCharClick(ch)` (the typewriter clicks),
  `playMoveBlip()`, `playEngine()`, and the low-level `beep(freq,dur,vol,type)`.

To add music: add a piece to the `PIECES` array in music-classical.js (a
melody/bass note list; `moods` says which ambient pools it rotates in — calm /
mid / tense / grief — and `lead` picks the triangle or strings voice), then
either map a title to it in `CUE_RULES`, add a context in `CONTEXTS`, or call
`ClassicalMusic.playPiece('yourid')` from a scene. (startNoirMusic and
stopNoirMusic are old aliases for the title mood and stopMusic.)

Browsers won't play audio until the first user interaction, so the engine has a
one-time listener that resumes the audio context and re-arms whatever track
should be playing.


## The secret song (assets/easteregg.mp3)

The one real audio asset (the crew-credits song) ships as
`assets/easteregg.mp3`. A small block at the end of audio.js points the hidden
#easterEggAudio element at it with `preload="none"`, so the browser doesn't
download a byte of it unless the egg actually fires. It's triggered by clicking
the title logo five times, and playFinaleEasterEgg() (in ch3.js, with the rest
of the finale) plays it (stopping the music first, restarting the title music
after). It used to be embedded in audio.js as base64; it isn't anymore.


## Transitions, character art, and the death effect (transitions.js)

- `carTransition(fromLabel, toLabel)` and `floorTransition(dir, from, to)` are
  the little animated interstitials between locations and floors.
- `bevanDeathEffect()` is the screen glitch-shake, red vignette pulse, and harsh
  audio sting when Bevan dies. It stops the music, respects mute, and resets the
  screen fully to normal before the next scene runs, so no red haze lingers.
  `clearDeathVignette()` is a no-op kept around for safety.
- `instantArt(kind, cls)` shows a CRT phosphor line-art portrait. The three
  kinds are `'normal'` (standard fedora-and-coat detective face), `'bs'`
  (skeptical/confrontational — amber LIAR badge, used with the `'glitch'` class),
  and `'shoot'` (combat stance — gun extended, no hat, amber BLAM badge). Used
  at interrogation and action moments. Pass `'glitch'` as the second arg for the
  chromatic-aberration effect on the bs variant.
- `floorLabelFade(text)` briefly overlays a centered floor-name banner that
  fades out — useful right after a stair-climb bob when entering a new floor.


## Voices, scene art, and the fade layer (voice.js, story-art.js, cutscene.js)

Three presentation systems sit around the dialogue box:

- **Character voices** (`engine/voice.js`, `window.VOICE`) — every narration
  and dialogue line is spoken via the Web Speech API (no files, no network).
  Named characters have tuned profiles in the `CAST` table; anyone else gets a
  deterministic voice hashed from their name, stable for the session. Voices
  follow the UI language, long lines are chunked so Chrome never stalls, and
  racing through text can't build a speech backlog. The VOICE SFX toggle lives
  in Settings and the pause menu (`VOICE.toggle()`, persisted under the
  `cliveman_voice` localStorage key). To voice a new character, add a profile
  to `CAST` — or don't, and the hash voice covers them.
- **Scene illustrations** (`engine/story-art.js`, `window.STORYART`) — the
  blank space above the dialogue box shows a green-phosphor SVG of the current
  scene. `section()` picks the scene from its title automatically
  (`STORYART.hint`); big beats set theirs explicitly with `STORYART.set(key)`.
  Character figures (`instantArt` / `STORYART.char`) layer on top of the
  scene, and art is event-driven: it clears with the next screen clear. This
  file replaced the retired fullscreen cinema stage (`engine/cinema.js`,
  removed in 1.9.0).
- **The cutscene fade layer** (`engine/cutscene.js`, `window.CUTSCENE`) —
  `await CUTSCENE.fadeIn(label?)` fades to black (with an optional amber film
  title card) and `await CUTSCENE.fadeOut()` lifts it. Used around the Buick
  drives and the ASCII transit so nothing hard-cuts into the terminal. Both
  resolve on timers (never transitionend), so hidden tabs can't hang the
  story, and fadeIn silences whoever was talking.

Related, in ui-core.js: **the dialogue advance gate**. After a speaker line
finishes typing, a blinking amber `▼` appears and the story waits for the
player (Enter/Space, tap/click on the dialogue box, or gamepad A). It's
`dlgAdvanceGate()` at the end of `typeLine()`, active only when the dialogue
box is actually on screen (`_dlgBoxVisible()` — never nav toasts or the
driving HUD). `window._dlgAdvance` is exposed while a gate is open, as a test
hook. `cutscene(beats, opts)` (in ui-core.js) plays beat sequences in the
dialogue box — title banner, typewriter narration, press-to-continue — and
leaves earlier beats in the scrollback so scenes can be reread.


## The Clive's Buick night drive (minigame/clivesbuick.js)

The night drive to Big Smiles Mayo Corp HQ (Chapter 1) is a real-time WebGL
minigame built on three.js. `driveClivesBuick(from, to, dopts)` in
transitions.js is the entry point the story calls; it runs the 3D drive, or
falls back to the old ASCII `carTransition` only if `startClivesBuick` isn't
available or WebGL errors. The optional `dopts` lets any scene **reuse the
drive** for a different destination — `{title, destLabel, arriveLine,
driveQuips, hitQuips, markAtDriveStart}`. Chapter 2 uses this for a **second
drive to Pete's Subs** (`ch2_leave_dudley_to_petes` in ch2.js) with its own
Cliveman + Bevan banter (drunk, starving, missing Karen) in place of Cliveman's
solo Chapter 1 quips. Both drives run on desktop **and** mobile.

How the pieces fit:

- **Source vs bundle.** `minigame/clivesbuick.js` is the ES-module source you
  edit. The game does NOT load it directly — it loads
  `minigame/clivesbuick.bundle.js`, a classic (non-module) bundle. The bundle is
  what makes the drive work over `file://`, where ES modules and import maps are
  blocked. After ANY edit to clivesbuick.js you MUST rebuild the bundle or the
  change won't show up in game (see "Rebuilding" below).
- **Loaded on demand.** The bundle is no longer a `<script>` tag in index.html.
  `window.ensureDriveBundle()` (engine/transitions.js) fetches it the first time
  a drive is about to start, coalescing concurrent calls, and a
  `requestIdleCallback` warms it in the background so that first drive doesn't
  stall. If it can't be loaded at all, `driveClivesBuick()` falls back to the
  ASCII transit exactly as it always did when `startClivesBuick` was missing —
  so a broken or absent bundle degrades instead of blocking the story.
- **Self-contained.** three.js, GLTFLoader, DRACOLoader and BufferGeometryUtils
  are vendored under `minigame/vendor/`, and the Draco decoder is inlined into
  the source as a string and fed to DRACOLoader, so nothing is fetched from a CDN
  at runtime. Works offline and behind firewalls.
- **Fallback.** The drive defines `window.startClivesBuick(opts)`. If three.js
  isn't available, driveClivesBuick falls back to the ASCII transit. If the
  detailed car model fails to decode, a simple box-car stands in and the drive
  stays completable.

The scene is a procedural night-time city grid of lit buildings and roads, the
player's Buick on a chase camera, a glowing red goal marker, and a green arrow
floating above the car that always points at the marker.

Controls:

- Keyboard: W/Up throttle, S/Down brake+reverse, A/D or arrows steer, P save.
- Gamepad (GTA-V style): RT throttle, LT brake/reverse, left stick steer,
  B handbrake, Start save. Throttle/brake are analog and also fall back to the
  shoulder buttons, A/X, or the left stick (push up to go, down to brake), so a
  controller that maps its triggers oddly still drives. The on-screen control
  legend swaps between keyboard and controller prompts automatically, driven by
  the same `window._padConnected` flag nav-mode uses.
- Touch (mobile): on-screen racing controls drawn over the view — a steering
  wheel flanked by left/right arrows at the bottom-left, and red **BRAKE** /
  green **GAS** pedals at the bottom-right, plus small C / SAV / INV buttons.
  Holding a control sets the same key state the keyboard path uses. (Mobile used
  to fall back to the ASCII transit; it now drives like everything else.)

`driveClivesBuick` passes the minigame an options object: `canvasParent` (it
mounts into `#mapArea`, which it un-hides and uncaps for the drive, then
restores), `onQuip` / `driveQuips` / `hitQuips` (the one-liners), `onArrive`,
`onBlocked`, `onSave`, and the text the in-view bubble shows: `arriveText`,
`blockedText` ("You can't do that now." for the CHECK/INV buttons), and
`startHint` (the objective, shown briefly when the drive begins). `onSave` calls
the normal `showSaveCode()` (which downloads the `.clive` save file and returns
its box text, shown as an overlay) and sets `state.atDriveStart`, so loading
resumes at the *start* of the drive rather than mid-drive — that flag is encoded
in save-state.js and read by `runFrom` in ch3.js, which skips the apartment walk
and re-enters the drive.

Layout / presentation (viewport rework): both nav-mode and the drive now drop
the under-viewport text box and let the viewport fill the screen, on desktop and
mobile. The text that used to print to `#screen` is shown *inside* the view:

- **Nav mode** hides `#screen` (`body.nav-mode #screen{display:none}`) and the
  canvas scales up to fill (up to 100vw / 88vh, aspect preserved). Result text
  (Check descriptions, etc.) appears as an ephemeral toast near the top of the
  screen that fades out — `window.showNavToast(text)` in ui-core.js, which
  `instantLine`/`typeLine` call only while `nav-mode` is active. The fade
  duration scales with length so longer lines stay readable.
- **The drive** adds a `body.cv-driving` class (added when the drive starts,
  removed on success and on the error fallback) that hides `#screen` and fills
  the canvas the same way. Quips and the blocked-action line appear in an
  MMO-style **chat bubble above the car** (`.cv-bubble`, with a downward tail),
  created and faded by `showBubble()` inside clivesbuick.js; `startHint` shows
  the objective in the bubble at the start. The arrival line lands back in
  `#screen` right after the drive (the class is removed, so the terminal
  reappears for the usual press-Enter beat). The renderer uses pixel ratio 1 so
  the buffer matches the nav canvas (640x418; 512x307 on mobile).

The desktop bottom bar (control legend + CHECK / SAVE / INV, appended *outside*
`#mapArea`) and the mobile on-glass racing controls are still there; only the
text box moved into the view. Everything the drive creates is removed on cleanup.

Collision is checked against the car's rotated rectangular footprint (corners +
front/back + side centres) instead of an inflated point, so the car stops exactly
where it visually meets a building, with no invisible edges. Rather than a plain
yes/no, `penetrationAt()` returns how deep the footprint overlaps a building AABB;
a per-axis move is permitted when the destination is clear *or* when it shrinks an
existing overlap, and steering is blocked from rotating a corner deeper into a
wall. That combination means a car that ends up wedged can always steer or reverse
out (with a small depenetration nudge as a backstop) instead of freezing. The car
is also clamped to the city so you can't drive into the empty void.

### Rebuilding the bundle

The bundle is built with esbuild. From the project root (the aliases want
absolute paths to the vendored files):

    esbuild minigame/clivesbuick.js --bundle --format=iife --platform=browser \
      --minify \
      --alias:three=<abs>/minigame/vendor/three.module.js \
      --alias:three/addons/loaders/GLTFLoader.js=<abs>/minigame/vendor/jsm/loaders/GLTFLoader.js \
      --alias:three/addons/loaders/DRACOLoader.js=<abs>/minigame/vendor/jsm/loaders/DRACOLoader.js \
      --outfile=minigame/clivesbuick.bundle.js

The aliases point the bare `three` / `three/addons/...` imports (including the
ones inside GLTFLoader) at the vendored copies. If you ever swap the inlined
Draco decoder, regenerate `vendor/draco/decoder-src.js` as
`export default <JSON.stringify of the decoder source>` and rebuild.


## Title and credits (title.js, finale code in ch3.js)

title.js has `titleScreen()` (the menu), `intro()`, `section()` (the banner
helper), and the load-game numpad and loadScreen. The finale code now lives at
the end of ch3.js: `playFinale()` (the fireworks-and-static end credits),
`playFinaleEasterEgg()`, and the firework and static canvas routines.


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
The media queries in index.html's inline CSS (max-width 600px and 767px) shrink fonts, swap
in the on-screen button nav, and cap the 3D viewport so it always fits.


## Translations (engine/i18n/)

The translation **engine** lives in `engine/i18n/core.js`: `window.t(string)` looks the
string up in `window._translations[_lang]` and returns the translation, or the
original string if there isn't one — so the English text in the source acts as
both the default and the lookup key. `window.tSub(string)` does a substring pass
for composed lines, and `window.setLanguage(code)` switches language, saves the
choice to localStorage under `'cliveman_lang'`, applies right-to-left layout for
Arabic, and refreshes any `data-tpl` elements. `typeLine`/`instantLine` run their
text through `t()` (then `tSub()`), so any line printed to the terminal is
localized automatically.

The translation **data** lives in one file per language under `engine/i18n/`:
`fr.js, es.js, zh.js, pt.js, ru.js, hi.js, ar.js` (French, Spanish, Chinese,
Portuguese, Russian, Hindi, Arabic; English is the untranslated default). Each
file self-registers, e.g.:

```js
window._translations = window._translations || {};
window._translations['fr'] = { "START NEW GAME": "NOUVELLE PARTIE", ... };
```

Dictionaries are **not** static `<script>` tags any more. All seven used to be
loaded on every page load — ~320 KB — even though only one can be active and
English needs none of them. `core.js` now loads just the one it needs:

- during initial parse it uses `document.write`, which keeps the dictionary
  strictly ordered ahead of every later script exactly as the old tags did;
- afterwards (a language switch mid-game) it injects a `<script>` and fires a
  callback on load.

Both are plain classic scripts, so a dictionary still self-registers into the
same shared global scope. `fetch()` deliberately isn't used — the game has to
run from `file://`.

**Adding a language means two edits**: drop in `engine/i18n/<code>.js`, and add
the code to `window.I18N_LANGS` in `core.js`. That array is the authoritative
list of what's shippable; `loadLanguage()` won't fetch anything outside it. The
button list in `menus.js` (code / label / native name) is separate and is what
the Settings → Language selector renders.

The active language is read from localStorage, defaulting to English. Because
the dictionary may not be resident yet, `setLanguage(lang, cb)` will load it and
re-enter before applying — **anything that repaints after a language change
belongs in the callback**, not on the line after the call.

To translate or fix text: add/edit the English string as a key in the relevant
`engine/i18n/<lang>.js` file (values can be appended in a later
`Object.assign(window._translations['fr'], { ... })` block — that's how the
drive dialogue was added). Names are kept in Latin for fr/es/pt and
transliterated for ru/ar/zh/hi to match the existing style. Anything you don't
translate still shows up fine, just in English.

The night-drive's terminal lines (Cliveman/Bevan quips, crash lines, objective,
"You can't do that now.") are translated this way; the drive's **in-canvas** UI
(viewport title, GAS/BRAKE pedals, control legend) is localized separately via a
small `L()` helper inside `clivesbuick.js` that calls `window.t`.


## Input

- Keyboard: typing goes to the command line. In nav mode, arrow keys or WASD
  move and turn, Q/E strafe, C checks. Enter/Space advances text and single
  CONTINUE prompts, but a multi-option prompt (yes/no or a real choice) won't
  advance on Enter; you have to click an option.
- On-screen buttons: controls-ui.js draws the nav button row (move, turn, check,
  inventory, save) for touch and mobile.
- Gamepad: the gamepad code in menus.js polls the Gamepad API, detects the pad
  type (Xbox/PlayStation/generic) so the button labels are right, handles focus
  navigation of the on-screen buttons, button repeat, and the
  "controller connected" toast. The Confirm/Cancel/Check labels adapt through
  labelConfirm() and labelCheck() in controls-ui.js.
- The Clive's Buick drive has its own input, handled inside
  minigame/clivesbuick.js (separate from the menus.js pad code): keyboard
  W/S/A/D + arrows and P to save, or a GTA-V-style pad (RT throttle, LT
  brake/reverse, left stick steer, B handbrake, Start save). See "The Clive's
  Buick night drive" above.


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

Add music: add a piece to PIECES in music-classical.js (with its `moods`
pools), then map a title to it in CUE_RULES, add a context in CONTEXTS, or
call ClassicalMusic.playPiece('yourid') from a scene.

Add a language: create engine/i18n/xx.js registering into window._translations
(copy fr.js), and add its <script> tag before engine/i18n/core.js.

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

## v1.9.9 — Unique character voices + colored dialogue
- **engine/voice.js v2**: every character is cast to a REAL, UNIQUE system voice. Fixes the v1 bug where Chrome's async `getVoices()` left everyone on the browser default voice (stale assignments now invalidated on `voiceschanged`). Voices are quality-scored (natural/neural/Google preferred; espeak + macOS novelty voices like Zarvox/Bells excluded), gender-cast per character, and never given to a second character until the pool is exhausted — forced reuse applies an automatic pitch offset so no two characters ever share a voice+pitch signature.
- **Per-character dialogue colors**: `window.CHAR_COLOR(lineOrName)` registry in voice.js. Cliveman keeps his signature amber; all 15 story characters have distinct phosphor hues; unknown names hash to a stable hue outside the amber band. ui-core tints speaker line divs and the `#dlgName` plate (text, border, glow).
- Cast registry matches the real story roster (Linda, Officer Reyes, Clemons, Teen, Public Defender, Judge, Dealer, Bystander, Fat Mustached Guy...) with Part Two names pre-cast (Hollis, Mr. Sun, Russell Pyne).
