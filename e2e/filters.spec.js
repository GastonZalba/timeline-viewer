import { test, expect } from '@playwright/test';
import { openDemo, sel, ARTICLE_ROWS, articleIds } from './helpers/demo.js';
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

    const cols = page.locator('.filter-menu .filter-column');
    expect(await cols.count()).toBe(2);
    // `.filter-column` por posición en el NodeList, y no con `:nth-child()`: este cuenta todos los
    // hermanos, y desde que el bloque `.filter-selects` va arriba del panel la primera columna ya
    // no es el primer hijo.
    expect(await cols.nth(0).locator('.filter-header').allTextContents()).toEqual(['Año publicación', 'Contenido']);
    expect(await cols.nth(1).locator('.filter-header').allTextContents()).toEqual(['Tipo de fuente', 'Fuente oficial']);
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
    expect(await page.locator('.filter-menu .filter-header').count()).toBe(6);
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

  test('modo local: el estado de los grupos con `persist` sobrevive a la recarga, y el resto viaja en la URL', async ({
    page
  }) => {
    await openDemo(page, 'flat&expanded');

    // Tildar `capturado` (persiste, vive en el flyout de filtros internos): se suma al estado con
    // el que se abrió la página, y eso es lo que se guarda.
    await openInternos(page);
    await page.click(optionLabel('capturado', 'true'));
    await expect(page.locator('[data-filter-field="capturado"] input[value="true"]')).toBeChecked();
    // Con un grupo del flyout tildado se enciende su botón, no el del panel.
    await expect(page.locator('#filtros-internos-toggle')).toHaveClass(/active/);
    await expect(page.locator('#filter-toggle')).not.toHaveClass(/active/);

    // `tipo_fuente` no persiste: su estado es efímero y solo sobrevive si viaja en la URL, que es lo
    // que hace el demo con `stateInUrl`.
    await openPanel(page);
    await page.click(optionLabel('tipo_fuente', 'Sitio web o portal'));
    await expect(page).toHaveURL(/tv_tipo_fuente=Sitio\+web\+o\+portal/);

    await page.reload();
    await page.waitForSelector('.publicaciones-timeline-section .timeline-card', { state: 'attached' });

    // El estado interno vuelve tildado (persistió) y el del panel vuelve tildado (viajó en la URL),
    // por dos caminos distintos que acá se ven juntos.
    await expect(page.locator('[data-filter-field="capturado"] input[value="true"]')).toBeChecked();
    await expect(page.locator('[data-filter-field="tipo_fuente"] input[value="Sitio web o portal"]')).toBeChecked();
  });

  test('modo API: los conteos llegan de /facets y activar un valor viaja como query param', async ({ page }) => {
    const requests = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.pathname === '/api') requests.push(url.searchParams);
    });

    await openDemo(page, 'api&expanded');

    // Los counts vienen del endpoint. Se busca por el texto que muestra el panel, que desde que
    // `/api/facets` manda `labels` es el label lindo ('Sitio web') y no el token crudo
    // ('Sitio web o portal'): el token es el del `input[value]`, que es el que viaja al servidor.
    const grupo = page.locator('[data-filter-field="tipo_fuente"]');
    const count = grupo.locator('.filter-option').filter({ hasText: 'Sitio web' }).locator('.filter-option-count');
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

/**
 * `stateInUrl` in the browser, which the demo always turns on: the address bar is a link
 * compartible de la vista.
 *
 * Lo que se mira acá es lo que jsdom no puede ver — que la URL del navegador cambie de verdad, que
 * un link abra la lista correcta, y que en modo API el **primer** request salga ya filtrado (el
 * sembrado tiene que ocurrir antes de que los valores existan, porque en API vienen de `/facets`) —
 * y el caso de permisos que lo justifica: un link con filtros internos abierto por alguien que no
 * los tiene declarados.
 */
