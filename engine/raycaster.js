/* ========================================================================
   CLIVEMAN  -  engine/raycaster.js
   First-person dungeon raycaster: themes, procedural wall/floor/ceiling textures, rcRender, drawFP, animations.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */



const FP_GLYPH={'.':null,'X':null,'#':null,
'U':{ch:'?',label:'item',color:'#66ff66',sprH:0.4},
'I':{ch:'!',label:'ITEM',color:'#ffff33',sprH:0.5},
'S':{ch:'\u25B2',label:'STAIRS UP',color:'#9fd8ff',sprH:0.85,stairs:'up'},
'v':{ch:'\u25BC',label:'STAIRS DN',color:'#9fd8ff',sprH:0.85,stairs:'down'},
'D':{ch:'\u2588',label:'DOOR',color:'#cc8844',sprH:0.95},
'K':{ch:'\u263A',label:'WITNESS',color:'#ff6666',sprH:0.9,person:true},
'B':{ch:'\u263A',label:'PERSON',color:'#aaaaff',sprH:0.9,person:true},
'E':{ch:'\u25A0',label:'ENTRANCE',color:'#33ff66',sprH:0.6},
'L':{ch:'\u2192',label:'EXIT',color:'#ff3333',sprH:0.6},
'M':{ch:'\u2692',label:'MECHANIC',color:'#ffaa33',sprH:0.8},
'G':{ch:'\u2615',label:'TAVERN',color:'#ff66ff',sprH:0.8},
'H':{ch:'\u265E',label:'TRACK',color:'#ffcc66',sprH:0.8},
'A':{ch:'\u2605',label:'ARCADE',color:'#66ffcc',sprH:0.8},
'1':{ch:'1',label:'201',color:'#888',sprH:0.5},'2':{ch:'2',label:'202',color:'#888',sprH:0.5},
'3':{ch:'3',label:'203',color:'#888',sprH:0.5},'4':{ch:'4',label:'204',color:'#888',sprH:0.5},
'5':{ch:'5',label:'205',color:'#888',sprH:0.5},'6':{ch:'6',label:'206',color:'#888',sprH:0.5}};
/* Symbols that should render as a DOOR painted onto the adjacent wall face
   (instead of a floating glyph). label is shown on the door. These tiles stay
   walkable so their exit/event logic is unchanged — only the visual differs. */
const DOOR_SYMS={
'D':{label:''},
'E':{label:''},
'1':{label:'201'},'2':{label:'202'},'3':{label:'203'},
'4':{label:'204'},'5':{label:'205'},'6':{label:'206'}};
/* contextual item models — hand-drawn pixel sprites. A room maps cells via
   navigateRoom opts.itemArt={'r,c':'clock',...}; the sprite renderer calls
   ART_DRAW[kind]. Floor items sit on the ground; wall items (clock/photo/tv/
   badge) ride higher. TV keeps animated static. */
function _spr(ctx,S,cx,topY,boxW,boxH,floor){var rows=S.r,pal=S.p,R=rows.length,C=rows[0].length;var sc=Math.min(boxW/C,boxH/R);if(sc<0.5)sc=0.5;var w=C*sc,h=R*sc;var y0=floor?(topY+boxH-h):(topY+boxH*0.46-h/2);var x0=cx-w/2;ctx.save();if(S.g){ctx.shadowColor=S.g;ctx.shadowBlur=5;}for(var r=0;r<R;r++){var row=rows[r];for(var c=0;c<C;c++){var col=pal[row[c]];if(!col)continue;ctx.fillStyle=col;ctx.fillRect(Math.round(x0+c*sc),Math.round(y0+r*sc),Math.ceil(sc),Math.ceil(sc));}}ctx.restore();return {x0:x0,y0:y0,w:w,h:h};}
const ITEM_SPR={clock:{r:["......o......","...ooGoGoo...","..oGGWWWGGo..",".oGGWWkWWGGo.",".oGWWWkWWWGo.",".GWWWWkWWWWG.","ooWWWWkkkkWoo",".GWWWWWWWWWG.",".oGWWWWWWWGo.",".oGGWWWWWGGo.","..oGGWWWGGo..","...ooGoGoo...","......o......"],p:{'o':'#15100a','G':'#caa23c','W':'#f3ead0','k':'#1a140a'},g:'#ffcf6a'},photo:{r:["ooooooooooo","oFFFFFFFFFo","oFsssssssFo","oFssHHHssFo","oFssHHHssFo","oFsssHsssFo","oFsHHHHHsFo","oFHHHHHHHFo","oFsHHHHHsFo","oFsssssssFo","oFFFFFFFFFo","ooooooooooo"],p:{'o':'#3a2a16','F':'#8a5a2a','s':'#9fb4c0','H':'#36464f'},g:'#d8b06a'},ratPoison:{r:["ooooooooo","oYYYYYYYo","obbbbbbbo","obwwwwwbo","obwKwKwbo","obwwNwwbo","obwKKKwbo","obbbbbbbo","ooooooooo"],p:{'o':'#10160c','Y':'#c9a92a','b':'#3b4a2a','w':'#e8efe0','K':'#23301c','N':'#23301c'},g:'#7bff7b'},badge:{r:["ooooooooooo","oBBBBBBBBBo","owppwlllllo","owppwlllllo","owppwwwwwwo","owwwwlllllo","owwwwwwwwwo","ooooooooooo"],p:{'o':'#2b3a44','B':'#2b6fb0','w':'#dfe8ee','p':'#9fb0bb','l':'#6f7f89'},g:'#7fd0ff'},mopBucket:{r:[".....h.......",".....h.......",".....h.......","...mmmmm.....","..mmmmmmm....","..m.m.m.m....",".............",".ooooooooooo.",".owwwwwwwwwo.",".oBBBBBBBBBo.","..oBBBBBBBo..","...ooooooo..."],p:{'h':'#b98a4a','m':'#dcd6b2','o':'#566069','B':'#7f8f98','w':'#9fb0b8'},g:'#9fe0ff'},tv:{r:["o.......o",".o.....o.","..o...o..","ccccccccc","cSSSSScKc","cSSSSSc.c","cSSSSScKc","ccccccccc",".cc...cc."],p:{'o':'#8a8a8a','c':'#2c2c30','S':'#11161a','K':'#777777'},g:'#9fe0ff'},bottles:{r:[".n...n...n.",".n...n...n.",".b...b...b.","bbb.bbb.bbb","bbb.bbb.bbb","bLb.bLb.bLb","bbb.bbb.bbb","bbb.bbb.bbb"],p:{'n':'#3f6b4a','b':'#3f6b4a','L':'#d9cf9a'},g:'#7bff9a'},papers:{r:["..PPPPPP...",".PPPPPPP...",".PtttttP...",".PPPPPPP...","PtttttP....","PPPPPPP....","PttttP.....","PPPPP......"],p:{'P':'#e7dcc0','t':'#7a6a44'},g:'#fff2c0'},tnt:{r:["...f.....","..f......",".f.......",".ooooooo.",".oRRRRRo.",".oRRRRRo.",".oLLLLLo.",".oLTTTLo.",".oLLLLLo.",".oRRRRRo.",".oRRRRRo.",".ooooooo."],p:{'f':'#ffd070','o':'#7a1e12','R':'#b5331f','L':'#e9d9a0','T':'#7a1e12'},g:'#ff7a4a'},laundry:{r:["....aaa....","..aaaaabb..",".aaaccbbbb.","caacccbbbbb","cccccccccc.","cccccccccc."],p:{'a':'#6b5e7a','b':'#7a6b4e','c':'#4e6b6b'},g:'#8aff8a'},debris:{r:["..d...d..d...",".ddd.ddd.ddd.","ddddddddddddd","ddDDdddDDdddd","ddddddddddddd"],p:{'d':'#4a4038','D':'#2a241e'},g:'#aa8855'},bed:{r:["HH...............","HHmmmmmmmmmmmmmmF","HHpppmmmmmmmmmmmF","HHpppbbbbbbbbbbmF","HHmmmbbbbbbbbbbmF","HHmmmbbbbbbbbbbmF","RRRRRRRRRRRRRRRRR",".l.............l.",".l.............l."],p:{'H':'#6b4a2a','F':'#6b4a2a','m':'#e8e2d0','p':'#f6f3ea','b':'#74608a','R':'#5a3a1e','l':'#4a2e16'},g:'#caa9ff'},couch:{r:["bbbbbbbbbbbbbbb","bccccccccccccab","acccccccccccca ","acccccccccccca ","asssssssssssssa","asssssssssssssa","a.............a","a.............a"],p:{'b':'#7a4a3a','c':'#9a5e4a','a':'#6a3e30','s':'#b06a52'},g:'#9fd0ff'},tubeTV:{r:["..ccccccccc..",".cSSSSSSSgkc.",".cSSSSSSSg.c.",".cSSSSSSSgkc.",".cSSSSSSSg.c.",".ccccccccccc.","..wwwwwwwww..","..l.......l.."],p:{'o':'#3a3a40','c':'#54545c','S':'#10303a','g':'#2a6a7a','k':'#777','w':'#5a3a22','l':'#4a2e16'},g:'#9fe0ff'},mayoVat:{r:["..ddddddd..",".ooooooooo.","osMMMMMMMso","osMMMMMMMso","obbbbbbbbbo","osMMMMMMMso","osMLLLLLMso","osMLLLLLMso","osMMMMMMMso","obbbbbbbbbo","osMMMMMMMso","osMMMMMMMso",".ooooooooo.","..l.....l..","..l.....l.."],p:{'d':'#aaaa96','o':'#8a8a76','s':'#cfc9b0','M':'#ede7d0','b':'#76766a','L':'#d8b830','l':'#5a5a4a'},g:'#fff6c0'},crate:{r:["oooooooooo","owwddwwddo","owdwwwwdwo","owdwwwwdwo","owwddwwddo","owwddwwddo","owdwwwwdwo","oooooooooo"],p:{'w':'#8a5e2e','o':'#5a3a18','d':'#6e4a22'},g:'#d8b87a'},barrel:{r:[".mmmmmm.","ohhhhhho","ommmmmmo","rrrrrrrr","ommmmmmo","ommmmmmo","rrrrrrrr","ommmmmmo","ohhhhhho",".oooooo."],p:{'o':'#3a3a42','m':'#5a6a72','h':'#7a8a92','r':'#2a2a30'},g:'#9fe0ff'},fridge:{r:["oooooooo","obbbbbbo","obbbbkho","obbbbbbo","oooooooo","obbbbbbo","obbbbkho","obbbbbbo","obbbbbbo","oooooooo"],p:{'o':'#9aa6ac','b':'#d6dee2','h':'#7a8288','k':'#5a6066'},g:'#bfe0ff'},deskLobby:{r:["ttttttttttttt","tpppppppppppt","fooooooooooof","fo.........of","fo.........of","fo.........of","fooooooooooof","f...........f"],p:{'t':'#7a5230','f':'#5a3a1e','o':'#3a2410','p':'#c9b88a'},g:'#9fe0ff'}};
const ART_DRAW={clock:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.clock,cx,topY,w,h,false);},photo:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.photo,cx,topY,w,h,false);},ratPoison:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.ratPoison,cx,topY,w,h,true);},badge:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.badge,cx,topY,w,h,false);},mopBucket:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.mopBucket,cx,topY,w,h,true);},tv:function(ctx,cx,topY,w,h){var gm=_spr(ctx,ITEM_SPR.tv,cx,topY,w,h,false);var sx=gm.x0+gm.w*0.11,sy=gm.y0+gm.h*0.33,sw=gm.w*0.55,sh=gm.h*0.34;for(var i=0;i<18;i++){ctx.fillStyle=Math.random()<0.5?'#cfd6da':'#39414a';ctx.fillRect((sx+Math.random()*sw)|0,(sy+Math.random()*sh)|0,1,1);}},bottles:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.bottles,cx,topY,w,h,true);},papers:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.papers,cx,topY,w,h,true);},tnt:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.tnt,cx,topY,w,h,true);},laundry:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.laundry,cx,topY,w,h,true);},debris:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.debris,cx,topY,w,h,true);},bed:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.bed,cx,topY,w,h,true);},couch:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.couch,cx,topY,w,h,true);},tubeTV:function(ctx,cx,topY,w,h){var gm=_spr(ctx,ITEM_SPR.tubeTV,cx,topY,w,h,true);var sx=gm.x0+gm.w*0.16,sy=gm.y0+gm.h*0.12,sw=gm.w*0.5,sh=gm.h*0.4;for(var i=0;i<16;i++){ctx.fillStyle=Math.random()<0.5?'#bcd0d6':'#1c4450';ctx.fillRect((sx+Math.random()*sw)|0,(sy+Math.random()*sh)|0,1,1);}},mayoVat:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.mayoVat,cx,topY,w,h,true);},crate:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.crate,cx,topY,w,h,true);},barrel:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.barrel,cx,topY,w,h,true);},fridge:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.fridge,cx,topY,w,h,true);},deskLobby:function(ctx,cx,topY,w,h){_spr(ctx,ITEM_SPR.deskLobby,cx,topY,w,h,true);}};
const FURNITURE={bed:{art:'bed',sprH:0.44},couch:{art:'couch',sprH:0.48},tubeTV:{art:'tubeTV',sprH:0.6},mayoVat:{art:'mayoVat',sprH:0.95},crate:{art:'crate',sprH:0.52},barrel:{art:'barrel',sprH:0.66},fridge:{art:'fridge',sprH:0.86},deskLobby:{art:'deskLobby',sprH:0.54}};
/* set-dressing furniture sprites: a room declares opts.furniture={'r,c':'bed',...}; injected as billboards (independent of grid symbols) sized via the FURNITURE registry, width derived from the bitmap aspect so wide pieces (bed/couch) read correctly. */
function _injectFurniture(sprites){var FURN=window._navFurniture;if(!FURN)return;for(var key in FURN){var p=key.split(','),fr=+p[0],fc=+p[1],fk=FURN[key],reg=FURNITURE[fk];if(!reg)continue;var spd=ITEM_SPR[reg.art];var wm=spd?(spd.r[0].length/spd.r.length):0.7;sprites.push({x:fc+0.5,y:fr+0.5,glyph:{color:'#cccccc',sprH:reg.sprH},sym:'',art:reg.art,sprH:reg.sprH,wmul:wm});}}
/* WALL_HEIGHTS — how tall a solid cell is, as a fraction of the full corridor
   height (1.0 = a normal floor-to-ceiling wall). Cells in here block movement
   AND get drawn by the raycaster; cells below 1.0 are "low walls" you can see
   over (counters, crates, waist dividers). '#' is the classic full wall, so all
   existing rooms behave exactly as before. To add a low obstacle to a room, put
   one of these symbols in the grid:
     '='  counter / barrier   (0.40)
     'h'  waist-high divider   (0.55)
     'b'  low block / crate    (0.30)
   The renderer collects every wall a ray passes through and paints them
   back-to-front, so a tall wall behind a low one stays visible above it. */
