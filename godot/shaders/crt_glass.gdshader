shader_type canvas_item;
render_mode unshaded, blend_mix;

// The CRT presentation from index.html as plain alpha layers, composited in
// the same order the browser paints them. Nothing here reads the screen: every
// CSS layer is a translucent black or white wash, so a correctly ordered stack
// of alpha blends reproduces it exactly, including over the 3D views.
//
// mode 0: the pseudo-elements of .crt, which sit over the terminal and flicker
//         with it
//   .crt::before  repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 2px,
//                                           rgba(0,0,0,.22) 3px 4px)
//   .crt::after   radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.85) 100%)
//
// mode 1: #crtVignette, the curved-glass overlay above everything
//   background (bottom to top):
//     radial-gradient(ellipse 45% 32% at 80% 6%, rgba(255,255,255,.06) 0%, transparent 66%)
//     radial-gradient(ellipse 85% 55% at 50% -4%, rgba(255,255,255,.08) 0%, transparent 58%)
//     radial-gradient(ellipse 96% 96% at 50% 50%, transparent 50%, .34 80%, .78 100%)
//   box-shadow: inset 0 0 18px rgba(0,0,0,.45) under inset 0 0 90px rgba(0,0,0,.55)
//   ::before  repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,.22) 2px 3px)
//   ::after   radial-gradient(ellipse 72% 72% at 50% 48%, rgba(60,255,120,.06) 0%, transparent 72%)
//             under repeating-linear-gradient(90deg, rgba(0,0,0,.06) 0 1px, transparent 1px 3px)

uniform int mode = 1;
uniform vec2 view_px = vec2(1280.0, 720.0);

vec4 over(vec4 below, vec3 c, float a) {
	float oa = a + below.a * (1.0 - a);
	if (oa <= 0.0) return vec4(0.0);
	vec3 oc = (c * a + below.rgb * below.a * (1.0 - a)) / oa;
	return vec4(oc, oa);
}

// Standard normal CDF, via the Abramowitz-Stegun erf approximation.
float phi(float x) {
	float t = 1.0 / (1.0 + 0.3275911 * abs(x) / 1.41421356);
	float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x / 2.0);
	return x >= 0.0 ? 0.5 * (1.0 + y) : 0.5 * (1.0 - y);
}

// An inset box-shadow with zero offset and spread: the blurred outside of the box.
float inset_shadow(vec2 p, vec2 size, float blur) {
	float s = blur * 0.5;
	float hx = phi(p.x / s) - phi((p.x - size.x) / s);
	float hy = phi(p.y / s) - phi((p.y - size.y) / s);
	return 1.0 - hx * hy;
}

void fragment() {
	vec2 p = UV * view_px;          // pixel centre in CSS px
	vec2 uv = UV;
	vec4 acc = vec4(0.0);

	if (mode == 0) {
		float ph = mod(p.y, 4.0);
		float sl = ph < 2.0 ? 0.0 : (ph < 3.0 ? (ph - 2.0) * 0.22 : 0.22);
		acc = over(acc, vec3(0.0), sl);

		float d = length((uv - 0.5) / 0.70710678);
		float v = clamp((d - 0.55) / 0.45, 0.0, 1.0) * 0.85;
		acc = over(acc, vec3(0.0), v);
	} else {
		float g2 = length((uv - vec2(0.80, 0.06)) / vec2(0.45, 0.32));
		acc = over(acc, vec3(1.0), 0.06 * clamp(1.0 - g2 / 0.66, 0.0, 1.0));

		float g1 = length((uv - vec2(0.50, -0.04)) / vec2(0.85, 0.55));
		acc = over(acc, vec3(1.0), 0.08 * clamp(1.0 - g1 / 0.58, 0.0, 1.0));

		float dv = length((uv - 0.5) / 0.96);
		float va = dv <= 0.5 ? 0.0 : (dv <= 0.8 ? (dv - 0.5) / 0.3 * 0.34 : 0.34 + clamp((dv - 0.8) / 0.2, 0.0, 1.0) * 0.44);
		acc = over(acc, vec3(0.0), va);

		acc = over(acc, vec3(0.0), 0.45 * inset_shadow(p, view_px, 18.0));
		acc = over(acc, vec3(0.0), 0.55 * inset_shadow(p, view_px, 90.0));

		float sl = mod(p.y, 3.0) >= 2.0 ? 0.22 : 0.0;
		acc = over(acc, vec3(0.0), sl);

		float w = length((uv - vec2(0.5, 0.48)) / 0.72);
		acc = over(acc, vec3(60.0, 255.0, 120.0) / 255.0, 0.06 * clamp(1.0 - w / 0.72, 0.0, 1.0));

		float dot = mod(p.x, 3.0) < 1.0 ? 0.06 : 0.0;
		acc = over(acc, vec3(0.0), dot);
	}
	COLOR = acc;
}
