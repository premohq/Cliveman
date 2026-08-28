/* ========================================================================
   CLIVEMAN  -  engine/audio.js
   WebAudio SFX engine + the bridge into the classical music engine.

   Exposes:
     ensureAudio()                  - lazily create / resume the AudioContext
     beep / playKeyClick / etc.     - UI sound effects
     setMuted(bool) / toggleMute()  - global mute (silences SFX + music)
     isMuted()                      - current mute state
     playMusic('trackName')         - start music for a scene mood
     stopMusic()                    - fade the current music out

   Music: the actual notes are performed by engine/music-classical.js
   (window.ClassicalMusic). The historical track names below survive as
   scene moods, mapped to that engine's 0..1 "tension" dial:
     'title'       - calm    (title screen)
     'investigate' - mid     (Ch.1 / Ch.2 investigation)
     'lonely'      - mid     (Pete's Subs scene)
     'descent'     - tense   (after Bevan dies, Ch.3)

   The Easter-egg credits song ships as assets/easteregg.mp3 and is wired
   into the #easterEggAudio element below; playFinaleEasterEgg() in
   story/ch3.js plays it.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

let audioCtx=null;
function ensureAudio(){
  if(!audioCtx){
    try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}
    catch(e){audioCtx=null;}
  }
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
}

/* ── Master bus ─────────────────────────────────────────────────
   Every sound the game makes - UI beeps, stings, transition hits, the
   classical music engine, the finale static, the drive minigame's engine
   drone - connects HERE rather than straight to audioCtx.destination.

   Before this existed each subsystem owned its own path to the speakers and
   agreed to honour mute purely by convention; two of them (the finale static
   and the Buick's engine) never got the memo, and the drive bundle spun up a
   SECOND AudioContext entirely. One node means one place to mute, one place
   to set volume, and no subsystem can quietly opt out of either.

   Cross-module access is via window.audioBus() - the drive bundle is a
   separate esbuild scope and can't see this file's locals. */
let _bus=null;
let _vol=1;
function audioBus(){
  if(!audioCtx)ensureAudio();
  if(!audioCtx)return null;
  if(!_bus||_bus.context!==audioCtx){
    try{
      _bus=audioCtx.createGain();
      _bus.gain.value=_muted?0.0001:Math.max(0.0001,_vol);
      _bus.connect(audioCtx.destination);
    }catch(e){_bus=null;}
  }
  return _bus;
}
/* Short exponential ramp rather than a hard cut: muting mid-chord used to
   clip. 80ms is inaudible as a fade but long enough to kill the click. */
function _busRamp(){
  if(!_bus||!audioCtx)return;
  try{
    var t=audioCtx.currentTime;
    var target=_muted?0.0001:Math.max(0.0001,_vol);
    _bus.gain.cancelScheduledValues(t);
    _bus.gain.setValueAtTime(Math.max(0.0001,_bus.gain.value),t);
    _bus.gain.exponentialRampToValueAtTime(target,t+0.08);
  }catch(e){}
}
function setVolume(v){
  _vol=Math.max(0,Math.min(1,typeof v==='number'?v:1));
  _busRamp();
  return _vol;
}
function getVolume(){return _vol;}

/* ── Global mute ─────────────────────────────────────────────────────────
   _muted gates every sound. SFX check it before playing; the classical
   music engine reads it live inside its scheduler loop, so a mute
   mid-piece falls silent within a fraction of a second. */
let _muted=false;
function isMuted(){return _muted;}
function setMuted(on){
  _muted=!!on;
  _busRamp();   /* catches anything already scheduled on the bus */
  if(window._onMuteChanged)try{window._onMuteChanged(_muted);}catch(e){}
}
function toggleMute(){setMuted(!_muted);return _muted;}

/* ── UI sound effects ── */
function beep(freq,dur,vol,type){
  if(!audioCtx||_muted)return;
  try{
    const osc=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    osc.type=type||'square';
    osc.frequency.value=freq+(Math.random()*40-20);
    gain.gain.value=vol;
    osc.connect(gain);gain.connect(audioBus()||audioCtx.destination);
    const t=audioCtx.currentTime;
    osc.start(t);
    gain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    osc.stop(t+dur+0.01);
    osc.onended=function(){try{osc.disconnect();gain.disconnect();}catch(e){}};
  }catch(e){}
}
function playKeyClick(){beep(1100,0.018,0.05,'square');}
let charCounter=0;
function playCharClick(ch){
  if(ch===' '||ch==='\n')return;
  charCounter++;
  if(charCounter%2!==0)return;
  beep(380,0.012,0.025,'square');
}
function playMoveBlip(){beep(620,0.025,0.04,'square');}
function playEngine(){beep(140+Math.random()*30,0.12,0.05,'sawtooth');}

