class_name DriveWorld
extends Node3D
## The night city of minigame/clivesbuick.js: an 18x18 block grid of ASCII-lit
## towers with churches and corner stores scattered through it, a street grid
## with lamps, a decorative skyline ring, and the glowing red destination.
##
## Everything is the bundle's, unit for unit — pitch, random bands, materials,
## lights and the volumetric height fog — drawn through the three.js material
## shader (shaders/three_common.gdshaderinc). The textures were painted by the
## bundle's own canvas routines (tools/render_drive_textures.js).

const LIT := preload("res://shaders/three_lit.gdshader")
const LIT_ALPHA := preload("res://shaders/three_lit_alpha.gdshader")
const POINTS := preload("res://shaders/three_points.gdshader")
const TEX_DIR := "res://assets/images/drive/"
const TITLE_TEX_DIR := "res://assets/images/title/"

const PITCH := 34.0
const HE := 11.0                ## building half-extent
const N := 18                   ## NxN blocks
const ROAD := PITCH - HE * 2.0  ## 12-wide streets
const FACADE_POOL := 16
const SKYLINE_POOL := 4

const NIGHT := Color("#05070d")
const FOG_DENSITY := 0.022

var buildings: Array = []       ## AABBs {x0,x1,z0,z1,kind,rot,height,spire}
var street_centers: Array = []
var city_min := 0.0
var city_max := 0.0
var goal := Vector3.ZERO
var offset := 0.0
var span := 0.0

var _rng := RandomNumberGenerator.new()
var _m := ThreeMesh.new()
var _mats: Array[ShaderMaterial] = []
var _tex_cache := {}
var _shared := {}
var _lights := {}
var _goal_ring: ShaderMaterial = null
var _goal_disc: ShaderMaterial = null
var _goal_beam: ShaderMaterial = null
var _goal_light_index := -1


func build(goal_key: String) -> void:
	_rng.randomize()
	offset = -((N - 1) / 2.0) * PITCH
	span = N * PITCH + PITCH

	for k in range(N + 1):
		street_centers.append(offset - PITCH / 2.0 + k * PITCH)
	city_min = street_centers[0] - ROAD / 2.0
	city_max = street_centers[street_centers.size() - 1] + ROAD / 2.0
	goal = _choose_goal(goal_key)

	_build_environment()
	_collect_lights()
	_build_ground()
	_build_blocks()
	_build_roads()
	_build_skyline()
	_build_goal()
	_m.commit(self)
	_apply_lights()


## scene.background = 0x05070d; the fog is per-material, in the shader.
func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = NIGHT
	env.ambient_light_source = Environment.AMBIENT_SOURCE_DISABLED
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)


# ── lighting ────────────────────────────────────────────────────────────────

## Ten amber street lamps on random intersections, the goal's red lamp, and the
## car's tail light and headlights, which the session moves each frame.
func _collect_lights() -> void:
	var pos := PackedVector3Array()
	var col := PackedColorArray()
	var intensity := PackedFloat32Array()
	var dist := PackedFloat32Array()
	var decay := PackedFloat32Array()
	var poles: Array = []
	for k in 10:
		var a: float = street_centers[_rng.randi() % street_centers.size()]
		var b: float = street_centers[_rng.randi() % street_centers.size()]
		pos.append(Vector3(a, 7, b))
		col.append(Color("#ffb24d"))
		intensity.append(26.0)
		dist.append(40.0)
		decay.append(2.0)
		poles.append(Vector2(a, b))
	_shared["poles"] = poles
	# the goal lamp pulses, so the session updates this slot
	_goal_light_index = pos.size()
	pos.append(Vector3(goal.x, 7, goal.z))
	col.append(Color("#ff3322"))
	intensity.append(40.0)
	dist.append(70.0)
	decay.append(2.0)
	# the car's tail light
	pos.append(Vector3.ZERO)
	col.append(Color("#ff2a1a"))
	intensity.append(5.0)
	dist.append(9.0)
	decay.append(2.0)
	_lights = {
		"ambient_color": Color("#223043"), "ambient_intensity": 0.9,
		"dir_color": Color("#9fb4e6"), "dir_intensity": 0.6,
		"dir_to_light": Vector3(-50, 90, -40).normalized(),
		"point_count": pos.size(),
		"point_pos": pos, "point_color": col, "point_intensity": intensity,
		"point_distance": dist, "point_decay": decay,
		"spot_count": 2,
		"spot_color": PackedColorArray([Color("#fff2cc"), Color("#fff2cc")]),
		"spot_intensity": PackedFloat32Array([90.0, 90.0]),
		"spot_pos": PackedVector3Array([Vector3.ZERO, Vector3.ZERO]),
		"spot_dir": PackedVector3Array([Vector3.FORWARD, Vector3.FORWARD]),
		"spot_distance": PackedFloat32Array([70.0, 70.0]),
		"spot_decay": PackedFloat32Array([1.3, 1.3]),
		"spot_cone_cos": PackedFloat32Array([cos(PI / 7.0), cos(PI / 7.0)]),
		"spot_penumbra_cos": PackedFloat32Array([cos(PI / 7.0 * 0.55), cos(PI / 7.0 * 0.55)]),
		# fog_enabled stays per-material: the skyline and the goal are fog-exempt
		"fog_mode": 1, "fog_color": NIGHT, "fog_density": FOG_DENSITY,
	}


