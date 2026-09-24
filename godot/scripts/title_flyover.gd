extends Node3D
## Title-screen attract mode: a drone shot circling the night city.
## Port of engine/title-flyover.js — its grid, random bands, geometry, camera
## path and materials, drawn with the same three.js lighting as the nav rooms
## (shaders/three_common.gdshaderinc).
##
## The browser renders this full-viewport behind the terminal at a negative
## z-index. Here it is plain 3D in the main viewport; the terminal's Control
## tree draws over it, so it sits behind for free.
##
## The canvas textures (glyph facades, street grid, skyline ring, shop signs)
## are rendered by the browser's own routines, see tools/render_title_textures.js.
## They are drawn with Math.random(), so the browser differs on every load too;
## the port picks from the rendered pool the way the browser picks fresh ones.

const LIT := preload("res://shaders/three_lit.gdshader")
const LIT_ALPHA := preload("res://shaders/three_lit_alpha.gdshader")
const POINTS := preload("res://shaders/three_points.gdshader")
const TEX_DIR := "res://assets/images/title/"

const PITCH := 34.0      ## city block spacing
const ROAD := 12.0       ## street width
const HALF_EXTENT := 11  ## grid runs -HE..HE; the JS drops to 8 on coarse pointers
const FACADE_VARIANTS := 5
const FACADE_POOL := 20
const SKYLINE_POOL := 4

const SKY_RADIUS := 900.0
const SKY_HEIGHT := 190.0

const NIGHT := Color("#05060a")
const CONCRETE := Color("#05070c")

const SIGN_NAMES := ["GROCERY", "MARKET", "DELI", "LIQUOR", "24_HR_MART", "BODEGA", "BIG_SMILES", "DINER"]

var _elapsed := 0.0
var _camera: Camera3D = null
var _rng := RandomNumberGenerator.new()
var _beacon_mat: ShaderMaterial = null
var _tex_cache := {}
var _shared := {}        ## materials reused across landmarks
var _m := ThreeMesh.new()  ## batches the whole city into one mesh


func _ready() -> void:
	_rng.randomize()
	_camera = Camera3D.new()
	_camera.fov = 60.0
	_camera.near = 0.5
	_camera.far = 2000.0
	add_child(_camera)
	_camera.make_current()
	_build_environment()
	_build_city()
	_drive(0.0)

	# `-- --flyover-at <seconds> <path>` jumps the camera to that point on the
	# path, grabs a frame and quits. Lets the dolly and the orbit be checked
	# without sitting through the crane blend. The flag has to be explicit: this
	# scene is also a child of the title, which parses its own arguments.
	var argv := OS.get_cmdline_user_args()
	if argv.size() >= 3 and argv[0] == "--flyover-at":
		_capture_at(float(argv[1]), argv[2])


func _capture_at(seconds: float, path: String) -> void:
	set_process(false)
	# what the browser's canvas shows with .crt and #crtVignette hidden: the
	# city under its own #titleFlyoverVignette, and nothing else
	var scene := get_tree().current_scene
	if scene:
		for n in scene.get_children():
			if n is CanvasItem and n.name != "FlyoverVignette":
				(n as CanvasItem).visible = false
	_drive(seconds)
	_pulse_beacons(seconds)
	for i in 5:
		await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(path)
	print("captured t=%.1fs -> %s" % [seconds, path])
	get_tree().quit()


func _process(delta: float) -> void:
	_elapsed += delta
	_drive(_elapsed)
	_pulse_beacons(_elapsed)


## Aircraft warning lights, 2.2 rad/s as in the JS tick.
func _pulse_beacons(t: float) -> void:
	if _beacon_mat:
		_beacon_mat.set_shader_parameter("opacity", 0.35 + 0.65 * maxf(0.0, sin(t * 2.2)))


# ── camera ───────────────────────────────────────────────────────────────────

func _ease_io(x: float) -> float:
	x = clampf(x, 0.0, 1.0)
	return 2.0 * x * x if x < 0.5 else 1.0 - pow(-2.0 * x + 2.0, 2.0) / 2.0


func _smooth(a: float, b: float, x: float) -> float:
	x = clampf((x - a) / (b - a), 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)


