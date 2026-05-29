/* ========================================================================
   CLIVEMAN 3.1  -  js/08-raycaster.js
   First-person dungeon raycaster: themes, procedural wall/floor/ceiling textures, rcRender, drawFP, animations.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */


const CELL_RENDER={'.':'   ',' ':'   ','#':'###','U':' U ','I':'[I]','S':' ^ ','v':' v ','D':'[D]','K':' K ','B':' B ','E':' E ','X':' . ','L':'[L]','1':'[1]','2':'[2]','3':'[3]','4':'[4]','5':'[5]','6':'[6]',};const SOLID={'#':true};function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
const FP_GLYPH={'.':null,'X':null,'#':null,
'U':{ch:'?',label:'item',color:'#66ff66',sprH:0.4},
'I':{ch:'!',label:'ITEM',color:'#ffff33',sprH:0.5},
'S':{ch:'\u25B2',label:'STAIRS UP',color:'#66ccff',sprH:0.7},
'v':{ch:'\u25BC',label:'STAIRS DN',color:'#66ccff',sprH:0.7},
'D':{ch:'\u2588',label:'DOOR',color:'#cc8844',sprH:0.95},
'K':{ch:'\u263A',label:'WITNESS',color:'#ff6666',sprH:0.8},
'B':{ch:'\u263A',label:'PERSON',color:'#aaaaff',sprH:0.8},
'E':{ch:'\u25A0',label:'ENTRANCE',color:'#33ff66',sprH:0.6},
'L':{ch:'\u2192',label:'EXIT',color:'#ff3333',sprH:0.6},
'M':{ch:'\u2692',label:'MECHANIC',color:'#ffaa33',sprH:0.8},
'G':{ch:'\u2615',label:'TAVERN',color:'#ff66ff',sprH:0.8},
'H':{ch:'\u265E',label:'TRACK',color:'#ffcc66',sprH:0.8},
'A':{ch:'\u2605',label:'ARCADE',color:'#66ffcc',sprH:0.8},
'1':{ch:'1',label:'201',color:'#888',sprH:0.5},'2':{ch:'2',label:'202',color:'#888',sprH:0.5},
'3':{ch:'3',label:'203',color:'#888',sprH:0.5},'4':{ch:'4',label:'204',color:'#888',sprH:0.5},
'5':{ch:'5',label:'205',color:'#888',sprH:0.5},'6':{ch:'6',label:'206',color:'#888',sprH:0.5}};
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
const _texCache={};
function _shadeHex(hex,mult){
const rr=Math.max(0,Math.min(255,Math.floor(parseInt(hex.slice(1,3),16)*mult)));
const gg=Math.max(0,Math.min(255,Math.floor(parseInt(hex.slice(3,5),16)*mult)));
const bb=Math.max(0,Math.min(255,Math.floor(parseInt(hex.slice(5,7),16)*mult)));
return 'rgb('+rr+','+gg+','+bb+')';}
function _addTexNoise(ctx,amount){
const img=ctx.getImageData(0,0,TEX_SIZE,TEX_SIZE);const d=img.data;
for(let i=0;i<d.length;i+=4){const n=(Math.random()-0.5)*amount;
d[i]=Math.max(0,Math.min(255,d[i]+n));d[i+1]=Math.max(0,Math.min(255,d[i+1]+n));d[i+2]=Math.max(0,Math.min(255,d[i+2]+n));}
ctx.putImageData(img,0,0);}
function getWallTex(type,baseColor){
const key=type+'_'+baseColor;
if(_texCache[key])return _texCache[key];
const c=document.createElement('canvas');c.width=TEX_SIZE;c.height=TEX_SIZE;
const ctx=c.getContext('2d');
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
_texCache[key]=c;return c;}
function _hexRGB(hex){return[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];}

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

