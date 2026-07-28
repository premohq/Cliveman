/* ========================================================================
   CLIVEMAN  -  story/ch2.js
   Chapter 2 scenes: arrival, lobby, Bevan, crime scene, Pete's, the alley, the arrest. Plus status / level-up.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */


async function ch2_arrive(){section('C H A P T E R   2   -   B E G I N S');await typeLine('"Shortly after the incident at the Mayo factory you decide this investigation needs more hands. You head to Detective Bevan\'s apartment building."','narration');await driveClivesBuick('BIG SMILES MAYO CORP HQ',"DETECTIVE BEVAN'S APARTMENT",{title:"DRIVE TO BEVAN'S APARTMENT",destLabel:"BEVAN'S APARTMENT",markAtDriveStart:false,arriveLine:'Cliveman: "Bevan\'s building. Let\'s see if the old man\'s sober enough to help."',driveQuips:['Cliveman: "Time to go wake up Bevan. He\'s gonna love that."','Cliveman: "A whole factory, gone - and I\'m the one driving cross-town for backup."','Cliveman: "Bevan better be sober. For once."','Cliveman: "Detective Bevan\'s place. Smells like cigars and regret, if I recall."','Cliveman: "Every block in Dudley looks the same at night."','Cliveman: "Red marker, red marker... Bevan\'s building is around here somewhere."','*the V8 rumbles*','*tires hum over wet asphalt*','*a distant siren wails back toward the factory*'],hitQuips:['Cliveman: "*CRUNCH* ...Bevan\'s gonna ask about that dent."','Cliveman: "That wall came out of nowhere."','Cliveman: "The city can bill me. They owe me a factory anyway."','*metal crunch echoes down the block*','*tires screech against brick*']});await typeLine('"You enter the building and are greeted by a depressed desk clerk who directs you to pick up a map of the building\'s layout."','narration');addItem("apartment building map");blank();}async function ch2_lobby(){const grid=[['.','.','.','.','E'],['B','.','#','.','.'],['.','.','#','.','.'],['S','.','.','.','.'],];const events={'1,0':async function(){await typeLine('Desk Clerk: "*Monotone* Hello sir. Your face doesn\'t seem familiar. Are you here to see someone?"','speaker');const ans=await yn("Are you looking for someone?");if(ans){await typeLine('Desk Clerk: "You look like one of \'em detectives. Mr. Bevan is in Room 203."','speaker');state.bevan_room_known=true;await typeLine('"[NOTE: Detective Bevan - Room 203]"','sys');}else{await typeLine('Desk Clerk: "No? You here lookin for... me?"','speaker');await typeLine('"*flips OPEN sign to CLOSED*"','narration');}},};const exits={'3,0':'stairs_to_hallway'};return await navigateRoom(ROOM_LOBBY,grid,[0,4],events,exits,{title:'APARTMENT LOBBY',furniture:{'1,1':'deskLobby','3,3':'couch'}});}async function ch2_hallway(){const grid=[['v','.','.','.','.','.','.'],['1','.','#','#','#','.','4'],['2','.','.','.','.','.','5'],['3','.','#','#','#','.','6'],];const filler={'1,0':'You knock on 201. A muffled shout: "GO AWAY!"','2,0':'You knock on 202. Deep snoring - whoever\'s inside doesn\'t stir.','1,6':'You knock on 204. Someone slides a DO NOT DISTURB sign under the door.','2,6':'You knock on 205. A small child answers, stares at you, then closes the door.','3,6':'You knock on 206. No answer. You try twice more. Still nothing.',};const events={};for(const k in filler){(function(msg){events[k]=async function(){await typeLine('"'+msg+'"','narration');};})(filler[k]);}events['3,0']=async function(){if(state.bevan_room_known){await typeLine('"Room 203 - the clerk told you this is Bevan\'s room."','narration');}await typeLine('"You knock three times. No answer. You let yourself in."','narration');};const exits={'0,0':'back_to_lobby','3,0':'bevan_room'};while(true){const result=await navigateRoom(ROOM_HALLWAY,grid,[0,0],events,exits,{title:'APARTMENT BUILDING - F2 HALLWAY'});if(result==='bevan_room')return;if(result==='back_to_lobby'){await floorTransition('down','F2 HALLWAY','APARTMENT LOBBY');await typeLine('"You head back to the lobby... but then remember you need to find Bevan. You turn around."','narration');await floorTransition('up','APARTMENT LOBBY','F2 HALLWAY');}}}async function ch2_bevan_room(){await typeLine('"You let yourself into Bevan\'s room (203). The smell hits like a wall - alcohol and something worse. Bevan is passed out in the corner with 4 empty whiskey bottles. Walk to K and '+(window._padConnected?('press '+labelCheck()):'press C')+' to wake him."','sys');
(function(){var ln=screenEl.lastElementChild;if(ln)ln.setAttribute('data-tpl','"Bevan is passed out in the corner with 4 empty whiskey bottles. Walk to K and {CHECK_VERB} to wake him."');})();const grid=[['.','.','E','.','.'],['U','.','.','#','U'],['.','.','.','#','U'],['K','.','.','U','.'],];const events={'1,0':async function(){await typeLine('"A pile of laundry so old it has become sentient. You back away."','narration');},'1,4':async function(){await typeLine('"A broken antenna TV showing static. Somehow still on."','narration');},'2,4':async function(){await typeLine('"Seven empty whiskey bottles lined up like trophies. You count twice. Seven."','narration');},'3,3':async function(){await typeLine('"A stack of unpaid parking tickets and a weeks-old half-eaten sandwich."','narration');},'3,0':async function(){await typeLine('"You crouch down next to the passed-out Bevan."','narration');},};const exits={'3,0':'bevan_talk'};await navigateRoom(ROOM_BEVAN,grid,[0,2],events,exits,{title:"BEVAN'S APARTMENT (203)",furniture:{'0,0':'couch','0,4':'fridge','3,2':'crate'},itemArt:{'1,0':'laundry','1,4':'tv','2,4':'bottles','3,3':'papers'}});}async function ch2_bevan_interrogation(){section('CONVINCING BEVAN');instantArt('bevan');await sleep(600);const lines=[['Cliveman','"Come on Bevan, on your feet."'],['Detective Bevan','".tahW - .tahW"  [spoken backwards]'],['Cliveman','"For God\'s sake Bevan, you are wasted."'],['Detective Bevan','"Ka-... Karen... is that you?"'],['Cliveman','"Wha - No! Get up Bevan, we have a job to do!"'],['Detective Bevan','"OkAY, dOn\'T mInD thE SmEll, I pEE iN bOTtLeS..."'],['Cliveman','"Good lord... Alright let\'s sober you up."'],['Detective Bevan','"DON\'T TOUCH ME WOMAN!"'],['Cliveman','"BEVAN! THE FACTORY EXPLODED!"'],['Detective Bevan','"WhO exPloDeD?"'],['Cliveman','"The factory. I need you at the scene with me."'],['Detective Bevan','"I aM StArVIng."'],['Cliveman','"*sighs* I will take you out to eat AFTER we investigate."'],['Detective Bevan','"Okay BROTHER!"'],['Cliveman','"Give me your gun. I\'d rather you not shoot me on accident."'],['Detective Bevan','".em toohS t\'now I"  [spoken backwards]'],['Cliveman','"Yeah, not taking my chances." *Takes gun*'],['Detective Bevan','"GiVe ME BaCK mY bOTtLe."'],];for(let i=0;i<lines.length;i++){await typeLine(lines[i][0]+': '+lines[i][1],'speaker');}blank();}const BEVAN_RANDOM_LINES=['Bevan: "Where am I?"','Bevan: "You know Cliveman, you are one of the best presidents."','Bevan: "I am starving, Cliveman."','Bevan: "Is that... is that a mayo? I\'m gonna eat it."','Bevan: "I feel like I\'m going to throw up on a constitutional level."','Bevan: "Clive? CLIVE? Are we at the zoo?"','Bevan: "My back hurts. My front hurts. Everything hurts."','Bevan: "*hic* ...did I eat a wasp?"',];async function ch2_crime_scene(){await typeLine('"After convincing Bevan - and Bevan falling down the stairs - you leave the apartment building."','narration');await carTransition("BEVAN'S APARTMENT","COLLAPSED FACTORY CRIME SCENE");if(window.STORYART)STORYART.set('ruins');if(window.CMSTING)CMSTING.play('dread');await typeLine('"Police are all over the collapsed factory. You show your badge; Bevan shows the officer his bottle of booze."','narration');await typeLine('"You enter the collapsed factory with Bevan. Everything is destroyed and burnt."','narration');blank();const grid=[['#','#','#','#','#','#','#','#','#','#','#','#','#'],['#','E','.','.','#','.','.','.','.','.','.','.','#'],['#','#','#','.','#','.','#','.','#','#','#','.','#'],['#','.','.','.','#','U','#','.','#','I','#','.','#'],['#','.','#','#','#','#','#','.','#','.','#','.','#'],['#','.','#','U','.','.','#','.','#','.','U','.','#'],['#','.','#','.','#','.','#','.','#','.','#','#','#'],['#','L','.','.','#','.','.','.','#','.','.','I','#'],['#','#','#','#','#','#','#','#','#','#','#','#','#']];if(state.ch2_tnt)grid[7][11]='X';if(state.ch2_poison)grid[3][9]='X';const events={'7,11':async function(){if(!state.ch2_tnt){await typeLine('"You find a stick of UNDETONATED TNT amongst the rubble. You mark it carefully in your notes."','narration');addItem("undetonated TNT");state.ch2_tnt=true;}else{await typeLine('"You\'ve already logged the TNT."','narration');}},'3,9':async function(){if(!state.ch2_poison){await typeLine('"You find a slightly burnt box of RAT POISON. This place must\'ve had a rat problem. You make a note of it."','narration');if(state.inventory.indexOf("rat poison (burnt box)")===-1){addItem("rat poison (crime scene)");}state.ch2_poison=true;}else{await typeLine('"You\'ve already noted the rat poison."','narration');}},'3,5':async function(){await typeLine('"Charred papers and broken equipment - too destroyed to be useful."','narration');},'5,10':async function(){await typeLine('"Burnt debris - completely ruined. Nothing useful."','narration');},'5,3':async function(){await typeLine('"More charred junk. Useless."','narration');},};const leaveGate=async function(code){if(code==='leave_scene'){const missing=[];if(!state.ch2_tnt)missing.push('TNT');if(!state.ch2_poison)missing.push('Rat Poison');if(missing.length){await typeLine('"Still need to find: '+missing.join(', ')+'. This maze of rubble is bigger than it looks."','err');return false;}await typeLine('"Well, I got everything discernible from this scene. Not seeing an obvious connection. I need Bevan\'s help and he will only talk once I get him food."','speaker');return true;}return true;};const exits={'7,1':'leave_scene'};await navigateRoom(ROOM_CRIME,grid,[1,1],events,exits,{title:'CRIME SCENE - COLLAPSED FACTORY',itemArt:{'7,11':'tnt','3,9':'ratPoison','3,5':'debris','5,10':'debris','5,3':'debris'},exitGate:leaveGate,onMove:async function(pos){if(Math.random()<0.2){const line=BEVAN_RANDOM_LINES[Math.floor(Math.random()*BEVAN_RANDOM_LINES.length)];await typeLine(line,'speaker');}},});}async function ch2_car_breakdown(){if(window.STORYART)STORYART.set('garage');await typeLine('"You and Bevan pile into the Buick. You crank the key. The engine turns over once, sputters, and dies with a wet mechanical cough."','narration');await sleep(800);await typeLine('Cliveman: "No. No no no. Not now."','speaker');await typeLine('Bevan: "Is the car dead too? Everything\'s dying today."','speaker');blank();await typeLine('"You coast to a dead stop in the middle of central Dudley — ironically, right in front of a car repair shop."','narration');await typeLine('"You both get out. A mechanic in greasy overalls wanders over, chewing something."','narration');blank();await typeLine('Mechanic: "That\'s a rough sound. I can fix her up. Two-fifty."','speaker');await typeLine('Cliveman: "Two hundred and fifty dollars? I\'ve got a hundred on me."','speaker');await typeLine('Mechanic: "Look, I see you\'re a detective. Tell you what — leave the car here. Scrape up the money around town and come back when you\'ve got $250. I ain\'t goin\' nowhere."','speaker');blank();state.money=100;state.mechanicPaid=false;await typeLine('"You pat your wallet. $100. The tavern, the arcade, the horse track... Dudley\'s got ways to make money if you\'re willing to play rough."','narration');showStatus();blank();await pressEnterToContinue();}async function ch2_leave_dudley_to_petes(){blank();if(state.secretEnding){await secretEnding();throw new Error('END');}await typeLine('"The Buick coughs to life. You and Bevan climb in. Bevan immediately reclines the seat and groans."','narration');await driveClivesBuick('CENTRAL DUDLEY',"PETE'S SUBS",{title:"DRIVE TO PETE'S SUBS",destLabel:"PETE'S SUBS",markAtDriveStart:false,arriveLine:'Cliveman: "Pete\'s Subs. Try not to fall out of the car, Bevan."',driveQuips:['Bevan: "Pete\'s Subs... oh man, I can already taste the meatball."','Cliveman: "You can taste it because you haven\'t had a real meal in days, Bevan."','Bevan: "Are we there yet, Clive?"','Cliveman: "We were almost there until you grabbed the wheel."','Bevan: "I think I left my bottle back in Dudley."','Cliveman: "Good. Consider it a head start on sobriety."','Bevan: "Clive, if you hit one pothole my stomach is staging a coup."','Cliveman: "Then hold it together. We\'re close."','Bevan: "*hic* ...do subs come with a side of nap?"','Bevan: "I miss Karen. Karen would\'ve loved a meatball sub."','*Bevan hums something tuneless*','*the V8 rumbles*','*tires hum over wet asphalt*'],hitQuips:['Bevan: "WHOA-HO! Watch the road, watch the ROAD!"','Cliveman: "I AM watching the road, Bevan."','Bevan: "My sub\'s gonna be a SQUISHED sub before we even buy it!"','Cliveman: "*CRUNCH* ...the city can bill me."','Bevan: "You drive worse than I do, and I can\'t feel my face!"','Cliveman: "That is not the endorsement you think it is."','*metal crunch, and a drunken WOO from the passenger seat*','*Bevan slides into the door with a thud*']});}async function secretEnding(){section('S E C R E T   E N D I N G');await typeLine('"You walked out of the Gumshoe Tavern with a thousand dollars in your coat pocket."','narration');await typeLine('"You bought the car back, slid into the driver\'s seat, and looked over at Bevan."','narration');blank();await typeLine('Cliveman: "Bevan. We\'re done. We\'re retiring."','speaker');await typeLine('Bevan: "What about the case?"','speaker');await typeLine('Cliveman: "The case can solve itself. We\'ve got a thousand bucks and two pulses. That\'s enough."','speaker');blank();await typeLine('"You drove out of Dudley as the sun came up. Bevan laughed the whole way. Somewhere behind you, a factory still smoldered. You never looked back."','narration');blank();await typeLine('   — THE EARLY RETIREMENT ENDING —','credits');blank();await pressEnterToContinue();}async function ch2_petes(){
  /* ═══ Pete's Subs — Expanded Scene ═══ */
  playMusic('lonely');
  if(window.STORYART)STORYART.set('diner');
  await typeLine('"The neon sign on Pete\'s Subs is missing two letters. It reads: PE E\'S UBS."','narration');
  blank();
  await typeLine('Bevan: "PE E\'S UBS! Clive! PE E\'S UBS!"','speaker');
  await typeLine('"Bevan is laughing so hard he has to lean against the door frame. You have not seen Bevan laugh like this in years. Maybe ever."','narration');
  await typeLine('Cliveman: "I see it."','speaker');
  await typeLine('Bevan: "It\'s a— it\'s a sign, Clive. It\'s a sign from God."','speaker');
  await typeLine('Cliveman: "Let\'s just eat."','speaker');
  blank();
  await pressEnterToContinue();
  clearScreen();

  /* Interior */
  await typeLine('"The place smells like toasted bread and industrial cleaning fluid. A teenage employee mops something in the corner. Another employee, mid-twenties, stands behind the counter. Her name tag says LINDA."','narration');
  blank();
  await typeLine('Bevan: "I\'ll have two number nines, a number nine large, a number six with extra dip, a number 7, two number 45\'s - one with cheese - and a large soda."','speaker');
  await typeLine('Linda: "...Okay. And for you, sir?"','speaker');
  await typeLine('Cliveman: "Coffee."','speaker');
  await typeLine('Linda: "We don\'t have coffee."','speaker');
  await typeLine('Cliveman: "Of course you don\'t."','speaker');
  await typeLine('Linda: "We have a Sprite."','speaker');
  await typeLine('Cliveman: "Fine."','speaker');
  blank();
  await pressEnterToContinue();

  /* Waiting */
  await typeLine('"Bevan has started telling you a story about a parking dispute he had in 1987 that resulted in a man named Gerald losing a tooth. You have heard this story approximately forty times. You do not stop him. He looks happy. You cannot remember the last time Bevan looked happy."','narration');
  blank();
  await typeLine('"The food arrives. Bevan unwraps his first sandwich with genuine ceremony."','narration');
  blank();
  await typeLine('Bevan: "You know what this is, Clive? This is the reward. You work all your life, you push through it, and at the end — at the end, there\'s a number nine. With extra mayo."','speaker');
  await typeLine('Cliveman: "That\'s very profound."','speaker');
  await typeLine('Bevan: "I\'m a profound person."','speaker');
  blank();
  await pressEnterToContinue();

  /* The Death */
  clearScreen();
  await typeLine('"Bevan takes a massive bite."','narration');
  await sleep(800);
  await typeLine('"The cough starts small. Bevan puts a hand up like he\'s fine."','narration');
  await sleep(600);
  await typeLine('"He is not fine."','narration');
  await sleep(700);
  /* Bach's Air carries the death and everything after it */
  playMusic('bevan_death');
  /* graphical death sting: red vignette + screen glitch + harsh audio */
  await bevanDeathEffect();
  blank();
  await typeLine('"Bevan\'s face goes from pink to red. Then past red into something you don\'t have a word for — a deep, ugly purple that has no business being on a human face. He grips the table. The soda tips. His eyes go very wide and then very still."','narration');
  blank();
  await typeLine('"You are already out of the booth. You are saying his name. You are saying it louder. He is not answering."','narration');
  blank();
  await typeLine('Cliveman: "Bevan. BEVAN. Look at me—"','speaker');
  blank();
  await typeLine('"Your hands are on his collar. The number nine is still in his other hand. Half-eaten. The mayo is the wrong color and you can see it now, you can finally see it, and it is too late."','narration');
  blank();
  await typeLine('"And then your own mouth goes numb. The Sprite. You only had a few sips of the Sprite — but your tongue is thick and the fluorescent lights have started to hum at the wrong frequency and your hands do not feel like your hands."','narration');
  await sleep(600);
  await typeLine('"They got you too. Whatever was in his food was in your drink. Less of it. Enough."','err');
  blank();
  await typeLine('Cliveman: "What did you put in it."','speaker');
  await typeLine('"You are not talking to Bevan anymore."','narration');
  blank();
  await pressEnterToContinue();

  /* The Panic + The Threat */
  await ch2_alley_grief();

  /* The Arrest */
  await ch2_arrest();

  section('C H A P T E R   2   -   E N D');
  await pressEnterToContinue();
}

