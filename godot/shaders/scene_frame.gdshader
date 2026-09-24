shader_type canvas_item;
render_mode unshaded;

// A story scene as engine/story-art.js imgDoc() frames it: the raster drawn into
// a 640x360 SVG viewBox with image-rendering:pixelated, then a radial vignette
// and a 3-unit scanline pattern over the top, all in viewBox units so the
// pattern scales with the picture.
//
//   <radialGradient cx="50%" cy="45%" r="72%">  60% transparent -> 100% rgba(0,0,0,.65)
//   <pattern width="3" height="3"> <rect height="1" y="2" fill="rgba(0,0,0,.35)"/>  opacity .5
//
// TEXTURE is sampled nearest-neighbour by the node's texture_filter.

uniform float brightness = 1.0;   // @keyframes sceneIn filter:brightness(2.2 -> 1)
uniform float opacity = 0.9;      // .story-scene{opacity:.9}, animated from 0
uniform vec2 box_px = vec2(589.0, 331.0);  // on-screen size of the viewBox
uniform bool vignette = true;
uniform bool scanlines = true;

void fragment() {
	vec3 col = texture(TEXTURE, UV).rgb * brightness;

	if (vignette) {
		// objectBoundingBox units on a 640x360 rect: the ellipse is stretched with
		// the box, so in UV space it is a circle of radius .72 about (.5,.45).
		float d = length(vec2(UV.x - 0.5, UV.y - 0.45)) / 0.72;
		float a = clamp((d - 0.60) / 0.40, 0.0, 1.0) * 0.65;
		col *= 1.0 - a;
	}

	if (scanlines) {
		// Coverage of this pixel row by stripes at viewBox y in [3k+2, 3k+3].
		float units_per_px = 360.0 / box_px.y;
		float y0 = UV.y * 360.0 - 0.5 * units_per_px;
		float y1 = y0 + units_per_px;
		float cover = 0.0;
		float k0 = floor((y0 - 3.0) / 3.0);
		for (float k = k0; k <= k0 + 2.0; k += 1.0) {
			float s0 = 3.0 * k + 2.0;
			float s1 = s0 + 1.0;
			cover += max(0.0, min(y1, s1) - max(y0, s0));
		}
		cover = clamp(cover / units_per_px, 0.0, 1.0);
		col *= 1.0 - cover * 0.35 * 0.5;
	}

	COLOR = vec4(col, opacity);
}
