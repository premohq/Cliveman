/* ========================================================================
   CLIVEMAN - engine/cinematic-state.js
   Consolidated from: engine/cutscene.js, engine/save-state.js
   Keep sections isolated and in this order; classic-script shared scope applies.
   ======================================================================== */

/* ===== BEGIN engine/cutscene.js ===== */
/* ============================================================================
   CLIVEMAN - engine/cutscene.js
   Shared cinematic transition layer. Every cutscene (the Buick night drives,
   the ASCII transit fallback, and anything future) enters and exits through
   the same fade-to-black — no more hard cuts where a fullscreen canvas slams
   into the terminal mid-sentence.

   API:
     await CUTSCENE.fadeIn(label?)  -> screen fades to black (~280ms); if a
                                       label is given it glows amber, centred,
                                       like a film title card, and holds ~600ms
     await CUTSCENE.fadeOut()       -> black lifts (~280ms)
   Both are idempotent-safe and resolve on a timer (never on transitionend),
   so a hidden tab or headless run can't hang the story. Speech is stopped on
   fadeIn — a scene change silences whoever was talking.
   ========================================================================== */
(function(){
'use strict';
if(typeof window==='undefined')return;

var FADE_MS=280, HOLD_MS=620;
var _el=null,_label=null;

function _ensure(){
  if(_el&&_el.isConnected)return _el;
  _el=document.createElement('div');
  _el.id='cutFade';
  _el.style.cssText='position:fixed;inset:0;background:#000;z-index:9000;'+
    'opacity:0;pointer-events:none;transition:opacity '+FADE_MS+'ms ease;'+
    'display:flex;align-items:center;justify-content:center;';
  _label=document.createElement('div');
  _label.style.cssText='font-family:"VT323",monospace;color:var(--amber,#ffb000);'+
    'font-size:clamp(22px,4.2vw,40px);letter-spacing:6px;text-align:center;'+
    'text-shadow:0 0 12px rgba(255,176,0,.75);opacity:0;transition:opacity 240ms ease;'+
    'padding:0 18px;';
  _el.appendChild(_label);
  document.body.appendChild(_el);
  return _el;
}
function _sleep(ms){if(typeof window.sleep==='function')return window.sleep(ms);return new Promise(function(r){setTimeout(r,ms);});}

var CUTSCENE={active:false};

CUTSCENE.fadeIn=async function(label){
  var el=_ensure();
  if(window.VOICE)VOICE.stop();          /* scene change: cut the talking */
  el.style.pointerEvents='auto';
  /* force a style flush so the transition always runs */
  void el.offsetWidth;
  el.style.opacity='1';
  CUTSCENE.active=true;
  await _sleep(FADE_MS+40);
  if(label){
    _label.textContent=(window.t?window.t(label):label);
    _label.style.opacity='1';
    await _sleep(HOLD_MS);
  }
};

CUTSCENE.fadeOut=async function(){
  if(!_el)return;
  _label.style.opacity='0';
  _label.textContent='';
  _el.style.opacity='0';
  _el.style.pointerEvents='none';
  CUTSCENE.active=false;
  await _sleep(FADE_MS+40);
};

window.CUTSCENE=CUTSCENE;
})();
/* ===== END engine/cutscene.js ===== */

/* ===== BEGIN engine/save-state.js ===== */
/* ========================================================================
   CLIVEMAN  -  engine/save-state.js
   Game state object, save-code encode/decode, restoreState, inventory (addItem / showInv).

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */
const state={
  inventory:[],checkpoint:0,roomId:0,savedRow:0,savedCol:0,
  called_bs_clemons:false,f2_badge:false,f3_poison:false,kw1_found:false,
  kw2_found:false,bevan_room_known:false,ch2_tnt:false,ch2_poison:false,
  resumeRoomId:-1,resumePos:null,resumeHeading:null,money:0,
  mechanicPaid:false,enemiesBeat:0,level:1,secretEnding:false,
  heading:0,atDriveStart:false,
};

/* The compact numeric code stays unchanged so every older .clive file and
   manually copied code remains valid. New file-only metadata is layered around
   it in the CLIVE1 payload below. */
function encodeSave(){
  const cp=state.checkpoint&0x7;
  const room=state.roomId&0xF;
  const row=state.savedRow&0xF;
  const col=state.savedCol&0xF;
  let flags=0;
  if(state.called_bs_clemons)flags|=1;
  if(state.f2_badge)flags|=2;
  if(state.f3_poison)flags|=4;
  if(state.kw1_found)flags|=8;
  if(state.kw2_found)flags|=16;
  if(state.bevan_room_known)flags|=32;
  if(state.ch2_tnt)flags|=64;
  if(state.ch2_poison)flags|=128;
  state.money=Math.max(0,Math.min(1023,state.money));
  const low=cp|(room<<3)|(row<<7)|(col<<11)|(flags<<15);
  const money=state.money&0x3FF;
  const mech=state.mechanicPaid?1:0;
  const drive=state.atDriveStart?1:0;
  const eb=Math.max(0,Math.min(127,state.enemiesBeat|0));
  const high=money|(mech<<10)|(drive<<11)|(eb<<12);
  return low+high*0x800000;
}

