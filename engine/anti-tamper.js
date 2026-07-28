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
