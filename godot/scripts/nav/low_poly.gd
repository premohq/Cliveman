class_name LowPoly
extends RefCounted
## addLowPolyItem() in engine/nav3d.js: evidence built from primitive geometry.
## The primitives are ports of three.js's own generators (CylinderGeometry,
## TorusGeometry with its arc, BoxGeometry, and the detail-0 polyhedra), so the
## facet counts and smooth/flat normals match what three builds.

static var _cache := {}


## Each part: {color:int, rough:float, pos:Vector3, rot:Vector3, arrays:Array}
static func parts(kind: String) -> Array:
	var out: Array = []
	var dark := 0x25282b
	var paper := 0xd8cfad
	var red := 0x9e251d
	var pale := 0xd5d0b8
	var glass := 0x58634d
	match kind:
		"mopBucket":
			out.append(_p(0xc49b21, cylinder(0.18, 0.23, 0.28, 8), Vector3(0, 0.14, 0)))
			out.append(_p(dark, torus(0.18, 0.018, 5, 10, PI), Vector3(0, 0.31, 0)))
			out.append(_p(0x765338, cylinder(0.018, 0.018, 0.72, 6), Vector3(0.17, 0.44, 0), Vector3(0, 0, -0.28)))
			out.append(_p(0xc9c2a6, cylinder(0.085, 0.055, 0.16, 7), Vector3(0.27, 0.12, 0), Vector3(0, 0, -0.28)))
		"ratPoison":
			out.append(_p(red, box(0.34, 0.28, 0.18), Vector3(0, 0.14, 0), Vector3(0.04, -0.12, 0)))
			out.append(_p(pale, box(0.27, 0.012, 0.02), Vector3(0, 0.17, -0.095), Vector3(0.04, -0.12, 0)))
			out.append(_p(dark, box(0.12, 0.012, 0.02), Vector3(0, 0.10, -0.097), Vector3(0.04, -0.12, 0)))
		"tnt":
			for i in range(-1, 2):
				out.append(_p(red, cylinder(0.055, 0.055, 0.34, 8), Vector3(i * 0.10, 0.075, 0), Vector3(PI / 2.0, 0, PI / 2.0)))
			out.append(_p(dark, box(0.34, 0.035, 0.08), Vector3(0, 0.11, 0)))
			out.append(_p(0xcaa75b, torus(0.08, 0.009, 4, 8, PI), Vector3(0.08, 0.19, 0), Vector3(PI / 2.0, 0, 0)))
		"bottles":
			for b in 4:
				var bx := (b % 2) * 0.13 - 0.065
				var bz := floorf(b / 2.0) * 0.12 - 0.06
				out.append(_p(glass, cylinder(0.035, 0.045, 0.22, 7), Vector3(bx, 0.11, bz), Vector3.ZERO, 0.3))
				out.append(_p(glass, cylinder(0.018, 0.026, 0.09, 7), Vector3(bx, 0.265, bz), Vector3.ZERO, 0.3))
		"papers":
			for p2 in 5:
				out.append(_p(paper, box(0.34 - p2 * 0.015, 0.009, 0.25 - p2 * 0.008), Vector3((p2 % 2) * 0.02, 0.008 + p2 * 0.010, (p2 % 3) * 0.01), Vector3(0, (p2 - 2) * 0.05, 0)))
		"laundry":
			out.append(_p(0x6d7378, dodecahedron(0.20), Vector3(-0.08, 0.13, 0.02), Vector3(0.2, 0.1, 0.1)))
			out.append(_p(0x493e47, dodecahedron(0.17), Vector3(0.10, 0.10, -0.04), Vector3(-0.1, 0.4, 0.2)))
			out.append(_p(0x827258, dodecahedron(0.12), Vector3(0.02, 0.22, 0.07), Vector3(0.3, 0.1, -0.2)))
		"debris":
			for d in 6:
				out.append(_p(0x5f625d if d % 2 else 0x3e4140, tetrahedron(0.10 + (d % 3) * 0.025), Vector3((d % 3 - 1) * 0.13, 0.06 + (d % 2) * 0.025, (floorf(d / 3.0) - 0.5) * 0.16), Vector3(d * 0.3, d * 0.2, 0)))
		_:
			return []
	return out


