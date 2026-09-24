shader_type canvas_item;
render_mode unshaded;

// body.nav-mode:not(.nav-dialog)::after, body.cv-driving::after: one shared
// "CRT glass" over both 3D viewports.
//   repeating-linear-gradient(0deg, rgba(0,0,0,.14) 0 1px, transparent 1px 3px)
//   radial-gradient(ellipse at center, rgba(120,255,160,.03) 0%, transparent 55%, rgba(0,0,0,.32) 100%)
// 0deg runs bottom to top, so the stripes are anchored to the bottom edge.

uniform vec2 view_px = vec2(1280.0, 720.0);

vec4 over(vec4 below, vec3 c, float a) {
	float oa = a + below.a * (1.0 - a);
	if (oa <= 0.0) return vec4(0.0);
	return vec4((c * a + below.rgb * below.a * (1.0 - a)) / oa, oa);
}

void fragment() {
	vec2 p = UV * view_px;
	vec4 acc = vec4(0.0);
	float d = length((UV - 0.5) / 0.70710678);
	if (d <= 0.55) {
		acc = over(acc, vec3(120.0, 255.0, 160.0) / 255.0, 0.03 * (1.0 - d / 0.55));
	} else {
		acc = over(acc, vec3(0.0), 0.32 * clamp((d - 0.55) / 0.45, 0.0, 1.0));
	}
	float from_bottom = view_px.y - p.y;
	float s = mod(from_bottom, 3.0) < 1.0 ? 0.14 : 0.0;
	acc = over(acc, vec3(0.0), s);
	COLOR = acc;
}
