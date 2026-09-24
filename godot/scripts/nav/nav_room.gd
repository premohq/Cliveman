class_name NavRoom
extends Node
## navigateRoom() from engine/controls-ui.js, with its free-movement model.
##
## Movement happens in grid space, exactly as the JS does it: a position in
## fractional cells, momentum with acceleration and friction, per-axis circle
## collision against wall cells. The 3D view only renders that position; it has
## no physics of its own, so the factory's world map and every room's walls
## behave as they do in the browser.

signal finished(code: String)

# tunables (controls-ui.js)
const FM_ACCEL := 32.0
const FM_MAXV := 5.0
const FM_FRICTION := 6.0
const FM_TURN := 3.0
const FM_RADIUS := 0.28
const FM_MOUSE_SENS := 0.0022
const FM_PITCH_SENS := 0.0016
const SECTOR_STEP_MAX := 0.34
const HEAD_ANGLES := [PI * 1.5, 0.0, PI * 0.5, PI]

var t: Node
var room_id := 0
var grid: NavGrid
var events: Dictionary
var exits: Dictionary
var opts: Dictionary
var view: Nav3D
var hud: NavHud
var vp: SubViewport

var pos := [0, 0]
var heading := 0
var checked := {}
var held := {}
var mouse_yaw := 0.0
var pitch := 0.0
var fs := {"fx": 0.0, "fy": 0.0, "ang": 0.0, "vx": 0.0, "vy": 0.0}
var active := false
var _spawn_cell := ""
var _armed := false
var _done := false
var _code := ""


func run(term: Node, rid: int, g: NavGrid, start: Array, ev: Dictionary, ex: Dictionary, o: Dictionary) -> String:
	t = term
	room_id = rid
	grid = g
	events = ev
	exits = ex
	opts = o
	if opts.get("title", "") != "":
		MusicPlayer.cue(opts["title"])
	if not opts.has("freeMove"):
		opts["freeMove"] = true
	if not opts.get("seamless", false) and not t.nav_just_exited and t.flow.get_child_count() > 0:
		await t.press_enter_to_continue()
	if t.ended:
		return ""
	t.enter_nav_mode()

	var S := GameState
	if S.resume_room_id == room_id and S.resume_pos != null:
		var rp: Array = [S.resume_pos[0], S.resume_pos[1]]
		var rh: Variant = S.resume_heading
		S.resume_room_id = -1
		S.resume_pos = null
		S.resume_heading = null
		var ok: bool = grid.in_bounds(rp[0], rp[1]) and NavGrid.wall_height(grid.sym(rp[0], rp[1])) < 1.0
		if ok:
			pos = rp
			heading = rh if rh != null else 0
		else:
			pos = [start[0], start[1]]
			heading = opts.get("startHeading", 0)
	else:
		pos = [start[0], start[1]]
		heading = opts.get("startHeading", 0)
	S.room_id = room_id
	S.saved_row = pos[0]
	S.saved_col = pos[1]
	S.heading = heading

	_draw_fp()
	t.check_fn = handle_check
	active = true
	held = {}
	fs = {"fx": pos[1] + 0.5, "fy": pos[0] + 0.5, "ang": HEAD_ANGLES[heading], "vx": 0.0, "vy": 0.0}
	_spawn_cell = "%d,%d" % [pos[0], pos[1]]
	_armed = false
	_update_status()
	if t.is_autoplay():
		_autoplay_exit()
	var code: String = await finished
	active = false
	if not opts.get("seamless", false):
		t.exit_nav_mode()
	return code


