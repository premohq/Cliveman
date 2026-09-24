extends Node3D
## Model smoke test. Loads a glTF/OBJ from res://, frames it, and either shows
## it or writes a PNG and quits.
##
##   godot --path . tools/model_preview.tscn -- res://assets/models/crown_vic.glb out.png
##
## Use it after changing anything in tools/draco_decompress.py: "the importer
## reported no errors" is not the same as "the mesh survived".

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var model_path: String = args[0] if args.size() > 0 else "res://assets/models/crown_vic.glb"
	var shot_path: String = args[1] if args.size() > 1 else ""

	# glTF imports as a PackedScene; OBJ imports as a bare Mesh.
	var res := load(model_path)
	var model: Node
	if res is PackedScene:
		model = res.instantiate()
	elif res is Mesh:
		model = MeshInstance3D.new()
		model.mesh = res
	else:
		push_error("could not load %s" % model_path)
		get_tree().quit(1)
		return
	add_child(model)

	var bounds := _aabb_of(model)
	print("meshes: %d   surfaces: %d   vertices: %d" % _tally(model))
	print("bounds: position %v  size %v" % [bounds.position, bounds.size])

	if bounds.size.length() <= 0.0:
		push_error("model has no geometry")
		get_tree().quit(1)
		return

	# Three-quarter view, framed on the bounding box.
	var centre := bounds.get_center()
	var reach := bounds.size.length()
	var cam := Camera3D.new()
	add_child(cam)
	cam.position = centre + Vector3(1.0, 0.55, 1.0).normalized() * reach * 1.1
	cam.look_at(centre, Vector3.UP)

	var key := DirectionalLight3D.new()
	add_child(key)
	key.rotation_degrees = Vector3(-45, -35, 0)
	key.light_energy = 1.4

	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.02, 0.04, 0.03)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.35, 0.42, 0.38)
	e.ambient_light_energy = 0.7
	env.environment = e
	add_child(env)

	if shot_path != "":
		for i in 5:
			await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(shot_path)
		print("captured -> ", shot_path)
		get_tree().quit()


func _tally(node: Node, acc: Array = [0, 0, 0]) -> Array:
	var mi := node as MeshInstance3D
	if mi != null and mi.mesh != null:
		acc[0] += 1
		for s in mi.mesh.get_surface_count():
			acc[1] += 1
			var arrays: Array = mi.mesh.surface_get_arrays(s)
			if arrays.size() > Mesh.ARRAY_VERTEX and arrays[Mesh.ARRAY_VERTEX] != null:
				acc[2] += arrays[Mesh.ARRAY_VERTEX].size()
	for child in node.get_children():
		_tally(child, acc)
	return acc


func _aabb_of(node: Node, box: AABB = AABB(), seeded: Array = [false]) -> AABB:
	var mi := node as MeshInstance3D
	if mi != null and mi.mesh != null:
		var world: AABB = mi.global_transform * mi.get_aabb()
		if not seeded[0]:
			box = world
			seeded[0] = true
		else:
			box = box.merge(world)
	for child in node.get_children():
		box = _aabb_of(child, box, seeded)
	return box
