import { test, expect } from '@playwright/test';
import { openDemo, sel, ARTICLE_ROWS } from './helpers/demo.js';
import mockData from '../example/mock-data.js';
import demoFilters from '../example/filters.js';

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
 *
 * The example *does* declare checked values (the "Sin descartar" cut of the internal flyout), so
 * nothing here may assume an untouched pool: the state the page opens in is read from the config
 * (`declaredDefaults`) instead of being hardcoded, and a test that needs the bare pool clears the
 * defaults first.
 */

/** Filter the pool and sort it the way the component does: date desc, no-date last. */
function delPool(predicate = () => true) {
  return mockData.items
    .filter(predicate)
    .sort((a, b) => {
      if (!a.fecha_publicacion) return 1;
      if (!b.fecha_publicacion) return -1;
      return new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime();
    })
    .map((i) => String(i.id));
}

/**
 * Every token an item answers for a field, the way `_filterToken()` reads it: `String(value)`, with
 * `null` / `undefined` / a missing field all being the `'null'` token, and arrays expanded.
 */
function tokensOf(item, field) {
  const value = item[field];
  if (value === null || value === undefined) return ['null'];
  return [].concat(value).map((v) => (v === null || v === undefined ? 'null' : String(v)));
}

/**
 * The tokens the example declares `checked`, grouped by field: `Map<field, tokens[]>`. A declared
 * value can be a list (like `[null, false]` for "Sin descartar"), and inside a group the values are
 * OR'd, which is why they end up in one entry per field — that entry is also exactly the CSV the
 * component sends. This is the state the page opens with, so the expectations below are built from
 * it instead of a hardcoded "nothing is checked".
 */
function declaredDefaults(group) {
  const porCampo = new Map();
  for (const filtro of demoFilters.filter((f) => (f.group ?? 'menu') === group)) {
    for (const item of (filtro.items ?? []).filter((i) => i.checked)) {
      porCampo.set(filtro.field, [...(porCampo.get(filtro.field) ?? []), ...[].concat(item.value).map(String)]);
    }
  }
  return porCampo;
}

/** The CSV the component sends for a field: its checked values joined by commas */
const csvOf = (tokens) => tokens.join(',');

/** The pool as the page opens: every article that survives the declared defaults (AND between groups) */
function poolPorDefecto(predicate = () => true) {
  const defaults = [...declaredDefaults('filtros_internos')];
  return delPool(
    (item) =>
      predicate(item) && defaults.every(([field, tokens]) => tokensOf(item, field).some((t) => tokens.includes(t)))
  );
}

