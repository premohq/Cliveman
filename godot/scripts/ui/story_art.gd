class_name StoryArt
extends Control
## #storyArt: the illustration above the dialogue box. Port of engine/story-art.js.
##
## Three stacked layers, as the DOM has them: the scene (`.story-scene`), a
## character figure (`.story-char`) and an interrogation panel (`.story-panel`)
## pinned to the top-right corner. Sizes come from the stylesheet:
##
##   .story-scene svg { height:min(46vh,53vw,428px); width:auto; max-width:94% }
##   .story-char svg  { height:clamp(150px,30vh,280px) }
##   .story-panel     { right:clamp(14px,3vw,28px); top:clamp(10px,4vh,30px);
##                      width:clamp(170px,26vw,300px); aspect-ratio:4/5 }

const SCENE_SHADER := preload("res://shaders/scene_frame.gdshader")
const PANEL_SCAN_SHADER := preload("res://shaders/panel_scan.gdshader")

## SCENE_IMG_DEFS. The locations with no raster of their own borrow the city.
const SCENE_IMG := {
	"dream": "res://assets/images/scenes/dream.jpg",
	"collision": "res://assets/images/scenes/collision.jpg",
	"apartment": "res://assets/images/scenes/apartment.jpg",
	"factory": "res://assets/images/scenes/factory.jpg",
	"rooftop": "res://assets/images/scenes/rooftop.jpg",
	"ruins": "res://assets/images/scenes/ruins.jpg",
	"garage": "res://assets/images/scenes/garage.jpg",
	"city": "res://assets/images/scenes/city.jpg",
	"tavern": "res://assets/images/scenes/city.jpg",
	"track": "res://assets/images/scenes/city.jpg",
	"arcade": "res://assets/images/scenes/city.jpg",
	"street": "res://assets/images/scenes/city.jpg",
	"diner": "res://assets/images/scenes/diner.jpg",
	"arrest": "res://assets/images/scenes/arrest.jpg",
	"court": "res://assets/images/scenes/court.jpg",
	"cell": "res://assets/images/scenes/cell.jpg",
	"sunrise": "res://assets/images/scenes/sunrise.jpg",
	"clemons-neutral": "res://assets/images/interrogations/clemons-neutral.jpg",
	"clemons-defensive": "res://assets/images/interrogations/clemons-defensive.jpg",
	"clemons-smug": "res://assets/images/interrogations/clemons-smug.jpg",
	"clemons-cornered": "res://assets/images/interrogations/clemons-cornered.jpg",
}

## Keys with procedural SVG in the original but no raster. None is reachable
## from part one's section titles; they are kept so hint() stays a faithful port.
const SVG_ONLY := ["docks", "yard", "hall"]

## CHAR_ART_DEFS, rendered from the original SVG (with its glow and
## drop-shadow) by tools/render_svg_art.js. PAD is the transparent margin the
## renderer leaves round the 300x320 figure for the shadow to fall into.
const CHAR_ART := {
	"shoot": "res://assets/images/characters/shoot.png",
	"bevan": "res://assets/images/characters/bevan.png",
}
const CHAR_PAD := 48.0      ## css px of margin baked into the PNGs
const CHAR_SCALE := 2.0     ## the PNGs are rendered at 2x

var _scene: TextureRect
var _char_box: Control
var _char: TextureRect
var _panel: Control
var _panel_frame: Control
var _panel_img: TextureRect
var _panel_scan: ColorRect

var _cur_scene := ""
var _scene_mat: ShaderMaterial
var _scene_raw := false
var _tweens: Array[Tween] = []
var _glitch := false
var _glitch_t := 0.0

