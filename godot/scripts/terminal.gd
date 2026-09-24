extends Control
## The CRT terminal. Port of index.html's DOM and engine/ui-core.js.
##
## The node tree mirrors the page: a flickering `.crt` holding the `.terminal`
## column (header, map area, story art, speaker plate, #screen, choice panel,
## nav bar), with the glass overlays, fades and modals stacked above it in the
## browser's z-index order. Layout is computed here each frame from the same
## flex rules the stylesheet uses, because the column changes shape with the
## body classes (story, nav, nav-dialog, driving) and Godot's containers settle
## a frame late.
##
## Story code talks to this node the way the JS talks to its globals:
## type_line, instant_line, blank, section, yn, ask_choice and so on, with the
## same names in snake_case and the same timings in milliseconds.

signal paused_changed(paused: bool)

const LINE_H := 27.5            ## #screen{line-height:1.25} at 22px
const MAX_LINES := 400

# ── body classes ─────────────────────────────────────────────────────────────
var game_started := false
var nav_mode := false
var nav_dialog := false
var cv_driving := false
var can_move := false
var pad_connected := false

# ── dom-refs.js shared flags ─────────────────────────────────────────────────
var typing := false
var skip_requested := false
var movement_allowed := false
var nav_just_exited := false
var check_fn: Callable = Callable()
var user_scrolled_up := false
var game_paused := false
var ended := false               ## throw new Error('END') has unwound the story
var nav_check_busy := false
var nav_toast_hold := false

var _autoplay := false
## `--autoplay --seed N` picks choices at random and visits room events, so a
## few seeds walk the branches the first-option walkthrough never takes.
var autoplay_rng: RandomNumberGenerator = null

# ── nodes ────────────────────────────────────────────────────────────────────
var bg: ColorRect
var flyover_vignette: ColorRect
var crt: Control
var term_box: TiltLayer       ## the tilted .terminal layer (container)
var term_vp: SubViewport      ## .terminal and what is appended to it
var term: Control
var header: Control
var header_left: CrtText
var pause_btn: CssButton
var fs_btn: CssButton
var secure_text: CrtText
var secure_blink: CrtText
var map_area: Control
var art: StoryArt
var plate: Control
var plate_text: CrtText
var screen_box: Control
var scroll: ScrollContainer
var flow: ScreenFlow
var choice_panel: Control
var choice_flow: HFlowContainer
var nav_row: Control
var crt_inner: ColorRect
var toast_layer: Control
var cut_fade: ColorRect
var cut_label: CrtText
var glass: ColorRect
var red_vignette: ColorRect
var modal_layer: Control
var power_on: Control
var pad_toast: PadToast
var boot_el: ColorRect
var boot_text: CrtText

var plate_shown := false
var choices_active := false
var _plate_color := Css.AMBER
var _header_blink_t := 0.0
var _flicker_t := 0.0
var _death_glitch_t := -1.0

var menus: Node = null           ## scripts/ui/menus.gd
var nav_hud: Node = null         ## scripts/ui/nav_hud.gd, while a room is up


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build()
	get_viewport().size_changed.connect(_layout)
	_layout()
	Pad.attach(self)
	Pad.mode_changed.connect(_on_pad_mode)
	I18n.language_changed.connect(func(_l: String) -> void: _apply_direction())
	_apply_direction()

	var argv := OS.get_cmdline_user_args()
	if argv.size() >= 1 and argv[0] == "--autoplay":
		_autoplay = true
		# unattended: keep the desktop's keyboard and mouse out of the run
		get_window().unfocusable = true
		get_window().mouse_passthrough = true
		SaveStore.folder = "user://test_saves"
		var si := argv.find("--seed")
		if si >= 0 and si + 1 < argv.size():
			autoplay_rng = RandomNumberGenerator.new()
			autoplay_rng.seed = int(argv[si + 1])
	var game: Script = load("res://scripts/game.gd")
	var g: Node = game.new()
	g.name = "Game"
	add_child(g)
	# `-- --scenario steps.json` drives the game from a script and grabs frames,
	# the Godot half of the side-by-side comparison against the browser build.
	if argv.size() >= 2 and argv[0] == "--scenario":
		g.call("setup", self)
		boot_el.visible = false
		power_on.visible = false
		var runner: Node = load("res://tools/scenario.gd").new()
		add_child(runner)
		runner.call("run", self, g, argv[1])
		return
	g.call("boot", self)


func is_autoplay() -> bool:
	return _autoplay


## Which of n options autoplay takes: the first, or a seeded random one.
func autoplay_pick(n: int) -> int:
	if autoplay_rng == null or n <= 1:
		return 0
	return autoplay_rng.randi_range(0, n - 1)


# ═════════════════════════════════════════════════════════════════════════════
#  construction
# ═════════════════════════════════════════════════════════════════════════════

func _build() -> void:
	# html,body{background:#000}
	bg = ColorRect.new()
	bg.name = "Background"
	bg.color = Color.BLACK
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	# #titleFlyoverVignette, behind the terminal. The 3D city itself renders in
	# the main viewport below every Control.
	flyover_vignette = ColorRect.new()
	flyover_vignette.name = "FlyoverVignette"
	flyover_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var fvm := ShaderMaterial.new()
	fvm.shader = preload("res://shaders/flyover_vignette.gdshader")
	flyover_vignette.material = fvm
	flyover_vignette.visible = false
	add_child(flyover_vignette)

	crt = Control.new()
	crt.name = "Crt"
	crt.mouse_filter = Control.MOUSE_FILTER_IGNORE
	crt.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(crt)

	# .terminal carries a perspective tilt, so everything inside it (and the
	# toasts and prompts appended to it) renders flat into term_vp and is
	# drawn back through shaders/terminal_tilt.gdshader.
	term_box = TiltLayer.new()
	term_box.name = "TerminalLayer"
	term_box.stretch = true
	term_box.mouse_filter = Control.MOUSE_FILTER_PASS
	term_box.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	var tm := ShaderMaterial.new()
	tm.shader = preload("res://shaders/terminal_tilt.gdshader")
	term_box.material = tm
	crt.add_child(term_box)
	term_vp = SubViewport.new()
	term_vp.transparent_bg = true
	term_box.add_child(term_vp)

	term = Control.new()
	term.name = "Terminal"
	term.mouse_filter = Control.MOUSE_FILTER_IGNORE
	term.clip_contents = true
	term_vp.add_child(term)

	_build_header()

	map_area = Control.new()
	map_area.name = "MapArea"
	map_area.mouse_filter = Control.MOUSE_FILTER_PASS
	map_area.clip_contents = true
	map_area.visible = false
	term.add_child(map_area)

	art = StoryArt.new()
	art.name = "StoryArt"
	art.blip.connect(func() -> void: SoundFx.move_blip())
	art.visible = false
	term.add_child(art)

	_build_screen()
	_build_plate()
	_build_choices()

	nav_row = Control.new()
	nav_row.name = "NavRow"
	nav_row.visible = false
	term.add_child(nav_row)

	# .crt::before + .crt::after
	crt_inner = ColorRect.new()
	crt_inner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var cim := ShaderMaterial.new()
	cim.shader = preload("res://shaders/crt_glass.gdshader")
	cim.set_shader_parameter("mode", 0)
	crt_inner.material = cim
	crt.add_child(crt_inner)

	# nav toasts and prompts are appended to .terminal: tilted with it, and
	# under the .crt::before scanlines (z-index 5 over the terminal's 4)
	toast_layer = Control.new()
	toast_layer.name = "Toasts"
	toast_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	term_vp.add_child(toast_layer)

	# #boot{z-index:10}. Visible from the first frame, as the div is on page load,
	# so nothing of the terminal behind it ever shows before the POST.
	boot_el = ColorRect.new()
	boot_el.name = "Boot"
	boot_el.color = Color.BLACK
	boot_el.visible = true
	boot_el.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(boot_el)
	boot_text = CrtText.new()
	boot_text.align = CrtText.Align.LEFT
	boot_text.wrap = true
	boot_text.font_size = 22
	boot_text.line_height = 22.0  # line-height:normal for VT323 is exactly 1em
	boot_text.color = Css.GREEN
	boot_text.glows = [[6.0, Css.GREEN]]
	boot_el.add_child(boot_text)

	# #cutFade{z-index:9000}, under the glass
	cut_fade = ColorRect.new()
	cut_fade.name = "CutFade"
	cut_fade.color = Color.BLACK
	cut_fade.modulate.a = 0.0
	cut_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(cut_fade)
	cut_label = CrtText.new()
	cut_label.font = Css.spaced("vt323", 6)
	cut_label.color = Css.AMBER
	cut_label.glows = [[12.0, Css.rgba(255, 176, 0, 0.75)]]
	cut_label.modulate.a = 0.0
	cut_fade.add_child(cut_label)

	# #crtVignette{z-index:9002}
	glass = ColorRect.new()
	glass.name = "Glass"
	glass.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var gm := ShaderMaterial.new()
	gm.shader = preload("res://shaders/crt_glass.gdshader")
	gm.set_shader_parameter("mode", 1)
	glass.material = gm
	add_child(glass)

	# #redVignette{z-index:9003}
	red_vignette = ColorRect.new()
	red_vignette.name = "RedVignette"
	red_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var rvm := ShaderMaterial.new()
	rvm.shader = preload("res://shaders/red_vignette.gdshader")
	red_vignette.material = rvm
	red_vignette.modulate.a = 0.0
	add_child(red_vignette)

	modal_layer = Control.new()
	modal_layer.name = "Modals"
	modal_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(modal_layer)

	# #crtPowerOn{z-index:99999}: solid black until the warm-up starts
	power_on = Control.new()
	power_on.name = "PowerOn"
	power_on.mouse_filter = Control.MOUSE_FILTER_IGNORE
	power_on.visible = true
	power_on.draw.connect(func() -> void:
		if not power_on.has_meta("warming"):
			power_on.draw_rect(Rect2(Vector2.ZERO, power_on.size), Color.BLACK))
	add_child(power_on)

	# #padToast{position:fixed;z-index:99999}, after #crtPowerOn in the DOM
	pad_toast = PadToast.new()
	pad_toast.name = "PadToast"
	add_child(pad_toast)


