class_name Nav3D
extends Node3D
## engine/nav3d.js: the true-3D nav renderer, built from the room grid.
##
## Geometry, props, lights, fog and camera are the original's, unit for unit:
## a grid cell is one unit, walls are one unit tall, the eye sits at 0.5, and
## the camera is a 74 degree vertical FOV. Materials are three.js's own shading
## models re-implemented in shaders/three_common.gdshaderinc, and the textures
## were painted by the original canvas routines (tools/render_nav_textures.js),
## so a room reads the same in both builds.

const TEX_DIR := "res://assets/images/nav/"
const LIT := preload("res://shaders/three_lit.gdshader")
const LIT_ALPHA := preload("res://shaders/three_lit_alpha.gdshader")
const OVERLAY := preload("res://shaders/three_overlay.gdshader")

## RC_THEMES in engine/raycaster.js
const THEMES := {
	"apartment": {"wallN": "#2a4a32", "wallE": "#1e3a28", "floor1": "#1a120e", "floor2": "#241a14", "ceil": "#0a0806", "fog": "#020a04", "wallTex": "wood", "floorTex": "wood_planks", "ceilTex": "stucco"},
	"factory": {"wallN": "#3a4a2a", "wallE": "#2e3a1e", "floor1": "#1a1a0e", "floor2": "#262618", "ceil": "#0a0a04", "fog": "#040804", "wallTex": "metal", "floorTex": "concrete", "ceilTex": "grate"},
	"crime": {"wallN": "#4a2a2a", "wallE": "#3a1e1e", "floor1": "#121010", "floor2": "#1a1414", "ceil": "#060404", "fog": "#080404", "wallTex": "rubble", "floorTex": "rubble_floor", "ceilTex": "broken"},
	"street": {"wallN": "#2a2a4a", "wallE": "#1e1e3a", "floor1": "#121218", "floor2": "#1a1a24", "ceil": "#04040a", "fog": "#020208", "wallTex": "brick", "floorTex": "cobble", "ceilTex": "night_sky"},
	"lobby": {"wallN": "#1a3a4a", "wallE": "#142e3a", "floor1": "#0e1218", "floor2": "#141a22", "ceil": "#040608", "fog": "#020408", "wallTex": "wallpaper", "floorTex": "tile", "ceilTex": "stucco"},
	"default": {"wallN": "#1a3a22", "wallE": "#142e1a", "floor1": "#0a120e", "floor2": "#101a14", "ceil": "#040804", "fog": "#020a04", "wallTex": "panels", "floorTex": "concrete", "ceilTex": "stucco"},
}

## FP_GLYPH
const GLYPH := {
	"U": {"ch": "?", "label": "item", "color": "#66ff66", "sprH": 0.4},
	"I": {"ch": "!", "label": "ITEM", "color": "#ffff33", "sprH": 0.5},
	"S": {"ch": "▲", "label": "STAIRS UP", "color": "#9fd8ff", "sprH": 0.85, "stairs": "up"},
	"v": {"ch": "▼", "label": "STAIRS DN", "color": "#9fd8ff", "sprH": 0.85, "stairs": "down"},
	"D": {"ch": "█", "label": "DOOR", "color": "#cc8844", "sprH": 0.95},
	"K": {"ch": "☺", "label": "WITNESS", "color": "#ff6666", "sprH": 0.9, "person": true},
	"B": {"ch": "☺", "label": "PERSON", "color": "#aaaaff", "sprH": 0.9, "person": true},
	"E": {"ch": "■", "label": "ENTRANCE", "color": "#33ff66", "sprH": 0.6},
	"L": {"ch": "→", "label": "EXIT", "color": "#ff3333", "sprH": 0.6},
	"M": {"ch": "⚒", "label": "MECHANIC", "color": "#ffaa33", "sprH": 0.8},
	"G": {"ch": "☕", "label": "TAVERN", "color": "#ff66ff", "sprH": 0.8},
	"H": {"ch": "♞", "label": "TRACK", "color": "#ffcc66", "sprH": 0.8},
	"A": {"ch": "★", "label": "ARCADE", "color": "#66ffcc", "sprH": 0.8},
	"1": {"ch": "1", "label": "201", "color": "#888", "sprH": 0.5},
	"2": {"ch": "2", "label": "202", "color": "#888", "sprH": 0.5},
	"3": {"ch": "3", "label": "203", "color": "#888", "sprH": 0.5},
	"4": {"ch": "4", "label": "204", "color": "#888", "sprH": 0.5},
	"5": {"ch": "5", "label": "205", "color": "#888", "sprH": 0.5},
	"6": {"ch": "6", "label": "206", "color": "#888", "sprH": 0.5},
}
const DOOR_SYMS := {"D": "", "E": "", "1": "201", "2": "202", "3": "203", "4": "204", "5": "205", "6": "206"}
const FURNITURE := {
	"bed": {"art": "bed", "sprH": 0.44}, "couch": {"art": "couch", "sprH": 0.48}, "tubeTV": {"art": "tubeTV", "sprH": 0.6},
	"mayoVat": {"art": "mayoVat", "sprH": 0.95}, "crate": {"art": "crate", "sprH": 0.52}, "barrel": {"art": "barrel", "sprH": 0.66},
	"fridge": {"art": "fridge", "sprH": 0.86}, "deskLobby": {"art": "deskLobby", "sprH": 0.54},
}
const WALL_ART := ["clock", "photo", "tv", "badge"]

