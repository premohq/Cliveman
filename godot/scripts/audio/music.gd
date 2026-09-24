class_name Music
extends Node
## The live classical score engine. Port of engine/music-classical.js, including
## its music director: cue() steers the score from section, room, cutscene and
## drive titles; setContext() lets a story beat pin a piece; `hold` stops the
## director overriding a pinned beat; `somber` turns calm pools to grief once
## Bevan is dead.
##
## Eighteen public-domain arrangements are performed rather than played back,
## scheduled a fifth of a second ahead of the playhead on a 45 ms tick.

const REPERTOIRE := "res://data/music.json"

## CONTEXTS: pin a piece to a story beat, or pick a pool, or set tension.
const CONTEXTS := {
	"dream": {"pin": "air", "loop": true, "hold": true},
	"bevan_death": {"pin": "air", "loop": false, "pool": "grief", "hold": true},
	"grief": {"pool": "grief"},
	"chase": {"pool": "tense"},
	"calm": {"pool": "calm"},
	"title": {"tension": 0.18},
	"investigate": {"tension": 0.5},
	"lonely": {"tension": 0.62},
	"descent": {"tension": 0.92},
}

## CUE_RULES, matched against the title uppercased with everything but A-Z0-9
## stripped. First match wins.
const CUE_RULES := [
	["^DRIVE", "nachtmusik", "mid", false, -1.0],
	["ADREAM", "air", "", true, -1.0],
	["ROOFTOP", "mountainking", "tense", false, -1.0],
	["RANDOMENCOUNTER", "mountainking", "tense", false, -1.0],
	["HORSETRACK", "williamtell", "tense", false, -1.0],
	["BLACKJACK|TAVERN|GUMSHOE", "greensleeves", "mid", false, -1.0],
	["ARCADE|SNAKE", "nachtmusik", "calm", false, -1.0],
	["CRIMESCENE", "diesirae", "mid", false, -1.0],
	["INTERROGATION|CONVINCINGBEVAN", "elise", "mid", false, -1.0],
	["BIGSMILES|INVESTIGATION", "moonlight", "mid", false, -1.0],
	["YOURAPARTMENT", "morning", "calm", false, -1.0],
	["BEVANSAPARTMENT", "minuet", "calm", false, -1.0],
	["LOBBY|HALLWAY", "", "calm", false, -1.0],
	["PETESSUBS", "gymnopedie", "calm", false, -1.0],
	["CENTRALDUDLEY", "elise", "mid", false, -1.0],
	["SECRETENDING|EARLYRETIREMENT", "ode", "calm", false, -1.0],
	["CHAPTER3|TRIAL|COURT", "lacrimosa", "grief", false, -1.0],
	["EPILOGUE|CORRECTIONAL|PRISON", "swan", "grief", false, -1.0],
	["ENDOFPARTONE", "ode", "calm", false, -1.0],
	["CHAPTER2END", "", "grief", false, -1.0],
	["CHAPTER", "", "", false, 0.5],
]

var synth: Synth = null

var _pieces: Array = []
var _current: Dictionary = {}
var _playing := false
var _tension := 0.0
var _tension_now := 0.0
var _vol := 0.5
var _pinned: Dictionary = {}     ## {id, loop, pool} while a story beat owns the music
var _active_pool := ""
var _hold := false
var _somber := false
var _last_cue_key := ""

var _mel_cursor := 0
var _bass_cursor := 0
var _harm_cursor := 0
var _mel_time := 0.0
var _bass_time := 0.0
var _harm_time := 0.0

var _tick_acc := 0.0
var _gain := 0.0001              ## master gain, eased like setTargetAtTime
var _gain_target := 0.0001
var _gain_tau := 0.1

var _rng := RandomNumberGenerator.new()
var _rules: Array = []


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_rng.randomize()
	var f := FileAccess.open(REPERTOIRE, FileAccess.READ)
	if f != null:
		var parsed: Variant = JSON.parse_string(f.get_as_text())
		if parsed is Array:
			_pieces = parsed
	for r in CUE_RULES:
		var re := RegEx.new()
		re.compile(r[0])
		_rules.append([re, r[1], r[2], r[3], r[4]])
	synth = Synth.new()
	synth.name = "Synth"
	synth.volume = 0.0
	add_child(synth)


# ── audio.js bridge: playMusic / stopMusic ───────────────────────────────────

func play_music(name: String) -> void:
	set_context(name)
	start()


