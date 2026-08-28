/* ========================================================================
   CLIVEMAN - engine/navigation-hud.js
   Consolidated from: engine/compass.js, engine/minimap.js
   Keep sections isolated and in this order; classic-script shared scope applies.
   ======================================================================== */

/* ===== BEGIN engine/compass.js ===== */
/* ============================================================================
   compass.js — CMCOMPASS: a minimal FO4-style compass strip, shared by
   nav mode and the driving minigame.

   Frameless: no backing plate or border, just floating glyphs at the top
   of the viewport. Cardinal letters (N/E/S/W, amber) scroll across a ~120°
   window; intercardinals render as taller ticks (no text), minor ticks
   every 15°. Glyphs dissolve fully at the strip's edges. A small caret at
   the top centre marks the current facing. Optional markers (e.g. the
   drive destination) render as coloured dots at their bearing; off-screen
   markers clamp to the strip's edge at reduced alpha.

   API (all no-ops until mounted):
     CMCOMPASS.mount(parentEl)   attach the strip to a position:relative host
     CMCOMPASS.unmount()         detach + reset
     CMCOMPASS.update(headingDeg, markers)
                                 headingDeg: compass bearing, 0=N 90=E ...
                                 markers: [{bearing:deg, color:'#ff2a1a'}]
     CMCOMPASS.navUpdate(angleRad)
                                 nav-mode helper: raycaster angle -> bearing
                                 (angle 1.5π faces north => deg(angle)+90)

   Bearing conventions used by the callers:
     nav  : angle 0 = east(+col), 0.5π = south(+row)  -> bearing = deg+90
     drive: forward (fx,fz) = (sin h, cos h), north = +Z -> bearing = deg(h)
   ========================================================================== */
