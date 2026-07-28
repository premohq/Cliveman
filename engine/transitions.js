/* ========================================================================
   CLIVEMAN  -  engine/transitions.js
   ASCII art + animated transitions: character faces, ASCII car drive,
   the 3D Crown Vic drive hand-off (driveClivesBuick), stair climbs,
   floor labels, and Bevan's death vignette.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */
const FACE_NORMAL=['           .-------.','          / .-----. \\','         / /       \\ \\','        | |  o   o  | |','        | |    _    | |','        | |   (_)   | |','         \\ \\  \\_/  / /','          \\ \'-----\' /','           \'-------\'','          __|     |__','         /  |_____|  \\','        /   /     \\   \\','       /___/       \\___\\'].join('\n');const FACE_BS=['           .-------.','          / .--!--. \\','         / /       \\ \\','        | |  X   O  | |','        | |    _    | |','        | |  /===\\  | |','         \\ \\ \\___/ / /','          \\ \'-----\' /','           \'-------\'','         \\__|     |__','          \\ |_____| \\----> !','           \\|     |','           /|_____|\\'].join('\n');const COMBAT_SHOOT=['           .-------.','          / .-----. \\','         / /       \\ \\','        | |  >   >  | |','        | |    _    | |','        | |   ===   | |','         \\ \\  \\_/  / /','          \\ \'-----\' /','           \'-------\'','         __|       |__','        /  |_______|  \\__[=====}==> * BANG *','       /   /       \\','      /___/         \\___'].join('\n');const CITY_SMALL=['              .--.              ','              |WW|              ','        ___   |WW|    ____      ','       |WWW|  |WW|   |WWWW|     ','  .--. |WWW|  |WW|   |WWWW| .--.','  |WW| |WWW|__|WW|___|WWWW| |WW|','  |WW|_|WWW||_|WW||__|WWWW|_|WW|','__|__|_|___|__|__|__|____|__|__|'].join('\n');const CAR_FRAMES=[`            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (o)               (o)`,`            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (O)               (O)`,`            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (0)               (0)`,`            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (O)               (O)`];const ROAD_FRAMES=['  ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~','~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ -','- ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~',' ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ '];async function carTransition(fromLoc,toLoc){if(document.body.classList.contains('nav-mode')){exitNavMode();}await pressEnterToContinue();if(window.CUTSCENE)await CUTSCENE.fadeIn('TRANSIT');clearScreen();blank();instantLine('>>>>>   TRANSIT IN PROGRESS   <<<<<','sys');blank();var Tt=window.t||function(s){return s;};instantLine('  FROM: '+Tt(fromLoc),'speaker');instantLine('    TO: '+Tt(toLoc),'speaker');blank(2);if(window.CUTSCENE)await CUTSCENE.fadeOut();const carDiv=appendLine('car');const roadDiv=appendLine('car');const TOTAL_FRAMES=22;for(let i=0;i<TOTAL_FRAMES;i++){carDiv.textContent=CAR_FRAMES[i%CAR_FRAMES.length];roadDiv.textContent=ROAD_FRAMES[i%ROAD_FRAMES.length];if(i%3===0)playEngine();await sleep(170);}blank(2);if(window.CUTSCENE){await CUTSCENE.fadeIn();clearScreen();await CUTSCENE.fadeOut();}else{await pressEnterToContinue();clearScreen();}}
/* ── Drive-minigame bundle loader ──
   minigame/clivesbuick.bundle.js is 2.4 MB (it carries its own copy of
   three.js). It used to be a plain <script> tag in index.html, so every
   player paid the download-and-compile cost on every page load - including
   the ones who never drive anywhere. It is now fetched the first time a
   drive is about to start.

   To keep that first drive from stalling, we also warm it in the background
   once the browser reports it is idle: by the time any drive scene is
   reached the bundle is normally already resident, and if it isn't,
   ensureDriveBundle() simply awaits the in-flight load. A failed load is
   not an error - driveClivesBuick() already falls back to the ASCII transit
   whenever startClivesBuick is unavailable. */
