class_name Synth
extends AudioStreamPlayer
## A small software synthesiser, filling the role WebAudio plays in the JS
## build. Notes are scheduled ahead of time and mixed sample by sample into an
## AudioStreamGenerator, which is Godot's equivalent of pushing buffers from an
## audio worklet.
##
## The three voices are ported from engine/music-classical.js:
##   tri    plucky triangle through a 2.2 kHz lowpass, the harpsichord-ish lead
##   str    two saws detuned a quarter percent, dark 1.5 kHz lowpass, slow
##          attack and a 5.2 Hz vibrato that fades in: the bowed strings
##   sine   plain sine, the bass
##
## Envelopes are exponential ramps between 0.0001 and the level, matching
## WebAudio's exponentialRampToValueAtTime rather than approximating with a
## linear fade; the difference is audible on the slow string attacks. The
## filter is BiquadFilterNode's own lowpass, the oscillators carry its phase
## and amplitude conventions, and tools/render_music_ref.js renders the same
## three notes through WebAudio offline to check all of it: the levels come out
## equal and the waveforms within a few percent.

const MIX_RATE := 44100.0
const BUFFER_LENGTH := 0.12

## Echo send, from the delay/feedback/wet chain in ensure().
const DELAY_SECONDS := 0.34
const DELAY_FEEDBACK := 0.28
const DELAY_WET := 0.22

const SILENCE := 0.0001

## Ceilings so a runaway caller degrades the sound instead of the frame rate.
const MAX_PENDING := 512
const MAX_ACTIVE := 48

## SQUARE and SAW are the sound-effect voices from engine/audio.js beep().
## They decay from full level with no attack, unlike the musical timbres.
enum Timbre { TRI, STR, SINE, SQUARE, SAW }

class Note:
	var kind: int
	var freq: float
	var start: float      ## seconds on the synth clock
	var duration: float
	var level: float
	var send: bool

	## The release runs past `duration` on the strings, as the JS ramp does.
	var tail := 0.0

	# Running state.
	var phase_a := 0.0
	var phase_b := 0.0
	var lfo_phase := 0.0
	var x1 := 0.0
	var x2 := 0.0
	var y1 := 0.0
	var y2 := 0.0

var volume := 0.5
var _playback: AudioStreamGeneratorPlayback = null
var _clock := 0.0
var _pending: Array[Note] = []
var _active: Array[Note] = []
var _delay_line := PackedFloat32Array()
var _delay_head := 0


func _ready() -> void:
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = MIX_RATE
	gen.buffer_length = BUFFER_LENGTH
	stream = gen

	_delay_line.resize(int(DELAY_SECONDS * MIX_RATE))
	_delay_line.fill(0.0)

	play()
	_playback = get_stream_playback()


## Seconds on the synth clock. Schedule against this, never against wall time.
func now() -> float:
	return _clock


## Notes are kept in start order so the mixer only has to look at the head of
## the queue. Scanning the whole queue every sample is fine for a score at a few
## notes a second, and collapses the moment something schedules fast: the
## typewriter click fires per character, which at autoplay speed is a thousand
## a second and stalled the whole game.
func schedule(kind: Timbre, freq: float, at: float, duration: float,
		level: float, send: bool = false) -> void:
	if freq <= 0.0 or duration <= 0.0:
		return
	if _pending.size() >= MAX_PENDING:
		return  # runaway scheduler; dropping is better than locking up
	var n := Note.new()
	n.kind = kind
	n.freq = freq
	n.start = at
	n.duration = duration
	n.level = maxf(level, SILENCE * 2.0)
	n.send = send
	# noteStr ramps to silence at t+dur+0.05 and stops its oscillators at +0.1
	n.tail = 0.05 if kind == Timbre.STR else 0.0

	# Almost always an append: callers schedule forwards in time.
	var i := _pending.size()
	while i > 0 and _pending[i - 1].start > at:
		i -= 1
	_pending.insert(i, n)


func clear() -> void:
	_pending.clear()
	_active.clear()


