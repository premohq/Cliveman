/* music-classical.js — live public-domain classical score engine (v2).
   A 15-piece repertoire performed live by a small WebAudio ensemble:
   melody voice (triangle lead or a detuned-saw "strings" section with
   vibrato), an optional inner harmony voice, and a sine bass. Original
   simplified arrangements of centuries-old public-domain works.

   Two ways to pick music:
     1. Tension (0..1) — ambient rotation inside calm / mid / tense pools,
        exactly like the old engine. Back-compat: setTension()/start()/stop().
     2. Story context — ClassicalMusic.setContext(name) pins a specific
        piece to a narrative beat (e.g. Bach's Air for the opening dream and
        for Bevan's death) and/or selects a pool (e.g. 'grief'). engine/audio.js
        forwards every playMusic(name) call here, so story scripts stay
        one-liners: playMusic('dream'), playMusic('bevan_death'), ...

   Reuses the game's shared AudioContext and follows the global mute. */
(function(){
  "use strict";
  var ctx=null, master=null, musicBus=null, delay=null, feedback=null, wet=null;
  var playing=false, schedId=null, tension=0, tensionNow=0, vol=0.5;
  var PC={C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};
  function freqOf(name){ if(!name||name==="R")return 0; var m=name.match(/^([A-G][#b]?)(\d)$/); if(!m)return 0; var midi=(parseInt(m[2],10)+1)*12+PC[m[1]]; return 440*Math.pow(2,(midi-69)/12); }

  /* Bach Prelude in C (WTC I) — build the arpeggio texture from chord bars. */
  function prelBars(){
    var bars=[
      ["C4","E4","G4","C5","E5"], ["C4","D4","A4","D5","F5"],
      ["B3","D4","G4","D5","F5"], ["C4","E4","G4","C5","E5"],
      ["C4","E4","A4","E5","A5"], ["C4","D4","F#4","A4","D5"],
      ["B3","D4","G4","D5","G5"], ["B3","C4","E4","G4","C5"],
      ["A3","C4","E4","G4","C5"], ["D3","A3","D4","F#4","C5"],
      ["G3","B3","D4","G4","B4"], ["G3","Bb3","E4","G4","C#5"],
      ["F3","A3","D4","A4","D5"], ["F3","Ab3","D4","F4","B4"],
      ["E3","G3","C4","G4","C5"], ["C3","G3","Bb3","E4","G4"],
    ];
    var mel=[];
    for(var b=0;b<bars.length;b++){
      var n=bars[b];
      for(var r=0;r<2;r++){
        mel.push([n[0],.25],[n[1],.25],[n[2],.25],[n[3],.25],[n[4],.25],[n[2],.25],[n[3],.25],[n[4],.25]);
      }
    }
    mel.push(["C4",4]);
    return mel;
  }
  /* Moonlight Sonata — triplet texture from chord bars. */
  function moonTrips(){
    var bars=[
      ["G#3","C#4","E4"],["G#3","C#4","E4"],["A3","C#4","E4"],["A3","D4","F#4"],
      ["G#3","C4","F#4"],["G#3","C#4","E4"],["G#3","C#4","D#4"],["F#3","C#4","D#4"],
    ];
    var t=1/3, mel=[];
    for(var b=0;b<bars.length;b++){
      var n=bars[b];
      for(var r=0;r<4;r++) mel.push([n[0],t],[n[1],t],[n[2],t]);
    }
    return mel;
  }

  /* ── Repertoire ──
     moods: which ambient pools a piece can rotate in (calm | mid | tense | grief).
     lead: 'triangle' (plucky) or 'strings' (bowed, slow attack + vibrato).   */
  const PIECES = [
    {
      id:"air", name:"Air on the G String \u2014 Bach", bpm:50, moods:["grief"], lead:"strings",
      melody:[
        ["F#5",6],["E5",1.25],["D5",0.75],
        ["C#5",1],["B4",0.5],["C#5",0.5],["D5",1],["B4",1],
        ["A#4",2],["B4",1.5],["C#5",0.5],
        ["D5",1],["C#5",0.5],["B4",0.5],["A4",2],
        ["D5",0.75],["E5",0.25],["F#5",0.5],["G5",0.5],["A5",1.5],["G5",0.5],
        ["F#5",1],["E5",0.5],["F#5",0.5],["G5",2],
        ["B4",0.75],["C#5",0.25],["D5",0.5],["E5",0.5],["F#5",1.5],["E5",0.5],
        ["D5",1],["C#5",0.5],["D5",0.5],["E5",2],
        ["G5",1.5],["F#5",0.5],["E5",1],["D5",1],
        ["C#5",1.5],["B4",0.5],["B4",1],["A4",1],
        ["A4",5],["R",3],
      ],
      harmony:[
        ["A4",4],["G4",2],["F#4",2],["F#4",4],["E4",2],["G4",2],
        ["F#4",4],["E4",4],["D4",4],["C#4",4],["D4",4],["E4",2],["C#4",2],["D4",4],
      ],
      bass:[
        ["D3",.5],["D2",.5],["C#3",.5],["C#2",.5],["B2",.5],["B1",.5],["A2",.5],["A1",.5],
        ["G2",.5],["G1",.5],["F#2",.5],["F#1",.5],["E2",.5],["E1",.5],["A2",.5],["A1",.5],
        ["D3",.5],["D2",.5],["G2",.5],["G1",.5],["A2",.5],["A1",.5],["D3",.5],["D2",.5],
      ],
    },
    {
      id:"ode", name:"Ode to Joy \u2014 Beethoven", bpm:104, moods:["calm"], lead:"triangle",
      melody:[
        ["E4",1],["E4",1],["F4",1],["G4",1], ["G4",1],["F4",1],["E4",1],["D4",1],
        ["C4",1],["C4",1],["D4",1],["E4",1], ["E4",1.5],["D4",0.5],["D4",2],
        ["E4",1],["E4",1],["F4",1],["G4",1], ["G4",1],["F4",1],["E4",1],["D4",1],
        ["C4",1],["C4",1],["D4",1],["E4",1], ["D4",1.5],["C4",0.5],["C4",2],
      ],
      bass:[["C3",2],["C3",2],["G2",2],["G2",2],["C3",2],["C3",2],["G2",2],["G2",2]],
    },
    {
      id:"minuet", name:"Minuet in G \u2014 Petzold", bpm:126, moods:["calm"], lead:"triangle",
      melody:[
        ["D5",1],["G4",1],["A4",1],["B4",1],["C5",1],["D5",1],["G4",1],["G4",1],
        ["E5",1],["C5",1],["D5",1],["E5",1],["F#5",1],["G5",1],["G4",1],["G4",1],
        ["C5",1],["D5",1],["C5",1],["B4",1],["A4",1],["B4",1],["C5",1],["B4",1],["A4",1],["G4",1],
        ["F#4",1],["G4",1],["A4",1],["B4",1],["G4",1],["A4",1],["D5",2],
      ],
      bass:[["G2",4],["D3",4],["G2",4],["C3",2],["D3",2],["G2",4],["D3",2],["G2",2]],
    },
    {
      id:"gymnopedie", name:"Gymnop\u00E9die No. 1 \u2014 Satie", bpm:70, moods:["calm"], lead:"triangle",
      melody:[
        ["F#5",1],["A5",1],["G5",1],["F#5",1],["C#5",1],["B4",1],["C#5",1],["D5",1],["A4",6],
        ["F#5",1],["A5",1],["G5",1],["F#5",1],["C#5",1],["B4",1],["C#5",1],["D5",1],["A4",3],["D5",3],["C#5",6],
      ],
      harmony:[["B3",3],["A3",3],["B3",3],["A3",3],["B3",3],["A3",3],["B3",3],["A3",3],["F#3",3],["G3",3],["A3",6]],
      bass:[["G2",3],["D3",3]],
    },
    {
      id:"canon", name:"Canon in D \u2014 Pachelbel", bpm:60, moods:["calm"], lead:"strings",
      melody:[
        ["F#5",2],["E5",2],["D5",2],["C#5",2],["B4",2],["A4",2],["B4",2],["C#5",2],
        ["D5",1],["C#5",1],["B4",1],["A4",1],["G4",1],["F#4",1],["G4",1],["E4",1],
        ["D4",1],["F#4",1],["A4",1],["G4",1],["F#4",1],["D4",1],["F#4",1],["E4",1],
        ["D4",1],["B3",1],["D4",1],["A4",1],["G4",1],["B4",1],["A4",1],["G4",1],
        ["F#4",1],["D4",1],["E4",1],["C#5",1],["D5",1],["F#5",1],["A5",1],["A4",1],
        ["B4",1],["G4",1],["A4",1],["F#4",1],["D4",1],["D5",1],["D5",3],
      ],
      bass:[["D3",2],["A2",2],["B2",2],["F#2",2],["G2",2],["D2",2],["G2",2],["A2",2]],
    },
    {
      id:"prelude", name:"Prelude in C \u2014 Bach", bpm:76, moods:["calm"], lead:"triangle",
      melody:prelBars(),
      bass:[["C2",4],["C2",4],["B1",4],["C2",4],["C2",4],["C2",4],["B1",4],["B1",4],["A1",4],["D2",4],["G1",4],["G1",4],["F1",4],["F1",4],["E1",4],["C2",4]],
    },
    {
      id:"nachtmusik", name:"Eine kleine Nachtmusik \u2014 Mozart", bpm:118, moods:["calm"], lead:"strings",
      melody:[
        ["G4",1],["R",.5],["D4",.5],["G4",1],["R",.5],["D4",.5],
        ["G4",.5],["D4",.5],["G4",.5],["B4",.5],["D5",2],
        ["C5",1],["R",.5],["A4",.5],["C5",1],["R",.5],["A4",.5],
        ["C5",.5],["A4",.5],["F#4",.5],["A4",.5],["D4",2],
        ["G4",1],["B4",.75],["A4",.25],["G4",1],["B4",.75],["A4",.25],
        ["G4",.5],["G5",1],["F#5",.5],["E5",.5],["E5",1],["C5",.5],
        ["D5",.5],["D5",1],["B4",.5],["A4",.5],["G4",.5],["G4",1],
      ],
      bass:[["G2",2],["G2",2],["G2",2],["G2",2],["C3",2],["C3",2],["D3",2],["D3",2],["G2",2],["G2",2],["C3",2],["D3",2],["G2",2],["D3",2],["G2",2]],
    },
    {
      id:"morning", name:"Morning Mood \u2014 Grieg", bpm:82, moods:["calm"], lead:"triangle",
      melody:[
        ["B4",.5],["G#4",.5],["F#4",.5],["E4",.5],["F#4",.5],["G#4",.5],
        ["B4",.5],["G#4",.5],["F#4",.5],["E4",.5],["F#4",.5],["G#4",.5],
        ["B4",.5],["G#4",.5],["B4",.5],["E5",.5],["B4",.5],["G#4",.5],
        ["B4",.5],["G#4",.5],["F#4",.5],["E4",.5],["F#4",.5],["G#4",.5],
        ["F#4",.5],["G#4",.5],["A4",.5],["B4",.5],["A4",.5],["G#4",.5],
        ["F#4",1.5],["G#4",1.5],["E4",3],
      ],
      bass:[["E2",3],["E2",3],["E2",3],["A2",3],["B2",3],["E2",3]],
    },
    {
      id:"elise", name:"F\u00FCr Elise \u2014 Beethoven", bpm:100, moods:["mid"], lead:"triangle",
      melody:[
        ["E5",.5],["D#5",.5],["E5",.5],["D#5",.5],["E5",.5],["B4",.5],["D5",.5],["C5",.5],
        ["A4",1],["R",.5],["C4",.5],["E4",.5],["A4",.5],
        ["B4",1],["R",.5],["E4",.5],["G#4",.5],["B4",.5],
        ["C5",1],["R",.5],["E4",.5],["E5",.5],["D#5",.5],
        ["E5",.5],["D#5",.5],["E5",.5],["B4",.5],["D5",.5],["C5",.5],
        ["A4",1],["R",.5],["C4",.5],["E4",.5],["A4",.5],
        ["B4",1],["R",.5],["E4",.5],["C5",.5],["B4",.5],["A4",2],
      ],
      bass:[["A2",4],["E2",4],["A2",4],["E2",4],["A2",8]],
    },
    {
      id:"greensleeves", name:"Greensleeves \u2014 traditional", bpm:96, moods:["mid"], lead:"triangle",
      melody:[
        ["A4",1],["C5",1.5],["D5",.5],["E5",1.5],["F5",.5],["E5",1],
        ["D5",1.5],["B4",.5],["G4",1],["A4",1.5],["B4",.5],["C5",1],
        ["A4",1.5],["A4",.5],["G#4",1],["A4",1.5],["B4",.5],["G#4",1],["E4",2],
      ],
      bass:[["A2",4],["G2",4],["A2",4],["E2",2],["A2",2]],
    },
    {
      id:"swan", name:"Swan Lake \u2014 Tchaikovsky", bpm:72, moods:["mid","grief"], lead:"strings",
      melody:[
        ["E5",2],["A4",.5],["B4",.5],["C5",.5],["D5",.5],
        ["E5",2],["A4",.5],["B4",.5],["C5",.5],["D5",.5],
        ["E5",1],["C5",.5],["A4",.5],["E5",1],["C5",.5],["A4",.5],
        ["E5",.5],["D5",.5],["C5",.5],["B4",.5],["A4",2],
        ["A5",2],["G5",.5],["F5",.5],["E5",.5],["D5",.5],
        ["C5",1],["B4",1],["E5",1],["D5",1],["A4",4],
      ],
      bass:[["A2",2],["A2",2],["A2",2],["A2",2],["F2",2],["E2",2],["D2",2],["E2",2],["F2",2],["E2",2],["A2",2],["E2",2],["A2",4]],
    },
    {
      id:"moonlight", name:"Moonlight Sonata \u2014 Beethoven", bpm:56, moods:["mid","grief"], lead:"triangle",
      melody:moonTrips(),
      harmony:[
        ["R",8],
        ["G#4",.75],["G#4",.25],["G#4",4],
        ["G#4",.75],["G#4",.25],["G#4",2],["A4",2],
        ["G#4",.75],["G#4",.25],["F#4",2],["E4",2],["D#4",4],["E4",4],
      ],
      bass:[["C#2",4],["C#2",4],["A1",4],["D2",4],["G#1",4],["C#2",4],["G#1",4],["F#1",4]],
    },
    {
      id:"mountainking", name:"In the Hall of the Mountain King \u2014 Grieg", bpm:112, moods:["tense"], lead:"triangle",
      melody:[
        ["B3",.5],["C#4",.5],["D4",.5],["E4",.5],["F#4",.5],["D4",.5],["F#4",1],
        ["F4",.5],["Db4",.5],["F4",1],["E4",.5],["C4",.5],["E4",1],
        ["B3",.5],["C#4",.5],["D4",.5],["E4",.5],["F#4",.5],["D4",.5],["F#4",.5],["B4",.5],
        ["A4",.5],["F#4",.5],["D4",.5],["F#4",.5],["A4",2],
        ["B4",.5],["C#5",.5],["D5",.5],["E5",.5],["F#5",.5],["D5",.5],["F#5",1],
        ["F5",.5],["Db5",.5],["F5",1],["E5",.5],["C5",.5],["E5",1],
        ["B4",.5],["C#5",.5],["D5",.5],["E5",.5],["F#5",.5],["D5",.5],["F#5",.5],["B5",.5],
        ["A5",.5],["F#5",.5],["D5",.5],["F#5",.5],["A5",2],
      ],
      bass:[["B1",1],["F#2",1],["B1",1],["F#2",1],["B1",1],["F#2",1],["B1",1],["F#2",1]],
    },
    {
      id:"williamtell", name:"William Tell Overture \u2014 Rossini", bpm:132, moods:["tense"], lead:"triangle",
      melody:[
        ["G4",.25],["G4",.25],["G4",.5],["G4",.25],["G4",.25],["G4",.5],
        ["G4",.25],["G4",.25],["G4",.25],["G4",.25],["G4",.5],["R",.5],
        ["C5",.25],["C5",.25],["C5",.5],["C5",.25],["C5",.25],["C5",.5],
        ["C5",.25],["C5",.25],["C5",.25],["C5",.25],["C5",.5],["R",.5],
        ["E5",.25],["E5",.25],["E5",.5],["G5",.25],["G5",.25],["G5",.5],
        ["E5",.25],["C5",.25],["E5",.5],["G5",1],
        ["E5",.25],["E5",.25],["E5",.5],["G5",.25],["G5",.25],["G5",.5],
        ["E5",.25],["C5",.25],["E5",.5],["D5",1],
        ["E5",.25],["F5",.25],["G5",.5],["G5",.25],["F5",.25],["E5",.5],
        ["D5",.25],["E5",.25],["F5",.5],["F5",.25],["E5",.25],["D5",.5],
        ["C5",.25],["D5",.25],["E5",.5],["C5",.5],["G4",.5],["C5",1],
      ],
      bass:[["C2",1],["G2",1],["C2",1],["G2",1],["F2",1],["G2",1],["C2",1],["G2",1]],
    },
    {
      id:"toccata", name:"Toccata in D minor \u2014 Bach", bpm:62, moods:["tense"], lead:"strings",
      melody:[
        ["A5",.25],["G5",.25],["A5",1.5],["R",.5],
        ["G5",.25],["F5",.25],["E5",.25],["D5",.25],["C#5",1],["D5",2],["R",1],
        ["A4",.25],["G4",.25],["A4",1.5],["R",.5],
        ["G4",.25],["F4",.25],["E4",.25],["D4",.25],["C#4",1],["D4",2],["R",1],
        ["A3",.25],["G3",.25],["A3",1.5],["R",.5],
        ["G3",.25],["F3",.25],["E3",.25],["D3",.25],["C#3",1],["D3",3],["R",1],
        ["C#4",.5],["E4",.5],["G4",.5],["A#4",.5],["C#5",.5],["E5",.5],["G5",.5],["A#5",.5],
        ["A5",3],["R",.5],["D5",4],["R",1],
      ],
      bass:[["D2",8],["D2",8],["D2",8],["C#2",4],["D2",4]],
    },
    {
      id:"diesirae", name:"Dies Irae \u2014 plainchant", bpm:82, moods:["tense"], lead:"strings",
      melody:[
        ["A4",1],["G4",1],["A4",1],["F4",1],["G4",1],["E4",1],["F4",1],["D4",2],
        ["F4",1],["F4",1],["E4",1],["D4",1],["E4",1],["C4",1],["D4",2],
        ["A4",1],["A4",1],["G4",1],["F4",1],["E4",1],["F4",1],["D4",2],
      ],
      bass:[["D2",4],["D2",4],["A1",4],["D2",4],["D2",4]],
    },
    {
      id:"lacrimosa", name:"Lacrimosa \u2014 Mozart", bpm:60, moods:["grief","tense"], lead:"strings",
      melody:[
        ["A4",.5],["R",.5],["Bb4",.5],["R",.5],["D5",1],["C5",.5],["Bb4",.5],
        ["Bb4",.5],["A4",.5],["A4",1],["R",1],
        ["F5",1],["E5",.5],["D5",.5],["D5",.5],["C#5",.5],["C#5",1],["R",1],
        ["A5",1.5],["G5",.5],["F5",1],["E5",1],
        ["F5",.5],["E5",.5],["D5",1],["C#5",1],["D5",3],["R",1],
      ],
      bass:[["D2",2],["A2",2],["Bb2",2],["A2",2],["G2",2],["A2",2],["D2",2],["A2",2]],
    },
    {
      id:"funeral", name:"Funeral March \u2014 Chopin", bpm:60, moods:["grief"], lead:"strings",
      melody:[
        ["Bb3",2],["Bb3",1.5],["Bb3",.5],["Bb3",2],["Db4",1.5],["C4",.5],
        ["C4",2],["Bb3",1.5],["Bb3",.5],["Bb3",4],
        ["Db4",2],["F4",1.5],["F4",.5],["Gb4",2],["F4",1.5],["Eb4",.5],
        ["Db4",2],["C4",1.5],["Db4",.5],["Bb3",4],
      ],
      bass:[["Bb1",2],["F2",2],["Bb1",2],["F2",2],["Gb2",2],["F2",2],["Bb1",2],["F2",2]],
    },
  ];

  /* ── Story contexts ──
     pin: piece id to play right now.  loop: keep repeating the pinned piece
     until the context changes; otherwise fall into `pool` when it ends.
     pool: rotate inside a named mood pool.  tension: legacy tension value. */
  const CONTEXTS = {
    dream:       { pin:"air", loop:true,  hold:true },
    bevan_death: { pin:"air", loop:false, pool:"grief", hold:true },
    grief:       { pool:"grief" },
    chase:       { pool:"tense" },
    calm:        { pool:"calm" },
    title:       { tension:0.18 },
    investigate: { tension:0.5 },
    lonely:      { tension:0.62 },
    descent:     { tension:0.92 },
  };

  function moodFor(t){ return t<0.34?"calm":(t<0.67?"mid":"tense"); }
  function byId(id){ for(var i=0;i<PIECES.length;i++)if(PIECES[i].id===id)return PIECES[i]; return null; }
  function pickPiece(mood, avoid){
    var pool=PIECES.filter(function(p){ return p.moods.indexOf(mood)!==-1 && (!avoid||p.id!==avoid); });
    if(!pool.length)pool=PIECES.filter(function(p){ return p.moods.indexOf(mood)!==-1; });
    if(!pool.length)pool=PIECES;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  var current=null, melCursor=0, melTime=0, bassCursor=0, bassTime=0, harmCursor=0, harmTime=0;
  var pinned=null;      /* {id, loop, pool} while a story beat owns the music */
  var activePool=null;  /* named pool override (e.g. 'grief'), else tension rules */
  var hold=false;       /* an explicit story pin owns the music; auto-cues wait */
  var somber=false;     /* set once Bevan dies; calm pools resolve to grief */
  var lastCueKey=null;

  /* ── Music director ──
     cue(text) is called automatically with every section title, room title,
     cutscene title, and drive title. First matching rule wins. Rules match a
     normalized key: uppercased, everything but A-Z0-9 stripped (section
     titles arrive letter-spaced, e.g. "C H A P T E R   3"). Cues steer music
     that is already playing; they never start it, and they never override an
     explicit story pin (hold). */
  const CUE_RULES = [
    { re:/^DRIVE/,                          piece:"nachtmusik",   pool:"mid"   }, /* night drives (before location names match) */
    { re:/ADREAM/,                          piece:"air", loop:true             }, /* the dream */
    { re:/ROOFTOP/,                         piece:"mountainking", pool:"tense" }, /* the chase */
    { re:/RANDOMENCOUNTER/,                 piece:"mountainking", pool:"tense" }, /* street fights */
    { re:/HORSETRACK/,                      piece:"williamtell",  pool:"tense" }, /* the races */
    { re:/BLACKJACK|TAVERN|GUMSHOE/,        piece:"greensleeves", pool:"mid"   }, /* old folk tune for the back room */
    { re:/ARCADE|SNAKE/,                    piece:"nachtmusik",   pool:"calm"  },
    { re:/CRIMESCENE/,                      piece:"diesirae",     pool:"mid"   }, /* day of wrath at the rubble */
    { re:/INTERROGATION|CONVINCINGBEVAN/,   piece:"elise",        pool:"mid"   }, /* cat and mouse */
    { re:/BIGSMILES|INVESTIGATION/,         piece:"moonlight",    pool:"mid"   }, /* sneaking a dark tower at 3 AM */
    { re:/YOURAPARTMENT/,                   piece:"morning",      pool:"calm"  }, /* waking at 3 AM, ironically */
    { re:/BEVANSAPARTMENT/,                 piece:"minuet",       pool:"calm"  },
    { re:/LOBBY|HALLWAY/,                                         pool:"calm"  },
    { re:/PETESSUBS/,                       piece:"gymnopedie",   pool:"calm"  }, /* late-night diner melancholy */
    { re:/CENTRALDUDLEY/,                   piece:"elise",        pool:"mid"   },
    { re:/SECRETENDING|EARLYRETIREMENT/,    piece:"ode",          pool:"calm"  },
    { re:/CHAPTER3|TRIAL|COURT/,            piece:"lacrimosa",    pool:"grief" }, /* a requiem for the trial */
    { re:/EPILOGUE|CORRECTIONAL|PRISON/,    piece:"swan",         pool:"grief" }, /* the cell, and the resolve */
    { re:/ENDOFPARTONE/,                    piece:"ode",          pool:"calm"  }, /* he will return */
    { re:/CHAPTER2END/,                                           pool:"grief" },
    { re:/CHAPTER/,                         tension:0.5                        }, /* chapter cards default to investigate */
  ];
  function cue(text){
    if(!text)return false;
    var key=String(text).toUpperCase().replace(/[^A-Z0-9]/g,"");
    if(!key||key===lastCueKey)return false;
    if(hold)return false;      /* a story beat owns the music right now */
    if(!playing)return false;  /* cues steer, they never start */
    lastCueKey=key;            /* dedupe only cues that were actually considered */
    for(var i=0;i<CUE_RULES.length;i++){
      var r=CUE_RULES[i];
      if(!r.re.test(key))continue;
      if(r.tension!=null){ pinned=null; activePool=null; setTension(r.tension); return true; }
      var pool=r.pool||null;
      if(somber&&pool==="calm")pool="grief"; /* after Bevan, nothing is calm */
      if(r.piece){
        if(current&&current.id===r.piece){ pinned={id:r.piece,loop:!!r.loop,pool:pool}; activePool=pool; return true; }
        playPiece(r.piece,{loop:!!r.loop,pool:pool});
      } else if(pool){
        pinned=null;
        if(activePool!==pool){
          activePool=pool;
          if(current&&current.moods.indexOf(pool)===-1)loadPiece(pickPiece(pool,current.id));
        }
      }
      return true;
    }
    return false;
  }

  function ensure(){
    if(ctx)return true;
    try{
      if(typeof ensureAudio==='function')ensureAudio();
      if(typeof audioCtx!=='undefined'&&audioCtx){ ctx=audioCtx; }
      else { var AC=window.AudioContext||window.webkitAudioContext; if(!AC)return false; ctx=new AC(); }
      master=ctx.createGain(); master.gain.value=0.0001;
      master.connect((window.audioBus&&window.audioBus())||ctx.destination);
      musicBus=ctx.createGain(); musicBus.gain.value=0.9; musicBus.connect(master);
      delay=ctx.createDelay(1.0); delay.delayTime.value=0.34;
      feedback=ctx.createGain(); feedback.gain.value=0.28;
      wet=ctx.createGain(); wet.gain.value=0.22;
      delay.connect(feedback); feedback.connect(delay); delay.connect(wet); wet.connect(musicBus);
      return true;
    }catch(e){ return false; }
  }
  function muteVal(){ try{ if(typeof _muted!=='undefined'&&_muted)return 0.0001; }catch(e){} return Math.max(0.0001, vol*0.3); }

  /* Plucky triangle lead (harpsichord-adjacent). */
  function noteTri(freq,t,dur,level,send){
    var o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    o.type="triangle"; o.frequency.value=freq;
    f.type="lowpass"; f.frequency.value=2200;
    var atk=0.02,rel=Math.min(0.35,dur*0.5);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(level,t+atk);
    g.gain.setValueAtTime(level,t+Math.max(atk,dur-rel));
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(f); f.connect(g); g.connect(musicBus); if(send)g.connect(delay);
    o.start(t); o.stop(t+dur+0.05);
    o.onended=function(){try{o.disconnect();f.disconnect();g.disconnect();}catch(e){}};
  }
  /* Bowed "strings" lead: two detuned saws, dark lowpass, slow attack, vibrato. */
  function noteStr(freq,t,dur,level,send){
    var g=ctx.createGain(),f=ctx.createBiquadFilter();
    f.type="lowpass"; f.frequency.value=1500; f.Q.value=0.6;
    var atk=Math.min(0.18,dur*0.35), rel=Math.min(0.6,dur*0.45);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(level,t+atk);
    g.gain.setValueAtTime(level,t+Math.max(atk,dur-rel));
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.05);
    f.connect(g); g.connect(musicBus); if(send)g.connect(delay);
    var lfo=ctx.createOscillator(),lfoG=ctx.createGain();
    lfo.frequency.value=5.2; lfoG.gain.setValueAtTime(0,t);
    lfoG.gain.linearRampToValueAtTime(freq*0.004,t+Math.min(0.4,dur*0.5));
    lfo.connect(lfoG);
    var oscs=[];
    for(var i=0;i<2;i++){
      var o=ctx.createOscillator();
      o.type="sawtooth"; o.frequency.value=freq*(i?1.0025:0.9975);
      lfoG.connect(o.frequency);
      o.connect(f); o.start(t); o.stop(t+dur+0.1); oscs.push(o);
    }
    lfo.start(t); lfo.stop(t+dur+0.1);
    oscs[0].onended=function(){try{oscs[0].disconnect();oscs[1].disconnect();lfo.disconnect();lfoG.disconnect();f.disconnect();g.disconnect();}catch(e){}};
  }
  function note(freq,t,dur,level,send){
    if(!freq)return;
    if(current&&current.lead==="strings")noteStr(freq,t,dur,level*0.9,send);
    else noteTri(freq,t,dur,level,send);
  }
  function harmNote(freq,t,dur){ if(!freq)return; if(current&&current.lead==="strings")noteStr(freq,t,dur,0.05,false); else noteTri(freq,t,dur,0.055,false); }
  function bassNote(freq,t,dur){
    if(!freq)return;
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type="sine"; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.09,t+0.05);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t+dur+0.05);
    o.onended=function(){try{o.disconnect();g.disconnect();}catch(e){}};
  }

  function loadPiece(p){ current=p; melCursor=0; bassCursor=0; harmCursor=0; melTime=ctx.currentTime+0.15; bassTime=melTime; harmTime=melTime; }
  function nextPiece(){
    if(pinned){
      if(pinned.loop)return byId(pinned.id)||current;
      var pool=pinned.pool; pinned=null;
      if(pool){ activePool=pool; return pickPiece(pool,current?current.id:null); }
    }
    var mood=activePool||moodFor(tensionNow);
    if(activePool)return pickPiece(activePool,current?current.id:null);
    return (current&&current.moods.indexOf(mood)!==-1)?current:pickPiece(mood,null);
  }
  function loop(){
    if(!playing)return;
    tensionNow += (tension-tensionNow)*0.05;
    if(master){ try{ master.gain.setTargetAtTime(muteVal(),ctx.currentTime,0.1); }catch(e){} }
    var beat=60/current.bpm, horizon=ctx.currentTime+0.2;
    while(melTime<horizon){
      var mc=current.melody[melCursor];
      note(freqOf(mc[0]),melTime,mc[1]*beat*0.96,0.13,true);
      melTime+=mc[1]*beat; melCursor++;
      if(melCursor>=current.melody.length){
        var next=nextPiece(); var restart=melTime;
        current=next; melCursor=0; bassCursor=0; harmCursor=0;
        melTime=restart; bassTime=restart; harmTime=restart;
      }
    }
    while(bassTime<horizon){
      if(current.bass&&current.bass.length){
        var bc=current.bass[bassCursor%current.bass.length];
        bassNote(freqOf(bc[0]),bassTime,bc[1]*beat*0.98);
        bassTime+=bc[1]*beat; bassCursor++;
        if(bassCursor>=current.bass.length)bassCursor=0;
      } else if(current.pedal){
        bassNote(freqOf(current.pedal),bassTime,beat*4); bassTime+=beat*4;
      } else { bassTime+=beat*4; }
    }
    while(harmTime<horizon){
      if(current.harmony&&current.harmony.length){
        var hc=current.harmony[harmCursor%current.harmony.length];
        harmNote(freqOf(hc[0]),harmTime,hc[1]*beat*0.97);
        harmTime+=hc[1]*beat; harmCursor++;
        if(harmCursor>=current.harmony.length)harmCursor=0;
      } else { harmTime+=beat*4; }
    }
    schedId=setTimeout(loop,45);
  }
  function start(){
    if(!ensure())return;
    try{ if(ctx.state==="suspended")ctx.resume(); }catch(e){}
    if(playing)return;
    playing=true;
    var first=pinned?(byId(pinned.id)||pickPiece(moodFor(tensionNow),null)):pickPiece(activePool||moodFor(tensionNow),null);
    loadPiece(first); loop();
  }
  function stop(){
    playing=false;
    if(schedId)clearTimeout(schedId); schedId=null;
    if(master){ try{ master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.0001,ctx.currentTime,0.3); }catch(e){} }
  }
  function setTension(v){ tension=Math.max(0,Math.min(1,v)); }
  function setVolume(v){ vol=Math.max(0,Math.min(1,v)); if(master){ try{ master.gain.setTargetAtTime(muteVal(),ctx.currentTime,0.05); }catch(e){} } }
  function playPiece(id,opts){
    opts=opts||{};
    var p=byId(id); if(!p)return false;
    pinned={ id:id, loop:!!opts.loop, pool:opts.pool||null };
    activePool=opts.pool||null;
    if(playing&&ctx){ loadPiece(p); } /* switch immediately mid-piece */
    return true;
  }
  function setContext(name){
    hold=false;                       /* explicit story calls always take over */
    lastCueKey=null;
    if(name==="title")somber=false;   /* new game: the grief lifts */
    if(name==="bevan_death")somber=true;
    var c=CONTEXTS[name];
    if(!c){ pinned=null; activePool=null; setTension(0.4); return false; }
    if(c.tension!=null)setTension(c.tension);
    if(c.pin){ playPiece(c.pin,{loop:!!c.loop,pool:c.pool||null}); if(c.hold)hold=true; return true; }
    pinned=null; activePool=c.pool||null;
    if(activePool&&playing&&ctx&&current&&current.moods.indexOf(activePool)===-1){
      loadPiece(pickPiece(activePool,current.id));
    }
    return true;
  }
  window.ClassicalMusic={
    start:start, stop:stop, setTension:setTension, setVolume:setVolume,
    setContext:setContext, playPiece:playPiece, cue:cue,
    nowPlaying:function(){return current?current.name:"";},
    repertoire:function(){return PIECES.map(function(p){return p.name;});},
  };
})();
