/* ============================================================================
   CLIVEMAN - engine/voice.js  (v2)
   Character voice + dialogue color engine.

   VOICES (Web Speech API):
   Every speaking character is cast with a REAL, UNIQUE system voice — not
   the browser default. The engine:
     1. Waits for the async voice list (Chrome delivers it late; v1 cached
        null assignments forever, which is why everyone sounded like the
        default reader — fixed: assignments are invalidated whenever the
        pool changes).
     2. Quality-scores every installed voice (natural/neural/Google/premium
        voices float up; espeak robots and macOS novelty voices like Bahh,
        Bells, Zarvox sink and are excluded when enough real voices exist).
     3. Gender-casts: each character declares g:'m'|'f'; voices are gender-
        detected by name and matched.
     4. Guarantees uniqueness: a system voice is never given to a second
        character until every other eligible voice is taken. If the pool is
        smaller than the cast, reused voices get an automatic pitch offset
        (+/-0.10, +/-0.20, ...) so two characters NEVER sound identical.
     5. Layers each character's tuned pitch/rate on top.
   Unknown characters get a deterministic hash-derived profile: distinct,
   and the same every time they speak.

   COLORS:
   window.CHAR_COLOR(lineOrName) returns the character's dialogue color.
   Cliveman keeps the signature amber; every other character has a distinct
   phosphor-friendly hue. Unknown names hash to a hue that steers clear of
   the amber band, so no one is ever confused with Cliveman.

   Zero dependencies, no network, no audio files. If speechSynthesis is
   unavailable (old browsers, jsdom) speech no-ops silently; colors still
   work. Toggle persists to localStorage ('cliveman_voice').
   ========================================================================== */
(function(){
'use strict';
if(typeof window==='undefined')return;

var SUPPORTED=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance);

/* ---- the cast ----------------------------------------------------------
   p = pitch (0..2), r = rate (0.1..10), g = gender preference ('m'/'f'),
   vi = deterministic spread index among equally-eligible voices,
   c = dialogue color (omit for narrator: narration keeps its own class). */
var CAST={
  '__narrator'        :{p:0.90,r:1.02,g:'m',vi:0},
  'cliveman'          :{p:0.72,r:0.97,g:'m',vi:1,c:'#ffb000'}, /* signature amber */
  'bevan'             :{p:0.58,r:0.82,g:'m',vi:2,c:'#58b7ff'}, /* deep, slow, four whiskeys */
  'detective bevan'   :'bevan',
  'mechanic'          :{p:0.88,r:1.08,g:'m',vi:3,c:'#ff8a4d'},
  'clemons'           :{p:0.66,r:0.90,g:'m',vi:4,c:'#e05ce0'},
  'clemons dee tubley':'clemons',
  'tubley'            :'clemons',
  'linda'             :{p:1.12,r:0.94,g:'f',vi:5,c:'#ff9ad5'}, /* dead-eyed counter girl */
  'officer reyes'     :{p:1.02,r:1.06,g:'f',vi:6,c:'#4dd9d9'},
  'reyes'             :'officer reyes',
  'desk clerk'        :{p:1.04,r:0.76,g:'m',vi:7,c:'#a9c3b2'}, /* dead-inside monotone */
  'suspect'           :{p:1.30,r:1.18,g:'m',vi:8,c:'#c8f05a'}, /* panicky kid */
  'worker'            :{p:0.84,r:1.00,g:'m',vi:9,c:'#9fb8c8'},
  'teen'              :{p:1.34,r:1.12,g:'m',vi:10,c:'#7ddf8e'},
  'public defender'   :{p:1.00,r:1.20,g:'f',vi:11,c:'#b48cff'},
  'judge'             :{p:0.62,r:0.84,g:'m',vi:12,c:'#e8f4ea'},
  'fat mustached guy' :{p:0.70,r:0.92,g:'m',vi:13,c:'#ff5c5c'},
  'dealer'            :{p:0.94,r:1.04,g:'m',vi:14,c:'#35e0a1'},
  'bystander'         :{p:1.08,r:1.02,g:'f',vi:15,c:'#96a8ff'},
  /* Part Two roster (safe to pre-cast) */
  'hollis'            :{p:0.96,r:1.16,g:'m',vi:16,c:'#d78cff'}, /* fast-talking lawyer */
  'mr. sun'           :{p:0.78,r:0.86,g:'m',vi:17,c:'#ff4040'},
  'russell pyne'      :{p:1.10,r:1.05,g:'m',vi:18,c:'#49c9a8'},
  'pyne'              :'russell pyne',
  'guard'             :{p:0.70,r:0.95,g:'m',vi:19,c:'#8ea3ad'},
  'pete'              :{p:0.82,r:1.00,g:'m',vi:20,c:'#e0b96b'}
};
function castOf(name){
  var e=CAST[name];
  if(typeof e==='string')e=CAST[e];   /* alias hop */
  return e||null;
}

/* deterministic profile + color for anyone not in the cast */
function _hash(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*16777619)>>>0;}return h;}
function _hslHex(h,s,l){
  s/=100;l/=100;
  var f=function(n){var k=(n+h/30)%12;var c=l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,9-k,1));
    return('0'+Math.round(255*c).toString(16)).slice(-2);};
  return '#'+f(0)+f(8)+f(4);
}
function profileFor(name){
  var e=castOf(name);
  if(e)return e;
  var h=_hash(name);
  /* hue wheel restricted to 75..330 degrees: never lands in Cliveman's amber band */
  var prof={p:0.70+((h%60)/100),          /* 0.70 .. 1.29 */
            r:0.88+(((h>>>6)%25)/100),    /* 0.88 .. 1.12 */
            g:((h>>>4)%2)?'f':'m',
            vi:(h>>>3)%32,
            c:_hslHex(75+((h>>>8)%256),90,68)};
  CAST[name]=prof;                        /* stable for the whole session */
  return prof;
}

