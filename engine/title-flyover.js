/* ============================================================
   CLIVEMAN - engine/title-flyover.js
   Title-screen attract mode: a Lakitu-style drone shot circling
   the night city (same visual language as the drive minigame).
   Renders full-viewport BEHIND the terminal (negative z-index)
   with a dark vignette layer so title text pops.

   Public API:
     TitleFlyover.available()  -> bool (real WebGL + THREE + motion OK)
     TitleFlyover.start()      -> bool (idempotent; false on failure)
     TitleFlyover.stop()       -> void (full dispose, idempotent)

   No dependencies beyond window.THREE (engine/three.global.js).
   Falls back gracefully: when unavailable, title.js keeps the
   classic pixel-art city canvas.
   ============================================================ */
(function(){
'use strict';

var GLYPHS='.:-=+*#%@';
var PITCH=34, ROAD=12;            // drive-mode city grid
var _run=false, _webglOK=null;
var _raf=0, _t0=0, _renderer=null, _scene=null, _cam=null;
var _canvas=null, _vig=null, _onResize=null, _beaconMat=null;

function _probeWebGL(){
  if(_webglOK!==null)return _webglOK;
  try{
    var c=document.createElement('canvas');
    var gl=c.getContext('webgl')||c.getContext('experimental-webgl');
    // Real GL returns a version string; jsdom/proxy stubs return undefined.
    _webglOK=!!(gl && typeof gl.getParameter==='function' && gl.getParameter(gl.VERSION));
  }catch(e){_webglOK=false;}
  return _webglOK;
}

function available(){
  if(!window.THREE)return false;
  try{
    if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
  }catch(e){}
  return _probeWebGL();
}

function _coarse(){
  try{return window.matchMedia && matchMedia('(pointer: coarse)').matches;}catch(e){return false;}
}

/* ---------- texture builders (drive-mode palette) ---------- */

function _facadeTexture(){
  var cv=document.createElement('canvas');cv.width=96;cv.height=192;
  var g=cv.getContext('2d');
  g.fillStyle='#070a10';g.fillRect(0,0,96,192);
  g.font='8px monospace';g.textBaseline='top';
  for(var row=0;row<24;row++){
    var rowLit=Math.random()<0.62;
    for(var col=0;col<12;col++){
      var ch=GLYPHS[(Math.random()*GLYPHS.length)|0];
      if(rowLit && Math.random()<0.7){
        var v=(140+Math.random()*100)|0;
        g.fillStyle=(Math.random()<0.22)
          ?'rgb('+v+','+((v*0.66)|0)+',70)'          // amber window
          :'rgb('+((v*0.7)|0)+','+v+','+((v*0.9)|0)+')'; // pale green-blue
      }else{
        g.fillStyle='#10161f';
      }
      g.fillText(ch,col*8,row*8);
    }
  }
  var tex=new THREE.CanvasTexture(cv);
  tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;
  return tex;
}

function _groundTexture(spanG,HE){
  var cv=document.createElement('canvas');cv.width=1024;cv.height=1024;
  var g=cv.getContext('2d');
  g.fillStyle='#070a0f';g.fillRect(0,0,1024,1024);
  var px=function(w){return (w+spanG/2)/spanG*1024;};
  var roadPx=Math.max(6,ROAD/spanG*1024);
  g.fillStyle='#15181d';
  for(var i=-HE;i<=HE+1;i++){
    var c=px((i-0.5)*PITCH);
    g.fillRect(c-roadPx/2,0,roadPx,1024);   // N-S streets
    g.fillRect(0,c-roadPx/2,1024,roadPx);   // E-W streets
  }
  // central avenue (block column gx=0 is left empty of buildings)
  var aveW=PITCH*0.82/spanG*1024, ac=px(0);
  g.fillStyle='#131720';g.fillRect(ac-aveW/2,0,aveW,1024);
  g.strokeStyle='#2e3440';g.lineWidth=Math.max(1,2/spanG*1024);
  g.setLineDash([10,14]);
  g.beginPath();g.moveTo(ac,0);g.lineTo(ac,1024);g.stroke();
  var tex=new THREE.CanvasTexture(cv);
  tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;
  return tex;
}

function _skylineTexture(){
  var cv=document.createElement('canvas');cv.width=2048;cv.height=256;
  var g=cv.getContext('2d'),x,w,h;
  // far band: barely above the sky colour
  for(x=0;x<2048;){
    w=24+Math.random()*56;h=40+Math.random()*80;
    g.fillStyle='#080c13';g.fillRect(x,256-h,w,h);
    x+=w-6;
  }
  // near band: silhouettes with sparse lit windows + spires + red beacons
  for(x=0;x<2048;){
    w=26+Math.random()*64;h=56+Math.random()*120;
    g.fillStyle='#0c111c';g.fillRect(x,256-h,w,h);
    if(h>130&&Math.random()<0.5){
      var sph=18+Math.random()*30;
      g.fillStyle='#0c111c';g.fillRect(x+w/2-1.5,256-h-sph,3,sph);
      if(Math.random()<0.6){g.fillStyle='rgba(255,84,64,0.9)';g.fillRect(x+w/2-1,256-h-sph-2,2,2);}
    }
    for(var wy=256-h+6;wy<248;wy+=9){
      for(var wx=x+4;wx<x+w-4;wx+=7){
        if(Math.random()<0.06){
          g.fillStyle=Math.random()<0.25?'rgba(200,150,70,0.55)':'rgba(120,190,160,0.5)';
          g.fillRect(wx,wy,2,3);
        }
      }
    }
    x+=w-4;
  }
  g.fillStyle='#0c111c';g.fillRect(0,238,2048,18); // solid base, no gap at the ground
  var tex=new THREE.CanvasTexture(cv);
  tex.wrapS=THREE.RepeatWrapping;tex.repeat.set(3,1);
  return tex;
}

/* ---------- landmark low-rises: churches & corner stores ----------
   Same silhouettes as the drive minigame: built facing local +Z, rotated in
   90-degree steps onto the lot. Shared geometry/materials are created once
   per build and disposed by stop()'s scene traverse. */
function _landmarkKit(){
  var boxG=new THREE.BoxGeometry(1,1,1);
  var roofG=new THREE.ConeGeometry(Math.SQRT1_2,1,4);
  roofG.rotateY(Math.PI/4);roofG.translate(0,0.5,0);
  var stone=new THREE.MeshStandardMaterial({color:0x151a26,roughness:0.95});
  var trim=new THREE.MeshStandardMaterial({color:0x05070c,roughness:1});
  var warm=new THREE.MeshBasicMaterial({color:0xb9873a});
  var pale=new THREE.MeshBasicMaterial({color:0x9fc4a8});
  var winG=new THREE.PlaneGeometry(1.1,3);
  var roseG=new THREE.CircleGeometry(1.2,12);
  var stripG=new THREE.PlaneGeometry(17,3.2);
  var signG=new THREE.PlaneGeometry(13,2.6);
  var NAMES=['GROCERY','MARKET','DELI','LIQUOR','24 HR MART','BODEGA','BIG SMILES','DINER'];
  var COLS=['#57e88a','#ffb84a','#ff6a5a','#7ad7ff'];
  function signTex(txt,col){
    var c=document.createElement('canvas');c.width=256;c.height=52;
    var g=c.getContext('2d');
    g.fillStyle='#0a0d13';g.fillRect(0,0,256,52);
    g.strokeStyle=col;g.globalAlpha=0.55;g.strokeRect(3,3,250,46);g.globalAlpha=1;
    g.font='bold 30px "Courier New", monospace';
    g.textAlign='center';g.textBaseline='middle';
    g.shadowColor=col;g.shadowBlur=12;g.fillStyle=col;
    g.fillText(txt,128,28);g.fillText(txt,128,28);
    return new THREE.CanvasTexture(c);
  }
  return {
    church:function(){
      var g=new THREE.Group();g.name='cv-church';
      var m=new THREE.Mesh(boxG,stone);m.scale.set(12,9,20);m.position.y=4.5;g.add(m);
      m=new THREE.Mesh(roofG,trim);m.scale.set(13,5,21);m.position.y=9;g.add(m);
      m=new THREE.Mesh(boxG,stone);m.scale.set(7,16,7);m.position.set(0,8,6.5);g.add(m);
      m=new THREE.Mesh(roofG,trim);m.scale.set(7.6,7,7.6);m.position.set(0,16,6.5);g.add(m);
      m=new THREE.Mesh(boxG,trim);m.scale.set(0.35,2.6,0.35);m.position.set(0,24.3,6.5);g.add(m);
      m=new THREE.Mesh(boxG,trim);m.scale.set(1.6,0.35,0.35);m.position.set(0,24.6,6.5);g.add(m);
      for(var zi=0;zi<3;zi++)for(var sx=-1;sx<=1;sx+=2){
        m=new THREE.Mesh(winG,warm);
        m.position.set(sx*6.02,4.8,-6+zi*5);m.rotation.y=sx*Math.PI/2;g.add(m);
      }
      m=new THREE.Mesh(roseG,warm);m.position.set(0,11.5,10.03);g.add(m);
      return g;
    },
    grocery:function(){
      var g=new THREE.Group();g.name='cv-grocery';
      var m=new THREE.Mesh(boxG,stone);m.scale.set(20,7,16);m.position.y=3.5;g.add(m);
      m=new THREE.Mesh(stripG,pale);m.position.set(0,2.3,8.03);g.add(m);
      m=new THREE.Mesh(signG,new THREE.MeshBasicMaterial({
        map:signTex(NAMES[(Math.random()*NAMES.length)|0],
                    COLS[(Math.random()*COLS.length)|0]),transparent:true}));
      m.position.set(0,5.8,8.06);g.add(m);
      m=new THREE.Mesh(boxG,trim);m.scale.set(3,1.4,2.2);
      m.position.set(-5+Math.random()*10,7.7,-3+Math.random()*5);g.add(m);
      return g;
    }
  };
}

/* ---------- scene build ---------- */

function _buildCity(scene,HE){
  var span=PITCH*(2*HE+1), spanG=span+PITCH+80;

  scene.background=new THREE.Color(0x05060a);
  scene.fog=new THREE.Fog(0x05060a,120,1050);
  scene.add(new THREE.AmbientLight(0x223043,0.9));
  var moon=new THREE.DirectionalLight(0x9fb4e6,0.6);
  moon.position.set(-50,90,-40);scene.add(moon);

  var ground=new THREE.Mesh(
    new THREE.PlaneGeometry(spanG,spanG),
    new THREE.MeshStandardMaterial({color:0xffffff,map:_groundTexture(spanG,HE),roughness:1})
  );
  ground.rotation.x=-Math.PI/2;scene.add(ground);

  // bucket buildings into 5 facade variants
  var VAR=5,lists=[],v;
  for(v=0;v<VAR;v++)lists.push([]);
  var beacons=[],spires=[];
  var kit=_landmarkKit();
  for(var gx=-HE;gx<=HE;gx++){
    if(gx===0)continue;                       // central avenue
    for(var gz=-HE;gz<=HE;gz++){
      if(Math.random()<0.07)continue;         // vacant lot
      if(Math.random()<0.04){                 // landmark lot: church or corner store
        var lm=Math.random()<0.35?kit.church():kit.grocery();
        lm.rotation.y=((Math.random()*4)|0)*Math.PI/2;
        lm.position.set(gx*PITCH,0,gz*PITCH);
        scene.add(lm);
        continue;
      }
      var w=16+Math.random()*5, d=16+Math.random()*5;
      var h=12+Math.pow(Math.random(),1.8)*52;
      var bx=gx*PITCH+(Math.random()*6-3), bz=gz*PITCH+(Math.random()*6-3);
      var tall=Math.random()<0.07;
      if(tall)h=Math.min(h*1.7,90);
      if(tall||(h>42&&Math.random()<0.3)){    // rooftop spire (mast)
        var sh=7+Math.random()*15;
        spires.push({x:bx,z:bz,y:h,h:sh});
        if(tall)beacons.push(bx,h+sh+1.5,bz); // beacon rides the spire tip
      }
      lists[(Math.random()*VAR)|0].push({x:bx,z:bz,w:w,h:h,d:d});
    }
  }

  var geo=new THREE.BoxGeometry(1,1,1);geo.translate(0,0.5,0);
  var roof=new THREE.MeshStandardMaterial({color:0x05070c,roughness:1});
  var m4=new THREE.Matrix4(),q=new THREE.Quaternion(),
      p=new THREE.Vector3(),s=new THREE.Vector3();
  for(v=0;v<VAR;v++){
    var L=lists[v];if(!L.length)continue;
    var tex=_facadeTexture();
    var face=new THREE.MeshStandardMaterial({
      color:0x0c1018,roughness:0.92,map:tex,
      emissive:0xffffff,emissiveMap:tex,emissiveIntensity:0.85});
    var im=new THREE.InstancedMesh(geo,[face,face,roof,roof,face,face],L.length);
    for(var i=0;i<L.length;i++){
      var b=L[i];
      p.set(b.x,0,b.z);s.set(b.w,b.h,b.d);
      m4.compose(p,q,s);im.setMatrixAt(i,m4);
    }
    im.instanceMatrix.needsUpdate=true;
    scene.add(im);
  }

  if(spires.length){
    var sg=new THREE.ConeGeometry(0.5,1,4);sg.translate(0,0.5,0);
    var sm=new THREE.MeshStandardMaterial({color:0x05070c,roughness:1});
    var sim=new THREE.InstancedMesh(sg,sm,spires.length);
    for(var si=0;si<spires.length;si++){
      var sp=spires[si];
      p.set(sp.x,sp.y,sp.z);s.set(2.6,sp.h,2.6);
      m4.compose(p,q,s);sim.setMatrixAt(si,m4);
    }
    sim.instanceMatrix.needsUpdate=true;
    scene.add(sim);
  }

  // Distant skyline ring: decorative backdrop beyond the orbit path so the
  // city reads as one district of a larger metropolis instead of floating in
  // a void. fog:false with dimness baked into the texture (linear fog would
  // wash it out at this range); the solid texture base meets the apron below.
  var skyR=900,skyH=190;
  var sky=new THREE.Mesh(
    new THREE.CylinderGeometry(skyR,skyR,skyH,64,1,true),
    new THREE.MeshBasicMaterial({map:_skylineTexture(),transparent:true,
      side:THREE.BackSide,fog:false,depthWrite:false}));
  sky.position.y=skyH/2-6;
  scene.add(sky);

  // ground apron under/past the textured ground out to the skyline base
  var apron=new THREE.Mesh(
    new THREE.PlaneGeometry(skyR*2.3,skyR*2.3),
    new THREE.MeshStandardMaterial({color:0x05070a,roughness:1}));
  apron.rotation.x=-Math.PI/2;apron.position.y=-0.06;
  scene.add(apron);

  if(beacons.length){
    var bg=new THREE.BufferGeometry();
    bg.setAttribute('position',new THREE.Float32BufferAttribute(beacons,3));
    _beaconMat=new THREE.PointsMaterial({color:0xff5544,size:2.5,transparent:true,depthWrite:false});
    scene.add(new THREE.Points(bg,_beaconMat));
  }
}

/* ---------- camera path: street dolly -> rising orbit ---------- */

function _smooth(a,b,x){x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);}
function _easeIO(x){x=Math.max(0,Math.min(1,x));return x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2;}

var _cp=null,_ct=null,_op=null,_ot=null; // scratch vectors
function _drive(t,cam){
  if(!_cp){_cp=new THREE.Vector3();_ct=new THREE.Vector3();
           _op=new THREE.Vector3();_ot=new THREE.Vector3();}
  // Shot A: low dolly up the central avenue (Lakitu at street level)
  var dz=620-530*_easeIO(t/9);
  _cp.set(4,3.4+0.4*Math.sin(t*1.7),dz);
  _ct.set(2,30+10*Math.min(1,t/9),dz-180);
  // Shot B: perpetual orbit, radius & height counter-phased
  var u=Math.max(0,t-6);
  var a=Math.PI/2+u*0.045;
  var R=430+165*Math.sin(u*0.011+0.35);
  var H=88+58*Math.sin(u*0.011+0.35+Math.PI)+8*Math.sin(u*0.037);
  _op.set(R*Math.cos(a),H,R*Math.sin(a));
  _ot.set(30*Math.sin(u*0.007),24+14*Math.sin(u*0.009),30*Math.cos(u*0.0063));
  // crane blend from dolly into orbit over t = 6s..11s
  var mix=_smooth(6,11,t);
  _cp.lerp(_op,mix);_ct.lerp(_ot,mix);
  cam.position.copy(_cp);cam.lookAt(_ct);
}

/* ---------- lifecycle ---------- */

function start(){
  if(_run)return true;
  if(!available())return false;
  try{
    var coarse=_coarse(), HE=coarse?8:11;

    _canvas=document.createElement('canvas');
    _canvas.id='titleFlyover';
    _canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:-2;display:block;background:#05060a;';
    _vig=document.createElement('div');
    _vig.id='titleFlyoverVignette';
    _vig.style.cssText='position:fixed;inset:0;z-index:-1;pointer-events:none;'+
      'background:radial-gradient(ellipse at 50% 44%,rgba(2,8,4,0.50) 0%,rgba(2,8,4,0.66) 52%,rgba(2,8,4,0.90) 100%);';
    document.body.insertBefore(_vig,document.body.firstChild);
    document.body.insertBefore(_canvas,_vig);

    _renderer=new THREE.WebGLRenderer({canvas:_canvas,antialias:false,powerPreference:'low-power'});
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,coarse?1.25:1.5));
    _renderer.setSize(window.innerWidth,window.innerHeight,false);

    _scene=new THREE.Scene();
    _cam=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.5,2000);
    _buildCity(_scene,HE);

    _onResize=function(){
      if(!_run)return;
      _cam.aspect=window.innerWidth/window.innerHeight;
      _cam.updateProjectionMatrix();
      _renderer.setSize(window.innerWidth,window.innerHeight,false);
    };
    window.addEventListener('resize',_onResize);

    _run=true;_t0=0;
    var tick=function(now){
      if(!_run)return;
      _raf=requestAnimationFrame(tick);
      if(!_t0)_t0=now;
      var t=(now-_t0)/1000;
      _drive(t,_cam);
      if(_beaconMat)_beaconMat.opacity=0.35+0.65*Math.max(0,Math.sin(t*2.2));
      _renderer.render(_scene,_cam);
    };
    _raf=requestAnimationFrame(tick);
    return true;
  }catch(e){
    _webglOK=false; // don't retry a broken pipeline
    stop();
    return false;
  }
}

function stop(){
  _run=false;
  if(_raf){cancelAnimationFrame(_raf);_raf=0;}
  if(_onResize){window.removeEventListener('resize',_onResize);_onResize=null;}
  if(_scene){
    _scene.traverse(function(o){
      if(o.geometry)o.geometry.dispose();
      var m=o.material;
      if(m){(Array.isArray(m)?m:[m]).forEach(function(mm){
        if(mm.map)mm.map.dispose();
        if(mm.emissiveMap)mm.emissiveMap.dispose();
        mm.dispose();
      });}
    });
    _scene=null;
  }
  if(_renderer){
    try{_renderer.dispose();if(_renderer.forceContextLoss)_renderer.forceContextLoss();}catch(e){}
    _renderer=null;
  }
  _cam=null;_beaconMat=null;
  if(_canvas&&_canvas.parentNode)_canvas.parentNode.removeChild(_canvas);
  if(_vig&&_vig.parentNode)_vig.parentNode.removeChild(_vig);
  _canvas=null;_vig=null;
}

window.TitleFlyover={available:available,start:start,stop:stop};
})();