func _apply_lights() -> void:
	for m in _mats:
		for k in _lights:
			m.set_shader_parameter(k, _lights[k])


## The session drives the car's lights and the goal pulse through here.
func set_light(key: String, value: Variant) -> void:
	_lights[key] = value
	for m in _mats:
		m.set_shader_parameter(key, value)


func goal_light_index() -> int:
	return _goal_light_index


## Read one light uniform back (the car moves its own slots).
func light(key: String) -> Variant:
	return _lights[key]


## The goal's ring, disc, beam and lamp breathe together, 0.004 rad/ms.
func pulse_goal(now_ms: float) -> void:
	var p := 0.6 + 0.4 * sin(now_ms * 0.004)
	# Color.setRGB writes linear values, so encode them for the shader
	_goal_ring.set_shader_parameter("color", Color(p, 0.10 * p, 0.06 * p).linear_to_srgb())
	_goal_beam.set_shader_parameter("color", Color(Color("#ff2a1a"), 0.12 + 0.14 * p))
	_goal_disc.set_shader_parameter("color", Color(Color("#ff2a1a"), 0.10 + 0.12 * p))
	var arr: PackedFloat32Array = _lights["point_intensity"]
	arr[_goal_light_index] = 22.0 + 24.0 * p
	set_light("point_intensity", arr)


# ── materials ───────────────────────────────────────────────────────────────

func _tex(name: String, dir := TEX_DIR) -> Texture2D:
	var key := dir + name
	if _tex_cache.has(key):
		return _tex_cache[key]
	var tex: Texture2D = null
	var path := dir + name + ".png"
	if ResourceLoader.exists(path):
		var img: Image = (load(path) as Texture2D).get_image()
		if img.is_compressed():
			img.decompress()
		img.generate_mipmaps()
		tex = ImageTexture.create_from_image(img)
	_tex_cache[key] = tex
	return tex


## mode 0 basic, 2 standard. Unlike the title flyover's, every canvas texture
## in the drive is tagged SRGBColorSpace, so all of them decode.
func _mat(mode: int, color: Color, roughness := 1.0, metalness := 0.0,
		tex: Texture2D = null, map_mode := 3, transparent := false, fog := true) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = LIT_ALPHA if transparent else LIT
	m.set_shader_parameter("mode", mode)
	m.set_shader_parameter("color", color)
	m.set_shader_parameter("roughness", roughness)
	m.set_shader_parameter("metalness", metalness)
	if tex:
		m.set_shader_parameter("map_mode", map_mode)
		match map_mode:
			1: m.set_shader_parameter("map_linear", tex)
			2: m.set_shader_parameter("map_nearest", tex)
			3: m.set_shader_parameter("map_nearest_mip", tex)
	else:
		m.set_shader_parameter("map_mode", 0)
	m.set_shader_parameter("fog_enabled", fog)
	_mats.append(m)
	return m


func materials() -> Array[ShaderMaterial]:
	return _mats


