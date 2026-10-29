// Lets the pictures scattered on the Contact page be dragged around with a mouse or a
// finger. They stay inside the box and go back to where they were when the page is reloaded.
(function () {
  var box = document.querySelector('#contact .scatter');
  if (!box) return;

  var top = 1; // the picture last touched goes on top of the others

  // "important" so a dragged picture also beats the phone-size positions in frames.css
  function place(img, x, y) {
    img.style.setProperty('left', x + 'px', 'important');
    img.style.setProperty('top', y + 'px', 'important');
  }

  Array.prototype.forEach.call(box.querySelectorAll('img'), function (img) {
    img.draggable = false;
    img.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      e.preventDefault();
      var area = box.getBoundingClientRect();
      var r = img.getBoundingClientRect();
      var grabX = e.clientX - r.left;
      var grabY = e.clientY - r.top;
      // from now on it is placed in pixels instead of percent
      place(img, r.left - area.left, r.top - area.top);
      img.style.zIndex = ++top;
      img.classList.add('dragging');
      try { img.setPointerCapture(e.pointerId); } catch (err) { /* no active pointer */ }

      function move(ev) {
        var a = box.getBoundingClientRect();
        var x = Math.min(Math.max(ev.clientX - a.left - grabX, 0), a.width - img.offsetWidth);
        var y = Math.min(Math.max(ev.clientY - a.top - grabY, 0), a.height - img.offsetHeight);
        place(img, x, y);
      }
      function up() {
        img.classList.remove('dragging');
        img.removeEventListener('pointermove', move);
        img.removeEventListener('pointerup', up);
        img.removeEventListener('pointercancel', up);
      }
      img.addEventListener('pointermove', move);
      img.addEventListener('pointerup', up);
      img.addEventListener('pointercancel', up);
    });
  });
})();
