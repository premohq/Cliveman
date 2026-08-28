#!/usr/bin/env node
/* Dependency-free package/load-order and source-integrity checks. */
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
let passed=0;
function ok(v,label){if(!v)throw new Error('FAIL: '+label);passed++;console.log('PASS '+String(passed).padStart(2,'0')+'  '+label);}
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function walk(dir,out=[]){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p,out);else out.push(p);}return out;}
const html=read('index.html');
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g)].map(m=>m[1]);
ok(scripts.length>20,'index declares the expected classic-script stack');
ok(!scripts.includes('minigame/clivesbuick.bundle.js'),'drive bundle is not parser-blocking');
ok(scripts.every(s=>fs.existsSync(path.join(root,s))),'every indexed script exists');
ok(new Set(scripts).size===scripts.length,'indexed scripts are not duplicated');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
ok(new Set(ids).size===ids.length,'static HTML IDs are unique');
const transitions=read('engine/transitions.js');
ok(transitions.includes('window.ensureDriveBundle')&&transitions.includes('requestIdleCallback'),'drive bundle retains lazy load and idle warm-up');
const all=walk(root).filter(p=>!p.includes(path.sep+'.git'+path.sep)&&!p.includes(path.sep+'node_modules'+path.sep));
const textFiles=all.filter(p=>/\.(?:js|html|md|json|css)$/i.test(p));
ok(textFiles.every(p=>!/(^|\n)(<<<<<<< |=======\n|>>>>>>> )/.test(fs.readFileSync(p,'utf8'))),'no merge-conflict markers remain');
const js=all.filter(p=>p.endsWith('.js'));
for(const p of js){const r=cp.spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status!==0)throw new Error('FAIL: syntax '+path.relative(root,p)+'\n'+r.stderr);}
ok(js.length>=45,'all '+js.length+' JavaScript files pass syntax validation');
const bundle=read('minigame/clivesbuick.bundle.js');
ok(bundle.length>1000000&&bundle.includes('window.startClivesBuick'),'shipped drive bundle is present and exposes its entry point');
ok(bundle.includes('cvMMWorldPoly')&&bundle.includes('cvChooseGoal'),'shipped drive bundle contains current minimap/objective logic');
console.log('\n'+passed+' package-integrity checks passed.');