test.describe('estado en la URL', () => {
  /** The params the component owns in the current URL */
  const tvParams = (page) => Object.fromEntries(new URL(page.url()).searchParams);

  test('un link abre la vista que comparte, y esa vista sigue en la URL', async ({ page }) => {
    // Los dos ítems sin `tipo_fuente` son los que no se capturaron, y son los únicos cuyo orden por
    // `id` no coincide con el de fecha: el link los pide por id ascendente y el default (fecha
    // descendente) los daría al revés, así que la lista en pantalla dice cuál de los dos se aplicó.
    await openDemo(page, 'flat&expanded&tv_tipo_fuente=null&tv_sortBy=id&tv_sort=asc');

    // El filtro llega tildado —aunque su fila esté detrás del "Ver más", que no se abre nunca—, y el
    // término... acá no hay término: los dos ítems no tienen título, así que la búsqueda solo
    // aparecería vacía o se comería la lista.
    await expect(page.locator(optionLabel('tipo_fuente', 'null') + ' input')).toBeChecked();
    expect(await articleIds(page)).toEqual(firstPageOf(poolPorDefecto((i) => i.tipo_fuente === null).sort()));

    // Montar no reescribe el link, así que sigue siendo el mismo link.
    expect(tvParams(page)['tv_tipo_fuente']).toBe('null');
    expect(tvParams(page)['tv_sortBy']).toBe('id');

    // Y cambiar algo lo actualiza sin dejar de ser el mismo link (replaceState, sin historial). Lo
    // que queda acá ya es solo URL: este filtro vacía la lista (los dos ítems no traen `contenido`).
    await openPanel(page);
    await page.click(optionLabel('contenido', 'imagenes'));
    await expect.poll(() => tvParams(page)['tv_contenido']).toBe('imagenes');
    await expect(page).toHaveURL(/tv_sortBy=id/);
  });

  test('el link decide la taxonomía, y el que ya no existe abre en la primera', async ({ page }) => {
    const segunda = mockData.content[1].label;
    await openDemo(page, `expanded&tv_tax=${encodeURIComponent(segunda)}`);
    await expect(page.locator('#taxonomy-select')).toHaveValue(segunda);
    expect(await articleIds(page)).toEqual(delPool((i) => mockData.content[1].items.includes(i)));

    await openDemo(page, 'expanded&tv_tax=Taxonom%C3%ADa%20que%20ya%20no%20existe');
    await expect(page.locator('#taxonomy-select')).toHaveValue(mockData.content[0].label);
  });

  test('con `?pagination` el link abre en su página, y con "Cargar más" la página no existe', async ({ page }) => {
    await openDemo(page, 'flat&expanded&pagination&tv_page=2');
    await expect(page.locator(sel.paginatorText)).toHaveText('Página 2 de 2');

    // Con "Cargar más" lo que hay en pantalla no es una página, así que el param se descarta: el
    // link abre en la primera y no promete una página que no se puede pedir.
    await openDemo(page, 'flat&expanded&tv_page=3');
    await expect(page.locator(sel.loadMore)).toBeVisible();
  });

  test('`?sininternos`: un link con filtros internos abre igual y los limpia de la URL', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));

    // El link lo mandó alguien que sí tiene los internos; este usuario no los declara.
    await openDemo(page, 'flat&expanded&sininternos&tv_validado=true&tv_capturado=true&tv_contenido=imagenes');

    expect(errores).toEqual([]);
    await expect(page.locator('#filtros-internos-wrap')).toHaveCount(0);
    // El resto del link se aplica igual: no se pierde la vista por lo que no se puede usar.
    await expect(page.locator(optionLabel('contenido', 'imagenes') + ' input')).toBeChecked();
    expect(await articleIds(page)).toEqual(firstPageOf(poolPorDefecto((i) => i.contenido?.includes('imagenes'))));

    // Montar no reescribe el link, así que los params ajenos siguen ahí; la primera interacción es
    // la que limpia el namespace propio. El filtro que se tilda es uno de los que sí están
    // declarados: `tipo_fuente` tiene su cola detrás del "Ver más", así que su "Video" no es
    // clickeable sin abrirlo, y acá lo que importa es el efecto en la URL, no el checkbox.
    expect(tvParams(page)['tv_validado']).toBe('true');
    await openPanel(page);
    await page.click(optionLabel('es_oficial', 'true'));
    await expect.poll(() => tvParams(page)['tv_es_oficial']).toBe('true');
    expect(tvParams(page)['tv_validado']).toBeUndefined();
    expect(tvParams(page)['tv_capturado']).toBeUndefined();
  });

  test('modo API: el primer request ya viaja con los filtros del link', async ({ page }) => {
    const requests = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.pathname === '/api') requests.push(url.searchParams);
    });

    await openDemo(page, 'api&expanded&pagination&tv_tipo_fuente=Sitio+web+o+portal&tv_page=1');
    await expect(page.locator(ARTICLE_ROWS)).toHaveCount(
      poolPorDefecto((i) => i.tipo_fuente === 'Sitio web o portal').length
    );

    // El primero, no el último: si el sembrado esperaba a los valores del grupo, el primer request
    // saldría sin filtro y la lista ya estaría en pantalla cuando llegaran los facets.
    expect(requests[0].get('tipo_fuente')).toBe('Sitio web o portal');
    expect(requests[0].get('page')).toBe('1');
  });
});
