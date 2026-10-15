/**
 * Local orchestration checks for All That Jazz.
 * Run: node verify.mjs
 * Uses a small DOM and engine mock; does not render WebGL or replace visual QA.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const tests = [];
const test = (name, callback) => tests.push({ name, callback });

class MockClassList {
  constructor(element) { this.element = element; }
  values() { return new Set((this.element.attributes.class || '').split(/\s+/).filter(Boolean)); }
  write(values) { this.element.attributes.class = [...values].join(' '); }
  contains(value) { return this.values().has(value); }
  add(...values) { const items = this.values(); values.forEach(value => items.add(value)); this.write(items); }
  remove(...values) { const items = this.values(); values.forEach(value => items.delete(value)); this.write(items); }
  toggle(value, force) { const items = this.values(); const on = force ?? !items.has(value); if (on) items.add(value); else items.delete(value); this.write(items); return on; }
  replace(before, after) { const items = this.values(); if (!items.delete(before)) return false; items.add(after); this.write(items); return true; }
}

class MockElement {
  constructor(document, tagName, attributes = {}) {
    this.document = document;
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.id = attributes.id || '';
    this.dataset = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    this.classList = new MockClassList(this);
    this.style = {};
    this.listeners = new Map();
    this.children = [];
    this.hidden = 'hidden' in attributes;
    this.disabled = 'disabled' in attributes;
    this.open = false;
    this.inert = false;
    this.tabIndex = Number(attributes.tabindex ?? -1);
    this.textContent = '';
    this._innerHTML = '';
  }
  get className() { return this.attributes.class || ''; }
  set className(value) { this.attributes.class = value; }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(value) { this._innerHTML = value; this.children = this.document.parse(value); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(type, listener) { const list = this.listeners.get(type) || []; list.push(listener); this.listeners.set(type, list); }
  emit(type, extra = {}) {
    const event = { type, target: this, preventDefault() { this.defaultPrevented = true; }, ...extra };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }
  click() { if (!this.disabled) this.emit('click'); }
  focus() { this.document.activeElement = this; }
  appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
  showModal() { this.open = true; }
  close() { if (!this.open) return; this.open = false; this.emit('close'); }
  getBoundingClientRect() { return { left: 100, right: 900, top: 100, bottom: 700 }; }
  setPointerCapture(id) { this.pointerCapture = id; }
}

class MockDocument {
  constructor(source) { this.elements = []; this.listeners = new Map(); this.hidden = false; this.parse(source); }
  parse(source) {
    const created = [];
    // Only the opening tags and attributes used by app.js are needed here.
    for (const tag of source.matchAll(/<([a-z][\w-]*)(\s[^>]*|)>/gi)) {
      const attributes = {};
      for (const match of tag[2].matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
      const element = new MockElement(this, tag[1], attributes);
      this.elements.push(element); created.push(element);
    }
    return created;
  }
  getElementById(id) { const element = this.elements.find(el => el.id === id); assert.ok(element, `Missing DOM element: ${id}`); return element; }
  querySelectorAll(selector) {
    if (selector === 'dialog') return this.elements.filter(el => el.tagName === 'DIALOG');
    if (selector === 'dialog[open]') return this.elements.filter(el => el.tagName === 'DIALOG' && el.open);
    if (selector.startsWith('.')) return this.elements.filter(el => el.classList.contains(selector.slice(1)));
    if (/^\[data-[\w-]+\]$/.test(selector)) return this.elements.filter(el => Object.hasOwn(el.attributes, selector.slice(1, -1)));
    throw new Error(`Add an explicit mock for selector: ${selector}`);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  createElement(tag) { const element = new MockElement(this, tag); this.elements.push(element); return element; }
  addEventListener(type, listener) { const list = this.listeners.get(type) || []; list.push(listener); this.listeners.set(type, list); }
  emit(type, extra = {}) {
    const event = { type, target: { tagName: 'CANVAS' }, key: '', repeat: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }
}

function fixture({ hash = '', saved = '[]' } = {}) {
  const document = new MockDocument(html);
  const engines = [], games = [], timers = new Map(), frames = new Map(), storage = new Map([['atj-visited', saved]]);
  let timerId = 0, clock = 100;
  class Engine {
    constructor(canvas, options) {
      this.canvas = canvas; this.options = options; this.keys = new Set();
      this.width = 1400; this.height = 900; this.failed = false;
      this.zones = ['taxi', 'japan', 'usa', 'elite', 'aimc', 'contact'].map((id, i) => ({ id, x: i * 5, z: i * 3 }));
      this.state = { zone: null, tour: false, view: 'overview' };
      this.keysEnabled = false; this.started = false; this.navigation = [];
      engines.push(this);
    }
    init() { this.options.onReady(.25, 'Building the venue'); return new Promise((resolve, reject) => { this.resolveInit = resolve; this.rejectInit = reject; }); }
    finish() { this.options.onReady(1, 'Your world is ready'); this.options.onMove(this.getState()); this.resolveInit(); }
    fail() { this.failed = true; this.options.onError('Mock WebGL unavailable'); this.resolveInit(); }
    setKeys(enabled) { this.keysEnabled = enabled; if (!enabled) this.keys.clear(); }
    setView(view) { this.state.view = view; }
    setAutoTour(enabled) { this.state.tour = enabled; this.keys.clear(); this.options.onMove(this.getState()); }
    getState() { return { ...this.state }; }
    goToZone(id) { this.state.tour = false; this.keys.clear(); this.navigation.push(id); }
    arrive(id) { this.state.zone = id; this.options.onZone(id); }
    projectPoint(x, y, z) { return { visible: true, x: 600 + x, y: 200 + z }; }
    start() { this.started = true; this.running = true; }
    stop() { this.started = false; this.running = false; }
    resize() { this.resized = true; }
  }
  class Tetris {
    constructor(element, options) { this.element = element; this.options = options; this.mounts = 0; this.resumes = 0; this.pauses = 0; games.push(this); }
    mount() { this.mounts++; return this; }
    resume() { this.resumes++; }
    pause() { this.pauses++; }
  }
  const location = { hash, href: 'index.html' };
  const window = { ATJEngine: Engine, ATJTetris: Tetris, ATJWorld: {}, location };
  const context = {
    document, window, location, console,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    performance: { now: () => clock += 100 },
    requestAnimationFrame: callback => { frames.set(++timerId, callback); return timerId; },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id)
  };
  vm.runInNewContext(app, context, { filename: 'src/app.js' });
  const $ = id => document.getElementById(id);
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
  const ready = async () => { engines[0].finish(); await flush(); };
  const click = id => $(id).click();
  const enter = async () => { await ready(); click('enter-world'); };
  return { $, click, enter, ready, flush, document, window, engine: engines[0], games, storage };
}

test('initialization gates entry until local venue assets are ready', async () => {
  const f = fixture();
  assert.equal(f.$('enter-world').disabled, true);
  assert.equal(f.$('arcade-enter').disabled, true);
  assert.equal(f.$('load-percent').textContent, '25%');
  assert.equal(f.engine.keysEnabled, false);
  f.click('enter-world'); assert.equal(f.engine.started, false);
  await f.ready();
  assert.equal(f.$('enter-world').disabled, false);
  assert.equal(f.$('arcade-enter').disabled, false);
  assert.equal(f.$('load-percent').textContent, '100%');
  assert.equal(f.$('world-labels').children.length, 6);
  assert.equal(f.engine.started, true);
});

test('enter/back switches venue, hero accessibility and label focusability', async () => {
  const f = fixture(); await f.enter();
  const hero = f.document.querySelector('.hero');
  assert(f.$('experience').classList.contains('exploring'));
  assert.equal(hero.inert, true); assert.equal(hero.getAttribute('aria-hidden'), 'true');
  assert.equal(f.$('explore-ui').hidden, false); assert.equal(f.engine.keysEnabled, true);
  assert.equal(f.engine.state.view, 'follow');
  assert(f.$('world-labels').children.every(label => label.tabIndex === 0));
  f.click('back-to-intro');
  assert(f.$('experience').classList.contains('intro-mode'));
  assert.equal(hero.inert, false); assert.equal(hero.getAttribute('aria-hidden'), null);
  assert.equal(f.$('explore-ui').hidden, true); assert.equal(f.engine.keysEnabled, false);
  assert.equal(f.engine.state.view, 'overview');
  assert(f.$('world-labels').children.every(label => label.tabIndex === -1));
});

test('Tetris mounts once, pauses on close and enters the ready venue', async () => {
  const f = fixture(); f.click('intro-game');
  assert.equal(f.$('arcade-dialog').open, true); assert.equal(f.games.length, 1);
  assert.equal(f.games[0].mounts, 1); assert.equal(f.games[0].resumes, 1);
  f.games[0].options.onExit(); assert.equal(f.games[0].pauses, 1); assert.equal(f.engine.keysEnabled, false);
  f.click('intro-game'); await f.ready(); f.click('arcade-enter');
  assert.equal(f.games.length, 1); assert.equal(f.games[0].resumes, 2); assert.equal(f.games[0].pauses, 3);
  assert.equal(f.$('arcade-dialog').open, false); assert.equal(f.engine.keysEnabled, true);
  assert(f.$('experience').classList.contains('exploring'));
});

test('modal dialogs gate keyboard and touch movement until the last dialog closes', async () => {
  const f = fixture(); await f.enter(); f.engine.arrive('taxi');
  f.click('help-button'); assert.equal(f.engine.keysEnabled, false);
  f.document.emit('keydown', { key: 'e' }); assert.equal(f.$('project-detail').open, false);
  const forward = f.document.querySelectorAll('[data-move]').find(el => el.dataset.move === 'w');
  forward.emit('pointerdown', { pointerId: 1 }); assert.equal(f.engine.keys.size, 0);
  f.click('projects-button'); f.$('help-dialog').close(); assert.equal(f.engine.keysEnabled, false);
  f.$('project-directory').close(); assert.equal(f.engine.keysEnabled, true);
  assert.equal(f.document.activeElement, f.$('world'));
  f.document.emit('keydown', { key: 'e', repeat: true }); assert.equal(f.$('project-detail').open, false);
  f.document.emit('keydown', { key: 'e', target: { tagName: 'INPUT' } }); assert.equal(f.$('project-detail').open, false);
  forward.emit('pointerdown', { pointerId: 2 }); assert(f.engine.keys.has('w'));
  forward.emit('pointerup'); assert(!f.engine.keys.has('w'));
  f.document.emit('keydown', { key: 'E' }); assert.equal(f.$('project-detail').open, true);
});

test('nearby details and next story update content, source and visited state', async () => {
  const f = fixture({ saved: '["taxi","unknown"]' }); await f.enter();
  assert.equal(f.$('visited-count').textContent, '1 / 5');
  f.engine.arrive('taxi'); assert.equal(f.$('nearby-name').textContent, 'The Taxi Project');
  f.click('open-nearby');
  assert.equal(f.$('detail-number').textContent, '01 / 05');
  assert.match(f.$('detail-title').textContent, /moving canvas/);
  assert.equal(f.$('detail-source').href, 'https://www.eemaindia.com/eemaxglobal/winners.php');
  f.click('next-project'); assert.equal(f.$('detail-number').textContent, '02 / 05');
  assert.match(f.$('detail-client').textContent, /JAPAN/);
  assert.equal(f.$('visited-count').textContent, '2 / 5');
  assert.deepEqual(JSON.parse(f.storage.get('atj-visited')), ['taxi', 'japan']);
  for (let i = 0; i < 4; i++) f.click('next-project');
  assert.equal(f.$('detail-number').textContent, '01 / 05');
});

test('project directory navigation closes the dialog and routes to the selected room', async () => {
  const f = fixture(); await f.ready(); f.click('projects-button');
  f.document.querySelectorAll('[data-project]').find(el => el.dataset.project === 'japan').click();
  assert.equal(f.$('project-directory').open, false);
  assert(f.$('experience').classList.contains('exploring'));
  assert.deepEqual(f.engine.navigation, ['japan']);
  f.engine.arrive('japan');
  f.document.querySelectorAll('[data-zone]').find(el => el.dataset.zone === 'japan').click();
  assert.equal(f.$('project-detail').open, true);
});

test('guided tour state tracks toggles, touch interruption and returning to the intro', async () => {
  const f = fixture(); await f.enter(); f.click('tour-button');
  assert.equal(f.engine.state.tour, true); assert.equal(f.$('tour-label').textContent, 'Pause tour');
  assert.equal(f.$('tour-button').getAttribute('aria-pressed'), 'true');
  f.click('tour-button'); assert.equal(f.engine.state.tour, false); assert.equal(f.$('tour-label').textContent, 'Guide me');
  f.click('tour-button');
  f.document.querySelectorAll('[data-move]')[0].emit('pointerdown', { pointerId: 3 });
  assert.equal(f.engine.state.tour, false); assert.equal(f.$('tour-button').getAttribute('aria-pressed'), 'false');
  f.click('tour-button'); f.click('back-to-intro');
  assert.equal(f.engine.state.tour, false); assert.equal(f.$('tour-label').textContent, 'Guide me');
});

test('contact zone opens the sole contact page', async () => {
  const f = fixture(); await f.enter(); f.engine.arrive('contact');
  assert.equal(f.$('nearby-project').hidden, false);
  assert.equal(f.$('open-nearby').getAttribute('aria-label'), 'Open contact page');
  assert.equal(f.$('location-title').textContent, 'The next big moment');
  f.click('open-nearby'); assert.equal(f.window.location.href, 'contact.html');
});

test('WebGL fallback retains the directory, story details and Tetris', async () => {
  const f = fixture(); f.engine.fail(); await f.flush();
  assert.equal(f.$('world-viewport').hidden, true); assert.equal(f.$('world-fallback').hidden, false);
  assert.equal(f.$('enter-world').disabled, false); assert.equal(f.engine.started, false);
  f.click('enter-world'); assert.equal(f.$('project-directory').open, true);
  f.document.querySelectorAll('[data-project]').find(el => el.dataset.project === 'aimc').click();
  assert.equal(f.$('project-directory').open, false); assert.equal(f.$('project-detail').open, true);
  assert.equal(f.$('detail-number').textContent, '05 / 05'); assert.equal(f.engine.navigation.length, 0);
  f.$('project-detail').close(); f.click('intro-game'); f.click('arcade-enter');
  assert.equal(f.$('arcade-dialog').open, false); assert.equal(f.games[0].pauses, 1);
  assert.equal(f.$('project-directory').open, true); assert.equal(f.engine.keysEnabled, false);
});

test('runtime WebGL failure restores an accessible introduction', async () => {
  const f = fixture(); await f.enter(); f.engine.options.onError('Context lost');
  assert.equal(f.$('explore-ui').hidden, true); assert(f.$('experience').classList.contains('intro-mode'));
  assert.equal(f.document.querySelector('.hero').inert, false);
  assert.equal(f.document.querySelector('.hero').getAttribute('aria-hidden'), null);
  assert.equal(f.engine.started, false);
});

test('explore deep link enters only when ready and no modal is open', async () => {
  const f = fixture({ hash: '#explore' }); await f.ready();
  assert(f.$('experience').classList.contains('exploring'));
  const g = fixture({ hash: '#explore' }); g.click('intro-game'); await g.ready();
  assert(g.$('experience').classList.contains('intro-mode'));
  assert.equal(g.$('arcade-dialog').open, true);
});

test('camera button state remains accurate after returning and re-entering', async () => {
  const f = fixture(); await f.enter(); f.click('camera-toggle');
  assert.equal(f.engine.state.view, 'first'); assert.equal(f.$('camera-toggle').getAttribute('aria-pressed'), 'true');
  f.click('back-to-intro'); f.click('enter-world');
  assert.equal(f.engine.state.view, 'follow');
  assert.equal(f.$('camera-toggle').getAttribute('aria-pressed'), 'false');
  assert.equal(f.$('camera-toggle').getAttribute('aria-label'), 'Switch to first person');
});

let failed = 0;
for (const { name, callback } of tests) {
  try { await callback(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n  ${error.message}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} orchestration checks passed. DOM/engine mocks only; no browser or WebGL rendering.`);
if (failed) process.exitCode = 1;