## pickTheme(title)
static func pick_theme(title: String) -> Dictionary:
	if title == "":
		return THEMES["default"]
	var t := title.to_lower()
	if t.contains("apartment") and t.contains("lobby"):
		return THEMES["lobby"]
	if t.contains("hallway"):
		return THEMES["lobby"]
	if t.contains("apartment") or t.contains("bevan"):
		return THEMES["apartment"]
	if t.contains("mayo") or t.contains("floor"):
		return THEMES["factory"]
	if t.contains("crime") or t.contains("collapsed"):
		return THEMES["crime"]
	if t.contains("dudley"):
		return THEMES["street"]
	return THEMES["default"]


var camera: Camera3D
var grid: NavGrid
var theme: Dictionary
var item_art := {}
var furniture := {}
var dirty := true

var _root: Node3D
var _mats: Array[ShaderMaterial] = []
var _people: Array[Node3D] = []
var _tex_cache := {}
var _lights := {}
var _hand: MeshInstance3D = null
var _hand_base := PackedVector3Array()
var _hand_delta := PackedVector3Array()
var _hand_normals := PackedVector3Array()
var _hand_uvs := PackedVector2Array()
var _hand_idx := PackedInt32Array()
var _hand_anchor_x := 0.0
var _hand_inf := -1.0
var _hand_mv := 0.0
var _hand_tune := {}

var _bob_phase := 0.0
var _last_px := INF
var _last_py := 0.0
var eye_world := Vector3.ZERO


func _ready() -> void:
	camera = Camera3D.new()
	camera.fov = 74.0
	camera.near = 0.04
	camera.far = 60.0
	add_child(camera)
	camera.make_current()
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.environment = e
	add_child(env)
	env.name = "Env"


# ── textures ─────────────────────────────────────────────────────────────────

func _safe(hex: String) -> String:
	return hex.replace("#", "")


func _tex(name: String) -> Texture2D:
	if _tex_cache.has(name):
		return _tex_cache[name]
	var path := TEX_DIR + name + ".png"
	var tex: Texture2D = null
	if ResourceLoader.exists(path):
		var img: Image = (load(path) as Texture2D).get_image()
		if img.is_compressed():
			img.decompress()
		img.generate_mipmaps()
		tex = ImageTexture.create_from_image(img)
	_tex_cache[name] = tex
	return tex


func _wall_tex(color_hex: String, variant: int) -> Texture2D:
	return _tex("wall_%s_%s_v%d" % [theme.get("wallTex", "panels"), _safe(color_hex), variant & 3])


# ── materials ────────────────────────────────────────────────────────────────

func _mat(mode: int, color: Color, tex: Texture2D = null, nearest: bool = false,
		repeat := Vector2.ONE, alpha_test := 0.0, transparent := false) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = LIT_ALPHA if transparent else LIT
	m.set_shader_parameter("mode", mode)
	m.set_shader_parameter("color", color)
	if tex:
		m.set_shader_parameter("map_nearest" if nearest else "map_linear", tex)
		m.set_shader_parameter("map_mode", 2 if nearest else 1)
	m.set_shader_parameter("uv_repeat", repeat)
	m.set_shader_parameter("alpha_test", alpha_test)
	_apply_lights(m)
	_mats.append(m)
	return m


func _apply_lights(m: ShaderMaterial) -> void:
	for k in _lights:
		m.set_shader_parameter(k, _lights[k])


## Test hook: override one light uniform on every material.
func debug_light(key: String, value: Variant) -> void:
	_lights[key] = value
	for m in _mats:
		m.set_shader_parameter(key, value)


## three's Color.multiplyScalar works on linear values; the shader decodes its
## colour uniform from sRGB, so a linear scalar has to be encoded first.
static func _lin(v: float) -> Color:
	return Color(v, v, v).linear_to_srgb()


# ── mesh helpers ─────────────────────────────────────────────────────────────

var _st := {}   ## material -> SurfaceTool, batched per build


func _surface(m: ShaderMaterial) -> SurfaceTool:
	if not _st.has(m):
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		_st[m] = st
	return _st[m]


