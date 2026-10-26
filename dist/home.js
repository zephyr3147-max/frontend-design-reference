(() => {
  'use strict';
  const welcome = document.getElementById('welcome');
  const home = document.getElementById('home');
  const entry = document.getElementById('enter-home');
  const replay = document.getElementById('replay-welcome');
  const title = document.getElementById('home-title');
  const orbitToggle = document.getElementById('orbit-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sessionKey = 'zhzb.home.entered.v1';
  let entering = false;

  function showWelcome(focusWelcome = false) {
    welcome.hidden = false;
    welcome.inert = false;
    home.inert = true;
    home.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-entering');
    document.body.classList.remove('home-ready');
    document.body.classList.add('welcome-open');
    if (focusWelcome) welcome.focus({ preventScroll: true });
  }

  function enterHome(event) {
    if (event) event.preventDefault();
    if (entering || welcome.hidden) return;
    entering = true;
    welcome.inert = true;
    // Start the reveal with the transition, before the homepage becomes visible.
    document.body.classList.add('is-entering', 'home-ready');
    try { sessionStorage.setItem(sessionKey, '1'); } catch { /* Storage is optional. */ }
    window.setTimeout(() => {
      welcome.hidden = true;
      home.inert = false;
      home.removeAttribute('aria-hidden');
      document.body.classList.remove('welcome-open', 'is-entering');
      title.focus({ preventScroll: true });
      entering = false;
      const url = new URL(window.location.href);
      url.searchParams.delete('welcome');
      url.hash = 'home';
      try { history.replaceState(null, '', url); } catch { /* Sandboxed previews may disallow history writes. */ }
    }, reducedMotion.matches ? 20 : 1280);
  }

  let visited = false;
  try { visited = sessionStorage.getItem(sessionKey) === '1'; } catch { /* Storage is optional. */ }
  const forceWelcome = new URL(window.location.href).searchParams.has('welcome');
  if (forceWelcome || (!visited && window.location.hash !== '#home')) showWelcome();
  else document.body.classList.add('home-ready');
  orbitToggle.hidden = false;
  orbitToggle.addEventListener('click', () => {
    const paused = orbitToggle.getAttribute('aria-pressed') !== 'true';
    orbitToggle.setAttribute('aria-pressed', String(paused));
    orbitToggle.setAttribute('aria-label', paused ? 'Resume icon rotation' : 'Pause icon rotation');
    orbitToggle.textContent = paused ? '▷' : 'Ⅱ';
    document.body.classList[paused ? 'add' : 'remove']('orbit-paused');
  });
  replay.hidden = false;
  entry.addEventListener('click', enterHome);
  replay.addEventListener('click', () => showWelcome(true));
  welcome.addEventListener('keydown', event => {
    if (event.key === 'Escape') enterHome(event);
  });
  const now = new Date();
  document.getElementById('year').textContent = String(now.getFullYear());
  const today = document.getElementById('today');
  today.dateTime = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  today.textContent = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(now);
})();
