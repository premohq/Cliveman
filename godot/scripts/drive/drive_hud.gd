class_name DriveHud
extends Control
## Everything minigame/clivesbuick.js lays over the drive canvas: the title, the
## MMO-style chat bubble, the speed readout, the GTA-style radar, the save box,
## the compass strip, and the CHECK / SAVE / INV bar with its controls legend.
##
## Sizes and positions are the stylesheet's .cv-* rules.

const RADAR_SIZE := 150.0
const MM_BASE_WR := 136.0        ## world units from centre to radar edge at rest

var t: Node
var world: DriveWorld
var view: TextureRect
var compass: Compass
var title_text: CrtText
var bubble: Control
var bubble_text: CrtText
var speed_text: CrtText
var radar: Control
var bar: Control
var hint_text: CrtText
var cmds_text: CrtText
var cmds_pad: Control     ## the controller legend, glyphs inline with the words
var check_btn: CssButton
var save_btn: CssButton
var inv_btn: CssButton
var save_box: Control
var save_text: CrtText

var on_blocked := Callable()
var on_save := Callable()

var _bubble_timer := 0.0
var _bubble_shown := 0.0
var _save_timer := 0.0
var _mm_world_radius := MM_BASE_WR
var _car_pos := Vector3.ZERO
var _car_heading := 0.0
var _car_speed := 0.0
var _mm_font: Font = null
var _bubble_base_y := 0.0


func setup(term: Node, w: DriveWorld, vp: SubViewport) -> void:
	t = term
	world = w
	mouse_filter = Control.MOUSE_FILTER_PASS

	view = TextureRect.new()
	view.texture = vp.get_texture()
	view.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	view.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	view.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var grade := ShaderMaterial.new()
	grade.shader = preload("res://shaders/canvas_grade.gdshader")
	view.material = grade
	add_child(view)

	compass = Compass.new()
	add_child(compass)

	# .fp-title, as in nav mode
	title_text = CrtText.new()
	title_text.font = Css.spaced("vt323", 2)
	title_text.font_size = 18
	title_text.color = Css.AMBER
	title_text.glows = [[4.0, Css.AMBER]]
	title_text.wrap = false
	add_child(title_text)
	# .cv-wrap lays the title out above the stage, but .fp-stage is absolute and
	# covers it, so the drive's title never actually shows
	move_child(title_text, 0)

	# .cv-speed{right:12px;bottom:30px;font-size:26px;letter-spacing:2px}
	speed_text = CrtText.new()
	speed_text.font = Css.spaced("vt323", 2)
	speed_text.font_size = 26
	speed_text.color = Css.GREEN_BRIGHT
	speed_text.glows = [[6.0, Css.GREEN_BRIGHT]]
	speed_text.align = CrtText.Align.RIGHT
	speed_text.wrap = false
	speed_text.text = "000"
	add_child(speed_text)

	_build_bubble()
	radar = Control.new()
	radar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	radar.modulate.a = 0.96
	radar.draw.connect(_draw_radar)
	add_child(radar)
	_build_bar()
	_build_save_box()


## .cv-bubble: rounded plate with a tail, centred at 40% height.
func _build_bubble() -> void:
	bubble = Control.new()
	bubble.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bubble.modulate.a = 0.0
	bubble.draw.connect(func() -> void:
		var sb := Css.glow(Css.box(Css.rgba(4, 14, 8, 0.88), Css.GREEN, 1, 8), Css.rgba(0, 0, 0, 0.6), 16)
		Css.draw_box(bubble, Rect2(Vector2.ZERO, bubble.size), sb)
		# ::after — an 8px triangle tail under the centre
		var cx := bubble.size.x * 0.5
		var y := bubble.size.y
		Compass.aa_fill_poly(bubble, PackedVector2Array([
			Vector2(cx - 8, y), Vector2(cx + 8, y), Vector2(cx, y + 8)]),
			Css.rgba(4, 14, 8, 0.88)))
	add_child(bubble)
	bubble_text = CrtText.new()
	bubble_text.font_size = 20
	bubble_text.line_height = 25.0     # line-height 1.25
	bubble_text.color = Color("#eafff0")
	bubble_text.glows = [[5.0, Css.rgba(51, 255, 102, 0.5)]]
	bubble.add_child(bubble_text)


