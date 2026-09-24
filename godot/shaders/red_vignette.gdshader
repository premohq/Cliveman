shader_type canvas_item;
render_mode unshaded;

// #redVignette: radial-gradient(ellipse at center, rgba(120,0,0,0) 38%,
//   rgba(150,0,0,.55) 74%, rgba(40,0,0,.92) 100%). Opacity is the node's.
// Premultiplied interpolation, as CSS gradients use.

void fragment() {
	float d = length((UV - 0.5) / 0.70710678);
	vec4 a = vec4(vec3(120.0, 0.0, 0.0) / 255.0 * 0.0, 0.0);
	vec4 b = vec4(vec3(150.0, 0.0, 0.0) / 255.0 * 0.55, 0.55);
	vec4 c = vec4(vec3(40.0, 0.0, 0.0) / 255.0 * 0.92, 0.92);
	vec4 p;
	if (d <= 0.38) p = a;
	else if (d <= 0.74) p = mix(a, b, (d - 0.38) / 0.36);
	else p = mix(b, c, clamp((d - 0.74) / 0.26, 0.0, 1.0));
	COLOR = p.a > 0.0 ? vec4(p.rgb / p.a, p.a) : vec4(0.0);
}
