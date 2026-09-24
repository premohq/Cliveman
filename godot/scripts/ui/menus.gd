extends Node
## engine/menus.js: the title buttons, the settings modal, the pause menu with
## its quit confirmation, save-and-quit, and the load panel. Also the D-E-V key
## sequence that opens the debug jump menu from the title.

var t: Node
var _modal: Control = null
var _modal_kind := ""
var _dev_seq: Array[String] = []
var _was_movement := false


func setup(term: Node) -> void:
	t = term
	process_mode = Node.PROCESS_MODE_ALWAYS


func modal_open() -> bool:
	return _modal != null and is_instance_valid(_modal)


## The open modal's enabled buttons, in document order, for pad focus.
func modal_buttons() -> Array:
	var out: Array = []
	if not modal_open():
		return out
	var stack: Array = [_modal]
	while not stack.is_empty():
		var n: Node = stack.pop_front()
		if n is CssButton and (n as CssButton).is_visible_in_tree() and not (n as CssButton).disabled:
			out.append(n)
		var kids := n.get_children()
		kids.reverse()
		for k in kids:
			stack.push_front(k)
	return out


## [data-pad-back]: CLOSE, RESUME and CANCEL.
func modal_back_button() -> CssButton:
	for b in modal_buttons():
		if (b as CssButton).has_meta("pad_back"):
			return b
	return null


# ═════════════════════════════════════════════════════════════════════════════
#  title buttons
# ═════════════════════════════════════════════════════════════════════════════

## .title-btn{max-width:400px;font-size:28px;padding:14px 24px;border:2px solid;
##   border-radius:6px;letter-spacing:3px;text-shadow:0 0 6px var(--amber);
##   box-shadow:0 0 12px rgba(255,176,0,.35)}  hover: scale(1.03)
## line_h 0 is line-height:normal.
func _title_btn(text: String, accent: Color, glow_rgb: Color, basis: float, line_h: float) -> CssButton:
	var b := CssButton.new()
	b.label.font = Css.spaced("vt323", 3)
	b.label.font_size = 28
	b.label.line_height = line_h
	b.pad = Vector2(24, 14)
	b.border = 2
	b.hover_scale = 1.03
	b.fixed_width = basis
	var shadow := Color(glow_rgb.r, glow_rgb.g, glow_rgb.b, 0.35)
	b.styles = {
		"normal": Css.glow(Css.box(Color(0, 0, 0, 0), accent, 2, 6), shadow, 12),
		"hover": Css.glow(Css.box(Color(glow_rgb.r, glow_rgb.g, glow_rgb.b, 0.14 if accent == Css.AMBER else 0.12), accent, 2, 6), Color(glow_rgb.r, glow_rgb.g, glow_rgb.b, 0.7), 20),
		"active": Css.glow(Css.box(Color(glow_rgb.r, glow_rgb.g, glow_rgb.b, 0.3), accent, 2, 6), Color(glow_rgb.r, glow_rgb.g, glow_rgb.b, 0.7), 20),
		"focus": Css.glow(Css.box(Color(glow_rgb.r, glow_rgb.g, glow_rgb.b, 0.18), accent, 2, 6), Color(glow_rgb.r, glow_rgb.g, glow_rgb.b, 0.75), 22),
	}
	b.text_colors = {"normal": accent}
	b.text_glows = {"normal": [[6.0, accent]]}
	b.focus_outline = accent
	b.set_text(text)
	b.add_to_group("title_btn")
	return b