## .cv-bottombar: the CHECK / SAVE / INV trio and the controls legend.
func _build_bar() -> void:
	bar = Control.new()
	bar.mouse_filter = Control.MOUSE_FILTER_STOP
	bar.draw.connect(func() -> void:
		var sb := StyleBoxFlat.new()
		sb.bg_color = Css.rgba(6, 43, 16, 0.25)
		sb.border_color = Css.GREEN_DIM
		sb.border_width_top = 2
		bar.draw_style_box(sb, Rect2(Vector2.ZERO, bar.size)))
	add_child(bar)
	check_btn = _desk_btn(I18n.t("🔍 CHECK"), false)
	check_btn.pressed.connect(func() -> void:
		SoundFx.key_click()
		if on_blocked.is_valid():
			on_blocked.call())
	bar.add_child(check_btn)
	save_btn = _desk_btn(I18n.t("💾 SAVE"), true)
	save_btn.pressed.connect(func() -> void:
		SoundFx.key_click()
		if on_save.is_valid():
			on_save.call())
	bar.add_child(save_btn)
	inv_btn = _desk_btn(I18n.t("🎒 INV"), false)
	inv_btn.pressed.connect(func() -> void:
		SoundFx.key_click()
		if on_blocked.is_valid():
			on_blocked.call())
	bar.add_child(inv_btn)
	hint_text = CrtText.new()
	hint_text.font_size = 18
	hint_text.line_height = 22.5       # line-height 1.25
	hint_text.color = Css.AMBER
	hint_text.glows = [[4.0, Css.AMBER]]
	hint_text.wrap = false
	hint_text.text = I18n.t("FOLLOW THE COMPASS — RED DOT = DESTINATION")
	bar.add_child(hint_text)
	cmds_text = CrtText.new()
	cmds_text.font_size = 18
	cmds_text.line_height = 22.5
	cmds_text.color = Color("#aaffaa")    # .cv-cmds .cmds{color:#aaffaa;margin-top:2px}
	cmds_text.glows = [[4.0, Css.GREEN], [12.0, Css.rgba(51, 255, 102, 0.45)]]
	cmds_text.wrap = false
	cmds_text.text = I18n.t("W/S throttle/brake · A/D steer · P save")
	bar.add_child(cmds_text)
	cmds_pad = Control.new()
	cmds_pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_child(cmds_pad)
	on_pad_mode()


## cvControlsHTML(): with a controller up the legend names its buttons, as
## xb() / pb() badges sitting in the line (vertical-align:middle, margin 0 2px).
func on_pad_mode() -> void:
	for c in cmds_pad.get_children():
		cmds_pad.remove_child(c)
		c.queue_free()
	var on: bool = Pad.connected
	cmds_text.visible = not on
	cmds_pad.visible = on
	if not on:
		return
	var parts := ["rt", " throttle · ", "lt", " brake · L-stick steer · ", "handbrake", " handbrake · ", "start", " save"]
	var x := 0.0
	for part in parts:
		if part in ["rt", "lt", "handbrake", "start"]:
			var g := PadGlyph.make(part)
			g.size = g.custom_minimum_size
			# vertical-align:middle in a 22.5px line of 18px VT323
			g.position = Vector2(x + 2.0, 2.41)
			cmds_pad.add_child(g)
			x += g.outer_width()
		else:
			var tx := CrtText.new()
			tx.font_size = 18
			tx.line_height = 22.5
			tx.color = Color("#aaffaa")
			tx.glows = [[4.0, Css.GREEN], [12.0, Css.rgba(51, 255, 102, 0.45)]]
			tx.wrap = false
			tx.align = CrtText.Align.LEFT
			tx.text = part
			var w := tx.content_width()
			tx.size = Vector2(w + 1.0, 22.5)
			tx.position = Vector2(x, 0.08)
			cmds_pad.add_child(tx)
			x += w
	cmds_pad.size = Vector2(x, 22.58)


