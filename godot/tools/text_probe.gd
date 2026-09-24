extends Node
## Prints laid-out text widths, to compare against the browser's measurements:
##   godot --headless --path . tools/text_probe.tscn

const CASES := [
	["vt323", 28, 3, "📂 LOAD SAVE STATE"],
	["vt323", 28, 3, "▶ START NEW GAME"],
	["vt323", 28, 3, "LOAD SAVE STATE"],
	["vt323", 22, 0, "DUDLEY PD // CASE TERMINAL // CLIVEMAN.EXE"],
	["vt323", 18, 0, "DUDLEY PD // CASE TERMINAL // CLIVEMAN.EXE"],
	["vt323", 16, 1, "CONTINUE"],
	["vt323", 22, 0, " ▼"],
	["vt323", 32, 0, "⚙"],
	["mono", 16, 0, "+--------------------+"],
	["vt323", 28, 0, "▶"],
	["vt323", 28, 0, "📂"],
	["vt323", 28, 0, "☰"],
	["vt323", 28, 0, "AAAAAAAAAA"],
]


func _ready() -> void:
	for c in CASES:
		var t := CrtText.new()
		t.font = Css.spaced(c[0], c[2])
		t.font_size = c[1]
		t.wrap = false
		t.text = c[3]
		add_child(t)
		print("%s %d ls%d [%s] width %.2f  asc %.2f desc %.2f" % [c[0], c[1], c[2], c[3], t.content_width(),
			t.font.get_ascent(c[1]), t.font.get_descent(c[1])])
	get_tree().quit()