func show_title_buttons() -> String:
	t.clear_choices()
	var picked: Array = []
	_title_pending = picked

	var row := HFlowContainer.new()
	row.alignment = FlowContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("h_separation", 10)
	row.add_theme_constant_override("v_separation", 10)
	row.mouse_filter = Control.MOUSE_FILTER_PASS
	row.set_script(preload("res://scripts/ui/center_row.gd"))

	var new_btn := _title_btn("▶ " + I18n.t("START NEW GAME"), Css.GREEN, Css.GREEN, 320.0, 0.0)
	new_btn.pressed.connect(func() -> void:
		if not picked.is_empty():
			return
		SoundFx.key_click()
		t.clear_choices()
		t.instant_line("C:\\DUDLEY> " + I18n.t("NEW GAME"), "input-echo")
		t.game_started = true
		picked.append("new"))

	# .gear-btn: 64px wide, 32px glyph, green on green-dim, still an amber glow
	var gear := CssButton.new()
	gear.label.font_size = 32
	gear.label.line_height = 0.0  # normal: the Segoe UI Symbol glyph sets it
	gear.pad = Vector2(0, 10)
	gear.border = 2
	gear.fixed_width = 64
	gear.hover_scale = 1.08
	gear.hover_rotation = 30.0
	gear.styles = {
		"normal": Css.glow(Css.box(Color(0, 0, 0, 0), Css.GREEN_DIM, 2, 6), Css.rgba(255, 176, 0, 0.35), 12),
		"hover": Css.glow(Css.box(Css.rgba(51, 255, 102, 0.12), Css.GREEN, 2, 6), Css.rgba(51, 255, 102, 0.55), 20),
		"focus": Css.glow(Css.box(Css.rgba(255, 176, 0, 0.18), Css.GREEN_DIM, 2, 6), Css.rgba(255, 176, 0, 0.75), 22),
	}
	gear.text_colors = {"normal": Css.GREEN, "hover": Css.GREEN_BRIGHT}
	gear.text_glows = {"normal": [[6.0, Css.AMBER]]}
	gear.focus_outline = Css.AMBER
	gear.set_text("⚙")
	gear.add_to_group("title_btn")
	gear.pressed.connect(func() -> void:
		SoundFx.key_click()
		show_settings_modal())

	var load_btn := _title_btn("📂 " + I18n.t("LOAD SAVE STATE"), Css.AMBER, Css.AMBER, 320.0, 0.0)
	load_btn.max_text_width = 268.0
	load_btn.pressed.connect(func() -> void:
		if not picked.is_empty():
			return
		SoundFx.key_click()
		t.clear_choices()
		t.instant_line("C:\\DUDLEY> " + I18n.t("LOAD SAVE"), "input-echo")
		picked.append("load"))

	row.add_child(new_btn)
	row.add_child(gear)
	row.add_child(load_btn)
	t.choice_flow.add_child(row)
	t.choices_active = true
	t.scroll_to_bottom()
	if t.is_autoplay():
		await get_tree().create_timer(0.3).timeout
		new_btn.pressed.emit()

	while picked.is_empty():
		await get_tree().process_frame
	_title_pending = null
	return picked[0]


func _input(event: InputEvent) -> void:
	if not (event is InputEventKey) or not event.pressed or event.echo:
		return
	var k: InputEventKey = event
	if _modal and is_instance_valid(_modal) and k.keycode == KEY_ESCAPE:
		get_viewport().set_input_as_handled()
		_close_modal(false)
		return
	# D -> E -> V opens the debug jump menu, via window._titleResolve('__debug__')
	if k.unicode > 0:
		_dev_seq.append(String.chr(k.unicode).to_lower())
		if _dev_seq.size() > 3:
			_dev_seq.remove_at(0)
		if "".join(_dev_seq) == "dev":
			_dev_seq.clear()
			if _title_pending != null and (_title_pending as Array).is_empty():
				_title_pending.append("__debug__")


## window._titleResolve: the pick list of the title screen currently waiting.
var _title_pending: Variant = null


# ═════════════════════════════════════════════════════════════════════════════
#  modal scaffolding
# ═════════════════════════════════════════════════════════════════════════════

func _overlay(bg_alpha: float) -> Control:
	var overlay := ColorRect.new()
	overlay.color = Color(0, 0, 0, bg_alpha)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.size = t.size
	t.modal_layer.add_child(overlay)
	return overlay


