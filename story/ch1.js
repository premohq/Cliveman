/* ========================================================================
   CLIVEMAN  -  story/ch1.js
   Chapter 1 scenes: dream, phone, house, drive, Clemons, factory floors, rooftop. Includes room grid definitions.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */
async function ch1_dream(){playMusic('dream');await cutscene(['"No. No. No."','"You see a body, laid out bloody and bashed, on the floor of a hotel room between the bed and the TV stand. The body is that of your wife, who has been dead for two years. The sight of her blonde locks could drive any man insane - especially you. She looks so defeated. Lifeless. How could this happen? Who would hurt such an innocent girl? Who did this? Why? Why? WHY?!"','"You awake."','"You take a swig from your bottle of Vodka. It is bitter and tastes similar to what you imagine the drinking water in the Soviet Union tastes like. You go back to sleep - but it is short-lived. The phone next to your bed begins to ring."'],{title:'A DREAM'});playMusic('investigate');blank();}async function ch1_phone(){if(window.STORYART)STORYART.clear();let attempts=0;while(true){let answer;if(attempts===0)answer=await yn('"Will you pick up the phone?"','answer the phone','reject the call');else answer=true;if(answer){if(attempts===0){await typeLine('"You lazily pick up the phone and hear the heavy diabetic breathing of your boss, Detective Bevan. He coughs into the phone and you are reminded of your time in the second world war where a grenade went off next to you and killed half of your platoon. Your ears are hurt, to say the least."','narration');}else{await typeLine('"YOU LAZILY PICK UP THE PHONE AND HEAR THE HEAVY DIABETIC BREATHING OF YOUR BOSS, DETECTIVE BEVAN. HE COUGHS INTO THE PHONE. YOUR EARS ARE, ONCE AGAIN, HURT - TO SAY THE VERY LEAST."','narration');}blank();await typeLine('Bevan: "Erhm, hey uh Clive... Clive Cliveman right? Is this even your number? The directory said this would be it - I have been calling and calling! You are lucky I don\'t have the authority to fire ya, haha. Anyway: get your butt over to Big Smiles Mayo Corp HQ. They\'ve had a break-in. Just go check it out now. I would, but, well, I couldn\'t be asked."','speaker');blank();await typeLine('"Bevan slams the phone and your ears are destroyed. You slump into bed. The clock says it is 3 AM. No rest for the wicked, eh?"','narration');return;}else{attempts++;if(attempts===1){await typeLine('"You ignore the phone. The ringing stops... but then starts again."','narration');}else{await typeLine('"You ignore the phone a second time. The ringing stops."','narration');await sleep(1200);await typeLine('"...You doze off."','narration');await sleep(1200);blank();await typeLine('GAME OVER - You slept through the case.','err');const again=await yn('Try again from the phone?');if(again){attempts=0;continue;}await typeLine('"Thanks for playing. Goodbye."','sys');throw new Error('END');}}}}const ROOM_HOUSE=0;const ROOM_F1=1,ROOM_F2=2,ROOM_F3=3,ROOM_F4=4,ROOM_F5=5;const ROOM_LOBBY=6,ROOM_HALLWAY=7,ROOM_BEVAN=8,ROOM_CRIME=9;async function ch1_house(){await typeLine('"Take a look around your apartment, or head to the front door. Walk to [D] and '+(window._padConnected?('press '+labelCheck()):'press C')+' to leave."','sys');
(function(){var ln=screenEl.lastElementChild;if(ln)ln.setAttribute('data-tpl','"Take a look around your apartment, or head to the front door. Walk to [D] and {CHECK_VERB} to leave."');})();const grid=[['.','U','.','.'],['#','.','.','U'],['D','.','.','#'],['.','.','.','.'],];const events={'0,1':async function(){await typeLine('"You pick up an old framed photo from the shelf. It\'s your wife on your wedding day. You set it back down quickly."','narration');},'1,3':async function(){await typeLine('"An old wall clock. It reads 3:04 AM. You\'ve already wasted four minutes."','narration');},};const exits={'2,0':'leave_house'};await navigateRoom(ROOM_HOUSE,grid,[3,2],events,exits,{title:'YOUR APARTMENT',furniture:{'0,0':'bed','0,2':'couch','3,3':'tubeTV'},itemArt:{'0,1':'photo','1,3':'clock'}});await typeLine('"God, I am getting too old to be walking up and down stairs to leave. They promised they would install an elevator. That was 10 years ago now..."','speaker');}async function ch1_drive_to_factory(){if(window.STORYART)STORYART.set('collision');await typeLine('"On your way to Dudley you witness a head-on collision. You keep driving. \'Save the busy work for the little guys.\'"','narration');await driveClivesBuick('YOUR APARTMENT','BIG SMILES MAYO CORP HQ');await typeLine('"You waddle towards the Big Smiles Mayo Corp HQ. The building is massive - it rivals Hearth Tower itself."','narration');await typeLine('"A short, stout, mustachioed man in overalls and a fancy suit jacket wanders out, visibly distressed."','narration');blank();await typeLine('FAT MUSTACHED GUY: "Hey! You a cop? My name is Clemons; Clemons Dee Tubley!"','speaker');await typeLine('Clemons: "SOMEONE IS IN MY BUILDING! PLEASE HELP ME!"','speaker');await typeLine('"In the midst of his fit, he throws you a map of the headquarters."','narration');addItem("factory map");blank();await typeLine('"You step past him into the massive tower. Clemons runs in front of you. Maybe you could talk to him."','narration');}async function ch1_clemons(){section('INTERROGATION 1 - CLEMONS DEE TUBLEY');instantArt('normal');await sleep(700);await typeLine('Cliveman: "So, you say someone broke into your factory? Was it a competing mayo company perhaps?"','speaker');blank();await typeLine('Clemons: "Eh? I DUNNO I THINK IT WAS A UH KID OR SUMTIN, I dunno I uh..."','speaker');blank();await typeLine('Cliveman: "A kid? How do you know that?"','speaker');blank();await typeLine('Clemons: "I think it was a competitor. Yeah, a big crook! I saw him with my own two eyes!"','speaker');blank();while(true){const a=await askChoice('[ Call out his BS, or let it go?  Select BS or TRUTH ]',[{keys:['bs'],label:'BS - call him out'},{keys:['truth','t'],label:'TRUTH - believe him'},]);if(a.keys.indexOf('bs')!==-1){state.called_bs_clemons=true;instantArt('bs','glitch');await typeLine('Cliveman: "So you\'re telling me a kid AND a big crook broke in, and you saw both? You said \'I THINK IT WAS A UH KID OR SUMTIN\' and then changed your story."','speaker');await typeLine('Clemons: "ERMH! JUST GO ON THEN! JUST GO! I AM GOING TO GIVE MY LAWYER A RING! NOW GET!"','speaker');await typeLine('Cliveman: "Alright \'Bigman\'. Lying to an officer is an offense, you know."','speaker');return;}else{await typeLine('Cliveman: "A competitor broke in and you saw him... I\'ll take a look around."','speaker');await typeLine('Clemons: "Yes! Take a look please. I feel incredibly unsafe."','speaker');return;}}}async function factoryGate(code){
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
   BIG SMILES MAYO CORP — five real floors stacked one on top of another,
   joined by walk-up stairs. Each floor is its own compact flat room (the
   classic pre-tower layout); stepping onto a stair tile plays an animated
   floor transition and drops you onto the next floor. No sloped decks, no
   single continuous shaft — just a normal building you climb.

   Clues live where they always did:
     F1  worker + mop bucket        (entrance from the street)
     F2  locked door + access badge
     F3  bystander + rat poison
     F4  the shadowy suspect        (shoves past you, bolts for the roof)
     F5  ROOF ACCESS door           (gated by factoryGate)

   Convention every floor keeps: you arrive at the south-west landing and
   climb to the north-east stairs, so the flow reads the same on each floor.
   'S' = stairs up, 'v' = stairs down (both auto-fire on step-on). The roof
   door is a checked exit so factoryGate can vet your evidence first. */
function _factoryFloorLabel(f){
  return ({1:'FLOOR 1 - PRODUCTION',2:'FLOOR 2 - VATS 7-12',3:'FLOOR 3 - STORAGE',
           4:'FLOOR 4 - OFFICES',5:'FLOOR 5 - ROOF ACCESS'})[f]||('FLOOR '+f);
}

async function factory_f1(){
  const grid=[
    ['#','#','#','#','#','#','#'],
    ['#','.','.','.','.','S','#'],
    ['#','K','.','#','.','I','#'],
    ['#','E','.','.','.','.','#'],
    ['#','#','#','#','#','#','#'],
  ];
  const events={
    '2,1':async function(){
      if(!state.kw1_found){await typeLine('"A frightened factory worker huddles against a mayo vat."','narration');await typeLine('Worker: "I ain\'t sayin\' nothin\'! I didn\'t see nothin\'! Leave me alone!"','speaker');state.kw1_found=true;}
      else{await typeLine('"The worker refuses to make eye contact with you."','narration');}
    },
    '2,5':async function(){await typeLine('"A mop bucket filled with weeks-old mayo water. Utterly useless."','narration');},
    '3,1':async function(){await typeLine('"The street door you came in through. No sense leaving until you\'ve swept every floor."','narration');},
  };
  const exits={'1,5':'up'};
  return await navigateRoom(ROOM_F1,grid,[3,2],events,exits,{
    title:'BIG SMILES MAYO CORP - FLOOR 1',startHeading:0,
    furniture:{'1,1':'mayoVat','1,2':'mayoVat','3,4':'crate'},
    itemArt:{'2,5':'mopBucket'}
  });
}

async function factory_f2(){
  const grid=[
    ['#','#','#','#','#','#','#'],
    ['#','.','.','.','.','S','#'],
    ['#','D','.','#','I','.','#'],
    ['#','v','.','.','.','.','#'],
    ['#','#','#','#','#','#','#'],
  ];
  const events={
    '2,1':async function(){await typeLine('"The door is locked from the inside. A stencilled sign reads: AUTHORIZED PERSONNEL ONLY - VATS 7-12."','narration');},
    '2,4':async function(){
      if(!state.f2_badge){await typeLine('"You find a FACTORY ACCESS BADGE on the floor. Whoever was here dropped it in a hurry."','narration');addItem("factory access badge");state.f2_badge=true;}
      else{await typeLine('"You\'ve already grabbed that badge."','narration');}
    },
  };
  const exits={'1,5':'up','3,1':'down'};
  return await navigateRoom(ROOM_F2,grid,[3,2],events,exits,{
    title:'BIG SMILES MAYO CORP - FLOOR 2',startHeading:0,
    furniture:{'1,1':'mayoVat','1,2':'mayoVat','3,5':'barrel'},
    itemArt:{'2,4':'badge'}
  });
}

async function factory_f3(){
  const grid=[
    ['#','#','#','#','#','#','#'],
    ['#','.','.','.','.','S','#'],
    ['#','I','.','B','.','.','#'],
    ['#','v','.','.','.','.','#'],
    ['#','#','#','#','#','#','#'],
  ];
  const events={
    '2,1':async function(){
      if(!state.f3_poison){await typeLine('"You find a slightly burnt box of RAT POISON. This place must\'ve had a rat problem. You make a note of it."','narration');addItem("rat poison (burnt box)");state.f3_poison=true;}
      else{await typeLine('"You\'ve already noted the rat poison."','narration');}
    },
    '2,3':async function(){await typeLine('"A bystander is crouched against the wall, rocking slightly."','narration');await typeLine('Bystander: "I saw him... he ran upstairs... he had something in his bag. Please don\'t tell him I told you."','speaker');},
  };
  const exits={'1,5':'up','3,1':'down'};
  return await navigateRoom(ROOM_F3,grid,[3,2],events,exits,{
    title:'BIG SMILES MAYO CORP - FLOOR 3',startHeading:0,
    furniture:{'1,2':'mayoVat','1,4':'mayoVat','3,5':'crate'},
    itemArt:{'2,1':'ratPoison'}
  });
}

async function factory_f4(){
  const grid=[
    ['#','#','#','#','#','#','#'],
    ['#','.','.','.','.','S','#'],
    ['#','.','#','K','#','.','#'],
    ['#','v','.','.','.','.','#'],
    ['#','#','#','#','#','#','#'],
  ];
  const events={
    '2,3':async function(){
      if(!state.kw2_found){
        state.kw2_found=true; grid[2][3]='X'; blank();
        await typeLine('"In the darkness a shadowy figure is crouched in the corner. You draw your revolver and flashlight - but the instant your light snaps on, he SHOVES you. You stumble back into the railing. He bolts up the last flight, toward the door marked ROOF ACCESS."','narration');
        try{ if(window.navRepaintRoom)navRepaintRoom(grid,[state.savedRow,state.savedCol],state.heading); else if(typeof rcRedraw==='function')rcRedraw(); }catch(_e){}
        await typeLine('"You haul yourself up, your back cracking, and give chase."','narration');
      }else{await typeLine('"The corner is empty now. Just a draft and the smell of mayonnaise."','narration');}
    },
  };
  const exits={'1,5':'up','3,1':'down'};
  const gate=async function(code){
    if(code==='up'&&!state.kw2_found){
      await typeLine('"No reason to climb yet. Whatever you\'re after is still down here on this floor - sweep the corners."','err');
      return false;
    }
    return true;
  };
  return await navigateRoom(ROOM_F4,grid,[3,2],events,exits,{
    title:'BIG SMILES MAYO CORP - FLOOR 4',startHeading:0,
    furniture:{'1,1':'barrel','1,4':'mayoVat'},
    exitGate:gate
  });
}

async function factory_f5(){
  const grid=[
    ['#','#','#','#','#','#','#'],
    ['#','.','.','D','.','.','#'],
    ['#','v','.','.','.','.','#'],
    ['#','#','#','#','#','#','#'],
  ];
  const events={};
  const exits={'1,3':'roof_access','2,1':'down'};
  return await navigateRoom(ROOM_F5,grid,[2,2],events,exits,{
    title:'BIG SMILES MAYO CORP - FLOOR 5',startHeading:0,
    furniture:{'1,1':'crate','1,5':'mayoVat'},
    exitGate:factoryGate
  });
}

async function ch1_factory(startFloor){
  section('BIG SMILES MAYO CORP - INVESTIGATION');
  await typeLine('"Big Smiles Mayo Corp. Five floors stacked one on top of the next, one staircase between them, and no elevator - naturally. You start at the bottom."','sys');
  await typeLine('"Sweep each floor for clues, then walk up the stairs to the next one. The ROOF ACCESS door is on the top floor."','sys');
  let floor=(startFloor>=ROOM_F1&&startFloor<=ROOM_F5)?startFloor:1;
  while(true){
    let result;
    if(floor===1)result=await factory_f1();
    else if(floor===2)result=await factory_f2();
    else if(floor===3)result=await factory_f3();
    else if(floor===4)result=await factory_f4();
    else result=await factory_f5();

    if(result==='roof_access')return;
    if(result==='up'&&floor<5){
      const nf=floor+1;
      await floorTransition('up',_factoryFloorLabel(floor),_factoryFloorLabel(nf));
      floor=nf;
    }else if(result==='down'&&floor>1){
      const nf=floor-1;
      await floorTransition('down',_factoryFloorLabel(floor),_factoryFloorLabel(nf));
      floor=nf;
    }else{
      return;
    }
  }
}

async function ch1_rooftop(){section('THE ROOFTOP');const lines=['"You burst onto the roof. The city sprawls below - pitch black."','"The suspect sprints across the rooftop. You chase."','"He reaches the ledge and leaps onto the adjacent building - a 10-12 foot drop."','"You have nothing left to live for. You get a running start and JUMP."','"You land on your feet. Your ankles are obviously sprained."','"You fall to your knees and crawl after the suspect. You raise your weapon."','"He picks up a brick from the rooftop and tosses it at you."',];for(let i=0;i<lines.length;i++){await typeLine(lines[i],'narration');blank();}instantArt('shoot');await sleep(700);await typeLine('Cliveman: "You son of a *****! You threw a brick at me!"','speaker');await typeLine('Suspect: "Wha-WHAT?! YOU SHOT MY LEG!"','speaker');await typeLine('Cliveman: "Kid, I told you to stop! So I stopped you!"','speaker');await typeLine('Suspect: "OH GOD! My leg!"','speaker');blank();await typeLine('"You reach for the suspect\'s hand and he stabs you through the palm with a knife. Out of rage, you shoot his hand clean off. He leaps out of your grasp and falls off the building. Splat."','narration');await typeLine('"You walk back through the factory, past a shocked Clemons. You get in your Buick."','narration');await typeLine('"As you drive away you see the Big Smiles Mayo Corp building EXPLODE. \'Above your paygrade,\' you mutter, and keep driving."','narration');blank();await pressEnterToContinue();}