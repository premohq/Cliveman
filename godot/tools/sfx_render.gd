extends Node
## Renders the terminal sound effects to a WAV, the same way the score engine
## is checked. Each effect is fired in turn with a gap between, so a silent or
## broken timbre is obvious in the per-effect peaks.
##
##   godot --headless --path . tools/sfx_render.tscn -- out.wav

const MIX_RATE := 44100.0
const GAP := 0.25


func _ready() -> void:
	var argv := OS.get_cmdline_user_args()
	var path: String = argv[0] if argv.size() > 0 else "sfx.wav"

	var sfx := Sfx.new()
	add_child(sfx)
	var synth: Synth = sfx.get_node("SfxSynth")
	synth.set_process(false)

	var effects := [
		["key_click", func() -> void: sfx.key_click()],
		["char_click", func() -> void: sfx.char_click("a")],
		["move_blip", func() -> void: sfx.move_blip()],
		["engine_tick", func() -> void: sfx.engine_tick()],
	]

	var samples := PackedFloat32Array()
	var ok := true
	for e in effects:
		# char_click only sounds on every second character.
		e[1].call()
		e[1].call()
		var peak := 0.0
		for i in int(GAP * MIX_RATE):
			var s: float = synth.mix_frame()
			samples.append(s)
			peak = maxf(peak, absf(s))
		print("  %-12s peak %.4f" % [e[0], peak])
		if peak < 0.001:
			push_error("%s is silent" % e[0])
			ok = false

	_write_wav(path, samples)
	print("wrote %s" % path)
	get_tree().quit(0 if ok else 1)


func _write_wav(path: String, samples: PackedFloat32Array) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return
	var data_bytes := samples.size() * 2
	f.store_buffer("RIFF".to_ascii_buffer()); f.store_32(36 + data_bytes)
	f.store_buffer("WAVEfmt ".to_ascii_buffer()); f.store_32(16)
	f.store_16(1); f.store_16(1)
	f.store_32(int(MIX_RATE)); f.store_32(int(MIX_RATE) * 2)
	f.store_16(2); f.store_16(16)
	f.store_buffer("data".to_ascii_buffer()); f.store_32(data_bytes)
	for s in samples:
		f.store_16(int(clampf(s, -1.0, 1.0) * 32767.0) & 0xFFFF)
	f.close()
