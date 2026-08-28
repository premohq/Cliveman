# Cliveman validation suites

Run all release-safe checks from the repository root:

```bash
npm install
npm test
```

## Core suites

- `test_package_integrity.js` — script order, IDs, syntax, bundle, conflict markers.
- `test_dialogue_parsing.js` — speaker prefixes, translated dialogue, NAV dialogue plate.
- `test_consistency.js` — saves, pause, focus, localization, version agreement.
- `test_drive_city.js` — objective bounds and source/bundle city logic.
- `test_drive_minimap_runtime.js` — exact source minimap renderer with a fake canvas.
- `test_audio_bus.js` — confirms every audible path reaches the master bus.
- `test_presentation.js` and `test_presentation_regress.js` — story surface, character panels, scene routing, save boxes.
- `validate_boot.js` — evaluates the classic-script stack in one shared scope.

## Factory suites

- `test_factory_layered_nav.js` — one persistent stacked world and no floor swaps.
- `test_factory_layout_identity.js` — original local grids, evidence, event, and roof coordinates.
- `test_factory_stability.js` — reachability, deck height, edge safety, camera headroom, legacy saves.
- `test_factory_tower.js` — walkable stair connections between every adjacent floor.
- `test_factory_external_stair_world.js` — external stair mapping and absence of teleport hooks.
- `test_factory_world_geometry_safety.js` — mapped neighbor distance and rise limits.

## Browser suites

`test_lazy_boot.js` requires Playwright and a compatible Chromium binary. Set `CHROME_PATH` when Chromium is not at the default path:

```bash
CHROME_PATH=/path/to/chrome npm run test:browser
```

`test_render_pixels.js` compares raycaster and navigation-HUD pixels against a validated reference checkout:

```bash
node tests/test_render_pixels.js /path/to/reference-checkout
```

Run the pixel suite before shipping any change to `engine/raycaster.js` or `engine/navigation-hud.js`.

## Voice generator

The offline generator lives at `scripts/gen_voices.py`. It can inventory lines without an API key:

```bash
python3 scripts/gen_voices.py --dry-run
```

Generated voice audio is optional; ordinary browser play uses the existing runtime voice system.
