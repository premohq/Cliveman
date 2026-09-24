extends SceneTree
## Prints font metrics, for calibrating line boxes against the browser.
##   godot --headless --path . --script tools/font_probe.gd

func _init() -> void:
	for path in ["res://fonts/VT323-Regular.ttf", "res://fonts/ShareTechMono-Regular.ttf"]:
		var f: FontFile = load(path)
		for sz in [14, 16, 18, 19, 22, 28]:
			print("%s %d: ascent %.2f descent %.2f height %.2f adv(M) %.2f str(CONTINUE) %.2f" % [
				path.get_file(), sz, f.get_ascent(sz), f.get_descent(sz), f.get_height(sz),
				f.get_char_size(77, sz).x, f.get_string_size("CONTINUE", HORIZONTAL_ALIGNMENT_LEFT, -1, sz).x])
	quit()
