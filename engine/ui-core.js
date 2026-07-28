/* ========================================================================
   CLIVEMAN  -  engine/ui-core.js
   Core terminal UI: sleep, line printing/typing, screen clearing, nav mode, fullscreen, submitInput, global input/keyboard/touch listeners.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
/* Scroll is coalesced to at most once per animation frame. The old version
   forced a synchronous layout reflow (reading scrollHeight) plus an extra
   rAF read/write on EVERY typed character, which — combined with the
   full-screen CRT overlay recompositing on each reflow — was the main source
   of lag on both desktop and mobile. We now flag that a scroll is needed and
   let a single rAF per frame perform one write. */
var _scrollPending=false;
function _doScroll(){_scrollPending=false;if(window._userScrolledUp)return;screenEl.scrollTop=screenEl.scrollHeight+9999;}
function scrollScreenToBottom(){if(window._userScrolledUp)return;if(_scrollPending)return;_scrollPending=true;requestAnimationFrame(_doScroll);}/* Scrollback cap: the terminal keeps the most recent MAX_LINES lines. Old
   lines are trimmed from the TOP only, so nothing that's still animating
   (always at the bottom) can lose its element. clearScreen() resets per
   scene anyway; this is a backstop for very long sessions. */
var MAX_LINES=400;
function appendLine(cls){navJustExited=false;const div=document.createElement('div');div.className='line '+(cls||'');screenEl.appendChild(div);while(screenEl.childElementCount>MAX_LINES){screenEl.removeChild(screenEl.firstElementChild);}scrollScreenToBottom();return div;}
/* Speaker name plate: a 'Name: ...' speaker line shows the name on the
   dialogue box's top-left edge and the body prints without the prefix.
   Narration/system lines retire the plate. Nav mode is untouched (toasts and
   the hidden terminal keep the full line). Voice is always given the
   original prefixed line so character profiles still resolve. */
/* ---- dialogue advance gate (v1.9.4) -------------------------------------
   Character (speaker) lines no longer fly past: after a speaker line types
   out, a blinking marker appears on the line and the story waits for the
   player (Enter/Space, tap/click, or gamepad A). Skipping the typing
   animation only completes the line - a second press advances. Only active
   when the dialogue box is actually on screen (story mode / nav-dialog),
   never for nav toasts or the driving HUD. window._dlgAdvance is exposed
   while a gate is open (test harness / external advance hook). */
