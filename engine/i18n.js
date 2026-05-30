/* ========================================================================
   CLIVEMAN 3.1  -  js/01-i18n.js
   Language + translation system: _lang, _translations, t(), tSub(), setLanguage(), RTL handling.

   NOTE: classic scripts sharing one global scope. Load order in
   index.html is significant - do not reorder these <script> tags.
   ======================================================================== */


window._lang = localStorage.getItem('cliveman_lang') || 'en';
/* Apply saved RTL direction on load */
if(window._lang === 'ar'){
  document.documentElement.setAttribute('dir', 'rtl');
  document.addEventListener('DOMContentLoaded', function(){ document.body.classList.add('rtl-lang'); });
}

/* Translations keyed by original English string.
   Missing keys fall through to English. */
window._translations = {
  fr: {
    /* translations removed - add entries here when ready */
  },
  es: {
    /* translations removed - add entries here when ready */
  },
  zh: {
    /* translations removed - add entries here when ready */
  },
  pt: {
    /* translations removed - add entries here when ready */
  },
  ru: {
    /* translations removed - add entries here when ready */
  },
  hi: {
    /* translations removed - add entries here when ready */
  },
  ar: {
    /* translations removed - add entries here when ready */
  },
};

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
window.tSub = function(s){
  if(!s) return s;
  var lang = window._lang || 'en';
  if(lang === 'en') return s;
  var dict = window._translations[lang];
  if(!dict) return s;
  var out = s;
  for(var key in dict){
    if(out.indexOf(key) !== -1){
      out = out.split(key).join(dict[key]);
    }
  }
  return out;
};

window.setLanguage = function(lang){
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
  /* Update the prompt line */
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
};