async function ch2_alley_grief(){
  /* ═══ The Panic + The Threat ═══ */
  clearScreen();
  if(window.STORYART)STORYART.set('diner');
  blank();
  await typeLine('"You turn around. Linda is frozen behind the counter. The teenager has stopped mopping. The mop handle hits the floor and the sound is enormous."','narration');
  blank();
  await typeLine('Cliveman: "What did you put in his sandwich."','speaker');
  await typeLine('Linda: "Sir — sir, I don\'t — he just ordered, I only —"','speaker');
  await typeLine('Cliveman: "The mayo. The MAYO. One of you touched it. One of you put something in it. He took one bite — he took ONE bite —"','speaker');
  blank();
  await typeLine('"You are advancing on the counter. You do not remember deciding to. Linda backs into the soda machine. The teenager has both hands up."','narration');
  blank();
  await typeLine('Teen: "Mister, please, we just work here —"','speaker');
  await typeLine('Cliveman: "Then who DOESN\'T just work here? Who comes in? Who supplies you? WHERE DOES THE MAYO COME FROM?"','speaker');
  blank();
  await typeLine('"Your voice does not sound like your voice. Somewhere under the noise a small clear part of you is saying this is wrong, you are scaring them, they are children, sit down — but that part is very far away and getting farther."','narration');
  blank();
  await typeLine('"Linda is crying. The teenager has dropped the mop and neither of them will look you in the eye. Neither of them has the answer you are screaming for, because there is no answer here, because the answer was never going to be in a sub shop on the edge of Dudley."','narration');
  blank();
  await typeLine('"But you cannot stop. You have not been able to stop anything tonight."','narration');
  blank();
  await pressEnterToContinue();
}

