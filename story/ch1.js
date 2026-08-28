/* ========================================================================
   CLIVEMAN  -  story/ch1.js
   Chapter 1 scenes: dream, phone, house, drive, Clemons, factory floors, rooftop. Includes room grid definitions.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */
async function ch1_dream(){playMusic('dream');await cutscene(['"No. No. No."','"You see a body, laid out bloody and bashed, on the floor of a hotel room between the bed and the TV stand. The body is that of your wife, who has been dead for two years. The sight of her blonde locks could drive any man insane - especially you. She looks so defeated. Lifeless. How could this happen? Who would hurt such an innocent girl? Who did this? Why? Why? WHY?!"','"You awake."','"You take a swig from your bottle of Vodka. It is bitter and tastes similar to what you imagine the drinking water in the Soviet Union tastes like. You go back to sleep - but it is short-lived. The phone next to your bed begins to ring."'],{title:'A DREAM'});playMusic('investigate');blank();}async function ch1_phone(){if(window.STORYART)STORYART.set('apartment');let attempts=0;while(true){let answer;if(attempts===0)answer=await yn('"Will you pick up the phone?"','answer the phone','reject the call');else answer=true;if(answer){if(attempts===0){await typeLine('"You lazily pick up the phone and hear the heavy diabetic breathing of your boss, Detective Bevan. He coughs into the phone and you are reminded of your time in the second world war where a grenade went off next to you and killed half of your platoon. Your ears are hurt, to say the least."','narration');}else{await typeLine('"YOU LAZILY PICK UP THE PHONE AND HEAR THE HEAVY DIABETIC BREATHING OF YOUR BOSS, DETECTIVE BEVAN. HE COUGHS INTO THE PHONE. YOUR EARS ARE, ONCE AGAIN, HURT - TO SAY THE VERY LEAST."','narration');}blank();await typeLine('Bevan: "Erhm, hey uh Clive... Clive Cliveman right? Is this even your number? The directory said this would be it - I have been calling and calling! You are lucky I don\'t have the authority to fire ya, haha. Anyway: get your butt over to Big Smiles Mayo Corp HQ. They\'ve had a break-in. Just go check it out now. I would, but, well, I couldn\'t be asked."','speaker');blank();await typeLine('"Bevan slams the phone and your ears are destroyed. You slump into bed. The clock says it is 3 AM. No rest for the wicked, eh?"','narration');return;}else{attempts++;if(attempts===1){await typeLine('"You ignore the phone. The ringing stops... but then starts again."','narration');}else{await typeLine('"You ignore the phone a second time. The ringing stops."','narration');await sleep(1200);await typeLine('"...You doze off."','narration');await sleep(1200);blank();await typeLine('GAME OVER - You slept through the case.','err');const again=await yn('Try again from the phone?');if(again){attempts=0;continue;}await typeLine('"Thanks for playing. Goodbye."','sys');throw new Error('END');}}}}const ROOM_HOUSE=0;const ROOM_F1=1,ROOM_F2=2,ROOM_F3=3,ROOM_F4=4,ROOM_F5=5;const ROOM_FS12=101,ROOM_FS23=102,ROOM_FS34=103,ROOM_FS45=104;const ROOM_LOBBY=6,ROOM_HALLWAY=7,ROOM_BEVAN=8,ROOM_CRIME=9;async function ch1_house(){await typeLine('"Take a look around your apartment, or head to the front door. Walk to [D] and '+(window._padConnected?('press '+labelCheck()):'press C')+' to leave."','sys');
(function(){var ln=screenEl.lastElementChild;if(ln)ln.setAttribute('data-tpl','"Take a look around your apartment, or head to the front door. Walk to [D] and {CHECK_VERB} to leave."');})();const grid=[['.','U','.','.'],['#','.','.','U'],['D','.','.','#'],['.','.','.','.'],];const events={'0,1':async function(){await typeLine('"You pick up an old framed photo from the shelf. It\'s your wife on your wedding day. You set it back down quickly."','narration');},'1,3':async function(){await typeLine('"An old wall clock. It reads 3:04 AM. You\'ve already wasted four minutes."','narration');},};const exits={'2,0':'leave_house'};await navigateRoom(ROOM_HOUSE,grid,[3,2],events,exits,{title:'YOUR APARTMENT',furniture:{'0,0':'bed','0,2':'couch','3,3':'tubeTV'},itemArt:{'0,1':'photo','1,3':'clock'}});await typeLine('"God, I am getting too old to be walking up and down stairs to leave. They promised they would install an elevator. That was 10 years ago now..."','speaker');}async function ch1_drive_to_factory(){if(window.STORYART)STORYART.set('collision');await typeLine('"On your way to Dudley you witness a head-on collision. You keep driving. \'Save the busy work for the little guys.\'"','narration');await driveClivesBuick('YOUR APARTMENT','BIG SMILES MAYO CORP HQ');if(window.STORYART)STORYART.set('factory');await typeLine('"You waddle towards the Big Smiles Mayo Corp HQ. The building is massive - it rivals Hearth Tower itself."','narration');await typeLine('"A short, stout, mustachioed man in overalls and a fancy suit jacket wanders out, visibly distressed."','narration');blank();await typeLine('FAT MUSTACHED GUY: "Hey! You a cop? My name is Clemons; Clemons Dee Tubley!"','speaker');await typeLine('Clemons: "SOMEONE IS IN MY BUILDING! PLEASE HELP ME!"','speaker');await typeLine('"In the midst of his fit, he throws you a map of the headquarters."','narration');addItem("factory map");blank();await typeLine('"You step past him into the massive tower. Clemons runs in front of you. Maybe you could talk to him."','narration');}async function ch1_clemons(){section('INTERROGATION 1 - CLEMONS DEE TUBLEY');if(window.STORYART){STORYART.set('factory');STORYART.panel('clemons-neutral');}await sleep(700);await typeLine("Cliveman: \"So, you say someone broke into your factory? Was it a competing mayo company perhaps?\"",'speaker');blank();await typeLine("Clemons: \"Eh? I DUNNO I THINK IT WAS A UH KID OR SUMTIN, I dunno I uh...\"",'speaker');blank();await typeLine("Cliveman: \"A kid? How do you know that?\"",'speaker');blank();await typeLine("Clemons: \"I think it was a competitor. Yeah, a big crook! I saw him with my own two eyes!\"",'speaker');blank();while(true){const a=await askChoice('[ Call out his BS, or let it go?  Select BS or TRUTH ]',[{keys:['bs'],label:'BS - call him out'},{keys:['truth','t'],label:'TRUTH - believe him'},]);if(a.keys.indexOf('bs')!==-1){state.called_bs_clemons=true;if(window.STORYART)STORYART.panel('clemons-cornered','panel-slam');await typeLine("Cliveman: \"So you're telling me a kid AND a big crook broke in, and you saw both? You said 'I THINK IT WAS A UH KID OR SUMTIN' and then changed your story.\"",'speaker');await typeLine("Clemons: \"ERMH! JUST GO ON THEN! JUST GO! I AM GOING TO GIVE MY LAWYER A RING! NOW GET!\"",'speaker');await typeLine("Cliveman: \"Alright 'Bigman'. Lying to an officer is an offense, you know.\"",'speaker');if(window.STORYART)STORYART.clearPanel();return;}else{if(window.STORYART)STORYART.panel('clemons-smug','panel-slam');await typeLine("Cliveman: \"A competitor broke in and you saw him... I'll take a look around.\"",'speaker');await typeLine("Clemons: \"Yes! Take a look please. I feel incredibly unsafe.\"",'speaker');if(window.STORYART)STORYART.clearPanel();return;}}}
async function factoryGate(code){
  if(code!=='roof_access')return true;
  var Tm=window.t||function(s){return s;};
  var missing=[];
  if(!state.f2_badge)missing.push(Tm('Factory Access Badge (Floor 2)'));
  if(!state.f3_poison)missing.push(Tm('Rat Poison (Floor 3)'));
  if(missing.length){await typeLine('"The roof door won\'t open yet. Finish sweeping the floors first - still missing: '+missing.join(', ')+'."','err');return false;}
  if(!state.kw2_found){await typeLine('"The roof door won\'t budge. You never confronted whoever was moving around on the fourth floor - head back down and find him."','err');return false;}
  return true;
}
/* ------------------------------------------------------------------------
   BIG SMILES MAYO CORP — one continuous multi-storey NAV world.

   The collision map is deliberately laid out as a single uninterrupted route,
   but grid._worldMap tells NAV3D where every cell exists in real 3D space:
   all five factory rooms share the same X/Z footprint at different Y levels,
   while one enclosed switchback stair tower sits immediately to their right.
   There are no room loads, sector swaps, spawn snaps, or stair exits. */
