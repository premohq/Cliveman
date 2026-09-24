// The drive minigame's car is a Draco-compressed, quantized GLB inlined in
// minigame/clivesbuick.js. Godot's glTF importer reads neither, so this decodes
// every Draco primitive with the decoder the bundle itself ships
// (minigame/vendor/draco/decoder-src.js) and writes a plain GLB.
//
//   node godot-port/tools/decode_car_glb.js
//     -> godot-port/assets/models/crown_vic.glb
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..', 'assets', 'models', 'crown_vic.glb');

function readModelB64() {
  const src = fs.readFileSync(path.join(ROOT, 'minigame', 'clivesbuick.js'), 'utf8');
  const m = /MODEL_B64\s*=\s*"([^"]+)"/.exec(src);
  if (!m) throw new Error('MODEL_B64 not found');
  return Buffer.from(m[1], 'base64');
}

function parseGLB(buf) {
  const total = buf.readUInt32LE(8);
  let off = 12, json = null, bin = null;
  while (off < total) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const chunk = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    else if (type === 0x004e4942) bin = Buffer.from(chunk);
    off += 8 + len + ((4 - (len % 4)) % 4) * 0;
    off += (4 - (len % 4)) % 4;
  }
  return { json, bin };
}

function loadDraco() {
  // decoder-src.js is an ES module exporting the emscripten decoder source.
  const src = fs.readFileSync(path.join(ROOT, 'minigame', 'vendor', 'draco', 'decoder-src.js'), 'utf8');
  const body = src.replace(/^export\s+default\s+/m, 'module.exports = ');
  const mod = { exports: {} };
  vm.runInNewContext(body, { module: mod, exports: mod.exports, console });
  const decoderSrc = mod.exports;
  const sandbox = { self: {}, console, TextDecoder, TextEncoder, performance, Date, Math, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(decoderSrc, sandbox);
  const factory = sandbox.DracoDecoderModule || sandbox.self.DracoDecoderModule;
  if (!factory) throw new Error('DracoDecoderModule not found in decoder-src.js');
  return new Promise((resolve) => { factory({ onModuleLoaded: resolve }).then ? factory({}).then(resolve) : factory({ onModuleLoaded: resolve }); });
}

const COMPONENT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NUMCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

(async () => {
  const glb = parseGLB(readModelB64());
  const json = glb.json;
  const draco = await loadDraco();
  const decoderModule = draco;
  const decoder = new decoderModule.Decoder();

  const outChunks = [];   // {buf} appended to the new BIN
  let outLen = 0;
  const addBuffer = (typed) => {
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const pad = (4 - (outLen % 4)) % 4;
    if (pad) { outChunks.push(Buffer.alloc(pad)); outLen += pad; }
    const off = outLen;
    outChunks.push(bytes); outLen += bytes.length;
    json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: bytes.length });
    return json.bufferViews.length - 1;
  };
  const addAccessor = (typed, componentType, type, count, extra = {}) => {
    const view = addBuffer(typed);
    json.accessors.push(Object.assign({ bufferView: view, componentType, count, type }, extra));
    return json.accessors.length - 1;
  };

  let decoded = 0;
  for (const mesh of json.meshes) {
    for (const prim of mesh.primitives) {
      const ext = prim.extensions && prim.extensions.KHR_draco_mesh_compression;
      if (!ext) continue;
      const bv = json.bufferViews[ext.bufferView];
      const src = glb.bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
      const buffer = new decoderModule.DecoderBuffer();
      buffer.Init(new Int8Array(src), src.length);
      const dmesh = new decoderModule.Mesh();
      const status = decoder.DecodeBufferToMesh(buffer, dmesh);
      if (!status.ok()) throw new Error('draco decode failed: ' + status.error_msg());

      // indices
      const numFaces = dmesh.num_faces();
      const numIndices = numFaces * 3;
      const idxPtr = decoderModule._malloc(numIndices * 4);
      decoder.GetTrianglesUInt32Array(dmesh, numIndices * 4, idxPtr);
      const idx = new Uint32Array(decoderModule.HEAPU32.buffer, idxPtr, numIndices).slice();
      decoderModule._free(idxPtr);
      const maxIdx = idx.reduce((a, b) => Math.max(a, b), 0);
      const indices = maxIdx < 65536 ? Uint16Array.from(idx) : idx;
      prim.indices = addAccessor(indices, maxIdx < 65536 ? 5123 : 5125, 'SCALAR', indices.length);

      // attributes: float them all, so nothing stays quantized. Draco hands
      // back the stored integers, and glTF's `normalized` accessors mean those
      // are fractions of the type's range (the node scale then sizes the
      // model), so undo that here or the car comes out 32767x too big.
      const NORM_DIV = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };
      for (const [name, id] of Object.entries(ext.attributes)) {
        const oldAcc = json.accessors[prim.attributes[name]];
        const div = (oldAcc && oldAcc.normalized) ? (NORM_DIV[oldAcc.componentType] || 1) : 1;
        const attr = decoder.GetAttributeByUniqueId(dmesh, id);
        const comps = attr.num_components();
        const numPoints = dmesh.num_points();
        const count = numPoints * comps;
        const ptr = decoderModule._malloc(count * 4);
        decoder.GetAttributeDataArrayForAllPoints(dmesh, attr, decoderModule.DT_FLOAT32, count * 4, ptr);
        const values = new Float32Array(decoderModule.HEAPF32.buffer, ptr, count).slice();
        decoderModule._free(ptr);
        if (div !== 1) for (let i = 0; i < values.length; i++) values[i] = Math.max(-1, values[i] / div);
        const type = ['SCALAR', 'SCALAR', 'VEC2', 'VEC3', 'VEC4'][comps];
        const extra = {};
        if (name === 'POSITION') {
          const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
          for (let i = 0; i < values.length; i += 3) {
            for (let c = 0; c < 3; c++) {
              if (values[i + c] < min[c]) min[c] = values[i + c];
              if (values[i + c] > max[c]) max[c] = values[i + c];
            }
          }
          extra.min = min; extra.max = max;
        }
        prim.attributes[name] = addAccessor(values, 5126, type, numPoints, extra);
      }
      decoderModule.destroy(dmesh);
      decoderModule.destroy(buffer);
      delete prim.extensions.KHR_draco_mesh_compression;
      if (!Object.keys(prim.extensions).length) delete prim.extensions;
      decoded++;
    }
  }

  // Everything that survives now points at the new, plain buffer.
  json.buffers = [{ byteLength: outLen }];
  json.extensionsUsed = (json.extensionsUsed || []).filter(e => e !== 'KHR_draco_mesh_compression' && e !== 'KHR_mesh_quantization');
  delete json.extensionsRequired;
  // drop the accessors/bufferViews of the old compressed data by rewriting the
  // arrays to just what is referenced
  const keepAcc = new Set();
  for (const mesh of json.meshes) for (const p of mesh.primitives) {
    if (p.indices != null) keepAcc.add(p.indices);
    for (const a of Object.values(p.attributes)) keepAcc.add(a);
  }
  const accMap = new Map();
  const newAcc = [];
  const newViews = [];
  for (const i of [...keepAcc].sort((a, b) => a - b)) {
    const acc = json.accessors[i];
    const bv = json.bufferViews[acc.bufferView];
    accMap.set(i, newAcc.length);
    newViews.push(bv);
    newAcc.push(Object.assign({}, acc, { bufferView: newViews.length - 1 }));
  }
  for (const mesh of json.meshes) for (const p of mesh.primitives) {
    if (p.indices != null) p.indices = accMap.get(p.indices);
    for (const k of Object.keys(p.attributes)) p.attributes[k] = accMap.get(p.attributes[k]);
  }
  json.accessors = newAcc;
  json.bufferViews = newViews;

  const bin = Buffer.concat(outChunks);
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20);
  const binPad = Buffer.alloc((4 - (bin.length % 4)) % 4, 0);
  const total = 12 + 8 + jsonBuf.length + jsonPad.length + 8 + bin.length + binPad.length;
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  const jHead = Buffer.alloc(8);
  jHead.writeUInt32LE(jsonBuf.length + jsonPad.length, 0); jHead.writeUInt32LE(0x4e4f534a, 4);
  const bHead = Buffer.alloc(8);
  bHead.writeUInt32LE(bin.length + binPad.length, 0); bHead.writeUInt32LE(0x004e4942, 4);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.concat([head, jHead, jsonBuf, jsonPad, bHead, bin, binPad]));
  console.log('decoded', decoded, 'primitives ->', OUT, (total / 1024 | 0) + ' KiB');
})();
