// The little keyboard under the mp3 player.
//
// It has eight sounds: your four sound files (buttons 1 to 4) and four synth sounds
// that the browser makes itself (buttons 5 to 8). Each file is a single note, C3, and the
// keys play the same sound faster or slower to make the other notes.
//
// TO SWAP A SOUND: put the new file in the "images" folder (or any folder) and change
// its path in the list below (and the label if you like). The files must be one note, C3.
//
// LOUDNESS: "gain" evens out how loud the eight sounds are. For your files the numbers
// were measured from the files (the first second of each, so a quiet file gets a big
// number). If you swap a file for one that is louder or quieter, change its gain: more is
// louder. The synth numbers were set so all eight sound equally loud to the ear, with
// the bright square and saw a little lower (2 dB) because harsh sounds feel louder than
// they measure. Those two have a low-pass filter, "lowpass", that cuts the harsh top end:
// a smaller number cuts more.
(function () {
  // (The first three files were made twice as loud, +6 dB, so their numbers are double what
  // the measuring gave: 8.252, 5.124 and 4.68. The fourth file was left as measured.)
  var SOUNDS = [
    { name: 'Sound 1', file: 'images/synth_sound1.mp3', gain: 8.252 },
    { name: 'Sound 2', file: 'images/synth_sound2.mp3', gain: 5.124 },
    { name: 'Sound 5', file: 'images/synth_sound5.mp3', gain: 4.68 },
    { name: 'Sound 6', file: 'images/synth_sound6.mp3', gain: 2.75 },
    { name: 'Triangle', synth: 'triangle', gain: 0.472 },
    { name: 'Sine', synth: 'sine', gain: 0.385 },
    { name: 'Square', synth: 'square', lowpass: 2000, gain: 0.253 },
    { name: 'Saw', synth: 'sawtooth', lowpass: 2000, gain: 0.44 }
  ];

  var ROOT = 48;   // the note in the files: C3 (with middle C = C4 = 60)
  var FIRST = 48;  // the lowest key: C3
  var COUNT = 18;  // C3 up to F4

  // Computer keys, from C3 upwards (white and black keys together). They are named by
  // their PLACE on the keyboard, not by the letter printed on them, so the same keys work
  // on any layout: on a French AZERTY keyboard the C key is the one printed Q, the C# key
  // is the one printed Z, and the high E is the one printed M. Think of the home row
  // as the white keys and the row above it as the black keys.
  var KEYBOARD = [
    'KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY',
    'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon', 'Quote'
  ];
  var DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8']; // the number keys pick the sound

  // The four recorded sounds are played this many times louder than their level in the
  // list above (2 = twice as loud, about 6 dB). The synth tones are not changed.
  var SAMPLE_BOOST = 2;
  SOUNDS.forEach(function (s) { if (s.file) s.gain *= SAMPLE_BOOST; });

  var host = document.getElementById('synth');
  if (!host) return;

  // ---------- build the panel ----------

  var body = document.createElement('div');
  body.className = 'synth-body';
  host.appendChild(body);

  var top = document.createElement('div');
  top.className = 'synth-top';
  top.innerHTML =
    '<div class="synth-speaker" aria-hidden="true"></div>' +
    '<div class="synth-knobs"><i class="knob" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" title="Volume"></i></div>' +
    '<button type="button" class="demo-btn" aria-pressed="false">demo 1</button>' +
    '<button type="button" class="demo-btn" aria-pressed="false">demo 2</button>' +
    '<div class="synth-sounds" role="group" aria-label="Sound"></div>';
  body.appendChild(top);

  // A small window under the keyboard that says to use the computer keyboard. It shows when
  // someone plays with the mouse, and goes away for good when they play with the keyboard.
  var tip = document.createElement('div');
  tip.className = 'synth-tip';
  tip.setAttribute('role', 'status');
  tip.textContent = 'use your computer keyboard';
  host.appendChild(tip);
  var keyboardUsed = false;
  function showTip() { if (!keyboardUsed) tip.classList.add('show'); }
  function hideTip() { keyboardUsed = true; tip.classList.remove('show'); }

  var soundBox = top.querySelector('.synth-sounds');
  var soundButtons = SOUNDS.map(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sound-btn';
    b.setAttribute('aria-label', 'Sound ' + (i + 1) + ': ' + s.name);
    b.title = s.name;
    b.addEventListener('click', function () { choose(i); });
    soundBox.appendChild(b);
    return b;
  });

  // The one knob is the volume. It turns by dragging up or down, with the mouse wheel,
  // or with the arrow keys while it is selected.
  var volume = 0.85;
  var BOOST = 2; // +6 dB: everything the keyboard plays is twice as loud as before (when the
                 // page is on a web server; a double-clicked file cannot go louder than the
                 // computer's own limit for <audio>, and the limiter below stops any crackle)

  function makeKnob(el, start, onChange) {
    var value = start;

    function show() {
      el.style.setProperty('--r', (value * 270 - 135) + 'deg');
      el.setAttribute('aria-valuenow', Math.round(value * 100));
      onChange(value);
    }

    function set(v) {
      value = Math.max(0, Math.min(1, v));
      show();
    }

    el.addEventListener('pointerdown', function (e) {
      var startY = e.clientY;
      var from = value;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* no active pointer */ }
      function move(ev) { set(from + (startY - ev.clientY) / 120); }
      function up() {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
      }
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      set(value - e.deltaY / 1000);
    }, { passive: false });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { set(value + 0.05); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { set(value - 0.05); e.preventDefault(); }
    });
    show();
  }

  var knobs = top.querySelectorAll('.knob');
  makeKnob(knobs[0], volume, function (v) {
    volume = v;
    if (master) master.gain.value = v * BOOST;
  });

  var keysBox = document.createElement('div');
  keysBox.className = 'keys';
  body.appendChild(keysBox);

  var keys = [];
  var whites = 0;
  for (var i = 0; i < COUNT; i++) {
    var black = [1, 3, 6, 8, 10].indexOf(i % 12) >= 0;
    var key = document.createElement('div');
    key.className = 'key' + (black ? ' black' : '');
    key.setAttribute('role', 'button');
    key.setAttribute('aria-label', 'Note ' + (FIRST + i));
    if (black) {
      // sits between the white key before it and the one after it
      key.style.left = 'calc(' + (whites * 100 / 11) + '% - 2.6cqw)';
    } else {
      whites++;
    }
    keysBox.appendChild(key);
    keys.push(key);
  }
  // white keys are laid out by the flexbox; black keys were placed above, so move the
  // white ones to the front of the row in order
  keys.filter(function (k) { return !k.classList.contains('black'); })
      .forEach(function (k) { keysBox.appendChild(k); });
  keys.filter(function (k) { return k.classList.contains('black'); })
      .forEach(function (k) { keysBox.appendChild(k); });

  // ---------- sound ----------

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = AC ? new AC() : null;
  var master = null;
  var bus = null;

  if (ctx) {
    master = ctx.createGain();
    master.gain.value = volume * BOOST;
    // a gentle limiter, so several notes at once cannot crackle
    var limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master.connect(limiter);
    limiter.connect(ctx.destination);

    // every note goes into the bus, which goes to the volume
    bus = ctx.createGain();
    bus.connect(master);
  }

  var buffers = [];   // sounds decoded for Web Audio (the best way to play them)
  var playable = [];  // true when the file can at least be played through an <audio> element
  var current = 0;
  var elementMode = false; // true when the page was opened from a file and plays through <audio>

  // The loudest "gain" among the sound files. In <audio> mode a sound cannot be made
  // louder than it is, so everything is lowered together, keeping all eight equal.
  var MAXGAIN = Math.max.apply(null, SOUNDS.filter(function (s) { return s.file; })
    .map(function (s) { return s.gain; }));
  function modeScale() { return elementMode ? 1 / MAXGAIN : 1; }

  function mark(i, ok) {
    soundButtons[i].dataset.missing = ok ? 'false' : 'true';
    soundButtons[i].title = SOUNDS[i].name + (ok ? '' : ' (file not found, playing a plain tone)');
  }

  // Load the sound files, in two ways so it works wherever the page is opened:
  //  1. fetch + decode: instant and clean. It needs the page to come from a web server
  //     (GitHub Pages is one), but browsers refuse it when the file is opened straight
  //     from the computer by double-clicking it.
  //  2. a plain <audio> element, played faster or slower for the other notes. This works
  //     everywhere, including a double-clicked file.
  // Only a sound file that cannot be loaded either way falls back to a plain tone.
  SOUNDS.forEach(function (s, i) {
    if (s.synth) { mark(i, true); return; } // made by the browser, nothing to load
    function viaElement() {
      var probe = new Audio();
      probe.preload = 'auto';
      probe.addEventListener('canplaythrough', function () { playable[i] = true; elementMode = true; mark(i, true); }, { once: true });
      probe.addEventListener('error', function () { mark(i, false); }, { once: true });
      probe.src = s.file;
      probe.load();
    }
    if (!ctx) { viaElement(); return; }
    fetch(s.file)
      .then(function (r) { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); })
      .then(function (data) {
        return new Promise(function (ok, fail) { ctx.decodeAudioData(data, ok, fail); });
      })
      .then(function (buffer) { buffers[i] = buffer; playable[i] = true; mark(i, true); })
      .catch(viaElement);
  });

  function choose(i) {
    if (i !== current && typeof releaseHeld === 'function') releaseHeld();
    current = i;
    soundButtons.forEach(function (b, n) { b.classList.toggle('on', n === i); });
  }
  choose(0);

  // A key starts the whole sound and lets it play to its end, even after the key is
  // let go (like a sampler's one-shot). Pressing again starts another copy on top.

  // One synth note. "level" is its loudness. With hold = true the note keeps sounding while
  // the key is down and fades out when it is let go (stopTone); otherwise it is a short
  // pluck that dies away by itself. It returns what stopTone needs.
  var RELEASE = 0.25; // seconds the held notes take to fade out after the key is let go
  var sustained = {}; // the synth notes being held down, by note number
  var sustainedTimers = {}; // a safety limit for each of them (see MAX_HOLD)
  var MAX_HOLD = 20;  // seconds: a held synth note fades out by itself after this, so one can
                      // never be left sounding forever

  function playTone(type, n, level, cutoff, hold, when, length) {
    if (!ctx) return null;
    if (ctx.state === 'suspended') ctx.resume();
    // "when" is a time on the audio clock; without it the tone starts now
    var now = when === undefined ? ctx.currentTime : Math.max(when, ctx.currentTime);
    var toneGain = ctx.createGain();
    var tone = ctx.createOscillator();
    tone.type = type;
    tone.frequency.value = 440 * Math.pow(2, (n - 69) / 12);
    toneGain.gain.setValueAtTime(0, now);
    toneGain.gain.linearRampToValueAtTime(level, now + 0.008);
    if (length !== undefined) {
      // a tone of known length (the demo songs): its whole life is planned right now, so
      // start() and stop() are each called exactly once, and nothing has to be undone later
      toneGain.gain.setValueAtTime(level, now + Math.max(length, 0.01));
      toneGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(length, 0.01) + RELEASE);
    } else if (!hold) {
      toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    }
    if (cutoff) {
      // a low-pass filter takes the harsh top end off bright sounds like square and saw
      var soften = ctx.createBiquadFilter();
      soften.type = 'lowpass';
      soften.frequency.value = cutoff;
      soften.Q.value = 0.7;
      tone.connect(soften);
      soften.connect(toneGain);
    } else {
      tone.connect(toneGain);
    }
    toneGain.connect(bus);
    tone.start(now);
    if (length !== undefined) {
      tone.stop(now + Math.max(length, 0.01) + RELEASE + 0.05);
      return { tone: tone, gain: toneGain, level: level, timed: true };
    }
    if (!hold) {
      tone.stop(now + 1.5);
      return null;
    }
    return { tone: tone, gain: toneGain, level: level };
  }

  // Lets go of a held synth tone (a handle made by playTone): it fades out quickly. "at" is a
  // time on the audio clock for the fade to begin; without it, now.
  function releaseTone(h, at) {
    if (!h) return;
    var from = at === undefined ? ctx.currentTime : Math.max(at, ctx.currentTime);
    h.gain.gain.cancelScheduledValues(from);
    h.gain.gain.setValueAtTime(Math.max(at === undefined ? h.gain.gain.value : h.level, 0.0001), from);
    h.gain.gain.exponentialRampToValueAtTime(0.0001, from + RELEASE);
    // a tone of known length already has its stop time; stopping it again is not needed (and
    // some browsers refuse a second stop())
    if (!h.timed) {
      try { h.tone.stop(from + RELEASE + 0.05); } catch (e) { /* already stopped */ }
    }
  }

  // Makes a timed tone that has not started yet silent (it still ends at its planned time)
  function silenceTone(h) {
    if (!h) return;
    var now = ctx.currentTime;
    h.gain.gain.cancelScheduledValues(0);
    h.gain.gain.setValueAtTime(0, now);
  }

  function stopTone(n) {
    clearTimeout(sustainedTimers[n]);
    delete sustainedTimers[n];
    var h = sustained[n];
    if (!h) return;
    delete sustained[n];
    releaseTone(h);
  }

  // Lets go of every held note at once, and puts the keys back up. Used when the sound is
  // changed, because the notes still held belong to the sound that was just left.
  function releaseHeld() {
    Object.keys(sustained).forEach(function (n) { stopTone(+n); });
    keys.forEach(function (k) { k.classList.remove('on'); });
    held = {};
  }


  // Stops everything the keyboard is sounding, for certain: every note is connected to "bus",
  // so the old bus is faded out and cut off, and a new bus takes its place for the next notes.
  // Whatever was playing (even a note that got stuck) can no longer be heard. Used when a demo
  // song starts or stops.
  function silenceAll() {
    if (!ctx || !bus || !master) return;
    var old = bus;
    bus = ctx.createGain();
    bus.connect(master);
    old.gain.cancelScheduledValues(0);
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
    setTimeout(function () { try { old.disconnect(); } catch (e) { /* already cut off */ } }, 400);
    releaseHeld();
  }

  // Plays note n with the selected sound, at loudness "vel" (1 = full). It does not touch the
  // keys on screen. It returns what is needed to stop the note later (a held synth tone, or
  // null for the recorded sounds, which play to their end), or false if nothing could play.
  function sound(n, vel, when, length) {
    var sound = SOUNDS[current];
    var rate = Math.pow(2, (n - ROOT) / 12); // the files are C3: faster is higher, slower is lower
    var tone = null;
    var source = null;
    var level = null;

    if (sound.synth) {
      if (!ctx) return false;
      tone = playTone(sound.synth, n, sound.gain * modeScale() * vel, sound.lowpass, true, when, length);
    } else if (buffers[current] && ctx) {
      // best way: the decoded sound, played at a different speed
      if (ctx.state === 'suspended') ctx.resume();
      source = ctx.createBufferSource();
      level = ctx.createGain();
      source.buffer = buffers[current];
      source.playbackRate.value = rate;
      level.gain.value = sound.gain * vel;
      source.connect(level);
      level.connect(bus);
      source.start(when === undefined ? 0 : Math.max(when, ctx.currentTime)); // 0 = right now
    } else if (playable[current]) {
      // when the page is opened straight from the computer: the same sound through an
      // <audio> element, with its pitch allowed to change with the speed
      var a = new Audio(sound.file);
      a.preservesPitch = false;
      a.mozPreservesPitch = false;
      a.webkitPreservesPitch = false;
      a.defaultPlaybackRate = rate;
      a.playbackRate = rate;
      a.volume = Math.min(1, volume * sound.gain * modeScale() * vel);
      var started = a.play();
      if (started && started.catch) started.catch(function () { /* the browser said no */ });
    } else if (ctx) {
      // the file could not be loaded at all: a plain tone so the key still does something
      playTone('triangle', n, 0.472 * modeScale() * vel);
    } else {
      return false;
    }
    return { tone: tone, source: source, level: level };
  }

  function noteOn(n) {
    stopTone(n); // a note pressed again while still fading starts fresh
    var played = sound(n, 1);
    if (!played) return;
    if (played.tone) {
      sustained[n] = played.tone;
      sustainedTimers[n] = setTimeout(function () { stopTone(n); }, MAX_HOLD * 1000);
    }
    keys[n - FIRST].classList.add('on');
  }

  // Letting go of a key puts the key back up. The recorded sounds keep playing to their
  // end; the synth tones (Triangle, Sine, Square, Saw) fade out.
  function noteOff(n) {
    if (ctx) stopTone(n);
    if (keys[n - FIRST]) keys[n - FIRST].classList.remove('on');
  }

  // ---------- the demo song ----------

  // The "demo 1" and "demo 2" buttons play the songs in demo.js (made from the MIDI files) with
  // the sound that is selected, over and over until the same button is pressed again, and light
  // the keys that are being played. While one song plays the other button is locked: to change
  // songs, stop the first one, then start the other. Starting or stopping a song silences the
  // whole synth (silenceAll), so nothing can be left sounding.
  // The notes of the song go lower and higher than the keyboard: they sound at their real
  // pitch, and the key shown is the same note moved up or down whole octaves.
  //
  // TIMING: the notes are not played "when the page gets round to it" (a busy page makes that
  // late, a little differently each time, so the song lags and wobbles). Every note is handed to
  // the audio engine ahead of time, with the exact moment it must start on the audio clock,
  // which keeps perfect time whatever the page is doing. Round r of the song starts at
  // demoT0 + r * demoLoop.
  var demoButtons = Array.prototype.slice.call(top.querySelectorAll('.demo-btn'));
  var songs = window.DEMO_SONGS || [];  // the songs in demo.js: "demo 1" plays the first, and so on
  var song = null;                      // the song that is playing
  // The sound each demo starts with (by name, as in the list at the top): pressing "demo 1"
  // selects Sound 2 and pressing "demo 2" selects Square. You can still pick another sound
  // while the song plays.
  var DEMO_SOUNDS = ['Sound 2', 'Square'];
  var LOOKAHEAD = 0.6;   // how many seconds ahead the notes are handed to the audio engine
  var demoOn = false;
  var demoTimer = null;
  var demoT0 = 0;        // the moment (audio clock) round 0 starts
  var demoLoop = 0;      // how many seconds one round lasts
  var demoNext = 0;      // the next note to hand over
  var demoRound = 0;     // the round that note belongs to, counting from 0
  var demoItems = [];    // notes handed over and not finished: { key, tone, source, start, ... }
  var demoLit = {};      // how many demo notes hold each key down

  demoButtons.forEach(function (button, i) {
    if (!ctx || !songs[i] || !songs[i].notes || !songs[i].notes.length) button.hidden = true;
  });

  function demoKey(n) {
    while (n < FIRST) n += 12;
    while (n >= FIRST + COUNT) n -= 12;
    return n - FIRST;
  }

  function demoLight(i, on) {
    demoLit[i] = (demoLit[i] || 0) + (on ? 1 : -1);
    keys[i].classList.toggle('demo', demoLit[i] > 0);
  }

  // The note is over: its key comes back up (the sound itself ended on the audio clock)
  function demoEnd(item) {
    clearTimeout(item.lightTimer);
    clearTimeout(item.offTimer);
    clearTimeout(item.soundTimer);
    if (item.lit) demoLight(item.key, false);
    item.lit = false;
    var at = demoItems.indexOf(item);
    if (at >= 0) demoItems.splice(at, 1);
  }

  // Hands one note to the audio engine, to start at "when" (audio clock).
  function demoFire(note, when) {
    var vel = 0.35 + 0.65 * (note[3] / 127); // soft notes stay audible
    var length = note[2] * 60 / song.bpm;
    var wait = Math.max(0, (when - ctx.currentTime) * 1000);
    var item = { key: demoKey(note[1]), tone: null, source: null, start: when,
                 lit: false, lightTimer: 0, offTimer: 0, soundTimer: 0 };
    if (SOUNDS[current].synth || (buffers[current] && ctx)) {
      var played = sound(note[1], vel, when, length); // a synth tone ends with the note
      if (played) {
        item.tone = played.tone;
        item.source = played.source;
      }
    } else {
      // a sound that can only play as a plain <audio> cannot be timed ahead: start it by timer
      item.soundTimer = setTimeout(function () { sound(note[1], vel); }, wait);
    }
    // the key goes down and up with the note (a timer is fine for a picture)
    item.lightTimer = setTimeout(function () { item.lit = true; demoLight(item.key, true); }, wait);
    item.offTimer = setTimeout(function () { demoEnd(item); }, wait + length * 1000);
    demoItems.push(item);
  }

  // Runs often: hands over every note that starts in the next LOOKAHEAD seconds.
  function demoSchedule() {
    var now = ctx.currentTime;
    for (;;) {
      var roundStart = demoT0 + demoRound * demoLoop;
      var note = song.notes[demoNext];
      var when = roundStart + note[0] * 60 / song.bpm;
      if (when > now + LOOKAHEAD) return;
      // a note that is already well past (the page was asleep, for example) is skipped, not
      // played in a rush, so the song carries on in time
      if (when >= now - 0.15) demoFire(note, when);
      demoNext++;
      if (demoNext >= song.notes.length) { demoNext = 0; demoRound++; }
    }
  }

  function demoStart(which) {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var wanted = SOUNDS.map(function (s) { return s.name; }).indexOf(DEMO_SOUNDS[which]);
    if (wanted >= 0) choose(wanted); // the demo's own sound
    silenceAll(); // a clean slate: nothing left over from before can still be sounding
    song = songs[which];
    demoOn = true;
    demoLoop = song.loopBeats * 60 / song.bpm;
    demoT0 = ctx.currentTime + 0.15; // a moment to get ready, then round 0 begins
    demoNext = 0;
    demoRound = 0;
    demoTimer = setInterval(demoSchedule, 50);
    demoSchedule();
    demoButtons.forEach(function (button, i) {
      button.classList.toggle('on', i === which);
      button.setAttribute('aria-pressed', String(i === which));
      button.disabled = i !== which; // the other song cannot be started until this one is stopped
    });
  }

  function demoStop() {
    demoOn = false;
    clearInterval(demoTimer);
    var now = ctx.currentTime;
    demoItems.slice().forEach(function (item) {
      if (item.start > now) {
        // handed over but not started yet: cancel it
        if (item.source) { try { item.source.stop(); } catch (e) { /* nothing to stop */ } }
        silenceTone(item.tone);
      } else if (item.tone) {
        releaseTone(item.tone); // sounding: let it fade out (recorded sounds ring out their end)
      }
      demoEnd(item);
    });
    silenceAll(); // stopping a demo stops the whole synth, so nothing can be left sounding
    demoButtons.forEach(function (button) {
      button.classList.remove('on');
      button.setAttribute('aria-pressed', 'false');
      button.disabled = false;
    });
  }

  demoButtons.forEach(function (button, i) {
    button.addEventListener('click', function () {
      if (demoOn) {
        if (song === songs[i]) demoStop(); // the playing song's button stops it
        return;                            // the other button does nothing until then
      }
      demoStart(i);
    });
  });

  // ---------- mouse, finger and computer keyboard ----------

  // keys[] is in note order: index i is note FIRST + i
  keys.forEach(function (key, i) {
    var note = FIRST + i;
    key.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { key.setPointerCapture(e.pointerId); } catch (err) { /* no active pointer */ }
      if (e.pointerType === 'mouse') showTip(); // a finger on a phone has no computer keyboard to use
      noteOn(note);
    });
    key.addEventListener('pointerup', function () { noteOff(note); });
    key.addEventListener('pointercancel', function () { noteOff(note); });
  });

  var held = {};

  // The computer keys only play the keyboard while the Home page is showing, and never while
  // the visitor is typing in a box (the VIP password, the mailing list email).
  function listening() {
    if (host.offsetParent === null) return false; // another page is showing
    var a = document.activeElement;
    return !(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable));
  }

  // Leaving the Home page lets go of any note still held
  function releaseAll() {
    Object.keys(held).forEach(function (k) {
      if (held[k]) noteOff(FIRST + KEYBOARD.indexOf(k));
    });
    if (ctx) Object.keys(sustained).forEach(function (n) { stopTone(+n); });
    keys.forEach(function (k) { k.classList.remove('on'); });
    held = {};
  }

  var page = host.closest('.view');
  if (page) {
    new MutationObserver(function () { if (host.offsetParent === null) releaseAll(); })
      .observe(page, { attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || !listening()) return;
    var k = e.code; // the key's place on the keyboard, whatever letter is printed on it
    var digit = DIGITS.indexOf(k);
    if (digit >= 0 && digit < SOUNDS.length) { choose(digit); return; }
    var i = KEYBOARD.indexOf(k);
    if (i < 0) return;
    // (a new press of a key that still counts as down means its key-up never came: play it again)
    held[k] = true;
    hideTip();
    noteOn(FIRST + i);
  });
  document.addEventListener('keyup', function (e) {
    var k = e.code;
    var i = KEYBOARD.indexOf(k);
    if (i < 0) return;
    held[k] = false;
    noteOff(FIRST + i);
  });
  window.addEventListener('blur', releaseAll);
})();
