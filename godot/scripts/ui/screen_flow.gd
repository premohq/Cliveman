class_name ScreenFlow
extends Container
## The inside of #screen: block children stacked top to bottom with CSS margin
## collapsing.
##
## This matters more than it sounds. Every `.line` has `margin-bottom:6px`, and
## #screen is a block formatting context, so adjacent margins collapse and an
## empty `.line` (what blank() appends) collapses through to nothing. A
## VBoxContainer with a separation of 6 would add a gap for every blank() call
## and the story would read double-spaced.
##
## Per-child metadata:
##   mt, mb   margin-top / margin-bottom in px (default 0 / 6)
##   inline   true for `display:inline-block` children, which take their own
##            minimum width and are centred by the parent's `text-align:center`
##
## An inline-block is not a block: it sits in a line box of #screen, on the
## baseline of #screen's strut, and its margins stay inside that line box
## instead of collapsing. So a run of them (the horse race, the snake board)
## is spaced by the strut, not by `.line` margins alone.

var pad_left := 0.0
var pad_right := 0.0
var pad_top := 0.0
var pad_bottom := 0.0

var content_height := 0.0

## #screen's strut: its line-height, and its baseline from the top of a line
## box with Blink's floored half-leading.
var strut_h := 27.5
var strut_baseline := 20.0


func _notification(what: int) -> void:
	if what == NOTIFICATION_SORT_CHILDREN:
		_sort()


func _sort() -> void:
	var avail := maxf(0.0, size.x - pad_left - pad_right)
	var y := pad_top
	var pending := 0.0
	var run: Array[Control] = []   ## consecutive inline-blocks, laid out together
	for c in get_children():
		var ctl := c as Control
		if ctl == null or not ctl.visible or ctl.top_level:
			continue
		if ctl.get_meta("inline", false):
			run.append(ctl)
			continue
		if not run.is_empty():
			y = _lay_inline_run(run, y + pending, avail)
			pending = 0.0
			run.clear()
		var mt: float = ctl.get_meta("mt", 0.0)
		var mb: float = ctl.get_meta("mb", 6.0)
		var w := avail
		var x := pad_left
		# Width first: children whose height follows their width (wrapped text)
		# recompute their minimum as soon as they are resized.
		if not is_equal_approx(ctl.size.x, w):
			ctl.size = Vector2(w, ctl.size.y)
		var h := ctl.get_combined_minimum_size().y
		pending = maxf(pending, mt)
		if h <= 0.0:
			# An empty block: its own margins collapse into the running margin.
			pending = maxf(pending, mb)
			fit_child_in_rect(ctl, Rect2(x, y + pending, w, 0.0))
			continue
		var top := y + pending
		fit_child_in_rect(ctl, Rect2(x, top, w, h))
		y = top + h
		pending = mb
	if not run.is_empty():
		y = _lay_inline_run(run, y + pending, avail)
		pending = 0.0
	content_height = y + pending + pad_bottom
	if not is_equal_approx(custom_minimum_size.y, content_height):
		custom_minimum_size = Vector2(0.0, content_height)


## A run of inline-blocks in one anonymous block: packed onto line boxes as
## far as the width allows, each line centred (text-align:center), every box
## on the strut's baseline. Returns the bottom of the last line box.
func _lay_inline_run(run: Array[Control], top: float, avail: float) -> float:
	var y := top
	var i := 0
	while i < run.size():
		# fill one line
		var line: Array[Control] = []
		var used := 0.0
		while i < run.size():
			var ctl := run[i]
			var w := minf(avail, ctl.get_combined_minimum_size().x)
			if not line.is_empty() and used + w > avail + 0.01:
				break
			if not is_equal_approx(ctl.size.x, w):
				ctl.size = Vector2(w, ctl.size.y)
			line.append(ctl)
			used += w
			i += 1
		# baselines
		var line_top := 0.0
		var line_bot := strut_h
		var offs: Array[float] = []
		for ctl in line:
			var mt: float = ctl.get_meta("mt", 0.0)
			var mb: float = ctl.get_meta("mb", 6.0)
			var h := ctl.get_combined_minimum_size().y
			# no line boxes inside: the baseline is the bottom margin edge
			var b: float = h + mb
			if h > 0.0 and ctl.has_method("blink_baseline"):
				b = ctl.call("blink_baseline")
			var off := strut_baseline - (mt + b)
			offs.append(off)
			line_top = minf(line_top, off)
			line_bot = maxf(line_bot, off + mt + h + mb)
		var x := pad_left + (avail - used) * 0.5
		for k in line.size():
			var ctl := line[k]
			var mt: float = ctl.get_meta("mt", 0.0)
			var h := ctl.get_combined_minimum_size().y
			fit_child_in_rect(ctl, Rect2(x, y + (offs[k] + mt - line_top), ctl.size.x, h))
			x += ctl.size.x
		y += line_bot - line_top
	return y


func _get_minimum_size() -> Vector2:
	return Vector2(0.0, content_height)
