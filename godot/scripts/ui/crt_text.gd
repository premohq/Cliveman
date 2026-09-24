class_name CrtText
extends Control
## One run of terminal text: the equivalent of a `.line` div's text.
##
## Lays text out the way Chrome does for the rules this game uses: a fixed line
## box (`line-height`), `text-align:center` per wrapped line, `white-space:
## pre-wrap` or `pre`, `letter-spacing`, and stacked `text-shadow` glows. A
## Label cannot do the glow or the exact line box, so this draws text itself.
##
## Each source line (split on "\n") is shaped as its own paragraph, so blank
## lines keep their line box the way pre-wrap keeps them.
##
## Height follows width, like a block element. The minimum size is recomputed
## whenever the width changes, and a container re-lays out on the next pass.

enum Align { CENTER, LEFT, RIGHT, BLOCK }  ## BLOCK: inline-block centred, lines left-aligned

var text := "":
	set(v):
		if v == text:
			return
		text = v
		_dirty = true
		_refresh()
var font: Font = null:
	set(v):
		font = v
		_dirty = true
		_refresh()
var font_size := 22:
	set(v):
		font_size = v
		_dirty = true
		_refresh()
var color := Css.GREEN:
	set(v):
		color = v
		queue_redraw()
## CSS line-height in pixels. 0 means `normal`: the font's own height.
var line_height := 0.0:
	set(v):
		line_height = v
		_refresh()
var align := Align.CENTER:
	set(v):
		align = v
		_dirty = true
		_refresh()
var wrap := true:
	set(v):
		wrap = v
		_dirty = true
		_refresh()
## text-shadow layers, each [blur_px, Color] or [blur_px, Color, Vector2 offset].
var glows: Array = []:
	set(v):
		glows = v
		queue_redraw()
## An inline trailing mark with its own colour (the dialogue ▼). Space for it is
## reserved in the layout, so the line re-centres when it appears, as the DOM does.
var suffix := "":
	set(v):
		if v == suffix:
			return
		suffix = v
		_dirty = true
		_refresh()
var suffix_color := Css.AMBER
var suffix_glows: Array = []
var suffix_alpha := 1.0:
	set(v):
		suffix_alpha = v
		queue_redraw()
## Optional box around the text (.stair-anim): padding, background, border.
var box_pad := Vector2.ZERO:
	set(v):
		box_pad = v
		_refresh()
var box_bg := Color(0, 0, 0, 0)
var box_border := Color(0, 0, 0, 0)
var box_border_w := 0.0
var box_radius := 0
## A paint-time offset, for animations (glitch jitter) that must not disturb
## the layout the parent computed.
var draw_offset := Vector2.ZERO:
	set(v):
		draw_offset = v
		queue_redraw()

var _paras: Array[TextParagraph] = []
var _lines: Array = []            ## [paragraph, line index] per visual line
var _line_m: Array = []           ## per visual line: Vector2(ascent, descent), px
var _suffix_line := TextLine.new()
var _dirty := true
var _shaped_width := -2.0


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	font = Css.font("vt323")
	# <html dir> follows the language: Arabic lays every line out right to left
	I18n.language_changed.connect(func(_l: String) -> void:
		_dirty = true
		update_minimum_size()
		queue_redraw())


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		if wrap and align != Align.BLOCK and not is_equal_approx(_inner_width(), _shaped_width):
			_dirty = true
			_refresh()


## The height of one line box: line-height, or for `normal` the primary
## font's own (a line whose glyphs fall back to a taller face grows; see
## _line_metrics).
func line_box() -> float:
	if line_height > 0.0:
		return line_height
	var s := _strut()
	return s.x + s.y


## The primary face's ascent and descent in Blink's whole pixels.
func _strut() -> Vector2:
	return Css.face_px(Css.primary_family(font), font_size)


## Height of visual line i.
func _line_h(i: int) -> float:
	if line_height > 0.0:
		return line_height
	var m: Vector2 = _line_m[i] if i < _line_m.size() else _strut()
	return m.x + m.y


## Baseline of visual line i, from the top of its line box. A fixed
## line-height centres the primary font's content area (half-leading); with
## `normal`, the line box is the tallest ascent over the tallest descent of
## every face its glyphs came from.
func _line_baseline(i: int) -> float:
	if line_height > 0.0:
		var s := _strut()
		return (line_height - (s.x + s.y)) * 0.5 + s.x
	var m: Vector2 = _line_m[i] if i < _line_m.size() else _strut()
	return m.x


## The baseline of the last line from the top of the box, placed as LayoutNG
## places it when this text is an inline-block: half-leading floored.
func blink_baseline() -> float:
	_shape()
	var y := box_pad.y + box_border_w
	var n := _lines.size()
	for i in range(maxi(0, n - 1)):
		y += _line_h(i)
	if line_height > 0.0:
		var s := _strut()
		return y + floorf((line_height - (s.x + s.y)) * 0.5) + s.x
	return y + _line_baseline(maxi(0, n - 1))


