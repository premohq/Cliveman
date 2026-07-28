/* ========================================================================
   CLIVEMAN  -  story/ch3.js
   Dudley open world, Chapter 3, epilogue, and runFrom (checkpoint dispatcher).

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */
const ROOM_DUDLEY=10;const DUDLEY_BEVAN_LINES=['Bevan: "I\'m still so wasted, Cliveman."','Bevan: "I miss my wife. I miss her so much."','Bevan: "Clive, I am STARVING."','Bevan: "That sub shop feels like it\'s on another continent."','Bevan: "How many miles is a mile again?"','Bevan: "My feet hurt. My soul hurts."','Bevan: "I wonder if Karen still thinks about me."','Bevan: "I would kill a man for a meatball sub right now."',];async function ch2_dudley_open_world(){state.checkpoint=6;section('CENTRAL DUDLEY');await typeLine('"You hit the main drag. Neon signs flicker above you. A tavern, an arcade, the old horse track... and the mechanic behind you, arms crossed, waiting for his money."','narration');await typeLine('"You need $250. You have $'+state.money+'. Get moving."','sys');blank();const grid=[['.','.','G','.','#','.','H','.'],['.','.','.','.','#','.','.','.'],['.','#','.','.','.','.','#','.'],['M','.','.','.','A','.','.','.'],];const events={'0,2':async function(){await typeLine('"You step into the GUMSHOE TAVERN. The lights are low. The bartender nods toward a back room."','narration');const c=await askClick('Play illegal blackjack?',[{keys:['y','yes','play'],label:'PLAY BLACKJACK'},{keys:['n','no','leave'],label:'LEAVE'},]);if(c.keys.indexOf('y')!==-1){await playBlackjack();}},'0,6':async function(){await typeLine('"You arrive at DUDLEY MILLS HORSE TRACK. The air smells like sweat and cigarettes."','narration');const c=await askClick('Bet on the horses?',[{keys:['y','yes','play'],label:'BET ON HORSES'},{keys:['n','no','leave'],label:'LEAVE'},]);if(c.keys.indexOf('y')!==-1){await playHorseRace();}},'3,4':async function(){await typeLine('"You enter the DUDLEY ARCADE. Kids crowd around a Snake machine."','narration');const c=await askClick('Play Snake? ($1)',[{keys:['y','yes','play'],label:'PLAY SNAKE'},{keys:['n','no','leave'],label:'LEAVE'},]);if(c.keys.indexOf('y')!==-1){await playSnake();}},'3,0':async function(){await typeLine('"The mechanic looks up from a greasy rag."','narration');if(state.money>=250){const c=await askClick('Pay the mechanic $250 and leave town?',[{keys:['y','yes','pay'],label:'PAY $250 AND LEAVE'},{keys:['n','no','wait'],label:'NOT YET'},]);if(c.keys.indexOf('y')!==-1){state.money-=250;state.mechanicPaid=true;await typeLine('Mechanic: "$250. Right on the nose. Your Buick\'s purring again."','speaker');await typeLine('"He tosses you the keys. Bevan applauds weakly."','narration');return'leave_dudley';}else{await typeLine('Mechanic: "Suit yourself. I\'ll be here."','speaker');}}else{await typeLine('Mechanic: "You\'re still short. You\'ve got $'+state.money+'. Come back with $250 or don\'t come back at all."','speaker');}},};const exits={};const gate=async function(code){return true;};await navigateRoom(ROOM_DUDLEY,grid,[3,0],events,exits,{title:'CENTRAL DUDLEY',exitGate:gate,onMove:async function(pos){if(Math.random()<0.2){const line=DUDLEY_BEVAN_LINES[Math.floor(Math.random()*DUDLEY_BEVAN_LINES.length)];await typeLine(line,'speaker');}const key=pos[0]+','+pos[1];if(events[key])return;if(Math.random()<0.067){if(window.navSuspend)window.navSuspend();try{await rpsCombat();}finally{if(window.navResume)window.navResume();}}},});}async function ch3(){section('C H A P T E R   3   -   B E G I N S');const evidence=['"The official investigation into the death of Detective Sergeant Harrison Bevan begins at 6 AM."','"The coroner confirms it: anaphylaxis, induced by a foreign compound worked into the mayonnaise. Not an allergy. Not an accident. Something added. Something engineered."','"By 9 AM the lab has matched that compound to trace residue found in the lining of your coat pocket."','"You have never seen it. You cannot explain it. You were wearing that coat when they cuffed you."','"Your own blood comes back with the same compound in it - a smaller dose, but there. You tell them what it means: someone dosed you too, that is why you couldn\'t think straight, that is why you don\'t remember the badge number. They write it down as self-administered. Of course they do. A guilty man would say exactly that."',];for(let i=0;i<evidence.length;i++){await typeLine(evidence[i],'narration');blank();}await typeLine('"By noon they have stopped calling you Detective."','narration');await typeLine('"By sundown they are calling you the only suspect."','err');blank();await pressEnterToContinue();clearScreen();if(window.STORYART)STORYART.set('court');if(window.CMSTING)CMSTING.play('gavel');blank();await typeLine('"The trial is fast. Faster than anything you have ever seen move through Dudley\'s courts. A dead detective makes the city want a name, and they already have one. Yours."','narration');blank();await typeLine('"And you are not well. The compound is still in you - they held you on it, fed you on it, and whatever it is, it does not leave clean. Days later your thoughts still arrive late and sideways. The room tilts when you turn your head. Words you reach for are not where you left them."','narration');blank();await typeLine('"They offer you a lawyer. A young public defender with a nervous tie keeps leaning toward you, whispering questions, telling you what to say, what not to say."','narration');blank();await typeLine('Public Defender: "Detective - Mr. Cliveman - you have to let me do my job. If you\'d just tell them where you were, the timeline, anything - Mr. Cliveman, are you listening to me?"','speaker');blank();await typeLine('"You are trying to. His words come to you underwater. By the time you understand the question he has asked two more. You cannot hold the thread long enough to pull on it."','narration');blank();await typeLine('Cliveman: "I don\'t want him."','speaker');await typeLine('Judge: "Mr. Cliveman, I would strongly advise -"','speaker');await typeLine('Cliveman: "I don\'t want a lawyer. I\'ll speak for myself."','speaker');blank();await typeLine('"It is the worst decision you will ever make, and you make it through a fog you did not choose, with a drug you did not take, for reasons that will not survive the morning."','narration');blank();await typeLine('"You do not speak well. The room will not hold still. When the prosecutor asks where the compound in your coat came from, you tell them about the factory and the jars and the smile - slurring, losing the ends of your sentences - and you watch twelve faces decide you are exactly what the headlines say you are: a drunk, a burnout, a man who poisoned his partner and dosed himself for an alibi."','narration');blank();await typeLine('"The drug that is the proof of your innocence is the same thing making you look guilty. You are too far under to explain the difference. No one in the room is inclined to work it out for you."','narration');blank();await typeLine('"It takes the jury forty minutes."','narration');blank();await sleep(900);if(window.CMSTING)CMSTING.play('gavel');await typeLine('G U I L T Y','err');await typeLine('"Murder in the first degree. Detective Sergeant Harrison Bevan."','dim');blank();section('C H A P T E R   3   -   E N D');await pressEnterToContinue();}
async function epilogue(){section('E P I L O G U E');const cell=['"Dudley State Correctional. Cell block C."','"They take your badge. They take your coat - the one with the residue they say makes you a murderer. They take your belt and your laces and the eleven years you spent being a detective and they fold all of it into a paper bag with a number on it."','"The door closes. It is a very specific sound. You will get to know it."',];for(let i=0;i<cell.length;i++){await typeLine(cell[i],'narration');blank();}await pressEnterToContinue();await typeLine('"The fog is finally lifting now, here, too late to matter - and through the clean cold edges of it you can see the whole shape of the night. Someone put that compound in his food. Someone put it in your drink and your coat. Someone wanted a dead detective and a living scapegoat too dazed to defend himself, and they got all of it, in one night, in a sub shop, over a number nine with extra mayo."','narration');blank();await typeLine('"You did not kill Bevan."','narration');await typeLine('"You know that the way you know your own name - the name they keep insisting is the only true thing about you and the name they took anyway."','narration');blank();await typeLine('"And every road back - the factory, the formula, the smile on a million jars - runs through the one company nobody in this city is allowed to touch."','narration');blank();await sleep(800);await typeLine('"You lie back on the cot. You listen to the block go quiet."','narration');blank();await typeLine('"You are going to get out of here."','narration');await typeLine('"You are going to clear your name."','narration');await typeLine('"And then you are going to find out who made the mayonnaise."','narration');blank();await sleep(700);await typeLine('Cliveman: "Bevan. Wherever you are. Save me a seat."','speaker');blank();await sleep(1000);section('E N D   O F   P A R T   O N E');await typeLine('"Detective Cliveman will return."','dim');blank();await pressEnterToContinue();await playFinale();}
async function runFrom(startCp){if(startCp<=1){state.checkpoint=1;if(startCp===1)section('C H A P T E R   1');if(state.atDriveStart){await typeLine('"Back behind the wheel. Finish the drive to Big Smiles Mayo Corp HQ."','narration');blank();}else{await ch1_house();}await ch1_drive_to_factory();state.atDriveStart=false;await ch1_clemons();}if(startCp<=2){state.checkpoint=2;if(startCp===2){section('C H A P T E R   1   -   R E S U M E D');await typeLine('"You\'re back at Big Smiles Mayo Corp. Time to investigate."','narration');blank();}let startFloor=1;if(state.resumeRoomId>=ROOM_F1&&state.resumeRoomId<=ROOM_F5){startFloor=state.resumeRoomId;}await ch1_factory(startFloor);await ch1_rooftop();}if(startCp<=3){state.checkpoint=3;if(startCp===3){section('C H A P T E R   2   -   R E S U M E D');await typeLine('"You\'re back at Detective Bevan\'s apartment building."','narration');blank();if(!state.inventory.includes("apartment building map"))addItem("apartment building map");}else{await ch2_arrive();}if(state.resumeRoomId!==ROOM_HALLWAY){await ch2_lobby();await floorTransition('up','APARTMENT LOBBY','F2 HALLWAY');}await ch2_hallway();}if(startCp<=4){state.checkpoint=4;if(startCp===4){section('C H A P T E R   2   -   R E S U M E D');await typeLine('"You\'re back in Bevan\'s apartment (Room 203)."','narration');blank();}await ch2_bevan_room();await ch2_bevan_interrogation();}if(startCp<=5){state.checkpoint=5;if(startCp===5){section('C H A P T E R   2   -   R E S U M E D');await typeLine('"You\'re back at the collapsed factory crime scene."','narration');blank();}await ch2_crime_scene();await ch2_car_breakdown();}if(startCp<=6){state.checkpoint=6;if(startCp===6){section('C H A P T E R   2   -   R E S U M E D');await typeLine('"You\'re back in central Dudley. Find the cash."','narration');showStatus();blank();}await ch2_dudley_open_world();await ch2_leave_dudley_to_petes();await ch2_petes();}state.checkpoint=7;await ch3();await epilogue();}

