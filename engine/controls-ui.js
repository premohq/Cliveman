/* ========================================================================
   CLIVEMAN  -  engine/controls-ui.js
   Controller-aware button/label helpers (Xbox vs PlayStation), d-pad SVG, command list drawing.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

function xb(cls,lbl){return '<span class="xbtn '+cls+'">'+lbl+'</span>';}
/* PlayStation (DS4/DS5) button helper */
function pb(cls,lbl){return '<span class="psbtn '+cls+'">'+lbl+'</span>';}
/* Returns 'ps' (DS4/DS5), 'xbox', or null */
function padType(){
  if(!window._padConnected)return null;
  return window._padType||'xbox';
}
/* Dynamic button markup based on active controller type */
function btnConfirm(){return padType()==='ps'?pb('psbtn-cross','\u2715'):xb('xbtn-a','A');}

function btnCheck(){return padType()==='ps'?pb('psbtn-square','\u25A1'):xb('xbtn-x','X');}
function btnInv(){return padType()==='ps'?pb('psbtn-triangle','\u25B3'):xb('xbtn-y','Y');}
function btnSave(){return padType()==='ps'?pb('psbtn-share','SHR'):xb('xbtn-back','SEL');}
function btnL(){return padType()==='ps'?pb('psbtn-l1','L1'):xb('xbtn-lb','LB');}
function btnR(){return padType()==='ps'?pb('psbtn-r1','R1'):xb('xbtn-rb','RB');}
/* Dynamic text labels */
function labelConfirm(){return padType()==='ps'?'\u2715':'A';}
function labelCheck(){return padType()==='ps'?'\u25A1':'X';}
function xdpadSvg(){return '<svg class="xdpad" viewBox="0 0 20 20" style="width:16px;height:16px;vertical-align:middle;margin:0 2px"><rect x="7" y="0" width="6" height="6" rx="1" fill="#555"/><rect x="7" y="14" width="6" height="6" rx="1" fill="#555"/><rect x="0" y="7" width="6" height="6" rx="1" fill="#555"/><rect x="14" y="7" width="6" height="6" rx="1" fill="#555"/><rect x="7" y="7" width="6" height="6" fill="#444"/><polygon points="10,1 9,3 11,3" fill="#ccc"/><polygon points="10,19 9,17 11,17" fill="#ccc"/><polygon points="1,10 3,9 3,11" fill="#ccc"/><polygon points="19,10 17,9 17,11" fill="#ccc"/></svg>';}function drawCmdList(){var T3=window.t||function(s){return s;};var html;if(IS_MOBILE){html='<div class="hint">'+T3('SWIPE \u2191\u2193 move \u00B7 \u2190\u2192 turn \u00B7 tap C interact')+'</div>';}else if(window._padConnected){html='<div class="hint">'+xdpadSvg()+'/'+btnL()+btnR()+T3(' move & strafe \u00B7 ').replace('&','&amp;')+btnCheck()+T3(' check \u00B7 ')+btnInv()+T3(' inv \u00B7 ')+btnSave()+T3(' save \u00B7 ')+btnConfirm()+T3(' select/skip')+'</div>';}else{html='<div class="hint">'+T3('W/S forward/back \u00B7 A/D turn \u00B7 Q/E strafe \u00B7 C check')+'</div>';}cmdListEl.innerHTML=html;}
const FP_FWD=[[-1,0],[0,1],[1,0],[0,-1]];const FP_RIGHT=[[0,1],[1,0],[0,-1],[-1,0]];

/* ===== merged from navigation.js (top-down room navigation) ===== */
/* ========================================================================
   CLIVEMAN  -  engine/controls-ui.js (navigation section)
   Top-down room navigation and the animated city-glimmer background.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

/* ============================================================================
   FREE MOVEMENT (momentum) — additive, opt-in via opts.freeMove. Existing rooms
   that don't pass the flag keep the proven discrete grid-step navigation. This
   is iteration 1: continuous position + velocity with acceleration and friction
   (so you glide and carry momentum), per-axis collision so you slide along
   walls, and free-angle turning. Mouse / gamepad-stick look (desktop) builds on
   top of this next.
   ============================================================================ */