function rcRender(canvas,grid,px,py,angle,theme){
const ctx=canvas.getContext('2d',{alpha:false});const W=canvas.width,H=canvas.height;
const rows=grid.length;let cols=0;for(let i=0;i<rows;i++){if(grid[i].length>cols)cols=grid[i].length;}
const FOV=Math.PI*0.55;const HALF_FOV=FOV/2;
const NUM_RAYS=IS_MOBILE?(W>>1):W;const RAY_WIDTH=IS_MOBILE?2:1;
/* Reuse ImageData buffer — avoid per-frame GC pressure */
if(!window._rcFrameBuf||window._rcFrameBuf.width!==W||window._rcFrameBuf.height!==H){
  window._rcFrameBuf=ctx.createImageData(W,H);
}
const f1=_hexRGB(theme.floor1),f2=_hexRGB(theme.floor2),fogC=_hexRGB(theme.fog);
const cosLeft=Math.cos(angle-HALF_FOV),sinLeft=Math.sin(angle-HALF_FOV);
const cosRight=Math.cos(angle+HALF_FOV),sinRight=Math.sin(angle+HALF_FOV);
const halfH=H/2;
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
const stepXMul=rowStep*1;/* world step scale stays same, pixel loop skips */
for(let y=0;y<H;y+=rowStep){
  const isFloor=y>=halfH;
  const rowDist=isFloor?halfH/(y-halfH+0.001):halfH/(halfH-y+0.001);
  const worldX0=px+rowDist*cosLeft;
  const worldY0=py+rowDist*sinLeft;
  const stepX=rowDist*(cosRight-cosLeft)/W*pxStep;
  const stepY=rowDist*(sinRight-sinLeft)/W*pxStep;
  const fogFactor=rowDist<8?rowDist/8:1;
  const inv=1-fogFactor;
  const texData=isFloor?ftd:ctd;
  let wx=worldX0,wy=worldY0;
  const rowStart=y*W*4;
  const rowStart2=(y+1<H)?(y+1)*W*4:-1;
  const TEX_MASK=TEX_SIZE-1;/* TEX_SIZE is 64, power of 2, so bitmask works */
  for(let x=0;x<W;x+=pxStep){
    /* Bitwise wrap - much faster than Math.floor */
    let tx=((wx*TEX_SIZE)|0)&TEX_MASK;
    let ty=((wy*TEX_SIZE)|0)&TEX_MASK;
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
    /* Replicate vertically over rowStep rows */
    if(rowStep>1){
      for(let dy=1;dy<rowStep&&y+dy<H;dy++){
        const rs=(y+dy)*W*4;
        for(let dx=0;dx<pxStep&&x+dx<W;dx++){
          const p2=rs+(x+dx)*4;
          fd[p2]=outR;fd[p2+1]=outG;fd[p2+2]=outB;fd[p2+3]=255;
        }
      }
    }
    wx+=stepX;wy+=stepY;
  }
}
ctx.putImageData(frameImg,0,0);
const zBuffer=new Float32Array(W);
const wallDirs=['wallN','wallS','wallE','wallW'];
const fogR=fogC[0],fogG=fogC[1],fogB=fogC[2];
/* DDA raycaster: exact grid-boundary traversal. Much faster and more accurate
   than step-marching, especially at glancing/peripheral angles. */
for(let x=0;x<NUM_RAYS;x++){
const rayAngle=angle-HALF_FOV+(x/NUM_RAYS)*FOV;
const cos=Math.cos(rayAngle),sin=Math.sin(rayAngle);
const deltaDistX=Math.abs(cos)<1e-9?1e30:Math.abs(1/cos);
const deltaDistY=Math.abs(sin)<1e-9?1e30:Math.abs(1/sin);
let mapX=Math.floor(px),mapY=Math.floor(py);
let stepX,stepY,sideDistX,sideDistY;
if(cos<0){stepX=-1;sideDistX=(px-mapX)*deltaDistX;}
else{stepX=1;sideDistX=(mapX+1-px)*deltaDistX;}
if(sin<0){stepY=-1;sideDistY=(py-mapY)*deltaDistY;}
else{stepY=1;sideDistY=(mapY+1-py)*deltaDistY;}
let hit=false,sideAxis=0;/* 0 = last step was X (E/W face), 1 = Y (N/S face) */
const maxDist=12;
let steps=0;const maxSteps=cols+rows+4;
while(!hit&&steps<maxSteps){
if(sideDistX<sideDistY){sideDistX+=deltaDistX;mapX+=stepX;sideAxis=0;}
else{sideDistY+=deltaDistY;mapY+=stepY;sideAxis=1;}
if(mapY<0||mapY>=rows||mapX<0||mapX>=cols){hit=true;break;}
if(grid[mapY][mapX]==='#')hit=true;
steps++;}
let dist,hitSide;
if(sideAxis===0){
/* stepped in X -> E/W face */
dist=sideDistX-deltaDistX;
hitSide=stepX>0?3:2;/* ray moved east, hit west face of the new cell -> "wallW" side 3 (and vice versa) */
}else{
dist=sideDistY-deltaDistY;
hitSide=stepY>0?0:1;}
if(dist<=0)dist=0.0001;
if(dist>maxDist){zBuffer[x]=maxDist;continue;}
const perpDist=dist*Math.cos(rayAngle-angle);
zBuffer[x]=perpDist;
if(perpDist>maxDist)continue;
const wallHeight=Math.min(H*2,H/perpDist);
const wallTop=(H-wallHeight)/2;
const wallColor=theme[wallDirs[hitSide]];
const tex=getWallTex(theme.wallTex,wallColor);
/* Exact texture X coordinate via DDA formula */
let wallHitPos;
if(sideAxis===0){wallHitPos=py+dist*sin;}
else{wallHitPos=px+dist*cos;}
wallHitPos-=Math.floor(wallHitPos);
let texX=Math.floor(wallHitPos*TEX_SIZE);
/* Flip texture on certain faces so the texture "reads" consistently around the cell */
if(sideAxis===0&&stepX>0)texX=TEX_SIZE-texX-1;
if(sideAxis===1&&stepY<0)texX=TEX_SIZE-texX-1;
if(texX<0)texX=0;else if(texX>=TEX_SIZE)texX=TEX_SIZE-1;
ctx.drawImage(tex,texX,0,1,TEX_SIZE,x,wallTop,1,wallHeight);
const fogAlpha=perpDist<10?perpDist/10:0.85;
ctx.fillStyle='rgba('+fogR+','+fogG+','+fogB+','+(fogAlpha>0.85?0.85:fogAlpha)+')';
ctx.fillRect(x,wallTop,1,wallHeight);
}
const sprites=[];
for(let r=0;r<rows;r++){for(let c=0;c<grid[r].length;c++){
const sym=grid[r][c];const g=FP_GLYPH[sym];
if(g){sprites.push({x:c+0.5,y:r+0.5,glyph:g,sym:sym});}}}
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
const screenX=Math.floor(W/2+normAngle/HALF_FOV*W/2);
const sprHeight=Math.min(H*1.5,(H/dist)*sp.glyph.sprH);
const sprWidth=sprHeight*0.7;
const sprTop=(H-sprHeight)/2+(1-sp.glyph.sprH)*sprHeight*0.3;
const sx=Math.floor(screenX-sprWidth/2);
const ex=Math.floor(screenX+sprWidth/2);
let visible=false;
for(let xx=Math.max(0,sx);xx<Math.min(W,ex);xx++){
if(dist<zBuffer[xx]){visible=true;break;}}
if(!visible)continue;
const fontSize=Math.max(8,Math.floor(sprHeight*0.8));
ctx.font='bold '+fontSize+'px "Share Tech Mono", monospace';
ctx.textAlign='center';ctx.textBaseline='middle';
ctx.shadowColor=sp.glyph.color;ctx.shadowBlur=Math.max(4,14-dist*2);
ctx.fillStyle=sp.glyph.color;
const spFog=Math.min(0.7,dist/8);
ctx.globalAlpha=1-spFog;
ctx.fillText(sp.glyph.ch,screenX,sprTop+sprHeight/2);
ctx.shadowBlur=0;
if(dist<3&&sp.glyph.label){
const labelSize=Math.max(8,Math.floor(12-dist*2+8));
ctx.font=labelSize+'px "VT323", monospace';
ctx.fillStyle='#ffb000';
ctx.shadowColor='#ffb000';ctx.shadowBlur=3;
ctx.fillText('['+(window.t?window.t(sp.glyph.label):sp.glyph.label)+']',screenX,sprTop+sprHeight/2+fontSize*0.6);
ctx.shadowBlur=0;}
ctx.globalAlpha=1;
}
/* === MINIMAP (minimalist tactical overview) === */
const mmSize=IS_MOBILE?72:104;const mmPad=8;
const mmX=W-mmSize-mmPad,mmY=H-mmSize-mmPad;
/* Frame: dark panel with amber tactical-display feel */
ctx.fillStyle='rgba(2,10,6,0.88)';ctx.fillRect(mmX-3,mmY-3,mmSize+6,mmSize+6);
ctx.strokeStyle='rgba(255,176,0,0.55)';ctx.lineWidth=1;
ctx.strokeRect(mmX-3+0.5,mmY-3+0.5,mmSize+5,mmSize+5);
/* corner ticks for retro CRT HUD feel */
ctx.strokeStyle='rgba(255,176,0,0.9)';ctx.lineWidth=1.5;
const tk=4;
ctx.beginPath();
ctx.moveTo(mmX-3,mmY-3+tk);ctx.lineTo(mmX-3,mmY-3);ctx.lineTo(mmX-3+tk,mmY-3);
ctx.moveTo(mmX+mmSize+3-tk,mmY-3);ctx.lineTo(mmX+mmSize+3,mmY-3);ctx.lineTo(mmX+mmSize+3,mmY-3+tk);
ctx.moveTo(mmX-3,mmY+mmSize+3-tk);ctx.lineTo(mmX-3,mmY+mmSize+3);ctx.lineTo(mmX-3+tk,mmY+mmSize+3);
ctx.moveTo(mmX+mmSize+3-tk,mmY+mmSize+3);ctx.lineTo(mmX+mmSize+3,mmY+mmSize+3);ctx.lineTo(mmX+mmSize+3,mmY+mmSize+3-tk);
ctx.stroke();
/* "MAP" label in the frame corner */
ctx.font='9px "VT323", monospace';ctx.fillStyle='rgba(255,176,0,0.75)';
ctx.textAlign='left';ctx.textBaseline='top';
ctx.fillText((window.t?window.t('MAP'):'MAP'),mmX-1,mmY-13);
/* Compute cell size & origin so grid is centered in the frame */
const cellS=Math.min(mmSize/cols,mmSize/rows);
const mmOx=mmX+(mmSize-cellS*cols)/2;
const mmOy=mmY+(mmSize-cellS*rows)/2;
/* Layer 1: faint floor grid dots (only on non-wall cells) */
ctx.fillStyle='rgba(51,255,102,0.12)';
for(let r=0;r<rows;r++){for(let c=0;c<grid[r].length;c++){
if(grid[r][c]!=='#'){
const cx=mmOx+(c+0.5)*cellS,cy=mmOy+(r+0.5)*cellS;
ctx.fillRect(Math.floor(cx),Math.floor(cy),1,1);}}}
/* Layer 2: walls as clean outlines. Only draw edges between wall and non-wall
   so the minimap looks like an architectural floorplan, not a filled grid. */
