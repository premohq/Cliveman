/* ========================================================================
   CLIVEMAN  -  engine/i18n/core.js
   Language + translation system: _lang, _translations, t(), tSub(),
   setLanguage(), RTL handling.

   The per-language dictionaries (engine/i18n/fr.js, es.js, ...) register
   themselves into window._translations. They used to be loaded eagerly -
   all seven, ~320 KB - on every page load, even though only one can ever
   be active and English needs none at all. This file now pulls in just the
   active one (see loadLanguage below) and the rest are fetched only if the
   player actually switches to them.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */

window._lang = 'en';
try{ window._lang = localStorage.getItem('cliveman_lang') || 'en'; }
catch(e){ /* storage can throw in opaque-origin / locked-down contexts; English default is fine */ }
/* Apply saved RTL direction on load */
if(window._lang === 'ar'){
  document.documentElement.setAttribute('dir', 'rtl');
  document.addEventListener('DOMContentLoaded', function(){ document.body.classList.add('rtl-lang'); });
}

/* Translations keyed by original English string. Missing keys fall through
   to English. This line only ensures the object exists without clobbering
   whatever the dictionary files already added. */
window._translations = window._translations || {};

/* ── On-demand dictionary loading ──
   LANGS is the authoritative list of shipped dictionaries; 'en' is the
   source language and has no file. loadLanguage() is idempotent and
   coalesces concurrent requests for the same language.

   Two loading paths, because the game must also run from file:// (no
   server), which rules out fetch():
     - during initial parse, document.write keeps the dictionary strictly
       ordered before every later script, exactly as the old static tags did;
     - afterwards (a language switch mid-game), a dynamically injected
       <script> with an onload callback.
   Both are plain classic scripts, so the dictionary lands in the same
   shared global scope as before. */
window.I18N_LANGS = ['fr','es','zh','pt','ru','hi','ar'];
var _langPending = {};
window.loadLanguage = function(lang, cb){
  cb = cb || function(){};
  if(lang === 'en' || window._translations[lang] || window.I18N_LANGS.indexOf(lang) === -1){
    cb(); return;
  }
  var waiting = _langPending[lang];
  if(waiting){ waiting.push(cb); return; }
  _langPending[lang] = [cb];
  function done(){
    var qd = _langPending[lang] || [];
    _langPending[lang] = null;
    for(var i = 0; i < qd.length; i++){ try{ qd[i](); }catch(e){} }
  }
  var src = 'engine/i18n/' + lang + '.js';
  var el = document.createElement('script');
  el.src = src;
  el.onload = done;
  el.onerror = done;   /* a missing dictionary just falls through to English */
  (document.head || document.documentElement).appendChild(el);
};

/* Pull the saved language in synchronously while the parser is still on this
   script, so nothing downstream can observe a half-translated game. */
if(window._lang !== 'en' && document.readyState === 'loading'){
  try{
    if(window.I18N_LANGS.indexOf(window._lang) !== -1){
      document.write('<scr'+'ipt src="engine/i18n/'+window._lang+'.js"></scr'+'ipt>');
    }
  }catch(e){ /* fall back to the async path below */ }
}
if(window._lang !== 'en'){
  /* No-op when document.write already handled it; covers the async case. */
  document.addEventListener('DOMContentLoaded', function(){
    if(!window._translations[window._lang]) window.loadLanguage(window._lang, function(){
      if(window.setLanguage) window.setLanguage(window._lang);
    });
  });
}

/* Translate function — returns translated string or original if no translation exists */
window.t = function(s){
  if(!s) return s;
  var lang = window._lang || 'en';
  if(lang === 'en') return s;
  var dict = window._translations[lang];
  if(!dict) return s;
  /* Try exact match first */
  if(dict[s] !== undefined) return dict[s];
  /* Fallback: English */
  return s;
};