static func _p(color: int, arrays: Array, pos := Vector3.ZERO, rot := Vector3.ZERO, rough := 0.78) -> Dictionary:
	return {"color": color, "arrays": arrays, "pos": pos, "rot": rot, "rough": rough}


static func _arrays(verts: PackedVector3Array, norms: PackedVector3Array) -> Array:
	var a := []
	a.resize(Mesh.ARRAY_MAX)
	a[Mesh.ARRAY_VERTEX] = verts
	a[Mesh.ARRAY_NORMAL] = norms
	return a


## THREE.CylinderGeometry(rt, rb, h, radialSegments, 1, false): smooth sides with
## the slope-adjusted normal, flat caps. Emitted as a triangle soup.
static func cylinder(rt: float, rb: float, h: float, seg: int) -> Array:
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	var half := h / 2.0
	var slope := (rb - rt) / h
	var ring := func(y: float, r: float, i: int) -> Vector3:
		var theta := float(i) / seg * TAU
		return Vector3(r * sin(theta), y, r * cos(theta))
	var nrm := func(i: int) -> Vector3:
		var theta := float(i) / seg * TAU
		return Vector3(sin(theta), slope, cos(theta)).normalized()
	for i in seg:
		var a: Vector3 = ring.call(half, rt, i)
		var b: Vector3 = ring.call(-half, rb, i)
		var c: Vector3 = ring.call(-half, rb, i + 1)
		var d: Vector3 = ring.call(half, rt, i + 1)
		var na: Vector3 = nrm.call(i)
		var nd: Vector3 = nrm.call(i + 1)
		# three indexes (a, b, d), (b, c, d) with counter-clockwise front faces
		for tri in [[a, na], [d, nd], [b, na], [b, na], [d, nd], [c, nd]]:
			verts.append(tri[0])
			norms.append(tri[1])
	for cap in [[half, rt, 1.0], [-half, rb, -1.0]]:
		var y: float = cap[0]
		var r: float = cap[1]
		var sign: float = cap[2]
		if r <= 0.0:
			continue
		for i in seg:
			var p0: Vector3 = ring.call(y, r, i)
			var p1: Vector3 = ring.call(y, r, i + 1)
			var ctr := Vector3(0, y, 0)
			var n := Vector3(0, sign, 0)
			if sign > 0.0:
				for p in [ctr, p1, p0]:
					verts.append(p)
					norms.append(n)
			else:
				for p in [ctr, p0, p1]:
					verts.append(p)
					norms.append(n)
	return _arrays(verts, norms)


## THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments, arc)
static func torus(radius: float, tube: float, radial: int, tubular: int, arc: float) -> Array:
	var grid_v: Array = []
	var grid_n: Array = []
	for j in radial + 1:
		var row_v: Array = []
		var row_n: Array = []
		for i in tubular + 1:
			var u := float(i) / tubular * arc
			var v := float(j) / radial * TAU
			var p := Vector3((radius + tube * cos(v)) * cos(u), (radius + tube * cos(v)) * sin(u), tube * sin(v))
			var center := Vector3(radius * cos(u), radius * sin(u), 0)
			row_v.append(p)
			row_n.append((p - center).normalized())
		grid_v.append(row_v)
		grid_n.append(row_n)
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	for j in range(1, radial + 1):
		for i in range(1, tubular + 1):
			var a := [grid_v[j][i - 1], grid_n[j][i - 1]]
			var b := [grid_v[j - 1][i - 1], grid_n[j - 1][i - 1]]
			var c := [grid_v[j - 1][i], grid_n[j - 1][i]]
			var d := [grid_v[j][i], grid_n[j][i]]
			for tri in [a, d, b, b, d, c]:
				verts.append(tri[0])
				norms.append(tri[1])
	return _arrays(verts, norms)


