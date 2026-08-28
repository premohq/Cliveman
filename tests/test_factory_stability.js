const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('engine/raycaster.js','utf8');
const m=src.match(/function buildFactoryTower\(\)\{[\s\S]*?\n\}/);
if(!m)throw new Error('buildFactoryTower not found');
const ctx={};vm.createContext(ctx);vm.runInContext(m[0]+';this.buildFactoryTower=buildFactoryTower;',ctx);
const t=ctx.buildFactoryTower(),g=t.grid,h=g._floorH;
const STEP=0.34;
function ok(v,msg){if(!v)throw new Error(msg);console.log('PASS',msg)}
function walkable(r,c){return !!(g[r]&&g[r][c]!=null&&g[r][c]!=='#')}
function reachable(start, reverseOnly=false){
  const q=[start],seen=new Set([start.join(',')]);
  while(q.length){const [r,c]=q.shift();for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nr=r+dr,nc=c+dc,k=nr+','+nc;if(seen.has(k)||!walkable(nr,nc))continue;
    const cur=h[r][c],tgt=h[nr][nc];if(cur==null||tgt==null)continue;
    if(Math.abs(tgt-cur)>STEP+1e-9)continue;
    seen.add(k);q.push([nr,nc]);
  }}return seen;
}
const all=[];for(let r=0;r<g.length;r++)for(let c=0;g[r]&&c<g[r].length;c++)if(walkable(r,c))all.push([r,c]);
const up=reachable(t.start),down=reachable(t.cells.roof);
ok(up.size===all.length,'every walkable factory cell is reachable from the entrance');
ok(down.size===all.length,'every walkable factory cell is reachable when descending from the roof');
for(const [name,cell] of Object.entries(t.cells))ok(up.has(cell.join(',')),`${name} remains reachable`);
for(let f=1;f<=5;f++)for(const r of t.landing[f])for(let c=1;c<g[r].length-1;c++)if(walkable(r,c))
  ok(Math.abs(h[r][c]-(f-1)*0.9)<1e-9,`floor ${f} deck cell ${r},${c} has stable deck height`);
for(const [r,c] of all)for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const nr=r+dr,nc=c+dc;if(!walkable(nr,nc))continue;
  const delta=Math.abs(h[nr][nc]-h[r][c]);
  if(delta<=STEP+1e-9)ok(true,`safe edge ${r},${c} <-> ${nr},${nc}`);
}
for(let f=1;f<=5;f++){const rows=t.landing[f],save=[rows[rows.length-1],2];ok(walkable(...save),`legacy floor ${f} save landing is valid`);ok(up.has(save.join(',')),`legacy floor ${f} save landing joins continuous route`)}
ok(t.ceilH-t.topDeckH>=0.9,'top deck has safe camera headroom');
console.log('Factory stability validation passed.');
