/* ============================================================================
   nav3d.js — TRUE 3D navigation renderer (Three.js), a drop-in replacement for
   the raycaster's per-frame draw. It builds a real 3D scene from the SAME room
   grid the raycaster uses, with FULL TEXTURE PARITY: walls, floors, ceilings,
   doors and stair openings all sample the raster renderer's own procedural
   texture generators (getWallTex / getFloorTex / getCeilTex / getDoorTex /
   getStairTex), so both renderers share one look per theme.

   Props are STATIONARY geometry, not camera-facing billboards:
     - doors ('D','E','1'-'6') and exits ('L')  -> panels mounted flush on walls
     - wall art (clock, photo, tv, badge)       -> mounted flush on walls
     - furniture (bed, couch, vats, ...)        -> upright plane backed against
                                                   its nearest wall
     - floor items (tnt, rat poison, ...)       -> fixed cross-quads (X), read
                                                   from every approach angle
     - glyph markers with no art                -> fixed cross-quads
     - people                                   -> the ONLY thing that turns to
                                                   face you (they're people)

   Height-mapped grids (grid._floorH — the factory stairwell) build real
   stepped geometry: per-tile floor slabs, riser steps at each seam, and the
   camera eye smoothly follows the interpolated floor height, so climbing
   between factory floors is one continuous 3D walk.

   Integration: rcRender() delegates here when NAV3D.enabled. If WebGL/Three is
   unavailable, or anything throws, we flip enabled=false and the caller falls
   back to the raster renderer. Reads shared-scope globals from raycaster.js:
   rcWallHeight, FP_GLYPH, ITEM_SPR, FURNITURE, DOOR_SYMS, rcDoorMountSide,
   pickTheme's texture generators.
   ========================================================================== */
