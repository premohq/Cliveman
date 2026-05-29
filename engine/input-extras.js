/* ========================================================================
   CLIVEMAN 3.1  -  js/18-input-extras.js
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
    const inNav=!!arrowHandler;
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
      let backBtn=null;
      for(let i=0;i<all.length;i++){
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
      if(movementAllowed&&checkFn)checkFn();
    }
    padState.buttons[BTN_X]=xOn;

    /* Y — inventory */
    const yOn=pad.buttons[BTN_Y]&&pad.buttons[BTN_Y].pressed;
    if(yOn&&!padState.buttons[BTN_Y]){ensureAudio();playKeyClick();showInv();}
    padState.buttons[BTN_Y]=yOn;

    /* BACK — save */
    const backOn=pad.buttons[BTN_BACK]&&pad.buttons[BTN_BACK].pressed;
    if(backOn&&!padState.buttons[BTN_BACK]){ensureAudio();playKeyClick();showSaveCode();}
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
    window._padConnected=false;window._padType=null;padLog('');clearPadFocus();
    updatePadMode();
    if(padLoopId){cancelAnimationFrame(padLoopId);padLoopId=null;}
  });

  /* ── Revert to keyboard/mouse display when player uses mouse or keyboard ── */
  var _revertTimer=null;
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
    requestAnimationFrame(_pollForPadReactivate);
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