func _cmds_size() -> Vector2:
	if Pad.connected:
		return cmds_pad.size
	return Vector2(cmds_text.content_width(), cmds_text.text_height())


func _desk_btn(text: String, amber: bool) -> CssButton:
	var b := CssButton.new()
	b.label.font = Css.spaced("vt323", 2)
	b.label.font_size = 20
	b.pad = Vector2(20, 8)
	b.border = 2
	var c := Css.AMBER if amber else Css.GREEN
	var glow := Css.rgba(255, 176, 0, 0.3) if amber else Css.rgba(51, 255, 102, 0.3)
	var hglow := Css.rgba(255, 176, 0, 0.6) if amber else Css.rgba(51, 255, 102, 0.6)
	var hbg := Css.rgba(255, 176, 0, 0.12) if amber else Css.rgba(51, 255, 102, 0.12)
	b.styles = {
		"normal": Css.glow(Css.box(Color(0, 0, 0, 0), c, 2, 6), glow, 8),
		"hover": Css.glow(Css.box(hbg, c, 2, 6), hglow, 14),
		"active": Css.glow(Css.box(Css.rgba(51, 255, 102, 0.25), c, 2, 6), hglow, 14),
	}
	b.text_colors = {"normal": c}
	b.text_glows = {"normal": [[6.0, c]]}
	b.set_text(text)
	return b


## .cv-savebox: the save panel, 6.5s on screen.
func _build_save_box() -> void:
	save_box = Control.new()
	save_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	save_box.visible = false
	save_box.draw.connect(func() -> void:
		var sb := Css.glow(Css.box(Css.rgba(2, 10, 4, 0.93), Css.GREEN_DIM, 2, 3), Css.rgba(51, 255, 102, 0.3), 18)
		Css.draw_box(save_box, Rect2(Vector2.ZERO, save_box.size), sb))
	add_child(save_box)
	save_text = CrtText.new()
	save_text.font_size = 22
	save_text.line_height = 27.5
	save_text.color = Css.GREEN
	save_text.glows = [[4.0, Css.GREEN], [12.0, Css.rgba(51, 255, 102, 0.45)]]
	save_text.align = CrtText.Align.BLOCK
	save_text.wrap = false
	save_box.add_child(save_text)


func set_title(text: String) -> void:
	title_text.text = I18n.t(text)


## showBubble(text): restart the show/fade cycle, up to 7s.
func show_bubble(text: String) -> void:
	text = I18n.t(text).strip_edges()
	if text == "":
		return
	bubble_text.text = text
	_bubble_shown = 0.0
	_bubble_timer = minf(7000.0, 1800.0 + text.length() * 45.0) / 1000.0
	bubble.set_meta("target", 1.0)


func show_save_box(box: String) -> void:
	if box == "":
		box = "  +======================================+\n  |  SAVE FILE WRITTEN                   |\n  |  Saved to the save folder.           |\n  |  Load it at the title screen.        |\n  +======================================+"
	save_text.text = box
	save_box.visible = true
	_save_timer = 6.5


## The terminal talks to whatever HUD is mounted; the drive answers the same
## few calls nav mode does.
func show_toast(text: String) -> void:
	show_bubble(text)


func confirm_pressed() -> bool:
	return false


func update_stats() -> void:
	pass


func capture_mouse() -> void:
	pass


func release_mouse() -> void:
	pass


func set_speed(kph: int) -> void:
	speed_text.text = "%03d" % kph


func set_car(pos: Vector3, heading: float, speed: float) -> void:
	_car_pos = pos
	_car_heading = heading
	_car_speed = speed
	radar.queue_redraw()
	var bearing := rad_to_deg(atan2(world.goal.x - pos.x, world.goal.z - pos.z))
	compass.update_compass(rad_to_deg(heading), [{"bearing": bearing, "color": Color("#ff2a1a")}])