func _process(_delta: float) -> void:
	if _playback == null:
		return
	var frames := _playback.get_frames_available()
	if frames <= 0:
		return

	for i in frames:
		var out := mix_frame()
		_playback.push_frame(Vector2(out, out))


## One sample, advancing the clock. Split out so the same mixing path can be
## rendered offline by tools/music_render.tscn: there is no other way to check
## a synthesiser without listening to it.
func mix_frame() -> float:
	var step := 1.0 / MIX_RATE
	var t := _clock

	# The queue is start-ordered, so only the head can be due.
	while not _pending.is_empty() and _pending[0].start <= t:
		if _active.size() < MAX_ACTIVE:
			_active.append(_pending[0])
		_pending.remove_at(0)

	var dry := 0.0
	var wet_in := 0.0
	var a := 0
	while a < _active.size():
		var n: Note = _active[a]
		if t >= n.start + n.duration + n.tail:
			_active.remove_at(a)
			continue
		var s := _render(n, t - n.start, step)
		dry += s
		if n.send:
			wet_in += s
		a += 1

	# Delay line: read the tap, feed it back, mix the wet signal in.
	var tap: float = _delay_line[_delay_head]
	_delay_line[_delay_head] = wet_in + tap * DELAY_FEEDBACK
	_delay_head = (_delay_head + 1) % _delay_line.size()

	_clock += step
	return clampf((dry + tap * DELAY_WET) * volume, -1.0, 1.0)


## One sample of one note, `age` seconds into it.
func _render(n: Note, age: float, step: float) -> float:
	match n.kind:
		Timbre.TRI:
			var env := _envelope(n, age, 0.02, minf(0.35, n.duration * 0.5))
			n.phase_a = fmod(n.phase_a + n.freq * step, 1.0)
			var tri: float = _triangle(n.phase_a)
			return _lowpass(n, tri, 2200.0, 1.0) * env

		Timbre.STR:
			var atk: float = minf(0.18, n.duration * 0.35)
			var env2 := _envelope(n, age, atk, minf(0.6, n.duration * 0.45))
			# Vibrato depth ramps in over the first part of the note.
			n.lfo_phase = fmod(n.lfo_phase + 5.2 * step, 1.0)
			var depth: float = n.freq * 0.004 * minf(1.0, age / maxf(0.001, minf(0.4, n.duration * 0.5)))
			var vib: float = sin(TAU * n.lfo_phase) * depth
			var da: float = (n.freq * 0.9975 + vib) * step
			var db: float = (n.freq * 1.0025 + vib) * step
			n.phase_a = fmod(n.phase_a + da, 1.0)
			n.phase_b = fmod(n.phase_b + db, 1.0)
			# both oscillators feed the filter, so they sum rather than average
			var saws: float = _saw(n.phase_a, da) + _saw(n.phase_b, db)
			return _lowpass(n, saws, 1500.0, 0.6) * env2

		Timbre.SQUARE:
			n.phase_a = fmod(n.phase_a + n.freq * step, 1.0)
			return (1.0 if n.phase_a < 0.5 else -1.0) * _decay(n, age)

		Timbre.SAW:
			var inc: float = n.freq * step
			n.phase_a = fmod(n.phase_a + inc, 1.0)
			return _saw(n.phase_a, inc) * _decay(n, age)

		_:
			# bassNote: a 0.05s exponential attack, then one long exponential
			# decay to silence at the end of the note, with no hold
			var env3: float = n.level
			if age < 0.05:
				env3 = SILENCE * pow(n.level / SILENCE, age / 0.05)
			else:
				var r: float = (age - 0.05) / maxf(0.0001, n.duration - 0.05)
				env3 = n.level * pow(SILENCE / n.level, clampf(r, 0.0, 1.0))
			n.phase_a = fmod(n.phase_a + n.freq * step, 1.0)
			return sin(TAU * n.phase_a) * env3


