shader_type canvas_item;
render_mode unshaded;

// ─────────────────────────────────────────────────────────────────────────────
// Cliveman CRT glass.
//
// This is a direct translation of the CSS presentation stack in the original
// index.html: #crtVignette (vignette + glare + scanlines + phosphor grid),
// the .crt text-shadow glow, the flicker keyframe, and the #crtInner barrel
// filter. Defaults below reproduce the browser values; the barrel curve is a
// true radial distortion rather than the SVG displacement map the web build
// approximates it with.
// ─────────────────────────────────────────────────────────────────────────────

uniform sampler2D screen_tex : hint_screen_texture, repeat_disable, filter_linear;

// Barrel curve. 0.0 is a flat panel. The browser build is very nearly flat —
// its SVG displacement filter bends the picture only a pixel or two — so keep
// this low. `overscan` zooms in just enough that the curve never exposes bezel
// along the edges.
uniform float curvature : hint_range(0.0, 0.30) = 0.018;
uniform float overscan : hint_range(1.0, 1.10) = 1.012;

// Phosphor bleed. Stands in for `text-shadow:0 0 4px, 0 0 12px` on .crt.
uniform float bloom_strength : hint_range(0.0, 2.0) = 0.45;
uniform float bloom_radius : hint_range(0.0, 8.0) = 2.4;

// repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,.22) 2px 3px)
uniform float scanline_strength : hint_range(0.0, 1.0) = 0.22;
uniform float scanline_period : hint_range(1.0, 8.0) = 3.0;

// repeating-linear-gradient(90deg, rgba(0,0,0,.06) 0 1px, transparent 1px 3px)
uniform float dot_strength : hint_range(0.0, 1.0) = 0.06;
uniform float dot_period : hint_range(1.0, 8.0) = 3.0;

// radial-gradient(ellipse 96% 96% at 50% 50%, transparent 50%, .34 80%, .78 100%)
uniform float vignette_mid : hint_range(0.0, 1.0) = 0.34;
uniform float vignette_edge : hint_range(0.0, 1.0) = 0.78;

uniform float glare_top : hint_range(0.0, 0.5) = 0.08;
uniform float glare_corner : hint_range(0.0, 0.5) = 0.06;

// radial-gradient(ellipse 72% 72% at 50% 48%, rgba(60,255,120,.06) 0%, transparent 72%)
uniform vec3 phosphor_wash : source_color = vec3(0.235, 1.0, 0.470);
uniform float wash_strength : hint_range(0.0, 0.5) = 0.025;

// @keyframes flicker { 0% .97  50% 1  100% .98 } 0.15s infinite
uniform float flicker_amount : hint_range(0.0, 0.25) = 0.03;
uniform float flicker_speed : hint_range(0.0, 200.0) = 42.0;

// Bevan death effect. Driven from GDScript; 0.0 the rest of the time.
uniform float red_vignette : hint_range(0.0, 1.0) = 0.0;

vec2 barrel(vec2 uv, float k, float zoom) {
	vec2 c = (uv * 2.0 - 1.0) / zoom;
	c *= 1.0 + k * dot(c, c);
	return c * 0.5 + 0.5;
}

// Elliptical falloff, matching the CSS `ellipse W% H% at X% Y%` form.
float ellipse_dist(vec2 uv, vec2 center, vec2 radius) {
	return length((uv - center) / radius);
}

