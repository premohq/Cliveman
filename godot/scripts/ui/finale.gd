extends Control
## The finale overlay from story/ch3.js: fireworks behind big block-letter
## credits, then the dying-signal static. Also the crew-credits easter egg.
##
## The fireworks canvas is never cleared, only washed with rgba(0,0,0,.18) each
## frame, which is what leaves the trails. The Compatibility renderer clears a
## SubViewport's target whatever its clear mode says, so two of them ping-pong
## instead: each frame draws the other's last frame, washes it, and adds the
## live particles.

const FW_COLORS := ["#ff3366", "#33ff66", "#ffb000", "#66ccff", "#ff66ff", "#ffff66", "#ff9933"]
const BIG_FONT_5 := {
	"A": [" ### ", "#   #", "#####", "#   #", "#   #"], "B": ["#### ", "#   #", "#### ", "#   #", "#### "],
	"C": [" ####", "#    ", "#    ", "#    ", " ####"], "D": ["#### ", "#   #", "#   #", "#   #", "#### "],
	"E": ["#####", "#    ", "#### ", "#    ", "#####"], "F": ["#####", "#    ", "#### ", "#    ", "#    "],
	"G": [" ####", "#    ", "#  ##", "#   #", " ####"], "H": ["#   #", "#   #", "#####", "#   #", "#   #"],
	"I": ["#####", "  #  ", "  #  ", "  #  ", "#####"], "J": ["#####", "   # ", "   # ", "#  # ", " ##  "],
	"K": ["#   #", "#  # ", "###  ", "#  # ", "#   #"], "L": ["#    ", "#    ", "#    ", "#    ", "#####"],
	"M": ["#   #", "## ##", "# # #", "#   #", "#   #"], "N": ["#   #", "##  #", "# # #", "#  ##", "#   #"],
	"O": [" ### ", "#   #", "#   #", "#   #", " ### "], "P": ["#### ", "#   #", "#### ", "#    ", "#    "],
	"Q": [" ### ", "#   #", "# # #", "#  # ", " ## #"], "R": ["#### ", "#   #", "#### ", "#  # ", "#   #"],
	"S": [" ####", "#    ", " ### ", "    #", "#### "], "T": ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
	"U": ["#   #", "#   #", "#   #", "#   #", " ### "], "V": ["#   #", "#   #", "#   #", " # # ", "  #  "],
	"W": ["#   #", "#   #", "# # #", "## ##", "#   #"], "X": ["#   #", " # # ", "  #  ", " # # ", "#   #"],
	"Y": ["#   #", " # # ", "  #  ", "  #  ", "  #  "], "Z": ["#####", "   # ", "  #  ", " #   ", "#####"],
	" ": ["     ", "     ", "     ", "     ", "     "], ".": ["     ", "     ", "     ", "     ", "  #  "],
	"-": ["     ", "     ", " ### ", "     ", "     "], "'": ["  #  ", "  #  ", "     ", "     ", "     "],
}

var t: Node
var _vp: Array[SubViewport] = []
var _canvas: Array[Control] = []
var _face := 0                ## which of the two the next frame renders into
var _view: TextureRect
var _name: CrtText
var _sub: CrtText
var _static: ColorRect
var _signal: Control
var _signal_label: CrtText
var _particles: Array = []
var _fw_active := false
var _acc := 0.0
var _wash := 0.18
var _suppress_beeps := false
var _sprite: Texture2D
var _hiss: AudioStreamPlayer = null
var _egg_audio: AudioStreamPlayer = null
var _signal_t := 0.0