## Exponential attack to level, hold, exponential release to silence.
func _envelope(n: Note, age: float, attack: float, release: float) -> float:
	var hold_until: float = maxf(attack, n.duration - release)
	if age < attack:
		return SILENCE * pow(n.level / SILENCE, age / maxf(0.0001, attack))
	if age < hold_until:
		return n.level
	var ends: float = n.duration + n.tail
	var r: float = (age - hold_until) / maxf(0.0001, ends - hold_until)
	return n.level * pow(SILENCE / n.level, clampf(r, 0.0, 1.0))


## OscillatorNode's sawtooth wavetable comes out at 0.8485 of an ideal saw,
## whatever the pitch, from the normalisation Blink applies when it builds the
## band-limited tables. Measured with tools/render_music_ref.js; the triangle
## and sine tables need no such factor.
const SAW_SCALE := 0.8485


## PolyBLEP: the saw's jump is rounded over one sample, the way a band-limited
## wavetable has no step to alias in the first place. Phase 0 is the zero
## crossing on the way up, where OscillatorNode starts, so the jump sits at
## half a cycle.
static func _saw(phase: float, inc: float) -> float:
	var p := fposmod(phase + 0.5, 1.0)
	var v := p * 2.0 - 1.0
	if inc > 0.0:
		if p < inc:
			var t := p / inc
			v -= t + t - t * t - 1.0
		elif p > 1.0 - inc:
			var t2 := (p - 1.0) / inc
			v -= t2 * t2 + t2 + t2 + 1.0
	return v * SAW_SCALE


## An ideal triangle, which is what OscillatorNode's table is: zero at phase 0,
## rising, +1 at a quarter turn.
static func _triangle(phase: float) -> float:
	if phase < 0.25:
		return phase * 4.0
	if phase < 0.75:
		return 2.0 - phase * 4.0
	return phase * 4.0 - 4.0


## Straight exponential decay from the level, as beep() does: it sets the gain
## and ramps it down with no attack stage at all.
func _decay(n: Note, age: float) -> float:
	return n.level * pow(SILENCE / n.level, clampf(age / n.duration, 0.0, 1.0))


## BiquadFilterNode's lowpass (the RBJ cookbook one). The spec reads Q in
## decibels for lowpass and highpass, which is what the JS passes: 0.6 dB on
## the strings filter, and an unset Q is 1 dB.
static var _biquad_cache := {}


static func _coeffs(cutoff: float, q_db: float) -> PackedFloat32Array:
	var key := "%.1f@%.2f" % [cutoff, q_db]
	if _biquad_cache.has(key):
		return _biquad_cache[key]
	var w0: float = TAU * cutoff / MIX_RATE
	var alpha: float = sin(w0) / (2.0 * pow(10.0, q_db / 20.0))
	var cosw := cos(w0)
	var b0: float = (1.0 - cosw) * 0.5
	var a0: float = 1.0 + alpha
	var c := PackedFloat32Array([
		b0 / a0, (1.0 - cosw) / a0, b0 / a0, (-2.0 * cosw) / a0, (1.0 - alpha) / a0])
	_biquad_cache[key] = c
	return c


func _lowpass(n: Note, sample: float, cutoff: float, q_db: float) -> float:
	var c := _coeffs(cutoff, q_db)
	var y: float = c[0] * sample + c[1] * n.x1 + c[2] * n.x2 - c[3] * n.y1 - c[4] * n.y2
	n.x2 = n.x1
	n.x1 = sample
	n.y2 = n.y1
	n.y1 = y
	return y


## Note name to frequency, as freqOf() in the JS.
const PITCH_CLASS := {
	"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
	"F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}

static var _note_re: RegEx = null


static func freq_of(name: String) -> float:
	if name == "" or name == "R":
		return 0.0
	if _note_re == null:
		_note_re = RegEx.new()
		_note_re.compile("^([A-G][#b]?)(\\d)$")
	var m := _note_re.search(name)
	if m == null:
		return 0.0
	var midi: int = (int(m.get_string(2)) + 1) * 12 + int(PITCH_CLASS.get(m.get_string(1), 0))
	return 440.0 * pow(2.0, (midi - 69) / 12.0)
