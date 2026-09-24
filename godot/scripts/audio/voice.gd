class_name Voice
extends Node
## Character voices and dialogue colours. Port of engine/voice.js.
##
## The browser build drives the Web Speech API; Godot exposes the host's speech
## engine through DisplayServer, and the two line up almost exactly: enumerate
## the voices, then speak with a voice id, volume, pitch and rate. So the casting
## engine came across rather than being redesigned.
##
## Every speaking character is cast with a real system voice. Voices are
## quality-scored, gender-matched, and handed out so none is reused until every
## eligible one is taken; reused voices get a pitch offset so two characters
## never sound identical. CHAR_COLOR lives here too: Cliveman keeps amber and
## every other character has a hue of their own.

## p pitch, r rate, g gender, vi spread index, c dialogue colour.
const CAST := {
	"__narrator": {"p": 0.90, "r": 1.02, "g": "m", "vi": 0},
	"cliveman": {"p": 0.72, "r": 0.97, "g": "m", "vi": 1, "c": "#ffb000"},
	"bevan": {"p": 0.58, "r": 0.82, "g": "m", "vi": 2, "c": "#58b7ff"},
	"detective bevan": "bevan",
	"mechanic": {"p": 0.88, "r": 1.08, "g": "m", "vi": 3, "c": "#ff8a4d"},
	"clemons": {"p": 0.66, "r": 0.90, "g": "m", "vi": 4, "c": "#e05ce0"},
	"clemons dee tubley": "clemons",
	"tubley": "clemons",
	"linda": {"p": 1.12, "r": 0.94, "g": "f", "vi": 5, "c": "#ff9ad5"},
	"officer reyes": {"p": 1.02, "r": 1.06, "g": "f", "vi": 6, "c": "#4dd9d9"},
	"reyes": "officer reyes",
	"desk clerk": {"p": 1.04, "r": 0.76, "g": "m", "vi": 7, "c": "#a9c3b2"},
	"suspect": {"p": 1.30, "r": 1.18, "g": "m", "vi": 8, "c": "#c8f05a"},
	"worker": {"p": 0.84, "r": 1.00, "g": "m", "vi": 9, "c": "#9fb8c8"},
	"teen": {"p": 1.34, "r": 1.12, "g": "m", "vi": 10, "c": "#7ddf8e"},
	"public defender": {"p": 1.00, "r": 1.20, "g": "f", "vi": 11, "c": "#b48cff"},
	"judge": {"p": 0.62, "r": 0.84, "g": "m", "vi": 12, "c": "#e8f4ea"},
	"fat mustached guy": {"p": 0.70, "r": 0.92, "g": "m", "vi": 13, "c": "#ff5c5c"},
	"dealer": {"p": 0.94, "r": 1.04, "g": "m", "vi": 14, "c": "#35e0a1"},
	"bystander": {"p": 1.08, "r": 1.02, "g": "f", "vi": 15, "c": "#96a8ff"},
	"hollis": {"p": 0.96, "r": 1.16, "g": "m", "vi": 16, "c": "#d78cff"},
	"mr. sun": {"p": 0.78, "r": 0.86, "g": "m", "vi": 17, "c": "#ff4040"},
	"russell pyne": {"p": 1.10, "r": 1.05, "g": "m", "vi": 18, "c": "#49c9a8"},
	"pyne": "russell pyne",
	"guard": {"p": 0.70, "r": 0.95, "g": "m", "vi": 19, "c": "#8ea3ad"},
	"pete": {"p": 0.82, "r": 1.00, "g": "m", "vi": 20, "c": "#e0b96b"},
}

const FEM := "(?i)female|woman|samantha|victoria|karen|zira|susan|hazel|fiona|moira|tessa|serena|allison|ava\\b|kate|kathy|vicki|veena|catherine|monica|paulina|anna|nora|yuna|aria|jenny|michelle|sonia|natasha|hayley|libby|clara|emma|olivia|salli|kimberly|ivy\\b|joanna|kendra|amelie|zosia|milena|laura|lekha|kyoko|mei-jia|sinji|martha|susan"
const MASC := "(?i)\\bmale\\b|\\bman\\b|daniel|david|mark\\b|alex\\b|fred|tom\\b|george|oliver|aaron|arthur|gordon|james|rishi|guy\\b|davis|tony|jason|ryan|thomas|william|matthew|justin|joey|brian|russell|diego|jorge|juan|xander|lee\\b|luca|maged|yuri|ralph|albert"
const NOVELTY := "(?i)albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|shelley|flo\\b|eddy\\b|reed\\b|rocko|sandy\\b|junior|kathy\\b"

var enabled := true

var _cast := {}
var _pool: Array = []
var _pool_lang := "__"
var _assign := {}
var _use_count := {}
var _pending := 0

