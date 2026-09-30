import { test, expect } from '@playwright/test';
import { openDemo, sel, ARTICLE_ROWS } from './helpers/demo.js';
import mockData from '../example/mock-data.js';

/**
 * The configurable filters (`TimelineOptions.filters`) in the real browser.
 *
 * What jsdom cannot do for this feature: check that a click actually rearranges the rendered
 * list and that the API receives the query param. The unit suite covers the DOM, the derivation
 * of values and the persistence logic; here the same filters are exercised end to end.
 *
 * The demo declares `example/filters.js` and passes it to `Timeline`, so these tests use the
 * demo config (the "Ver más" cut, the two columns, the internal-filters flyout and the persisted
 * state).
 *
 * Three browser-only details the tests have to respect:
 * - The panel and the internal-filters flyout are dropdowns: they open when their toggle is clicked.
 * - The inputs of a group are visually hidden (the styled box is the checkmark), so the clicks
 *   land on the `.filter-option` label, and state is asserted on the input underneath.
 * - The demo renders `itemsPerPage` 10 rows, so a page of results is the first 10 of the list.
 */

/** Filter the pool with the same defaults the demo declares and sort it like the component: date desc, no-date last. */
function enUso(predicate = () => true) {
  return mockData.items
    .filter((i) => i.descartado !== true && i.capturado === true)
    .filter(predicate)
    .sort((a, b) => {
      if (!a.fecha_publicacion) return 1;
      if (!b.fecha_publicacion) return -1;
      return new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime();
    })
    .map((i) => String(i.id));
}

/** The example limits each page to `itemsPerPage` (10) rows */
const firstPageOf = (list) => list.slice(0, 10);

/** The clickable label of an option of a group */
const optionLabel = (field, value) => `[data-filter-field="${field}"] .filter-option:has(input[value="${value}"])`;

/** Open the panel and, separately, the internal-filters flyout (each dropdown toggles independently) */
async function openPanel(page) {
  await page.click('#filter-toggle');
  await expect(page.locator(sel.section + ' .filter-menu')).toHaveClass(/open/);
}
async function openInternos(page) {
  await page.click('#filtros-internos-toggle');
  await expect(page.locator(sel.section + ' #filtros-internos-menu')).toHaveClass(/open/);
}