func _build_header() -> void:
	header = Control.new()
	header.name = "Header"
	header.mouse_filter = Control.MOUSE_FILTER_PASS
	header.draw.connect(func() -> void:
		# .header{border-bottom:1px solid var(--green-dim)}
		header.draw_rect(Rect2(0, header.size.y - 1, header.size.x, 1), Css.GREEN_DIM))
	term.add_child(header)

	var base_glow := [[4.0, Css.GREEN], [12.0, Css.rgba(51, 255, 102, 0.45)]]

	header_left = CrtText.new()
	header_left.text = "DUDLEY PD // CASE TERMINAL // CLIVEMAN.EXE"
	header_left.font_size = 18
	header_left.color = Css.GREEN_DIM
	header_left.align = CrtText.Align.LEFT
	header_left.wrap = false
	header_left.glows = base_glow
	header.add_child(header_left)

	# .pause-btn{font-size:22px;padding:2px 10px;border:1px solid var(--green-dim);
	#            color:var(--green);border-radius:3px}
	pause_btn = CssButton.new()
	pause_btn.label.font_size = 22
	pause_btn.pad = Vector2(10, 2)
	pause_btn.border = 1
	pause_btn.styles = {
		"normal": Css.box(Color(0, 0, 0, 0), Css.GREEN_DIM, 1, 3),
		"hover": Css.glow(Css.box(Css.rgba(255, 176, 0, 0.1), Css.AMBER, 1, 3), Css.rgba(255, 176, 0, 0.3), 8),
	}
	pause_btn.text_colors = {"normal": Css.GREEN, "hover": Css.AMBER}
	pause_btn.text_glows = {"normal": base_glow, "hover": base_glow}
	pause_btn.set_text("☰")
	pause_btn.pressed.connect(func() -> void:
		SoundFx.key_click()
		if menus:
			menus.call("show_pause_menu"))
	header.add_child(pause_btn)

	# .fs-btn{font-size:14px;padding:2px 10px;border:1px solid var(--green-dim);
	#         color:var(--green-dim);letter-spacing:1px;text-shadow:0 0 4px var(--green-dim)}
	fs_btn = CssButton.new()
	fs_btn.label.font = Css.spaced("vt323", 1)
	fs_btn.label.font_size = 14
	fs_btn.pad = Vector2(10, 2)
	fs_btn.border = 1
	fs_btn.styles = {
		"normal": Css.box(Color(0, 0, 0, 0), Css.GREEN_DIM, 1, 0),
		"hover": Css.glow(Css.box(Color(0, 0, 0, 0), Css.AMBER, 1, 0), Css.rgba(255, 176, 0, 0.4), 6),
	}
	fs_btn.text_colors = {"normal": Css.GREEN_DIM, "hover": Css.AMBER}
	fs_btn.text_glows = {"normal": [[4.0, Css.GREEN_DIM]], "hover": [[4.0, Css.AMBER]]}
	fs_btn.set_text("[ FULLSCREEN ]")
	fs_btn.pressed.connect(toggle_fullscreen)
	header.add_child(fs_btn)

	secure_text = CrtText.new()
	secure_text.text = " SECURE LINK "  # the source newline before it collapses to a space
	secure_text.font_size = 18
	secure_text.color = Css.GREEN_DIM
	secure_text.wrap = false
	secure_text.align = CrtText.Align.LEFT
	secure_text.glows = base_glow
	header.add_child(secure_text)

	secure_blink = CrtText.new()
	secure_blink.text = "█"
	secure_blink.font_size = 18
	secure_blink.color = Css.GREEN_DIM
	secure_blink.wrap = false
	secure_blink.align = CrtText.Align.LEFT
	secure_blink.glows = base_glow
	header.add_child(secure_blink)


func _build_plate() -> void:
	# #dlgName{margin:0 0 -13px 14px;background:#020a04;border:2px solid var(--amber);
	#          padding:1px 14px;font-size:19px;letter-spacing:3px;
	#          text-shadow:0 0 8px rgba(255,176,0,.8)}
	plate = Control.new()
	plate.name = "DlgName"
	plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	plate.visible = false
	plate.z_index = 1
	plate.draw.connect(func() -> void:
		plate.draw_rect(Rect2(Vector2.ZERO, plate.size), Css.BG)
		var c := _plate_color
		plate.draw_rect(Rect2(0, 0, plate.size.x, 2), c)
		plate.draw_rect(Rect2(0, plate.size.y - 2, plate.size.x, 2), c)
		plate.draw_rect(Rect2(0, 2, 2, plate.size.y - 4), c)
		plate.draw_rect(Rect2(plate.size.x - 2, 2, 2, plate.size.y - 4), c))
	term.add_child(plate)
	plate_text = CrtText.new()
	plate_text.font = Css.spaced("vt323", 3)
	plate_text.font_size = 19
	plate_text.wrap = false
	plate_text.align = CrtText.Align.LEFT
	plate.add_child(plate_text)


func _build_screen() -> void:
	screen_box = Control.new()
	screen_box.name = "Screen"
	screen_box.mouse_filter = Control.MOUSE_FILTER_PASS
	screen_box.draw.connect(_draw_screen_box)
	term.add_child(screen_box)

	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.mouse_filter = Control.MOUSE_FILTER_PASS
	screen_box.add_child(scroll)
	_style_scrollbar()

	flow = ScreenFlow.new()
	flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	flow.mouse_filter = Control.MOUSE_FILTER_PASS
	scroll.add_child(flow)

	scroll.get_v_scroll_bar().value_changed.connect(func(_v: float) -> void:
		var bar := scroll.get_v_scroll_bar()
		user_scrolled_up = bar.value + bar.page < bar.max_value - 20.0)


func _build_choices() -> void:
	# #choicePanel{flex-wrap:wrap;gap:8px;justify-content:center;padding:10px 6px;
	#              margin-top:6px;border-top:1px dashed var(--green-dim)}
	choice_panel = Control.new()
	choice_panel.name = "ChoicePanel"
	choice_panel.mouse_filter = Control.MOUSE_FILTER_PASS
	choice_panel.visible = false
	choice_panel.draw.connect(func() -> void:
		_draw_dashed_h(choice_panel, 0.0, choice_panel.size.x, 0.5, Css.GREEN_DIM))
	term.add_child(choice_panel)
	choice_flow = HFlowContainer.new()
	choice_flow.alignment = FlowContainer.ALIGNMENT_CENTER
	choice_flow.add_theme_constant_override("h_separation", 8)
	choice_flow.add_theme_constant_override("v_separation", 8)
	choice_flow.mouse_filter = Control.MOUSE_FILTER_PASS
	choice_panel.add_child(choice_flow)


## Chrome's 1px dashed border: 3px dashes with 3px gaps.
func _draw_dashed_h(ci: CanvasItem, x0: float, x1: float, y: float, c: Color) -> void:
	var x := x0
	while x < x1:
		ci.draw_rect(Rect2(x, y - 0.5, minf(3.0, x1 - x), 1.0), c)
		x += 6.0


func _style_scrollbar() -> void:
	# #screen::-webkit-scrollbar{width:8px} track green-dark, thumb green-dim
	var bar := scroll.get_v_scroll_bar()
	bar.custom_minimum_size.x = 8
	var track := StyleBoxFlat.new()
	track.bg_color = Css.GREEN_DARK
	track.content_margin_left = 4
	track.content_margin_right = 4
	bar.add_theme_stylebox_override("scroll", track)
	bar.add_theme_stylebox_override("scroll_focus", track)
	var thumb := StyleBoxFlat.new()
	thumb.bg_color = Css.GREEN_DIM
	for s in ["grabber", "grabber_highlight", "grabber_pressed"]:
		bar.add_theme_stylebox_override(s, thumb)
	var empty := Texture2D.new()
	bar.add_theme_icon_override("increment", ImageTexture.new())
	bar.add_theme_icon_override("decrement", ImageTexture.new())


func _story_box() -> bool:
	return game_started and not nav_mode and not cv_driving


func _draw_screen_box() -> void:
	if not _story_box():
		return
	# body.game-started #screen{border:2px solid var(--green-dim);background:rgba(1,8,3,.82);
	#   box-shadow:0 0 20px rgba(20,120,60,.3),inset 0 0 24px rgba(4,40,16,.45)}
	var r := Rect2(Vector2.ZERO, screen_box.size)
	var fill := Css.glow(Css.box(Css.rgba(1, 8, 3, 0.82)), Css.rgba(20, 120, 60, 0.3), 20)
	Css.draw_box(screen_box, r, fill)
	# inset glow: a few inset rings fading inward
	var inset_c := Css.rgba(4, 40, 16, 0.45)
	for i in 12:
		var a := inset_c.a * pow(1.0 - float(i) / 12.0, 2.0) * 0.28
		var ir := r.grow(-2.0 - i * 2.0)
		if ir.size.x <= 0 or ir.size.y <= 0:
			break
		screen_box.draw_rect(ir, Color(inset_c.r, inset_c.g, inset_c.b, a), false, 2.0)
	var b := Css.GREEN_DIM
	screen_box.draw_rect(Rect2(0, 0, r.size.x, 2), b)
	screen_box.draw_rect(Rect2(0, r.size.y - 2, r.size.x, 2), b)
	screen_box.draw_rect(Rect2(0, 2, 2, r.size.y - 4), b)
	screen_box.draw_rect(Rect2(r.size.x - 2, 2, 2, r.size.y - 4), b)


