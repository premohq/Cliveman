class_name PadGlyph
extends Control
## One controller button badge from engine/controls-ui.js: xb() and pb() spans
## (.xbtn / .psbtn) and the xdpadSvg() d-pad. The family is read from Pad when
## the glyph is made, so rows are rebuilt when the controller changes.
##
## .xbtn{display:inline-flex;width:20px;height:20px;border-radius:50%;
##   font-size:11px;font-weight:bold;font-family:'Share Tech Mono';margin:0 2px;
##   border:1.5px solid}  .psbtn: the same with font-size:14px
## Blink snaps the 1.5px border to whole device pixels, so it draws 1px.

## css class -> [width, radius (-1 round), background, border, text colour, font px]
const STYLES := {
	"xbtn-a": [20.0, -1.0, "#1a7a1a", "#33cc33", "#ffffff", 11],
	"xbtn-b": [20.0, -1.0, "#7a1a1a", "#cc3333", "#ffffff", 11],
	"xbtn-x": [20.0, -1.0, "#1a1a7a", "#3366cc", "#ffffff", 11],
	"xbtn-y": [20.0, -1.0, "#7a6a00", "#ccaa00", "#ffffff", 11],
	"xbtn-lb": [24.0, 4.0, "#2a2a2a", "#888888", "#cccccc", 10],
	"xbtn-rb": [24.0, 4.0, "#2a2a2a", "#888888", "#cccccc", 10],
	"xbtn-back": [28.0, 3.0, "#1a1a1a", "#666666", "#aaaaaa", 10],
	"psbtn-cross": [20.0, -1.0, "#1a1a2a", "#4466aa", "#66aaff", 14],
	"psbtn-circle": [20.0, -1.0, "#1a1a2a", "#4466aa", "#ff6666", 14],
	"psbtn-square": [20.0, -1.0, "#1a1a2a", "#4466aa", "#ff88dd", 14],
	"psbtn-triangle": [20.0, -1.0, "#1a1a2a", "#4466aa", "#66ff99", 14],
	"psbtn-l1": [24.0, 4.0, "#1a1a2a", "#666666", "#cccccc", 10],
	"psbtn-r1": [24.0, 4.0, "#1a1a2a", "#666666", "#cccccc", 10],
	"psbtn-share": [34.0, 3.0, "#0a0a1a", "#555555", "#aaaaaa", 9],
}

var cls := ""
var text := ""
var is_dpad := false
var _line := TextLine.new()


## btnConfirm(), btnCheck(), ... by action name; "dpad" is xdpadSvg().
static func make(action: String) -> PadGlyph:
	var ps: bool = Pad.pad_type == "ps"
	var g := PadGlyph.new()
	var pick := {
		"confirm": [["xbtn-a", "A"], ["psbtn-cross", "✕"]],
		"check": [["xbtn-x", "X"], ["psbtn-square", "□"]],
		"inv": [["xbtn-y", "Y"], ["psbtn-triangle", "△"]],
		"save": [["xbtn-back", "SEL"], ["psbtn-share", "SHR"]],
		"l": [["xbtn-lb", "LB"], ["psbtn-l1", "L1"]],
		"r": [["xbtn-rb", "RB"], ["psbtn-r1", "R1"]],
		# the drive's legend (cvControlsHTML)
		"rt": [["xbtn-rb", "RT"], ["psbtn-r1", "R2"]],
		"lt": [["xbtn-rb", "LT"], ["psbtn-l1", "L2"]],
		"start": [["xbtn-back", "☰"], ["psbtn-share", "☰"]],
		"handbrake": [["xbtn-b", "B"], ["psbtn-circle", "○"]],
	}
	if action == "dpad":
		g.is_dpad = true
		g.custom_minimum_size = Vector2(16, 16)
	else:
		var e: Array = pick[action][1 if ps else 0]
		g._badge(e[0], e[1])
	return g


func _badge(c: String, label: String) -> void:
	cls = c
	text = label
	var st: Array = STYLES[c]
	custom_minimum_size = Vector2(st[0], 20)
	# font-weight:bold on a face with no bold cut: Blink emboldens it
	var f := FontVariation.new()
	f.base_font = Css.font("mono")
	f.variation_embolden = 0.6
	_line.add_string(label, f, int(st[5]))


## margin:0 2px on both kinds
func outer_width() -> float:
	return custom_minimum_size.x + 4.0


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _draw() -> void:
	if is_dpad:
		_draw_dpad()
		return
	var st: Array = STYLES[cls]
	var w: float = st[0]
	var rad: float = st[1]
	var bg := Color(st[2])
	var bd := Color(st[3])
	if rad < 0.0:
		var c := Vector2(w * 0.5, 10.0)
		draw_circle(c, 10.0, bd, true, -1.0, true)
		draw_circle(c, 9.0, bg, true, -1.0, true)
	else:
		var sb := StyleBoxFlat.new()
		sb.anti_aliasing = true
		sb.bg_color = bd
		sb.set_corner_radius_all(int(rad))
		draw_style_box(sb, Rect2(0, 0, w, 20))
		var sb2 := StyleBoxFlat.new()
		sb2.anti_aliasing = true
		sb2.bg_color = bg
		sb2.set_corner_radius_all(int(maxf(0.0, rad - 1.0)))
		draw_style_box(sb2, Rect2(1.0, 1.0, w - 2.0, 18.0))
	# centred both ways, as inline-flex with justify/align centre
	var sz := _line.get_size()
	var asc := _line.get_line_ascent()
	var desc := _line.get_line_descent()
	var y := (20.0 - (asc + desc)) * 0.5 + asc
	_line.draw(get_canvas_item(), Vector2((w - sz.x) * 0.5, y - asc), Color(st[4]))


## xdpadSvg(): viewBox 0 0 20 20 drawn at 16px.
func _draw_dpad() -> void:
	var k := 16.0 / 20.0
	var r := func(x: float, y: float, w: float, h: float, c: String) -> void:
		draw_rect(Rect2(x * k, y * k, w * k, h * k), Color(c))
	for p in [[7, 0], [7, 14], [0, 7], [14, 7]]:
		var sb := StyleBoxFlat.new()
		sb.anti_aliasing = true
		sb.bg_color = Color("#555555")
		sb.set_corner_radius_all(1)
		draw_style_box(sb, Rect2(p[0] * k, p[1] * k, 6 * k, 6 * k))
	r.call(7, 7, 6, 6, "#444444")
	var tri := func(pts: Array) -> void:
		var poly := PackedVector2Array()
		for q in pts:
			poly.append(Vector2(q[0], q[1]) * k)
		draw_colored_polygon(poly, Color("#cccccc"))
	tri.call([[10, 1], [9, 3], [11, 3]])
	tri.call([[10, 19], [9, 17], [11, 17]])
	tri.call([[1, 10], [3, 9], [3, 11]])
	tri.call([[19, 10], [17, 9], [17, 11]])
