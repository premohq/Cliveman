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
function _sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}

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
