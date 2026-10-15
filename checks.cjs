// 运行：node checks.cjs。验证多指操控的事件状态，不依赖浏览器或第三方库。
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('dist/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const noop = () => {};
const gl = new Proxy({}, { get: (_, name) => {
  if (['getShaderParameter', 'getProgramParameter'].includes(name)) { return () => true; }
  if (name.startsWith('create')) { return () => ({}); }
  if (name === name.toUpperCase()) { return 1; }
  return noop;
} });
function element() {
  const classes = new Set();
  return {
    listeners: {}, style: {}, dataset: {}, textContent: '',
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
    addEventListener(name, handler) { (this.listeners[name] ??= []).push(handler); },
    setPointerCapture: noop, focus: noop,
    getBoundingClientRect: () => ({ left: 16, top: 694, width: 104, height: 104 }),
    fire(name, values = {}) { for (const handler of this.listeners[name] ?? []) { handler({ preventDefault: noop, ...values }); } }
  };
}
const nodes = Object.fromEntries(['world', 'error', 'joystick', 'stick', 'reset', 'camera', 'speed', 'distance', 'tip'].map(id => [id, element()]));
nodes.world.getContext = () => gl;
const buttons = ['brake', 'back', 'forward'].map(key => { const button = element(); button.dataset.key = key; return button; });
const window = element();
const document = { ...element(), getElementById: id => nodes[id], querySelectorAll: selector => selector === '[data-key]' ? buttons : buttons.filter(b => b.classList.contains('held')) };
let nextFrame;
const context = vm.createContext({ console, document, innerWidth: 390, innerHeight: 844, devicePixelRatio: 1, addEventListener: window.addEventListener.bind(window), requestAnimationFrame: callback => { nextFrame = callback; } });
vm.runInContext(source + '\nglobalThis.inspectInputs = () => ({velocity, distance, joystickAxis, zoom, buttons:touchKeys.size, pointers:cameraPointers.size, keys:keys.size});', context);
let now = 0;
const advance = count => { for (let i = 0; i < count; i++) { nextFrame(now); now += 1000 / 60; } };
advance(1);
buttons[2].fire('pointerdown', { pointerId: 1 });
nodes.joystick.fire('pointerdown', { pointerId: 2, clientX: 98, clientY: 746 });
advance(60);
assert(context.inspectInputs().distance > 1, '前进按钮必须产生位移');
assert(Math.abs(Number(nodes.world.dataset.heading)) > .1, '加速与摇杆必须可以同时生效');
buttons[2].fire('pointerup', { pointerId: 1 });
nodes.joystick.fire('pointercancel', { pointerId: 2 });
assert.equal(context.inspectInputs().buttons, 0);
assert.equal(context.inspectInputs().joystickAxis, 0);
nodes.world.fire('pointerdown', { pointerId: 3, clientX: 100, clientY: 200 });
nodes.world.fire('pointerdown', { pointerId: 4, clientX: 200, clientY: 200 });
nodes.world.fire('pointermove', { pointerId: 4, clientX: 250, clientY: 200 });
assert(context.inspectInputs().zoom < 8, '双指向外拉开必须拉近视角');
window.fire('blur');
assert.equal(context.inspectInputs().pointers, 0);
buttons[2].fire('pointerdown', { pointerId: 5 });
window.fire('keydown', { code: 'KeyA' });
window.fire('blur');
assert.equal(context.inspectInputs().buttons, 0, '切换页面必须松开触屏按钮');
assert.equal(context.inspectInputs().keys, 0, '切换页面必须松开键盘');
nodes.reset.onclick();
assert.equal(context.inspectInputs().distance, 0);
assert.equal(context.inspectInputs().velocity, 0);
console.log('PASS: simultaneous steering + throttle, release/cancel, pinch, focus loss and reset');