function buildFactoryStackedWorld(){
  const FLOOR_GAP=16, FLOORS=5, ROWS=8, COLS=(FLOORS-1)*FLOOR_GAP+8;
  const grid=Array.from({length:ROWS},()=>Array(COLS).fill('#'));
  const world=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  const h=Array.from({length:ROWS},()=>Array(COLS).fill(0));
  const events={},exits={},furniture={},itemArt={};
  const baseRooms=[
    [
      ['#','#','#','#','#','#','#'],
      ['#','.','.','.','.','.','#'],
      ['#','K','.','#','.','I','#'],
      ['#','E','.','.','.','.','#'],
      ['#','#','#','#','#','#','#'],
    ],
    [
      ['#','#','#','#','#','#','#'],
      ['#','.','.','.','.','.','#'],
      ['#','D','.','#','I','.','#'],
      ['#','.','.','.','.','.','#'],
      ['#','#','#','#','#','#','#'],
    ],
    [
      ['#','#','#','#','#','#','#'],
      ['#','.','.','.','.','.','#'],
      ['#','I','.','B','.','.','#'],
      ['#','.','.','.','.','.','#'],
      ['#','#','#','#','#','#','#'],
    ],
    [
      ['#','#','#','#','#','#','#'],
      ['#','.','.','.','.','.','#'],
      ['#','.','#','K','#','.','#'],
      ['#','.','.','.','.','.','#'],
      ['#','#','#','#','#','#','#'],
    ],
    [
      ['#','#','#','#','#','#','#'],
      ['#','.','.','D','.','.','#'],
      ['#','.','.','.','.','.','#'],
      ['#','#','#','#','#','#','#'],
      ['#','#','#','#','#','#','#'],
    ]
  ];
  function key(r,c){return r+','+c;}
  function putFloor(f){
    const b=(f-1)*FLOOR_GAP,y=(f-1)*3.0,room=baseRooms[f-1];
    for(let r=0;r<room.length;r++)for(let c=0;c<room[r].length;c++){
      grid[r][b+c]=room[r][c];world[r][b+c]={x:c+0.5,y:y,z:r+0.5,floor:f};
    }
    /* Open only the east perimeter wall into a dedicated short hallway. */
    grid[1][b+6]='.';world[1][b+6]={x:6.5,y:y,z:1.5,floor:f};
    if(f===1){
      events[key(2,b+1)]=async function(){if(!state.kw1_found){await typeLine('"A frightened factory worker huddles against a mayo vat."','narration');await typeLine('Worker: "I ain\'t sayin\' nothin\'! I didn\'t see nothin\'! Leave me alone!"','speaker');state.kw1_found=true;}else await typeLine('"The worker refuses to make eye contact with you."','narration');};
      events[key(2,b+5)]=async function(){await typeLine('"A mop bucket filled with weeks-old mayo water. Utterly useless."','narration');};
      events[key(3,b+1)]=async function(){await typeLine('"The street door you came in through. No sense leaving until you\'ve swept every floor."','narration');};
      furniture[key(1,b+1)]='mayoVat';furniture[key(1,b+2)]='mayoVat';furniture[key(3,b+4)]='crate';itemArt[key(2,b+5)]='mopBucket';
    }else if(f===2){
      events[key(2,b+1)]=async function(){await typeLine('"The door is locked from the inside. A stencilled sign reads: AUTHORIZED PERSONNEL ONLY - VATS 7-12."','narration');};
      events[key(2,b+4)]=async function(){if(!state.f2_badge){await typeLine('"You find a FACTORY ACCESS BADGE on the floor. Whoever was here dropped it in a hurry."','narration');addItem('factory access badge');state.f2_badge=true;}else await typeLine('"You\'ve already grabbed that badge."','narration');};
      furniture[key(1,b+1)]='mayoVat';furniture[key(1,b+2)]='mayoVat';furniture[key(3,b+5)]='barrel';itemArt[key(2,b+4)]='badge';
    }else if(f===3){
      events[key(2,b+1)]=async function(){if(!state.f3_poison){await typeLine('"You find a slightly burnt box of RAT POISON. This place must\'ve had a rat problem. You make a note of it."','narration');addItem('rat poison (burnt box)');state.f3_poison=true;}else await typeLine('"You\'ve already noted the rat poison."','narration');};
      events[key(2,b+3)]=async function(){await typeLine('"A bystander is crouched against the wall, rocking slightly."','narration');await typeLine('Bystander: "I saw him... he ran upstairs... he had something in his bag. Please don\'t tell him I told you."','speaker');};
      furniture[key(1,b+2)]='mayoVat';furniture[key(1,b+4)]='mayoVat';furniture[key(3,b+5)]='crate';itemArt[key(2,b+1)]='ratPoison';
    }else if(f===4){
      events[key(2,b+3)]=async function(){if(!state.kw2_found){state.kw2_found=true;grid[2][b+3]='X';blank();await typeLine('"In the darkness a shadowy figure is crouched in the corner. You draw your revolver and flashlight - but the instant your light snaps on, he SHOVES you. You stumble back into the railing. He bolts up the last flight, toward the door marked ROOF ACCESS."','narration');try{if(window.navRepaintRoom)navRepaintRoom(grid,[state.savedRow,state.savedCol],state.heading);}catch(_e){}await typeLine('"You haul yourself up, your back cracking, and give chase."','narration');}else await typeLine('"The corner is empty now. Just a draft and the smell of mayonnaise."','narration');};
      furniture[key(1,b+1)]='barrel';furniture[key(1,b+4)]='mayoVat';
    }else if(f===5){
      exits[key(1,b+3)]='roof_access';furniture[key(1,b+1)]='crate';furniture[key(1,b+5)]='mayoVat';
    }
  }
  for(let f=1;f<=FLOORS;f++)putFloor(f);

  /* One global logical stair spine runs beneath the room rows. Each floor has
     its own dedicated hallway branch to that spine, so no room tile or stair
     segment is ever reused by another floor. */
  /* A readable U-shaped flight. Every logical movement cell is roughly one
     physical metre apart, avoiding the camera compression/warping caused by
     the previous tiny spiral. */
  const stairShape=[
    [8.5,7.5,0],[9.5,7.5,0],[10.5,7.5,0],[11.5,7.5,0],
    [12.5,7.5,0],[13.5,7.5,0],[13.5,8.5,0],
    [12.5,8.5,0],[11.5,8.5,0],[10.5,8.5,0],
    [9.5,8.5,0],[8.5,8.5,0],[8.5,7.5,0]
  ];
  function resample(points,count){
    const lens=[0];for(let i=1;i<points.length;i++)lens.push(lens[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1],points[i][2]-points[i-1][2]));
    const total=lens[lens.length-1],out=[];
    for(let n=0;n<count;n++){const d=total*n/(count-1);let j=1;while(j<lens.length&&lens[j]<d)j++;const a=points[j-1],b=points[Math.min(j,points.length-1)],span=(lens[j]-lens[j-1])||1,t=(d-lens[j-1])/span;out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]);}
    return out;
  }
  /* Hallway branch for every floor: east wall -> short hall -> stair landing. */
  for(let f=1;f<=FLOORS;f++){
    const b=(f-1)*FLOOR_GAP,y=(f-1)*3.0;
    const branch=[[1,b+6],[1,b+7],[2,b+7],[3,b+7],[4,b+7],[5,b+7],[6,b+7],[7,b+7]];
    for(let i=0;i<branch.length;i++){
      const r=branch[i][0],c=branch[i][1];
      grid[r][c]='.';
      /* Two-cell east hallway, then a straight connector south to the tower.
         Physical spacing matches logical spacing so movement stays stable. */
      world[r][c]=i<2?{x:6.5+i,y:y,z:1.5,floor:f}:{x:8.5,y:y,z:1.5+(i-1),floor:f};
    }
  }
  /* Physical flights occupy only the global spine row. */
  for(let f=1;f<FLOORS;f++){
    const b=(f-1)*FLOOR_GAP,nb=f*FLOOR_GAP,y0=(f-1)*3.0,pts=resample(stairShape,FLOOR_GAP+1);
    for(let i=0;i<=FLOOR_GAP;i++){
      const c=b+7+i,q=pts[i];grid[7][c]='.';world[7][c]={x:q[0],y:y0+(3.0*i/FLOOR_GAP),z:q[1],floor:f+(i===FLOOR_GAP?1:0)};
    }
  }
  grid._floorH=h;grid._worldMap=world;grid._factoryStacked=true;grid._ceilH=2.65;
  return {grid,events,exits,furniture,itemArt};
}