## A quad: corners in order top-left, top-right, bottom-right, bottom-left as
## seen from the side the normal points to, UVs Godot-style (v down).
func _quad(m: ShaderMaterial, tl: Vector3, tr: Vector3, br: Vector3, bl: Vector3, n: Vector3,
		uv_tl := Vector2(0, 0), uv_br := Vector2(1, 1)) -> void:
	var st := _surface(m)
	var uv_tr := Vector2(uv_br.x, uv_tl.y)
	var uv_bl := Vector2(uv_tl.x, uv_br.y)
	for p in [[tl, uv_tl], [tr, uv_tr], [br, uv_br], [tl, uv_tl], [br, uv_br], [bl, uv_bl]]:
		st.set_normal(n)
		st.set_uv(p[1])
		st.add_vertex(p[0])


## THREE.BoxGeometry(w,h,d) centred at `c`, materials [px,nx,py,ny,pz,nz].
func _box(c: Vector3, sz: Vector3, mats: Array, rot_y := 0.0) -> void:
	var hx := sz.x * 0.5
	var hy := sz.y * 0.5
	var hz := sz.z * 0.5
	var b := Basis(Vector3.UP, rot_y)
	var P := func(x: float, y: float, z: float) -> Vector3: return c + b * Vector3(x, y, z)
	var N := func(v: Vector3) -> Vector3: return b * v
	# +x face, seen from +x: left is +z
	_quad(mats[0], P.call(hx, hy, hz), P.call(hx, hy, -hz), P.call(hx, -hy, -hz), P.call(hx, -hy, hz), N.call(Vector3.RIGHT))
	# -x face, seen from -x: left is -z
	_quad(mats[1], P.call(-hx, hy, -hz), P.call(-hx, hy, hz), P.call(-hx, -hy, hz), P.call(-hx, -hy, -hz), N.call(Vector3.LEFT))
	# +y face, seen from above: three maps u along +x, v (top) toward -z
	_quad(mats[2], P.call(-hx, hy, -hz), P.call(hx, hy, -hz), P.call(hx, hy, hz), P.call(-hx, hy, hz), N.call(Vector3.UP))
	# -y face, seen from below: u along +x, top toward +z
	_quad(mats[3], P.call(-hx, -hy, hz), P.call(hx, -hy, hz), P.call(hx, -hy, -hz), P.call(-hx, -hy, -hz), N.call(Vector3.DOWN))
	# +z face, seen from +z: left is -x
	_quad(mats[4], P.call(-hx, hy, hz), P.call(hx, hy, hz), P.call(hx, -hy, hz), P.call(-hx, -hy, hz), N.call(Vector3.BACK))
	# -z face, seen from -z: left is +x
	_quad(mats[5], P.call(hx, hy, -hz), P.call(-hx, hy, -hz), P.call(-hx, -hy, -hz), P.call(hx, -hy, -hz), N.call(Vector3.FORWARD))


## A PlaneGeometry(w,h) standing upright, rotated about Y by `ry` in three's
## sense, facing +z before rotation.
func _plane(m: ShaderMaterial, center: Vector3, w: float, h: float, ry: float) -> void:
	var b := Basis(Vector3.UP, ry)
	var hw := w * 0.5
	var hh := h * 0.5
	_quad(m, center + b * Vector3(-hw, hh, 0), center + b * Vector3(hw, hh, 0),
		center + b * Vector3(hw, -hh, 0), center + b * Vector3(-hw, -hh, 0), b * Vector3.BACK)


func _commit() -> void:
	var mesh := ArrayMesh.new()
	for m in _st:
		var st: SurfaceTool = _st[m]
		st.commit(mesh)
		mesh.surface_set_material(mesh.get_surface_count() - 1, m)
	_st.clear()
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_root.add_child(mi)


# ── build ────────────────────────────────────────────────────────────────────

func build(g: NavGrid, th: Dictionary, art: Dictionary, furn: Dictionary) -> void:
	grid = g
	theme = th
	item_art = art
	furniture = furn
	rebuild()


func rebuild() -> void:
	dirty = false
	if _root:
		_root.queue_free()
	_root = Node3D.new()
	add_child(_root)
	_mats.clear()
	_people.clear()
	_st.clear()

	var fog := Color(theme.get("fog", "#040804"))
	var env: Environment = (get_node("Env") as WorldEnvironment).environment
	env.background_color = fog
	_lights = {
		"ambient_color": Color("#3a463a"), "ambient_intensity": 2.2,
		"ambient2_color": Color.BLACK, "ambient2_intensity": 0.0,
		"hemi_sky": Color("#7a8a98"), "hemi_ground": Color("#181810"), "hemi_intensity": 1.6,
		"point_count": 1,
		"point_color": PackedColorArray([Color("#ffe6b0")]),
		"point_intensity": PackedFloat32Array([18.0]),
		"point_distance": PackedFloat32Array([7.0]),
		"point_decay": PackedFloat32Array([2.0]),
		"fog_color": fog, "fog_near": 1.2, "fog_far": 8.5,
	}
	if grid.has_world_map():
		_lights["fog_near"] = 5.5
		_lights["fog_far"] = 26.0
		_lights["ambient2_color"] = Color("#b8c4ad")
		_lights["ambient2_intensity"] = 1.35
		_build_world_mapped()
	else:
		_build_flat()
	_commit()
	_build_hand()