func text_height() -> float:
	_shape()
	var h := 0.0
	for i in _lines.size():
		h += _line_h(i)
	return h


## Blink sizes a `line-height:normal` line by every face that drew a glyph
## on it: a line with an emoji or a symbol from Segoe UI stands taller than a
## line of VT323 alone.
func _line_metrics(e: Array) -> Vector2:
	var strut := _strut()
	if e[1] < 0:
		return strut
	var p: TextParagraph = e[0]
	var li: int = e[1]
	if li >= p.get_line_count():
		return strut
	var ts := TextServerManager.get_primary_interface()
	var a := strut.x
	var d := strut.y
	var seen := {}
	for g in ts.shaped_text_get_glyphs(p.get_line_rid(li)):
		var fr: RID = g.get("font_rid", RID())
		if not fr.is_valid() or seen.has(fr):
			continue
		seen[fr] = true
		var m := Css.face_px(ts.font_get_name(fr), font_size)
		a = maxf(a, m.x)
		d = maxf(d, m.y)
	return Vector2(a, d)


func _inner_width() -> float:
	return size.x - box_pad.x * 2.0 - box_border_w * 2.0


func _shape() -> void:
	if not _dirty:
		return
	_dirty = false
	_paras.clear()
	_lines.clear()
	_line_m.clear()
	var w := _inner_width()
	var wraps := wrap and align != Align.BLOCK and w > 0.0
	_shaped_width = w if wraps else -1.0
	if text == "" and suffix == "":
		return
	var parts := text.split("\n")
	for pi in parts.size():
		var p := TextParagraph.new()
		p.width = w - _trail() if wraps else -1.0
		p.break_flags = TextServer.BREAK_MANDATORY | TextServer.BREAK_WORD_BOUND \
			| TextServer.BREAK_TRIM_EDGE_SPACES | TextServer.BREAK_ADAPTIVE
		p.justification_flags = 0
		p.alignment = HORIZONTAL_ALIGNMENT_LEFT
		p.direction = TextServer.DIRECTION_RTL if I18n.is_rtl() else TextServer.DIRECTION_LTR
		_add_runs(p, parts[pi])
		if suffix != "" and pi == parts.size() - 1:
			_suffix_line.clear()
			_suffix_line.add_string(suffix, font, font_size)
			p.add_object("suffix", _suffix_line.get_size(), INLINE_ALIGNMENT_CENTER)
		_paras.append(p)
		var n := p.get_line_count()
		if parts[pi] == "" and not (suffix != "" and pi == parts.size() - 1):
			_lines.append([p, -1])
		else:
			for li in maxi(1, n):
				_lines.append([p, li])
	_line_m.clear()
	for e in _lines:
		_line_m.append(_line_metrics(e))


## Split a line into runs of emoji and non-emoji characters, each shaped with
## the fallback chain Chrome would use for it.
func _add_runs(p: TextParagraph, s: String) -> void:
	if s == "":
		p.add_string("", font, font_size)
		return
	var twin := Css.emoji_twin(font)
	var run := ""
	var run_emoji := false
	for i in s.length():
		var e := Css.is_emoji(s.unicode_at(i))
		if run != "" and e != run_emoji:
			p.add_string(run, twin if run_emoji else font, font_size)
			run = ""
		run_emoji = e
		run += s[i]
	if run != "":
		p.add_string(run, twin if run_emoji else font, font_size)


func line_count() -> int:
	_shape()
	return _lines.size()


func _refresh() -> void:
	_shape()
	var h := text_height()
	var w := 0.0
	if align == Align.BLOCK or not wrap:
		w = content_width()
	if h > 0.0 or box_pad != Vector2.ZERO:
		h += box_pad.y * 2.0 + box_border_w * 2.0
	if align == Align.BLOCK:
		w += box_pad.x * 2.0 + box_border_w * 2.0
	var want := Vector2(w if (align == Align.BLOCK) else 0.0, h)
	if not custom_minimum_size.is_equal_approx(want):
		custom_minimum_size = want
	queue_redraw()


func _line_width(entry: Array) -> float:
	if entry[1] < 0:
		return 0.0
	var p: TextParagraph = entry[0]
	return p.get_line_width(entry[1]) + _trail() if entry[1] < p.get_line_count() else 0.0


## Chrome puts letter-spacing after the last character too; a FontVariation
## stops at the last glyph, so the difference is added back to line widths.
func _trail() -> float:
	return float((font as FontVariation).spacing_glyph) if font is FontVariation else 0.0


