import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetDom, flushFrames, setSearch, currentParams, tvParams, Timeline } from './helpers/dom.js';
import mockData from '../example/mock-data.js';
import demoFilters from '../example/filters.js';
import demoSorters from '../example/sorters.js';

/**
 * `stateInUrl` is the option that turns the address bar into a shareable link, so what is tested
 * here is the round trip: what the URL says has to land in the view (checkboxes, order, taxonomy
 * pill, search box, paginator) before the first render, and what the view does has to land back in
 * the URL.
 *
 * The rule that shapes most of the cases is "fail silently": a link carries the filters of whoever
 * sent it, and whoever opens it may not have permissions for them, so an undeclared field, a value
 * that no longer exists, an order that was removed or a page that is out of range cannot warn and
 * cannot filter — it just is not there.
 */

/** Two public groups, one of them persistent, to compare the URL against `localStorage` */
const filtros = [
  { field: 'tipo_fuente', label: 'Tipo de fuente' },
  { field: 'contenido', label: 'Contenido', persist: true }
];

/** Mount in local mode with the URL state on, leaving `localStorage` clean */
function mount(options = {}) {
  localStorage.clear();
  const container = resetDom();
  const data = options.content ? { content: options.content } : { items: mockData.items };
  const tl = new Timeline({
    container,
    ...data,
    filters: filtros,
    sorters: demoSorters,
    internalButtons: true,
    stateInUrl: true,
    ...options
  });
  return { container, tl };
}

/**
 * Mount with something already in `localStorage`, which has to be written **after** the clean that
 * `mount` does and **before** the instance reads it.
 */
function mountWithPersisted(record, options = {}) {
  localStorage.clear();
  localStorage.setItem('tv-filtros-internos-filters', JSON.stringify(record));
  const container = resetDom();
  const data = options.content ? { content: options.content } : { items: mockData.items };
  const tl = new Timeline({
    container,
    ...data,
    filters: filtros,
    sorters: demoSorters,
    internalButtons: true,
    stateInUrl: true,
    ...options
  });
  return { container, tl };
}

/** The values of a group that are checked, as the DOM shows them */
function checked(container, field) {
  return Array.from(container.querySelectorAll(`.filter-options[data-filter-field="${field}"] input:checked`)).map(
    (el) => el.value
  );
}

/** How many articles the timeline is showing right now */
function rendered(container) {
  return container.querySelectorAll('.timeline-card').length;
}

test('la URL deja el término, el orden y el filtro en la vista, desde el primer render', () => {
  setSearch('tv_contenido=adjuntos&tv_sortBy=id&tv_sort=asc');
  const { container, tl } = mount();

  assert.equal(tl._sortField, 'id');
  assert.equal(tl._sortAsc, true);
  assert.deepEqual(checked(container, 'contenido'), ['adjuntos']);
  // El orden de la URL es el que se aplica, no el del consumidor.
  assert.deepEqual(
    tl.allCards.map((c) => String(c.id)),
    [...tl.allCards.map((c) => String(c.id))].sort()
  );
  assert.ok(rendered(container) > 0, 'la lista no quedó vacía');
});

test('la búsqueda del link llega escrita al input y con el campo desplegado', () => {
  setSearch('tv_q=decreto');
  const { container, tl } = mount();
  assert.equal(tl.searchTerm, 'decreto');
  // Un término aplicado con un input vacío sería un filtro que no se ve y del que no se puede salir.
  assert.equal(tl.searchInput.value, 'decreto');
  assert.equal(container.querySelector('#search-wrap').classList.contains('open'), true);
  assert.equal(container.querySelector('#search-wrap').classList.contains('active'), true);
});

test('la página del link se restaura, y se recorta si el filtro dejó menos páginas', () => {
  setSearch('tv_page=2');
  const { container, tl } = mount({ pagination: true, itemsPerPage: 5 });
  assert.equal(tl._page, 2);
  assert.match(container.querySelector('.timeline-paginator-text').textContent, /2 de 4/);
  // El filtro de la URL puede dejar menos páginas que las que pedía el link, y en ese caso no hay
  // página 2 que mostrar: el recorte es el mismo que hace `_goToPage()`.
  setSearch('tv_contenido=adjuntos&tv_page=99');
  const recortado = mount({ pagination: true, itemsPerPage: 5 });
  assert.equal(recortado.tl._page, 3, '12 ítems con adjuntos son 3 páginas de 5');
  assert.equal(currentParams().get('tv_page'), '3');
});