const WALL_HEIGHTS={'#':1.0,'=':0.40,'h':0.55,'b':0.30};
/* Returns the cell's wall height (0 means "not a wall / walkable"). Global so
   the movement code in controls-ui.js can share one definition of solidity. */
function rcWallHeight(sym){var h=WALL_HEIGHTS[sym];return h?h:0;}
/* A door/stair tile may touch walls on more than one side (e.g. in a corner),
   which used to paint the door on BOTH walls. doorMountSide picks the single
   wall a door is mounted on: a wall whose OPPOSITE neighbour is walkable (you
   approach from the open side), in a fixed priority so corners resolve to one. */
function rcDoorMountSide(grid,r,c){
  const rows=grid.length;
  function wall(rr,cc){ if(rr<0||rr>=rows||!grid[rr]||cc<0||cc>=grid[rr].length)return true; return rcWallHeight(grid[rr][cc])>=1.0; }
  const sides=[['W',0,-1,0,1],['E',0,1,0,-1],['N',-1,0,1,0],['S',1,0,-1,0]];
  for(let i=0;i<sides.length;i++){const s=sides[i];
    if(wall(r+s[1],c+s[2]) && !wall(r+s[3],c+s[4])) return s[0];}
  for(let i=0;i<sides.length;i++){const s=sides[i]; if(wall(r+s[1],c+s[2])) return s[0];}
  return 'W';
}
const RC_THEMES={
apartment:{wallN:'#2a4a32',wallE:'#1e3a28',wallS:'#2a4a32',wallW:'#1e3a28',
floor1:'#1a120e',floor2:'#241a14',ceil:'#0a0806',fog:'#020a04',
wallTex:'wood',floorTex:'wood_planks',ceilTex:'stucco',furnitureSprites:true},
factory:{wallN:'#3a4a2a',wallE:'#2e3a1e',wallS:'#3a4a2a',wallW:'#2e3a1e',
floor1:'#1a1a0e',floor2:'#262618',ceil:'#0a0a04',fog:'#040804',
wallTex:'metal',floorTex:'concrete',ceilTex:'grate',furnitureSprites:false},
crime:{wallN:'#4a2a2a',wallE:'#3a1e1e',wallS:'#4a2a2a',wallW:'#3a1e1e',
floor1:'#121010',floor2:'#1a1414',ceil:'#060404',fog:'#080404',
wallTex:'rubble',floorTex:'rubble_floor',ceilTex:'broken',furnitureSprites:false},
street:{wallN:'#2a2a4a',wallE:'#1e1e3a',wallS:'#2a2a4a',wallW:'#1e1e3a',
floor1:'#121218',floor2:'#1a1a24',ceil:'#04040a',fog:'#020208',
wallTex:'brick',floorTex:'cobble',ceilTex:'night_sky',furnitureSprites:false},
lobby:{wallN:'#1a3a4a',wallE:'#142e3a',wallS:'#1a3a4a',wallW:'#142e3a',
floor1:'#0e1218',floor2:'#141a22',ceil:'#040608',fog:'#020408',
wallTex:'wallpaper',floorTex:'tile',ceilTex:'stucco',furnitureSprites:false},
default:{wallN:'#1a3a22',wallE:'#142e1a',wallS:'#1a3a22',wallW:'#142e1a',
floor1:'#0a120e',floor2:'#101a14',ceil:'#040804',fog:'#020a04',
wallTex:'panels',floorTex:'concrete',ceilTex:'stucco',furnitureSprites:false}
};
function pickTheme(title){if(!title)return RC_THEMES.default;const t=title.toLowerCase();
if(t.includes('apartment')&&t.includes('lobby'))return RC_THEMES.lobby;
if(t.includes('hallway'))return RC_THEMES.lobby;
if(t.includes('apartment')||t.includes('bevan'))return RC_THEMES.apartment;
if(t.includes('mayo')||t.includes('floor'))return RC_THEMES.factory;
if(t.includes('crime')||t.includes('collapsed'))return RC_THEMES.crime;
if(t.includes('dudley'))return RC_THEMES.street;
return RC_THEMES.default;}
const TEX_SIZE=64;
/* Walls use a larger source than floors/ceilings. 128px stays power-of-two for
   fast column sampling, but removes the smeared 64px look in WebGL nav mode. */
const WALL_TEX_SIZE=128;
/* view-bob peak amplitude, in buffer pixels (scaled to canvas height at render
   time). Kept subtle so it reads as a footstep sway, not nausea. */
const BOB_AMOUNT=5;
const _texCache={};
/* Per-frame scratch that never needs to be reallocated */
const _RC_WALL_DIRS=['wallN','wallS','wallE','wallW'];
const _RC_HIT_POOL=[];for(let _i=0;_i<8;_i++)_RC_HIT_POOL[_i]={dist:0,perpDist:0,height:0,hitSide:0,sideAxis:0,mapX:0,mapY:0,stepX:0,stepY:0};
function _shadeHex(hex,mult){
const rr=Math.max(0,Math.min(255,Math.floor(parseInt(hex.slice(1,3),16)*mult)));
const gg=Math.max(0,Math.min(255,Math.floor(parseInt(hex.slice(3,5),16)*mult)));
const bb=Math.max(0,Math.min(255,Math.floor(parseInt(hex.slice(5,7),16)*mult)));
return 'rgb('+rr+','+gg+','+bb+')';}
function _addTexNoise(ctx,amount){
const tw=ctx.canvas.width,th=ctx.canvas.height;
const img=ctx.getImageData(0,0,tw,th);const d=img.data;
for(let i=0;i<d.length;i+=4){const n=(Math.random()-0.5)*amount;
d[i]=Math.max(0,Math.min(255,d[i]+n));d[i+1]=Math.max(0,Math.min(255,d[i+1]+n));d[i+2]=Math.max(0,Math.min(255,d[i+2]+n));}
ctx.putImageData(img,0,0);}
/* getDoorTex — draws a door set into the wall: recessed frame, two raised
   panels, a knob, and an optional room number/letter. Cached per (wallColor,
   label) so doors blend with each room's wall palette. The door occupies the
   centre ~64% of the tile; the margins are left transparent so the wall
   texture shows around it (the door reads as inset into the wall). */
function getDoorTex(wallColor,label){
const key='door_'+wallColor+'_'+(label||'');
if(_texCache[key])return _texCache[key];
const c=document.createElement('canvas');c.width=TEX_SIZE;c.height=TEX_SIZE;
const ctx=c.getContext('2d');
ctx.clearRect(0,0,TEX_SIZE,TEX_SIZE);
const wr=parseInt(wallColor.slice(1,3),16),wg=parseInt(wallColor.slice(3,5),16),wb=parseInt(wallColor.slice(5,7),16);
/* door panel sits centred, full height-ish */
const dw=Math.floor(TEX_SIZE*0.62), dx=Math.floor((TEX_SIZE-dw)/2);
const dy=Math.floor(TEX_SIZE*0.06), dh=TEX_SIZE-dy;
/* dark recess/shadow behind the frame so it looks set into the wall */
ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(dx-3,dy-2,dw+6,dh+2);
/* door body — warm wood tone, slightly independent of wall colour */
const baseR=120,baseG=74,baseB=38;
ctx.fillStyle='rgb('+baseR+','+baseG+','+baseB+')';
ctx.fillRect(dx,dy,dw,dh-2);
/* vertical grain */
for(let i=0;i<dw;i+=3){const sh=0.82+Math.random()*0.3;ctx.fillStyle='rgba('+Math.floor(baseR*sh)+','+Math.floor(baseG*sh)+','+Math.floor(baseB*sh)+',0.5)';ctx.fillRect(dx+i,dy,1,dh-2);}
/* frame highlight (left/top) and shadow (right) */
ctx.fillStyle='rgba(255,210,160,0.18)';ctx.fillRect(dx,dy,2,dh-2);ctx.fillRect(dx,dy,dw,2);
ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(dx+dw-2,dy,2,dh-2);
/* two raised panels */
function panel(py,ph){
ctx.fillStyle='rgba(0,0,0,0.32)';ctx.fillRect(dx+5,py,dw-10,ph);
ctx.fillStyle='rgba('+Math.floor(baseR*1.12)+','+Math.floor(baseG*1.12)+','+Math.floor(baseB*1.12)+',0.9)';
ctx.fillRect(dx+7,py+2,dw-14,ph-4);
ctx.fillStyle='rgba(255,210,160,0.12)';ctx.fillRect(dx+7,py+2,dw-14,1);
}
panel(dy+5, Math.floor(dh*0.42));
panel(dy+Math.floor(dh*0.52), Math.floor(dh*0.40));
/* knob */
ctx.fillStyle='#e8d27a';ctx.beginPath();ctx.arc(dx+dw-8,dy+Math.floor(dh*0.5),2.4,0,Math.PI*2);ctx.fill();
ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(dx+dw-9,dy+Math.floor(dh*0.5)+2,4,1);
/* optional room number/letter near the top */
if(label){
ctx.fillStyle='#d8d8c0';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
ctx.fillText(String(label),dx+dw/2,dy+8);
}
_texCache[key]=c;return c;
}
/* A stairwell ENTRANCE painted onto a wall (so it reads as a real recessed
   opening flush with the wall, not a floating icon). dir 'up' or 'down'. */