# ═════════════════════════════════════════════════════════════════════════════
#  layout: the flex column, recomputed every frame
# ═════════════════════════════════════════════════════════════════════════════

func _process(delta: float) -> void:
	_tick_effects(delta)
	_tick_toast(delta)
	_layout()


var flicker_enabled := true  ## off only for pixel comparisons against the browser


func _tick_effects(delta: float) -> void:
	# @keyframes flicker{0%{opacity:.97}50%{opacity:1}100%{opacity:.98}} .15s infinite
	_flicker_t = fmod(_flicker_t + delta, 0.15) if flicker_enabled else 0.075
	var u := _flicker_t / 0.15
	var o := 0.0
	if u < 0.5:
		o = lerpf(0.97, 1.0, _ease(u * 2.0))
	else:
		o = lerpf(1.0, 0.98, _ease((u - 0.5) * 2.0))
	crt.modulate.a = o
	# .header .blink{animation:blink 1s steps(1) infinite} (50% opacity 0)
	_header_blink_t = fmod(_header_blink_t + delta, 1.0)
	secure_blink.modulate.a = 1.0 if _header_blink_t < 0.5 else 0.0
	if _death_glitch_t >= 0.0:
		_death_glitch_t += delta
		_apply_death_glitch()


## CSS `ease` timing, cubic-bezier(.25,.1,.25,1), close enough via smoothstep bias.
static func _ease(x: float) -> float:
	return _bezier(x, 0.25, 0.1, 0.25, 1.0)


static func _bezier(x: float, x1: float, y1: float, x2: float, y2: float) -> float:
	var lo := 0.0
	var hi := 1.0
	var t := x
	for i in 16:
		var cx := 3.0 * (1.0 - t) * (1.0 - t) * t * x1 + 3.0 * (1.0 - t) * t * t * x2 + t * t * t
		if absf(cx - x) < 0.0005:
			break
		if cx < x:
			lo = t
		else:
			hi = t
		t = (lo + hi) * 0.5
	return 3.0 * (1.0 - t) * (1.0 - t) * t * y1 + 3.0 * (1.0 - t) * t * t * y2 + t * t * t


func _layout() -> void:
	var vp := get_viewport_rect().size
	bg.size = vp
	flyover_vignette.size = vp
	crt.size = vp
	crt_inner.size = vp
	(crt_inner.material as ShaderMaterial).set_shader_parameter("view_px", vp)
	glass.size = vp
	(glass.material as ShaderMaterial).set_shader_parameter("view_px", vp)
	red_vignette.size = vp
	cut_fade.size = vp
	modal_layer.size = vp
	toast_layer.size = vp
	power_on.size = vp
	boot_el.size = vp
	boot_text.position = Vector2(60, 60)
	boot_text.size = Vector2(maxf(0.0, vp.x - 120.0), boot_text.custom_minimum_size.y)
	var cl := cut_label.custom_minimum_size.y
	cut_label.font_size = int(clampf(vp.x * 0.042, 22.0, 40.0))
	cut_label.size = Vector2(vp.x - 36.0, cl)
	cut_label.position = Vector2(18.0, (vp.y - cl) * 0.5)

	var full := nav_mode and not nav_dialog or cv_driving

	# .crt{padding:20px 0}; nav/drive: 0; nav-dialog: 14px
	var crt_pad := Vector4(20, 0, 20, 0)  # top, right, bottom, left
	if full:
		crt_pad = Vector4.ZERO
	elif nav_dialog:
		crt_pad = Vector4(14, 14, 14, 14)

	# .terminal{width:100%;max-width:920px;padding:0 28px}
	var tw := minf(vp.x - crt_pad.y - crt_pad.w, 920.0)
	var tpad := Vector4(0, 28, 0, 28)
	if full:
		tw = vp.x
		tpad = Vector4.ZERO
	elif nav_dialog:
		tw = vp.x
		tpad = Vector4(8, 14, 8, 14)
	var th := vp.y - crt_pad.x - crt_pad.z
	var tx := crt_pad.w + (vp.x - crt_pad.y - crt_pad.w - tw) * 0.5
	if nav_dialog:
		tx = crt_pad.w
	term.position = Vector2(tx, crt_pad.x)
	term.size = Vector2(tw, th)
	term_box.position = Vector2.ZERO
	term_box.size = vp
	(term_box.material as ShaderMaterial).set_shader_parameter("origin_px", term.position + term.size * 0.5)

	var cx := tpad.w
	var cw := tw - tpad.y - tpad.w
	var ch := th - tpad.x - tpad.z

	# ── header ───────────────────────────────────────────────────────────────
	# .header: one flex row. The right span is a line of inline content, so its
	# pieces share a baseline; the line box grows to fit the pause button in
	# story mode (22px) and the Consolas-fallback █ otherwise.
	var show_pause := game_started
	pause_btn.visible = show_pause
	var row_h := 27.9 if show_pause else 22.9
	var base := 20.6 if show_pause else 17.2
	var header_h := row_h + 6.0 + 1.0
	header.position = Vector2(cx, tpad.x)
	header.size = Vector2(cw, header_h)
	header_left.size = Vector2(header_left.content_width() + 2.0, header_left.custom_minimum_size.y)
	header_left.position = Vector2(0, 0)
	secure_blink.size = Vector2(secure_blink.content_width(), secure_blink.custom_minimum_size.y)
	secure_text.size = Vector2(secure_text.content_width(), secure_text.custom_minimum_size.y)
	var fsz := fs_btn.get_combined_minimum_size()
	fs_btn.size = fsz
	var psz := pause_btn.get_combined_minimum_size()
	pause_btn.size = psz
	if rtl():
		# dir=rtl: the two spans swap ends and the right one runs right to
		# left, its buttons keeping their physical margin-right
		header_left.position.x = cw - header_left.size.x
		var gw := secure_blink.size.x + secure_text.size.x + fsz.x + 10.0 + ((psz.x + 8.0) if show_pause else 0.0)
		var lx := gw
		if show_pause:
			lx -= 8.0 + psz.x
			pause_btn.position = Vector2(lx, base - (3.0 + 17.6))
		lx -= 10.0 + fsz.x
		fs_btn.position = Vector2(lx, base - (3.0 + 11.2))
		lx -= secure_text.size.x
		secure_text.position = Vector2(lx, base - 14.4)
		lx -= secure_blink.size.x
		secure_blink.position = Vector2(lx, base - 14.4)
	else:
		var rx := cw
		rx -= secure_blink.size.x
		secure_blink.position = Vector2(rx, base - 14.4)
		rx -= secure_text.size.x
		secure_text.position = Vector2(rx, base - 14.4)
		rx -= 10.0 + fsz.x
		fs_btn.position = Vector2(rx, base - (3.0 + 11.2))
		if show_pause:
			rx -= 8.0 + psz.x
			pause_btn.position = Vector2(rx, base - (3.0 + 17.6))
	header.queue_redraw()

	# ── column ───────────────────────────────────────────────────────────────
	var y := tpad.x + header_h + 10.0
	var avail := tpad.x + ch - y

	var story_art_on := game_started and not nav_mode and not cv_driving
	art.visible = story_art_on
	map_area.visible = (nav_mode and not nav_dialog) or cv_driving
	var plate_on := plate_shown and ((game_started and not nav_mode and not cv_driving) or (game_started and nav_mode and nav_dialog and not cv_driving))
	plate.visible = plate_on
	var screen_on := not ((nav_mode and not nav_dialog) or cv_driving)
	screen_box.visible = screen_on
	choice_panel.visible = choices_active

	# choice panel height: padding 10px 6px, border-top 1px, content
	var choice_h := 0.0
	if choices_active:
		var inner_w := cw - 12.0
		choice_flow.size = Vector2(inner_w, 0)
		choice_flow.position = Vector2(6, 11)
		choice_h = choice_flow.get_combined_minimum_size().y + 21.0
		choice_panel.size = Vector2(cw, choice_h)
		choice_panel.queue_redraw()

	var plate_h := 0.0
	if plate_on:
		var psz2 := Vector2(plate_text.content_width() + 28.0 + 4.0, 19.1 + 2.0 + 4.0)
		plate.size = psz2
		plate_text.size = Vector2(psz2.x - 32.0, 19.1)
		plate_text.position = Vector2(16, 3)
		plate_text.color = _plate_color
		plate_text.glows = [[8.0, Color(_plate_color.r, _plate_color.g, _plate_color.b, 0.8)]]
		plate_h = psz2.y - 13.0
		plate.queue_redraw()

	# #screen padding and flex rules per mode
	var pad := Vector4(0, 12, 8, 0)  # top right bottom left
	var border := 0.0
	if _story_box():
		pad = Vector4(12, 18, 12, 18)
		border = 2.0
	elif nav_dialog:
		pad = Vector4(14, 16, 14, 16)
	flow.pad_top = pad.x
	flow.pad_right = pad.y
	flow.pad_bottom = pad.z
	flow.pad_left = pad.w

	var used_fixed := (choice_h + 6.0 if choices_active else 0.0)
	if map_area.visible:
		# #mapArea{width:100vw;height:100vh}, still below the header on desktop
		map_area.position = Vector2(0, y)
		map_area.size = Vector2(vp.x, vp.y)
		if nav_hud and is_instance_valid(nav_hud):
			# #mapArea is a flex box (align-items:center) with padding 6px 0 10px
			# and the same height as the .fp-wrap in it, so the wrap overflows
			# its content box and is centred 2px above the map area's top edge;
			# the map area's scroll box clips those two rows.
			var wrap_y := 6.0 + ((map_area.size.y - 16.0) - vp.y) * 0.5
			nav_hud.layout(map_area.position + Vector2(0, wrap_y), vp)
	if _nav_overlay == null:
		_nav_overlay = ColorRect.new()
		_nav_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var nom := ShaderMaterial.new()
		nom.shader = preload("res://shaders/viewport_glass.gdshader")
		_nav_overlay.material = nom
		add_child(_nav_overlay)
		move_child(_nav_overlay, crt.get_index() + 1)
	# body.nav-mode:not(.nav-dialog)::after, body.cv-driving::after
	_nav_overlay.visible = (nav_mode and not nav_dialog) or cv_driving
	_nav_overlay.size = vp
	(_nav_overlay.material as ShaderMaterial).set_shader_parameter("view_px", vp)

	var screen_h := 0.0
	if screen_on:
		var content := flow.content_height + border * 2.0
		if _story_box():
			# flex:0 0 auto; min-height:120px; max-height:34vh; margin-bottom:6px
			screen_h = clampf(content, 120.0, vp.y * 0.34)
			var art_h := maxf(0.0, avail - plate_h - screen_h - 6.0 - used_fixed)
			art.position = Vector2(cx, y)
			art.size = Vector2(cw, art_h)
			y += art_h
		else:
			# flex:1 1 180px; min-height:120px (title) / flex:1 1 auto (nav-dialog)
			screen_h = maxf(120.0 if not nav_dialog else 0.0, avail - used_fixed - plate_h)
		if plate_on:
			plate.position = Vector2(cx + 14.0, y)
			y += plate_h
		screen_box.position = Vector2(cx, y)
		screen_box.size = Vector2(cw, screen_h)
		scroll.position = Vector2(border, border)
		scroll.size = Vector2(cw - border * 2.0, screen_h - border * 2.0)
		y += screen_h + (6.0 if _story_box() else 0.0)
		screen_box.queue_redraw()
	elif story_art_on:
		art.position = Vector2(cx, y)
		art.size = Vector2(cw, maxf(0.0, avail - used_fixed))
		y += art.size.y

	if choices_active:
		y += 6.0
		choice_panel.position = Vector2(cx, y)
		y += choice_h

	if not user_scrolled_up:
		var bar := scroll.get_v_scroll_bar()
		scroll.scroll_vertical = int(bar.max_value)


