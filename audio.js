/* ========================================================================
   CLIVEMAN 3.1  -  js/03-audio.js
   WebAudio sound engine + procedural multi-track music.

   Exposes:
     ensureAudio()                  - lazily create / resume the AudioContext
     beep / playKeyClick / etc.     - UI sound effects
     setMuted(bool) / toggleMute()  - global mute (silences SFX + music)
     isMuted()                      - current mute state
     playMusic('trackName')         - start / crossfade to a procedural track
     stopMusic()                    - fade the current track out

   Music tracks (each a distinct mood, all pure WebAudio - no files):
     'title'       - slow noir jazz, walking bass + muted trumpet (title screen)
     'investigate' - tense, sparse, ticking pulse                 (Ch.1 / Ch.2 investigation)
     'lonely'      - warm, slow, melancholy                       (Pete's Subs scene)
     'descent'     - dark, dissonant, unstable                    (after Bevan dies, Ch.3)

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

/* ── Global mute ─────────────────────────────────────────────────────────
   _muted gates every sound: UI beeps AND music. The music engine also
   reads _muted live so a mute mid-track silences it immediately. */
let _muted=false;
function isMuted(){return _muted;}
function setMuted(on){
  _muted=!!on;
  if(_music&&_music.master&&audioCtx){
    try{
      _music.master.gain.cancelScheduledValues(audioCtx.currentTime);
      _music.master.gain.setValueAtTime(_music.master.gain.value,audioCtx.currentTime);
      _music.master.gain.exponentialRampToValueAtTime(
        _muted?0.0001:(_music.vol||0.3), audioCtx.currentTime+0.3);
    }catch(e){}
  }
  if(window._onMuteChanged)try{window._onMuteChanged(_muted);}catch(e){}
}
function toggleMute(){setMuted(!_muted);return _muted;}

function beep(freq,dur,vol,type){
  if(!audioCtx||_muted)return;
  try{
    const osc=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    osc.type=type||'square';
    osc.frequency.value=freq+(Math.random()*40-20);
    gain.gain.value=vol;
    osc.connect(gain);gain.connect(audioCtx.destination);
    const t=audioCtx.currentTime;
    osc.start(t);
    gain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    osc.stop(t+dur+0.01);
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


/* ========================================================================
   PROCEDURAL MUSIC ENGINE  -  multiple tracks, one at a time
   Each track schedules itself one bar ahead and loops. playMusic() will
   crossfade out whatever is playing and start the requested track.
   ======================================================================== */
let _music=null;       /* currently-playing track object */
let _musicName=null;   /* its name, so re-requesting the same track is a no-op */

/* note frequency tables (Hz) - C natural minor across octaves */
const _SCALE={
  bassLow:[65.41,73.42,77.78,87.31,98.00,103.83,116.54,130.81],
  mid:    [130.81,146.83,155.56,174.61,196.00,207.65,233.08,261.63],
  lead:   [261.63,293.66,311.13,349.23,392.00,415.30,466.16,523.25]
};

/* ── small synth voices shared by the tracks ── */
function _mkBass(freq,t,dst,step,vol){
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),lp=audioCtx.createBiquadFilter();
  lp.type='lowpass';lp.frequency.value=420;
  o.type='triangle';
  o.frequency.setValueAtTime(freq,t);
  o.frequency.exponentialRampToValueAtTime(freq*1.01,t+0.04);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol||0.5,t+0.03);
  g.gain.exponentialRampToValueAtTime(0.0001,t+step*0.95);
  o.connect(lp);lp.connect(g);g.connect(dst);
  o.start(t);o.stop(t+step);
}
function _mkLead(freq,t,dst,step,hold,vol,wave){
  const bp=audioCtx.createBiquadFilter();
  bp.type='bandpass';bp.frequency.value=freq*2;bp.Q.value=5;
  const g=audioCtx.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol||0.16,t+0.12);
  g.gain.setValueAtTime(vol||0.16,t+step*hold);
  g.gain.exponentialRampToValueAtTime(0.0001,t+step*(hold+1.2));
  bp.connect(g);g.connect(dst);
  [0,1].forEach(function(d){
    const o=audioCtx.createOscillator();
    o.type=wave||'sawtooth';
    o.frequency.setValueAtTime(freq*(1+d*0.006),t);
    o.connect(bp);
    o.start(t);o.stop(t+step*(hold+1.4));
  });
}
function _mkBrush(t,dst,accent,bright){
  const len=0.18;
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*len,audioCtx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const src=audioCtx.createBufferSource();src.buffer=buf;
  const hp=audioCtx.createBiquadFilter();
  hp.type='highpass';hp.frequency.value=bright||5200;
  const g=audioCtx.createGain();
  g.gain.value=accent?0.06:0.028;
  src.connect(hp);hp.connect(g);g.connect(dst);
  src.start(t);
}
function _mkPad(freq,t,dst,dur,vol){
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),lp=audioCtx.createBiquadFilter();
  lp.type='lowpass';lp.frequency.value=900;
  o.type='sawtooth';o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol||0.06,t+dur*0.4);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(lp);lp.connect(g);g.connect(dst);
  o.start(t);o.stop(t+dur+0.05);
}
function _mkTick(t,dst,vol){
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type='square';o.frequency.value=1700+Math.random()*60;
  g.gain.setValueAtTime(vol||0.04,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.03);
  o.connect(g);g.connect(dst);
  o.start(t);o.stop(t+0.05);
}

