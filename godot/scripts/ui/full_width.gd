extends Container
## `width:100%` for a child of a flow container: keeps the minimum width equal
## to the parent's, so the flow gives it a whole line.

func _process(_delta: float) -> void:
	var p := get_parent() as Control
	if p == null:
		return
	var w := p.size.x
	if not is_equal_approx(custom_minimum_size.x, w):
		custom_minimum_size.x = w
