#!/usr/bin/env node
/* Dependency-free regression checks for 2.0.10 city-drive bounds/minimap fixes. */
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

const source=read('minigame/clivesbuick.js');
const bundle=read('minigame/clivesbuick.bundle.js');
const transitions=read('engine/transitions.js');

const helperStart=source.indexOf('function goalHash');
const helperEnd=source.indexOf('const _goalPoint',helperStart);
ok(helperStart>=0&&helperEnd>helperStart,'objective chooser is present in source');
const helperCode=source.slice(helperStart,helperEnd);
const labels=['BIG SMILES MAYO CORP HQ',"BEVAN'S APARTMENT","PETE'S SUBS"];

for(const N of [12,18]){
  const PITCH=34;
  const ROAD=12;
  const offset=-((N-1)/2)*PITCH;
  const streetCenters=[];
  for(let k=0;k<=N;k++)streetCenters.push(offset-PITCH/2+k*PITCH);
  const ctx={Math,PITCH,N,streetCenters};
  vm.createContext(ctx);
  vm.runInContext(helperCode+'\nglobalThis.__pick=chooseGoalPoint;',ctx,{filename:'drive-goal-helper.js'});
  const points=labels.map(label=>ctx.__pick(label));
  const allowed=streetCenters.slice(2,-2);
  const minTrip=PITCH*Math.max(4,Math.floor(N*0.45));
  const cityMin=streetCenters[0]-ROAD/2;
  const cityMax=streetCenters[streetCenters.length-1]+ROAD/2;
  for(let i=0;i<points.length;i++){
    const [x,z]=points[i];
    ok(allowed.includes(x)&&allowed.includes(z),`N=${N} ${labels[i]} uses an interior street`);
    ok(x>cityMin&&x<cityMax&&z>cityMin&&z<cityMax,`N=${N} ${labels[i]} stays inside city bounds`);
    ok(Math.abs(x)+Math.abs(z)>=minTrip,`N=${N} ${labels[i]} remains a meaningful drive from spawn`);
    const again=ctx.__pick(labels[i]);
    ok(again[0]===x&&again[1]===z,`N=${N} ${labels[i]} placement is deterministic`);
  }
  ok(new Set(points.map(p=>p.join(','))).size===points.length,`N=${N} shipped objectives do not share one destination`);
  for(let i=0;i<50;i++){
    const [x,z]=ctx.__pick('FUTURE OBJECTIVE '+i);
    ok(allowed.includes(x)&&allowed.includes(z),`N=${N} future objective ${i+1} remains within the interior grid`);
  }
}

ok(source.includes('const CITY_MIN = streetCenters[0] - ROAD/2')&&source.includes('const CITY_MAX = streetCenters[streetCenters.length-1] + ROAD/2'),'source has one exact city footprint');
ok(source.includes('P(sc2,CITY_MIN)')&&source.includes('P(sc2,CITY_MAX)')&&!source.includes('P(sc2,pos.z-lim)'),'minimap roads stop at actual city boundaries');
ok(source.includes("_mmx.fillStyle='#030604'")&&source.includes("_mmx.fillText('N'"),'minimap distinguishes outside-city space and shows north');
ok(source.includes("kind: church ? 'church' : 'grocery'")&&source.includes("kind:'tower'"),'source records landmark/building types for the minimap');
ok(source.includes('function _mmWorldPoly')&&source.includes('function _mmRoofFill')&&source.includes('rgba(255,88,62,0.68)'), 'source has depth helpers and rooftop/spire cues for the minimap');
ok(source.includes('wantedWR=_MM_BASE_WR+Math.min')&&source.includes('_mmWorldRadius+=(wantedWR-_mmWorldRadius)*0.08'),'minimap zoom eases with vehicle speed');
ok(source.includes('const DRIVE_MIN = CITY_MIN + CAR_RADIUS')&&source.includes('const DRIVE_MAX = CITY_MAX - CAR_RADIUS'),'car clamp keeps the complete footprint inside the city');
ok(source.includes('opts.goalKey||opts.destLabel||opts.title'),'all current and future destination labels feed objective placement');

ok(bundle.includes('cvCityMin')&&bundle.includes('cvCityMax')&&bundle.includes('cvChooseGoal'),'shipped bundle contains city-bound objective logic');
ok(bundle.includes('cvDriveMin')&&bundle.includes('cvDriveMax')&&bundle.includes('cvMMR'),'shipped bundle contains safe clamp and radar zoom logic');
ok(bundle.includes('rgba(180,215,190,0.24)')&&bundle.includes('fillText("N"'),'shipped bundle contains bounded-map presentation');
ok(bundle.includes('cvMMWorldPoly')&&bundle.includes('cvMMRoofFill')&&bundle.includes('rgba(255,88,62,0.68)'),'shipped bundle contains depth-enhanced minimap rendering');
ok(bundle.includes('kind:"tower"')&&bundle.includes('kind:De?"church":"grocery"'),'shipped bundle preserves building-type metadata for the minimap');

ok(transitions.includes('destLabel: DEST_LABEL'),'drive wrapper passes the destination identity into placement');
ok(transitions.includes('follow the RED GPS route and compass dot.'),'drive instructions match the actual minimap/compass UI');
ok(!transitions.includes('follow the GREEN ARROW'),'removed obsolete green-arrow guidance');

console.log('\n'+passed+' city-drive checks passed.');
