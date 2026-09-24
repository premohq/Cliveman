extends Node3D
## Colour-space probe for the three.js material shader under the Compatibility
## renderer. Renders a full-screen quad several ways, both straight to the
## window and through a SubViewport shown by a TextureRect (the way the nav
## view is drawn), and prints the centre pixel.
##
## The browser (three.js r160) gives, for a #202020 Lambert plane lit only by
## an 18 cd point light at the camera: 155 / 81 / 39 / 23 at 0.5 / 1 / 2 / 3.

const LIT := preload("res://shaders/three_lit.gdshader")

var _cam: Camera3D
var _mi: MeshInstance3D
var _mat: ShaderMaterial
var _vp: SubViewport
var _rect: TextureRect


func _ready() -> void:
	_cam = Camera3D.new()
	_cam.fov = 30.0
	_cam.near = 0.01
	add_child(_cam)
	_cam.make_current()
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_COLOR
	env.environment.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	add_child(env)
	_mat = ShaderMaterial.new()
	_mat.shader = LIT
	_mat.set_shader_parameter("fog_enabled", false)
	_mi = MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(10, 10)
	_mi.mesh = q
	_mi.material_override = _mat
	add_child(_mi)

	var img := Image.create(4, 4, false, Image.FORMAT_RGBA8)
	img.fill(Color8(128, 128, 128))
	var tex := ImageTexture.create_from_image(img)

	var root_out := await _cases(tex)
	print("probe root ", root_out)

	# Same again inside a SubViewport displayed by a TextureRect.
	remove_child(_cam)
	remove_child(_mi)
	remove_child(env)
	_vp = SubViewport.new()
	_vp.size = Vector2i(64, 64)
	_vp.own_world_3d = true
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(_vp)
	_vp.add_child(env)
	_vp.add_child(_cam)
	_vp.add_child(_mi)
	_cam.make_current()
	var layer := CanvasLayer.new()
	add_child(layer)
	_rect = TextureRect.new()
	_rect.texture = _vp.get_texture()
	_rect.size = Vector2(64, 64)
	layer.add_child(_rect)
	var vp_out := await _cases(tex)
	print("probe subviewport ", vp_out)
	get_tree().quit()


func _cases(tex: Texture2D) -> Array:
	var out := []
	# 1. basic, colour #808080
	_setup(0, Color("#808080"), null, 0.0, 1.0)
	out.append(["basic #808080", await _grab()])
	# 2. basic, white * #808080 texture
	_setup(0, Color.WHITE, tex, 0.0, 1.0)
	out.append(["basic tex 808080", await _grab()])
	# 3. lambert #202020, point at 1 and 2 units
	for d in [1.0, 2.0]:
		_setup(1, Color("#202020"), null, 18.0, d)
		out.append(["lambert d=%s" % d, await _grab()])
	return out


func _setup(mode: int, color: Color, tex: Texture2D, intensity: float, d: float) -> void:
	_mat.set_shader_parameter("mode", mode)
	_mat.set_shader_parameter("color", color)
	_mat.set_shader_parameter("map_mode", 2 if tex else 0)
	_mat.set_shader_parameter("map_nearest", tex)
	_mat.set_shader_parameter("point_count", 1 if intensity > 0.0 else 0)
	_mat.set_shader_parameter("point_color", PackedColorArray([Color.WHITE]))
	_mat.set_shader_parameter("point_intensity", PackedFloat32Array([intensity]))
	_mat.set_shader_parameter("point_distance", PackedFloat32Array([7.0]))
	_mat.set_shader_parameter("point_decay", PackedFloat32Array([2.0]))
	_mat.set_shader_parameter("point_pos", PackedVector3Array([Vector3.ZERO]))
	_mi.position = Vector3(0, 0, -d)


func _grab() -> String:
	for i in 3:
		await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var p := Vector2i(32, 32) if _vp else Vector2i(img.get_width() / 2, img.get_height() / 2)
	return img.get_pixel(p.x, p.y).to_html(false)