/** The internal groups the example leaves unchecked, which therefore travel as no param at all */
const internalFieldsSinDefault = () => {
  const conDefault = [...declaredDefaults('filtros_internos').keys()];
  return demoFilters.filter((f) => f.group === 'filtros_internos' && !conDefault.includes(f.field)).map((f) => f.field);
};

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
    // Cada grupo del flyout es una sección, y lleva su `label` como header cuando lo declara (sin
    // él no se sabría qué grupo es cuál): el que no lo declara se dibuda igual, solo que sin header.
    // Los textos exactos son los del ejemplo, así que el assert mira la estructura y no los clava.
    expect(await page.locator('#filtros-internos-menu .filter-section').count()).toBe(3);
    const headers = await page.locator('#filtros-internos-menu .filter-header').allTextContents();
    expect(headers.length).toBeGreaterThan(0);
    expect(headers.length).toBeLessThanOrEqual(3);
    expect(headers.every((t) => t.trim().length > 0)).toBe(true);
    // Y el panel conserva los suyos, uno por grupo, sin mezclarse con los del flyout.
    expect(await page.locator('.filter-menu .filter-header').count()).toBe(5);
    // Un botón se enciende con los valores de su propio destino: el del flyout, si el ejemplo
    // declara algún default ahí; el del panel, si alguno fuera en el panel (hoy no).
    const conDefaults = declaredDefaults('filtros_internos').size > 0;
    if (conDefaults) await expect(page.locator('#filtros-internos-toggle')).toHaveClass(/active/);
    else await expect(page.locator('#filtros-internos-toggle')).not.toHaveClass(/active/);
    await expect(page.locator('#filter-toggle')).not.toHaveClass(/active/);
    // Y la lista arranca con lo que sobrevive a esos defaults, no con el pool entero.
    expect(
      await page.$$eval(ARTICLE_ROWS, (rows) =>
        rows.map((r) => r.querySelector('.timeline-card')?.getAttribute('data-card-id'))
      )
    ).toEqual(firstPageOf(poolPorDefecto()));
  });

  test('modo local: tildar un valor del panel filtra la lista', async ({ page }) => {
    await openDemo(page, 'flat&expanded');
    await openPanel(page);

    const sitios = delPool((i) => i.tipo_fuente === 'Sitio web o portal');
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

    // Destildar devuelve la lista al estado en que se abrió: la primera página de lo que sobrevive
    // a los defaults del ejemplo (que son del flyout, así que no se tocan acá).
    await page.click(optionLabel('tipo_fuente', 'Sitio web o portal'));
    await expect(page.locator(ARTICLE_ROWS)).toHaveCount(firstPageOf(poolPorDefecto()).length);
  });

  test('modo local: el corte "Ver más" de un grupo colapsa y expande', async ({ page }) => {
    await openDemo(page, 'flat&expanded');
    await openPanel(page);

    // `tipo_fuente` deriva sus 7 valores del dato (6 tipos más el bucket de `allowEmpty`) y los corta
    // con su propio `maxVisible: 4`. Como el grupo es derivado, el corte ordena por conteo: los 4
    // visibles son los que más ítems agrupan y el "Ver más" muestra la cola menos frecuente.
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

    // Tildar `capturado` (persiste, vive en el flyout de filtros internos): se suma al estado con
    // el que se abrió la página, y eso es lo que se guarda.
    await openInternos(page);
    await page.click(optionLabel('capturado', 'true'));
    await expect(page.locator('[data-filter-field="capturado"] input[value="true"]')).toBeChecked();
    // Con un grupo del flyout tildado se enciende su botón, no el del panel.
    await expect(page.locator('#filtros-internos-toggle')).toHaveClass(/active/);
    await expect(page.locator('#filter-toggle')).not.toHaveClass(/active/);

    // `tipo_fuente` no persiste: tildar un valor del panel es un estado efímero.
    await openPanel(page);
    await page.click(optionLabel('tipo_fuente', 'Sitio web o portal'));

    await page.reload();
    await page.waitForSelector('.publicaciones-section .timeline-card', { state: 'attached' });

    // El estado interno vuelve tildado (persistió) y el del panel con su default (sin chequear,
    // porque `tipo_fuente` no persiste).
    await expect(page.locator('[data-filter-field="capturado"] input[value="true"]')).toBeChecked();
    await expect(page.locator('[data-filter-field="tipo_fuente"] input[value="Sitio web o portal"]')).not.toBeChecked();
  });

  test('modo API: los conteos llegan de /facets y activar un valor viaja como query param', async ({ page }) => {
    const requests = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.pathname === '/api') requests.push(url.searchParams);
    });

    await openDemo(page, 'api&expanded');

    // Los counts vienen del endpoint.
    const grupo = page.locator('[data-filter-field="tipo_fuente"]');
    const count = grupo
      .locator('.filter-option')
      .filter({ hasText: 'Sitio web o portal' })
      .locator('.filter-option-count');
    await expect(count).toHaveText('(5)');
    // Los facets ya llegaron, así que el toggle del panel ya puede abrir.
    await openPanel(page);
    await page.click(optionLabel('tipo_fuente', 'Sitio web o portal'));

    // La última request de la lista lleva el filtro como `tipo_fuente=<valor>`, y los grupos de
    // estado viajan lo que el ejemplo declara tildado: un valor declarado es un CSV de sus tokens
    // (`descartado=true,null,false` con el "Sin descartar" de `[null, false]`), y un grupo sin
    // defaults no viaja.
    const last = requests[requests.length - 1];
    expect(last.get('tipo_fuente')).toBe('Sitio web o portal');
    for (const [field, tokens] of declaredDefaults('filtros_internos')) {
      expect(last.get(field), `el default de ${field} debería viajar`).toBe(csvOf(tokens));
    }
    for (const field of internalFieldsSinDefault()) {
      expect(last.get(field), `${field} no declara default, así que no debería viajar`).toBe(null);
    }

    // Tildar en el flyout lo manda como CSV, tal cual lo declara el consumidor, sin perder los
    // defaults que ya venían. El click cae dentro de la ventana de debounce que dejó el filtro
    // anterior, así que la request sale un poco después.
    await openInternos(page);
    await page.click(optionLabel('capturado', 'true'));
    await expect.poll(() => requests[requests.length - 1].get('capturado')).toBe('true');
    const conEstado = requests[requests.length - 1];
    expect(conEstado.get('capturado')).toBe('true');
    expect(conEstado.get('tipo_fuente')).toBe('Sitio web o portal');
    for (const [field, tokens] of declaredDefaults('filtros_internos')) {
      if (field !== 'capturado') expect(conEstado.get(field)).toBe(csvOf(tokens));
    }
  });

  test('modo API: el resultado vuelve filtrado por el servidor', async ({ page }) => {
    await openDemo(page, 'api&expanded');
    expect(await page.$$eval(ARTICLE_ROWS, (rows) => rows.length)).toBeGreaterThan(0);

    // El servidor ANDea los params, así que el resultado son los sitios que además sobreviven a los
    // defaults del ejemplo (los mismos que viajan en la request del test anterior).
    const sitios = poolPorDefecto((i) => i.tipo_fuente === 'Sitio web o portal');
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
