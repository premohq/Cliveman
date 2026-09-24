shader_type canvas_item;
render_mode unshaded;

// #crtPowerOn: the black screen lifting through #0a1a0e, and on top of it the
// .crtFlash bar (2px, white, box-shadow 0 0 30px 8px + 0 0 60px 16px) under a
// scale(sx, sy) transform about its centre, at group opacity `op`.
//
// While the bar is thin the browser's glow is the two box-shadows blurred and
// scaled with it, sigma 0.68 of the blur radius (fitted to frozen frames).
// Once the bar is stretched past a couple of pixels Chrome no longer scales the
// blur with it: the glow sits as a near-solid wash that dims a little away from
// the bar and more at the side edges, and that part is fitted directly.

uniform vec2 view = vec2(1280.0, 720.0);
uniform float sx = 1.0;
uniform float sy = 1.0;
uniform float op = 0.0;
uniform vec4 bg = vec4(0.0, 0.0, 0.0, 1.0);

float phi(float x) {
	// Abramowitz-Stegun 7.1.26 erf, good to 1.5e-7
	float z = abs(x) * 0.70710678;
	float t = 1.0 / (1.0 + 0.3275911 * z);
	float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t
		- 0.284496736) * t + 0.254829592) * t * exp(-z * z);
	return 0.5 * (1.0 + sign(x) * y);
}

// A box of half-extent `half` blurred by a Gaussian of `sigma`, at offset d.
float blurred_box(float d, float half_extent, float sigma) {
	return phi((half_extent - d) / sigma) - phi((-half_extent - d) / sigma);
}

void fragment() {
	vec2 p = UV * view;
	// top:50%, height 2px, transform-origin at the element's centre
	vec2 c = vec2(view.x * 0.5, view.y * 0.5 + 1.0);
	vec2 d = abs(p - c);
	float hw = view.x * 0.5;

	// the bar itself, with pixel coverage at its edges
	float bar = clamp(sy - d.y + 0.5, 0.0, 1.0) * clamp(sx * hw - d.x + 0.5, 0.0, 1.0);

	float glow;
	float lx = d.x / max(sx, 0.001);
	float fx1 = blurred_box(lx, hw + 8.0, 0.68 * 30.0);
	float fx2 = blurred_box(lx, hw + 16.0, 0.68 * 60.0);
	if (sy < 2.0) {
		float ly = d.y / sy;
		float a1 = fx1 * blurred_box(ly, 9.0, 0.68 * 30.0);
		float a2 = fx2 * blurred_box(ly, 17.0, 0.68 * 60.0);
		glow = 1.0 - (1.0 - a1) * (1.0 - a2);
	} else {
		float slope = 2.1e-4 * pow(51.4 / sy, 1.5);
		float vc = clamp(0.96 - slope * max(0.0, d.y - sy), 0.0, 0.999);
		float v = 1.0 - sqrt(1.0 - vc);
		glow = 1.0 - (1.0 - fx1 * v) * (1.0 - fx2 * v);
	}
	float af = op * (1.0 - (1.0 - glow) * (1.0 - bar));

	// white flash over the background, both straight alpha
	float a = af + bg.a * (1.0 - af);
	vec3 rgb = (vec3(af) + bg.rgb * bg.a * (1.0 - af)) / max(a, 1e-5);
	COLOR = vec4(rgb, a);
}