signal blip


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true  # #storyArt{overflow:hidden}

	_scene = TextureRect.new()
	_scene.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_scene.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_scene.stretch_mode = TextureRect.STRETCH_SCALE
	_scene.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_scene_mat = ShaderMaterial.new()
	_scene_mat.shader = SCENE_SHADER
	_scene.material = _scene_mat
	_scene.visible = false
	add_child(_scene)

	_char_box = Control.new()
	_char_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_char_box)
	_char = TextureRect.new()
	_char.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_char.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_char.stretch_mode = TextureRect.STRETCH_SCALE
	_char.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_char_box.add_child(_char)
	_char_box.visible = false

	_panel = Control.new()
	_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel.visible = false
	add_child(_panel)
	_panel_frame = Control.new()
	_panel_frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel_frame.draw.connect(_draw_panel_frame)
	_panel.add_child(_panel_frame)
	_panel_img = TextureRect.new()
	_panel_img.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel_img.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_panel_img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_panel_img.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_panel_img.clip_contents = true
	var pim := ShaderMaterial.new()
	pim.shader = preload("res://shaders/panel_image.gdshader")
	_panel_img.material = pim
	_panel_frame.add_child(_panel_img)
	_panel_scan = ColorRect.new()
	_panel_scan.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var psm := ShaderMaterial.new()
	psm.shader = PANEL_SCAN_SHADER
	_panel_scan.material = psm
	_panel_frame.add_child(_panel_scan)


## STORYART.hint(title): keyword-match a section title to a scene. First match
## wins, so the order is the original's.
static func hint(title: String) -> String:
	var t := title.to_lower()
	var rules := [
		["rooftop|roof\\b|chase", "rooftop"],
		["trial|court|judge|verdict", "court"],
		["dream|nightmare", "dream"],
		["crime scene|collapsed|rubble|ruins", "ruins"],
		["mechanic|garage|repair|breakdown", "garage"],
		["arrest", "arrest"],
		["s e c r e t|secret|retirement|sunrise", "sunrise"],
		["escape|breakout|prison break|yard\\b", "yard"],
		["dock|pier|harbor|wharf", "docks"],
		["tavern|blackjack|gumshoe", "tavern"],
		["horse|track|derby|turf", "track"],
		["arcade|snake", "arcade"],
		["comptroller|pyne|city hall|hall of records", "hall"],
		["prison|cell|correctional|e p i l o g u e|epilogue", "cell"],
		["petes|pete's|subs|diner", "diner"],
		["mayo|factory|smiles|investigation|clemons|tubley", "factory"],
		["interrogat|convinc|apartment|office|clerk|lobby", "apartment"],
		["street|alley|drive|encounter", "street"],
		["c h a p t e r|chapter|dudley|part one|e n d", "city"],
	]
	for r in rules:
		var re := RegEx.new()
		re.compile(r[0])
		if re.search(t):
			return r[1]
	return ""


func set_scene(key: String) -> void:
	if key == "" or (not SCENE_IMG.has(key) and not SVG_ONLY.has(key)):
		return
	if key == _cur_scene:
		return
	_cur_scene = key
	# A figure belongs to the scene it walked into; changing scene retires it.
	clear_char()
	clear_panel()
	if not SCENE_IMG.has(key):
		_scene.visible = false
		return
	_scene_raw = false
	_scene.texture = load(SCENE_IMG[key])
	_scene_mat.set_shader_parameter("vignette", true)
	_scene_mat.set_shader_parameter("scanlines", true)
	_scene.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_scene.visible = true
	_scene_in()


## STORYART.raw(svg): an arbitrary picture in the scene slot. Only ever the
## title logo, which has no vignette or scanlines of its own.
func set_raw(tex: Texture2D) -> void:
	_cur_scene = ""
	_scene_raw = true
	_scene.texture = tex
	_scene_mat.set_shader_parameter("vignette", false)
	_scene_mat.set_shader_parameter("scanlines", false)
	_scene.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_scene.visible = true
	_scene_in()


## @keyframes sceneIn { 0% opacity:0; brightness(2.2) -> 100% opacity:.9 }, .6s ease-out
func _scene_in() -> void:
	_layout()
	_scene_mat.set_shader_parameter("opacity", 0.0)
	_scene_mat.set_shader_parameter("brightness", 2.2)
	var tw := create_tween().set_parallel()
	tw.tween_method(func(v: float) -> void: _scene_mat.set_shader_parameter("opacity", v), 0.0, 0.9, 0.6) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_method(func(v: float) -> void: _scene_mat.set_shader_parameter("brightness", v), 2.2, 1.0, 0.6) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


