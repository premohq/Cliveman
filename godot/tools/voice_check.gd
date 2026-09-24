extends Node
## Prints the voice pool and the full cast assignment, so casting can be checked
## after installing or removing system voices.
##
##   godot --path . tools/voice_check.tscn
##
## Needs a display server: the speech engine is not available headless.

func _ready() -> void:
	var v := Voice.new()
	add_child(v)
	print("text-to-speech supported: ", v.supported())
	for line in v.casting_report():
		print(line)
	get_tree().quit(0)
