class_name NavHud
extends Control
## Everything drawFP() lays over the nav viewport, and the nav bar under it:
## the room title, the FO4-style compass (engine/navigation-hud.js CMCOMPASS),
## the $ / LVL readout, the crosshair, the HERE: status, the GTA-style radar
## (CMMINIMAP), and the CHECK / SAVE / INV bar with its key hint.
##
## Positions and sizes are the stylesheet's, relative to the viewport wrap
## (.fp-wrap) or to the terminal for the `position:fixed` pieces.

var t: Node
var room: Node               ## NavRoom
var view: TextureRect
var title_text: CrtText
var stats_text: CrtText
var status_box: Control
var status_text: CrtText
var compass: Compass
var minimap: Control
var crosshair: Control
var bar: Control
var check_btn: CssButton
var save_btn: CssButton
var inv_btn: CssButton
var hint_text: CrtText
var pad_group: Control       ## #deskPadGroup, shown instead of the buttons and hint

var _mm_grid: NavGrid = null
var _mm_px := 0.0
var _mm_py := 0.0
var _mm_ang := 0.0


func setup(term: Node, vp: SubViewport) -> void:
	t = term
	mouse_filter = Control.MOUSE_FILTER_PASS
	view = TextureRect.new()
	view.texture = vp.get_texture()
	view.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	view.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	view.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	view.mouse_filter = Control.MOUSE_FILTER_STOP
	var fm := ShaderMaterial.new()
	fm.shader = preload("res://shaders/canvas_grade.gdshader")
	view.material = fm
	view.gui_input.connect(func(e: InputEvent) -> void:
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			capture_mouse())
	add_child(view)

	compass = Compass.new()
	add_child(compass)

	title_text = CrtText.new()
	title_text.font = Css.spaced("vt323", 2)
	title_text.font_size = 14
	title_text.color = Css.AMBER
	title_text.glows = [[4.0, Css.AMBER]]
	title_text.wrap = false
	title_text.modulate.a = 0.85
	add_child(title_text)

	stats_text = CrtText.new()
	stats_text.font = Css.spaced("mono", 1)
	stats_text.font_size = 12
	stats_text.line_height = 14.4
	stats_text.color = Css.AMBER
	stats_text.glows = [[4.0, Css.rgba(255, 176, 0, 0.6)]]
	stats_text.align = CrtText.Align.LEFT
	stats_text.wrap = false
	stats_text.modulate.a = 0.88
	add_child(stats_text)

	crosshair = Control.new()
	crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	crosshair.draw.connect(func() -> void:
		var s := crosshair.size
		for off in [Vector2(0, 0)]:
			crosshair.draw_rect(Rect2(s.x * 0.5 - 1.0 - 0.5, -0.5, 3.0, s.y + 1.0), Css.rgba(0, 0, 0, 0.35))
			crosshair.draw_rect(Rect2(-0.5, s.y * 0.5 - 1.0 - 0.5, s.x + 1.0, 3.0), Css.rgba(0, 0, 0, 0.35))
		crosshair.draw_rect(Rect2(s.x * 0.5 - 1.0, 0, 2, s.y), Color.WHITE)
		crosshair.draw_rect(Rect2(0, s.y * 0.5 - 1.0, s.x, 2), Color.WHITE))
	add_child(crosshair)

	status_box = Control.new()
	status_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	status_box.modulate.a = 0.92
	status_box.draw.connect(func() -> void:
		var sb := Css.box(Css.rgba(2, 10, 5, 0.45), Color(0, 0, 0, 0), 0, 5)
		status_box.draw_style_box(sb, Rect2(Vector2.ZERO, status_box.size)))
	add_child(status_box)
	status_text = CrtText.new()
	status_text.font = Css.spaced("vt323", 0.5)
	status_text.font_size = 14
	status_text.line_height = 18.2
	status_text.color = Color("#aaccaa")
	status_text.glows = []
	status_text.wrap = false
	status_box.add_child(status_text)

	minimap = Control.new()
	minimap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	minimap.modulate.a = 0.95
	minimap.draw.connect(_draw_minimap)
	add_child(minimap)

	_build_bar()


