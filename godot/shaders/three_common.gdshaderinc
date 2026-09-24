// three.js r160 materials, re-implemented so the nav rooms and the city light
// exactly as the browser renders them: MeshBasicMaterial, MeshLambertMaterial
// and MeshStandardMaterial under physically-correct (non-legacy) lights, with
// three's smoothstep linear fog.
//
//   mode 0 basic     color * map
//   mode 1 lambert   (ambient + hemisphere + lights * NdotL) * diffuse / PI
//   mode 2 standard  lambert diffuse * (1 - metalness) + GGX specular
//
// Colour spaces. The Compatibility renderer does no conversion of its own
// here: source_color hints are not applied and ALBEDO reaches the framebuffer
// as written (tools/light_probe.tscn measures this). So every colour and
// texel arrives as the sRGB value three was given, is decoded to linear the way
// three's ColorManagement decodes hex and SRGBColorSpace textures, lit, and
// encoded back to sRGB by hand. As in three's fragment chain
// (colorspace_fragment, then fog_fragment), fog is mixed after encoding,
// against the fog colour in output (sRGB) space.
//
// Included by three_lit (opaque), three_lit_alpha (transparent) and
// three_overlay (transparent, no depth test).

uniform int mode = 1;
uniform vec4 color = vec4(1.0);
uniform sampler2D map_linear : filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D map_nearest : filter_nearest, repeat_enable;
// NearestFilter magnified, LinearMipmapLinear minified: the city facades and
// the street grid, which are pixel art up close but must not shimmer far off.
uniform sampler2D map_nearest_mip : filter_nearest_mipmap, repeat_enable;
uniform int map_mode = 0;             // 0 none, 1 linear, 2 nearest, 3 nearest+mips
// A texture three was given no colorSpace for (every canvas texture in the
// title flyover) is sampled as data and never decoded.
uniform bool map_srgb = true;
uniform vec2 uv_repeat = vec2(1.0);
uniform float alpha_test = 0.0;       // discard below this when > 0

uniform float roughness = 1.0;
uniform float metalness = 0.0;
uniform vec3 emissive_color = vec3(0.0);
uniform float emissive_intensity = 0.0;
uniform bool emissive_from_map = false;   // emissiveMap, the same texture

uniform vec3 ambient_color = vec3(0.0);
uniform float ambient_intensity = 0.0;
uniform vec3 ambient2_color = vec3(0.0);
uniform float ambient2_intensity = 0.0;
uniform vec3 hemi_sky = vec3(0.0);
uniform vec3 hemi_ground = vec3(0.0);
uniform float hemi_intensity = 0.0;
// Point lights: the nav flashlight is one of these; the drive has street
// lamps, the tail light and the goal beacon.
const int MAX_POINTS = 16;
uniform int point_count = 0;
uniform vec3 point_color[MAX_POINTS];
uniform float point_intensity[MAX_POINTS];
uniform vec3 point_pos[MAX_POINTS];
uniform float point_distance[MAX_POINTS];
uniform float point_decay[MAX_POINTS];
// Spot lights: the car's two headlights.
const int MAX_SPOTS = 4;
uniform int spot_count = 0;
uniform vec3 spot_color[MAX_SPOTS];
uniform float spot_intensity[MAX_SPOTS];
uniform vec3 spot_pos[MAX_SPOTS];
uniform vec3 spot_dir[MAX_SPOTS];          // normalised, points away from the lamp
uniform float spot_distance[MAX_SPOTS];
uniform float spot_decay[MAX_SPOTS];
uniform float spot_cone_cos[MAX_SPOTS];    // cos(angle)
uniform float spot_penumbra_cos[MAX_SPOTS];// cos(angle * (1 - penumbra))
uniform vec3 dir_color = vec3(1.0);
uniform float dir_intensity = 0.0;
uniform vec3 dir_to_light = vec3(0.0, 1.0, 0.0);  // normalised, world space

uniform bool fog_enabled = true;
// 0: three's linear Fog. 1: the drive bundle's volumetric height fog, the
// analytic integral of an exp(-b*y) density field along the view ray, with
// drifting banks from a 2D value noise (installVolumetricHeightFog).
uniform int fog_mode = 0;
uniform vec3 fog_color = vec3(0.0);
uniform float fog_near = 1.0;
uniform float fog_far = 1000.0;
uniform float fog_density = 0.0;

varying vec3 v_world;
varying vec3 v_normal;
varying float v_depth;

// The drive bundle's height fog: density thins with world height and drifts
// across the XZ plane with a cheap value noise.
#define CV_FOG_FALLOFF 0.075
#define CV_FOG_BASE_Y 0.0

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
	v_world = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	v_depth = -(MODELVIEW_MATRIX * vec4(VERTEX, 1.0)).z;
}

float d_ggx(float a, float nh) {
	float a2 = a * a;
	float den = nh * nh * (a2 - 1.0) + 1.0;
	return (1.0 / PI) * a2 / (den * den);
}

float v_smith(float a, float nl, float nv) {
	float a2 = a * a;
	float gv = nl * sqrt(a2 + (1.0 - a2) * nv * nv);
	float gl = nv * sqrt(a2 + (1.0 - a2) * nl * nl);
	return 0.5 / max(gv + gl, 1e-6);
}

