#!/usr/bin/env python3
"""
============================================================================
CLIVEMAN - tools/gen_voices.py
Generate real voice-line audio files for every character using the FREE
Google Gemini TTS API (AI Studio key, no billing required).

  python3 tools/gen_voices.py --dry-run              # list what would be made
  GEMINI_API_KEY=xxxx python3 tools/gen_voices.py    # generate everything
  python3 tools/gen_voices.py --char cliveman        # one character only
  python3 tools/gen_voices.py --limit 10             # cap this run (quota)

WHAT IT DOES
  1. Scans story/*.js for speaker dialogue lines (`Name: "..."`), using the
     exact same speaker regex, name normalisation, alias resolution and
     text cleanup as engine/voice.js — so keys match the engine forever.
  2. Casts every character to a FIXED Gemini prebuilt voice + a fixed style
     prompt (table below). The mapping is hard-coded in this file, so voices
     are 100% consistent across lines, runs, and machines.
  3. Calls the Gemini TTS endpoint, wraps the returned PCM in a WAV, and
     writes  assets/voice/<char>/<hash12>.wav
  4. Maintains assets/voice/manifest.json mapping key -> file, so the game
     can look up a line's audio with:
         key = sha1(normName(speaker) + "\n" + cleanForSpeech(text))[:12]
  5. Skips anything already generated (safe to re-run; resumes after quota).

CONSISTENCY GUARANTEE
  Voice identity comes from the prebuilt voice name (e.g. "Algenib"), which
  Gemini renders with the same timbre every time. Delivery/emotion is pinned
  by the per-character style prompt. Never edit a character's voice or style
  after shipping lines, or regenerate that character's whole folder
  (--char X --force) so old and new lines match.

FREE-TIER NOTES
  Get a key at https://aistudio.google.com/apikey . The preview TTS models
  have low free-rate limits (a few requests/min and a daily cap). The script
  throttles itself (--rpm, default 3), backs off on 429, and exits cleanly
  when the daily quota is exhausted — just re-run tomorrow; finished files
  are cached and skipped.

Zero third-party dependencies (stdlib only). Optional: ffmpeg on PATH if
you pass --ogg to also emit smaller .ogg files.
============================================================================
"""

import argparse, base64, hashlib, json, os, re, struct, subprocess, sys, time
import urllib.request, urllib.error

# ---------------------------------------------------------------------------
# Paths (script lives in tools/, project root is its parent)
# ---------------------------------------------------------------------------
ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORY_DIR = os.path.join(ROOT, 'story')
OUT_DIR   = os.path.join(ROOT, 'assets', 'voice')

API_URL_TMPL = ('https://generativelanguage.googleapis.com/v1beta/models/'
                '{model}:generateContent?key={key}')
DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts'

