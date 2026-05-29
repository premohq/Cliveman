/* ========================================================================
   CLIVEMAN 3.1  -  js/09-controls-ui.js
   Controller-aware button/label helpers (Xbox vs PlayStation), d-pad SVG, command list drawing.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

function xb(cls,lbl){return '<span class="xbtn '+cls+'">'+lbl+'</span>';}
/* PlayStation (DS4/DS5) button helper */
function pb(cls,lbl){return '<span class="psbtn '+cls+'">'+lbl+'</span>';}
/* Returns 'ps' (DS4/DS5), 'xbox', or null */
function padType(){
  if(!window._padConnected)return null;
  return window._padType||'xbox';
}
/* Dynamic button markup based on active controller type */
function btnConfirm(){return padType()==='ps'?pb('psbtn-cross','\u2715'):xb('xbtn-a','A');}
function btnCancel(){return padType()==='ps'?pb('psbtn-circle','\u25EF'):xb('xbtn-b','B');}
function btnCheck(){return padType()==='ps'?pb('psbtn-square','\u25A1'):xb('xbtn-x','X');}
function btnInv(){return padType()==='ps'?pb('psbtn-triangle','\u25B3'):xb('xbtn-y','Y');}
function btnSave(){return padType()==='ps'?pb('psbtn-share','SHR'):xb('xbtn-back','SEL');}
function btnL(){return padType()==='ps'?pb('psbtn-l1','L1'):xb('xbtn-lb','LB');}
function btnR(){return padType()==='ps'?pb('psbtn-r1','R1'):xb('xbtn-rb','RB');}
/* Dynamic text labels */
function labelConfirm(){return padType()==='ps'?'\u2715':'A';}
function labelCheck(){return padType()==='ps'?'\u25A1':'X';}
function kbdOrPad(kbd,pad){return window._padConnected?pad:kbd;}function xdpadSvg(){return '<svg class="xdpad" viewBox="0 0 20 20" style="width:16px;height:16px;vertical-align:middle;margin:0 2px"><rect x="7" y="0" width="6" height="6" rx="1" fill="#555"/><rect x="7" y="14" width="6" height="6" rx="1" fill="#555"/><rect x="0" y="7" width="6" height="6" rx="1" fill="#555"/><rect x="14" y="7" width="6" height="6" rx="1" fill="#555"/><rect x="7" y="7" width="6" height="6" fill="#444"/><polygon points="10,1 9,3 11,3" fill="#ccc"/><polygon points="10,19 9,17 11,17" fill="#ccc"/><polygon points="1,10 3,9 3,11" fill="#ccc"/><polygon points="19,10 17,9 17,11" fill="#ccc"/></svg>';}function drawCmdList(){var T3=window.t||function(s){return s;};var html;if(IS_MOBILE){html='<div class="hint">'+T3('SWIPE \u2191\u2193 move \u00B7 \u2190\u2192 turn \u00B7 tap C interact')+'</div>';}else if(window._padConnected){html='<div class="hint">'+xdpadSvg()+'/'+btnL()+btnR()+T3(' move & strafe \u00B7 ').replace('&','&amp;')+btnCheck()+T3(' check \u00B7 ')+btnInv()+T3(' inv \u00B7 ')+btnSave()+T3(' save \u00B7 ')+btnConfirm()+T3(' select/skip')+'</div>';}else{html='<div class="hint">'+T3('W/S forward/back \u00B7 A/D turn \u00B7 Q/E strafe \u00B7 C check')+'</div>';}cmdListEl.innerHTML=html;}
const FP_FWD=[[-1,0],[0,1],[1,0],[0,-1]];const FP_RIGHT=[[0,1],[1,0],[0,-1],[-1,0]];