## The amber-bordered modal box shared by settings and pause.
func _box(max_w: float) -> VBoxContainer:
	# box-shadow:0 0 30px rgba(255,176,0,.5), inset 0 0 20px rgba(6,43,16,.6)
	var panel := PanelContainer.new()
	var sb := Css.box(Css.BG, Css.AMBER, 2, 0, 32, 28)
	Css.glow(sb, Css.rgba(255, 176, 0, 0.5), 30)
	panel.add_theme_stylebox_override("panel", sb)
	panel.draw.connect(func() -> void:
		var r := Rect2(Vector2.ZERO, panel.size)
		Css.draw_shadows(panel, r, sb)
		Css.draw_inset(panel, r, Css.rgba(6, 43, 16, 0.6), 20))
	panel.custom_minimum_size = Vector2(max_w, 0)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 0)
	panel.add_child(v)
	panel.set_meta("vbox", v)
	return v


func _center(overlay: Control, box: VBoxContainer) -> void:
	var panel := box.get_parent() as Control
	overlay.add_child(panel)
	var fit := func() -> void:
		var vp: Vector2 = t.size
		overlay.size = vp
		var w: float = minf(panel.custom_minimum_size.x, vp.x - 40.0)
		panel.size = Vector2(w, 0)
		var h := panel.get_combined_minimum_size().y
		panel.size = Vector2(w, h)
		panel.position = (vp - panel.size) * 0.5
	fit.call()
	panel.minimum_size_changed.connect(fit)
	overlay.resized.connect(fit)
	get_tree().process_frame.connect(fit, CONNECT_ONE_SHOT)


func _heading(text: String) -> Control:
	var wrap := VBoxContainer.new()
	wrap.add_theme_constant_override("separation", 0)
	var h := CrtText.new()
	h.font = Css.spaced("vt323", 4)
	h.font_size = 28
	h.color = Css.AMBER
	h.glows = [[8.0, Css.AMBER]]
	h.text = text
	h.custom_minimum_size.x = 10
	wrap.add_child(h)
	var gap := Control.new()
	gap.custom_minimum_size = Vector2(0, 12)
	wrap.add_child(gap)
	var dash := Control.new()
	dash.custom_minimum_size = Vector2(0, 1)
	dash.draw.connect(func() -> void: t._draw_dashed_h(dash, 0.0, dash.size.x, 0.5, Css.GREEN_DIM))
	wrap.add_child(dash)
	var gap2 := Control.new()
	gap2.custom_minimum_size = Vector2(0, 18)
	wrap.add_child(gap2)
	return wrap


