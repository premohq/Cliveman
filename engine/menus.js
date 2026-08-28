/* ========================================================================
   CLIVEMAN  -  engine/menus.js
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
    requestAnimationFrame(function(){scrollScreenToBottom();if(!IS_MOBILE&&document.activeElement===input){try{newBtn.focus();}catch(e){}}});
  });
}

/* ═══ Settings Modal ═══ */
function showSettingsModal(){
  /* Remove any existing modal */
  var existing=document.getElementById('settingsModal');
  if(existing){if(existing._closeSettings)existing._closeSettings();else existing.remove();}
  var opener=document.activeElement;
  var escHandler=null;

  var overlay=document.createElement('div');
  overlay.id='settingsModal';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','settingsHeading');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;';

  var box=document.createElement('div');
  box.style.cssText='background:#020a04;border:2px solid var(--amber);box-shadow:0 0 30px rgba(255,176,0,0.5),inset 0 0 20px rgba(6,43,16,0.6);padding:28px 32px;max-width:480px;width:100%;font-family:"VT323",monospace;color:var(--green);';

  var heading=document.createElement('div');
  heading.id='settingsHeading';
  heading.style.cssText='color:var(--amber);font-size:28px;letter-spacing:4px;text-shadow:0 0 8px var(--amber);text-align:center;margin-bottom:18px;border-bottom:1px dashed var(--green-dim);padding-bottom:12px;';
  heading.innerHTML='&#x2699; '+(window.t?window.t('SETTINGS'):'SETTINGS');
  box.appendChild(heading);

  function closeSettings(){
    if(escHandler)document.removeEventListener('keydown',escHandler);
    if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
    if(opener&&opener.isConnected){try{opener.focus();}catch(e){}}
  }
  overlay._closeSettings=closeSettings;

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
      closeSettings();
      /* setLanguage now fetches the dictionary on demand, so the title rebuild
         has to happen in its callback rather than on the next line. */
      function _repaint(){
        if(typeof titleScreen==='function' && document.body.contains(choicePanelEl)){
          /* Re-render just the current screen's buttons */
          clearChoices();
          /* Force a reflow by calling the resolve with special signal handled below */
          if(window._titleResolve)window._titleResolve('__refresh__');
        }
      }
      if(window.setLanguage)window.setLanguage(L.code,_repaint); else _repaint();
    });
    langGrid.appendChild(btn);
  });
  box.appendChild(langGrid);

  /* ---- character voices ---- */
  var voxLabel=document.createElement('div');
  voxLabel.style.cssText='color:var(--green-bright);font-size:18px;letter-spacing:2px;margin-bottom:10px;text-shadow:0 0 4px var(--green);';
  voxLabel.textContent=(window.t?window.t('VOICE SFX'):'VOICE SFX')+':';
  box.appendChild(voxLabel);
  var voxBtn=document.createElement('button');
  voxBtn.type='button';
  function _voxStyle(){
    var on=window.VOICE&&VOICE.supported&&VOICE.enabled;
    voxBtn.style.cssText='width:100%;background:'+(on?'rgba(255,176,0,0.2)':'transparent')+';border:2px solid '+(on?'var(--amber)':'var(--green-dim)')+';color:'+(on?'var(--amber)':'var(--green)')+';font-family:"VT323",monospace;font-size:20px;padding:10px 12px;border-radius:6px;cursor:pointer;letter-spacing:1px;text-shadow:0 0 4px currentColor;transition:all 0.15s;margin-bottom:22px;';
    if(!window.VOICE||!VOICE.supported){voxBtn.textContent=(window.t?window.t('NOT SUPPORTED HERE'):'NOT SUPPORTED HERE');voxBtn.disabled=true;voxBtn.style.opacity='0.45';}
    else voxBtn.textContent=on?('\uD83D\uDD0A '+(window.t?window.t('VOICE SFX: ON'):'VOICE SFX: ON')):('\uD83D\uDD07 '+(window.t?window.t('VOICE SFX: MUTED'):'VOICE SFX: MUTED'));
  }
  _voxStyle();
  voxBtn.addEventListener('click',function(e){
    e.preventDefault();
    if(typeof ensureAudio==='function')ensureAudio();
    if(window.VOICE)VOICE.toggle();
    if(typeof playKeyClick==='function')playKeyClick();
    _voxStyle();
  });
  box.appendChild(voxBtn);

  var closeBtn=document.createElement('button');
  closeBtn.type='button';
  closeBtn.setAttribute('data-pad-back','1');
  closeBtn.style.cssText='display:block;width:100%;background:transparent;border:2px solid var(--green);color:var(--green);font-family:"VT323",monospace;font-size:22px;padding:12px;border-radius:6px;cursor:pointer;letter-spacing:2px;text-shadow:0 0 4px var(--green);';
  closeBtn.textContent=window.t?window.t('CLOSE'):'CLOSE';
  closeBtn.addEventListener('click',function(e){
    e.preventDefault();ensureAudio();playKeyClick();
    closeSettings();
  });
  box.appendChild(closeBtn);

  /* Click outside to close */
  overlay.addEventListener('click',function(e){
    if(e.target===overlay){closeSettings();}
  });
  /* Escape to close */
  escHandler=function(e){
    if(e.key==='Escape'){e.preventDefault();closeSettings();}
  };
  document.addEventListener('keydown',escHandler);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  requestAnimationFrame(function(){var first=box.querySelector('button:not([disabled])');if(first){try{first.focus();}catch(e){}}});
}

