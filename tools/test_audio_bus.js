const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const srcs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1])
  .filter(s=>!/three\.global|clivesbuick\.bundle/.test(s));
const dom=new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g,''),
  {runScripts:'dangerously',pretendToBeVisual:true,url:'https://x/'});
const w=dom.window;
w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
w.HTMLCanvasElement.prototype.getContext=function(kind){
  if(kind!=='2d')return null;
  const self=this;
  return {imageSmoothingEnabled:false,fillStyle:'',globalAlpha:1,shadowBlur:0,shadowColor:'',
    createImageData:(w2,h2)=>({width:w2,height:h2,data:new Uint8ClampedArray(w2*h2*4)}),
    putImageData(){},drawImage(){},fillRect(){},clearRect(){},beginPath(){},arc(){},fill(){},
    createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),
    save(){},restore(){},translate(){},scale(){},getImageData:(x,y,w2,h2)=>({width:w2,height:h2,data:new Uint8ClampedArray(w2*h2*4)})};
};
w.requestAnimationFrame=cb=>setTimeout(()=>cb(Date.now()),0);
w.cancelAnimationFrame=id=>clearTimeout(id);

/* ---- mock WebAudio: records every connect() edge ---- */
const EDGES=[];
let NID=0;
let CTX=null;
function param(){const o={_param:true,value:1,cancelScheduledValues(){},setValueAtTime(){},
  linearRampToValueAtTime(v){o.value=v;},exponentialRampToValueAtTime(v){o.value=v;},
  setTargetAtTime(){},cancelAndHoldAtTime(){},setValueCurveAtTime(){}};return o;}
function node(kind){
  const n={_kind:kind,_id:++NID,get context(){return CTX;},
    gain:param(),frequency:param(),detune:param(),Q:param(),
    delayTime:param(),pan:param(),offset:param(),playbackRate:param(),
    type:'sine',buffer:null,loop:false,
    connect(d){EDGES.push([n,d]);return d;},disconnect(){},start(){},stop(){}};
  return n;
}
function Ctx(){
  this.currentTime=0;this.sampleRate=44100;this.state='running';
  CTX=this;
  this.destination=node('destination');
  this.resume=()=>{};
}
['Gain','Oscillator','BiquadFilter','Delay','BufferSource','WaveShaper','StereoPanner','DynamicsCompressor','ConstantSource','Convolver','Analyser','Panner'].forEach(k=>{
  Ctx.prototype['create'+k]=function(){return node(k);};
});
Ctx.prototype.createBuffer=function(ch,len){return{getChannelData:()=>new Float32Array(len),length:len};};
Ctx.prototype.createPeriodicWave=function(){return{};};
w.AudioContext=Ctx; w.webkitAudioContext=Ctx;

const code=srcs.map(s=>'/*=== '+s+' ===*/\n'+fs.readFileSync(path.join(ROOT,s),'utf8')).join('\n;\n');
w.eval(code);

let fail=0;
const T=(name,cond,extra)=>{console.log((cond?'  PASS  ':'  FAIL  ')+name+(extra&&!cond?'  -> '+extra:''));if(!cond)fail++;};

w.eval('ensureAudio();');
const bus=w.audioBus();
T('audioBus() returns a GainNode', bus && bus._kind==='Gain');
T('bus is the only node wired to destination',
  EDGES.filter(e=>e[1]._kind==='destination').every(e=>e[0]===bus),
  EDGES.filter(e=>e[1]._kind==='destination').map(e=>e[0]._kind).join(','));

/* every emitter must terminate at the bus */
/* An oscillator that modulates an AudioParam (lfo.connect(osc.frequency)) is a
   legitimate terminal that never reaches the speakers - don't flag it. */
function reachesBus(start){
  const seen=new Set(); const stack=[start];
  while(stack.length){const n=stack.pop(); if(n===bus||n._param)return true;
    if(seen.has(n._id))continue; seen.add(n._id);
    EDGES.filter(e=>e[0]===n).forEach(e=>stack.push(e[1]));}
  return false;
}
function emitterTest(label,js){
  const before=EDGES.length;
  try{ w.eval(js); }catch(e){ T(label,false,'threw '+e.message); return; }
  const fresh=EDGES.slice(before).map(e=>e[0]);
  T(label, fresh.length>0 && fresh.every(reachesBus),
    fresh.length===0?'emitted nothing':'stray path to destination');
}
emitterTest('beep() -> bus',                 'beep(440,0.02,0.05,"square");');
emitterTest('CMSTING.play() -> bus',         'CMSTING.play("hit");');
emitterTest('ClassicalMusic.start() -> bus', 'ClassicalMusic.start();');
emitterTest('startStatic() hiss -> bus',     'startStatic();');

/* mute reaches the bus, not just individual callers */
w.eval('setMuted(true);');
T('setMuted(true) ducks the bus gain', bus.gain.value<0.01, 'gain='+bus.gain.value);
w.eval('setMuted(false);');
T('setMuted(false) restores bus gain', bus.gain.value>0.9, 'gain='+bus.gain.value);
w.eval('CMAUDIO.setVolume(0.4);');
T('CMAUDIO.setVolume(0.4) applies', Math.abs(bus.gain.value-0.4)<0.001, 'gain='+bus.gain.value);

/* teardown */
w.eval('CMAUDIO.setVolume(1);startStatic();');
const noiseLive=!!w._staticNoise;
w.eval('stopStatic();');
T('startStatic is idempotent + stopStatic clears the source', noiseLive && !w._staticNoise);

console.log(fail?'\n'+fail+' FAILED':'\nALL AUDIO BUS TESTS PASS');
process.exit(fail?1:0);