func _process(delta: float) -> void:
	if _bubble_timer > 0.0:
		_bubble_timer -= delta
		if _bubble_timer <= 0.0:
			bubble.set_meta("target", 0.0)
	# opacity .3s ease, transform .3s ease: the plate slides up 6px as it shows
	var target: float = bubble.get_meta("target", 0.0)
	_bubble_shown = move_toward(_bubble_shown, target, delta / 0.3)
	var e := _bubble_shown * _bubble_shown * (3.0 - 2.0 * _bubble_shown)
	bubble.modulate.a = e
	bubble.position.y = _bubble_base_y - 6.0 * (1.0 - e)
	if _save_timer > 0.0:
		_save_timer -= delta
		if _save_timer <= 0.0:
			save_box.visible = false


## Positions, every frame, from the .cv-* rules.
func layout(wrap_origin: Vector2, vp: Vector2) -> void:
	size = vp
	position = wrap_origin - (get_parent() as Control).position
	view.position = Vector2.ZERO
	view.size = vp
	compass.position = Vector2((vp.x - Compass.CSS_W) * 0.5, 6)
	title_text.size = Vector2(vp.x, title_text.custom_minimum_size.y)
	title_text.position = Vector2(0, 2)   # the .cv-wrap padding
	# .cv-speed{right:12px;bottom:30px}
	speed_text.size = Vector2(200, speed_text.custom_minimum_size.y)
	# right:12px bottom:30px of the wrap, which hangs below the terminal, so
	# only the top of the readout is on screen — as in the browser
	speed_text.position = Vector2(vp.x - 12.0 - 200.0, vp.y - 30.0 - speed_text.custom_minimum_size.y)
	# .cv-mm{left:14px;bottom:16px}
	radar.size = Vector2(RADAR_SIZE, RADAR_SIZE)
	radar.position = Vector2(14, vp.y - 16.0 - RADAR_SIZE)
	# .cv-bubble{left:50%;top:40%;max-width:min(72%,460px);padding:7px 14px}
	var bw: float = minf(vp.x * 0.72, 460.0)
	bubble_text.size = Vector2(bw - 28.0, 0)
	var bh := bubble_text.text_height()
	bubble_text.size = Vector2(bw - 28.0, bh)
	bubble_text.position = Vector2(14, 7)
	bubble.size = Vector2(bw, bh + 14.0)
	_bubble_base_y = vp.y * 0.4
	bubble.position = Vector2((vp.x - bw) * 0.5, _bubble_base_y)
	# .cv-savebox: centred
	var sw := save_text.content_width() + 28.0 + 4.0
	var sh := save_text.text_height() + 20.0 + 4.0
	save_box.size = Vector2(sw, sh)
	save_box.position = (vp - save_box.size) * 0.5
	save_text.size = Vector2(sw - 28.0, sh - 20.0)
	save_text.position = Vector2(14, 10)
	_layout_bar(wrap_origin, vp)
	radar.queue_redraw()


