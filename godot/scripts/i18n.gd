extends Node
## Autoload. Port of engine/i18n/core.js: t(), tSub(), setLanguage().
##
## Translations are keyed by the exact English string, as the browser build
## keys them, and missing keys fall through to English. The dictionaries in
## data/i18n/ are lifted verbatim from engine/i18n/*.js by
## tools/export_i18n.js. Godot's own TranslationServer is not used: it would
## auto-translate every Control's text a second time.

signal language_changed(lang: String)

const LANGS := ["fr", "es", "zh", "pt", "ru", "hi", "ar"]

var lang := "en"
var _dicts := {}
var _sub_index := {}


func _ready() -> void:
	lang = Prefs.get_value("cliveman_lang", "en")
	if lang != "en" and not LANGS.has(lang):
		lang = "en"
		Prefs.set_value("cliveman_lang", "en")


func _dict(l: String) -> Dictionary:
	if _dicts.has(l):
		return _dicts[l]
	var d := {}
	var f := FileAccess.open("res://data/i18n/%s.json" % l, FileAccess.READ)
	if f != null:
		var parsed: Variant = JSON.parse_string(f.get_as_text())
		if parsed is Dictionary:
			d = parsed
	_dicts[l] = d
	return d


## window.t(s)
func t(s: String) -> String:
	if s == "" or lang == "en":
		return s
	var d := _dict(lang)
	return d.get(s, s)


func has(s: String) -> bool:
	return lang != "en" and _dict(lang).has(s)


## window.tSub(s): a single forward scan replacing the longest key found at
## each position, never re-scanning a replacement.
func t_sub(s: String) -> String:
	if s == "" or lang == "en":
		return s
	var d := _dict(lang)
	if d.is_empty():
		return s
	var idx: Dictionary = _sub_index.get(lang, {})
	if idx.is_empty():
		for key in d:
			if key == "":
				continue
			var c: String = key[0]
			if not idx.has(c):
				idx[c] = []
			idx[c].append(key)
		for c in idx:
			idx[c].sort_custom(func(a: String, b: String) -> bool: return a.length() > b.length())
		_sub_index[lang] = idx
	var out := ""
	var i := 0
	var n := s.length()
	while i < n:
		var bucket: Array = idx.get(s[i], [])
		var matched := false
		for key in bucket:
			if key.length() <= n - i and s.substr(i, key.length()) == key:
				out += d[key]
				i += key.length()
				matched = true
				break
		if not matched:
			out += s[i]
			i += 1
	return out


## typeLine's translation step: an exact match, else the substring pass.
func line(s: String) -> String:
	var tr_s := t(s)
	if tr_s == s:
		tr_s = t_sub(s)
	return tr_s


func is_rtl() -> bool:
	return lang == "ar"


func set_language(l: String) -> void:
	if l != "en" and not LANGS.has(l):
		l = "en"
	lang = l
	Prefs.set_value("cliveman_lang", l)
	language_changed.emit(l)
