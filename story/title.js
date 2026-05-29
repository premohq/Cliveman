/* ========================================================================
   CLIVEMAN 3.1  -  js/11-title-intro.js
   Title screen, numpad, load screen, intro sequence, section headers.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

function drawTitleArt(){
var _sub=window.t?window.t('detective adventure'):'detective adventure';
const titleDiv=document.createElement('div');
titleDiv.innerHTML='<div class="snatcher-title" id="_mainTitle">CLIVEMAN</div><div class="snatcher-sub" id="_subTitle">'+_sub+'</div>';
screenEl.appendChild(titleDiv);
scrollScreenToBottom();
instantLine('                                                 ver 3.1','version');
const clickTarget=titleDiv.querySelector('.snatcher-title');
if(clickTarget){clickTarget.style.cursor='pointer';let clickCount=0;let clickResetTimer=null;clickTarget.addEventListener('click',function(e){e.stopPropagation();clickCount++;playKeyClick();if(clickResetTimer)clearTimeout(clickResetTimer);clickResetTimer=setTimeout(function(){clickCount=0;},2500);if(clickCount>=5){clickCount=0;window._easterEggCredits=true;stopCityGlimmer();stopNoirMusic();playFinaleEasterEgg();}});}
}
async function titleScreen(){clearScreen();clearChoices();document.body.classList.remove('nav-mode');document.body.classList.remove('can-move');blank();drawTitleArt();blank();const cityDiv=document.createElement('div');cityDiv.className='line';cityDiv.style.cssText='text-align:center;padding:4px 0;';const cityCanvas=document.createElement('canvas');cityCanvas.id='pixelCityBox';cityCanvas.width=320;cityCanvas.height=65;cityDiv.appendChild(cityCanvas);screenEl.appendChild(cityDiv);cityEl=cityCanvas;startCityGlimmer();startNoirMusic();blank();blank();(function(){var div=appendLine('press-continue');var kbd='  >>  SELECT AN OPTION TO BEGIN  <<';var pad='  >>  PRESS A BUTTON TO BEGIN  <<';div.setAttribute('data-kbd-text',kbd);div.setAttribute('data-pad-text',pad);var raw=window._padConnected?pad:kbd;div.textContent=window.t?window.t(raw):raw;})();blank();const choice=await showTitleButtons();if(choice==='__refresh__'){stopCityGlimmer();return await titleScreen();}if(choice==='__debug__'){stopCityGlimmer();await debugMenu();return await titleScreen();}stopCityGlimmer();stopNoirMusic();if(choice==='new')return'new';const code=await loadScreen();if(code!=null)return code;return await titleScreen();}async function showNumpad(maxDigits){clearChoices();choicePanelEl.classList.add('active');return new Promise(function(resolve){const wrap=document.createElement('div');wrap.style.width='100%';wrap.style.textAlign='center';const display=document.createElement('div');display.style.color='var(--amber)';display.style.fontSize='22px';display.style.textShadow='0 0 6px var(--amber)';display.style.marginBottom='8px';display.style.letterSpacing='3px';display.style.fontFamily='Share Tech Mono, monospace';let current='';function render(){display.textContent=current===''?'_'.repeat(maxDigits):current.padEnd(maxDigits,'_');}render();const grid=document.createElement('div');grid.style.display='grid';grid.style.gridTemplateColumns='repeat(3, 1fr)';grid.style.gap='6px';grid.style.maxWidth='280px';grid.style.margin='0 auto';const buttons=['1','2','3','4','5','6','7','8','9','←','0','OK'];buttons.forEach(function(label){const b=document.createElement('button');b.type='button';b.className='choice-btn';b.textContent=label;b.style.minWidth='60px';b.addEventListener('click',function(e){e.preventDefault();ensureAudio();playKeyClick();if(label==='←'){current=current.slice(0,-1);render();}else if(label==='OK'){if(current.length>0){clearChoices();instantLine('C:\\DUDLEY> '+current,'input-echo');resolve(current);}}else{if(current.length<maxDigits){current+=label;render();}}});b.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});grid.appendChild(b);});const backBtn=document.createElement('button');backBtn.type='button';backBtn.className='choice-btn';backBtn.textContent='BACK';backBtn.style.display='block';backBtn.style.margin='10px auto 0';backBtn.addEventListener('click',function(e){e.preventDefault();ensureAudio();playKeyClick();clearChoices();resolve('back');});backBtn.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});wrap.appendChild(display);wrap.appendChild(grid);wrap.appendChild(backBtn);choicePanelEl.appendChild(wrap);});}async function loadScreen(){
  clearScreen();blank();drawTitleArt();blank();
  const box='  +============================================+\n'
    +'  |   LOAD SAVE FILE                           |\n'
    +'  |   Select your .clive save file to load.    |\n'
    +'  +============================================+';
  instantLine(box,'savebox');blank();
  return new Promise(function(resolve){
    clearChoices();choicePanelEl.classList.add('active');
    const wrap=document.createElement('div');
    wrap.style.cssText='width:100%;text-align:center;';
    const hint=document.createElement('div');
    hint.style.cssText='color:var(--green-dim);font-size:16px;margin-bottom:12px;letter-spacing:1px;';
    hint.textContent='SELECT A .CLIVE FILE FROM YOUR DEVICE';
    const fileInput=document.createElement('input');
    fileInput.type='file';fileInput.accept='.clive';fileInput.style.display='none';
    const browseBtn=document.createElement('button');
    browseBtn.type='button';browseBtn.className='title-btn';
    browseBtn.innerHTML='&#x1F4C2; BROWSE FOR SAVE FILE';
    browseBtn.addEventListener('click',function(e){e.preventDefault();fileInput.click();});
    const backBtn=document.createElement('button');
    backBtn.type='button';backBtn.className='choice-btn';
    backBtn.style.cssText='display:block;margin:10px auto;min-width:120px;';
    backBtn.textContent='BACK';
    backBtn.addEventListener('click',function(e){
      e.preventDefault();ensureAudio();playKeyClick();
      clearChoices();instantLine('C:\\DUDLEY> BACK','input-echo');
      resolve(null);
    });
    fileInput.addEventListener('change',function(){
      const file=fileInput.files&&fileInput.files[0];
      if(!file)return;
      const reader=new FileReader();
      reader.onload=function(ev){
        try{
          const raw=(ev.target.result||'').trim();
          let code;
          if(raw.startsWith('CLIVE1:')){
            const b64=raw.slice(7);
            const json=atob(b64);
            const obj=JSON.parse(json);
            code=obj.code;
          } else if(/^\d+$/.test(raw)){
            code=parseInt(raw,10);
          } else {
            throw new Error('bad format');
          }
          const result=decodeSave(code);
          if(!result){clearChoices();instantLine('  Invalid or corrupted save file.','err');resolve(null);return;}
          clearChoices();
          const accepted='  +==============================================+\n'
            +'  |   SAVE FILE ACCEPTED                         |\n'
            +'  |   Checkpoint: '+result.cp+' - Loading your position...  |\n'
            +'  +==============================================+';
          instantLine(accepted,'savebox');blank();
          setTimeout(function(){resolve(code);},1500);
        }catch(err){
          clearChoices();
          instantLine('  Error reading save file: '+err.message,'err');
          resolve(null);
        }
      };
      reader.readAsText(file);
    });
    wrap.appendChild(hint);
    wrap.appendChild(browseBtn);
    wrap.appendChild(fileInput);
    wrap.appendChild(backBtn);
    choicePanelEl.appendChild(wrap);
    requestAnimationFrame(function(){scrollScreenToBottom();});
  });
}async function intro(){clearScreen();blank();drawTitleArt();blank();await sleep(500);await typeLine('Game Starting...','sys');await sleep(1500);blank(2);}function section(title){if(window.t)title=window.t(title);blank();let bar='';for(let i=0;i<54;i++)bar+='=';instantLine(bar,'sys');instantLine('   '+title,'sys');instantLine(bar,'sys');blank();}async function pressEnterToContinue(){await pressAnyToContinue();}