window._fm = window._fm || { active:false, held:{} };
(function(){
  function setKey(e,down){
    if(!window._fm.active) return;
    if(window._gamePaused){if(!down)window._fm.held={};return;}
    var k=e.key, a=null;
    if(k==='ArrowUp'||k==='w'||k==='W')a='f';
    else if(k==='ArrowDown'||k==='s'||k==='S')a='b';
    else if(k==='ArrowLeft'||k==='a'||k==='A')a='tl';
    else if(k==='ArrowRight'||k==='d'||k==='D')a='tr';
    else if(k==='q'||k==='Q')a='sl';
    else if(k==='e'||k==='E')a='sr';
    if(a){ e.preventDefault(); window._fm.held[a]=down; }
  }
  window.addEventListener('keydown',function(e){setKey(e,true);});
  window.addEventListener('keyup',function(e){setKey(e,false);});
  /* lose focus / leave window -> release everything so you don't drift */
  window.addEventListener('blur',function(){window._fm.held={};});
})();
/* ============================================================================
   DESKTOP MOUSE-LOOK (nav only). Click the viewport to capture the pointer,
   then move the mouse left/right to turn (yaw). Esc releases the pointer so you
   can click the CHECK / SAVE / INV bar again. No pitch (the raycaster horizon is
   fixed). Mobile is unaffected. Yaw is accumulated here and consumed once per
   free-move frame so it stays framerate-independent.
   ============================================================================ */
