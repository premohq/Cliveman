/* ============================================================================
   CLIVEMAN - engine/story-art.js
   Scene illustrations for the story dialogue box. The whole story is told in
   the terminal's dialogue box (#screen); the blank space above it (#storyArt)
   shows a green-phosphor SVG of the current scene, plus the character figure
   (CHAR_ART_DEFS) layered on top when a character takes the stage.

   Replaces engine/cinema.js (the fullscreen cutscene stage, retired in 1.9.0).

   API:
     STORYART.hint(title)   keyword-match a section title -> scene key (or null)
     STORYART.set(key)      show a scene illustration ('city','apartment',...)
     STORYART.raw(svg)      show an arbitrary SVG string (e.g. the title logo)
     STORYART.char(kind,fx) put a CHAR_ART_DEFS figure on top of the scene
     STORYART.clearChar()   remove the character figure (scene stays)
     STORYART.clear()       remove scene + character

   All calls are safe no-ops before DOM ready / when #storyArt is absent.
   ========================================================================== */
(function(){
'use strict';
if(typeof window==='undefined')return;

var GREEN='#33ff66', DIM='#1a8033', BRIGHT='#7dff9a', AMBER='#ffb000';

/* shared wrapper: glow filter + scanlines, matching CHAR_ART_DEFS styling */
function doc(inner, extra){
  extra = extra || '';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" class="scene-svg" preserveAspectRatio="xMidYMid meet">'
    + '<defs>'
    + '<filter id="scGlow" x="-20%" y="-20%" width="140%" height="140%">'
    + '<feGaussianBlur stdDeviation="1.4" result="b"/>'
    + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
    + '</filter>'
    + '<pattern id="scScan" width="3" height="3" patternUnits="userSpaceOnUse">'
    + '<rect width="3" height="3" fill="rgba(0,0,0,0)"/><rect width="3" height="1" y="2" fill="rgba(0,0,0,0.35)"/>'
    + '</pattern>'
    + '<radialGradient id="scVig" cx="50%" cy="45%" r="72%">'
    + '<stop offset="60%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.65)"/>'
    + '</radialGradient>'
    + '</defs>'
    + '<g filter="url(#scGlow)" fill="none" stroke="'+GREEN+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + inner
    + '</g>'
    + extra
    + '<rect width="640" height="360" fill="url(#scVig)"/>'
    + '<rect width="640" height="360" fill="url(#scScan)" opacity="0.5"/>'
    + '</svg>';
}
/* raster scene: same 640x360 frame, vignette + scanlines as doc(); images live in
   assets/scenes/ as small pixelated JPEGs (~320x180) and register in SCENE_IMG_DEFS */
function imgDoc(src){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" class="scene-svg" preserveAspectRatio="xMidYMid meet">'
    + '<defs>'
    + '<pattern id="scScanI" width="3" height="3" patternUnits="userSpaceOnUse">'
    + '<rect width="3" height="3" fill="rgba(0,0,0,0)"/><rect width="3" height="1" y="2" fill="rgba(0,0,0,0.35)"/>'
    + '</pattern>'
    + '<radialGradient id="scVigI" cx="50%" cy="45%" r="72%">'
    + '<stop offset="60%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.65)"/>'
    + '</radialGradient>'
    + '</defs>'
    + '<image href="'+src+'" x="0" y="0" width="640" height="360" preserveAspectRatio="xMidYMid slice" style="image-rendering:pixelated"/>'
    + '<rect width="640" height="360" fill="url(#scVigI)"/>'
    + '<rect width="640" height="360" fill="url(#scScanI)" opacity="0.5"/>'
    + '</svg>';
}
/* scene key -> raster asset; takes precedence over SCENE_ART_DEFS in set() */
var SCENE_IMG_DEFS={
  dream:'assets/scenes/dream.jpg',
  collision:'assets/scenes/collision.jpg'
};
/* helpers */
function rainLines(n,seed){
  var s='',x=seed||13;
  for(var i=0;i<n;i++){
    x=(x*167+43)%617;var y=(x*89+i*31)%300;
    s+='<line x1="'+(x+12)+'" y1="'+y+'" x2="'+(x)+'" y2="'+(y+26)+'" stroke="'+DIM+'" stroke-width="1.4" opacity="0.55"/>';
  }
  return s;
}
function winRow(bx,by,bw,bh){
  var s='',wx,wy;
  for(wy=by+10;wy<by+bh-12;wy+=22){for(wx=bx+8;wx<bx+bw-10;wx+=16){
    var lit=((wx*7+wy*13)%17)<4;
    s+='<rect x="'+wx+'" y="'+wy+'" width="6" height="9" fill="'+(lit?AMBER:'none')+'" stroke="'+DIM+'" stroke-width="1" opacity="'+(lit?0.9:0.5)+'"/>';
  }}
  return s;
}

var SCENE_ART_DEFS={

/* night skyline over Dudley: chapter cards, city beats */
city: doc(
  '<circle cx="512" cy="64" r="30" stroke="'+BRIGHT+'"/>'
 +'<path d="M494 52 q18 -12 36 0" stroke-width="1.2" opacity="0.6"/>'
 +'<rect x="30"  y="150" width="86"  height="180"/>'
 +'<rect x="132" y="96"  width="96"  height="234"/>'
 +'<rect x="244" y="176" width="70"  height="154"/>'
 +'<rect x="330" y="120" width="104" height="210"/>'
 +'<rect x="450" y="196" width="64"  height="134"/>'
 +'<rect x="528" y="140" width="84"  height="190"/>'
 +'<line x1="180" y1="96" x2="180" y2="70"/><circle cx="180" cy="66" r="3" fill="'+AMBER+'" stroke="none"/>'
 +'<line x1="382" y1="120" x2="382" y2="92"/>'
 +'<line x1="10" y1="330" x2="630" y2="330"/>',
  (function(){return winRow(30,150,86,180)+winRow(132,96,96,234)+winRow(244,176,70,154)
    +winRow(330,120,104,210)+winRow(450,196,64,134)+winRow(528,140,84,190)+rainLines(26,29);})()
),

/* a dim room with venetian blinds: apartments, offices, interrogations */
apartment: doc(
  '<rect x="200" y="52" width="240" height="176"/>'
 +(function(){var s='';for(var i=0;i<8;i++){var y=64+i*21;
    s+='<line x1="206" y1="'+y+'" x2="434" y2="'+y+'" stroke-width="7" stroke="'+DIM+'" opacity="0.85"/>';
    s+='<line x1="206" y1="'+(y-5)+'" x2="434" y2="'+(y-5)+'" stroke-width="1" stroke="'+BRIGHT+'" opacity="0.5"/>';}
    return s;})()
 +'<line x1="320" y1="52" x2="320" y2="40"/><line x1="292" y1="40" x2="348" y2="40"/>'
 +'<line x1="96" y1="0" x2="96" y2="66"/>'
 +'<path d="M84 66 h24 l8 18 h-40 z" fill="rgba(255,176,0,0.10)" stroke="'+AMBER+'"/>'
 +'<path d="M56 260 L136 320 M136 260 L56 320" stroke-width="1" opacity="0.35"/>'
 +'<rect x="472" y="238" width="130" height="12"/>'
 +'<line x1="484" y1="250" x2="478" y2="330"/><line x1="590" y1="250" x2="596" y2="330"/>'
 +'<rect x="506" y="206" width="14" height="32"/><rect x="503" y="200" width="20" height="6" fill="'+DIM+'" stroke="none"/>'
 +'<line x1="10" y1="330" x2="630" y2="330"/>',
  '<path d="M96 84 L20 330 h152 z" fill="rgba(255,220,140,0.07)" stroke="none"/>'
),

/* Big Smiles Mayo Corp HQ */
factory: doc(
  '<rect x="236" y="60" width="168" height="270"/>'
 +'<rect x="60" y="220" width="150" height="110"/>'
 +'<rect x="430" y="240" width="150" height="90"/>'
 +'<rect x="96" y="150" width="26" height="70"/>'
 +'<path d="M100 142 q10 -16 22 -6 q14 -14 20 4" stroke-width="1.4" opacity="0.6"/>'
 +'<circle cx="320" cy="118" r="34" stroke="'+AMBER+'"/>'
 +'<circle cx="308" cy="110" r="3" fill="'+AMBER+'" stroke="none"/>'
 +'<circle cx="332" cy="110" r="3" fill="'+AMBER+'" stroke="none"/>'
 +'<path d="M304 128 q16 14 32 0" stroke="'+AMBER+'"/>'
 +'<rect x="262" y="170" width="116" height="26" stroke="'+AMBER+'"/>'
 +'<rect x="300" y="286" width="40" height="44"/>'
 +'<ellipse cx="120" cy="292" rx="26" ry="10"/><rect x="94" y="252" width="52" height="40"/>'
 +'<ellipse cx="120" cy="252" rx="26" ry="10"/>'
 +'<ellipse cx="500" cy="296" rx="26" ry="10"/><rect x="474" y="256" width="52" height="40"/>'
 +'<ellipse cx="500" cy="256" rx="26" ry="10"/>'
 +'<line x1="10" y1="330" x2="630" y2="330"/>',
  '<text x="320" y="188" text-anchor="middle" fill="'+AMBER+'" stroke="none" font-family="monospace" font-size="17" letter-spacing="3">BIG SMILES</text>'
 +winRow(240,210,160,110)+rainLines(14,7)
),

/* the rooftop chase */
rooftop: doc(
  '<line x1="0" y1="252" x2="380" y2="252"/>'
 +'<rect x="0" y="252" width="380" height="16" fill="rgba(51,255,102,0.06)" stroke="none"/>'
 +'<line x1="380" y1="252" x2="380" y2="330"/>'
 +'<rect x="60" y="212" width="46" height="40"/><line x1="60" y1="212" x2="106" y2="212"/>'
 +'<rect x="150" y="228" width="20" height="24"/><ellipse cx="160" cy="228" rx="10" ry="4"/>'
 +'<rect x="440" y="276" width="200" height="54"/>'
 +'<rect x="470" y="120" width="60" height="90" stroke="'+DIM+'"/>'
 +'<rect x="560" y="90"  width="70" height="120" stroke="'+DIM+'"/>'
 +'<rect x="404" y="150" width="44" height="60" stroke="'+DIM+'"/>'
 +'<path d="M520 20 l-16 30 h12 l-20 34" stroke="'+AMBER+'" stroke-width="2.4"/>',
  winRow(470,120,60,90)+winRow(560,90,70,120)+rainLines(34,3)
),

/* lamplit street with the Buick */
street: doc(
  '<line x1="10" y1="300" x2="630" y2="300"/>'
 +'<line x1="150" y1="300" x2="150" y2="70"/>'
 +'<path d="M150 70 h56"/><path d="M206 70 q10 0 10 12" /><circle cx="216" cy="88" r="6" fill="'+AMBER+'" stroke="'+AMBER+'"/>'
 +'<path d="M330 300 v-26 q0 -14 16 -14 h30 l22 -22 h74 l20 22 h34 q16 0 16 14 v26 z"/>'
 +'<circle cx="390" cy="300" r="17"/><circle cx="390" cy="300" r="7"/>'
 +'<circle cx="496" cy="300" r="17"/><circle cx="496" cy="300" r="7"/>'
 +'<line x1="384" y1="262" x2="384" y2="238"/><line x1="452" y1="262" x2="452" y2="238"/>'
 +'<circle cx="543" cy="278" r="4" fill="'+AMBER+'" stroke="none"/>'
 +'<line x1="60" y1="316" x2="120" y2="316" stroke-width="1" opacity="0.4"/>'
 +'<line x1="200" y1="322" x2="300" y2="322" stroke-width="1" opacity="0.35"/>'
 +'<line x1="470" y1="322" x2="560" y2="322" stroke-width="1" opacity="0.3"/>',
  '<path d="M216 94 L156 300 h120 z" fill="rgba(255,220,140,0.08)" stroke="none"/>'+rainLines(24,17)
),

/* Pete's Subs (the sign reads PE E'S UBS) */
diner: doc(
  '<rect x="120" y="40" width="400" height="64"/>'
 +'<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<path d="M60 250 h520" /><path d="M60 250 v80 M580 250 v80"/>'
 +'<line x1="60" y1="268" x2="580" y2="268" stroke-width="1" opacity="0.5"/>'
 +'<line x1="170" y1="330" x2="170" y2="290"/><ellipse cx="170" cy="286" rx="18" ry="6"/>'
 +'<line x1="320" y1="330" x2="320" y2="290"/><ellipse cx="320" cy="286" rx="18" ry="6"/>'
 +'<line x1="470" y1="330" x2="470" y2="290"/><ellipse cx="470" cy="286" rx="18" ry="6"/>'
 +'<rect x="150" y="150" width="120" height="70" stroke="'+DIM+'"/>'
 +'<line x1="158" y1="166" x2="262" y2="166" stroke="'+DIM+'" stroke-width="1"/>'
 +'<line x1="158" y1="182" x2="262" y2="182" stroke="'+DIM+'" stroke-width="1"/>'
 +'<line x1="158" y1="198" x2="240" y2="198" stroke="'+DIM+'" stroke-width="1"/>'
 +'<path d="M380 226 q40 -22 80 0 l-6 10 q-34 -16 -68 0 z" stroke="'+AMBER+'"/>'
 ,
  '<text x="320" y="84" text-anchor="middle" fill="'+AMBER+'" stroke="none" font-family="monospace" font-size="30" letter-spacing="6">PE E\'S  UBS</text>'
 +'<text x="210" y="144" fill="'+GREEN+'" stroke="none" font-family="monospace" font-size="12" opacity="0.7" text-anchor="middle">MENU</text>'
),

/* the courtroom */
court: doc(
  '<rect x="200" y="140" width="240" height="90"/>'
 +'<path d="M200 140 h240 l-14 -20 h-212 z"/>'
 +'<rect x="292" y="70" width="56" height="50" stroke="'+DIM+'"/>'
 +'<circle cx="320" cy="95" r="12" stroke="'+DIM+'"/>'
 +'<path d="M474 160 l30 -18 M492 132 l-6 40" stroke-width="5" stroke="'+AMBER+'"/>'
 +'<circle cx="507" cy="128" r="6" stroke="'+AMBER+'"/>'
 +'<line x1="130" y1="96" x2="130" y2="180"/>'
 +'<line x1="98" y1="112" x2="162" y2="112"/>'
 +'<path d="M98 112 l-8 26 h16 z M162 112 l-8 26 h16 z"/>'
 +'<rect x="60" y="240" width="200" height="30"/><rect x="380" y="240" width="200" height="30"/>'
 +'<line x1="60" y1="270" x2="60" y2="330"/><line x1="260" y1="270" x2="260" y2="330"/>'
 +'<line x1="380" y1="270" x2="380" y2="330"/><line x1="580" y1="270" x2="580" y2="330"/>'
 +'<line x1="10" y1="330" x2="630" y2="330"/>',
  '<text x="320" y="200" text-anchor="middle" fill="'+GREEN+'" stroke="none" font-family="monospace" font-size="13" letter-spacing="2" opacity="0.8">DUDLEY COUNTY COURT</text>'
),

/* Dudley State Correctional, cell block C */
cell: doc(
  '<rect x="430" y="60" width="110" height="90"/>'
 +'<line x1="458" y1="60" x2="458" y2="150"/><line x1="486" y1="60" x2="486" y2="150"/><line x1="514" y1="60" x2="514" y2="150"/>'
 +'<rect x="80" y="200" width="230" height="14"/>'
 +'<line x1="92" y1="214" x2="86" y2="300"/><line x1="298" y1="214" x2="304" y2="300"/>'
 +'<line x1="80" y1="206" x2="310" y2="206" stroke-width="1" opacity="0.5"/>'
 +'<rect x="96" y="186" width="52" height="14" stroke="'+DIM+'"/>'
 +(function(){var s='';for(var i=0;i<9;i++){var x=30+i*72;
    s+='<line x1="'+x+'" y1="0" x2="'+x+'" y2="360" stroke-width="6"/>';}
    s+='<line x1="0" y1="34" x2="640" y2="34" stroke-width="6"/>';
    s+='<line x1="0" y1="326" x2="640" y2="326" stroke-width="6"/>';
    return s;})()
 +'<line x1="10" y1="336" x2="630" y2="336"/>',
  '<path d="M540 64 L620 336 h-180 z" fill="rgba(125,255,154,0.05)" stroke="none"/>'
),
/* Dudley docks: pier, container crane, freighter riding low */
docks: doc(
  '<circle cx="84" cy="62" r="26" stroke="'+BRIGHT+'"/>'
 +'<path d="M68 50 q16 -10 32 0" stroke-width="1.2" opacity="0.6"/>'
 +'<line x1="0" y1="300" x2="640" y2="300"/>'
 +'<line x1="0" y1="268" x2="300" y2="268"/>'
 +'<rect x="0" y="268" width="300" height="10" fill="rgba(51,255,102,0.06)" stroke="none"/>'
 +'<line x1="300" y1="268" x2="300" y2="300"/>'
 +'<line x1="34" y1="278" x2="34" y2="318"/><line x1="118" y1="278" x2="118" y2="318"/><line x1="202" y1="278" x2="202" y2="318"/><line x1="286" y1="278" x2="286" y2="318"/>'
 +'<rect x="34" y="238" width="62" height="30"/><rect x="104" y="238" width="62" height="30"/><rect x="68" y="208" width="62" height="30"/>'
 +'<line x1="52" y1="238" x2="52" y2="268" stroke-width="1" opacity="0.45"/><line x1="80" y1="238" x2="80" y2="268" stroke-width="1" opacity="0.45"/><line x1="122" y1="238" x2="122" y2="268" stroke-width="1" opacity="0.45"/><line x1="150" y1="238" x2="150" y2="268" stroke-width="1" opacity="0.45"/><line x1="86" y1="208" x2="86" y2="238" stroke-width="1" opacity="0.45"/><line x1="112" y1="208" x2="112" y2="238" stroke-width="1" opacity="0.45"/>'
 +'<line x1="236" y1="268" x2="236" y2="88"/><line x1="252" y1="268" x2="252" y2="88"/>'
 +'<line x1="236" y1="128" x2="252" y2="108"/><line x1="236" y1="168" x2="252" y2="148"/><line x1="236" y1="208" x2="252" y2="188"/><line x1="236" y1="248" x2="252" y2="228"/>'
 +'<line x1="228" y1="88" x2="260" y2="88"/>'
 +'<line x1="244" y1="88" x2="392" y2="118"/><line x1="244" y1="88" x2="196" y2="112"/>'
 +'<line x1="368" y1="113" x2="368" y2="168"/><path d="M362 168 h12 l-6 12 z"/>'
 +'<path d="M414 300 l18 -30 h192 v30 z" stroke="'+DIM+'"/>'
 +'<rect x="500" y="238" width="72" height="32" stroke="'+DIM+'"/><rect x="516" y="216" width="40" height="22" stroke="'+DIM+'"/>'
 +'<line x1="470" y1="270" x2="470" y2="226" stroke="'+DIM+'"/>'
 +'<circle cx="452" cy="284" r="2.5" fill="'+AMBER+'" stroke="none"/><circle cx="478" cy="284" r="2.5" fill="'+AMBER+'" stroke="none"/><circle cx="504" cy="284" r="2.5" fill="'+AMBER+'" stroke="none"/>'
 +'<line x1="330" y1="314" x2="396" y2="314" stroke-width="1" opacity="0.35"/><line x1="560" y1="312" x2="620" y2="312" stroke-width="1" opacity="0.3"/>',
  '<line x1="70" y1="306" x2="98" y2="306" stroke="'+AMBER+'" stroke-width="1" opacity="0.4"/><line x1="76" y1="316" x2="94" y2="316" stroke="'+AMBER+'" stroke-width="1" opacity="0.3"/>'
 +rainLines(18,23)
),

/* the Gumshoe Tavern: back bar, stools, a lamp and a bad hand */
tavern: doc(
  '<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<rect x="120" y="86" width="400" height="12"/>'
 +'<rect x="120" y="140" width="400" height="12"/>'
 +(function(){var s='',x;for(x=136;x<500;x+=34){
    var h=14+((x*7)%3)*4;
    s+='<rect x="'+x+'" y="'+(86-h)+'" width="9" height="'+h+'" stroke="'+DIM+'"/>';
    s+='<line x1="'+(x+4)+'" y1="'+(86-h)+'" x2="'+(x+4)+'" y2="'+(86-h-6)+'" stroke="'+DIM+'"/>';
    var h2=12+((x*13)%3)*5;
    s+='<rect x="'+(x+16)+'" y="'+(140-h2)+'" width="9" height="'+h2+'" stroke="'+DIM+'"/>';
    s+='<line x1="'+(x+20)+'" y1="'+(140-h2)+'" x2="'+(x+20)+'" y2="'+(140-h2-6)+'" stroke="'+DIM+'"/>';
  }return s;})()
 +'<rect x="80" y="206" width="480" height="16"/>'
 +'<rect x="96" y="222" width="448" height="76" stroke="'+DIM+'"/>'
 +'<ellipse cx="180" cy="288" rx="20" ry="7"/><line x1="168" y1="292" x2="164" y2="330"/><line x1="192" y1="292" x2="196" y2="330"/>'
 +'<ellipse cx="330" cy="288" rx="20" ry="7"/><line x1="318" y1="292" x2="314" y2="330"/><line x1="342" y1="292" x2="346" y2="330"/>'
 +'<ellipse cx="480" cy="288" rx="20" ry="7"/><line x1="468" y1="292" x2="464" y2="330"/><line x1="492" y1="292" x2="496" y2="330"/>'
 +'<line x1="188" y1="0" x2="188" y2="40"/>'
 +'<path d="M170 40 h36 l10 20 h-56 z" fill="rgba(255,176,0,0.10)" stroke="'+AMBER+'"/>'
 +'<rect x="410" y="182" width="18" height="24"/><path d="M428 188 q11 5 0 12"/>'
 +'<rect x="236" y="184" width="15" height="21" transform="rotate(-9 243 194)"/><rect x="258" y="185" width="15" height="21" transform="rotate(7 265 195)"/>',
  '<path d="M188 60 L120 206 h136 z" fill="rgba(255,220,140,0.07)" stroke="none"/>'
 +'<rect x="356" y="22" width="160" height="32" fill="none" stroke="'+AMBER+'" stroke-width="1.4" opacity="0.8"/>'
 +'<text x="436" y="44" text-anchor="middle" fill="'+AMBER+'" stroke="none" font-family="monospace" font-size="17" letter-spacing="3">GUMSHOE</text>'
),

/* Dudley Mills horse track: grandstand, tote board, the 40-1 shot */
track: doc(
  '<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<line x1="0" y1="272" x2="640" y2="272"/>'
 +'<line x1="0" y1="258" x2="640" y2="258" stroke-width="1" opacity="0.6"/>'
 +(function(){var s='';for(var x=20;x<640;x+=88){s+='<line x1="'+x+'" y1="258" x2="'+x+'" y2="272"/>';}return s;})()
 +'<path d="M30 96 h240 l-18 -24 h-204 z"/>'
 +'<line x1="46" y1="96" x2="46" y2="212"/><line x1="254" y1="96" x2="254" y2="212"/>'
 +'<line x1="46" y1="212" x2="254" y2="212"/>'
 +'<line x1="60" y1="212" x2="60" y2="258" stroke="'+DIM+'"/><line x1="240" y1="212" x2="240" y2="258" stroke="'+DIM+'"/>'
 +(function(){var s='';for(var y=118;y<=198;y+=20){s+='<line x1="54" y1="'+y+'" x2="246" y2="'+y+'" stroke-width="1" stroke="'+DIM+'" opacity="0.7"/>';}return s;})()
 +'<line x1="316" y1="258" x2="316" y2="120"/><rect x="298" y="102" width="36" height="18"/>'
 +'<circle cx="308" cy="111" r="3" fill="'+AMBER+'" stroke="none"/><circle cx="324" cy="111" r="3" fill="'+AMBER+'" stroke="none"/>'
 +'<rect x="430" y="88" width="180" height="92"/>'
 +'<line x1="466" y1="180" x2="466" y2="258"/><line x1="574" y1="180" x2="574" y2="258"/>'
 +(function(){var s='';for(var y=124;y<=166;y+=14){s+='<line x1="444" y1="'+y+'" x2="596" y2="'+y+'" stroke-width="1" stroke="'+DIM+'" opacity="0.7"/>';}return s;})()
 +'<path d="M270 306 q2 -16 22 -20 l38 -3 q16 -1 22 7 q5 6 14 4 q9 -3 11 -13 l9 -9 7 7 q9 1 6 8 l-11 4 q-2 12 -15 14"/>'
 +'<path d="M284 304 l-13 24 M307 306 l3 24 M337 304 l-10 24 M354 301 l15 22"/>'
 +'<path d="M270 296 q-15 3 -19 15"/>'
 +'<circle cx="318" cy="262" r="6"/>'
 +'<path d="M313 267 q-5 9 2 15 M324 266 q11 7 22 4"/>'
 +'<circle cx="250" cy="320" r="3" stroke="'+DIM+'" stroke-width="1" opacity="0.6"/><circle cx="240" cy="312" r="2" stroke="'+DIM+'" stroke-width="1" opacity="0.5"/>',
  '<text x="520" y="112" text-anchor="middle" fill="'+AMBER+'" stroke="none" font-family="monospace" font-size="14" letter-spacing="3">DUDLEY MILLS</text>'
),

/* Dudley Arcade: cabinet row, the middle one running SNAKE */
arcade: doc(
  '<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<line x1="230" y1="0" x2="230" y2="42"/><line x1="410" y1="0" x2="410" y2="42"/>'
 +'<rect x="190" y="42" width="260" height="44"/>'
 +(function(){var s='',i,X=[92,264,436];for(i=0;i<X.length;i++){var x=X[i];
    s+='<path d="M'+x+' 330 v-186 h112 v186"/>';
    s+='<rect x="'+(x-4)+'" y="120" width="120" height="24"/>';
    s+='<rect x="'+(x+18)+'" y="162" width="76" height="58" stroke="'+DIM+'"/>';
    s+='<line x1="'+(x+6)+'" y1="240" x2="'+(x+106)+'" y2="240"/>';
    s+='<line x1="'+(x+30)+'" y1="234" x2="'+(x+30)+'" y2="226"/><circle cx="'+(x+30)+'" cy="222" r="4"/>';
    s+='<circle cx="'+(x+64)+'" cy="231" r="3.5" stroke="'+AMBER+'"/><circle cx="'+(x+80)+'" cy="231" r="3.5" stroke="'+AMBER+'"/>';
  }return s;})(),
  '<text x="320" y="72" text-anchor="middle" fill="'+AMBER+'" stroke="none" font-family="monospace" font-size="24" letter-spacing="8">ARCADE</text>'
 +'<rect x="282" y="162" width="76" height="58" fill="rgba(51,255,102,0.07)" stroke="none"/>'
 +(function(){var s='',c=[[292,200],[298,200],[304,200],[310,200],[310,194],[310,188]];
    for(var i=0;i<c.length;i++){s+='<rect x="'+c[i][0]+'" y="'+c[i][1]+'" width="5" height="5" fill="'+GREEN+'" stroke="none"/>';}
    return s;})()
 +'<circle cx="340" cy="176" r="2.5" fill="'+AMBER+'" stroke="none"/>'
),

/* Dudley State Correctional, the yard: wall, wire, tower, searchlight */
yard: doc(
  '<circle cx="76" cy="54" r="22" stroke="'+BRIGHT+'"/>'
 +'<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<line x1="0" y1="176" x2="640" y2="176"/>'
 +(function(){var s='',y,x,i=0;for(y=198;y<330;y+=26,i++){
    s+='<line x1="0" y1="'+y+'" x2="640" y2="'+y+'" stroke-width="1" stroke="'+DIM+'" opacity="0.5"/>';
    for(x=((i%2)*40)+22;x<640;x+=80){
      s+='<line x1="'+x+'" y1="'+(y-22)+'" x2="'+x+'" y2="'+Math.min(y,329)+'" stroke-width="1" stroke="'+DIM+'" opacity="0.35"/>';
    }
  }return s;})()
 +(function(){var s='';for(var x=8;x<650;x+=15){
    s+='<circle cx="'+x+'" cy="168" r="9" stroke-width="1" opacity="0.7"/>';
  }return s;})()
 +'<line x1="482" y1="330" x2="494" y2="122"/><line x1="558" y1="330" x2="546" y2="122"/>'
 +'<path d="M488 250 L552 190 M552 250 L488 190" stroke-width="1" opacity="0.6"/>'
 +'<path d="M486 300 L554 240 M554 300 L486 240" stroke-width="1" opacity="0.6"/>'
 +'<rect x="472" y="70" width="96" height="52"/>'
 +'<path d="M466 70 h108 l-14 -18 h-80 z"/>'
 +'<line x1="480" y1="96" x2="560" y2="96" stroke-width="1" stroke="'+DIM+'"/>'
 +'<rect x="486" y="98" width="16" height="12" stroke="'+AMBER+'"/>',
  '<path d="M494 110 L206 330 h210 z" fill="rgba(255,220,140,0.08)" stroke="none"/>'
),

/* City Hall: where Deputy Comptroller Pyne keeps his ledgers */
hall: doc(
  '<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<line x1="140" y1="302" x2="500" y2="302"/><line x1="124" y1="314" x2="516" y2="314"/><line x1="108" y1="326" x2="532" y2="326"/>'
 +'<path d="M104 138 L320 64 L536 138 z"/>'
 +'<rect x="128" y="138" width="384" height="30"/>'
 +(function(){var s='',X=[150,214,278,362,426,490];for(var i=0;i<X.length;i++){var x=X[i];
    s+='<line x1="'+x+'" y1="176" x2="'+x+'" y2="296"/><line x1="'+(x+16)+'" y1="176" x2="'+(x+16)+'" y2="296"/>';
    s+='<rect x="'+(x-3)+'" y="168" width="22" height="8"/><rect x="'+(x-3)+'" y="294" width="22" height="8"/>';
  }return s;})()
 +'<rect x="300" y="224" width="40" height="78" stroke="'+DIM+'"/>'
 +'<line x1="320" y1="224" x2="320" y2="302" stroke="'+DIM+'" stroke-width="1"/>'
 +'<line x1="66" y1="330" x2="66" y2="230"/><circle cx="66" cy="222" r="8" fill="rgba(255,176,0,0.15)" stroke="'+AMBER+'"/>'
 +'<line x1="574" y1="330" x2="574" y2="230"/><circle cx="574" cy="222" r="8" fill="rgba(255,176,0,0.15)" stroke="'+AMBER+'"/>',
  '<text x="320" y="159" text-anchor="middle" fill="'+GREEN+'" stroke="none" font-family="monospace" font-size="14" letter-spacing="4" opacity="0.85">CITY HALL</text>'
 +rainLines(16,41)
),
/* the recurring nightmare: the hotel room, the bed, the TV stand */
dream: doc(
  (function(){var s='';for(var y=40;y<330;y+=58){
    s+='<path d="M0 '+y+' q80 -10 160 0 t160 0 t160 0 t160 0" stroke-width="1" stroke="'+DIM+'" opacity="0.22"/>';
  }return s;})()
 +'<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<rect x="60" y="180" width="24" height="120"/>'
 +'<rect x="84" y="240" width="150" height="60"/>'
 +'<line x1="84" y1="258" x2="234" y2="258" stroke-width="1" opacity="0.5"/>'
 +'<rect x="470" y="230" width="120" height="70"/>'
 +'<line x1="482" y1="300" x2="478" y2="330"/><line x1="578" y1="300" x2="582" y2="330"/>'
 +'<rect x="490" y="176" width="80" height="54"/>'
 +'<rect x="500" y="184" width="60" height="38" stroke="'+DIM+'"/>'
 +'<line x1="504" y1="194" x2="556" y2="194" stroke="'+DIM+'" stroke-width="1" opacity="0.6"/><line x1="504" y1="204" x2="556" y2="204" stroke="'+DIM+'" stroke-width="1" opacity="0.6"/><line x1="504" y1="214" x2="556" y2="214" stroke="'+DIM+'" stroke-width="1" opacity="0.6"/>'
 +'<line x1="330" y1="0" x2="334" y2="66"/><circle cx="335" cy="72" r="6" stroke="'+AMBER+'"/>'
 +'<circle cx="290" cy="306" r="9"/>'
 +'<path d="M300 302 q32 -8 62 -2 q20 4 34 2 M306 312 q28 4 56 2 q22 -2 36 -4"/>'
 +'<path d="M282 300 q-8 -8 -16 -6 M284 310 q-10 4 -14 10" stroke="'+AMBER+'" stroke-width="1.6"/>'
 +'<circle cx="287" cy="303" r="9" stroke="'+DIM+'" stroke-width="1" opacity="0.35"/>'
 +'<path d="M297 299 q32 -8 62 -2 q20 4 34 2" stroke="'+DIM+'" stroke-width="1" opacity="0.35"/>',
  '<path d="M335 80 L262 330 h146 z" fill="rgba(255,220,140,0.05)" stroke="none"/>'
),

/* the collapsed factory: rubble, smoke, and half a smile */
ruins: doc(
  '<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<path d="M250 330 v-160 l24 18 v-52 l30 26 v-38 l26 30 v-24 l28 34 v-30 l24 40 v156"/>'
 +'<path d="M110 330 v-70 l18 12 v-28 l20 22 v-16 l16 24 v56"/>'
 +'<path d="M100 330 q30 -26 66 -14 q28 8 52 14 M330 330 q36 -30 80 -16 q34 10 60 16" stroke-width="1.6" opacity="0.8"/>'
 +'<line x1="150" y1="296" x2="176" y2="288" stroke-width="1" opacity="0.5"/><line x1="380" y1="300" x2="410" y2="290" stroke-width="1" opacity="0.5"/>'
 +'<path d="M300 168 q-12 -22 6 -36 q16 -12 8 -32" stroke="'+DIM+'" stroke-width="1.6" opacity="0.6"/>'
 +'<path d="M360 190 q14 -20 -2 -36 q-14 -14 -4 -30" stroke="'+DIM+'" stroke-width="1.6" opacity="0.5"/>'
 +'<path d="M40 330 l16 -34 l16 34 M56 296 v-10"/>'
 +'<path d="M560 330 l16 -34 l16 34 M576 296 v-10"/>'
 +'<line x1="66" y1="308" x2="572" y2="308" stroke-width="1" opacity="0.5"/>'
 +'<g transform="rotate(-14 480 260)"><rect x="440" y="240" width="80" height="40" stroke="'+AMBER+'"/>'
 +'<circle cx="466" cy="256" r="3" fill="'+AMBER+'" stroke="none"/>'
 +'<path d="M456 266 q12 10 26 4" stroke="'+AMBER+'"/>'
 +'<line x1="482" y1="240" x2="498" y2="280" stroke-width="1" stroke="'+AMBER+'" opacity="0.7"/></g>',
  '<text x="320" y="326" text-anchor="middle" fill="'+AMBER+'" stroke="none" font-family="monospace" font-size="11" letter-spacing="4" opacity="0.85">POLICE LINE - DO NOT CROSS</text>'
 +rainLines(14,31)
),

/* the repair shop: the Buick, hood up, $250 short */
garage: doc(
  '<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<rect x="40" y="100" width="260" height="230"/>'
 +(function(){var s='';for(var y=126;y<300;y+=22){s+='<line x1="70" y1="'+y+'" x2="250" y2="'+y+'" stroke-width="1" stroke="'+DIM+'" opacity="0.7"/>';}return s;})()
 +'<rect x="70" y="112" width="180" height="196" stroke="'+DIM+'"/>'
 +'<rect x="262" y="200" width="26" height="34" stroke="'+DIM+'"/>'
 +'<circle cx="152" cy="86" r="4" fill="'+AMBER+'" stroke="none"/>'
 +'<path d="M340 300 v-26 q0 -14 16 -14 h30 l22 -22 h74 l20 22 h20 q16 0 16 14 v26 z"/>'
 +'<circle cx="400" cy="300" r="17"/><circle cx="400" cy="300" r="7"/>'
 +'<circle cx="506" cy="300" r="17"/><circle cx="506" cy="300" r="7"/>'
 +'<line x1="538" y1="260" x2="584" y2="224"/>'
 +'<line x1="540" y1="258" x2="548" y2="238" stroke-width="1"/>'
 +'<path d="M556 236 q-8 -18 8 -28 q14 -10 8 -26" stroke="'+DIM+'" stroke-width="1.6" opacity="0.6"/>'
 +'<rect x="600" y="306" width="30" height="18"/><path d="M606 306 q9 -10 18 0"/>'
 +'<ellipse cx="360" cy="324" rx="26" ry="4" stroke="'+DIM+'" stroke-width="1" opacity="0.5"/>',
  '<rect x="86" y="52" width="168" height="34" fill="none" stroke="'+AMBER+'" stroke-width="1.4" opacity="0.85"/>'
 +'<text x="170" y="76" text-anchor="middle" fill="'+AMBER+'" stroke="none" font-family="monospace" font-size="18" letter-spacing="5">GARAGE</text>'
),

/* red and blue light fills the windows */
arrest: doc(
  '<line x1="10" y1="330" x2="630" y2="330"/>'
 +'<rect x="150" y="60" width="360" height="50"/>'
 +'<path d="M90 240 h460 M90 240 v90 M550 240 v90"/>'
 +'<line x1="90" y1="256" x2="550" y2="256" stroke-width="1" opacity="0.5"/>'
 +'<rect x="290" y="150" width="120" height="70" stroke="'+DIM+'"/>'
 +'<line x1="350" y1="150" x2="350" y2="220" stroke="'+DIM+'" stroke-width="1"/>'
 +'<path d="M170 300 v-22 q0 -12 14 -12 h26 l18 -18 h62 l16 18 h28 q14 0 14 12 v22 z"/>'
 +'<circle cx="220" cy="300" r="15"/><circle cx="220" cy="300" r="6"/>'
 +'<circle cx="310" cy="300" r="15"/><circle cx="310" cy="300" r="6"/>'
 +'<rect x="238" y="238" width="44" height="10"/>'
 +'<circle cx="250" cy="243" r="4" fill="#ff5555" stroke="none"/>'
 +'<circle cx="270" cy="243" r="4" fill="'+AMBER+'" stroke="none"/>'
 +'<line x1="214" y1="266" x2="214" y2="248"/><line x1="252" y1="266" x2="252" y2="248"/>',
  '<rect x="291" y="151" width="118" height="68" fill="rgba(255,85,85,0.14)" stroke="none"/>'
 +'<path d="M250 240 L60 330 h240 z" fill="rgba(255,85,85,0.13)" stroke="none"/>'
 +'<path d="M270 240 L400 330 h-190 z" fill="rgba(255,176,0,0.07)" stroke="none"/>'
 +'<circle cx="250" cy="243" r="15" fill="rgba(255,85,85,0.38)" stroke="none"/>'
 +'<circle cx="270" cy="243" r="10" fill="rgba(255,176,0,0.22)" stroke="none"/>'
 +'<text x="330" y="94" text-anchor="middle" fill="'+AMBER+'" stroke="none" font-family="monospace" font-size="24" letter-spacing="5">PE E\'S  UBS</text>'
),

/* the early retirement: driving out of Dudley as the sun comes up */
sunrise: doc(
  '<line x1="0" y1="280" x2="640" y2="280"/>'
 +'<path d="M262 280 a58 58 0 0 1 116 0" stroke="'+BRIGHT+'"/>'
 +(function(){var s='',i;for(i=0;i<7;i++){var a=Math.PI*(0.15+0.7*i/6);
    var x1=320+Math.cos(a)*74,y1=280-Math.sin(a)*74,x2=320+Math.cos(a)*94,y2=280-Math.sin(a)*94;
    s+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+AMBER+'" stroke-width="2.2" opacity="0.8"/>';
  }return s;})()
 +'<path d="M0 330 L296 280 M640 330 L344 280"/>'
 +'<line x1="320" y1="316" x2="320" y2="304" stroke="'+AMBER+'" stroke-width="2"/><line x1="320" y1="296" x2="320" y2="290" stroke="'+AMBER+'" stroke-width="1.6"/><line x1="320" y1="286" x2="320" y2="283" stroke="'+AMBER+'" stroke-width="1"/>'
 +'<path d="M0 280 l30 -10 v10 M46 280 v-16 l14 -6 v22 M74 280 v-12 l10 -4 v16" stroke="'+DIM+'"/>'
 +'<path d="M292 322 q0 -10 8 -10 h40 q8 0 8 10 z"/>'
 +'<rect x="304" y="298" width="32" height="14"/>'
 +'<circle cx="300" cy="322" r="6"/><circle cx="340" cy="322" r="6"/>'
 +'<circle cx="297" cy="318" r="2" fill="'+AMBER+'" stroke="none"/><circle cx="343" cy="318" r="2" fill="'+AMBER+'" stroke="none"/>'
 +'<path d="M150 120 q8 -8 16 0 M176 132 q7 -7 14 0" stroke-width="1.4" opacity="0.7"/>',
  '<path d="M262 280 a58 58 0 0 1 116 0 z" fill="rgba(255,220,140,0.20)" stroke="none"/>'
 +'<path d="M282 280 a38 38 0 0 1 76 0 z" fill="rgba(255,176,0,0.22)" stroke="none"/>'
 +'<path d="M296 280 L344 280 L332 330 h-24 z" fill="rgba(255,220,140,0.05)" stroke="none"/>'
),
};

/* keyword -> scene, so every section() gets an illustration with zero metadata */
function hint(title){
  var t=String(title||'').toLowerCase();
  if(/rooftop|roof\b|chase/.test(t))return 'rooftop';
  if(/trial|court|judge|verdict/.test(t))return 'court';
  if(/dream|nightmare/.test(t))return 'dream';
  if(/crime scene|collapsed|rubble|ruins/.test(t))return 'ruins';
  if(/mechanic|garage|repair|breakdown/.test(t))return 'garage';
  if(/arrest/.test(t))return 'arrest';
  if(/s e c r e t|secret|retirement|sunrise/.test(t))return 'sunrise';
  if(/escape|breakout|prison break|yard\b/.test(t))return 'yard';
  if(/dock|pier|harbor|wharf/.test(t))return 'docks';
  if(/tavern|blackjack|gumshoe/.test(t))return 'tavern';
  if(/horse|track|derby|turf/.test(t))return 'track';
  if(/arcade|snake/.test(t))return 'arcade';
  if(/comptroller|pyne|city hall|hall of records/.test(t))return 'hall';
  if(/prison|cell|correctional|e p i l o g u e|epilogue/.test(t))return 'cell';
  if(/petes|pete's|subs|diner/.test(t))return 'diner';
  if(/mayo|factory|smiles|investigation|clemons|tubley/.test(t))return 'factory';
  if(/interrogat|convinc|apartment|office|clerk|lobby/.test(t))return 'apartment';
  if(/street|alley|drive|encounter/.test(t))return 'street';
  if(/c h a p t e r|chapter|dudley|part one|e n d/.test(t))return 'city';
  return null;
}

var _scene=null,_char=null,_curScene='';

function _root(){return document.getElementById('storyArt');}
function _ensure(){
  var r=_root();if(!r)return null;
  if(!_scene||!_scene.isConnected){
    r.innerHTML='';
    _scene=document.createElement('div');_scene.className='story-scene';
    _char=document.createElement('div');_char.className='story-char';
    r.appendChild(_scene);r.appendChild(_char);
  }
  return r;
}

var STORYART={
  hint:hint,
  set:function(key){
    if(!_ensure())return;
    if(!key||(!SCENE_IMG_DEFS[key]&&!SCENE_ART_DEFS[key])){return;}
    if(key===_curScene)return;
    _curScene=key;
    /* A figure belongs to the scene it walked into. Changing the scene retires
       it, otherwise (e.g.) the rooftop shooter stayed layered over the next
       chapter's skyline until something happened to call clearScreen(). Every
       call site sets the scene first and the figure second, so this never
       eats a figure that was just placed. */
    STORYART.clearChar();
    _scene.innerHTML=SCENE_IMG_DEFS[key]?imgDoc(SCENE_IMG_DEFS[key]):SCENE_ART_DEFS[key];
    _scene.classList.remove('scene-in');void _scene.offsetWidth;
    _scene.classList.add('scene-in');
  },
  raw:function(svg){
    if(!_ensure())return;
    _curScene='';
    _scene.innerHTML=svg||'';
    _scene.classList.remove('scene-in');void _scene.offsetWidth;
    _scene.classList.add('scene-in');
  },
  char:function(kind,fx){
    if(!_ensure())return null;
    var DEFS=(typeof CHAR_ART_DEFS!=='undefined')?CHAR_ART_DEFS:null;
    if(!DEFS)return null;
    _char.innerHTML=DEFS[kind]||DEFS.normal;
    _char.className='story-char';
    _char.classList.remove('char-in');void _char.offsetWidth;
    _char.classList.add('char-in');
    if(fx)_char.classList.add(fx);
    if(typeof playMoveBlip==='function'){try{playMoveBlip();}catch(e){}}
    return _char;
  },
  clearChar:function(){if(_char){_char.innerHTML='';_char.className='story-char';}},
  clear:function(){_curScene='';if(_scene)_scene.innerHTML='';STORYART.clearChar();}
};

window.STORYART=STORYART;
})();
