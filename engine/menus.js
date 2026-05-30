/* ========================================================================
   CLIVEMAN 3.1  -  js/17-menus.js
   Title buttons, settings modal, pause menu, quit / save-and-quit flow.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */


/* ── showTitleButtons: renders attractive title screen buttons ── */
function showTitleButtons(){
  clearChoices();
  choicePanelEl.classList.add('active');
  return new Promise(function(resolve){
    /* Row wrapper to lay buttons horizontally with gear in middle */
    const rowWrap=document.createElement('div');
    rowWrap.style.cssText='display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;width:100%;';

    const newBtn=document.createElement('button');
    newBtn.type='button';newBtn.className='title-btn new-btn';
    newBtn.innerHTML='&#x25B6; '+(window.t?window.t('START NEW GAME'):'START NEW GAME');
    newBtn.style.cssText='flex:1 1 240px;max-width:320px;margin:0;';
    newBtn.addEventListener('click',function(e){
      e.preventDefault();ensureAudio();playKeyClick();
      clearChoices();instantLine('C:\\DUDLEY> '+(window.t?window.t('NEW GAME'):'NEW GAME'),'input-echo');
      document.body.classList.add('game-started');resolve('new');
    });
    window._titleResolve=resolve;

    /* Gear / settings button */
    const gearBtn=document.createElement('button');
    gearBtn.type='button';gearBtn.className='title-btn gear-btn';
    gearBtn.innerHTML='&#x2699;';
    gearBtn.style.cssText='flex:0 0 64px;min-width:64px;max-width:64px;font-size:32px;padding:10px 0;margin:0;border-color:var(--green-dim);color:var(--green);';
    gearBtn.setAttribute('aria-label',window.t?window.t('SETTINGS'):'SETTINGS');
    gearBtn.addEventListener('click',function(e){
      e.preventDefault();ensureAudio();playKeyClick();
      showSettingsModal();
    });

    const loadBtn=document.createElement('button');
    loadBtn.type='button';loadBtn.className='title-btn';
    loadBtn.innerHTML='&#x1F4C2; '+(window.t?window.t('LOAD SAVE STATE'):'LOAD SAVE STATE');
    loadBtn.style.cssText='flex:1 1 240px;max-width:320px;margin:0;';
    loadBtn.addEventListener('click',function(e){
      e.preventDefault();ensureAudio();playKeyClick();
      clearChoices();instantLine('C:\\DUDLEY> '+(window.t?window.t('LOAD SAVE'):'LOAD SAVE'),'input-echo');
      resolve('load');
    });

    rowWrap.appendChild(newBtn);
    rowWrap.appendChild(gearBtn);
    rowWrap.appendChild(loadBtn);
    choicePanelEl.appendChild(rowWrap);
    requestAnimationFrame(function(){scrollScreenToBottom();});
  });
}

