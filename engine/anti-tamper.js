/* ========================================================================
   CLIVEMAN 3.1  -  js/00-anti-tamper.js
   Right-click / shortcut / devtools blocking. Self-contained IIFE. Comment out the <script> line for this file to disable while developing.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

/* ═══════════════════════════════════════════════════════════════════════════
   LANGUAGE / TRANSLATION SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   ANTI-TAMPER
   ══════════════════════════════════════════════════════ */
(function(){
  /* ── Block right-click ── */
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); }, true);

  /* ── Block keyboard shortcuts ── */
  document.addEventListener('keydown', function(e){
    var k = e.key;
    // F12
    if(k === 'F12'){ e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl/Cmd combos
    if(e.ctrlKey || e.metaKey){
      var blocked = ['u','U','s','S','i','I','j','J','a','A'];
      if(blocked.indexOf(k) !== -1){ e.preventDefault(); e.stopPropagation(); return false; }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if(e.shiftKey && ['i','I','j','J','c','C'].indexOf(k) !== -1){
        e.preventDefault(); e.stopPropagation(); return false;
      }
    }
  }, true);

  /* ── DevTools size-change detection ── */
  var _devOpen = false;
  var _threshold = 200;
  function _checkDevTools(){
    var w = window.outerWidth - window.innerWidth;
    var h = window.outerHeight - window.innerHeight;
    var open = w > _threshold || h > _threshold;
    if(open && !_devOpen){
      _devOpen = true;
      /* Scramble the page just enough to break inspection without breaking play */
      document.title = '⚠ Access Denied';
      var body = document.body;
      if(body) body.style.filter = 'blur(8px)';
      var msg = document.createElement('div');
      msg.id = '_devblock';
      msg.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#000;color:#ff3333;font-family:monospace;font-size:28px;display:flex;align-items:center;justify-content:center;letter-spacing:2px;text-align:center;padding:20px;';
      msg.textContent = '[ ACCESS DENIED ]';
      document.body.appendChild(msg);
    } else if(!open && _devOpen){
      _devOpen = false;
      document.title = 'CLIVEMAN';
      var body = document.body;
      if(body) body.style.filter = '';
      var el = document.getElementById('_devblock');
      if(el) el.remove();
    }
  }
  /* Throttled devtools check - only runs every 2.5s to save mobile battery */
setInterval(_checkDevTools, 2500);

  /* ── Block view-source navigation ── */
  if(window.location && window.location.href && window.location.href.indexOf('view-source:') !== -1){
    document.documentElement.innerHTML = '';
  }
})();