function getStairTex(wallColor,dir){
const up=(dir!=='down');
const key='stair_'+wallColor+'_'+(up?'u':'d');
if(_texCache[key])return _texCache[key];
const c=document.createElement('canvas');c.width=TEX_SIZE;c.height=TEX_SIZE;
const ctx=c.getContext('2d');
ctx.clearRect(0,0,TEX_SIZE,TEX_SIZE);
const ow=Math.floor(TEX_SIZE*0.72), ox=Math.floor((TEX_SIZE-ow)/2);
const oy=Math.floor(TEX_SIZE*0.05), oh=TEX_SIZE-oy-2;
/* dark recess so the opening looks set into the wall */
ctx.fillStyle='rgba(0,0,0,0.72)';ctx.fillRect(ox-3,oy-2,ow+6,oh+4);
ctx.fillStyle='rgba(0,0,0,0.93)';ctx.fillRect(ox,oy,ow,oh);
/* frame: lit left/top edge, shadowed right edge */
ctx.fillStyle='rgba(130,160,95,0.40)';ctx.fillRect(ox,oy,2,oh);ctx.fillRect(ox,oy,ow,2);
ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(ox+ow-2,oy,2,oh);
/* receding steps: a stack of treads, narrowing as they go in */
const ns=6, gap=Math.floor(oh/(ns+1));
for(let i=0;i<ns;i++){
const t=i/ns, inset=Math.floor(ow*0.12*t);
const sx=ox+4+inset, sw=ow-8-inset*2;
const sy= up ? (oy+oh-8 - i*gap) : (oy+8 + i*gap);
const b = up ? (0.55 - t*0.4) : (0.18 + t*0.34);
ctx.fillStyle='rgba('+Math.floor(60+120*b)+','+Math.floor(80+150*b)+','+Math.floor(45+90*b)+',0.95)';
ctx.fillRect(sx,sy,sw,2);
ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(sx,sy+2,sw,2);
}
/* up/down indicator */
ctx.fillStyle='#ffb000';ctx.font='bold 15px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
ctx.fillText(up?'\u25B2':'\u25BC', ox+ow/2, oy+9);
_texCache[key]=c;return c;
}
function getWallTex(type,baseColor,variant){
variant=(variant|0)&3;
const key=type+'_'+baseColor+'_v'+variant;
if(_texCache[key])return _texCache[key];
const c=document.createElement('canvas');c.width=WALL_TEX_SIZE;c.height=WALL_TEX_SIZE;
const ctx=c.getContext('2d');
/* Existing material designs use a compact 64-unit coordinate system. Draw them
   at 2x resolution, then add sub-pixel grime/detail in physical pixels below. */
const wallScale=WALL_TEX_SIZE/TEX_SIZE;ctx.scale(wallScale,wallScale);
ctx.fillStyle=baseColor;ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
const r=parseInt(baseColor.slice(1,3),16),g=parseInt(baseColor.slice(3,5),16),b=parseInt(baseColor.slice(5,7),16);
if(type==='brick'){
/* Grimy Dudley street brick - weathered mortar, blood-like stains, cracks */
ctx.fillStyle='#0e0a08';ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
const brickH=16,brickW=22;
for(let row=0;row<4;row++){const y=row*brickH;const offset=(row%2)*(brickW/2);
for(let col=-1;col<5;col++){const x=offset+col*brickW;
const shade=0.72+Math.random()*0.45;
ctx.fillStyle='rgb('+Math.floor(r*shade)+','+Math.floor(g*shade)+','+Math.floor(b*shade)+')';
ctx.fillRect(x+1,y+1,brickW-2,brickH-2);
ctx.fillStyle='rgba(255,210,170,0.09)';ctx.fillRect(x+1,y+1,brickW-2,2);
ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(x+1,y+brickH-3,brickW-2,2);
if(Math.random()<0.35){ctx.fillStyle='rgba(0,0,0,'+(0.18+Math.random()*0.3)+')';
ctx.fillRect(x+2+Math.random()*(brickW-6),y+2+Math.random()*(brickH-6),2+Math.random()*5,1+Math.random()*2);}
if(Math.random()<0.18){ctx.strokeStyle='rgba(0,0,0,0.55)';ctx.lineWidth=0.5;ctx.beginPath();
ctx.moveTo(x+2+Math.random()*(brickW-4),y+2);ctx.lineTo(x+2+Math.random()*(brickW-4),y+brickH-2);ctx.stroke();}
if(Math.random()<0.08){ctx.fillStyle='rgba(60,10,5,0.4)';ctx.fillRect(x+2+Math.random()*(brickW-8),y+2+Math.random()*(brickH-6),3+Math.random()*5,2+Math.random()*3);}}}
_addTexNoise(ctx,45);
}else if(type==='wood'){
/* Dark oak plank wood - apartments, knotted, grained, splitting */
ctx.fillStyle=baseColor;ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
const plankW=TEX_SIZE/3;
for(let p=0;p<3;p++){const shade=0.78+Math.random()*0.3;const px=p*plankW;
ctx.fillStyle='rgba('+Math.floor(r*shade)+','+Math.floor(g*shade)+','+Math.floor(b*shade)+',0.55)';
ctx.fillRect(px+2,0,plankW-4,TEX_SIZE);}
for(let i=1;i<3;i++){const x=i*plankW;
ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(x-1,0,2,TEX_SIZE);
ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fillRect(x+1,0,1,TEX_SIZE);
ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect(x-2,0,1,TEX_SIZE);}
for(let p=0;p<3;p++){const px=p*plankW+2;const pw=plankW-4;
for(let i=0;i<16;i++){const y=Math.random()*TEX_SIZE;const dark=Math.random()<0.55;
ctx.strokeStyle=dark?'rgba(0,0,0,0.32)':'rgba('+Math.floor(r*1.25)+','+Math.floor(g*1.15)+','+Math.floor(b*1.1)+',0.22)';
ctx.lineWidth=0.8;ctx.beginPath();let cx=px;ctx.moveTo(cx,y);
while(cx<px+pw){cx+=2+Math.random()*3;ctx.lineTo(cx,y+Math.sin(cx*0.3)*1.5+Math.random()-0.5);}
ctx.stroke();}
if(Math.random()<0.75){const kx=px+3+Math.random()*(pw-6);const ky=5+Math.random()*(TEX_SIZE-10);const kr=1.8+Math.random()*2.2;
const grad=ctx.createRadialGradient(kx,ky,0,kx,ky,kr);
grad.addColorStop(0,'rgba(0,0,0,0.95)');
grad.addColorStop(0.55,'rgba('+Math.floor(r*0.3)+','+Math.floor(g*0.25)+','+Math.floor(b*0.2)+',0.7)');
grad.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle=grad;ctx.beginPath();ctx.arc(kx,ky,kr,0,Math.PI*2);ctx.fill();}}
_addTexNoise(ctx,22);
}else if(type==='metal'){
/* Industrial riveted metal - Mayo factory - rust streaks, panel seams */
const grad=ctx.createLinearGradient(0,0,0,TEX_SIZE);
grad.addColorStop(0,_shadeHex(baseColor,1.18));
grad.addColorStop(0.5,baseColor);
grad.addColorStop(1,_shadeHex(baseColor,0.65));
ctx.fillStyle=grad;ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
const panel=TEX_SIZE/2;
ctx.strokeStyle='rgba(0,0,0,0.95)';ctx.lineWidth=2;
ctx.beginPath();ctx.moveTo(panel,0);ctx.lineTo(panel,TEX_SIZE);ctx.moveTo(0,panel);ctx.lineTo(TEX_SIZE,panel);ctx.stroke();
ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=1;
ctx.beginPath();ctx.moveTo(panel+1,1);ctx.lineTo(panel+1,TEX_SIZE);ctx.moveTo(1,panel+1);ctx.lineTo(TEX_SIZE,panel+1);ctx.stroke();
const rivets=[[4,4],[28,4],[36,4],[60,4],[4,28],[28,28],[36,28],[60,28],[4,36],[28,36],[36,36],[60,36],[4,60],[28,60],[36,60],[60,60]];
for(let i=0;i<rivets.length;i++){const rx=rivets[i][0],ry=rivets[i][1];
ctx.fillStyle='rgba(0,0,0,0.75)';ctx.beginPath();ctx.arc(rx,ry+0.5,1.9,0,Math.PI*2);ctx.fill();
const rg=ctx.createRadialGradient(rx-0.5,ry-0.5,0,rx,ry,1.9);
rg.addColorStop(0,_shadeHex(baseColor,1.6));rg.addColorStop(1,_shadeHex(baseColor,0.45));
ctx.fillStyle=rg;ctx.beginPath();ctx.arc(rx,ry,1.7,0,Math.PI*2);ctx.fill();}
for(let i=0;i<4;i++){const sx=5+Math.random()*(TEX_SIZE-10);const sy=4+Math.random()*18;const sh=10+Math.random()*22;
const rustGrad=ctx.createLinearGradient(sx,sy,sx,sy+sh);
rustGrad.addColorStop(0,'rgba(90,30,5,0.65)');
rustGrad.addColorStop(0.5,'rgba(130,50,15,0.45)');
rustGrad.addColorStop(1,'rgba(60,20,0,0)');
ctx.fillStyle=rustGrad;ctx.fillRect(sx,sy,1.5,sh);
ctx.fillStyle='rgba(90,30,5,0.28)';ctx.fillRect(sx-1,sy,3,sh);}
for(let i=0;i<10;i++){ctx.fillStyle='rgba(0,0,0,'+(0.12+Math.random()*0.22)+')';
ctx.beginPath();ctx.arc(Math.random()*TEX_SIZE,Math.random()*TEX_SIZE,1+Math.random()*3,0,Math.PI*2);ctx.fill();}
_addTexNoise(ctx,18);
}else if(type==='wallpaper'){
/* Faded Victorian wallpaper with diamond damask - lobby/hallway */
ctx.fillStyle=baseColor;ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
for(let x=0;x<TEX_SIZE;x+=4){ctx.fillStyle='rgba(255,255,255,0.045)';ctx.fillRect(x,0,2,TEX_SIZE);}
const dsz=16;
ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=0.8;
for(let row=-1;row<6;row++){for(let col=-1;col<6;col++){
const cx=col*dsz+(row%2)*dsz/2;const cy=row*dsz/2+4;
if(cx<-4||cx>TEX_SIZE+4)continue;
ctx.beginPath();ctx.moveTo(cx,cy-4);ctx.lineTo(cx+4,cy);ctx.lineTo(cx,cy+4);ctx.lineTo(cx-4,cy);ctx.closePath();ctx.stroke();
ctx.fillStyle='rgba(255,255,255,0.28)';ctx.beginPath();ctx.arc(cx,cy,0.9,0,Math.PI*2);ctx.fill();
/* fleur petals */
ctx.strokeStyle='rgba(255,255,255,0.14)';
ctx.beginPath();ctx.moveTo(cx-2,cy);ctx.lineTo(cx,cy-2);ctx.moveTo(cx+2,cy);ctx.lineTo(cx,cy+2);ctx.stroke();
ctx.strokeStyle='rgba(255,255,255,0.2)';}}
for(let i=0;i<3;i++){const sx=Math.random()*TEX_SIZE;const sy=Math.random()*TEX_SIZE;const sr=5+Math.random()*11;
const stainGrad=ctx.createRadialGradient(sx,sy,0,sx,sy,sr);
stainGrad.addColorStop(0,'rgba(90,50,20,0.45)');
stainGrad.addColorStop(0.5,'rgba(60,35,15,0.28)');
stainGrad.addColorStop(1,'rgba(40,25,10,0)');
ctx.fillStyle=stainGrad;ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();}
/* peeling tears */
for(let i=0;i<2;i++){if(Math.random()<0.75){const px=Math.random()*TEX_SIZE;const py=Math.random()*TEX_SIZE;
ctx.fillStyle='rgba(0,0,0,0.55)';ctx.beginPath();ctx.moveTo(px,py);
ctx.lineTo(px+3+Math.random()*6,py-2);ctx.lineTo(px+5+Math.random()*6,py+4);ctx.closePath();ctx.fill();
ctx.fillStyle='rgba(30,20,15,0.7)';ctx.fillRect(px+0.5,py,1,3);}}
/* chair rail */
ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,42,TEX_SIZE,1);
ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(0,44,TEX_SIZE,1);
_addTexNoise(ctx,20);
}else if(type==='rubble'){
/* Scorched collapsed concrete - crime scene - rebar, ash, blast marks */
ctx.fillStyle=_shadeHex(baseColor,0.55);ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
const scorch=ctx.createRadialGradient(TEX_SIZE/2,TEX_SIZE/2,0,TEX_SIZE/2,TEX_SIZE/2,TEX_SIZE*0.7);
scorch.addColorStop(0,'rgba(0,0,0,0.65)');scorch.addColorStop(0.5,'rgba(20,10,5,0.35)');scorch.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle=scorch;ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
for(let i=0;i<17;i++){const cx=Math.random()*TEX_SIZE;const cy=Math.random()*TEX_SIZE;
const size=3+Math.random()*7;const shade=0.55+Math.random()*0.55;
ctx.fillStyle='rgb('+Math.floor(r*shade)+','+Math.floor(g*shade)+','+Math.floor(b*shade)+')';
ctx.beginPath();ctx.moveTo(cx,cy);const pts=4+Math.floor(Math.random()*3);
for(let p=0;p<pts;p++){const a=(p/pts)*Math.PI*2;const rr=size*(0.5+Math.random()*0.5);
ctx.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}
ctx.closePath();ctx.fill();
ctx.strokeStyle='rgba(0,0,0,0.65)';ctx.lineWidth=0.5;ctx.stroke();
/* highlight on one edge */
ctx.fillStyle='rgba(255,240,200,0.15)';ctx.beginPath();
ctx.arc(cx-size*0.3,cy-size*0.3,size*0.3,0,Math.PI*2);ctx.fill();}
/* twisted rebar */
for(let i=0;i<4;i++){const x1=Math.random()*TEX_SIZE;const y1=Math.random()*TEX_SIZE;
ctx.strokeStyle='rgba(70,45,25,0.75)';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x1,y1);
let cx=x1,cy=y1;for(let s=0;s<4;s++){cx+=(Math.random()-0.5)*13;cy+=(Math.random()-0.5)*13;ctx.lineTo(cx,cy);}
ctx.stroke();
ctx.strokeStyle='rgba(150,100,60,0.4)';ctx.lineWidth=0.5;ctx.stroke();}
for(let i=0;i<6;i++){ctx.fillStyle='rgba(0,0,0,'+(0.35+Math.random()*0.4)+')';
ctx.fillRect(Math.random()*TEX_SIZE,Math.random()*TEX_SIZE,4+Math.random()*12,1+Math.random()*3);}
for(let i=0;i<45;i++){ctx.fillStyle='rgba('+(150+Math.random()*50)+','+(140+Math.random()*40)+','+(130+Math.random()*40)+','+(0.2+Math.random()*0.45)+')';
ctx.fillRect(Math.random()*TEX_SIZE,Math.random()*TEX_SIZE,1,1);}
_addTexNoise(ctx,32);
}else{
/* Generic industrial panels - default theme */
const grad=ctx.createLinearGradient(0,0,0,TEX_SIZE);
grad.addColorStop(0,_shadeHex(baseColor,1.1));
grad.addColorStop(1,_shadeHex(baseColor,0.72));
ctx.fillStyle=grad;ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
const panelH=16;
for(let i=0;i<4;i++){const y=i*panelH;
ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(2,y+2,TEX_SIZE-4,panelH-4);
ctx.fillStyle=baseColor;ctx.fillRect(3,y+3,TEX_SIZE-6,panelH-6);
ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(3,y+3,TEX_SIZE-6,1);
ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fillRect(3,y+panelH-4,TEX_SIZE-6,1);
if(i%2===0){ctx.fillStyle='#442200';ctx.fillRect(TEX_SIZE/2-4,y+panelH/2-1,8,3);
ctx.fillStyle='#ffaa33';ctx.fillRect(TEX_SIZE/2-3,y+panelH/2,6,1);
/* glow */ctx.fillStyle='rgba(255,170,50,0.3)';ctx.fillRect(TEX_SIZE/2-6,y+panelH/2-2,12,5);
}else{ctx.fillStyle='rgba(0,0,0,0.65)';
for(let v=0;v<3;v++){ctx.fillRect(TEX_SIZE/2-8+v*6,y+panelH/2-2,4,1);
ctx.fillRect(TEX_SIZE/2-8+v*6,y+panelH/2+1,4,1);}}}
const bolts=[[4,4],[TEX_SIZE-4,4],[4,TEX_SIZE-4],[TEX_SIZE-4,TEX_SIZE-4]];
for(let i=0;i<bolts.length;i++){const bx=bolts[i][0],by=bolts[i][1];
ctx.fillStyle='rgba(0,0,0,0.75)';ctx.beginPath();ctx.arc(bx,by,1.6,0,Math.PI*2);ctx.fill();
ctx.fillStyle=_shadeHex(baseColor,1.35);ctx.beginPath();ctx.arc(bx-0.3,by-0.3,1,0,Math.PI*2);ctx.fill();}
_addTexNoise(ctx,14);
}
/* Large-scale age variation breaks the obvious one-tile wallpaper effect.
   The four cached variants share the same material language but differ in
   damp streaks, scuffs and cracks, so adjacent walls no longer clone each other. */