/* ── Desktop nav button wiring ── */

/* ═══ Pause Menu ═══ */
window._pauseQuitResolve = null;

function showPauseMenu(){
  var existing=document.getElementById('pauseModal');
  if(existing){
    if(existing._closePause)existing._closePause(false);
    else existing.remove();
    return;
  }

  var T=window.t||function(x){return x;};
  var opener=document.activeElement;
  var escH=null;
  var wasMovementAllowed=(typeof movementAllowed!=='undefined')&&!!movementAllowed;
  var overlay=document.createElement('div');
  overlay.id='pauseModal';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','pauseHeading');

  function closePause(keepPaused){
    if(escH)document.removeEventListener('keydown',escH);
    if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
    if(!keepPaused){
      if(typeof window.setGamePaused==='function')window.setGamePaused(false);
      else window._gamePaused=false;
      if(wasMovementAllowed&&document.body.classList.contains('nav-mode')&&typeof setMovementAllowed==='function')setMovementAllowed(true);
      if(opener&&opener.isConnected){try{opener.focus();}catch(e){}}
      else if(typeof input!=='undefined'&&input){try{input.focus();}catch(e){}}
    }
  }
  overlay._closePause=closePause;

  if(typeof window.setGamePaused==='function')window.setGamePaused(true);
  else window._gamePaused=true;
  if(wasMovementAllowed&&typeof setMovementAllowed==='function')setMovementAllowed(false);
  if(window._fm)window._fm.held={};
  try{if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();}catch(e){}
  if(window.VOICE&&VOICE.stop)VOICE.stop();

  var box=document.createElement('div');
  box.className='pause-box';

  var title=document.createElement('div');
  title.id='pauseHeading';
  title.className='pause-title';
  title.textContent='☰ '+T('PAUSED');
  box.appendChild(title);

  var btnRow=document.createElement('div');
  btnRow.className='pause-btn-row';

  var resumeBtn=document.createElement('button');
  resumeBtn.type='button';resumeBtn.className='pm-btn';resumeBtn.setAttribute('data-pad-back','1');resumeBtn.textContent='▶ '+T('RESUME');
  resumeBtn.addEventListener('click',function(e){e.preventDefault();if(typeof playKeyClick==='function')playKeyClick();closePause(false);});
  btnRow.appendChild(resumeBtn);

  var muteBtn=document.createElement('button');
  muteBtn.type='button';muteBtn.className='pm-btn';
  function refreshMuteLabel(){var m=(typeof isMuted==='function')&&isMuted();muteBtn.textContent=m?('🔇 '+T('UNMUTE')):('🔊 '+T('MUTE'));}
  refreshMuteLabel();
  muteBtn.addEventListener('click',function(e){e.preventDefault();if(typeof ensureAudio==='function')ensureAudio();if(typeof toggleMute==='function')toggleMute();if(typeof playKeyClick==='function')playKeyClick();refreshMuteLabel();});
  btnRow.appendChild(muteBtn);

  var voiceBtn=document.createElement('button');
  voiceBtn.type='button';voiceBtn.className='pm-btn';
  function refreshVoiceLabel(){
    if(!window.VOICE||!VOICE.supported){voiceBtn.textContent='🔕 '+T('VOICE N/A');voiceBtn.disabled=true;voiceBtn.style.opacity='0.45';return;}
    voiceBtn.textContent=VOICE.enabled?('🔊 '+T('VOICE SFX: ON')):('🔇 '+T('VOICE SFX: MUTED'));
  }
  refreshVoiceLabel();
  voiceBtn.addEventListener('click',function(e){e.preventDefault();if(typeof ensureAudio==='function')ensureAudio();if(window.VOICE)VOICE.toggle();if(typeof playKeyClick==='function')playKeyClick();refreshVoiceLabel();});
  btnRow.appendChild(voiceBtn);

  var saveQuitBtn=document.createElement('button');
  saveQuitBtn.type='button';saveQuitBtn.className='pm-btn';saveQuitBtn.textContent='💾 '+T('SAVE & QUIT');
  saveQuitBtn.addEventListener('click',function(e){e.preventDefault();if(typeof playKeyClick==='function')playKeyClick();closePause(true);doSaveAndQuit();});
  btnRow.appendChild(saveQuitBtn);

  var quitBtn=document.createElement('button');
  quitBtn.type='button';quitBtn.className='pm-btn danger';quitBtn.textContent='✕ '+T('QUIT TO TITLE');
  quitBtn.addEventListener('click',function(e){e.preventDefault();if(typeof playKeyClick==='function')playKeyClick();showQuitConfirm(overlay,closePause);});
  btnRow.appendChild(quitBtn);

  box.appendChild(btnRow);overlay.appendChild(box);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closePause(false);});
  escH=function(e){if(e.key==='Escape'){e.preventDefault();closePause(false);}};
  document.addEventListener('keydown',escH);
  document.body.appendChild(overlay);
  requestAnimationFrame(function(){try{resumeBtn.focus();}catch(e){}});
}

