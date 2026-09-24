class_name TitleFlow
extends RefCounted
## story/title.js: the title screen, the load screen and the intro.

const LOGO_FRAMES := [
	"res://assets/images/logo_title_0.png",
	"res://assets/images/logo_title_25.png",
	"res://assets/images/logo_title_50.png",
]
const LOGO_PAD := 80.0          ## transparent margin baked round the rendered logo
const LOGO_W := 540.0

var t: Node
var menus: Node
var _flyover: Node3D = null


func _init(terminal: Node, menu_node: Node) -> void:
	t = terminal
	menus = menu_node


## drawTitleArt(): the wordmark in #screen, then the version line.
func draw_title_art() -> void:
	var sub := I18n.t("detective adventure")
	var holder: Control = preload("res://scripts/ui/title_logo.gd").new()
	holder.mouse_filter = Control.MOUSE_FILTER_STOP
	holder.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	holder.call("setup", t)
	t.append_node(holder, 0.0)
	if sub != "" and sub.to_lower() != "detective adventure":
		# .snatcher-sub{font-family:'Share Tech Mono';font-size:13px;color:#998866;
		#   letter-spacing:6px;text-transform:uppercase;margin-top:2px}
		var s := CrtText.new()
		s.font = Css.spaced("mono", 6)
		s.font_size = 13
		s.color = Color("#998866")
		s.glows = []
		s.text = sub.to_upper()
		s.set_meta("mt", 2.0)
		t.append_node(s, 0.0)
	t.instant_line("                                                 ver " + GameState.VERSION, "version")


## titleScreen()
func title_screen() -> Variant:
	while true:
		t.clear_screen()
		t.clear_choices()
		t.nav_mode = false
		t.can_move = false
		t.blank()
		draw_title_art()
		t.blank()
		start_flyover()
		t.play_music("title")
		t.blank()
		t.blank()
		var pc: CrtText = t.append_line("press-continue")
		var kbd := "  >>  SELECT AN OPTION TO BEGIN  <<"
		var pad := "  >>  PRESS A BUTTON TO BEGIN  <<"
		pc.set_meta("kbd_text", kbd)
		pc.set_meta("pad_text", pad)
		pc.text = I18n.t(pad if Pad.connected else kbd)
		t.blank()
		var choice: String = await menus.show_title_buttons()
		if choice == "__refresh__":
			continue
		if choice == "__debug__":
			await t.get_node("Game").debug_menu()
			continue
		t.stop_music()
		if choice == "new":
			return "new"
		var code: Variant = await load_screen()
		if code != null:
			return code
	return null


func start_flyover() -> void:
	if _flyover != null and is_instance_valid(_flyover):
		return
	_flyover = preload("res://scenes/TitleFlyover.tscn").instantiate()
	t.add_child(_flyover)
	t.move_child(_flyover, 0)
	t.bg.visible = false
	t.flyover_vignette.visible = true


func stop_flyover() -> void:
	if _flyover != null and is_instance_valid(_flyover):
		_flyover.queue_free()
	_flyover = null
	t.bg.visible = true
	t.flyover_vignette.visible = false


static func _box_row(text: String) -> String:
	text = "   " + text
	if text.length() > 46:
		text = text.substr(0, 46)
	return "  |" + text + " ".repeat(46 - text.length()) + "|\n"


## loadScreen(): pick a saved game (SaveStore) and decode it.
func load_screen() -> Variant:
	t.clear_screen()
	t.blank()
	draw_title_art()
	t.blank()
	var box := "  +==============================================+\n" \
		+ _box_row(I18n.t("LOAD SAVE FILE")) \
		+ _box_row(I18n.t("Choose a saved game to load.")) \
		+ "  +==============================================+"
	t.instant_line(box, "savebox")
	t.blank()
	return await menus.show_load_panel(self)


## intro()
func intro() -> void:
	t.clear_screen()
	t.art.set_raw(load("res://assets/images/logo_scene.png"))
	t.blank()
	await t.sleep(500)
	await t.type_line("Game Starting...", "sys")
	await t.sleep(1500)
	t.blank(2)