void fragment() {
	vec2 uv = barrel(SCREEN_UV, curvature, overscan);

	// Past the edge of the curved glass there is no picture, only bezel.
	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
		COLOR = vec4(0.0, 0.0, 0.0, 1.0);
	} else {
		vec3 col = texture(screen_tex, uv).rgb;

		// ── phosphor bleed ──────────────────────────────────────────────────
		// Eight taps on a ring plus a wider second ring. The web build stacks
		// per-element text-shadows; doing it here applies the same glow to
		// every pixel, which is what the .crt container effectively did.
		vec2 px = SCREEN_PIXEL_SIZE * bloom_radius;
		vec3 glow = vec3(0.0);
		glow += texture(screen_tex, uv + vec2( px.x, 0.0)).rgb;
		glow += texture(screen_tex, uv + vec2(-px.x, 0.0)).rgb;
		glow += texture(screen_tex, uv + vec2(0.0,  px.y)).rgb;
		glow += texture(screen_tex, uv + vec2(0.0, -px.y)).rgb;
		glow += texture(screen_tex, uv + px * 0.707).rgb;
		glow += texture(screen_tex, uv - px * 0.707).rgb;
		glow += texture(screen_tex, uv + vec2(px.x, -px.y) * 0.707).rgb;
		glow += texture(screen_tex, uv + vec2(-px.x, px.y) * 0.707).rgb;
		vec2 wide = px * 3.0;
		glow += texture(screen_tex, uv + vec2( wide.x, 0.0)).rgb * 0.5;
		glow += texture(screen_tex, uv + vec2(-wide.x, 0.0)).rgb * 0.5;
		glow += texture(screen_tex, uv + vec2(0.0,  wide.y)).rgb * 0.5;
		glow += texture(screen_tex, uv + vec2(0.0, -wide.y)).rgb * 0.5;
		col += (glow / 10.0) * bloom_strength;

		// ── green screen wash ───────────────────────────────────────────────
		// CSS: radial-gradient(ellipse 72% 72% at 50% 48%, ...). A radial
		// gradient's percentage radii are measured against the full width and
		// height, not the half-extent, so 72% is 0.72 here — not 0.36.
		float wash = 1.0 - smoothstep(0.0, 0.72, ellipse_dist(uv, vec2(0.5, 0.48), vec2(0.72, 0.72)));
		col += phosphor_wash * wash_strength * wash;

		// ── scanlines ───────────────────────────────────────────────────────
		float sl = step(scanline_period - 1.0, mod(FRAGCOORD.y, scanline_period));
		col *= 1.0 - scanline_strength * sl;

		// ── phosphor dot grid ───────────────────────────────────────────────
		float dg = 1.0 - step(1.0, mod(FRAGCOORD.x, dot_period));
		col *= 1.0 - dot_strength * dg;

		// ── curved-glass corner falloff ─────────────────────────────────────
		// CSS: ellipse 96% 96% at 50% 50%, transparent 50% -> .34 80% -> .78 100%.
		// At a side midpoint that is d = 0.5/0.96 = 0.52, barely into the first
		// ramp, which is why the browser build darkens corners but not edges.
		float d = ellipse_dist(uv, vec2(0.5, 0.5), vec2(0.96, 0.96));
		float vig = mix(0.0, vignette_mid, smoothstep(0.50, 0.80, d));
		vig = mix(vig, vignette_edge, smoothstep(0.80, 1.0, d));
		col *= 1.0 - vig;

		// ── glare: soft wash off the top, plus a corner highlight ───────────
		float g1 = 1.0 - smoothstep(0.0, 0.58, ellipse_dist(uv, vec2(0.50, -0.04), vec2(0.85, 0.55)));
		float g2 = 1.0 - smoothstep(0.0, 0.66, ellipse_dist(uv, vec2(0.80, 0.06), vec2(0.45, 0.32)));
		col += vec3(glare_top * g1 + glare_corner * g2);

		// ── death effect ────────────────────────────────────────────────────
		if (red_vignette > 0.001) {
			float rd = ellipse_dist(uv, vec2(0.5, 0.5), vec2(0.707, 0.707));
			float r = smoothstep(0.38, 1.0, rd) * red_vignette;
			col = mix(col, vec3(0.55, 0.0, 0.0), r * 0.75);
		}

		// ── tube flicker ────────────────────────────────────────────────────
		float f = 1.0 - flicker_amount * (0.5 + 0.5 * sin(TIME * flicker_speed));
		col *= f;

		COLOR = vec4(col, 1.0);
	}
}