/* ── track definitions ──
   Each returns {step, vol, bar(master,base,step)} where bar() schedules
   one 16-step bar starting at audioCtx.currentTime + small lookahead. */
const _TRACKS={

  /* TITLE - slow noir jazz, walking bass + sparse muted trumpet */
  title:function(){
    const B=_SCALE.bassLow,L=_SCALE.lead;
    const bass=[0,2,4,2, 5,4,2,0, 3,4,5,4, 6,5,4,2];
    const lead=[4,-1,-1,2, -1,-1,5,-1, -1,4,-1,-1, 6,-1,5,-1];
    return {step:0.34,vol:0.32,bar:function(master,base,step){
      for(let s=0;s<16;s++){
        const t=base+s*step;
        _mkBass(B[bass[s]],t,master,step,0.5);
        if(lead[s]>=0)_mkLead(L[lead[s]],t,master,step,1.4,0.16);
        if(s%2===0)_mkBrush(t,master,s%8===0);
      }
    }};
  },

  /* INVESTIGATE - tense and sparse, a steady ticking pulse under low stabs */
  investigate:function(){
    const B=_SCALE.bassLow,M=_SCALE.mid;
    const bass=[0,-1,-1,-1, 3,-1,-1,-1, 2,-1,-1,-1, 4,-1,-1,-1];
    const stab=[-1,-1,4,-1, -1,-1,-1,-1, -1,-1,2,-1, -1,-1,-1,5];
    return {step:0.30,vol:0.26,bar:function(master,base,step){
      for(let s=0;s<16;s++){
        const t=base+s*step;
        if(bass[s]>=0)_mkBass(B[bass[s]],t,master,step*3,0.42);
        if(stab[s]>=0)_mkLead(M[stab[s]],t,master,step,0.6,0.10,'square');
        _mkTick(t,master,s%4===0?0.05:0.028);
      }
    }};
  },

  /* LONELY - warm, slow, melancholy: soft pad + a tender high line */
  lonely:function(){
    const B=_SCALE.bassLow,L=_SCALE.lead,M=_SCALE.mid;
    const bass=[0,-1,-1,-1, -1,-1,-1,-1, 5,-1,-1,-1, -1,-1,-1,-1];
    const line=[-1,-1,4,-1, -1,2,-1,-1, -1,-1,5,-1, -1,4,-1,-1];
    return {step:0.40,vol:0.30,bar:function(master,base,step){
      _mkPad(M[0],base,master,step*16,0.07);
      for(let s=0;s<16;s++){
        const t=base+s*step;
        if(bass[s]>=0)_mkBass(B[bass[s]],t,master,step*7,0.40);
        if(line[s]>=0)_mkLead(L[line[s]],t,master,step,2.0,0.13,'triangle');
      }
    }};
  },

  /* DESCENT - dark and unstable: detuned drone, dissonant stabs, no pulse */
  descent:function(){
    const B=_SCALE.bassLow,M=_SCALE.mid;
    const stab=[3,-1,-1,6, -1,-1,1,-1, -1,4,-1,-1, 7,-1,-1,2];
    return {step:0.36,vol:0.27,bar:function(master,base,step){
      _mkPad(B[0]*0.999,base,master,step*16,0.075);
      _mkPad(B[0]*1.012,base,master,step*16,0.05);
      for(let s=0;s<16;s++){
        const t=base+s*step;
        if(stab[s]>=0)_mkLead(M[stab[s]]*(1+(Math.random()*0.03-0.015)),t,master,step,0.8,0.11,'sawtooth');
        if(s%8===5)_mkBrush(t,master,true,2200);
      }
    }};
  }
};

/* ── playMusic / stopMusic ── */
function playMusic(name){
  ensureAudio();
  if(!audioCtx)return;
  if(!_TRACKS[name])return;
  if(_musicName===name&&_music&&!_music.stopped)return; /* already playing it */

  stopMusic(); /* fade out whatever is currently playing */

  const def=_TRACKS[name]();
  const master=audioCtx.createGain();
  master.gain.value=0.0001;
  const tone=audioCtx.createBiquadFilter();
  tone.type='lowpass';tone.frequency.value=2600;tone.Q.value=0.4;
  master.connect(tone);
  tone.connect(audioCtx.destination);

  const targetVol=def.vol||0.3;
  master.gain.exponentialRampToValueAtTime(
    _muted?0.0001:targetVol, audioCtx.currentTime+2.0);

  const track={master:master,tone:tone,timer:null,stopped:false,vol:targetVol,def:def};
  _music=track;
  _musicName=name;

  function loop(){
    if(!track||track.stopped)return;
    const base=audioCtx.currentTime+0.06;
    def.bar(master,base,def.step);
    track.timer=setTimeout(loop,def.step*16*1000);
  }
  loop();
}

function stopMusic(){
  if(!_music)return;
  const dead=_music;
  dead.stopped=true;
  if(dead.timer)clearTimeout(dead.timer);
  _music=null;
  _musicName=null;
  if(audioCtx){
    try{
      dead.master.gain.cancelScheduledValues(audioCtx.currentTime);
      dead.master.gain.setValueAtTime(dead.master.gain.value,audioCtx.currentTime);
      dead.master.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+1.0);
    }catch(e){}
  }
  setTimeout(function(){
    try{dead.master.disconnect();dead.tone.disconnect();}catch(e){}
  },1300);
}

/* ── back-compat shims ──
   Earlier code called startNoirMusic()/stopNoirMusic(). Keep those working
   so nothing else breaks; they now map onto the title track. */
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