## #navRow / #desktopNav / #cmdList
func _build_bar() -> void:
	bar = Control.new()
	bar.mouse_filter = Control.MOUSE_FILTER_STOP
	bar.draw.connect(func() -> void:
		var sb := StyleBoxFlat.new()
		sb.bg_color = Css.rgba(6, 20, 10, 0.80)
		sb.border_color = Css.GREEN_DIM
		sb.border_width_left = 1
		sb.border_width_top = 1
		sb.border_width_right = 1
		sb.border_width_bottom = 0
		sb.corner_radius_top_left = 6
		sb.corner_radius_top_right = 6
		sb.anti_aliasing = true
		bar.draw_style_box(sb, Rect2(Vector2.ZERO, bar.size)))
	add_child(bar)
	check_btn = _desk_btn("🔍 " + I18n.t("CHECK").replace("🔍 ", ""), false)
	check_btn.set_text(I18n.t("🔍 CHECK"))
	check_btn.pressed.connect(func() -> void:
		SoundFx.key_click()
		if t.movement_allowed and t.check_fn.is_valid():
			t.check_fn.call())
	bar.add_child(check_btn)
	save_btn = _desk_btn(I18n.t("💾 SAVE"), true)
	save_btn.pressed.connect(func() -> void:
		SoundFx.key_click()
		t.menus.call("show_save_code"))
	bar.add_child(save_btn)
	inv_btn = _desk_btn(I18n.t("🎒 INV"), false)
	inv_btn.pressed.connect(func() -> void:
		SoundFx.key_click()
		t.show_inv())
	bar.add_child(inv_btn)
	hint_text = CrtText.new()
	hint_text.font_size = 18
	hint_text.color = Css.AMBER
	hint_text.glows = [[4.0, Css.AMBER]]
	hint_text.wrap = false
	hint_text.text = I18n.t("W/S forward/back · A/D turn · Q/E strafe · C check")
	bar.add_child(hint_text)
	pad_group = Control.new()
	pad_group.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_child(pad_group)
	on_pad_mode()


## updatePadMode(): body.pad-connected hides CHECK / SAVE / INV and the key
## hint, and #deskPadGroup lists the controller's buttons instead.
##   #deskPadGroup{display:flex;align-items:center;gap:12px;font-size:19px;
##     letter-spacing:1px}  .pad-action{inline-flex;align-items:center;gap:4px;
##     color:#aaffaa}  (the text-shadow is #navRow's, inherited)
func on_pad_mode() -> void:
	for c in pad_group.get_children():
		pad_group.remove_child(c)
		c.queue_free()
	var on: bool = Pad.connected
	check_btn.visible = not on
	save_btn.visible = not on
	inv_btn.visible = not on
	hint_text.visible = not on
	pad_group.visible = on
	if not on:
		return
	var actions := [[["dpad"], "move"], [["l", "r"], "strafe"], [["check"], "check"],
		[["inv"], "inv"], [["save"], "save"], [["confirm"], "select/skip"]]
	var x := 0.0
	var h := 0.0
	for a in actions:
		var glyphs: Array = []
		for g in a[0]:
			var pg := PadGlyph.make(g)
			pad_group.add_child(pg)
			glyphs.append(pg)
		var tx := CrtText.new()
		tx.font = Css.spaced("vt323", 1)
		tx.font_size = 19
		tx.color = Color("#aaffaa")
		tx.glows = [[4.0, Css.GREEN], [12.0, Css.rgba(51, 255, 102, 0.45)]]
		tx.wrap = false
		tx.align = CrtText.Align.LEFT
		tx.text = a[1]
		pad_group.add_child(tx)
		var gx := x
		for i in glyphs.size():
			var pg: PadGlyph = glyphs[i]
			gx += (4.0 if i > 0 else 0.0) + 2.0   # flex gap, then margin:0 2px
			pg.position = Vector2(gx, 0)
			pg.size = pg.custom_minimum_size
			gx += pg.custom_minimum_size.x + 2.0
		var tw := tx.content_width()
		var th := tx.text_height()
		tx.size = Vector2(tw + 1.0, th)
		tx.set_meta("x", gx + 4.0)
		x = gx + 4.0 + tw + 12.0
		h = maxf(h, maxf(th, 20.0))
	pad_group.size = Vector2(x - 12.0, h)
	# align-items:center, the glyphs and the text on each action's midline
	for c in pad_group.get_children():
		var cc := c as Control
		if c is CrtText:
			cc.position = Vector2(float(cc.get_meta("x")), (h - cc.size.y) * 0.5)
		else:
			cc.position.y = (h - cc.custom_minimum_size.y) * 0.5


