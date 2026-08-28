const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
let pass=0,fail=0;
function chk(name,cond,extra){if(cond){pass++;console.log('  ok   '+name);}else{fail++;console.log('  FAIL '+name+(extra?'  <- '+extra:''));}}

/* Load the real shared regex from dom-refs.js with the smallest browser shim
   possible. This test intentionally has zero npm dependencies. */
const fakeEl={addEventListener(){},classList:{add(){},remove(){},contains(){return false;}},style:{}};
const ctx={console};
ctx.window=ctx;
ctx.document={title:'',getElementById(){return fakeEl;},addEventListener(){}};
ctx.addEventListener=function(){};
ctx.matchMedia=function(){return{matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}};};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/foundation.js'),'utf8'),ctx);
const re=ctx.CLIVE_SPEAKER_RE;
chk('shared speaker regex loaded',!!re&&typeof re.exec==='function',String(re));

const samples=[
  ['ASCII colon + space','Bevan: "Hello."','Bevan','"Hello."'],
  ['ASCII colon, no space','Bevan:"Hello."','Bevan','"Hello."'],
  ['full-width colon','贝文："你好。"','贝文','"你好。"']
];
for(const [label,line,name,body] of samples){
  const m=re.exec(line);
  chk(label+' parses',!!m&&m[1]===name,m&&m[1]);
  chk(label+' strips',line.replace(re,'')===body,JSON.stringify(line.replace(re,'')));
}

for(const lang of ['fr','es','zh','pt','ru','hi','ar']){
  const c={window:{_translations:{}}};vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/i18n',lang+'.js'),'utf8'),c);
  const dict=c.window._translations[lang];
  const sourceSpeaker=Object.entries(dict).filter(([k])=>/^\s*([^:"：]{2,30})[:：]\s*["“«]/.test(k));
  const bad=sourceSpeaker.filter(([,v])=>!re.test(v));
  chk(lang+' translated speaker prefixes ('+sourceSpeaker.length+')',bad.length===0,bad[0]&&bad[0][1]);
}

const ui=fs.readFileSync(path.join(ROOT,'engine/ui-core.js'),'utf8');
const voice=fs.readFileSync(path.join(ROOT,'engine/voice.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
chk('UI uses shared parser',ui.includes('window.CLIVE_SPEAKER_RE'));
chk('voice uses shared parser',voice.includes('window.CLIVE_SPEAKER_RE'));
chk('nav-dialog is allowed through setDlgName',ui.includes("contains('nav-mode')&&!document.body.classList.contains('nav-dialog')"));
chk('nav-dialog plate has a visible CSS route',html.includes('body.game-started.nav-mode.nav-dialog:not(.cv-driving) #dlgName.show'));

/* Exercise the real voice parser. */
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/voice.js'),'utf8'),ctx);
chk('real voice parser accepts ASCII prefix',ctx.VOICE._speakerOf('Bevan: "Hello."','speaker')==='bevan',ctx.VOICE._speakerOf('Bevan: "Hello."','speaker'));
chk('real voice parser accepts full-width prefix',ctx.VOICE._speakerOf('贝文："你好。"','speaker')==='贝文',ctx.VOICE._speakerOf('贝文："你好。"','speaker'));

/* Exercise the real setDlgName() implementation without loading the rest of
   ui-core.js. The function and its parser declaration are adjacent. */
const uiSlice=ui.slice(ui.indexOf('var DLG_SPK_RE='),ui.indexOf('async function typeLine'));
const plate={textContent:'',style:{},classList:{_s:new Set(),add(x){this._s.add(x);},remove(x){this._s.delete(x);},contains(x){return this._s.has(x);}}};
const bodyClasses=new Set();
const uiCtx={window:{CLIVE_SPEAKER_RE:re,CHAR_COLOR(){return '#58b7ff';}},document:{body:{classList:{contains(x){return bodyClasses.has(x);}}},getElementById(id){return id==='dlgName'?plate:null;}}};
vm.createContext(uiCtx);vm.runInContext(uiSlice,uiCtx);
bodyClasses.add('nav-mode');
chk('real UI leaves full-screen nav prefixes alone',uiCtx.setDlgName('Bevan: "Nav."','speaker')==='Bevan: "Nav."');
bodyClasses.add('nav-dialog');
chk('real UI strips nav-dialog prefix',uiCtx.setDlgName('Bevan: "Nav."','speaker')==='"Nav."');
chk('real UI raises nav-dialog plate',plate.classList.contains('show')&&plate.textContent==='BEVAN',plate.textContent);
chk('real UI strips full-width prefix',uiCtx.setDlgName('贝文："你好。"','speaker')==='"你好。"');

console.log('\n'+(fail?'FAILED '+fail+' / '+(pass+fail):'ALL '+pass+' CHECKS PASSED'));
process.exit(fail?1:0);