# ═════════════════════════════════════════════════════════════════════════════
#  timing: sleep() that the pause menu can freeze
# ═════════════════════════════════════════════════════════════════════════════

## sleep(ms) in ui-core.js. Paused time does not count toward the delay.
func sleep(ms: float) -> void:
	var remaining := maxf(0.0, ms) / 1000.0
	if remaining <= 0.0:
		await get_tree().process_frame
		return
	var last := Time.get_ticks_usec()
	while remaining > 0.0:
		await get_tree().process_frame
		var now := Time.get_ticks_usec()
		if not game_paused:
			remaining -= float(now - last) / 1000000.0
		last = now


func set_game_paused(p: bool) -> void:
	if game_paused == p:
		return
	game_paused = p
	paused_changed.emit(p)


# ═════════════════════════════════════════════════════════════════════════════
#  lines
# ═════════════════════════════════════════════════════════════════════════════

const BASE_GLOW := [[4.0, Color("#33ff66")], [12.0, Color(0.2, 1.0, 0.4, 0.45)]]


## The computed style of a `.line` with these classes. Mirrors the CSS rules
## for .sys, .err, .dim, .narration, .speaker, .ascii, .savebox, .car,
## .stair-anim, .press-continue, .input-echo, .credits, .version, .sharp.
func _apply_line_style(n: CrtText, cls: String) -> void:
	var classes := cls.split(" ", false)
	n.font = Css.font("vt323")
	n.font_size = 22
	n.line_height = LINE_H
	n.color = Css.GREEN
	n.glows = BASE_GLOW
	n.align = CrtText.Align.CENTER
	n.wrap = true
	n.set_meta("mt", 0.0)
	n.set_meta("mb", 6.0)
	n.set_meta("inline", false)
	n.set_meta("cls", cls)
	for c in classes:
		match c:
			"sys":
				n.color = Css.AMBER
				n.glows = [[4.0, Css.AMBER]]
			"err":
				n.color = Css.RED
				n.glows = [[6.0, Css.RED]]
			"dim":
				n.color = Css.GREEN_DIM
			"narration":
				n.color = Color("#aaffaa")
			"speaker":
				n.color = Css.AMBER
				n.glows = [[6.0, Css.AMBER]]
			"ascii":
				n.font = Css.font("mono")
				n.font_size = 16
				n.line_height = 16.8
				n.align = CrtText.Align.BLOCK
				n.wrap = false
				n.set_meta("inline", true)
			"savebox":
				n.font = Css.font("mono")
				n.font_size = 18
				n.line_height = 22.5   # #screen's line-height:1.25, on 18px
				n.color = Css.AMBER
				n.glows = [[4.0, Css.AMBER]]
				n.align = CrtText.Align.BLOCK
				n.wrap = false
				n.set_meta("inline", true)
			"car":
				n.font = Css.font("mono")
				n.font_size = 18
				n.line_height = 18.9
				n.color = Css.AMBER
				n.glows = [[4.0, Css.AMBER], [12.0, Css.rgba(255, 176, 0, 0.5)]]
				n.align = CrtText.Align.BLOCK
				n.wrap = false
				n.set_meta("inline", true)
			"stair-anim":
				n.font = Css.spaced("vt323", 1)
				n.font_size = 22
				n.line_height = 24.2
				n.color = Color("#66ccff")
				n.glows = [[10.0, Color("#66ccff")], [20.0, Css.rgba(102, 204, 255, 0.7)]]
				n.align = CrtText.Align.BLOCK
				n.wrap = false
				n.box_pad = Vector2(18, 14)
				n.box_bg = Css.rgba(6, 20, 40, 0.4)
				n.box_border = Css.rgba(102, 204, 255, 0.3)
				n.box_border_w = 1.0
				n.box_radius = 4
				n.set_meta("mt", 10.0)
				n.set_meta("mb", 10.0)
				n.set_meta("inline", true)
			"press-continue":
				n.color = Color.WHITE
				n.font = Css.spaced("vt323", 1)
				n.glows = []
			"input-echo":
				n.color = Css.GREEN_DIM
				n.glows = []
			"credits":
				n.color = Css.AMBER
				n.glows = []
			"version":
				n.color = Color("#66ccff")
				n.glows = []
			"sharp":
				n.glows = []
			"glitch":
				n.glows = [[2.0, Css.rgba(255, 40, 90, 0.9), Vector2(-1.6, 0)],
					[2.0, Css.rgba(40, 210, 255, 0.9), Vector2(1.6, 0)],
					[5.0, Css.rgba(180, 255, 200, 0.45)]]


## appendLine(cls): a new, empty `.line` at the bottom of #screen.
func append_line(cls: String = "") -> CrtText:
	nav_just_exited = false
	var n := CrtText.new()
	_apply_line_style(n, cls)
	flow.add_child(n)
	if cls.split(" ", false).has("press-continue"):
		_pulse(n)
	if cls.split(" ", false).has("glitch"):
		_jitter(n)
	while flow.get_child_count() > MAX_LINES:
		var first := flow.get_child(0)
		flow.remove_child(first)
		first.queue_free()
	scroll_to_bottom()
	return n


## setAttribute() on screenEl.lastElementChild, for the data-tpl hints.
func tag_last_line(key: String, value: String) -> void:
	var n := flow.get_child_count()
	if n > 0:
		flow.get_child(n - 1).set_meta(key, value)


## Any control as a line (logo, card hand, figure), with .line margins.
func append_node(ctl: Control, mb: float = 6.0, inline: bool = false) -> void:
	nav_just_exited = false
	ctl.set_meta("mb", mb)
	ctl.set_meta("inline", inline)
	flow.add_child(ctl)
	scroll_to_bottom()


func scroll_to_bottom() -> void:
	if user_scrolled_up:
		return
	await get_tree().process_frame
	var bar := scroll.get_v_scroll_bar()
	scroll.scroll_vertical = int(bar.max_value)


## @keyframes steadypulse{0%,100%{opacity:1}50%{opacity:.75}} 1.4s ease-in-out
func _pulse(n: CanvasItem) -> void:
	var tw := n.create_tween().set_loops()
	tw.tween_property(n, "modulate:a", 0.75, 0.7).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tw.tween_property(n, "modulate:a", 1.0, 0.7).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


## @keyframes glitchJitter .55s steps(2,end) infinite
func _jitter(n: CrtText) -> void:
	var frames := [Vector2(0, 0), Vector2(-1, 0.5), Vector2(1, -0.5), Vector2(-0.5, 0), Vector2(0.5, 0.5)]
	var tw := n.create_tween().set_loops()
	for f in frames:
		tw.tween_callback(func() -> void: n.draw_offset = f)
		tw.tween_interval(0.11)


func blank(n: int = 1) -> void:
	for i in n:
		append_line()


func clear_screen() -> void:
	for c in flow.get_children():
		flow.remove_child(c)
		c.queue_free()
	flow.content_height = 0.0
	flow.custom_minimum_size = Vector2.ZERO
	VoiceCast.stop()
	plate_shown = false
	art.clear()


## Speaker name plate. A "Name: ..." speaker line lifts NAME onto the plate and
## prints the rest; any other line retires the plate.
func set_dlg_name(text: String, cls: String) -> String:
	if nav_mode and not nav_dialog:
		return text
	if cls == "speaker":
		var m := VoiceCast.speaker_re().search(text)
		if m:
			plate_text.text = m.get_string(1).to_upper()
			var c: Variant = VoiceCast.char_color(text)
			_plate_color = c if c != null else Css.AMBER
			plate_shown = true
			return text.substr(m.get_end())
	plate_shown = false
	return text


func _dlg_box_visible() -> bool:
	if cv_driving:
		return false
	if nav_mode and not nav_dialog:
		return false
	return true


