shader_type canvas_item;
render_mode unshaded;

// .fp-canvas,.cv-canvas{filter:saturate(1.06) contrast(1.05) brightness(1.02)}
// CSS filter functions apply left to right.

uniform float saturate_amt = 1.06;
uniform float contrast_amt = 1.05;
uniform float brightness_amt = 1.02;

void fragment() {
	// COLOR is already the texture region object-fit:cover selected.
	vec4 c = COLOR;
	vec3 col = c.rgb;
	// saturate(): the feColorMatrix saturate matrix from the Filter Effects spec
	float s = saturate_amt;
	mat3 m = mat3(
		vec3(0.213 + 0.787 * s, 0.213 - 0.213 * s, 0.213 - 0.213 * s),
		vec3(0.715 - 0.715 * s, 0.715 + 0.285 * s, 0.715 - 0.715 * s),
		vec3(0.072 - 0.072 * s, 0.072 - 0.072 * s, 0.072 + 0.928 * s));
	col = clamp(m * col, 0.0, 1.0);
	col = clamp((col - 0.5) * contrast_amt + 0.5, 0.0, 1.0);
	col = clamp(col * brightness_amt, 0.0, 1.0);
	COLOR = vec4(col, 1.0);
}