/* ===== merged from finale.js (ending sequence + epilogue) ===== */
/* ========================================================================
   CLIVEMAN  -  story/ch3.js (finale section)
   Big-font text, fireworks finale, signal-static effect, end-credits, easter-egg audio playback.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

const BIG_FONT_5={'A':[' ### ','#   #','#####','#   #','#   #'],'B':['#### ','#   #','#### ','#   #','#### '],'C':[' ####','#    ','#    ','#    ',' ####'],'D':['#### ','#   #','#   #','#   #','#### '],'E':['#####','#    ','#### ','#    ','#####'],'F':['#####','#    ','#### ','#    ','#    '],'G':[' ####','#    ','#  ##','#   #',' ####'],'H':['#   #','#   #','#####','#   #','#   #'],'I':['#####','  #  ','  #  ','  #  ','#####'],'J':['#####','   # ','   # ','#  # ',' ##  '],'K':['#   #','#  # ','###  ','#  # ','#   #'],'L':['#    ','#    ','#    ','#    ','#####'],'M':['#   #','## ##','# # #','#   #','#   #'],'N':['#   #','##  #','# # #','#  ##','#   #'],'O':[' ### ','#   #','#   #','#   #',' ### '],'P':['#### ','#   #','#### ','#    ','#    '],'Q':[' ### ','#   #','# # #','#  # ',' ## #'],'R':['#### ','#   #','#### ','#  # ','#   #'],'S':[' ####','#    ',' ### ','    #','#### '],'T':['#####','  #  ','  #  ','  #  ','  #  '],'U':['#   #','#   #','#   #','#   #',' ### '],'V':['#   #','#   #','#   #',' # # ','  #  '],'W':['#   #','#   #','# # #','## ##','#   #'],'X':['#   #',' # # ','  #  ',' # # ','#   #'],'Y':['#   #',' # # ','  #  ','  #  ','  #  '],'Z':['#####','   # ','  #  ',' #   ','#####'],' ':['     ','     ','     ','     ','     '],'.':['     ','     ','     ','     ','  #  '],'-':['     ','     ',' ### ','     ','     '],"'":['  #  ','  #  ','     ','     ','     ']};
function bigText(text){const up=text.toUpperCase();const rows=['','','','',''];for(let i=0;i<up.length;i++){const ch=up[i];const g=BIG_FONT_5[ch]||BIG_FONT_5[' '];for(let r=0;r<5;r++){rows[r]+=g[r]+' ';}}return rows.join('\n');}
const finaleOverlay=document.getElementById('finaleOverlay');
const fwCanvas=document.getElementById('fwCanvas');
const finaleNameEl=document.getElementById('finaleName');
const finaleSubtitleEl=document.getElementById('finaleSubtitle');
const staticOverlay=document.getElementById('staticOverlay');
const staticCanvas=document.getElementById('staticCanvas');
let fwCtx=null,fwParticles=[],fwAnimId=null,fwActive=false;
function fwResize(){fwCanvas.width=window.innerWidth;fwCanvas.height=window.innerHeight;}
function spawnFirework(x,y,color){const num=60+Math.floor(Math.random()*40);for(let i=0;i<num;i++){const angle=(Math.PI*2*i)/num+Math.random()*0.2;const speed=2+Math.random()*5;fwParticles.push({x:x,y:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1.0,color:color,size:2+Math.random()*2});}if(!window._suppressFireworkBeeps){beep(880+Math.random()*400,0.25,0.06,'square');setTimeout(function(){beep(220,0.5,0.04,'sawtooth');},80);}}
/* Firework glow, pre-baked.

   The old loop set shadowBlur/shadowColor and stroked an arc per particle.
   Canvas2D shadows are re-rasterised per draw call and are one of the most
   expensive things you can ask of the 2D context; a six-burst credit card
   pushes 500+ live particles, i.e. 500+ blurred fills a frame, which is what
   made the credits stutter on anything without a fast compositor.

   Each colour instead gets ONE 32px radial-gradient sprite, drawn once and
   then blitted. Identical glow, no per-draw rasterisation. */
