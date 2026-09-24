extends Node
## engine/boot.js: the CRT power-on, the POST screen, main(), and the debug jump
## menu. Also owns the story objects, and "reloads the page" for quit-to-title.

var t: Node
var menus: Node
var title: TitleFlow
var c1: Ch1
var c2: Ch2
var c3: Ch3
var mg: Minigames
var finale: Node


func boot(term: Node) -> void:
	setup(term)
	await _power_on()
	await _post()
	await main()


## Everything boot() builds, without running it. The scenario harness uses this
## to drop straight into a scene.
func setup(term: Node) -> void:
	t = term
	menus = preload("res://scripts/ui/menus.gd").new()
	menus.name = "Menus"
	add_child(menus)
	menus.call("setup", t)
	t.menus = menus
	finale = preload("res://scripts/ui/finale.gd").new()
	finale.name = "Finale"
	t.add_child(finale)
	t.move_child(finale, t.modal_layer.get_index())
	finale.call("setup", t)
	t.finale_node = finale
	title = TitleFlow.new(t, menus)
	c1 = Ch1.new(t)
	c2 = Ch2.new(t)
	mg = Minigames.new(t)
	c3 = Ch3.new(t, c1, c2, mg)


## #crtPowerOn.warming: a 2px white line that blooms to fill the tube and fades,
## while the black behind it lifts through phosphor green. Both run 1.4 s with
## ease-out, and CSS applies the easing to each keyframe step on its own rather
## than across the whole animation. shaders/crt_power_on.gdshader draws it.
const WARMUP_KEYS := [  # at, scaleY, scaleX, opacity
	[0.0, 0.3, 0.05, 0.0], [0.10, 0.5, 1.0, 1.0], [0.25, 120.0, 1.0, 0.8],
	[0.55, 420.0, 1.0, 0.4], [1.0, 420.0, 1.0, 0.0]]
const SCREEN_ON_KEYS := [  # at, background
	[0.0, Color(0, 0, 0, 1)], [0.30, Color(0, 0, 0, 1)],
	[0.55, Color("#0a1a0e")], [1.0, Color(0.0392, 0.102, 0.0549, 0.0)]]


## The keyframe pair around progress e, and the eased fraction between them.
func _keyframe(keys: Array, e: float) -> Array:
	for i in range(keys.size() - 1):
		if e <= float(keys[i + 1][0]):
			var f := (e - float(keys[i][0])) / (float(keys[i + 1][0]) - float(keys[i][0]))
			return [keys[i], keys[i + 1], t._bezier(f, 0.0, 0.0, 0.58, 1.0)]
	return [keys[-1], keys[-1], 1.0]


func _power_on() -> void:
	var p: Control = t.power_on
	p.visible = true
	p.set_meta("warming", true)
	p.queue_redraw()
	var fx := ColorRect.new()
	fx.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fx.set_anchors_preset(Control.PRESET_FULL_RECT)
	var mat := ShaderMaterial.new()
	mat.shader = preload("res://shaders/crt_power_on.gdshader")
	fx.material = mat
	p.add_child(fx)
	var start := Time.get_ticks_msec()
	while Time.get_ticks_msec() - start < 1450 or p.has_meta("frozen_at"):
		# tools: `frozen_at` holds the warm-up at one point on its curve
		var elapsed := float(p.get_meta("frozen_at", -1.0)) * 1000.0
		if elapsed < 0.0:
			elapsed = Time.get_ticks_msec() - start
		var e := minf(1.0, elapsed / 1400.0)
		var k := _keyframe(WARMUP_KEYS, e)
		var f: float = k[2]
		mat.set_shader_parameter("view", p.size)
		mat.set_shader_parameter("sy", lerpf(k[0][1], k[1][1], f))
		mat.set_shader_parameter("sx", lerpf(k[0][2], k[1][2], f))
		mat.set_shader_parameter("op", lerpf(k[0][3], k[1][3], f))
		# colours interpolate premultiplied, so #0a1a0e keeps its hue as it fades
		var b := _keyframe(SCREEN_ON_KEYS, e)
		var from_c: Color = b[0][1]
		var to_c: Color = b[1][1]
		var bg := from_c.lerp(to_c, b[2])
		if to_c.a == 0.0:
			bg = Color(from_c.r, from_c.g, from_c.b, lerpf(from_c.a, 0.0, b[2]))
		mat.set_shader_parameter("bg", bg)
		await get_tree().process_frame
	fx.queue_free()
	p.visible = false