var _drivePromise=null;
window.ensureDriveBundle=function(){
  if(typeof window.startClivesBuick==='function')return Promise.resolve(true);
  if(_drivePromise)return _drivePromise;
  _drivePromise=new Promise(function(resolve){
    var el=document.createElement('script');
    el.src='minigame/clivesbuick.bundle.js';
    el.onload=function(){ resolve(typeof window.startClivesBuick==='function'); };
    el.onerror=function(){ resolve(false); };
    (document.head||document.documentElement).appendChild(el);
  });
  return _drivePromise;
};
(function warmDriveBundle(){
  function warm(){ try{ window.ensureDriveBundle(); }catch(e){} }
  if(typeof requestIdleCallback==='function') requestIdleCallback(warm,{timeout:8000});
  else setTimeout(warm,4000);
})();

async function driveClivesBuick(fromLoc,toLoc,dopts){
  if(window.ClassicalMusic&&ClassicalMusic.cue)try{ClassicalMusic.cue((dopts&&dopts.title)||'DRIVE');}catch(e){}
  /* Clive's Buick night-drive minigame replaces the ASCII transit screen on desktop.
     Falls back to carTransition only on touch-only mobile (no mouse/keyboard),
     if the script/WebGL is unavailable, or on any error, so the game always proceeds.
     dopts (optional) lets a scene reuse the drive for a different destination:
     {title, destLabel, arriveLine, driveQuips, hitQuips, markAtDriveStart}. */
  dopts = dopts || {};
  var DEST_LABEL = dopts.destLabel || 'BIG SMILES MAYO CORP HQ';
  var CANVAS_TITLE = dopts.title || 'DRIVE TO BIG SMILES MAYO CORP';
  var ARRIVE_LINE = dopts.arriveLine || 'Cliveman: "There it is. Big Smiles Mayo Corp HQ."';
  var MARK_START = (dopts.markAtDriveStart !== false);   // ch1 default true; other drives pass false
  // Mobile now has on-screen racing controls, so run the 3D drive there too.
  // Only fall back to the ASCII transit if the minigame script is unavailable
  // (and the try/catch below also falls back on any WebGL error).
  /* Pull the bundle in if the idle-time prefetch hasn't landed yet. Still
     falls back to the ASCII transit if it can't be loaded at all. */
  if(typeof window.startClivesBuick!=='function'){ await window.ensureDriveBundle(); }
  if(typeof window.startClivesBuick!=='function'){ await carTransition(fromLoc,toLoc); return; }
  if(MARK_START && typeof state!=='undefined') state.atDriveStart=true;   // a save during the drive resumes at the drive start
  if(document.body.classList.contains('nav-mode'))exitNavMode();
  /* A3: free the nav-mode WebGL context before opening the drive's context.
     Mobile Safari caps concurrent contexts (~8) and silently culls the oldest;
     exitNavMode()/clearMap() drop the nav canvas but leave NAV3D's context alive
     and detached. Release it now — NAV3D.attach() rebuilds from scratch on the
     next nav entry (it nulls _grid and re-creates the renderer). */
  if(window.NAV3D&&NAV3D.renderer){
    try{ NAV3D.renderer.dispose(); if(NAV3D.renderer.forceContextLoss)NAV3D.renderer.forceContextLoss(); }catch(e){}
    NAV3D.renderer=null; NAV3D.ready=false; NAV3D.canvas=null;
  }
  await pressEnterToContinue();
  if(window.CUTSCENE)await CUTSCENE.fadeIn(CANVAS_TITLE);
  clearScreen();
  instantLine('>>>>>   NIGHT DRIVE   <<<<<','sys');
  instantLine('  Find '+DEST_LABEL+' - follow the GREEN ARROW to the glowing RED marker.','speaker');
  instantLine('  W / UP throttle   S / DOWN brake   A D / LEFT RIGHT steer','dim');
  blank();
  if(typeof input!=='undefined'&&input&&input.blur)input.blur();
  mapAreaEl.style.display='block';   // #mapArea is hidden outside nav-mode; show it like nav-mode
  mapAreaEl.style.maxHeight='none';  // lift the 55vh cap so the drive fills its box (kills the scrollbar)
  mapAreaEl.style.overflow='hidden';
  document.body.classList.add('cv-driving');
  var driveQuips=dopts.driveQuips||[
    'Cliveman: "Dudley at night. Charming as a tax audit."',
    'Cliveman: "Big Smiles Mayo Corp. Can\'t miss a building that big... apparently I can."',
    'Cliveman: "Every street in this town looks the same."',
    'Cliveman: "Red marker, red marker... where IS the red marker."',
    'Cliveman: "This thing handles like a sofa with opinions."',
    'Cliveman: "I should have taken the bus.'+'"',
    '*the engine growls low*',
    '*tires hum over wet asphalt*',
    '*the V8 rumbles*'
  ];
  var hitQuips=dopts.hitQuips||[
    'Cliveman: "*CRUNCH* ...I meant to do that."',
    'Cliveman: "That wall came out of nowhere."',
    'Cliveman: "The city can bill me."',
    'Cliveman: "Parked. Aggressively."',
    '*tires screech against brick*',
    '*metal crunch echoes down the block*'
  ];
  /* the canvas mounts inside startClivesBuick, which only resolves when the
     drive ENDS — so lift the black a beat after launch, once it's rendering */
  var _lift=setTimeout(function(){if(window.CUTSCENE)CUTSCENE.fadeOut();},420);
  var _driveResult;
  try{
    _driveResult = await window.startClivesBuick({
      canvasParent: mapAreaEl,
      title: CANVAS_TITLE,
      arriveText: ARRIVE_LINE,
      blockedText: '"You can\'t do that now."',
      startHint: '  Find '+DEST_LABEL+' - follow the GREEN ARROW to the glowing RED marker.',
      driveQuips: driveQuips,
      hitQuips: hitQuips,
      onQuip:function(t){ instantLine(t,'speaker'); if(typeof scrollScreenToBottom==='function')scrollScreenToBottom(); },
      onArrive:function(){ instantLine(ARRIVE_LINE,'speaker'); },
      onBlocked:function(){ instantLine('"You can\'t do that now."','narration'); if(typeof scrollScreenToBottom==='function')scrollScreenToBottom(); },
      onSave:function(){ if(MARK_START && typeof state!=='undefined') state.atDriveStart=true; try{ if(typeof window.showSaveCode==='function'){ return window.showSaveCode(); } }catch(e){} return null; }
    });
  }catch(e){ if(typeof console!=='undefined')console.error(e); clearTimeout(_lift); if(window.CUTSCENE)await CUTSCENE.fadeOut(); document.body.classList.remove('cv-driving'); clearMap(); mapAreaEl.style.display=''; mapAreaEl.style.maxHeight=''; mapAreaEl.style.overflow=''; await carTransition(fromLoc,toLoc); return; }
  clearTimeout(_lift);
  /* A1: the drive can now resolve with a failure sentinel (context lost / a throw
     inside tick / never rendered) instead of hanging forever. Treat those exactly
     like the sync-throw path: tear the canvas box down and fall back to the ASCII
     transit so the story always advances. cleanup() already ran inside the drive. */
  if(_driveResult==='contextlost'||_driveResult==='error'||_driveResult==='stalled'){
    if(window.CUTSCENE)await CUTSCENE.fadeOut();
    document.body.classList.remove('cv-driving');
    clearMap();
    mapAreaEl.style.display=''; mapAreaEl.style.maxHeight=''; mapAreaEl.style.overflow='';
    await carTransition(fromLoc,toLoc); return;
  }
  /* cover the teardown so the canvas never pops out of existence */
  if(window.CUTSCENE)await CUTSCENE.fadeIn();
  document.body.classList.remove('cv-driving');
  clearMap();
  mapAreaEl.style.display='';
  mapAreaEl.style.maxHeight='';
  mapAreaEl.style.overflow='';
  clearScreen();
  if(window.CUTSCENE)await CUTSCENE.fadeOut();
  /* land on a clean terminal with the arrival beat (voiced) */
  await typeLine(ARRIVE_LINE,'speaker');
  blank();
}
const STAIR_UP_FRAMES=[
'                         \n                    ____ \n               ____|    \n          ____|         \n     ____|              \n ___|    @              ',
'                         \n                    ____ \n               ____|    \n          ____|         \n     ____|   @          \n ___|                   ',
'                         \n                    ____ \n               ____|    \n          ____|  @      \n     ____|              \n ___|                   ',
'                         \n                    ____ \n               ____| @  \n          ____|         \n     ____|              \n ___|                   ',
'                         \n                 @  ____ \n               ____|    \n          ____|         \n     ____|              \n ___|                   ',
];
const STAIR_DN_FRAMES=[
' ___    @                \n     |____              \n          |____         \n               |____    \n                    |___\n                         ',
' ___                     \n     |____  @           \n          |____         \n               |____    \n                    |___\n                         ',
' ___                     \n     |____              \n          |____ @       \n               |____    \n                    |___\n                         ',
' ___                     \n     |____              \n          |____         \n               |____ @  \n                    |___\n                         ',
' ___                     \n     |____              \n          |____         \n               |____    \n                    |___\n                       @ ',
];
function playStairStep(direction,step){
var isUp=direction==='up';
var baseFreq=isUp?280:520;
var freqStep=isUp?60:-60;
beep(baseFreq+step*freqStep,0.1,0.05,'square');
setTimeout(function(){beep(baseFreq+step*freqStep+200,0.06,0.03,'sine');},50);
}
/* floorLabelFade(text) — briefly shows a centered banner naming the floor you
   are arriving on, then fades it out. Overlays the whole screen (click-through)
   so it works over the 3D view during a stair climb. Resolves once the fade has
   played long enough not to linger; the element cleans itself up. */