## Shot A dollies up the central avenue at street level; shot B is a perpetual
## orbit with radius and height counter-phased. The crane blends A into B
## between six and eleven seconds.
func _drive(t: float) -> void:
	var dz: float = 620.0 - 530.0 * _ease_io(t / 9.0)
	var pos := Vector3(4.0, 3.4 + 0.4 * sin(t * 1.7), dz)
	var target := Vector3(2.0, 30.0 + 10.0 * minf(1.0, t / 9.0), dz - 180.0)

	var u: float = maxf(0.0, t - 6.0)
	var a: float = PI / 2.0 + u * 0.045
	var r: float = 430.0 + 165.0 * sin(u * 0.011 + 0.35)
	var h: float = 88.0 + 58.0 * sin(u * 0.011 + 0.35 + PI) + 8.0 * sin(u * 0.037)
	var orbit_pos := Vector3(r * cos(a), h, r * sin(a))
	var orbit_target := Vector3(
		30.0 * sin(u * 0.007),
		24.0 + 14.0 * sin(u * 0.009),
		30.0 * cos(u * 0.0063))

	var mix: float = _smooth(6.0, 11.0, t)
	_camera.position = pos.lerp(orbit_pos, mix)
	_camera.look_at(target.lerp(orbit_target, mix), Vector3.UP)


# ── materials ────────────────────────────────────────────────────────────────

func _tex(name: String) -> Texture2D:
	if _tex_cache.has(name):
		return _tex_cache[name]
	var tex: Texture2D = null
	var path := TEX_DIR + name + ".png"
	if ResourceLoader.exists(path):
		var img: Image = (load(path) as Texture2D).get_image()
		if img.is_compressed():
			img.decompress()
		img.generate_mipmaps()
		tex = ImageTexture.create_from_image(img)
	_tex_cache[name] = tex
	return tex


## mode 0 basic, 2 standard. The canvas textures carry no colorSpace, so they
## are sampled as data (map_srgb false), as three does.
func _mat(mode: int, color: Color, roughness := 1.0, tex: Texture2D = null,
		map_mode := 3, transparent := false, fog := true) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = LIT_ALPHA if transparent else LIT
	m.set_shader_parameter("mode", mode)
	m.set_shader_parameter("color", color)
	m.set_shader_parameter("roughness", roughness)
	m.set_shader_parameter("metalness", 0.0)
	m.set_shader_parameter("map_srgb", false)
	m.set_shader_parameter("uv_repeat", Vector2.ONE)
	if tex:
		m.set_shader_parameter("map_mode", map_mode)
		match map_mode:
			1: m.set_shader_parameter("map_linear", tex)
			2: m.set_shader_parameter("map_nearest", tex)
			3: m.set_shader_parameter("map_nearest_mip", tex)
	else:
		m.set_shader_parameter("map_mode", 0)
	m.set_shader_parameter("ambient_color", Color("#223043"))
	m.set_shader_parameter("ambient_intensity", 0.9)
	m.set_shader_parameter("dir_color", Color("#9fb4e6"))
	m.set_shader_parameter("dir_intensity", 0.6)
	m.set_shader_parameter("dir_to_light", Vector3(-50, 90, -40).normalized())
	m.set_shader_parameter("fog_enabled", fog)
	m.set_shader_parameter("fog_color", NIGHT)
	m.set_shader_parameter("fog_near", 120.0)
	m.set_shader_parameter("fog_far", 1050.0)
	return m


# ── world ────────────────────────────────────────────────────────────────────

func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = NIGHT
	env.ambient_light_source = Environment.AMBIENT_SOURCE_DISABLED
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	var world := WorldEnvironment.new()
	world.environment = env
	add_child(world)


