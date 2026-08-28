#!/usr/bin/env node
/* Dependency-free runtime exercise of the exact source city-drive minimap. */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'minigame/clivesbuick.js'),'utf8');
const start=source.indexOf('function _mmWorldPoly');
const end=source.indexOf('/* ===== exhaust smoke',start);
if(start<0||end<=start)throw new Error('FAIL: minimap source block not found');
const code=source.slice(start,end);
let passed=0;
function ok(v,label){if(!v)throw new Error('FAIL: '+label);passed++;console.log('PASS '+String(passed).padStart(2,'0')+'  '+label);}
function fakeContext(){
  const ops=[];
  const c={ops};
  for(const name of ['save','restore','beginPath','clip','fill','stroke','closePath','translate'])c[name]=function(){ops.push([name,c.fillStyle,c.strokeStyle]);};
  for(const name of ['arc','fillRect','moveTo','lineTo','fillText'])c[name]=function(){ops.push([name,...arguments,c.fillStyle,c.strokeStyle]);};
  return c;
}
function make(mobile,heading,pos){
  const mm=fakeContext();
  const streetCenters=[-102,-68,-34,0,34,68,102];
  const ctx={
    Math,IS_MOBILE:mobile,_MM_BASE_WR:mobile?118:136,_mmWorldRadius:mobile?118:136,
    speed:mobile?8:18,heading,_mmS:mobile?92:150,_mmx:mm,PITCH:34,ROAD:12,
    streetCenters,CITY_MIN:-108,CITY_MAX:108,pos:pos||{x:0,z:0},GOAL:{x:68,z:68},
    buildings:[
      {x0:-58,x1:-42,z0:-58,z1:-38,kind:'church',rot:0,height:25,spire:true},
      {x0:16,x1:36,z0:-55,z1:-39,kind:'grocery',rot:1,height:8,spire:false},
      {x0:-22,x1:-6,z0:18,z1:34,kind:'tower',height:16,spire:false},
      {x0:36,x1:52,z0:28,z1:44,kind:'tower',height:58,spire:true}
    ],
    routeToGoal(){return [[this.pos?this.pos.x:0,this.pos?this.pos.z:0],[0,68],[68,68]];}
  };
  // Route helper must close over the VM global rather than `this`.
  ctx.routeToGoal=function(){return [[ctx.pos.x,ctx.pos.z],[ctx.pos.x,68],[68,68]];};
  vm.createContext(ctx);
  vm.runInContext(code+'\nglobalThis.__mm={drawMiniMap,_mmWorldPoly,_mmInsetPoly,_mmHeight01,_mmBuildingFill,_mmRoofFill};',ctx,{filename:'drive-minimap-source.js'});
  return {ctx,mm,api:ctx.__mm};
}

const base=make(false,0);
ok(base.api._mmWorldPoly({x0:-10,x1:10,z0:-12,z1:12,kind:'church',rot:0}).length===8,'church uses a distinct eight-point footprint');
ok(base.api._mmWorldPoly({x0:-10,x1:10,z0:-12,z1:12,kind:'grocery',rot:1}).length===8,'grocery uses a distinct eight-point footprint');
ok(base.api._mmWorldPoly({x0:-10,x1:10,z0:-12,z1:12,kind:'tower'}).length===4,'tower keeps a simple four-point footprint');
ok(base.api._mmHeight01({height:8})===0&&base.api._mmHeight01({height:64})===1,'height depth is clamped to the intended range');

for(const [label,mobile,angle,pos] of [
  ['desktop north-up',false,0,{x:0,z:0}],
  ['desktop quarter-turn',false,Math.PI/2,{x:0,z:0}],
  ['desktop near boundary',false,Math.PI*1.25,{x:88,z:82}],
  ['mobile heading-up',true,Math.PI/3,{x:-20,z:16}]
]){
  const run=make(mobile,angle,pos);
  run.api.drawMiniMap();
  const names=run.mm.ops.map(o=>o[0]);
  const fills=run.mm.ops.filter(o=>o[0]==='fill').map(o=>o[1]);
  ok(names.filter(n=>n==='lineTo').length>40,label+' draws roads, buildings, boundary, and route');
  ok(names.includes('fillText')&&run.mm.ops.some(o=>o[0]==='fillText'&&o[1]==='N'),label+' draws the north marker');
  ok(names.filter(n=>n==='arc').length>=4,label+' draws rim, goal, spire/player markers');
  ok(fills.some(s=>typeof s==='string'&&s.indexOf('rgba(0,0,0,')===0),label+' draws building depth shadows');
  ok(fills.some(s=>s==='rgba(255,88,62,0.68)'),label+' draws restrained spire markers');
}
console.log('\n'+passed+' minimap runtime checks passed.');