## Under the autoplay harness, leave by the exit that moves the story forward
## (gates are skipped: the walkthrough never collects the evidence they want).
func _autoplay_exit() -> void:
	await t.sleep(300)
	if _done:
		return
	if t.autoplay_rng != null:
		# explore: stand on most event cells and check them, in random order
		var keys: Array = events.keys()
		for i in range(keys.size() - 1, 0, -1):
			var j: int = t.autoplay_rng.randi_range(0, i)
			var tmp: Variant = keys[i]
			keys[i] = keys[j]
			keys[j] = tmp
		for key in keys:
			if _done:
				return
			if t.autoplay_rng.randf() > 0.8:
				continue
			var kp := String(key).split(",")
			pos[0] = int(kp[0])
			pos[1] = int(kp[1])
			fs["fx"] = pos[1] + 0.5
			fs["fy"] = pos[0] + 0.5
			print("[event] ", opts.get("title", ""), " ", key)
			while t.nav_check_busy or t.typing or not t.movement_allowed:
				await t.sleep(50)
				if _done:
					return
			await handle_check(true)
			await t.sleep(100)
		if _done:
			return
	var onward := ["leave_house", "roof_access", "stairs_to_hallway", "bevan_room", "bevan_talk", "leave_scene"]
	for code in onward:
		for k in exits:
			if exits[k] == code:
				_resolve(code)
				return
	for k in exits:
		_resolve(exits[k])
		return
	_resolve("leave_dudley")


## drawFP(grid,pos,heading,title,opts): the viewport, its HUD and the bar.
func _draw_fp() -> void:
	vp = SubViewport.new()
	vp.size = Vector2i(768, 432)
	vp.own_world_3d = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.msaa_3d = Viewport.MSAA_DISABLED
	add_child(vp)
	view = Nav3D.new()
	vp.add_child(view)
	view.build(grid, Nav3D.pick_theme(opts.get("title", "")), opts.get("itemArt", {}), opts.get("furniture", {}))
	hud = NavHud.new()
	hud.setup(t, vp)
	hud.room = self
	hud.set_title(opts.get("title", ""))
	hud.update_stats()
	t.mount_nav_hud(hud)


func repaint() -> void:
	if view:
		view.dirty = true
	_update_status()


func stop() -> void:
	active = false
	if hud and is_instance_valid(hud):
		hud.queue_free()
	hud = null
	queue_free()


func _resolve(code: String) -> void:
	if _done:
		return
	_done = true
	GameState.saved_row = pos[0]
	GameState.saved_col = pos[1]
	t.check_fn = Callable()
	finished.emit(code)


# ── input ────────────────────────────────────────────────────────────────────

func _input(event: InputEvent) -> void:
	if not active or _done:
		return
	if event is InputEventKey and not event.echo:
		var k: InputEventKey = event
		if t.game_paused:
			if not k.pressed:
				held = {}
			return
		var a := ""
		match k.keycode:
			KEY_UP, KEY_W: a = "f"
			KEY_DOWN, KEY_S: a = "b"
			KEY_LEFT, KEY_A: a = "tl"
			KEY_RIGHT, KEY_D: a = "tr"
			KEY_Q: a = "sl"
			KEY_E: a = "sr"
		if a != "":
			held[a] = k.pressed
			if k.pressed and t.movement_allowed and not t.nav_dialog:
				hud.capture_mouse()
			get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion:
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			return
		if not t.movement_allowed or t.typing:
			return
		var mm: InputEventMouseMotion = event
		mouse_yaw += mm.relative.x * FM_MOUSE_SENS
		pitch = clampf(pitch - mm.relative.y * FM_PITCH_SENS, -1.0, 1.0)


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		held = {}


# ── free movement ────────────────────────────────────────────────────────────

func _blocked(x: float, y: float, fx: float, fy: float) -> bool:
	var c := int(floor(x))
	var r := int(floor(y))
	if not grid.in_bounds(r, c):
		return true
	if NavGrid.wall_height(grid.sym(r, c)) >= 1.0:
		return true
	if grid.has_floor_h():
		var cr := int(floor(fy))
		var cc := int(floor(fx))
		var cur: Variant = grid.floor_at(cr, cc)
		var curv := float(cur) if cur != null else 0.0
		var tgt: Variant = grid.floor_at(r, c)
		if tgt == null:
			return true
		if absf(float(tgt) - curv) > SECTOR_STEP_MAX:
			return true
	return false