func _spacer(h: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


func _close_modal(keep_paused: bool) -> void:
	if _modal and is_instance_valid(_modal):
		_modal.queue_free()
	var kind := _modal_kind
	_modal = null
	_modal_kind = ""
	if kind == "pause" and not keep_paused:
		t.set_game_paused(false)
		if _was_movement and t.nav_mode:
			t.set_movement_allowed(true)
		if t.nav_hud:
			t.nav_hud.call("capture_mouse")


# ═════════════════════════════════════════════════════════════════════════════
#  settings
# ═════════════════════════════════════════════════════════════════════════════

func show_settings_modal() -> void:
	if modal_open():
		_close_modal(false)
	var overlay := _overlay(0.82)
	_modal = overlay
	_modal_kind = "settings"
	overlay.gui_input.connect(func(e: InputEvent) -> void:
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			_close_modal(false))
	var box := _box(480)
	box.add_child(_heading("⚙ " + I18n.t("SETTINGS")))

	var lang_label := CrtText.new()
	lang_label.font = Css.spaced("vt323", 2)
	lang_label.font_size = 18
	lang_label.color = Css.GREEN_BRIGHT
	lang_label.glows = [[4.0, Css.GREEN]]
	lang_label.align = CrtText.Align.RIGHT if I18n.is_rtl() else CrtText.Align.LEFT  # text-align:start
	lang_label.text = I18n.t("LANGUAGE") + ":"
	lang_label.custom_minimum_size.x = 10
	box.add_child(lang_label)
	box.add_child(_spacer(10))

	var langs := [
		["en", "English"], ["fr", "Français"], ["es", "Español"], ["zh", "中文"],
		["pt", "Português"], ["ru", "Русский"], ["hi", "हिन्दी"], ["ar", "العربية"],
	]
	var grid := GridContainer.new()
	grid.columns = 2
	# #settingsModal{direction:rtl}: the grid fills from the right
	grid.layout_direction = Control.LAYOUT_DIRECTION_RTL if I18n.is_rtl() else Control.LAYOUT_DIRECTION_LTR
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	for L in langs:
		var active: bool = I18n.lang == L[0]
		var b := _settings_btn(String(L[1]) + (" ✓" if active else ""), active, 20)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var code: String = L[0]
		b.pressed.connect(func() -> void:
			SoundFx.key_click()
			_close_modal(false)
			I18n.set_language(code)
			if _title_pending != null:
				t.clear_choices()
				_title_pending.append("__refresh__"))
		grid.add_child(b)
	box.add_child(grid)
	box.add_child(_spacer(22))

	var vox_label := CrtText.new()
	vox_label.font = Css.spaced("vt323", 2)
	vox_label.font_size = 18
	vox_label.color = Css.GREEN_BRIGHT
	vox_label.glows = [[4.0, Css.GREEN]]
	vox_label.align = CrtText.Align.RIGHT if I18n.is_rtl() else CrtText.Align.LEFT
	vox_label.text = I18n.t("VOICE SFX") + ":"
	vox_label.custom_minimum_size.x = 10
	box.add_child(vox_label)
	box.add_child(_spacer(10))

	var vox_holder := VBoxContainer.new()
	box.add_child(vox_holder)
	var build_vox := func() -> void:
		for c in vox_holder.get_children():
			c.queue_free()
		var on: bool = VoiceCast.supported() and VoiceCast.enabled
		var label := ""
		if not VoiceCast.supported():
			label = I18n.t("NOT SUPPORTED HERE")
		else:
			label = ("🔊 " + I18n.t("VOICE SFX: ON")) if on else ("🔇 " + I18n.t("VOICE SFX: MUTED"))
		var vb := _settings_btn(label, on, 20)
		if not VoiceCast.supported():
			vb.disabled = true
			vb.modulate.a = 0.45
		vb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		vox_holder.add_child(vb)
		vb.pressed.connect(func() -> void:
			VoiceCast.toggle()
			SoundFx.key_click()
			vox_holder.get_meta("rebuild").call())
	vox_holder.set_meta("rebuild", build_vox)
	build_vox.call()
	box.add_child(_spacer(22))

	var close := CssButton.new()
	close.label.font = Css.spaced("vt323", 2)
	close.label.font_size = 22
	close.pad = Vector2(12, 12)
	close.border = 2
	close.styles = {"normal": Css.box(Color(0, 0, 0, 0), Css.GREEN, 2, 6)}
	close.text_colors = {"normal": Css.GREEN}
	close.text_glows = {"normal": [[4.0, Css.GREEN]]}
	close.set_text(I18n.t("CLOSE"))
	close.set_meta("pad_back", true)
	close.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	close.pressed.connect(func() -> void:
		SoundFx.key_click()
		_close_modal(false))
	box.add_child(close)
	_center(overlay, box)


func _settings_btn(text: String, active: bool, size: int) -> CssButton:
	var b := CssButton.new()
	b.label.font = Css.spaced("vt323", 1)
	b.label.font_size = size
	b.pad = Vector2(12, 10)
	b.border = 2
	var col := Css.AMBER if active else Css.GREEN
	b.styles = {
		"normal": Css.box(Css.rgba(255, 176, 0, 0.2) if active else Color(0, 0, 0, 0), Css.AMBER if active else Css.GREEN_DIM, 2, 6),
		"hover": Css.box(Css.rgba(255, 176, 0, 0.2) if active else Color(0, 0, 0, 0), Css.AMBER if active else Css.GREEN, 2, 6),
	}
	b.text_colors = {"normal": col, "hover": Css.AMBER if active else Css.GREEN_BRIGHT}
	b.text_glows = {"normal": [[4.0, col]], "hover": [[4.0, Css.AMBER if active else Css.GREEN_BRIGHT]]}
	b.set_text(text)
	return b


# ═════════════════════════════════════════════════════════════════════════════
#  pause
# ═════════════════════════════════════════════════════════════════════════════

func _pm_btn(text: String, danger: bool = false) -> CssButton:
	# #pauseModal .pm-btn{border:2px solid var(--green);font-size:22px;padding:14px;
	#   border-radius:6px;letter-spacing:2px;text-shadow:0 0 4px var(--green)}
	var b := CssButton.new()
	b.label.font = Css.spaced("vt323", 2)
	b.label.font_size = 22
	b.pad = Vector2(14, 14)
	b.border = 2
	var c := Color("#cc3333") if danger else Css.GREEN
	var hc := Color("#ff4444") if danger else Css.GREEN_BRIGHT
	b.styles = {
		"normal": Css.box(Color(0, 0, 0, 0), c, 2, 6),
		"hover": Css.glow(Css.box(Css.rgba(204, 51, 51, 0.15) if danger else Css.rgba(51, 255, 102, 0.1), hc, 2, 6),
			Css.rgba(255, 68, 68, 0.4) if danger else Css.rgba(51, 255, 102, 0.4), 12),
	}
	b.text_colors = {"normal": c, "hover": hc}
	b.text_glows = {"normal": [[4.0, c]], "hover": [[4.0, hc]]}
	b.set_text(text)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return b


func show_pause_menu() -> void:
	if modal_open() and _modal_kind == "pause":
		_close_modal(false)
		return
	_was_movement = t.movement_allowed
	var overlay := _overlay(0.85)
	_modal = overlay
	_modal_kind = "pause"
	t.set_game_paused(true)
	if _was_movement:
		t.set_movement_allowed(false)
	if t.nav_hud:
		t.nav_hud.call("release_mouse")
	VoiceCast.stop()
	overlay.gui_input.connect(func(e: InputEvent) -> void:
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			_close_modal(false))
	_build_pause_box(overlay)


func _build_pause_box(overlay: Control) -> void:
	for c in overlay.get_children():
		c.queue_free()
	var box := _box(400)
	box.add_child(_heading("☰ " + I18n.t("PAUSED")))
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 10)
	box.add_child(rows)

	var resume := _pm_btn("▶ " + I18n.t("RESUME"))
	resume.set_meta("pad_back", true)
	resume.pressed.connect(func() -> void:
		SoundFx.key_click()
		_close_modal(false))
	rows.add_child(resume)

	var mute := _pm_btn("")
	var refresh_mute := func() -> void:
		mute.set_text(("🔇 " + I18n.t("UNMUTE")) if SoundFx.is_muted() else ("🔊 " + I18n.t("MUTE")))
	refresh_mute.call()
	mute.pressed.connect(func() -> void:
		SoundFx.toggle_mute()
		SoundFx.key_click()
		refresh_mute.call())
	rows.add_child(mute)

	var voice := _pm_btn("")
	var refresh_voice := func() -> void:
		if not VoiceCast.supported():
			voice.set_text("🔕 " + I18n.t("VOICE N/A"))
			voice.disabled = true
			voice.modulate.a = 0.45
			return
		voice.set_text(("🔊 " + I18n.t("VOICE SFX: ON")) if VoiceCast.enabled else ("🔇 " + I18n.t("VOICE SFX: MUTED")))
	refresh_voice.call()
	voice.pressed.connect(func() -> void:
		VoiceCast.toggle()
		SoundFx.key_click()
		refresh_voice.call())
	rows.add_child(voice)

	var save_quit := _pm_btn("💾 " + I18n.t("SAVE & QUIT"))
	save_quit.pressed.connect(func() -> void:
		SoundFx.key_click()
		_close_modal(true)
		do_save_and_quit())
	rows.add_child(save_quit)

	var quit := _pm_btn("✕ " + I18n.t("QUIT TO TITLE"), true)
	quit.pressed.connect(func() -> void:
		SoundFx.key_click()
		_show_quit_confirm(overlay))
	rows.add_child(quit)
	_center(overlay, box)