function _dlgBoxVisible(){
  var b=document.body;
  if(b.classList.contains('cv-driving'))return false;
  if(b.classList.contains('nav-mode')&&!b.classList.contains('nav-dialog'))return false;
  return true;
}
function _dlgResumeAutoScroll(){window._userScrolledUp=false;scrollScreenToBottom();}
function dlgAdvanceGate(lineDiv){
  return new Promise(function(resolve){
    var mark=document.createElement('span');
    mark.className='dlg-adv';
    mark.textContent=' \u25BC';
    if(lineDiv)lineDiv.appendChild(mark);
    scrollScreenToBottom();
    var armed=performance.now()+250,done=false,raf=0,padPrev=true;
    function finish(){
      if(done)return;done=true;
      document.removeEventListener('keydown',onKey,true);
      document.removeEventListener('click',onClick,true);
      window._dlgAdvance=null;
      if(raf)cancelAnimationFrame(raf);
      try{mark.parentNode.removeChild(mark);}catch(e){}
      _dlgResumeAutoScroll();
      resolve();
    }
    function onKey(e){
      if(e.key!=='Enter'&&e.key!==' ')return;
      if(e.repeat||performance.now()<armed)return;
      e.preventDefault();e.stopPropagation();finish();
    }
    function onClick(e){
      if(performance.now()<armed)return;
      var t=e.target;
      if(t&&t.closest&&t.closest('button,input,select,a,#settingsModal,#pauseModal'))return;
      finish();
    }
    function pollPad(){
      if(done)return;
      var ps=navigator.getGamepads?navigator.getGamepads():[];var gp=null;
      for(var i=0;i<ps.length;i++){if(ps[i]){gp=ps[i];break;}}
      if(gp){var b=gp.buttons||[];var c=!!(b[0]&&b[0].pressed);
        if(c&&!padPrev&&performance.now()>=armed){finish();return;}
        padPrev=c;}
      else padPrev=false;
      raf=requestAnimationFrame(pollPad);
    }
    document.addEventListener('keydown',onKey,true);
    document.addEventListener('click',onClick,true);
    raf=requestAnimationFrame(pollPad);
    window._dlgAdvance=finish;
  });
}
var DLG_SPK_RE=/^\s*([^:"]{2,30}):\s+/;
function setDlgName(text,cls){
  var el=document.getElementById('dlgName');
  if(!el||document.body.classList.contains('nav-mode'))return text;
  if(cls==='speaker'){
    var m=DLG_SPK_RE.exec(text);
    if(m){el.textContent=m[1].toUpperCase();var _nc=window.CHAR_COLOR?window.CHAR_COLOR(text):null;if(_nc){el.style.color=_nc;el.style.borderColor=_nc;el.style.textShadow='0 0 8px '+_nc;}else{el.style.color='';el.style.borderColor='';el.style.textShadow='';}el.classList.add('show');return text.replace(DLG_SPK_RE,'');}
  }
  /* Anything that is not a NAMED speaker line retires the plate. The old
     list named only five classes, so an untagged speaker line (Cliveman's
     internal monologue) printed under the previous character's plate. */
  el.classList.remove('show');
  return text;
}
async function typeLine(text,cls,speed){if(window.t){var _orig=text;text=window.t(text);if(text===_orig&&window.tSub)text=window.tSub(text);}if(document.body.classList.contains('nav-mode')&&window.showNavToast)window.showNavToast(text);if(window.VOICE)VOICE.say(text,cls);var _spkc=(cls==='speaker'&&window.CHAR_COLOR)?window.CHAR_COLOR(text):null;text=setDlgName(text,cls);if(speed==null)speed=14;typing=true;const div=appendLine(cls);if(_spkc){div.style.color=_spkc;div.style.textShadow='0 0 6px '+_spkc;}
if(IS_MOBILE){const BATCH=3;let sc=0;for(let i=0;i<text.length;i+=BATCH){const chunk=text.substr(i,BATCH);div.textContent+=chunk;sc+=BATCH;if(sc>=6){scrollScreenToBottom();sc=0;}const lc=chunk[chunk.length-1];let d=speed*BATCH;if(lc==='.'||lc==='!'||lc==='?')d=speed*8;else if(lc===',')d=speed*3;await sleep(d);if(skipRequested){div.textContent=text;break;}}}
else{for(let i=0;i<text.length;i++){const ch=text[i];div.textContent+=ch;playCharClick(ch);scrollScreenToBottom();let delay=speed;if(ch===' ')delay=speed/2;if(ch==='.'||ch==='!'||ch==='?')delay=speed*8;if(ch===',')delay=speed*3;await sleep(delay);if(skipRequested){div.textContent=text;break;}}}
skipRequested=false;typing=false;scrollScreenToBottom();if(cls==='speaker'&&_dlgBoxVisible())await dlgAdvanceGate(div);}function instantLine(text,cls){if(window.t){var _orig=text;text=window.t(text);if(text===_orig&&window.tSub)text=window.tSub(text);}var _spkc=(cls==='speaker'&&window.CHAR_COLOR)?window.CHAR_COLOR(text):null;var _shown=setDlgName(text,cls);const div=appendLine(cls);if(_spkc){div.style.color=_spkc;div.style.textShadow='0 0 6px '+_spkc;}div.textContent=_shown;scrollScreenToBottom();if(document.body.classList.contains('nav-mode')&&window.showNavToast)window.showNavToast(text);if(window.VOICE)VOICE.say(text,cls);}
/* Ephemeral on-screen text for nav-mode (and any viewport mode that hides #screen):
   shows the latest line near the top of the viewport, then fades. */
window.showNavToast=function(text){
  if(text==null) return; text=(''+text).trim(); if(!text) return;
  var t=document.getElementById('navToast');
  if(!t){ t=document.createElement('div'); t.id='navToast'; t.className='view-toast'; (document.querySelector('.terminal')||document.body).appendChild(t); }
  t.textContent=text;
  // restart the show/fade cycle
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  if(t._timer) clearTimeout(t._timer);
  if(window._navToastHold){ return; }   // held open until the player confirms (item reads)
  var dur=Math.min(8000, 1600 + text.length*45);
  t._timer=setTimeout(function(){ t.classList.remove('show'); }, dur);
};
/* Hide the held nav toast immediately (called when an item read is confirmed). */
window.hideNavToast=function(){ var t=document.getElementById('navToast'); if(t){ if(t._timer)clearTimeout(t._timer); t.classList.remove('show'); } };
/* Persistent "press ENTER to continue" gate shown over the nav viewport. Resolves
   on Enter/Space, a click/tap, or the gamepad confirm button. Outside nav mode it
   resolves immediately so non-nav flows are unaffected. */
window.navReadGate=function(){
  return new Promise(function(resolve){
    if(!document.body.classList.contains('nav-mode')){ resolve(); return; }
    var prompt=document.createElement('div'); prompt.id='navReadPrompt'; prompt.className='nav-read-prompt';
    prompt.textContent=(window.t?window.t('PRESS ENTER TO CONTINUE'):'\u25B6 PRESS ENTER TO CONTINUE');
    (document.querySelector('.terminal')||document.body).appendChild(prompt);
    var padPrev=true, raf=0, done=false;
    function finish(){ if(done)return; done=true;
      document.removeEventListener('keydown',onKey,true);
      prompt.removeEventListener('click',finish);
      if(raf)cancelAnimationFrame(raf);
      try{prompt.parentNode.removeChild(prompt);}catch(e){}
      resolve();
    }
    function onKey(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); finish(); } }
    document.addEventListener('keydown',onKey,true);
    prompt.addEventListener('click',finish);
    function pollPad(){ if(done)return; var ps=navigator.getGamepads?navigator.getGamepads():[]; var gp=null; for(var i=0;i<ps.length;i++){ if(ps[i]){gp=ps[i];break;} } if(gp){ var b=gp.buttons||[]; var c=!!(b[0]&&b[0].pressed); if(c&&!padPrev){ finish(); return; } padPrev=c; } else padPrev=false; raf=requestAnimationFrame(pollPad); }
    raf=requestAnimationFrame(pollPad);
  });
};
/* Suspend the 3D nav viewport so the text screen (minigames / conversations) is
   visible, then restore it. Pointer lock is released so menus are clickable. The
   screen is cleared on entry so the interaction starts fresh. */