func _build_flat() -> void:
	var rows := grid.rows()
	var cols := 0
	for r in rows:
		cols = maxi(cols, grid.row_len(r))
	var wall_top := 1.0

	var floor_tex := _tex("floor_%s_%s_%s" % [theme["floorTex"], _safe(theme["floor1"]), _safe(theme["floor2"])])
	var ceil_tex := _tex("ceil_%s_%s" % [theme["ceilTex"], _safe(theme["ceil"])])
	var mat_cap := _mat(1, Color(theme["ceil"]))
	var wall_mats: Array = []
	for wv in 4:
		var m_n := _mat(1, Color.WHITE, _wall_tex(theme["wallN"], wv))
		var m_e := _mat(1, Color.WHITE, _wall_tex(theme["wallE"], wv))
		var m_top := _mat(1, _lin(0.78), _wall_tex(theme["wallN"], wv))
		wall_mats.append([m_e, m_e, m_top, mat_cap, m_n, m_n])

	# floor & ceiling
	var fm := _mat(1, Color.WHITE, floor_tex, true)
	_quad(fm, Vector3(0, 0, 0), Vector3(cols, 0, 0), Vector3(cols, 0, rows), Vector3(0, 0, rows), Vector3.UP,
		Vector2(0, 0), Vector2(cols, rows))
	var cm := _mat(1, Color.WHITE, ceil_tex, true)
	_quad(cm, Vector3(0, wall_top, rows), Vector3(cols, wall_top, rows), Vector3(cols, wall_top, 0), Vector3(0, wall_top, 0), Vector3.DOWN,
		Vector2(0, -rows), Vector2(cols, 0))

	# walls, full and low
	for r in rows:
		for c in grid.row_len(r):
			var h := NavGrid.wall_height(grid.sym(r, c))
			var variant := (r * 7 + c * 13) & 3
			if h >= 1.0:
				_box(Vector3(c + 0.5, wall_top * 0.5, r + 0.5), Vector3(1, wall_top, 1), wall_mats[variant])
			elif h > 0.0:
				_box(Vector3(c + 0.5, h * 0.5, r + 0.5), Vector3(1, h, 1), wall_mats[variant])
	# implicit boundary ring
	for er in range(-1, rows + 1):
		for ec in range(-1, cols + 1):
			if er != -1 and er != rows and ec != -1 and ec != cols:
				continue
			var ev := (er * 7 + ec * 13) & 3
			_box(Vector3(ec + 0.5, wall_top * 0.5, er + 0.5), Vector3(1, wall_top, 1), wall_mats[ev])

	# doors & exits
	for dr in rows:
		for dc in grid.row_len(dr):
			var s := grid.sym(dr, dc)
			if DOOR_SYMS.has(s):
				_mount_door(dr, dc, DOOR_SYMS[s])
			elif s == "L":
				if not _mount_door(dr, dc, "EXIT"):
					_add_cross(_glyph_rec("L"), dc + 0.5, dr + 0.5, 0.55, -1, -1)

	# stair openings
	for sr in rows:
		for sc in grid.row_len(sr):
			var ss := grid.sym(sr, sc)
			if ss != "S" and ss != "v":
				continue
			var side := _adj_wall(sr, sc)
			if side != "":
				var stex := _tex("stair_%s_%s" % [_safe(theme["wallN"]), "d" if ss == "v" else "u"])
				if stex:
					var smt := _mat(1, Color.WHITE, stex, true)
					var xf := _mount_xf(sr, sc, side, 0.485)
					_plane(smt, Vector3(xf.x, 0.5, xf.z), 1, 1, xf.ry)
			var smat := _mat(1, Color(theme["wallE"]))
			for st in 3:
				var sh := 0.16 * (st + 1)
				_box(Vector3(sc + 0.5, sh * 0.5, sr + 0.18 + st * 0.28), Vector3(0.9, sh, 0.28), [smat, smat, smat, smat, smat, smat])

	# props
	for ir in rows:
		for ic in grid.row_len(ir):
			var isym := grid.sym(ir, ic)
			if DOOR_SYMS.has(isym) or isym == "S" or isym == "v" or isym == "L":
				continue
			if not GLYPH.has(isym):
				continue
			var gl: Dictionary = GLYPH[isym]
			if gl.get("person", false):
				_add_person(_person_rec(gl.get("color", "#7fdf7f")), ic + 0.5, ir + 0.5, 0.72)
				continue
			var key := "%d,%d" % [ir, ic]
			if item_art.has(key):
				var ak: String = item_art[key]
				var sprh: float = gl.get("sprH", 0.45) + 0.06
				if WALL_ART.has(ak):
					_add_wall_art(_sprite_rec(ak), ir, ic, sprh)
				elif not _add_low_poly(ak, ir, ic):
					_add_cross(_sprite_rec(ak), ic + 0.5, ir + 0.5, sprh, ir, ic)
			else:
				_add_cross(_glyph_rec(isym), ic + 0.5, ir + 0.5, minf(0.62, gl.get("sprH", 0.5) * 0.75), ir, ic)
	for fk in furniture:
		var p := String(fk).split(",")
		var reg: Dictionary = FURNITURE.get(furniture[fk], {})
		if reg.is_empty():
			continue
		_add_backed(_sprite_rec(reg["art"]), int(p[0]), int(p[1]), reg["sprH"])