## typeLine(text, cls, speed)
func type_line(text: String, cls: String = "", speed: float = 14.0) -> void:
	if ended:
		return
	text = I18n.line(text)
	if nav_mode and nav_hud:
		nav_hud.call("show_toast", text)
	VoiceCast.say(text, cls)
	var spk: Variant = VoiceCast.char_color(text) if cls == "speaker" else null
	text = set_dlg_name(text, cls)
	typing = true
	var div := append_line(cls)
	if spk != null:
		div.color = spk
		div.glows = [[6.0, spk]]

	if _autoplay:
		div.text = text
	else:
		# Characters are emitted against a running clock rather than one timer
		# per character: at 14 ms a character, a frame-bound timer would type
		# at most one letter per frame and run slow.
		var i := 0
		var owed := 0.0
		var last := Time.get_ticks_usec()
		var shown := ""
		while i < text.length():
			var ch := text[i]
			shown += ch
			div.text = shown
			SoundFx.char_click(ch)
			var delay := speed
			if ch == " ":
				delay = speed / 2.0
			if ch == "." or ch == "!" or ch == "?":
				delay = speed * 8.0
			if ch == ",":
				delay = speed * 3.0
			owed += delay / 1000.0
			i += 1
			while owed > 0.0 and not skip_requested:
				await get_tree().process_frame
				var now := Time.get_ticks_usec()
				if not game_paused:
					owed -= float(now - last) / 1000000.0
				last = now
				if owed > 0.0 and owed < 0.004:
					owed = 0.0
			if skip_requested:
				div.text = text
				break
			scroll_to_bottom()
	skip_requested = false
	typing = false
	scroll_to_bottom()
	if cls == "speaker" and _dlg_box_visible():
		await dlg_advance_gate(div)


## instantLine(text, cls)
func instant_line(text: String, cls: String = "") -> CrtText:
	text = I18n.line(text)
	var spk: Variant = VoiceCast.char_color(text) if cls == "speaker" else null
	var shown := set_dlg_name(text, cls)
	var div := append_line(cls)
	if spk != null:
		div.color = spk
		div.glows = [[6.0, spk]]
	div.text = shown
	if nav_mode and nav_hud:
		nav_hud.call("show_toast", text)
	VoiceCast.say(text, cls)
	return div


# ═════════════════════════════════════════════════════════════════════════════
#  gates: waiting for the player
# ═════════════════════════════════════════════════════════════════════════════

var _gate_open := false
var _gate_armed_at := 0
var _gate_done := false
var _pc_open := false
var _pc_done := false


## dlgAdvanceGate: a blinking ▼ on the line, then Enter / Space / click / pad A.
func dlg_advance_gate(line: CrtText) -> void:
	if _autoplay:
		await sleep(120)
		return
	line.suffix = " ▼"
	line.suffix_color = Css.AMBER
	line.suffix_glows = [[6.0, Css.AMBER]]
	scroll_to_bottom()
	_gate_open = true
	_gate_done = false
	_gate_armed_at = Time.get_ticks_msec() + 250
	var t0 := Time.get_ticks_msec()
	while not _gate_done:
		await get_tree().process_frame
		# @keyframes blink{50%{opacity:0}} 1s steps(1)
		var ph := float((Time.get_ticks_msec() - t0) % 1000) / 1000.0
		line.suffix_alpha = 1.0 if ph < 0.5 else 0.0
	_gate_open = false
	line.suffix = ""
	user_scrolled_up = false
	scroll_to_bottom()


## pressAnyToContinue(): a pulsing prompt in #screen and a CONTINUE button.
func press_any_to_continue() -> void:
	if ended:
		return
	blank()
	var pc := append_line("press-continue")
	var kbd := "  >  PRESS TO CONTINUE  <"
	var padt := "  >  PRESS [{CONFIRM}] TO CONTINUE  <"
	if pad_connected and I18n.has(padt):
		pc.text = I18n.t(padt).replace("{CONFIRM}", Pad.label_confirm())
	elif pad_connected:
		pc.text = "  >  PRESS [" + Pad.label_confirm() + "] TO CONTINUE  <"
	else:
		pc.text = I18n.t(kbd)
	pc.set_meta("kbd_text", kbd)
	pc.set_meta("pad_text", padt)
	blank()
	if _autoplay:
		await sleep(120)
		pc.queue_free()
		return
	clear_choices()
	var done := [false]
	var btn := make_choice_button(I18n.t("CONTINUE"))
	btn.pressed.connect(func() -> void: done[0] = true)
	choice_flow.add_child(btn)
	choices_active = true
	_pc_open = true
	_pc_done = false
	scroll_to_bottom()
	while not done[0] and not _pc_done:
		await get_tree().process_frame
	_pc_open = false
	clear_choices()
	SoundFx.key_click()
	if is_instance_valid(pc):
		flow.remove_child(pc)
		pc.queue_free()
	user_scrolled_up = false
	scroll_to_bottom()


func press_enter_to_continue() -> void:
	await press_any_to_continue()


## setLanguage(): Arabic sets <html dir="rtl">, which reverses every flex row
## and runs text right to left (CrtText follows I18n directly). Only the
## containers the browser reverses are switched to layout_direction RTL:
## Godot also mirrors anchored controls under RTL, which would throw the
## hand-placed ones (overlays, modals) off screen. The hand-placed rows (the
## header, the nav and drive bars) read `rtl()` themselves.
func _apply_direction() -> void:
	var d := Control.LAYOUT_DIRECTION_RTL if I18n.is_rtl() else Control.LAYOUT_DIRECTION_LTR
	if choice_flow:
		choice_flow.layout_direction = d
	_layout()


func rtl() -> bool:
	return I18n.is_rtl()


## Pad A on the prompts that poll for it themselves in the browser: the
## dialogue gate, pressAnyToContinue and the nav read gate.
func pad_confirm() -> void:
	if typing:
		return
	if _gate_open and Time.get_ticks_msec() >= _gate_armed_at:
		_gate_done = true
	elif _pc_open:
		_pc_done = true
	elif _read_open:
		_read_done = true


## updatePadMode(): every line carrying a keyboard and a pad wording swaps to
## the one that fits, and templated hints fill in their key names.
func _on_pad_mode(_connected: bool) -> void:
	pad_connected = Pad.connected
	var nodes: Array = []
	for c in flow.get_children():
		nodes.append(c)
	for n in nodes:
		if not (n is CrtText):
			continue
		var line: CrtText = n
		if line.has_meta("pad_text"):
			var kbd: String = line.get_meta("kbd_text", "")
			var padt: String = String(line.get_meta("pad_text", "")) 				.replace("{CONFIRM}", Pad.label_confirm()).replace("{CHECK}", Pad.label_check())
			var kt := I18n.t(kbd) if I18n.has(kbd) else I18n.t_sub(kbd)
			var pt := I18n.t(padt) if I18n.has(padt) else I18n.t_sub(padt)
			line.text = pt if Pad.connected else kt
		if line.has_meta("tpl"):
			var tpl: String = I18n.t_sub(String(line.get_meta("tpl")))
			line.text = tpl 				.replace("{CHECK_KEY}", Pad.label_check() if Pad.connected else "C") 				.replace("{CHECK_VERB}", ("press " + Pad.label_check()) if Pad.connected else "press C") 				.replace("{CONFIRM_KEY}", Pad.label_confirm() if Pad.connected else "Enter")
	if nav_hud:
		nav_hud.call("on_pad_mode")
	if drive_session:
		drive_session.call("on_pad_mode")


# ═════════════════════════════════════════════════════════════════════════════
#  choices
# ═════════════════════════════════════════════════════════════════════════════

## .choice-btn{border:2px solid var(--amber);color:var(--amber);font-size:16px;
##   padding:10px 16px;border-radius:6px;text-shadow:0 0 4px var(--amber);
##   box-shadow:0 0 8px rgba(255,176,0,.35);letter-spacing:1px;min-width:80px;min-height:44px}
func make_choice_button(label: String) -> CssButton:
	var b := CssButton.new()
	b.label.font = Css.spaced("vt323", 1)
	b.label.font_size = 16
	b.pad = Vector2(16, 10)
	b.border = 2
	b.min_size = Vector2(80, 44)
	b.styles = {
		"normal": Css.glow(Css.box(Color(0, 0, 0, 0), Css.AMBER, 2, 6), Css.rgba(255, 176, 0, 0.35), 8),
		"hover": Css.glow(Css.box(Css.rgba(255, 176, 0, 0.12), Css.AMBER, 2, 6), Css.rgba(255, 176, 0, 0.55), 14),
		"active": Css.glow(Css.box(Css.rgba(255, 176, 0, 0.25), Css.AMBER, 2, 6), Css.rgba(255, 176, 0, 0.6), 14),
		"focus": Css.glow(Css.box(Css.rgba(255, 176, 0, 0.18), Css.AMBER, 2, 6), Css.rgba(255, 176, 0, 0.75), 22),
	}
	b.text_colors = {"normal": Css.AMBER}
	b.text_glows = {"normal": [[4.0, Css.AMBER]]}
	b.focus_outline = Css.AMBER
	b.set_text(label)
	b.add_to_group("choice_btn")
	return b


func clear_choices() -> void:
	for c in choice_flow.get_children():
		choice_flow.remove_child(c)
		c.queue_free()
	choices_active = false