window.navSuspend=function(){
  if(!document.body.classList.contains('nav-mode'))return;
  document.body.classList.add('nav-dialog');
  try{ if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock(); }catch(e){}
  if(typeof clearScreen==='function')clearScreen();
  if(window.hideNavToast)window.hideNavToast();
};
window.navResume=function(){
  document.body.classList.remove('nav-dialog');
  if(window.fpStatsUpdate)fpStatsUpdate();
};
function blank(n){if(n==null)n=1;for(let i=0;i<n;i++)appendLine();}function clearScreen(){screenEl.innerHTML='';if(window.VOICE)VOICE.stop();var _dn=document.getElementById('dlgName');if(_dn)_dn.classList.remove('show');if(window.STORYART)STORYART.clear();}function clearMap(){mapAreaEl.innerHTML='';}function enterNavMode(){document.body.classList.add('nav-mode');clearScreen();setMovementAllowed(true);}function exitNavMode(){if(typeof rcStop==='function')rcStop();if(window.CMCOMPASS)CMCOMPASS.unmount();document.body.classList.remove('nav-mode');document.body.classList.remove('nav-dialog');document.body.classList.remove('can-move');clearMap();cmdListEl.innerHTML='';arrowHandler=null;swipeHandler=null;checkFn=null;movementAllowed=false;window._navPitch=0;if(window._fm)window._fm.mouseYaw=0;try{if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();}catch(e){}navJustExited=true;}function setMovementAllowed(b){movementAllowed=b;if(b)document.body.classList.add('can-move');else document.body.classList.remove('can-move');}function toggleFullscreen(){const doc=document;const el=document.documentElement;const isFs=doc.fullscreenElement||doc.webkitFullscreenElement||doc.msFullscreenElement;if(!isFs){const req=el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen;if(req)req.call(el).catch(function(){});}else{const exit=doc.exitFullscreen||doc.webkitExitFullscreen||doc.msExitFullscreen;if(exit)exit.call(doc).catch(function(){});}}fsBtn.addEventListener('click',function(e){e.preventDefault();ensureAudio();toggleFullscreen();setTimeout(function(){input.focus();},50);});fsBtn.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});function submitInput(){const val=input.value.trim();input.value='';if(typing){skipRequested=true;return;}if(waitingFor){instantLine('C:\\DUDLEY> '+val,'input-echo');const w=waitingFor;waitingFor=null;w.resolve(val.toLowerCase());}}input.addEventListener('keydown',function(e){ensureAudio();if(typing){if(e.key==='Enter'){e.preventDefault();skipRequested=true;}else{e.preventDefault();}return;}if(e.key.length===1||e.key==='Backspace'||e.key==='Enter'){playKeyClick();}if((e.key==='c'||e.key==='C')&&input.value===''&&movementAllowed&&checkFn){if(!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();checkFn();return;}}if(e.key==='Enter'){e.preventDefault();submitInput();}});window.addEventListener('keydown',function(e){ensureAudio();if(typing){if(e.key==='Enter'||e.key===' '){e.preventDefault();skipRequested=true;}return;}if((e.key==='c'||e.key==='C')&&!e.ctrlKey&&!e.metaKey&&movementAllowed&&checkFn){e.preventDefault();playKeyClick();checkFn();return;}if(!arrowHandler)return;if(document.activeElement===input&&input.value!=='')return;let action=null;const k=e.key;if(k==='ArrowUp'||k==='w'||k==='W')action='forward';else if(k==='ArrowDown'||k==='s'||k==='S')action='back';else if(k==='ArrowLeft'||k==='a'||k==='A')action='turn_left';else if(k==='ArrowRight'||k==='d'||k==='D')action='turn_right';else if(k==='q'||k==='Q')action='strafe_left';else if(k==='e'||k==='E')action='strafe_right';if(action){e.preventDefault();arrowHandler(action);}});let touchStartX=0,touchStartY=0,touchActive=false;
/* Track manual scroll to allow d-pad/stick to scroll story */
screenEl.addEventListener('scroll',function(){
  const atBottom=screenEl.scrollTop+screenEl.clientHeight>=screenEl.scrollHeight-20;
  window._userScrolledUp=!atBottom;
});
screenEl.addEventListener('wheel',function(){
  setTimeout(function(){
    const atBottom=screenEl.scrollTop+screenEl.clientHeight>=screenEl.scrollHeight-20;
    window._userScrolledUp=!atBottom;
  },50);
},{passive:true});
document.addEventListener('touchstart',function(e){ensureAudio();if(e.touches.length===1){touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;touchActive=true;}},{passive:true});
/* While in nav mode a swipe is a movement gesture, NOT a page scroll. This
   non-passive touchmove cancels the browser's default pan/scroll so the
   screen no longer drifts when you swipe to move. It only fires in nav mode
   (swipeHandler set + body.nav-mode), so normal text scrolling elsewhere is
   untouched. */
