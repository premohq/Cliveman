extends HFlowContainer
## The title button row: `display:flex;flex-wrap:wrap;gap:10px;align-items:center;
## justify-content:center;width:100%`. Full width of its parent, children
## centred vertically within their line.

func _process(_delta: float) -> void:
	# dir=rtl reverses the row
	var d := Control.LAYOUT_DIRECTION_RTL if I18n.is_rtl() else Control.LAYOUT_DIRECTION_LTR
	if layout_direction != d:
		layout_direction = d
	var p := get_parent() as Control
	if p == null:
		return
	if not is_equal_approx(custom_minimum_size.x, p.size.x):
		custom_minimum_size.x = p.size.x
	for c in get_children():
		if c is Control:
			(c as Control).size_flags_vertical = Control.SIZE_SHRINK_CENTER
