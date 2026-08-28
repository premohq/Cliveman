/* ========================================================================
   CLIVEMAN - engine/foundation.js
   Consolidated from: engine/anti-tamper.js, engine/dom-refs.js
   Keep sections isolated and in this order; classic-script shared scope applies.
   ======================================================================== */

/* ===== BEGIN engine/anti-tamper.js ===== */
/* ========================================================================
   CLIVEMAN  -  engine/anti-tamper.js
   Casual tamper deterrence: right-click and devtools-shortcut blocking.
   Self-contained IIFE with no game dependencies - commenting out its
   <script> line in index.html while developing is genuinely safe.
   (The language system that used to live in this file is now
   engine/i18n/core.js, so disabling this no longer breaks anything.)

   Deliberately NOT here: the old window-size devtools detector that
   blurred the page behind an ACCESS DENIED banner. It false-positived
   on browser zoom and OS display scaling, punishing innocent players.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

(function(){
  /* ── Block right-click ── */
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); }, true);

  /* ── Block devtools / view-source keyboard shortcuts ──
     Note: plain editing combos (Ctrl/Cmd+A, +C, +V) are left alone so the
     command input still behaves like a normal text field. */
  document.addEventListener('keydown', function(e){
    var k = e.key;
    // F12
    if(k === 'F12'){ e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl/Cmd combos
    if(e.ctrlKey || e.metaKey){
      var blocked = ['u','U','s','S','i','I','j','J'];
      if(blocked.indexOf(k) !== -1){ e.preventDefault(); e.stopPropagation(); return false; }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if(e.shiftKey && ['i','I','j','J','c','C'].indexOf(k) !== -1){
        e.preventDefault(); e.stopPropagation(); return false;
      }
    }
  }, true);

  /* ── Block view-source navigation ── */
  if(window.location && window.location.href && window.location.href.indexOf('view-source:') !== -1){
    document.documentElement.innerHTML = '';
  }
})();
/* ===== END engine/anti-tamper.js ===== */

/* ===== BEGIN engine/dom-refs.js ===== */
/* ========================================================================
   CLIVEMAN  -  engine/dom-refs.js
   Game-wide constants (CLIVEMAN_VERSION), the terminal fault trap,
   IS_MOBILE flag, cached DOM element references, and shared mutable
   state flags (typing, waitingFor, etc.).

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

/* ── Single source of truth for the game version ──
   Referenced by the title screen, the save-file payload, and the tab
   title. Bump it HERE (and only here) on any significant change. */
window.CLIVEMAN_VERSION='2.0.20';
document.title='Cliveman '+window.CLIVEMAN_VERSION;

/* Shared speaker-prefix grammar. Chinese translations use the full-width
   colon (：) with no following space, while the English source uses ': '.
   Keeping one regex here prevents the voice, color and name-plate parsers
   from drifting apart again. Not global: repeated exec()/replace() calls are
   intentionally stateless. */
window.CLIVE_SPEAKER_RE=/^\s*([^:"：]{2,30})[:：]\s*/;

/* ── Terminal fault trap ──
   An uncaught error used to mean a silent freeze: the terminal just
   stopped answering with no clue why. Now it prints a diegetic red
   [ SYSTEM FAULT ] line so the player knows the machine - not the
   mystery - is stuck. Capped so a looping error can't flood the log. */
(function(){
  var shown=0;
  function fault(msg){
    if(shown>=3)return; shown++;
    try{
      var scr=document.getElementById('screen');
      if(!scr)return;
      var div=document.createElement('div');
      div.className='line';
      div.style.cssText='color:#ff5555;text-shadow:0 0 6px rgba(255,60,60,0.8)';
      div.textContent='  [ SYSTEM FAULT ] '+msg;
      scr.appendChild(div);
      var div2=document.createElement('div');
      div2.className='line';
      div2.style.cssText='color:#ff9999';
      div2.textContent='  The terminal hit a bad instruction. SAVE if you can, then reload the page.';
      scr.appendChild(div2);
      try{div2.scrollIntoView({block:'nearest'});}catch(e){}
    }catch(e){}
  }
  window.addEventListener('error',function(e){ if(e&&e.message)fault(e.message); });
  window.addEventListener('unhandledrejection',function(e){
    var r=e&&e.reason, m=(r&&r.message)||String(r||'');
    if(m==='END')return; /* END is deliberate control flow, not a fault */
    fault(m);
  });
})();

const IS_MOBILE=window.matchMedia('(pointer: coarse)').matches||('ontouchstart'in window);window.IS_MOBILE=IS_MOBILE;/* top-level const isn't a window prop; the drive bundle reads window.IS_MOBILE (falling back to innerWidth<700, which misfires in phone landscape -> desktop drive with no touch controls) */const screenEl=document.getElementById('screen');const mapAreaEl=document.getElementById('mapArea');const cmdListEl=document.getElementById('cmdList');const choicePanelEl=document.getElementById('choicePanel');const input=document.getElementById('cmd');const bootEl=document.getElementById('boot');const navCheckBtn=document.getElementById('navCheckBtn');const navInvBtn=document.getElementById('navInvBtn');const navSaveBtn=document.getElementById('navSaveBtn');const fsBtn=document.getElementById('fsBtn');let typing=false;let waitingFor=null;let skipRequested=false;let arrowHandler=null;let swipeHandler=null;let checkFn=null;let movementAllowed=false;let navJustExited=false;
/* ===== END engine/dom-refs.js ===== */
