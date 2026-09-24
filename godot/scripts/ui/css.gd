class_name Css
extends RefCounted
## The stylesheet in index.html, as constants and small builders.
##
## Everything visual in the terminal traces back to a CSS rule, and the rule is
## quoted next to the value it produced, so when the two builds disagree the
## place to look is obvious.

# :root{--green:#33ff66;--green-bright:#7dff9a;--green-dim:#1a8033;
#       --green-dark:#062b10;--bg:#020a04;--amber:#ffb000;--red:#ff3333}
const GREEN := Color("#33ff66")
const GREEN_BRIGHT := Color("#7dff9a")
const GREEN_DIM := Color("#1a8033")
const GREEN_DARK := Color("#062b10")
const BG := Color("#020a04")
const AMBER := Color("#ffb000")
const RED := Color("#ff3333")

const VT323_PATH := "res://fonts/VT323-Regular.ttf"
const MONO_PATH := "res://fonts/ShareTechMono-Regular.ttf"

static var _fonts := {}
static var _variations := {}


## The two webfonts, with the fallback chain the browser walks for glyphs they
## lack: 'VT323','Share Tech Mono',monospace, then the OS symbol and emoji faces.
## Hinting is off and positioning is subpixel, which is how Chrome lays text out,
## so advances come out fractional instead of rounded to whole pixels.
##
## `emoji` selects the chain for emoji-presentation characters, which Chrome
## sends to the colour emoji face before the symbol face. Both chains try the
## CSS families first, so a glyph VT323 or Share Tech Mono has still wins.
static func font(which: String = "vt323", emoji: bool = false) -> Font:
	var cache_key := which + ("#emoji" if emoji else "")
	if _fonts.has(cache_key):
		return _fonts[cache_key]
	var base: FontFile = _tune((load(VT323_PATH if which == "vt323" else MONO_PATH) as FontFile).duplicate())
	base.set_meta("family", which)

	# On Windows the faces are named files, so load those directly: a SystemFont
	# lookup by family name can land on a sibling face with different advances,
	# which moves every line break.
	var fallbacks: Array[Font] = []
	if which == "vt323":
		fallbacks.append(_tune((load(MONO_PATH) as FontFile).duplicate()))
	var consolas := ["C:/Windows/Fonts/consola.ttf", ["Consolas", "Courier New", "monospace"]]
	var emoji_face := ["C:/Windows/Fonts/seguiemj.ttf", ["Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"]]
	var symbol_face := ["C:/Windows/Fonts/seguisym.ttf", ["Segoe UI Symbol", "Arial Unicode MS", "DejaVu Sans"]]
	var chain := [consolas, emoji_face, symbol_face] if emoji else [consolas, symbol_face, emoji_face]
	chain.append(["C:/Windows/Fonts/msyh.ttc", ["Microsoft YaHei", "Noto Sans SC", "SimHei"]])
	chain.append(["C:/Windows/Fonts/Nirmala.ttc", ["Nirmala UI", "Noto Sans Devanagari"]])
	# Arabic: Chrome's fallback draws it in Times New Roman (asked of the
	# browser with CSS.getPlatformFontsForNode), ahead of Segoe UI, which has
	# Arabic too but larger
	chain.append(["C:/Windows/Fonts/times.ttf", ["Times New Roman", "Noto Naskh Arabic", "DejaVu Serif"]])
	chain.append(["C:/Windows/Fonts/segoeui.ttf", ["Segoe UI", "Arial"]])
	for spec in chain:
		fallbacks.append(_system_face(spec[0], spec[1]))
	base.fallbacks = fallbacks
	_fonts[cache_key] = base
	if not emoji:
		base.set_meta("emoji_twin", font(which, true))
	return base


static var _faces := {}


static func _system_face(path: String, names: Array) -> Font:
	if _faces.has(path):
		return _faces[path]
	var f: Font = null
	if FileAccess.file_exists(path):
		var ff := FontFile.new()
		if ff.load_dynamic_font(path) == OK:
			f = _tune(ff)
	if f == null:
		var sf := SystemFont.new()
		sf.font_names = PackedStringArray(names)
		sf.hinting = TextServer.HINTING_NONE
		sf.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_ONE_QUARTER
		f = sf
	_faces[path] = f
	return f


