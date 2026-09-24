extends Node
## Renders the same three reference notes as tools/render_music_ref.js through
## the port's synthesiser, so the two can be compared sample for sample.
##
##   godot --headless --path . tools/music_ref.tscn -- out.wav

const MIX_RATE := 44100.0
const SECONDS := 5.0


func _ready() -> void:
	var argv := OS.get_cmdline_user_args()
	var path: String = argv[0] if argv.size() > 0 else "music_ref_godot.wav"
	var synth := Synth.new()
	add_child(synth)
	synth.set_process(false)
	synth.volume = 0.9        # musicBus, with the master gain left at 1
	synth.schedule(Synth.Timbre.TRI, 440.0, 0.2, 1.0, 0.13, false)
	synth.schedule(Synth.Timbre.STR, 330.0, 1.6, 1.2, 0.117, false)
	synth.schedule(Synth.Timbre.SINE, 110.0, 3.2, 1.2, 0.09, false)

	var total := int(SECONDS * MIX_RATE)
	var pcm := PackedByteArray()
	pcm.resize(total * 2)
	for i in total:
		var v: int = int(clampf(synth.mix_frame(), -1.0, 1.0) * 32767.0)
		pcm.encode_s16(i * 2, v)
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_buffer(_wav_header(total))
	f.store_buffer(pcm)
	f.close()
	print("wrote ", path)
	get_tree().quit()


func _wav_header(frames: int) -> PackedByteArray:
	var h := PackedByteArray()
	h.append_array("RIFF".to_ascii_buffer())
	h.resize(4)
	var out := PackedByteArray()
	out.append_array("RIFF".to_ascii_buffer())
	var size := 36 + frames * 2
	out.append_array(_u32(size))
	out.append_array("WAVEfmt ".to_ascii_buffer())
	out.append_array(_u32(16))
	out.append_array(_u16(1))
	out.append_array(_u16(1))
	out.append_array(_u32(44100))
	out.append_array(_u32(88200))
	out.append_array(_u16(2))
	out.append_array(_u16(16))
	out.append_array("data".to_ascii_buffer())
	out.append_array(_u32(frames * 2))
	return out


func _u32(v: int) -> PackedByteArray:
	var b := PackedByteArray()
	b.resize(4)
	b.encode_u32(0, v)
	return b


func _u16(v: int) -> PackedByteArray:
	var b := PackedByteArray()
	b.resize(2)
	b.encode_u16(0, v)
	return b
