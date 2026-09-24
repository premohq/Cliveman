// Renders the browser build's CSS/SVG art that Godot cannot draw natively, in
// headless Chrome, so the port shows exactly what the browser shows:
//
//   - the title wordmark with its pulsing drop-shadow glow (.logo-canvas and
//     @keyframes logoPulse), at three points of the pulse
//   - the wordmark as intro scene art (STORYART.raw, no glow)
//   - the two CHAR_ART_DEFS figures (engine/transitions.js) with their SVG glow
//     filter, scanline pattern and the .story-char drop-shadow
//
//   node godot-port/tools/render_ui_art.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '..', '..', 'node_modules', 'playwright'));

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_IMG = path.resolve(__dirname, '..', 'assets', 'images');

function charArtDefs() {
  // Evaluate the CHAR_ART_DEFS IIFE from transitions.js without a DOM.
  const src = fs.readFileSync(path.join(ROOT, 'engine', 'transitions.js'), 'utf8');
  const start = src.indexOf('var CHAR_ART_DEFS');
  const end = src.indexOf('/* Append a character figure');
  const code = src.slice(start, end) + '; module.exports = CHAR_ART_DEFS;';
  const m = { exports: {} };
  new Function('module', code)(m);
  return m.exports;
}

(async () => {
  const defs = charArtDefs();
  const logoB64 = fs.readFileSync(path.join(ROOT, 'assets', 'cliveman-logo.png')).toString('base64');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // ── title logo glow frames ──
  const page = await browser.newPage({ viewport: { width: 800, height: 400 }, deviceScaleFactor: 1 });
  const frames = {
    0: 'drop-shadow(0 0 8px rgba(84,255,138,.34)) drop-shadow(0 0 22px rgba(84,255,138,.13))',
    25: 'drop-shadow(0 0 10.5px rgba(84,255,138,.46)) drop-shadow(0 0 26px rgba(84,255,138,.19))',
    50: 'drop-shadow(0 0 13px rgba(84,255,138,.58)) drop-shadow(0 0 30px rgba(84,255,138,.25))',
  };
  for (const [k, filter] of Object.entries(frames)) {
    await page.setContent(`<html><body style="margin:0;background:transparent">
      <div id="w" style="padding:80px;display:inline-block">
        <img src="data:image/png;base64,${logoB64}" style="width:540px;height:auto;display:block;filter:${filter}">
      </div></body></html>`);
    await page.waitForTimeout(200);
    const el = await page.$('#w');
    await el.screenshot({ path: path.join(OUT_IMG, `logo_title_${k}.png`), omitBackground: true });
    console.log('logo frame', k);
  }

  // ── intro scene art: the logo as an 812x308.6 <svg> box (meet) ──
  await page.setContent(`<html><body style="margin:0;background:transparent">
    <div id="w" style="display:inline-block;line-height:0">
      <img src="data:image/png;base64,${logoB64}" style="width:812px;height:auto;display:block">
    </div></body></html>`);
  await page.waitForTimeout(200);
  await (await page.$('#w')).screenshot({ path: path.join(OUT_IMG, 'logo_scene.png'), omitBackground: true });

  // ── character figures, rendered at 2x for crispness ──
  const p2 = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
  fs.mkdirSync(path.join(OUT_IMG, 'characters'), { recursive: true });
  for (const kind of ['shoot', 'bevan']) {
    await p2.setContent(`<html><body style="margin:0;background:transparent">
      <div id="w" style="padding:48px;display:inline-block;line-height:0">
        <div style="filter:drop-shadow(0 0 22px rgba(80,255,140,.25))">
          <div style="height:216px;width:auto;display:block">${defs[kind].replace('class="char-svg"', 'class="char-svg" style="height:216px;width:auto;display:block"')}</div>
        </div>
      </div></body></html>`);
    await p2.waitForTimeout(200);
    await (await p2.$('#w')).screenshot({ path: path.join(OUT_IMG, 'characters', `${kind}.png`), omitBackground: true });
    console.log('figure', kind);
  }
  await browser.close();
})();
