/* ========================================================================
   CLIVEMAN 3.1  -  js/04-save-state.js
   Game state object, save-code encode/decode, restoreState, inventory (addItem / showInv).

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */
const state={inventory:[],checkpoint:0,roomId:0,savedRow:0,savedCol:0,called_bs_clemons:false,f2_badge:false,f3_poison:false,kw1_found:false,kw2_found:false,bevan_room_known:false,ch2_tnt:false,ch2_poison:false,resumeRoomId:-1,resumePos:null,money:0,mechanicPaid:false,enemiesBeat:0,level:1,secretEnding:false,heading:0,};function encodeSave(){const cp=state.checkpoint&0x7;const room=state.roomId&0xF;const row=state.savedRow&0xF;const col=state.savedCol&0xF;let flags=0;if(state.called_bs_clemons)flags|=1;if(state.f2_badge)flags|=2;if(state.f3_poison)flags|=4;if(state.kw1_found)flags|=8;if(state.kw2_found)flags|=16;if(state.bevan_room_known)flags|=32;if(state.ch2_tnt)flags|=64;if(state.ch2_poison)flags|=128;state.money=Math.max(0,Math.min(1023,state.money));const low=cp|(room<<3)|(row<<7)|(col<<11)|(flags<<15);const money=state.money&0x3FF;const mech=state.mechanicPaid?1:0;const high=money|(mech<<10);return low+high*0x800000;}function decodeSave(code){const low=code%0x800000;const high=Math.floor(code/0x800000);const cp=low&0x7;const room=(low>>3)&0xF;const row=(low>>7)&0xF;const col=(low>>11)&0xF;const flags=(low>>15)&0xFF;const money=high&0x3FF;const mech=(high>>10)&0x1;if(cp<1||cp>7)return null;return{cp:cp,room:room,row:row,col:col,flags:flags,money:money,mech:mech};}function restoreState(dec){state.checkpoint=dec.cp;state.roomId=dec.room;state.savedRow=dec.row;state.savedCol=dec.col;state.called_bs_clemons=!!(dec.flags&1);state.f2_badge=!!(dec.flags&2);state.f3_poison=!!(dec.flags&4);state.kw1_found=!!(dec.flags&8);state.kw2_found=!!(dec.flags&16);state.bevan_room_known=!!(dec.flags&32);state.ch2_tnt=!!(dec.flags&64);state.ch2_poison=!!(dec.flags&128);state.money=dec.money;state.mechanicPaid=!!dec.mech;state.enemiesBeat=0;state.level=1;state.resumeRoomId=dec.room;state.resumePos=[dec.row,dec.col];const inv=[];if(dec.cp>=2)inv.push("factory map");if(state.f2_badge)inv.push("factory access badge");if(state.f3_poison)inv.push("rat poison (burnt box)");if(dec.cp>=3)inv.push("apartment building map");if(state.ch2_tnt)inv.push("undetonated TNT");if(state.ch2_poison)inv.push("rat poison (crime scene)");state.inventory=inv;}window.showSaveCode = function showSaveCode(){
  const code=encodeSave();
  const payload={v:1,code:code,ts:Date.now(),game:'CLIVEMAN',ver:'3.1'};
  const json=JSON.stringify(payload);
  const b64=btoa(json);
  const fileContent='CLIVE1:'+b64;
  const blob=new Blob([fileContent],{type:'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='cliveman_save.clive';a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(url);document.body.removeChild(a);},1000);
  blank();
  const box='  +=============================================+\n'
    +'  |   SAVE FILE WRITTEN                         |\n'
    +'  |   cliveman_save.clive downloaded to disk.   |\n'
    +'  |   Load it at the title screen to resume     |\n'
    +'  |   from exactly where you are standing.      |\n'
    +'  +=============================================+';
  instantLine(box,'savebox');blank();
};function addItem(item){if(!state.inventory.includes(item)){state.inventory.push(item);blank();instantLine('  *** ITEM OBTAINED: '+item.toUpperCase()+' ***','sys');showInv();}}function showInv(){if(state.inventory.length===0){instantLine('"Your pockets are empty."','narration');}else{instantLine('"Inventory: '+state.inventory.join(', ')+'"','narration');}}
