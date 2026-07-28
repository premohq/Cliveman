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
