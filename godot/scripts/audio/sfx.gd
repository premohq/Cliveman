class_name Sfx
extends Node
## Autoload. The sound half of engine/audio.js: beep(), the key and typewriter
## clicks, the move blip, the engine tick, the global mute and the master bus.
##
## Every effect here was rendered from the browser build's own WebAudio code by
## tools/render_audio.js (an OfflineAudioContext in headless Chrome), so the
## oscillators, envelopes and filters are the originals rather than a
## re-implementation. beep() adds +/-20 Hz of random pitch to every call; that
## is reproduced by playing the render at a matching pitch_scale.

const DIR := "res://assets/audio/sfx/"

## beep(freq, dur, vol, type) renders at a base frequency, keyed by name.
const BEEPS := {
	"key": 1100.0,
	"char": 380.0,
	"move": 620.0,
	"engine": 155.0,
	"bump": 200.0,
	"turn_l": 440.0,
	"turn_r": 520.0,
}

var _muted := false
var _vol := 1.0
var _char_counter := 0
var _rng := RandomNumberGenerator.new()
var _streams := {}
var _pool: Array[AudioStreamPlayer] = []


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_rng.randomize()
	for i in 12:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_pool.append(p)


## ensureAudio(): WebAudio needs a gesture; Godot does not. Kept for parity.
func ensure() -> void:
	pass


func is_muted() -> bool:
	return _muted


func set_muted(on: bool) -> void:
	_muted = on
	_bus_ramp()


func toggle_mute() -> bool:
	set_muted(not _muted)
	return _muted


func set_volume(v: float) -> void:
	_vol = clampf(v, 0.0, 1.0)
	_bus_ramp()


## _busRamp(): an 80 ms exponential ramp on the master bus, so muting mid-chord
## does not click.
func _bus_ramp() -> void:
	var target := 0.0001 if _muted else maxf(0.0001, _vol)
	var from := db_to_linear(AudioServer.get_bus_volume_db(0))
	var tw := create_tween()
	tw.tween_method(func(g: float) -> void:
		AudioServer.set_bus_volume_db(0, linear_to_db(maxf(0.0001, g))), maxf(0.0001, from), target, 0.08) \
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)


func _stream(name: String) -> AudioStream:
	if _streams.has(name):
		return _streams[name]
	var path := DIR + name + ".wav"
	var s: AudioStream = load(path) if ResourceLoader.exists(path) else null
	_streams[name] = s
	return s


func play_file(name: String, pitch: float = 1.0, volume_db: float = 0.0) -> AudioStreamPlayer:
	if _muted:
		return null
	var s := _stream(name)
	if s == null:
		return null
	for p in _pool:
		if not p.playing:
			p.stream = s
			p.pitch_scale = pitch
			p.volume_db = volume_db
			p.play()
			return p
	var extra := AudioStreamPlayer.new()
	add_child(extra)
	_pool.append(extra)
	extra.stream = s
	extra.pitch_scale = pitch
	extra.volume_db = volume_db
	extra.play()
	return extra


## beep(freq, dur, vol, type) for a named render, with the original's jitter.
func beep_named(name: String, freq: float) -> void:
	var base: float = BEEPS.get(name, freq)
	var f := freq + (_rng.randf() * 40.0 - 20.0)
	play_file(name, f / base)


func key_click() -> void:
	beep_named("key", 1100.0)


## playCharClick(ch): every second non-space character.
func char_click(ch: String) -> void:
	if ch == " " or ch == "\n":
		return
	_char_counter += 1
	if _char_counter % 2 != 0:
		return
	beep_named("char", 380.0)


func move_blip() -> void:
	beep_named("move", 620.0)


func engine_tick() -> void:
	beep_named("engine", 140.0 + _rng.randf() * 30.0)


func bump() -> void:
	beep_named("bump", 200.0)


func turn_left() -> void:
	beep_named("turn_l", 440.0)


func turn_right() -> void:
	beep_named("turn_r", 520.0)


## bevanDeathEffect()'s audio: a detuned sawtooth cluster sliding down an
## octave under a noise crack.
func death_sting() -> void:
	play_file("death")


## playStairStep(direction, step): two blips, the second 50 ms later.
func stair_step(up: bool, step: int) -> void:
	var name := "stair_up_%d" % step if up else "stair_dn_%d" % step
	play_file(name)


## spawnFirework()'s pair of beeps: beep(880+rand*400,.25,.06,'square') then,
## 80 ms later, beep(220,.5,.04,'sawtooth').
func firework() -> void:
	play_file("firework_hi", (880.0 + _rng.randf() * 400.0 + _rng.randf() * 40.0 - 20.0) / 1080.0)
	get_tree().create_timer(0.08, true).timeout.connect(func() -> void:
		play_file("firework_lo", (220.0 + _rng.randf() * 40.0 - 20.0) / 220.0))