ctx.setTransform(1,0,0,1,0,0);
(function addWallAge(){
  const W=WALL_TEX_SIZE,H=WALL_TEX_SIZE;
  const age=((variant*37+type.length*11)&31)/31;
  /* ceiling soot and floor-line dirt anchor the texture in the room */
  let top=ctx.createLinearGradient(0,0,0,H*0.23);
  top.addColorStop(0,'rgba(0,0,0,'+(0.18+age*0.08)+')');top.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=top;ctx.fillRect(0,0,W,H*0.25);
  let low=ctx.createLinearGradient(0,H*0.68,0,H);
  low.addColorStop(0,'rgba(0,0,0,0)');low.addColorStop(1,'rgba(0,0,0,'+(0.28+age*0.12)+')');
  ctx.fillStyle=low;ctx.fillRect(0,H*0.65,W,H*0.35);
  /* deterministic-looking damp runs and hand-height scuffs */
  for(let i=0;i<3;i++){
    const x=((variant*29+i*43+type.length*7)%113)+6;
    const y=8+((variant*17+i*23)%34);
    const len=30+((variant*13+i*19)%48);
    const grd=ctx.createLinearGradient(x,y,x,y+len);
    grd.addColorStop(0,'rgba(0,0,0,0.20)');grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd;ctx.fillRect(x,y,1+(i&1),len);
  }
  if(type==='metal'){
    ctx.strokeStyle='rgba(225,235,210,0.13)';ctx.lineWidth=1;
    for(let i=0;i<5;i++){const y=18+((variant*31+i*21)%92);ctx.beginPath();ctx.moveTo(7,y);ctx.lineTo(28+((variant+i)*17)%89,y-2);ctx.stroke();}
  }else{
    ctx.strokeStyle='rgba(0,0,0,0.40)';ctx.lineWidth=1;
    const x=17+variant*27,y=24+((variant*19)%42);
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+7,y+10);ctx.lineTo(x+3,y+19);ctx.lineTo(x+13,y+31);ctx.stroke();
    ctx.strokeStyle='rgba(220,215,180,0.08)';ctx.beginPath();ctx.moveTo(x+1,y);ctx.lineTo(x+8,y+10);ctx.stroke();
  }
  /* subtle side-edge occlusion makes each block read as a solid wall plane */
  const edge=ctx.createLinearGradient(0,0,W,0);
  edge.addColorStop(0,'rgba(0,0,0,0.18)');edge.addColorStop(0.06,'rgba(0,0,0,0)');
  edge.addColorStop(0.94,'rgba(0,0,0,0)');edge.addColorStop(1,'rgba(0,0,0,0.16)');
  ctx.fillStyle=edge;ctx.fillRect(0,0,W,H);
})();
_texCache[key]=c;return c;}
/* Memoised: both callers sit inside the per-frame render path and only ever
   read the triple, so re-parsing three hex pairs and allocating a fresh
   array 3-4x per frame was pure churn. Themes are a fixed small set, so the
   cache is bounded by design. Matches the existing theme._cached* pattern. */
const _hexCache=Object.create(null);
function _hexRGB(hex){
  let v=_hexCache[hex];
  if(v)return v;
  v=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
  _hexCache[hex]=v;
  return v;
}

/* ═══ Floor & Ceiling texture generators ═══ */
function getFloorTex(type, f1, f2){
  var key = 'floor_' + type + '_' + f1 + '_' + f2;
  if(_texCache[key]) return _texCache[key];
  var c = document.createElement('canvas');
  c.width = TEX_SIZE; c.height = TEX_SIZE;
  var ctx = c.getContext('2d');

  if(type === 'wood_planks'){
    /* Horizontal planks with grain */
    ctx.fillStyle = f1; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    var plankH = 16;
    for(var y = 0; y < TEX_SIZE; y += plankH){
      var shade = (y / plankH) & 1 ? f2 : f1;
      ctx.fillStyle = shade; ctx.fillRect(0, y, TEX_SIZE, plankH);
      /* Plank seam */
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, y, TEX_SIZE, 1);
      /* Grain lines */
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      for(var g = 0; g < 4; g++){
        var gy = y + 3 + g * 3 + (g & 1);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(16, gy-1, 32, gy+1, TEX_SIZE, gy);
        ctx.stroke();
      }
      /* Occasional knot */
      if(((y/plankH) * 37) % 3 === 0){
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        var kx = ((y * 17) % (TEX_SIZE - 8)) + 4;
        ctx.beginPath();
        ctx.ellipse(kx, y + plankH/2, 2, 1.2, 0, 0, Math.PI*2);
        ctx.fill();
      }
    }
  } else if(type === 'concrete'){
    /* Mottled gray concrete with fine noise and dark specks */
    ctx.fillStyle = f1; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    /* Stains */
    for(var s = 0; s < 12; s++){
      var sx = Math.floor(Math.random()*TEX_SIZE);
      var sy = Math.floor(Math.random()*TEX_SIZE);
      var sr = 2 + Math.random()*5;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.08 + Math.random()*0.15) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
    }
    /* Small cracks */
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    for(var ck = 0; ck < 3; ck++){
      var x0 = Math.random()*TEX_SIZE, y0 = Math.random()*TEX_SIZE;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      for(var seg = 0; seg < 4; seg++){
        x0 += (Math.random()-0.5)*10;
        y0 += (Math.random()-0.5)*10;
        ctx.lineTo(x0, y0);
      }
      ctx.stroke();
    }
    _addTexNoise(ctx, 28);
  } else if(type === 'tile'){
    /* Checkerboard tiles with grout */
    var ts = 16;
    for(var ty = 0; ty < TEX_SIZE; ty += ts){
      for(var tx = 0; tx < TEX_SIZE; tx += ts){
        ctx.fillStyle = ((tx/ts + ty/ts) & 1) ? f1 : f2;
        ctx.fillRect(tx, ty, ts, ts);
      }
    }
    /* Grout lines */
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    for(var gy = 0; gy < TEX_SIZE; gy += ts){
      ctx.fillRect(0, gy, TEX_SIZE, 1);
    }
    for(var gx = 0; gx < TEX_SIZE; gx += ts){
      ctx.fillRect(gx, 0, 1, TEX_SIZE);
    }
    /* Shine highlight */
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for(var hy = 0; hy < TEX_SIZE; hy += ts){
      for(var hx = 0; hx < TEX_SIZE; hx += ts){
        ctx.fillRect(hx+1, hy+1, ts-2, 1);
      }
    }
    _addTexNoise(ctx, 10);
  } else if(type === 'cobble'){
    /* Irregular cobblestones */
    ctx.fillStyle = f2; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    /* Generate cobble positions */
    var cobbles = [];
    for(var cy = 4; cy < TEX_SIZE - 2; cy += 9){
      var offset = (cy/9) & 1 ? 4 : 0;
      for(var cx = 2 + offset; cx < TEX_SIZE - 2; cx += 9){
        cobbles.push([cx + (Math.random()*2-1), cy + (Math.random()*2-1)]);
      }
    }
    for(var cci = 0; cci < cobbles.length; cci++){
      var cob = cobbles[cci];
      var cobR = 3.5 + Math.random()*1.2;
      ctx.fillStyle = f1;
      ctx.beginPath(); ctx.arc(cob[0], cob[1], cobR, 0, Math.PI*2); ctx.fill();
      /* Highlight */
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.beginPath(); ctx.arc(cob[0]-0.7, cob[1]-0.7, cobR*0.5, 0, Math.PI*2); ctx.fill();
    }
    _addTexNoise(ctx, 20);
  } else if(type === 'rubble_floor'){
    /* Debris and broken chunks */
    ctx.fillStyle = f1; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    /* Random broken chunks */
    for(var rb = 0; rb < 24; rb++){
      var rx = Math.random()*TEX_SIZE;
      var ry = Math.random()*TEX_SIZE;
      var rs = 1 + Math.random()*3;
      ctx.fillStyle = Math.random() > 0.5 ? f2 : 'rgba(0,0,0,0.5)';
      ctx.fillRect(rx, ry, rs, rs*0.7);
    }
    /* Ash/dust streaks */
    for(var ds = 0; ds < 6; ds++){
      ctx.fillStyle = 'rgba(40,30,25,0.3)';
      var dx = Math.random()*TEX_SIZE, dy = Math.random()*TEX_SIZE;
      ctx.fillRect(dx, dy, 12 + Math.random()*8, 2);
    }
    _addTexNoise(ctx, 35);
  } else {
    /* Fallback: checkered */
    var ts2 = 8;
    for(var ty2 = 0; ty2 < TEX_SIZE; ty2 += ts2){
      for(var tx2 = 0; tx2 < TEX_SIZE; tx2 += ts2){
        ctx.fillStyle = ((tx2/ts2 + ty2/ts2) & 1) ? f1 : f2;
        ctx.fillRect(tx2, ty2, ts2, ts2);
      }
    }
    _addTexNoise(ctx, 18);
  }
  _texCache[key] = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  return _texCache[key];
}

function getCeilTex(type, baseColor){
  var key = 'ceil_' + type + '_' + baseColor;
  if(_texCache[key]) return _texCache[key];
  var c = document.createElement('canvas');
  c.width = TEX_SIZE; c.height = TEX_SIZE;
  var ctx = c.getContext('2d');

  if(type === 'stucco'){
    /* Textured stucco with small bumps */
    ctx.fillStyle = baseColor; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    for(var bp = 0; bp < 80; bp++){
      ctx.fillStyle = 'rgba(255,255,255,' + (0.02 + Math.random()*0.04) + ')';
      var bx = Math.random()*TEX_SIZE, by = Math.random()*TEX_SIZE;
      ctx.fillRect(bx, by, 1, 1);
    }
    for(var dp = 0; dp < 30; dp++){
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      var dx = Math.random()*TEX_SIZE, dy = Math.random()*TEX_SIZE;
      ctx.fillRect(dx, dy, 1, 1);
    }
    _addTexNoise(ctx, 8);
  } else if(type === 'grate'){
    /* Metal grating */
    ctx.fillStyle = baseColor; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    var gspacing = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    for(var gy2 = 0; gy2 < TEX_SIZE; gy2 += gspacing){
      ctx.fillRect(0, gy2, TEX_SIZE, 1);
    }
    for(var gx2 = 0; gx2 < TEX_SIZE; gx2 += gspacing){
      ctx.fillRect(gx2, 0, 1, TEX_SIZE);
    }
    /* Subtle highlights */
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for(var gyh = 1; gyh < TEX_SIZE; gyh += gspacing){
      ctx.fillRect(0, gyh, TEX_SIZE, 1);
    }
    _addTexNoise(ctx, 10);
  } else if(type === 'broken'){
    /* Broken ceiling with holes and damage */
    ctx.fillStyle = baseColor; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    /* Dark holes */
    for(var h = 0; h < 5; h++){
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      var hx = Math.random()*TEX_SIZE, hy = Math.random()*TEX_SIZE;
      var hr = 1 + Math.random()*3;
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI*2); ctx.fill();
    }
    /* Stains */
    for(var sc = 0; sc < 8; sc++){
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      var scx = Math.random()*TEX_SIZE, scy = Math.random()*TEX_SIZE;
      ctx.fillRect(scx, scy, 3 + Math.random()*4, 1 + Math.random()*2);
    }
    _addTexNoise(ctx, 22);
  } else if(type === 'night_sky'){
    /* Starfield ceiling for outdoor scenes */
    ctx.fillStyle = baseColor; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    for(var st = 0; st < 18; st++){
      var br = 0.15 + Math.random()*0.6;
      ctx.fillStyle = 'rgba(200,220,255,' + br + ')';
      var sx2 = Math.random()*TEX_SIZE, sy2 = Math.random()*TEX_SIZE;
      ctx.fillRect(sx2, sy2, 1, 1);
    }
  } else {
    /* Fallback: solid + noise */
    ctx.fillStyle = baseColor; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    _addTexNoise(ctx, 8);
  }
  _texCache[key] = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  return _texCache[key];
}

/* Draw ONE billboard sprite's body (stair facade / person figure / item art /
   glyph + label) into a pre-computed screen box. Extracted so the flat renderer
   and the height-aware sector renderer draw props identically — only the box
   geometry (screenX/sprTop/sprHeight) differs between them. */