# ---------------------------------------------------------------------------
# THE CAST — mirror of engine/voice.js CAST, plus a fixed Gemini prebuilt
# voice and a fixed style prompt per character. DO NOT change a character's
# voice after lines have shipped (see consistency note above).
#
# Gemini prebuilt voices used (all distinct):
#   Charon(informative) Algenib(gravelly) Enceladus(breathy) Puck(upbeat)
#   Achernar(soft) Kore(firm) Schedar(even) Fenrir(excitable)
#   Umbriel(easy-going) Leda(youthful) Laomedeia(upbeat) Alnilam(firm)
#   Sadachbia(lively) Despina(smooth) Sadaltager(knowledgeable) Orus(firm)
#   Achird(friendly) Iapetus(clear) Algieba(smooth) Zubenelgenubi(casual)
# ---------------------------------------------------------------------------
CAST = {
  '__narrator': {
    'voice': 'Charon',
    'style': 'Speak as a measured, world-weary 1950s film-noir narrator, low and unhurried'},
  'cliveman': {
    'voice': 'Algenib',
    'style': 'Speak as a gravelly, deadpan, world-weary noir detective, dry and a little tired'},
  'bevan': {
    'voice': 'Enceladus',
    'style': 'Speak as a deep, slow, slightly slurred veteran detective, four whiskeys in, warm but rough'},
  'mechanic': {
    'voice': 'Zubenelgenubi',
    'style': 'Speak as a casual, friendly blue-collar mechanic, relaxed working-class cadence'},
  'clemons': {
    'voice': 'Puck',
    'style': 'Speak as a loud, manic, sweaty businessman who shouts half his words and rambles, unhinged and jumpy'},
  'linda': {
    'voice': 'Achernar',
    'style': 'Speak as a dead-eyed young woman behind a counter, flat, soft, completely uninterested'},
  'officer reyes': {
    'voice': 'Kore',
    'style': 'Speak as a firm, no-nonsense female police officer, clipped and professional'},
  'desk clerk': {
    'voice': 'Schedar',
    'style': 'Speak as a dead-inside desk clerk, slow toneless monotone, zero enthusiasm'},
  'suspect': {
    'voice': 'Fenrir',
    'style': 'Speak as a panicky young man talking too fast, nervous, voice cracking with fear'},
  'worker': {
    'voice': 'Umbriel',
    'style': 'Speak as an easy-going factory worker, plain and unbothered'},
  'teen': {
    'voice': 'Leda',
    'style': 'Speak as a bored, slightly mocking teenager'},
  'public defender': {
    'voice': 'Laomedeia',
    'style': 'Speak as an overworked fast-talking female public defender, rushed but sharp'},
  'judge': {
    'voice': 'Alnilam',
    'style': 'Speak as a stern, authoritative elderly judge, slow, formal, final'},
  'dealer': {
    'voice': 'Sadachbia',
    'style': 'Speak as a slick, lively street dealer, quick and streetwise'},
  'bystander': {
    'voice': 'Despina',
    'style': 'Speak as a nervous female bystander recounting what she saw, hushed and uneasy'},
  'hollis': {
    'voice': 'Sadaltager',
    'style': 'Speak as a supremely confident, fast-talking showman trial lawyer, theatrical, never in doubt'},
  'mr. sun': {
    'voice': 'Orus',
    'style': 'Speak as a calm, cold, quietly menacing triad boss, unhurried, every word deliberate'},
  'russell pyne': {
    'voice': 'Achird',
    'style': 'Speak as a friendly-on-the-surface bureaucrat hiding nerves, smooth and a touch oily'},
  'guard': {
    'voice': 'Iapetus',
    'style': 'Speak as a flat, bored prison guard, clear, curt and indifferent'},
  'pete': {
    'voice': 'Algieba',
    'style': 'Speak as a smooth, weathered older inmate, low, calm and streetwise'},
}

# aliases (same hops engine/voice.js makes) -> canonical CAST key.
# NOTE: 'fat mustached guy' IS Clemons pre-introduction, so he shares
# Clemons' voice on purpose even though the text color differs in-game.
ALIASES = {
  'detective bevan':    'bevan',
  'clemons dee tubley': 'clemons',
  'tubley':             'clemons',
  'fat mustached guy':  'clemons',
  'reyes':              'officer reyes',
  'pyne':               'russell pyne',
}

# fallback pool for speakers not in the cast: deterministic hash pick from
# voices no main character uses, so unknowns are also consistent forever.
FALLBACK_VOICES = ['Zephyr', 'Aoede', 'Callirrhoe', 'Autonoe', 'Erinome',
                   'Rasalgethi', 'Gacrux', 'Pulcherrima', 'Vindemiatrix',
                   'Sulafat']

# ---------------------------------------------------------------------------
# Exact mirrors of engine/voice.js parsing (keep byte-for-byte compatible)
# ---------------------------------------------------------------------------
SPEAKER_RE = re.compile(r'^\s*([^:"]{2,30}):\s+')

def norm_name(raw):
    return re.sub(r'\s+', ' ', raw.lower()).strip()

def resolve(name):
    """normName + alias hop + last-word hop, like castOf()/speakerOf()."""
    n = norm_name(name)
    if n in ALIASES: n = ALIASES[n]
    if n in CAST:    return n
    last = n.split(' ')[-1]
    if last in ALIASES: last = ALIASES[last]
    if last in CAST: return last
    return n                      # unknown speaker, kept as-is

def clean_for_speech(text):
    """Mirror of cleanForSpeech() minus the speaker prefix (already split)."""
    t = str(text)
    t = re.sub(r'\[[^\]]*\]', ' ', t)          # [NOTE: ...]
    t = re.sub(r'\*[^*]{0,80}\*', ' ', t)      # *stage directions*
    t = re.sub(r'["\u201C\u201D\u00AB\u00BB\u201E\u2039\u203A]', ' ', t)
    t = re.sub(r'[<>=_|\\/#~^{}]+', ' ', t)    # terminal decoration
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def line_key(char, clean_text):
    """The lookup key the game will use: sha1(char \\n text)[:12]."""
    return hashlib.sha1((char + '\n' + clean_text).encode('utf-8')).hexdigest()[:12]