func _is_wall(r: int, c: int) -> bool:
	if not grid.in_bounds(r, c):
		return true
	return NavGrid.wall_height(grid.sym(r, c)) >= 1.0


func _adj_wall(r: int, c: int) -> String:
	if _is_wall(r - 1, c):
		return "N"
	if _is_wall(r + 1, c):
		return "S"
	if _is_wall(r, c - 1):
		return "W"
	if _is_wall(r, c + 1):
		return "E"
	return ""


## rcDoorMountSide(grid, r, c)
func _door_mount_side(r: int, c: int) -> String:
	var sides := [["W", 0, -1, 0, 1], ["E", 0, 1, 0, -1], ["N", -1, 0, 1, 0], ["S", 1, 0, -1, 0]]
	for s in sides:
		if _is_wall(r + s[1], c + s[2]) and not _is_wall(r + s[3], c + s[4]):
			return s[0]
	for s in sides:
		if _is_wall(r + s[1], c + s[2]):
			return s[0]
	return "W"


func _mount_xf(r: int, c: int, side: String, off: float) -> Dictionary:
	var fx := c + 0.5
	var fz := r + 0.5
	var ry := 0.0
	match side:
		"N":
			fz = r + (0.5 - off)
			ry = 0.0
		"S":
			fz = r + 0.5 + off
			ry = PI
		"W":
			fx = c + (0.5 - off)
			ry = PI / 2.0
		"E":
			fx = c + 0.5 + off
			ry = -PI / 2.0
	return {"x": fx, "z": fz, "ry": ry}


func _mount_door(r: int, c: int, label: String) -> bool:
	var side := _door_mount_side(r, c)
	if side == "":
		return false
	var dtex := _tex("door_%s_%s" % [_safe(theme["wallN"]), label if label != "" else "none"])
	var dmat := _mat(1, Color.WHITE, dtex) if dtex else _mat(1, Color("#5a3a1e"))
	var xf := _mount_xf(r, c, side, 0.485)
	_plane(dmat, Vector3(xf.x, 0.5, xf.z), 1, 1, xf.ry)
	return true


func _sprite_rec(key: String) -> Dictionary:
	var tex := _tex("spr_" + key)
	if tex == null:
		return {}
	return {"tex": tex, "aspect": float(tex.get_width()) / float(tex.get_height()), "nearest": true}


func _person_rec(color: String) -> Dictionary:
	var tex := _tex("person_" + _safe(color))
	if tex == null:
		return {}
	return {"tex": tex, "aspect": 0.5, "nearest": true}


func _glyph_rec(sym: String) -> Dictionary:
	var tex := _tex("glyph_%d" % sym.unicode_at(0))
	if tex == null:
		return {}
	return {"tex": tex, "aspect": 96.0 / 128.0, "nearest": false, "soft": true}


func _sprite_mat(rec: Dictionary) -> ShaderMaterial:
	# MeshBasicMaterial({map, transparent:true, alphaTest:.5, side:DoubleSide, fog:true})
	return _mat(0, Color.WHITE, rec["tex"], rec.get("nearest", true), Vector2.ONE, 0.5, rec.get("soft", false))


func _base_y(r: int, c: int) -> float:
	if r < 0 or not grid.has_floor_h():
		return 0.0
	var v: Variant = grid.floor_at(r, c)
	return float(v) if v != null else 0.0


func _add_cross(rec: Dictionary, wx: float, wz: float, h: float, r: int, c: int) -> void:
	if rec.is_empty():
		return
	var w: float = h * rec["aspect"]
	var y0 := _base_y(r, c)
	var m := _sprite_mat(rec)
	_plane(m, Vector3(wx, y0 + h * 0.5 + 0.001, wz), w, h, PI / 4.0)
	_plane(m, Vector3(wx, y0 + h * 0.5 + 0.001, wz), w, h, -PI / 4.0)