function showQuitConfirm(parentOverlay,closePause){
  var T=window.t||function(s){return s;};
  var box=parentOverlay.querySelector('.pause-box');
  box.innerHTML='';

  var title=document.createElement('div');
  title.id='pauseHeading';title.className='pause-title';title.textContent='⚠ '+T('QUIT TO TITLE');
  box.appendChild(title);

  var msg=document.createElement('div');
  msg.style.cssText='color:var(--green);font-size:18px;text-align:center;margin-bottom:18px;line-height:1.4;';
  msg.textContent=T('Are you sure? Unsaved progress will be lost.');
  box.appendChild(msg);

  var btnRow=document.createElement('div');btnRow.className='pause-btn-row';
  var yesBtn=document.createElement('button');yesBtn.type='button';yesBtn.className='pm-btn danger';yesBtn.textContent=T('YES, QUIT');
  yesBtn.addEventListener('click',function(e){e.preventDefault();if(typeof playKeyClick==='function')playKeyClick();closePause(true);doQuitToTitle();});
  btnRow.appendChild(yesBtn);

  var cancelBtn=document.createElement('button');cancelBtn.type='button';cancelBtn.className='pm-btn';cancelBtn.setAttribute('data-pad-back','1');cancelBtn.textContent=T('CANCEL');
  cancelBtn.addEventListener('click',function(e){e.preventDefault();if(typeof playKeyClick==='function')playKeyClick();closePause(false);});
  btnRow.appendChild(cancelBtn);box.appendChild(btnRow);
  requestAnimationFrame(function(){try{cancelBtn.focus();}catch(e){}});
}

