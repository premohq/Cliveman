# Cliveman 2.0.20 validation

## Release identity

- Runtime version: `2.0.20` in `engine/foundation.js`.
- Repository layout: directly playable developer source at the repository root.
- Approved title/README logo: `assets/cliveman-logo.png`.
- Recovered archive SHA-256: `05a77960cf27166bd6093b5999761f630d5fbcf012a0c5ae9d11a5282123d094`.

## Standard validation

Install development dependencies and run all release-safe automated suites:

```bash
npm install
npm test
```

The standard command covers:

- package/load-order integrity and JavaScript syntax;
- dialogue parsing and all translation dictionaries;
- version, save/load, pause, focus, and release consistency;
- city objective bounds, minimap depth, runtime drawing, and bundle parity contracts;
- shared audio bus and presentation behavior;
- shared-scope jsdom boot;
- factory local-layout identity;
- continuous-world/no-teleport assertions;
- bidirectional reachability, event/evidence reachability, safe step rise, deck height, camera headroom, and legacy save landings.

## Browser-only validation

After installing a Playwright Chromium binary:

```bash
npm run test:browser
```

For a change to `engine/raycaster.js` or `engine/navigation-hud.js`, also compare rendered pixels to the previous validated checkout:

```bash
node tests/test_render_pixels.js /path/to/reference-checkout
```

## Factory acceptance contract

- One persistent NAV world.
- Five vertically stacked original room layouts.
- A short east hallway from each floor to the continuous external stair tower.
- No room-sector swap, transition overlay, teleport callback, or spawn snap between floors.
- All protected evidence, events, props, roof exit, and legacy save landings remain reachable.
- Geometry safety test maximum neighbor distance and rise stay within the walking engine's accepted bounds.

## Environment note

The standard test suite does not require a downloaded browser. Browser performance and exact pixel tests are intentionally separate because they require a compatible Chromium executable.
