const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const srcs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1])
  .filter(s=>!/three\.global|clivesbuick\.bundle/.test(s));
const dom=new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g,''),
  {runScripts:'dangerously',pretendToBeVisual:true,url:'https://x/'});
const w=dom.window;
// minimal shims jsdom lacks
w.matchMedia=w.matchMedia||(q=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
w.HTMLCanvasElement.prototype.getContext=function(){return null;};
w.AudioContext=function(){throw new Error('no audio in jsdom');};
w.requestAnimationFrame=cb=>setTimeout(()=>cb(Date.now()),0);
w.cancelAnimationFrame=id=>clearTimeout(id);
w.THREE=undefined;
const errs=[];
w.addEventListener('error',e=>errs.push('window error: '+e.message));
// CRITICAL: one concat eval — separate evals break shared lexical scope
const code=srcs.map(s=>{
  const f=path.join(ROOT,s);
  return '/*=== '+s+' ===*/\n'+fs.readFileSync(f,'utf8');
}).join('\n;\n');
try{ w.eval(code); }
catch(e){ console.error('BOOT FAILED:', e.message, '\n', (e.stack||'').split('\n').slice(0,4).join('\n')); process.exit(1); }
setTimeout(()=>{
  const need=['audioBus','CMAUDIO','stopStatic','CLIVEMAN_VERSION'];
  let bad=0;
  need.forEach(k=>{ const ok=typeof w[k]!=='undefined'; if(!ok)bad++; console.log((ok?'  ok  ':' MISS ')+k+(ok&&k==='CLIVEMAN_VERSION'?' = '+w[k]:'')); });
  if(errs.length){console.log('runtime errors:'); errs.forEach(e=>console.log('  '+e));}
  console.log(bad?'\nBOOT: MISSING EXPORTS':'\nBOOT: OK ('+srcs.length+' files, shared scope)');
  process.exit(bad?1:0);
},400);
