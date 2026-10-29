// Optional effects layered on top of the page.
//
// To remove ALL of them: delete the extras.css line at the top of index.html and
// the extras.js line at the bottom. The page works exactly as before.
// To switch ONE off: set it to false below.
(function () {
  var fx = {
    symbolsReact: true, // background symbols are slow with no music and fast while it plays
    pageFade: true,     // pages fade and slide in
    coverSize: true,    // the cover is 10% smaller
    galleryFade: true,  // the big photo cross-fades
    arrowKeys: true,    // left and right arrow keys change the gallery photo
    equalizer: true,    // little bars next to the song title while it plays
    background: true,   // the underwater photo fills the screen behind everything (no motion)
    flare: true,        // a lens flare on the top-right corner of the banner (still image)
    droplets: true      // water droplets over the black content box background (still image)
  };

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function on(name) { return fx[name] && !reduced; }

  // Effects styled in extras.css switch on through a class on <html>.
  Object.keys(fx).forEach(function (name) {
    if (on(name)) root.classList.add('fx-' + name.toLowerCase());
  });

  var viewer = document.querySelector('.viewer');
  var viewerImage = document.getElementById('viewer-img');
  var thumbs = document.getElementById('thumbs');
  var lightbox = document.getElementById('lightbox');

  // Flares: one sparkle on the banner's top-right corner and a smaller one on the
  // content box's bottom-left corner. They do not move, so they are shown even when
  // "reduce motion" is on.
  if (fx.flare) {
    root.classList.add('fx-flare'); // lets the two boxes show what sticks out of their frames
    [['.banner', 'flare flare-top'], ['.layout', 'flare flare-bottom']].forEach(function (pair) {
      var host = document.querySelector(pair[0]);
      if (!host) return;
      var flare = document.createElement('img');
      flare.className = pair[1];
      flare.src = 'images/flare-small.png'; // (the first, bigger flare is no longer used)
      flare.alt = '';
      flare.setAttribute('aria-hidden', 'true');
      host.appendChild(flare);
    });
  }

  // Symbols: the speed change is done by the page itself, which reads the
  // fx-symbolsreact class above and the music-playing class set by the player.

  // Equalizer: put the bars in a row with the song title.
  if (on('equalizer')) {
    var display = document.querySelector('.jukebox .display');
    var now = document.getElementById('jb-now');
    if (display && now) {
      var row = document.createElement('div');
      row.className = 'nowrow';
      var eq = document.createElement('span');
      eq.className = 'eq';
      eq.setAttribute('aria-hidden', 'true');
      eq.innerHTML = '<i></i><i></i><i></i><i></i>';
      display.insertBefore(row, now);
      row.appendChild(eq);
      row.appendChild(now);
    }
  }

  // Gallery cross-fade: just before the page swaps the photo, lay a copy of the
  // old one on top and fade it away.
  if (on('galleryFade') && viewer && viewerImage && thumbs) {
    thumbs.addEventListener('click', function (e) {
      if (!e.target.closest('button')) return;
      var ghost = viewerImage.cloneNode(false);
      ghost.removeAttribute('id');
      ghost.className = 'ghost';
      viewer.appendChild(ghost);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { ghost.style.opacity = '0'; });
      });
      setTimeout(function () { ghost.remove(); }, 650);
    }, true); // capture: runs before the page's own click handler
  }

  // Arrow keys change the gallery photo (also while it is open full screen).
  if (on('arrowKeys') && thumbs && viewerImage) {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var photos = document.getElementById('photos');
      if (!photos || !photos.classList.contains('active')) return;
      var buttons = thumbs.querySelectorAll('button');
      var current = 0;
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].classList.contains('current')) current = i;
      }
      var step = e.key === 'ArrowRight' ? 1 : -1;
      var target = buttons[(current + step + buttons.length) % buttons.length];
      target.click();
      target.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); // keep it in view when the row scrolls
      if (lightbox && !lightbox.hidden) lightbox.querySelector('img').src = viewerImage.src;
      e.preventDefault();
    });
  }
})();