/* ── playMusic / stopMusic ──
   Scene mood -> tension bridge into window.ClassicalMusic. Every call
   site in the story scripts still says playMusic('investigate') etc.,
   so nothing outside this file knows or cares which engine performs. */
let _music=null;       /* truthy while music is meant to be playing */
let _musicName=null;   /* current mood name, for the first-gesture kick */
var _MUSIC_TENSION={title:0.18, investigate:0.5, lonely:0.62, descent:0.92};
function playMusic(name){
  ensureAudio();
  _musicName=name; _music={stopped:false};   /* keep the first-gesture kick happy */
  if(window.ClassicalMusic){
    if(window.ClassicalMusic.setContext){ window.ClassicalMusic.setContext(name); }
    else { var ten=_MUSIC_TENSION[name]; if(ten==null)ten=0.4; window.ClassicalMusic.setTension(ten); }
    window.ClassicalMusic.start();
  }
}
function stopMusic(){
  _music=null; _musicName=null;
  if(window.ClassicalMusic)window.ClassicalMusic.stop();
}

/* ── back-compat shims ──
   Earlier code called startNoirMusic()/stopNoirMusic(). Keep those working
   so nothing else breaks; they now map onto the title mood. */
function startNoirMusic(){playMusic('title');}
function stopNoirMusic(){stopMusic();}

/* WebAudio needs a user gesture before it will produce sound. Music may be
   requested (e.g. the title track) before any click, so the context can
   still be suspended. This one-time listener resumes it on the first real
   interaction and re-arms whatever track is meant to be playing. */
(function(){
  function kick(){
    ensureAudio();
    if(_music&&_musicName&&audioCtx&&audioCtx.state==='running'){
      const name=_musicName;
      if(!_music.stopped){
        stopMusic();
        playMusic(name);
      }
    }
    window.removeEventListener('pointerdown',kick,true);
    window.removeEventListener('keydown',kick,true);
    window.removeEventListener('touchstart',kick,true);
  }
  window.addEventListener('pointerdown',kick,true);
  window.addEventListener('keydown',kick,true);
  window.addEventListener('touchstart',kick,true);
})();

/* ── Easter-egg credits audio ──
   The secret crew-credits song lives at assets/easteregg.mp3
   (64 kbps MPEG layer III, 44.1 kHz stereo). Wire it into the
   #easterEggAudio element; story/ch3.js -> playFinaleEasterEgg() plays it.
   The src is only a path - the browser doesn't fetch a byte of it until
   the egg is actually triggered. */