## Materials built after the world (the car's) still need its lights and fog.
func register_material(m: ShaderMaterial) -> void:
	_mats.append(m)
	for k in _lights:
		m.set_shader_parameter(k, _lights[k])


# ── world ───────────────────────────────────────────────────────────────────

func _build_ground() -> void:
	_m.ground_plane(_mat(2, Color("#070a0f")), Vector3.ZERO, span * 2.6, span * 2.6)


func _build_blocks() -> void:
	var facades: Array[ShaderMaterial] = []
	for fi in FACADE_POOL:
		var tex := _tex("facade_%02d" % fi)
		var m := _mat(2, Color("#0c1018"), 0.92, 0.05, tex)
		m.set_shader_parameter("emissive_color", Color.WHITE)
		m.set_shader_parameter("emissive_intensity", 0.85)
		m.set_shader_parameter("emissive_from_map", true)
		facades.append(m)
	var spire_mat := _mat(2, Color("#0a0e14"))
	var kit := {
		"stone": _mat(2, Color("#151a26"), 0.95),
		"trim": _mat(2, Color("#05070c")),
		"warm": _mat(0, Color("#b9873a")),
		"pale": _mat(0, Color("#9fc4a8")),
	}
	var spire_tips := PackedVector3Array()

	for i in N:
		for j in N:
			var cx: float = offset + i * PITCH
			var cz: float = offset + j * PITCH
			if _rng.randf() < 0.05:
				# landmark lot: church or corner store
				var is_church := _rng.randf() < 0.32
				var f := _rng.randi() % 4
				var turn := f * PI / 2.0
				if is_church:
					CityKit.church(_m, kit, Vector3(cx, 0, cz), turn)
				else:
					var name: String = CityKit.SIGN_NAMES[_rng.randi() % CityKit.SIGN_NAMES.size()]
					var sign_mat := _mat(0, Color.WHITE, 1.0, 0.0,
						_tex("sign_%s_%d" % [name, _rng.randi() % 4], TITLE_TEX_DIR), 1, true)
					CityKit.grocery(_m, kit, Vector3(cx, 0, cz), turn, sign_mat,
						Vector2(-5.0 + _rng.randf() * 10.0, -3.0 + _rng.randf() * 5.0))
				var hx := 6.0 if is_church else 10.0
				var hz := 10.0 if is_church else 8.0
				if f & 1:
					var t := hx
					hx = hz
					hz = t
				buildings.append({
					"x0": cx - hx, "x1": cx + hx, "z0": cz - hz, "z1": cz + hz,
					"kind": "church" if is_church else "grocery", "rot": f,
					"height": 25.0 if is_church else 8.0, "spire": is_church,
				})
				continue

			var h: float = 12.0 + pow(_rng.randf(), 1.8) * 52.0
			var face: ShaderMaterial = facades[_rng.randi() % FACADE_POOL]
			_m.box(face, face, Vector3(cx, h / 2.0, cz), Vector3(HE * 2.0, h, HE * 2.0))
			var has_spire := false
			if h > 38.0 and _rng.randf() < 0.3:
				var sh: float = 6.0 + _rng.randf() * 14.0
				_m.cone4(spire_mat, Vector3(cx, h, cz), Vector3(2.4, sh, 2.4), 0.5, 0.0)
				spire_tips.append(Vector3(cx, h + sh, cz))
				has_spire = true
			buildings.append({
				"x0": cx - HE, "x1": cx + HE, "z0": cz - HE, "z1": cz + HE,
				"kind": "tower", "rot": 0, "height": h, "spire": has_spire,
			})

	if not spire_tips.is_empty():
		_add_points(spire_tips, Color("#ff5544"), 1.6, 0.85)
	_build_poles()