/* ═══ Settings Modal ═══ */
function showSettingsModal(){
  /* Remove any existing modal */
  var existing=document.getElementById('settingsModal');
  if(existing)existing.remove();

  var overlay=document.createElement('div');
  overlay.id='settingsModal';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;';

  var box=document.createElement('div');
  box.style.cssText='background:#020a04;border:2px solid var(--amber);box-shadow:0 0 30px rgba(255,176,0,0.5),inset 0 0 20px rgba(6,43,16,0.6);padding:28px 32px;max-width:480px;width:100%;font-family:"VT323",monospace;color:var(--green);';

  var heading=document.createElement('div');
  heading.style.cssText='color:var(--amber);font-size:28px;letter-spacing:4px;text-shadow:0 0 8px var(--amber);text-align:center;margin-bottom:18px;border-bottom:1px dashed var(--green-dim);padding-bottom:12px;';
  heading.innerHTML='&#x2699; '+(window.t?window.t('SETTINGS'):'SETTINGS');
  box.appendChild(heading);

  var langLabel=document.createElement('div');
  langLabel.style.cssText='color:var(--green-bright);font-size:18px;letter-spacing:2px;margin-bottom:10px;text-shadow:0 0 4px var(--green);';
  langLabel.textContent=(window.t?window.t('LANGUAGE'):'LANGUAGE')+':';
  box.appendChild(langLabel);

  var langs=[
    {code:'en', label:'ENGLISH',    native:'English'},
    {code:'fr', label:'FRENCH',     native:'Français'},
    {code:'es', label:'SPANISH',    native:'Español'},
    {code:'zh', label:'CHINESE',    native:'中文'},
    {code:'pt', label:'PORTUGUESE', native:'Português'},
    {code:'ru', label:'RUSSIAN',    native:'Русский'},
    {code:'hi', label:'HINDI',      native:'हिन्दी'},
    {code:'ar', label:'ARABIC',     native:'العربية'}
  ];
  var langGrid=document.createElement('div');
  langGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:22px;';
  langs.forEach(function(L){
    var btn=document.createElement('button');
    btn.type='button';
    var active=(window._lang===L.code);
    btn.style.cssText='background:'+(active?'rgba(255,176,0,0.2)':'transparent')+';border:2px solid '+(active?'var(--amber)':'var(--green-dim)')+';color:'+(active?'var(--amber)':'var(--green)')+';font-family:"VT323",monospace;font-size:20px;padding:10px 12px;border-radius:6px;cursor:pointer;letter-spacing:1px;text-shadow:0 0 4px currentColor;transition:all 0.15s;';
    btn.innerHTML=L.native+(active?' &#x2713;':'');
    btn.addEventListener('mouseenter',function(){if(!active){btn.style.borderColor='var(--green)';btn.style.color='var(--green-bright)';}});
    btn.addEventListener('mouseleave',function(){if(!active){btn.style.borderColor='var(--green-dim)';btn.style.color='var(--green)';}});
    btn.addEventListener('click',function(e){
      e.preventDefault();ensureAudio();playKeyClick();
      if(window.setLanguage)window.setLanguage(L.code);
      overlay.remove();
      /* Rebuild title screen with new language */
      if(typeof titleScreen==='function' && document.body.contains(choicePanelEl)){
        /* Re-render just the current screen's buttons */
        clearChoices();
        /* Force a reflow by calling the resolve with special signal handled below */
        if(window._titleResolve)window._titleResolve('__refresh__');
      }
    });
    langGrid.appendChild(btn);
  });
  box.appendChild(langGrid);

  var closeBtn=document.createElement('button');
  closeBtn.type='button';
  closeBtn.style.cssText='display:block;width:100%;background:transparent;border:2px solid var(--green);color:var(--green);font-family:"VT323",monospace;font-size:22px;padding:12px;border-radius:6px;cursor:pointer;letter-spacing:2px;text-shadow:0 0 4px var(--green);';
  closeBtn.textContent=window.t?window.t('CLOSE'):'CLOSE';
  closeBtn.addEventListener('click',function(e){
    e.preventDefault();ensureAudio();playKeyClick();
    overlay.remove();
  });
  box.appendChild(closeBtn);

  /* Click outside to close */
  overlay.addEventListener('click',function(e){
    if(e.target===overlay){overlay.remove();}
  });
  /* Escape to close */
  var escHandler=function(e){
    if(e.key==='Escape'){overlay.remove();document.removeEventListener('keydown',escHandler);}
  };
  document.addEventListener('keydown',escHandler);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

/* ── Desktop nav button wiring ── */

/* ═══ Pause Menu ═══ */
window._pauseQuitResolve = null;

function showPauseMenu(){
  var existing = document.getElementById('pauseModal');
  if(existing){ existing.remove(); return; }

  var T = window.t || function(s){ return s; };
  var overlay = document.createElement('div');
  overlay.id = 'pauseModal';

  var box = document.createElement('div');
  box.className = 'pause-box';

  var title = document.createElement('div');
  title.className = 'pause-title';
  title.textContent = '☰ ' + T('PAUSED');
  box.appendChild(title);

  var btnRow = document.createElement('div');
  btnRow.className = 'pause-btn-row';

  /* Resume */
  var resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.className = 'pm-btn';
  resumeBtn.textContent = '▶ ' + T('RESUME');
  resumeBtn.addEventListener('click', function(e){
    e.preventDefault(); if(typeof playKeyClick==='function')playKeyClick();
    overlay.remove();
  });
  btnRow.appendChild(resumeBtn);

  /* Mute / Unmute toggle */
  var muteBtn = document.createElement('button');
  muteBtn.type = 'button';
  muteBtn.className = 'pm-btn';
  function _refreshMuteLabel(){
    var m = (typeof isMuted === 'function') && isMuted();
    muteBtn.textContent = m ? ('🔇 ' + T('UNMUTE')) : ('🔊 ' + T('MUTE'));
  }
  _refreshMuteLabel();
  muteBtn.addEventListener('click', function(e){
    e.preventDefault();
    if(typeof ensureAudio === 'function') ensureAudio();
    if(typeof toggleMute === 'function') toggleMute();
    if(typeof playKeyClick === 'function') playKeyClick();
    _refreshMuteLabel();
  });
  btnRow.appendChild(muteBtn);

  /* Save & Quit */
  var saveQuitBtn = document.createElement('button');
  saveQuitBtn.type = 'button';
  saveQuitBtn.className = 'pm-btn';
  saveQuitBtn.textContent = '💾 ' + T('SAVE & QUIT');
  saveQuitBtn.addEventListener('click', function(e){
    e.preventDefault(); if(typeof playKeyClick==='function')playKeyClick();
    /* Trigger save then quit */
    overlay.remove();
    doSaveAndQuit();
  });
  btnRow.appendChild(saveQuitBtn);

  /* Quit to Title */
  var quitBtn = document.createElement('button');
  quitBtn.type = 'button';
  quitBtn.className = 'pm-btn danger';
  quitBtn.textContent = '✕ ' + T('QUIT TO TITLE');
  quitBtn.addEventListener('click', function(e){
    e.preventDefault(); if(typeof playKeyClick==='function')playKeyClick();
    /* Show confirmation */
    showQuitConfirm(overlay);
  });
  btnRow.appendChild(quitBtn);

  box.appendChild(btnRow);
  overlay.appendChild(box);

  /* Click outside to close */
  overlay.addEventListener('click', function(e){
    if(e.target === overlay){ overlay.remove(); }
  });
  /* Escape to close */
  var escH = function(e){
    if(e.key === 'Escape'){ overlay.remove(); document.removeEventListener('keydown', escH); }
  };
  document.addEventListener('keydown', escH);

  document.body.appendChild(overlay);
}

function showQuitConfirm(parentOverlay){
  var T = window.t || function(s){ return s; };

  /* Replace the box content with confirmation */
  var box = parentOverlay.querySelector('.pause-box');
  box.innerHTML = '';

  var title = document.createElement('div');
  title.className = 'pause-title';
  title.textContent = '⚠ ' + T('QUIT TO TITLE');
  box.appendChild(title);

  var msg = document.createElement('div');
  msg.style.cssText = 'color:var(--green);font-size:18px;text-align:center;margin-bottom:18px;line-height:1.4;';
  msg.textContent = T('Are you sure? Unsaved progress will be lost.');
  box.appendChild(msg);

  var btnRow = document.createElement('div');
  btnRow.className = 'pause-btn-row';

  var yesBtn = document.createElement('button');
  yesBtn.type = 'button';
  yesBtn.className = 'pm-btn danger';
  yesBtn.textContent = T('YES, QUIT');
  yesBtn.addEventListener('click', function(e){
    e.preventDefault(); if(typeof playKeyClick==='function')playKeyClick();
    parentOverlay.remove();
    doQuitToTitle();
  });
  btnRow.appendChild(yesBtn);

  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'pm-btn';
  cancelBtn.textContent = T('CANCEL');
  cancelBtn.addEventListener('click', function(e){
    e.preventDefault(); if(typeof playKeyClick==='function')playKeyClick();
    parentOverlay.remove();
  });
  btnRow.appendChild(cancelBtn);

  box.appendChild(btnRow);
}

function doQuitToTitle(){
  /* Reset game state and go back to title */
  /* Stop any animations */
  if(typeof stopCityGlimmer === 'function') stopCityGlimmer();
  if(window._rcAnim){ cancelAnimationFrame(window._rcAnim); window._rcAnim = null; }

  /* Remove nav mode */
  document.body.classList.remove('nav-mode','can-move','game-started');

  /* Clear map area */
  var mapArea = document.getElementById('mapArea');
  if(mapArea) mapArea.innerHTML = '';

  /* Signal any pending promises to abort */
  window._pauseQuitSignal = true;

  /* Force reload to cleanly reset all state */
  window.location.reload();
}

function doSaveAndQuit(){
  /* Trigger save file download then quit */
  if(typeof showSaveCode === 'function'){
    try{ showSaveCode(); }catch(e){}
  }
  /* Brief delay so download starts, then reload to title */
  setTimeout(function(){
    doQuitToTitle();
  }, 800);
}

/* ─── Wire pause button click ─── */
document.addEventListener('DOMContentLoaded', function(){
  var pauseBtn = document.getElementById('pauseBtn');
  if(pauseBtn){
    pauseBtn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      if(typeof ensureAudio === 'function') ensureAudio();
      if(typeof playKeyClick === 'function') playKeyClick();
      showPauseMenu();
    });
  }
});