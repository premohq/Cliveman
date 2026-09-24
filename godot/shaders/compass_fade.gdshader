shader_type canvas_item;

// CMCOMPASS edge fade: the strip is finished with a destination-out linear
// gradient, opaque at both ends and clear from 18% to 82% of its width, so
// glyphs dissolve across the last fifth of either side.

uniform float width = 200.0;

varying float v_x;

void vertex() {
	v_x = VERTEX.x;
}

void fragment() {
	float u = v_x / width;
	float cut = 0.0;
	if (u < 0.18) {
		cut = 1.0 - u / 0.18;
	} else if (u > 0.82) {
		cut = (u - 0.82) / 0.18;
	}
	COLOR.a *= 1.0 - clamp(cut, 0.0, 1.0);
}
