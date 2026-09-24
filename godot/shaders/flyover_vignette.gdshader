shader_type canvas_item;
render_mode unshaded;

// Darkens the attract-mode city so the title text stays readable. Port of
// #titleFlyoverVignette in engine/title-flyover.js:
//
//   radial-gradient(ellipse at 50% 44%,
//     rgba(2,8,4,0.50) 0%, rgba(2,8,4,0.66) 52%, rgba(2,8,4,0.90) 100%)

uniform vec3 tint : source_color = vec3(0.008, 0.031, 0.016);
uniform float centre_alpha : hint_range(0.0, 1.0) = 0.50;
uniform float mid_alpha : hint_range(0.0, 1.0) = 0.66;
uniform float edge_alpha : hint_range(0.0, 1.0) = 0.90;

void fragment() {
	// A centred ellipse reaching the farthest corner, as the CSS default does.
	vec2 d = (SCREEN_UV - vec2(0.5, 0.44)) / vec2(0.707, 0.707);
	float r = clamp(length(d), 0.0, 1.0);

	float a = mix(centre_alpha, mid_alpha, smoothstep(0.0, 0.52, r));
	a = mix(a, edge_alpha, smoothstep(0.52, 1.0, r));

	COLOR = vec4(tint, a);
}