func content_width() -> float:
	_shape()
	var w := 0.0
	for e in _lines:
		w = maxf(w, _line_width(e))
	return w


func _draw() -> void:
	_shape()
	var rid := get_canvas_item()
	if draw_offset != Vector2.ZERO:
		draw_set_transform(draw_offset)
	if box_bg.a > 0.0 or (box_border_w > 0.0 and box_border.a > 0.0):
		var sb := StyleBoxFlat.new()
		sb.bg_color = box_bg
		sb.border_color = box_border
		sb.set_border_width_all(int(box_border_w))
		sb.set_corner_radius_all(box_radius)
		sb.anti_aliasing = box_radius > 0
		draw_style_box(sb, Rect2(Vector2.ZERO, size))
	if _lines.is_empty():
		return
	var inner := _inner_width()
	var origin := Vector2(box_pad.x + box_border_w, box_pad.y + box_border_w)
	var block_w := 0.0
	if align == Align.BLOCK:
		block_w = content_width()
	var top := 0.0
	for i in _lines.size():
		var e: Array = _lines[i]
		var line_top := top
		top += _line_h(i)
		if e[1] < 0:
			continue
		var p: TextParagraph = e[0]
		var li: int = e[1]
		if li >= p.get_line_count():
			continue
		var lw := p.get_line_width(li) + _trail()
		var x := 0.0
		match align:
			Align.CENTER:
				x = (inner - lw) * 0.5
			Align.RIGHT:
				x = inner - lw
			Align.BLOCK:
				x = (inner - block_w) * 0.5
		# draw_line takes the top of Godot's own line box; put its baseline on
		# the CSS one.
		# (The text server floors glyph origins to whole pixels itself, which
		# lands them where Skia puts Chrome's; measured against the Clemons
		# scene, no further snapping matches better.)
		var y := line_top + _line_baseline(i) - p.get_line_ascent(li)
		var pos := origin + Vector2(x, y)
		for g in glows:
			var off: Vector2 = g[2] if g.size() > 2 else Vector2.ZERO
			_glow(rid, p, pos + off, li, float(g[0]), g[1])
		p.draw_line(rid, pos, li, color)
		if suffix != "":
			var r := p.get_line_object_rect(li, "suffix")
			if r.size.x > 0.0:
				var sp := pos + r.position
				for g in suffix_glows:
					var gc: Color = g[1]
					gc.a *= suffix_alpha
					_glow_line(rid, _suffix_line, sp, float(g[0]), gc)
				var sc := suffix_color
				sc.a *= suffix_alpha
				_suffix_line.draw(rid, sp, sc)


## A CSS text-shadow is the glyph coverage blurred with sigma = blur / 2. For
## strokes as thin as these fonts', that is a halo whose intensity at distance d
## from a stroke edge is about P * exp(-(d + w/2)^2 / 2 sigma^2), with P the
## fraction of a Gaussian a stroke of width w covers. It is drawn as nested
## outlines, each carrying the drop in that curve between its radius and the
## next one in; stacked, they rebuild the curve. Measured against Chrome's
## rendering of the boot screen to within a couple of levels per channel.
const RING_RADII := [0.5, 1.0, 1.6, 2.3, 3.0]


## Godot's outline size is four times the stroker radius in pixels.
static func _rings(blur: float, font_px: float, c: Color) -> Array:
	var sigma := blur * 0.5
	var hw := maxf(0.5, font_px * 0.045)
	var peak := clampf(2.0 * hw / (sigma * 2.5066), 0.0, 1.0)
	var f := func(d: float) -> float: return peak * exp(-pow(d + hw, 2.0) / (2.0 * sigma * sigma))
	var out: Array = []
	var prev := 0.0
	for k in RING_RADII.size():
		var r: float = float(RING_RADII[k]) * sigma
		var a: float = f.call(prev) - f.call(r) if k < RING_RADII.size() - 1 else f.call(prev)
		out.append([maxi(1, int(round(r * 4.0))), a * c.a])
		prev = r
	out.reverse()
	return out


func _glow(rid: RID, p: TextParagraph, pos: Vector2, line: int, blur: float, c: Color) -> void:
	if c.a <= 0.0:
		return
	if blur <= 1.0:
		p.draw_line(rid, pos, line, c)
		return
	for ring in _rings(blur, font_size, c):
		p.draw_line_outline(rid, pos, line, ring[0], Color(c.r, c.g, c.b, ring[1]))


func _glow_line(rid: RID, tl: TextLine, pos: Vector2, blur: float, c: Color) -> void:
	if c.a <= 0.0:
		return
	for ring in _rings(blur, font_size, c):
		tl.draw_outline(rid, pos, ring[0], Color(c.r, c.g, c.b, ring[1]))
