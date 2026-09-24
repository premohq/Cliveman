class_name CityKit
extends RefCounted
## The landmark low-rises the night city is broken up with: churches and corner
## stores, identical in engine/title-flyover.js and minigame/clivesbuick.js.
## Each is built facing local +Z and then turned onto its lot in 90 degree
## steps, since every lot borders four streets.
##
## `mats` carries the shared materials: stone, trim, warm (stained glass), pale
## (fluorescent storefront); `sign` is the corner store's neon, one material per
## store because each carries its own rendered sign.

const SIGN_NAMES := ["GROCERY", "MARKET", "DELI", "LIQUOR", "24_HR_MART", "BODEGA", "BIG_SMILES", "DINER"]


## footprint 12 x 20 (x, z local)
static func church(tm: ThreeMesh, mats: Dictionary, at: Vector3, turn: float) -> void:
	var b := Basis(Vector3.UP, turn)
	var stone: Material = mats["stone"]
	var trim: Material = mats["trim"]
	var warm: Material = mats["warm"]
	var P := func(x: float, y: float, z: float) -> Vector3: return at + b * Vector3(x, y, z)
	tm.box(stone, stone, P.call(0, 4.5, 0), Vector3(12, 9, 20), turn)
	tm.cone4(trim, P.call(0, 9, 0), Vector3(13, 5, 21), sqrt(0.5), PI / 4.0, turn)
	tm.box(stone, stone, P.call(0, 8, 6.5), Vector3(7, 16, 7), turn)
	tm.cone4(trim, P.call(0, 16, 6.5), Vector3(7.6, 7, 7.6), sqrt(0.5), PI / 4.0, turn)
	tm.box(trim, trim, P.call(0, 24.3, 6.5), Vector3(0.35, 2.6, 0.35), turn)
	tm.box(trim, trim, P.call(0, 24.6, 6.5), Vector3(1.6, 0.35, 0.35), turn)
	for zz in [-6.0, -1.0, 4.0]:
		for sx in [-1.0, 1.0]:
			tm.plane(warm, P.call(sx * 6.02, 4.8, zz), 1.1, 3.0, turn + sx * PI / 2.0)
	tm.circle(warm, P.call(0, 11.5, 10.03), 1.2, 12)


## footprint 20 x 16 (x, z local)
static func grocery(tm: ThreeMesh, mats: Dictionary, at: Vector3, turn: float,
		sign: Material, hvac_at: Vector2) -> void:
	var b := Basis(Vector3.UP, turn)
	var stone: Material = mats["stone"]
	var trim: Material = mats["trim"]
	var P := func(x: float, y: float, z: float) -> Vector3: return at + b * Vector3(x, y, z)
	tm.box(stone, stone, P.call(0, 3.5, 0), Vector3(20, 7, 16), turn)
	tm.plane(mats["pale"], P.call(0, 2.3, 8.03), 17.0, 3.2, turn)
	tm.plane(sign, P.call(0, 5.8, 8.06), 13.0, 2.6, turn)
	tm.box(trim, trim, P.call(hvac_at.x, 7.7, hvac_at.y), Vector3(3, 1.4, 2.2), turn)