ctx.strokeStyle='rgba(125,255,154,0.9)';
ctx.lineWidth=1;
ctx.beginPath();
function isWall(r,c){
if(r<0||r>=rows||c<0)return true;
if(c>=grid[r].length)return true;
return grid[r][c]==='#';}
for(let r=0;r<rows;r++){for(let c=0;c<grid[r].length;c++){
if(grid[r][c]!=='#')continue;
const x0=mmOx+c*cellS,y0=mmOy+r*cellS;
const x1=x0+cellS,y1=y0+cellS;
/* Draw edge only if neighbor on that side is NOT a wall (exterior edge) */
if(!isWall(r-1,c)){ctx.moveTo(x0,y0+0.5);ctx.lineTo(x1,y0+0.5);}
if(!isWall(r+1,c)){ctx.moveTo(x0,y1-0.5);ctx.lineTo(x1,y1-0.5);}
if(!isWall(r,c-1)){ctx.moveTo(x0+0.5,y0);ctx.lineTo(x0+0.5,y1);}
if(!isWall(r,c+1)){ctx.moveTo(x1-0.5,y0);ctx.lineTo(x1-0.5,y1);}}}
ctx.stroke();
/* Layer 3: special cell glyphs (doors, stairs, NPCs, items, exits) drawn
   as actual unicode symbols in the FP_GLYPH palette color. */