func setup(term: Node) -> void:
	t = term
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	visible = false
	var bg := ColorRect.new()
	bg.color = Color.BLACK
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	for i in 2:
		var vp := SubViewport.new()
		vp.transparent_bg = false
		vp.render_target_update_mode = SubViewport.UPDATE_DISABLED
		vp.size = Vector2i(1280, 720)
		add_child(vp)
		var canvas := Control.new()
		canvas.draw.connect(_draw_fireworks.bind(i))
		vp.add_child(canvas)
		_vp.append(vp)
		_canvas.append(canvas)
	_view = TextureRect.new()
	_view.texture = _vp[0].get_texture()
	_view.set_anchors_preset(Control.PRESET_FULL_RECT)
	_view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_view)

	# one radial sprite: color 0% -> color 35% -> transparent 100%
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	g.add_point(0.35, Color(1, 1, 1, 1))
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.5)
	gt.fill_to = Vector2(1.0, 0.5)
	gt.width = 32
	gt.height = 32
	_sprite = gt

	_name = CrtText.new()
	_name.font = Css.spaced("mono", 1)
	_name.font_size = 14
	_name.line_height = 14.0
	_name.color = Css.GREEN
	_name.glows = [[8.0, Css.GREEN], [18.0, Css.GREEN]]
	_name.align = CrtText.Align.BLOCK
	_name.wrap = false
	_name.modulate.a = 0.0
	add_child(_name)
	_sub = CrtText.new()
	_sub.font = Css.spaced("vt323", 3)
	_sub.font_size = 32
	_sub.color = Css.AMBER
	_sub.glows = [[6.0, Css.AMBER]]
	_sub.modulate.a = 0.0
	add_child(_sub)

	_static = ColorRect.new()
	var sm := ShaderMaterial.new()
	sm.shader = preload("res://shaders/static_noise.gdshader")
	_static.material = sm
	_static.visible = false
	_static.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_static)
	_signal = Control.new()
	_signal.visible = false
	_signal.draw.connect(func() -> void:
		_signal.draw_rect(Rect2(Vector2.ZERO, _signal.size), Css.rgba(0, 0, 0, 0.55))
		_signal.draw_rect(Rect2(Vector2.ZERO, _signal.size), Css.GREEN, false, 2.0))
	add_child(_signal)
	_signal_label = CrtText.new()
	var cjk := SystemFont.new()
	cjk.font_names = PackedStringArray(["Noto Sans SC", "Microsoft YaHei", "SimHei"])
	var fv := FontVariation.new()
	fv.base_font = cjk
	fv.spacing_glyph = 6
	_signal_label.font = fv
	_signal_label.font_size = 32
	_signal_label.color = Css.GREEN
	_signal_label.glows = [[8.0, Css.GREEN], [18.0, Css.GREEN]]
	_signal_label.wrap = false
	_signal_label.text = "信号丢失"
	_signal.add_child(_signal_label)


func _process(delta: float) -> void:
	var vp := get_viewport_rect().size
	size = vp
	for i in 2:
		if _vp[i].size != Vector2i(vp):
			_vp[i].size = Vector2i(vp)
		_canvas[i].size = vp
	_static.size = vp
	_name.size = Vector2(vp.x, _name.custom_minimum_size.y)
	_sub.size = Vector2(vp.x, _sub.custom_minimum_size.y)
	var total := _name.custom_minimum_size.y + 24.0 + _sub.custom_minimum_size.y
	_name.position = Vector2(0, (vp.y - total) * 0.5)
	_sub.position = Vector2(0, _name.position.y + _name.custom_minimum_size.y + 24.0)
	if _signal.visible:
		var lw := _signal_label.content_width() + 48.0
		var lh := _signal_label.text_height() + 20.0
		_signal.size = Vector2(lw, lh)
		_signal.position = (vp - _signal.size) * 0.5
		_signal_label.position = Vector2(24, 10)
		_signal_label.size = Vector2(lw - 48.0, lh - 20.0)
		# @keyframes signalSlowBlink 2.2s ease-in-out: 1 -> .18 -> 1
		_signal_t = fmod(_signal_t + delta, 2.2)
		var ph := _signal_t / 2.2
		var half := ph * 2.0 if ph < 0.5 else (1.0 - ph) * 2.0
		_signal.modulate.a = lerpf(1.0, 0.18, t._bezier(half, 0.42, 0.0, 0.58, 1.0))
		_signal.queue_redraw()
	if _fw_active:
		_acc += delta
		var steps := 0
		while _acc >= 1.0 / 60.0:
			_acc -= 1.0 / 60.0
			_step()
			steps += 1
		if steps > 0:
			# The browser washes and redraws once per animation frame, so the
			# trails fade at 60 Hz however fast this runs: one render per frame,
			# carrying as many washes as there were steps.
			_wash = 1.0 - pow(1.0 - 0.18, steps)
			_vp[_face].render_target_update_mode = SubViewport.UPDATE_ONCE
			_canvas[_face].queue_redraw()
			_view.texture = _vp[_face].get_texture()
			_face = 1 - _face


func _step() -> void:
	for i in range(_particles.size() - 1, -1, -1):
		var p: Dictionary = _particles[i]
		p["x"] += p["vx"]
		p["y"] += p["vy"]
		p["vy"] += 0.06
		p["life"] -= 0.012
		if p["life"] <= 0.0:
			_particles.remove_at(i)


func _draw_fireworks(face: int) -> void:
	var canvas := _canvas[face]
	var prev: Texture2D = _vp[1 - face].get_texture()
	canvas.draw_texture_rect(prev, Rect2(Vector2.ZERO, canvas.size), false)
	canvas.draw_rect(Rect2(Vector2.ZERO, canvas.size), Color(0, 0, 0, _wash))
	for p in _particles:
		var r: float = p["size"] * 3.2
		var c: Color = p["color"]
		c.a = p["life"]
		canvas.draw_texture_rect(_sprite, Rect2(p["x"] - r, p["y"] - r, r * 2.0, r * 2.0), false, c)


