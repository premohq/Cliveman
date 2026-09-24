extends Node
## Measures the decoded Crown Victoria the way the drive does, so the 4.4-unit
## scale and the sitting height can be checked against the bundle.

func _ready() -> void:
	var car: Node3D = (load("res://assets/models/crown_vic.glb") as PackedScene).instantiate()
	add_child(car)
	var out := AABB()
	var first := true
	for n in car.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		var box: AABB = mi.global_transform * mi.get_aabb()
		out = box if first else out.merge(box)
		first = false
	print("car_probe aabb pos=", out.position, " size=", out.size)
	print("  scale for 4.4 along z: ", 4.4 / out.size.z, "  along x: ", 4.4 / out.size.x)
	print("  root xform: ", car.transform)
	var kids := []
	for c in car.get_children():
		kids.append("%s(%s)" % [c.name, c.get_class()])
	print("  children: ", kids)
	get_tree().quit()