(function(){
'use strict';
if(typeof window==='undefined')return;
var T=window.THREE;

var NAV3D={
  renderer:null, scene:null, camera:null, canvas:null, light:null,
  _grid:null, _theme:null, _people:[], _texCache:{}, ready:false, enabled:false,
  _floorH:null, _bobPhase:0, _lastPx:null, _lastPy:null
};

function webglOK(){
  try{var c=document.createElement('canvas');
    var gl=(c.getContext('webgl')||c.getContext('experimental-webgl'));
    return !!(gl&&typeof gl.getParameter==='function'&&gl.getParameter(gl.VERSION));
  }catch(e){return false;}
}
NAV3D.available=function(){return !!(T&&T.Scene&&webglOK());};

/* preference: default ON when available; persisted so a toggle survives reloads */
NAV3D.enabled=(function(){
  try{var v=localStorage.getItem('cliveman_nav3d');if(v==='0')return false;}catch(e){}
  return true;
})() && NAV3D.available();

/* ---- shared-scope texture generators -> THREE textures ------------------ */
/* getWallTex/getDoorTex/getStairTex cache canvases; getFloorTex/getCeilTex
   cache 2D contexts. Accept either. */
function _srcCanvas(x){return x&&x.canvas?x.canvas:x;}
function mkTex(src,repX,repY,smooth){
  var cv=_srcCanvas(src);if(!cv)return null;
  var tex=new T.CanvasTexture(cv);
  tex.colorSpace=T.SRGBColorSpace;
  if(smooth){
    tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;
    try{if(NAV3D.renderer&&NAV3D.renderer.capabilities)tex.anisotropy=Math.min(4,NAV3D.renderer.capabilities.getMaxAnisotropy());}catch(e){}
  }else{
    tex.magFilter=T.NearestFilter;tex.minFilter=T.NearestFilter;tex.generateMipmaps=false;
  }
  if(repX||repY){tex.wrapS=T.RepeatWrapping;tex.wrapT=T.RepeatWrapping;tex.repeat.set(repX||1,repY||1);}
  return tex;
}
function themeTex(kind,theme,variant){
  var th=theme||{};
  try{
    if(kind==='wallN')return mkTex(getWallTex(th.wallTex||'panels',th.wallN||'#1a3a22',variant||0),0,0,true);
    if(kind==='wallE')return mkTex(getWallTex(th.wallTex||'panels',th.wallE||'#142e1a',variant||0),0,0,true);
  }catch(e){}
  return null;
}

/* ---- pixel-art -> CanvasTexture (crisp, transparent) ---- */
function spriteTex(artKey){
  if(NAV3D._texCache[artKey])return NAV3D._texCache[artKey];
  var S=(typeof ITEM_SPR!=='undefined')?ITEM_SPR[artKey]:null;
  if(!S){NAV3D._texCache[artKey]=null;return null;}
  var R=S.r.length,C=S.r[0].length,sc=10;
  var cv=document.createElement('canvas');cv.width=C*sc;cv.height=R*sc;
  var ctx=cv.getContext('2d');
  for(var r=0;r<R;r++){var row=S.r[r];for(var c=0;c<C;c++){var col=S.p[row[c]];if(!col)continue;ctx.fillStyle=col;ctx.fillRect(c*sc,r*sc,sc,sc);}}
  var tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.__cachedByNav3d=true;tex.magFilter=T.NearestFilter;tex.minFilter=T.NearestFilter;tex.generateMipmaps=false;
  var rec={tex:tex,aspect:C/R};NAV3D._texCache[artKey]=rec;return rec;
}
/* simple humanoid silhouette texture for people (matches the raster figures) */
function personTex(color){
  var key='__person_'+color;
  if(NAV3D._texCache[key])return NAV3D._texCache[key];
  var W=48,H=96,cv=document.createElement('canvas');cv.width=W;cv.height=H;var x=cv.getContext('2d');
  x.fillStyle=color;
  x.beginPath();x.arc(W/2,H*0.16,H*0.11,0,Math.PI*2);x.fill();              /* head */
  x.beginPath();x.moveTo(W*0.30,H*0.30);x.lineTo(W*0.70,H*0.30);x.lineTo(W*0.62,H*0.66);x.lineTo(W*0.38,H*0.66);x.closePath();x.fill();/* torso */
  x.fillRect(W*0.22,H*0.30,W*0.08,H*0.34);x.fillRect(W*0.70,H*0.30,W*0.08,H*0.34);/* arms */
  x.fillRect(W*0.38,H*0.66,W*0.10,H*0.32);x.fillRect(W*0.52,H*0.66,W*0.10,H*0.32);/* legs */
  var tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.__cachedByNav3d=true;tex.magFilter=T.NearestFilter;tex.minFilter=T.LinearFilter;tex.generateMipmaps=false;
  var rec={tex:tex,aspect:W/H};NAV3D._texCache[key]=rec;return rec;
}
/* fallback texture for glyphs with no pixel-art (building markers etc). */
function glyphTex(g){
  var key='__glyph_'+g.ch+'_'+g.color+'_'+(g.label||'');
  if(NAV3D._texCache[key])return NAV3D._texCache[key];
  var W=96,H=128,cv=document.createElement('canvas');cv.width=W;cv.height=H;var x=cv.getContext('2d');
  x.textAlign='center';x.textBaseline='middle';
  x.shadowColor=g.color;x.shadowBlur=10;
  x.fillStyle=g.color;x.font='bold 58px monospace';
  x.fillText(g.ch,W/2,H*0.38);
  if(g.label){x.shadowBlur=4;x.fillStyle='#ffb000';x.font='16px monospace';
    x.fillText('['+g.label+']',W/2,H*0.78);}
  var tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.__cachedByNav3d=true;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearFilter;tex.generateMipmaps=false;
  var rec={tex:tex,aspect:W/H};NAV3D._texCache[key]=rec;return rec;
}

function col(hex,fallback){try{return new T.Color(hex||fallback);}catch(e){return new T.Color(fallback);}}

/* neighbour helpers */
function _sym(grid,r,c){if(r<0||r>=grid.length||!grid[r]||c<0||c>=grid[r].length)return '#';return grid[r][c];}
function _isWallSym(s){return (typeof rcWallHeight==='function')?rcWallHeight(s)>=1.0:s==='#';}
/* first adjacent solid-wall side of a cell: 'N','S','W','E' or null */
function _adjWall(grid,r,c){
  if(_isWallSym(_sym(grid,r-1,c)))return 'N';
  if(_isWallSym(_sym(grid,r+1,c)))return 'S';
  if(_isWallSym(_sym(grid,r,c-1)))return 'W';
  if(_isWallSym(_sym(grid,r,c+1)))return 'E';
  return null;
}
/* position + yaw for a plane mounted flush against `side` of cell (r,c) */
function _mountXF(r,c,side,off){
  off=(off==null)?0.485:off;
  var fx=c+0.5,fz=r+0.5,ry=0;
  if(side==='N'){fz=r+(0.5-off);ry=0;}
  else if(side==='S'){fz=r+0.5+off;ry=Math.PI;}
  else if(side==='W'){fx=c+(0.5-off);ry=Math.PI/2;}
  else if(side==='E'){fx=c+0.5+off;ry=-Math.PI/2;}
  return {x:fx,z:fz,ry:ry};
}

/* ---- attach a WebGL renderer to the canvas drawFP created ---- */
NAV3D.attach=function(canvas){
  if(!NAV3D.available()){NAV3D.enabled=false;return false;}
  if(NAV3D.canvas===canvas&&NAV3D.renderer)return true;
  try{
    if(NAV3D.renderer){
      try{NAV3D.renderer.dispose();
          if(NAV3D.renderer.forceContextLoss)NAV3D.renderer.forceContextLoss();}catch(e){}
    }
    var r=new T.WebGLRenderer({canvas:canvas,antialias:false,powerPreference:'high-performance'});
    r.setSize(canvas.width,canvas.height,false);
    NAV3D.renderer=r;NAV3D.canvas=canvas;
    NAV3D.camera=new T.PerspectiveCamera(74,canvas.width/canvas.height,0.04,60);
    NAV3D._grid=null;/* force rebuild */
    NAV3D.ready=true;return true;
  }catch(e){NAV3D.enabled=false;NAV3D.ready=false;return false;}
};

/* dispose every geometry/material/texture in a scene */
function _disposeScene(scene){
  if(!scene)return;
  scene.traverse(function(o){
    if(o.geometry)o.geometry.dispose();
    var m=o.material;
    if(m){(Array.isArray(m)?m:[m]).forEach(function(mm){
      if(mm.map&&!mm.map.__cachedByNav3d)mm.map.dispose();mm.dispose();});}
  });
}


/* ---- world-mapped factory scene -----------------------------------------
   Some rooms need multiple walkable layers at the same X/Z footprint. A
   raster grid cannot represent that directly, so gameplay uses an unambiguous
   logical corridor while grid._worldMap assigns every logical cell a true
   {x,y,z} position. This builder renders those positions literally. */
function _wmCell(grid,r,c){
  var W=grid&&grid._worldMap;
  return W&&W[r]&&W[r][c]?W[r][c]:null;
}
function _wmPoint(grid,px,py){
  var r=Math.floor(py),c=Math.floor(px),fx=px-c,fy=py-r;
  var p=_wmCell(grid,r,c);
  if(!p)return {x:px,y:0,z:py};
  /* World-mapped corridors are intentionally one cell wide. Bilinear blending
     at a T-junction mixed two unrelated branches and bent the camera through
     walls. Interpolate only toward the axis the player is actually crossing. */
  var ox=fx-0.5,oy=fy-0.5,useX=Math.abs(ox)>=Math.abs(oy);
  var n=null,t=0;
  if(useX){n=_wmCell(grid,r,c+(ox>=0?1:-1));t=Math.min(1,Math.abs(ox)*2);}
  else{n=_wmCell(grid,r+(oy>=0?1:-1),c);t=Math.min(1,Math.abs(oy)*2);}
  if(!n)return {x:p.x,y:p.y,z:p.z};
  var dist=Math.hypot(n.x-p.x,n.y-p.y,n.z-p.z);
  /* Never interpolate across a logical adjacency that is not physically
     adjacent. Snapping to the current centre is much safer than camera flight. */
  if(dist>1.65)return {x:p.x,y:p.y,z:p.z};
  return {x:p.x+(n.x-p.x)*t,y:p.y+(n.y-p.y)*t,z:p.z+(n.z-p.z)*t};
}

function _buildWorldMapped(scene,grid,theme){
  var rows=grid.length,FG=(typeof FP_GLYPH!=='undefined')?FP_GLYPH:{},DS=(typeof DOOR_SYMS!=='undefined')?DOOR_SYMS:{};
  var itemArt=window._navItemArt||{},furn=window._navFurniture||{};
  var floorMat=new T.MeshLambertMaterial({color:col(theme&&theme.floor2,'#172019')});
  var wallMat=new T.MeshLambertMaterial({color:col(theme&&theme.wallN,'#3a4a2a')});
  var wallSide=new T.MeshLambertMaterial({color:col(theme&&theme.wallE,'#2e3a1e')});
  var ceilMat=new T.MeshLambertMaterial({color:col(theme&&theme.ceil,'#11130d')});
  var railMat=new T.MeshStandardMaterial({color:0x41463d,roughness:0.7,metalness:0.45});
  var seenFloor={},seenWall={};
  function k3(p){return [p.x.toFixed(2),p.y.toFixed(2),p.z.toFixed(2)].join('/');}
  function addFloor(p){var k=k3(p);if(seenFloor[k])return;seenFloor[k]=1;var m=new T.Mesh(new T.BoxGeometry(0.96,0.10,0.96),floorMat);m.position.set(p.x,p.y-0.05,p.z);scene.add(m);}
  function addWall(p){var k=k3(p);if(seenWall[k])return;seenWall[k]=1;var m=new T.Mesh(new T.BoxGeometry(0.96,2.2,0.96),[wallMat,wallSide,ceilMat,ceilMat,wallMat,wallSide]);m.position.set(p.x,p.y+1.1,p.z);scene.add(m);}
  function addCrossWM(rec,p,h,person){if(!rec)return;var mat=new T.MeshBasicMaterial({map:rec.tex,transparent:true,alphaTest:0.5,side:T.DoubleSide,fog:true});var w=h*rec.aspect;var a=new T.Mesh(new T.PlaneGeometry(w,h),mat);a.position.set(p.x,p.y+h/2+0.01,p.z);a.rotation.y=Math.PI/4;scene.add(a);if(person){NAV3D._people.push(a);return;}var b=new T.Mesh(new T.PlaneGeometry(w,h),mat);b.position.copy(a.position);b.rotation.y=-Math.PI/4;scene.add(b);}
  NAV3D._people=[];
  for(var r=0;r<rows;r++){var row=grid[r];if(!row)continue;for(var c=0;c<row.length;c++){
    var p=_wmCell(grid,r,c);if(!p)continue;var sym=row[c];
    if(_isWallSym(sym)){addWall(p);continue;}addFloor(p);
    var g=FG[sym],artKey=itemArt[r+','+c];
    if(g&&!artKey){
      if(g.person)addCrossWM(personTex(g.color||'#7fdf7f'),p,0.72,true);
      else if(sym!=='S'&&sym!=='v')addCrossWM(glyphTex(g),p,Math.min(0.58,(g.sprH||0.5)*0.72),false);
    }
  }}
  for(var rr=0;rr<rows;rr++){for(var cc=0;cc<(grid[rr]?grid[rr].length-1:0);cc++){
    if(_isWallSym(grid[rr][cc])||_isWallSym(grid[rr][cc+1]))continue;
    var a=_wmCell(grid,rr,cc),b=_wmCell(grid,rr,cc+1);if(!a||!b)continue;
    var dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<0.05||len>1.55)continue;
    var bridge=new T.Mesh(new T.BoxGeometry(len+0.12,0.10,0.72),floorMat);bridge.position.set((a.x+b.x)/2,(a.y+b.y)/2-0.05,(a.z+b.z)/2);bridge.rotation.y=-Math.atan2(dz,dx);scene.add(bridge);
  }}
  /* A calm, readable stair enclosure replaces hundreds of directionless rail
     posts. It frames the tower without creating a cage of flickering geometry. */
  for(var sf=0;sf<5;sf++){
    var sy=sf*3.0;
    var sideA=new T.Mesh(new T.BoxGeometry(5.9,2.7,0.10),wallSide);sideA.position.set(11.0,sy+1.35,6.95);scene.add(sideA);
    var sideB=new T.Mesh(new T.BoxGeometry(5.9,2.7,0.10),wallSide);sideB.position.set(11.0,sy+1.35,9.05);scene.add(sideB);
    var endW=new T.Mesh(new T.BoxGeometry(0.10,2.7,2.2),wallMat);endW.position.set(14.0,sy+1.35,8.0);scene.add(endW);
    var slab=new T.Mesh(new T.BoxGeometry(7,0.06,5),ceilMat);slab.position.set(3.5,sy+2.72,2.5);scene.add(slab);
  }
  var REG=(typeof FURNITURE!=='undefined')?FURNITURE:{};
  for(var ik in itemArt){var q=ik.split(','),ip=_wmCell(grid,+q[0],+q[1]);if(ip)addCrossWM(spriteTex(itemArt[ik]),ip,0.48,false);}
  for(var fk in furn){var z=fk.split(','),fp=_wmCell(grid,+z[0],+z[1]),reg=REG[furn[fk]];if(fp&&reg)addCrossWM(spriteTex(reg.art),fp,reg.sprH||0.65,false);}
  NAV3D._hand=null;
  try{if(window.CMHAND){var hand=CMHAND.build(T);if(hand){scene.add(hand);NAV3D._hand=hand;}}}catch(e){NAV3D._hand=null;}
  NAV3D._floorH=null;
}

/* ---- build the scene from the grid ---- */
NAV3D.build=function(grid,theme){
  _disposeScene(NAV3D.scene);
  var scene=new T.Scene();
  var fog=col(theme&&theme.fog,'#040804');
  scene.background=fog.clone();
  scene.fog=new T.Fog(fog.getHex(),1.2,8.5);
  /* Since r155 useLegacyLights defaults false: point-light intensity is physical
     (candela) with realistic decay. The old 0.9 flashlight lit almost nothing, so
     walls sank into the fog above/beyond the near-floor band and read as only
     "partially textured". Rescaled for physical lighting (don't rely on the
     deprecated useLegacyLights flag). */
  scene.add(new T.AmbientLight(0x3a463a,2.2));
  var hemi=new T.HemisphereLight(0x7a8a98,0x181810,1.6);scene.add(hemi);
  /* player "flashlight": a point light moved to the camera each frame */
  var pl=new T.PointLight(0xffe6b0,18,7.0,2);scene.add(pl);NAV3D.light=pl;

  if(grid._worldMap){
    /* The factory is an investigation space, not a horror maze. Keep the full
       stair tower readable and prevent nearby geometry from vanishing into fog. */
    scene.fog=new T.Fog(fog.getHex(),5.5,26);
    scene.add(new T.AmbientLight(0xb8c4ad,1.35));
    _buildWorldMapped(scene,grid,theme);
    NAV3D.scene=scene;NAV3D._grid=grid;NAV3D._theme=theme;return;
  }

  var rows=grid.length,cols=0,i;
  for(i=0;i<rows;i++)if(grid[i]&&grid[i].length>cols)cols=grid[i].length;

  var FH=grid._floorH||null;NAV3D._floorH=FH;
  var maxH=0;
  if(FH){for(var fr=0;fr<FH.length;fr++){var frow=FH[fr];if(!frow)continue;
    for(var fc=0;fc<frow.length;fc++){if(frow[fc]!=null&&frow[fc]>maxH)maxH=frow[fc];}}}
  var wallTop=maxH+1.0;   /* full-height walls / ceiling clearance */

  /* ---------- textures (shared with the raster renderer) ---------- */
  var floorSrc=null,ceilSrc=null;
  try{floorSrc=getFloorTex(theme&&theme.floorTex||'concrete',
      theme&&theme.floor1||'#0a120e',theme&&theme.floor2||'#101a14');}catch(e){}
  try{ceilSrc=getCeilTex(theme&&theme.ceilTex||'stucco',theme&&theme.ceil||'#040804');}catch(e){}
  var matCap=new T.MeshLambertMaterial({color:col(theme&&theme.ceil,'#0a0806')});
  /* Four deterministic wall variants stop every block from repeating the exact
     same stain/crack pattern. The larger 128px maps use linear mip filtering in
     WebGL, while gameplay sprites and floor glyphs remain crisp pixel art. */
  var wallMatsByVariant=[];
  for(var wv=0;wv<4;wv++){
    var nTex=themeTex('wallN',theme,wv),eTex=themeTex('wallE',theme,wv);
    if(wallTop>1.01){
      nTex=nTex?nTex.clone():null;eTex=eTex?eTex.clone():null;
      [nTex,eTex].forEach(function(t){if(!t)return;t.wrapT=T.RepeatWrapping;t.repeat.set(1,wallTop);t.needsUpdate=true;});
    }
    var mN=nTex?new T.MeshLambertMaterial({map:nTex}):new T.MeshLambertMaterial({color:col(theme&&theme.wallN,'#1a3a22')});
    var mE=eTex?new T.MeshLambertMaterial({map:eTex}):new T.MeshLambertMaterial({color:col(theme&&theme.wallE,'#142e1a')});
    var topTex=null;try{topTex=mkTex(getWallTex(theme&&theme.wallTex||'panels',theme&&theme.wallN||'#1a3a22',wv),0,0,true);}catch(e){}
    var mTop=topTex?new T.MeshLambertMaterial({map:topTex}):matCap;
    if(mTop!==matCap&&mTop.color&&mTop.color.multiplyScalar)mTop.color.multiplyScalar(0.78);
    wallMatsByVariant[wv]=[mE,mE,mTop,matCap,mN,mN];
  }
  /* Un-repeated riser material avoids smearing on short stair faces. */
  var riserTex=themeTex('wallE',theme,0);
  var matRiser=riserTex?new T.MeshLambertMaterial({map:riserTex})
                       :new T.MeshLambertMaterial({color:col(theme&&theme.wallE,'#142e1a')});

  /* ---------- floor & ceiling ---------- */
  if(!FH){
    var fTex=mkTex(floorSrc,cols,rows);
    var floor=new T.Mesh(new T.PlaneGeometry(cols,rows),
      fTex?new T.MeshLambertMaterial({map:fTex})
          :new T.MeshLambertMaterial({color:col(theme&&theme.floor1,'#1a120e')}));
    floor.rotation.x=-Math.PI/2;floor.position.set(cols/2,0,rows/2);scene.add(floor);
  }else{
    /* height-mapped floor: one textured slab per walkable tile + risers/steps */
    var slabTex=mkTex(floorSrc);
    var slabMat=slabTex?new T.MeshLambertMaterial({map:slabTex})
                       :new T.MeshLambertMaterial({color:col(theme&&theme.floor1,'#1a120e')});
    for(var hr=0;hr<rows;hr++){var hrow=grid[hr];if(!hrow)continue;
      for(var hc=0;hc<hrow.length;hc++){
        if(_isWallSym(hrow[hc]))continue;
        var hh=(FH[hr]&&FH[hr][hc]!=null)?FH[hr][hc]:0;
        var slab=new T.Mesh(new T.PlaneGeometry(1,1),slabMat);
        slab.rotation.x=-Math.PI/2;slab.position.set(hc+0.5,hh,hr+0.5);scene.add(slab);
        /* seams: risers + 3 mini-steps toward each lower neighbour */
        var nbs=[[hr+1,hc,0],[hr-1,hc,Math.PI],[hr,hc+1,-Math.PI/2],[hr,hc-1,Math.PI/2]];
        for(var nb=0;nb<nbs.length;nb++){
          var nr=nbs[nb][0],nc=nbs[nb][1];
          if(_isWallSym(_sym(grid,nr,nc)))continue;
          var nh=(FH[nr]&&FH[nr][nc]!=null)?FH[nr][nc]:0;
          var dh=hh-nh;if(dh<=0.011)continue;      /* only build from the higher side */
          var ex=hc+0.5+(nc-hc)*0.5, ez=hr+0.5+(nr-hr)*0.5;   /* seam centre */
          /* full riser wall so there is never a see-through gap */
          var riser=new T.Mesh(new T.PlaneGeometry(1,dh),matRiser);
          riser.position.set(ex,nh+dh/2,ez);
          riser.rotation.y=Math.atan2(hc-nc,hr-nr)+Math.PI;   /* face the lower tile */
          scene.add(riser);
          /* 3 mini-steps on the lower tile so the seam climbs like stairs */
          for(var stp=0;stp<3;stp++){
            var sh2=dh*(stp+1)/3.2, depth=0.14;
            var sb2=new T.Mesh(new T.BoxGeometry(
              (nr!==hr)?0.92:depth, sh2, (nr!==hr)?depth:0.92), matRiser);
            var back=0.07+stp*depth;
            sb2.position.set(ex+(hc-nc)*(-back), nh+sh2/2, ez+(hr-nr)*(-back));
            scene.add(sb2);
          }
        }
      }}
  }
  var cTex=mkTex(ceilSrc,cols,rows);
  var ceil=new T.Mesh(new T.PlaneGeometry(cols,rows),
    cTex?new T.MeshLambertMaterial({map:cTex,side:T.DoubleSide})
        :new T.MeshLambertMaterial({color:col(theme&&theme.ceil,'#0a0806'),side:T.DoubleSide}));
  ceil.rotation.x=Math.PI/2;ceil.position.set(cols/2,wallTop,rows/2);scene.add(ceil);

  /* ---------- walls (full + low) ---------- */
  var wh=(typeof rcWallHeight==='function')?rcWallHeight:function(){return 0;};
  for(var r=0;r<rows;r++){var row=grid[r];if(!row)continue;for(var c=0;c<row.length;c++){
    var sym=row[c];var h=wh(sym);
    var wallVariant=((r*7+c*13)&3),wallMats=wallMatsByVariant[wallVariant];
    if(h>=1.0){var b=new T.Mesh(new T.BoxGeometry(1,wallTop,1),wallMats);
      b.position.set(c+0.5,wallTop/2,r+0.5);scene.add(b);}
    else if(h>0){var lb=new T.Mesh(new T.BoxGeometry(1,h,1),wallMats);
      lb.position.set(c+0.5,h/2,r+0.5);scene.add(lb);}
  }}
  /* implicit boundary walls: the raster DDA treats every out-of-grid cell as a
     full wall (grid edge = wall), so many rooms omit their perimeter '#'s.
     Without this ring those rooms render open voids straight to the fog
     background - flat untextured "walls" behind wall-mounted props. */
  for(var er=-1;er<=rows;er++){for(var ec=-1;ec<=cols;ec++){
    if(er!==-1&&er!==rows&&ec!==-1&&ec!==cols)continue;
    var edgeVariant=((er*7+ec*13)&3);
    var ebx=new T.Mesh(new T.BoxGeometry(1,wallTop,1),wallMatsByVariant[edgeVariant]);
    ebx.position.set(ec+0.5,wallTop/2,er+0.5);scene.add(ebx);
  }}

  /* ---------- doors & exits: panels mounted flush on their wall ---------- */
  var DS=(typeof DOOR_SYMS!=='undefined')?DOOR_SYMS:{};
  var FG=(typeof FP_GLYPH!=='undefined')?FP_GLYPH:{};
  var mount=(typeof rcDoorMountSide==='function')?rcDoorMountSide:null;
  function mountDoor(r,c,label){
    var side=mount?mount(grid,r,c):_adjWall(grid,r,c);
    if(!side)return false;
    var dcv=null;
    try{dcv=getDoorTex(theme&&theme.wallN||'#1a3a22',label||'');}catch(e){}
    var dtex=dcv?mkTex(dcv,0,0,true):null;
    var dmat=dtex?new T.MeshLambertMaterial({map:dtex})
                 :new T.MeshLambertMaterial({color:0x5a3a1e});
    var xf=_mountXF(r,c,side);
    var dpl=new T.Mesh(new T.PlaneGeometry(1,1),dmat);
    dpl.position.set(xf.x,0.5,xf.z);dpl.rotation.y=xf.ry;scene.add(dpl);
    return true;
  }
  for(var dr=0;dr<rows;dr++){var drow=grid[dr];if(!drow)continue;for(var dc2=0;dc2<drow.length;dc2++){
    var dsy=drow[dc2];
    if(dsy in DS){mountDoor(dr,dc2,DS[dsy].label||'');}
    else if(dsy==='L'){ if(!mountDoor(dr,dc2,'EXIT')){
      /* free-standing exit: fixed cross-quad, never a follow-billboard */
      addCross(glyphTex(FG['L']||{ch:'\u2192',color:'#ff3333'}),dc2+0.5,dr+0.5,0.55);
    }}
  }}

  /* ---------- stair openings ('S'/'v' in flat rooms) ---------- */
  if(!FH){
    for(var sr=0;sr<rows;sr++){var srow=grid[sr];if(!srow)continue;for(var sc2=0;sc2<srow.length;sc2++){
      var ss=srow[sc2];if(ss!=='S'&&ss!=='v')continue;
      /* stair texture mounted on the adjacent wall = the "opening" */
      var sside=_adjWall(grid,sr,sc2);
      if(sside){
        var scv=null;try{scv=getStairTex(theme&&theme.wallN||'#1a3a22',ss==='v'?'down':'up');}catch(e){}
        if(scv){var smt=new T.MeshLambertMaterial({map:mkTex(scv)});
          var sxf=_mountXF(sr,sc2,sside);
          var spl=new T.Mesh(new T.PlaneGeometry(1,1),smt);
          spl.position.set(sxf.x,0.5,sxf.z);spl.rotation.y=sxf.ry;scene.add(spl);}
      }
      /* little step wedge on the floor so it reads in 3D */
      var smat=new T.MeshLambertMaterial({color:col(theme&&theme.wallE,'#243018')});
      for(var st=0;st<3;st++){
        var sh=0.16*(st+1);var sb=new T.Mesh(new T.BoxGeometry(0.9,sh,0.28),smat);
        sb.position.set(sc2+0.5,sh/2,sr+0.18+st*0.28);scene.add(sb);
      }
    }}
  }

  /* ---------- props: STATIONARY geometry ---------- */
  NAV3D._people=[];
  var WALL_ART={clock:1,photo:1,tv:1,badge:1};
  function baseY(r,c){ if(!FH)return 0;
    var v=(FH[r]&&FH[r][c]!=null)?FH[r][c]:0; return v; }
  function mkMat(rec){return new T.MeshBasicMaterial({map:rec.tex,transparent:true,
    alphaTest:0.5,side:T.DoubleSide,fog:true,depthWrite:true});}
  /* fixed X cross-quad: two perpendicular planes, visible from any angle */
  function addCross(rec,worldX,worldZ,heightFrac,r,c){
    if(!rec)return;var h=heightFrac,w=h*rec.aspect,y0=(r!=null)?baseY(r,c):0;
    var mat=mkMat(rec);
    var a=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    a.position.set(worldX,y0+h/2+0.001,worldZ);a.rotation.y=Math.PI/4;scene.add(a);
    var b2=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    b2.position.set(worldX,y0+h/2+0.001,worldZ);b2.rotation.y=-Math.PI/4;scene.add(b2);
  }
  /* single plane backed against the nearest wall (set dressing) */
  function addBacked(rec,r,c,heightFrac){
    if(!rec)return;var h=heightFrac,w=Math.min(0.96,h*rec.aspect);
    var side=_adjWall(grid,r,c),y0=baseY(r,c);
    var m=new T.Mesh(new T.PlaneGeometry(w,h),mkMat(rec));
    if(side){var xf=_mountXF(r,c,side,0.34);
      m.position.set(xf.x,y0+h/2+0.001,xf.z);m.rotation.y=xf.ry;}
    else{m.position.set(c+0.5,y0+h/2+0.001,r+0.5);
      m.rotation.y=((r*31+c*17)%4)*(Math.PI/2);} /* deterministic, grid-aligned */
    scene.add(m);
  }
  /* flush wall mount (clocks, photos, TVs, badge boards) */
  function addWallArt(rec,r,c,heightFrac){
    if(!rec)return;
    var side=_adjWall(grid,r,c);
    if(!side){addCross(rec,c+0.5,r+0.5,heightFrac,r,c);return;}
    var h=heightFrac,w=h*rec.aspect,xf=_mountXF(r,c,side),y0=baseY(r,c);
    var m=new T.Mesh(new T.PlaneGeometry(w,h),mkMat(rec));
    m.position.set(xf.x,y0+0.62,xf.z);m.rotation.y=xf.ry;scene.add(m);
  }
  /* lightweight procedural 3D item models. These use primitive geometry so
     evidence reads as a physical object without adding model files or loaders. */
  function itemMat(color,rough){return new T.MeshStandardMaterial({color:color,roughness:rough==null?0.78:rough,metalness:0.04});}
  function addPart(group,geo,mat,x,y,z,rx,ry,rz){
    var m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.rotation.set(rx||0,ry||0,rz||0);group.add(m);return m;
  }
  function addLowPolyItem(kind,r,c){
    var g=new T.Group(), y0=baseY(r,c), seed=(r*31+c*17)%7;
    g.position.set(c+0.5,y0+0.015,r+0.5);g.rotation.y=(seed/7)*Math.PI*2;
    var dark=itemMat(0x25282b), paper=itemMat(0xd8cfad), red=itemMat(0x9e251d), pale=itemMat(0xd5d0b8), glass=itemMat(0x58634d,0.3);
    if(kind==='mopBucket'){
      addPart(g,new T.CylinderGeometry(0.18,0.23,0.28,8),itemMat(0xc49b21),0,0.14,0);
      addPart(g,new T.TorusGeometry(0.18,0.018,5,10,Math.PI),dark,0,0.31,0,0,0,0);
      addPart(g,new T.CylinderGeometry(0.018,0.018,0.72,6),itemMat(0x765338),0.17,0.44,0,0,0,-0.28);
      addPart(g,new T.CylinderGeometry(0.085,0.055,0.16,7),itemMat(0xc9c2a6),0.27,0.12,0,0,0,-0.28);
    }else if(kind==='ratPoison'){
      addPart(g,new T.BoxGeometry(0.34,0.28,0.18),red,0,0.14,0,0.04,-0.12,0);
      addPart(g,new T.BoxGeometry(0.27,0.012,0.02),pale,0,0.17,-0.095,0.04,-0.12,0);
      addPart(g,new T.BoxGeometry(0.12,0.012,0.02),dark,0,0.10,-0.097,0.04,-0.12,0);
    }else if(kind==='tnt'){
      for(var i=-1;i<=1;i++)addPart(g,new T.CylinderGeometry(0.055,0.055,0.34,8),red,i*0.10,0.075,0,Math.PI/2,0,Math.PI/2);
      addPart(g,new T.BoxGeometry(0.34,0.035,0.08),dark,0,0.11,0);
      addPart(g,new T.TorusGeometry(0.08,0.009,4,8,Math.PI),itemMat(0xcaa75b),0.08,0.19,0,Math.PI/2,0,0);
    }else if(kind==='bottles'){
      for(var b=0;b<4;b++){var bx=(b%2)*0.13-0.065,bz=Math.floor(b/2)*0.12-0.06;
        addPart(g,new T.CylinderGeometry(0.035,0.045,0.22,7),glass,bx,0.11,bz);
        addPart(g,new T.CylinderGeometry(0.018,0.026,0.09,7),glass,bx,0.265,bz);}
    }else if(kind==='papers'){
      for(var p2=0;p2<5;p2++)addPart(g,new T.BoxGeometry(0.34-p2*0.015,0.009,0.25-p2*0.008),paper,(p2%2)*0.02,0.008+p2*0.010,(p2%3)*0.01,0,(p2-2)*0.05,0);
    }else if(kind==='laundry'){
      addPart(g,new T.DodecahedronGeometry(0.20,0),itemMat(0x6d7378),-0.08,0.13,0.02,0.2,0.1,0.1);
      addPart(g,new T.DodecahedronGeometry(0.17,0),itemMat(0x493e47),0.10,0.10,-0.04,-0.1,0.4,0.2);
      addPart(g,new T.DodecahedronGeometry(0.12,0),itemMat(0x827258),0.02,0.22,0.07,0.3,0.1,-0.2);
    }else if(kind==='debris'){
      for(var d=0;d<6;d++)addPart(g,new T.TetrahedronGeometry(0.10+(d%3)*0.025,0),itemMat(d%2?0x5f625d:0x3e4140),(d%3-1)*0.13,0.06+(d%2)*0.025,(Math.floor(d/3)-0.5)*0.16,d*0.3,d*0.2,0);
    }else return false;
    g.scale.setScalar(0.92);scene.add(g);return true;
  }

  /* people: the one thing that keeps facing the player */
  function addPerson(rec,worldX,worldZ,heightFrac,r,c){
    if(!rec)return;var h=heightFrac,w=h*rec.aspect,y0=(r!=null)?baseY(r,c):0;
    var m=new T.Mesh(new T.PlaneGeometry(w,h),mkMat(rec));
    m.position.set(worldX,y0+h/2+0.001,worldZ);scene.add(m);NAV3D._people.push(m);
  }

  var itemArt=window._navItemArt||null;
  for(var ir=0;ir<rows;ir++){var irow=grid[ir];if(!irow)continue;for(var ic=0;ic<irow.length;ic++){
    var isym=irow[ic];
    if((isym in DS)||isym==='S'||isym==='v'||isym==='L')continue;  /* handled above */
    var g=FG[isym];if(!g)continue;
    if(g.person){addPerson(personTex(g.color||'#7fdf7f'),ic+0.5,ir+0.5,0.72,ir,ic);continue;}
    var ak=itemArt&&itemArt[ir+','+ic];
    if(ak){
      if(WALL_ART[ak])addWallArt(spriteTex(ak),ir,ic,(g.sprH||0.45)+0.06);
      else if(!addLowPolyItem(ak,ir,ic))addCross(spriteTex(ak),ic+0.5,ir+0.5,(g.sprH||0.45)+0.06,ir,ic);
    }
    else{addCross(glyphTex(g),ic+0.5,ir+0.5,Math.min(0.62,(g.sprH||0.5)*0.75),ir,ic);}
  }}
  var FURN=window._navFurniture||null;
  var REG=(typeof FURNITURE!=='undefined')?FURNITURE:{};
  if(FURN){for(var key in FURN){var p=key.split(','),fr2=+p[0],fc2=+p[1];var reg=REG[FURN[key]];if(!reg)continue;
    addBacked(spriteTex(reg.art),fr2,fc2,reg.sprH);}}

  /* first-person right-hand viewmodel (nav mode only) */
  NAV3D._hand=null;
  try{ if(window.CMHAND){ var _hnd=CMHAND.build(T); if(_hnd){ scene.add(_hnd); NAV3D._hand=_hnd; } } }catch(e){ NAV3D._hand=null; }

  NAV3D.scene=scene;NAV3D._grid=grid;NAV3D._theme=theme;
};

/* smooth eye height over a height-mapped floor (bilinear over tile centres).
   The clamped sampler is hoisted out rather than redefined per call: floorHAt
   runs once per rendered frame, so the inner function was a closure allocation
   on every frame for no reason. */
function _fhAt(FH,r,c,fallback){
  var G=NAV3D._grid;
  if(r<0||r>=FH.length||!FH[r]||c<0||c>=FH[r].length)return fallback;
  /* Never blend camera height with a wall cell. Factory wall entries use 0 as
     a harmless renderer placeholder; sampling that value beside an upper deck
     used to pull the camera toward the ground and made the building appear to
     sink or lurch near walls and stair rails. */
  if(G&&(_isWallSym(_sym(G,r,c))))return fallback;
  return (FH[r][c]!=null)?FH[r][c]:fallback;
}
function floorHAt(px,py){
  var FH=NAV3D._floorH;if(!FH)return 0;
  var gx=px-0.5,gy=py-0.5;
  var c0=Math.floor(gx),r0=Math.floor(gy),tx=gx-c0,ty=gy-r0;
  var cr=Math.floor(py),cc=Math.floor(px);
  var base=(FH[cr]&&FH[cr][cc]!=null)?FH[cr][cc]:0;
  var h00=_fhAt(FH,r0,c0,base),h01=_fhAt(FH,r0,c0+1,base),h10=_fhAt(FH,r0+1,c0,base),h11=_fhAt(FH,r0+1,c0+1,base);
  return (h00*(1-tx)+h01*tx)*(1-ty)+(h10*(1-tx)+h11*tx)*ty;
}

/* ---- per-frame render (called by rcRender) ---- */
NAV3D.render=function(grid,px,py,angle,theme,pitch){
  if(!NAV3D.ready)return false;
  try{
    if(NAV3D._grid!==grid||NAV3D._theme!==theme)NAV3D.build(grid,theme);
    var cam=NAV3D.camera;
    /* walk-bob: same idea as the raster BOB_AMOUNT, driven by actual motion */
    var bob=0,mv=0;
    if(NAV3D._lastPx!=null){
      var d=Math.hypot(px-NAV3D._lastPx,py-NAV3D._lastPy);
      if(d>0.0004){NAV3D._bobPhase+=d*9.0;mv=Math.min(1,d*70);bob=Math.sin(NAV3D._bobPhase)*0.015*mv;}
    }
    NAV3D._lastPx=px;NAV3D._lastPy=py;
    var pit=pitch||0,eyeY,wx,wz,lx,lz;
    if(grid._worldMap){
      var wp=_wmPoint(grid,px,py),ap=_wmPoint(grid,px+Math.cos(angle)*0.18,py+Math.sin(angle)*0.18);
      wx=wp.x;wz=wp.z;eyeY=wp.y+0.5+bob;
      var dx=ap.x-wp.x,dz=ap.z-wp.z,dl=Math.hypot(dx,dz)||1;lx=wx+dx/dl;lz=wz+dz/dl;
    }else{wx=px;wz=py;eyeY=0.5+floorHAt(px,py)+bob;lx=px+Math.cos(angle);lz=py+Math.sin(angle);}
    cam.position.set(wx,eyeY,wz);
    cam.up.set(0,1,0);
    cam.lookAt(lx,eyeY+pit*1.1,lz);
    if(NAV3D.light)NAV3D.light.position.set(wx,eyeY+0.12,wz);
    if(NAV3D._hand&&window.CMHAND)CMHAND.follow(cam,bob,mv,NAV3D._bobPhase);
    var pp=NAV3D._people;
    for(var i=0;i<pp.length;i++){var m=pp[i];m.rotation.y=Math.atan2(wx-m.position.x,wz-m.position.z);}
    NAV3D.renderer.render(NAV3D.scene,cam);
    if(NAV3D.mm)NAV3D.drawMinimap(grid,px,py,angle);
    return true;
  }catch(e){NAV3D.enabled=false;NAV3D.ready=false;return false;}
};

/* ---- minimap overlay (same tactical map, drawn to a small 2D canvas) ---- */
NAV3D.mm=null;
NAV3D.drawMinimap=function(grid,px,py,ang){
  var cv=NAV3D.mm;if(!cv)return;var x=cv.getContext('2d');if(!x)return;
  var W=cv.width,H=cv.height;
  x.clearRect(0,0,W,H);
  /* same GTA-IV-style radar as the raster mode (circular, rotates to facing) */
  if(window.CMMINIMAP)CMMINIMAP.drawGrid(x,Math.min(W,H),grid,px,py,ang);
};
NAV3D.resize=function(w,h){if(NAV3D.renderer&&NAV3D.camera){NAV3D.renderer.setSize(w,h,false);NAV3D.camera.aspect=w/h;NAV3D.camera.updateProjectionMatrix();}};

/* runtime toggle: flips preference + persists. Takes effect on the next room
   entry (a canvas can't switch between WebGL and 2D once created). */
NAV3D.toggle=function(){
  var on=!NAV3D.enabled;
  if(on&&!NAV3D.available()){if(window.showNavToast)window.showNavToast('3D renderer unavailable on this device','err');return false;}
  NAV3D.enabled=on;
  try{localStorage.setItem('cliveman_nav3d',on?'1':'0');}catch(e){}
  if(window.showNavToast)window.showNavToast('3D nav: '+(on?'ON':'OFF')+'  — re-enter the room (walk through a door) to apply','sys');
  return on;
};

window.NAV3D=NAV3D;
})();
