// Renders the title flyover's canvas textures with the routines in
// engine/title-flyover.js, so the port's night city is painted by the same
// code: glyph facades, the street-grid ground, the distant skyline ring and
// the corner-store signs.
//
// The facade and skyline routines draw with Math.random(), so the browser
// itself differs on every page load; a pool is rendered here and the port
// draws from it the way the browser draws fresh ones.
//
//   python -m http.server 8765   (from the repository root)
//   node godot-port/tools/render_title_textures.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '..', '..', 'node_modules', 'playwright'));

const OUT = path.resolve(__dirname, '..', 'assets', 'images', 'title');
fs.mkdirSync(OUT, { recursive: true });

const FACADES = 20;   // the browser builds 5 per load, one per instanced batch
const SKYLINES = 4;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(1200);
  const files = await page.evaluate(({ FACADES, SKYLINES }) => {
    const out = {};
    const put = (name, cv) => { out[name] = cv.toDataURL('image/png'); };

    // ---- verbatim from engine/title-flyover.js ----
    const GLYPHS = '.:-=+*#%@';
    const PITCH = 34, ROAD = 12;
    function facadeTexture() {
      var cv = document.createElement('canvas'); cv.width = 96; cv.height = 192;
      var g = cv.getContext('2d');
      g.fillStyle = '#070a10'; g.fillRect(0, 0, 96, 192);
      g.font = '8px monospace'; g.textBaseline = 'top';
      for (var row = 0; row < 24; row++) {
        var rowLit = Math.random() < 0.62;
        for (var col = 0; col < 12; col++) {
          var ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          if (rowLit && Math.random() < 0.7) {
            var v = (140 + Math.random() * 100) | 0;
            g.fillStyle = (Math.random() < 0.22)
              ? 'rgb(' + v + ',' + ((v * 0.66) | 0) + ',70)'
              : 'rgb(' + ((v * 0.7) | 0) + ',' + v + ',' + ((v * 0.9) | 0) + ')';
          } else {
            g.fillStyle = '#10161f';
          }
          g.fillText(ch, col * 8, row * 8);
        }
      }
      return cv;
    }
    function groundTexture(spanG, HE) {
      var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024;
      var g = cv.getContext('2d');
      g.fillStyle = '#070a0f'; g.fillRect(0, 0, 1024, 1024);
      var px = function (w) { return (w + spanG / 2) / spanG * 1024; };
      var roadPx = Math.max(6, ROAD / spanG * 1024);
      g.fillStyle = '#15181d';
      for (var i = -HE; i <= HE + 1; i++) {
        var c = px((i - 0.5) * PITCH);
        g.fillRect(c - roadPx / 2, 0, roadPx, 1024);
        g.fillRect(0, c - roadPx / 2, 1024, roadPx);
      }
      var aveW = PITCH * 0.82 / spanG * 1024, ac = px(0);
      g.fillStyle = '#131720'; g.fillRect(ac - aveW / 2, 0, aveW, 1024);
      g.strokeStyle = '#2e3440'; g.lineWidth = Math.max(1, 2 / spanG * 1024);
      g.setLineDash([10, 14]);
      g.beginPath(); g.moveTo(ac, 0); g.lineTo(ac, 1024); g.stroke();
      return cv;
    }
    function skylineTexture() {
      var cv = document.createElement('canvas'); cv.width = 2048; cv.height = 256;
      var g = cv.getContext('2d'), x, w, h;
      for (x = 0; x < 2048;) {
        w = 24 + Math.random() * 56; h = 40 + Math.random() * 80;
        g.fillStyle = '#080c13'; g.fillRect(x, 256 - h, w, h);
        x += w - 6;
      }
      for (x = 0; x < 2048;) {
        w = 26 + Math.random() * 64; h = 56 + Math.random() * 120;
        g.fillStyle = '#0c111c'; g.fillRect(x, 256 - h, w, h);
        if (h > 130 && Math.random() < 0.5) {
          var sph = 18 + Math.random() * 30;
          g.fillStyle = '#0c111c'; g.fillRect(x + w / 2 - 1.5, 256 - h - sph, 3, sph);
          if (Math.random() < 0.6) { g.fillStyle = 'rgba(255,84,64,0.9)'; g.fillRect(x + w / 2 - 1, 256 - h - sph - 2, 2, 2); }
        }
        for (var wy = 256 - h + 6; wy < 248; wy += 9) {
          for (var wx = x + 4; wx < x + w - 4; wx += 7) {
            if (Math.random() < 0.06) {
              g.fillStyle = Math.random() < 0.25 ? 'rgba(200,150,70,0.55)' : 'rgba(120,190,160,0.5)';
              g.fillRect(wx, wy, 2, 3);
            }
          }
        }
        x += w - 4;
      }
      g.fillStyle = '#0c111c'; g.fillRect(0, 238, 2048, 18);
      return cv;
    }
    const NAMES = ['GROCERY', 'MARKET', 'DELI', 'LIQUOR', '24 HR MART', 'BODEGA', 'BIG SMILES', 'DINER'];
    const COLS = ['#57e88a', '#ffb84a', '#ff6a5a', '#7ad7ff'];
    function signTex(txt, col) {
      var c = document.createElement('canvas'); c.width = 256; c.height = 52;
      var g = c.getContext('2d');
      g.fillStyle = '#0a0d13'; g.fillRect(0, 0, 256, 52);
      g.strokeStyle = col; g.globalAlpha = 0.55; g.strokeRect(3, 3, 250, 46); g.globalAlpha = 1;
      g.font = 'bold 30px "Courier New", monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = col; g.shadowBlur = 12; g.fillStyle = col;
      g.fillText(txt, 128, 28); g.fillText(txt, 128, 28);
      return c;
    }
    // ---- end verbatim ----

    for (let i = 0; i < FACADES; i++) put('facade_' + String(i).padStart(2, '0'), facadeTexture());
    for (let i = 0; i < SKYLINES; i++) put('skyline_' + i, skylineTexture());
    const HE = 11, span = PITCH * (2 * HE + 1);
    put('ground', groundTexture(span + PITCH + 80, HE));
    const safe = s => s.replace(/[^A-Z0-9]+/g, '_');
    for (let n = 0; n < NAMES.length; n++) {
      for (let c = 0; c < COLS.length; c++) {
        put('sign_' + safe(NAMES[n]) + '_' + c, signTex(NAMES[n], COLS[c]));
      }
    }
    return out;
  }, { FACADES, SKYLINES });

  for (const [name, url] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('wrote', Object.keys(files).length, 'textures to', OUT);
  await browser.close();
})();