func _build_city() -> void:
	var span: float = PITCH * (2 * HALF_EXTENT + 1)
	var span_ground: float = span + PITCH + 80.0

	# ground and the apron that carries it out to the skyline base
	var ground_mat := _mat(2, Color.WHITE, 1.0, _tex("ground"))
	var g := span_ground * 0.5
	_m.quad(ground_mat, Vector3(-g, 0, -g), Vector3(g, 0, -g), Vector3(g, 0, g), Vector3(-g, 0, g), Vector3.UP)
	var apron := SKY_RADIUS * 2.3 * 0.5
	_m.quad(_mat(2, Color("#05070a")), Vector3(-apron, -0.06, -apron), Vector3(apron, -0.06, -apron),
		Vector3(apron, -0.06, apron), Vector3(-apron, -0.06, apron), Vector3.UP)

	# five facade variants, each its own batch as in the JS InstancedMesh
	var facades: Array[ShaderMaterial] = []
	var pool := range(FACADE_POOL)
	pool.shuffle()
	for v in FACADE_VARIANTS:
		var tex := _tex("facade_%02d" % int(pool[v]))
		var m := _mat(2, Color("#0c1018"), 0.92, tex)
		m.set_shader_parameter("emissive_color", Color.WHITE)
		m.set_shader_parameter("emissive_intensity", 0.85)
		m.set_shader_parameter("emissive_from_map", true)
		facades.append(m)
	var roof := _mat(2, CONCRETE)

	var spires: Array = []
	var beacons := PackedVector3Array()

	for gx in range(-HALF_EXTENT, HALF_EXTENT + 1):
		if gx == 0:
			continue  # the central avenue the opening dolly runs up
		for gz in range(-HALF_EXTENT, HALF_EXTENT + 1):
			if _rng.randf() < 0.07:
				continue  # vacant lot
			if _rng.randf() < 0.04:
				# landmark lot: a church or a corner store
				var turn := float(_rng.randi() % 4) * PI / 2.0
				var at := Vector3(gx * PITCH, 0, gz * PITCH)
				if _rng.randf() < 0.35:
					_church(at, turn)
				else:
					_grocery(at, turn)
				continue

			var w: float = 16.0 + _rng.randf() * 5.0
			var d: float = 16.0 + _rng.randf() * 5.0
			var h: float = 12.0 + pow(_rng.randf(), 1.8) * 52.0
			var bx: float = gx * PITCH + (_rng.randf() * 6.0 - 3.0)
			var bz: float = gz * PITCH + (_rng.randf() * 6.0 - 3.0)
			var tall: bool = _rng.randf() < 0.07
			if tall:
				h = minf(h * 1.7, 90.0)
			if tall or (h > 42.0 and _rng.randf() < 0.3):
				var mast: float = 7.0 + _rng.randf() * 15.0
				spires.append([bx, h, bz, mast])
				if tall:
					beacons.append(Vector3(bx, h + mast + 1.5, bz))
			_m.box(facades[_rng.randi() % FACADE_VARIANTS], roof,
				Vector3(bx, h * 0.5, bz), Vector3(w, h, d))

	var spire_mat := _mat(2, CONCRETE)
	for s in spires:
		_m.cone4(spire_mat, Vector3(s[0], s[1], s[2]), Vector3(2.6, s[3], 2.6), 0.5, 0.0)

	_skyline_ring()
	_m.commit(self)

	if not beacons.is_empty():
		_add_beacons(beacons)


## The decorative backdrop past the orbit path, so the district reads as part of
## a larger city rather than floating in a void. Unfogged, with the dimness
## baked into the texture; linear fog at this range would wash it out.
func _skyline_ring() -> void:
	var m := _mat(0, Color.WHITE, 1.0, _tex("skyline_%d" % (_rng.randi() % SKYLINE_POOL)), 1, true, false)
	m.set_shader_parameter("uv_repeat", Vector2(3.0, 1.0))
	_m.cylinder_inside(m, Vector3(0, SKY_HEIGHT / 2.0 - 6.0, 0), SKY_RADIUS, SKY_HEIGHT, 64)


## Red aircraft warning lights riding the tallest masts: THREE.Points, 2.5px
## with size attenuation, which is a fixed world size at this fov.
func _add_beacons(points: PackedVector3Array) -> void:
	var quad := QuadMesh.new()
	quad.size = Vector2.ONE
	_beacon_mat = ShaderMaterial.new()
	_beacon_mat.shader = POINTS
	_beacon_mat.set_shader_parameter("point_rgb", Color("#ff5544"))
	_beacon_mat.set_shader_parameter("opacity", 1.0)
	_beacon_mat.set_shader_parameter("world_size", 2.5 * tan(deg_to_rad(30.0)))
	_beacon_mat.set_shader_parameter("fog_color", NIGHT)
	_beacon_mat.set_shader_parameter("fog_near", 120.0)
	_beacon_mat.set_shader_parameter("fog_far", 1050.0)
	quad.material = _beacon_mat
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


# ── landmarks ────────────────────────────────────────────────────────────────

func _kit() -> Dictionary:
	if not _shared.has("#kit"):
		_shared["#kit"] = {
			"stone": _mat(2, Color("#151a26"), 0.95),
			"trim": _mat(2, CONCRETE),
			"warm": _mat(0, Color("#b9873a")),
			"pale": _mat(0, Color("#9fc4a8")),
		}
	return _shared["#kit"]


func _church(at: Vector3, turn: float) -> void:
	CityKit.church(_m, _kit(), at, turn)


func _grocery(at: Vector3, turn: float) -> void:
	var name: String = CityKit.SIGN_NAMES[_rng.randi() % CityKit.SIGN_NAMES.size()]
	var sign_mat := _mat(0, Color.WHITE, 1.0, _tex("sign_%s_%d" % [name, _rng.randi() % 4]), 1, true)
	CityKit.grocery(_m, _kit(), at, turn, sign_mat,
		Vector2(-5.0 + _rng.randf() * 10.0, -3.0 + _rng.randf() * 5.0))
