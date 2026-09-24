class_name EngineTone
extends AudioStreamPlayer
## startEngineAudio() in minigame/clivesbuick.js: one sawtooth oscillator
## through a 620 Hz lowpass, its frequency and gain following road speed
##   frequency = 40 + |speed| * 7      gain = min(0.13, 0.025 + |speed| * 0.006)
## Synthesised rather than pitch-shifted from a sample, so the filter stays
## where the WebAudio graph puts it.

const CUTOFF := 620.0

var _gen := AudioStreamGenerator.new()
var _pb: AudioStreamGeneratorPlayback = null
var _phase := 0.0
var _lp := 0.0
var _freq := 42.0
var _gain := 0.0


func _ready() -> void:
	_gen.mix_rate = 44100.0
	_gen.buffer_length = 0.1
	stream = _gen
	bus = "Master"
	process_mode = Node.PROCESS_MODE_ALWAYS


func start() -> void:
	if playing:
		return
	play()
	_pb = get_stream_playback()


func set_speed(speed: float) -> void:
	var a := absf(speed)
	_freq = 40.0 + a * 7.0
	_gain = minf(0.13, 0.025 + a * 0.006)


func stop_tone() -> void:
	_pb = null
	stop()


func _process(_delta: float) -> void:
	if _pb == null:
		return
	var rate: float = _gen.mix_rate
	# one-pole lowpass, matched to the BiquadFilter's corner
	var k: float = 1.0 - exp(-TAU * CUTOFF / rate)
	var frames := _pb.get_frames_available()
	for i in frames:
		_phase = fmod(_phase + _freq / rate, 1.0)
		var saw := _phase * 2.0 - 1.0          # sawtooth, as WebAudio draws it
		_lp += k * (saw - _lp)
		var v := _lp * _gain
		_pb.push_frame(Vector2(v, v))
