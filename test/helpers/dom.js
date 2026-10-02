/**
 * Harness for the jsdom (no-browser) tests.
 *
 * The component is loaded from `dist/`, not from `src/`, on purpose: the tests assert what the
 * consumer actually gets, and it keeps the no-bundler rule intact (no ts-node, no transpiler in
 * the test path). That means the tests need `npm run build` to have run first, which is why
 * `test:unit` in package.json does it for you.
 *
 * The import has to be **dynamic**, after the globals are installed: lightGallery is loaded by
 * `dist/TimelineViewer.js` at import time and captures the browser globals it finds, so a static
 * `import` at the top of the file would run before the jsdom window exists and throw.
 *
 * jsdom has no layout engine, so `getBoundingClientRect()` returns zeroes and `scrollTop` writes
 * are inert. That is fine for the DOM/wiring tests, but it is exactly why the scroll behaviour
 * that the fullpage mode depends on is covered by the Playwright tests instead (see
 * `test/e2e/`), where there is a real layout and real scroll offsets.
 */
import { JSDOM } from 'jsdom';
import { register } from 'node:module';

// Must be registered before the dynamic import below: the component pulls lightGallery with
// browser-only specifiers that Node cannot resolve on its own.
register('./resolve-lightgallery.js', import.meta.url);

// The `url` is not cosmetic: with the default opaque origin jsdom throws a SecurityError the
// first time anything touches `localStorage`, which the component does (resize height, work
// notes and the estado filters are all persisted).
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:3010/',
  pretendToBeVisual: true
});

/** jsdom ships no IntersectionObserver; the component only builds one when expanded. */
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const exposed = [
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'Element',
  'Node',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'InputEvent',
  'localStorage',
  'sessionStorage',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'DOMParser',
  'URLSearchParams',
  'AbortController'
];

globalThis.window = dom.window;
for (const key of exposed) {
  const value = dom.window[key];
  // `getComputedStyle` is a function of `window` that needs its receiver: copying the reference
  // alone makes it throw "Illegal invocation" on the first call.
  globalThis[key] = typeof value === 'function' && !/^[A-Z]/.test(key) ? value.bind(dom.window) : value;
}
globalThis.IntersectionObserver = NoopIntersectionObserver;
if (!globalThis.fetch) globalThis.fetch = () => Promise.reject(new Error('fetch no disponible en el test'));

const { default: Timeline } = await import('../../dist/TimelineViewer.js');

export { dom, Timeline };

/** Id del contenedor que usa `Timeline` por defecto en los tests. */
export const CONTAINER_ID = 'tv-test-container';

/**
 * Empty the document and return a fresh container for one `Timeline` instance.
 * A new container per test keeps the instances from sharing leftovers (the component keeps
 * node references to the layout it built, e.g. `timelineCards`).
 */
export function resetDom() {
  document.body.innerHTML = `<div id="${CONTAINER_ID}"></div>`;
  return document.getElementById(CONTAINER_ID);
}

/** Resolve after the pending `requestAnimationFrame` callbacks have run. */
export function flushFrames() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Leave the page at a query string, as a shared link would, and return its params.
 *
 * It goes through the History API on purpose: that is the only thing that moves jsdom's location
 * between two tests without reloading the document, and it is the very same API the component uses
 * to write (`history.replaceState`), so the tests exercise the real round trip.
 */
export function setSearch(query = '') {
  window.history.replaceState(null, '', '/' + (query ? '?' + query : ''));
  return new URLSearchParams(window.location.search);
}

/** Params of the URL as it is right now, i.e. what the component last wrote. */
export function currentParams() {
  return new URLSearchParams(window.location.search);
}

/** Names of the `tv_*` params of the current URL, sorted, for order-independent assertions */
export function tvParams() {
  return Array.from(currentParams().keys())
    .filter((key) => key.startsWith('tv_'))
    .sort();
}