## THREE.Points, 1.6px with size attenuation: a fixed world size at this fov.
func _add_points(points: PackedVector3Array, color: Color, px: float, opacity: float) -> void:
	var quad := QuadMesh.new()
	quad.size = Vector2.ONE
	var mat := ShaderMaterial.new()
	mat.shader = POINTS
	mat.set_shader_parameter("point_rgb", color)
	mat.set_shader_parameter("opacity", opacity)
	mat.set_shader_parameter("world_size", px * tan(deg_to_rad(30.0)))
	# the bundle's Points are fogged by the same height field
	mat.set_shader_parameter("fog_color", NIGHT)
	mat.set_shader_parameter("fog_mode", 1)
	mat.set_shader_parameter("fog_density", FOG_DENSITY)
	quad.material = mat
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = quad
	mm.instance_count = points.size()
	for i in points.size():
		mm.set_instance_transform(i, Transform3D(Basis(), points[i]))
	var mi := MultiMeshInstance3D.new()
	mi.multimesh = mm
	mi.extra_cull_margin = 16384.0
	add_child(mi)


## CylinderGeometry(0.16,0.16,7,6) under each street lamp.
func _build_poles() -> void:
	var pole_mat := _mat(2, Color("#0f1115"))
	pole_mat.set_shader_parameter("emissive_color", Color("#3a2408"))
	pole_mat.set_shader_parameter("emissive_intensity", 0.5)
	for p in _shared.get("poles", []):
		var at := Vector3(p.x, 3.5, p.y)
		var segments := 6
		for i in segments:
			var t0 := TAU * i / segments
			var t1 := TAU * (i + 1) / segments
			var a := Vector3(sin(t0) * 0.16, 0, cos(t0) * 0.16)
			var b := Vector3(sin(t1) * 0.16, 0, cos(t1) * 0.16)
			var n := ((a + b) * 0.5).normalized()
			_m.quad(pole_mat, at + a + Vector3(0, 3.5, 0), at + b + Vector3(0, 3.5, 0),
				at + b - Vector3(0, 3.5, 0), at + a - Vector3(0, 3.5, 0), n)


## Asphalt strips down every street centre, N-S and E-W, with the dashed line
## running along their length.
func _build_roads() -> void:
	var road := _mat(2, Color.WHITE, 0.7, 0.1, _tex("road"), 3)
	road.set_shader_parameter("uv_repeat", Vector2(1.0, span / 12.0))
	for c in street_centers:
		_m.ground_plane(road, Vector3(c, 0.02, 0), ROAD, span)
		_m.ground_plane(road, Vector3(0, 0.025, c), ROAD, span, PI / 2.0)


func _build_skyline() -> void:
	var sky_r := span * 1.05
	var sky_h := 200.0
	var m := _mat(0, Color.WHITE, 1.0, 0.0,
		_tex("skyline_%d" % (_rng.randi() % SKYLINE_POOL), TITLE_TEX_DIR), 1, true, false)
	m.set_shader_parameter("uv_repeat", Vector2(3.0, 1.0))
	_m.cylinder_inside(m, Vector3(0, sky_h / 2.0 - 6.0, 0), sky_r, sky_h, 64)


## A glowing red marker: ring, disc, light column and lamp.
func _build_goal() -> void:
	_goal_ring = _mat(0, Color("#ff2a1a"), 1.0, 0.0, null, 3, false, false)
	_m.torus_flat(_goal_ring, Vector3(goal.x, 0.35, goal.z), 3.6, 0.55, 12, 44)
	_goal_disc = _mat(0, Color(Color("#ff2a1a"), 0.18), 1.0, 0.0, null, 3, true, false)
	_m.disc(_goal_disc, Vector3(goal.x, 0.32, goal.z), 3.2, 40)
	_goal_beam = _mat(0, Color(Color("#ff2a1a"), 0.20), 1.0, 0.0, null, 3, true, false)
	_m.cylinder_inside(_goal_beam, Vector3(goal.x, 70, goal.z), 0.7, 140.0, 12)


# ── destination ─────────────────────────────────────────────────────────────

## goalHash: FNV-1a over the uppercased label, with JS's 32-bit Math.imul.
static func goal_hash(text: String) -> int:
	var h := 2166136261
	var s := (text if text != "" else "DESTINATION").to_upper()
	for i in s.length():
		h = (h ^ s.unicode_at(i)) & 0xFFFFFFFF
		h = (h * 16777619) & 0xFFFFFFFF
	return h


