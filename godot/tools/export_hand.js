// Exports CMHAND's first-person arm from engine/handmodel.js exactly as
// CMHAND.build() prepares it: reframe rotation and scale about the centroid,
// rotated normals and breathing deltas, and the far-to-near presorted index
// buffer the depth-test-free material relies on. Plus the skin texture.
//   node godot-port/tools/export_hand.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'engine', 'handmodel.js'), 'utf8');
const win = {};
new Function('window', src)(win);
const H = win.CMHAND;

// GEO is private to the IIFE; lift it by re-evaluating the literal.
const geoStart = src.indexOf('var GEO=');
const geoEnd = src.indexOf('};', geoStart) + 2;
const GEO = new Function(src.slice(geoStart, geoEnd) + '; return GEO;')();
const uriStart = src.indexOf('var TEX_URI="') + 'var TEX_URI="'.length;
const uri = src.slice(uriStart, src.indexOf('"', uriStart));

const m = H.tune, s = m.scale;
const srcP = GEO.p;
let cx = 0, cy = 0, cz = 0; const nv = srcP.length / 3;
for (let k = 0; k < srcP.length; k += 3) { cx += srcP[k]; cy += srcP[k + 1]; cz += srcP[k + 2]; }
cx /= nv; cy /= nv; cz /= nv;
const rx = m.rotX * Math.PI / 180, ry = m.rotY * Math.PI / 180;
const cp = Math.cos(rx), sp = Math.sin(rx), cw = Math.cos(ry), sw = Math.sin(ry);
function rot3(x, y, z) { const x2 = x * cw + z * sw, z2 = -x * sw + z * cw; return [x2, y * cp - z2 * sp, y * sp + z2 * cp]; }
const pos = [], del = [], nrm = [];
for (let k = 0; k < srcP.length; k += 3) {
  const t = rot3(srcP[k] - cx, srcP[k + 1] - cy, srcP[k + 2] - cz);
  pos.push(t[0] * s + cx + m.dx, t[1] * s + cy + m.dy, t[2] * s + cz + m.dz);
  const d = rot3(GEO.d[k], GEO.d[k + 1], GEO.d[k + 2]);
  del.push(d[0] * s, d[1] * s, d[2] * s);
  const n = rot3(GEO.n[k], GEO.n[k + 1], GEO.n[k + 2]);
  nrm.push(n[0], n[1], n[2]);
}
const tris = [];
for (let k = 0; k < GEO.i.length; k += 3) {
  const za = pos[GEO.i[k] * 3 + 2], zb = pos[GEO.i[k + 1] * 3 + 2], zc = pos[GEO.i[k + 2] * 3 + 2];
  tris.push([(za + zb + zc) / 3, GEO.i[k], GEO.i[k + 1], GEO.i[k + 2]]);
}
tris.sort((a, b) => a[0] - b[0]);
const idx = [];
for (const t of tris) idx.push(t[1], t[2], t[3]);

const out = { pos, del, nrm, uv: GEO.u, idx, anchorX: cx + m.dx, tune: m };
fs.writeFileSync(path.resolve(__dirname, '..', 'data', 'hand.json'), JSON.stringify(out));
fs.writeFileSync(path.resolve(__dirname, '..', 'assets', 'models', 'hand_skin.png'), Buffer.from(uri.split(',')[1], 'base64'));
console.log('verts', nv, 'tris', idx.length / 3, 'anchorX', out.anchorX);