func _show_quit_confirm(overlay: Control) -> void:
	for c in overlay.get_children():
		c.queue_free()
	var box := _box(400)
	box.add_child(_heading("⚠ " + I18n.t("QUIT TO TITLE")))
	var msg := CrtText.new()
	msg.font_size = 18
	msg.line_height = 18 * 1.4
	msg.color = Css.GREEN
	msg.glows = []
	msg.text = I18n.t("Are you sure? Unsaved progress will be lost.")
	msg.custom_minimum_size.x = 10
	box.add_child(msg)
	box.add_child(_spacer(18))
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 10)
	box.add_child(rows)
	var yes := _pm_btn(I18n.t("YES, QUIT"), true)
	yes.pressed.connect(func() -> void:
		SoundFx.key_click()
		_close_modal(true)
		do_quit_to_title())
	rows.add_child(yes)
	var cancel := _pm_btn(I18n.t("CANCEL"))
	cancel.set_meta("pad_back", true)
	cancel.pressed.connect(func() -> void:
		SoundFx.key_click()
		_close_modal(false))
	rows.add_child(cancel)
	_center(overlay, box)


## doQuitToTitle(): the browser reloads the page, so this restarts the game from
## the boot sequence with fresh state.
func do_quit_to_title() -> void:
	t.get_node("Game").call("reload")