## showChoiceButtons(opts): opts are { "keys": [...], "label": "..." }.
## Returns the chosen option. Enter picks only when there is a single option.
func show_choice_buttons(opts: Array) -> Dictionary:
	clear_choices()
	var picked: Array = []
	for opt in opts:
		var b := make_choice_button(I18n.t(opt.get("label", "")))
		b.pressed.connect(func() -> void:
			if picked.is_empty():
				picked.append(opt))
		choice_flow.add_child(b)
	choices_active = true
	scroll_to_bottom()
	if _autoplay and not opts.is_empty():
		await sleep(150)
		var pick: Dictionary = opts[autoplay_pick(opts.size())]
		if autoplay_rng != null:
			print("[choice] ", pick.get("label", ""))
		picked.append(pick)
	_single_choice = opts.size() == 1
	while picked.is_empty():
		await get_tree().process_frame
		if _single_enter and not typing:
			_single_enter = false
			if opts.size() == 1:
				picked.append(opts[0])
	_single_choice = false
	SoundFx.key_click()
	clear_choices()
	instant_line("C:\\DUDLEY> " + String(picked[0].get("label", "")), "input-echo")
	return picked[0]


var _single_choice := false
var _single_enter := false


func ask_choice(prompt: String, opts: Array) -> Dictionary:
	await type_line(prompt, "sys")
	return await show_choice_buttons(opts)


func ask_click(prompt: String, opts: Array) -> Dictionary:
	await type_line(prompt, "sys")
	return await show_choice_buttons(opts)


func yn(q: String, yes_label: String = "YES", no_label: String = "NO") -> bool:
	await type_line(q, "sys")
	var a := await show_choice_buttons([
		{"keys": ["y", "yes"], "label": yes_label},
		{"keys": ["n", "no"], "label": no_label},
	])
	return (a.get("keys", []) as Array).has("y")


## showSliderChoice(prompt, min, max)
func ask_number(prompt: String, min_v: int, max_v: int) -> int:
	await type_line("%s (%d-%d)" % [prompt, min_v, max_v], "sys")
	clear_choices()
	var cur := [clampi(int(floor((min_v + max_v) / 2.0)), min_v, max_v)]
	var done := [false]

	# wrap{width:100%;text-align:center;padding:8px} (border-box): the $ label
	# (24px, margin-bottom 8px), the range input on a line of its own, and
	# CONFIRM BET (display:block;margin:12px auto 0)
	var wrap := Control.new()
	wrap.mouse_filter = Control.MOUSE_FILTER_PASS
	var val := CrtText.new()
	val.font_size = 24
	val.color = Css.AMBER
	val.glows = [[6.0, Css.AMBER]]
	val.wrap = false
	val.text = "$ %d" % cur[0]
	wrap.add_child(val)
	var slider := HSlider.new()
	slider.min_value = min_v
	slider.max_value = max_v
	slider.step = 1
	slider.value = cur[0]
	_style_slider(slider)
	slider.value_changed.connect(func(v: float) -> void:
		cur[0] = int(v)
		val.text = "$ %d" % cur[0])
	wrap.add_child(slider)
	var ok := make_choice_button(I18n.t("CONFIRM BET"))
	ok.pressed.connect(func() -> void: done[0] = true)
	wrap.add_child(ok)
	var place := func() -> void:
		var w := choice_flow.size.x
		var inner := w - 16.0
		var vh := val.text_height()
		val.size = Vector2(inner, vh)
		val.position = Vector2(8, 8)
		# the input sits in a 22.07px line box (the strut of the wrap's 22px
		# VT323) with its default 2px margins
		var sw := inner * 0.8
		slider.size = Vector2(sw, 16.04)
		slider.position = Vector2(8.0 + (inner - sw) * 0.5, 8.0 + vh + 8.0 + 2.03)
		var os := ok.get_combined_minimum_size()
		ok.size = os
		ok.position = Vector2((w - os.x) * 0.5, 8.0 + vh + 8.0 + 22.07 + 12.0)
		wrap.custom_minimum_size = Vector2(w, ok.position.y + os.y + 8.0)
	choice_flow.add_child(wrap)
	choices_active = true
	await get_tree().process_frame
	place.call()
	choice_flow.resized.connect(place)
	slider.grab_focus()
	if _autoplay:
		await sleep(150)
		done[0] = true
	while not done[0]:
		await get_tree().process_frame
	choice_flow.resized.disconnect(place)
	SoundFx.key_click()
	clear_choices()
	instant_line("C:\\DUDLEY> Bet $%d" % cur[0], "input-echo")
	return cur[0]


## Chrome's native range input with accent-color:#ffb000: an 8px track with
## a 1px #858585 border, #3b3b3b to the right of the thumb and the accent to
## its left, and a 16px accent thumb. HSlider keeps the input handling; its
## own art is blanked and this draws over it.
func _style_slider(s: HSlider) -> void:
	var empty := StyleBoxEmpty.new()
	s.add_theme_stylebox_override("slider", empty)
	s.add_theme_stylebox_override("grabber_area", empty)
	s.add_theme_stylebox_override("grabber_area_highlight", empty)
	s.add_theme_stylebox_override("focus", empty)
	# a clear 16px grabber, so the value maps to position as Chrome's does
	var knob := Image.create(16, 16, false, Image.FORMAT_RGBA8)
	knob.fill(Color(0, 0, 0, 0))
	var kt := ImageTexture.create_from_image(knob)
	s.add_theme_icon_override("grabber", kt)
	s.add_theme_icon_override("grabber_highlight", kt)
	s.draw.connect(func() -> void:
		var w := s.size.x
		var track := StyleBoxFlat.new()
		track.bg_color = Color("#3b3b3b")
		track.border_color = Color("#858585")
		track.set_border_width_all(1)
		track.set_corner_radius_all(4)
		track.anti_aliasing = true
		s.draw_style_box(track, Rect2(1, 4, w - 2.0, 8))
		var span := maxf(0.0, s.max_value - s.min_value)
		var frac := (s.value - s.min_value) / span if span > 0.0 else 0.0
		var cx := 8.0 + frac * (w - 16.0)
		var fill := StyleBoxFlat.new()
		fill.bg_color = Css.AMBER
		fill.corner_radius_top_left = 3
		fill.corner_radius_bottom_left = 3
		fill.anti_aliasing = true
		s.draw_style_box(fill, Rect2(2, 5, maxf(0.0, cx - 2.0), 6))
		s.draw_circle(Vector2(cx, 8.0), 8.0, Css.AMBER, true, -1.0, true))


# ═════════════════════════════════════════════════════════════════════════════
#  story flow helpers
# ═════════════════════════════════════════════════════════════════════════════

## section(title): music cue, sting, scene art, then a rule-title-rule banner.
func section(title: String) -> void:
	if _autoplay:
		print("[section] ", title, "  money=", GameState.money, " inv=", GameState.inventory)
	MusicPlayer.cue(title)
	var sk := Stings.hint(title)
	if sk != "":
		Stings.play(sk)
	if not nav_mode:
		var h := StoryArt.hint(title)
		if h != "":
			art.set_scene(h)
	title = I18n.t(title)
	blank()
	var bar := "=".repeat(54)
	instant_line(bar, "sys")
	instant_line(title, "sys")
	instant_line(bar, "sys")
	blank()


## cutscene(beats, opts): each beat typed into the box and gated.
func cutscene(beats: Array, opts: Dictionary = {}) -> void:
	if opts.has("title"):
		MusicPlayer.cue(opts["title"])
	var cur: String = opts.get("title", "")
	clear_screen()
	if cur != "":
		section(cur)
	for beat in beats:
		if ended:
			return
		var text := ""
		if beat is String:
			text = beat
		else:
			text = beat.get("text", "")
			if beat.has("title"):
				cur = beat["title"]
				section(cur)
			if beat.has("art"):
				instant_line(beat["art"], "ascii")
		await type_line(text, "narration")
		await press_any_to_continue()


func add_item(item: String) -> void:
	if not GameState.inventory.has(item):
		GameState.inventory.append(item)
		blank()
		instant_line("  *** ITEM OBTAINED: " + item.to_upper() + " ***", "sys")
		show_inv()


func show_inv() -> void:
	if GameState.inventory.is_empty():
		instant_line('"Your pockets are empty."', "narration")
	else:
		instant_line('"Inventory: ' + ", ".join(GameState.inventory) + '"', "narration")


func show_status() -> void:
	instant_line("  ─── $%d  ·  LVL %d  ·  XP %d ───" % [GameState.money, GameState.level, GameState.enemies_beat], "sys")


func level_up_check() -> bool:
	var lvl := 1
	var threshold := 2
	var e := GameState.enemies_beat
	while e >= threshold:
		lvl += 1
		threshold *= 2
	var old := GameState.level
	GameState.level = lvl
	return lvl > old


func play_music(name: String) -> void:
	MusicPlayer.play_music(name)


func stop_music() -> void:
	MusicPlayer.stop_music()


# ── story art (STORYART.*) ───────────────────────────────────────────────────

func art_set(key: String) -> void:
	art.set_scene(key)


func art_panel(key: String, fx: String = "") -> void:
	art.set_panel(key, fx)


func art_clear_panel() -> void:
	art.clear_panel()


## instantArt(kind, cls): in story flow the figure goes above the dialogue box.
func instant_art(kind: String, cls: String = "") -> void:
	if game_started and not nav_mode:
		art.set_char(kind, cls)


# ═════════════════════════════════════════════════════════════════════════════
#  cinematic layer (CUTSCENE)
# ═════════════════════════════════════════════════════════════════════════════

const FADE_MS := 280
const HOLD_MS := 620


func cut_fade_in(label: String = "") -> void:
	VoiceCast.stop()
	cut_fade.mouse_filter = Control.MOUSE_FILTER_STOP
	var tw := create_tween()
	tw.tween_property(cut_fade, "modulate:a", 1.0, FADE_MS / 1000.0).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	await sleep(FADE_MS + 40)
	if label != "":
		cut_label.text = I18n.t(label)
		var tl := create_tween()
		tl.tween_property(cut_label, "modulate:a", 1.0, 0.24)
		await sleep(HOLD_MS)


