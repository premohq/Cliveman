class_name NavGrid
extends RefCounted
## A room grid as the browser build passes it around: an array of rows of
## one-character symbols, plus the optional extras the factory hangs off the
## array (grid._floorH, grid._worldMap, grid._factoryStacked, grid._ceilH).
##
## Events may edit `cells` in place (a picked-up item becomes 'X', the fourth
## floor figure vanishes), exactly as the JS mutates its grid.

## engine/raycaster.js WALL_HEIGHTS
const WALL_HEIGHTS := {"#": 1.0, "=": 0.40, "h": 0.55, "b": 0.30}

var cells: Array = []
var floor_h: Array = []        ## grid._floorH, rows of floats, or empty
var world_map: Array = []      ## grid._worldMap, rows of {x,y,z,floor} or null
var factory_stacked := false
var ceil_h := 0.0


static func from_rows(rows: Array) -> NavGrid:
	var g := NavGrid.new()
	for r in rows:
		g.cells.append((r as Array).duplicate())
	return g


func rows() -> int:
	return cells.size()


func row_len(r: int) -> int:
	return (cells[r] as Array).size() if r >= 0 and r < cells.size() else 0


func sym(r: int, c: int) -> String:
	if r < 0 or r >= cells.size():
		return ""
	var row: Array = cells[r]
	if c < 0 or c >= row.size():
		return ""
	return row[c]


func in_bounds(r: int, c: int) -> bool:
	return r >= 0 and r < cells.size() and c >= 0 and c < (cells[r] as Array).size()


## rcWallHeight(sym)
static func wall_height(s: String) -> float:
	return WALL_HEIGHTS.get(s, 0.0)


func has_floor_h() -> bool:
	return not floor_h.is_empty()


func has_world_map() -> bool:
	return not world_map.is_empty()


func wm_cell(r: int, c: int) -> Variant:
	if world_map.is_empty() or r < 0 or r >= world_map.size():
		return null
	var row: Array = world_map[r]
	if c < 0 or c >= row.size():
		return null
	return row[c]


func floor_at(r: int, c: int) -> Variant:
	if floor_h.is_empty() or r < 0 or r >= floor_h.size():
		return null
	var row: Array = floor_h[r]
	if c < 0 or c >= row.size():
		return null
	return row[c]
