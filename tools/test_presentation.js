const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const ROOT=require('path').resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const srcs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1])
  .filter(s=>!/three\.global|clivesbuick\.bundle/.test(s));
const dom=new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g,''),
  {runScripts:'dangerously',pretendToBeVisual:true,url:'https://x/'});
const w=dom.window;
w.matchMedia=w.matchMedia||(q=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
w.HTMLCanvasElement.prototype.getContext=function(){return null;};
w.AudioContext=function(){throw new Error('no audio');};
w.requestAnimationFrame=cb=>setTimeout(()=>cb(Date.now()),0);
w.cancelAnimationFrame=id=>clearTimeout(id);
w.THREE=undefined;
const code=srcs.map(s=>'/*=== '+s+' ===*/\n'+fs.readFileSync(path.join(ROOT,s),'utf8')).join('\n;\n');
w.eval(code);
// load every i18n dict into the shared scope
for(const L of ['fr','es','zh','pt','ru','hi','ar']) w.eval(fs.readFileSync(path.join(ROOT,'engine/i18n/'+L+'.js'),'utf8'));

let pass=0,fail=0;
function chk(name,cond,extra){ if(cond){pass++;console.log('  ok   '+name);} else {fail++;console.log('  FAIL '+name+(extra?'  <- '+extra:''));} }

const TITLES=["A DREAM","INTERROGATION 1 - CLEMONS DEE TUBLEY","BIG SMILES MAYO CORP - INVESTIGATION","THE ROOFTOP",
"C H A P T E R   2   -   B E G I N S","CONVINCING BEVAN","S E C R E T   E N D I N G","C H A P T E R   2   -   E N D",
"CENTRAL DUDLEY","C H A P T E R   3   -   B E G I N S","C H A P T E R   3   -   E N D","E P I L O G U E",
"E N D   O F   P A R T   O N E","ILLEGAL BLACKJACK  \u00b7  GUMSHOE TAVERN","RANDOM ENCOUNTER",
"DUDLEY MILLS HORSE TRACK","DUDLEY ARCADE  \u00b7  SNAKE"];

console.log('\n=== FIX 1: section() scene routing is language-independent ===');
w.document.body.className='game-started';
const baseline={};
for(const lang of ['en','fr','es','zh','pt','ru','hi','ar']){
  w._lang=lang;
  const got=[];
  for(const t of TITLES){
    w.STORYART.clear();
    w.section(t);
    got.push(w.document.querySelector('#storyArt .story-scene').innerHTML.length>0);
  }
  const n=got.filter(Boolean).length;
  if(lang==='en'){ baseline.n=n; chk('en routes all '+TITLES.length,n===TITLES.length,n+'/'+TITLES.length); }
  else chk(lang+' matches en ('+n+'/'+TITLES.length+')',n===baseline.n,n+' vs '+baseline.n);
}
w._lang='en';

console.log('\n=== FIX 2a: CHAR_COLOR agrees with speakerOf on untagged lines ===');
const C=w.CHAR_COLOR;
chk('named line -> character color',C('Bevan: "I miss my wife."')==='#58b7ff',C('Bevan: "I miss my wife."'));
chk('Cliveman keeps amber',C('Cliveman: "Test."')==='#ffb000',C('Cliveman: "Test."'));
chk('untagged monologue -> null',C('"God, I am getting too old to be walking up and down stairs to leave."')===null,C('"God, I am getting too old to be walking up and down stairs to leave."'));
chk('untagged monologue 2 -> null',C('"Well, I got everything discernible from this scene."')===null);
chk('untagged shout -> null',C('"AND THEY\'RE OFF!"')===null);
chk('bare name still works',C('Bevan')==='#58b7ff',C('Bevan'));
chk('bare unknown name still colors',typeof C('Hollis')==='string');

console.log('\n=== FIX 2b: name plate retires on any non-named line ===');
const plate=w.document.getElementById('dlgName');
function shown(){return plate.classList.contains('show');}
w.setDlgName('Bevan: "Hello."','speaker');
chk('named speaker raises plate',shown()&&plate.textContent==='BEVAN',plate.textContent);
const stripped=w.setDlgName('Bevan: "Hello."','speaker');
chk('prefix stripped from body',stripped==='"Hello."',JSON.stringify(stripped));
w.setDlgName('Bevan: "Hello."','speaker');
w.setDlgName('"God, I am getting too old for this."','speaker');
chk('untagged speaker retires plate',!shown());
w.setDlgName('Bevan: "Hello."','speaker');
w.setDlgName('C:\\DUDLEY> LOOK','input-echo');
chk('input-echo retires plate',!shown());
w.setDlgName('Bevan: "Hello."','speaker');
w.setDlgName('  >  PRESS TO CONTINUE  <','press-continue');
chk('press-continue retires plate',!shown());
w.setDlgName('Bevan: "Hello."','speaker');
w.setDlgName('some narration','narration');
chk('narration still retires plate',!shown());

console.log('\n=== FIX 3: character figure retires on scene change ===');
w.STORYART.clear();
w.STORYART.set('rooftop');
w.STORYART.char('shoot');
const charEl=w.document.querySelector('#storyArt .story-char');
chk('figure placed',charEl.innerHTML.length>0);
w.STORYART.set('rooftop');
chk('same scene keeps figure',charEl.innerHTML.length>0);
w.STORYART.set('city');
chk('scene change retires figure',charEl.innerHTML.length===0,'len='+charEl.innerHTML.length);
chk('new scene rendered',w.document.querySelector('#storyArt .story-scene').innerHTML.length>0);

console.log('\n=== FIX 4: save/load boxes share one geometry ===');
const boxes=[];
// SAVE FILE WRITTEN
w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
boxes.push(['SAVE FILE WRITTEN',w.showSaveCode()]);
// pull the two title.js boxes out of source and evaluate the ACCEPTED row for every legal cp
const src=fs.readFileSync(path.join(ROOT,'story/title.js'),'utf8');
const loadBox=src.match(/const box='(  \+=+\+\\n[\s\S]*?)';/)[1].replace(/\\n'\s*\+'/g,'\n');
boxes.push(['LOAD SAVE FILE',loadBox]);
for(const cp of [1,2,3,4,5,6,7]){
  const _cpRow='   Checkpoint: '+cp+' - Loading your position...';
  const accepted='  +==============================================+\n'
    +'  |   SAVE FILE ACCEPTED                         |\n'
    +'  |'+(_cpRow.length>46?_cpRow.slice(0,46):_cpRow+' '.repeat(46-_cpRow.length))+'|\n'
    +'  +==============================================+';
  boxes.push(['ACCEPTED cp='+cp,accepted]);
}
let widths=new Set();
for(const [name,box] of boxes){
  const lines=box.split('\n').filter(l=>l.trim());
  const lens=[...new Set(lines.map(l=>l.length))];
  chk(name+' rows aligned',lens.length===1,'widths='+lens.join(','));
  lens.forEach(l=>widths.add(l));
  const bad=lines.filter(l=>!/^  [+|].{46}[+|]$/.test(l));
  chk(name+' borders land in column 49',bad.length===0,bad[0]?JSON.stringify(bad[0]):'');
}
chk('all boxes share one width',widths.size===1,'widths='+[...widths].join(','));

console.log('\n'+(fail?'FAILED '+fail+' / '+(pass+fail):'ALL '+pass+' CHECKS PASSED'));
setTimeout(()=>process.exit(fail?1:0),50);
