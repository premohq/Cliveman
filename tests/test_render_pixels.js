/* ============================================================================
   tools/test_render_pixels.js

   Proves a change to engine/raycaster.js or engine/navigation-hud.js is output-
   identical to a reference copy of the game. Any optimization in the render
   path should go through this before it ships.

   Usage:
       node tools/test_render_pixels.js <path-to-reference-checkout>

   e.g.  node tools/test_render_pixels.js ../cliveman-2.0.1

   It renders the same scenes with both copies of the file, FNV-1a hashes the
   whole getImageData buffer, and compares.

   Two things that are easy to get wrong and will waste an afternoon:

     * Math.random MUST be seeded. Wall and floor textures are generated with
       random grain, so an unseeded RNG makes every frame differ for reasons
       that have nothing to do with the code under test.
     * mobile and desktop MUST be run separately. IS_MOBILE selects different
       row/pixel step sizes in the floor/ceiling caster, so a change can be
       identical on one and wrong on the other.
   ========================================================================== */
const path=require('path'), fs=require('fs');
const ROOT=path.resolve(__dirname,'..');
const REF=process.argv[2];
if(!REF){ console.error('usage: node tools/test_render_pixels.js <reference-checkout>'); process.exit(2); }
const CHROME=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const {chromium}=require(path.join(ROOT,'node_modules/playwright'));

const SEED='(function(){var s=0x2f6e2b1>>>0;Math.random=function(){s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};})();';
const GRIDS={
  room:['#########','#.......#','#..I....#','#...#...#','#..=..h.#','#.b...D.#','#...#S..#','#....v..#','#########'],
  maze:['###########','#.........#','#.#######.#','#.#..I..#.#','#.#.###.#.#','#.#.#D..#.#','#b#.#####.#','#....h....#','###########']
};

const PAGE=(rc,mm,isMobile)=>`<!doctype html><html><body>
<canvas id="cv" width="320" height="180"></canvas><canvas id="mm" width="200" height="200"></canvas>
<script>window.IS_MOBILE=${isMobile};var IS_MOBILE=${isMobile};${SEED}</script>
<script>${rc}</script><script>${mm}</script>
<script>
var GRIDS=${JSON.stringify(GRIDS)};
function hash(d){var h=2166136261>>>0;for(var i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0;}return h.toString(16);}
window.__walls=function(){
  var cv=document.getElementById('cv'),out=[],themes=Object.keys(RC_THEMES);
  for(var gi in GRIDS){ var g=GRIDS[gi].map(function(r){return r.split('');});
    for(var t=0;t<themes.length;t++){ var th=JSON.parse(JSON.stringify(RC_THEMES[themes[t]]));
      for(var a=0;a<8;a++){
        rcRender(cv,g,3.5,4.5,a*Math.PI/4+0.13,th,(a%3)?0:2.0);
        out.push(gi+'|'+themes[t]+'|'+a+'|'+hash(cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data));
      }}}
  return out;
};
window.__radar=function(){
  var cv=document.getElementById('mm'),x=cv.getContext('2d'),out=[];
  for(var gi in GRIDS){ var g=GRIDS[gi].map(function(r){return r.split('');});
    for(var a=0;a<12;a++){
      x.clearRect(0,0,200,200);
      CMMINIMAP.drawGrid(x,200,g,3.5+(a%3)*0.37,4.5-(a%4)*0.29,a*Math.PI/6+0.07);
      out.push(gi+'|'+a+'|'+hash(x.getImageData(0,0,200,200).data));
    }}
  return out;
};
</script></body></html>`;

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
  let bad=0,total=0;
  for(const isMobile of [true,false]){
    const got={};
    for(const [tag,dir] of [['reference',REF],['current',ROOT]]){
      const page=await browser.newPage();
      const errs=[]; page.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
      await page.setContent(PAGE(
        fs.readFileSync(path.join(dir,'engine/raycaster.js'),'utf8'),
        fs.readFileSync(path.join(dir,'engine/navigation-hud.js'),'utf8'), isMobile));
      got[tag]={walls:await page.evaluate(()=>window.__walls()),
                radar:await page.evaluate(()=>window.__radar())};
      if(errs.length) console.log(`  [${tag}] page errors: ${errs.slice(0,3).join(' | ')}`);
      await page.close();
    }
    for(const kind of ['walls','radar']){
      const a=got.reference[kind],b=got.current[kind];
      let d=0;
      for(let i=0;i<Math.max(a.length,b.length);i++) if(a[i]!==b[i]){ d++; if(d<4) console.log(`   MISMATCH ${a[i]} vs ${b[i]}`); }
      total+=a.length; bad+=d;
      console.log(`${(isMobile?'MOBILE ':'DESKTOP')} ${kind.padEnd(5)}: ${a.length} frames, ${d} mismatched`);
    }
  }
  await browser.close();
  console.log(bad===0?`\nPIXEL-IDENTICAL across all ${total} frames`:`\n${bad}/${total} FRAMES DIFFER`);
  process.exit(bad?1:0);
})();
