class_name ThreeMesh
extends RefCounted
## Builds three.js geometries into one batched ArrayMesh, one surface per
## material, for the scenes that mirror the browser's 3D: the title flyover and
## the night drive.
##
## Winding and UVs follow three's: a face is given as seen from the side its
## normal points to, and UVs run left to right and top to bottom of the image
## (three measures v from the bottom, and its canvas textures are flipped, so
## the two agree).

var _surfaces := {}


func _surface(m: Material) -> SurfaceTool:
	if not _surfaces.has(m):
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		_surfaces[m] = st
	return _surfaces[m]


func quad(m: Material, tl: Vector3, tr: Vector3, br: Vector3, bl: Vector3, n: Vector3,
		uv_tl := Vector2(0, 0), uv_br := Vector2(1, 1)) -> void:
	var st := _surface(m)
	var uv_tr := Vector2(uv_br.x, uv_tl.y)
	var uv_bl := Vector2(uv_tl.x, uv_br.y)
	for p in [[tl, uv_tl], [tr, uv_tr], [br, uv_br], [tl, uv_tl], [br, uv_br], [bl, uv_bl]]:
		st.set_normal(n)
		st.set_uv(p[1])
		st.add_vertex(p[0])


## THREE.BoxGeometry(w,h,d) at `centre`, each face carrying the whole texture
## as three's per-face 0..1 UVs do. `caps` paints the top and bottom.
func box(sides: Material, caps: Material, centre: Vector3, size: Vector3, rot_y := 0.0) -> void:
	var b := Basis(Vector3.UP, rot_y)
	var h := size * 0.5
	var P := func(x: float, y: float, z: float) -> Vector3: return centre + b * Vector3(x, y, z)
	var N := func(v: Vector3) -> Vector3: return (b * v).normalized()
	quad(sides, P.call(h.x, h.y, h.z), P.call(h.x, h.y, -h.z), P.call(h.x, -h.y, -h.z), P.call(h.x, -h.y, h.z), N.call(Vector3.RIGHT))
	quad(sides, P.call(-h.x, h.y, -h.z), P.call(-h.x, h.y, h.z), P.call(-h.x, -h.y, h.z), P.call(-h.x, -h.y, -h.z), N.call(Vector3.LEFT))
	quad(caps, P.call(-h.x, h.y, -h.z), P.call(h.x, h.y, -h.z), P.call(h.x, h.y, h.z), P.call(-h.x, h.y, h.z), N.call(Vector3.UP))
	quad(caps, P.call(-h.x, -h.y, h.z), P.call(h.x, -h.y, h.z), P.call(h.x, -h.y, -h.z), P.call(-h.x, -h.y, -h.z), N.call(Vector3.DOWN))
	quad(sides, P.call(-h.x, h.y, h.z), P.call(h.x, h.y, h.z), P.call(h.x, -h.y, h.z), P.call(-h.x, -h.y, h.z), N.call(Vector3.BACK))
	quad(sides, P.call(h.x, h.y, -h.z), P.call(-h.x, h.y, -h.z), P.call(-h.x, -h.y, -h.z), P.call(h.x, -h.y, -h.z), N.call(Vector3.FORWARD))


## THREE.ConeGeometry(radius,1,4): a four-sided pyramid, apex up, base at y=0
## after the JS translate(0,0.5,0). `base_turn` is a rotateY baked into the
## geometry before the mesh scale (the church roof is turned 45 degrees so its
## square base lines up with the nave); `turn` is the lot's own rotation.
func cone4(m: Material, centre: Vector3, size: Vector3, radius: float,
		base_turn: float, turn := 0.0) -> void:
	var st := _surface(m)
	var world := Basis(Vector3.UP, turn)
	var base := Basis(Vector3.UP, base_turn)
	var apex := centre + world * Vector3(0, size.y, 0)
	var rim := func(i: int) -> Vector3:
		var t := TAU * i / 4.0
		var v: Vector3 = base * Vector3(sin(t) * radius, 0.0, cos(t) * radius)
		return centre + world * Vector3(v.x * size.x, 0.0, v.z * size.z)
	for i in 4:
		var p0: Vector3 = rim.call(i)
		var p1: Vector3 = rim.call(i + 1)
		var n := (p1 - p0).cross(apex - p0).normalized()
		for p in [apex, p0, p1]:
			st.set_normal(n)
			st.set_uv(Vector2.ZERO)
			st.add_vertex(p)
		for p in [centre, p1, p0]:   # base, so the silhouette closes from below
			st.set_normal(Vector3.DOWN)
			st.set_uv(Vector2.ZERO)
			st.add_vertex(p)