## .cv-bottombar{position:fixed;left:50%;bottom:0;width:auto;display:flex;
##   flex-wrap:wrap;justify-content:center;gap:16px;padding:6px 10px;
##   border-top:2px solid var(--green-dim)} — with the button group and the
## legend wrapping onto two rows when they do not both fit.
func _layout_bar(wrap_origin: Vector2, vp: Vector2) -> void:
	var cw := check_btn.get_combined_minimum_size()
	var sw := save_btn.get_combined_minimum_size()
	var iw := inv_btn.get_combined_minimum_size()
	var nav_w := cw.x + 10.0 + sw.x + 10.0 + iw.x
	var nav_h: float = maxf(cw.y, maxf(sw.y, iw.y))
	var cs := _cmds_size()
	var legend_w: float = maxf(hint_text.content_width(), cs.x)
	var legend_h := hint_text.text_height() + 2.0 + cs.y
	# width:auto with left:50% shrinks to fit the half of the terminal right of
	# the anchor
	var bar_w: float = minf(10.0 + nav_w + 16.0 + legend_w + 10.0, vp.x * 0.5)
	var inner := bar_w - 20.0
	var wrapped := nav_w + 16.0 + legend_w > inner
	var bar_h := 2.0 + 6.0 + (nav_h + 16.0 + legend_h if wrapped else maxf(nav_h, legend_h)) + 6.0
	bar.size = Vector2(bar_w, bar_h)
	bar.position = -wrap_origin + Vector2((vp.x - bar_w) * 0.5, vp.y - bar_h)

	var row_y := 2.0 + 6.0
	var nav_x := 10.0 + (inner - nav_w) * 0.5 if wrapped else 10.0 + (inner - nav_w - 16.0 - legend_w) * 0.5
	var x := nav_x
	for b in [check_btn, save_btn, inv_btn]:
		var bs: Vector2 = b.get_combined_minimum_size()
		b.size = bs
		b.position = Vector2(x, row_y + (nav_h - bs.y) * 0.5)
		x += bs.x + 10.0
	var legend_x := 10.0 + (inner - legend_w) * 0.5 if wrapped else nav_x + nav_w + 16.0
	if I18n.is_rtl():
		# dir=rtl reverses the flex rows: the buttons run right to left, and
		# on one row the legend comes before them on the left
		for b in [check_btn, save_btn, inv_btn]:
			(b as Control).position.x = bar_w - (b as Control).position.x - (b as Control).size.x
		if not wrapped:
			legend_x = bar_w - legend_x - legend_w
	var legend_y := row_y + nav_h + 16.0 if wrapped else row_y + (maxf(nav_h, legend_h) - legend_h) * 0.5
	hint_text.size = Vector2(legend_w, hint_text.text_height())
	hint_text.position = Vector2(legend_x, legend_y)
	cmds_text.size = Vector2(legend_w, cmds_text.text_height())
	cmds_text.position = Vector2(legend_x, legend_y + hint_text.text_height() + 2.0)
	# text-align:center within .cv-cmds
	cmds_pad.position = Vector2(legend_x + (legend_w - cs.x) * 0.5, legend_y + hint_text.text_height() + 2.0)


# ── radar (drawMiniMap) ─────────────────────────────────────────────────────

func _mm_font_face() -> Font:
	if _mm_font == null:
		var sf := SystemFont.new()
		sf.font_names = PackedStringArray(["Courier New", "monospace"])
		sf.font_weight = 700
		_mm_font = sf
	return _mm_font


## The building footprints the radar draws: churches and stores get their own
## profile, towers a plain block.
static func _world_poly(b: Dictionary) -> PackedVector2Array:
	var shape: Array = []
	match b["kind"]:
		"church":
			shape = [[-0.34, -0.5], [0.34, -0.5], [0.34, -0.12], [0.18, -0.12], [0.18, 0.5], [-0.18, 0.5], [-0.18, -0.12], [-0.34, -0.12]]
		"grocery":
			shape = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.22], [0.14, 0.22], [0.14, 0.5], [-0.14, 0.5], [-0.14, 0.22], [-0.5, 0.22]]
		_:
			shape = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]
	var cx: float = (b["x0"] + b["x1"]) * 0.5
	var cz: float = (b["z0"] + b["z1"]) * 0.5
	var sx: float = b["x1"] - b["x0"]
	var sz: float = b["z1"] - b["z0"]
	var rot: int = int(b.get("rot", 0)) & 3
	var out := PackedVector2Array()
	for s in shape:
		var px: float = s[0] * sx
		var pz: float = s[1] * sz
		if rot == 1:
			var tmp := px
			px = pz
			pz = -tmp
		elif rot == 2:
			px = -px
			pz = -pz
		elif rot == 3:
			var tmp2 := px
			px = -pz
			pz = tmp2
		out.append(Vector2(cx + px, cz + pz))
	return out


static func _inset_poly(poly: PackedVector2Array, t: float) -> PackedVector2Array:
	var c := Vector2.ZERO
	for p in poly:
		c += p
	c /= poly.size()
	var out := PackedVector2Array()
	for p in poly:
		out.append(c + (p - c) * t)
	return out


static func _height01(b: Dictionary) -> float:
	return clampf((float(b.get("height", 18.0)) - 8.0) / 56.0, 0.0, 1.0)