var _fem := RegEx.new()
var _masc := RegEx.new()
var _novelty := RegEx.new()
var _speaker := RegEx.new()
var _brackets := RegEx.new()
var _stage := RegEx.new()
var _quotes := RegEx.new()
var _deco := RegEx.new()
var _ws := RegEx.new()


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_cast = CAST.duplicate(true)
	_fem.compile(FEM)
	_masc.compile(MASC)
	_novelty.compile(NOVELTY)
	_speaker.compile("^\\s*([^:\"：]{2,30})[:：]\\s*")
	_brackets.compile("\\[[^\\]]*\\]")
	_stage.compile("\\*[^*]{0,80}\\*")
	_quotes.compile("[\"\\x{201C}\\x{201D}\\x{00AB}\\x{00BB}\\x{201E}\\x{2039}\\x{203A}]")
	_deco.compile("[<>=_|\\\\/#~^{}]+")
	_ws.compile("\\s+")
	enabled = supported() and String(Prefs.get_value("cliveman_voice", "1")) != "0"


func supported() -> bool:
	return DisplayServer.has_feature(DisplayServer.FEATURE_TEXT_TO_SPEECH)


func speaker_re() -> RegEx:
	return _speaker


# ── the cast ─────────────────────────────────────────────────────────────────

func cast_of(name: String) -> Variant:
	var e: Variant = _cast.get(name, null)
	if e is String:
		e = _cast.get(e, null)
	return e


## window.CHAR_COLOR(lineOrName): the character's dialogue colour, or null.
func char_color(input: String) -> Variant:
	if input == "":
		return null
	var name := ""
	var m := _speaker.search(input)
	if m:
		name = _norm(m.get_string(1))
	else:
		var bare := input.strip_edges()
		if bare.length() < 2 or bare.length() > 30 or bare.contains("\"") or bare.contains("“") or bare.contains("”"):
			return null
		name = _norm(bare)
	if name == "" or name == "__narrator":
		return null
	if cast_of(name) == null:
		var parts := name.split(" ")
		var last := parts[parts.size() - 1]
		if cast_of(last) != null:
			name = last
	var prof: Dictionary = profile_for(name)
	if prof.has("c"):
		return Color(prof["c"])
	return null


func _norm(raw: String) -> String:
	return _ws.sub(raw.to_lower(), " ", true).strip_edges()


## A uint32 FNV-1a over UTF-16 code units, bit-for-bit as JS computes it,
## double-precision multiply included, so walk-on characters hash to the same
## colour and voice in both builds.
static func _hash(s: String) -> int:
	var h := 2166136261
	for i in s.length():
		var c := s.unicode_at(i)
		var h32 := h - 4294967296 if h >= 2147483648 else h
		var x := (h32 ^ c)
		# back to int32 range
		x = x & 0xFFFFFFFF
		if x >= 2147483648:
			x -= 4294967296
		var prod := float(x) * 16777619.0
		var m := prod - floorf(prod / 4294967296.0) * 4294967296.0
		h = int(m)
	return h


static func _hsl_hex(hue: float, s: float, l: float) -> String:
	s /= 100.0
	l /= 100.0
	var out := "#"
	for n in [0.0, 8.0, 4.0]:
		var k := fmod(n + hue / 30.0, 12.0)
		var c := l - s * minf(l, 1.0 - l) * maxf(-1.0, minf(minf(k - 3.0, 9.0 - k), 1.0))
		out += "%02x" % int(round(255.0 * c))
	return out


func profile_for(name: String) -> Dictionary:
	var e: Variant = cast_of(name)
	if e != null:
		return e
	var h := _hash(name)
	var prof := {
		"p": 0.70 + float(h % 60) / 100.0,
		"r": 0.88 + float((h >> 6) % 25) / 100.0,
		"g": "f" if (h >> 4) % 2 == 1 else "m",
		"vi": (h >> 3) % 32,
		"c": _hsl_hex(75.0 + float((h >> 8) % 256), 90.0, 68.0),
	}
	_cast[name] = prof
	return prof


# ── voice pool ───────────────────────────────────────────────────────────────

func _gender(v: Dictionary) -> String:
	var n := String(v.get("name", "")) + " " + String(v.get("id", ""))
	if _fem.search(n):
		return "f"
	if _masc.search(n):
		return "m"
	return ""


func _score(v: Dictionary) -> int:
	var n := (String(v.get("name", "")) + " " + String(v.get("id", ""))).to_lower()
	var s := 0
	if n.contains("natural") or n.contains("neural"):
		s += 16
	if n.contains("premium") or n.contains("enhanced"):
		s += 8
	if n.contains("google"):
		s += 6
	if n.contains("siri"):
		s += 5
	if n.contains("online"):
		s += 3
	s += 1  # localService: every DisplayServer voice is local
	if n.contains("espeak") or n.contains("compact"):
		s -= 10
	if _novelty.search(n):
		s -= 25
	return s