# ---------------------------------------------------------------------------
# Story scanning: pull every string literal out of the JS (comment-aware),
# keep the ones that look like speaker dialogue with a known/derivable cast.
# ---------------------------------------------------------------------------
_ESCAPES = {'n':'\n','t':'\t','r':'\r','b':'\b','f':'\f','v':'\v',
            '0':'\0',"'":"'",'"':'"','`':'`','\\':'\\','\n':''}

_STR_RE = r"""'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*\""""
_TYPELINE_RE = re.compile(r"typeLine\(\s*(%s)\s*,\s*'(\w+)'" % _STR_RE)
_CUTSCENE_RE = re.compile(r"cutscene\(\s*\[")

def _decode(lit):
    """Decode a quoted JS string literal (including quotes) to text."""
    body, out, i = lit[1:-1], [], 0
    while i < len(body):
        c = body[i]
        if c == '\\' and i + 1 < len(body):
            out.append(_ESCAPES.get(body[i+1], body[i+1]))
            i += 2
        else:
            out.append(c)
            i += 1
    s = ''.join(out)
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1),16)), s)
    s = re.sub(r'\\x([0-9a-fA-F]{2})', lambda m: chr(int(m.group(1),16)), s)
    return s

_FIRST_PERSON = re.compile(r"\b(I|I'm|I'll|I've|I'd|me|my|mine)\b")

def _cutscene_strings(src, start):
    """Yield string literals inside cutscene([ ... ]) starting at the '['."""
    i, n, depth = start, len(src), 0
    while i < n:
        c = src[i]
        if c == '[':
            depth += 1; i += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                return
            i += 1
        elif c in ('"', "'"):
            m = re.match(_STR_RE, src[i:])
            if not m:
                i += 1; continue
            yield _decode(m.group(0))
            i += len(m.group(0))
        else:
            i += 1

def _emit(lines, seen, char, raw_text, base, include_unknown, inner=False):
    known = char in CAST
    if not known and not include_unknown:
        return
    text = clean_for_speech(raw_text)
    if len(text) < 2:
        return
    key = line_key(char, text)
    if key in seen:
        return
    seen.add(key)
    lines.append({'char': char, 'text': text, 'key': key,
                  'source': base, 'known': known, 'inner': inner})

def collect_lines(story_files, include_unknown=False):
    """Return ordered list of dicts: {char, text, key, source}. Deduped.
    Mirrors engine routing exactly:
      typeLine(s,'speaker')   -> named char, or __narrator if no `Name:` tag
      typeLine(s,'narration') -> __narrator
      cutscene([...])         -> every string in the array -> __narrator
      sys/err/dim/credits     -> silent (skipped)"""
    lines, seen = [], set()
    for path in story_files:
        with open(path, 'r', encoding='utf-8') as f:
            src = f.read()
        base = os.path.basename(path)
        for m in _TYPELINE_RE.finditer(src):
            s, cls = _decode(m.group(1)), m.group(2)
            if cls == 'narration':
                _emit(lines, seen, '__narrator', s, base, include_unknown)
            elif cls == 'speaker':
                sm = SPEAKER_RE.match(s)
                if sm:
                    _emit(lines, seen, resolve(sm.group(1)),
                          s[sm.end():], base, include_unknown)
                else:
                    # Untagged 'speaker' line. First-person = Cliveman's
                    # internal monologue ("God, I am getting too old...");
                    # second/third person = announcer/narration flavor.
                    # NOTE: engine speakerOf() routes ALL of these to
                    # __narrator; when wiring playback, look lines up by
                    # key in lines.json (which records this routing).
                    if _FIRST_PERSON.search(s):
                        _emit(lines, seen, 'cliveman', s, base,
                              include_unknown, inner=True)
                    else:
                        _emit(lines, seen, '__narrator', s, base,
                              include_unknown)
        for cm in _CUTSCENE_RE.finditer(src):
            for s in _cutscene_strings(src, cm.end() - 1):
                _emit(lines, seen, '__narrator', s, base, include_unknown)
        # Pass 2: speaker-prefixed literals ANYWHERE (dialogue stored in data
        # arrays like BEVAN_RANDOM_LINES and fed to typeLine dynamically).
        # Only cast-resolvable names, so sys strings like 'ERROR: x' are safe.
        for sm in re.finditer(_STR_RE, src):
            s = _decode(sm.group(0))
            pm = SPEAKER_RE.match(s)
            if not pm:
                continue
            char = resolve(pm.group(1))
            if char not in CAST:
                continue        # unknowns only voiced via tagged call sites
            _emit(lines, seen, char, s[pm.end():], base, include_unknown)
    return lines