async function ch2_arrest(){
  /* ═══ The Arrest ═══ */
  playMusic('descent');
  clearScreen();
  if(window.STORYART)STORYART.set('arrest');
  if(window.CMSTING)CMSTING.play('hit');
  blank();
  await typeLine('"Red and blue light fills the windows. You did not hear the call go out. Linda must have hit something behind the counter. Good for her."','narration');
  blank();
  await typeLine('"Two officers come through the door with their hands near their belts."','narration');
  blank();
  await typeLine('Officer Reyes: "Sir, step away from the counter. Hands where I can see them."','speaker');
  await typeLine('Cliveman: "I\'m a detective. Dudley PD. My partner — my partner is —"','speaker');
  await typeLine('"(He\'s right there. Tell them. Tell them he\'s right there.)"','dim');
  await typeLine('Officer Reyes: "Sir, there\'s a deceased male in the booth and two employees saying you threatened them. I need you to step back. Now."','speaker');
  blank();
  await typeLine('"You try to explain. The words come out in the wrong order. You tell them about the factory and the jars and the formula and the smile on every label, and you can hear how it sounds, you can hear exactly how it sounds, and you cannot make it sound any other way."','narration');
  blank();
  await typeLine('Cliveman: "It\'s the mayo. It\'s in the mayo. Check his sandwich. CHECK THE SANDWICH —"','speaker');
  blank();
  await typeLine('"The fluorescent lights stretch and smear. Linda\'s face doubles. For half a second every jar on the shelf behind the counter is wearing the Big Smiles logo and every logo is grinning at you and the grins are moving."','narration');
  await sleep(700);
  await typeLine('"You blink. They are just jars. You are on the floor and you do not remember getting there. There is a knee in your back and a voice reading you words you have read to other people a hundred times."','narration');
  blank();
  await typeLine('Officer Reyes: "— anything you say can and will be used against you —"','speaker');
  blank();
  await typeLine('"You stop fighting. Not because you decide to. Because you are very tired, and Bevan is dead, and you cannot make the room hold still."','narration');
  blank();
  await pressEnterToContinue();
}
function showStatus(){instantLine('  ─── $'+state.money+'  ·  LVL '+state.level+'  ·  XP '+state.enemiesBeat+' ───','sys');}function levelUpCheck(){let lvl=1;let threshold=2;let e=state.enemiesBeat;while(e>=threshold){lvl++;threshold*=2;}const oldLvl=state.level;state.level=lvl;return lvl>oldLvl;}