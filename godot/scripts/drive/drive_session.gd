extends Node
## startClivesBuick(opts) from minigame/clivesbuick.js: one night drive, ending
## when the car reaches the destination.
##
## The canvas is 1280x720 at pixel ratio 1, the same size as the nav viewport,
## and fills #mapArea while body.cv-driving is set. Physics, camera, quips and
## the arrival test are the bundle's, constant for constant.

const CW := 1280
const CH := 720

const MAX_FWD := 30.0
const MAX_REV := 11.0
const ACCEL := 26.0
const BRAKE := 42.0
const DRAG := 9.0
const TURN := 2.0
const CAM_BACK := 7.2
const CAM_HEIGHT := 3.1

var t: Node
var world: DriveWorld
var car: DriveCar
var hud: DriveHud
var vp: SubViewport
var camera: Camera3D
var engine_tone: EngineTone

var pos := Vector3.ZERO      ## road intersection, clear of buildings
var heading := 0.0           ## forward = (sin, 0, cos)
var speed := 0.0

var _cam_pos := Vector3.ZERO
var _keys := {}
var _pad_save_prev := false
var _done := false
var _next_quip := 0.0
var _hit_cool := 0.0
var _drive_quips: Array = []
var _hit_quips: Array = []
var _on_quip := Callable()
var _on_arrive := Callable()
var _elapsed_ms := 0.0


func run(term: Node, cfg: Dictionary) -> String:
	t = term
	_drive_quips = cfg.get("driveQuips", [])
	_hit_quips = cfg.get("hitQuips", [])
	_on_quip = cfg.get("onQuip", Callable())
	_on_arrive = cfg.get("onArrive", Callable())
	_next_quip = 5500.0

	vp = SubViewport.new()
	vp.size = Vector2i(CW, CH)
	vp.own_world_3d = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.msaa_3d = Viewport.MSAA_4X       # the drive's renderer is antialias:true
	add_child(vp)

	world = DriveWorld.new()
	vp.add_child(world)
	world.build(cfg.get("goalKey", cfg.get("destLabel", cfg.get("title", ""))))

	car = DriveCar.new()
	vp.add_child(car)
	car.setup(world)

	camera = Camera3D.new()
	camera.fov = 60.0
	camera.near = 0.1
	camera.far = 2000.0
	camera.keep_aspect = Camera3D.KEEP_HEIGHT
	vp.add_child(camera)
	camera.make_current()
	_cam_pos = Vector3(-sin(heading) * CAM_BACK, CAM_HEIGHT, -cos(heading) * CAM_BACK)

	hud = DriveHud.new()
	hud.setup(t, world, vp)
	hud.set_title(cfg.get("title", "DRIVE TO BIG SMILES MAYO CORP"))
	hud.on_blocked = func() -> void:
		var blocked: String = cfg.get("blockedText", "")
		if blocked != "":
			hud.show_bubble(blocked)
		var cb: Callable = cfg.get("onBlocked", Callable())
		if cb.is_valid():
			cb.call()
	hud.on_save = func() -> void:
		var cb: Callable = cfg.get("onSave", Callable())
		hud.show_save_box(str(cb.call()) if cb.is_valid() else "")
	t.mount_nav_hud(hud)

	engine_tone = EngineTone.new()
	add_child(engine_tone)

	var hint: String = cfg.get("startHint", "")
	if hint != "":
		hud.show_bubble(hint)

	if t.is_autoplay():
		await t.sleep(600)
		return "arrived"
	while not _done:
		await get_tree().process_frame
	return "arrived"


func _input(event: InputEvent) -> void:
	if _done or t == null or t.game_paused:
		return
	if event is InputEventKey and not event.echo:
		var k: InputEventKey = event
		var key := _key_name(k.keycode)
		if key == "":
			return
		if k.pressed and key == "p":
			hud.on_save.call()
			get_viewport().set_input_as_handled()
			return
		_keys[key] = k.pressed
		if k.pressed:
			engine_tone.start()
		get_viewport().set_input_as_handled()


func on_pad_mode() -> void:
	if hud:
		hud.on_pad_mode()


func _key_name(code: Key) -> String:
	match code:
		KEY_W, KEY_UP: return "up"
		KEY_S, KEY_DOWN: return "down"
		KEY_A, KEY_LEFT: return "left"
		KEY_D, KEY_RIGHT: return "right"
		KEY_P: return "p"
	return ""


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		_keys.clear()