## Every destination gets a deterministic intersection: inside a two-block
## perimeter buffer and far enough from the spawn to stay a real drive.
func _choose_goal(label: String) -> Vector3:
	var margin := 2
	var first := margin
	var last := street_centers.size() - 1 - margin
	var min_trip: float = PITCH * maxf(4.0, floor(N * 0.45))
	var candidates: Array = []
	for ix in range(first, last + 1):
		for iz in range(first, last + 1):
			var x: float = street_centers[ix]
			var z: float = street_centers[iz]
			if absf(x) + absf(z) >= min_trip:
				candidates.append(Vector3(x, 0, z))
	if candidates.is_empty():
		var safe: float = street_centers[clampi(street_centers.size() - 3, first, last)]
		return Vector3(safe, 0, safe)
	return candidates[goal_hash(label) % candidates.size()]


# ── collision ───────────────────────────────────────────────────────────────

const CAR_HL := 2.15
const CAR_HW := 0.95
const CAR_SKIN := 0.12
const FOOT_OFFS := [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]

## Deepest overlap (0 = free) of the car's rotated footprint with any building.
## A depth measure rather than a yes/no lets a move that REDUCES an existing
## overlap through, so a wedged car can always steer or back out. `out`, if
## given, receives the push-out direction and depth for the deepest point.
func penetration_at(px: float, pz: float, hd: float, out: Dictionary = {}) -> float:
	var fx := sin(hd)
	var fz := cos(hd)
	var rx := cos(hd)
	var rz := -sin(hd)
	var hl := CAR_HL + CAR_SKIN
	var hw := CAR_HW + CAR_SKIN
	var worst := 0.0
	for off in FOOT_OFFS:
		var l: float = off[0] * hl
		var w: float = off[1] * hw
		var x := px + fx * l + rx * w
		var z := pz + fz * l + rz * w
		for b in buildings:
			if x > b["x0"] and x < b["x1"] and z > b["z0"] and z < b["z1"]:
				var dxl: float = x - b["x0"]
				var dxr: float = b["x1"] - x
				var dzl: float = z - b["z0"]
				var dzr: float = b["z1"] - z
				var d: float = minf(minf(dxl, dxr), minf(dzl, dzr))
				if d > worst:
					worst = d
					if d == dxl:
						out["x"] = -1.0
						out["z"] = 0.0
					elif d == dxr:
						out["x"] = 1.0
						out["z"] = 0.0
					elif d == dzl:
						out["x"] = 0.0
						out["z"] = -1.0
					else:
						out["x"] = 0.0
						out["z"] = 1.0
					out["depth"] = d
	return worst


## The shortest street-grid route to the goal, snapped toward it so no leg ever
## backtracks; the two equal-length L orders are tie-broken by whichever first
## leg points closest to the car's heading.
func route_to_goal(pos: Vector3, heading: float) -> Array:
	var snap_toward := func(v: float, target: float) -> float:
		var best := target
		var d := INF
		for s in street_centers:
			if (s - v) * (s - target) <= 0.0:
				var dd: float = absf(v - s)
				if dd < d:
					d = dd
					best = s
		return best
	var build := func(raw: Array) -> Array:
		var pts := [raw[0]]
		for i in range(1, raw.size()):
			var l: Vector2 = pts[pts.size() - 1]
			var q: Vector2 = raw[i]
			if absf(l.x - q.x) > 0.05 or absf(l.y - q.y) > 0.05:
				pts.append(q)
		return pts
	var first_dot := func(pts: Array, fx: float, fz: float) -> float:
		for i in range(1, pts.size()):
			var d: Vector2 = pts[i] - pts[i - 1]
			var m := d.length()
			if m > 0.6:
				return (d.x * fx + d.y * fz) / m
		return 0.0
	var sx: float = snap_toward.call(pos.x, goal.x)
	var sz: float = snap_toward.call(pos.z, goal.z)
	var a: Array = build.call([Vector2(pos.x, pos.z), Vector2(sx, pos.z), Vector2(sx, goal.z), Vector2(goal.x, goal.z)])
	var b: Array = build.call([Vector2(pos.x, pos.z), Vector2(pos.x, sz), Vector2(goal.x, sz), Vector2(goal.x, goal.z)])
	var fx := sin(heading)
	var fz := cos(heading)
	return a if first_dot.call(a, fx, fz) >= first_dot.call(b, fx, fz) else b