const glyphFontSize=Math.max(7,Math.floor(cellS*0.85));
ctx.font='bold '+glyphFontSize+'px "Share Tech Mono", monospace';
ctx.textAlign='center';ctx.textBaseline='middle';
for(let r=0;r<rows;r++){for(let c=0;c<grid[r].length;c++){
const sym=grid[r][c];const g=FP_GLYPH[sym];
if(!g)continue;
const cx=mmOx+(c+0.5)*cellS,cy=mmOy+(r+0.5)*cellS;
ctx.fillStyle=g.color;
ctx.shadowColor=g.color;ctx.shadowBlur=3;
ctx.fillText(g.ch,cx,cy);}}
ctx.shadowBlur=0;
/* Layer 4: subtle FOV viewing cone so the player sees where they're looking */
const playerMmX=mmOx+px*cellS,playerMmY=mmOy+py*cellS;
const coneLen=cellS*3.5;
const coneL=angle-HALF_FOV,coneR=angle+HALF_FOV;
const coneGrad=ctx.createRadialGradient(playerMmX,playerMmY,0,playerMmX,playerMmY,coneLen);
coneGrad.addColorStop(0,'rgba(255,176,0,0.28)');
coneGrad.addColorStop(1,'rgba(255,176,0,0)');
ctx.fillStyle=coneGrad;
ctx.beginPath();
ctx.moveTo(playerMmX,playerMmY);
ctx.lineTo(playerMmX+Math.cos(coneL)*coneLen,playerMmY+Math.sin(coneL)*coneLen);
ctx.arc(playerMmX,playerMmY,coneLen,coneL,coneR);
ctx.closePath();
ctx.fill();
/* Layer 5: player = directional triangle (the tip IS the facing indicator -
   no separate floating line). */