## _freeMoveStep(s, held, dt, grid)
func _step(dt: float) -> void:
	# the keyboard's keys and the pad's d-pad / stick / bumpers, together
	var hl := held.duplicate()
	for k in Pad.nav_held:
		if Pad.nav_held[k]:
			hl[k] = true
	if hl.get("tl", false):
		fs["ang"] -= FM_TURN * dt
	if hl.get("tr", false):
		fs["ang"] += FM_TURN * dt
	var cf := cos(fs["ang"])
	var sf := sin(fs["ang"])
	var ax := 0.0
	var ay := 0.0
	if hl.get("f", false):
		ax += cf
		ay += sf
	if hl.get("b", false):
		ax -= cf
		ay -= sf
	if hl.get("sl", false):
		ax += sf
		ay -= cf
	if hl.get("sr", false):
		ax -= sf
		ay += cf
	var al := Vector2(ax, ay).length()
	if al > 0.0:
		ax /= al
		ay /= al
		fs["vx"] += ax * FM_ACCEL * dt
		fs["vy"] += ay * FM_ACCEL * dt
	var fr := exp(-FM_FRICTION * dt)
	fs["vx"] *= fr
	fs["vy"] *= fr
	if absf(fs["vx"]) < 0.0005:
		fs["vx"] = 0.0
	if absf(fs["vy"]) < 0.0005:
		fs["vy"] = 0.0
	var sp := Vector2(fs["vx"], fs["vy"]).length()
	if sp > FM_MAXV:
		fs["vx"] = fs["vx"] / sp * FM_MAXV
		fs["vy"] = fs["vy"] / sp * FM_MAXV
	var nx: float = fs["fx"] + fs["vx"] * dt
	var sx := signf(fs["vx"]) if fs["vx"] != 0.0 else 1.0
	var ex := nx + sx * FM_RADIUS
	if not _blocked(ex, fs["fy"], fs["fx"], fs["fy"]) and not _blocked(ex, fs["fy"] - FM_RADIUS * 0.72, fs["fx"], fs["fy"]) \
			and not _blocked(ex, fs["fy"] + FM_RADIUS * 0.72, fs["fx"], fs["fy"]):
		fs["fx"] = nx
	else:
		fs["vx"] = 0.0
	var ny: float = fs["fy"] + fs["vy"] * dt
	var sy := signf(fs["vy"]) if fs["vy"] != 0.0 else 1.0
	var ey := ny + sy * FM_RADIUS
	if not _blocked(fs["fx"], ey, fs["fx"], fs["fy"]) and not _blocked(fs["fx"] - FM_RADIUS * 0.72, ey, fs["fx"], fs["fy"]) \
			and not _blocked(fs["fx"] + FM_RADIUS * 0.72, ey, fs["fx"], fs["fy"]):
		fs["fy"] = ny
	else:
		fs["vy"] = 0.0


## fmFrame(now)
func _process(delta: float) -> void:
	if not active or _done or view == null:
		return
	var dt := minf(delta, 0.05)
	if t.movement_allowed and not t.typing:
		_step(dt)
		if mouse_yaw != 0.0:
			fs["ang"] += mouse_yaw
	mouse_yaw = 0.0
	var nr := int(floor(fs["fy"]))
	var nc := int(floor(fs["fx"]))
	var changed: bool = nr != pos[0] or nc != pos[1]
	var cs := cos(fs["ang"])
	var sn := sin(fs["ang"])
	var new_heading := (1 if cs > 0 else 3) if absf(cs) >= absf(sn) else (2 if sn > 0 else 0)
	var heading_changed := new_heading != heading
	if changed:
		pos[0] = nr
		pos[1] = nc
		GameState.saved_row = nr
		GameState.saved_col = nc
	if heading_changed:
		heading = new_heading
	GameState.heading = heading
	var cur_key := "%d,%d" % [nr, nc]
	if not _armed and cur_key != _spawn_cell and not exits.has(cur_key):
		_armed = true
	var sp := Vector2(fs["vx"], fs["vy"]).length()
	hud.compass_nav_update(fs["ang"])
	view.render(fs["fx"], fs["fy"], fs["ang"], pitch)
	hud.minimap_update(grid, fs["fx"], fs["fy"], fs["ang"])
	if changed or heading_changed:
		_update_status()
		if changed:
			if sp > 0.2:
				SoundFx.move_blip()
			var ls := grid.sym(nr, nc)
			if _armed and (ls == "S" or ls == "v") and exits.has(cur_key) and t.movement_allowed:
				_armed = false
				handle_check(true)
			elif opts.has("onMove") and not t.typing and t.movement_allowed:
				(opts["onMove"] as Callable).call([pos[0], pos[1]])


