// Renders the browser build's procedural sound effects to WAV, using the
// original WebAudio graphs in an OfflineAudioContext inside headless Chrome.
// The synthesis code below is copied from engine/audio.js and
// engine/transitions.js; only the output node changes (ctx.destination).
//
//   node godot-port/tools/render_audio.js
//
// Needs the playwright package from the parent directory's node_modules and a
// local Chrome.
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '..', '..', 'node_modules', 'playwright'));

const OUT = path.resolve(__dirname, '..', 'assets', 'audio', 'sfx');
fs.mkdirSync(OUT, { recursive: true });

const RENDERS = String.raw`
const SR = 44100;
function wav(buf) {
  const ch = buf.getChannelData(0), n = ch.length;
  const ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, ch[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  let bin = ''; const u8 = new Uint8Array(ab);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function render(seconds, build) {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * SR), SR);
  build(ctx, ctx.destination);
  return wav(await ctx.startRendering());
}
// engine/audio.js beep(), without the random +/-20 Hz (applied at play time)
function beep(ctx, out, freq, dur, vol, type, at) {
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type || 'square';
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain); gain.connect(out);
  const t = at || 0;
  osc.start(t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.stop(t + dur + 0.01);
}
// engine/audio.js stings
function osc(c,bus,type,freq,t0,t1,peak,opts){
  opts=opts||{};
  var o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t0);
  if(opts.glideTo)o.frequency.exponentialRampToValueAtTime(opts.glideTo,opts.glideAt||t1);
  if(opts.detune&&o.detune)o.detune.value=opts.detune;
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(peak,t0+(opts.attack||0.01));
  g.gain.exponentialRampToValueAtTime(0.0001,t1);
  o.connect(g);g.connect(bus);
  o.start(t0);o.stop(t1+0.02);
}
function noise(c,bus,t0,t1,peak,filterType,f0,f1){
  var len=Math.max(1,Math.ceil((t1-t0)*c.sampleRate));
  var buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
  for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
  var src=c.createBufferSource();src.buffer=buf;
  var flt=c.createBiquadFilter();flt.type=filterType||'bandpass';
  flt.frequency.setValueAtTime(f0||800,t0);
  if(f1)flt.frequency.exponentialRampToValueAtTime(f1,t1);
  var g=c.createGain();
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(peak,t0+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,t1);
  src.connect(flt);flt.connect(g);g.connect(bus);
  src.start(t0);src.stop(t1+0.02);
}
function knock(c,bus,t0){
  osc(c,bus,'sine',185,t0,t0+0.14,0.16,{glideTo:68,glideAt:t0+0.09,attack:0.004});
  noise(c,bus,t0,t0+0.045,0.06,'highpass',1400,0);
}
var SYNTH={
  hit:function(c,bus,t){
    var flt=c.createBiquadFilter();flt.type='lowpass';
    flt.frequency.setValueAtTime(1000,t);
    flt.frequency.exponentialRampToValueAtTime(320,t+1.1);
    flt.connect(bus);
    var chord=[55,110,130.8,164.8];
    for(var i=0;i<chord.length;i++){
      osc(c,flt,'sawtooth',chord[i],t,t+1.15,0.05,{glideTo:chord[i]*0.965,glideAt:t+1.1,attack:0.008,detune:(i%2?6:-6)});
    }
    osc(c,bus,'sine',72,t,t+0.22,0.14,{glideTo:48,glideAt:t+0.16,attack:0.004});
  },
  dread:function(c,bus,t){
    osc(c,bus,'sine',62,t,t+2.3,0.12,{glideTo:37,glideAt:t+2.1,attack:0.35});
    osc(c,bus,'sine',220,t+0.3,t+2.0,0.028,{attack:0.6});
    osc(c,bus,'sine',233,t+0.3,t+2.0,0.028,{attack:0.6});
    noise(c,bus,t,t+2.2,0.02,'lowpass',260,120);
  },
  riser:function(c,bus,t){
    var flt=c.createBiquadFilter();flt.type='lowpass';
    flt.frequency.setValueAtTime(320,t);
    flt.frequency.exponentialRampToValueAtTime(2600,t+1.35);
    flt.connect(bus);
    osc(c,flt,'sawtooth',110,t,t+1.4,0.07,{glideTo:220,glideAt:t+1.35,attack:0.3});
    osc(c,flt,'sawtooth',110.9,t,t+1.4,0.05,{glideTo:222,glideAt:t+1.35,attack:0.3});
    noise(c,bus,t,t+1.4,0.045,'bandpass',400,3200);
    osc(c,bus,'sine',70,t+1.38,t+1.62,0.13,{glideTo:50,glideAt:t+1.55,attack:0.005});
  },
  resolve:function(c,bus,t){
    var a=[174.6,220,261.6],b=[130.8,164.8,196,261.6],i;
    for(i=0;i<a.length;i++)osc(c,bus,'triangle',a[i],t,t+0.95,0.04,{attack:0.06,detune:(i%2?5:-5)});
    for(i=0;i<b.length;i++)osc(c,bus,'triangle',b[i],t+0.65,t+2.3,0.04,{attack:0.09,detune:(i%2?-5:5)});
  },
  shimmer:function(c,bus,t){
    var g=c.createGain();g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.035,t+0.6);
    g.gain.exponentialRampToValueAtTime(0.0001,t+1.9);
    var lfo=c.createOscillator(),lg=c.createGain();
    lfo.type='sine';lfo.frequency.value=6;lg.gain.value=0.014;
    lfo.connect(lg);lg.connect(g.gain);lfo.start(t);lfo.stop(t+1.95);
    g.connect(bus);
    osc(c,g,'sine',392,t,t+1.9,0.9,{attack:0.4});
    osc(c,g,'sine',554.4,t,t+1.9,0.9,{attack:0.5});
  },
  gavel:function(c,bus,t){
    knock(c,bus,t);knock(c,bus,t+0.3);knock(c,bus,t+0.6);
    osc(c,bus,'sine',52,t+0.6,t+1.5,0.05,{attack:0.02});
  }
};
(async () => {
  const out = {};
  out.key = await render(0.05, (c, d) => beep(c, d, 1100, 0.018, 0.05, 'square'));
  out.char = await render(0.04, (c, d) => beep(c, d, 380, 0.012, 0.025, 'square'));
  out.move = await render(0.05, (c, d) => beep(c, d, 620, 0.025, 0.04, 'square'));
  out.engine = await render(0.15, (c, d) => beep(c, d, 155, 0.12, 0.05, 'sawtooth'));
  out.bump = await render(0.08, (c, d) => beep(c, d, 200, 0.05, 0.04, 'square'));
  out.turn_l = await render(0.07, (c, d) => beep(c, d, 440, 0.04, 0.03, 'square'));
  out.turn_r = await render(0.07, (c, d) => beep(c, d, 520, 0.04, 0.03, 'square'));
  for (let step = 0; step < 5; step++) {
    // transitions.js playStairStep(direction, step)
    out['stair_up_' + step] = await render(0.2, (c, d) => { const f = 280 + step * 60; beep(c, d, f, 0.1, 0.05, 'square', 0); beep(c, d, f + 200, 0.06, 0.03, 'sine', 0.05); });
    out['stair_dn_' + step] = await render(0.2, (c, d) => { const f = 520 - step * 60; beep(c, d, f, 0.1, 0.05, 'square', 0); beep(c, d, f + 200, 0.06, 0.03, 'sine', 0.05); });
  }
  // story/ch3.js spawnFirework(): a square blip then a saw 80 ms later
  out.firework_hi = await render(0.3, (c, d) => beep(c, d, 1080, 0.25, 0.06, 'square'));
  out.firework_lo = await render(0.55, (c, d) => beep(c, d, 220, 0.5, 0.04, 'sawtooth'));
  // transitions.js bevanDeathEffect() audio
  out.death = await render(2.0, (audioCtx, bus) => {
    const t = 0;
    [55, 58, 78].forEach(function (f) {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 1.6);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + 1.9);
    });
    const len = 0.4;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * len, audioCtx.sampleRate);
    const dd = buf.getChannelData(0);
    for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / dd.length);
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const ng = audioCtx.createGain(); ng.gain.value = 0.18;
    src.connect(ng); ng.connect(bus);
    src.start(t);
  });
  // story/ch3.js startStatic() hiss: a 2 s looping noise buffer at gain .12
  out.static = await render(2.0, (c, d) => {
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), o = nb.getChannelData(0);
    for (let i = 0; i < o.length; i++) o[i] = (Math.random() * 2 - 1) * 0.15;
    const s = c.createBufferSource(); s.buffer = nb; const g = c.createGain(); g.gain.value = 0.12;
    s.connect(g); g.connect(d); s.start();
  });
  for (const k of Object.keys(SYNTH)) {
    out['sting_' + k] = await render(2.5, (c, d) => SYNTH[k](c, d, 0.02));
  }
  return out;
})()
`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto('about:blank');
  const out = await page.evaluate(RENDERS);
  for (const [name, b64] of Object.entries(out)) {
    fs.writeFileSync(path.join(OUT, name + '.wav'), Buffer.from(b64, 'base64'));
    console.log('wrote', name + '.wav');
  }
  await browser.close();
})();
