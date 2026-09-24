extends Node
## Autoload. The gamepad half of engine/menus.js (padTick, the connect and
## disconnect handlers, the keyboard/mouse revert and the reactivation poll)
## and the Xbox / PlayStation label helpers from engine/controls-ui.js.
##
## The browser reads pads in the W3C "standard" layout; the button numbers
## below keep its indices and STD maps them onto Godot's SDL ones, so the
## Konami sequence and the rest read as they do in the JS.
##
## One deliberate difference: every room in the browser build uses free
## movement, which clears the arrowHandler that padTick steers through, so
## the d-pad and stick never move Clive there. Here they drive the same held
## flags the keyboard does, which is what the movement map plainly intends.

signal mode_changed(connected: bool)

## window._padConnected: the UI is showing controller prompts. A pad can be
## plugged in while this is false, when the keyboard or mouse took over.
var connected := false
var pad_type := ""   ## "xbox" | "ps" | ""

var t: Node = null   ## the terminal, once it has attached

const DELAY := 380.0
const RATE := 130.0
const BTN_A := 0
const BTN_B := 1
const BTN_X := 2
const BTN_Y := 3
const BTN_LB := 4
const BTN_RB := 5
const BTN_BACK := 8
const BTN_START := 9
const BTN_DU := 12
const BTN_DD := 13
const BTN_DL := 14
const BTN_DR := 15
const KONAMI := [12, 12, 13, 13, 14, 15, 14, 15, 1, 0]

## standard index -> JoyButton; LT and RT (6, 7) are trigger axes here
const STD := [
	JOY_BUTTON_A, JOY_BUTTON_B, JOY_BUTTON_X, JOY_BUTTON_Y,
	JOY_BUTTON_LEFT_SHOULDER, JOY_BUTTON_RIGHT_SHOULDER, -1, -1,
	JOY_BUTTON_BACK, JOY_BUTTON_START, JOY_BUTTON_LEFT_STICK, JOY_BUTTON_RIGHT_STICK,
	JOY_BUTTON_DPAD_UP, JOY_BUTTON_DPAD_DOWN, JOY_BUTTON_DPAD_LEFT, JOY_BUTTON_DPAD_RIGHT,
	JOY_BUTTON_GUIDE,
]

var _looping := false          ## padLoopId: a pad has been seen and is polled
var _prev: Array[bool] = []
var _repeat := {}
var _focus_idx := -1
var _focused: CssButton = null
var _konami: Array = []
var _mouse_moves := 0

