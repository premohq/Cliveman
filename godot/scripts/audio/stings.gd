extends Node
## Autoload. CMSTING from engine/audio.js: short dramatic accents that
## punctuate story beats, keyword-matched from section titles like the art and
## the music cues.
##
## The six syntheses are rendered from the original WebAudio graph by
## tools/render_audio.js. The throttle is the original's: at least 2.5 s
## between any two stings and 8 s between repeats of one kind.

const MIN_GAP := 2.5
const SAME_GAP := 8.0

var _last_at := -1e9
var _last_kind := ""
var _last_kind_at := -1e9


func hint(title: String) -> String:
	var t := title.to_lower()
	var rules := [
		["r e s u m e d", ""],
		["arrest", "hit"],
		["trial|court|verdict|g u i l t y", "gavel"],
		["rooftop|chase|escape|breakout", "riser"],
		["dream|nightmare", "dread"],
		["crime scene|collapsed|e p i l o g u e|epilogue", "dread"],
		["s e c r e t|secret|retirement", "resolve"],
		["investigation|docks|pier|mr. sun", "shimmer"],
	]
	for r in rules:
		var re := RegEx.new()
		re.compile(r[0])
		if re.search(t):
			return r[1]
	return ""


func play(kind: String) -> bool:
	if not ["hit", "dread", "riser", "resolve", "shimmer", "gavel"].has(kind):
		return false
	if SoundFx.is_muted():
		return false
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last_at < MIN_GAP:
		return false
	if kind == _last_kind and now - _last_kind_at < SAME_GAP:
		return false
	_last_at = now
	_last_kind = kind
	_last_kind_at = now
	SoundFx.play_file("sting_" + kind)
	return true