test('montar no reescribe la URL que acaba de leer', () => {
  setSearch('tv_q=decreto&tv_inventado=1&foo=bar');
  mount();
  const params = currentParams();
  assert.equal(params.get('tv_q'), 'decreto', 'lo que se leyó sigue ahí');
  assert.equal(params.get('foo'), 'bar');
  // Ni siquiera lo que no se entendió: la limpieza es de la primera interacción, no del arranque.
  assert.equal(params.get('tv_inventado'), '1');
});

test('un filtro no declarado se ignora en silencio y sale de la URL en la primera interacción', () => {
  // El caso real: un link que trae `tv_validado` (filtro interno) abierto por alguien que sí tiene
  // permisos, por alguien que no los tiene y no lo declaró.
  setSearch('tv_validado=true&tv_contenido=imagenes&foo=bar');
  const warnings = [];
  const original = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  let container;
  try {
    ({ container } = mount());
  } finally {
    console.warn = original;
  }

  assert.deepEqual(warnings, [], 'un filtro que no existe para este usuario no es un error');
  assert.equal(container.querySelector('[data-filter-field="validado"]'), null, 'no hay grupo que dibujar');
  // Y el resto de la vista se aplica igual: el link no se pierde por lo que no se puede usar.
  assert.deepEqual(checked(container, 'contenido'), ['imagenes']);
  assert.ok(rendered(container) > 0, 'los items sin `contenido` no deberían quedar afuera');

  // La primera interacción limpia lo que no se está usando, y solo el namespace propio.
  container.querySelector('[data-filter-field="contenido"] input[value="video"]').click();
  const params = currentParams();
  assert.equal(params.get('tv_validado'), null, 'el filtro ajeno desaparece de la URL');
  assert.equal(params.get('tv_contenido'), 'imagenes,video');
  assert.equal(params.get('foo'), 'bar', 'los params del consumidor no se tocan');
});

test('un valor que ya no existe deja el grupo sin nada activo en vez de vaciar la lista', () => {
  // El token viaja crudo (es la clave con la que se filtra), así que un backend que renombró el
  // valor deja links viejos apuntando a algo que ya no está.
  setSearch('tv_tipo_fuente=Periódico%20impreso');
  const { container, tl } = mount({ itemsPerPage: 0 });

  assert.deepEqual(tl.filters.find((f) => f.field === 'tipo_fuente').active, new Set());
  assert.equal(tl.allCards.length, mockData.items.length, 'nada filtró, pero tampoco se vació la lista');
  assert.deepEqual(checked(container, 'tipo_fuente'), []);
});

test('un CSV vacío cuenta como "limpiado a propósito"', () => {
  setSearch('tv_contenido=');
  const { tl } = mount({
    filters: [
      { field: 'contenido', label: 'Contenido', items: [{ value: 'imagenes', label: 'Imágenes', checked: true }] }
    ]
  });
  // El default declarado quería 'imagenes'; el link dice que ese grupo se vació, y eso gana.
  assert.deepEqual(tl.filters[0].active, new Set());
});

test('un valor declarado con lista sobrevive al viaje por la URL, que lo parte en tokens', () => {
  // El "Sin descartar" del demo es **un** valor, `[null, false]`, y su token es el CSV `'null,false'`:
  // el mismo formato que viajan el param de API y el de la URL, así que al releerse vuelve partido en
  // dos tokens. Un sembrado que comparara cadenas enteras dejaría ese checkbox sin tildar y el filtro
  // dejaría pasar solo lo descartado — o sea, una lista vacía donde la había entera.
  const primera = mount({ filters: demoFilters, itemsPerPage: 0 });
  assert.deepEqual(checked(primera.container, 'descartado').sort(), ['null,false', 'true']);
  primera.tl._applyFilters();
  assert.equal(currentParams().get('tv_descartado'), 'true,null,false', 'sale como el CSV de siempre');

  setSearch('tv_descartado=true%2Cnull%2Cfalse');
  const segunda = mount({ filters: demoFilters, itemsPerPage: 0 });
  assert.deepEqual(checked(segunda.container, 'descartado').sort(), ['null,false', 'true']);
  assert.equal(segunda.tl.allCards.length, mockData.items.length, 'los tres estados, o sea la lista entera');
});