async function ch1_factory(startFloor){
  section('BIG SMILES MAYO CORP - INVESTIGATION');
  await typeLine('"All five factory floors occupy one continuous 3D building. The enclosed stair tower is just to the right of every room."','sys');
  const W=buildFactoryStackedWorld();
  const f=Math.max(1,Math.min(5,startFloor||1)),base=(f-1)*16;
  const start=f===1?[3,base+2]:[1,base+5];
  try{
    const result=await navigateRoom(ROOM_F1,W.grid,start,W.events,W.exits,{
      title:'BIG SMILES MAYO CORP - STACKED FACTORY',startHeading:0,freeMove:true,seamless:true,
      furniture:W.furniture,itemArt:W.itemArt,exitGate:factoryGate,hideMinimap:true
    });
    if(result!=='roof_access')return result;
  }finally{exitNavMode();}
}

async function ch1_rooftop(){section('THE ROOFTOP');const lines=['"You burst onto the roof. The city sprawls below - pitch black."','"The suspect sprints across the rooftop. You chase."','"He reaches the ledge and leaps onto the adjacent building - a 10-12 foot drop."','"You have nothing left to live for. You get a running start and JUMP."','"You land on your feet. Your ankles are obviously sprained."','"You fall to your knees and crawl after the suspect. You raise your weapon."','"He picks up a brick from the rooftop and tosses it at you."',];for(let i=0;i<lines.length;i++){await typeLine(lines[i],'narration');blank();}instantArt('shoot');await sleep(700);await typeLine('Cliveman: "You son of a *****! You threw a brick at me!"','speaker');await typeLine('Suspect: "Wha-WHAT?! YOU SHOT MY LEG!"','speaker');await typeLine('Cliveman: "Kid, I told you to stop! So I stopped you!"','speaker');await typeLine('Suspect: "OH GOD! My leg!"','speaker');blank();await typeLine('"You reach for the suspect\'s hand and he stabs you through the palm with a knife. Out of rage, you shoot his hand clean off. He leaps out of your grasp and falls off the building. Splat."','narration');await typeLine('"You walk back through the factory, past a shocked Clemons. You get in your Buick."','narration');await typeLine('"As you drive away you see the Big Smiles Mayo Corp building EXPLODE. \'Above your paygrade,\' you mutter, and keep driving."','narration');blank();await pressEnterToContinue();}