## Room movement from the pad, merged with the keyboard's held flags.
var nav_held := {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_prev.resize(STD.size())
	_prev.fill(false)
	Input.joy_connection_changed.connect(_on_joy)


func attach(term: Node) -> void:
	t = term


# ── the pad ─────────────────────────────────────────────────────────────────

func device() -> int:
	var pads := Input.get_connected_joypads()
	return pads[0] if not pads.is_empty() else -1


func value(i: int) -> float:
	var d := device()
	if d < 0:
		return 0.0
	if i == 6:
		return Input.get_joy_axis(d, JOY_AXIS_TRIGGER_LEFT)
	if i == 7:
		return Input.get_joy_axis(d, JOY_AXIS_TRIGGER_RIGHT)
	return 1.0 if Input.is_joy_button_pressed(d, STD[i]) else 0.0


func pressed(i: int) -> bool:
	return value(i) > 0.5


func axis(i: int) -> float:
	var d := device()
	if d < 0:
		return 0.0
	return Input.get_joy_axis(d, [JOY_AXIS_LEFT_X, JOY_AXIS_LEFT_Y, JOY_AXIS_RIGHT_X, JOY_AXIS_RIGHT_Y][i])


func _detect(id: String) -> String:
	var s := id.to_lower()
	if s.contains("054c-0ce6") or s.contains("dualsense") or s.contains("ds5"):
		return "ps"
	if s.contains("054c-05c4") or s.contains("054c-09cc") or s.contains("dualshock") \
			or s.contains("ds4") or s.contains("wireless controller"):
		return "ps"
	if s.contains("054c") or s.contains("ps4 controller") or s.contains("ps5 controller"):
		return "ps"
	return "xbox"


func _pad_id(d: int) -> String:
	var info := Input.get_joy_info(d)
	var ids := ""
	if info.has("vendor_id") and info.has("product_id"):
		ids = " (Vendor: %04x Product: %04x)" % [int(info["vendor_id"]), int(info["product_id"])]
		ids += " %04x-%04x" % [int(info["vendor_id"]), int(info["product_id"])]
	return Input.get_joy_name(d) + ids


func _any_input(d: int) -> bool:
	for i in STD.size():
		if (STD[i] >= 0 and Input.is_joy_button_pressed(d, STD[i])) or ((i == 6 or i == 7) and value(i) > 0.5):
			return true
	for a in [JOY_AXIS_LEFT_X, JOY_AXIS_LEFT_Y, JOY_AXIS_RIGHT_X, JOY_AXIS_RIGHT_Y]:
		if absf(Input.get_joy_axis(d, a)) > 0.45:
			return true
	return false


# ── connect / disconnect / revert / reactivate ──────────────────────────────

## Browsers only expose a pad once a button on it is pressed, and that is when
## gamepadconnected fires; a pad already attached at startup does the same.
func _announce(d: int) -> void:
	connected = true
	pad_type = _detect(_pad_id(d))
	_looping = true
	_update_mode()
	var label := "DUALSHOCK/DUALSENSE" if pad_type == "ps" else "XINPUT"
	var raw := Input.get_joy_name(d)
	var re := RegEx.new()
	re.compile("\\(.*\\)")
	raw = re.sub(raw, "", true)
	re.compile("(?i)xinput")
	raw = re.sub(raw, "").strip_edges().substr(0, 24)
	if raw == "":
		raw = "CONTROLLER"
	_toast([["🎮", Css.AMBER, 20, 0, 8], [label + " CONNECTED", Css.GREEN_BRIGHT, 20, 0, 0],
		[raw.to_upper(), Css.GREEN_DIM, 14, 8, 0]])


func _on_joy(_device: int, is_connected: bool) -> void:
	if is_connected:
		return  # announced on its first input, as the browser does
	if not Input.get_connected_joypads().is_empty():
		return  # another pad is still attached
	connected = false
	pad_type = ""
	_looping = false
	nav_held = {}
	_clear_focus()
	_update_mode()


## _scheduleRevert(): the keyboard or mouse took over.
func _revert() -> void:
	if not connected:
		return
	connected = false
	_clear_focus()
	_update_mode()
	_toast([["KEYBOARD / MOUSE ACTIVE", Css.GREEN_DIM, 20, 0, 0]])


func _input(event: InputEvent) -> void:
	if not connected:
		return
	if event is InputEventMouseMotion:
		var mm: InputEventMouseMotion = event
		if absf(mm.relative.x) < 2.0 and absf(mm.relative.y) < 2.0:
			return
		_mouse_moves += 1
		if _mouse_moves > 2:
			_mouse_moves = 0
			_revert()
	elif event is InputEventMouseButton and event.pressed:
		_revert()
	elif event is InputEventKey and event.pressed and not event.echo:
		_revert()


func _toast(parts: Array) -> void:
	if t != null and t.get("pad_toast") != null:
		t.pad_toast.show_parts(parts)


func _update_mode() -> void:
	mode_changed.emit(connected)


# ── padTick ─────────────────────────────────────────────────────────────────

func _process(_delta: float) -> void:
	var d := device()
	if d < 0:
		return
	if not _looping:
		if _any_input(d):
			_announce(d)
		else:
			return
	elif not connected and _any_input(d):
		# _pollForPadReactivate()
		connected = true
		if pad_type == "":
			pad_type = _detect(_pad_id(d))
		_update_mode()
		var label := "DUALSHOCK/DUALSENSE" if pad_type == "ps" else "CONTROLLER"
		_toast([["🎮", Css.AMBER, 20, 0, 8], [label + " ACTIVE", Css.GREEN_BRIGHT, 20, 0, 0]])
	if t == null:
		return
	_tick(d)


func _tick(_d: int) -> void:
	var now := float(Time.get_ticks_msec())
	var modal: bool = t.menus != null and t.menus.call("modal_open")
	var btns := interactive_buttons()
	var room: Node = t.get("_room")
	var in_nav: bool = not modal and btns.is_empty() and room != null and is_instance_valid(room) \
			and room.get("active") and t.nav_mode and not t.nav_dialog
	var in_menu := not btns.is_empty() and not in_nav

	var du := pressed(BTN_DU)
	var dd := pressed(BTN_DD)
	var dl := pressed(BTN_DL)
	var dr := pressed(BTN_DR)
	var stick := _axis_dir()
	var stick_up := stick == "forward" or stick == "turn_left"
	var stick_dn := stick == "back" or stick == "turn_right"

	if in_nav:
		nav_held = {
			"f": du or stick == "forward",
			"b": dd or stick == "back",
			"tl": dl or stick == "turn_left",
			"tr": dr or stick == "turn_right",
			"sl": pressed(BTN_LB),
			"sr": pressed(BTN_RB),
		}
	else:
		nav_held = {}
		if in_menu:
			_try_repeat("mu", du or dl or stick_up, now, func() -> void:
				_set_focus(btns.size() - 1 if _focus_idx <= 0 else _focus_idx - 1, btns))
			_try_repeat("md", dd or dr or stick_dn, now, func() -> void:
				_set_focus((_focus_idx + 1) % btns.size(), btns))
		else:
			_try_repeat("su", du or stick_up, now, func() -> void: _scroll_story(-100.0))
			_try_repeat("sd", dd or stick_dn, now, func() -> void: _scroll_story(100.0))

	# Konami code tracking, on press edges of any button
	for i in STD.size():
		var on := pressed(i)
		if on and not _prev[i]:
			_konami.append(i)
			if _konami.size() > 10:
				_konami.remove_at(0)
			if _konami == KONAMI:
				_konami.clear()
				var pending: Variant = t.menus.get("_title_pending")
				if pending != null and (pending as Array).is_empty():
					(pending as Array).append("__debug__")

	# A: select / confirm / skip text
	if _edge(BTN_A):
		if t.typing:
			t.skip_requested = true
		elif not _activate_focused(btns):
			var first := _first_choice()
			if first != null:
				SoundFx.ensure()
				SoundFx.key_click()
				first.pressed.emit()
		t.pad_confirm()

	# B: back / cancel, else the second choice
	if _edge(BTN_B):
		var back: CssButton = null
		if modal:
			back = t.menus.call("modal_back_button")
		for b in btns:
			if back != null:
				break
			var tx: String = (b as CssButton).label.text.to_upper()
			if tx.contains("BACK") or tx.contains("CANCEL") or tx.begins_with("NO"):
				back = b
		if back != null:
			SoundFx.ensure()
			SoundFx.key_click()
			back.pressed.emit()
			_clear_focus()
		elif btns.size() > 1:
			SoundFx.ensure()
			SoundFx.key_click()
			(btns[1] as CssButton).pressed.emit()
		elif t.typing:
			t.skip_requested = true

	# X: check the room
	if _edge(BTN_X):
		SoundFx.ensure()
		SoundFx.key_click()
		if not modal and t.movement_allowed and t.check_fn.is_valid():
			t.check_fn.call()

	# Y: inventory
	if _edge(BTN_Y) and not modal:
		SoundFx.ensure()
		SoundFx.key_click()
		t.show_inv()

	# BACK / SHARE: save
	if _edge(BTN_BACK) and not modal:
		SoundFx.ensure()
		SoundFx.key_click()
		t.menus.call("show_save_code")

	for i in STD.size():
		_prev[i] = pressed(i)

	# auto-focus the first menu button; clear when there is no menu
	if in_menu and _focus_idx == -1 and not btns.is_empty():
		_set_focus(0, btns)
	if not in_menu and _focus_idx != -1:
		_clear_focus()
	# the list can change under a held focus (a new set of choices)
	if in_menu and _focused != null and (not is_instance_valid(_focused) or not btns.has(_focused)):
		_focused = null
		_set_focus(0, btns)


func _edge(i: int) -> bool:
	return pressed(i) and not _prev[i]


## axisDir(): the left stick as one of four moves, past a 0.35 dead zone.
func _axis_dir() -> String:
	var x := axis(0)
	var y := axis(1)
	if absf(x) < 0.35 and absf(y) < 0.35:
		return ""
	if absf(y) > absf(x):
		return "forward" if y < 0.0 else "back"
	return "turn_left" if x < 0.0 else "turn_right"


func _try_repeat(id: String, on: bool, now: float, cb: Callable) -> void:
	if on:
		if not _repeat.has(id):
			_repeat[id] = {"next": now, "first": true}
		var r: Dictionary = _repeat[id]
		if now >= float(r["next"]):
			cb.call()
			r["next"] = now + (DELAY if r["first"] else RATE)
			r["first"] = false
	else:
		_repeat.erase(id)


func _scroll_story(dy: float) -> void:
	var s: ScrollContainer = t.scroll
	if s == null:
		return
	s.scroll_vertical += int(dy)
	var bar := s.get_v_scroll_bar()
	var at_bottom := s.scroll_vertical + s.size.y >= bar.max_value - 20.0
	t.user_scrolled_up = not at_bottom


# ── menu focus ──────────────────────────────────────────────────────────────

## getInteractiveBtns(): the open modal's buttons, else every .title-btn and
## .choice-btn in document order.
func interactive_buttons() -> Array:
	if t == null:
		return []
	if t.menus != null and t.menus.call("modal_open"):
		return t.menus.call("modal_buttons")
	var out: Array = []
	for g in ["title_btn", "choice_btn"]:
		for n in get_tree().get_nodes_in_group(g):
			var b := n as CssButton
			if b != null and b.is_visible_in_tree() and not b.disabled:
				out.append(b)
	out.sort_custom(func(a: Node, b: Node) -> bool: return b.is_greater_than(a))
	return out


func _set_focus(idx: int, btns: Array) -> void:
	for i in btns.size():
		(btns[i] as CssButton).pad_focus = i == idx
	_focus_idx = idx
	_focused = btns[idx] if idx >= 0 and idx < btns.size() else null


func _clear_focus() -> void:
	if get_tree() != null:
		for g in ["title_btn", "choice_btn"]:
			for n in get_tree().get_nodes_in_group(g):
				if n is CssButton:
					(n as CssButton).pad_focus = false
	if _focused != null and is_instance_valid(_focused):
		_focused.pad_focus = false
	_focused = null
	_focus_idx = -1


func _activate_focused(btns: Array) -> bool:
	if _focus_idx >= 0 and _focus_idx < btns.size():
		SoundFx.ensure()
		SoundFx.key_click()
		var b: CssButton = btns[_focus_idx]
		_clear_focus()
		b.pressed.emit()
		return true
	if btns.size() == 1:
		SoundFx.ensure()
		SoundFx.key_click()
		(btns[0] as CssButton).pressed.emit()
		return true
	return false


func _first_choice() -> CssButton:
	var list: Array = []
	for n in get_tree().get_nodes_in_group("choice_btn"):
		if n is CssButton and (n as CssButton).is_visible_in_tree():
			list.append(n)
	if list.is_empty():
		return null
	list.sort_custom(func(a: Node, b: Node) -> bool: return b.is_greater_than(a))
	return list[0]


# ── labels ──────────────────────────────────────────────────────────────────

## labelConfirm() / labelCheck(): padType() is null unless connected.
func label_confirm() -> String:
	return "✕" if connected and pad_type == "ps" else "A"


func label_check() -> String:
	return "□" if connected and pad_type == "ps" else "X"