func cut_fade_out() -> void:
	cut_label.modulate.a = 0.0
	cut_label.text = ""
	cut_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var tw := create_tween()
	tw.tween_property(cut_fade, "modulate:a", 0.0, FADE_MS / 1000.0).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	await sleep(FADE_MS + 40)


# ═════════════════════════════════════════════════════════════════════════════
#  Bevan's death: red vignette pulse and screen glitch
# ═════════════════════════════════════════════════════════════════════════════

func bevan_death_effect() -> void:
	MusicPlayer.stop_music()
	SoundFx.death_sting()
	# #redVignette.show{animation:redVignettePulse 2.8s ease-out forwards}
	#   0% 0, 15% .95, 45% .55, 70% .8, 100% .62
	red_vignette.modulate.a = 0.0
	var tw := create_tween()
	var keys := [[0.15, 0.95], [0.45, 0.55], [0.70, 0.80], [1.0, 0.62]]
	var prev := 0.0
	for k in keys:
		tw.tween_property(red_vignette, "modulate:a", k[1], (k[0] - prev) * 2.8).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		prev = k[0]
	# .death-glitch{animation:deathGlitch .5s steps(3,end) 3}
	_death_glitch_t = 0.0
	await sleep(1500)
	_death_glitch_t = -1.0
	crt.position = Vector2.ZERO
	crt.scale = Vector2.ONE
	tw.kill()
	var fade := create_tween()
	fade.tween_property(red_vignette, "modulate:a", 0.0, 0.6).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await sleep(650)
	red_vignette.modulate.a = 0.0


func _apply_death_glitch() -> void:
	var t := _death_glitch_t
	if t >= 1.5:
		crt.position = Vector2.ZERO
		crt.scale = Vector2.ONE
		return
	# steps(3,end) over each .5s iteration: sample the keyframes at 0, 1/3, 2/3.
	var local := fmod(t, 0.5) / 0.5
	var step := floorf(local * 3.0) / 3.0
	var frames := [[0.0, Vector2(0, 0), 1.0], [0.10, Vector2(-8, 3), 1.01], [0.22, Vector2(10, -4), 0.99],
		[0.34, Vector2(-6, 5), 1.015], [0.48, Vector2(7, -2), 1.0], [0.62, Vector2(-4, 2), 1.008],
		[0.78, Vector2(3, -3), 1.0], [1.0, Vector2(0, 0), 1.0]]
	var a: Array = frames[0]
	var b: Array = frames[1]
	for i in range(frames.size() - 1):
		if step >= frames[i][0] and step <= frames[i + 1][0]:
			a = frames[i]
			b = frames[i + 1]
			break
	var f := (step - float(a[0])) / maxf(0.0001, float(b[0]) - float(a[0]))
	var off: Vector2 = (a[1] as Vector2).lerp(b[1], f)
	var sc := lerpf(a[2], b[2], f)
	crt.pivot_offset = size * 0.5
	crt.position = off
	crt.scale = Vector2(sc, sc)


# ═════════════════════════════════════════════════════════════════════════════
#  input
# ═════════════════════════════════════════════════════════════════════════════

func _input(event: InputEvent) -> void:
	_handle_input(event)
	# Keys the game did not take go on to the terminal layer's GUI (focused
	# buttons), as they did when it shared this viewport. Not while a modal or
	# the pause menu owns the keyboard.
	if event is InputEventKey or event is InputEventJoypadButton or event is InputEventJoypadMotion:
		if not get_viewport().is_input_handled() and not game_paused \
				and not (menus and menus.call("modal_open")):
			term_vp.push_input(event)


func _handle_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		SoundFx.ensure()
		if game_paused:
			return
		var k: InputEventKey = event
		var enter := k.keycode == KEY_ENTER or k.keycode == KEY_KP_ENTER
		var space := k.keycode == KEY_SPACE
		if typing and (enter or space):
			skip_requested = true
			get_viewport().set_input_as_handled()
			return
		if _gate_open and (enter or space) and Time.get_ticks_msec() >= _gate_armed_at:
			_gate_done = true
			get_viewport().set_input_as_handled()
			return
		if _pc_open and (enter or space) and not typing:
			_pc_done = true
			get_viewport().set_input_as_handled()
			return
		if _single_choice and enter and not typing:
			_single_enter = true
			get_viewport().set_input_as_handled()
			return
		if _read_open and (enter or space):
			_read_done = true
			get_viewport().set_input_as_handled()
			return
		if enter or space:
			if nav_hud and nav_hud.call("confirm_pressed"):
				get_viewport().set_input_as_handled()
				return
		if (k.keycode == KEY_C) and not k.ctrl_pressed and not k.meta_pressed and movement_allowed and check_fn.is_valid():
			SoundFx.key_click()
			check_fn.call()
			get_viewport().set_input_as_handled()
			return
		if k.keycode != KEY_ENTER and (k.unicode > 0 or k.keycode == KEY_BACKSPACE):
			SoundFx.key_click()
		elif enter:
			SoundFx.key_click()
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		SoundFx.ensure()
		if game_paused:
			return
		if _gate_open and Time.get_ticks_msec() >= _gate_armed_at:
			# clicks on buttons and modals do not advance dialogue
			var hovered := term_vp.gui_get_hovered_control()
			if hovered is BaseButton or (hovered and hovered.get_parent() is BaseButton):
				return
			if menus and menus.call("modal_open"):
				return
			_gate_done = true


var finale_node: Node = null
var snake_handler: Callable = Callable()
var _room: NavRoom = null
var drive_session: Node = null   ## the night drive, while one is running
var _nav_overlay: ColorRect = null
var _toast: Control = null
var _toast_text: CrtText = null
var _toast_timer := 0.0
var _toast_shown := 0.0
var _read_prompt: Control = null


func finale() -> Node:
	return finale_node


# ═════════════════════════════════════════════════════════════════════════════
#  nav mode
# ═════════════════════════════════════════════════════════════════════════════

## navigateRoom(roomId, grid, start, events, exits, opts)
func navigate_room(room_id: int, grid: NavGrid, start: Array, events: Dictionary, exits: Dictionary, opts: Dictionary = {}) -> String:
	if ended:
		return ""
	if _room and is_instance_valid(_room):
		_room.stop()
	_room = NavRoom.new()
	add_child(_room)
	if _autoplay:
		print("[room] ", opts.get("title", ""))
	var code: String = await _room.run(self, room_id, grid, start, events, exits, opts)
	if _autoplay:
		print("[room exit] ", code)
	return code


func enter_nav_mode() -> void:
	nav_mode = true
	clear_screen()
	set_movement_allowed(true)


## exitNavMode()
func exit_nav_mode() -> void:
	nav_mode = false
	nav_dialog = false
	can_move = false
	if _room and is_instance_valid(_room):
		_room.stop()
	_room = null
	nav_hud = null
	for c in map_area.get_children():
		map_area.remove_child(c)
		c.queue_free()
	check_fn = Callable()
	movement_allowed = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	nav_just_exited = true
	hide_nav_toast()


## The nav room's HUD, or the drive's — both fill #mapArea and answer the same
## handful of calls.
func mount_nav_hud(hud: Control) -> void:
	for c in map_area.get_children():
		map_area.remove_child(c)
		c.queue_free()
	map_area.add_child(hud)
	nav_hud = hud


func nav_repaint_room(_grid: NavGrid) -> void:
	if _room and is_instance_valid(_room):
		_room.repaint()


## navSuspend(): a conversation or minigame takes the screen over the viewport.
func nav_suspend() -> void:
	if not nav_mode:
		return
	nav_dialog = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	clear_screen()
	hide_nav_toast()


func nav_resume() -> void:
	nav_dialog = false
	if nav_hud:
		nav_hud.update_stats()


## showNavToast(text): the latest line near the top of the viewport, fading.
func nav_toast(text: String) -> void:
	text = text.strip_edges()
	if text == "":
		return
	if _toast == null:
		_toast = Control.new()
		_toast.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_toast.draw.connect(func() -> void:
			var sb := Css.glow(Css.box(Css.rgba(2, 12, 5, 0.82), Css.GREEN_DIM, 1, 6), Css.rgba(0, 0, 0, 0.6), 18)
			Css.draw_box(_toast, Rect2(Vector2.ZERO, _toast.size), sb))
		toast_layer.add_child(_toast)
		_toast_text = CrtText.new()
		_toast_text.font_size = 22
		_toast_text.line_height = 28.6
		_toast_text.color = Css.GREEN
		_toast_text.glows = [[6.0, Css.rgba(51, 255, 102, 0.5)]]
		_toast.add_child(_toast_text)
		_toast.modulate.a = 0.0
	_toast_text.text = text
	_toast_shown = 0.0
	_toast.set_meta("target", 1.0)
	_toast.set_meta("y", -8.0)
	if nav_toast_hold:
		_toast_timer = -1.0
	else:
		_toast_timer = minf(8000.0, 1600.0 + text.length() * 45.0) / 1000.0


func hide_nav_toast() -> void:
	if _toast:
		_toast.set_meta("target", 0.0)
		_toast_timer = 0.0