# ---------------------------------------------------------------------------
# Character -> voice/style (with deterministic fallback for unknowns)
# ---------------------------------------------------------------------------
def profile_for(char):
    if char in CAST:
        return CAST[char]
    h = int(hashlib.sha1(char.encode('utf-8')).hexdigest(), 16)
    return {'voice': FALLBACK_VOICES[h % len(FALLBACK_VOICES)],
            'style': 'Speak as a minor character in a 1950s noir detective story'}

def style_for(line, prof):
    """Same voice, muted delivery for internal monologue lines."""
    if line.get('inner'):
        return prof['style'] + ', as a quiet internal thought, low and muttered to himself'
    return prof['style']

# ---------------------------------------------------------------------------
# Gemini TTS call + WAV writer
# ---------------------------------------------------------------------------
class DailyQuotaExhausted(Exception):
    pass

def tts_request(key, model, voice, style, text, timeout=120):
    """One synthesis call. Returns (pcm_bytes, sample_rate)."""
    prompt = '%s. Say exactly the following line, nothing else: %s' % (style, text)
    body = json.dumps({
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {
                'prebuiltVoiceConfig': {'voiceName': voice}}},
        },
    }).encode('utf-8')
    req = urllib.request.Request(
        API_URL_TMPL.format(model=model, key=key), data=body,
        headers={'Content-Type': 'application/json'})
    attempt = 0
    while True:
        attempt += 1
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = json.loads(r.read().decode('utf-8'))
            part = data['candidates'][0]['content']['parts'][0]['inlineData']
            pcm = base64.b64decode(part['data'])
            mime = part.get('mimeType', '')
            mr = re.search(r'rate=(\d+)', mime)
            return pcm, (int(mr.group(1)) if mr else 24000)
        except urllib.error.HTTPError as e:
            msg = ''
            try: msg = e.read().decode('utf-8', 'replace')
            except Exception: pass
            if e.code == 429:
                if 'PerDay' in msg or 'per day' in msg.lower():
                    raise DailyQuotaExhausted(msg)
                wait = 30.0
                dm = re.search(r'retryDelay[":\s]+(\d+)', msg)
                if dm: wait = float(dm.group(1)) + 1
                print('    429 rate-limited, waiting %.0fs ...' % wait)
                time.sleep(wait)
                continue
            if e.code >= 500 and attempt < 5:
                wait = 2 ** attempt
                print('    HTTP %d, retry in %ds ...' % (e.code, wait))
                time.sleep(wait)
                continue
            raise RuntimeError('HTTP %d: %s' % (e.code, msg[:400]))
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 5:
                wait = 2 ** attempt
                print('    network error (%s), retry in %ds ...' % (e, wait))
                time.sleep(wait)
                continue
            raise

def write_wav(path, pcm, rate):
    """Wrap raw signed-16-bit mono PCM in a minimal RIFF/WAV header."""
    with open(path, 'wb') as f:
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + len(pcm)))
        f.write(b'WAVEfmt ')
        f.write(struct.pack('<IHHIIHH', 16, 1, 1, rate, rate * 2, 2, 16))
        f.write(b'data')
        f.write(struct.pack('<I', len(pcm)))
        f.write(pcm)

def maybe_ogg(wav_path):
    ogg = wav_path[:-4] + '.ogg'
    try:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav_path,
                        '-c:a', 'libvorbis', '-q:a', '3', ogg], check=True)
        return ogg
    except Exception as e:
        print('    ffmpeg failed (%s); keeping wav only' % e)
        return None

# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------
def load_manifest(path):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'format': 1,
            'note': 'key = sha1(char + \\n + cleanForSpeech(text))[:12]',
            'characters': {}, 'lines': {}}