function decodeSave(data){
  let payload=null;
  let code=data;
  if(data&&typeof data==='object'&&!Array.isArray(data)){
    payload=data;
    if(payload.game!=null&&payload.game!=='CLIVEMAN')return null;
    code=payload.code;
  }
  if(typeof code==='string'&&/^\d+$/.test(code))code=parseInt(code,10);
  if(typeof code!=='number'||!isFinite(code)||code<0||code>0x3FFFFFFFFFF)return null;
  const low=code%0x800000;
  const high=Math.floor(code/0x800000);
  const cp=low&0x7;
  const room=(low>>3)&0xF;
  const row=(low>>7)&0xF;
  const col=(low>>11)&0xF;
  const flags=(low>>15)&0xFF;
  const money=high&0x3FF;
  const mech=(high>>10)&0x1;
  const drive=(high>>11)&0x1;
  const eb=(high>>12)&0x7F;
  if(cp<1||cp>7)return null;
  const heading=(payload&&Number.isInteger(payload.heading)&&payload.heading>=0&&payload.heading<=3)
    ?payload.heading:null;
  return{
    cp:cp,room:room,row:row,col:col,flags:flags,money:money,
    mech:mech,drive:drive,eb:eb,heading:heading,
    secretEnding:!!(payload&&payload.secretEnding)
  };
}

function restoreState(dec){
  state.checkpoint=dec.cp;
  state.roomId=dec.room;
  state.savedRow=dec.row;
  state.savedCol=dec.col;
  state.called_bs_clemons=!!(dec.flags&1);
  state.f2_badge=!!(dec.flags&2);
  state.f3_poison=!!(dec.flags&4);
  state.kw1_found=!!(dec.flags&8);
  state.kw2_found=!!(dec.flags&16);
  state.bevan_room_known=!!(dec.flags&32);
  state.ch2_tnt=!!(dec.flags&64);
  state.ch2_poison=!!(dec.flags&128);
  state.money=dec.money;
  state.mechanicPaid=!!dec.mech;
  state.atDriveStart=!!dec.drive;
  state.enemiesBeat=dec.eb||0;
  state.secretEnding=!!dec.secretEnding;
  state.heading=Number.isInteger(dec.heading)?dec.heading:0;
  (function(){
    let lvl=1,threshold=2,e=state.enemiesBeat;
    while(e>=threshold){lvl++;threshold*=2;}
    state.level=lvl;
  })();
  state.resumeRoomId=dec.room;
  state.resumePos=[dec.row,dec.col];
  state.resumeHeading=Number.isInteger(dec.heading)?dec.heading:null;
  const inv=[];
  if(dec.cp>=2)inv.push('factory map');
  if(state.f2_badge)inv.push('factory access badge');
  if(state.f3_poison)inv.push('rat poison (burnt box)');
  if(dec.cp>=3)inv.push('apartment building map');
  if(state.ch2_tnt)inv.push('undetonated TNT');
  if(state.ch2_poison)inv.push('rat poison (crime scene)');
  state.inventory=inv;
}

window.showSaveCode=function showSaveCode(){
  const code=encodeSave();
  const payload={
    v:2,code:code,heading:(state.heading|0)&3,
    secretEnding:!!state.secretEnding,ts:Date.now(),
    game:'CLIVEMAN',ver:window.CLIVEMAN_VERSION
  };
  const fileContent='CLIVE1:'+btoa(JSON.stringify(payload));
  const blob=new Blob([fileContent],{type:'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='cliveman_save.clive';a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(url);document.body.removeChild(a);},1000);
  blank();
  const box='  +==============================================+\n'
    +'  |   SAVE FILE WRITTEN                          |\n'
    +'  |   cliveman_save.clive downloaded to disk.    |\n'
    +'  |   Load it at the title screen to resume      |\n'
    +'  |   from exactly where you are standing.       |\n'
    +'  +==============================================+';
  instantLine(box,'savebox');blank();return box;
};

function addItem(item){
  if(!state.inventory.includes(item)){
    state.inventory.push(item);blank();
    instantLine('  *** ITEM OBTAINED: '+item.toUpperCase()+' ***','sys');
    showInv();
  }
}
function showInv(){
  if(state.inventory.length===0)instantLine('"Your pockets are empty."','narration');
  else instantLine('"Inventory: '+state.inventory.join(', ')+'"','narration');
}
/* ===== END engine/save-state.js ===== */
