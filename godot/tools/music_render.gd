extends Node
## Renders the score engine to a WAV offline, so the synthesiser can be checked
## without anyone listening to it.
##
##   godot --headless --path . tools/music_render.tscn -- dream 20 out.wav
##
## Reports peak and per-second RMS. A silent or clipped render shows up here
## immediately; "it compiled" says nothing about whether a note ever sounded.

const MIX_RATE := 44100.0


func _ready() -> void:
	var argv := OS.get_cmdline_user_args()
	var context: String = argv[0] if argv.size() > 0 else "dream"
	var seconds: float = float(argv[1]) if argv.size() > 1 else 12.0
	var path: String = argv[2] if argv.size() > 2 else "music.wav"

	var music := Music.new()
	add_child(music)
	# Music builds its synth in _ready; suppress the live playback path so the
	# render is driven entirely by this loop.
	music.synth.set_process(false)
	music.set_process(false)
	music.play(context)

	print("piece: %s" % music.now_playing())

	var total := int(seconds * MIX_RATE)
	var samples := PackedFloat32Array()
	samples.resize(total)

	var peak := 0.0
	var rms_window := 0.0
	var window_count := 0
	var second := 0
	var bars: Array[String] = []

	for i in total:
		# The scheduler runs on its own clock, so step it whenever the synth
		# has consumed another block's worth of time.
		if i % 512 == 0:
			music._process(512.0 / MIX_RATE)
		var s: float = music.synth.mix_frame()
		samples[i] = s
		peak = maxf(peak, absf(s))
		rms_window += s * s
		window_count += 1
		if window_count >= int(MIX_RATE):
			bars.append("%2ds %s" % [second, _bar(sqrt(rms_window / window_count))])
			rms_window = 0.0
			window_count = 0
			second += 1

	print("peak: %.4f" % peak)
	for b in bars:
		print("  " + b)

	_write_wav(path, samples)
	print("wrote %s (%.1f s)" % [path, seconds])

	if peak < 0.001:
		push_error("render is silent")
		get_tree().quit(1)
		return
	if peak >= 0.999:
		push_warning("render is clipping")
	get_tree().quit(0)


func _bar(rms: float) -> String:
	var n: int = clampi(int(rms * 120.0), 0, 40)
	return "%.4f %s" % [rms, "#".repeat(n)]


func _write_wav(path: String, samples: PackedFloat32Array) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		push_error("cannot write %s" % path)
		return
	var count := samples.size()
	var data_bytes := count * 2  # mono, 16-bit

	f.store_buffer("RIFF".to_ascii_buffer())
	f.store_32(36 + data_bytes)
	f.store_buffer("WAVEfmt ".to_ascii_buffer())
	f.store_32(16)
	f.store_16(1)                 # PCM
	f.store_16(1)                 # mono
	f.store_32(int(MIX_RATE))
	f.store_32(int(MIX_RATE) * 2) # byte rate
	f.store_16(2)                 # block align
	f.store_16(16)                # bits
	f.store_buffer("data".to_ascii_buffer())
	f.store_32(data_bytes)
	for s in samples:
		f.store_16(int(clampf(s, -1.0, 1.0) * 32767.0) & 0xFFFF)
	f.close()
