import { useOfflineNetwork } from './network.js';

/** The demo page, as served by `example/server.js`. */
const DEMO = '/index.html';

/**
 * Open the demo with the given flags and wait until the component has rendered.
 *
 * `?expanded` (or `?full`) is what makes the paginator reachable: the control lives inside
 * `#timeline-cards`, which in the default mode is collapsed to `max-height: 0`.
 */
export async function openDemo(page, flags = '') {
  await useOfflineNetwork(page);
  await page.goto(`${DEMO}?${flags}`);
  await page.waitForSelector('.publicaciones-section .timeline-card', { state: 'attached' });
}

export const sel = {
  section: '.publicaciones-section',
  cards: '#timeline-cards',
  toolbar: '.featured-row',
  paginator: '.timeline-paginator-item',
  prev: '.timeline-paginator-prev',
  next: '.timeline-paginator-next',
  paginatorText: '.timeline-paginator-text',
  loadMore: '.timeline-load-more-item',
  status: '.timeline-status-item'
};

/**
 * Ids of the articles currently rendered, in DOM order.
 *
 * The trailing rows (paginator, status, "Cargar más" and the footer) are also `.timeline-item` —
 * the source builds every row as `'timeline-item timeline-<x>-item'` — so they have to be excluded
 * or they get counted as articles.
 */
export const ARTICLE_ROWS = `${sel.cards} > .timeline-item:not(.timeline-paginator-item):not(.timeline-status-item):not(.timeline-load-more-item):not(.timeline-footer-item)`;

export function articleIds(page) {
  return page.$$eval(ARTICLE_ROWS, (rows) =>
    rows.map((row) => {
      const card = row.querySelector('.timeline-card');
      return (
        card?.getAttribute('data-card-id') ||
        row.querySelector('.card-not-captured-id')?.textContent.replace(/^ID/, '').trim() ||
        null
      );
    })
  );
}

export const paginatorText = (page) => page.textContent(sel.paginatorText).then((t) => t?.trim());
export const isDisabled = (page, which) => page.isDisabled(which);
