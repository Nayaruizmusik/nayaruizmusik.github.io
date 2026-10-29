// Puts the red arrow beside the mp3 player so its tip touches the play button, and
// fades it away when the music is started.
(function () {
  var column = document.querySelector('.mp3-col');
  var play = document.getElementById('jb-play');
  if (!column || !play) return;

  var TIP_X = 0.99; // where the tip is in the picture (share of its width and height)
  var TIP_Y = 0.02;
  var GAP = 8;      // space between the tip and the play button's edge, in px
  var CLOSER = 0.5; // 1 = the tip stops at the button's edge, lower = nearer its center

  var arrow = document.createElement('img');
  arrow.className = 'play-arrow';
  arrow.src = 'images/arrow.png';
  arrow.alt = '';
  column.appendChild(arrow);

  function place() {
    var c = column.getBoundingClientRect();
    var p = play.getBoundingClientRect();
    if (!p.width) return; // the home page is not showing
    var w = arrow.offsetWidth;
    var h = arrow.offsetHeight;
    // The arrow keeps the way it was drawn (pointing up and to the right), so it sits
    // below and to the left of the play button with its tip aimed at the button's edge.
    // out from the button's center along the diagonal; CLOSER 0.5 = half the old distance
    var reach = (p.width / 2 * 0.7071 + GAP) * CLOSER;
    var tipX = p.left + p.width / 2 - reach;
    var tipY = p.top + p.height / 2 + reach;
    arrow.style.left = (tipX - c.left - TIP_X * w) + 'px';
    arrow.style.top = (tipY - c.top - TIP_Y * h) + 'px';
  }

  arrow.addEventListener('load', place);
  window.addEventListener('resize', place);
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(column);
  document.addEventListener('click', place, true);
  setTimeout(place, 300);
  place();

  // Fades in once, a second after the site loads
  setTimeout(function () { arrow.classList.add('shown'); }, 1000);

  var gone = false;
  function hide() {
    if (gone) return;
    gone = true;
    arrow.classList.remove('shown');
    arrow.classList.add('gone');
    setTimeout(function () { arrow.remove(); }, 900);
  }
  play.addEventListener('click', hide);
  new MutationObserver(function () {
    if (document.documentElement.classList.contains('music-playing')) hide();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