func do_save_and_quit() -> void:
	show_save_code()
	await get_tree().create_timer(0.8, true).timeout
	do_quit_to_title()


## showSaveCode(): the browser downloads cliveman_save.clive; here the save
## goes to the game's own save folder (user://saves, see SaveStore) and the
## load screen lists it. Same confirmation box, reworded where it said
## "downloaded".
func show_save_code() -> String:
	var ok := SaveStore.write_save() != ""
	t.blank()
	var row := func(text: String) -> String:
		return "  |" + text + " ".repeat(maxi(0, 46 - text.length())) + "|\n"
	var box := "  +==============================================+\n"
	if ok:
		box += row.call("   SAVE FILE WRITTEN") \
			+ row.call("   Saved to this game's save folder.") \
			+ row.call("   Load it at the title screen to resume") \
			+ row.call("   from exactly where you are standing.")
	else:
		box += row.call("   SAVE FAILED") \
			+ row.call("   The save folder could not be written.")
	box += "  +==============================================+"
	t.instant_line(box, "savebox")
	t.blank()
	return box


# ═════════════════════════════════════════════════════════════════════════════
#  load panel
# ═════════════════════════════════════════════════════════════════════════════

## The load panel: the browser's is a file picker; here the saves in
## user://saves are listed newest first, with the picker kept for importing
## a .clive file from anywhere else (the browser build's downloads).
const LOAD_LIST_MAX := 6


