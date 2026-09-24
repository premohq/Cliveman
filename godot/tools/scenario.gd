extends Node
## Drives the game from a JSON step list and saves frames, mirroring the
## Playwright harness used on the browser build so the two can be compared
## shot for shot:
##
##   godot --path . -- --scenario steps.json
##
## Steps, run in order:
##   {"boot": true}                  run the real boot sequence (not awaited)
##   {"eval": "g.c1.ch1_clemons()"}  an Expression with t (terminal), g (game), S (state)
##   {"wait": 1500}                  milliseconds
##   {"key": "Enter"}                press and release a key
##   {"hold": "w", "ms": 400}        hold a key
##   {"shot": "name.png"}            save the frame next to the JSON
##   {"size": [1280, 720]}           resize the window
##   {"pad": "xbox"}                 pretend a controller took over ("ps", or "" for none)
##   {"pad_toast": true}             show the XInput CONNECTED toast
##   {"choose": 0}                   press the Nth button in the choice panel
##   {"fixed_random": 0.5}           pin the minigames' dice (Math.random in the browser)

var t: Node
var g: Node


func run(term: Node, game: Node, path: String) -> void:
	t = term
	g = game
	var dir := path.get_base_dir()
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("scenario: cannot read " + path)
		get_tree().quit(1)
		return
	var steps: Variant = JSON.parse_string(f.get_as_text())
	if not steps is Array:
		push_error("scenario: expected an array")
		get_tree().quit(1)
		return
	# Keep the desktop's real keyboard and mouse out of the run: only the
	# synthetic events below should reach the game.
	get_window().unfocusable = true
	get_window().mouse_passthrough = true
	SaveStore.folder = "user://test_saves"
	await get_tree().process_frame
	for s in steps:
		if s.has("size"):
			get_window().size = Vector2i(s["size"][0], s["size"][1])
		if s.has("boot"):
			g.call("boot", t)
		if s.has("eval"):
			var e := Expression.new()
			if e.parse(s["eval"], ["t", "g", "S"]) != OK:
				print("[eval parse error] ", e.get_error_text())
			else:
				var r: Variant = e.execute([t, g, GameState], self)
				if e.has_execute_failed():
					print("[eval error] ", e.get_error_text())
				elif r != null and not (r is Object):
					print("[eval] ", r)
		if s.has("pad"):
			Pad.pad_type = s["pad"]
			Pad.connected = s["pad"] != ""
			Pad.mode_changed.emit(Pad.connected)
		if s.has("pad_toast"):
			t.pad_toast.show_parts([["🎮", Css.AMBER, 20, 0, 8], ["XINPUT CONNECTED", Css.GREEN_BRIGHT, 20, 0, 0],
				["XBOX 360 CONTROLLER", Css.GREEN_DIM, 14, 8, 0]])
		if s.has("fixed_random"):
			Minigames.fixed_random = float(s["fixed_random"])
		if s.has("choose"):
			var btns: Array = []
			var stack: Array = [t.choice_flow]
			while not stack.is_empty():
				var n: Node = stack.pop_front()
				if n is CssButton and (n as CssButton).is_visible_in_tree():
					btns.append(n)
				var kids := n.get_children()
				kids.reverse()
				for k in kids:
					stack.push_front(k)
			var idx := int(s["choose"])
			if idx < btns.size():
				(btns[idx] as CssButton).pressed.emit()
			else:
				print("[choose] no button ", idx, " of ", btns.size())
		if s.has("wait"):
			await get_tree().create_timer(float(s["wait"]) / 1000.0, true).timeout
		if s.has("key"):
			await _press(s["key"], 60)
		if s.has("hold"):
			await _press(s["hold"], int(s.get("ms", 300)))
		if s.has("shot"):
			await RenderingServer.frame_post_draw
			var img := get_viewport().get_texture().get_image()
			img.save_png(dir.path_join(s["shot"]))
			print("shot ", s["shot"])
		if s.has("quit"):
			break
	get_tree().quit()


func _keycode(name: String) -> Key:
	match name:
		"Enter": return KEY_ENTER
		"Space", " ": return KEY_SPACE
		"Escape": return KEY_ESCAPE
		"ArrowUp": return KEY_UP
		"ArrowDown": return KEY_DOWN
		"ArrowLeft": return KEY_LEFT
		"ArrowRight": return KEY_RIGHT
	return OS.find_keycode_from_string(name.to_upper())


func _press(name: String, ms: int) -> void:
	var ev := InputEventKey.new()
	ev.keycode = _keycode(name)
	ev.physical_keycode = ev.keycode
	ev.unicode = name.unicode_at(0) if name.length() == 1 else 0
	ev.pressed = true
	Input.parse_input_event(ev)
	await get_tree().create_timer(ms / 1000.0, true).timeout
	var up := ev.duplicate()
	up.pressed = false
	Input.parse_input_event(up)
	await get_tree().process_frame
