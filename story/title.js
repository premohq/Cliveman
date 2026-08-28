/* ========================================================================
   CLIVEMAN  -  story/title.js
   Title screen, numpad, load screen, intro sequence, section headers.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

/*LOGO_BEGIN*/
/* CLIVEMAN wordmark - vector SVG (v1.9.5). Montserrat Black title with
   phosphor gradient, extruded depth, bloom + scanlines; arced Oswald Bold
   tagline in amber; evidence-notch underline. Tagline baked in (English).
   Self-contained: ids prefixed cm- to avoid DOM collisions; scales via viewBox. */
var CLIVE_LOGO_SVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1597 607" width="1597" height="607" role="img" aria-label="CLIVEMAN — Detective Adventure"><title>CLIVEMAN — Detective Adventure</title><image href="assets/cliveman-logo.png" x="0" y="0" width="1597" height="607" preserveAspectRatio="xMidYMid meet"/></svg>';
/*LOGO_END*/
function drawTitleArt(){
var _sub=window.t?window.t('detective adventure'):'detective adventure';
const titleDiv=document.createElement('div');
titleDiv.style.textAlign='center';
const logoWrap=document.createElement('div');
logoWrap.innerHTML=CLIVE_LOGO_SVG;
const cv=logoWrap.firstChild;
cv.id='_mainTitle';cv.classList.add('logo-canvas');
cv.style.cssText='width:min(540px,92%);height:auto;display:block;margin:2px auto 0;';
titleDiv.appendChild(cv);
if(_sub&&String(_sub).toLowerCase()!=='detective adventure'){const sub=document.createElement('div');sub.className='snatcher-sub';sub.id='_subTitle';sub.textContent=_sub;titleDiv.appendChild(sub);}
screenEl.appendChild(titleDiv);
scrollScreenToBottom();
instantLine('                                                 ver '+window.CLIVEMAN_VERSION,'version');
const clickTarget=titleDiv.querySelector('#_mainTitle');
if(clickTarget){clickTarget.style.cursor='pointer';let clickCount=0;let clickResetTimer=null;clickTarget.addEventListener('click',function(e){e.stopPropagation();clickCount++;playKeyClick();if(clickResetTimer)clearTimeout(clickResetTimer);clickResetTimer=setTimeout(function(){clickCount=0;},2500);if(clickCount>=5){clickCount=0;window._easterEggCredits=true;stopCityGlimmer();if(window.TitleFlyover)window.TitleFlyover.stop();stopNoirMusic();playFinaleEasterEgg();}});}
}
async function titleScreen(){clearScreen();clearChoices();document.body.classList.remove('nav-mode');document.body.classList.remove('can-move');blank();drawTitleArt();blank();const _fly=window.TitleFlyover&&window.TitleFlyover.available()&&window.TitleFlyover.start();if(!_fly){const cityDiv=document.createElement('div');cityDiv.className='line';cityDiv.style.cssText='text-align:center;padding:4px 0;';const cityCanvas=document.createElement('canvas');cityCanvas.id='pixelCityBox';cityCanvas.width=320;cityCanvas.height=65;cityDiv.appendChild(cityCanvas);screenEl.appendChild(cityDiv);cityEl=cityCanvas;startCityGlimmer();}startNoirMusic();blank();blank();(function(){var div=appendLine('press-continue');var kbd='  >>  SELECT AN OPTION TO BEGIN  <<';var pad='  >>  PRESS A BUTTON TO BEGIN  <<';div.setAttribute('data-kbd-text',kbd);div.setAttribute('data-pad-text',pad);var raw=window._padConnected?pad:kbd;div.textContent=window.t?window.t(raw):raw;})();blank();const choice=await showTitleButtons();if(choice==='__refresh__'){stopCityGlimmer();return await titleScreen();}if(choice==='__debug__'){stopCityGlimmer();await debugMenu();return await titleScreen();}stopCityGlimmer();stopNoirMusic();if(choice==='new')return'new';const code=await loadScreen();if(code!=null)return code;return await titleScreen();}async function loadScreen(){
  clearScreen();blank();drawTitleArt();blank();
  const T=window.t||function(s){return s;};
  function boxRow(text){
    text='   '+text;
    if(text.length>46)text=text.slice(0,46);
    return '  |'+text+' '.repeat(46-text.length)+'|\n';
  }
  const box='  +==============================================+\n'
    +boxRow(T('LOAD SAVE FILE'))
    +boxRow(T('Select your .clive save file to load.'))
    +'  +==============================================+';
  instantLine(box,'savebox');blank();
  return new Promise(function(resolve){
    clearChoices();choicePanelEl.classList.add('active');
    const wrap=document.createElement('div');
    wrap.style.cssText='width:100%;text-align:center;';
    const hint=document.createElement('div');
    hint.style.cssText='color:var(--green-dim);font-size:16px;margin-bottom:12px;letter-spacing:1px;';
    hint.textContent=T('SELECT A .CLIVE FILE FROM YOUR DEVICE');
    const fileInput=document.createElement('input');
    fileInput.type='file';fileInput.accept='.clive';fileInput.style.display='none';
    const browseBtn=document.createElement('button');
    browseBtn.type='button';browseBtn.className='title-btn';
    browseBtn.textContent='📂 '+T('BROWSE FOR SAVE FILE');
    browseBtn.addEventListener('click',function(e){
      e.preventDefault();ensureAudio();playKeyClick();fileInput.click();
    });
    const backBtn=document.createElement('button');
    backBtn.type='button';backBtn.className='choice-btn';
    backBtn.style.cssText='display:block;margin:10px auto;min-width:120px;';
    backBtn.textContent=T('BACK');
    backBtn.setAttribute('data-pad-back','1');
    backBtn.addEventListener('click',function(e){
      e.preventDefault();ensureAudio();playKeyClick();
      clearChoices();instantLine('C:\\DUDLEY> '+T('BACK'),'input-echo');
      resolve(null);
    });
    fileInput.addEventListener('change',function(){
      const file=fileInput.files&&fileInput.files[0];
      if(!file)return;
      const reader=new FileReader();
      reader.onload=function(ev){
        try{
          const raw=(ev.target.result||'').trim();
          let saveData;
          if(raw.startsWith('CLIVE1:')){
            const b64=raw.slice(7);
            saveData=JSON.parse(atob(b64));
          }else if(/^\d+$/.test(raw)){
            saveData=parseInt(raw,10);
          }else{
            throw new Error(T('bad format'));
          }
          const result=decodeSave(saveData);
          if(!result){
            clearChoices();instantLine('  '+T('Invalid or corrupted save file.'),'err');
            resolve(null);return;
          }
          clearChoices();
          const cpText=T('CHECKPOINT')+': '+result.cp+' - '+T('Loading your position...');
          const accepted='  +==============================================+\n'
            +boxRow(T('SAVE FILE ACCEPTED'))
            +boxRow(cpText)
            +'  +==============================================+';
          instantLine(accepted,'savebox');blank();
          setTimeout(function(){resolve(saveData);},1500);
        }catch(err){
          clearChoices();
          instantLine('  '+T('Error reading save file: ')+(err&&err.message?err.message:T('unknown error')),'err');
          resolve(null);
        }
      };
      reader.onerror=function(){
        clearChoices();
        instantLine('  '+T('Could not read that file. Try again.'),'err');
        resolve(null);
      };
      reader.readAsText(file);
    });
    wrap.appendChild(hint);
    wrap.appendChild(browseBtn);
    wrap.appendChild(fileInput);
    wrap.appendChild(backBtn);
    choicePanelEl.appendChild(wrap);
    requestAnimationFrame(function(){scrollScreenToBottom();browseBtn.focus();});
  });
}async function intro(){clearScreen();if(window.STORYART&&typeof CLIVE_LOGO_SVG!=='undefined')STORYART.raw(CLIVE_LOGO_SVG);blank();await sleep(500);await typeLine('Game Starting...','sys');await sleep(1500);blank(2);}function section(title){
if(window.ClassicalMusic&&ClassicalMusic.cue)try{ClassicalMusic.cue(title);}catch(e){} /* cue with the untranslated title */
if(window.CMSTING)try{var _sk=CMSTING.hint(title);if(_sk)CMSTING.play(_sk);}catch(e){} /* dramatic sting, keyword-matched like the art */
/* In story flow, a section picks the scene illustration shown above the
   dialogue box (keyword-matched, zero metadata in story code). Keyword-match
   the UNTRANSLATED title, exactly like the music cue and the sting above -
   hint() only knows English, so matching a translated title silently lost
   the illustration (and left the previous scene up) in every other language. */
if(window.STORYART&&!document.body.classList.contains('nav-mode')){
  var _h=STORYART.hint(title);
  if(_h)STORYART.set(_h);
}
if(window.t)title=window.t(title);
blank();let bar='';for(let i=0;i<54;i++)bar+='=';instantLine(bar,'sys');instantLine(title,'sys');instantLine(bar,'sys');blank();}async function pressEnterToContinue(){await pressAnyToContinue();}