function floorLabelFade(text){
  return new Promise(function(resolve){
    try{
      /* In 3D nav the climb is continuous geometry — no fade-to-black
         "loading screen"; just tick the floor label over as a corner toast. */
      if(window.NAV3D&&NAV3D.enabled&&NAV3D.ready&&window.showNavToast){
        window.showNavToast(window.t?window.t(text||''):(text||''),'sys');
        resolve();return;
      }
      var T=window.t||function(s){return s;};
      var old=document.getElementById('floorFade');
      if(old&&old.parentNode){old.parentNode.removeChild(old);}
      var host=document.querySelector('.crt')||document.body;
      var wrap=document.createElement('div');
      wrap.id='floorFade';
      var inner=document.createElement('div');
      inner.className='ff-text';
      inner.textContent=T(text||'');
      wrap.appendChild(inner);
      host.appendChild(wrap);
      /* force reflow so the animation restarts reliably, then run it */
      void wrap.offsetWidth;
      wrap.classList.add('run');
      var done=false;
      function cleanup(){if(done)return;done=true;if(wrap&&wrap.parentNode)wrap.parentNode.removeChild(wrap);}
      wrap.addEventListener('animationend',cleanup);
      /* safety removal + resolve a touch before the full 1.1s so play stays snappy */
      setTimeout(cleanup,1200);
      setTimeout(resolve,650);
    }catch(e){resolve();}
  });
}
async function floorTransition(direction,fromLabel,toLabel){
clearScreen();blank();
var isUp=direction==='up';
var Ts=window.t||function(s){return s;};
var arrow=isUp?'\u25B2  '+Ts('ASCENDING')+'  \u25B2':'\u25BC  '+Ts('DESCENDING')+'  \u25BC';
instantLine('     '+arrow,'sys');
blank();
instantLine('  '+Ts('FROM:')+' '+Ts(fromLabel),'dim sharp');
instantLine('    '+Ts('TO:')+' '+Ts(toLabel),'speaker');
blank();
var frames=isUp?STAIR_UP_FRAMES:STAIR_DN_FRAMES;
var stairDiv=appendLine('stair-anim');
for(var i=0;i<frames.length;i++){
stairDiv.textContent=frames[i];
scrollScreenToBottom();
playStairStep(direction,i);
await sleep(320);
}
blank();
instantLine('  \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550','dim');
await sleep(600);
clearScreen();
navJustExited=true;
}

