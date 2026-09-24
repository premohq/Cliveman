class_name CssButton
extends BaseButton
## A <button> styled by the stylesheet: a box with a border, radius, padding and
## glow, and a label that can carry text-shadow. Godot's Button draws its own
## text with no glow, so the label is a CrtText child instead.
##
## States follow the CSS pseudo-classes: normal, :hover, :active and the
## gamepad `.pad-focus` class. Sizes follow the box model: the minimum size is
## the label plus padding plus border, never less than min-width / min-height.

var label: CrtText
var styles := {}          ## "normal" | "hover" | "active" | "focus" -> StyleBoxFlat
var text_colors := {}     ## same keys -> Color
var text_glows := {}      ## same keys -> Array of [blur, Color]
var pad := Vector2(16, 10)
var border := 2.0
var min_size := Vector2(0, 0)
var hover_scale := 1.0
var active_scale := 1.0
var active_offset := Vector2.ZERO
var hover_rotation := 0.0
var fixed_width := -1.0   ## flex-basis style width when set
var max_text_width := -1.0 ## wrap the label past this width (a max-width on the button)
## .pad-focus{outline:2px solid;outline-offset:2px}; transparent for none.
## Blink draws the outline round the border radius.
var focus_outline := Color(0, 0, 0, 0)
var pad_focus := false:
	set(v):
		pad_focus = v
		_apply_state()

var _hovered := false
var _anim_scale := 1.0


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	label = CrtText.new()
	label.wrap = false
	add_child(label)
	mouse_entered.connect(func() -> void:
		_hovered = true
		_apply_state())
	mouse_exited.connect(func() -> void:
		_hovered = false
		_apply_state())
	button_down.connect(_apply_state)
	button_up.connect(_apply_state)
	label.minimum_size_changed.connect(func() -> void:
		update_minimum_size()
		_layout_label())


func _ready() -> void:
	_apply_state()


func set_text(t: String) -> void:
	label.text = t
	update_minimum_size()
	_layout_label()
	_apply_state()


func _state() -> String:
	if button_pressed or (is_pressed() and _hovered):
		return "active" if styles.has("active") else "hover"
	if pad_focus and styles.has("focus"):
		return "focus"
	if _hovered and styles.has("hover"):
		return "hover"
	return "normal"


func _apply_state() -> void:
	var s := _state()
	label.color = text_colors.get(s, text_colors.get("normal", Css.AMBER))
	label.glows = text_glows.get(s, text_glows.get("normal", []))
	var target := 1.0
	if s == "hover" and hover_scale != 1.0:
		target = hover_scale
	if s == "focus":
		target = 1.05
	pivot_offset = size * 0.5
	scale = Vector2(target, target)
	rotation = deg_to_rad(hover_rotation) if s == "hover" else 0.0
	queue_redraw()


func _get_minimum_size() -> Vector2:
	var tw := label.content_width() if max_text_width < 0.0 else minf(label.content_width(), max_text_width)
	var th := label.custom_minimum_size.y
	var w := tw + pad.x * 2.0 + border * 2.0
	var h := th + pad.y * 2.0 + border * 2.0
	if fixed_width > 0.0:
		w = fixed_width
	return Vector2(maxf(w, min_size.x), maxf(h, min_size.y))


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_layout_label()
		pivot_offset = size * 0.5
	elif what == NOTIFICATION_DRAW:
		var st := _state()
		var sb: StyleBox = styles.get(st, styles.get("normal"))
		Css.draw_box(self, Rect2(Vector2.ZERO, size), sb)
		if st == "focus" and focus_outline.a > 0.0:
			var ol := StyleBoxFlat.new()
			ol.draw_center = false
			ol.border_color = focus_outline
			ol.set_border_width_all(2)
			var r := 0
			if sb is StyleBoxFlat:
				r = (sb as StyleBoxFlat).corner_radius_top_left
			ol.set_corner_radius_all(r + 4)
			ol.anti_aliasing = true
			draw_style_box(ol, Rect2(Vector2.ZERO, size).grow(4.0))


func _layout_label() -> void:
	if label == null:
		return
	var inner_w := size.x - pad.x * 2.0 - border * 2.0
	label.wrap = max_text_width > 0.0 or fixed_width > 0.0
	label.size = Vector2(maxf(0.0, inner_w), label.custom_minimum_size.y)
	var lh := label.custom_minimum_size.y
	label.position = Vector2(pad.x + border, (size.y - lh) * 0.5)
