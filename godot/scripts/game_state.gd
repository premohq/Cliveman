extends Node
## Autoload. The `state` object and save codec from engine/cinematic-state.js.
##
## The numeric save code layout is deliberately unchanged, so every .clive file
## written by the browser build loads here and the other way round. Do not
## renumber the flag bits.

signal state_changed

const VERSION := "2.0.20"

var inventory: Array[String] = []
var checkpoint: int = 0
var room_id: int = 0
var saved_row: int = 0
var saved_col: int = 0

var called_bs_clemons: bool = false
var f2_badge: bool = false
var f3_poison: bool = false
var kw1_found: bool = false
var kw2_found: bool = false
var bevan_room_known: bool = false
var ch2_tnt: bool = false
var ch2_poison: bool = false

var resume_room_id: int = -1
var resume_pos: Variant = null
var resume_heading: Variant = null
var money: int = 0
var mechanic_paid: bool = false
var enemies_beat: int = 0
var level: int = 1
var secret_ending: bool = false
var heading: int = 0
var at_drive_start: bool = false

const _FLAG_BITS := [
	["called_bs_clemons", 1],
	["f2_badge", 2],
	["f3_poison", 4],
	["kw1_found", 8],
	["kw2_found", 16],
	["bevan_room_known", 32],
	["ch2_tnt", 64],
	["ch2_poison", 128],
]


## The reset block in engine/boot.js debugMenu(), which is a fresh game.
func reset() -> void:
	inventory.clear()
	checkpoint = 0
	room_id = 0
	saved_row = 0
	saved_col = 0
	for pair in _FLAG_BITS:
		set(pair[0], false)
	resume_room_id = -1
	resume_pos = null
	resume_heading = null
	money = 0
	mechanic_paid = false
	enemies_beat = 0
	level = 1
	secret_ending = false
	heading = 0
	at_drive_start = false
	state_changed.emit()


func add_item(item: String) -> void:
	if not inventory.has(item):
		inventory.append(item)
		state_changed.emit()


## encodeSave()
func encode_save() -> int:
	var cp := checkpoint & 0x7
	var room := room_id & 0xF
	var row := saved_row & 0xF
	var col := saved_col & 0xF
	var flags := 0
	for pair in _FLAG_BITS:
		if get(pair[0]):
			flags |= int(pair[1])
	money = clampi(money, 0, 1023)
	var low := cp | (room << 3) | (row << 7) | (col << 11) | (flags << 15)
	var high := (money & 0x3FF) | (int(mechanic_paid) << 10) | (int(at_drive_start) << 11) \
		| (clampi(enemies_beat, 0, 127) << 12)
	return low + high * 0x800000


## The .clive file body: CLIVE1: + base64(JSON payload), as showSaveCode writes it.
func save_file_text() -> String:
	var payload := {
		"v": 2,
		"code": encode_save(),
		"heading": heading & 3,
		"secretEnding": secret_ending,
		"ts": int(Time.get_unix_time_from_system() * 1000.0),
		"game": "CLIVEMAN",
		"ver": VERSION,
	}
	return "CLIVE1:" + Marshalls.utf8_to_base64(JSON.stringify(payload))


## Parse a .clive file's text into the value decodeSave() accepts: a payload
## Dictionary or a bare numeric code. Returns null for anything else.
func parse_save_text(raw: String) -> Variant:
	raw = raw.strip_edges()
	if raw.begins_with("CLIVE1:"):
		var js := Marshalls.base64_to_utf8(raw.substr(7))
		var parsed: Variant = JSON.parse_string(js)
		if parsed == null:
			return null
		return parsed
	var re := RegEx.new()
	re.compile("^\\d+$")
	if re.search(raw):
		return int(raw)
	return null


## decodeSave(data). Returns {} when invalid, the JS `null`.
func decode_save(data: Variant) -> Dictionary:
	var payload: Dictionary = {}
	var code: Variant = data
	if data is Dictionary:
		payload = data
		if payload.has("game") and payload["game"] != null and payload["game"] != "CLIVEMAN":
			return {}
		code = payload.get("code", null)
	if code is String and (code as String).is_valid_int():
		code = int(code)
	if code is float:
		if code != floor(code):
			return {}
		code = int(code)
	if not (code is int) or code < 0 or code > 0x3FFFFFFFFFF:
		return {}
	var low: int = code % 0x800000
	var high: int = code / 0x800000
	var cp := low & 0x7
	if cp < 1 or cp > 7:
		return {}
	var hd: Variant = null
	if payload.has("heading"):
		var h: Variant = payload["heading"]
		if (h is int or (h is float and h == floor(h))) and int(h) >= 0 and int(h) <= 3:
			hd = int(h)
	return {
		"cp": cp,
		"room": (low >> 3) & 0xF,
		"row": (low >> 7) & 0xF,
		"col": (low >> 11) & 0xF,
		"flags": (low >> 15) & 0xFF,
		"money": high & 0x3FF,
		"mech": (high >> 10) & 0x1,
		"drive": (high >> 11) & 0x1,
		"eb": (high >> 12) & 0x7F,
		"heading": hd,
		"secret_ending": bool(payload.get("secretEnding", false)),
	}


## restoreState(dec)
func restore_state(dec: Dictionary) -> void:
	checkpoint = dec["cp"]
	room_id = dec["room"]
	saved_row = dec["row"]
	saved_col = dec["col"]
	var flags: int = dec["flags"]
	for pair in _FLAG_BITS:
		set(pair[0], (flags & int(pair[1])) != 0)
	money = dec["money"]
	mechanic_paid = dec["mech"] != 0
	at_drive_start = dec["drive"] != 0
	enemies_beat = dec.get("eb", 0)
	secret_ending = dec.get("secret_ending", false)
	heading = dec["heading"] if dec.get("heading") != null else 0
	var lvl := 1
	var threshold := 2
	while enemies_beat >= threshold:
		lvl += 1
		threshold *= 2
	level = lvl
	resume_room_id = dec["room"]
	resume_pos = [dec["row"], dec["col"]]
	resume_heading = dec.get("heading")
	var inv: Array[String] = []
	if dec["cp"] >= 2:
		inv.append("factory map")
	if f2_badge:
		inv.append("factory access badge")
	if f3_poison:
		inv.append("rat poison (burnt box)")
	if dec["cp"] >= 3:
		inv.append("apartment building map")
	if ch2_tnt:
		inv.append("undetonated TNT")
	if ch2_poison:
		inv.append("rat poison (crime scene)")
	inventory = inv
	state_changed.emit()
