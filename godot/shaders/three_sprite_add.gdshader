shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never, blend_add;

// THREE.Sprite with AdditiveBlending: the taillight flare. Same body as
// three_sprite.gdshader, which cannot be included because render_mode has to
// differ per shader.

uniform sampler2D map : filter_linear_mipmap;
uniform vec3 tint = vec3(1.0);
uniform float opacity = 1.0;
uniform float world_size = 1.0;

vec3 srgb_decode(vec3 c) {
	return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

vec3 srgb_encode(vec3 c) {
	c = clamp(c, 0.0, 1.0);
	return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void vertex() {
	vec3 centre = (MODELVIEW_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	POSITION = PROJECTION_MATRIX * vec4(centre + vec3(VERTEX.xy * world_size, 0.0), 1.0);
}

void fragment() {
	vec4 texel = texture(map, UV);
	ALBEDO = srgb_encode(texel.rgb * srgb_decode(tint));
	ALPHA = texel.a * opacity;
}