## The emoji-presentation twin of a font from font() or spaced().
static func emoji_twin(f: Font) -> Font:
	if f == null:
		return f
	return f.get_meta("emoji_twin", f)


## Unicode emoji-presentation characters (pictographs from U+1F000 up), which
## Chrome renders from the emoji face.
static func is_emoji(cp: int) -> bool:
	return cp >= 0x1F000 and cp <= 0x1FAFF


## Chrome's text model: no hinting, fractional advances kept.
static func _tune(f: FontFile) -> FontFile:
	f.hinting = TextServer.HINTING_NONE
	f.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_ONE_QUARTER
	f.keep_rounding_remainders = true
	f.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
	f.generate_mipmaps = false
	f.allow_system_fallback = false
	return f


## The CSS content-area metrics Chrome uses (hhea, or OS/2 typo when
## USE_TYPO_METRICS is set), as [ascent, descent] in em.
static func metrics(f: Font) -> Array:
	return FACE_METRICS[primary_family(f)]


## The family name of a font()/spaced() font's first face.
static func primary_family(f: Font) -> String:
	var fam: String = f.get_meta("family", "") if f else ""
	if fam == "" and f is FontVariation:
		var base: Font = (f as FontVariation).base_font
		fam = base.get_meta("family", "") if base else ""
	return "Share Tech Mono" if fam == "mono" else "VT323"


## Chrome's vertical metrics for each face in the fallback chains, in em.
## On Windows it reads them through DirectWrite: OS/2 usWinAscent and
## usWinDescent, or the typo values when the face sets USE_TYPO_METRICS
## (VT323 does). None of these faces has a line gap left over.
const FACE_METRICS := {
	"VT323": [0.8, 0.2],
	"Share Tech Mono": [0.885, 0.242],
	"Consolas": [0.9199, 0.2510],
	"Segoe UI Emoji": [1.0791, 0.2510],
	"Segoe UI Symbol": [1.0791, 0.2510],
	"Microsoft YaHei": [1.0581, 0.2617],
	"Nirmala UI": [1.0791, 0.2510],
	"Times New Roman": [0.8911, 0.2163],
	"Segoe UI": [1.0791, 0.2510],
}


## A face's ascent and descent at a size, in the whole pixels Blink rounds
## them to (FontMetrics::AscentDescentWithHacks).
static func face_px(family: String, size: float) -> Vector2:
	var m: Array = FACE_METRICS.get(family, FACE_METRICS["VT323"])
	return Vector2(floorf(float(m[0]) * size + 0.5), floorf(float(m[1]) * size + 0.5))


## letter-spacing:Npx. Godot has no per-node letter spacing; a FontVariation
## with extra glyph spacing is the equivalent. A variation only spaces its own
## base font, though, and Chrome spaces every character whichever face drew it,
## so each face in the fallback chain gets a spaced variation of its own.
static func spaced(which: String, px: float) -> Font:
	var key := "%s@%.2f" % [which, px]
	if _variations.has(key):
		return _variations[key]
	var v := _spaced_chain(font(which), int(round(px)))
	v.set_meta("emoji_twin", _spaced_chain(font(which, true), int(round(px))))
	_variations[key] = v
	return v


static func _spaced_chain(base: FontFile, px: int) -> FontVariation:
	var v := FontVariation.new()
	v.base_font = base
	v.spacing_glyph = px
	var fbs: Array[Font] = []
	for fb in base.fallbacks:
		var fv := FontVariation.new()
		fv.base_font = fb
		fv.spacing_glyph = px
		fbs.append(fv)
	v.fallbacks = fbs
	return v


static func rgba(r: int, g: int, b: int, a: float) -> Color:
	return Color8(r, g, b, int(round(a * 255.0)))


