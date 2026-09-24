// Renders the night drive's canvas textures with the routines in
// minigame/clivesbuick.js: the ASCII facades (its own glyph set and cell size,
// not the title flyover's), the asphalt strip, and the smoke and taillight
// sprites. The skyline ring and shop signs use the same routines as the
// flyover, so those come from tools/render_title_textures.js.
//
//   python -m http.server 8765   (from the repository root)
//   node godot-port/tools/render_drive_textures.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '..', '..', 'node_modules', 'playwright'));

const OUT = path.resolve(__dirname, '..', 'assets', 'images', 'drive');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(1000);
  const files = await page.evaluate(() => {
    const out = {};
    const put = (name, cv) => { out[name] = cv.toDataURL('image/png'); };

    // ---- verbatim from minigame/clivesbuick.js (desktop branch) ----
    const GLYPHS = '.:-=+*#%@';
    function facadeTex(h) {
      const cols = 12, rows = Math.max(6, Math.round(h / 3));
      const cw = 16, ch = 22;
      const c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
      const g = c.getContext('2d');
      g.fillStyle = '#070a10'; g.fillRect(0, 0, c.width, c.height);
      g.font = `${ch - 4}px 'Courier New', monospace`;
      g.textBaseline = 'top';
      for (let r = 0; r < rows; r++) {
        const litRow = Math.random() < 0.62;
        for (let cc = 0; cc < cols; cc++) {
          const lit = litRow && Math.random() < 0.7;
          if (lit) {
            const amber = Math.random() < 0.22;
            const v = 150 + (Math.random() * 105 | 0);
            g.fillStyle = amber ? `rgb(${v},${(v * 0.66) | 0},70)` : `rgb(${(v * 0.7) | 0},${v},${(v * 0.9) | 0})`;
            g.fillText('#%@'[Math.random() * 3 | 0], cc * cw + 2, r * ch + 1);
          } else {
            g.fillStyle = '#10161f';
            g.fillText(GLYPHS[Math.random() * 5 | 0], cc * cw + 2, r * ch + 1);
          }
        }
      }
      return c;
    }
    function roadTex() {
      const c = document.createElement('canvas'); c.width = 64; c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = '#15181d'; g.fillRect(0, 0, 64, 128);
      g.fillStyle = '#0e1116';
      g.fillRect(0, 0, 5, 128); g.fillRect(59, 0, 5, 128);
      g.fillStyle = '#c9a24a';
      for (let y = 8; y < 128; y += 34) g.fillRect(30, y, 4, 18);
      return c;
    }
    function smokeTex() {
      const sc = document.createElement('canvas'); sc.width = sc.height = 32;
      const sg = sc.getContext('2d');
      const grd = sg.createRadialGradient(16, 16, 0, 16, 16, 16);
      grd.addColorStop(0, 'rgba(205,205,210,0.85)');
      grd.addColorStop(0.5, 'rgba(150,150,158,0.45)');
      grd.addColorStop(1, 'rgba(120,120,130,0)');
      sg.fillStyle = grd; sg.fillRect(0, 0, 32, 32);
      return sc;
    }
    function tailTex() {
      const tc = document.createElement('canvas'); tc.width = tc.height = 32;
      const tg = tc.getContext('2d');
      const grd = tg.createRadialGradient(16, 16, 0, 16, 16, 16);
      grd.addColorStop(0, 'rgba(255,70,45,0.95)');
      grd.addColorStop(0.4, 'rgba(255,30,20,0.5)');
      grd.addColorStop(1, 'rgba(255,0,0,0)');
      tg.fillStyle = grd; tg.fillRect(0, 0, 32, 32);
      return tc;
    }
    // ---- end verbatim ----

    // the drive builds its pool as facadeTex(24 + fi*3), fi = 0..15
    for (let fi = 0; fi < 16; fi++) put('facade_' + String(fi).padStart(2, '0'), facadeTex(24 + fi * 3));
    put('road', roadTex());
    put('smoke', smokeTex());
    put('taillight', tailTex());
    return out;
  });

  for (const [name, url] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('wrote', Object.keys(files).length, 'textures to', OUT);
  await browser.close();
})();