func _add_backed(rec: Dictionary, r: int, c: int, h: float) -> void:
	if rec.is_empty():
		return
	var w := minf(0.96, h * float(rec["aspect"]))
	var side := _adj_wall(r, c)
	var y0 := _base_y(r, c)
	var m := _sprite_mat(rec)
	if side != "":
		var xf := _mount_xf(r, c, side, 0.34)
		_plane(m, Vector3(xf.x, y0 + h * 0.5 + 0.001, xf.z), w, h, xf.ry)
	else:
		_plane(m, Vector3(c + 0.5, y0 + h * 0.5 + 0.001, r + 0.5), w, h, ((r * 31 + c * 17) % 4) * (PI / 2.0))


func _add_wall_art(rec: Dictionary, r: int, c: int, h: float) -> void:
	if rec.is_empty():
		return
	var side := _adj_wall(r, c)
	if side == "":
		_add_cross(rec, c + 0.5, r + 0.5, h, r, c)
		return
	var w: float = h * rec["aspect"]
	var xf := _mount_xf(r, c, side, 0.485)
	var y0 := _base_y(r, c)
	_plane(_sprite_mat(rec), Vector3(xf.x, y0 + 0.62, xf.z), w, h, xf.ry)


func _add_person(rec: Dictionary, wx: float, wz: float, h: float) -> void:
	if rec.is_empty():
		return
	var w: float = h * rec["aspect"]
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var m := _sprite_mat(rec)
	var hw := w * 0.5
	var hh := h * 0.5
	var pts := [[Vector3(-hw, hh, 0), Vector2(0, 0)], [Vector3(hw, hh, 0), Vector2(1, 0)], [Vector3(hw, -hh, 0), Vector2(1, 1)],
		[Vector3(-hw, hh, 0), Vector2(0, 0)], [Vector3(hw, -hh, 0), Vector2(1, 1)], [Vector3(-hw, -hh, 0), Vector2(0, 1)]]
	for p in pts:
		st.set_normal(Vector3.BACK)
		st.set_uv(p[1])
		st.add_vertex(p[0])
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = m
	mi.position = Vector3(wx, h * 0.5 + 0.001, wz)
	_root.add_child(mi)
	_people.append(mi)


# ── low-poly evidence (addLowPolyItem) ──────────────────────────────────────

func _std(color_hex: int, rough := 0.78) -> ShaderMaterial:
	var m := _mat(2, Color.hex(color_hex << 8 | 0xff))
	m.set_shader_parameter("roughness", rough)
	m.set_shader_parameter("metalness", 0.04)
	return m


func _add_low_poly(kind: String, r: int, c: int) -> bool:
	var parts := LowPoly.parts(kind)
	if parts.is_empty():
		return false
	var seed := (r * 31 + c * 17) % 7
	var group := Transform3D(Basis(Vector3.UP, (seed / 7.0) * TAU).scaled(Vector3(0.92, 0.92, 0.92)), Vector3(c + 0.5, _base_y(r, c) + 0.015, r + 0.5))
	for part in parts:
		var mat := _std(part["color"], part.get("rough", 0.78))
		var st := _surface(mat)
		var local := Transform3D(Basis.from_euler(part.get("rot", Vector3.ZERO), EULER_ORDER_XYZ), part.get("pos", Vector3.ZERO))
		var xf := group * local
		var arrays: Array = part["arrays"]
		var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
		var norms: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL]
		for i in verts.size():
			st.set_normal((xf.basis * norms[i]).normalized())
			st.set_uv(Vector2.ZERO)
			st.add_vertex(xf * verts[i])
	return true


# ── world-mapped factory (_buildWorldMapped) ─────────────────────────────────