void fragment() {
	vec4 texel = vec4(1.0);
	if (map_mode == 1) texel = texture(map_linear, UV * uv_repeat);
	else if (map_mode == 2) texel = texture(map_nearest, UV * uv_repeat);
	else if (map_mode == 3) texel = texture(map_nearest_mip, UV * uv_repeat);
	if (map_srgb) texel.rgb = srgb_decode(texel.rgb);
	vec4 diffuse = vec4(srgb_decode(color.rgb), color.a) * texel;
	if (alpha_test > 0.0 && diffuse.a < alpha_test) discard;

	vec3 outc = diffuse.rgb;
	if (mode != 0) {
		vec3 n = normalize(v_normal);
		if (!FRONT_FACING) n = -n;
		vec3 irr = srgb_decode(ambient_color) * ambient_intensity
			+ srgb_decode(ambient2_color) * ambient2_intensity;
		float w = 0.5 * n.y + 0.5;
		irr += mix(srgb_decode(hemi_ground), srgb_decode(hemi_sky), w) * hemi_intensity;

		vec3 base = mode == 2 ? diffuse.rgb * (1.0 - metalness) : diffuse.rgb;
		vec3 direct = vec3(0.0);
		vec3 spec = vec3(0.0);
		vec3 view_dir = normalize(CAMERA_POSITION_WORLD - v_world);
		float rough = clamp(max(roughness, 0.0525), 0.0, 1.0);
		float a = rough * rough;
		vec3 f0 = mix(vec3(0.04), diffuse.rgb, metalness);

		for (int i = 0; i < MAX_POINTS; i++) {
			if (i >= point_count) break;
			vec3 l = point_pos[i] - v_world;
			float dist = length(l);
			l /= max(dist, 1e-5);
			float fall = 1.0 / max(pow(dist, point_decay[i]), 0.01);
			if (point_distance[i] > 0.0) {
				float q = clamp(1.0 - pow(dist / point_distance[i], 4.0), 0.0, 1.0);
				fall *= q * q;
			}
			vec3 lc = srgb_decode(point_color[i]) * point_intensity[i] * fall;
			float nl = clamp(dot(n, l), 0.0, 1.0);
			direct += nl * lc;
			if (mode == 2) {
				vec3 h = normalize(l + view_dir);
				float nv = clamp(dot(n, view_dir), 0.0, 1.0);
				float nh = clamp(dot(n, h), 0.0, 1.0);
				float vh = clamp(dot(view_dir, h), 0.0, 1.0);
				vec3 F = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
				spec += nl * lc * F * v_smith(a, nl, nv) * d_ggx(a, nh);
			}
		}
		for (int i = 0; i < MAX_SPOTS; i++) {
			if (i >= spot_count) break;
			vec3 l = spot_pos[i] - v_world;
			float dist = length(l);
			l /= max(dist, 1e-5);
			float cone = smoothstep(spot_cone_cos[i], spot_penumbra_cos[i], dot(l, -spot_dir[i]));
			if (cone <= 0.0) continue;
			float fall = 1.0 / max(pow(dist, spot_decay[i]), 0.01);
			if (spot_distance[i] > 0.0) {
				float q = clamp(1.0 - pow(dist / spot_distance[i], 4.0), 0.0, 1.0);
				fall *= q * q;
			}
			vec3 lc = srgb_decode(spot_color[i]) * spot_intensity[i] * cone * fall;
			float nl = clamp(dot(n, l), 0.0, 1.0);
			direct += nl * lc;
			if (mode == 2) {
				vec3 h = normalize(l + view_dir);
				float nv = clamp(dot(n, view_dir), 0.0, 1.0);
				float nh = clamp(dot(n, h), 0.0, 1.0);
				float vh = clamp(dot(view_dir, h), 0.0, 1.0);
				vec3 F = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
				spec += nl * lc * F * v_smith(a, nl, nv) * d_ggx(a, nh);
			}
		}
		if (dir_intensity > 0.0) {
			vec3 l = normalize(dir_to_light);
			float nl = clamp(dot(n, l), 0.0, 1.0);
			vec3 lc = srgb_decode(dir_color) * dir_intensity;
			direct += nl * lc;
			if (mode == 2) {
				vec3 h = normalize(l + view_dir);
				float nv = clamp(dot(n, view_dir), 0.0, 1.0);
				float nh = clamp(dot(n, h), 0.0, 1.0);
				float vh = clamp(dot(view_dir, h), 0.0, 1.0);
				vec3 F = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
				spec += nl * lc * F * v_smith(a, nl, nv) * d_ggx(a, nh);
			}
		}
		outc = (irr + direct) * base / PI + spec;
	}
	if (emissive_intensity > 0.0) {
		vec3 emis = srgb_decode(emissive_color) * emissive_intensity;
		if (emissive_from_map) emis *= texel.rgb;
		outc += emis;
	}
	outc = srgb_encode(outc);
	if (fog_enabled) {
		float f = 0.0;
		if (fog_mode == 0) {
			f = smoothstep(fog_near, fog_far, v_depth);
		} else {
			vec3 ray = v_world - CAMERA_POSITION_WORLD;
			float banks = 0.65 + 0.7 * cv_noise(v_world.xz * 0.012);
			float b = CV_FOG_FALLOFF;
			float dens_cam = fog_density * banks
				* exp(-b * clamp(CAMERA_POSITION_WORLD.y - CV_FOG_BASE_Y, -60.0, 60.0));
			float by = b * ray.y;
			float integral = abs(by) > 1e-4 ? (1.0 - exp(-by)) / by : 1.0;
			f = clamp(1.0 - exp(-dens_cam * length(ray) * integral), 0.0, 1.0);
		}
		outc = mix(outc, fog_color, f);
	}
	ALBEDO = outc;
#ifdef USE_ALPHA
	ALPHA = diffuse.a;
#endif
}
