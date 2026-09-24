// Renders three reference notes — the triangle lead, the bowed strings and the
// sine bass — through WebAudio offline, with the voice graphs copied from
// engine/music-classical.js. scripts/audio/synth.gd has to match this, and
// tools/music_ref.tscn renders the same three notes from the port for
// comparison.
//
//   node godot-port/tools/render_music_ref.js   ->  /tmp .../music_ref_html.wav
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '..', '..', 'node_modules', 'playwright'));

const OUT = process.argv[2] || path.resolve(__dirname, 'music_ref_html.wav');
const SECONDS = 5;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8765/index.html');
  const pcm = await page.evaluate(async (SECONDS) => {
    const ctx = new OfflineAudioContext(1, 44100 * SECONDS, 44100);
    const musicBus = ctx.createGain(); musicBus.gain.value = 0.9; musicBus.connect(ctx.destination);
    // ---- verbatim from engine/music-classical.js ----
    function noteTri(freq, t, dur, level, send) {
      var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = "triangle"; o.frequency.value = freq;
      f.type = "lowpass"; f.frequency.value = 2200;
      var atk = 0.02, rel = Math.min(0.35, dur * 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level, t + atk);
      g.gain.setValueAtTime(level, t + Math.max(atk, dur - rel));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(musicBus);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function noteStr(freq, t, dur, level, send) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 1500; f.Q.value = 0.6;
      var atk = Math.min(0.18, dur * 0.35), rel = Math.min(0.6, dur * 0.45);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level, t + atk);
      g.gain.setValueAtTime(level, t + Math.max(atk, dur - rel));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
      f.connect(g); g.connect(musicBus);
      var lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      lfo.frequency.value = 5.2; lfoG.gain.setValueAtTime(0, t);
      lfoG.gain.linearRampToValueAtTime(freq * 0.004, t + Math.min(0.4, dur * 0.5));
      lfo.connect(lfoG);
      for (var i = 0; i < 2; i++) {
        var o = ctx.createOscillator();
        o.type = "sawtooth"; o.frequency.value = freq * (i ? 1.0025 : 0.9975);
        lfoG.connect(o.frequency);
        o.connect(f); o.start(t); o.stop(t + dur + 0.1);
      }
      lfo.start(t); lfo.stop(t + dur + 0.1);
    }
    function bassNote(freq, t, dur) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(musicBus);
      o.start(t); o.stop(t + dur + 0.05);
    }
    // ---- end verbatim ----
    noteTri(440, 0.2, 1.0, 0.13, false);
    noteStr(330, 1.6, 1.2, 0.117, false);
    bassNote(110, 3.2, 1.2);
    const buf = await ctx.startRendering();
    return Array.from(buf.getChannelData(0));
  }, SECONDS);
  await browser.close();

  // 16-bit mono WAV
  const n = pcm.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(44100, 24); buf.writeUInt32LE(88200, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, pcm[i])) * 32767 | 0, 44 + i * 2);
  fs.writeFileSync(OUT, buf);
  console.log('wrote', OUT, (n / 44100).toFixed(1) + 's');
})();