test.describe('filtros configurables en el navegador', () => {
  test('modo local: el panel arma dos columnas y el flyout de filtros internos', async ({ page }) => {
    await openDemo(page, 'flat&expanded');

    const cols = await page.locator('.filter-menu .filter-column').count();
    expect(cols).toBe(2);
    expect(await page.locator('.filter-menu .filter-column:nth-child(1) .filter-header').allTextContents()).toEqual([
      'Tono social',
      'Año publicación',
      'Contenido'
    ]);
    expect(await page.locator('.filter-menu .filter-column:nth-child(2) .filter-header').allTextContents()).toEqual([
      'Tipo de fuente',
      'Fuente oficial'
    ]);
    // Los grupos de filtros internos viven en el flyout del botón interno, no en el panel.
    expect(
      await page
        .locator('#filtros-internos-menu .filter-options')
        .evaluateAll((els) => els.map((e) => e.dataset.filterField))
    ).toEqual(['validado', 'capturado', 'descartado']);
    // El default del demo (`descartado` = sin descartar + pendiente) enciende solo el botón del flyout.
    await expect(page.locator('#filtros-internos-toggle')).toHaveClass(/active/);
    await expect(page.locator('#filter-toggle')).not.toHaveClass(/active/);
    // Y la lista ya viene con ese recorte aplicado (la primera página, ordenada por fecha).
    expect(
      await page.$$eval(ARTICLE_ROWS, (rows) =>
        rows.map((r) => r.querySelector('.timeline-card')?.getAttribute('data-card-id'))
      )
    ).toEqual(firstPageOf(enUso()));
  });

  test('modo local: tildar un valor del panel filtra la lista', async ({ page }) => {
    await openDemo(page, 'flat&expanded');
    await openPanel(page);

    const sitios = enUso((i) => i.tipo_fuente === 'Sitio web o portal');
    expect(sitios.length).toBeGreaterThan(0);

    await page.click(optionLabel('tipo_fuente', 'Sitio web o portal'));
    await expect(page.locator(ARTICLE_ROWS)).toHaveCount(sitios.length);
    expect(
      await page.$$eval(ARTICLE_ROWS, (rows) =>
        rows.map((r) => r.querySelector('.timeline-card')?.getAttribute('data-card-id'))
      )
    ).toEqual(sitios);
    // El botón del panel se enciende con filtros del panel.
    await expect(page.locator('#filter-toggle')).toHaveClass(/active/);

    // Destildar devuelve la lista (la primera página del mismo recorte).
    await page.click(optionLabel('tipo_fuente', 'Sitio web o portal'));
    await expect(page.locator(ARTICLE_ROWS)).toHaveCount(firstPageOf(enUso()).length);
  });

  test('modo local: el corte "Ver más" de un grupo colapsa y expande', async ({ page }) => {
    await openDemo(page, 'flat&expanded');
    await openPanel(page);

    // `tipo_fuente` declara 7 valores en el demo y los corta con su propio `maxVisible: 4`, así
    // que el "Ver más" muestra la cola declarada (los 3 últimos) y no los que más filtran.
    const group = page.locator('[data-filter-field="tipo_fuente"]');
    await expect(group.locator('.filter-option')).toHaveCount(7);
    await expect(group.locator('.filter-option:visible')).toHaveCount(4);
    const more = group.locator('.filter-more');
    await expect(more).toHaveText('Ver más (3)');
    await expect(more).toHaveAttribute('aria-expanded', 'false');

    await more.click();
    await expect(more).toHaveText('Ver menos');
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(group.locator('.filter-option:visible')).toHaveCount(7);

    await more.click();
    await expect(more).toHaveText('Ver más (3)');
    await expect(group.locator('.filter-option:visible')).toHaveCount(4);
  });

  test('modo local: el estado de los grupos con `persist` sobrevive a la recarga', async ({ page }) => {
    await openDemo(page, 'flat&expanded');

    // Aflojar `capturado` (persiste, vive en el flyout de filtros internos): el checkbox queda
    // destildado y así se guarda.
    await openInternos(page);
    await page.click(optionLabel('capturado', 'true'));
    await expect(page.locator('[data-filter-field="capturado"] input[value="true"]')).not.toBeChecked();

    // `tipo_fuente` no persiste: tildar un valor del panel es un estado efímero.
    await openPanel(page);
    await page.click(optionLabel('tipo_fuente', 'Sitio web o portal'));

    await page.reload();
    await page.waitForSelector('.publicaciones-section .timeline-card', { state: 'attached' });

    // El estado interno vuelve destildado (persistió el cambio) y el del panel con su default
    // (sin chequear, porque `tipo_fuente` no persiste).
    await expect(page.locator('[data-filter-field="capturado"] input[value="true"]')).not.toBeChecked();
    await expect(page.locator('[data-filter-field="tipo_fuente"] input[value="Sitio web o portal"]')).not.toBeChecked();
  });

  test('modo API: los conteos llegan de /facets y activar un valor viaja como query param', async ({ page }) => {
    const requests = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.pathname === '/api') requests.push(url.searchParams);
    });

    await openDemo(page, 'api&expanded');

    // Los counts vienen del endpoint (mismo recorte de los filtros internos que en local).
    const grupo = page.locator('[data-filter-field="tipo_fuente"]');
    const count = grupo
      .locator('.filter-option')
      .filter({ hasText: 'Sitio web o portal' })
      .locator('.filter-option-count');
    await expect(count).toHaveText('(5)');
    // Los facets ya llegaron, así que el toggle del panel ya puede abrir.
    await openPanel(page);
    await page.click(optionLabel('tipo_fuente', 'Sitio web o portal'));

    // La última request de la lista lleva el filtro como `tipo_fuente=<valor>`, junto a los
    // Los defaults de los filtros internos viajan desde el arranque. Los grupos que declaran varios
    // valores mandan uno por param, CSV: los que declara el consumidor, tal cual y con el `null`
    // incluido.
    const last = requests[requests.length - 1];
    expect(last.get('tipo_fuente')).toBe('Sitio web o portal');
    expect(last.get('descartado')).toBe('false,null');
    expect(last.get('capturado')).toBe('true');
    expect(last.get('validado')).toBe('true,false,null');
  });

  test('modo API: el resultado vuelve filtrado por el servidor', async ({ page }) => {
    await openDemo(page, 'api&expanded');
    expect(await page.$$eval(ARTICLE_ROWS, (rows) => rows.length)).toBeGreaterThan(0);

    const sitios = enUso((i) => i.tipo_fuente === 'Sitio web o portal');
    await openPanel(page);
    await page.click(optionLabel('tipo_fuente', 'Sitio web o portal'));

    await expect(page.locator(ARTICLE_ROWS)).toHaveCount(sitios.length);
    expect(
      await page.$$eval(ARTICLE_ROWS, (rows) =>
        rows.map((r) => r.querySelector('.timeline-card')?.getAttribute('data-card-id'))
      )
    ).toEqual(sitios);
  });
});