test('la URL le gana a lo persistido en localStorage', () => {
  setSearch('tv_contenido=video');
  const { tl } = mountWithPersisted({ contenido: ['imagenes'] });
  assert.deepEqual(Array.from(tl.filters.find((f) => f.field === 'contenido').active), ['video']);
});

test('lo persistido se aplica como siempre cuando el link no dice nada del grupo', () => {
  setSearch('tv_q=decreto');
  const { container } = mountWithPersisted({ contenido: ['imagenes'] });
  assert.deepEqual(checked(container, 'contenido'), ['imagenes']);
  assert.equal(currentParams().get('tv_contenido'), null, 'lo persistido no se escribe en la URL');
});

test('escribir el estado no pisa los params del consumidor, y no repite el write si nada cambió', async () => {
  setSearch('foo=bar');
  const { container, tl } = mount();

  tl.searchInput.value = 'decreto';
  tl.searchInput.dispatchEvent(new window.Event('input'));
  container.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]').click();
  await flushFrames();

  const params = currentParams();
  assert.equal(params.get('foo'), 'bar');
  assert.equal(params.get('tv_q'), 'decreto');
  assert.equal(params.get('tv_tipo_fuente'), 'Video');
  assert.equal(params.get('tv_sortBy'), 'fecha_publicacion', 'el orden también viaja, no solo los filtros');
  assert.equal(params.get('tv_sort'), 'desc');
  assert.deepEqual(tvParams(), ['tv_q', 'tv_sort', 'tv_sortBy', 'tv_tipo_fuente']);
  // Con "Cargar más" lo que hay en pantalla no es una página, así que la página no viaja.
  assert.equal(params.get('tv_page'), null);
});

test('sin `stateInUrl` no se escribe ningún `tv_*`, y lo que traía el link queda intacto', () => {
  setSearch('tv_q=decreto&foo=bar');
  const container = resetDom();
  const tl = new Timeline({ container, items: mockData.items, filters: filtros, sorters: demoSorters });
  tl.searchInput.value = 'decreto';
  tl.searchInput.dispatchEvent(new window.Event('input'));
  container.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]').click();

  assert.equal(tl.stateInUrl, false);
  assert.equal(tl.searchTerm, 'decreto', 'la búsqueda funciona igual, solo que no se comparte');
  assert.equal(window.location.search, '?tv_q=decreto&foo=bar', 'la URL no se tocó en ningún momento');
});

test('restaura la taxonomía por label, y "Ver todo" también', () => {
  const segunda = mockData.content[1].label;
  setSearch(`tv_tax=${encodeURIComponent(segunda)}`);
  let { container, tl } = mount({ content: mockData.content });
  assert.equal(tl._contentIndex, 1);
  assert.equal(container.querySelector('#taxonomy-select').value, segunda);
  assert.equal(tl.allCards.length, mockData.content[1].items.length);

  // El índice viaja como label justamente porque el número depende de esta lista: un link viejo
  // con `tv_tax` de una taxonomía que ya no existe abre en la primera, sin romper.
  setSearch(`tv_tax=${encodeURIComponent('Taxonomía que ya no existe')}`);
  ({ container, tl } = mount({ content: mockData.content }));
  assert.equal(tl._contentIndex, 0);
  assert.equal(container.querySelector('#taxonomy-select').value, mockData.content[0].label);

  setSearch(`tv_tax=${encodeURIComponent('Ver todo')}`);
  ({ container, tl } = mount({ content: mockData.content }));
  assert.equal(tl._contentIndex, -1);
  assert.equal(container.querySelector('#taxonomy-select').value, 'Ver todo');
  assert.equal(tl.allCards.length, mockData.items.length);
});

test('un orden que no está declarado se ignora y se queda el que había', () => {
  setSearch('tv_sortBy=nombre_fuente&tv_sort=asc');
  const { tl } = mount();
  assert.equal(tl._sortField, 'fecha_publicacion', 'el default del consumidor, no el campo del link');
  assert.equal(tl._sortAsc, true, 'la dirección sí se toma: no depende del campo');
});

test('la página del link se recorta a la última y la URL queda corregida', () => {
  setSearch('tv_page=99');
  const { tl } = mount({ pagination: true, itemsPerPage: 10 });
  const ultima = Math.ceil(mockData.items.length / 10);
  assert.equal(tl._page, ultima);
  assert.equal(currentParams().get('tv_page'), String(ultima), 'el link deja de prometer una página que no existe');
});

