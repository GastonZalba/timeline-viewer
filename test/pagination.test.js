/**
 * Suite jsdom: DOM, markup y lógica del componente, sin browser.
 *
 * These assert what the component *builds* — which nodes exist, which buttons are disabled, what
 * the state fields say, how a click rewrites the list. The scroll offsets and sticky geometry are
 * not testable here (jsdom has no layout engine) and live in `test/e2e/`.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resetDom, Timeline, dom } from './helpers/dom.js';
import mockData from '../example/mock-data.js';

const ITEMS = mockData.items;

/** Build an instance and return it together with its container. */
function mount(options = {}) {
  const container = resetDom();
  const tl = new Timeline({ container, items: ITEMS, featuredCount: 3, ...options });
  return { tl, container };
}

const paginator = (container) => container.querySelector('.timeline-paginator-item');
const prevBtn = (container) => container.querySelector('.timeline-paginator-prev');
const nextBtn = (container) => container.querySelector('.timeline-paginator-next');
const loadMore = (container) => container.querySelector('.timeline-load-more-item');
const paginatorText = (container) => container.querySelector('.timeline-paginator-text')?.textContent?.trim();

describe('pagination: numerico vs "Cargar mas"', () => {
  test('sin la opcion, sigue el boton "Cargar mas" y no hay paginador', () => {
    const { container } = mount({ itemsPerPage: 5 });
    assert.ok(loadMore(container), 'deberia haber boton de cargar mas');
    assert.equal(paginator(container), null, 'no deberia haber paginador');
  });

  test('con pagination:true, hay paginador y no hay boton de cargar mas', () => {
    const { container } = mount({ itemsPerPage: 5, pagination: true });
    assert.equal(loadMore(container), null, 'no deberia haber boton de cargar mas');
    assert.ok(paginator(container), 'deberia haber paginador');
  });

  test('con una sola pagina no se renderiza el paginador (seria ruido)', () => {
    // 19 items con itemsPerPage 50 entran en una sola pagina.
    const { container } = mount({ itemsPerPage: 50, pagination: true });
    assert.equal(paginator(container), null);
  });

  test('itemsPerPage:0 no pagina: sin paginador y con todos los items en pantalla', () => {
    const { container, tl } = mount({ itemsPerPage: 0, pagination: true });
    assert.equal(paginator(container), null, 'sin paginador');
    assert.equal(loadMore(container), null, 'sin cargar mas');
    assert.equal(tl.allCards.length, ITEMS.length, 'el pool completo');
  });
});

describe('paginador: estado de las flechas', () => {
  test('pagina 1 de 2: anterior deshabilitada, siguiente habilitada', () => {
    const { container } = mount({ itemsPerPage: 10, pagination: true });
    assert.equal(paginatorText(container), 'P\u00e1gina 1 de 2');
    assert.equal(prevBtn(container).disabled, true);
    assert.equal(nextBtn(container).disabled, false);
  });

  test('ultima pagina: siguiente deshabilitada, anterior habilitada', async () => {
    const { container } = mount({ itemsPerPage: 10, pagination: true });
    await tlPage(container, 2);
    assert.equal(paginatorText(container), 'P\u00e1gina 2 de 2');
    assert.equal(prevBtn(container).disabled, false);
    assert.equal(nextBtn(container).disabled, true);
  });

  test('el texto va en espanol y con la cantidad total', () => {
    const { container } = mount({ itemsPerPage: 5, pagination: true });
    // 19 items / 5 = 4 paginas
    assert.equal(paginatorText(container), 'P\u00e1gina 1 de 4');
  });
});

describe('paginador: navegacion', () => {
  test('"Siguiente" muestra los items de la pagina 2 y lo deja registrado', async () => {
    const { container, tl } = mount({ itemsPerPage: 10, pagination: true });
    const firstIds = visibleIds(container);
    nextBtn(container).click();
    await flush();
    const secondIds = visibleIds(container);
    assert.notDeepEqual(secondIds, firstIds, 'la pagina 2 debe traer otros items');
    assert.equal(tl._page, 2, 'el cursor local debe avanzar');
    assert.equal(paginatorText(container), 'P\u00e1gina 2 de 2');
  });

  test('"Anterior" vuelve a la pagina 1 con los mismos items de antes', async () => {
    const { container } = mount({ itemsPerPage: 10, pagination: true });
    const firstIds = visibleIds(container);
    nextBtn(container).click();
    await flush();
    prevBtn(container).click();
    await flush();
    assert.deepEqual(visibleIds(container), firstIds);
    assert.equal(paginatorText(container), 'P\u00e1gina 1 de 2');
  });

  test('las paginas son disjuntas: recorrerlas cubre el pool sin repetir', async () => {
    const { container, tl } = mount({ itemsPerPage: 5, pagination: true });
    const seen = [];
    const pages = tl._pageCount();
    for (let p = 1; p <= pages; p++) {
      if (p > 1) {
        nextBtn(container).click();
        await flush();
      }
      seen.push(...visibleIds(container));
    }
    assert.equal(seen.length, ITEMS.length, 'todas las tarjetas, ni una de mas');
    assert.equal(new Set(seen).size, ITEMS.length, 'sin ids repetidos entre paginas');
  });

  test('_goToPage recorta el destino en vez de rechazar', async () => {
    const { container, tl } = mount({ itemsPerPage: 10, pagination: true });
    await tl._goToPage(99);
    assert.equal(tl._page, 2, 'deberia aterrizar en la ultima pagina');
    assert.ok(visibleIds(container).length > 0, 'no debe quedar una pagina vacia');
    await tl._goToPage(-5);
    assert.equal(tl._page, 1, 'deberia quedar en la primera pagina');
  });
});