## navReadGate(): ▶ PRESS ENTER TO CONTINUE over the viewport.
func nav_read_gate() -> void:
	if not nav_mode:
		return
	if _autoplay:
		await sleep(120)
		return
	var tpl := "PRESS {CONFIRM} TO CONTINUE" if Pad.connected else "PRESS ENTER TO CONTINUE"
	var text := I18n.t(tpl).replace("{CONFIRM}", Pad.label_confirm())
	_read_prompt = Control.new()
	_read_prompt.mouse_filter = Control.MOUSE_FILTER_STOP
	_read_prompt.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var lbl := CrtText.new()
	lbl.font = Css.spaced("vt323", 1)
	lbl.font_size = 20
	lbl.color = Css.GREEN_BRIGHT
	lbl.glows = [[6.0, Css.GREEN]]
	lbl.wrap = false
	lbl.text = "▶  ▶ " + text
	_read_prompt.add_child(lbl)
	_read_prompt.draw.connect(func() -> void:
		_read_prompt.draw_style_box(Css.box(Css.rgba(6, 20, 10, 0.86), Css.GREEN_DIM, 1, 5), Rect2(Vector2.ZERO, _read_prompt.size)))
	toast_layer.add_child(_read_prompt)
	var done := [false]
	_read_prompt.gui_input.connect(func(e: InputEvent) -> void:
		if e is InputEventMouseButton and e.pressed and not game_paused:
			done[0] = true)
	var t0 := Time.get_ticks_msec()
	_read_open = true
	_read_done = false
	while not done[0] and not _read_done:
		var w := lbl.content_width() + 32.0
		var h := lbl.text_height() + 14.0
		_read_prompt.size = Vector2(w, h)
		_read_prompt.position = Vector2((size.x - w) * 0.5, size.y - 64.0 - h)
		lbl.size = Vector2(w - 32.0, lbl.text_height())
		lbl.position = Vector2(16, 6)
		# @keyframes navReadBlink{0%,55%{opacity:1}56%,100%{opacity:.35}} 1.05s steps(1)
		var ph := float((Time.get_ticks_msec() - t0) % 1050) / 1050.0
		_read_prompt.modulate.a = 1.0 if ph < 0.56 else 0.35
		_read_prompt.queue_redraw()
		await get_tree().process_frame
	_read_open = false
	_read_prompt.queue_free()
	_read_prompt = null


var _read_open := false
var _read_done := false


func _tick_toast(delta: float) -> void:
	if _toast == null:
		return
	if _toast_timer > 0.0:
		_toast_timer -= delta
		if _toast_timer <= 0.0:
			_toast.set_meta("target", 0.0)
	var target: float = _toast.get_meta("target", 0.0)
	# transition: opacity .35s ease, transform .35s ease
	var k := 1.0 - exp(-delta / 0.1)
	_toast.modulate.a = lerpf(_toast.modulate.a, target, k)
	var ty: float = _toast.get_meta("y", -8.0)
	ty = lerpf(ty, 0.0 if target > 0.0 else -8.0, k)
	_toast.set_meta("y", ty)
	_toast.visible = nav_mode and not nav_dialog and _toast.modulate.a > 0.01
	var maxw := minf(680.0, size.x * 0.92)
	_toast_text.wrap = true
	_toast_text.size = Vector2(maxw - 32.0, _toast_text.custom_minimum_size.y)
	var tw := minf(maxw, _toast_text.content_width() + 32.0 + 2.0)
	_toast_text.size = Vector2(tw - 34.0, _toast_text.custom_minimum_size.y)
	var th := minf(size.y * 0.38, _toast_text.custom_minimum_size.y + 16.0 + 2.0)
	_toast.size = Vector2(tw, th)
	_toast.position = Vector2((size.x - tw) * 0.5, maxf(10.0, size.y * 0.05) + ty)
	_toast_text.position = Vector2(17, 9)
	_toast.queue_redraw()


# ═════════════════════════════════════════════════════════════════════════════
#  transitions (engine/transitions.js)
# ═════════════════════════════════════════════════════════════════════════════

const CAR_FRAMES := [
	"            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (o)               (o)",
	"            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (O)               (O)",
	"            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (0)               (0)",
	"            ______________\n          ,'|    |    |  |\\___\n         / |_____|____|__|    \\\n        /_____________________|\n         (O)               (O)",
]
const ROAD_FRAMES := [
	"  ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~",
	"~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ -",
	"- ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~",
	" ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ ",
]
const STAIR_UP_FRAMES := [
	"                         \n                    ____ \n               ____|    \n          ____|         \n     ____|              \n ___|    @              ",
	"                         \n                    ____ \n               ____|    \n          ____|         \n     ____|   @          \n ___|                   ",
	"                         \n                    ____ \n               ____|    \n          ____|  @      \n     ____|              \n ___|                   ",
	"                         \n                    ____ \n               ____| @  \n          ____|         \n     ____|              \n ___|                   ",
	"                         \n                 @  ____ \n               ____|    \n          ____|         \n     ____|              \n ___|                   ",
]
const STAIR_DN_FRAMES := [
	" ___    @                \n     |____              \n          |____         \n               |____    \n                    |___\n                         ",
	" ___                     \n     |____  @           \n          |____         \n               |____    \n                    |___\n                         ",
	" ___                     \n     |____              \n          |____ @       \n               |____    \n                    |___\n                         ",
	" ___                     \n     |____              \n          |____         \n               |____ @  \n                    |___\n                         ",
	" ___                     \n     |____              \n          |____         \n               |____    \n                    |___\n                       @ ",
]


## carTransition(fromLoc, toLoc): the ASCII drive.
func car_transition(from_loc: String, to_loc: String) -> void:
	if nav_mode:
		exit_nav_mode()
	await press_enter_to_continue()
	if ended:
		return
	await cut_fade_in("TRANSIT")
	clear_screen()
	blank()
	instant_line(">>>>>   TRANSIT IN PROGRESS   <<<<<", "sys")
	blank()
	instant_line("  FROM: " + I18n.t(from_loc), "speaker")
	instant_line("    TO: " + I18n.t(to_loc), "speaker")
	blank(2)
	await cut_fade_out()
	var car_div := append_line("car")
	var road_div := append_line("car")
	for i in 22:
		car_div.text = CAR_FRAMES[i % CAR_FRAMES.size()]
		road_div.text = ROAD_FRAMES[i % ROAD_FRAMES.size()]
		if i % 3 == 0:
			SoundFx.engine_tick()
		await sleep(170)
	blank(2)
	await cut_fade_in()
	clear_screen()
	await cut_fade_out()


## floorTransition(direction, fromLabel, toLabel)
func floor_transition(direction: String, from_label: String, to_label: String) -> void:
	clear_screen()
	blank()
	var up := direction == "up"
	var arrow := ("▲  " + I18n.t("ASCENDING") + "  ▲") if up else ("▼  " + I18n.t("DESCENDING") + "  ▼")
	instant_line("     " + arrow, "sys")
	blank()
	instant_line("  " + I18n.t("FROM:") + " " + I18n.t(from_label), "dim sharp")
	instant_line("    " + I18n.t("TO:") + " " + I18n.t(to_label), "speaker")
	blank()
	var frames := STAIR_UP_FRAMES if up else STAIR_DN_FRAMES
	var stair_div := append_line("stair-anim")
	for i in frames.size():
		stair_div.text = frames[i]
		scroll_to_bottom()
		SoundFx.stair_step(up, i)
		await sleep(320)
	blank()
	instant_line("  ═════════════════════════", "dim")
	await sleep(600)
	clear_screen()
	nav_just_exited = true


## driveClivesBuick(fromLoc, toLoc, dopts)
func drive_clives_buick(from_loc: String, to_loc: String, dopts: Dictionary = {}) -> void:
	MusicPlayer.cue(dopts.get("title", "DRIVE"))
	var dest_label: String = dopts.get("destLabel", "BIG SMILES MAYO CORP HQ")
	var canvas_title: String = dopts.get("title", "DRIVE TO BIG SMILES MAYO CORP")
	var arrive_line: String = dopts.get("arriveLine", 'Cliveman: "There it is. Big Smiles Mayo Corp HQ."')
	var mark_start: bool = dopts.get("markAtDriveStart", true)
	if mark_start:
		GameState.at_drive_start = true
	if nav_mode:
		exit_nav_mode()
	await press_enter_to_continue()
	if ended:
		return
	await cut_fade_in(canvas_title)
	clear_screen()
	instant_line(">>>>>   NIGHT DRIVE   <<<<<", "sys")
	instant_line("  Find " + dest_label + " - follow the RED GPS route and compass dot.", "speaker")
	instant_line("  W / UP throttle   S / DOWN brake   A D / LEFT RIGHT steer", "dim")
	blank()
	cv_driving = true
	var session: Node = load("res://scripts/drive/drive_session.gd").new()
	drive_session = session
	add_child(session)
	# the canvas mounts inside the drive, which only resolves when it ENDS, so
	# lift the black a beat after launch, once it is rendering
	get_tree().create_timer(0.42).timeout.connect(func() -> void: cut_fade_out())
	var blocked_line := "\"You can't do that now.\""
	var on_save := func() -> String:
		if mark_start:
			GameState.at_drive_start = true
		return menus.call("show_save_code")
	var _result: String = await session.run(self, {
		"title": canvas_title, "destLabel": dest_label, "arriveText": arrive_line,
		"blockedText": blocked_line,
		"startHint": "  Find " + dest_label + " - follow the RED GPS route and compass dot.",
		"driveQuips": dopts.get("driveQuips", []), "hitQuips": dopts.get("hitQuips", []),
		"markAtDriveStart": mark_start,
		"onQuip": func(line: String) -> void: instant_line(line, "speaker"),
		"onArrive": func() -> void: instant_line(arrive_line, "speaker"),
		"onBlocked": func() -> void: instant_line(blocked_line, "narration"),
		"onSave": on_save,
	})
	await cut_fade_in()
	cv_driving = false
	for c in map_area.get_children():
		map_area.remove_child(c)
		c.queue_free()
	session.queue_free()
	drive_session = null
	clear_screen()
	await cut_fade_out()
	await type_line(arrive_line, "speaker")
	blank()


func toggle_fullscreen() -> void:
	SoundFx.key_click()
	var w := get_window()
	if w.mode == Window.MODE_FULLSCREEN or w.mode == Window.MODE_EXCLUSIVE_FULLSCREEN:
		w.mode = Window.MODE_WINDOWED
	else:
		w.mode = Window.MODE_FULLSCREEN


func set_movement_allowed(b: bool) -> void:
	movement_allowed = b
	can_move = b
