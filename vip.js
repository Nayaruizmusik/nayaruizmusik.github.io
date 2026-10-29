// The VIP page, just for fun: typing the password (data-password on the VIP section in the
// page) opens the box under it. Nothing here is secret, the content is simply hidden until
// the password is typed. Someone who unlocked it once does not have to type it again.
(function () {
  var page = document.getElementById('vip');
  if (!page) return;

  var password = (page.dataset.password || '').trim().toLowerCase();
  var lock = page.querySelector('.vip-lock');
  var form = page.querySelector('.vip-form');
  var input = form.querySelector('input');
  var message = page.querySelector('.vip-message');
  var content = page.querySelector('.vip-content');
  function open() {
    content.hidden = false;
    lock.hidden = true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    message.textContent = '';
    var typed = input.value.trim().toLowerCase();
    if (!typed) return;
    if (typed === password) {
      open();
      try { localStorage.setItem('vip-password', password); } catch (err) { /* not saved */ }
    } else {
      message.textContent = 'That password is not right.';
    }
  });

  // It stays open for someone who unlocked it before (and locks again if the password changes)
  try {
    if (password && localStorage.getItem('vip-password') === password) open();
  } catch (err) { /* no saved password */ }

  // The MailerLite form needs MailerLite's script. It is only loaded the first time the VIP
  // page is opened, so the rest of the site never contacts MailerLite.
  var mailerLoaded = false;
  function loadMailerLite() {
    if (mailerLoaded) return;
    mailerLoaded = true;
    // called by MailerLite's script after a successful sign-up
    window.ml_webform_success_47740908 = function () {
      var $ = window.ml_jQuery || window.jQuery;
      $('.ml-subscribe-form-47740908 .row-success').show();
      $('.ml-subscribe-form-47740908 .row-form').hide();
    };
    var script = document.createElement('script');
    script.src = 'https://groot.mailerlite.com/js/w/webforms.min.js?v83147fa8ce2d95cb73ece7f28b469519';
    document.head.appendChild(script);
    try { fetch('https://assets.mailerlite.com/jsonp/2750913/forms/202600946731058298/takel'); } catch (err) { /* only counts the view */ }
  }

  if (page.classList.contains('active')) loadMailerLite();
  new MutationObserver(function () {
    if (page.classList.contains('active')) loadMailerLite();
  }).observe(page, { attributes: true, attributeFilter: ['class'] });
})();