/* ========================================================================
   BEVAN DEATH EFFECT
   A graphical sting for the choking-death moment: a hard red vignette
   pulses in, the whole screen glitch-shakes, and a harsh dissonant audio
   hit plays. The red vignette then lingers, dimmed, and is faded out later
   by clearDeathVignette() once the grief scene moves on.
   ======================================================================== */
async function bevanDeathEffect(){
  const red = document.getElementById('redVignette');
  const crt = document.querySelector('.crt');

  /* stop the music so the harsh sting reads cleanly */
  if(typeof stopMusic === 'function') stopMusic();

  /* harsh audio sting - a low detuned cluster + a sharp noise crack */
  if(typeof audioCtx !== 'undefined' && audioCtx && !(typeof isMuted==='function' && isMuted())){
    try{
      const t = audioCtx.currentTime;
      [55, 58, 78].forEach(function(f){
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f*0.5, t + 1.6);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        o.connect(g); g.connect((window.audioBus&&window.audioBus())||audioCtx.destination);
        o.start(t); o.stop(t + 1.9);
      });
      /* noise crack */
      const len = 0.4;
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate*len, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
      const src = audioCtx.createBufferSource(); src.buffer = buf;
      const ng = audioCtx.createGain(); ng.gain.value = 0.18;
      src.connect(ng); ng.connect((window.audioBus&&window.audioBus())||audioCtx.destination);
      src.start(t);
    }catch(e){}
  }

  /* red vignette pulses in + screen glitch-shakes */
  if(red){ red.classList.remove('linger','fade'); red.classList.add('show'); }
  if(crt) crt.classList.add('death-glitch');

  /* let the glitch + vignette play out */
  await sleep(1500);

  /* fully reset the screen to normal BEFORE the next scene continues:
     stop the glitch, fade the red haze out, wait for the fade to finish */
  if(crt) crt.classList.remove('death-glitch');
  if(red){
    red.classList.remove('show','linger');
    red.style.transition = 'opacity 0.6s ease-out';
    red.style.opacity = '0';
    await sleep(650);
    red.style.transition = '';
    red.style.opacity = '';
  }
}

