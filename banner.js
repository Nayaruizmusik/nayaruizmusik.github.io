// Click the title banner to pause its animation; click again to play it from the same frame.
//
// A browser cannot say which frame of a GIF it is showing, so this file plays the GIF
// itself: it reads the file, decodes one frame at a time onto a canvas, and moves on after
// each frame's own delay. Pausing just stops moving on, so the picture stays exactly on the
// frame that was showing. (If the file cannot be read, for example when the page is opened
// straight from the computer, the plain GIF is left playing and a click pauses it on the
// frame the browser gives, which can be the first one.)
(function () {
  var banner = document.querySelector('.banner');
  var gif = banner && banner.querySelector('img:not(.flare)');
  if (!gif) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'banner-still';
  canvas.hidden = true;
  gif.insertAdjacentElement('afterend', canvas);

  banner.setAttribute('role', 'button');
  banner.setAttribute('tabindex', '0');
  banner.setAttribute('aria-pressed', 'false');
  banner.setAttribute('aria-label', 'Pause the title animation');

  var paused = false;
  var player = null; // set once the GIF is decoded by this file

  // ---------- the part that reads a GIF file ----------

  // Reads the structure of the file: the size, and for every frame where its pixels are,
  // its palette, delay and how it is cleared. The pixels themselves are decoded later.
  function parse(bytes) {
    var p = 6;
    var width = bytes[p] | (bytes[p + 1] << 8);
    var height = bytes[p + 2] | (bytes[p + 3] << 8);
    var flags = bytes[p + 4];
    p += 7;
    var globalPalette = null;
    if (flags & 0x80) {
      var n = 3 << ((flags & 7) + 1);
      globalPalette = bytes.subarray(p, p + n);
      p += n;
    }
    var frames = [];
    var control = { delay: 10, transparent: -1, disposal: 0 };
    while (p < bytes.length) {
      var block = bytes[p++];
      if (block === 0x3b) break;
      if (block === 0x21) {
        var label = bytes[p++];
        if (label === 0xf9) {
          var f = bytes[p + 1];
          control = {
            delay: bytes[p + 2] | (bytes[p + 3] << 8),
            transparent: (f & 1) ? bytes[p + 4] : -1,
            disposal: (f >> 2) & 7
          };
        }
        while (bytes[p]) p += bytes[p] + 1;
        p++;
      } else if (block === 0x2c) {
        var fr = {
          x: bytes[p] | (bytes[p + 1] << 8),
          y: bytes[p + 2] | (bytes[p + 3] << 8),
          w: bytes[p + 4] | (bytes[p + 5] << 8),
          h: bytes[p + 6] | (bytes[p + 7] << 8),
          delay: control.delay,
          transparent: control.transparent,
          disposal: control.disposal
        };
        var ff = bytes[p + 8];
        p += 9;
        fr.interlaced = !!(ff & 0x40);
        fr.palette = globalPalette;
        if (ff & 0x80) {
          var m = 3 << ((ff & 7) + 1);
          fr.palette = bytes.subarray(p, p + m);
          p += m;
        }
        fr.minCode = bytes[p++];
        var parts = [];
        var total = 0;
        while (bytes[p]) {
          parts.push(bytes.subarray(p + 1, p + 1 + bytes[p]));
          total += bytes[p];
          p += bytes[p] + 1;
        }
        p++;
        fr.data = new Uint8Array(total);
        var at = 0;
        parts.forEach(function (part) { fr.data.set(part, at); at += part.length; });
        frames.push(fr);
        control = { delay: 10, transparent: -1, disposal: 0 };
      } else {
        break;
      }
    }
    return { width: width, height: height, frames: frames };
  }

  // Turns a frame's compressed pixels (LZW) into one palette number per pixel.
  function unpack(minCode, data, count) {
    var out = new Uint8Array(count);
    var prefix = new Uint16Array(4096);
    var suffix = new Uint8Array(4096);
    var stack = new Uint8Array(4097);
    var clear = 1 << minCode;
    var end = clear + 1;
    var avail = clear + 2;
    var size = minCode + 1;
    var mask = (1 << size) - 1;
    var old = -1;
    var first = 0;
    var top = 0;
    var bits = 0;
    var have = 0;
    var p = 0;
    var o = 0;
    var i;
    for (i = 0; i < clear; i++) suffix[i] = i;
    while (o < count) {
      while (have < size) {
        if (p >= data.length) return out;
        bits |= data[p++] << have;
        have += 8;
      }
      var code = bits & mask;
      bits >>= size;
      have -= size;
      if (code === clear) {
        size = minCode + 1;
        mask = (1 << size) - 1;
        avail = clear + 2;
        old = -1;
        continue;
      }
      if (code === end) break;
      if (old === -1) {
        out[o++] = suffix[code];
        old = code;
        first = code;
        continue;
      }
      var incoming = code;
      if (code >= avail) {
        stack[top++] = first;
        code = old;
      }
      while (code >= clear) {
        stack[top++] = suffix[code];
        code = prefix[code];
      }
      first = suffix[code];
      stack[top++] = first;
      if (avail < 4096) {
        prefix[avail] = old;
        suffix[avail] = first;
        avail++;
        if ((avail & mask) === 0 && avail < 4096) {
          size++;
          mask = (1 << size) - 1;
        }
      }
      old = incoming;
      while (top > 0 && o < count) out[o++] = stack[--top];
      top = 0;
    }
    return out;
  }

  // ---------- playing it ----------

  function Player(info) {
    var self = this;
    var w = info.width;
    var h = info.height;
    var frames = info.frames;
    var buffer = document.createElement('canvas'); // the whole picture so far, at its own size
    buffer.width = w;
    buffer.height = h;
    var bctx = buffer.getContext('2d');
    var image = bctx.createImageData(w, h);
    var pixels = image.data;
    var saved = null;   // a copy kept for frames that ask to be put back afterwards
    var index = -1;     // the frame on show
    var shownAt = 0;    // when it came on show
    var running = false;

    // Brings frame i onto the picture (they must be asked for in order).
    function build(i) {
      if (i === 0) {
        pixels.fill(0);
        saved = null;
      } else {
        var prev = frames[i - 1];
        if (prev.disposal === 2) {
          for (var yy = 0; yy < prev.h; yy++) {
            var start = ((prev.y + yy) * w + prev.x) * 4;
            pixels.fill(0, start, start + prev.w * 4);
          }
        } else if (prev.disposal === 3 && saved) {
          pixels.set(saved);
        }
      }
      var f = frames[i];
      if (f.disposal === 3) saved = new Uint8ClampedArray(pixels);
      var idx = unpack(f.minCode, f.data, f.w * f.h);
      var pal = f.palette;
      var rows = f.h;
      var order = [];
      var r;
      if (f.interlaced) {
        [[0, 8], [4, 8], [2, 4], [1, 2]].forEach(function (pass) {
          for (r = pass[0]; r < rows; r += pass[1]) order.push(r);
        });
      } else {
        for (r = 0; r < rows; r++) order.push(r);
      }
      for (var n = 0; n < rows; n++) {
        var y = f.y + order[n];
        if (y >= h) continue;
        for (var x = 0; x < f.w; x++) {
          if (f.x + x >= w) continue;
          var c = idx[n * f.w + x];
          if (c === f.transparent) continue;
          var at = (y * w + f.x + x) * 4;
          pixels[at] = pal[c * 3];
          pixels[at + 1] = pal[c * 3 + 1];
          pixels[at + 2] = pal[c * 3 + 2];
          pixels[at + 3] = 255;
        }
      }
      bctx.putImageData(image, 0, 0);
    }

    // Draws the picture the way the GIF is shown: filling the banner, cropped in the middle.
    this.draw = function () {
      var dpr = window.devicePixelRatio || 1;
      var cw = Math.round(gif.clientWidth * dpr);
      var ch = Math.round(gif.clientHeight * dpr);
      if (!cw || !ch) return;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      var scale = Math.max(cw / w, ch / h);
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(buffer, (cw - w * scale) / 2, (ch - h * scale) / 2, w * scale, h * scale);
    };

    function show(i, now) {
      build(i);
      index = i;
      shownAt = now;
      self.draw();
    }

    function tick(now) {
      if (!running) return;
      var f = frames[index];
      var wait = (f.delay <= 1 ? 10 : f.delay) * 10; // like browsers: a tiny delay means 100 ms
      if (now - shownAt >= wait) {
        // catch up if the page was busy, but never decode more than a few frames at once
        var next = (index + 1) % frames.length;
        show(next, now - Math.min(now - shownAt - wait, wait));
      }
      requestAnimationFrame(tick);
    }

    this.play = function () {
      if (running) return;
      running = true;
      shownAt = performance.now(); // the frame on show gets its full time again
      requestAnimationFrame(tick);
    };
    this.pause = function () { running = false; };
    this.frame = function () { return index; };
    this.count = function () { return frames.length; };

    show(0, performance.now());
  }

  // ---------- clicking ----------

  function toggle() {
    paused = !paused;
    if (player) {
      if (paused) player.pause(); else player.play();
    } else if (paused) {
      // fallback: copy whatever frame the browser gives
      var copy = document.createElement('canvas');
      copy.width = gif.naturalWidth;
      copy.height = gif.naturalHeight;
      copy.getContext('2d').drawImage(gif, 0, 0);
      canvas.width = gif.clientWidth;
      canvas.height = gif.clientHeight;
      var s = Math.max(canvas.width / copy.width, canvas.height / copy.height);
      canvas.getContext('2d').drawImage(copy, (canvas.width - copy.width * s) / 2, (canvas.height - copy.height * s) / 2, copy.width * s, copy.height * s);
      canvas.hidden = false;
    } else {
      canvas.hidden = true;
    }
    banner.setAttribute('aria-pressed', String(paused));
    banner.setAttribute('aria-label', paused ? 'Play the title animation' : 'Pause the title animation');
  }

  banner.addEventListener('click', toggle);
  banner.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { if (player) player.draw(); }).observe(gif);
  }

  // Read the file; if that works, this file takes over playing it.
  fetch(gif.currentSrc || gif.src)
    .then(function (r) { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); })
    .then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      if (String.fromCharCode(bytes[0], bytes[1], bytes[2]) !== 'GIF') throw new Error('not a GIF');
      var info = parse(bytes);
      if (!info.frames.length) throw new Error('empty');
      player = new Player(info);
      window.bannerPlayer = player; // so it can be checked from the browser's console
      canvas.hidden = false;
      gif.style.visibility = 'hidden'; // it keeps its place, the canvas shows the picture
      if (paused) {
        // clicked before the file was read: it stays on its first frame
        banner.setAttribute('aria-pressed', 'true');
      } else {
        player.play();
      }
    })
    .catch(function () { /* the plain GIF keeps playing */ });
})();
