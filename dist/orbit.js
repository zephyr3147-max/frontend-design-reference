(() => {
  'use strict';
  const stage = document.querySelector('.orbit-stage');
  const preview = document.getElementById('orbit-preview');
  const open = document.getElementById('preview-open');
  const status = document.getElementById('preview-status');
  const heading = document.getElementById('preview-title');
  const pendingSymbol = document.getElementById('pending-symbol');
  const cover = document.getElementById('page-transition');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
  const labels = ['Journal', 'Photos', 'Music', 'Bookmarks', 'Arcade', 'Life', 'Crab Coast', 'Ideas', 'Letters', 'Time', 'Wishlist', 'Explore'];
  let selected = null;
  let navigating = false;

  function select(app) {
    if (app === selected) return;
    if (selected) {
      selected.classList.remove('is-selected');
      delete selected.dataset.armed;
    }
    selected = app;
    if (!app) {
      delete stage.dataset.preview;
      preview.inert = true;
      preview.setAttribute('aria-hidden', 'true');
      return;
    }
    app.classList.add('is-selected');
    const pending = app.classList.contains('app-pending');
    stage.dataset.preview = pending ? 'pending' : app.classList.contains('app-crab') ? 'crab' : 'journal';
    heading.textContent = app.dataset.title;
    pendingSymbol.setAttribute('href', app.querySelector('use').getAttribute('href'));
    open.hidden = pending;
    status.hidden = !pending;
    if (!pending) {
      open.setAttribute('href', app.getAttribute('href'));
      open.firstChild.textContent = 'Open ' + app.dataset.title + ' ';
    }
    preview.inert = false;
    preview.removeAttribute('aria-hidden');
  }

  stage.querySelectorAll('.app').forEach((app, i) => {
    app.dataset.title = labels[i];
    if (app.classList.contains('app-pending')) {
      app.disabled = false;
      app.setAttribute('aria-label', labels[i] + ' preview，开发中');
    }
    app.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && !document.activeElement.matches('.app:focus-visible')) select(app);
    });
    app.addEventListener('focus', () => select(app));
    app.addEventListener('click', event => {
      if (app.classList.contains('app-pending')) { event.preventDefault(); select(app); }
    });
  });
  stage.addEventListener('pointerleave', () => {
    stage.style.setProperty('--tilt-x', '0deg');
    stage.style.setProperty('--tilt-y', '0deg');
    if (!stage.contains(document.activeElement) || document.activeElement.id === 'home-title') select(null);
  });
  stage.addEventListener('pointermove', event => {
    if (!mouse.matches || motion.matches) return;
    const rect = stage.getBoundingClientRect();
    stage.style.setProperty('--tilt-x', ((.5 - (event.clientY - rect.top) / rect.height) * 4).toFixed(2) + 'deg');
    stage.style.setProperty('--tilt-y', (((event.clientX - rect.left) / rect.width - .5) * 4).toFixed(2) + 'deg');
  });
  stage.addEventListener('focusout', event => {
    if (!stage.contains(event.relatedTarget)) select(null);
  });
  document.addEventListener('pointerdown', event => {
    if (!stage.contains(event.target)) select(null);
  });
  stage.addEventListener('keydown', event => {
    if (event.key === 'Escape') { select(null); document.getElementById('home-title').focus(); }
  });
  document.getElementById('replay-welcome').addEventListener('click', () => select(null));

  stage.addEventListener('click', event => {
    const link = event.target.closest('a.app, #preview-open');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (navigating) return;
    // On touch, the first tap previews; the second tap or central link opens it.
    if (!mouse.matches && link !== open && link.dataset.armed !== 'true') {
      stage.querySelectorAll('[data-armed]').forEach(app => delete app.dataset.armed);
      link.dataset.armed = 'true';
      select(link);
      return;
    }
    navigating = true;
    const source = link === open ? selected : link;
    const rect = source.querySelector('.app-orb').getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const crab = source.classList.contains('app-crab');
    cover.style.setProperty('--wipe-x', x + 'px');
    cover.style.setProperty('--wipe-y', y + 'px');
    cover.style.setProperty('--wipe-radius', Math.ceil(radius) + 'px');
    cover.style.setProperty('--wipe-color', crab ? '#e3edf4' : '#f6e9e8');
    cover.style.setProperty('--wipe-ink', crab ? '#63829a' : '#bd7777');
    document.getElementById('transition-symbol').setAttribute('href', crab ? '#tiny-crab' : '#tiny-journal');
    cover.hidden = false;
    cover.classList.add('is-active');
    window.setTimeout(() => window.location.assign(link.href), motion.matches ? 0 : 640);
  });
  window.addEventListener('pageshow', () => {
    navigating = false;
    cover.hidden = true;
    cover.classList.remove('is-active');
    stage.querySelectorAll('[data-armed]').forEach(app => delete app.dataset.armed);
    select(null);
  });
})();
