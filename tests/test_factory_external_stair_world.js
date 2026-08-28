'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('story/ch1.js','utf8');
const ctx={console,window:{},state:{},screenEl:{lastElementChild:null}};
Object.assign(ctx,{typeLine:async()=>{},navigateRoom:async()=>{},exitNavMode:()=>{},section:()=>{},addItem:()=>{},blank:()=>{},sleep:async()=>{},askChoice:async()=>({keys:['truth']}),playMusic:()=>{},cutscene:async()=>{},yn:async()=>true,driveClivesBuick:async()=>{},pressEnterToContinue:async()=>{},instantArt:()=>{}});
vm.createContext(ctx);vm.runInContext(src,ctx);
const W=ctx.buildFactoryStackedWorld();
assert(W&&W.grid&&W.grid._worldMap,'factory must expose one persistent world map');
assert.strictEqual(Object.keys(W.exits).length,1,'only roof access may exit the continuous factory');
assert.strictEqual(Object.values(W.exits)[0],'roof_access');
const G=W.grid,M=G._worldMap;
// Every floor room shares the exact X/Z footprint and differs only in Y.
for(let f=1;f<=5;f++){
  const b=(f-1)*16;
  for(let r=0;r<5;r++)for(let c=0;c<7;c++){
    const p=M[r][b+c];assert(p,`missing mapped room cell f${f} ${r},${c}`);
    assert.strictEqual(p.x,c+0.5);assert.strictEqual(p.z,r+0.5);assert.strictEqual(p.y,(f-1)*3.0);
  }
}
// The logical route is continuous and every adjacent stair point is a small physical move.
for(let f=1;f<5;f++){
  const b=(f-1)*16;
  const nb=f*16,nodes=[];for(let c=b+7;c<=nb+7;c++)nodes.push([7,c]);
  for(let i=0;i<nodes.length-1;i++){const a=M[nodes[i][0]][nodes[i][1]],z=M[nodes[i+1][0]][nodes[i+1][1]];assert(a&&z,`missing stair point ${f}:${i}`);const d=Math.hypot(z.x-a.x,z.y-a.y,z.z-a.z);assert(d>0&&d<1.55,`stair discontinuity ${f}:${i} d=${d}`);assert(Math.abs(z.y-a.y)<=0.25,`unsafe stair rise ${f}:${i}`);}
  const top=M[7][nb+7];assert.strictEqual(top.y,f*3.0,'flight must arrive at next floor height');
}
// No legacy stair sectors or floor transition exits are used by ch1_factory.
const factoryBody=src.slice(src.indexOf('async function ch1_factory'),src.indexOf('async function ch1_rooftop'));
assert(!/ROOM_FS|factoryStair|stairs_up|stairs_down|navigateRoom\s*\([^,]*ROOM_F[2-5]/.test(factoryBody),'factory must not load/swap floors or stair sectors');
const nav=fs.readFileSync('engine/nav3d.js','utf8');
assert(nav.includes('if(grid._worldMap)'), 'NAV3D must branch to world-coordinate rendering');
assert(nav.includes('_wmPoint(grid,px,py)'), 'camera must use mapped world coordinates');
console.log('PASS external stair world: stacked rooms, continuous stair, no teleport hooks');
