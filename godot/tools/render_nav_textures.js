// Renders every procedural texture the browser build's nav mode uses, with the
// original canvas routines in engine/raycaster.js and engine/nav3d.js, so the
// port's rooms are painted by exactly the same code. The routines draw with
// Math.random(), and so differ on every page load in the browser too; one
// render is as faithful as any.
//
//   python -m http.server 8765   (from the repository root)
//   node godot-port/tools/render_nav_textures.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '..', '..', 'node_modules', 'playwright'));

const OUT = path.resolve(__dirname, '..', 'assets', 'images', 'nav');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(1500);
  const files = await page.evaluate(() => {
    const out = {};
    const put = (name, cv) => {
      if (typeof ImageData !== 'undefined' && cv instanceof ImageData) {
        const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
        c.getContext('2d').putImageData(cv, 0, 0); cv = c;
      }
      out[name] = (cv.canvas || cv).toDataURL('image/png');
    };
    const safe = s => String(s).replace(/[^a-zA-Z0-9]+/g, '');
    for (const [theme, th] of Object.entries(RC_THEMES)) {
      for (let v = 0; v < 4; v++) {
        put(`wall_${th.wallTex}_${safe(th.wallN)}_v${v}`, getWallTex(th.wallTex, th.wallN, v));
        put(`wall_${th.wallTex}_${safe(th.wallE)}_v${v}`, getWallTex(th.wallTex, th.wallE, v));
      }
      put(`floor_${th.floorTex}_${safe(th.floor1)}_${safe(th.floor2)}`, getFloorTex(th.floorTex, th.floor1, th.floor2));
      put(`ceil_${th.ceilTex}_${safe(th.ceil)}`, getCeilTex(th.ceilTex, th.ceil));
      for (const label of ['', '201', '202', '203', '204', '205', '206', 'EXIT']) {
        put(`door_${safe(th.wallN)}_${label || 'none'}`, getDoorTex(th.wallN, label));
      }
      put(`stair_${safe(th.wallN)}_u`, getStairTex(th.wallN, 'up'));
      put(`stair_${safe(th.wallN)}_d`, getStairTex(th.wallN, 'down'));
    }
    // nav3d.js spriteTex(artKey): 10 px per bitmap cell
    for (const [key, S] of Object.entries(ITEM_SPR)) {
      const R = S.r.length, C = S.r[0].length, sc = 10;
      const cv = document.createElement('canvas'); cv.width = C * sc; cv.height = R * sc;
      const ctx = cv.getContext('2d');
      for (let r = 0; r < R; r++) { const row = S.r[r]; for (let c = 0; c < C; c++) { const col = S.p[row[c]]; if (!col) continue; ctx.fillStyle = col; ctx.fillRect(c * sc, r * sc, sc, sc); } }
      put(`spr_${key}`, cv);
    }
    // nav3d.js personTex(color)
    const colors = new Set();
    for (const g of Object.values(FP_GLYPH)) if (g && g.person) colors.add(g.color || '#7fdf7f');
    for (const color of colors) {
      const W = 48, H = 96, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
      x.fillStyle = color;
      x.beginPath(); x.arc(W / 2, H * 0.16, H * 0.11, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(W * 0.30, H * 0.30); x.lineTo(W * 0.70, H * 0.30); x.lineTo(W * 0.62, H * 0.66); x.lineTo(W * 0.38, H * 0.66); x.closePath(); x.fill();
      x.fillRect(W * 0.22, H * 0.30, W * 0.08, H * 0.34); x.fillRect(W * 0.70, H * 0.30, W * 0.08, H * 0.34);
      x.fillRect(W * 0.38, H * 0.66, W * 0.10, H * 0.32); x.fillRect(W * 0.52, H * 0.66, W * 0.10, H * 0.32);
      put(`person_${safe(color)}`, cv);
    }
    // nav3d.js glyphTex(g) for every glyph
    for (const [sym, g] of Object.entries(FP_GLYPH)) {
      if (!g) continue;
      const W = 96, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = g.color; x.shadowBlur = 10;
      x.fillStyle = g.color; x.font = 'bold 58px monospace';
      x.fillText(g.ch, W / 2, H * 0.38);
      if (g.label) { x.shadowBlur = 4; x.fillStyle = '#ffb000'; x.font = '16px monospace'; x.fillText('[' + g.label + ']', W / 2, H * 0.78); }
      put(`glyph_${sym.charCodeAt(0)}`, cv);
    }
    return out;
  });
  for (const [name, url] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('wrote', Object.keys(files).length, 'textures');
  await browser.close();
})();