func show_load_panel(flow: RefCounted) -> Variant:
	t.clear_choices()
	var result: Array = []
	var saves := SaveStore.list_saves()
	var wrap := VBoxContainer.new()
	wrap.add_theme_constant_override("separation", 0)
	wrap.set_script(preload("res://scripts/ui/full_width.gd"))
	var hint := CrtText.new()
	hint.font = Css.spaced("vt323", 1)
	hint.font_size = 16
	hint.color = Css.GREEN_DIM
	hint.glows = [[4.0, Css.GREEN], [12.0, Css.rgba(51, 255, 102, 0.45)]]
	hint.text = I18n.t("SELECT A SAVED GAME") if not saves.is_empty() else I18n.t("NO SAVED GAMES YET")
	hint.custom_minimum_size.x = 10
	wrap.add_child(hint)
	wrap.add_child(_spacer(12))
	for i in mini(saves.size(), LOAD_LIST_MAX):
		var entry: Dictionary = saves[i]
		var sb: CssButton = t.make_choice_button(SaveStore.label(entry))
		sb.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		sb.custom_minimum_size.x = 400
		sb.pressed.connect(func() -> void:
			if not result.is_empty():
				return
			SoundFx.key_click()
			_read_save(entry["path"], result, flow))
		wrap.add_child(sb)
		wrap.add_child(_spacer(8))
	wrap.add_child(_spacer(4))
	var browse := _title_btn("📂 " + I18n.t("IMPORT A .CLIVE FILE"), Css.AMBER, Css.AMBER, -1.0, 0.0)
	browse.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	browse.custom_minimum_size.x = 400
	browse.fixed_width = 400
	wrap.add_child(browse)
	wrap.add_child(_spacer(10))
	var back: CssButton = t.make_choice_button(I18n.t("BACK"))
	back.min_size = Vector2(120, 44)
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	wrap.add_child(back)
	back.pressed.connect(func() -> void:
		if not result.is_empty():
			return
		SoundFx.key_click()
		t.clear_choices()
		t.instant_line("C:\\DUDLEY> " + I18n.t("BACK"), "input-echo")
		result.append(null))
	var on_file := func(status: bool, files: PackedStringArray, _idx: int) -> void:
		if not status or files.is_empty() or not result.is_empty():
			return
		_read_save(files[0], result, flow)
	browse.pressed.connect(func() -> void:
		SoundFx.key_click()
		DisplayServer.file_dialog_show("Import", OS.get_system_dir(OS.SYSTEM_DIR_DOWNLOADS), "", false,
			DisplayServer.FILE_DIALOG_MODE_OPEN_FILE, PackedStringArray(["*.clive"]), on_file))
	t.choice_flow.add_child(wrap)
	t.choices_active = true
	while result.is_empty():
		await get_tree().process_frame
	return result[0]


func _read_save(path: String, result: Array, flow: RefCounted) -> void:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		t.clear_choices()
		t.instant_line("  " + I18n.t("Could not read that file. Try again."), "err")
		result.append(null)
		return
	var raw := f.get_as_text()
	var save_data: Variant = GameState.parse_save_text(raw)
	if save_data == null:
		t.clear_choices()
		t.instant_line("  " + I18n.t("Error reading save file: ") + I18n.t("bad format"), "err")
		result.append(null)
		return
	var dec := GameState.decode_save(save_data)
	if dec.is_empty():
		t.clear_choices()
		t.instant_line("  " + I18n.t("Invalid or corrupted save file."), "err")
		result.append(null)
		return
	t.clear_choices()
	var cp_text := I18n.t("CHECKPOINT") + ": " + str(dec["cp"]) + " - " + I18n.t("Loading your position...")
	var accepted := "  +==============================================+\n" \
		+ TitleFlow._box_row(I18n.t("SAVE FILE ACCEPTED")) \
		+ TitleFlow._box_row(cp_text) \
		+ "  +==============================================+"
	t.instant_line(accepted, "savebox")
	t.blank()
	await get_tree().create_timer(1.5, true).timeout
	result.append(save_data)


# ═════════════════════════════════════════════════════════════════════════════
#  easter egg
# ═════════════════════════════════════════════════════════════════════════════

func easter_egg() -> void:
	t.get_node("Game").call("easter_egg")