func spawn_firework(x: float, y: float, color: String) -> void:
	var num := 60 + int(floor(randf() * 40.0))
	for i in num:
		var angle := (TAU * i) / num + randf() * 0.2
		var speed := 2.0 + randf() * 5.0
		_particles.append({"x": x, "y": y, "vx": cos(angle) * speed, "vy": sin(angle) * speed,
			"life": 1.0, "color": Color(color), "size": 2.0 + randf() * 2.0})
	if not _suppress_beeps:
		SoundFx.firework()


func _start_fireworks() -> void:
	if _fw_active:
		return
	_particles.clear()
	# both faces start black, so the first wash has something to build on
	for i in 2:
		_vp[i].render_target_update_mode = SubViewport.UPDATE_ONCE
		_canvas[i].queue_redraw()
	_fw_active = true


func _stop_fireworks() -> void:
	_fw_active = false
	_particles.clear()
	for vp in _vp:
		vp.render_target_update_mode = SubViewport.UPDATE_DISABLED


static func big_text(text: String) -> String:
	var up := text.to_upper()
	var rows := ["", "", "", "", ""]
	for ch in up:
		var g: Array = BIG_FONT_5.get(ch, BIG_FONT_5[" "])
		for r in 5:
			rows[r] += g[r] + " "
	return "\n".join(rows)


func _fade(n: CanvasItem, to: float) -> void:
	var tw := create_tween()
	tw.tween_property(n, "modulate:a", to, 0.6).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)


func show_finale_name(nm: String, subtitle: String) -> void:
	_fade(_name, 0.0)
	_fade(_sub, 0.0)
	await t.sleep(150)
	_name.text = big_text(nm)
	_sub.text = subtitle
	_fade(_name, 1.0)
	if subtitle != "":
		_fade(_sub, 1.0)
	var vp := get_viewport_rect().size
	for burst in 6:
		var x := vp.x * (0.15 + randf() * 0.7)
		var y := vp.y * (0.15 + randf() * 0.5)
		spawn_firework(x, y, FW_COLORS[int(floor(randf() * FW_COLORS.size()))])
		await t.sleep(260)
	await t.sleep(900)


func _start_static() -> void:
	_static.visible = true
	_signal.visible = true
	_signal_t = 0.0
	if not SoundFx.is_muted():
		_hiss = AudioStreamPlayer.new()
		var s: AudioStreamWAV = load("res://assets/audio/sfx/static.wav")
		s.loop_mode = AudioStreamWAV.LOOP_FORWARD
		s.loop_end = s.data.size() / 2
		_hiss.stream = s
		add_child(_hiss)
		_hiss.play()


func stop_static() -> void:
	_static.visible = false
	_signal.visible = false
	if _hiss:
		_hiss.stop()
		_hiss.queue_free()
		_hiss = null


const CREDITS := [["BEN SMITH", "PROJECT MANAGER"], ["RYAN PERUSKI", "LEAD DEVELOPER"], ["AIDAN GAROFALO", "SCRUM MASTER"], ["GABE GILLIS", "STORY DEVELOPER"]]


func play_finale() -> void:
	t.stop_music()
	stop_static()
	visible = true
	_start_fireworks()
	await t.sleep(400)
	await show_finale_name("CLIVEMAN", "A Text-Based Python Project (c)(R)(TM) 2019")
	await t.sleep(600)
	for c in CREDITS:
		await show_finale_name(c[0], c[1])
		await t.sleep(700)
	await show_finale_name("THANK YOU", "FOR PLAYING")
	await t.sleep(1400)
	_stop_fireworks()
	_fade(_name, 0.0)
	_fade(_sub, 0.0)
	await t.sleep(600)
	_start_static()


func play_easter_egg() -> void:
	stop_static()
	_suppress_beeps = true
	_egg_audio = AudioStreamPlayer.new()
	var mp3: AudioStreamMP3 = load("res://assets/audio/easteregg.mp3")
	mp3.loop = true
	_egg_audio.stream = mp3
	_egg_audio.volume_db = linear_to_db(0.6)
	add_child(_egg_audio)
	if not SoundFx.is_muted():
		_egg_audio.play()
	visible = true
	_start_fireworks()
	await t.sleep(400)
	await show_finale_name("CLIVEMAN", "A Secret Look at the Crew")
	await t.sleep(600)
	for c in CREDITS:
		await show_finale_name(c[0], c[1])
		await t.sleep(700)
	await show_finale_name("THANK YOU", "FOR PEEKING")
	await t.sleep(1200)
	_stop_fireworks()
	_fade(_name, 0.0)
	_fade(_sub, 0.0)
	await t.sleep(600)
	visible = false
	if _egg_audio:
		_egg_audio.stop()
		_egg_audio.queue_free()
		_egg_audio = null
	_suppress_beeps = false
