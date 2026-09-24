<p align="center">
  <img src="assets/cliveman-logo.png" alt="CLIVEMAN — Detective Adventure" width="900">
</p>

<p align="center">
  <b><a href="https://premohq.github.io/Cliveman/">▶ PLAY IN YOUR BROWSER</a></b>
</p>

# Cliveman 2.0.20

**It's 3 AM in Dudley. Your wife has been dead for two years, you're working through a bottle of vodka, and the phone won't stop ringing.**

You are **Detective Clive Cliveman**: old, bitter, and a little too quick with a revolver. Your boss, Detective Bevan, can't be bothered to get out of bed, so you've been sent to check on a break-in at **Big Smiles Mayo Corp HQ**, the biggest mayonnaise company in the city. Its sweaty, mustachioed owner, Clemons Dee Tubley, is screaming that someone is inside his building, and his story changes every time he opens his mouth.

The break-in is only the beginning. Before the night is over a factory will be rubble, a friend will be dead, and you'll be asking the one question nobody in Dudley is allowed to ask: *who's making the mayonnaise?*

Cliveman is a noir detective adventure with dark comedy, played on a green-screen police mainframe terminal.

## What you do

- **Explore in first person.** Walk your apartment, a five-storey mayo factory, Bevan's apartment building, and the burnt-out wreck of a crime scene. Look for evidence and poke at things you probably shouldn't.
- **Drive your Buick** through the streets of Dudley in 3D, following the GPS route on your minimap.
- **Interrogate suspects.** Figure out when someone is feeding you a line, and choose between calling their **BS** or taking them at their word. Your choices change what happens.
- **Chase suspects** up stairwells and across rooftops.
- **Scrape together cash** when your car dies in the middle of town. Play illegal blackjack at the Gumshoe Tavern, bet on the horses at Dudley Mills, or hit the arcade for some Snake.
- **Find the secret ending.** There's more than one way out of Dudley.

The story plays out as motion-comic scenes with a noir soundtrack, voiced lines, and a lot of terrible decisions.

## Playing

Play it at **[premohq.github.io/Cliveman](https://premohq.github.io/Cliveman/)**. It runs in any modern desktop or mobile browser, with nothing to install and no account needed.

| Action | Keyboard | Controller / Mobile |
| --- | --- | --- |
| Move / turn | `W A S D` or arrow keys | Left stick / on-screen pad |
| Examine / interact | `C` | Face button shown on screen |
| Continue dialogue | `Enter` | Face button / tap |
| Close menus | `Esc` | Back button |

**Saving:** use *Save & Quit* from the pause menu to download a `.clive` save file. Choose *Load* on the title screen to pick up where you left off.

**Languages:** English, Español, Français, Português, Русский, 中文, हिन्दी, العربية.

## Running it locally

Clone the repo and open `index.html` in a browser. If your browser blocks local files, serve the folder instead:

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

The full version history lives in [`docs/README.md`](docs/README.md). Implementation notes and the factory-navigation rules are in [`docs/HANDOFF.md`](docs/HANDOFF.md) and [`docs/CLAUDE_IMPORT.md`](docs/CLAUDE_IMPORT.md).