const _fwSprites=Object.create(null);
function fwSprite(color){
  let c=_fwSprites[color];
  if(c)return c;
  const R=16;
  c=document.createElement('canvas');c.width=c.height=R*2;
  const g=c.getContext('2d');
  const grad=g.createRadialGradient(R,R,0,R,R,R);
  grad.addColorStop(0,color);
  grad.addColorStop(0.35,color);
  grad.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=grad;g.beginPath();g.arc(R,R,R,0,Math.PI*2);g.fill();
  _fwSprites[color]=c;
  return c;
}
function fwLoop(){
  if(!fwActive)return;
  fwCtx.globalAlpha=1;
  fwCtx.fillStyle='rgba(0,0,0,0.18)';
  fwCtx.fillRect(0,0,fwCanvas.width,fwCanvas.height);
  for(let i=fwParticles.length-1;i>=0;i--){
    const p=fwParticles[i];
    p.x+=p.vx;p.y+=p.vy;p.vy+=0.06;p.life-=0.012;
    if(p.life<=0){fwParticles.splice(i,1);continue;}
    const spr=fwSprite(p.color);
    const r=p.size*3.2;              /* sprite is mostly falloff, so scale up */
    fwCtx.globalAlpha=p.life;
    fwCtx.drawImage(spr,p.x-r,p.y-r,r*2,r*2);
  }
  fwCtx.globalAlpha=1;
  fwAnimId=requestAnimationFrame(fwLoop);
}
function startFireworks(){if(fwActive)return;fwCtx=fwCanvas.getContext('2d');fwResize();window.removeEventListener('resize',fwResize);window.addEventListener('resize',fwResize);fwParticles=[];fwActive=true;fwLoop();}
function stopFireworks(){fwActive=false;if(fwAnimId)cancelAnimationFrame(fwAnimId);fwAnimId=null;window.removeEventListener('resize',fwResize);fwParticles=[];}
const FW_COLORS=['#ff3366','#33ff66','#ffb000','#66ccff','#ff66ff','#ffff66','#ff9933'];
async function showFinaleName(name,subtitle){finaleNameEl.classList.remove('show');finaleSubtitleEl.classList.remove('show');await sleep(150);finaleNameEl.textContent=bigText(name);finaleSubtitleEl.textContent=subtitle||'';void finaleNameEl.offsetWidth;finaleNameEl.classList.add('show');if(subtitle)finaleSubtitleEl.classList.add('show');for(let burst=0;burst<6;burst++){const x=fwCanvas.width*(0.15+Math.random()*0.7);const y=fwCanvas.height*(0.15+Math.random()*0.5);const color=FW_COLORS[Math.floor(Math.random()*FW_COLORS.length)];spawnFirework(x,y,color);await sleep(260);}await sleep(900);}
let staticActive=false,staticAnimId=null;
/* Finale static.

   Was: a full-window createImageData() + Math.random() over every subpixel,
   every frame. At 1440p that is ~14MB allocated and ~3.7M RNG calls per
   frame, which on a mid-range machine is a GC storm at the exact moment the
   game wants to feel like a dying signal rather than a dying browser.

   Now: noise is generated at quarter resolution into ONE reused ImageData on
   an offscreen buffer, then blown up nearest-neighbour. That is ~16x less
   work and zero per-frame allocation, and the chunkier grain actually reads
   better - it matches the phosphor/pixel-city look instead of fighting it. */