/* Translate raw substrings within a larger string (for composed text) */
/* Substring pass for composed lines - a single forward scan. At each
   position the longest matching key is replaced and the scan continues
   PAST the replacement, so a translation's own text can never be
   re-matched by another key (the old split/join loop could cascade like
   that). Keys are bucketed by first character and sorted longest-first,
   built once per language and cached, so each position only tests the
   few keys that could possibly start there. */
var _tSubIndex = {};
function _tSubBuckets(lang, dict){
  var idx = _tSubIndex[lang];
  if(idx) return idx;
  idx = {};
  for(var key in dict){
    if(!key) continue;
    var c = key.charAt(0);
    (idx[c] = idx[c] || []).push(key);
  }
  for(var ch in idx) idx[ch].sort(function(a,b){ return b.length - a.length; });
  _tSubIndex[lang] = idx;
  return idx;
}
window.tSub = function(s){
  if(!s) return s;
  var lang = window._lang || 'en';
  if(lang === 'en') return s;
  var dict = window._translations[lang];
  if(!dict) return s;
  var idx = _tSubBuckets(lang, dict);
  var out = '', i = 0, n = s.length;
  while(i < n){
    var bucket = idx[s.charAt(i)];
    var matched = false;
    if(bucket){
      for(var k = 0; k < bucket.length; k++){
        var key = bucket[k];
        if(key.length <= n - i && s.startsWith(key, i)){
          out += dict[key];
          i += key.length;
          matched = true;
          break;
        }
      }
    }
    if(!matched){ out += s.charAt(i); i++; }
  }
  return out;
};

window.setLanguage = function(lang, cb){
  /* The dictionary may not be resident yet (they load on demand now), so
     fetch it first and only then repaint - otherwise the UI would flash
     English for one frame before the strings arrived. */
  if(lang !== 'en' && !window._translations[lang]){
    window.loadLanguage(lang, function(){ window.setLanguage(lang, cb); });
    return;
  }
  window._lang = lang;
  try{ localStorage.setItem('cliveman_lang', lang); }catch(e){}
  /* Apply RTL for Arabic, otherwise LTR */
  if(lang === 'ar'){
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.classList.add('rtl-lang');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
    document.body.classList.remove('rtl-lang');
  }
  /* Refresh any visible translatable elements */
  if(typeof window.updatePadMode === 'function') window.updatePadMode();
  /* Refresh data-tpl elements with new language */
  document.querySelectorAll('[data-tpl]').forEach(function(el){
    var tpl = el.getAttribute('data-tpl');
    var translated = window.tSub(tpl);
    el.textContent = translated
      .replace(/\{CHECK_KEY\}/g, window._padConnected?labelCheck():'C')
      .replace(/\{CHECK_VERB\}/g, window._padConnected?'press '+labelCheck():'press C')
      .replace(/\{CONFIRM_KEY\}/g, window._padConnected?labelConfirm():'Enter');
  });
  /* Update title screen subtitle if visible */
  var subEl=document.getElementById('_subTitle');
  if(subEl && window.t){
    subEl.textContent=window.t('detective adventure');
  }
  /* Force FP refresh if in nav mode - use global helper from IIFE */
  if(document.body.classList.contains('nav-mode') && window._refreshFpDisplay){
    window._refreshFpDisplay();
  }
  /* Refresh data-pad-text elements */
  document.querySelectorAll('[data-pad-text]').forEach(function(el){
    var kbd = el.getAttribute('data-kbd-text') || '';
    var pad = el.getAttribute('data-pad-text') || '';
    pad = pad.replace(/\{CONFIRM\}/g, labelConfirm()).replace(/\{CHECK\}/g, labelCheck());
    /* Try full-string translation first, else substring */
    var kbdT = (window.t && window._translations[window._lang] && window._translations[window._lang][kbd]) ? window._translations[window._lang][kbd] : window.tSub(kbd);
    var padT = (window.t && window._translations[window._lang] && window._translations[window._lang][pad]) ? window._translations[window._lang][pad] : window.tSub(pad);
    el.textContent = window._padConnected ? padT : kbdT;
  });
  if(cb) cb();
};