(function(){
  function wire(){
    var el = document.getElementById('easterEggAudio');
    if(el && !el.src){ el.src = 'assets/easteregg.mp3'; }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();

/* Cross-scope handles. window.audioBus is what stings / transitions / ch3 /
   the drive bundle reach for; CMAUDIO is the tidy front door. */
window.audioBus=audioBus;
window.CMAUDIO={
  ctx:function(){ensureAudio();return audioCtx;},
  bus:audioBus,
  setMuted:setMuted, isMuted:isMuted, toggleMute:toggleMute,
  setVolume:setVolume, getVolume:getVolume
};

/* ===== BEGIN former engine/stings.js ===== */
/* ============================================================================
   CLIVEMAN - engine/stings.js
   Context-aware audio stings: short (0.9-2.4s) procedural WebAudio accents
   that punctuate dramatic beats, the way the music director scores scenes
   and story-art illustrates them. section() consults CMSTING.hint(title)
   automatically; beats without a section() call CMSTING.play(kind) directly
   (trial, verdict, arrest, crime scene).

   API:
     CMSTING.hint(title) -> kind|null   keyword-match a section title
     CMSTING.play(kind)                 synthesize one sting (throttled)

   Kinds:
     hit     - noir sforzando stab (arrest, hard reveals)
     dread   - sub-bass slide + dissonant beating pair (nightmare, ruins,
               the cell door closing)
     riser   - filtered sweep up ending in a thump (chases, escapes)
     resolve - two warm triangle chords (the secret ending's sunrise)
     shimmer - quiet tritone tremolo (investigations, the docks)
     gavel   - three woody knocks (the court)

   Politeness: every sting checks audioCtx + isMuted() at play time and is
   a silent no-op without them; nothing here touches the ClassicalMusic
   hold/somber state - stings sit on top of whatever is playing, briefly.
   Throttle: >=2.5s between any two stings, >=8s between repeats of the
   same kind, and RESUMED checkpoint titles never sting.
   ========================================================================== */
(function(){
'use strict';
if(typeof window==='undefined')return;

var MIN_GAP=2.5, SAME_GAP=8;
var _lastAt=-1e9, _lastKind='', _lastKindAt=-1e9;

function _ctx(){
  var c=(typeof audioCtx!=='undefined')?audioCtx:null;
  if(!c)return null;
  if(typeof isMuted==='function'&&isMuted())return null;
  if(c.state&&c.state!=='running')return null;
  return c;
}

/* ── tiny synth helpers ── */
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
  o.onended=function(){try{o.disconnect();g.disconnect();}catch(e){}};
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
  src.onended=function(){try{src.disconnect();flt.disconnect();g.disconnect();}catch(e){}};
}
function knock(c,bus,t0){
  /* woody gavel strike: pitched thump + click transient */
  osc(c,bus,'sine',185,t0,t0+0.14,0.16,{glideTo:68,glideAt:t0+0.09,attack:0.004});
  noise(c,bus,t0,t0+0.045,0.06,'highpass',1400,0);
}

/* ── the stings ── */
var SYNTH={
  hit:function(c,bus,t){
    var flt=c.createBiquadFilter();flt.type='lowpass';
    flt.frequency.setValueAtTime(1000,t);
    flt.frequency.exponentialRampToValueAtTime(320,t+1.1);
    flt.connect(bus);
    var chord=[55,110,130.8,164.8];
    for(var i=0;i<chord.length;i++){
      osc(c,flt,'sawtooth',chord[i],t,t+1.15,0.05,
          {glideTo:chord[i]*0.965,glideAt:t+1.1,attack:0.008,detune:(i%2?6:-6)});
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
    /* gain LFO tremolo on a quiet tritone dyad */
    var g=c.createGain();g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.035,t+0.6);
    g.gain.exponentialRampToValueAtTime(0.0001,t+1.9);
    var lfo=c.createOscillator(),lg=c.createGain();
    lfo.type='sine';lfo.frequency.value=6;lg.gain.value=0.014;
    lfo.connect(lg);lg.connect(g.gain);lfo.start(t);lfo.stop(t+1.95);
    g.connect(bus);
    osc(c,g,'sine',392,t,t+1.9,0.9,{attack:0.4});
    osc(c,g,'sine',554.4,t,t+1.9,0.9,{attack:0.5});
    lfo.onended=function(){try{lfo.disconnect();lg.disconnect();g.disconnect();}catch(e){}};
  },
  gavel:function(c,bus,t){
    knock(c,bus,t);knock(c,bus,t+0.3);knock(c,bus,t+0.6);
    osc(c,bus,'sine',52,t+0.6,t+1.5,0.05,{attack:0.02});
  }
};

/* keyword -> sting; deliberately sparse so stings stay special */
function hint(title){
  var t=String(title||'').toLowerCase();
  if(/r e s u m e d/.test(t))return null;      /* checkpoint restores: silence */
  if(/arrest/.test(t))return 'hit';
  if(/trial|court|verdict|g u i l t y/.test(t))return 'gavel';
  if(/rooftop|chase|escape|breakout/.test(t))return 'riser';
  if(/dream|nightmare/.test(t))return 'dread';
  if(/crime scene|collapsed|e p i l o g u e|epilogue/.test(t))return 'dread';
  if(/s e c r e t|secret|retirement/.test(t))return 'resolve';
  if(/investigation|docks|pier|mr. sun/.test(t))return 'shimmer';
  return null;
}

var CMSTING={
  hint:hint,
  play:function(kind){
    if(!SYNTH[kind])return false;
    var c=_ctx();if(!c)return false;
    var now=c.currentTime;
    if(now-_lastAt<MIN_GAP)return false;
    if(kind===_lastKind&&now-_lastKindAt<SAME_GAP)return false;
    _lastAt=now;_lastKind=kind;_lastKindAt=now;
    var out=(window.audioBus&&window.audioBus())||c.destination;
    try{SYNTH[kind](c,out,now+0.02);}catch(e){return false;}
    return true;
  }
};

window.CMSTING=CMSTING;
})();
/* ===== END former engine/stings.js ===== */