func set_char(kind: String, fx: String = "") -> bool:
	if not CHAR_ART.has(kind) or not ResourceLoader.exists(CHAR_ART[kind]):
		return false
	_char.texture = load(CHAR_ART[kind])
	_char_box.visible = true
	_glitch = fx.contains("glitch")
	_layout()
	# .char-in / @keyframes artReveal .55s ease-out:
	#   0% opacity 0, translateY(14px) scale(.985), brightness(2.4) saturate(.4)
	#   60% brightness(1.35) saturate(.9);  100% none
	_char.modulate = Color(2.4, 2.4, 2.4, 0.0)
	_char_box.set_meta("rise", 14.0)
	var tw := create_tween().set_parallel()
	tw.tween_property(_char, "modulate:a", 1.0, 0.55).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_method(func(v: float) -> void:
		var b := lerpf(2.4, 1.35, v / 0.6) if v < 0.6 else lerpf(1.35, 1.0, (v - 0.6) / 0.4)
		_char.modulate = Color(b, b, b, _char.modulate.a)
		_char_box.set_meta("rise", 14.0 * (1.0 - v))
		_layout(), 0.0, 1.0, 0.55).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	blip.emit()
	return true


func clear_char() -> void:
	_char_box.visible = false
	_char.texture = null
	_glitch = false