document.addEventListener('touchmove',function(e){
  if(!touchActive)return;
  if(!swipeHandler)return;
  if(!document.body.classList.contains('nav-mode'))return;
  if(e.cancelable)e.preventDefault();
},{passive:false});
document.addEventListener('touchend',function(e){if(!touchActive)return;touchActive=false;if(!swipeHandler)return;if(e.changedTouches.length!==1)return;const dx=e.changedTouches[0].clientX-touchStartX;const dy=e.changedTouches[0].clientY-touchStartY;const absX=Math.abs(dx),absY=Math.abs(dy);if(absX<30&&absY<30)return;let action=null;if(absX>absY){action=dx>0?'turn_right':'turn_left';}else{action=dy>0?'back':'forward';}swipeHandler(action);},{passive:true});navCheckBtn.addEventListener('click',function(e){e.preventDefault();ensureAudio();playKeyClick();if(movementAllowed&&checkFn)checkFn();});navInvBtn.addEventListener('click',function(e){e.preventDefault();ensureAudio();playKeyClick();showInv();});navSaveBtn.addEventListener('click',function(e){e.preventDefault();ensureAudio();playKeyClick();showSaveCode();});[navCheckBtn,navInvBtn,navSaveBtn].forEach(function(btn){btn.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});});document.addEventListener('click',function(e){ensureAudio();if(IS_MOBILE)return;const mobileBtns=[navCheckBtn,navInvBtn,navSaveBtn,fsBtn];if(mobileBtns.indexOf(e.target)===-1&&!e.target.classList.contains('choice-btn'))input.focus();});

