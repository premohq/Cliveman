/* ============================================================================
   tools/test_lazy_boot.js

   Asserts that the two big on-demand loads stay off the critical boot path:
     - only the ACTIVE language dictionary is parser-blocking (none for English)
     - minigame/clivesbuick.bundle.js is never parser-blocking

   Usage:
       node tools/test_lazy_boot.js [path-to-reference-checkout]

   With a reference checkout it also prints a DOMContentLoaded comparison.

   NOTE on asserting the deferral: snapshot requests at 'domcontentloaded', not
   later. The drive bundle is warmed by requestIdleCallback, which on an idle
   page fires almost immediately - if you look after that you'll see the
   prefetch and wrongly conclude the deferral failed. Being fetched early is
   fine; being PARSER-BLOCKING is what we're ruling out.
   ========================================================================== */
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const CHROME=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const {chromium}=require(path.join(ROOT,'node_modules/playwright'));

function harness(root){
  return {root, url:'file://'+root+'/index.html'};
}
const CUR=harness(ROOT);
const BASE=process.argv[2]?harness(path.resolve(process.argv[2])):null;

function track(page,root){
  const reqs=[]; const errs=[];
  page.on('request',r=>reqs.push({u:r.url().replace('file://'+root+'/',''),t:Date.now()}));
  page.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
  return {reqs,errs};
}

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--allow-file-access-from-files']});
  let fails=0;
  const ok=(n,c,x)=>{ console.log((c?'  PASS  ':'  FAIL  ')+n+(x?'   '+x:'')); if(!c)fails++; };

  console.log('--- deferral: nothing heavy blocks the parser ---');
  {
    const page=await browser.newPage(); const {reqs,errs}=track(page,CUR.root);
    await page.goto(CUR.url,{waitUntil:'domcontentloaded'});
    /* Snapshot what the PARSER pulled in. Anything fetched after this point is,
       by definition, off the critical boot path. */
    const atDCL=reqs.map(r=>r.u);
    await page.waitForTimeout(6000);
    const dicts=['fr','es','zh','pt','ru','hi','ar'].filter(l=>atDCL.some(u=>u.includes('i18n/'+l+'.js')));
    ok('no dictionary is parser-blocking (EN)', dicts.length===0, 'blocking: '+(dicts.join(',')||'none'));
    ok('drive bundle is not parser-blocking', !atDCL.some(u=>u.includes('clivesbuick.bundle.js')));
    ok('drive bundle still arrives later, via idle prefetch',
       reqs.some(r=>r.u.includes('clivesbuick.bundle.js')));
    ok('no page errors', errs.length===0, errs.slice(0,2).join(' | '));
    console.log('        parser-blocking scripts: '+atDCL.filter(u=>u.endsWith('.js')).length);
    await page.close();
  }
  {
    const page=await browser.newPage(); const {reqs}=track(page,CUR.root);
    await page.addInitScript(()=>{ try{ localStorage.setItem('cliveman_lang','fr'); }catch(e){} });
    await page.goto(CUR.url,{waitUntil:'domcontentloaded'});
    const atDCL=reqs.map(r=>r.u);
    const dicts=['fr','es','zh','pt','ru','hi','ar'].filter(l=>atDCL.some(u=>u.includes('i18n/'+l+'.js')));
    ok('FR: exactly one dictionary is parser-blocking, and it is fr',
       dicts.length===1&&dicts[0]==='fr','blocking: '+dicts.join(','));
    /* the point of document.write: the dictionary must be resident before any
       later script runs, not merely before the game is playable */
    const early=await page.evaluate(()=>!!(window._translations&&window._translations.fr));
    ok('fr strings resident at DOMContentLoaded', early);
    await page.close();
  }

  console.log('\n--- boot cost ---');
  const boot={};
  const targets=BASE?[['baseline',BASE],['current',CUR]]:[['current',CUR]];
  for(const [tag,h] of targets){
    const runs=[];
    for(let i=0;i<5;i++){
      const page=await browser.newPage();
      await page.goto(h.url,{waitUntil:'load'});
      const m=await page.evaluate(()=>{
        const n=performance.getEntriesByType('navigation')[0];
        let js=0;
        for(const e of performance.getEntriesByType('resource'))
          if(e.name.endsWith('.js')) js+=(e.responseEnd-e.startTime);
        return {dcl:n.domContentLoadedEventEnd, load:n.loadEventEnd, js:js};
      });
      runs.push(m);
      await page.close();
    }
    const med=k=>runs.map(r=>r[k]).sort((a,b)=>a-b)[2];
    boot[tag]={dcl:med('dcl'),load:med('load')};
    console.log(`  ${tag.padEnd(9)} DOMContentLoaded ${med('dcl').toFixed(0).padStart(5)} ms   load ${med('load').toFixed(0).padStart(5)} ms   (median of 5)`);
  }
  if(boot.baseline){
    const dd=(1-boot.current.dcl/boot.baseline.dcl)*100;
    console.log(`  => DOMContentLoaded ${dd>=0?'-':'+'}${Math.abs(dd).toFixed(1)}%`);
  } else console.log('  (pass a reference checkout as argv[2] to get a comparison)');

  await browser.close();
  console.log(fails?`\n${fails} CHECK(S) FAILED`:'\nALL DEFERRAL CHECKS PASSED');
  process.exit(fails?1:0);
})();