function doQuitToTitle(){
  /* Reset game state and go back to title */
  /* Stop any animations */
  if(typeof stopCityGlimmer === 'function') stopCityGlimmer();
  if(window._rcAnim){ cancelAnimationFrame(window._rcAnim); window._rcAnim = null; }

  /* Remove nav mode */
  document.body.classList.remove('nav-mode','can-move','game-started');
  if(window.STORYART)STORYART.clear();

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

/* ===== merged from input-extras.js (gamepad/cheat-console input) ===== */
/* ========================================================================
   CLIVEMAN  -  engine/menus.js (input-extras section)
   Extra input IIFEs: gamepad/XInput support, tilde cheat console, Konami / D-E-V sequences.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */


(function(){
  function wireDesk(){
    const dCheck=document.getElementById('deskCheckBtn');
    const dSave=document.getElementById('deskSaveBtn');
    const dInv=document.getElementById('deskInvBtn');
    if(!dCheck||!dSave||!dInv)return;
    dCheck.addEventListener('click',function(e){e.preventDefault();ensureAudio();playKeyClick();if(movementAllowed&&checkFn)checkFn();});
    dSave.addEventListener('click',function(e){e.preventDefault();ensureAudio();playKeyClick();showSaveCode();});
    dInv.addEventListener('click',function(e){e.preventDefault();ensureAudio();playKeyClick();showInv();});
    [dCheck,dSave,dInv].forEach(function(b){b.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireDesk);
  else wireDesk();
})();

/* ── Tilde ~ key: show/hide cheat input in nav-mode ── */
(function(){
  let inputVisible=false;
  const inputRowEl=document.getElementById('inputRow');
  window.addEventListener('keydown',function(e){
    if(e.key==='`'||e.key==='~'){
      if(!document.body.classList.contains('nav-mode'))return;
      e.preventDefault();
      inputVisible=!inputVisible;
      if(inputRowEl){inputRowEl.style.display=inputVisible?'flex':'none';}
      if(inputVisible){const cmdEl=document.getElementById('cmd');if(cmdEl)cmdEl.focus();}
    }
  });
})();

/* ── XInput / Gamepad support ── */
(function(){
  let padState={buttons:new Array(18).fill(false),axes:[0,0,0,0]};
  let padLoopId=null;
  let padRepeat={};
  const DELAY=380,RATE=130;
  const BTN_A=0,BTN_B=1,BTN_X=2,BTN_Y=3;
  const BTN_LB=4,BTN_RB=5;
  const BTN_BACK=8;
  const BTN_DU=12,BTN_DD=13,BTN_DL=14,BTN_DR=15;

  let padFocusIdx=-1;

  /* ── Toast popup ── */
  function showPadToast(msg){
    const t=document.getElementById('padToast');
    if(!t)return;
    t.innerHTML=msg;
    t.classList.remove('fade');
    t.classList.add('show');
    setTimeout(function(){t.classList.add('fade');},2000);
    setTimeout(function(){t.classList.remove('show','fade');},2600);
  }

  /* ── Menu focus helpers ── */
  function getInteractiveBtns(){
    var modal=document.querySelector('#pauseModal,#settingsModal');
    if(modal)return [].slice.call(modal.querySelectorAll('button:not([disabled])'));
    return [].slice.call(document.querySelectorAll('.title-btn, .choice-btn'));
  }
  function setPadFocus(idx){
    const btns=getInteractiveBtns();
    btns.forEach(function(b,i){
      if(i===idx)b.classList.add('pad-focus');
      else b.classList.remove('pad-focus');
    });
    padFocusIdx=idx;
    if(btns[idx])btns[idx].scrollIntoView({block:'nearest'});
  }
  function clearPadFocus(){
    document.querySelectorAll('.pad-focus').forEach(function(b){b.classList.remove('pad-focus');});
    padFocusIdx=-1;
  }
  function activateFocused(){
    const btns=getInteractiveBtns();
    if(padFocusIdx>=0&&btns[padFocusIdx]){
      ensureAudio();playKeyClick();btns[padFocusIdx].click();clearPadFocus();return true;
    }
    if(btns.length===1){ensureAudio();playKeyClick();btns[0].click();return true;}
    return false;
  }

  /* ── padLog (hint bar) ── */
  function padLog(msg){
    const ph=document.getElementById('padPrompt');
    if(ph)ph.innerHTML=msg;
  }

  /* ── Axis → direction (left stick) ── */
  function axisDir(axes){
    const x=axes[0]||0,y=axes[1]||0,dead=0.35;
    if(Math.abs(x)<dead&&Math.abs(y)<dead)return null;
    if(Math.abs(y)>Math.abs(x))return y<0?'forward':'back';
    return x<0?'turn_left':'turn_right';
  }

  /* ── Screen scroll (story mode) ── */
  function scrollStory(dir){
    const s=document.getElementById('screen');
    if(!s)return;
    s.scrollTop+=dir==='up'?-100:100;
    const atBottom=s.scrollTop+s.clientHeight>=s.scrollHeight-20;
    window._userScrolledUp=!atBottom;
  }

  /* ── Repeat helper ── */
  function tryRepeat(id,on,cb,now){
    if(on){
      if(!padRepeat[id]){padRepeat[id]={next:now,first:true};}
      if(now>=padRepeat[id].next){
        cb();
        padRepeat[id].next=now+(padRepeat[id].first?DELAY:RATE);
        padRepeat[id].first=false;
      }
    }else{delete padRepeat[id];}
  }

  /* ── Main loop ── */
  function padTick(){
    const pads=navigator.getGamepads?navigator.getGamepads():[];
    let pad=null;
    for(let i=0;i<pads.length;i++){if(pads[i]&&pads[i].connected){pad=pads[i];break;}}
    if(!pad){padLoopId=requestAnimationFrame(padTick);return;}

    const now=Date.now();
    const modal=document.querySelector('#pauseModal,#settingsModal');
    const inNav=!!arrowHandler&&!modal;
    const btns=getInteractiveBtns();
    const inMenu=btns.length>0&&!inNav;

    /* Button states */
    const duOn=pad.buttons[BTN_DU]&&pad.buttons[BTN_DU].pressed;
    const ddOn=pad.buttons[BTN_DD]&&pad.buttons[BTN_DD].pressed;
    const dlOn=pad.buttons[BTN_DL]&&pad.buttons[BTN_DL].pressed;
    const drOn=pad.buttons[BTN_DR]&&pad.buttons[BTN_DR].pressed;
    const stickDir=axisDir(pad.axes);
    const stickUp=stickDir==='forward'||stickDir==='turn_left';
    const stickDn=stickDir==='back'||stickDir==='turn_right';

    if(inNav){
      /* ── Movement ── */
      const movMap=[
        {id:'du',on:duOn||stickDir==='forward',act:'forward'},
        {id:'dd',on:ddOn||stickDir==='back',act:'back'},
        {id:'dl',on:dlOn||stickDir==='turn_left',act:'turn_left'},
        {id:'dr',on:drOn||stickDir==='turn_right',act:'turn_right'},
        {id:'lb',on:pad.buttons[BTN_LB]&&pad.buttons[BTN_LB].pressed,act:'strafe_left'},
        {id:'rb',on:pad.buttons[BTN_RB]&&pad.buttons[BTN_RB].pressed,act:'strafe_right'},
      ];
      movMap.forEach(function(d){
        tryRepeat(d.id,d.on,function(){if(arrowHandler)arrowHandler(d.act);},now);
      });
    } else if(inMenu){
      /* ── Menu navigation with d-pad and left stick ── */
      const upOn=duOn||dlOn||stickUp;
      const dnOn=ddOn||drOn||stickDn;
      tryRepeat('mu',upOn,function(){
        const n=padFocusIdx<=0?btns.length-1:padFocusIdx-1;setPadFocus(n);
      },now);
      tryRepeat('md',dnOn,function(){
        const n=(padFocusIdx+1)%btns.length;setPadFocus(n);
      },now);
    } else {
      /* ── Story/text mode: scroll with d-pad and left stick ── */
      const upOn=duOn||stickUp;
      const dnOn=ddOn||stickDn;
      tryRepeat('su',upOn,function(){scrollStory('up');},now);
      tryRepeat('sd',dnOn,function(){scrollStory('down');},now);
    }

    /* ── Konami code tracking ── */
    (function(){
      var _KON=[12,12,13,13,14,15,14,15,1,0];
      for(var _bi=0;_bi<pad.buttons.length;_bi++){
        var _bOn=pad.buttons[_bi]&&pad.buttons[_bi].pressed;
        if(_bOn&&!padState.buttons[_bi]){
          window._konamiBuf=window._konamiBuf||[];
          window._konamiBuf.push(_bi);
          if(window._konamiBuf.length>10)window._konamiBuf.shift();
          if(window._konamiBuf.length===10){
            var _match=true;
            for(var _ki=0;_ki<10;_ki++){if(window._konamiBuf[_ki]!==_KON[_ki]){_match=false;break;}}
            if(_match){
              window._konamiBuf=[];
              if(typeof window._titleResolve==='function'){window._titleResolve('__debug__');}
            }
          }
        }
      }
    })();
    /* ── Face buttons (one-shot on press edge) ── */
    /* A — select / confirm / skip text */
    const aOn=pad.buttons[BTN_A]&&pad.buttons[BTN_A].pressed;
    if(aOn&&!padState.buttons[BTN_A]){
      if(typing){skipRequested=true;}
      else if(!activateFocused()){
        const cont=document.querySelector('.choice-btn');
        if(cont){ensureAudio();playKeyClick();cont.click();}
      }
    }
    padState.buttons[BTN_A]=aOn;

    /* B — back/cancel (prefers BACK button) or second choice */
    const bOn=pad.buttons[BTN_B]&&pad.buttons[BTN_B].pressed;
    if(bOn&&!padState.buttons[BTN_B]){
      const all=getInteractiveBtns();
      /* First look for a BACK/CANCEL button specifically */
      let backBtn=document.querySelector('#pauseModal [data-pad-back],#settingsModal [data-pad-back]');
      for(let i=0;!backBtn&&i<all.length;i++){
        const t=(all[i].textContent||'').toUpperCase();
        if(t.indexOf('BACK')!==-1||t.indexOf('CANCEL')!==-1||t.indexOf('NO')===0){backBtn=all[i];break;}
      }
      if(backBtn){ensureAudio();playKeyClick();backBtn.click();clearPadFocus();}
      else if(all[1]){ensureAudio();playKeyClick();all[1].click();}
      else if(typing){skipRequested=true;}
    }
    padState.buttons[BTN_B]=bOn;

    /* X — check room */
    const xOn=pad.buttons[BTN_X]&&pad.buttons[BTN_X].pressed;
    if(xOn&&!padState.buttons[BTN_X]){
      ensureAudio();playKeyClick();
      if(!modal&&movementAllowed&&checkFn)checkFn();
    }
    padState.buttons[BTN_X]=xOn;

    /* Y — inventory */
    const yOn=pad.buttons[BTN_Y]&&pad.buttons[BTN_Y].pressed;
    if(yOn&&!padState.buttons[BTN_Y]&&!modal){ensureAudio();playKeyClick();showInv();}
    padState.buttons[BTN_Y]=yOn;

    /* BACK — save */
    const backOn=pad.buttons[BTN_BACK]&&pad.buttons[BTN_BACK].pressed;
    if(backOn&&!padState.buttons[BTN_BACK]&&!modal){ensureAudio();playKeyClick();showSaveCode();}
    padState.buttons[BTN_BACK]=backOn;

    /* Auto-focus first menu button; clear when no menu */
    if(inMenu&&padFocusIdx===-1&&btns.length>0)setPadFocus(0);
    if(!inMenu&&padFocusIdx!==-1)clearPadFocus();

    padLoopId=requestAnimationFrame(padTick);
  }

  /* Global helper exposed from IIFE so setLanguage can refresh FP display */
  window._refreshFpDisplay = function(){
    if(!window._lastFpState) return;
    var fp = window._lastFpState;
    try{ _updateStatus(fp.grid, fp.pos, fp.heading); }catch(e){}
    if(_rcCanvas && _rcTheme){
      var headAngles=[Math.PI*1.5,0,Math.PI*0.5,Math.PI];
      try{ rcRender(_rcCanvas, fp.grid, fp.pos[1]+0.5, fp.pos[0]+0.5, headAngles[fp.heading], _rcTheme); }catch(e){}
    }
    /* Refresh room title */
    var titleEl=document.querySelector('.fp-title');
    if(titleEl && window._currentFpTitle){
      titleEl.textContent = window.t ? window.t(window._currentFpTitle) : window._currentFpTitle;
    }
    if(typeof drawCmdList==='function') drawCmdList();
  };

  window.updatePadMode = function updatePadMode(){
    var btns=[].slice.call(document.querySelectorAll('.desk-btn'));
    var dpg=document.getElementById('deskPadGroup');
    if(window._padConnected){
      document.body.classList.add('pad-connected');
      if(dpg){
        dpg.innerHTML=
          '<span class="pad-action">'+xdpadSvg()+' move</span>'
          +'<span class="pad-action">'+btnL()+btnR()+' strafe</span>'
          +'<span class="pad-action">'+btnCheck()+' check</span>'
          +'<span class="pad-action">'+btnInv()+' inv</span>'
          +'<span class="pad-action">'+btnSave()+' save</span>'
          +'<span class="pad-action">'+btnConfirm()+' select/skip</span>';
      }
    } else {
      document.body.classList.remove('pad-connected');
      if(dpg)dpg.innerHTML='';
    }
    /* Translate desk buttons */
    var chk=document.getElementById('deskCheckBtn');
    var sav=document.getElementById('deskSaveBtn');
    var inv=document.getElementById('deskInvBtn');
    if(chk)chk.innerHTML=window.t?window.t('🔍 CHECK'):'🔍 CHECK';
    if(sav)sav.innerHTML=window.t?window.t('💾 SAVE'):'💾 SAVE';
    if(inv)inv.innerHTML=window.t?window.t('🎒 INV'):'🎒 INV';
    /* Refresh any live UI text showing current prompt — with language translation */
    document.querySelectorAll('[data-pad-text]').forEach(function(el){
      var kbd=el.getAttribute('data-kbd-text')||'';
      var pad=el.getAttribute('data-pad-text')||'';
      pad=pad.replace(/\{CONFIRM\}/g,labelConfirm()).replace(/\{CHECK\}/g,labelCheck());
      /* Look up translation (full-string first, then substring) */
      var lang=window._lang||'en';
      var dict=(window._translations&&window._translations[lang])||null;
      var kbdT=(dict&&dict[kbd])?dict[kbd]:(window.tSub?window.tSub(kbd):kbd);
      var padT=(dict&&dict[pad])?dict[pad]:(window.tSub?window.tSub(pad):pad);
      el.textContent=window._padConnected?padT:kbdT;
    });
    /* Refresh data-tpl elements too */
    document.querySelectorAll('[data-tpl]').forEach(function(el){
      var tpl=el.getAttribute('data-tpl');
      var translated=window.tSub?window.tSub(tpl):tpl;
      el.textContent=translated
        .replace(/\{CHECK_KEY\}/g,window._padConnected?labelCheck():'C')
        .replace(/\{CHECK_VERB\}/g,window._padConnected?'press '+labelCheck():'press C')
        .replace(/\{CONFIRM_KEY\}/g,window._padConnected?labelConfirm():'Enter');
    });
    if(typeof drawCmdList==='function')drawCmdList();
  }

  function detectPadType(id){
    var s=(id||'').toLowerCase();
    /* DualSense (DS5) vendor/product + name fallbacks */
    if(s.indexOf('054c-0ce6')!==-1||s.indexOf('dualsense')!==-1||s.indexOf('ds5')!==-1)return 'ps';
    /* DualShock 4 (DS4) */
    if(s.indexOf('054c-05c4')!==-1||s.indexOf('054c-09cc')!==-1||s.indexOf('dualshock')!==-1||s.indexOf('ds4')!==-1||s.indexOf('wireless controller')!==-1)return 'ps';
    /* Generic Sony vendor id */
    if(s.indexOf('054c')!==-1)return 'ps';
    return 'xbox';
  }
  window.addEventListener('gamepadconnected',function(e){
    window._padConnected=true;
    window._padType=detectPadType(e.gamepad.id);
    updatePadMode();
    var label=window._padType==='ps'?'DUALSHOCK/DUALSENSE':'XINPUT';
    var rawName=e.gamepad.id.replace(/\(.*\)/g,'').replace(/xinput/i,'').trim().substring(0,24)||'CONTROLLER';
    showPadToast(
      '<span style="color:var(--amber);margin-right:8px">🎮</span>'
      +'<span style="color:var(--green-bright)">'+label+' CONNECTED</span>'
      +'<span style="color:var(--green-dim);margin-left:8px;font-size:14px">'+rawName.toUpperCase()+'</span>'
    );
    padLog('');
    if(!padLoopId)padTick();
  });
  window.addEventListener('gamepaddisconnected',function(){
    /* Another pad may still be attached - only stand down when none remain. */
    var pads=navigator.getGamepads?navigator.getGamepads():[],any=false;
    for(var i=0;i<pads.length;i++){if(pads[i]&&pads[i].connected){any=true;break;}}
    if(any)return;
    window._padConnected=false;window._padType=null;padLog('');clearPadFocus();
    updatePadMode();
    if(padLoopId){cancelAnimationFrame(padLoopId);padLoopId=null;}
  });

  /* ── Revert to keyboard/mouse display when player uses mouse or keyboard ── */
  function _scheduleRevert(){
    if(!window._padConnected)return;
    /* Only revert UI indicators; keep polling the pad for if they pick it back up */
    window._padConnected=false;
    clearPadFocus();
    updatePadMode();
    if(typeof showPadToast==='function'){
      showPadToast('<span style="color:var(--green-dim)">KEYBOARD / MOUSE ACTIVE</span>');
    }
  }
  /* Mouse movement / click reverts */
  var _mouseMoveCount=0,_lastMouseX=0,_lastMouseY=0;
  document.addEventListener('mousemove',function(e){
    if(!window._padConnected)return;
    /* Require genuine movement, not synthetic events */
    var dx=Math.abs(e.clientX-_lastMouseX),dy=Math.abs(e.clientY-_lastMouseY);
    _lastMouseX=e.clientX;_lastMouseY=e.clientY;
    if(dx<2&&dy<2)return;
    _mouseMoveCount++;
    if(_mouseMoveCount>2){_mouseMoveCount=0;_scheduleRevert();}
  },{passive:true});
  document.addEventListener('mousedown',function(){
    if(window._padConnected)_scheduleRevert();
  });
  /* Keyboard press reverts (except if a pad-triggered synthetic event) */
  window.addEventListener('keydown',function(e){
    if(!window._padConnected)return;
    if(e.isTrusted===false)return;
    _scheduleRevert();
  },true);
  /* Re-enable pad UI the moment any real pad input comes through */
  function _pollForPadReactivate(){
    if(!window._padConnected){
      var pads=navigator.getGamepads?navigator.getGamepads():[];
      for(var i=0;i<pads.length;i++){
        var p=pads[i];if(!p||!p.connected)continue;
        /* Any button press or significant stick movement */
        var active=false;
        for(var b=0;b<p.buttons.length;b++){if(p.buttons[b]&&p.buttons[b].pressed){active=true;break;}}
        if(!active){for(var a=0;a<p.axes.length;a++){if(Math.abs(p.axes[a])>0.45){active=true;break;}}}
        if(active){
          window._padConnected=true;
          window._padType=window._padType||detectPadType(p.id);
          updatePadMode();
          if(typeof showPadToast==='function'){
            var label=window._padType==='ps'?'DUALSHOCK/DUALSENSE':'CONTROLLER';
            showPadToast('<span style="color:var(--amber);margin-right:8px">🎮</span><span style="color:var(--green-bright)">'+label+' ACTIVE</span>');
          }
          if(!padLoopId)padTick();
          break;
        }
      }
    }
    /* A 60fps rAF here cost every keyboard-only session two gamepad
       snapshots per frame, forever. Reactivation only needs to notice a
       held button/stick within ~150ms, so a slow timer chain does the
       same job at ~1/9th the rate - and getGamepads() is skipped entirely
       while the pad UI is already active. */
    setTimeout(_pollForPadReactivate,150);
  }
  _pollForPadReactivate();
})();

/* ═══════════════════════════════════════════════════════════════════════
   DEV / DEBUG MENU
   Keyboard : type D → E → V on the title screen
   Gamepad  : Konami code  ↑ ↑ ↓ ↓ ← → ← → B A  on the title screen
   ═══════════════════════════════════════════════════════════════════════ */

/* Global Konami buffer (padTick appends to this) */
window._konamiBuf = [];

/* ── Keyboard: watch for D → E → V sequence ───────────────────────────── */
(function(){
  var _seq = [];
  document.addEventListener('keydown', function(e){
    if(!e.isTrusted) return;
    _seq.push(e.key.toLowerCase());
    if(_seq.length > 3) _seq.shift();
    if(_seq.join('') === 'dev'){
      _seq = [];
      if(typeof window._titleResolve === 'function'){
        window._titleResolve('__debug__');
      }
    }
  }, true);
})();