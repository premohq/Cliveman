# Cliveman 2.0.20 — Claude Import Handoff

## Import instruction

Import the entire repository or the companion `cliveman-2.0.20-claude-import.zip`. Do not import only `index.html`: Cliveman depends on the modular engine, story, assets, driving bundle, documentation, and regression tests.

Read in this order:

1. `README.md`
2. This file
3. `docs/HANDOFF.md`
4. `docs/VALIDATION.md`
5. `tests/README.md`

## Current source of truth

- Release: `2.0.20`
- Runtime version: `engine/foundation.js` → `window.CLIVEMAN_VERSION`
- Browser entry point: `index.html`
- Approved in-game and README logo: `assets/cliveman-logo.png`
- Factory layout and world generator: `engine/raycaster.js`
- Factory story/NAV launch: `story/ch1.js`
- Continuous-world NAV renderer and movement: `engine/nav3d.js`
- Original recovered archive SHA-256: `05a77960cf27166bd6093b5999761f630d5fbcf012a0c5ae9d11a5282123d094`

## Non-negotiable project requirements

1. Deliver developer builds only unless Ben explicitly asks for a compact/player build.
2. The factory must be physically walkable between all five floors: room → small east hallway → long stair tower slightly right of the building → next floor.
3. Never restore teleport stairs, spawn-point snapping, per-floor NAV reloads, fake transition cards, a deep open shaft, or a flattened corridor masquerading as height.
4. Preserve the teleport-era local room layouts and all prop, item, NPC/event, evidence, and roof-door coordinates.
5. If the current NAV engine cannot satisfy a requested 3D-space change, the engine may be revised, but existing story, saves, city driving, interrogation, and navigation behavior must remain functional.
6. Verify every change before delivery. Keep automated regression coverage with any engine or factory change.
7. Preserve the approved art direction: terminal UI; `CLIVEMAN / DETECTIVE ADVENTURE` title; older, somewhat fat but capable Cliveman; compressed motion-comic imagery; cropped suspect reaction panels.

## Additions included since the old GitHub 2.0.7 build

- Versions 2.0.8–2.0.18 consistency, localization, city-driving, minimap, art, performance, and maintainability work described in `docs/HANDOFF.md` and `docs/README.md`.
- Approved transparent title logo and in-game title integration.
- Raster story scene artwork and Clemons interrogation reaction set.
- Procedural low-poly NAV evidence models with automatic billboard fallback.
- Continuous external factory stair world with stacked elevations and no teleport hooks.
- Factory layout-identity, reachability, stair-tower, persistent-world, geometry-safety, and legacy-save-landing tests.
- Corrected GitHub developer layout, reproducible npm metadata, current version metadata, README branding, and this Claude-specific handoff.

## System map

| System | Primary files |
| --- | --- |
| Boot, globals, fault handling | `engine/boot.js`, `engine/foundation.js` |
| UI, menus, saves | `engine/ui-core.js`, `engine/menus.js`, `engine/cinematic-state.js` |
| First-person NAV | `engine/raycaster.js`, `engine/nav3d.js`, `engine/controls-ui.js`, `engine/navigation-hud.js` |
| Story and progression | `story/title.js`, `story/ch1.js`, `story/ch2.js`, `story/ch3.js` |
| Story/interrogation art | `engine/story-art.js`, `assets/scenes/`, `assets/interrogations/` |
| City driving | `minigame/clivesbuick.js`, `minigame/clivesbuick.bundle.js`, `engine/transitions.js` |
| Audio and music | `engine/audio.js`, `engine/music-classical.js`, `engine/voice.js` |
| Localization | `engine/i18n/core.js`, `engine/i18n/*.js` |
| Validation | `tests/`, `docs/VALIDATION.md` |

## Required validation

Run from the repository root:

```bash
npm install
npm test
```

For NAV rendering changes, also run the browser and pixel suites described in `tests/README.md`. Any factory change must keep all scripts named `tests/test_factory_*.js` passing.

## Safe continuation procedure

1. Reproduce the requested behavior from the current repository state.
2. Read the relevant current source plus the matching historical notes in `docs/HANDOFF.md`.
3. Make the smallest coherent change; avoid reintroducing consolidated/deleted legacy modules.
4. Update or add a focused regression test.
5. Run `npm test`, then browser/pixel validation when rendering or boot behavior changed.
6. Update `README.md`, `docs/HANDOFF.md`, and `docs/VALIDATION.md` when behavior, structure, or release metadata changes.

## Known boundaries

- The game is intentionally client-side and can run from `file://`; do not add a mandatory backend for ordinary play.
- `minigame/clivesbuick.bundle.js` is shipped output but required at runtime. Keep it synchronized with `minigame/clivesbuick.js` after drive changes.
- Unknown NAV item keys must continue to use the existing cross-plane fallback rather than disappear.
- `docs/README.md` and much of `docs/HANDOFF.md` are historical technical records. Current release metadata in the root README, this file, and `engine/foundation.js` takes precedence over older version headings inside historical sections.
