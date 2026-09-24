class_name DriveCar
extends Node3D
## The carRig of minigame/clivesbuick.js: the Crown Victoria, its spinning
## wheels, the two headlight spots and the tail light, the exhaust puffs and
## the hazy taillight flares.
##
## The model is the GLB the bundle inlines, decoded by tools/decode_car_glb.js.
## Its glTF materials are rebuilt on the three.js shader so the car shades like
## the city around it; three's GLTFLoader makes MeshStandardMaterials from the
## same factors.

const LIT := preload("res://shaders/three_lit.gdshader")
const LIT_ALPHA := preload("res://shaders/three_lit_alpha.gdshader")
const SPRITE := preload("res://shaders/three_sprite.gdshader")
const SPRITE_ADD := preload("res://shaders/three_sprite_add.gdshader")
const MODEL := preload("res://assets/models/crown_vic.glb")

const SMOKE_COUNT := 18

## Wheel meshes in the GLB are not centred on their own origin, so each is
## re-parented under a pivot at its real centre and the pivot is what spins.
var _wheels: Array = []
var _smoke: Array = []
var _tail_sprites: Array = []
var _world: DriveWorld = null
var _smoke_acc := 0.0
var _smoke_idx := 0


func setup(world: DriveWorld) -> void:
	_world = world
	_build_model()
	_build_sprites()


func _build_model() -> void:
	var car: Node3D = MODEL.instantiate()
	add_child(car)
	# box.setFromObject -> scale so the car is 4.4 long, sitting on the ground
	var aabb := _scene_aabb(car)
	var s: float = 4.4 / aabb.size.z
	car.scale = Vector3(s, s, s)
	var centre := aabb.get_center()
	car.position = Vector3(-centre.x * s, -aabb.position.y * s, -centre.z * s)
	for mi in car.find_children("*", "MeshInstance3D", true, false):
		_convert_materials(mi as MeshInstance3D)
	_collect_wheels(car)


func _scene_aabb(root: Node3D) -> AABB:
	var out := AABB()
	var first := true
	for n in root.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		var box := mi.get_aabb()
		# the model's nodes carry their own transforms
		var xf := mi.transform
		var p := mi.get_parent()
		while p != root and p is Node3D:
			xf = (p as Node3D).transform * xf
			p = p.get_parent()
		box = xf * box
		out = box if first else out.merge(box)
		first = false
	return out


## glTF baseColorFactor / metallic / roughness are linear, and three feeds them
## to a MeshStandardMaterial; the shader decodes its colour from sRGB, so the
## factors are encoded on the way in.
func _convert_materials(mi: MeshInstance3D) -> void:
	var mesh := mi.mesh
	if mesh == null:
		return
	for si in mesh.get_surface_count():
		var src := mesh.surface_get_material(si) as StandardMaterial3D
		if src == null:
			continue
		var transparent := src.albedo_color.a < 1.0 or src.transparency != BaseMaterial3D.TRANSPARENCY_DISABLED
		var m := ShaderMaterial.new()
		m.shader = LIT_ALPHA if transparent else LIT
		m.set_shader_parameter("mode", 2)
		var c := Color(src.albedo_color.r, src.albedo_color.g, src.albedo_color.b).linear_to_srgb()
		c.a = src.albedo_color.a
		m.set_shader_parameter("color", c)
		m.set_shader_parameter("roughness", src.roughness)
		m.set_shader_parameter("metalness", src.metallic)
		m.set_shader_parameter("map_mode", 0)
		if src.emission_enabled:
			m.set_shader_parameter("emissive_color", src.emission)
			m.set_shader_parameter("emissive_intensity", src.emission_energy_multiplier)
		mi.set_surface_override_material(si, m)
		_world.register_material(m)


## _collectWheels: meshes named wheel/tyre/tire/rim (but not body trim), small
## enough to be a single wheel, each under a pivot at its centre.
func _collect_wheels(root: Node3D) -> void:
	var re := RegEx.new()
	re.compile("(?i)wheel|tyre|tire|(?<![a-z])rim")
	for n in root.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		if not re.search(mi.name):
			continue
		var box := mi.get_aabb()
		var size := (mi.global_transform.basis * box.size).abs()
		var max_dim: float = maxf(size.x, maxf(size.y, size.z))
		if max_dim > 1.6 or max_dim < 0.05:
			continue
		var centre := mi.global_transform * box.get_center()
		var pivot := Node3D.new()
		add_child(pivot)
		pivot.global_position = centre
		mi.reparent(pivot, true)
		_wheels.append({"pivot": pivot, "radius": maxf(0.2, size.y / 2.0)})


func _build_sprites() -> void:
	var smoke_tex := _tex("smoke")
	for i in SMOKE_COUNT:
		var mi := _sprite(smoke_tex, Color("#8a8d94"), SPRITE, 0.4)
		mi.visible = false
		_world.add_child(mi)   # world-space puffs, left behind the car
		_smoke.append({"node": mi, "life": 0.0, "max": 1.0, "vel": Vector3.ZERO})
	var tail_tex := _tex("taillight")
	for x in [-0.62, 0.62]:
		var mi := _sprite(tail_tex, Color("#ff2a1a"), SPRITE_ADD, 0.85)
		mi.position = Vector3(x, 0.62, -2.25)
		add_child(mi)
		_tail_sprites.append(mi)