def save_manifest(path, man):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(man, f, indent=1, ensure_ascii=False, sort_keys=True)
    os.replace(tmp, path)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description='Generate Cliveman voice lines via Gemini TTS')
    ap.add_argument('--key', default=os.environ.get('GEMINI_API_KEY', ''),
                    help='Gemini API key (or set GEMINI_API_KEY)')
    ap.add_argument('--model', default=DEFAULT_MODEL)
    ap.add_argument('--out', default=OUT_DIR, help='output dir (default assets/voice)')
    ap.add_argument('--char', default=None, help='only this character (canonical name)')
    ap.add_argument('--limit', type=int, default=0, help='max NEW lines this run')
    ap.add_argument('--rpm', type=float, default=3.0, help='requests per minute (free tier is low)')
    ap.add_argument('--dry-run', action='store_true', help='list lines, no API calls')
    ap.add_argument('--force', action='store_true', help='regenerate even if file exists')
    ap.add_argument('--ogg', action='store_true', help='also emit .ogg via ffmpeg')
    ap.add_argument('--include-unknown', action='store_true',
                    help='also voice speakers not in the cast (hash-assigned voice)')
    args = ap.parse_args()

    story_files = sorted(
        os.path.join(STORY_DIR, f) for f in os.listdir(STORY_DIR)
        if f.endswith('.js'))
    lines = collect_lines(story_files, include_unknown=args.include_unknown)
    if args.char:
        want = resolve(args.char)
        lines = [l for l in lines if l['char'] == want]

    by_char = {}
    for l in lines:
        by_char.setdefault(l['char'], []).append(l)

    print('Found %d unique dialogue lines across %d characters:' %
          (len(lines), len(by_char)))
    for c in sorted(by_char):
        p = profile_for(c)
        print('  %-20s %3d lines  -> %s' % (c, len(by_char[c]), p['voice']))

    # Preserve the COMPLETE in-game dialogue set as a document, always —
    # every line, voiced yet or not, with char / key / source / inner flag.
    os.makedirs(args.out, exist_ok=True)
    lines_doc = os.path.join(args.out, 'lines.json')
    with open(lines_doc, 'w', encoding='utf-8') as f:
        json.dump({'format': 1, 'count': len(lines), 'lines': lines},
                  f, indent=1, ensure_ascii=False)
    print('Full dialogue document written: %s' % lines_doc)

    manifest_path = os.path.join(args.out, 'manifest.json')
    man = load_manifest(manifest_path)

    if args.dry_run:
        for l in lines:
            tag = l['char'] + (' (inner)' if l.get('inner') else '') + ':'
            print('  [%s] %-24s %s' % (l['key'], tag, l['text'][:64]))
        return 0

    if not args.key:
        print('\nERROR: no API key. Set GEMINI_API_KEY or pass --key.\n'
              'Free keys: https://aistudio.google.com/apikey')
        return 2

    os.makedirs(args.out, exist_ok=True)
    interval = 60.0 / max(args.rpm, 0.01)
    made = skipped = failed = 0
    last_call = 0.0

    try:
        for l in lines:
            char, text, key = l['char'], l['text'], l['key']
            prof = profile_for(char)
            cdir = os.path.join(args.out, re.sub(r'[^a-z0-9]+', '_', char))
            wav = os.path.join(cdir, key + '.wav')
            rel = os.path.relpath(wav, args.out).replace(os.sep, '/')

            if os.path.exists(wav) and not args.force:
                skipped += 1
                if key not in man['lines']:
                    man['lines'][key] = {'char': char, 'text': text, 'file': rel}
                continue
            if args.limit and made >= args.limit:
                continue

            wait = interval - (time.monotonic() - last_call)
            if wait > 0:
                time.sleep(wait)
            print('[%d/%d] %s: %s' % (made + skipped + failed + 1, len(lines),
                                      char, text[:60]))
            last_call = time.monotonic()
            try:
                pcm, rate = tts_request(args.key, args.model,
                                        prof['voice'], style_for(l, prof), text)
            except DailyQuotaExhausted:
                print('\nDaily free-tier quota exhausted. Progress is saved — '
                      're-run tomorrow to continue.')
                break
            except Exception as e:
                print('    FAILED: %s' % e)
                failed += 1
                continue

            os.makedirs(cdir, exist_ok=True)
            write_wav(wav, pcm, rate)
            if args.ogg:
                maybe_ogg(wav)
            man['characters'][char] = {'voice': prof['voice'], 'style': prof['style']}
            man['lines'][key] = {'char': char, 'text': text, 'file': rel,
                                 'inner': bool(l.get('inner'))}
            save_manifest(manifest_path, man)   # save after EVERY file: crash-safe
            made += 1
    except KeyboardInterrupt:
        print('\nInterrupted — progress saved.')

    save_manifest(manifest_path, man)
    print('\nDone. generated=%d skipped(existing)=%d failed=%d' %
          (made, skipped, failed))
    print('Files in %s, manifest at %s' % (args.out, manifest_path))
    return 0

if __name__ == '__main__':
    sys.exit(main())
