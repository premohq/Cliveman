/* ========================================================================
   CLIVEMAN 3.1  -  js/19-boot.js
   Debug jump menu, boot sequence, main() game loop, and the boot() call that starts everything.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */


/* ── Debug menu ─────────────────────────────────────────────────────────── */
async function debugMenu(){
  var JUMPS = [
    { label:'01  THE APARTMENT',           key:'apartment'   },
    { label:'02  MAYO FACTORY — FLOOR 1',  key:'factory'     },
    { label:'03  MAYO ROOFTOP ENCOUNTER',  key:'rooftop'     },
    { label:"04  BEVAN'S APARTMENT BLDG",  key:'bevan_apt'   },
    { label:"05  BEVAN'S ROOM 203",        key:'bevan_room'  },
    { label:'06  COLLAPSED FACTORY',       key:'crime_scene' },
    { label:'07  CENTRAL DUDLEY',          key:'dudley'      },
    { label:"08  PETE'S SUBS",             key:'petes'       },
    { label:'09  CHAPTER 3',               key:'ch3'         },
    { label:'10  EPILOGUE',                key:'epilogue'    },
    { label:'── BACK TO TITLE ──',         key:'cancel'      },
  ];

  while(true){
    clearScreen();
    blank();
    /* ASCII header */
    instantLine(' ╔══════════════════════════════════════════════╗','sys');
    instantLine(' ║         ★  CLIVEMAN — DEBUG MENU  ★         ║','sys');
    instantLine(' ║          AUTHORIZED PERSONNEL ONLY           ║','sys');
    instantLine(' ╚══════════════════════════════════════════════╝','sys');
    blank();
    instantLine('  SELECT A JUMP POINT:','sys');
    blank();

    var opts = JUMPS.map(function(j){
      return { keys:[j.key], label:j.label };
    });

    var result = await showChoiceButtons(opts);
    var pick = result.keys[0];

    if(pick === 'cancel') return; /* back to title */

    /* ── Reset all game state ── */
    state.inventory      = [];
    state.checkpoint     = 0;
    state.roomId         = 0;
    state.savedRow       = 0;
    state.savedCol       = 0;
    state.called_bs_clemons = false;
    state.f2_badge       = false;
    state.f3_poison      = false;
    state.kw1_found      = false;
    state.kw2_found      = false;
    state.bevan_room_known = false;
    state.ch2_tnt        = false;
    state.ch2_poison     = false;
    state.resumeRoomId   = -1;
    state.resumePos      = null;
    state.money          = 0;
    state.mechanicPaid   = false;
    state.enemiesBeat    = 0;
    state.level          = 1;
    state.secretEnding   = false;
    state.heading        = 0;

    clearScreen();
    instantLine('  [DEBUG] LOADING: '+pick.toUpperCase()+' ...','sys');
    blank();
    await sleep(500);

    try {

      if(pick === 'apartment'){
        /* ── Chapter 1 from the very beginning ── */
        section('C H A P T E R   1');
        await ch1_dream();
        await ch1_phone();
        await runFrom(1);

      } else if(pick === 'factory'){
        /* ── Mayo factory, floor 1 ── */
        state.inventory = ['factory map'];
        section('BIG SMILES MAYO CORP — INVESTIGATION');
        await typeLine('"[DEBUG] Starting at factory floor 1. All clues available to find."','sys');
        blank();
        await ch1_factory(1);
        await ch1_rooftop();
        await runFrom(3);

      } else if(pick === 'rooftop'){
        /* ── Skip straight to rooftop confrontation ── */
        state.inventory  = ['factory map','factory access badge','rat poison (burnt box)'];
        state.f2_badge   = true;
        state.f3_poison  = true;
        state.kw1_found  = true;
        state.kw2_found  = true;
        section('THE ROOFTOP');
        await typeLine('"[DEBUG] Skipping factory floors — jumping to rooftop."','sys');
        blank();
        await sleep(400);
        await ch1_rooftop();
        await runFrom(3);

      } else if(pick === 'bevan_apt'){
        /* ── Chapter 2: Bevan's apartment building ── */
        state.inventory    = ['factory map','apartment building map'];
        state.checkpoint   = 3;
        await runFrom(3);

      } else if(pick === 'bevan_room'){
        /* ── Bevan's room 203 ── */
        state.inventory        = ['factory map','apartment building map'];
        state.bevan_room_known = true;
        state.checkpoint       = 4;
        await runFrom(4);

      } else if(pick === 'crime_scene'){
        /* ── Collapsed factory crime scene ── */
        state.inventory  = ['factory map','apartment building map','undetonated TNT','rat poison (crime scene)'];
        state.ch2_tnt    = true;
        state.ch2_poison = true;
        state.checkpoint = 5;
        await runFrom(5);

      } else if(pick === 'dudley'){
        /* ── Central Dudley open world ── */
        state.inventory  = ['factory map','apartment building map','undetonated TNT','rat poison (crime scene)'];
        state.ch2_tnt    = true;
        state.ch2_poison = true;
        state.money      = 100;
        state.checkpoint = 6;
        await runFrom(6);

      } else if(pick === 'petes'){
        /* ── Pete's Subs (car already fixed, drive straight there) ── */
        state.inventory      = ['factory map','apartment building map','undetonated TNT','rat poison (crime scene)'];
        state.ch2_tnt        = true;
        state.ch2_poison     = true;
        state.money          = 250;
        state.mechanicPaid   = true;
        state.checkpoint     = 6;
        section("PETE'S SUBS");
        await typeLine('"[DEBUG] Car is fixed. Driving straight to Pete\'s Subs."','sys');
        blank();
        await sleep(400);
        await ch2_leave_dudley_to_petes();
        await ch2_petes();
        await ch3();
        await epilogue();

      } else if(pick === 'ch3'){
        /* ── Chapter 3 + Epilogue ── */
        state.checkpoint = 7;
        await ch3();
        await epilogue();

      } else if(pick === 'epilogue'){
        /* ── Epilogue only ── */
        state.checkpoint = 7;
        await epilogue();
      }

    } catch(e){
      if(e.message !== 'END') throw e;
      /* Segment ended normally (END signal) — fall through to loop */
    }

    /* After segment, pause then loop back to debug menu */
    blank();
    instantLine('  [DEBUG] SEGMENT COMPLETE. Returning to debug menu...','sys');
    await sleep(1400);
  }
}