## A flat box: background, border, radius and optional padding, the common
## shape of every button and panel in the stylesheet.
static func box(bg: Color, border: Color = Color(0, 0, 0, 0), border_w: int = 0,
		radius: int = 0, pad_x: float = 0.0, pad_y: float = 0.0) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(border_w)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = pad_x
	sb.content_margin_right = pad_x
	sb.content_margin_top = pad_y
	sb.content_margin_bottom = pad_y
	sb.anti_aliasing = radius > 0
	return sb


## box-shadow:0 0 Npx color, the outer glow most buttons wear. Kept as metadata
## on the stylebox and painted by draw_box(): StyleBoxFlat's own shadow fills in
## under the box, which shows through a transparent background, and a CSS
## box-shadow never does.
static func glow(sb: StyleBoxFlat, color: Color, blur: float) -> StyleBoxFlat:
	sb.set_meta("shadows", [[blur, color, 0.0, Vector2.ZERO]])
	return sb


## Standard normal CDF (Abramowitz-Stegun), for Gaussian shadow falloff.
static func phi(x: float) -> float:
	var t := 1.0 / (1.0 + 0.3275911 * absf(x) / 1.41421356)
	var y := 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x / 2.0)
	return 0.5 * (1.0 + y) if x >= 0.0 else 0.5 * (1.0 - y)


## Paint a CSS box: outer box-shadows (outside the border box only, Gaussian
## with sigma = blur / 2), then the stylebox itself.
static func draw_box(ci: CanvasItem, rect: Rect2, sb: StyleBox) -> void:
	if sb == null:
		return
	draw_shadows(ci, rect, sb)
	sb.draw(ci.get_canvas_item(), rect)


## The outer box-shadows alone, for controls that paint their own stylebox
## (a PanelContainer draws it straight, without the shadow metadata).
static func draw_shadows(ci: CanvasItem, rect: Rect2, sb: StyleBox) -> void:
	if sb == null:
		return
	var shadows: Array = sb.get_meta("shadows", [])
	var radius := 0
	if sb is StyleBoxFlat:
		radius = (sb as StyleBoxFlat).corner_radius_top_left
	for s in shadows:
		var blur: float = s[0]
		var col: Color = s[1]
		if blur <= 0.0 or col.a <= 0.0:
			continue
		var sigma := blur * 0.5
		var reach := blur * 1.2
		var steps := maxi(4, int(ceil(reach / 1.5)))
		var ring_w := reach / steps
		for i in steps:
			var d := (i + 0.5) * ring_w
			var a := col.a * (1.0 - phi(d / sigma))
			if a <= 0.002:
				continue
			var ring := StyleBoxFlat.new()
			ring.draw_center = false
			ring.bg_color = Color(0, 0, 0, 0)
			ring.border_color = Color(col.r, col.g, col.b, a)
			ring.set_border_width_all(maxi(1, int(ceil(ring_w))))
			var e := i * ring_w + ring_w
			ring.set_expand_margin_all(e)
			ring.set_corner_radius_all(int(radius + e))
			ring.anti_aliasing = true
			ring.anti_aliasing_size = 0.6
			ring.draw(ci.get_canvas_item(), rect)


## box-shadow:inset 0 0 Npx color — the same Gaussian, walked inwards from the
## border box instead of outwards.
static func draw_inset(ci: CanvasItem, rect: Rect2, color: Color, blur: float, radius := 0) -> void:
	if blur <= 0.0 or color.a <= 0.0:
		return
	var sigma := blur * 0.5
	var reach := blur * 1.2
	var steps := maxi(4, int(ceil(reach / 1.5)))
	var ring_w := reach / steps
	for i in steps:
		var d := (i + 0.5) * ring_w
		var a := color.a * (1.0 - phi(d / sigma))
		if a <= 0.002:
			continue
		var ring := StyleBoxFlat.new()
		ring.draw_center = false
		ring.bg_color = Color(0, 0, 0, 0)
		ring.border_color = Color(color.r, color.g, color.b, a)
		ring.set_border_width_all(maxi(1, int(ceil(ring_w))))
		var inset := i * ring_w
		ring.set_corner_radius_all(maxi(0, int(radius - inset)))
		ring.anti_aliasing = true
		ring.anti_aliasing_size = 0.6
		ring.draw(ci.get_canvas_item(), rect.grow(-inset))
