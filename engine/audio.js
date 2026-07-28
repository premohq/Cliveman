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