## _updateStatus(grid,pos,heading): HERE: label while the compass is up.
func _update_status() -> void:
	if hud == null:
		return
	var sym := grid.sym(pos[0], pos[1])
	var here: String = Nav3D.GLYPH[sym]["label"] if Nav3D.GLYPH.has(sym) else ""
	hud.set_status((I18n.t("HERE: ") + I18n.t(here)) if here != "" else "")
	hud.update_stats()


# ── check ────────────────────────────────────────────────────────────────────

## _aimTargetKey(): march along the facing from the centre of the current cell.
func _aim_target_key() -> String:
	var ang: float = fs["ang"]
	var dxx := cos(ang)
	var dyy := sin(ang)
	var cx: float = pos[1] + 0.5
	var cy: float = pos[0] + 0.5
	var own := "%d,%d" % [pos[0], pos[1]]
	var tt := 0.18
	while tt <= 3.5:
		var wx := cx + dxx * tt
		var wy := cy + dyy * tt
		var cc := int(floor(wx))
		var rr := int(floor(wy))
		if not grid.in_bounds(rr, cc):
			break
		if NavGrid.wall_height(grid.sym(rr, cc)) >= 1.0:
			break
		var k := "%d,%d" % [rr, cc]
		if k != own and (events.has(k) or exits.has(k)):
			return k
		tt += 0.12
	return ""


## handleCheck(noAim)
func handle_check(no_aim: bool = false) -> void:
	if t.typing or not t.movement_allowed or t.nav_check_busy or _done:
		return
	t.nav_check_busy = true
	var aim := "" if no_aim else _aim_target_key()
	var key := aim if aim != "" else "%d,%d" % [pos[0], pos[1]]
	var kp := key.split(",")
	var r := int(kp[0])
	var c := int(kp[1])
	if exits.has(key):
		var code: String = exits[key]
		if opts.has("exitGate"):
			t.set_movement_allowed(false)
			var allowed: bool = await (opts["exitGate"] as Callable).call(code)
			t.set_movement_allowed(true)
			if not allowed:
				_check_done()
				return
		_check_done()
		_resolve(code)
		return
	if events.has(key):
		var cell_sym := grid.sym(r, c)
		var is_pickup: bool = cell_sym == "I" or cell_sym == "U" or checked.has(key)
		if is_pickup and checked.has(key):
			t.set_movement_allowed(false)
			await t.type_line('"Nothing more here."', "narration")
			t.set_movement_allowed(true)
		else:
			t.set_movement_allowed(false)
			if is_pickup:
				t.nav_toast_hold = true
			var use_dialog: bool = t.nav_mode and not is_pickup
			if use_dialog:
				t.nav_suspend()
			var result: Variant = await (events[key] as Callable).call()
			if is_pickup:
				checked[key] = true
				grid.cells[r][c] = "X"
				repaint()
			if result is String and (result as String).length() > 0:
				# The JS leaves nav-dialog up here; exitNavMode clears it.
				t.nav_toast_hold = false
				t.hide_nav_toast()
				_check_done()
				_resolve(result)
				return
			if is_pickup:
				await t.nav_read_gate()
				t.nav_toast_hold = false
				t.hide_nav_toast()
			if use_dialog:
				t.nav_resume()
			t.set_movement_allowed(true)
	else:
		t.set_movement_allowed(false)
		await t.type_line('"Nothing of note here."', "narration")
		t.set_movement_allowed(true)
	_check_done()


func _check_done() -> void:
	t.nav_check_busy = false
	if t.nav_toast_hold:
		t.nav_toast_hold = false
		t.hide_nav_toast()
