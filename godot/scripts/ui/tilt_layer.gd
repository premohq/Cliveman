class_name TiltLayer
extends SubViewportContainer
## Holds the terminal's SubViewport (see shaders/terminal_tilt.gdshader).
##
## Mouse input flows into the viewport as usual. Keys and pad events do not:
## Terminal._input forwards them once the game's own key handling (typing
## skip, dialogue gates, nav keys) has passed on them, so a focused button in
## the terminal sees a key only when it would have without the layer.

func _propagate_input_event(event: InputEvent) -> bool:
	return not (event is InputEventKey or event is InputEventJoypadButton
		or event is InputEventJoypadMotion or event is InputEventAction)