const STATIC_SCALE=4;
let staticBuf=null,staticBufCtx=null,staticImg=null;
function startStatic(){
  if(staticActive)return;
  staticOverlay.classList.add('show');
  const ctx=staticCanvas.getContext('2d');
  staticCanvas.width=window.innerWidth;
  staticCanvas.height=window.innerHeight;
  ctx.imageSmoothingEnabled=false;
  const w=Math.max(1,Math.ceil(staticCanvas.width/STATIC_SCALE));
  const h=Math.max(1,Math.ceil(staticCanvas.height/STATIC_SCALE));
  staticBuf=document.createElement('canvas');
  staticBuf.width=w;staticBuf.height=h;
  staticBufCtx=staticBuf.getContext('2d');
  staticImg=staticBufCtx.createImageData(w,h);
  /* Alpha is opaque for the whole buffer and never changes - fill it once
     instead of rewriting every 4th byte on every frame. */
  const d=staticImg.data;
  for(let i=3;i<d.length;i+=4)d[i]=255;
  staticActive=true;
  function loop(){
    if(!staticActive)return;
    const px=staticImg.data;
    for(let i=0;i<px.length;i+=4){
      const v=(Math.random()*255)|0;
      px[i]=v;px[i+1]=v;px[i+2]=v;
    }
    staticBufCtx.putImageData(staticImg,0,0);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(staticBuf,0,0,w,h,0,0,staticCanvas.width,staticCanvas.height);
    staticAnimId=requestAnimationFrame(loop);
  }
  loop();
  /* Hiss rides the master bus like everything else, so mute reaches it.
     It previously wired straight to destination and played through mute. */
  if(!isMuted()){
    ensureAudio();
    if(audioCtx){
      try{
        const noiseBuffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate);
        const out=noiseBuffer.getChannelData(0);
        for(let i=0;i<out.length;i++)out[i]=(Math.random()*2-1)*0.15;
        const noise=audioCtx.createBufferSource();
        noise.buffer=noiseBuffer;noise.loop=true;
        const gain=audioCtx.createGain();gain.gain.value=0.12;
        noise.connect(gain);
        gain.connect((window.audioBus&&window.audioBus())||audioCtx.destination);
        noise.start();
        window._staticNoise=noise;window._staticGain=gain;
      }catch(e){}
    }
  }
}
/* There was no teardown at all: startStatic() was the last statement of the
   finale, so the rAF loop and the looping noise source ran until the tab was
   reloaded - including behind the menu if the player went back to it. */