func stop_music() -> void:
	stop()


## Back-compat names some callers still use.
func play(context: String) -> void:
	play_music(context)


# ── engine ───────────────────────────────────────────────────────────────────

func _mood_for(t: float) -> String:
	if t < 0.34:
		return "calm"
	return "mid" if t < 0.67 else "tense"


func _by_id(id: String) -> Dictionary:
	for p in _pieces:
		if p.get("id", "") == id:
			return p
	return {}


func _pick(mood: String, avoid: String) -> Dictionary:
	var pool: Array = []
	for p in _pieces:
		if (p.get("moods", []) as Array).has(mood) and (avoid == "" or p.get("id", "") != avoid):
			pool.append(p)
	if pool.is_empty():
		for p in _pieces:
			if (p.get("moods", []) as Array).has(mood):
				pool.append(p)
	if pool.is_empty():
		pool = _pieces
	return pool[int(floor(_rng.randf() * pool.size()))]


func _mute_val() -> float:
	if SoundFx.is_muted():
		return 0.0001
	return maxf(0.0001, _vol * 0.3)


func _load(p: Dictionary) -> void:
	_current = p
	_mel_cursor = 0
	_bass_cursor = 0
	_harm_cursor = 0
	_mel_time = synth.now() + 0.15
	_bass_time = _mel_time
	_harm_time = _mel_time


func _next_piece() -> Dictionary:
	if not _pinned.is_empty():
		if _pinned.get("loop", false):
			var b := _by_id(_pinned["id"])
			return b if not b.is_empty() else _current
		var pool: String = _pinned.get("pool", "")
		_pinned = {}
		if pool != "":
			_active_pool = pool
			return _pick(pool, _current.get("id", ""))
	var mood := _active_pool if _active_pool != "" else _mood_for(_tension_now)
	if _active_pool != "":
		return _pick(_active_pool, _current.get("id", ""))
	if not _current.is_empty() and (_current.get("moods", []) as Array).has(mood):
		return _current
	return _pick(mood, "")


func start() -> void:
	if _pieces.is_empty():
		return
	if _playing:
		return
	_playing = true
	var first: Dictionary
	if not _pinned.is_empty():
		first = _by_id(_pinned["id"])
		if first.is_empty():
			first = _pick(_mood_for(_tension_now), "")
	else:
		first = _pick(_active_pool if _active_pool != "" else _mood_for(_tension_now), "")
	_load(first)
	_tick_acc = 0.0
	_loop()


func stop() -> void:
	_playing = false
	# master.gain.setTargetAtTime(0.0001, now, 0.3)
	_gain_target = 0.0001
	_gain_tau = 0.3


func set_tension(v: float) -> void:
	_tension = clampf(v, 0.0, 1.0)


func set_volume(v: float) -> void:
	_vol = clampf(v, 0.0, 1.0)


func play_piece(id: String, loop: bool, pool: String) -> bool:
	var p := _by_id(id)
	if p.is_empty():
		return false
	_pinned = {"id": id, "loop": loop, "pool": pool}
	_active_pool = pool
	if _playing:
		_load(p)
	return true


func set_context(name: String) -> bool:
	_hold = false
	_last_cue_key = ""
	if name == "title":
		_somber = false
	if name == "bevan_death":
		_somber = true
	if not CONTEXTS.has(name):
		_pinned = {}
		_active_pool = ""
		set_tension(0.4)
		return false
	var c: Dictionary = CONTEXTS[name]
	if c.has("tension"):
		set_tension(c["tension"])
	if c.has("pin"):
		play_piece(c["pin"], c.get("loop", false), c.get("pool", ""))
		if c.get("hold", false):
			_hold = true
		return true
	_pinned = {}
	_active_pool = c.get("pool", "")
	if _active_pool != "" and _playing and not _current.is_empty() and not (_current.get("moods", []) as Array).has(_active_pool):
		_load(_pick(_active_pool, _current.get("id", "")))
	return true


