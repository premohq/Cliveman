shader_type canvas_item;
render_mode unshaded;

// startStatic(): a quarter-resolution buffer of uniform random greys, blown up
// nearest-neighbour, refilled every animation frame. The hash has to be as
// structureless as Math.random(): a weaker one leaves a visible weave in the
// snow instead of the browser's clumpy grain.

uniform float scale = 4.0;

float hash13(vec3 p3) {
	p3 = fract(p3 * 0.1031);
	p3 += dot(p3, p3.zyx + 31.32);
	return fract((p3.x + p3.y) * p3.z);
}

void fragment() {
	vec2 cell = floor(FRAGCOORD.xy / scale);
	float frame = floor(TIME * 60.0);
	// (Math.random() * 255) | 0, so the greys land on byte steps
	float v = floor(hash13(vec3(cell, frame)) * 255.0) / 255.0;
	COLOR = vec4(vec3(v), 1.0);
}
