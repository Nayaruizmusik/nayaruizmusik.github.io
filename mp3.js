// The mp3 player's screen, ring of dots, song list button, mute and volume.
// The play, previous, next and progress controls are driven by the player script in
// the page; this file adds the parts that belong to the new look.
(function () {
  // The five pictures or GIFs shown on the screen, one per song, in the order of the
  // songs. To swap one, put the new file in the images folder and change its name here.
  var VISUALS = [
    'images/screen-5.jpg',
    'images/screen-sick.png',
    'images/screen-larm.webp',
    'images/screen-9.jpg',
    'images/screen-silence.png'
  ];

  var holder = document.getElementById('jb-visuals');
  if (!holder) return;

  // Two picture layers: the new one fades in over the old one, so the pictures blend.
  var layers = [document.createElement('img'), document.createElement('img')];
  layers.forEach(function (img) {
    img.className = 'vis';
    img.alt = '';
    holder.appendChild(img);
  });
  var front = 0;
  var shown = -1;

  // GIFs cannot be paused, so while the music is not playing a still copy of the
  // current frame is drawn on a canvas that covers them. When the music plays the canvas
  // fades away (mp3.css) and the GIF is seen moving again.
  var still = document.createElement('canvas');
  still.className = 'mp3-freeze';
  holder.appendChild(still);

  function isPlaying() {
    return document.documentElement.classList.contains('music-playing');
  }

  function freeze() {
    var img = layers[front];
    if (!img.naturalWidth) return;
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(holder.clientWidth * dpr);
    var h = Math.round(holder.clientHeight * dpr);
    if (!w || !h) return;
    still.width = w;
    still.height = h;
    // Draw it the way the picture is shown on the screen: filling it, cropped in the middle.
    var scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var dw = img.naturalWidth * scale;
    var dh = img.naturalHeight * scale;
    still.getContext('2d').drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { if (!isPlaying()) freeze(); }).observe(holder);
  }

  // Only the first picture loads with the page. The others load when the music first
  // plays (or after a few seconds), so big GIFs do not slow the page down.
  var restLoaded = false;
  function loadRest() {
    if (restLoaded) return;
    restLoaded = true;
    VISUALS.slice(1).forEach(function (src) { new Image().src = src; });
  }
  setTimeout(loadRest, 8000);

  function showVisual(i) {
    i = ((i % VISUALS.length) + VISUALS.length) % VISUALS.length;
    if (i === shown) return;
    shown = i;
    var next = layers[1 - front];
    next.onload = function () { if (!isPlaying()) freeze(); };
    next.src = VISUALS[i];
    next.classList.add('on');
    layers[front].classList.remove('on');
    front = 1 - front;
  }
  showVisual(0);

  // Song list button: opens the list over the screen, and closes it when a song is picked.
  var list = document.getElementById('jb-tracks');
  var listButton = document.getElementById('mp3-list-btn');
  listButton.addEventListener('click', function () {
    list.hidden = !list.hidden;
    listButton.classList.toggle('on', !list.hidden);
  });
  list.addEventListener('click', function (e) {
    if (e.target.closest('button')) { list.hidden = true; listButton.classList.remove('on'); }
  });

  // Volume and mute go to the hidden SoundCloud player.
  var widget = SC.Widget(document.getElementById('sc-hidden'));
  var vol = document.getElementById('jb-vol');
  var mute = document.getElementById('mp3-mute');
  var icon = document.getElementById('mp3-vol-icon');
  var last = 80;
  // The music is kept 7 dB quieter than the SoundCloud player's full volume, so the
  // slider's top is that lower level (change the 7 to make it quieter or louder).
  var QUIETER = Math.pow(10, -7 / 20);

  function setVolume(v) {
    vol.value = v;
    widget.setVolume(v * QUIETER);
    icon.textContent = v > 0 ? '♫' : '×';
    mute.classList.toggle('on', v === 0);
    mute.setAttribute('aria-label', v === 0 ? 'Unmute' : 'Mute');
  }

  vol.addEventListener('input', function () {
    var v = +vol.value;
    if (v > 0) last = v;
    setVolume(v);
  });
  mute.addEventListener('click', function () {
    setVolume(+vol.value === 0 ? last : 0);
  });
  widget.bind(SC.Widget.Events.READY, function () { widget.setVolume(+vol.value * QUIETER); });

  // The screen follows the song that is playing, and holds still when it is paused.
  widget.bind(SC.Widget.Events.PLAY, function () {
    loadRest();
    widget.getCurrentSoundIndex(function (i) { showVisual(i); });
  });
  widget.bind(SC.Widget.Events.PAUSE, freeze);

  // On wide screens the player is exactly as tall as the album cover beside it. The
  // player is drawn in proportion to its width, so its width follows from that height.
  // On phones (cover above, player below) it keeps its own size.
  var wrap = document.querySelector('.mp3-wrap');
  var cover = document.querySelector('.cover');
  var wide = window.matchMedia('(min-width: 761px)');
  var shape = 340 / 348; // width divided by height of the player
  var keyboardShape = 2.9; // width divided by height of the little keyboard under it

  var column = document.querySelector('.ep');
  var stack = document.querySelector('.mp3-col'); // the player with the keyboard under it

  function matchCover() {
    var h = cover ? cover.offsetHeight : 0;
    if (!wide.matches || !h) {
      wrap.style.height = '';
      wrap.style.width = '';
      stack.style.width = '';
      stack.style.marginBottom = '';
      if (column) column.style.width = '';
      return;
    }
    // The cover's column is only as wide as the cover, so the pair can be centered.
    if (column) column.style.width = cover.offsetWidth + 'px';
    // Player + gap + keyboard add up to the height of the cover. The keyboard is as wide
    // as the player, so its height is the player's width divided by its own shape.
    var gap = 8;
    var ph = Math.round((h - gap) / (1 + shape / keyboardShape));
    var pw = Math.round(ph * shape);
    wrap.style.height = ph + 'px';
    wrap.style.width = pw + 'px';
    stack.style.width = pw + 'px';
    stack.style.marginBottom = '8px'; // the cover link has the same gap under it, so both line up
  }

  if (cover && wrap) {
    if ('ResizeObserver' in window) new ResizeObserver(matchCover).observe(cover);
    window.addEventListener('resize', matchCover);
    cover.addEventListener('load', matchCover);
    wide.addEventListener('change', matchCover);
    matchCover();
  }

  // Fill the progress line with blue up to the current position.
  var seek = document.getElementById('jb-seek');
  setInterval(function () { seek.style.setProperty('--p', (seek.value / 10) + '%'); }, 200);
})();