## THREE.PlaneGeometry(w,h) upright, facing +z before a rotateY of `turn`.
func plane(m: Material, centre: Vector3, w: float, h: float, turn := 0.0) -> void:
	var b := Basis(Vector3.UP, turn)
	var hw := w * 0.5
	var hh := h * 0.5
	quad(m, centre + b * Vector3(-hw, hh, 0), centre + b * Vector3(hw, hh, 0),
		centre + b * Vector3(hw, -hh, 0), centre + b * Vector3(-hw, -hh, 0), b * Vector3.BACK)


## A PlaneGeometry laid flat, face up, `turn` about Y.
func ground_plane(m: Material, centre: Vector3, w: float, d: float, turn := 0.0,
		uv_br := Vector2(1, 1)) -> void:
	var b := Basis(Vector3.UP, turn)
	var hw := w * 0.5
	var hd := d * 0.5
	quad(m, centre + b * Vector3(-hw, 0, -hd), centre + b * Vector3(hw, 0, -hd),
		centre + b * Vector3(hw, 0, hd), centre + b * Vector3(-hw, 0, hd), Vector3.UP,
		Vector2.ZERO, uv_br)


## THREE.CircleGeometry(r, segments), facing +z.
func circle(m: Material, centre: Vector3, r: float, segments: int) -> void:
	var st := _surface(m)
	for i in segments:
		var t0 := TAU * i / segments
		var t1 := TAU * (i + 1) / segments
		for p in [centre, centre + Vector3(cos(t1) * r, sin(t1) * r, 0), centre + Vector3(cos(t0) * r, sin(t0) * r, 0)]:
			st.set_normal(Vector3.BACK)
			st.set_uv(Vector2.ZERO)
			st.add_vertex(p)


## THREE.CircleGeometry laid flat, face up (the goal disc).
func disc(m: Material, centre: Vector3, r: float, segments: int) -> void:
	var st := _surface(m)
	for i in segments:
		var t0 := TAU * i / segments
		var t1 := TAU * (i + 1) / segments
		for p in [centre, centre + Vector3(cos(t0) * r, 0, sin(t0) * r), centre + Vector3(cos(t1) * r, 0, sin(t1) * r)]:
			st.set_normal(Vector3.UP)
			st.set_uv(Vector2.ZERO)
			st.add_vertex(p)


## THREE.CylinderGeometry(r,r,h,segments,1,true) seen from inside: the skyline
## ring and the goal beam. `repeat_u` matches texture.repeat.x.
func cylinder_inside(m: Material, centre: Vector3, r: float, h: float, segments: int,
		repeat_u := 1.0) -> void:
	var y0 := centre.y - h * 0.5
	var y1 := centre.y + h * 0.5
	for i in segments:
		var t0 := TAU * i / segments
		var t1 := TAU * (i + 1) / segments
		var p0 := Vector3(centre.x + sin(t0) * r, 0, centre.z + cos(t0) * r)
		var p1 := Vector3(centre.x + sin(t1) * r, 0, centre.z + cos(t1) * r)
		var n := -(Vector3(sin((t0 + t1) * 0.5), 0, cos((t0 + t1) * 0.5))).normalized()
		quad(m, Vector3(p1.x, y1, p1.z), Vector3(p0.x, y1, p0.z),
			Vector3(p0.x, y0, p0.z), Vector3(p1.x, y0, p1.z), n,
			Vector2(float(i + 1) / segments * repeat_u, 0.0),
			Vector2(float(i) / segments * repeat_u, 1.0))


## A torus lying flat (the goal ring).
func torus_flat(m: Material, centre: Vector3, r: float, tube: float,
		tube_segments: int, arc_segments: int) -> void:
	var st := _surface(m)
	for i in arc_segments:
		for j in tube_segments:
			var pts := []
			for c in [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]:
				var u := TAU * float(c[0]) / float(arc_segments)
				var v := TAU * float(c[1]) / float(tube_segments)
				var ring := Vector3(cos(u), 0, sin(u))
				pts.append(centre + ring * (r + tube * cos(v)) + Vector3(0, tube * sin(v), 0))
			for k in [0, 1, 2, 0, 2, 3]:
				var p: Vector3 = pts[k]
				st.set_normal((p - centre - (p - centre).slide(Vector3.UP).normalized() * r).normalized())
				st.set_uv(Vector2.ZERO)
				st.add_vertex(p)


## One MeshInstance3D with a surface per material, added under `parent`.
func commit(parent: Node3D) -> MeshInstance3D:
	var mesh := ArrayMesh.new()
	for m in _surfaces:
		(_surfaces[m] as SurfaceTool).commit(mesh)
		mesh.surface_set_material(mesh.get_surface_count() - 1, m)
	_surfaces.clear()
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi
