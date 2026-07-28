const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const ROOT=require('path').resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const srcs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(s=>!/three\.global|clivesbuick\.bundle/.test(s));
const dom=new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g,''),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x/'});
const w=dom.window;
w.matchMedia=w.matchMedia||(q=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
w.HTMLCanvasElement.prototype.getContext=()=>null;
w.AudioContext=function(){throw new Error('no audio');};
w.requestAnimationFrame=cb=>setTimeout(()=>cb(Date.now()),0);
w.cancelAnimationFrame=id=>clearTimeout(id); w.THREE=undefined;
w.eval(srcs.map(s=>fs.readFileSync(path.join(ROOT,s),'utf8')).join('\n;\n'));
w.eval(fs.readFileSync(path.join(ROOT,'engine/i18n/fr.js'),'utf8'));
let pass=0,fail=0;
const chk=(n,c,e)=>{c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n+(e?'  <- '+e:'')));};

w.document.body.className='game-started';
w._lang='fr';
w.clearScreen();
w.section('THE ROOFTOP');
const printed=[...w.document.querySelectorAll('#screen .line')].map(d=>d.textContent).filter(t=>t.trim());
chk('title still printed TRANSLATED',printed.includes('LE TOIT'),JSON.stringify(printed));
chk('rooftop art routed under fr',/rooftop|<svg/.test(w.document.querySelector('#storyArt .story-scene').innerHTML)&&w.document.querySelector('#storyArt .story-scene').innerHTML.length>0);
const bars=printed.filter(t=>/^=+$/.test(t));
chk('two 54-col rules around title',bars.length===2&&bars.every(b=>b.length===54),bars.map(b=>b.length).join(','));

// typeLine end-to-end: named speaker
w._lang='en'; w.clearScreen();
setTimeout(()=>{console.log('TIMEOUT');process.exit(2);},20000).unref&&0;
(async()=>{
  const tl=w.typeLine('Bevan: "Test line."','speaker',0);
  // speaker lines gate on player input; release it once typing settles
  const rel=setInterval(()=>{ if(w._dlgAdvance) w._dlgAdvance(); },20);
  await tl.catch(()=>{}); clearInterval(rel);
  const el=w.document.getElementById('dlgName');
  chk('typeLine raises plate',el.classList.contains('show')&&el.textContent==='BEVAN',el.textContent);
  const last=w.document.querySelector('#screen .line:last-child');
  chk('typeLine body has no prefix',last&&!/^Bevan:/.test(last.textContent),last&&last.textContent);
  chk('typeLine speaker keeps character color',last&&last.style.color!=='' ,last&&last.style.color);
  w.instantLine('"God, I am getting too old for this."','speaker');
  const el2=w.document.getElementById('dlgName');
  chk('untagged monologue retires plate',!el2.classList.contains('show'));
  const l2=w.document.querySelector('#screen .line:last-child');
  chk('untagged monologue has NO inline color (keeps .speaker amber)',l2.style.color==='',JSON.stringify(l2.style.color));
  console.log('\n'+(fail?'FAILED '+fail:'ALL '+pass+' REGRESSION CHECKS PASSED'));
  process.exit(fail?1:0);
})();
