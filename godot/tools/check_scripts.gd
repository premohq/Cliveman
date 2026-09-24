extends Node
## Loads every script and shader in the project so parse errors surface in one
## pass, with the autoloads present (a --script run has none):
##   godot --headless --path . tools/check_scripts.tscn

func _ready() -> void:
	var failed := 0
	for dir in ["res://scripts", "res://tools", "res://shaders"]:
		failed += _walk(dir)
	print("check_scripts: %d failure(s)" % failed)
	get_tree().quit(1 if failed > 0 else 0)


func _walk(dir: String) -> int:
	var failed := 0
	var d := DirAccess.open(dir)
	if d == null:
		return 0
	for f in d.get_files():
		var p := dir.path_join(f)
		if f.ends_with(".gd"):
			var s: Script = load(p)
			if s == null or not s.can_instantiate():
				print("FAILED ", p)
				failed += 1
		elif f.ends_with(".gdshader"):
			var sh: Shader = load(p)
			if sh == null:
				print("FAILED ", p)
				failed += 1
	for sub in d.get_directories():
		failed += _walk(dir.path_join(sub))
	return failed