func _draw_radar() -> void:
	var s := RADAR_SIZE
	var cx := s / 2.0
	var cy := s / 2.0
	var r := s / 2.0 - 2.0
	# ease the radar wider at speed instead of popping between zooms
	var wanted := MM_BASE_WR + minf(32.0, absf(_car_speed) * 0.9)
	_mm_world_radius += (wanted - _mm_world_radius) * 0.08
	var scale := r / _mm_world_radius
	var sh := sin(_car_heading)
	var chd := cos(_car_heading)
	var P := func(wx: float, wz: float) -> Vector2:
		var dx := wx - _car_pos.x
		var dz := wz - _car_pos.z
		return Vector2(cx + (dx * chd - dz * sh) * scale, cy - (dx * sh + dz * chd) * scale)
	var disc_poly := PackedVector2Array()
	for i in 64:
		var a := TAU * i / 64.0
		disc_poly.append(Vector2(cx, cy) + Vector2(cos(a), sin(a)) * r)
	var lim := _mm_world_radius + DriveWorld.PITCH

	radar.draw_circle(Vector2(cx, cy), r + 1.5, Css.rgba(0, 0, 0, 0.55), true, -1.0, true)
	_fill_clipped(disc_poly, PackedVector2Array([Vector2(0, 0), Vector2(s, 0), Vector2(s, s), Vector2(0, s)]), Color("#030604"))
	var city := PackedVector2Array([
		P.call(world.city_min, world.city_min), P.call(world.city_max, world.city_min),
		P.call(world.city_max, world.city_max), P.call(world.city_min, world.city_max)])
	_fill_clipped(disc_poly, city, Color("#0a120c"))

	for b in world.buildings:
		var bcx: float = (b["x0"] + b["x1"]) * 0.5
		var bcz: float = (b["z0"] + b["z1"]) * 0.5
		if absf(bcx - _car_pos.x) > lim or absf(bcz - _car_pos.z) > lim:
			continue
		var poly := _world_poly(b)
		var h01 := _height01(b)
		var inset: float = 0.62 if b["kind"] == "church" else (0.76 if b["kind"] == "grocery" else 0.76 - h01 * 0.12)
		var roof := _inset_poly(poly, inset)
		var screen := PackedVector2Array()
		for p in poly:
			screen.append(P.call(p.x, p.y))
		var shadow := PackedVector2Array()
		var off := Vector2(0.7 + h01 * 1.8, 0.5 + h01 * 1.3)
		for p in screen:
			shadow.append(p + off)
		_fill_clipped(disc_poly, shadow, Css.rgba(0, 0, 0, 0.18 + h01 * 0.18))
		_fill_clipped(disc_poly, screen, _building_fill(b, h01))
		_stroke_clipped(disc_poly, screen, Css.rgba(124, 182, 146, 0.16 + h01 * 0.16), 1.0)
		var roof_screen := PackedVector2Array()
		for p in roof:
			roof_screen.append(P.call(p.x, p.y))
		_fill_clipped(disc_poly, roof_screen, _roof_fill(b, h01))
		if b["spire"]:
			var c := Vector2.ZERO
			for p in roof_screen:
				c += p
			c /= roof_screen.size()
			if c.distance_to(Vector2(cx, cy)) < r:
				radar.draw_circle(c, 1.1 + h01 * 0.8, Css.rgba(255, 88, 62, 0.68), true, -1.0, true)

	# roads, bounded to the district
	var road_w: float = maxf(2.0, DriveWorld.ROAD * scale)
	for sc in world.street_centers:
		if absf(sc - _car_pos.x) < lim:
			_stroke_line(disc_poly, P.call(sc, world.city_min), P.call(sc, world.city_max), Color("#3b4a3d"), road_w)
		if absf(sc - _car_pos.z) < lim:
			_stroke_line(disc_poly, P.call(world.city_min, sc), P.call(world.city_max, sc), Color("#3b4a3d"), road_w)
	_stroke_clipped(disc_poly, city, Css.rgba(180, 215, 190, 0.24), 1.0)

	# the GPS route, hugging the grid
	var route := world.route_to_goal(_car_pos, _car_heading)
	var line := PackedVector2Array()
	for p in route:
		line.append(P.call(p.x, p.y))
	for piece in Geometry2D.intersect_polyline_with_polygon(line, disc_poly):
		if piece.size() >= 2:
			radar.draw_polyline(piece, Css.rgba(255, 42, 26, 0.8), maxf(2.5, DriveWorld.ROAD * scale * 0.42), true)

	# destination blip, clamped to the rim
	var gp: Vector2 = P.call(world.goal.x, world.goal.z)
	var gd := gp - Vector2(cx, cy)
	var edge := gd.length() > r - 4.0
	var at := Vector2(cx, cy) + (gd.normalized() * (r - 4.0) if edge else gd)
	radar.draw_circle(at, 2.6 if edge else 3.4, Color("#ff2a1a"), true, -1.0, true)

	# border ring, north tick and the player chevron
	radar.draw_arc(Vector2(cx, cy), r, 0, TAU, 64, Css.rgba(206, 224, 214, 0.5), 1.5, true)
	var north: Vector2 = P.call(_car_pos.x, _car_pos.z + _mm_world_radius)
	var nd := (north - Vector2(cx, cy)).normalized()
	var font := _mm_font_face()
	var fs := maxi(8, int(round(s * 0.075)))
	var nsz := font.get_string_size("N", HORIZONTAL_ALIGNMENT_LEFT, -1, fs)
	var np := Vector2(cx, cy) + nd * (r - 8.0)
	radar.draw_string(font, np - Vector2(nsz.x * 0.5, -font.get_ascent(fs) * 0.5 + font.get_descent(fs) * 0.5),
		"N", HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Css.rgba(220, 235, 225, 0.78))
	var ps: float = maxf(4.0, s * 0.085)
	var arrow := PackedVector2Array([
		Vector2(cx, cy - ps), Vector2(cx + ps * 0.72, cy + ps * 0.82),
		Vector2(cx, cy + ps * 0.36), Vector2(cx - ps * 0.72, cy + ps * 0.82)])
	radar.draw_colored_polygon(arrow, Color("#ffd21e"))
	var outline := arrow.duplicate()
	outline.append(arrow[0])
	radar.draw_polyline(outline, Color("#0a130d"), 1.5, true)