function _rcSpriteBody(ctx,sp,screenX,sprTop,sprWidth,sprHeight,dist){
const fontSize=Math.max(8,Math.floor(sprHeight*0.8));
const spFog=Math.min(0.7,dist/8);
ctx.globalAlpha=1-spFog;
if(sp.glyph.stairs){
  const goUp=sp.glyph.stairs==='up';
  const sw=sprWidth*0.92;
  const sh=sprHeight*0.92;
  const bx=screenX-sw/2;
  const byTop=sprTop+sprHeight/2-sh/2;
  const NST=5;
  const stepH=sh/NST;
  const base=sp.glyph.color;
  ctx.shadowColor=base;ctx.shadowBlur=Math.max(3,10-dist*1.6);
  for(let s=0;s<NST;s++){
    const k=goUp?s:(NST-1-s);
    const inset=(k/NST)*sw*0.34;
    const sxL=bx+inset;
    const stepW=sw-inset*2;
    const sy=byTop+s*stepH;
    ctx.fillStyle=base;
    ctx.globalAlpha=(1-spFog)*(0.55+0.09*s);
    ctx.fillRect(Math.floor(sxL),Math.floor(sy),Math.ceil(stepW),Math.ceil(stepH*0.62));
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.globalAlpha=(1-spFog)*0.55;
    ctx.fillRect(Math.floor(sxL),Math.floor(sy+stepH*0.62),Math.ceil(stepW),Math.ceil(stepH*0.38));
  }
  ctx.shadowBlur=0;
  ctx.globalAlpha=1-spFog;
}else if(sp.glyph.person){
  const col=sp.glyph.color;
  const figH=sprHeight*0.96;
  const cx=screenX;
  const topY=sprTop+sprHeight/2-figH/2;
  const headR=figH*0.12;
  ctx.shadowColor=col;ctx.shadowBlur=Math.max(3,12-dist*1.8);
  ctx.fillStyle=col;
  ctx.globalAlpha=1-spFog;
  ctx.beginPath();ctx.arc(cx,topY+headR,headR,0,Math.PI*2);ctx.fill();
  const shoulderY=topY+headR*2.1;
  const hipY=topY+figH*0.62;
  const shoulderW=figH*0.30;
  const hipW=figH*0.20;
  ctx.beginPath();
  ctx.moveTo(cx-shoulderW/2,shoulderY);
  ctx.lineTo(cx+shoulderW/2,shoulderY);
  ctx.lineTo(cx+hipW/2,hipY);
  ctx.lineTo(cx-hipW/2,hipY);
  ctx.closePath();ctx.fill();
  const armW=Math.max(2,figH*0.055);
  ctx.fillRect(cx-shoulderW/2-armW*0.4,shoulderY,armW,hipY-shoulderY);
  ctx.fillRect(cx+shoulderW/2-armW*0.6,shoulderY,armW,hipY-shoulderY);
  const legW=Math.max(2,figH*0.075);
  const footY=topY+figH;
  ctx.fillRect(cx-hipW/2,hipY,legW,footY-hipY);
  ctx.fillRect(cx+hipW/2-legW,hipY,legW,footY-hipY);
  ctx.shadowBlur=0;
  ctx.globalAlpha=(1-spFog)*0.35;
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.fillRect(cx+hipW*0.1,shoulderY,Math.max(1,shoulderW*0.18),hipY-shoulderY);
  ctx.globalAlpha=1-spFog;
}else if(sp.art&&ART_DRAW[sp.art]){
ART_DRAW[sp.art](ctx,screenX,sprTop,sprWidth,sprHeight,dist,spFog);
}else{
ctx.font='bold '+fontSize+'px "Share Tech Mono", monospace';
ctx.textAlign='center';ctx.textBaseline='middle';
ctx.shadowColor=sp.glyph.color;ctx.shadowBlur=Math.max(4,14-dist*2);
ctx.fillStyle=sp.glyph.color;
ctx.fillText(sp.glyph.ch,screenX,sprTop+sprHeight/2);
ctx.shadowBlur=0;
}
if(dist<3&&sp.glyph.label){
const labelSize=Math.max(8,Math.floor(12-dist*2+8));
ctx.font=labelSize+'px "VT323", monospace';
ctx.fillStyle='#ffb000';
ctx.shadowColor='#ffb000';ctx.shadowBlur=3;
ctx.fillText('['+(window.t?window.t(sp.glyph.label):sp.glyph.label)+']',screenX,sprTop+sprHeight/2+fontSize*0.6);
ctx.shadowBlur=0;}
ctx.globalAlpha=1;
}

/* Reused record of the last frame's arguments, for rcRedraw(). Both render
   paths write this on every single frame, and a fresh object literal each
   time was pure GC churn for a value nothing ever retains. */