describe('paginador: re-scope del resultado', () => {
  test('la busqueda vuelve a la pagina 1', async () => {
    const { container, tl } = mount({ itemsPerPage: 10, pagination: true });
    nextBtn(container).click();
    await flush();
    assert.equal(tl._page, 2);
    tl.searchInput.value = 'enero';
    tl.searchInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await flush();
    assert.equal(tl._page, 1, 'una busqueda nueva debe arrancar en la primera pagina');
  });

  test('cambiar de taxonomia vuelve a la pagina 1', async () => {
    const container = resetDom();
    const tl = new Timeline({
      container,
      content: mockData.content,
      featuredCount: 3,
      itemsPerPage: 4,
      pagination: true
    });
    await tl._goToPage(2);
    assert.equal(tl._page, 2);
    const select = container.querySelector('#taxonomy-select');
    select.selectedIndex = 1;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await flush();
    assert.equal(tl._page, 1, 'otro ambito de datos, otra pagina 1');
  });
});

describe('featured cards', () => {
  test('modo local: el stack no depende de la pagina (usa el pool completo)', async () => {
    const { container, tl } = mount({ itemsPerPage: 5, pagination: true });
    const before = featuredIds(container);
    await tl._goToPage(3);
    assert.deepEqual(featuredIds(container), before, 'la pagina no debe mover el stack en local');
  });
});

describe('_findScrollContainer', () => {
  test('devuelve el primer ancestro con overflow scrolleable', () => {
    const { tl } = mount();
    const scroller = document.createElement('div');
    const middle = document.createElement('div');
    const leaf = document.createElement('div');
    scroller.style.overflowY = 'auto';
    middle.style.overflowY = 'scroll';
    middle.appendChild(leaf);
    scroller.appendChild(middle);
    document.body.appendChild(scroller);
    // The walk goes *up*, so the start point has to be a descendant of the box being looked for.
    assert.equal(tl._findScrollContainer(leaf), middle, 'el ancestro scrolleable mas cercano gana');
    assert.equal(tl._findScrollContainer(scroller), scroller, 'el mismo elemento puede ser el scroller');
    assert.equal(tl._findScrollContainer(document.body), null, 'si nadie scrollea, la pagina scrollea');
    scroller.remove();
  });

  test('devuelve null cuando nadie scrollea (la pagina scrollea)', () => {
    const { tl } = mount();
    const plain = document.createElement('div');
    document.body.appendChild(plain);
    assert.equal(tl._findScrollContainer(plain), null, 'sin ancestro scrolleable debe ser null');
    plain.remove();
  });

  test('overflow:hidden no cuenta como scroller', () => {
    const { tl } = mount();
    const hidden = document.createElement('div');
    hidden.style.overflowY = 'hidden';
    document.body.appendChild(hidden);
    assert.equal(tl._findScrollContainer(hidden), null);
    hidden.remove();
  });
});

describe('itemsPerPage: 0 (contrato del README)', () => {
  test('llega como 0 al constructor y no cae al default de 10', () => {
    const { tl } = mount({ itemsPerPage: 0 });
    assert.equal(tl.itemsPerPage, 0, 'antes un "|| 10" lo convertia en 10');
  });

  test('undefined si no se pasa, vuelve al default de 10', () => {
    const { tl } = mount({});
    assert.equal(tl.itemsPerPage, 10);
  });
});

/* ---------- helpers locales ---------- */

/** Stable id of a rendered article row, whatever card template it used. */
function articleId(row) {
  const card = row.querySelector('.timeline-card');
  if (card?.getAttribute('data-card-id')) return card.getAttribute('data-card-id');
  // `capturado: false` renders a different card (`.not-captured`) that shows the id as text
  // instead of a data attribute, because only `id` and `link_web` exist for those items.
  const notCaptured = row.querySelector('.card-not-captured-id');
  return notCaptured ? notCaptured.textContent.replace(/^ID/, '').trim() : null;
}

function visibleIds(container) {
  // The trailing rows (paginator, status, "Cargar más" and the footer) are also `.timeline-item` —
  // the source builds every row as `'timeline-item timeline-<x>-item'` — so they have to be
  // excluded explicitly or they get counted as articles.
  const articles = container.querySelectorAll(
    '.timeline-cards > .timeline-item:not(.timeline-paginator-item):not(.timeline-status-item):not(.timeline-load-more-item):not(.timeline-footer-item)'
  );
  return [...articles].map(articleId);
}

function featuredIds(container) {
  return [...container.querySelectorAll('.featured-card')].map((el) =>
    el.querySelector('[data-card-id]')?.getAttribute('data-card-id')
  );
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Click "Siguiente" y esperar el re-render. */
async function tlPage(container, n) {
  for (let i = 1; i < n; i++) {
    nextBtn(container).click();
    await flush();
  }
}