## STORYART.panel(key, fx): a Clemons reaction shot. fx "panel-slam" is the
## harder entrance used when he is caught out.
func set_panel(key: String, fx: String = "") -> void:
	if not SCENE_IMG.has(key):
		return
	_panel_img.texture = load(SCENE_IMG[key])
	_panel.visible = true
	_layout()
	var slam := fx == "panel-slam"
	# panelPop  .32s: translate(12px,10px) scale(.88) opacity 0 -> none
	# panelSlam .22s: translate(16px,-8px) scale(1.08) opacity 0 -> none
	var dur := 0.22 if slam else 0.32
	var from_off := Vector2(16, -8) if slam else Vector2(12, 10)
	var from_scale := 1.08 if slam else 0.88
	_panel.modulate.a = 0.0
	_panel.set_meta("anim_off", from_off)
	_panel.set_meta("anim_scale", from_scale)
	var tw := create_tween()
	tw.tween_method(func(v: float) -> void:
		_panel.modulate.a = v
		_panel.set_meta("anim_off", from_off * (1.0 - v))
		_panel.set_meta("anim_scale", lerpf(from_scale, 1.0, v))
		_layout(), 0.0, 1.0, dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	blip.emit()


func clear_panel() -> void:
	_panel.visible = false
	_panel_img.texture = null


func clear() -> void:
	_cur_scene = ""
	_scene.visible = false
	_scene.texture = null
	clear_char()
	clear_panel()


func current_scene() -> String:
	return _cur_scene


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_layout()


func _process(delta: float) -> void:
	if _glitch and _char_box.visible:
		# @keyframes glitchJitter .55s steps(2,end): translate jitter
		_glitch_t += delta
		_layout()


func _layout() -> void:
	var vp := get_viewport_rect().size
	var box := size

	if _scene.visible and _scene.texture != null:
		var h := minf(minf(vp.y * 0.46, vp.x * 0.53), 428.0)
		var tex_aspect := float(_scene.texture.get_width()) / maxf(1.0, float(_scene.texture.get_height()))
		var w := 0.0
		if _scene_raw:
			# An <svg> of the logo's own aspect: width auto from height, then
			# max-width:94%, with the picture letterboxed inside by `meet`.
			w = h * tex_aspect
			var maxw := box.x * 0.94
			if w > maxw:
				w = maxw
			var fit := minf(w / tex_aspect, h)
			var draw_w := fit * tex_aspect
			_scene.size = Vector2(draw_w, fit)
			_scene.position = (box - _scene.size) * 0.5
		else:
			# viewBox 640x360; the raster fills it exactly.
			w = h * 640.0 / 360.0
			var maxw2 := box.x * 0.94
			var draw_h := h
			if w > maxw2:
				w = maxw2
				draw_h = w * 360.0 / 640.0
			_scene.size = Vector2(w, draw_h)
			_scene.position = (box - _scene.size) * 0.5
			_scene_mat.set_shader_parameter("box_px", _scene.size)

	if _char_box.visible and _char.texture != null:
		var ch := clampf(vp.y * 0.30, 150.0, 280.0)
		var svg_w := ch * 300.0 / 320.0
		var pad := CHAR_PAD * ch / 216.0
		var rise: float = _char_box.get_meta("rise", 0.0)
		var jitter := Vector2.ZERO
		if _glitch:
			var step := int(floor(fmod(_glitch_t, 0.55) / 0.55 * 5.0))
			jitter = [Vector2(0, 0), Vector2(-1, 0.5), Vector2(1, -0.5), Vector2(-0.5, 0), Vector2(0.5, 0.5)][step]
		_char_box.position = Vector2((box.x - svg_w) * 0.5, (box.y - ch) * 0.5 + rise) + jitter
		_char_box.size = Vector2(svg_w, ch)
		_char.position = Vector2(-pad, -pad)
		_char.size = Vector2(svg_w + pad * 2.0, ch + pad * 2.0)

	if _panel.visible:
		var pw := clampf(vp.x * 0.26, 170.0, 300.0)
		var ph := pw * 5.0 / 4.0
		var right := clampf(vp.x * 0.03, 14.0, 28.0)
		var top := clampf(vp.y * 0.04, 10.0, 30.0)
		var off: Vector2 = _panel.get_meta("anim_off", Vector2.ZERO)
		var sc: float = _panel.get_meta("anim_scale", 1.0)
		_panel.size = Vector2(pw, ph)
		_panel.pivot_offset = _panel.size * 0.5
		_panel.scale = Vector2(sc, sc)
		_panel.position = Vector2(box.x - pw - right, top) + off
		_panel_frame.size = _panel.size
		_panel_frame.pivot_offset = _panel.size * 0.5
		_panel_frame.rotation = deg_to_rad(-1.5)
		_panel_img.position = Vector2(3, 3)
		_panel_img.size = _panel.size - Vector2(6, 6)
		_panel_scan.position = _panel_img.position
		_panel_scan.size = _panel_img.size
		_panel_frame.queue_redraw()


## .story-panel-frame: 3px cream border on #040806, a 2px near-black ring
## outside it, a long soft drop shadow and a faint warm halo.
func _draw_panel_frame() -> void:
	var r := Rect2(Vector2.ZERO, _panel_frame.size)
	var glow := StyleBoxFlat.new()
	glow.bg_color = Color(0, 0, 0, 0)
	glow.shadow_color = Css.rgba(255, 240, 210, 0.10)
	glow.shadow_size = 24
	glow.draw(_panel_frame.get_canvas_item(), r)
	var drop := StyleBoxFlat.new()
	drop.bg_color = Color(0, 0, 0, 0)
	drop.shadow_color = Css.rgba(0, 0, 0, 0.48)
	drop.shadow_size = 35
	drop.shadow_offset = Vector2(0, 18)
	drop.draw(_panel_frame.get_canvas_item(), r)
	# The frame is rotated, so every edge is drawn anti-aliased; plain rects
	# stair-step along a 1.5 degree slope.
	var ring := StyleBoxFlat.new()
	ring.draw_center = false
	ring.border_color = Css.rgba(10, 10, 10, 0.82)
	ring.set_border_width_all(2)
	ring.set_expand_margin_all(2)
	ring.anti_aliasing = true
	ring.draw(_panel_frame.get_canvas_item(), r)
	var face := StyleBoxFlat.new()
	face.bg_color = Color("#040806")
	face.border_color = Css.rgba(236, 218, 185, 0.88)
	face.set_border_width_all(3)
	face.anti_aliasing = true
	face.draw(_panel_frame.get_canvas_item(), r)
