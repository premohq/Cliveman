# tools/ — validation harnesses + the voice generator

The game itself has no build step (only the drive bundle does), so these are
the checks that stand in for one. Run them from the project root.

    node tools/validate_boot.js                       # every script boots in one shared scope
    node tools/test_audio_bus.js                      # nothing bypasses the master audio bus
    node tools/test_render_pixels.js <ref-checkout>   # render output unchanged vs a reference
    node tools/test_lazy_boot.js    [ref-checkout]    # nothing heavy blocks the parser
    node tools/test_presentation.js                   # story surface behaves the same way everywhere
    node tools/test_presentation_regress.js           # the 2.0.3 fixes didn't break what worked

`test_presentation.js` covers the four things that were inconsistent before
2.0.3: scene-art routing is identical across all eight languages, `CHAR_COLOR()`
and `speakerOf()` agree on untagged dialogue, the speaker plate retires for
anything that isn't a named speaker line, a scene change retires the character
figure, and all three save/load boxes share one geometry for every legal
checkpoint value. Run both if you touch `section()`, `engine/story-art.js`,
`engine/voice.js`, `setDlgName()`, or any of the ASCII boxes.

`test_render_pixels.js` and `test_lazy_boot.js` need `npm install` (playwright)
and a Chromium binary; override
its location with `CHROME_PATH=...` if the default doesn't match your setup.
The `<ref-checkout>` argument is the path to an unpacked copy of the previous
release, e.g. `node tools/test_render_pixels.js ../cliveman-2.0.1`.

**Run `test_render_pixels.js` before shipping ANY change to
`engine/raycaster.js` or `engine/minimap.js`.** It sweeps grids x themes x
angles on both the mobile and desktop code paths and hashes the framebuffer, so
an "obviously equivalent" refactor that quietly shifts a pixel gets caught. It
seeds `Math.random` first, because wall and floor textures are generated with
random grain and an unseeded RNG makes every frame differ for reasons unrelated
to your change.

---

# tools/gen_voices.py — offline voice-line generator

One-time batch tool. Downloads real audio for every in-game dialogue line
using the **free** Google Gemini TTS API, then the game plays local files —
**no live TTS at runtime**.

## Run

Python 3, stdlib only (no pip installs). From the project root:

    python3 tools/gen_voices.py --dry-run                 # list every line, writes lines.json
    GEMINI_API_KEY=xxxx python3 tools/gen_voices.py --limit 3   # test a few
    GEMINI_API_KEY=xxxx python3 tools/gen_voices.py            # generate all

Windows PowerShell:

    $env:GEMINI_API_KEY="xxxx"
    python tools\gen_voices.py --limit 3

Free key: https://aistudio.google.com/apikey (Google account, no card).

## Output (all under assets/voice/)

- `<character>/<key>.wav` — one file per unique line (24 kHz mono WAV)
- `manifest.json` — key -> file, per generated line
- `lines.json` — the COMPLETE dialogue document (written every run, even
  --dry-run): char, text, key, source file, and `inner` flag. Your audit trail.

`key = sha1(char + "\n" + cleanForSpeech(text))[:12]`, mirrored from
engine/voice.js so runtime playback can compute the same key.

## Notes

- Free tier has a daily cap. Re-run over a few days; finished files are
  skipped, so it resumes automatically.
- Voices are FIXED per character in the CAST table in the script. Never edit
  a character's voice after shipping lines (or regenerate their whole folder
  with `--char X --force`) so old and new audio match.
- Useful flags: `--char cliveman`, `--limit N`, `--rpm 3`, `--ogg`,
  `--include-unknown`, `--force`.