const triSize=Math.max(3,cellS*0.55);
ctx.save();
ctx.translate(playerMmX,playerMmY);
ctx.rotate(angle);
ctx.fillStyle='#ffb000';ctx.shadowColor='#ffb000';ctx.shadowBlur=6;
ctx.beginPath();
ctx.moveTo(triSize,0);
ctx.lineTo(-triSize*0.7,triSize*0.7);
ctx.lineTo(-triSize*0.3,0);
ctx.lineTo(-triSize*0.7,-triSize*0.7);
ctx.closePath();
ctx.fill();
ctx.shadowBlur=0;
ctx.restore();
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
}
let _rcCanvas=null;let _rcTheme=null;let _rcAnim=null;
function rcStop(){if(_rcAnim){cancelAnimationFrame(_rcAnim);_rcAnim=null;}}
function drawFP(grid,pos,heading,title,opts){window._currentFpTitle=title;
const theme=pickTheme(title);
const wrap=document.createElement('div');wrap.className='fp-wrap';
const titleEl=document.createElement('div');titleEl.className='fp-title';titleEl.textContent=(window.t?window.t(title||''):(title||''));wrap.appendChild(titleEl);
const canvas=document.createElement('canvas');canvas.className='fp-canvas';
const cw=IS_MOBILE?320:460;const ch=IS_MOBILE?192:300;
canvas.width=cw;canvas.height=ch;wrap.appendChild(canvas);
const statusEl=document.createElement('div');statusEl.className='fp-status';statusEl.id='fpStatusBar';
wrap.appendChild(statusEl);
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
el.textContent=(hereLabel?T('HERE: ')+hereLabel+' \u00B7 ':'')+T(' FACING: ')+T(dirs[heading]);}
async function rcAnimateStep(canvas,grid,fromX,fromY,toX,toY,angle,theme){
if(IS_MOBILE){rcRender(canvas,grid,toX,toY,angle,theme);return Promise.resolve();}
return new Promise(function(resolve){
const dur=160;const start=performance.now();
function tick(now){const t=Math.min(1,(now-start)/dur);
const eased=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const cx=fromX+(toX-fromX)*eased;const cy=fromY+(toY-fromY)*eased;
rcRender(canvas,grid,cx,cy,angle,theme);
if(t<1)_rcAnim=requestAnimationFrame(tick);else{_rcAnim=null;resolve();}}
_rcAnim=requestAnimationFrame(tick);});}
async function rcAnimateTurn(canvas,grid,px,py,fromAngle,toAngle,theme){
if(IS_MOBILE){rcRender(canvas,grid,px,py,toAngle,theme);return Promise.resolve();}
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
function fpStop(){rcStop();}