function stopStatic(){
  staticActive=false;
  if(staticAnimId)cancelAnimationFrame(staticAnimId);
  staticAnimId=null;
  staticBuf=null;staticBufCtx=null;staticImg=null;
  if(staticOverlay)staticOverlay.classList.remove('show');
  if(window._staticNoise){
    try{window._staticNoise.stop();window._staticNoise.disconnect();}catch(e){}
    window._staticNoise=null;
  }
  if(window._staticGain){
    try{window._staticGain.disconnect();}catch(e){}
    window._staticGain=null;
  }
}
window.stopStatic=stopStatic;
async function playFinale(){stopMusic();stopStatic();finaleOverlay.classList.add('show');startFireworks();await sleep(400);await showFinaleName('CLIVEMAN','A Text-Based Python Project (c)(R)(TM) 2019');await sleep(600);const credits=[['BEN SMITH','PROJECT MANAGER'],['RYAN PERUSKI','LEAD DEVELOPER'],['AIDAN GAROFALO','SCRUM MASTER'],['GABE GILLIS','STORY DEVELOPER']];for(let i=0;i<credits.length;i++){await showFinaleName(credits[i][0],credits[i][1]);await sleep(700);}await showFinaleName('THANK YOU','FOR PLAYING');await sleep(1400);stopFireworks();finaleNameEl.classList.remove('show');finaleSubtitleEl.classList.remove('show');await sleep(600);startStatic();}async function playFinaleEasterEgg(){stopStatic();const eeAudio=document.getElementById('easterEggAudio');window._suppressFireworkBeeps=true;if(eeAudio){try{eeAudio.currentTime=0;eeAudio.volume=0.6;const p=eeAudio.play();if(p&&p.catch)p.catch(function(){});}catch(e){}}finaleOverlay.classList.add('show');startFireworks();await sleep(400);await showFinaleName('CLIVEMAN','A Secret Look at the Crew');await sleep(600);const credits=[['BEN SMITH','PROJECT MANAGER'],['RYAN PERUSKI','LEAD DEVELOPER'],['AIDAN GAROFALO','SCRUM MASTER'],['GABE GILLIS','STORY DEVELOPER']];for(let i=0;i<credits.length;i++){await showFinaleName(credits[i][0],credits[i][1]);await sleep(700);}await showFinaleName('THANK YOU','FOR PEEKING');await sleep(1200);stopFireworks();finaleNameEl.classList.remove('show');finaleSubtitleEl.classList.remove('show');await sleep(600);finaleOverlay.classList.remove('show');if(eeAudio){try{eeAudio.pause();eeAudio.currentTime=0;}catch(e){}}window._suppressFireworkBeeps=false;window._easterEggCredits=false;if(cityEl&&document.body.contains(cityEl)){startCityGlimmer();startNoirMusic();}}