shader_type canvas_item;
render_mode unshaded;

// .story-panel-img { filter: contrast(1.02) saturate(.92) }
//
// COLOR arrives already sampled from the texture region the TextureRect chose
// for object-fit:cover; sampling TEXTURE again with UV would ignore that region.

void fragment() {
	vec4 c = COLOR;
	vec3 col = (c.rgb - 0.5) * 1.02 + 0.5;
	// CSS saturate() is the Filter Effects saturate matrix.
	float s = 0.92;
	mat3 m = mat3(
		vec3(0.213 + 0.787 * s, 0.213 - 0.213 * s, 0.213 - 0.213 * s),
		vec3(0.715 - 0.715 * s, 0.715 + 0.285 * s, 0.715 - 0.715 * s),
		vec3(0.072 - 0.072 * s, 0.072 - 0.072 * s, 0.072 + 0.928 * s));
	col = m * clamp(col, 0.0, 1.0);
	COLOR = vec4(clamp(col, 0.0, 1.0), c.a);
}
