class_name Compass
extends Control
## CMCOMPASS from engine/navigation-hud.js: the frameless FO4-style strip that
## nav mode and the night drive share. Cardinals are amber letters, the
## intercardinals taller ticks, minor ticks every 15 degrees, and a caret at the
## top centre marks the facing. Markers (the drive's destination) ride the strip
## as coloured dots, clamped to the edge and dimmed when off-strip.
##
## .cm-compass{position:absolute;top:6px;left:50%;transform:translateX(-50%);
##   width:200px;height:16px;opacity:0.88}
## The edge fade is shaders/compass_fade.gdshader.

const CSS_W := 200.0
const CSS_H := 16.0
const FOV := 120.0

const CARD := [
	[0.0, "N", true], [45.0, "NE", false], [90.0, "E", true], [135.0, "SE", false],
	[180.0, "S", true], [225.0, "SW", false], [270.0, "W", true], [315.0, "NW", false],
]

var _heading_deg := 0.0
var _markers: Array = []      ## [{bearing: float, color: Color}]
var _font: Font = null


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	modulate.a = 0.88
	custom_minimum_size = Vector2(CSS_W, CSS_H)
	size = custom_minimum_size
	var fade := ShaderMaterial.new()
	fade.shader = preload("res://shaders/compass_fade.gdshader")
	material = fade
	draw.connect(_draw_strip)


## CMCOMPASS.update(headingDeg, markers)
func update_compass(heading_deg: float, markers: Array = []) -> void:
	heading_deg = fposmod(heading_deg, 360.0)
	if is_equal_approx(heading_deg, _heading_deg) and markers.size() == _markers.size() and markers.is_empty():
		return
	_heading_deg = heading_deg
	_markers = markers
	queue_redraw()


## CMCOMPASS.navUpdate(angleRad): the raycaster angle, 0 = east, 0.5pi = south.
func nav_update(angle_rad: float) -> void:
	update_compass(rad_to_deg(angle_rad) + 90.0)


## signed shortest angular difference a-b in (-180,180]
static func adiff(a: float, b: float) -> float:
	var d := fmod(a - b, 360.0)
	if d > 180.0:
		d -= 360.0
	if d <= -180.0:
		d += 360.0
	return d


## bold 10px "Share Tech Mono": the face has no bold, so Chrome emboldens it.
func _strip_font() -> Font:
	if _font == null:
		var fv := FontVariation.new()
		fv.base_font = Css.font("mono")
		fv.variation_embolden = 0.6
		_font = fv
	return _font


func _draw_strip() -> void:
	var half := FOV / 2.0
	var ppd := CSS_W / FOV
	var hd := _heading_deg
	var d := 0
	while d < 360:
		var off := adiff(d, hd)
		if absf(off) <= half and d % 45 != 0:
			var px := CSS_W / 2.0 + off * ppd
			aa_vline(self, px, CSS_H * 0.68, CSS_H * 0.92, 1.0, Color(140 / 255.0, 1.0, 170 / 255.0, 0.32))
		d += 15
	var font := _strip_font()
	var amber := Color("#ffb000")
	for cd in CARD:
		var off2 := adiff(cd[0], hd)
		if absf(off2) > half + 6.0:
			continue
		var px2 := CSS_W / 2.0 + off2 * ppd
		if cd[2]:
			# fillText, textAlign centre, textBaseline middle, shadowBlur 3
			var ch: String = cd[1]
			var sw := font.get_string_size(ch, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
			var base_y := CSS_H * 0.42 + (font.get_ascent(10) - font.get_descent(10)) * 0.5
			var at := Vector2(px2 - sw * 0.5, base_y)
			for ring in CrtText._rings(3.0, 10.0, amber):
				draw_string_outline(font, at, ch, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, ring[0], Color(amber, ring[1]))
			draw_string(font, at, ch, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, amber)
			aa_vline(self, px2, CSS_H * 0.70, CSS_H * 0.94, 1.5, Color(1, 176 / 255.0, 0, 0.7))
		else:
			aa_vline(self, px2, CSS_H * 0.52, CSS_H * 0.92, 1.0, Color(150 / 255.0, 230 / 255.0, 170 / 255.0, 0.55))
	# markers: a dot at their bearing, clamped to the strip and dimmed off-screen
	for mk in _markers:
		var moff: float = adiff(mk["bearing"], hd)
		var clamped := false
		if moff > half:
			moff = half
			clamped = true
		elif moff < -half:
			moff = -half
			clamped = true
		var mx := clampf(CSS_W / 2.0 + moff * ppd, 4.0, CSS_W - 4.0)
		var col: Color = mk.get("color", Color("#ff2a1a"))
		col.a = 0.55 if clamped else 1.0
		# a 2.6px dot with a 4px canvas shadow in its own colour
		for ring in CrtText._rings(4.0, 10.0, col):
			draw_circle(Vector2(mx, CSS_H * 0.80), 2.6 + float(ring[0]) * 0.25,
				Color(col, ring[1] * col.a), true, -1.0, true)
		draw_circle(Vector2(mx, CSS_H * 0.80), 2.6, col, true, -1.0, true)
	# centre caret: a small downward triangle at the top
	aa_fill_poly(self, PackedVector2Array([Vector2(CSS_W / 2 - 3, 0.5), Vector2(CSS_W / 2 + 3, 0.5), Vector2(CSS_W / 2, 4.5)]),
		Color(234 / 255.0, 1.0, 240 / 255.0, 0.95))


## A canvas stroke of a vertical line with butt caps, at the pixel coverage a
## 2D canvas gives it: a 1px line on a whole-number x covers two columns by
## half each.
static func aa_vline(ci: CanvasItem, x: float, y0: float, y1: float, w: float, c: Color) -> void:
	var l := x - w * 0.5
	var r := x + w * 0.5
	for px in range(int(floor(l)), int(ceil(r))):
		var cx := minf(r, px + 1.0) - maxf(l, float(px))
		if cx <= 0.0:
			continue
		for py in range(int(floor(y0)), int(ceil(y1))):
			var cy := minf(y1, py + 1.0) - maxf(y0, float(py))
			if cy > 0.0:
				ci.draw_rect(Rect2(px, py, 1, 1), Color(c, c.a * cx * cy))


## Fill a small polygon with exact per-pixel area coverage, as a canvas does.
static func aa_fill_poly(ci: CanvasItem, poly: PackedVector2Array, c: Color) -> void:
	var box := Rect2(poly[0], Vector2.ZERO)
	for p in poly:
		box = box.expand(p)
	for py in range(int(floor(box.position.y)), int(ceil(box.end.y))):
		for px in range(int(floor(box.position.x)), int(ceil(box.end.x))):
			var cell := PackedVector2Array([Vector2(px, py), Vector2(px + 1, py), Vector2(px + 1, py + 1), Vector2(px, py + 1)])
			var area := 0.0
			for piece in Geometry2D.intersect_polygons(poly, cell):
				area += absf(_poly_area(piece))
			if area > 0.001:
				ci.draw_rect(Rect2(px, py, 1, 1), Color(c, c.a * minf(area, 1.0)))


static func _poly_area(p: PackedVector2Array) -> float:
	var s := 0.0
	for i in p.size():
		var a := p[i]
		var b := p[(i + 1) % p.size()]
		s += a.x * b.y - b.x * a.y
	return s * 0.5
