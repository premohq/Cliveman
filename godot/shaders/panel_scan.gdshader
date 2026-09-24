shader_type canvas_item;
render_mode unshaded;

// .story-panel-scan, multiplied over the reaction shot:
//   repeating-linear-gradient(to bottom, rgba(255,255,255,0) 0 3px, rgba(0,0,0,.14) 3px 4px),
//   radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 56%, rgba(0,0,0,.32) 100%)
// `circle` with no size is farthest-corner, measured in pixels.

uniform vec2 box_px = vec2(294.0, 369.0);

void fragment() {
	vec2 p = UV * box_px;
	float stripe = step(3.0, mod(p.y, 4.0)) * 0.14;

	vec2 c = vec2(0.5, 0.42) * box_px;
	vec2 far = max(c, box_px - c);
	float radius = length(far);
	float d = length(p - c) / radius;
	float vig = clamp((d - 0.56) / 0.44, 0.0, 1.0) * 0.32;

	// Two black layers composited over each other: alpha_out = 1-(1-a)(1-b).
	float a = 1.0 - (1.0 - stripe) * (1.0 - vig);
	COLOR = vec4(0.0, 0.0, 0.0, a);
}
