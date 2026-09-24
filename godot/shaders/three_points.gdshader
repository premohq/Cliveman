shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never;

// THREE.Points with a PointsMaterial: square sprites that always face the
// camera, sized in device pixels and scaled with distance
//   gl_PointSize = size * (height/2) / -z
// which is a constant world size of size * tan(fov/2) * 2 / 2, so the quad is
// built in view space at `world_size` across. Unlit, transparent, no depth
// write, and fogged like everything else (see three_common.gdshaderinc).

uniform vec3 point_rgb = vec3(1.0);
uniform float opacity = 1.0;
uniform float world_size = 1.0;
uniform vec3 fog_color = vec3(0.0);
uniform int fog_mode = 0;          // 0 linear, 1 the drive's height fog
uniform float fog_near = 1.0;
uniform float fog_far = 1000.0;
uniform float fog_density = 0.0;

varying float v_depth;
varying vec3 v_world;

float cv_hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float cv_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	float a = cv_hash(i);
	float b = cv_hash(i + vec2(1.0, 0.0));
	float c = cv_hash(i + vec2(0.0, 1.0));
	float d = cv_hash(i + vec2(1.0, 1.0));
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

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
	v_depth = -centre.z;
	v_world = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
}

void fragment() {
	vec3 c = srgb_encode(srgb_decode(point_rgb));
	float f = smoothstep(fog_near, fog_far, v_depth);
	if (fog_mode == 1) {
		// the drive's volumetric height fog, as in three_common.gdshaderinc
		vec3 ray = v_world - CAMERA_POSITION_WORLD;
		float banks = 0.65 + 0.7 * cv_noise(v_world.xz * 0.012);
		float b = 0.075;
		float dens_cam = fog_density * banks * exp(-b * clamp(CAMERA_POSITION_WORLD.y, -60.0, 60.0));
		float by = b * ray.y;
		float integral = abs(by) > 1e-4 ? (1.0 - exp(-by)) / by : 1.0;
		f = clamp(1.0 - exp(-dens_cam * length(ray) * integral), 0.0, 1.0);
	}
	ALBEDO = mix(c, fog_color, f);
	ALPHA = opacity;
}