/* ---- system voice pool: quality-scored, gender-tagged ------------------ */
var _pool=null,_poolLang=null,_assign={},_useCount={};
var LANG_PREFIX={en:'en',fr:'fr',es:'es',zh:'zh',pt:'pt',ru:'ru',hi:'hi',ar:'ar'};
var FEM=/female|woman|samantha|victoria|karen|zira|susan|hazel|fiona|moira|tessa|serena|allison|ava\b|kate|kathy|vicki|veena|catherine|monica|paulina|anna|nora|yuna|aria|jenny|michelle|sonia|natasha|hayley|libby|clara|emma|olivia|salli|kimberly|ivy\b|joanna|kendra|amelie|zosia|milena|laura|lekha|kyoko|mei-jia|sinji|martha|susan/i;
var MASC=/\bmale\b|\bman\b|daniel|david|mark\b|alex\b|fred|tom\b|george|oliver|aaron|arthur|gordon|james|rishi|guy\b|davis|tony|jason|ryan|thomas|william|matthew|justin|joey|brian|russell|diego|jorge|juan|xander|lee\b|luca|maged|yuri|ralph|albert/i;
var NOVELTY=/albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|shelley|flo\b|eddy\b|reed\b|rocko|sandy\b|junior|kathy\b/i;
function _gender(v){
  var n=(v.name||'')+' '+(v.voiceURI||'');
  if(FEM.test(n))return 'f';
  if(MASC.test(n))return 'm';
  return null;
}
function _score(v){
  var n=((v.name||'')+' '+(v.voiceURI||'')).toLowerCase(),s=0;
  if(/natural|neural/.test(n))s+=16;
  if(/premium|enhanced/.test(n))s+=8;
  if(/google/.test(n))s+=6;
  if(/siri/.test(n))s+=5;
  if(/online/.test(n))s+=3;
  if(v.localService)s+=1;
  if(/espeak|compact/.test(n))s-=10;
  if(NOVELTY.test(n))s-=25;
  return s;
}
function _voicePool(){
  var lang=LANG_PREFIX[window._lang||'en']||'en';
  if(_pool&&_poolLang===lang)return _pool;
  var all=[];try{all=window.speechSynthesis.getVoices()||[];}catch(e){}
  var match=[],seen={},i,v;
  for(i=0;i<all.length;i++){v=all[i];
    if((v.lang||'').toLowerCase().indexOf(lang)!==0)continue;
    var key=v.voiceURI||v.name;if(seen[key])continue;seen[key]=1;
    match.push(v);}
  if(!match.length)match=all;             /* no lang match: any voice beats none */
  match.sort(function(a,b){return _score(b)-_score(a);});
  /* drop robot/novelty junk when enough real voices exist */
  var good=match.filter(function(v){return _score(v)>=0;});
  if(good.length>=4)match=good;
  _pool=match;_poolLang=lang;
  _assign={};_useCount={};                /* CRITICAL: recast everyone on pool change */
  return _pool;
}
if(SUPPORTED){
  var _onvc=function(){_pool=null;};      /* next say() rebuilds + recasts */
  try{window.speechSynthesis.addEventListener('voiceschanged',_onvc);}
  catch(e){try{window.speechSynthesis.onvoiceschanged=_onvc;}catch(e2){}}
  try{window.speechSynthesis.getVoices();}catch(e3){}  /* warm the async list */
}

