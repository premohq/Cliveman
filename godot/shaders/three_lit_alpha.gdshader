shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_opaque;

// Transparent three.js material. See three_common.gdshaderinc.
#define USE_ALPHA
#include "res://shaders/three_common.gdshaderinc"