const _rcLastRec={canvas:null,grid:null,px:0,py:0,angle:0,theme:null};
window._rcLast=_rcLastRec;
function _rcSetLast(canvas,grid,px,py,angle,theme){
  _rcLastRec.canvas=canvas;_rcLastRec.grid=grid;_rcLastRec.px=px;
  _rcLastRec.py=py;_rcLastRec.angle=angle;_rcLastRec.theme=theme;
}
function rcRender(canvas,grid,px,py,angle,theme,bob){
if(window.CMCOMPASS&&CMCOMPASS.active)CMCOMPASS.navUpdate(angle);
_rcSetLast(canvas,grid,px,py,angle,theme);
/* TRUE-3D path FIRST: when the Three.js nav renderer owns this canvas it renders
   BOTH flat and height-mapped (grid._floorH) grids. This MUST run before the
   raster sector branch below: drawFP has already given this canvas a WebGL
   context, so the raster path's getContext('2d') would return null and draw
   nothing (a blank factory). On any failure NAV3D disables itself; a canvas
   can't swap WebGL->2D, so we bail to a blank frame and the next room entry
   rebuilds cleanly on the raster path. */
if(window.NAV3D&&NAV3D.enabled&&NAV3D.ready&&NAV3D.canvas===canvas){
  if(NAV3D.render(grid,px,py,angle,theme,window._navPitch||0))return;
  return;
}
/* Raster sector mode: a height-mapped grid on a plain 2D canvas (nav3d off or
   unavailable) — render with the height-aware sector renderer (true stairs).
   Every normal room has no _floorH, so this never affects them. */
if(grid&&grid._floorH){return rcRenderSector(canvas,grid,px,py,angle,theme,bob);}
const ctx=canvas.getContext('2d',{alpha:false});const W=canvas.width,H=canvas.height;
const rows=grid.length;let cols=0;for(let i=0;i<rows;i++){if(grid[i].length>cols)cols=grid[i].length;}
const FOV=Math.PI*0.6;const HALF_FOV=FOV/2;const TAN_HALF=Math.tan(HALF_FOV);
const NUM_RAYS=IS_MOBILE?(W>>1):W;const RAY_WIDTH=IS_MOBILE?2:1;
/* vertical view-bob offset (px): shifts the horizon so walls/floor/ceiling
   bob together as the player walks. 0 when standing still. */
const bobPx=bob?bob*(H/192):0;
/* Reuse ImageData buffer — avoid per-frame GC pressure */
if(!window._rcFrameBuf||window._rcFrameBuf.width!==W||window._rcFrameBuf.height!==H){
  window._rcFrameBuf=ctx.createImageData(W,H);
}
const f1=_hexRGB(theme.floor1),f2=_hexRGB(theme.floor2),fogC=_hexRGB(theme.fog);
const cosLeft=Math.cos(angle-HALF_FOV),sinLeft=Math.sin(angle-HALF_FOV);
const cosRight=Math.cos(angle+HALF_FOV),sinRight=Math.sin(angle+HALF_FOV);
const pitchPx=(window._navPitch||0)*H*0.35;/* mouse look up/down: shears the horizon */
const halfH=H/2+bobPx+pitchPx;
/* Distance scale for the floor/ceiling caster must NOT include the pitch shift:
   pitch only slides the horizon line, it must not rescale the texture mapping
   (coupling the two made the floor/ceiling warp & swim while looking up/down). */
const scaleH=H/2+bobPx;
/* Textured floor & ceiling via ImageData pixel sampling */
if(!theme._cachedFloorTex){
  theme._cachedFloorTex=getFloorTex(theme.floorTex||'concrete',theme.floor1,theme.floor2);
  theme._cachedCeilTex=getCeilTex(theme.ceilTex||'stucco',theme.ceil);
}
const floorTexData=theme._cachedFloorTex;
const ceilTexData=theme._cachedCeilTex;
const ftd=floorTexData.data,ctd=ceilTexData.data;
const frameImg=window._rcFrameBuf;
const fd=frameImg.data;
const fcFogR=fogC[0],fcFogG=fogC[1],fcFogB=fogC[2];
/* Mobile: render floor/ceil every other row, duplicate. Also skip-2 horizontally. */
const rowStep=IS_MOBILE?4:1;
const pxStep=IS_MOBILE?4:1;
for(let y=0;y<H;y+=rowStep){
  const isFloor=y>=halfH;
  const rowDist=isFloor?scaleH/(y-halfH+0.001):scaleH/(halfH-y+0.001);
  const worldX0=px+rowDist*cosLeft;
  const worldY0=py+rowDist*sinLeft;
  const stepX=rowDist*(cosRight-cosLeft)/W*pxStep;
  const stepY=rowDist*(sinRight-sinLeft)/W*pxStep;
  const fogFactor=rowDist<8?rowDist/8:1;
  const inv=1-fogFactor;
  const texData=isFloor?ftd:ctd;
  let wx=worldX0,wy=worldY0;
  const rowStart=y*W*4;
  const TEX_MASK=TEX_SIZE-1;/* TEX_SIZE is 64, power of 2, so bitmask works */
  for(let x=0;x<W;x+=pxStep){
    /* Bitwise wrap - much faster than Math.floor. The 0.5 spreads each texture
       tile over 2 world units, so the floor/ceiling scroll & shimmer far gentler
       as you move (was 1 tile per unit, which read as fast scrolling). */
    let tx=((wx*(TEX_SIZE*0.5))|0)&TEX_MASK;
    let ty=((wy*(TEX_SIZE*0.5))|0)&TEX_MASK;
    if(tx<0)tx+=TEX_SIZE;if(ty<0)ty+=TEX_SIZE;
    const tIdx=(ty*TEX_SIZE+tx)*4;
    const tr=texData[tIdx],tg=texData[tIdx+1],tb=texData[tIdx+2];
    const outR=(tr*inv+fcFogR*fogFactor)|0;
    const outG=(tg*inv+fcFogG*fogFactor)|0;
    const outB=(tb*inv+fcFogB*fogFactor)|0;
    /* Replicate horizontally over pxStep pixels */
    for(let dx=0;dx<pxStep&&x+dx<W;dx++){
      const p=rowStart+(x+dx)*4;
      fd[p]=outR;fd[p+1]=outG;fd[p+2]=outB;fd[p+3]=255;
    }
    wx+=stepX;wy+=stepY;
  }
  /* Replicate the row we just sampled down over the rows we skipped. This used
     to happen inside the x loop, storing every skipped subpixel by hand. The
     sampled row is complete by the time we get here, so one copyWithin per
     skipped row does the same job as a native memmove. */
  if(rowStep>1){
    const rowBytes=W*4;
    for(let dy=1;dy<rowStep&&y+dy<H;dy++){
      fd.copyWithin(rowStart+dy*rowBytes,rowStart,rowStart+rowBytes);
    }
  }
}
ctx.putImageData(frameImg,0,0);
/* Reused across frames like _rcFrameBuf: the z-buffer only reallocates when
   the canvas width changes, and the hit pool / wall-dir list never do. */
if(!window._rcZBuf||window._rcZBuf.length!==W)window._rcZBuf=new Float32Array(W);
const zBuffer=window._rcZBuf;
const wallDirs=_RC_WALL_DIRS;
const fogR=fogC[0],fogG=fogC[1],fogB=fogC[2];
/* DDA raycaster: exact grid-boundary traversal. Much faster and more accurate
   than step-marching, especially at glancing/peripheral angles.
   MULTI-HIT: instead of stopping at the first wall, each ray records every wall
   cell it crosses and stops at the first FULL-height wall (nothing behind one is
   visible). The hits are then painted back-to-front so a tall wall behind a low
   one stays visible above it — that's what makes variable wall heights work. */
const MAX_HITS=8;/* max layered walls drawn per ray (plenty; bounds the work) */
const _hitPool=_RC_HIT_POOL;
for(let r=0;r<NUM_RAYS;r++){
const screenX=r*RAY_WIDTH;/* left edge of this ray's column band on screen */
/* Camera-plane ray distribution (rays spread linearly across a flat projection
   plane, NOT by equal angle). This matches the floor/ceiling caster, which
   interpolates the edge directions linearly across the screen — so walls and
   floor now agree and the wide-FOV fisheye / texture-warp goes away. */
const cameraX=(2*r/NUM_RAYS)-1;
const rayAngle=angle+Math.atan(cameraX*TAN_HALF);
const cos=Math.cos(rayAngle),sin=Math.sin(rayAngle);
const cosCorr=Math.cos(rayAngle-angle);/* fisheye correction factor */
const deltaDistX=Math.abs(cos)<1e-9?1e30:Math.abs(1/cos);
const deltaDistY=Math.abs(sin)<1e-9?1e30:Math.abs(1/sin);
let mapX=Math.floor(px),mapY=Math.floor(py);
let stepX,stepY,sideDistX,sideDistY;
if(cos<0){stepX=-1;sideDistX=(px-mapX)*deltaDistX;}
else{stepX=1;sideDistX=(mapX+1-px)*deltaDistX;}
if(sin<0){stepY=-1;sideDistY=(py-mapY)*deltaDistY;}
else{stepY=1;sideDistY=(mapY+1-py)*deltaDistY;}
let sideAxis=0;/* 0 = last step was X (E/W face), 1 = Y (N/S face) */
const maxDist=12;
let steps=0;const maxSteps=cols+rows+4;
let nHits=0;
let zWall=maxDist;/* nearest FULL-height wall, used for sprite occlusion */
let done=false;
while(!done&&steps<maxSteps){
if(sideDistX<sideDistY){sideDistX+=deltaDistX;mapX+=stepX;sideAxis=0;}
else{sideDistY+=deltaDistY;mapY+=stepY;sideAxis=1;}
let wh,oob=false;
if(mapY<0||mapY>=rows||mapX<0||mapX>=cols){oob=true;wh=1.0;/* grid edge = full wall, as before */}
else{wh=rcWallHeight(grid[mapY][mapX]);}
if(wh>0){
let d,hs;
if(sideAxis===0){d=sideDistX-deltaDistX;hs=stepX>0?3:2;}
else{d=sideDistY-deltaDistY;hs=stepY>0?0:1;}
if(d<=0)d=0.0001;
const pd=d*cosCorr;
if(pd<=maxDist&&nHits<MAX_HITS){
const hh=_hitPool[nHits++];
hh.dist=d;hh.perpDist=pd;hh.height=wh;hh.hitSide=hs;hh.sideAxis=sideAxis;
hh.mapX=mapX;hh.mapY=mapY;hh.stepX=stepX;hh.stepY=stepY;
}
if(wh>=1.0){if(pd<zWall)zWall=pd;done=true;}
}
if(oob)break;
steps++;}
/* record nearest full-wall perpDist across this ray's screen columns (sprites) */
for(let bx=0;bx<RAY_WIDTH&&screenX+bx<W;bx++){zBuffer[screenX+bx]=zWall;}
const drawW=(screenX+RAY_WIDTH<=W)?RAY_WIDTH:(W-screenX);
/* paint collected walls farthest-first */
for(let hi=nHits-1;hi>=0;hi--){
const hh=_hitPool[hi];
const perpDist=hh.perpDist;
const fullH=Math.min(H*2,H/perpDist);
const drawH=fullH*hh.height;
const baseY=halfH+fullH/2;/* floor-contact line for this distance */
const wallTop=baseY-drawH;/* low walls rise from the floor, cut off at top */
const wallColor=theme[wallDirs[hh.hitSide]];
const wallVariant=((hh.mapX*13+hh.mapY*7+hh.hitSide*3)&3);
const tex=getWallTex(theme.wallTex,wallColor,wallVariant);
const wallTexSize=tex.width||TEX_SIZE;
/* Exact texture X coordinate via DDA formula */
let wallHitPos;
if(hh.sideAxis===0){wallHitPos=py+hh.dist*sin;}
else{wallHitPos=px+hh.dist*cos;}
wallHitPos-=Math.floor(wallHitPos);
let texX=Math.floor(wallHitPos*wallTexSize);
/* Flip texture on certain faces so it "reads" consistently around the cell */
if(hh.sideAxis===0&&hh.stepX>0)texX=wallTexSize-texX-1;
if(hh.sideAxis===1&&hh.stepY<0)texX=wallTexSize-texX-1;
if(texX<0)texX=0;else if(texX>=wallTexSize)texX=wallTexSize-1;
/* sample the BOTTOM `height` slice of the texture so a low wall's texels are
   the same size as a full wall's (the wall sits on the floor, cut off up top) */
const srcY=wallTexSize*(1-hh.height);
const srcH=wallTexSize*hh.height;
ctx.drawImage(tex,texX,srcY,1,srcH,screenX,wallTop,drawW,drawH);
/* DOOR-ON-WALL: if the floor cell directly in front of this wall face is a
   door tile (D / E / numbered apartment door), paint the door texture onto
   the wall slice so the door appears set into the wall rather than floating.
   The adjacent cell toward the player is opposite the ray's last step. */
let _adjR,_adjC;
if(hh.sideAxis===0){_adjR=hh.mapY;_adjC=hh.mapX-hh.stepX;}
else{_adjR=hh.mapY-hh.stepY;_adjC=hh.mapX;}
if(_adjR>=0&&_adjR<rows&&_adjC>=0&&grid[_adjR]&&_adjC<grid[_adjR].length){
const _adjSym=grid[_adjR][_adjC];
const _isDoor=DOOR_SYMS[_adjSym];const _isStair=(_adjSym==='S'||_adjSym==='v');
if(_isDoor||_isStair){
/* which wall (relative to the door tile) did this ray hit? only paint if it's
   the door's designated mount wall — stops corner tiles painting two doors. */
const _wallSide=(hh.sideAxis===0)?(hh.stepX>0?'E':'W'):(hh.stepY>0?'S':'N');
if(_wallSide===rcDoorMountSide(grid,_adjR,_adjC)){
if(_isDoor){
const _dtex=getDoorTex(wallColor,_isDoor.label);
const _ds=_dtex.width||TEX_SIZE;let _dx=Math.floor(wallHitPos*_ds);
if(hh.sideAxis===0&&hh.stepX>0)_dx=_ds-_dx-1;if(hh.sideAxis===1&&hh.stepY<0)_dx=_ds-_dx-1;
ctx.drawImage(_dtex,_dx,_ds*(1-hh.height),1,_ds*hh.height,screenX,wallTop,drawW,drawH);
}else{
const _stex=getStairTex(wallColor,_adjSym==='v'?'down':'up');
const _ss=_stex.width||TEX_SIZE;let _sx=Math.floor(wallHitPos*_ss);
if(hh.sideAxis===0&&hh.stepX>0)_sx=_ss-_sx-1;if(hh.sideAxis===1&&hh.stepY<0)_sx=_ss-_sx-1;
ctx.drawImage(_stex,_sx,_ss*(1-hh.height),1,_ss*hh.height,screenX,wallTop,drawW,drawH);
}
}
}
}
const fogAlpha=perpDist<10?perpDist/10:0.85;
ctx.fillStyle='rgba('+fogR+','+fogG+','+fogB+','+(fogAlpha>0.85?0.85:fogAlpha)+')';
ctx.fillRect(screenX,wallTop,drawW,drawH);
}
}
const sprites=[];
for(let r=0;r<rows;r++){for(let c=0;c<grid[r].length;c++){
const sym=grid[r][c];
if(DOOR_SYMS[sym]||sym==='S'||sym==='v')continue; /* doors & stairs render on the wall, not as floating glyphs */
const g=FP_GLYPH[sym];
if(g){const _ak=window._navItemArt&&window._navItemArt[r+','+c];sprites.push({x:c+0.5,y:r+0.5,glyph:g,sym:sym,art:_ak||null});}}}
_injectFurniture(sprites);
sprites.sort(function(a,b){
const da=(a.x-px)*(a.x-px)+(a.y-py)*(a.y-py);
const db=(b.x-px)*(b.x-px)+(b.y-py)*(b.y-py);return db-da;});
for(let i=0;i<sprites.length;i++){
const sp=sprites[i];
const dx=sp.x-px,dy=sp.y-py;
const dist=Math.sqrt(dx*dx+dy*dy);
if(dist<0.3)continue;
const sprAngle=Math.atan2(dy,dx)-angle;
let normAngle=sprAngle;
while(normAngle>Math.PI)normAngle-=Math.PI*2;
while(normAngle<-Math.PI)normAngle+=Math.PI*2;
if(Math.abs(normAngle)>HALF_FOV+0.2)continue;
const screenX=Math.floor(W/2+(Math.tan(normAngle)/TAN_HALF)*(W/2));
const _sprH=sp.sprH||sp.glyph.sprH;
const sprHeight=Math.min(H*1.5,(H/dist)*_sprH);
const sprWidth=sprHeight*(sp.wmul||0.7);
const sprTop=(H-sprHeight)/2+(1-_sprH)*sprHeight*0.3+bobPx+pitchPx;
const sx=Math.floor(screenX-sprWidth/2);
const ex=Math.floor(screenX+sprWidth/2);
let visible=false;
for(let xx=Math.max(0,sx);xx<Math.min(W,ex);xx++){
if(dist<zBuffer[xx]){visible=true;break;}}
if(!visible)continue;
_rcSpriteBody(ctx,sp,screenX,sprTop,sprWidth,sprHeight,dist);
}
/* === MINIMAP + HUD === wrapped so the stair-climb cinematic can hide it === */
if(!window._rcHideMinimap){
/* === MINIMAP (GTA-IV-style circular radar, rotates so facing is up) === */
const mmSize=IS_MOBILE?84:96;const mmPad=8;const mmBottom=IS_MOBILE?8:34;
/* On mobile the on-screen thumb controls sit in BOTH bottom corners (D-pad
   bottom-left, C/SAV/INV bottom-right), so a bottom-right radar gets covered by
   the action buttons. Move it to the TOP-RIGHT on mobile — clear of the buttons,
   the top-left stats readout, and the top-centre compass. Desktop keeps the
   classic bottom-right radar (nothing overlaps it there). */
/* Keep the radar fully ON-SCREEN in every window. Mobile letterboxes the view
   (object-fit:contain), so the whole 384x216 buffer — radar included — is always
   visible and buffer coords map straight to screen. Desktop fills the viewport
   (object-fit:cover), which crops the buffer's edges whenever the window isn't
   16:9 (e.g. a 16:10 laptop crops the sides; an ultrawide crops top/bottom), and
   that would slice a corner radar off the screen. So on desktop, derive the
   visible (un-cropped) buffer rect from the real viewport and pin the radar to
   THAT edge instead of the raw buffer edge. */
let _mmVisR=W,_mmVisB=H,_mmVisT=0;
if(!IS_MOBILE){
  var _dw=(canvas&&canvas.clientWidth)||(typeof window!=='undefined'&&window.innerWidth)||0;
  var _dh=(canvas&&canvas.clientHeight)||(typeof window!=='undefined'&&window.innerHeight)||0;
  if(_dw>0&&_dh>0){var _cover=Math.max(_dw/W,_dh/H);var _cx=(W-_dw/_cover)/2,_cy=(H-_dh/_cover)/2;
    if(_cx>0.5){_mmVisR=W-_cx;} if(_cy>0.5){_mmVisB=H-_cy;_mmVisT=_cy;}}
}
const mmX=Math.round(Math.max(mmPad,_mmVisR-mmSize-mmPad));
const mmY=IS_MOBILE?mmPad:Math.round(Math.max(_mmVisT+mmPad,_mmVisB-mmSize-mmBottom));
if(window.CMMINIMAP){
ctx.save();ctx.translate(mmX,mmY);
CMMINIMAP.drawGrid(ctx,mmSize,grid,px,py,angle);
ctx.restore();
}
/* === COMPASS (outside the minimap, top-left) === */
ctx.font='bold 16px "VT323", monospace';ctx.fillStyle='#33ff66';ctx.textAlign='left';ctx.textBaseline='top';
ctx.shadowColor='#33ff66';ctx.shadowBlur=4;
const deg=((angle*180/Math.PI)%360+360)%360;
let compass='N';if(deg>45&&deg<=135)compass='E';else if(deg>135&&deg<=225)compass='S';else if(deg>225&&deg<=315)compass='W';
ctx.fillText(compass,8,8);ctx.shadowBlur=0;
const playerCellX=Math.floor(px),playerCellY=Math.floor(py);
let hereLabel='';
if(playerCellY>=0&&playerCellY<rows&&playerCellX>=0&&playerCellX<grid[playerCellY].length){
const sym=grid[playerCellY][playerCellX];
if(FP_GLYPH[sym])hereLabel=window.t?window.t(FP_GLYPH[sym].label):FP_GLYPH[sym].label;}
if(hereLabel){
ctx.font='14px "VT323", monospace';ctx.fillStyle='#ffb000';ctx.textAlign='center';ctx.textBaseline='bottom';
ctx.shadowColor='#000';ctx.shadowBlur=4;
var T2=window.t||function(s){return s;};var labelPart=hereLabel?T2(hereLabel):'';var interactHint=window._padConnected?'[ '+labelPart+' - '+T2('press ')+labelCheck()+T2(' to interact')+' ]':'[ '+labelPart+' - '+T2('Press C to interact')+' ]';ctx.fillText(interactHint,W/2,H-8);ctx.shadowBlur=0;}
}/* end _rcHideMinimap guard */
}
let _rcCanvas=null;let _rcTheme=null;let _rcAnim=null;
function rcStop(){if(_rcAnim){cancelAnimationFrame(_rcAnim);_rcAnim=null;}}
/* Re-render the current first-person view (e.g. after an event despawns an NPC
   by editing the grid). Uses the last render's parameters. */
/* _rcLast is now a preallocated record rather than a per-frame literal, so it
   is always present - test the canvas to see whether a frame has been drawn. */
function rcRedraw(){var L=window._rcLast;if(L&&L.canvas){rcRender(L.canvas,L.grid,L.px,L.py,L.angle,L.theme);}}
/* Repaint the current room in place after a grid mutation (e.g. an item just
   picked up), WITHOUT tearing the nav viewport down. A full drawFP() recreates
   the canvas, re-attaches the WebGL renderer and rebuilds the first-person hand
   every call; under rapid pickups that context churn corrupts the arm. Instead:
   mark the 3D scene dirty so the existing renderer rebuilds only its geometry on
   the next frame (reusing the same canvas/renderer/hand), and repaint the raster
   canvas in place. The item sprite is built from the grid, so this makes it
   vanish with no rebuild of the surrounding viewport. */