/* ===== merged from prompts.js (player prompt primitives) ===== */
/* ========================================================================
   CLIVEMAN  -  engine/ui-core.js (prompts section)
   Player prompt primitives: ask, choice buttons, yes/no, press-any-key, number / slider input.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */
function ask(){return new Promise(function(res){waitingFor={resolve:res};input.focus();});}function clearChoices(){choicePanelEl.innerHTML='';choicePanelEl.classList.remove('active');}function showChoiceButtons(opts){clearChoices();choicePanelEl.classList.add('active');return new Promise(function(resolve){let resolved=false;var btns=[];for(let i=0;i<opts.length;i++){(function(opt){const btn=document.createElement('button');btn.type='button';btn.className='choice-btn';btn.textContent=(window.t?window.t(opt.label):opt.label);function pick(e){if(resolved)return;resolved=true;if(e){e.preventDefault();e.stopPropagation();}document.removeEventListener('keydown',onEnter,true);ensureAudio();playKeyClick();clearChoices();instantLine('C:\\DUDLEY> '+opt.label,'input-echo');resolve(opt);}btn.addEventListener('click',pick);btn.addEventListener('touchend',pick);btn.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});choicePanelEl.appendChild(btn);btns.push({btn:btn,pick:pick});})(opts[i]);}/* Allow Enter to trigger continue ONLY when there is a single option (e.g. CONTINUE button). Multi-option prompts require an explicit click. */function onEnter(e){if(e.key!=='Enter'||resolved||typing)return;if(opts.length>1)return;e.preventDefault();btns[0].pick();}document.addEventListener('keydown',onEnter,true);requestAnimationFrame(function(){scrollScreenToBottom();try{choicePanelEl.scrollIntoView({block:'nearest',behavior:'auto'});}catch(e){}});});}async function askChoice(prompt,opts){await typeLine(prompt,'sys');return await showChoiceButtons(opts);}async function askClick(prompt,opts){await typeLine(prompt,'sys');return await showChoiceButtons(opts);}async function yn(q,yesLabel,noLabel){yesLabel=yesLabel||'YES';noLabel=noLabel||'NO';await typeLine(q,'sys');const a=await showChoiceButtons([{keys:['y','yes'],label:yesLabel},{keys:['n','no'],label:noLabel},]);return a.keys.indexOf('y')!==-1;}async function pressAnyToContinue(){blank();var _pcDiv=(function(){var div=appendLine('press-continue');var kbd='  >  PRESS TO CONTINUE  <';var padTpl='  >  PRESS [{CONFIRM}] TO CONTINUE  <';div.setAttribute('data-kbd-text',kbd);div.setAttribute('data-pad-text',padTpl);var rawPad='  >  PRESS ['+labelConfirm()+'] TO CONTINUE  <';var raw=window._padConnected?rawPad:kbd;var dict=window._translations&&window._translations[window._lang||'en'];var tr=(dict&&dict[window._padConnected?padTpl:kbd])?(window._padConnected?dict[padTpl].replace(/\{CONFIRM\}/g,labelConfirm()):dict[kbd]):raw;div.textContent=tr;return div;})();blank();
/* Allow Enter/Space to trigger CONTINUE in addition to clicking the button */
await new Promise(function(resolve){
  var done=false;
  function finish(){if(done)return;done=true;document.removeEventListener('keydown',onKey,{capture:true});clearChoices();ensureAudio();playKeyClick();try{_pcDiv.parentNode.removeChild(_pcDiv);}catch(e){}_dlgResumeAutoScroll();resolve();}
  function onKey(e){
    if((e.key==='Enter'||e.key===' ')&&!typing){e.preventDefault();finish();}
  }
  document.addEventListener('keydown',onKey,{capture:true});
  /* Also show the clickable button as a backup */
  clearChoices();choicePanelEl.classList.add('active');
  var btn=document.createElement('button');
  btn.type='button';btn.className='choice-btn';
  btn.textContent=window.t?window.t('CONTINUE'):'CONTINUE';
  btn.addEventListener('click',finish);btn.addEventListener('touchend',finish);
  btn.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});
  choicePanelEl.appendChild(btn);
  requestAnimationFrame(function(){scrollScreenToBottom();try{choicePanelEl.scrollIntoView({block:'nearest',behavior:'auto'});}catch(e){}});
});}async function askNumber(prompt,min,max){return await showSliderChoice(prompt,min,max);}async function showSliderChoice(prompt,min,max){await typeLine(prompt+' ('+min+'-'+max+')','sys');clearChoices();choicePanelEl.classList.add('active');return new Promise(function(resolve){const wrap=document.createElement('div');wrap.style.width='100%';wrap.style.textAlign='center';wrap.style.padding='8px';const valLabel=document.createElement('div');valLabel.style.color='var(--amber)';valLabel.style.fontSize='24px';valLabel.style.textShadow='0 0 6px var(--amber)';valLabel.style.marginBottom='8px';let current=Math.min(max,Math.max(min,Math.floor((min+max)/2)));valLabel.textContent='$ '+current;const slider=document.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.value=current;slider.style.width='80%';slider.style.accentColor='#ffb000';slider.addEventListener('input',function(){current=parseInt(slider.value,10);valLabel.textContent='$ '+current;});const okBtn=document.createElement('button');okBtn.type='button';okBtn.className='choice-btn';okBtn.textContent='CONFIRM BET';okBtn.style.display='block';okBtn.style.margin='12px auto 0';okBtn.addEventListener('click',function(e){e.preventDefault();ensureAudio();playKeyClick();clearChoices();instantLine('C:\\DUDLEY> Bet $'+current,'input-echo');resolve(current);});wrap.appendChild(valLabel);wrap.appendChild(slider);wrap.appendChild(okBtn);choicePanelEl.appendChild(wrap);});}
/* ============================================================================
   cutscene(beats, opts) — present story beats one card at a time IN THE
   DIALOGUE BOX (no overlay: the fullscreen card presentation is retired).
   Each beat is cleared, typed, and gated on press-to-continue. Voice comes
   free via typeLine. Usage:
     await cutscene([
       "Line one of the scene.",
       { title:"THE ROOFTOP", text:"A titled beat.", art:CITY_SMALL }
     ], { title:"A DREAM" });
   ========================================================================== */
window.cutscene=async function(beats,opts){if(opts&&opts.title&&window.ClassicalMusic&&ClassicalMusic.cue)try{ClassicalMusic.cue(opts.title);}catch(e){}
  opts=opts||{};
  if(!Array.isArray(beats))beats=[beats];
  var curTitle=opts.title||null;
  clearScreen();
  if(curTitle)section(curTitle);
  for(var b=0;b<beats.length;b++){
    var beat=beats[b];
    var text=(typeof beat==='string')?beat:(beat.text||'');
    var bTitle=(typeof beat==='object'&&beat)?beat.title:null;
    var bArt=(typeof beat==='object'&&beat)?beat.art:null;
    if(bTitle){curTitle=bTitle;section(curTitle);}
    if(bArt)instantLine(bArt,'ascii');
    await typeLine(text,'narration');
    await pressAnyToContinue();
  }
};
