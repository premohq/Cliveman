class_name PadToast
extends Control
## #padToast: the pill at the top of the screen that says a controller
## connected, took over, or handed back to the keyboard and mouse.
##
## #padToast{position:fixed;top:18px;left:50%;transform:translateX(-50%);
##   background:rgba(2,10,4,0.92);border:2px solid var(--green);border-radius:8px;
##   padding:10px 22px;font-family:'VT323';font-size:20px;color:var(--green);
##   text-shadow:0 0 6px var(--green);box-shadow:0 0 18px rgba(51,255,102,0.45);
##   letter-spacing:2px;white-space:nowrap;transition:opacity 0.5s ease}
## showPadToast(): .show at once, .fade after 2 s, gone at 2.6 s.

var _spans: Array[CrtText] = []
var _margins: Array = []    ## [left, right] per span
var _t := -1.0


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	visible = false


## parts: [text, colour, font px, margin-left, margin-right] per <span>.
func show_parts(parts: Array) -> void:
	for s in _spans:
		remove_child(s)
		s.queue_free()
	_spans.clear()
	_margins.clear()
	for p in parts:
		var c := CrtText.new()
		c.font = Css.spaced("vt323", 2)
		c.font_size = int(p[2])
		c.color = p[1]
		c.glows = [[6.0, Css.GREEN]]
		c.wrap = false
		c.align = CrtText.Align.LEFT
		c.text = p[0]
		add_child(c)
		_spans.append(c)
		_margins.append([float(p[3]), float(p[4])])
	_t = 0.0
	modulate.a = 1.0
	visible = true
	_layout()


func _process(delta: float) -> void:
	if _t < 0.0:
		return
	_t += delta
	if _t >= 2.6:
		_t = -1.0
		visible = false
		return
	if _t >= 2.0:
		# transition:opacity 0.5s ease
		modulate.a = 1.0 - _ease((_t - 2.0) / 0.5)
	_layout()


static func _ease(x: float) -> float:
	# cubic-bezier(0.25, 0.1, 0.25, 1), the `ease` keyword
	var lo := 0.0
	var hi := 1.0
	var u := x
	for i in 20:
		var cx := 3.0 * (1.0 - u) * (1.0 - u) * u * 0.25 + 3.0 * (1.0 - u) * u * u * 0.25 + u * u * u
		if cx < x:
			lo = u
		else:
			hi = u
		u = (lo + hi) * 0.5
	return 3.0 * (1.0 - u) * (1.0 - u) * u * 0.1 + 3.0 * (1.0 - u) * u * u + u * u * u


func _layout() -> void:
	if _spans.is_empty() or get_parent() == null:
		return
	# one line box: spans sit on a shared baseline
	var asc := 0.0
	var desc := 0.0
	var w := 0.0
	for i in _spans.size():
		var s := _spans[i]
		var b := s._line_baseline(0)
		asc = maxf(asc, b)
		desc = maxf(desc, s.text_height() - b)
		w += _margins[i][0] + s.content_width() + _margins[i][1]
	var inner := Vector2(w, asc + desc)
	var box := inner + Vector2(22.0 * 2.0 + 4.0, 10.0 * 2.0 + 4.0)
	var vp := (get_parent() as Control).size
	size = box
	position = Vector2(round((vp.x - box.x) * 0.5), 18.0)
	var x := 2.0 + 22.0
	for i in _spans.size():
		var s := _spans[i]
		x += _margins[i][0]
		var cw := s.content_width()
		s.size = Vector2(cw + 1.0, s.text_height())
		s.position = Vector2(x, 2.0 + 10.0 + asc - s._line_baseline(0))
		x += cw + _margins[i][1]
	queue_redraw()


func _draw() -> void:
	var sb := Css.glow(Css.box(Css.rgba(2, 10, 4, 0.92), Css.GREEN, 2, 8), Css.rgba(51, 255, 102, 0.45), 18)
	Css.draw_box(self, Rect2(Vector2.ZERO, size), sb)
