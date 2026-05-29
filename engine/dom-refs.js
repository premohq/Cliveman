/* ========================================================================
   CLIVEMAN 3.1  -  js/02-dom-refs.js
   IS_MOBILE flag, cached DOM element references, and shared mutable state flags (typing, waitingFor, etc.).

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */


const IS_MOBILE=window.matchMedia('(pointer: coarse)').matches||('ontouchstart'in window);const screenEl=document.getElementById('screen');const mapAreaEl=document.getElementById('mapArea');const cmdListEl=document.getElementById('cmdList');const choicePanelEl=document.getElementById('choicePanel');const input=document.getElementById('cmd');const bootEl=document.getElementById('boot');const navCheckBtn=document.getElementById('navCheckBtn');const navInvBtn=document.getElementById('navInvBtn');const navSaveBtn=document.getElementById('navSaveBtn');const fsBtn=document.getElementById('fsBtn');let typing=false;let waitingFor=null;let skipRequested=false;let arrowHandler=null;let swipeHandler=null;let checkFn=null;let movementAllowed=false;let navJustExited=false;
