const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('engine/raycaster.js','utf8');
const start=src.indexOf('function buildFactoryTower(){');
if(start<0)throw new Error('buildFactoryTower not found');
let depth=0,end=-1;
for(let i=start;i<src.length;i++){
  if(src[i]==='{')depth++;
  else if(src[i]==='}'&&--depth===0){end=i+1;break;}
}
const ctx={};vm.createContext(ctx);vm.runInContext(src.slice(start,end)+';this.buildFactoryTower=buildFactoryTower;',ctx);
const t=ctx.buildFactoryTower(),g=t.grid;
function ok(v,msg){if(!v)throw new Error(msg);console.log('PASS',msg);}
const canonical={
  1:['....S','K.#.I','E....'],
  2:['....S','D.#I.','v....'],
  3:['....S','I.B..','v....'],
  4:['....S','.#K#.','v....'],
  5:['..D..','v....']
};
for(const f of [1,2,3,4,5]){
  const actual=t.landing[f].map(r=>g[r].slice(1,6).join(''));
  ok(JSON.stringify(actual)===JSON.stringify(canonical[f]),`floor ${f} canonical grid is byte-for-byte identical`);
}
const expectedFurniture={
  '1,0,1':'mayoVat','1,0,2':'mayoVat','1,2,4':'crate',
  '2,0,1':'mayoVat','2,0,2':'mayoVat','2,2,5':'barrel',
  '3,0,2':'mayoVat','3,0,4':'mayoVat','3,2,5':'crate',
  '4,0,1':'barrel','4,0,4':'mayoVat','5,0,1':'crate','5,0,5':'mayoVat'
};
for(const [local,value] of Object.entries(expectedFurniture)){
  const [f,r,c]=local.split(',').map(Number),world=t.localCoords[f][r+','+c].join(',');
  ok(t.furniture[world]===value,`${value} remains at floor ${f} local ${r},${c}`);
}
const expectedItems={'1,1,5':'mopBucket','2,1,4':'badge','3,1,1':'ratPoison'};
for(const [local,value] of Object.entries(expectedItems)){
  const [f,r,c]=local.split(',').map(Number),world=t.localCoords[f][r+','+c].join(',');
  ok(t.itemArt[world]===value,`${value} remains at floor ${f} local ${r},${c}`);
}
const expectedCells={
  f1_worker:[1,1,1],f1_mop:[1,1,5],f2_door:[2,1,1],f2_badge:[2,1,4],
  f3_poison:[3,1,1],f3_bystander:[3,1,3],f4_suspect:[4,1,3],roof:[5,0,3]
};
for(const [name,[f,r,c]] of Object.entries(expectedCells)){
  ok(t.cells[name].join(',')===t.localCoords[f][r+','+c].join(','),`${name} event coordinate is unchanged`);
}
console.log('Factory layout identity validation passed.');