func _voice_pool() -> Array:
	var lang := I18n.lang
	if not _pool.is_empty() and _pool_lang == lang:
		return _pool
	var all: Array = DisplayServer.tts_get_voices() if supported() else []
	var matched: Array = []
	var seen := {}
	for v in all:
		if not String(v.get("language", "")).to_lower().begins_with(lang):
			continue
		var key := String(v.get("id", v.get("name", "")))
		if seen.has(key):
			continue
		seen[key] = true
		matched.append(v)
	if matched.is_empty():
		matched = all.duplicate()
	matched.sort_custom(func(a, b) -> bool: return _score(a) > _score(b))
	var good: Array = []
	for v in matched:
		if _score(v) >= 0:
			good.append(v)
	if good.size() >= 4:
		matched = good
	_pool = matched
	_pool_lang = lang
	_assign.clear()
	_use_count.clear()
	return _pool


func _voice_for(name: String, prof: Dictionary) -> Dictionary:
	var pool := _voice_pool()
	if _assign.has(name):
		return _assign[name]
	if pool.is_empty():
		_assign[name] = {"id": "", "dp": 0.0}
		return _assign[name]
	var want: String = prof.get("g", "")
	var keys: Array[int] = []
	var min_key := 1 << 40
	for v in pool:
		var g := _gender(v)
		var wrong := 1 if (want != "" and g != "" and g != want) else 0
		var used: int = _use_count.get(String(v.get("id", "")), 0)
		var key := used * 1000 + wrong
		keys.append(key)
		min_key = mini(min_key, key)
	var best: Array = []
	for i in pool.size():
		if keys[i] == min_key:
			best.append(pool[i])
	var v2: Dictionary = best[int(prof.get("vi", 0)) % best.size()]
	var uk := String(v2.get("id", ""))
	var n: int = _use_count.get(uk, 0)
	_use_count[uk] = n + 1
	var dp := 0.0 if n == 0 else (1.0 if n % 2 == 1 else -1.0) * 0.10 * ceilf(n / 2.0)
	_assign[name] = {"id": uk, "dp": dp, "name": String(v2.get("name", ""))}
	return _assign[name]


# ── speech ───────────────────────────────────────────────────────────────────

func speaker_of(text: String, cls: String) -> String:
	if cls == "narration":
		return "__narrator"
	if cls != "speaker":
		return ""
	var m := _speaker.search(text)
	if m == null:
		return "__narrator"
	var name := _norm(m.get_string(1))
	if cast_of(name) != null:
		return name
	var parts := name.split(" ")
	var last := parts[parts.size() - 1]
	if cast_of(last) != null:
		return last
	return name


func clean_for_speech(text: String, is_speaker: bool) -> String:
	var t := text
	if is_speaker:
		var m := _speaker.search(t)
		if m:
			t = t.substr(m.get_end())
	t = _brackets.sub(t, " ", true)
	t = _stage.sub(t, " ", true)
	t = _quotes.sub(t, " ", true)
	t = _deco.sub(t, " ", true)
	t = _ws.sub(t, " ", true).strip_edges()
	return t


## VOICE.say(text, cls)
func say(text: String, cls: String) -> void:
	if not supported() or not enabled:
		return
	if SoundFx.is_muted():
		return
	var who := speaker_of(text, cls)
	if who == "":
		return
	var clean := clean_for_speech(text, cls == "speaker")
	if clean.length() < 2:
		return
	var prof := profile_for(who)
	var cast := _voice_for(who, prof)
	var pitch := clampf(float(prof["p"]) + float(cast.get("dp", 0.0)), 0.1, 2.0)
	if DisplayServer.tts_is_speaking() and _pending >= 5:
		stop()
	_pending += 1
	DisplayServer.tts_speak(clean, String(cast.get("id", "")), 95, pitch, float(prof["r"]), 0, false)


func is_speaking() -> bool:
	return supported() and DisplayServer.tts_is_speaking()


func stop() -> void:
	_pending = 0
	if supported():
		DisplayServer.tts_stop()


func toggle() -> bool:
	if not supported():
		return false
	enabled = not enabled
	Prefs.set_value("cliveman_voice", "1" if enabled else "0")
	if not enabled:
		stop()
	else:
		say('Cliveman: "Voice. On."', "speaker")
	return enabled


func casting_report() -> Array[String]:
	var out: Array[String] = []
	var pool := _voice_pool()
	out.append("pool: %d voice(s) for lang '%s'" % [pool.size(), _pool_lang])
	for name in CAST:
		if CAST[name] is String:
			continue
		var c := _voice_for(name, CAST[name])
		out.append("   %-20s -> %s" % [name, c.get("name", "(none)")])
	return out
