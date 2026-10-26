const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('dist/home.js', 'utf8');
const pageMarkup = fs.readFileSync('dist/index.html', 'utf8');
assert.match(pageMarkup, /^\s*<!doctype html>/i, 'homepage must remain a complete HTML document');
for (const id of ['welcome', 'home', 'enter-home', 'replay-welcome', 'home-title', 'year', 'today']) {
  assert(pageMarkup.includes('id="' + id + '"'), 'homepage script requires element ' + id);
}
assert.match(pageMarkup, /id="welcome"[^>]*tabindex="-1"/, 'replay focus target must be focusable');


function load({ visited = false, hash = '', query = '', storageBlocked = false, reducedMotion = false } = {}) {
  const nodes = {};
  for (const id of ['welcome', 'home', 'enter-home', 'replay-welcome', 'home-title', 'year', 'today', 'orbit-toggle']) {
    nodes[id] = { hidden: ['welcome', 'replay-welcome'].includes(id), inert: false, attributes: {}, events: {},
      setAttribute(key, value) { this.attributes[key] = value; },
      getAttribute(key) { return this.attributes[key] ?? null; },
      removeAttribute(key) { delete this.attributes[key]; },
      addEventListener(key, callback) { this.events[key] = callback; },
      focus() { this.focused = true; }
    };
  }
  const classes = new Set(), timers = [], store = new Map();
  if (visited) store.set('zhzb.home.entered.v1', '1');
  const body = { classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)) } };
  const state = { nodes, classes, timers, store };
  const location = new URL('https://example.test/' + query + hash);
  vm.runInNewContext(source, {
    document: { body, getElementById: id => nodes[id] },
    window: { location, matchMedia: () => ({ matches: reducedMotion }), setTimeout: (callback, delay) => timers.push({ callback, delay }) },
    sessionStorage: {
      getItem(key) { if (storageBlocked) throw Error('disabled'); return store.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw Error('disabled'); store.set(key, value); }
    },
    history: { replaceState: (_, __, url) => { state.url = String(url); } }, URL, Date, Intl
  });
  state.click = id => nodes[id].events.click({ preventDefault() {} });
  state.finish = () => timers.splice(0).forEach(timer => timer.callback());
  return state;
}

for (const options of [{}, { storageBlocked: true }, { reducedMotion: true }, { visited: true, query: '?welcome=1' }]) {
  const s = load(options);
  assert.equal(s.nodes.welcome.hidden, false);
  assert.equal(s.nodes.home.inert, true);
  s.click('enter-home');
  assert(s.classes.has('home-ready'), 'start the reveal before exposing the homepage, not after the transition');
  s.click('enter-home');
  assert.equal(s.timers.length, 1, 'rapid repeated activation must not schedule duplicate transitions');
  assert.equal(s.timers[0].delay, options.reducedMotion ? 20 : 1280);
  assert(s.classes.has('is-entering'));
  s.finish();
  assert.equal(s.nodes.welcome.hidden, true);
  assert.equal(s.nodes.home.inert, false);
  assert.equal(s.nodes.home.attributes['aria-hidden'], undefined);
  assert(s.classes.has('home-ready'), 'home animations begin after entry');
  assert(s.nodes['home-title'].focused);
  assert.equal(s.url, 'https://example.test/#home');
  s.click('replay-welcome');
  assert.equal(s.nodes.welcome.hidden, false);
  assert(!s.classes.has('home-ready'), 'replay resets the homepage reveal');
  assert(s.nodes.welcome.focused);
  s.nodes.welcome.events.keydown({ key: 'Escape', preventDefault() {} });
  s.finish();
  assert.equal(s.nodes.welcome.hidden, true);
}
for (const options of [{ visited: true }, { hash: '#home' }]) {
  const s = load(options);
  assert.equal(s.nodes.welcome.hidden, true, 'return visits must reach the homepage directly');
  assert.equal(s.nodes.home.inert, false);
  assert(s.classes.has('home-ready'), 'direct visits also animate the homepage');
}
const orbit = load({ hash: '#home' });
orbit.click('orbit-toggle');
assert(orbit.classes.has('orbit-paused'));
assert.equal(orbit.nodes['orbit-toggle'].attributes['aria-pressed'], 'true');
assert.equal(orbit.nodes['orbit-toggle'].attributes['aria-label'], 'Resume icon rotation');
orbit.click('orbit-toggle');
assert(!orbit.classes.has('orbit-paused'));
assert.equal(orbit.nodes['orbit-toggle'].attributes['aria-pressed'], 'false');
console.log('PASS: welcome/enter/replay, duplicate clicks, focus and inert cleanup, return visits, unavailable storage and reduced motion');
console.log('PASS: homepage reveal lifecycle and orbit pause/resume');
