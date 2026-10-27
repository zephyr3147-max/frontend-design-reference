const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('dist/orbit.js', 'utf8');

function load({ mouse = true, reducedMotion = false } = {}) {
  function node(classes = []) {
    const set = new Set(classes);
    return { dataset: {}, attrs: {}, events: {}, props: {}, hidden: false, inert: false,
      classList: { contains: value => set.has(value), add: value => set.add(value), remove: value => set.delete(value) },
      style: { setProperty(key, value) { this[key] = value; } },
      setAttribute(key, value) { this.attrs[key] = value; },
      getAttribute(key) { return this.attrs[key]; },
      removeAttribute(key) { delete this.attrs[key]; },
      addEventListener(key, callback) { this.events[key] = callback; },
      matches() { return false; }, focus() {},
      getBoundingClientRect() { return { left: 50, top: 80, width: 60, height: 60 }; }
    };
  }
  const apps = Array.from({ length: 12 }, (_, i) => node(['app', i === 0 ? 'app-journal' : i === 6 ? 'app-crab' : 'app-pending']));
  for (let i = 0; i < apps.length; i++) {
    const app = apps[i], symbol = node();
    symbol.attrs.href = i === 6 ? '#tiny-crab' : '#tiny-journal';
    app.attrs.href = i === 6 ? './game.html' : './journal/';
    app.href = new URL(app.attrs.href, 'https://site.test/').href;
    app.querySelector = selector => selector === 'use' ? symbol : app;
    app.closest = () => app.classList.contains('app-pending') ? null : app;
  }
  const ids = Object.fromEntries(['orbit-preview', 'preview-open', 'preview-status', 'preview-title', 'pending-symbol', 'page-transition', 'transition-symbol', 'replay-welcome', 'home-title'].map(id => [id, node()]));
  ids['preview-open'].firstChild = { textContent: '' };
  ids['preview-open'].closest = () => ids['preview-open'];
  Object.defineProperty(ids['preview-open'], 'href', { get() { return new URL(this.attrs.href, 'https://site.test/').href; } });
  const stage = node();
  stage.querySelectorAll = selector => selector === '.app' ? apps : apps.filter(app => app.dataset.armed);
  stage.contains = target => apps.includes(target) || target === ids['preview-open'];
  const timers = [], navigations = [], windowEvents = {};
  const document = { activeElement: node(), events: {}, querySelector: () => stage, getElementById: id => ids[id], addEventListener(key, callback) { this.events[key] = callback; } };
  vm.runInNewContext(source, { document, Math, window: {
    innerWidth: 390, innerHeight: 844,
    matchMedia: query => ({ matches: query.includes('reduced-motion') ? reducedMotion : mouse }),
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    location: { assign: href => navigations.push(href) },
    addEventListener: (key, callback) => { windowEvents[key] = callback; }
  }});
  function click(target, extra = {}) {
    const event = { target, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    target.events.click?.(event);
    stage.events.click(event);
  }
  return { apps, ids, stage, timers, navigations, click, document, windowEvents };
}

const desktop = load();
desktop.apps[0].events.focus();
assert.equal(desktop.stage.dataset.preview, 'journal');
assert.equal(desktop.ids['orbit-preview'].inert, false);
assert.equal(desktop.ids['preview-open'].hidden, false);
desktop.click(desktop.apps[0], { ctrlKey: true });
assert.equal(desktop.timers.length, 0, 'modified clicks must retain native new-tab behavior');
desktop.click(desktop.apps[0]);
desktop.click(desktop.apps[0]);
assert.equal(desktop.timers.length, 1, 'double activation must navigate only once');
assert.equal(desktop.timers[0].delay, 640);
assert.equal(desktop.ids['page-transition'].hidden, false);
const radius = Number(desktop.ids['page-transition'].style['--wipe-radius'].slice(0, -2));
assert(radius >= Math.hypot(390 - 80, 844 - 110), 'the circle must cover the farthest viewport corner');
desktop.timers[0].callback();
assert.deepEqual(desktop.navigations, ['https://site.test/journal/']);
desktop.windowEvents.pageshow();
assert.equal(desktop.ids['page-transition'].hidden, true, 'Back must clear the transition overlay');
assert.equal(desktop.stage.dataset.preview, undefined);
desktop.apps[6].events.focus();
desktop.click(desktop.ids['preview-open']);
desktop.timers[1].callback();
assert.equal(desktop.navigations[1], 'https://site.test/game.html', 'central action follows the selected feature');

const touch = load({ mouse: false });
touch.click(touch.apps[0]);
assert.equal(touch.timers.length, 0, 'first touch previews without navigating');
assert.equal(touch.stage.dataset.preview, 'journal');
touch.click(touch.apps[0]);
assert.equal(touch.timers.length, 1, 'second touch starts the transition');
const pending = load({ mouse: false });
pending.click(pending.apps[1]);
assert.equal(pending.stage.dataset.preview, 'pending');
assert.equal(pending.ids['preview-status'].hidden, false);
assert.equal(pending.ids['preview-open'].hidden, true);
assert.equal(pending.timers.length, 0, 'unfinished features must never navigate');
pending.stage.events.focusout({ relatedTarget: null });
assert.equal(pending.ids['orbit-preview'].inert, true);

const reduced = load({ reducedMotion: true });
reduced.click(reduced.apps[6]);
assert.equal(reduced.timers[0].delay, 0, 'reduced motion must skip the transition wait');
console.log('PASS: feature previews, native modified clicks, single navigation, full-screen circle coverage, Back cleanup, touch preview/open, pending features and reduced motion');