window.navRepaintRoom=function navRepaintRoom(grid,pos,heading){
  if(window.NAV3D&&NAV3D.ready&&NAV3D.canvas)NAV3D._grid=null;
  if(typeof rcRedraw==='function')rcRedraw();
  if(grid&&pos&&typeof _updateStatus==='function')_updateStatus(grid,pos,heading);
};
function drawFP(grid,pos,heading,title,opts){window._currentFpTitle=title;
const theme=pickTheme(title);
const wrap=document.createElement('div');wrap.className='fp-wrap';
const titleEl=document.createElement('div');titleEl.className='fp-title';titleEl.textContent=(window.t?window.t(title||''):(title||''));wrap.appendChild(titleEl);
const canvas=document.createElement('canvas');canvas.className='fp-canvas';
const cw=IS_MOBILE?384:768;const ch=IS_MOBILE?216:432;
canvas.width=cw;canvas.height=ch;
/* TRUE-3D: claim this canvas for the Three.js renderer before anything grabs a
   2D context. Availability is tested on a scratch canvas first, so a failed
   attach can't poison this one. Height-mapped grids (grid._floorH, e.g. the
   factory stairwell) are fully supported in 3D. */
if(window.NAV3D&&NAV3D.enabled&&NAV3D.available()){NAV3D.attach(canvas);}
else if(window.NAV3D){NAV3D.ready=false;NAV3D.canvas=null;}
/* On mobile, wrap the canvas in a "stage" so we can overlay semi-transparent
   touch controls directly on top of the viewport: a D-pad on the left
   (up/down = move, left/right = turn) and the C/SAV/INV action buttons on the
   right. The viewport keeps the full width; controls float on the glass so
   the player can see the game through them. These buttons call the same
   handlers the keyboard and swipe paths use. Desktop is unaffected. */
if(IS_MOBILE){
  const stage=document.createElement('div');stage.className='fp-stage';
  stage.appendChild(canvas);
  /* left D-pad */
  const pad=document.createElement('div');pad.className='fp-pad';
  function padBtn(cls,label,action){
    const b=document.createElement('button');b.type='button';
    b.className='fp-pad-btn '+cls;b.innerHTML=label;
    /* held-state for free-movement mode: press-and-hold to keep moving */
    const fmMap={forward:'f',back:'b',turn_left:'tl',turn_right:'tr'};
    const fmKey=fmMap[action];
    function fmDown(e){if(window._fm&&window._fm.active&&fmKey){e.preventDefault();e.stopPropagation();if(typeof ensureAudio==='function')ensureAudio();window._fm.held[fmKey]=true;}}
    function fmUp(){if(window._fm&&fmKey)window._fm.held[fmKey]=false;}
    b.addEventListener('pointerdown',fmDown);
    b.addEventListener('pointerup',fmUp);
    b.addEventListener('pointerleave',fmUp);
    b.addEventListener('pointercancel',fmUp);
    b.addEventListener('touchstart',function(e){if(window._fm&&window._fm.active){fmDown(e);return;}e.preventDefault();e.stopPropagation();if(typeof ensureAudio==='function')ensureAudio();if(typeof playMoveBlip==='function')playMoveBlip();if(arrowHandler)arrowHandler(action);},{passive:false});
    b.addEventListener('touchend',function(e){if(window._fm&&window._fm.active){fmUp();}});
    b.addEventListener('click',function(e){if(window._fm&&window._fm.active)return;e.preventDefault();e.stopPropagation();if(arrowHandler)arrowHandler(action);});
    return b;
  }
  pad.appendChild(padBtn('fp-up','\u25B2','forward'));
  pad.appendChild(padBtn('fp-left','\u25C0','turn_left'));
  pad.appendChild(padBtn('fp-right','\u25B6','turn_right'));
  pad.appendChild(padBtn('fp-down','\u25BC','back'));
  stage.appendChild(pad);
  /* right action buttons */
  const acts=document.createElement('div');acts.className='fp-acts';
  function actBtn(label,fn){
    const b=document.createElement('button');b.type='button';
    b.className='fp-act-btn';b.textContent=label;
    b.addEventListener('touchstart',function(e){e.preventDefault();e.stopPropagation();if(typeof ensureAudio==='function')ensureAudio();if(typeof playKeyClick==='function')playKeyClick();fn();},{passive:false});
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();fn();});
    return b;
  }
  acts.appendChild(actBtn('C',function(){if(movementAllowed&&checkFn)checkFn();}));
  acts.appendChild(actBtn('SAV',function(){if(typeof showSaveCode==='function')showSaveCode();}));
  acts.appendChild(actBtn('INV',function(){if(typeof showInv==='function')showInv();}));
  stage.appendChild(acts);
  wrap.appendChild(stage);
}else{
  const stage=document.createElement('div');stage.className='fp-stage';
  stage.appendChild(canvas);
  wrap.appendChild(stage);
  if(!IS_MOBILE&&typeof window._navWireMouseLook==='function')window._navWireMouseLook(canvas);
  if(!IS_MOBILE){var _xh=document.createElement('div');_xh.className='fp-crosshair';_xh.setAttribute('aria-hidden','true');wrap.appendChild(_xh);}
}
/* Bethesda-style compass strip, centred over the top of the 3D viewport */
if(window.CMCOMPASS&&canvas.parentNode)CMCOMPASS.mount(canvas.parentNode);
/* persistent player stats readout ($ / LVL), top-left of the 3D viewport */
if(wrap&&!wrap.querySelector('.fp-stats')){var _fpst=document.createElement('div');_fpst.className='fp-stats';_fpst.id='fpStats';_fpst.setAttribute('aria-hidden','true');wrap.appendChild(_fpst);}
if(window.fpStatsUpdate)fpStatsUpdate();
const statusEl=document.createElement('div');statusEl.className='fp-status';statusEl.id='fpStatusBar';
wrap.appendChild(statusEl);
/* 3D mode: the raster renderer painted its minimap into the main canvas; here we
   overlay a small 2D canvas and NAV3D redraws the same tactical map each frame. */
if(window.NAV3D&&NAV3D.ready&&NAV3D.canvas===canvas){
  var _mm=document.createElement('canvas');_mm.className='fp-mm';
  _mm.width=IS_MOBILE?76:140;_mm.height=IS_MOBILE?76:140;
  wrap.appendChild(_mm);NAV3D.mm=_mm;
}else if(window.NAV3D){NAV3D.mm=null;}
mapAreaEl.innerHTML='';mapAreaEl.appendChild(wrap);
_rcCanvas=canvas;_rcTheme=theme;
const angle=[Math.PI*1.5,0,Math.PI*0.5,Math.PI][heading];
rcRender(canvas,grid,pos[1]+0.5,pos[0]+0.5,angle,theme);
_updateStatus(grid,pos,heading);
return{theme:theme,canvas:canvas};}
window._updateStatus = function _updateStatus(grid,pos,heading){window._lastFpState={grid:grid,pos:pos,heading:heading};
const el=document.getElementById('fpStatusBar');if(!el)return;
const sym=(pos[0]>=0&&pos[0]<grid.length&&pos[1]>=0&&pos[1]<grid[pos[0]].length)?grid[pos[0]][pos[1]]:' ';
const here=(FP_GLYPH[sym]&&FP_GLYPH[sym].label)||'';
const dirs=['NORTH','EAST','SOUTH','WEST'];
var T=window.t||function(s){return s;};
var hereLabel=here?T(here):'';
var _cmpOn=!!(window.CMCOMPASS&&CMCOMPASS.active);el.textContent=_cmpOn?(hereLabel?T('HERE: ')+hereLabel:''):((hereLabel?T('HERE: ')+hereLabel+' \u00B7 ':'')+T(' FACING: ')+T(dirs[heading]));if(window.fpStatsUpdate)fpStatsUpdate();}
window.fpStatsUpdate=function fpStatsUpdate(){var el=document.getElementById('fpStats');if(!el||typeof state==='undefined')return;el.textContent='$'+state.money+' \u00B7 LVL '+state.level;};
async function rcAnimateStep(canvas,grid,fromX,fromY,toX,toY,angle,theme){
return new Promise(function(resolve){
const dur=160;const start=performance.now();
function tick(now){const t=Math.min(1,(now-start)/dur);
const eased=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const cx=fromX+(toX-fromX)*eased;const cy=fromY+(toY-fromY)*eased;
/* view bob: a vertical sine over the step, strongest mid-stride */
const bob=Math.sin(t*Math.PI)*BOB_AMOUNT;
rcRender(canvas,grid,cx,cy,angle,theme,bob);
if(t<1)_rcAnim=requestAnimationFrame(tick);else{_rcAnim=null;resolve();}}
_rcAnim=requestAnimationFrame(tick);});}
async function rcAnimateTurn(canvas,grid,px,py,fromAngle,toAngle,theme){
return new Promise(function(resolve){
const dur=160;const start=performance.now();
let diff=toAngle-fromAngle;
if(diff>Math.PI)diff-=Math.PI*2;
if(diff<-Math.PI)diff+=Math.PI*2;
function tick(now){const t=Math.min(1,(now-start)/dur);
const eased=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const a=fromAngle+diff*eased;
rcRender(canvas,grid,px,py,a,theme);
if(t<1)_rcAnim=requestAnimationFrame(tick);else{_rcAnim=null;resolve();}}
_rcAnim=requestAnimationFrame(tick);});}


/* ============================================================================
   SECTOR RENDERER — true variable floor heights (the raycaster form of Doom
   visplanes). Used for the factory stairwells: real flights you walk up/down
   with your eye height rising. A grid opts into this by carrying grid._floorH,
   a parallel 2D array of per-cell floor heights (world units; '#' cells are
   full floor-to-ceiling walls). Projection matches the flat renderer exactly:
   a point at height z and perpendicular distance d sits at screen row
   y = horizon + (zEye - z) * (H/d).
   ============================================================================ */
const SECTOR_STEP_MAX=0.34;   /* tallest single step the player can climb at once */
const SECTOR_EYE=0.5;         /* eye offset above the floor you stand on */
const SECTOR_ZCEIL=2.4;       /* flat ceiling height for stairwells */
/* Smoothed eye height for sector rooms. The camera used to snap the moment the
   player's cell changed height — walking off an open stair edge teleported the
   view down a full unit in one frame, and straddling a tread boundary made the
   horizon flicker. Ease toward the stood-on floor instead (time-based so it's
   frame-rate independent); snap instantly when the grid changes (room entry). */