test('una página inválida se ignora y no pisa a la primera', () => {
  setSearch('tv_page=abc');
  const { container, tl } = mount({ pagination: true, itemsPerPage: 10 });
  assert.equal(tl._page, 1);
  // Montar no reescribe la URL, así que el `abc` sigue ahí hasta que haya una interacción.
  assert.equal(currentParams().get('tv_page'), 'abc');
  container.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]').click();
  assert.equal(currentParams().get('tv_page'), '1', 'y entonces sale con la página real');
});

test('con "Cargar más" la página del link no existe: no se pide ni se escribe', () => {
  setSearch('tv_page=3');
  const { container, tl } = mount({ itemsPerPage: 10 });
  assert.equal(tl._page, 1);
  assert.equal(currentParams().get('tv_page'), '3', 'montar no toca la URL');
  // Y en la primera interacción desaparece: lo que hay en pantalla no es una página.
  container.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]').click();
  assert.equal(currentParams().get('tv_page'), null);
});

test('modo API: el primer request ya viaja con los filtros del link', async () => {
  // El caso que no se puede resolver bien si el sembrado espera a los valores del grupo: en API un
  // grupo derivado resuelve sus valores con `/facets`, que llega después de la primera página, así que
  // la URL tiene que estar puesta **antes** de construir los checkboxes.
  setSearch('tv_tipo_fuente=Video&tv_q=energia');
  localStorage.clear();
  const requests = [];
  const fetchImpl = (url) => {
    requests.push(String(url));
    const body = String(url).endsWith('/facets')
      ? { facets: { tipo_fuente: { Video: 3 } }, total: 19, lastUpdated: '2026-06-25T14:30:00' }
      : { items: [], total: 0 };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  };
  const container = resetDom();
  new Timeline({
    container,
    api: { url: '/api', fetchImpl },
    filters: filtros,
    sorters: demoSorters,
    stateInUrl: true,
    pagination: true
  });
  await flushFrames();

  const lista = requests.find((u) => !u.endsWith('/facets'));
  assert.match(lista, /tipo_fuente=Video/);
  assert.match(lista, /q=energia/);
  assert.match(lista, /page=1/);
  assert.equal(currentParams().get('tv_tipo_fuente'), 'Video', 'y la URL queda con lo que se pidió');
  assert.equal(currentParams().get('tv_page'), '1');
});

test('modo API: una página del link que ya no existe vuelve a la primera y corrige la URL', async () => {
  setSearch('tv_page=4');
  const fetchImpl = (url) => {
    const vacia = String(url).includes('page=4');
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve(
          String(url).endsWith('/facets')
            ? { facets: {}, total: 19 }
            : { items: vacia ? [] : mockData.items.slice(0, 5), total: vacia ? 0 : 5 }
        )
    });
  };
  const container = resetDom();
  const tl = new Timeline({
    container,
    api: { url: '/api', fetchImpl },
    filters: filtros,
    stateInUrl: true,
    pagination: true
  });
  await flushFrames();

  assert.equal(tl._apiPage, 1, 'el link pedía la 4 y el servidor no la tiene: abre en la primera');
  assert.equal(currentParams().get('tv_page'), '1');
  assert.ok(rendered(container) > 0, 'no quedó la lista vacía');
});

test('un link con el estado de un filtro interno no rompe el demo con `?sininternos`', () => {
  // Lo mismo que el caso de arriba pero contra la declaración real del demo: los tres grupos
  // `filtros_internos` desaparecen y los del panel siguen funcionando.
  setSearch('tv_validado=true&tv_capturado=true&tv_contenido=video');
  const warnings = [];
  const original = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  let container;
  try {
    localStorage.clear();
    container = resetDom();
    new Timeline({
      container,
      items: mockData.items,
      filters: demoFilters.filter((f) => f.group !== 'filtros_internos'),
      internalButtons: true,
      stateInUrl: true
    });
  } finally {
    console.warn = original;
  }

  assert.deepEqual(warnings, []);
  assert.equal(container.querySelector('#filtros-internos-wrap'), null, 'sin grupos internos no hay botón');
  assert.deepEqual(
    Array.from(container.querySelectorAll('.filter-menu .filter-options')).map((el) => el.dataset.filterField),
    ['anio_publicacion', 'contenido', 'tipo_fuente', 'es_oficial']
  );
  assert.ok(rendered(container) > 0);
});