static func _building_fill(b: Dictionary, h01: float) -> Color:
	if b["kind"] == "church":
		return Color8(30, 42, 34)
	if b["kind"] == "grocery":
		return Color8(26, 38, 31)
	var shade := 20 + int(round(h01 * 24.0))
	return Color8(shade, shade + 10, shade + 6)


static func _roof_fill(b: Dictionary, h01: float) -> Color:
	if b["kind"] == "church":
		return Css.rgba(86, 110, 96, 0.66)
	if b["kind"] == "grocery":
		return Css.rgba(74, 96, 82, 0.66)
	var shade := 60 + int(round(h01 * 40.0))
	return Css.rgba(shade, shade + 16, shade + 8, 0.64)


## Everything is clipped to the radar disc, the way the canvas clips.
func _fill_clipped(disc: PackedVector2Array, poly: PackedVector2Array, col: Color) -> void:
	for piece in Geometry2D.intersect_polygons(poly, disc):
		# a clip can leave slivers the triangulator cannot handle
		if piece.size() >= 3 and absf(Compass._poly_area(piece)) > 0.01:
			radar.draw_colored_polygon(piece, col)


func _stroke_clipped(disc: PackedVector2Array, poly: PackedVector2Array, col: Color, w: float) -> void:
	var closed := poly.duplicate()
	closed.append(poly[0])
	for piece in Geometry2D.intersect_polyline_with_polygon(closed, disc):
		if piece.size() >= 2:
			radar.draw_polyline(piece, col, w, true)


func _stroke_line(disc: PackedVector2Array, a: Vector2, b: Vector2, col: Color, w: float) -> void:
	for piece in Geometry2D.intersect_polyline_with_polygon(PackedVector2Array([a, b]), disc):
		if piece.size() >= 2:
			radar.draw_polyline(piece, col, w)
