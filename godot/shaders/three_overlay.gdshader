shader_type spatial;
render_mode unshaded, cull_disabled, depth_test_disabled, depth_draw_never;

// The first-person hand: transparent, never depth-tested, drawn last.
#define USE_ALPHA
#include "res://shaders/three_common.gdshaderinc"