/* Unique casting: prefer right gender, then never-used voices, then quality.
   vi spreads equally-eligible characters across different voices. Returns
   {v, dp} where dp is a pitch offset applied when a voice HAD to be reused. */
function voiceFor(name,prof){
  var pool=_voicePool();                  /* may invalidate _assign */
  var a=_assign[name];
  if(a&&a.pool===pool)return a;
  if(!pool.length){a={v:null,dp:0,pool:pool};_assign[name]=a;return a;}
  var want=prof.g||null,i,v,keys=[],minKey=Infinity;
  for(i=0;i<pool.length;i++){v=pool[i];
    var g=_gender(v);
    var wrong=(want&&g&&g!==want)?1:0;
    var used=_useCount[v.voiceURI||v.name]||0;
    var key=used*1000+wrong;              /* an UNUSED voice always wins;
                                             gender preference breaks ties */
    keys.push(key);
    if(key<minKey)minKey=key;
  }
  var best=[];                            /* min-group members, quality order */
  for(i=0;i<pool.length;i++)if(keys[i]===minKey)best.push(pool[i]);
  v=best[prof.vi%best.length];
  var uk=v.voiceURI||v.name;
  var n=_useCount[uk]||0;_useCount[uk]=n+1;
  /* reused voice: shove pitch so the two characters still sound distinct */
  var dp=n===0?0:(n%2?1:-1)*0.10*Math.ceil(n/2);
  a={v:v,dp:dp,pool:pool};_assign[name]=a;
  return a;
}