async function boot(){const powerOnEl=document.getElementById('crtPowerOn');if(powerOnEl){powerOnEl.classList.add('warming');await sleep(1450);powerOnEl.style.display='none';}const lines=['DUDLEY PD MAINFRAME // POST v3.14','CPU....... 80486DX2 @ 66MHz   [OK]','MEMORY.... 16384 KB           [OK]','HDD....... 540 MB             [OK]','NETWORK... DIAL-UP            [OK]','','LOADING CASE FILE: CLIVEMAN.DAT','DECRYPTING ............ DONE','CONNECTING TO TERMINAL ...','','[ AUTHORIZED PERSONNEL ONLY ]','',];for(let i=0;i<lines.length;i++){bootEl.textContent+=lines[i]+'\n';await sleep(140);}await sleep(600);bootEl.classList.add('hidden');input.focus();ensureAudio();main();}async function main(){try{const result=await titleScreen();clearScreen();if(result==='new'){await intro();section('C H A P T E R   1');await ch1_dream();await ch1_phone();await runFrom(1);}else{const code=result;const dec=decodeSave(code);restoreState(dec);blank();await typeLine('  Resuming from checkpoint '+dec.cp+' (room '+dec.room+', pos '+dec.row+','+dec.col+')...','sys');blank();showInv();await sleep(1200);await runFrom(dec.cp);}}catch(e){if(e.message!=='END')console.error(e);}}boot();