## .desk-btn{border:2px solid var(--green);font-size:17px;padding:6px 16px;
##   border-radius:6px;letter-spacing:1px;text-shadow:0 0 6px var(--green);
##   box-shadow:0 0 8px rgba(51,255,102,.3)}   .desk-btn-save: amber
func _desk_btn(text: String, amber: bool) -> CssButton:
	var b := CssButton.new()
	b.label.font = Css.spaced("vt323", 1)
	b.label.font_size = 17
	b.pad = Vector2(16, 6)
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


func capture_mouse() -> void:
	if t.nav_mode and not t.nav_dialog and not t.game_paused:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func release_mouse() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func set_title(text: String) -> void:
	title_text.text = I18n.t(text)


func update_stats() -> void:
	stats_text.text = "$" + str(GameState.money) + " · LVL " + str(GameState.level)


func set_status(text: String) -> void:
	status_text.text = text


func show_toast(text: String) -> void:
	t.nav_toast(text)


func confirm_pressed() -> bool:
	return false


## Positions, every frame: the wrap is the map area, fixed pieces are relative
## to the terminal (which has a transform, so it is their containing block).
func layout(wrap_origin: Vector2, vp: Vector2) -> void:
	size = vp
	position = wrap_origin - (get_parent() as Control).position
	view.position = Vector2.ZERO
	view.size = vp
	compass.size = Vector2(200, 16)
	compass.position = Vector2((vp.x - 200.0) * 0.5, 6)
	title_text.size = Vector2(vp.x, title_text.custom_minimum_size.y)
	title_text.position = Vector2(0, 26)
	stats_text.size = Vector2(300, stats_text.custom_minimum_size.y)
	stats_text.position = Vector2(10, 5)
	crosshair.size = Vector2(18, 18)
	crosshair.position = vp * 0.5 - Vector2(9, 9)
	var term_h := vp.y
	# position:fixed pieces measure from the terminal box, which is the viewport
	var fixed_off := -wrap_origin
	var st := status_text.text
	status_box.visible = st != ""
	if status_box.visible:
		var sw := status_text.content_width() + 20.0
		var sh := status_text.text_height() + 4.0
		status_box.size = Vector2(sw, sh)
		status_box.position = fixed_off + Vector2((vp.x - sw) * 0.5, term_h - 64.0 - sh)
		status_text.size = Vector2(sw - 20.0, sh - 4.0)
		status_text.position = Vector2(10, 2)
		status_box.queue_redraw()
	minimap.size = Vector2(140, 140)
	minimap.position = fixed_off + Vector2(vp.x - 14.0 - 140.0, term_h - 64.0 - 140.0)
	# #navRow: position:fixed; left:50%; translateX(-50%); width:auto; a flex
	# row with gap 12, padding 6px 14px and a 1px border (none at the bottom).
	# #desktopNav (padding 4px 0, gap 7) holds CHECK, the SAVE/INV group and
	# the empty #padPrompt (margin-left 12); #cmdList (padding 8px 0 6px 10px)
	# holds the hint. Neither may shrink.
	if Pad.connected:
		_layout_pad_bar(fixed_off, vp, term_h)
		return
	var cw := check_btn.get_combined_minimum_size()
	var sw2 := save_btn.get_combined_minimum_size()
	var iw := inv_btn.get_combined_minimum_size()
	var hw := hint_text.content_width()
	var hint_h := hint_text.text_height()
	var nav_h := maxf(cw.y, maxf(sw2.y, iw.y)) + 8.0
	var cmd_h := 8.0 + hint_h + 6.0
	var row_h := maxf(nav_h, cmd_h)
	var nav_w := cw.x + 7.0 + sw2.x + 7.0 + iw.x + 7.0 + 12.0
	var content_w := nav_w + 12.0 + 10.0 + hw
	# width:auto with left:50% shrinks to fit the half of the terminal to the
	# right of the anchor, so a long hint overflows the bar instead of
	# widening it, as it does in the browser.
	var bar_w := minf(1.0 + 14.0 + content_w + 14.0 + 1.0, vp.x * 0.5)
	var bar_h := 1.0 + 6.0 + row_h + 6.0
	bar.size = Vector2(bar_w, bar_h)
	bar.position = fixed_off + Vector2((vp.x - bar_w) * 0.5, term_h - bar_h)
	var x := 15.0
	var top := 7.0
	var ny := top + (row_h - nav_h) * 0.5 + 4.0
	check_btn.size = cw
	check_btn.position = Vector2(x, ny + (nav_h - 8.0 - cw.y) * 0.5)
	x += cw.x + 7.0
	save_btn.size = sw2
	save_btn.position = Vector2(x, ny + (nav_h - 8.0 - sw2.y) * 0.5)
	x += sw2.x + 7.0
	inv_btn.size = iw
	inv_btn.position = Vector2(x, ny + (nav_h - 8.0 - iw.y) * 0.5)
	hint_text.size = Vector2(hw, hint_h)
	hint_text.position = Vector2(15.0 + nav_w + 12.0 + 10.0, top + (row_h - cmd_h) * 0.5 + 8.0)
	if I18n.is_rtl():
		# dir=rtl: the row runs from the right, so CHECK sits at the right end
		# and a hint too long for the bar overflows past its left edge
		for c in [check_btn, save_btn, inv_btn, hint_text]:
			var cc := c as Control
			cc.position.x = bar_w - cc.position.x - cc.size.x
	bar.queue_redraw()


