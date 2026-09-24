extends Control
## The title wordmark in #screen: `.logo-canvas` with @keyframes logoPulse.
##
## The glow is a chained CSS drop-shadow that Godot cannot draw, so the logo was
## rendered by Chrome at three points of the pulse (tools/render_ui_art.js) and
## the frames are cross-faded here along the same 3.4 s ease-in-out cycle.
## Five clicks inside 2.5 s of each other run the crew credits.

const W := 540.0
const PAD := 80.0

var _frames: Array[Texture2D] = []
var _t := 0.0
var _clicks := 0
var _reset_at := 0
var _term: Node = null


func setup(term: Node) -> void:
	_term = term
	for p in ["res://assets/images/logo_title_0.png", "res://assets/images/logo_title_25.png", "res://assets/images/logo_title_50.png"]:
		_frames.append(load(p))
	custom_minimum_size = Vector2(0, W * 607.0 / 1597.0 + 2.0)
	set_meta("mt", 2.0)
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR


func _process(delta: float) -> void:
	_t = fmod(_t + delta, 3.4)
	queue_redraw()


func _draw() -> void:
	if _frames.is_empty():
		return
	var p := _t / 3.4
	var half := p * 2.0 if p < 0.5 else (1.0 - p) * 2.0
	# ease-in-out: cubic-bezier(.42,0,.58,1)
	var e: float = _term.call("_bezier", half, 0.42, 0.0, 0.58, 1.0) if _term else half
	var tex_size := Vector2(_frames[0].get_width(), _frames[0].get_height())
	var logo_w := minf(W, size.x * 0.92)
	var scale := logo_w / W
	var draw_size := tex_size * scale
	var origin := Vector2((size.x - logo_w) * 0.5 - PAD * scale, 2.0 - PAD * scale)
	var a := 0
	var f := e * 2.0
	if f >= 1.0:
		a = 1
		f -= 1.0
	draw_texture_rect(_frames[a], Rect2(origin, draw_size), false, Color(1, 1, 1, 1.0 - f))
	draw_texture_rect(_frames[mini(a + 1, 2)], Rect2(origin, draw_size), false, Color(1, 1, 1, f))


func _gui_input(event: InputEvent) -> void:
	var mb := event as InputEventMouseButton
	if mb == null or not mb.pressed or mb.button_index != MOUSE_BUTTON_LEFT:
		return
	var logo_w := minf(W, size.x * 0.92)
	var r := Rect2(Vector2((size.x - logo_w) * 0.5, 2.0), Vector2(logo_w, logo_w * 607.0 / 1597.0))
	if not r.has_point(mb.position):
		return
	accept_event()
	_clicks += 1
	SoundFx.key_click()
	_reset_at = Time.get_ticks_msec() + 2500
	if _clicks >= 5:
		_clicks = 0
		if _term and _term.menus:
			_term.menus.call("easter_egg")


func _notification(what: int) -> void:
	if what == NOTIFICATION_INTERNAL_PROCESS:
		pass
	if _clicks > 0 and Time.get_ticks_msec() > _reset_at:
		_clicks = 0
