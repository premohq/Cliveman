#!/usr/bin/env node
/* Dependency-free regression checks for 2.0.9 consistency fixes. */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
let passed=0;
function ok(condition,label){
  if(!condition)throw new Error('FAIL: '+label);
  passed++;console.log('PASS '+String(passed).padStart(2,'0')+'  '+label);
}
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}

const required=[
  'VOICE SFX','NOT SUPPORTED HERE','VOICE SFX: ON','VOICE SFX: MUTED','VOICE N/A',
  'MUTE','UNMUTE','PRESS ENTER TO CONTINUE','PRESS {CONFIRM} TO CONTINUE','CONFIRM BET',
  'LOAD SAVE FILE','Select your .clive save file to load.',
  'SELECT A .CLIVE FILE FROM YOUR DEVICE','BROWSE FOR SAVE FILE','BACK',
  'SAVE FILE ACCEPTED','CHECKPOINT','Loading your position...',
  'Invalid or corrupted save file.','Error reading save file: ',
  'Could not read that file. Try again.','bad format','unknown error',
  'Save data was corrupted. Starting a new case.','  Resuming from checkpoint ',
  '  *** ITEM OBTAINED: ','cliveman_save.clive downloaded to disk.',
  'Load it at the title screen to resume','from exactly where you are standing.'
];
const langs=['fr','es','zh','pt','ru','hi','ar'];
const uiSource=['engine/menus.js','story/title.js','engine/ui-core.js'].map(read).join('\n');
const menuKeys=new Set();
for(const re of [/\bT\('([^']+)'\)/g,/window\.t\?window\.t\('([^']+)'\)/g,/window\.t\('([^']+)'\)/g]){
  let m;while((m=re.exec(uiSource)))menuKeys.add(m[1]);
}
for(const lang of langs){
  const ctx={window:{_translations:{}}};
  vm.createContext(ctx);
  vm.runInContext(read('engine/i18n/'+lang+'.js'),ctx,{filename:lang+'.js'});
  const d=ctx.window._translations[lang];
  ok(!!d,lang+' dictionary registers');
  ok(required.every(k=>typeof d[k]==='string'&&d[k].length>0),lang+' has every new UI/save key');
  ok([...menuKeys].every(k=>typeof d[k]==='string'&&d[k].length>0),lang+' covers all '+menuKeys.size+' menu/title/core labels');
}

const saveCtx={
  window:{CLIVEMAN_VERSION:'test'},document:{body:{appendChild(){},removeChild(){}}},
  Blob:function(){},URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},
  btoa:s=>Buffer.from(s,'utf8').toString('base64'),blank(){},instantLine(){},setTimeout(){},
};
vm.createContext(saveCtx);
vm.runInContext(read('engine/cinematic-state.js')+'\n;globalThis.__saveTest={state,encodeSave,decodeSave,restoreState};',saveCtx);
const S=saveCtx.__saveTest;
Object.assign(S.state,{checkpoint:4,roomId:9,savedRow:7,savedCol:3,heading:2,secretEnding:true,money:419,mechanicPaid:true,enemiesBeat:11,atDriveStart:true});
const code=S.encodeSave();
const legacy=S.decodeSave(code);
ok(legacy&&legacy.cp===4&&legacy.room===9&&legacy.heading===null,'legacy numeric save remains readable');
const modern=S.decodeSave({v:2,game:'CLIVEMAN',code,heading:2,secretEnding:true});
ok(modern&&modern.heading===2&&modern.secretEnding===true,'v2 payload preserves file-only metadata');
ok(S.decodeSave({game:'OTHER',code})===null,'foreign save payload is rejected');
S.restoreState(modern);
ok(S.state.resumeHeading===2&&S.state.heading===2,'restore keeps player facing direction');
ok(S.state.secretEnding===true,'restore keeps secret-ending state');
ok(S.decodeSave({v:1,game:'CLIVEMAN',code}).heading===null,'v1 payload remains backward compatible');

const ui=read('engine/ui-core.js');
ok(ui.includes('window.setGamePaused')&&ui.includes('clivepausechange'),'global pause-aware timing hook exists');
ok(ui.includes("'PRESS {CONFIRM} TO CONTINUE'")&&ui.includes("'PRESS ENTER TO CONTINUE'"),'read gate matches active input method');
ok((ui.match(/if\(window\._gamePaused\)return;/g)||[]).length>=4,'dialogue and continue gates ignore input while paused');
ok(ui.includes('if(window._gamePaused){padPrev=true;raf=requestAnimationFrame(pollPad);return;}'),'gamepad confirmation is neutralized while paused');

const menus=read('engine/menus.js');
ok(menus.includes('window.setGamePaused(true)')&&menus.includes('window.setGamePaused(false)'),'pause menu freezes and resumes global game time');
ok(menus.includes("querySelector('[data-pad-back=\"1\"]')")||menus.includes("querySelector('[data-pad-back=\\\"1\\\"]')")||menus.includes('data-pad-back'),'modal controller back targets are present');
ok(menus.includes("document.removeEventListener('keydown',escH)")&&menus.includes("document.removeEventListener('keydown',escHandler)"),'modal Escape handlers are cleaned up');

const controls=read('engine/controls-ui.js');
ok(controls.includes('state.resumeHeading=null')&&controls.includes('state.heading=heading'),'navigation consumes and continuously updates saved heading');
ok(controls.indexOf("if(changed){\n      if(typeof playMoveBlip")>=0,'turning in place does not play a movement blip');

const title=read('story/title.js');
ok(title.includes('saveData=JSON.parse(atob(b64))')&&title.includes('resolve(saveData)'),'load screen retains the complete save payload');
ok(title.includes("T('BROWSE FOR SAVE FILE')")&&title.includes("T('Invalid or corrupted save file.')"),'load UI and errors use translations');
ok(title.includes('browseBtn.focus()'),'load screen gives keyboard focus to its primary action');

for(const rel of ['minigame/clivesbuick.js','minigame/clivesbuick.bundle.js']){
  const drive=read(rel);
  ok(drive.includes('_gamePaused')&&drive.includes('clivepausechange'),rel+' freezes input and simulation while paused');
}

const cutscene=read('engine/cinematic-state.js');
ok(cutscene.includes("typeof window.sleep==='function'"),'cinematic fades use pause-aware timing');
const transitions=read('engine/transitions.js');
ok(transitions.includes('sleep(1200).then(cleanup)')&&transitions.includes('sleep(650).then(resolve)'),'floor-transition overlays use pause-aware timing');

const i18n=read('engine/i18n/core.js');
ok(i18n.includes("window.I18N_LANGS.indexOf(window._lang) === -1")&&i18n.includes("lang !== 'en' && window.I18N_LANGS.indexOf(lang) === -1"),'invalid stored or requested languages safely fall back to English');

const versionMatch=read('engine/foundation.js').match(/CLIVEMAN_VERSION='([^']+)'/);
const releaseVersion=versionMatch&&versionMatch[1];
ok(releaseVersion==='2.0.20','runtime version constant matches this release');
ok(read('README.md').includes('# Cliveman '+releaseVersion),'README heading matches runtime version');
ok(read('docs/HANDOFF.md').includes('## Current release: '+releaseVersion),'handoff current release matches runtime version');

console.log('\n'+passed+' consistency checks passed.');