func _post() -> void:
	t.boot_el.visible = true
	var lines := [
		"DUDLEY PD MAINFRAME // POST v3.14",
		"CPU....... 80486DX2 @ 66MHz   [OK]",
		"MEMORY.... 16384 KB           [OK]",
		"HDD....... 540 MB             [OK]",
		"NETWORK... DIAL-UP            [OK]",
		"",
		"LOADING CASE FILE: CLIVEMAN.DAT",
		"DECRYPTING ............ DONE",
		"CONNECTING TO TERMINAL ...",
		"",
		"[ AUTHORIZED PERSONNEL ONLY ]",
		"",
	]
	var text := ""
	for line in lines:
		text += line + "\n"
		t.boot_text.text = text.trim_suffix("\n")
		await t.sleep(140)
	await t.sleep(600)
	t.boot_el.visible = false


func main() -> void:
	var result: Variant = await title.title_screen()
	title.stop_flyover()
	t.clear_screen()
	t.game_started = true
	if result is String and result == "new":
		await title.intro()
		t.section("C H A P T E R   1")
		await c1.ch1_dream()
		if t.ended: return
		await c1.ch1_phone()
		if t.ended: return
		await c3.run_from(1)
	else:
		var dec := GameState.decode_save(result)
		if dec.is_empty():
			await t.type_line("  Save data was corrupted. Starting a new case.", "err")
			await t.sleep(1200)
			await title.intro()
			t.section("C H A P T E R   1")
			await c1.ch1_dream()
			if t.ended: return
			await c1.ch1_phone()
			if t.ended: return
			await c3.run_from(1)
			return
		GameState.restore_state(dec)
		t.blank()
		await t.type_line("  Resuming from checkpoint %d (room %d, pos %d,%d)..." % [dec["cp"], dec["room"], dec["row"], dec["col"]], "sys")
		t.blank()
		t.show_inv()
		await t.sleep(1200)
		await c3.run_from(dec["cp"])