## body.nav-mode.pad-connected: #navRow keeps its own padding (4px 8px) and
## gap (10px); #desktopNav (padding 4px 0) holds only #deskPadGroup and the
## empty #padPrompt (margin-left 12px).
func _layout_pad_bar(fixed_off: Vector2, vp: Vector2, term_h: float) -> void:
	var gs := pad_group.size
	var nav_w := gs.x + 10.0 + 12.0
	var bar_w := minf(1.0 + 8.0 + nav_w + 8.0 + 1.0, vp.x * 0.5)
	var bar_h := 1.0 + 4.0 + 4.0 + gs.y + 4.0 + 4.0
	bar.size = Vector2(bar_w, bar_h)
	bar.position = fixed_off + Vector2((vp.x - bar_w) * 0.5, term_h - bar_h)
	pad_group.position = Vector2(9.0, 9.0)
	if I18n.is_rtl():
		# #deskPadGroup at the right of #desktopNav, the empty #padPrompt (and
		# its margin-left) at the left; the actions and their parts reversed
		pad_group.position.x = 9.0 + 22.0
		for c in pad_group.get_children():
			var cc := c as Control
			cc.position.x = gs.x - cc.position.x - cc.size.x
	bar.queue_redraw()


# ── compass (CMCOMPASS) ─────────────────────────────────────────────────────

func compass_nav_update(angle_rad: float) -> void:
	compass.nav_update(angle_rad)


# ── radar (CMMINIMAP.drawGrid) ───────────────────────────────────────────────

func minimap_update(g: NavGrid, px: float, py: float, ang: float) -> void:
	_mm_grid = g
	_mm_px = px
	_mm_py = py
	_mm_ang = ang
	minimap.queue_redraw()


