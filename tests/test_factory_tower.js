const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('engine/raycaster.js','utf8');
const m=src.match(/function buildFactoryTower\(\)\{[\s\S]*?\n\}/);
if(!m)throw new Error('buildFactoryTower not found');
const ctx={};vm.createContext(ctx);vm.runInContext(m[0]+';this.buildFactoryTower=buildFactoryTower;',ctx);
const t=ctx.buildFactoryTower(),g=t.grid,h=g._floorH;
function ok(v,msg){if(!v)throw new Error(msg);console.log('PASS',msg);}
const expected={
  1:['....S','K.#.I','E....'],
  2:['....S','D.#I.','v....'],
  3:['....S','I.B..','v....'],
  4:['....S','.#K#.','v....'],
  5:['..D..','v....']
};
for(const f of [1,2,3,4,5]){
  const rows=t.landing[f].map(r=>g[r].slice(1,6).join(''));
  ok(JSON.stringify(rows)===JSON.stringify(expected[f]),`floor ${f} layout preserved`);
}
const start=t.start,goal=t.cells.roof,q=[start],seen=new Set([start.join(',')]);
while(q.length){const [r,c]=q.shift();for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const nr=r+dr,nc=c+dc,k=nr+','+nc;if(seen.has(k)||!g[nr]||g[nr][nc]==null||g[nr][nc]==='#')continue;const cur=h[r][c]??0,tgt=h[nr][nc];if(tgt==null||tgt-cur>0.34)continue;seen.add(k);q.push([nr,nc]);}}
ok(seen.has(goal.join(',')),'roof is reachable by walking from floor 1');
for(let f=1;f<5;f++){
  const lower=t.landing[f][0], upper=t.landing[f+1][t.landing[f+1].length-1];
  ok((h[upper][2]-h[lower][5])<=0.9+1e-9,`floor ${f} connects to floor ${f+1} through a stepped flight`);
}
console.log('Factory tower validation passed.');
