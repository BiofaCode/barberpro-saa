/* Kreno — booking popup for a salon's own website.
 *
 * Paste once, before </body> (WordPress: footer / "Insert Headers and Footers"):
 *   <script src="https://kreno.ch/embed.js" defer></script>
 *
 * Then point any booking button to the salon's Kreno page:
 *   <a href="https://kreno.ch/s/mon-salon">Réserver</a>
 *   <a href="https://kreno.ch/s/mon-salon?service=Coupe%20Homme">Réserver une coupe</a>
 *
 * With the script, the click opens the booking in a popup on the same page.
 * Without it (or if it fails to load) the link simply opens the Kreno page.
 */
(function () {
  if (window.__krenoEmbed) return;
  window.__krenoEmbed = true;

  var script = document.currentScript;
  var ORIGIN = script ? new URL(script.src).origin : 'https://kreno.ch';
  var overlay = null, frame = null, prevOverflow = '', readyTimer = null;

  function parseBookingLink(a) {
    try {
      var u = new URL(a.href, location.href);
      if (u.origin !== ORIGIN) return null;
      var m = u.pathname.match(/^\/s\/([a-z0-9-]+)\/?$/);
      return m ? { slug: m[1], service: u.searchParams.get('service') || '' } : null;
    } catch (e) { return null; }
  }

  function open(slug, service) {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.setAttribute('style', 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.6);' +
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center');
    var spinner = document.createElement('div');
    spinner.setAttribute('style', 'width:36px;height:36px;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;' +
      'border-radius:50%;animation:kreno-spin 0.8s linear infinite');
    var style = document.createElement('style');
    style.textContent = '@keyframes kreno-spin{to{transform:rotate(360deg)}}';
    overlay.appendChild(style);
    overlay.appendChild(spinner);

    frame = document.createElement('iframe');
    var src = ORIGIN + '/s/' + encodeURIComponent(slug) + '?embed=1' +
      (service ? '&service=' + encodeURIComponent(service) : '');
    frame.src = src;
    frame.title = 'Réservation en ligne';
    frame.setAttribute('allow', 'payment');
    frame.setAttribute('style', 'position:fixed;inset:0;width:100%;height:100%;border:0;background:transparent;' +
      'color-scheme:normal;z-index:2147483647;opacity:0;transition:opacity .2s');
    frame.allowTransparency = true;

    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(overlay);
    document.body.appendChild(frame);

    // Never leave the visitor stuck on a spinner: fall back to the full page.
    var pageUrl = src.replace('?embed=1', '').replace(/^([^?]*)&/, '$1?');
    readyTimer = setTimeout(function () { close(); window.location.href = pageUrl; }, 10000);
  }

  function close() {
    clearTimeout(readyTimer);
    if (overlay) overlay.remove();
    if (frame) frame.remove();
    overlay = frame = null;
    document.documentElement.style.overflow = prevOverflow;
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN || !e.data || e.data.source !== 'kreno') return;
    if (e.data.type === 'ready' && frame) {
      clearTimeout(readyTimer);
      frame.style.opacity = '1';
      if (overlay && overlay.lastChild) overlay.lastChild.remove(); // spinner
    } else if (e.data.type === 'close') {
      close();
    } else if (e.data.type === 'redirect' && /^https:\/\/checkout\.stripe\.com\//.test(e.data.url || '')) {
      window.location.href = e.data.url; // Stripe Checkout cannot run inside an iframe
    }
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    var link = a && parseBookingLink(a);
    if (!link) return;
    e.preventDefault();
    open(link.slug, link.service);
  }, true);

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  window.Kreno = { open: open, close: close };
})();
