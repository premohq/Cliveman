const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('story/ch1.js','utf8');
const a=src.indexOf('function buildFactoryStackedWorld()');
const b=src.indexOf('\nasync function ch1_factory',a);
const ctx={console};vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
const W=ctx.buildFactoryStackedWorld(),g=W.grid,M=g._worldMap;
function wall(r,c){return !g[r]||g[r][c]==null||g[r][c]==='#';}
let maxDist=0,maxRise=0;
for(let r=0;r<g.length;r++)for(let c=0;c<g[r].length;c++){
  if(wall(r,c)||!M[r][c])continue;
  for(const [dr,dc] of [[1,0],[0,1]]){
    const nr=r+dr,nc=c+dc;if(wall(nr,nc)||!M[nr][nc])continue;
    const p=M[r][c],q=M[nr][nc];
    const d=Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z),rise=Math.abs(q.y-p.y);
    maxDist=Math.max(maxDist,d);maxRise=Math.max(maxRise,rise);
    assert(d<=1.65,`physically discontinuous logical edge ${r},${c} -> ${nr},${nc}: ${d}`);
    assert(rise<=0.26,`unsafe vertical step ${r},${c} -> ${nr},${nc}: ${rise}`);
  }
}
assert(maxDist>0.8,'world mapping should retain natural movement scale');
assert.strictEqual(g._ceilH,2.65);
console.log('Factory world geometry safety passed.',{maxDist,maxRise});
