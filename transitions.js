/* ========================================================================
   CLIVEMAN 3.1  -  js/07-transitions.js
   ASCII art + animated transitions: title art, faces, city skyline, car drive, stair climbs.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */
const TITLE_ART=' ██████╗ ██╗      ██╗██╗   ██╗███████╗██╗   ██╗ █████╗ ███╗   ██╗\n██╔════╝ ██║      ██║██║   ██║██╔════╝██║████║██╔══██╗████╗  ██║\n██║     ██║      ██║██║   ██║█████╗  ███████║███████║██╔██╗ ██║\n██║     ██║      ██║╚██╗ ██╔╝██╔══╝  ██╔══██║██╔══██║██║╚██╗██║\n╚██████╗███████╗██║ ╚████╔╝ ███████╗██║  ██║██║  ██║██║ ╚████║\n ╚═════╝╚══════╝╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝';const FACE_NORMAL=['           .-------.','          / .-----. \\','         / /       \\ \\','        | |  o   o  | |','        | |    _    | |','        | |   (_)   | |','         \\ \\  \\_/  / /','          \\ \'-----\' /','           \'-------\'','          __|     |__','         /  |_____|  \\','        /   /     \\   \\','       /___/       \\___\\'].join('\n');const FACE_BS=['           .-------.','          / .--!--. \\','         / /       \\ \\','        | |  X   O  | |','        | |    _    | |','        | |  /===\\  | |','         \\ \\ \\___/ / /','          \\ \'-----\' /','           \'-------\'','         \\__|     |__','          \\ |_____| \\----> !','           \\|     |','           /|_____|\\'].join('\n');const COMBAT_SHOOT=['           .-------.','          / .-----. \\','         / /       \\ \\','        | |  >   >  | |','        | |    _    | |','        | |   ===   | |','         \\ \\  \\_/  / /','          \\ \'-----\' /','           \'-------\'','         __|       |__','        /  |_______|  \\__[=====}==> * BANG *','       /   /       \\','      /___/         \\___'].join('\n');const EPILOGUE_ART='  ___      _ _\n'+' | __|_ __(_) |___  __ _ _  _ ___\n'+' | _|| \'_ \\ | / _ \\/ _` | || / -_)\n'+' |___| .__/_|_\\___/\\__, |\\_, \\___|\n'+'     |_|           |___/ |__/';const CITY_BIG=['                                   .---.                                   ','                                   |WWW|                                   ','                   _____           |WWW|          .-----.                  ','                  |WWWWW|          |WWW|          |WWWWW|                  ','     .---.        |WWWWW|  .----.  |WWW|  .----.  |WWWWW|       .---.      ','     |WWW|        |WWWWW|  |WWWW|  |WWW|  |WWWW|  |WWWWW|       |WWW|      ','     |WWW|  __    |WWWWW|  |WWWW|  |WWW|  |WWWW|  |WWWWW|  __   |WWW|      ','  .--|WWW|-|WW|---|WWWWW|--|WWWW|--|WWW|--|WWWW|--|WWWWW|-|WW|--|WWW|--.   ','  |WW|WWW|-|WW|-.-|WWWWW|--|WWWW|-.|WWW|.-|WWWW|--|WWWWW|-|WW|-.|WWW|WW|   ','  |WW|WWW|_|WW|_|_|WWWWW|__|WWWW|_||WWW||_|WWWW|__|WWWWW|_|WW|_||WWW|WW|   ','__|__|___|_|__|_|_|_____|__|____|_||___||_|____|__|_____|_|__|_||___|__|__'].join('\n');const CITY_SMALL=['              .--.              ','              |WW|              ','        ___   |WW|    ____      ','       |WWW|  |WW|   |WWWW|     ','  .--. |WWW|  |WW|   |WWWW| .--.','  |WW| |WWW|__|WW|___|WWWW| |WW|','  |WW|_|WWW||_|WW||__|WWWW|_|WW|','__|__|_|___|__|__|__|____|__|__|'].join('\n');const CITY_WINDOW_CHARS=['.',':',"'",' ','.',':'];function renderCity(){const chars=IS_MOBILE?CITY_SMALL:CITY_BIG;let html='';for(let i=0;i<chars.length;i++){const ch=chars[i];if(ch==='W'){const rnd=CITY_WINDOW_CHARS[Math.floor(Math.random()*CITY_WINDOW_CHARS.length)];html+='<span class="win">'+(rnd===' '?' ':rnd)+'</span>';}else if(ch==='<')html+='&lt;';else if(ch==='>')html+='&gt;';else if(ch==='&')html+='&amp;';else html+=ch;}return html;}const CAR_FRAMES=[`            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (o)               (o)`,`            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (O)               (O)`,`            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (0)               (0)`,`            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (O)               (O)`];const ROAD_FRAMES=['  ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~','~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ -','- ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~',' ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ '];async function carTransition(fromLoc,toLoc){if(document.body.classList.contains('nav-mode')){exitNavMode();}await pressEnterToContinue();clearScreen();blank();instantLine('>>>>>   TRANSIT IN PROGRESS   <<<<<','sys');blank();var Tt=window.t||function(s){return s;};instantLine('  FROM: '+Tt(fromLoc),'speaker');instantLine('    TO: '+Tt(toLoc),'speaker');blank(2);const carDiv=appendLine('car');const roadDiv=appendLine('car');const TOTAL_FRAMES=22;for(let i=0;i<TOTAL_FRAMES;i++){carDiv.textContent=CAR_FRAMES[i%CAR_FRAMES.length];roadDiv.textContent=ROAD_FRAMES[i%ROAD_FRAMES.length];if(i%3===0)playEngine();await sleep(170);}blank(2);await pressEnterToContinue();clearScreen();}
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
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t); o.stop(t + 1.9);
      });
      /* noise crack */
      const len = 0.4;
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate*len, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
      const src = audioCtx.createBufferSource(); src.buffer = buf;
      const ng = audioCtx.createGain(); ng.gain.value = 0.18;
      src.connect(ng); ng.connect(audioCtx.destination);
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