## debugMenu()
func debug_menu() -> void:
	var jumps := [
		["01  THE APARTMENT", "apartment"],
		["02  MAYO FACTORY — FLOOR 1", "factory"],
		["03  MAYO ROOFTOP ENCOUNTER", "rooftop"],
		["04  BEVAN'S APARTMENT BLDG", "bevan_apt"],
		["05  BEVAN'S ROOM 203", "bevan_room"],
		["06  COLLAPSED FACTORY", "crime_scene"],
		["07  CENTRAL DUDLEY", "dudley"],
		["08  PETE'S SUBS", "petes"],
		["09  CHAPTER 3", "ch3"],
		["10  EPILOGUE", "epilogue"],
		["── BACK TO TITLE ──", "cancel"],
	]
	var S := GameState
	while true:
		t.clear_screen()
		t.blank()
		t.instant_line(" ╔══════════════════════════════════════════════╗", "sys")
		t.instant_line(" ║         ★  CLIVEMAN — DEBUG MENU  ★         ║", "sys")
		t.instant_line(" ║          AUTHORIZED PERSONNEL ONLY           ║", "sys")
		t.instant_line(" ╚══════════════════════════════════════════════╝", "sys")
		t.blank()
		t.instant_line("  SELECT A JUMP POINT:", "sys")
		t.blank()
		var opts: Array = []
		for j in jumps:
			opts.append({"keys": [j[1]], "label": j[0]})
		var res: Dictionary = await t.show_choice_buttons(opts)
		var pick: String = res["keys"][0]
		if pick == "cancel":
			return
		S.reset()
		t.ended = false
		t.clear_screen()
		t.instant_line("  [DEBUG] LOADING: " + pick.to_upper() + " ...", "sys")
		t.blank()
		await t.sleep(500)
		match pick:
			"apartment":
				t.section("C H A P T E R   1")
				await c1.ch1_dream()
				await c1.ch1_phone()
				await c3.run_from(1)
			"factory":
				S.inventory = ["factory map"]
				t.section("BIG SMILES MAYO CORP — INVESTIGATION")
				await t.type_line('"[DEBUG] Starting at factory floor 1. All clues available to find."', "sys")
				t.blank()
				await c1.ch1_factory(1)
				await c1.ch1_rooftop()
				await c3.run_from(3)
			"rooftop":
				S.inventory = ["factory map", "factory access badge", "rat poison (burnt box)"]
				S.f2_badge = true
				S.f3_poison = true
				S.kw1_found = true
				S.kw2_found = true
				t.section("THE ROOFTOP")
				await t.type_line('"[DEBUG] Skipping factory floors — jumping to rooftop."', "sys")
				t.blank()
				await t.sleep(400)
				await c1.ch1_rooftop()
				await c3.run_from(3)
			"bevan_apt":
				S.inventory = ["factory map", "apartment building map"]
				S.checkpoint = 3
				await c3.run_from(3)
			"bevan_room":
				S.inventory = ["factory map", "apartment building map"]
				S.bevan_room_known = true
				S.checkpoint = 4
				await c3.run_from(4)
			"crime_scene":
				S.inventory = ["factory map", "apartment building map", "undetonated TNT", "rat poison (crime scene)"]
				S.ch2_tnt = true
				S.ch2_poison = true
				S.checkpoint = 5
				await c3.run_from(5)
			"dudley":
				S.inventory = ["factory map", "apartment building map", "undetonated TNT", "rat poison (crime scene)"]
				S.ch2_tnt = true
				S.ch2_poison = true
				S.money = 100
				S.checkpoint = 6
				await c3.run_from(6)
			"petes":
				S.inventory = ["factory map", "apartment building map", "undetonated TNT", "rat poison (crime scene)"]
				S.ch2_tnt = true
				S.ch2_poison = true
				S.money = 250
				S.mechanic_paid = true
				S.checkpoint = 6
				t.section("PETE'S SUBS")
				await t.type_line('"[DEBUG] Car is fixed. Driving straight to Pete\'s Subs."', "sys")
				t.blank()
				await t.sleep(400)
				await c2.ch2_leave_dudley_to_petes()
				if not t.ended:
					await c2.ch2_petes()
				if not t.ended:
					await c3.ch3()
				if not t.ended:
					await c3.epilogue()
			"ch3":
				S.checkpoint = 7
				await c3.ch3()
				if not t.ended:
					await c3.epilogue()
			"epilogue":
				S.checkpoint = 7
				await c3.epilogue()
		t.ended = false
		t.blank()
		t.instant_line("  [DEBUG] SEGMENT COMPLETE. Returning to debug menu...", "sys")
		await t.sleep(1400)


## window.location.reload(): start over from the power-on with fresh state.
func reload() -> void:
	GameState.reset()
	MusicPlayer.stop_music()
	VoiceCast.stop()
	get_tree().reload_current_scene()


## playFinaleEasterEgg() from the title wordmark. The browser only restarts
## the pixel-art city fallback afterwards; with the 3D flyover running, the
## title comes back with neither the city nor the music, and so does this.
func easter_egg() -> void:
	title.stop_flyover()
	t.stop_music()
	await finale.call("play_easter_egg")
