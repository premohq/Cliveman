shader_type canvas_item;
render_mode blend_premul_alpha;

// .terminal{transform:perspective(2000px) rotateX(0.6deg);
//           transform-origin:center center}
//
// The desktop browser composites the whole terminal layer through this
// transform: the top edge leans back (narrower, nudged down ~0.7px), the
// bottom edge comes forward (wider, ~0.7px lower), up to ~1.2px sideways at
// the corners, and every pixel is resampled bilinearly on the way. The
// terminal is rendered flat into a transparent SubViewport; this shader draws
// it back through the same projection.
//
// A point (x, y) of the terminal, relative to the transform origin, lands at
//   w = 1 - y sin(a) / 2000,   screen = (x / w, y cos(a) / w)
// so each screen pixel samples the terminal at
//   y = Y / (cos(a) + Y sin(a) / 2000),   x = X (1 - y sin(a) / 2000).
//
// The viewport's contents are premultiplied (2D drawn over a transparent
// target), hence blend_premul_alpha; modulate (the CRT flicker) is applied by
// hand since COLOR is rebuilt from the warped sample.

uniform vec2 origin_px;          // transform-origin, in this item's local px
uniform float tilt_deg = 0.6;
uniform float perspective_px = 2000.0;

varying vec2 v_pos;
varying vec4 v_mod;

void vertex() {
	v_pos = VERTEX;
	v_mod = COLOR;
}

void fragment() {
	float a = radians(tilt_deg);
	float k = sin(a) / perspective_px;
	vec2 s = v_pos - origin_px;
	float y = s.y / (cos(a) + k * s.y);
	float x = s.x * (1.0 - k * y);
	// pixel offset -> UV offset, whichever way the texture is oriented
	vec2 uv_per_px = vec2(dFdx(UV.x) / dFdx(v_pos.x), dFdy(UV.y) / dFdy(v_pos.y));
	vec2 src = UV + (vec2(x, y) - s) * uv_per_px;
	vec4 c = texture(TEXTURE, src);
	if (src.x < 0.0 || src.x > 1.0 || src.y < 0.0 || src.y > 1.0) {
		c = vec4(0.0);
	}
	COLOR = vec4(c.rgb * v_mod.rgb, c.a) * v_mod.a;
}