static func box(w: float, h: float, d: float) -> Array:
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	var hx := w / 2.0
	var hy := h / 2.0
	var hz := d / 2.0
	var faces := [
		[Vector3.RIGHT, Vector3(hx, hy, hz), Vector3(hx, hy, -hz), Vector3(hx, -hy, -hz), Vector3(hx, -hy, hz)],
		[Vector3.LEFT, Vector3(-hx, hy, -hz), Vector3(-hx, hy, hz), Vector3(-hx, -hy, hz), Vector3(-hx, -hy, -hz)],
		[Vector3.UP, Vector3(-hx, hy, -hz), Vector3(hx, hy, -hz), Vector3(hx, hy, hz), Vector3(-hx, hy, hz)],
		[Vector3.DOWN, Vector3(-hx, -hy, hz), Vector3(hx, -hy, hz), Vector3(hx, -hy, -hz), Vector3(-hx, -hy, -hz)],
		[Vector3.BACK, Vector3(-hx, hy, hz), Vector3(hx, hy, hz), Vector3(hx, -hy, hz), Vector3(-hx, -hy, hz)],
		[Vector3.FORWARD, Vector3(hx, hy, -hz), Vector3(-hx, hy, -hz), Vector3(-hx, -hy, -hz), Vector3(hx, -hy, -hz)],
	]
	for f in faces:
		for p in [f[1], f[2], f[3], f[1], f[3], f[4]]:
			verts.append(p)
			norms.append(f[0])
	return _arrays(verts, norms)


## A detail-0 PolyhedronGeometry: vertices pushed to the radius, flat normals.
static func _polyhedron(vertices: Array, indices: Array, radius: float) -> Array:
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	for i in range(0, indices.size(), 3):
		var tri: Array = []
		for k in 3:
			var idx: int = indices[i + k] * 3
			tri.append(Vector3(vertices[idx], vertices[idx + 1], vertices[idx + 2]).normalized() * radius)
		# three's face (a, b, c) is counter-clockwise from outside; Godot wants clockwise
		var n: Vector3 = (tri[1] - tri[0]).cross(tri[2] - tri[0]).normalized()
		for p in [tri[0], tri[2], tri[1]]:
			verts.append(p)
			norms.append(n)
	return _arrays(verts, norms)


static func tetrahedron(radius: float) -> Array:
	var v := [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1]
	var i := [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1]
	return _polyhedron(v, i, radius)


static func dodecahedron(radius: float) -> Array:
	var t := (1.0 + sqrt(5.0)) / 2.0
	var r := 1.0 / t
	var v := [
		-1, -1, -1, -1, -1, 1, -1, 1, -1, -1, 1, 1,
		1, -1, -1, 1, -1, 1, 1, 1, -1, 1, 1, 1,
		0, -r, -t, 0, -r, t, 0, r, -t, 0, r, t,
		-r, -t, 0, -r, t, 0, r, -t, 0, r, t, 0,
		-t, 0, -r, t, 0, -r, -t, 0, r, t, 0, r,
	]
	var i := [
		3, 11, 7, 3, 7, 15, 3, 15, 13,
		7, 19, 17, 7, 17, 6, 7, 6, 15,
		17, 4, 8, 17, 8, 10, 17, 10, 6,
		8, 0, 16, 8, 16, 2, 8, 2, 10,
		0, 12, 1, 0, 1, 18, 0, 18, 16,
		6, 10, 2, 6, 2, 13, 6, 13, 15,
		2, 16, 18, 2, 18, 3, 2, 3, 13,
		18, 1, 9, 18, 9, 11, 18, 11, 3,
		4, 14, 12, 4, 12, 0, 4, 0, 8,
		11, 9, 5, 11, 5, 19, 11, 19, 7,
		19, 5, 14, 19, 14, 4, 19, 4, 17,
		1, 12, 14, 1, 14, 5, 1, 5, 9,
	]
	return _polyhedron(v, i, radius)