func _build_world_mapped() -> void:
	var floor_mat := _mat(1, Color(theme.get("floor2", "#172019")))
	var wall_mat := _mat(1, Color(theme.get("wallN", "#3a4a2a")))
	var wall_side := _mat(1, Color(theme.get("wallE", "#2e3a1e")))
	var ceil_mat := _mat(1, Color(theme.get("ceil", "#11130d")))
	var seen_floor := {}
	var seen_wall := {}
	for r in grid.rows():
		for c in grid.row_len(r):
			var p: Variant = grid.wm_cell(r, c)
			if p == null:
				continue
			var sym := grid.sym(r, c)
			var k := "%.2f/%.2f/%.2f" % [p["x"], p["y"], p["z"]]
			if NavGrid.wall_height(sym) >= 1.0:
				if not seen_wall.has(k):
					seen_wall[k] = true
					_box(Vector3(p["x"], p["y"] + 1.1, p["z"]), Vector3(0.96, 2.2, 0.96), [wall_mat, wall_side, ceil_mat, ceil_mat, wall_mat, wall_side])
				continue
			if not seen_floor.has(k):
				seen_floor[k] = true
				_box(Vector3(p["x"], p["y"] - 0.05, p["z"]), Vector3(0.96, 0.10, 0.96), [floor_mat, floor_mat, floor_mat, floor_mat, floor_mat, floor_mat])
			var key := "%d,%d" % [r, c]
			if GLYPH.has(sym) and not item_art.has(key):
				var gl: Dictionary = GLYPH[sym]
				if gl.get("person", false):
					_add_cross_wm(_person_rec(gl.get("color", "#7fdf7f")), p, 0.72, true)
				elif sym != "S" and sym != "v":
					_add_cross_wm(_glyph_rec(sym), p, minf(0.58, gl.get("sprH", 0.5) * 0.72), false)
	for rr in grid.rows():
		for cc in range(grid.row_len(rr) - 1):
			if NavGrid.wall_height(grid.sym(rr, cc)) >= 1.0 or NavGrid.wall_height(grid.sym(rr, cc + 1)) >= 1.0:
				continue
			var a: Variant = grid.wm_cell(rr, cc)
			var b: Variant = grid.wm_cell(rr, cc + 1)
			if a == null or b == null:
				continue
			var dx: float = b["x"] - a["x"]
			var dz: float = b["z"] - a["z"]
			var ln := sqrt(dx * dx + dz * dz)
			if ln < 0.05 or ln > 1.55:
				continue
			_box(Vector3((a["x"] + b["x"]) / 2.0, (a["y"] + b["y"]) / 2.0 - 0.05, (a["z"] + b["z"]) / 2.0),
				Vector3(ln + 0.12, 0.10, 0.72), [floor_mat, floor_mat, floor_mat, floor_mat, floor_mat, floor_mat], -atan2(dz, dx))
	for sf in 5:
		var sy := sf * 3.0
		_box(Vector3(11.0, sy + 1.35, 6.95), Vector3(5.9, 2.7, 0.10), [wall_side, wall_side, wall_side, wall_side, wall_side, wall_side])
		_box(Vector3(11.0, sy + 1.35, 9.05), Vector3(5.9, 2.7, 0.10), [wall_side, wall_side, wall_side, wall_side, wall_side, wall_side])
		_box(Vector3(14.0, sy + 1.35, 8.0), Vector3(0.10, 2.7, 2.2), [wall_mat, wall_mat, wall_mat, wall_mat, wall_mat, wall_mat])
		_box(Vector3(3.5, sy + 2.72, 2.5), Vector3(7, 0.06, 5), [ceil_mat, ceil_mat, ceil_mat, ceil_mat, ceil_mat, ceil_mat])
	for ik in item_art:
		var q := String(ik).split(",")
		var ip: Variant = grid.wm_cell(int(q[0]), int(q[1]))
		if ip != null:
			_add_cross_wm(_sprite_rec(item_art[ik]), ip, 0.48, false)
	for fk in furniture:
		var z := String(fk).split(",")
		var fp: Variant = grid.wm_cell(int(z[0]), int(z[1]))
		var reg: Dictionary = FURNITURE.get(furniture[fk], {})
		if fp != null and not reg.is_empty():
			_add_cross_wm(_sprite_rec(reg["art"]), fp, reg.get("sprH", 0.65), false)


func _add_cross_wm(rec: Dictionary, p: Dictionary, h: float, person: bool) -> void:
	if rec.is_empty():
		return
	var w: float = h * rec["aspect"]
	var center := Vector3(p["x"], p["y"] + h * 0.5 + 0.01, p["z"])
	if person:
		_add_person(rec, p["x"], p["z"], h)
		_people[_people.size() - 1].position = center
		return
	var m := _sprite_mat(rec)
	_plane(m, center, w, h, PI / 4.0)
	_plane(m, center, w, h, -PI / 4.0)


# ── hand ─────────────────────────────────────────────────────────────────────

func _build_hand() -> void:
	if _hand_idx.is_empty():
		var f := FileAccess.open("res://data/hand.json", FileAccess.READ)
		if f == null:
			return
		var d: Dictionary = JSON.parse_string(f.get_as_text())
		var pos: Array = d["pos"]
		var dl: Array = d["del"]
		var nr: Array = d["nrm"]
		var uv: Array = d["uv"]
		for i in range(0, pos.size(), 3):
			_hand_base.append(Vector3(pos[i], pos[i + 1], pos[i + 2]))
			_hand_delta.append(Vector3(dl[i], dl[i + 1], dl[i + 2]))
			_hand_normals.append(Vector3(nr[i], nr[i + 1], nr[i + 2]))
		for i in range(0, uv.size(), 2):
			# three's flipY: v measured from the bottom of the image
			_hand_uvs.append(Vector2(uv[i], 1.0 - uv[i + 1]))
		for i in (d["idx"] as Array):
			_hand_idx.append(int(i))
		_hand_anchor_x = d["anchorX"]
		_hand_tune = d["tune"]
	_hand = MeshInstance3D.new()
	var m := ShaderMaterial.new()
	m.shader = OVERLAY
	m.render_priority = 100
	m.set_shader_parameter("mode", 0)
	m.set_shader_parameter("color", Color.WHITE)
	m.set_shader_parameter("map_nearest", load("res://assets/models/hand_skin.png"))
	m.set_shader_parameter("map_mode", 2)
	m.set_shader_parameter("fog_enabled", true)
	m.set_shader_parameter("fog_color", _lights["fog_color"])
	m.set_shader_parameter("fog_near", _lights["fog_near"])
	m.set_shader_parameter("fog_far", _lights["fog_far"])
	_hand.material_override = m
	_hand.extra_cull_margin = 16384.0
	_hand_inf = -1.0
	_update_hand_mesh(0.0)
	add_child(_hand)


func _update_hand_mesh(inf: float) -> void:
	var verts := PackedVector3Array()
	verts.resize(_hand_base.size())
	for i in _hand_base.size():
		verts[i] = _hand_base[i] + _hand_delta[i] * inf
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = _hand_normals
	arrays[Mesh.ARRAY_TEX_UV] = _hand_uvs
	arrays[Mesh.ARRAY_INDEX] = _hand_idx
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	_hand.mesh = mesh


func _follow_hand(bob: float, move: float) -> void:
	if _hand == null:
		return
	var t := Time.get_ticks_msec() / 1000.0
	var inf := (0.5 - 0.5 * cos(t * PI)) * float(_hand_tune.get("breathe", 1.0))
	if absf(inf - _hand_inf) > 0.004:
		_hand_inf = inf
		_update_hand_mesh(inf)
	_hand_mv += (move - _hand_mv) * 0.15
	var sm := _hand_mv
	var aspect := camera.get_viewport().get_visible_rect().size.aspect() if camera.get_viewport() else 16.0 / 9.0
	var aoff := _hand_anchor_x * (aspect / (4.0 / 3.0) - 1.0)
	var sx := 0.0
	var sy := 0.0
	if sm > 0.002:
		sx = sin(_bob_phase * 0.5) * float(_hand_tune.get("swayX", 0.012)) * sm
		sy = -bob * float(_hand_tune.get("lagY", 0.55))
	_hand.global_transform = Transform3D(camera.global_basis, camera.global_position + camera.global_basis * Vector3(aoff + sx, sy, 0))


# ── per-frame ────────────────────────────────────────────────────────────────

## _wmPoint(grid, px, py): interpolate only along the axis being crossed, and
## never across a logical adjacency that is not physically adjacent.
func _wm_point(px: float, py: float) -> Vector3:
	var r := int(floor(py))
	var c := int(floor(px))
	var fx := px - c
	var fy := py - r
	var p: Variant = grid.wm_cell(r, c)
	if p == null:
		return Vector3(px, 0, py)
	var ox := fx - 0.5
	var oy := fy - 0.5
	var use_x := absf(ox) >= absf(oy)
	var n: Variant = null
	var t := 0.0
	if use_x:
		n = grid.wm_cell(r, c + (1 if ox >= 0 else -1))
		t = minf(1.0, absf(ox) * 2.0)
	else:
		n = grid.wm_cell(r + (1 if oy >= 0 else -1), c)
		t = minf(1.0, absf(oy) * 2.0)
	var pv := Vector3(p["x"], p["y"], p["z"])
	if n == null:
		return pv
	var nv := Vector3(n["x"], n["y"], n["z"])
	if pv.distance_to(nv) > 1.65:
		return pv
	return pv.lerp(nv, t)


func render(px: float, py: float, angle: float, pitch: float) -> void:
	if dirty:
		rebuild()
	var bob := 0.0
	var mv := 0.0
	if _last_px != INF:
		var d := Vector2(px - _last_px, py - _last_py).length()
		if d > 0.0004:
			_bob_phase += d * 9.0
			mv = minf(1.0, d * 70.0)
			bob = sin(_bob_phase) * 0.015 * mv
	_last_px = px
	_last_py = py
	var eye := Vector3.ZERO
	var look := Vector3.ZERO
	if grid.has_world_map():
		var wp := _wm_point(px, py)
		var ap := _wm_point(px + cos(angle) * 0.18, py + sin(angle) * 0.18)
		eye = Vector3(wp.x, wp.y + 0.5 + bob, wp.z)
		var dxz := Vector2(ap.x - wp.x, ap.z - wp.z)
		var dl := dxz.length()
		if dl == 0.0:
			dl = 1.0
		look = Vector3(eye.x + dxz.x / dl, eye.y + pitch * 1.1, eye.z + dxz.y / dl)
	else:
		eye = Vector3(px, 0.5 + bob, py)
		look = Vector3(px + cos(angle), eye.y + pitch * 1.1, py + sin(angle))
	eye_world = eye
	if not eye.is_equal_approx(look):
		camera.look_at_from_position(eye, look, Vector3.UP)
	var lp := Vector3(eye.x, eye.y + 0.12, eye.z)
	for m in _mats:
		m.set_shader_parameter("point_pos", PackedVector3Array([lp]))
	_follow_hand(bob, mv)
	for person in _people:
		person.rotation.y = atan2(eye.x - person.position.x, eye.z - person.position.z)