window._fm.mouseYaw = window._fm.mouseYaw || 0;
window._navPitch = window._navPitch || 0;
var FM_MOUSE_SENS = 0.0022;   /* radians per pixel of horizontal mouse motion */
var FM_PITCH_SENS = 0.0016;   /* vertical look sensitivity (fraction per pixel) */
(function(){
  if(IS_MOBILE) return;
  function lockNow(){
    var cv=window._navLockCanvas;
    if(cv&&window._fm.active&&document.pointerLockElement==null&&cv.requestPointerLock){
      try{var p=cv.requestPointerLock();if(p&&p.catch)p.catch(function(){});}catch(e){}
    }
  }
  window._navLockNow=lockNow;
  window.addEventListener('mousemove',function(e){
    if(!window._fm.active) return;
    if(document.pointerLockElement==null) return;
    if(!movementAllowed||typing) return;
    window._fm.mouseYaw += (e.movementX||0)*FM_MOUSE_SENS;
    var p=window._navPitch-(e.movementY||0)*FM_PITCH_SENS;
    if(p>1)p=1; else if(p<-1)p=-1;
    window._navPitch=p;
  });
  /* Auto-capture: the moment the player presses a movement key in nav, grab the
     pointer (a keydown is a valid user gesture, so no manual click is needed). */
  window.addEventListener('keydown',function(e){
    if(!window._fm.active||!movementAllowed||document.pointerLockElement!=null) return;
    var k=e.key;
    if(k==='ArrowUp'||k==='ArrowDown'||k==='ArrowLeft'||k==='ArrowRight'||
       k==='w'||k==='W'||k==='a'||k==='A'||k==='s'||k==='S'||k==='d'||k==='D'||
       k==='q'||k==='Q'||k==='e'||k==='E'){ lockNow(); }
  });
  /* called by drawFP (desktop) for each new nav canvas */
  window._navWireMouseLook=function(canvas){
    if(IS_MOBILE||!canvas) return;
    window._navLockCanvas=canvas;
    canvas.style.cursor='none';
    canvas.addEventListener('click',function(){ lockNow(); });
    /* best-effort immediate capture (works when room entry had a recent gesture) */
    setTimeout(lockNow,0);
  };
})();
/* tunables */
var FM_ACCEL=32.0, FM_MAXV=5.0, FM_FRICTION=6.0, FM_TURN=3.0, FM_RADIUS=0.28;
function _fmBlocked(grid,x,y,fx,fy){
  var c=Math.floor(x), r=Math.floor(y);
  if(r<0||r>=grid.length||!grid[r]||c<0||c>=grid[r].length) return true;
  if(rcWallHeight(grid[r][c])>=1.0) return true;
  if(grid._floorH){
    var cr=Math.floor(fy), cc=Math.floor(fx);
    var cur=(grid._floorH[cr]&&grid._floorH[cr][cc]!=null)?grid._floorH[cr][cc]:0;
    var tgt=grid._floorH[r][c];
    if(tgt==null) return true;
    if(Math.abs(tgt-cur)>SECTOR_STEP_MAX) return true;
  }
  return false;
}
/* advance one frame of free movement. s={fx,fy,ang,vx,vy}; held flags; dt sec */
function _freeMoveStep(s,held,dt,grid){
  if(held.tl) s.ang-=FM_TURN*dt;
  if(held.tr) s.ang+=FM_TURN*dt;
  var cf=Math.cos(s.ang), sf=Math.sin(s.ang), ax=0, ay=0;
  if(held.f){ax+=cf;ay+=sf;}
  if(held.b){ax-=cf;ay-=sf;}
  if(held.sl){ax+=sf;ay-=cf;}
  if(held.sr){ax-=sf;ay+=cf;}
  var al=Math.hypot(ax,ay);
  if(al>0){ ax/=al; ay/=al; s.vx+=ax*FM_ACCEL*dt; s.vy+=ay*FM_ACCEL*dt; }
  var fr=Math.exp(-FM_FRICTION*dt); s.vx*=fr; s.vy*=fr;
  if(Math.abs(s.vx)<0.0005)s.vx=0; if(Math.abs(s.vy)<0.0005)s.vy=0;
  var sp=Math.hypot(s.vx,s.vy);
  if(sp>FM_MAXV){ s.vx=s.vx/sp*FM_MAXV; s.vy=s.vy/sp*FM_MAXV; }
  /* Circle-footprint collision. The old single leading-point test could let a
     shoulder clip a stairwell corner at diagonal angles, producing wall pops or
     trapping the player between a tread and rail. Check the leading centre and
     both leading corners for each axis while retaining wall-sliding. */
  function clearX(nx){
    var sx=Math.sign(s.vx)||1,ex=nx+sx*FM_RADIUS;
    return !_fmBlocked(grid,ex,s.fy,s.fx,s.fy)&&
           !_fmBlocked(grid,ex,s.fy-FM_RADIUS*0.72,s.fx,s.fy)&&
           !_fmBlocked(grid,ex,s.fy+FM_RADIUS*0.72,s.fx,s.fy);
  }
  function clearY(ny){
    var sy=Math.sign(s.vy)||1,ey=ny+sy*FM_RADIUS;
    return !_fmBlocked(grid,s.fx,ey,s.fx,s.fy)&&
           !_fmBlocked(grid,s.fx-FM_RADIUS*0.72,ey,s.fx,s.fy)&&
           !_fmBlocked(grid,s.fx+FM_RADIUS*0.72,ey,s.fx,s.fy);
  }
  var nx=s.fx+s.vx*dt;
  if(clearX(nx))s.fx=nx;else s.vx=0;
  var ny=s.fy+s.vy*dt;
  if(clearY(ny))s.fy=ny;else s.vy=0;
  return s;
}
async function navigateRoom(roomId,grid,start,events,exits,opts){if(!opts)opts={};if(opts.title&&window.ClassicalMusic&&ClassicalMusic.cue)try{ClassicalMusic.cue(opts.title);}catch(e){}if(opts.freeMove===undefined)opts.freeMove=true;window._navItemArt=opts.itemArt||null;window._navFurniture=opts.furniture||null;/* smooth momentum movement is now the default for every room (was factory-only); pass freeMove:false to opt a room back into discrete grid-stepping */if(!opts.seamless&&!navJustExited&&screenEl.children.length>0){await pressEnterToContinue();}enterNavMode();let pos;let heading;if(state.resumeRoomId===roomId&&state.resumePos){var _rp=[state.resumePos[0],state.resumePos[1]];var _resumeHeading=(typeof state.resumeHeading==='number')?state.resumeHeading:null;state.resumeRoomId=-1;state.resumePos=null;state.resumeHeading=null;var _rpOK=grid[_rp[0]]&&grid[_rp[0]][_rp[1]]!=null&&rcWallHeight(grid[_rp[0]][_rp[1]])<1.0;if(_rpOK){pos=_rp;heading=_resumeHeading!==null?_resumeHeading:0;}else{pos=[start[0],start[1]];heading=(typeof opts.startHeading==='number')?opts.startHeading:0;}}else{pos=[start[0],start[1]];heading=(typeof opts.startHeading==='number')?opts.startHeading:0;}state.roomId=roomId;state.savedRow=pos[0];state.savedCol=pos[1];state.heading=heading;const checked={};const rows=grid.length;drawFP(grid,pos,heading,opts.title||'',opts);drawCmdList();return new Promise(function(resolveExit){function _aimTargetKey(){var ang=(typeof _fs!=='undefined'&&_fs)?_fs.ang:headAngles[heading];var dxx=Math.cos(ang),dyy=Math.sin(ang);var cx=pos[1]+0.5,cy=pos[0]+0.5;var ownKey=pos[0]+','+pos[1];for(var tt=0.18;tt<=3.5;tt+=0.12){var wx=cx+dxx*tt,wy=cy+dyy*tt;var cc=Math.floor(wx),rr=Math.floor(wy);if(rr<0||rr>=rows||!grid[rr]||cc<0||cc>=grid[rr].length)break;if(rcWallHeight(grid[rr][cc])>=1.0)break;var k=rr+','+cc;if(k===ownKey)continue;if(events[k]!=null||exits[k]!=null)return k;}return null;}
async function handleCheck(noAim){if(typing)return;if(!movementAllowed)return;if(window._navCheckBusy)return;window._navCheckBusy=true;try{var aimKey=noAim?null:_aimTargetKey();var key=aimKey||(pos[0]+','+pos[1]);var _kp=key.split(',');var r=+_kp[0],c=+_kp[1];if(exits[key]!=null){const code=exits[key];if(opts.exitGate){setMovementAllowed(false);const allowed=await opts.exitGate(code);setMovementAllowed(true);if(!allowed)return;}state.savedRow=pos[0];state.savedCol=pos[1];arrowHandler=null;swipeHandler=null;checkFn=null;resolveExit(code);return;}if(events[key]){const cellSym=grid[r][c];const isPickup=(cellSym==='I'||cellSym==='U')||!!checked[key];if(isPickup&&checked[key]){setMovementAllowed(false);await typeLine('"Nothing more here."','narration');setMovementAllowed(true);}else{setMovementAllowed(false);if(isPickup)window._navToastHold=true;var _useDialog=document.body.classList.contains('nav-mode')&&!isPickup;if(_useDialog&&window.navSuspend)window.navSuspend();var eventResult;try{eventResult=await events[key]();}catch(_err){if(_useDialog&&window.navResume)window.navResume();window._navToastHold=false;if(window.hideNavToast)window.hideNavToast();setMovementAllowed(true);throw _err;}if(isPickup){checked[key]=true;grid[r][c]='X';navRepaintRoom(grid,pos,heading);}if(typeof eventResult==='string'&&eventResult.length>0){window._navToastHold=false;if(window.hideNavToast)window.hideNavToast();state.savedRow=pos[0];state.savedCol=pos[1];arrowHandler=null;swipeHandler=null;checkFn=null;resolveExit(eventResult);return;}if(isPickup){if(window.navReadGate)await window.navReadGate();window._navToastHold=false;if(window.hideNavToast)window.hideNavToast();}if(_useDialog&&window.navResume)window.navResume();setMovementAllowed(true);}}else{setMovementAllowed(false);await typeLine('"Nothing of note here."','narration');setMovementAllowed(true);}}finally{window._navCheckBusy=false;if(window._navToastHold){window._navToastHold=false;if(window.hideNavToast)window.hideNavToast();}}}
const _theme=pickTheme(opts.title||'');
const headAngles=[Math.PI*1.5,0,Math.PI*0.5,Math.PI];
function canStep(dr,dc){const nr=pos[0]+dr,nc=pos[1]+dc;
if(nr<0||nr>=rows||nc<0||nc>=grid[nr].length)return false;
if(rcWallHeight(grid[nr][nc]))return false;
if(grid._floorH){var cur=grid._floorH[pos[0]][pos[1]];if(cur==null)cur=0;var tgt=grid._floorH[nr][nc];if(tgt==null)return false;if(Math.abs(tgt-cur)>SECTOR_STEP_MAX)return false;}
return true;}
async function tryStep(dr,dc){if(canStep(dr,dc)){const fromR=pos[0],fromC=pos[1];pos[0]+=dr;pos[1]+=dc;state.savedRow=pos[0];state.savedCol=pos[1];playMoveBlip();setMovementAllowed(false);await rcAnimateStep(_rcCanvas,grid,fromC+0.5,fromR+0.5,pos[1]+0.5,pos[0]+0.5,headAngles[heading],_theme);rcRender(_rcCanvas,grid,pos[1]+0.5,pos[0]+0.5,headAngles[heading],_theme);_updateStatus(grid,pos,heading);setMovementAllowed(true);return true;}else{beep(200,0.05,0.04,'square');return false;}}
async function handleMove(action){if(typing)return;if(!movementAllowed)return;
const fwd=FP_FWD[heading];const right=FP_RIGHT[heading];
let moved=false;
if(action==='forward'){moved=await tryStep(fwd[0],fwd[1]);}
else if(action==='back'){moved=await tryStep(-fwd[0],-fwd[1]);}
else if(action==='strafe_left'){moved=await tryStep(-right[0],-right[1]);}
else if(action==='strafe_right'){moved=await tryStep(right[0],right[1]);}
else if(action==='turn_left'){const fromH=heading;heading=(heading+3)%4;state.heading=heading;beep(440,0.04,0.03,'square');setMovementAllowed(false);await rcAnimateTurn(_rcCanvas,grid,pos[1]+0.5,pos[0]+0.5,headAngles[fromH],headAngles[heading],_theme);rcRender(_rcCanvas,grid,pos[1]+0.5,pos[0]+0.5,headAngles[heading],_theme);_updateStatus(grid,pos,heading);setMovementAllowed(true);moved=true;}
else if(action==='turn_right'){const fromH=heading;heading=(heading+1)%4;state.heading=heading;beep(520,0.04,0.03,'square');setMovementAllowed(false);await rcAnimateTurn(_rcCanvas,grid,pos[1]+0.5,pos[0]+0.5,headAngles[fromH],headAngles[heading],_theme);rcRender(_rcCanvas,grid,pos[1]+0.5,pos[0]+0.5,headAngles[heading],_theme);_updateStatus(grid,pos,heading);setMovementAllowed(true);moved=true;}
if(moved&&opts.onMove&&(action==='forward'||action==='back'||action==='strafe_left'||action==='strafe_right')){setMovementAllowed(false);await opts.onMove(pos);setMovementAllowed(true);}
/* Auto-trigger stairs: if a move landed the player on a STAIR tile (S/v) that
   is an exit, fire it automatically — no need to press C. Other exits/doors
   still require an explicit check. */
if(moved&&(action==='forward'||action==='back'||action==='strafe_left'||action==='strafe_right')){
  const landSym=grid[pos[0]]&&grid[pos[0]][pos[1]];
  const landKey=pos[0]+','+pos[1];
  if((landSym==='S'||landSym==='v')&&exits[landKey]!=null&&arrowHandler!=null){
    await handleCheck(true);
  }
}}
if(opts.freeMove){
checkFn=handleCheck;arrowHandler=null;swipeHandler=null;
window._fm.active=true;window._fm.held={};
var _fs={fx:pos[1]+0.5,fy:pos[0]+0.5,ang:headAngles[heading],vx:0,vy:0};
var _flast=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
var _spawnCell=pos[0]+','+pos[1];
var _armed=false;   /* exits can't fire until you've stepped onto a DIFFERENT normal cell — stops spawn/bounce loops at stairs */
(function fmFrame(now){
  if(checkFn==null){window._fm.active=false;return;}
  if(now==null)now=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
  var dt=(now-_flast)/1000;if(dt>0.05)dt=0.05;if(dt<0)dt=0;_flast=now;
  if(movementAllowed&&!typing){_freeMoveStep(_fs,window._fm.held,dt,grid);if(window._fm.mouseYaw){_fs.ang+=window._fm.mouseYaw;}}
  window._fm.mouseYaw=0;
  var nr=Math.floor(_fs.fy),nc=Math.floor(_fs.fx);
  var changed=(nr!==pos[0]||nc!==pos[1]);
  var cs=Math.cos(_fs.ang),sn=Math.sin(_fs.ang);
  var newHeading=(Math.abs(cs)>=Math.abs(sn))?(cs>0?1:3):(sn>0?2:0);
  var headingChanged=(newHeading!==heading);
  if(changed){pos[0]=nr;pos[1]=nc;state.savedRow=nr;state.savedCol=nc;}
  if(headingChanged)heading=newHeading;
  state.heading=heading;
  var curKey=nr+','+nc;
  if(!_armed && curKey!==_spawnCell && exits[curKey]==null) _armed=true;
  var sp=Math.hypot(_fs.vx,_fs.vy);
  /* no view-bob: bob shifts the horizon and the floor caster scales distance by
     the horizon, so a per-frame bob made the floor swim. Keep projection steady. */
  if(_rcCanvas)rcRender(_rcCanvas,grid,_fs.fx,_fs.fy,_fs.ang,_theme,0);
  if(changed||headingChanged){
    if(typeof _updateStatus==='function')_updateStatus(grid,pos,heading);
    if(changed){
      if(typeof playMoveBlip==='function'&&sp>0.2)playMoveBlip();
      var ls=grid[nr]&&grid[nr][nc];
      if(_armed&&(ls==='S'||ls==='v')&&exits[curKey]!=null&&movementAllowed){_armed=false;handleCheck(true);}
      else if(opts.onMove&&!typing&&movementAllowed){opts.onMove(pos);}
    }
  }
  requestAnimationFrame(fmFrame);
})();
}else{
arrowHandler=handleMove;swipeHandler=handleMove;checkFn=handleCheck;
if(!IS_MOBILE){(async function typedLoop(){while(true){const raw=(await ask()).trim();if(arrowHandler==null)return;if(raw==='save'){showSaveCode();continue;}if(raw==='inv'||raw==='inventory'){showInv();continue;}if(raw==='check'||raw==='c'){await handleCheck();if(arrowHandler==null)return;continue;}if(raw==='monie'&&state.roomId===10){state.money=Math.min(1023,state.money+250);await typeLine('"$250 appears in your wallet. No questions asked."','sys');showStatus();continue;}if(raw==='')continue;await typeLine('"W/S forward/back, A/D turn, Q/E strafe, C check. Type INV/SAVE."','err');}})();}
}}).then(function(code){if(!opts.seamless)exitNavMode();return code;});}let cityInterval=null;let cityEl=null;function buildCityData(W,H){
  var rng=function(a,b){return Math.floor(Math.random()*(b-a+1))+a;};
  var stars=[];
  for(var i=0;i<120;i++){
    stars.push({x:rng(0,W-1),y:rng(0,Math.floor(H*0.58)),
      bright:0.3+Math.random()*0.7,phase:Math.random()*6.28,
      speed:0.008+Math.random()*0.018,sz:Math.random()<0.12?2:1});
  }
  /* Background towers with window grids */
  var bgB=[
    {x:0,   w:40, top:Math.floor(-H*0.18),body:'#0c1b2e',wc:'#1e8090',wc2:'#1060a0'},
    {x:4,   w:28, top:Math.floor(H*0.04), body:'#0a1828',wc:'#1a7080',wc2:'#0e5888'},
    {x:44,  w:34, top:Math.floor(-H*0.10),body:'#0b1e34',wc:'#1e8898',wc2:'#cc7700'},
    {x:82,  w:26, top:Math.floor(H*0.06), body:'#0a1c30',wc:'#cc8800',wc2:'#1a6878'},
    {x:112, w:52, top:Math.floor(-H*0.28),body:'#0d2244',wc:'#22a0b8',wc2:'#1880a0'},
    {x:168, w:30, top:Math.floor(-H*0.06),body:'#0b1e36',wc:'#1e8090',wc2:'#1070a0'},
    {x:202, w:44, top:Math.floor(-H*0.22),body:'#0c2040',wc:'#1e90a8',wc2:'#cc8800'},
    {x:250, w:28, top:Math.floor(H*0.03), body:'#0a1c2e',wc:'#cc8800',wc2:'#1a7080'},
    {x:282, w:38, top:Math.floor(-H*0.14),body:'#0c1e38',wc:'#1c8090',wc2:'#1070a8'},
  ];
  var bgW=[];
  var WW=3,WH=2,WGX=2,WGY=2;
  var botY=Math.floor(H*0.72);
  bgB.forEach(function(b){
    for(var wy=b.top+5;wy<botY-2;wy+=WH+WGY){
      for(var wx=b.x+4;wx<b.x+b.w-WW-3;wx+=WW+WGX){
        var lit=Math.random()<0.73;
        bgW.push({x:wx,y:wy,w:WW,h:WH,lit:lit,
          col:Math.random()<0.7?b.wc:b.wc2,
          phase:Math.random()*6.28,speed:0.007+Math.random()*0.012,
          flick:Math.random()<0.07});
      }
    }
  });
  /* Mid silhouettes */
  var midB=[
    {x:0,  w:58,top:Math.floor(H*0.46)},{x:52, w:36,top:Math.floor(H*0.50)},
    {x:84, w:28,top:Math.floor(H*0.43)},{x:110,w:22,top:Math.floor(H*0.48)},
    {x:130,w:44,top:Math.floor(H*0.44)},{x:172,w:28,top:Math.floor(H*0.52)},
    {x:198,w:50,top:Math.floor(H*0.46)},{x:246,w:30,top:Math.floor(H*0.50)},
    {x:275,w:45,top:Math.floor(H*0.42)},
  ];
  var midW=[];
  midB.forEach(function(b){
    for(var wy=b.top+3;wy<botY-2;wy+=4){
      for(var wx=b.x+2;wx<b.x+b.w-3;wx+=5){
        if(Math.random()<0.52){
          midW.push({x:wx,y:wy,w:2,h:2,
            col:Math.random()<0.55?'#aa6600':'#cc9900',
            phase:Math.random()*6.28,speed:0.01+Math.random()*0.018});
        }
      }
    }
  });
  /* Street lamps */
  var lamps=[];
  for(var lx=12;lx<W-10;lx+=rng(30,52)){
    lamps.push({x:lx,y:Math.floor(H*0.82)});
  }
  /* Trees */
  var trees=[];
  for(var tx=4;tx<W-8;tx+=rng(16,34)){
    trees.push({x:tx+rng(-3,3),y:Math.floor(H*0.78),w:rng(7,16),h:rng(9,16)});
  }
  return{stars:stars,bgB:bgB,bgW:bgW,midB:midB,midW:midW,lamps:lamps,trees:trees};
}