(function(){
'use strict';
if(typeof window==='undefined')return;

var CSS_W=200, CSS_H=16;        /* minimal FO4-style footprint */
var FOV=120;                    /* degrees visible across the strip */
var C={el:null,ctx:null,active:false,_lastKey:''};

var CARD=[
  {d:0,  t:'N', main:true},{d:45, t:'NE'},{d:90, t:'E', main:true},{d:135,t:'SE'},
  {d:180,t:'S', main:true},{d:225,t:'SW'},{d:270,t:'W', main:true},{d:315,t:'NW'}
];

function _ensure(){
  if(C.el)return;
  var dpr=Math.min(2,window.devicePixelRatio||1);
  var cv=document.createElement('canvas');
  cv.className='cm-compass';
  cv.width=Math.round(CSS_W*dpr); cv.height=Math.round(CSS_H*dpr);
  cv.setAttribute('aria-hidden','true');
  C.el=cv; C.ctx=cv.getContext('2d'); C._dpr=dpr;
}

C.mount=function(parent){
  if(!parent)return;
  _ensure();
  if(C.el.parentNode!==parent)parent.appendChild(C.el);
  C.active=true; C._lastKey='';
  C.update(C._lastHead||0,C._lastMarkers||null);
};
C.unmount=function(){
  C.active=false; C._lastKey='';
  if(C.el&&C.el.parentNode)C.el.parentNode.removeChild(C.el);
};

/* signed shortest angular difference a-b in (-180,180] */
function _adiff(a,b){var d=(a-b)%360;if(d>180)d-=360;if(d<=-180)d+=360;return d;}

C.update=function(headingDeg,markers){
  C._lastHead=headingDeg; C._lastMarkers=markers;
  if(!C.active||!C.ctx)return;
  headingDeg=((headingDeg%360)+360)%360;
  /* skip identical redraws (nav redraws every frame while idle) */
  var key=headingDeg.toFixed(1)+'|'+(markers?markers.map(function(m){return (((m.bearing%360)+360)%360).toFixed(1)+m.color;}).join(','):'');
  if(key===C._lastKey)return;
  C._lastKey=key;

  var x=C.ctx, dpr=C._dpr, W=C.el.width, H=C.el.height;
  var half=FOV/2, pxPerDeg=W/FOV;
  x.clearRect(0,0,W,H);

  /* edge fade: glyphs dissolve fully at the strip's ends (no frame) */
  var grd=x.createLinearGradient(0,0,W,0);
  grd.addColorStop(0,'rgba(0,0,0,1)');grd.addColorStop(0.18,'rgba(0,0,0,0)');
  grd.addColorStop(0.82,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(0,0,0,1)');

  x.textAlign='center'; x.textBaseline='middle';

  /* minor ticks every 15° (short, faint) */
  for(var d=0;d<360;d+=15){
    var off=_adiff(d,headingDeg);
    if(Math.abs(off)>half)continue;
    var px=W/2+off*pxPerDeg;
    if(d%45===0)continue;                    /* cardinals/intercardinals below */
    x.strokeStyle='rgba(140,255,170,0.32)';
    x.lineWidth=1*dpr;
    x.beginPath();x.moveTo(px,H*0.68);x.lineTo(px,H*0.92);x.stroke();
  }
  /* cardinals as letters; intercardinals as taller ticks only (FO4 style) */
  for(var i=0;i<CARD.length;i++){
    var cdd=CARD[i], off2=_adiff(cdd.d,headingDeg);
    if(Math.abs(off2)>half+6)continue;
    var px2=W/2+off2*pxPerDeg;
    if(cdd.main){
      x.font='bold '+(10*dpr)+'px "Share Tech Mono","VT323",monospace';
      x.fillStyle='#ffb000';x.shadowColor='#ffb000';x.shadowBlur=3*dpr;
      x.fillText(cdd.t,px2,H*0.42);
      x.shadowBlur=0;
      x.strokeStyle='rgba(255,176,0,0.7)';
      x.lineWidth=1.5*dpr;
      x.beginPath();x.moveTo(px2,H*0.70);x.lineTo(px2,H*0.94);x.stroke();
    }else{
      x.strokeStyle='rgba(150,230,170,0.55)';
      x.lineWidth=1*dpr;
      x.beginPath();x.moveTo(px2,H*0.52);x.lineTo(px2,H*0.92);x.stroke();
    }
  }

  /* markers (waypoints) — red dot clamped to the strip when off-screen */
  if(markers&&markers.length){
    for(var m=0;m<markers.length;m++){
      var mk=markers[m];
      var moff=_adiff(mk.bearing,headingDeg);
      var clamped=false;
      if(moff>half){moff=half;clamped=true;}
      else if(moff<-half){moff=-half;clamped=true;}
      var mx=W/2+moff*pxPerDeg;
      mx=Math.max(4*dpr,Math.min(W-4*dpr,mx));
      var r=2.6*dpr;
      x.globalAlpha=clamped?0.55:1;
      x.fillStyle=mk.color||'#ff2a1a';
      x.shadowColor=mk.color||'#ff2a1a';
      x.shadowBlur=4*dpr;
      x.beginPath();x.arc(mx,H*0.80,r,0,Math.PI*2);x.fill();
      x.shadowBlur=0;
      x.globalAlpha=1;
    }
  }

  /* fixed centre caret = current facing (small downward triangle at top) */
  x.fillStyle='rgba(234,255,240,0.95)';
  x.beginPath();
  x.moveTo(W/2-3*dpr,0.5*dpr);
  x.lineTo(W/2+3*dpr,0.5*dpr);
  x.lineTo(W/2,4.5*dpr);
  x.closePath();x.fill();

  /* edge fade overlay */
  x.save();x.globalCompositeOperation='destination-out';
  x.fillStyle=grd;x.fillRect(0,0,W,H);x.restore();
};

/* nav-mode adapter: raycaster angle (rad, 0=east, 0.5π=south) -> bearing */
C.navUpdate=function(angleRad){
  if(!C.active)return;
  C.update(angleRad*180/Math.PI+90,null);
};

window.CMCOMPASS=C;
})();
/* ===== END engine/compass.js ===== */

/* ===== BEGIN engine/minimap.js ===== */
/* ============================================================================
   minimap.js — CMMINIMAP: a GTA-IV-style circular, player-up minimap shared by
   the two interior nav renderers (the raster raycaster and the 3D nav mode).

   The map ROTATES so the player's facing is always straight up; a yellow arrow
   marks the player, pinned to the centre. Walls read as dark blocks, walkable
   floor as a lighter fill, and points of interest (doors, stairs, NPCs, items,
   exits) as coloured blips — all clipped inside a bordered disc with a soft
   dark rim, the way a GTA radar sits over the world.

   Drawn into ANY 2D context at an arbitrary offset (the caller translates the
   context first). Nothing outside the disc is touched, so it composites cleanly
   over the live 3D view.

   API:
     CMMINIMAP.drawGrid(ctx, size, grid, px, py, angRad)
       size   : square footprint in px (the disc fills it)
       grid   : 2D array of symbol chars
       px,py  : player position in fractional cell coords (px=col, py=row)
       angRad : facing, raycaster convention (0 = east/+col, 0.5π = south/+row)

   Grid coordinate note (matches raycaster + nav3d):
     forward = (cos a, sin a) in (col,row).  Screen up = forward, screen +x =
     the player's right = (-sin a, cos a).
   ========================================================================== */
(function(){
'use strict';
if(typeof window==='undefined')return;

var PAL={
  rim:    'rgba(0,0,0,0.55)',       /* soft dark halo behind the disc        */
  floor:  '#15281c',                /* walkable floor (light)                */
  wall:   '#0a130d',                /* full-height walls / blocks (dark)     */
  lowWall:'rgba(125,255,154,0.22)', /* counters / crates / half-height       */
  ring:   'rgba(206,224,214,0.5)',  /* thin border ring                      */
  player: '#ffd21e',                /* player arrow fill                     */
  playerEdge:'#0a130d'
};

/* Scratch space for P(): four (x,y) corners, reused across cells and frames. */
var _PT=new Float64Array(8);

function wallH(sym){ return (typeof rcWallHeight==='function') ? rcWallHeight(sym) : (sym==='#'?1:0); }

function drawGrid(ctx, size, grid, px, py, ang){
  var cx=size/2, cy=size/2, r=size/2-2;
  var VIEW=6;                         /* cells from centre to the disc edge   */
  var scale=r/VIEW;                   /* px per cell                          */
  var rows=grid.length, cols=0;
  for(var i=0;i<rows;i++) if(grid[i]&&grid[i].length>cols) cols=grid[i].length;
  var ca=Math.cos(ang), sa=Math.sin(ang);

  /* Map a cell-space point (c,row) to screen, player-up, writing the result
     into _PT[o],_PT[o+1] rather than returning a pair.

     This used to return a fresh [x,y] array. The radar redraws on every nav
     frame and P() runs four times per wall cell over a ~13x13 window, so that
     was on the order of a thousand throwaway arrays per frame - by far the
     largest source of GC churn in the render path. The scratch buffer holds
     four corners at once, which is all any caller needs live simultaneously. */
  function P(c,rw,o){
    var dc=c-px, dr=rw-py;
    var ahead = dc*ca + dr*sa;        /* -> screen up   */
    var right = -dc*sa + dr*ca;       /* -> screen +x   */
    _PT[o]=cx+right*scale; _PT[o+1]=cy-ahead*scale;
  }

  ctx.save();
  /* dark rim, then clip everything else to the disc */
  ctx.beginPath(); ctx.arc(cx,cy,r+1.5,0,Math.PI*2); ctx.fillStyle=PAL.rim; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
  /* light floor base */
  ctx.fillStyle=PAL.floor; ctx.fillRect(0,0,size,size);

  /* only the cells that can reach the disc */
  var reach=VIEW+2;
  var c0=Math.max(0,Math.floor(px-reach)), c1=Math.min(cols-1,Math.ceil(px+reach));
  var r0=Math.max(0,Math.floor(py-reach)), r1=Math.min(rows-1,Math.ceil(py+reach));

  /* full-height walls: dark filled cells */
  ctx.fillStyle=PAL.wall;
  var c,rw,row,h;
  for(rw=r0;rw<=r1;rw++){ row=grid[rw]; if(!row)continue;
    for(c=c0;c<=c1;c++){ if(wallH(row[c])<1.0)continue;
      P(c-0.5,rw-0.5,0); P(c+0.5,rw-0.5,2); P(c+0.5,rw+0.5,4); P(c-0.5,rw+0.5,6);
      ctx.beginPath();ctx.moveTo(_PT[0],_PT[1]);ctx.lineTo(_PT[2],_PT[3]);ctx.lineTo(_PT[4],_PT[5]);ctx.lineTo(_PT[6],_PT[7]);ctx.closePath();ctx.fill();
    }}
  /* half-height obstacles: faint filled cells */
  ctx.fillStyle=PAL.lowWall;
  for(rw=r0;rw<=r1;rw++){ row=grid[rw]; if(!row)continue;
    for(c=c0;c<=c1;c++){ h=wallH(row[c]); if(!(h>0&&h<1.0))continue;
      P(c-0.4,rw-0.4,0); P(c+0.4,rw-0.4,2); P(c+0.4,rw+0.4,4); P(c-0.4,rw+0.4,6);
      ctx.beginPath();ctx.moveTo(_PT[0],_PT[1]);ctx.lineTo(_PT[2],_PT[3]);ctx.lineTo(_PT[4],_PT[5]);ctx.lineTo(_PT[6],_PT[7]);ctx.closePath();ctx.fill();
    }}

  /* points of interest as coloured blips (doors, stairs, NPCs, items, exits) */
  var GL=(typeof FP_GLYPH!=='undefined')?FP_GLYPH:{};
  var DS=(typeof DOOR_SYMS!=='undefined')?DOOR_SYMS:{};
  var blip=Math.max(1.8, scale*0.26);
  for(rw=r0;rw<=r1;rw++){ row=grid[rw]; if(!row)continue;
    for(c=c0;c<=c1;c++){ var s=row[c]; var col=null;
      if(GL[s]&&GL[s].color) col=GL[s].color;
      else if(s in DS) col='#ffb000';
      else if(s==='S'||s==='v') col='#9fd8ff';
      if(!col)continue;
      P(c+0.5,rw+0.5,0);
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(_PT[0],_PT[1],blip,0,Math.PI*2); ctx.fill();
    }}
  ctx.restore();

  ring(ctx,cx,cy,r);
  arrow(ctx,cx,cy,Math.max(4,size*0.085));
}

/* thin border ring */
function ring(ctx,cx,cy,r){
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle=PAL.ring; ctx.lineWidth=1.5; ctx.stroke();
}

/* player chevron, pinned to centre, pointing up */
function arrow(ctx,cx,cy,s){
  ctx.save(); ctx.translate(cx,cy);
  ctx.fillStyle=PAL.player; ctx.strokeStyle=PAL.playerEdge; ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(0,-s);
  ctx.lineTo(s*0.72,s*0.82);
  ctx.lineTo(0,s*0.36);
  ctx.lineTo(-s*0.72,s*0.82);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

window.CMMINIMAP={ drawGrid:drawGrid, ring:ring, arrow:arrow, PAL:PAL };
})();
/* ===== END engine/minimap.js ===== */
