<p align="center">
  <img src="assets/cliveman-logo.png" alt="CLIVEMAN — Detective Adventure" width="900">
</p>

<p align="center">
  <b><a href="https://premohq.github.io/Cliveman/">▶ PLAY IN YOUR BROWSER</a></b>
</p>

# Cliveman 2.0.20

It's 3 AM. Your wife has been dead two years, you're halfway through a bottle of vodka, and the phone won't stop ringing.

You're Detective Clive Cliveman. Your boss Bevan can't be bothered to get out of bed, so you get sent to check out a break-in at Big Smiles Mayo Corp HQ. The owner, Clemons Dee Tubley, swears someone's in his building, but his story keeps changing.

It goes downhill from there. By the end of the night you're going to want to know who's making the mayonnaise.

It's a noir detective game (mostly a comedy, sometimes not) that plays on an old green-screen police terminal.

## What's in it

- First-person exploring: your apartment, a five-floor mayo factory, Bevan's building, a crime scene
- Driving your Buick around Dudley with a GPS minimap
- Interrogations where you decide whether to call BS on people
- Rooftop chases
- Blackjack, horse racing and Snake for when your car breaks down and you need cash
- A secret ending

## Playing

Play at [premohq.github.io/Cliveman](https://premohq.github.io/Cliveman/). Works on desktop and mobile browsers, nothing to install.

| Action | Keyboard | Controller / Mobile |
| --- | --- | --- |
| Move / turn | `W A S D` or arrow keys | Left stick / on-screen pad |
| Examine / interact | `C` | Face button shown on screen |
| Continue dialogue | `Enter` | Face button / tap |
| Close menus | `Esc` | Back button |

Save & Quit from the pause menu downloads a `.clive` save file. Load it from the title screen to continue.

Languages: English, Español, Français, Português, Русский, 中文, हिन्दी, العربية.

## Running it locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## For developers

```bash
npm install
npm test               # core + factory regression suites (Node, jsdom)
npm run test:browser   # browser performance checks (needs Playwright Chromium)
```

| Path | What's in it |
| --- | --- |
| `index.html` | Entry point and terminal UI |
| `story/` | Title screen, chapters 1–3, finale, minigames |
| `engine/` | First-person nav, raycaster, audio, menus, saves, art, translations |
| `minigame/` | The Buick city-driving game (Three.js) |
| `assets/` | Logo, scene art, interrogation panels, audio |
| `tests/` | Regression and browser tests |
| `docs/` | Changelog, handoff notes, and validation details |

Changelog is in [`docs/README.md`](docs/README.md), dev notes in [`docs/HANDOFF.md`](docs/HANDOFF.md).
