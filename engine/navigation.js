/* ========================================================================
   CLIVEMAN 3.1  -  js/10-navigation.js
   Top-down room navigation and the animated city-glimmer background.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

async function navigateRoom(roomId,grid,start,events,exits,opts){if(!opts)opts={};if(!navJustExited&&screenEl.children.length>0){await pressEnterToContinue();}enterNavMode();let pos;let heading;if(state.resumeRoomId===roomId&&state.resumePos){pos=[state.resumePos[0],state.resumePos[1]];state.resumeRoomId=-1;state.resumePos=null;heading=(typeof state.resumeHeading==='number')?state.resumeHeading:0;}else{pos=[start[0],start[1]];heading=(typeof opts.startHeading==='number')?opts.startHeading:0;}state.roomId=roomId;state.savedRow=pos[0];state.savedCol=pos[1];state.heading=heading;const checked={};const rows=grid.length;drawFP(grid,pos,heading,opts.title||'',opts);drawCmdList();return new Promise(function(resolveExit){async function handleCheck(){if(typing)return;if(!movementAllowed)return;const key=pos[0]+','+pos[1];const r=pos[0],c=pos[1];if(exits[key]!=null){const code=exits[key];if(opts.exitGate){setMovementAllowed(false);const allowed=await opts.exitGate(code);setMovementAllowed(true);if(!allowed)return;}state.savedRow=pos[0];state.savedCol=pos[1];arrowHandler=null;swipeHandler=null;checkFn=null;resolveExit(code);return;}if(events[key]){const cellSym=grid[r][c];const isPickup=(cellSym==='I'||cellSym==='U');if(isPickup&&checked[key]){setMovementAllowed(false);await typeLine('"Nothing more here."','narration');setMovementAllowed(true);}else{setMovementAllowed(false);const eventResult=await events[key]();setMovementAllowed(true);if(isPickup){checked[key]=true;grid[r][c]='X';drawFP(grid,pos,heading,opts.title||'',opts);}if(typeof eventResult==='string'&&eventResult.length>0){state.savedRow=pos[0];state.savedCol=pos[1];arrowHandler=null;swipeHandler=null;checkFn=null;resolveExit(eventResult);return;}}}else{setMovementAllowed(false);await typeLine('"Nothing of note here."','narration');setMovementAllowed(true);}}
const _theme=pickTheme(opts.title||'');
const headAngles=[Math.PI*1.5,0,Math.PI*0.5,Math.PI];
function canStep(dr,dc){const nr=pos[0]+dr,nc=pos[1]+dc;return(nr>=0&&nr<rows&&nc>=0&&nc<grid[nr].length&&grid[nr][nc]!=='#');}
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
if(moved&&opts.onMove&&(action==='forward'||action==='back'||action==='strafe_left'||action==='strafe_right')){setMovementAllowed(false);await opts.onMove(pos);setMovementAllowed(true);}}
arrowHandler=handleMove;swipeHandler=handleMove;checkFn=handleCheck;
if(!IS_MOBILE){(async function typedLoop(){while(true){const raw=(await ask()).trim();if(arrowHandler==null)return;if(raw==='save'){showSaveCode();continue;}if(raw==='inv'||raw==='inventory'){showInv();continue;}if(raw==='check'||raw==='c'){await handleCheck();if(arrowHandler==null)return;continue;}if(raw==='monie'&&state.roomId===10){state.money=Math.min(1023,state.money+250);await typeLine('"$250 appears in your wallet. No questions asked."','sys');showStatus();continue;}if(raw==='')continue;await typeLine('"W/S forward/back, A/D turn, Q/E strafe, C check. Type INV/SAVE."','err');}})();}}).then(function(code){exitNavMode();return code;});}let cityInterval=null;let cityEl=null;function buildCityData(W,H){
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