## ClassicalMusic.cue(text): steer, never start, never override a pinned beat.
func cue(text: String) -> bool:
	if text == "":
		return false
	var key := ""
	for ch in text.to_upper():
		var u := ch.unicode_at(0)
		if (u >= 65 and u <= 90) or (u >= 48 and u <= 57):
			key += ch
	if key == "" or key == _last_cue_key:
		return false
	if _hold:
		return false
	if not _playing:
		return false
	_last_cue_key = key
	for r in _rules:
		if not (r[0] as RegEx).search(key):
			continue
		if float(r[4]) >= 0.0:
			_pinned = {}
			_active_pool = ""
			set_tension(r[4])
			return true
		var pool: String = r[2]
		if _somber and pool == "calm":
			pool = "grief"
		var piece: String = r[1]
		if piece != "":
			if not _current.is_empty() and _current.get("id", "") == piece:
				_pinned = {"id": piece, "loop": r[3], "pool": pool}
				_active_pool = pool
				return true
			play_piece(piece, r[3], pool)
		elif pool != "":
			_pinned = {}
			if _active_pool != pool:
				_active_pool = pool
				if not _current.is_empty() and not (_current.get("moods", []) as Array).has(pool):
					_load(_pick(pool, _current.get("id", "")))
		return true
	return false


func now_playing() -> String:
	return _current.get("name", "")


func _process(delta: float) -> void:
	# master gain easing toward its target (setTargetAtTime)
	_gain += (_gain_target - _gain) * (1.0 - exp(-delta / maxf(0.001, _gain_tau)))
	if synth:
		synth.volume = _gain * 0.9  # musicBus 0.9 under the master
	if not _playing:
		return
	_tick_acc += delta
	while _tick_acc >= 0.045:
		_tick_acc -= 0.045
		_loop()


## loop(): one scheduler pass, as setTimeout(loop, 45) runs it.
func _loop() -> void:
	if not _playing or _current.is_empty():
		return
	_tension_now += (_tension - _tension_now) * 0.05
	_gain_target = _mute_val()
	_gain_tau = 0.1
	var beat := 60.0 / float(_current.get("bpm", 90))
	var horizon := synth.now() + 0.2
	while _mel_time < horizon:
		var melody: Array = _current.get("melody", [])
		var mc: Array = melody[_mel_cursor]
		_note(Synth.freq_of(mc[0]), _mel_time, float(mc[1]) * beat * 0.96, 0.13, true)
		_mel_time += float(mc[1]) * beat
		_mel_cursor += 1
		if _mel_cursor >= melody.size():
			var nxt := _next_piece()
			var restart := _mel_time
			_current = nxt
			_mel_cursor = 0
			_bass_cursor = 0
			_harm_cursor = 0
			_mel_time = restart
			_bass_time = restart
			_harm_time = restart
			beat = 60.0 / float(_current.get("bpm", 90))
	while _bass_time < horizon:
		var bass: Array = _current.get("bass", [])
		if not bass.is_empty():
			var bc: Array = bass[_bass_cursor % bass.size()]
			_bass_note(Synth.freq_of(bc[0]), _bass_time, float(bc[1]) * beat * 0.98)
			_bass_time += float(bc[1]) * beat
			_bass_cursor += 1
			if _bass_cursor >= bass.size():
				_bass_cursor = 0
		elif _current.has("pedal"):
			_bass_note(Synth.freq_of(_current["pedal"]), _bass_time, beat * 4.0)
			_bass_time += beat * 4.0
		else:
			_bass_time += beat * 4.0
	while _harm_time < horizon:
		var harmony: Array = _current.get("harmony", [])
		if not harmony.is_empty():
			var hc: Array = harmony[_harm_cursor % harmony.size()]
			_harm_note(Synth.freq_of(hc[0]), _harm_time, float(hc[1]) * beat * 0.97)
			_harm_time += float(hc[1]) * beat
			_harm_cursor += 1
			if _harm_cursor >= harmony.size():
				_harm_cursor = 0
		else:
			_harm_time += beat * 4.0


func _strings() -> bool:
	return _current.get("lead", "triangle") == "strings"


func _note(freq: float, t: float, dur: float, level: float, send: bool) -> void:
	if freq <= 0.0:
		return
	if _strings():
		synth.schedule(Synth.Timbre.STR, freq, t, dur, level * 0.9, send)
	else:
		synth.schedule(Synth.Timbre.TRI, freq, t, dur, level, send)


func _harm_note(freq: float, t: float, dur: float) -> void:
	if freq <= 0.0:
		return
	if _strings():
		synth.schedule(Synth.Timbre.STR, freq, t, dur, 0.05, false)
	else:
		synth.schedule(Synth.Timbre.TRI, freq, t, dur, 0.055, false)


func _bass_note(freq: float, t: float, dur: float) -> void:
	if freq <= 0.0:
		return
	synth.schedule(Synth.Timbre.SINE, freq, t, dur, 0.09)
