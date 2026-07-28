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