function renderCity(bx,d,W,H,frame){
  /* Sky */
  bx.fillStyle='#020810';bx.fillRect(0,0,W,H);
  /* Subtle horizon atmosphere */
  var hy=Math.floor(H*0.65);
  for(var ay=hy-10;ay<hy+6;ay++){
    var a=0.06*(1-Math.abs(ay-hy)/16);
    bx.fillStyle='rgba(20,90,140,'+a+')';bx.fillRect(0,ay,W,1);
  }
  /* Stars */
  d.stars.forEach(function(s){
    var t=frame*s.speed+s.phase;
    var a=s.bright*(0.4+0.6*Math.sin(t));
    if(a<0.05)return;
    bx.globalAlpha=a;
    bx.fillStyle=s.sz>1?'#bbddff':'#88bbdd';
    bx.fillRect(s.x,s.y,s.sz,s.sz);
    bx.globalAlpha=1;
  });
  /* Moon */
  var mx=Math.floor(W*0.18),my=8;
  bx.fillStyle='#c8d8f0';bx.fillRect(mx-5,my-1,11,13);
  bx.fillRect(mx-4,my-2,9,1);bx.fillRect(mx-4,my+12,9,1);
  bx.fillRect(mx-6,my+1,1,9);bx.fillRect(mx+6,my+1,1,9);
  /* Craters */
  bx.fillStyle='#a0b8d0';bx.fillRect(mx-2,my+2,3,3);bx.fillRect(mx+2,my+7,2,2);
  /* Moon glow */
  bx.globalAlpha=0.06;bx.fillStyle='#aaccff';
  bx.fillRect(mx-9,my-4,20,20);bx.globalAlpha=1;

  /* Background buildings */
  var botY=Math.floor(H*0.72);
  d.bgB.forEach(function(b){
    var top=Math.max(0,b.top);
    bx.fillStyle=b.body;bx.fillRect(b.x,top,b.w,botY-top);
    /* Edge shading */
    bx.fillStyle='rgba(0,0,0,0.5)';bx.fillRect(b.x,top,2,botY-top);
    bx.fillRect(b.x+b.w-2,top,2,botY-top);
    /* Left highlight */
    bx.fillStyle='rgba(100,200,240,0.07)';bx.fillRect(b.x+2,top,1,botY-top);
    /* Rooftop detail */
    bx.fillStyle='rgba(80,160,200,0.15)';bx.fillRect(b.x,top,b.w,1);
    if(b.w>20){
      /* Antenna */
      bx.fillStyle='#1a3050';
      var ax=b.x+Math.floor(b.w*0.5);
      bx.fillRect(ax,Math.max(0,b.top-6),1,top-Math.max(0,b.top-6)+2);
      /* Antenna blink */
      var blink=(Math.sin(frame*0.06+b.x)>0.6);
      bx.fillStyle=blink?'#ff4444':'#441111';
      bx.fillRect(ax,Math.max(0,b.top-6),1,1);
    }
  });
  /* Background windows */
  d.bgW.forEach(function(w){
    if(!w.lit)return;
    var a=w.flick?(0.45+0.55*Math.sin(frame*w.speed+w.phase)):0.88;
    if(a<0.15)return;
    bx.globalAlpha=a;bx.fillStyle=w.col;bx.fillRect(w.x,w.y,w.w,w.h);
    bx.globalAlpha=1;
  });

  /* Mid silhouettes */
  d.midB.forEach(function(b){
    bx.fillStyle='#030710';bx.fillRect(b.x,b.top,b.w,H-b.top);
  });
  /* Mid windows */
  d.midW.forEach(function(w){
    var a=0.5+0.5*Math.sin(frame*w.speed+w.phase);
    if(a<0.2)return;
    bx.globalAlpha=a*0.75;bx.fillStyle=w.col;bx.fillRect(w.x,w.y,w.w,w.h);
    bx.globalAlpha=1;
  });

  /* Ground + road */
  bx.fillStyle='#010407';bx.fillRect(0,Math.floor(H*0.74),W,H);
  var roadY=Math.floor(H*0.85);
  bx.fillStyle='#180200';bx.fillRect(0,roadY,W,4);
  /* Red light trails */
  for(var rx=0;rx<W;rx+=14){
    var rt=(frame*0.4+rx*0.5)%W;
    bx.fillStyle='#550600';bx.fillRect(rt,roadY+1,6,1);
    bx.fillStyle='#880a00';bx.fillRect(rt+1,roadY+1,4,1);
  }

  /* Trees */
  d.trees.forEach(function(t){
    bx.fillStyle='#010a02';
    bx.fillRect(t.x-Math.floor(t.w/2),t.y-t.h,t.w,t.h);
    bx.fillStyle='#020d03';
    bx.fillRect(t.x-Math.floor(t.w*0.35),t.y-t.h-3,Math.floor(t.w*0.7),4);
    bx.fillStyle='#030a02';bx.fillRect(t.x-1,t.y,2,5);
  });

  /* Street lamps */
  d.lamps.forEach(function(l){
    bx.fillStyle='#101828';bx.fillRect(l.x,l.y-14,1,14);
    bx.fillRect(l.x,l.y-14,4,1);
    var gp=0.75+0.25*Math.sin(frame*0.025+l.x*0.3);
    bx.globalAlpha=gp;
    bx.fillStyle='#ddaa44';bx.fillRect(l.x-1,l.y-15,4,2);
    bx.globalAlpha=gp*0.25;
    bx.fillStyle='#ffcc66';bx.fillRect(l.x-5,l.y-18,10,7);
    bx.globalAlpha=1;
  });

  /* Foreground black silhouette strip */
  bx.fillStyle='#010205';bx.fillRect(0,Math.floor(H*0.90),W,H);

  /* Scanlines */
  bx.fillStyle='rgba(0,0,0,0.14)';
  for(var sy=0;sy<H;sy+=2)bx.fillRect(0,sy,W,1);
}