func _draw_minimap() -> void:
	if _mm_grid == null:
		return
	var size_px := 140.0
	var cx := size_px / 2.0
	var cy := size_px / 2.0
	var r := size_px / 2.0 - 2.0
	var VIEW := 6.0
	var scale := r / VIEW
	var g := _mm_grid
	var ca := cos(_mm_ang)
	var sa := sin(_mm_ang)
	var P := func(c: float, rw: float) -> Vector2:
		var dc := c - _mm_px
		var dr := rw - _mm_py
		var ahead := dc * ca + dr * sa
		var right := -dc * sa + dr * ca
		return Vector2(cx + right * scale, cy - ahead * scale)
	# rim
	minimap.draw_circle(Vector2(cx, cy), r + 1.5, Css.rgba(0, 0, 0, 0.55), true, -1.0, true)
	# everything else is clipped to the disc: draw the floor as a disc and clip
	# cells by intersecting their quads with it
	minimap.draw_circle(Vector2(cx, cy), r, Color("#15281c"), true, -1.0, true)
	var disc := _circle_poly(Vector2(cx, cy), r, 48)
	var reach := VIEW + 2.0
	var cols := 0
	for i in g.rows():
		cols = maxi(cols, g.row_len(i))
	var c0 := maxi(0, int(floor(_mm_px - reach)))
	var c1 := mini(cols - 1, int(ceil(_mm_px + reach)))
	var r0 := maxi(0, int(floor(_mm_py - reach)))
	var r1 := mini(g.rows() - 1, int(ceil(_mm_py + reach)))
	for rw in range(r0, r1 + 1):
		for c in range(c0, c1 + 1):
			var h := NavGrid.wall_height(g.sym(rw, c))
			if h < 1.0:
				continue
			_fill_clipped(disc, [P.call(c - 0.5, rw - 0.5), P.call(c + 0.5, rw - 0.5), P.call(c + 0.5, rw + 0.5), P.call(c - 0.5, rw + 0.5)], Color("#0a130d"))
	for rw in range(r0, r1 + 1):
		for c in range(c0, c1 + 1):
			var h2 := NavGrid.wall_height(g.sym(rw, c))
			if not (h2 > 0.0 and h2 < 1.0):
				continue
			_fill_clipped(disc, [P.call(c - 0.4, rw - 0.4), P.call(c + 0.4, rw - 0.4), P.call(c + 0.4, rw + 0.4), P.call(c - 0.4, rw + 0.4)], Css.rgba(125, 255, 154, 0.22))
	var blip := maxf(1.8, scale * 0.26)
	for rw in range(r0, r1 + 1):
		for c in range(c0, c1 + 1):
			var s := g.sym(rw, c)
			var col: Variant = null
			if Nav3D.GLYPH.has(s) and Nav3D.GLYPH[s].has("color"):
				col = Color(Nav3D.GLYPH[s]["color"])
			elif Nav3D.DOOR_SYMS.has(s):
				col = Css.AMBER
			elif s == "S" or s == "v":
				col = Color("#9fd8ff")
			if col == null:
				continue
			var p: Vector2 = P.call(c + 0.5, rw + 0.5)
			if p.distance_to(Vector2(cx, cy)) > r + blip:
				continue
			minimap.draw_circle(p, blip, col, true, -1.0, true)
	minimap.draw_arc(Vector2(cx, cy), r, 0, TAU, 64, Css.rgba(206, 224, 214, 0.5), 1.5, true)
	var s2 := maxf(4.0, size_px * 0.085)
	var arrow := PackedVector2Array([Vector2(cx, cy - s2), Vector2(cx + s2 * 0.72, cy + s2 * 0.82), Vector2(cx, cy + s2 * 0.36), Vector2(cx - s2 * 0.72, cy + s2 * 0.82)])
	minimap.draw_colored_polygon(arrow, Color("#ffd21e"))
	var outline := arrow.duplicate()
	outline.append(arrow[0])
	minimap.draw_polyline(outline, Color("#0a130d"), 1.5, true)


static func _circle_poly(c: Vector2, r: float, n: int) -> PackedVector2Array:
	var out := PackedVector2Array()
	for i in n:
		var a := TAU * i / n
		out.append(c + Vector2(cos(a), sin(a)) * r)
	return out


func _fill_clipped(disc: PackedVector2Array, quad: Array, col: Color) -> void:
	var poly := PackedVector2Array(quad)
	var clipped := Geometry2D.intersect_polygons(poly, disc)
	for piece in clipped:
		if piece.size() >= 3:
			minimap.draw_colored_polygon(piece, col)