/* No-op kept for backwards compatibility (the effect now self-cleans). */
function clearDeathVignette(){
  const red = document.getElementById('redVignette');
  if(!red) return;
  red.classList.remove('show','linger');
  red.style.opacity = '';
  red.style.transition = '';
}

/* ===== merged from character-art.js (CRT line-art SVG figures) ===== */
/* ============================================================================
   CHARACTER ART  —  CRT line-art SVG figures shown during key story beats.
   Replaces the old ASCII faces (FACE_NORMAL / FACE_BS / COMBAT_SHOOT).
   Drawn in green phosphor to match the terminal, with amber action accents.
   instantArt(kind, cls) appends the chosen figure into the screen, mirroring
   how instantLine appends a text line.
   ============================================================================ */

var CHAR_ART_DEFS = (function(){
var GREEN='#33ff66', AMBER='#ffb000';

function doc(inner, overlay){
  overlay = overlay || '';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 320" class="char-svg" preserveAspectRatio="xMidYMid meet">'
    + '<defs>'
    + '<filter id="charGlow" x="-30%" y="-30%" width="160%" height="160%">'
    + '<feGaussianBlur stdDeviation="1.5" result="b"/>'
    + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
    + '</filter>'
    + '<pattern id="charScan" width="3" height="3" patternUnits="userSpaceOnUse">'
    + '<rect width="3" height="3" fill="#000"/><rect width="3" height="1" y="2" fill="rgba(0,0,0,0.35)"/>'
    + '</pattern>'
    + '</defs>'
    + '<g filter="url(#charGlow)" fill="none" stroke="' + GREEN + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
    + inner
    + '</g>'
    + overlay
    + '<rect width="300" height="320" fill="url(#charScan)" opacity="0.45"/>'
    + '</svg>';
}

/* a proper 1940s noir fedora: flat oval brim, rounded crown, hat band */
function fedora(cx, brimY){
  cx = cx||150; brimY = brimY||82;
  return ''
   + '<path d="M'+(cx-44)+' '+(brimY-4)+' Q'+(cx-40)+' '+(brimY-46)+' '+cx+' '+(brimY-48)+' Q'+(cx+40)+' '+(brimY-46)+' '+(cx+44)+' '+(brimY-4)+'"/>'
   + '<path d="M'+(cx-44)+' '+(brimY-8)+' Q'+cx+' '+(brimY-2)+' '+(cx+44)+' '+(brimY-8)+'"/>'
   + '<path d="M'+(cx-70)+' '+brimY+' Q'+cx+' '+(brimY+14)+' '+(cx+70)+' '+brimY+' Q'+cx+' '+(brimY-6)+' '+(cx-70)+' '+brimY+' Z"/>';
}

/* NEUTRAL — calm suspect in a fedora, suit + tie */
var neutral = fedora() +
  '<path d="M98 92 Q98 172 150 184 Q202 172 202 92"/>'+
  '<circle cx="126" cy="124" r="5.5"/>'+
  '<circle cx="174" cy="124" r="5.5"/>'+
  '<path d="M150 130 L150 148 L143 154"/>'+
  '<path d="M130 166 Q150 172 170 166"/>'+
  '<path d="M100 190 Q150 198 200 190"/>'+
  '<path d="M88 300 Q88 216 112 198"/>'+
  '<path d="M212 300 Q212 216 188 198"/>'+
  '<path d="M140 198 L150 234 L160 198"/>'+
  '<path d="M150 234 L150 292"/>';

/* BS — same fedora, angry leaning face, gritted teeth; amber LIAR + accusing arm */
var bs = fedora() +
  '<path d="M98 92 Q98 172 150 184 Q202 170 200 90"/>'+
  '<path d="M114 110 L140 120"/>'+
  '<path d="M186 110 L160 120"/>'+
  '<path d="M120 128 L136 130"/>'+
  '<path d="M164 130 L180 128"/>'+
  '<path d="M150 132 L150 150 L143 156"/>'+
  '<path d="M128 166 L172 166 L172 176 L128 176 Z"/>'+
  '<path d="M140 166 L140 176 M150 166 L150 176 M162 166 L162 176"/>'+
  '<path d="M100 192 Q150 200 200 192"/>'+
  '<path d="M88 300 Q88 218 112 200"/>'+
  '<path d="M212 300 Q212 218 188 200"/>'+
  '<path d="M140 200 L150 236 L160 200"/>';
var bsOverlay =
  '<g filter="url(#charGlow)" fill="none" stroke="'+AMBER+'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'+
  '<path d="M300 252 L240 236"/>'+
  '<path d="M240 236 L256 228 M240 236 L256 244"/>'+
  '</g>'+
  '<text x="150" y="40" font-family="monospace" font-size="26" fill="'+AMBER+'" text-anchor="middle" filter="url(#charGlow)" letter-spacing="4">LIAR</text>';

/* SHOOTOUT — a DIFFERENT character: hatless young perp, messy hair, shocked,
   recoiling from a gunshot; amber impact-star + BLAM! */
var shoot =
  '<path d="M104 78 Q110 60 130 58 Q150 50 172 60 Q192 64 196 82"/>'+
  '<path d="M108 80 L114 66 M128 62 L132 54 M150 56 L152 48 M170 60 L176 52 M188 70 L194 62"/>'+
  '<path d="M108 84 Q104 150 150 162 Q190 150 192 86"/>'+
  '<circle cx="132" cy="112" r="6"/>'+
  '<circle cx="174" cy="112" r="6"/>'+
  '<path d="M150 118 L150 132 L145 137"/>'+
  '<ellipse cx="152" cy="150" rx="11" ry="8"/>'+
  '<path d="M110 168 Q152 178 192 166"/>'+
  '<path d="M96 300 Q100 210 118 176"/>'+
  '<path d="M206 300 Q200 214 184 174"/>'+
  '<path d="M118 176 L92 150 L78 158"/>'+
  '<path d="M184 174 L168 200"/>';
var shootOverlay =
  '<text x="220" y="120" font-family="monospace" font-size="24" fill="'+AMBER+'" text-anchor="middle" filter="url(#charGlow)" letter-spacing="2">BLAM!</text>'+
  '<g filter="url(#charGlow)" fill="none" stroke="'+AMBER+'" stroke-width="2.4" stroke-linecap="round">'+
  '<path d="M186 168 L196 158 M186 168 L200 168 M186 168 L196 178 M186 168 L178 178 M186 168 L178 158"/>'+
  '</g>';

var bevanInner =
  '<g transform="rotate(-14 150 78)">'+fedora(150,82)+'</g>'+
  '<path d="M100 96 Q96 176 150 188 Q204 176 200 96"/>'+
  '<path d="M116 122 Q126 127 136 122"/>'+
  '<path d="M164 122 Q174 127 184 122"/>'+
  '<path d="M116 128 Q126 133 136 128"/>'+
  '<path d="M164 128 Q174 133 184 128"/>'+
  '<path d="M118 138 Q126 142 134 138"/>'+
  '<path d="M166 138 Q174 142 182 138"/>'+
  '<path d="M150 132 L150 152 L142 158"/>'+
  '<path d="M130 170 Q150 182 170 166"/>'+
  '<path d="M150 176 L150 190"/>'+
  '<path d="M120 166 l3 6"/><path d="M133 176 l2 7"/><path d="M167 176 l2 7"/><path d="M180 166 l3 6"/>'+
  '<path d="M96 198 Q150 212 206 192"/>'+
  '<path d="M84 300 Q80 226 110 200"/>'+
  '<path d="M216 300 Q222 232 192 198"/>'+
  '<path d="M142 204 L158 208 L151 242 L147 242 Z"/>'+
  '<path d="M206 198 Q238 222 226 258"/>'+
  '<path d="M214 258 h24 v30 q0 9 -12 9 q-12 0 -12 -9 Z"/>'+
  '<path d="M222 258 v-12 h8 v12"/>';
var bevanOverlay =
  '<g fill="none" stroke="'+AMBER+'" stroke-width="2.2" stroke-linecap="round">'+
  '<path d="M68 66 q9 -9 18 0"/><path d="M212 66 q9 -9 18 0"/>'+
  '<path d="M104 116 q-5 9 0 14 q5 -5 0 -14 Z"/>'+
  '</g>'+
  '<circle cx="150" cy="150" r="4.5" fill="'+AMBER+'" stroke="none"/>'+
  '<text x="226" y="118" fill="'+AMBER+'" font-family="monospace" font-size="20" font-style="italic">*hic*</text>';

return {
  normal: doc(neutral),
  bevan:  doc(bevanInner, bevanOverlay),
  bs:     doc(bs, bsOverlay),
  shoot:  doc(shoot, shootOverlay)
};
})();

/* Append a character figure into the screen, like instantLine but with SVG.
   kind: 'normal' | 'bs' | 'shoot'. cls: optional extra classes (e.g. 'glitch'). */
function instantArt(kind, cls){
  /* Story flow: the figure appears in the scene-art area above the dialogue
     box. Nav mode (and pre-game) keeps the classic inline append. */
  if(window.STORYART&&document.body.classList.contains('game-started')&&!document.body.classList.contains('nav-mode')){
    return STORYART.char(kind,cls);
  }
  var svg = CHAR_ART_DEFS[kind] || CHAR_ART_DEFS.normal;
  var div = appendLine('char-art art-reveal '+(cls||''));
  div.innerHTML = svg;
  if(typeof playMoveBlip==='function'){try{playMoveBlip();}catch(e){}}
  if(typeof scrollScreenToBottom==='function')scrollScreenToBottom();
  return div;
}