func _sprite(tex: Texture2D, tint: Color, shader: Shader, size: float) -> MeshInstance3D:
	var quad := QuadMesh.new()
	quad.size = Vector2.ONE
	var m := ShaderMaterial.new()
	m.shader = shader
	m.set_shader_parameter("map", tex)
	m.set_shader_parameter("tint", tint)
	m.set_shader_parameter("opacity", 0.0)
	m.set_shader_parameter("world_size", size)
	quad.material = m
	var mi := MeshInstance3D.new()
	mi.mesh = quad
	mi.extra_cull_margin = 16384.0
	return mi


func _tex(name: String) -> Texture2D:
	var path := "res://assets/images/drive/" + name + ".png"
	return load(path) as Texture2D if ResourceLoader.exists(path) else null


func _mat_of(mi: MeshInstance3D) -> ShaderMaterial:
	return (mi.mesh as QuadMesh).material as ShaderMaterial


## The rig follows the car; the wheels spin by distance travelled.
func drive(pos: Vector3, heading: float, speed: float, dt: float) -> void:
	position = Vector3(pos.x, 0, pos.z)
	rotation.y = heading
	var spin := speed * dt
	for w in _wheels:
		(w["pivot"] as Node3D).rotate_object_local(Vector3.RIGHT, spin / float(w["radius"]))


## makeHeadlight(-0.55) / makeHeadlight(0.55) and the rear point light, which
## live in the world's light arrays.
func update_lights(braking: float, speed: float) -> void:
	var b := global_transform.basis
	var o := global_position
	var spots := PackedVector3Array()
	var dirs := PackedVector3Array()
	for x in [-0.55, 0.55]:
		var from := o + b * Vector3(x, 0.7, 2.0)
		var to := o + b * Vector3(x, 0.1, 34.0)
		spots.append(from)
		dirs.append((to - from).normalized())
	_world.set_light("spot_pos", spots)
	_world.set_light("spot_dir", dirs)
	var pts: PackedVector3Array = _world.light("point_pos")
	pts[pts.size() - 1] = o + b * Vector3(0, 0.6, -2.3)
	_world.set_light("point_pos", pts)
	var ints: PackedFloat32Array = _world.light("point_intensity")
	ints[ints.size() - 1] = 4.0 + (9.0 if braking > 0.03 else 0.0) + minf(2.5, absf(speed) * 0.06)
	_world.set_light("point_intensity", ints)


## Hazy taillight glow, flaring on the brakes.
func update_taillights(braking: float, now_ms: float) -> void:
	var b := 1.0 if braking > 0.03 else 0.0
	var op := 0.4 + b * 0.5 + 0.05 * sin(now_ms * 0.02)
	var s := 0.82 + b * 0.45
	for mi in _tail_sprites:
		var m := _mat_of(mi)
		m.set_shader_parameter("opacity", op)
		m.set_shader_parameter("world_size", s)


## World-space exhaust puffs trailing the car.
func update_smoke(dt: float, pos: Vector3, fx: float, fz: float, throttle: float, speed: float) -> void:
	for p in _smoke:
		if p["life"] <= 0.0:
			continue
		p["life"] -= dt
		var mi: MeshInstance3D = p["node"]
		if p["life"] <= 0.0:
			mi.visible = false
			continue
		var t: float = p["life"] / p["max"]
		mi.position += p["vel"] * dt
		var m := _mat_of(mi)
		m.set_shader_parameter("opacity", 0.42 * t)
		m.set_shader_parameter("world_size", 0.45 + (1.0 - t) * 1.7)
	var rate := 0.5 + throttle * 2.4 + minf(1.0, absf(speed) / 22.0) * 0.7
	_smoke_acc += dt * rate * 7.0
	while _smoke_acc >= 1.0:
		_smoke_acc -= 1.0
		var p: Dictionary = _smoke[_smoke_idx]
		_smoke_idx = (_smoke_idx + 1) % _smoke.size()
		var mi: MeshInstance3D = p["node"]
		mi.position = Vector3(pos.x - fx * 2.2 + (-fz) * 0.35, 0.32, pos.z - fz * 2.2 + fx * 0.35)
		p["vel"] = Vector3(
			-fx * (1.0 + absf(speed) * 0.04) + (randf() - 0.5) * 0.5,
			0.65 + randf() * 0.5,
			-fz * (1.0 + absf(speed) * 0.04) + (randf() - 0.5) * 0.5)
		p["max"] = 0.8 + randf() * 0.5
		p["life"] = p["max"]
		var m := _mat_of(mi)
		m.set_shader_parameter("opacity", 0.4)
		m.set_shader_parameter("world_size", 0.4)
		mi.visible = true