## tick(now): the bundle's frame, in order.
func _process(delta: float) -> void:
	if _done or world == null:
		return
	if t.game_paused:
		_keys.clear()
		_pad_save_prev = false
		return
	_elapsed_ms += delta * 1000.0
	var dt := minf(0.05, delta)
	var up: bool = _keys.get("up", false)
	var down: bool = _keys.get("down", false)
	var left: bool = _keys.get("left", false)
	var right: bool = _keys.get("right", false)

	# gamepad, GTA V style: RT / RB / A / stick up accelerate, LT / LB / X /
	# stick down brake and reverse, left stick or d-pad steer, B handbrake,
	# Start saves
	var g_throttle := 0.0
	var g_brake := 0.0
	var g_steer := 0.0
	var g_hand := false
	if Pad.device() >= 0:
		var ly := Pad.axis(1)
		var fwd_stick := -ly if ly < -0.30 else 0.0
		var rev_stick := ly if ly > 0.30 else 0.0
		g_throttle = maxf(maxf(Pad.value(7), 1.0 if Pad.pressed(5) else 0.0), maxf(1.0 if Pad.pressed(0) else 0.0, fwd_stick))
		g_brake = maxf(maxf(Pad.value(6), 1.0 if Pad.pressed(4) else 0.0), maxf(1.0 if Pad.pressed(2) else 0.0, rev_stick))
		var ax := Pad.axis(0)
		if absf(ax) < 0.12:
			ax = 0.0
		var dpad := (-1.0 if Pad.pressed(14) else 0.0) + (1.0 if Pad.pressed(15) else 0.0)
		g_steer = ax if ax != 0.0 else dpad
		g_hand = Pad.pressed(1)
		var save := Pad.pressed(9)
		if save and not _pad_save_prev and hud.on_save.is_valid():
			hud.on_save.call()
		_pad_save_prev = save
		if g_throttle > 0.04 or g_brake > 0.04:
			engine_tone.start()

	var throttle := minf(1.0, (1.0 if up else 0.0) + g_throttle)
	var braking := minf(1.0, (1.0 if down else 0.0) + g_brake)
	if throttle > 0.03:
		speed += ACCEL * dt * throttle
	elif braking > 0.03:
		speed -= BRAKE * dt * braking
	else:
		var d := DRAG * dt
		if absf(speed) <= d:
			speed = 0.0
		else:
			speed -= signf(speed) * d
	if g_hand:
		var dh := BRAKE * 1.7 * dt
		if absf(speed) <= dh:
			speed = 0.0
		else:
			speed -= signf(speed) * dh
	speed = clampf(speed, -MAX_REV, MAX_FWD)

	var steer_auth := minf(1.0, absf(speed) / 7.0) * signf(speed if speed != 0.0 else 1.0)
	var steer_in := clampf((1.0 if left else 0.0) - (1.0 if right else 0.0) - g_steer, -1.0, 1.0)
	var d_head := TURN * dt * steer_auth * steer_in
	if d_head != 0.0:
		# never let steering rotate the footprint deeper into a building
		if world.penetration_at(pos.x, pos.z, heading + d_head) <= world.penetration_at(pos.x, pos.z, heading) + 1e-4:
			heading += d_head

	var fx := sin(heading)
	var fz := cos(heading)
	var nx := pos.x + fx * speed * dt
	var nz := pos.z + fz * speed * dt
	var hit := false
	# per-axis moves pass when the destination is clear, or when the move
	# shrinks an existing overlap, so the car can always back out of a wall
	var pen_now := world.penetration_at(pos.x, pos.z, heading)
	var pen_x := world.penetration_at(nx, pos.z, heading)
	if pen_x <= 0.0 or pen_x < pen_now - 1e-4:
		pos.x = nx
	else:
		speed *= 0.25
		hit = true
	var pen_z := world.penetration_at(pos.x, nz, heading)
	if pen_z <= 0.0 or pen_z < world.penetration_at(pos.x, pos.z, heading) - 1e-4:
		pos.z = nz
	else:
		speed *= 0.25
		hit = true
	# safety net: ease out along the shallowest axis if still overlapping
	var push := {"x": 0.0, "z": 0.0, "depth": 0.0}
	if world.penetration_at(pos.x, pos.z, heading, push) > 0.0:
		var m: float = minf(float(push["depth"]) + 0.02, 6.0 * dt)
		pos.x += float(push["x"]) * m
		pos.z += float(push["z"]) * m

	# city limits: the whole rotated car stays inside the generated roads
	var car_radius := Vector2(DriveWorld.CAR_HL + DriveWorld.CAR_SKIN, DriveWorld.CAR_HW + DriveWorld.CAR_SKIN).length()
	var drive_min := world.city_min + car_radius
	var drive_max := world.city_max - car_radius
	if pos.x > drive_max:
		pos.x = drive_max
		speed *= 0.2
		hit = true
	elif pos.x < drive_min:
		pos.x = drive_min
		speed *= 0.2
		hit = true
	if pos.z > drive_max:
		pos.z = drive_max
		speed *= 0.2
		hit = true
	elif pos.z < drive_min:
		pos.z = drive_min
		speed *= 0.2
		hit = true

	car.drive(pos, heading, speed, dt)
	car.update_smoke(dt, pos, fx, fz, throttle, speed)
	car.update_taillights(braking, _elapsed_ms)
	car.update_lights(braking, speed)

	var back := CAM_BACK + absf(speed) * 0.07
	var desired := Vector3(pos.x - fx * back, CAM_HEIGHT, pos.z - fz * back)
	_cam_pos = _cam_pos.lerp(desired, 1.0 - pow(0.0009, dt))
	camera.position = _cam_pos
	camera.look_at(Vector3(pos.x + fx * 5.0, 1.2, pos.z + fz * 5.0), Vector3.UP)

	engine_tone.set_speed(speed)
	_maybe_quip(_elapsed_ms, speed, hit)
	world.pulse_goal(_elapsed_ms)
	hud.set_car(pos, heading, speed)
	hud.set_speed(int(round(absf(speed) * 3.6)))

	var dg := Vector2(pos.x - world.goal.x, pos.z - world.goal.z)
	if dg.length_squared() < 36.0:
		_done = true
		engine_tone.stop_tone()
		if _on_arrive.is_valid():
			_on_arrive.call()


## maybeQuip: a hit line at most every 2.6s, otherwise idle chatter every
## 5.5-11s while the car is actually moving.
func _maybe_quip(now: float, sp: float, hit: bool) -> void:
	if hit:
		if now > _hit_cool:
			_hit_cool = now + 2600.0
			if not _hit_quips.is_empty():
				_say(_hit_quips[randi() % _hit_quips.size()])
		return
	if absf(sp) > 2.0 and now > _next_quip:
		_next_quip = now + 5500.0 + randf() * 5500.0
		if not _drive_quips.is_empty():
			_say(_drive_quips[randi() % _drive_quips.size()])


func _say(line: String) -> void:
	hud.show_bubble(line)
	if _on_quip.is_valid():
		_on_quip.call(line)