function startCityGlimmer(){
  if(cityInterval)cancelAnimationFrame(cityInterval);
  var cv=document.getElementById('pixelCityBox');
  if(!cv)return;
  var SCALE=2;
  var W=Math.min(380,Math.floor(cv.offsetWidth/SCALE));
  var H=Math.floor(cv.offsetHeight/SCALE);
  cv.width=W*SCALE;cv.height=H*SCALE;
  var ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
  var buf=document.createElement('canvas');
  buf.width=W;buf.height=H;
  var bx=buf.getContext('2d');bx.imageSmoothingEnabled=false;
  if(!window._cityData||window._cityData._W!==W||window._cityData._H!==H){
    window._cityData=buildCityData(W,H);
    window._cityData._W=W;window._cityData._H=H;
  }
  var frame=0;var _cityTick=0;
  function loop(){
    if(!document.getElementById('pixelCityBox')){return;}
    if(document.hidden){cityInterval=requestAnimationFrame(loop);return;}
    _cityTick++;
    /* On mobile: render every 3rd frame (~20fps); on desktop: every 2nd (~30fps) */
    /* Twinkling stars and window blinks don't need 60fps anyway */
    var skip=IS_MOBILE?6:2;
    if(_cityTick%skip===0){
      renderCity(bx,window._cityData,W,H,frame);
      ctx.clearRect(0,0,cv.width,cv.height);
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(buf,0,0,W,H,0,0,cv.width,cv.height);
      frame++;
    }
    cityInterval=requestAnimationFrame(loop);
  }
  loop();
}
function stopCityGlimmer(){
  if(cityInterval){cancelAnimationFrame(cityInterval);cityInterval=null;}
  cityEl=null;window._cityData=null;
}