var _secEye={grid:null,v:0,t:0};
function _secEyeSmooth(grid,standF){
  var now=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
  if(_secEye.grid!==grid){_secEye.grid=grid;_secEye.v=standF;_secEye.t=now;return standF;}
  var dt=(now-_secEye.t)/1000;if(dt<0)dt=0;if(dt>0.05)dt=0.05;_secEye.t=now;
  _secEye.v+=(standF-_secEye.v)*Math.min(1,dt*12);
  if(Math.abs(standF-_secEye.v)<0.004)_secEye.v=standF;
  return _secEye.v;
}
function rcRenderSector(canvas,grid,px,py,angle,theme,bob){
  _rcSetLast(canvas,grid,px,py,angle,theme);
  const ctx=canvas.getContext('2d',{alpha:false});
  const W=canvas.width,H=canvas.height;
  const fh=grid._floorH, rows=grid.length;
  /* ceiling height is per-grid: an open multi-storey atrium (the factory tower)
     carries grid._ceilH so the roof sits ABOVE the top deck instead of at the
     enclosed-stairwell default. */
  const FOV=Math.PI*0.6, HALF=FOV/2, TAN_HALF=Math.tan(HALF), MAXD=22, ZCEIL=(grid._ceilH||SECTOR_ZCEIL), EYE=SECTOR_EYE;
  const NUM=IS_MOBILE?(W>>1):W, RW=IS_MOBILE?2:1;
  const bobPx=bob?bob*(H/192):0;
  const pitchPx=(window._navPitch||0)*H*0.35;
  const horizon=H*0.5+bobPx+pitchPx;
  const pr=Math.floor(py), pc=Math.floor(px);
  const standF=(fh[pr]&&fh[pr][pc]!=null)?fh[pr][pc]:0;
  const zEye=_secEyeSmooth(grid,standF)+EYE;
  /* theme colours (match the factory floors) */
  const fogC=_hexRGB(theme&&theme.fog?theme.fog:'#040804');
  const fl1=_hexRGB(theme&&theme.floor1?theme.floor1:'#1a1a0e');
  const fl2=_hexRGB(theme&&theme.floor2?theme.floor2:'#262618');
  const ceilC=_hexRGB(theme&&theme.ceil?theme.ceil:'#0a0a04');
  const wallColor=(theme&&theme.wallN)?theme.wallN:'#3a4a2a';
  const wallTex=getWallTex((theme&&theme.wallTex)?theme.wallTex:'metal',wallColor);
  const FR=fogC[0],FG=fogC[1],FB=fogC[2];
  function mix(a,b,t){return Math.round(a+(b-a)*t);}
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  /* per-screen-column depth of the nearest full-height wall (perp distance),
     so billboard props can be occluded by walls exactly like the flat renderer. */
  const secZ=new Float32Array(W); for(let zi=0;zi<W;zi++)secZ[zi]=MAXD;
  for(let sx=0;sx<NUM;sx++){
    const x=sx*RW;
    const rayAng=angle+Math.atan(((2*sx/NUM)-1)*TAN_HALF);
    const cos=Math.cos(rayAng),sin=Math.sin(rayAng);
    const cosCorr=Math.cos(rayAng-angle);
    let mapX=pc,mapY=pr;
    const ddx=Math.abs(cos)<1e-9?1e30:Math.abs(1/cos);
    const ddy=Math.abs(sin)<1e-9?1e30:Math.abs(1/sin);
    let stepX,stepY,sdx,sdy;
    if(cos<0){stepX=-1;sdx=(px-mapX)*ddx;}else{stepX=1;sdx=(mapX+1-px)*ddx;}
    if(sin<0){stepY=-1;sdy=(py-mapY)*ddy;}else{stepY=1;sdy=(mapY+1-py)*ddy;}
    let floorClip=H,ceilClip=0,hPrev=standF,guard=0;
    while(guard++ < 2*rows+8){
      let perp,side,rayDist;
      if(sdx<sdy){rayDist=sdx;sdx+=ddx;mapX+=stepX;side=0;}
      else       {rayDist=sdy;sdy+=ddy;mapY+=stepY;side=1;}
      perp=rayDist*cosCorr; if(perp<0.0001)perp=0.0001;
      let far=false; if(perp>MAXD){perp=MAXD;far=true;}
      const invH=H/perp, f=Math.min(0.82,perp/MAXD*1.15);
      /* floor span of the cell just exited (shaded; perspective floor texturing
         is intentionally left out for now to keep this renderer robust) */
      let yTop=Math.round(horizon+(zEye-hPrev)*invH);
      if(yTop<ceilClip)yTop=ceilClip; if(yTop>floorClip)yTop=floorClip;
      if(yTop<floorClip){
        const tnt=Math.max(0,Math.min(1,(hPrev+0.2)/1.2));      /* higher steps a touch lighter */
        const fr=mix(fl1[0],fl2[0],tnt),fg=mix(fl1[1],fl2[1],tnt),fb=mix(fl1[2],fl2[2],tnt);
        ctx.fillStyle='rgb('+mix(fr,FR,f)+','+mix(fg,FG,f)+','+mix(fb,FB,f)+')';
        ctx.fillRect(x,yTop,RW,floorClip-yTop); floorClip=yTop;
      }
      /* ceiling span (flat, shaded) */
      let yBot=Math.round(horizon+(zEye-ZCEIL)*invH);
      if(yBot>floorClip)yBot=floorClip; if(yBot<ceilClip)yBot=ceilClip;
      if(yBot>ceilClip){
        ctx.fillStyle='rgb('+mix(ceilC[0],FR,f)+','+mix(ceilC[1],FG,f)+','+mix(ceilC[2],FB,f)+')';
        ctx.fillRect(x,ceilClip,RW,yBot-ceilClip); ceilClip=yBot;
      }
      if(ceilClip>=floorClip) break;
      if(far){ ctx.fillStyle='rgb('+FR+','+FG+','+FB+')'; ctx.fillRect(x,ceilClip,RW,floorClip-ceilClip); break; }
      if(mapY<0||mapY>=rows||!grid[mapY]||mapX<0||mapX>=grid[mapY].length){
        ctx.fillStyle='rgb('+FR+','+FG+','+FB+')'; ctx.fillRect(x,ceilClip,RW,floorClip-ceilClip); break;
      }
      /* texture X from the exact hit position (same formula as the flat renderer) */
      let hitPos = (side===0) ? (py+rayDist*sin) : (px+rayDist*cos);
      hitPos-=Math.floor(hitPos);
      let texX=Math.floor(hitPos*TEX_SIZE);
      if(side===0&&stepX>0)texX=TEX_SIZE-texX-1;
      if(side===1&&stepY<0)texX=TEX_SIZE-texX-1;
      if(texX<0)texX=0;else if(texX>=TEX_SIZE)texX=TEX_SIZE-1;
      if(rcWallHeight(grid[mapY][mapX])>=1.0){               /* full floor-to-ceiling wall: TEXTURED */
        const unTop=horizon+(zEye-ZCEIL)*invH;               /* unclipped wall extent on screen */
        const unBot=horizon+(zEye-hPrev)*invH;
        const span=(unBot-unTop)||1;
        let sTop=(ceilClip-unTop)/span; let sBot=(floorClip-unTop)/span;
        if(sTop<0)sTop=0; if(sBot>1)sBot=1;
        const srcY=sTop*TEX_SIZE, srcH=Math.max(1,(sBot-sTop)*TEX_SIZE);
        ctx.drawImage(wallTex,texX,srcY,1,srcH,x,ceilClip,RW,floorClip-ceilClip);
        ctx.fillStyle='rgba('+FR+','+FG+','+FB+','+f+')';
        ctx.fillRect(x,ceilClip,RW,floorClip-ceilClip);
        for(let bx=0;bx<RW&&x+bx<W;bx++)secZ[x+bx]=perp;
        break;
      }
      const hNew=(fh[mapY]&&fh[mapY][mapX]!=null)?fh[mapY][mapX]:0;
      if(hNew>hPrev){                                         /* step riser: TEXTURED slice */
        let rTop=Math.round(horizon+(zEye-hNew)*invH);
        if(rTop<ceilClip)rTop=ceilClip; if(rTop>floorClip)rTop=floorClip;
        if(rTop<floorClip){
          const h=Math.max(0.001,Math.min(1,hNew-hPrev));
          ctx.drawImage(wallTex,texX,TEX_SIZE*(1-h),1,TEX_SIZE*h,x,rTop,RW,floorClip-rTop);
          ctx.fillStyle='rgba('+FR+','+FG+','+FB+','+f+')';
          ctx.fillRect(x,rTop,RW,floorClip-rTop);
          floorClip=rTop;
        }
      }
      hPrev=hNew;
    }
  }
  /* ---- billboard props (items, people, furniture) on their own deck ----
     Each sprite is placed with its FEET on the floor height of its cell and
     projected with the same horizon/eye math the walls use, so a badge on the
     2nd-floor deck sits ON that deck, not floating. Occluded by full walls via
     secZ. Uses the shared _rcSpriteBody so it looks identical to flat rooms. */
  const _sprites=[];
  for(let sr=0;sr<rows;sr++){const grow=grid[sr];if(!grow)continue;for(let sc=0;sc<grow.length;sc++){
    const sym=grow[sc];
    if(DOOR_SYMS[sym]||sym==='S'||sym==='v')continue;   /* doors/stairs paint on walls */
    const g=FP_GLYPH[sym];
    if(g){const ak=window._navItemArt&&window._navItemArt[sr+','+sc];
      _sprites.push({x:sc+0.5,y:sr+0.5,glyph:g,sym:sym,art:ak||null,standH:(fh[sr]&&fh[sr][sc]!=null)?fh[sr][sc]:0});}
  }}
  /* furniture billboards (independent of grid symbols), also floor-height aware */
  const FURN=window._navFurniture;
  if(FURN){for(const key in FURN){const kp=key.split(','),fr2=+kp[0],fc2=+kp[1],reg=FURNITURE[FURN[key]];if(!reg)continue;
    const spd=ITEM_SPR[reg.art],wm=spd?(spd.r[0].length/spd.r.length):0.7;
    _sprites.push({x:fc2+0.5,y:fr2+0.5,glyph:{color:'#cccccc',sprH:reg.sprH},sym:'',art:reg.art,sprH:reg.sprH,wmul:wm,
      standH:(fh[fr2]&&fh[fr2][fc2]!=null)?fh[fr2][fc2]:0});}}
  _sprites.sort(function(a,b){return ((b.x-px)*(b.x-px)+(b.y-py)*(b.y-py))-((a.x-px)*(a.x-px)+(a.y-py)*(a.y-py));});
  for(let i=0;i<_sprites.length;i++){
    const sp=_sprites[i];
    const dx=sp.x-px,dy=sp.y-py, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<0.3)continue;
    let na=Math.atan2(dy,dx)-angle;
    while(na>Math.PI)na-=Math.PI*2; while(na<-Math.PI)na+=Math.PI*2;
    if(Math.abs(na)>HALF+0.25)continue;
    const perp=Math.max(0.05,dist*Math.cos(na));   /* perpendicular depth, matches walls/secZ */
    const invP=H/perp;
    const wH=sp.sprH||sp.glyph.sprH||0.5;           /* sprite world height (units) */
    const screenX=Math.floor(W/2+(Math.tan(na)/TAN_HALF)*(W/2));
    const feetY=horizon+(zEye-sp.standH)*invP;
    const headY=horizon+(zEye-(sp.standH+wH))*invP;
    const sprHeight=Math.max(1,feetY-headY);
    const sprTop=headY;
    const sprWidth=sprHeight*(sp.wmul||0.7);
    const sxL=Math.floor(screenX-sprWidth/2), exR=Math.floor(screenX+sprWidth/2);
    let visible=false;
    for(let xx=Math.max(0,sxL);xx<Math.min(W,exR);xx++){ if(perp<secZ[xx]){visible=true;break;} }
    if(!visible)continue;
    _rcSpriteBody(ctx,sp,screenX,sprTop,sprWidth,sprHeight,dist);
  }
  ctx.font='14px "VT323", monospace';ctx.fillStyle='#ffb000';ctx.textAlign='center';ctx.textBaseline='bottom';
  ctx.shadowColor='#000';ctx.shadowBlur=4;
  var Tc=window.t||function(s){return s;};
  ctx.fillText('[ '+Tc('walk the stairs')+' ]',W/2,H-8);ctx.shadowBlur=0;
}

/* ============================================================================
   buildFactoryTower() — the WHOLE Mayo Corp interior as ONE continuous
   height-mapped room: five stepped floor-decks joined by real, walkable stair
   flights. No teleport, no per-floor room swap — the player physically climbs
   from floor 1 to the roof door in a single navigable space (rendered by the
   sector renderer / true-3D nav3d, both height-aware).

   Geometry: each deck reproduces the ORIGINAL per-floor room layout from the
   classic (pre-tower) factory — same footprints, interior wall stubs, clue
   spots and set-dressing:
     F1  3x5  worker + mop bucket, centre wall stub, entrance E on the south
     F2  3x5  locked door (west nook) + dropped badge, centre wall stub
     F3  3x5  bystander + rat poison (west nook), east wall stub
     F4  3x3  the shadowy suspect, small dark room (east cols walled off)
     F5  2x4  short top floor with the ROOF ACCESS door (north cap wall)
   The classic rooms always had the down-stairs on the LEFT and the up-stairs
   on the RIGHT; the tower keeps that: every flight ascends east -> west, so
   you leave a floor at its north-EAST corner and arrive on the next floor at
   its south-WEST corner, crossing each deck just like the original.

   Flights are per-cell height rows between decks. One story = 0.9u split into
   rises <= 0.3u (< SECTOR_STEP_MAX 0.34) so every step is climbable and the
   descent glides. Non-tread cells of a flight row are solid walls, so each
   deck's north edge reads as a wall with a single stair opening. The roof is
   an open atrium: grid._ceilH clears the top deck.

   Returns geometry PLUS a `cells` map of clue coordinates so the story layer
   (ch1.js) can attach its own events/exits without hard-coding grid offsets,
   and ready-made `furniture` / `itemArt` set-dressing. */
function buildFactoryTower(){
  const STORY=0.9;
  const STEP_MAX=0.30;                  /* deliberately below engine max 0.34 */
  const IW=5, WCOL=IW+2;
  const deckH=f=>(f-1)*STORY;

  /* Canonical teleport-era room interiors. These strings are copied directly
     from ch1.js. Non-stair symbols, wall stubs, clues and doors are immutable.
     Only S/v are interpreted as openings into the physical stair flights. */
  const sourceLayouts={
    1:['....S','K.#.I','E....'],
    2:['....S','D.#I.','v....'],
    3:['....S','I.B..','v....'],
    4:['....S','.#K#.','v....'],
    5:['..D..','v....']
  };

  const grid=[], H=[];
  const push=(g,h)=>{grid.push(g);H.push(h);return grid.length-1;};
  const wallRow=()=>push(Array(WCOL).fill('#'),Array(WCOL).fill(0));
  const deckRow=(pattern,height)=>{
    const g=['#'],h=[0];
    for(const ch of pattern){g.push(ch);h.push(ch==='#'?0:height);}
    g.push('#');h.push(0);
    return push(g,h);
  };
  const stairRow=(treads)=>{
    const g=Array(WCOL).fill('#'),h=Array(WCOL).fill(0),idx=push(g,h);
    for(const [col,height] of treads){grid[idx][col]='.';H[idx][col]=height;}
    return idx;
  };

  const landing={};
  wallRow();

  /* Build top-down because the navigation grid is a single unwrapped vertical
     section. Each floor remains an exact local copy of its old room; the rows
     between floors are dedicated stairwell space, not borrowed room space. */
  landing[5]=sourceLayouts[5].map(p=>deckRow(p,deckH(5)));
  stairRow([[1,deckH(5)],[2,deckH(4)+0.60],[3,deckH(4)+0.30]]);

  landing[4]=sourceLayouts[4].map(p=>deckRow(p,deckH(4)));
  stairRow([[1,deckH(3)+0.75],[2,deckH(3)+0.60],[3,deckH(3)+0.45],
            [4,deckH(3)+0.30],[5,deckH(3)+0.15]]);

  landing[3]=sourceLayouts[3].map(p=>deckRow(p,deckH(3)));
  stairRow([[2,deckH(2)+0.72],[3,deckH(2)+0.54],[4,deckH(2)+0.36],
            [5,deckH(2)+0.18]]);

  landing[2]=sourceLayouts[2].map(p=>deckRow(p,deckH(2)));
  stairRow([[2,deckH(1)+0.72],[3,deckH(1)+0.54],[4,deckH(1)+0.36],
            [5,deckH(1)+0.18]]);

  landing[1]=sourceLayouts[1].map(p=>deckRow(p,deckH(1)));
  wallRow();

  grid._floorH=H;
  grid._ceilH=deckH(5)+1.05;

  const at=(floor,localRow,col)=>[landing[floor][localRow],col];
  const cells={
    f1_worker:at(1,1,1), f1_mop:at(1,1,5),
    f2_door:at(2,1,1),   f2_badge:at(2,1,4),
    f3_poison:at(3,1,1), f3_bystander:at(3,1,3),
    f4_suspect:at(4,1,3),roof:at(5,0,3)
  };

  /* Dressing coordinates are likewise the exact teleport-era local coords. */
  const furniture={},itemArt={};
  const put=(map,f,r,c,value)=>{map[landing[f][r]+','+c]=value;};
  put(furniture,1,0,1,'mayoVat'); put(furniture,1,0,2,'mayoVat'); put(furniture,1,2,4,'crate');
  put(furniture,2,0,1,'mayoVat'); put(furniture,2,0,2,'mayoVat'); put(furniture,2,2,5,'barrel');
  put(furniture,3,0,2,'mayoVat'); put(furniture,3,0,4,'mayoVat'); put(furniture,3,2,5,'crate');
  put(furniture,4,0,1,'barrel');  put(furniture,4,0,4,'mayoVat');
  put(furniture,5,0,1,'crate');   put(furniture,5,0,5,'mayoVat');
  put(itemArt,1,1,5,'mopBucket'); put(itemArt,2,1,4,'badge'); put(itemArt,3,1,1,'ratPoison');

  /* Development metadata powers exact regression tests and makes accidental
     future room edits visible immediately. */
  const localCoords={};
  for(const f of [1,2,3,4,5]){
    localCoords[f]={};
    landing[f].forEach((rowIndex,localRow)=>{
      for(let col=1;col<=IW;col++)localCoords[f][localRow+','+col]=[rowIndex,col];
    });
  }

  return {
    grid,ceilH:grid._ceilH,topDeckH:deckH(5),storyHeight:STORY,stepMax:STEP_MAX,
    title:'BIG SMILES MAYO CORP',start:at(1,2,2),probe:at(3,1,2),startHeading:0,
    cells,landing,furniture,itemArt,sourceLayouts,localCoords
  };
}