/* ---- line parsing / cleaning -------------------------------------------- */
/* speaker lines look like:  Cliveman: "..."   Detective Bevan: "..."       */
var SPEAKER_RE=window.CLIVE_SPEAKER_RE||/^\s*([^:"：]{2,30})[:：]\s*/;
function normName(raw){return raw.toLowerCase().replace(/\s+/g,' ').trim();}
function speakerOf(text,cls){
  if(cls==='narration')return '__narrator';
  if(cls!=='speaker')return null;         /* sys/err/dim/credits stay silent */
  var m=SPEAKER_RE.exec(text);
  if(!m)return '__narrator';              /* quoted line with no name tag    */
  var name=normName(m[1]);
  if(castOf(name))return name;
  var last=name.split(' ').pop();         /* 'detective sergeant bevan' -> 'bevan' */
  if(castOf(last))return last;
  return name;
}
function cleanForSpeech(text,isSpeaker){
  var t=String(text);
  if(isSpeaker)t=t.replace(SPEAKER_RE,'');
  t=t.replace(/\[[^\]]*\]/g,' ');         /* [NOTE: ...] [spoken backwards]  */
  t=t.replace(/\*[^*]{0,80}\*/g,' ');     /* *stage directions*              */
  t=t.replace(/["\u201C\u201D\u00AB\u00BB\u201E\u2039\u203A]/g,' ');
  t=t.replace(/[<>=_|\\\/#~^{}]+/g,' ');  /* terminal decoration             */
  t=t.replace(/\s+/g,' ').trim();
  return t;
}
/* split long text at sentence-ish boundaries so Chrome never stalls */
function chunks(t){
  var out=[],cur='';
  var parts=t.split(/([.!?]+\s+)/);
  for(var i=0;i<parts.length;i++){
    cur+=parts[i];
    if(cur.length>150&&/[.!?]\s*$/.test(cur)){out.push(cur.trim());cur='';}
  }
  if(cur.trim())out.push(cur.trim());
  if(!out.length&&t)out.push(t);
  /* hard-split anything still monstrous */
  var fin=[];
  for(var j=0;j<out.length;j++){var c=out[j];
    while(c.length>220){var cut=c.lastIndexOf(' ',220);if(cut<40)cut=220;fin.push(c.slice(0,cut));c=c.slice(cut);}
    if(c)fin.push(c);}
  return fin;
}

/* ---- dialogue color registry -------------------------------------------- */
/* Accepts a full speaker line ('Bevan: "..."') or a bare name. Returns a
   hex color, or null for narration / non-speaker text.                     */
window.CHAR_COLOR=function(input){
  if(!input)return null;
  var name;
  var m=SPEAKER_RE.exec(input);
  if(m)name=normName(m[1]);
  else{
    /* No 'Name:' tag. speakerOf() calls this narration (Cliveman's internal
       monologue), so there is no character color - the line keeps its own
       class. Previously the WHOLE sentence was hashed into a name, minting a
       different random hue for every untagged line. Only accept input that
       could actually be a bare name (same shape SPEAKER_RE accepts). */
    var bare=String(input).trim();
    if(bare.length<2||bare.length>30||/["\u201C\u201D]/.test(bare))return null;
    name=normName(bare);
  }
  if(!name||name==='__narrator')return null;
  if(!castOf(name)){
    var last=name.split(' ').pop();
    if(castOf(last))name=last;
  }
  var prof=profileFor(name);
  return prof.c||null;
};

/* ---- engine -------------------------------------------------------------- */
var VOICE={supported:SUPPORTED};
VOICE.enabled=(function(){
  if(!SUPPORTED)return false;
  try{return localStorage.getItem('cliveman_voice')!=='0';}catch(e){return true;}
})();

var _pending=0,_beat=null;
function _heartbeat(on){
  /* Chrome quietly pauses long speech after ~15s; poke it while busy */
  if(on&&!_beat){_beat=setInterval(function(){
    try{var s=window.speechSynthesis;
      if(s.speaking&&!s.paused){s.pause();s.resume();}}catch(e){}
  },9000);}
  else if(!on&&_beat){clearInterval(_beat);_beat=null;}
}

VOICE.say=function(text,cls){
  if(!SUPPORTED||!VOICE.enabled)return;
  if(typeof isMuted==='function'&&isMuted())return;
  var who=speakerOf(text,cls);
  if(!who)return;
  var clean=cleanForSpeech(text,cls==='speaker');
  if(clean.length<2)return;
  var prof=profileFor(who),cast=voiceFor(who,prof);
  var pitch=Math.max(0.1,Math.min(2,prof.p+(cast.dp||0)));
  /* never let a backlog build: if the player is racing ahead, clear it */
  if(_pending>=5){VOICE.stop();}
  var cs=chunks(clean);
  for(var i=0;i<cs.length;i++){
    try{
      var u=new SpeechSynthesisUtterance(cs[i]);
      if(cast.v)u.voice=cast.v;
      u.pitch=pitch;u.rate=prof.r;u.volume=0.95;
      u.onend=u.onerror=function(){_pending=Math.max(0,_pending-1);if(_pending===0)_heartbeat(false);};
      _pending++;window.speechSynthesis.speak(u);
    }catch(e){_pending=Math.max(0,_pending-1);}
  }
  if(_pending>0)_heartbeat(true);
};

VOICE.stop=function(){
  if(!SUPPORTED)return;
  try{window.speechSynthesis.cancel();}catch(e){}
  _pending=0;_heartbeat(false);
};

VOICE.toggle=function(){
  if(!SUPPORTED)return false;
  VOICE.enabled=!VOICE.enabled;
  try{localStorage.setItem('cliveman_voice',VOICE.enabled?'1':'0');}catch(e){}
  if(!VOICE.enabled)VOICE.stop();
  else VOICE.say('Cliveman: "Voice. On."','speaker');
  return VOICE.enabled;
};

/* exposed for debugging / tests */
VOICE._speakerOf=speakerOf;
VOICE._profileFor=profileFor;
VOICE._voiceFor=voiceFor;

window.VOICE=VOICE;
})();
