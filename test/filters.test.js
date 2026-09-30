import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetDom, flushFrames, Timeline } from './helpers/dom.js';
import mockData from '../example/mock-data.js';
import demoFilters from '../example/filters.js';

/**
 * The panel of filters is declared by the consumer through the `filters` option, so these tests
 * exercise it as a public contract: what the declaration renders, where the values come from in
 * local mode, and what happens when the declaration is absent or wrong.
 *
 * `demoFilters` is the list the demo page uses, so a change to the example that would alter the
 * panel shows up here too.
 */

/** Capture the warnings of `console.warn` raised while `run` executes */
function captureWarnings(run) {
  const warnings = [];
  const original = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    run();
  } finally {
    console.warn = original;
  }
  return warnings;
}

/** Labels of the group headers of a column, top to bottom */
function columnLabels(container, index) {
  return Array.from(
    container.querySelectorAll(`.filter-menu .filter-column:nth-child(${index + 1}) .filter-header`)
  ).map((el) => el.textContent);
}

/** The "Tipo de fuente" group as the demo declares it, reused by the tests that filter by it */
const tipoFuenteDemo = demoFilters.find((f) => f.field === 'tipo_fuente');

/** The values rendered in a group, as `[value, visibleLabel]` pairs */
function groupValues(container, field) {
  return Array.from(container.querySelectorAll(`.filter-options[data-filter-field="${field}"] .filter-option`)).map(
    (el) => [el.querySelector('input').value, el.querySelector('.filter-option-label').textContent]
  );
}

/**
 * `fetchImpl` for API mode: answers `/facets` with the given facets and the list with an empty
 * page. The tests that use it are about what the facets build in the panel, not about the list.
 */
function apiFetch(facets) {
  const requests = [];
  const fetchImpl = (url) => {
    requests.push(String(url));
    const body = String(url).endsWith('/facets')
      ? { facets, total: 19, lastUpdated: '2026-06-25T14:30:00' }
      : { items: [], total: 0 };
    // El componente mira `ok` / `status` antes de leer el body.
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  };
  fetchImpl.requests = requests;
  return fetchImpl;
}

test('la opción `filters` arma los grupos del panel, en el orden declarado', () => {
  const container = resetDom();
  new Timeline({ container, items: mockData.items, filters: demoFilters, internalButtons: true });

  const menu = container.querySelector('.filter-menu');
  assert.ok(menu, 'debería existir el panel de filtros');
  assert.equal(container.querySelectorAll('.filter-column').length, 2, 'esperaba 2 columnas');
  // La primera mitad de los grupos `menu` va en la primera columna, el resto en la segunda.
  assert.deepEqual(columnLabels(container, 0), ['Tono social', 'Año publicación', 'Contenido']);
  assert.deepEqual(columnLabels(container, 1), ['Tipo de fuente', 'Fuente oficial']);

  const internos = container.querySelector('#filtros-internos-menu');
  assert.ok(internos, 'debería existir el flyout de estado interno');
  assert.deepEqual(
    Array.from(internos.querySelectorAll('.filter-options')).map((el) => el.dataset.filterField),
    ['validado', 'capturado', 'descartado']
  );
  // El estado vive en su propio botón: no ensucia el panel.
  assert.equal(container.querySelectorAll('.filter-menu .filter-options').length, 5);
});

test('sin la opción `filters` no hay panel, ni botón, ni estado interno', () => {
  const container = resetDom();
  const tl = new Timeline({ container, items: mockData.items, internalButtons: true });

  assert.equal(tl.filters.length, 0);
  assert.equal(container.querySelector('.filter-wrap'), null, 'no debería haber .filter-wrap');
  assert.equal(container.querySelector('.filter-menu'), null, 'no debería haber .filter-menu');
  assert.equal(container.querySelector('.filter-options'), null, 'no debería haber ningún grupo');
  // El toolbar sigue entero: el toggle de notas de trabajo no depende de los filtros.
  assert.ok(container.querySelector('#work-notes-toggle'), 'el toggle de notas debería estar');
  assert.equal(container.querySelector('#filtros-internos-wrap'), null, 'sin grupos internos no hay flyout');
  assert.equal(tl.allCards.length, mockData.items.length, 'la lista se sigue mostrando entera');
});

test('un `type` no soportado descarta el grupo con un warning y deja armado el resto', () => {
  const container = resetDom();
  const warnings = captureWarnings(() => {
    const tl = new Timeline({
      container,
      items: mockData.items,
      filters: [
        { field: 'tipo_fuente', label: 'Tipo de fuente', type: 'select' },
        { field: 'tonos_sociales', label: 'Tono social' }
      ]
    });
    assert.deepEqual(
      tl.filters.map((f) => f.field),
      ['tonos_sociales'],
      'el grupo con type no soportado no debería existir'
    );
  });
  assert.equal(warnings.length, 1, 'esperaba un warning por el grupo descartado');
  assert.match(warnings[0], /type "select"/);
  assert.match(warnings[0], /tipo_fuente/);
  // El resto del panel se arma igual.
  assert.deepEqual(columnLabels(container, 0), ['Tono social']);
  assert.equal(container.querySelectorAll('.filter-option').length, 3, 'esperaba los 3 tonos');
});

test('un grupo sin `items` deriva sus valores del campo de los items, con su conteo', () => {
  const container = resetDom();
  // Grupo derivado: los valores son los que aparecen en los datos.
  const tl = new Timeline({
    container,
    items: mockData.items,
    filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente', maxVisible: 0 }]
  });
  const values = groupValues(container, 'tipo_fuente');
  // Los 6 tipos distintos del mock, en el orden en que aparecen por primera vez (los ítems sin
  // tipo no aportan un valor: ver el test siguiente).
  const esperados = [...new Set(mockData.items.map((i) => i.tipo_fuente).filter((v) => v !== null))];
  assert.deepEqual(
    values.map(([v]) => v),
    esperados
  );
  // El label crudo del texto es el que se muestra (no hace falta `formatLabel`).
  assert.deepEqual(
    values.map(([, label]) => label),
    esperados
  );
  const counts = Array.from(container.querySelectorAll('[data-filter-field="tipo_fuente"] .filter-option-count')).map(
    (el) => el.textContent
  );
  assert.equal(counts[0], '(5)', 'el conteo debería ser el de los ítems de ese tipo');
  assert.equal(tl.allCards.length, mockData.items.length, 'sin filtros chequeados no se descarta nada');
});

test('un grupo derivado no ofrece el valor `null` (no hay a quién atribuírselo)', () => {
  const container = resetDom();
  const tl = new Timeline({
    container,
    items: mockData.items,
    filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente', maxVisible: 0 }]
  });
  // Los ítems sin tipo (`null`) no generan un valor: nadie los declaró, así que no hay opción
  // que los agrupe. Para ofrecerlos hay que declararlos con `items: [{ value: null }]`.
  const values = groupValues(container, 'tipo_fuente').map(([v]) => v);
  assert.equal(values.includes('null'), false);
  assert.equal(values.length, 6, 'solo los 6 tipos que el mock declara');
  // Y no hay forma de que entren: el único ítem sin tipo queda fuera de cualquier selección.
  container.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]').click();
  assert.equal(tl.allCards.length, 1);
  assert.equal(tl.allCards[0].id, 'FUE-00014');
});

test('`allowEmpty` ofrece el bucket vacío como "Sin valor", al final, con su conteo', () => {
  const container = resetDom();
  const tl = new Timeline({
    container,
    items: mockData.items,
    filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente', allowEmpty: true, maxVisible: 0 }]
  });
  // Los 6 tipos que traen los ítems (en el orden en que aparecen) y, al final, el bucket vacío.
  const esperados = [...new Set(mockData.items.map((i) => i.tipo_fuente).filter((v) => v !== null))];
  assert.deepEqual(groupValues(container, 'tipo_fuente'), [...esperados.map((v) => [v, v]), ['null', 'Sin valor']]);
  // Contado solo: los dos ítems sin tipo (FUE-00018 y FUE-00019).
  assert.equal(
    container.querySelector('[data-filter-field="tipo_fuente"] input[value="null"] ~ .filter-option-count').textContent,
    '(2)'
  );
  // Y tildarlo deja solo esos ítems, como cualquier otro valor.
  container.querySelector('[data-filter-field="tipo_fuente"] input[value="null"]').click();
  assert.deepEqual(
    tl.allCards.map((c) => c.id),
    ['FUE-00018', 'FUE-00019']
  );
});

test('el bucket vacío queda al final aunque el orden por conteo o un `sortValues` lo pongan primero', () => {
  // 7 ítems sin valor contra 5 del tipo más común: el sort por conteo (que solo corre cuando el
  // grupo se colapsa) los pondría primeros, y en orden alfabético 'null' cae en el medio.
  const conHuecos = [...mockData.items.slice(0, 5).map((i) => ({ ...i, tipo_fuente: null })), ...mockData.items];
  const opciones = (container) =>
    Array.from(container.querySelectorAll('[data-filter-field="tipo_fuente"] .filter-option')).map((el) => [
      el.querySelector('input').value,
      el.classList.contains('filter-option-extra') ? 'extra' : 'visible'
    ]);

  const porConteo = resetDom();
  new Timeline({
    container: porConteo,
    items: conHuecos,
    filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente', allowEmpty: true, maxVisible: 2 }]
  });
  const box = porConteo.querySelector('[data-filter-field="tipo_fuente"]');
  assert.equal(
    box.querySelector('input[value="null"] ~ .filter-option-count').textContent,
    '(7)',
    'el bucket vacío tiene más ítems que cualquier tipo, y el corte lo ordenaría primero'
  );
  assert.deepEqual(opciones(porConteo), [
    ['Sitio web o portal', 'visible'],
    ['Gacetilla o comunicado de prensa', 'visible'],
    ['Red Social', 'extra'],
    ['Decreto o norma', 'extra'],
    ['Libro o publicación', 'extra'],
    ['Video', 'extra'],
    ['null', 'extra']
  ]);

  const porSortValues = resetDom();
  new Timeline({
    container: porSortValues,
    items: conHuecos,
    filters: [
      {
        field: 'tipo_fuente',
        label: 'Tipo de fuente',
        allowEmpty: true,
        maxVisible: 0,
        sortValues: (a, b) => a.localeCompare(b)
      }
    ]
  });
  const box2 = porSortValues.querySelector('[data-filter-field="tipo_fuente"]');
  const ultima = box2.querySelector('.filter-option:last-child');
  assert.equal(ultima.querySelector('input').value, 'null', 'con `sortValues` el bucket vacío también queda último');
  assert.equal(ultima.title, 'Sin valor');
});

test('`allowEmpty` se ignora cuando el grupo declara `items`', () => {
  const container = resetDom();
  new Timeline({
    container,
    items: mockData.items,
    filters: [
      {
        field: 'tipo_fuente',
        label: 'Tipo de fuente',
        allowEmpty: true,
        items: [
          { value: 'Video', label: 'Video' },
          { value: null, label: 'Sin tipo' }
        ]
      }
    ]
  });
  // Con `items` el bucket vacío es un valor declarado más, con el label del consumidor: no se
  // agrega el "Sin valor" automático (ni duplicado, ni con otro texto).
  assert.deepEqual(groupValues(container, 'tipo_fuente'), [
    ['Video', 'Video'],
    ['null', 'Sin tipo']
  ]);
});

test('con `allowEmpty`, un grupo que solo encuentra el bucket vacío no se oculta', () => {
  const container = resetDom();
  const soloHuecos = mockData.items.slice(0, 3).map((i) => ({ ...i, tipo_fuente: null }));
  const tl = new Timeline({
    container,
    items: soloHuecos,
    filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente', allowEmpty: true }]
  });
  const box = container.querySelector('[data-filter-field="tipo_fuente"]');
  assert.equal(box.hidden, false, 'el grupo pide el bucket vacío, así que se muestra');
  assert.equal(container.querySelector('.filter-section').hidden, false, 'la sección también');
  assert.deepEqual(groupValues(container, 'tipo_fuente'), [['null', 'Sin valor']]);
  // Y sirve para lo que sirve cualquier valor: dejar fuera los que sí tienen valor.
  container.querySelector('[data-filter-field="tipo_fuente"] input[value="null"]').click();
  assert.equal(tl.allCards.length, 3);
});

test('modo API: el bucket vacío del facet sale solo con `allowEmpty`, y viaja como query param', async () => {
  const facets = {
    tipo_fuente: { 'Sitio web o portal': 5, 'Gacetilla o comunicado de prensa': 5, Video: 1, null: 2 }
  };
  // Sin `allowEmpty` la clave `"null"` del facet no genera opción (igual que en local).
  const sinFlag = apiFetch(facets);
  const container = resetDom();
  new Timeline({
    container,
    api: { url: '/api', fetchImpl: sinFlag },
    filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente' }]
  });
  await flushFrames();
  await flushFrames();
  assert.deepEqual(
    groupValues(container, 'tipo_fuente').map(([v]) => v),
    ['Sitio web o portal', 'Gacetilla o comunicado de prensa', 'Video']
  );

  // Con `allowEmpty` aparece al final con su conteo, y tildarlo manda `tipo_fuente=null`.
  const conFlag = apiFetch(facets);
  const container2 = resetDom();
  new Timeline({
    container: container2,
    api: { url: '/api', fetchImpl: conFlag },
    filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente', allowEmpty: true }]
  });
  await flushFrames();
  await flushFrames();
  assert.deepEqual(groupValues(container2, 'tipo_fuente'), [
    ['Sitio web o portal', 'Sitio web o portal'],
    ['Gacetilla o comunicado de prensa', 'Gacetilla o comunicado de prensa'],
    ['Video', 'Video'],
    ['null', 'Sin valor']
  ]);
  assert.equal(
    container2.querySelector('[data-filter-field="tipo_fuente"] input[value="null"] ~ .filter-option-count')
      .textContent,
    '(2)'
  );
  container2.querySelector('[data-filter-field="tipo_fuente"] input[value="null"]').click();
  const ultima = conFlag.requests.filter((u) => !u.endsWith('/facets')).pop();
  assert.match(ultima, /tipo_fuente=null/);
});

test('un `value: null` declarado agrupa a los ítems que no traen el campo', () => {
  const container = resetDom();
  const tl = new Timeline({
    container,
    items: mockData.items,
    filters: [
      {
        field: 'tipo_fuente',
        label: 'Tipo de fuente',
        items: [
          { value: 'Video', label: 'Video' },
          { value: null, label: 'Sin tipo', checked: true }
        ]
      }
    ]
  });
  // El token del checkbox es la lista de valores declaration, tal como viaja al servidor.
  const sinTipo = container.querySelector('[data-filter-field="tipo_fuente"] input[value="null"]');
  assert.ok(sinTipo, 'debería existir el checkbox de "Sin tipo"');
  assert.equal(sinTipo.checked, true, 'el `checked` declarado se aplica al construir');
  assert.deepEqual(groupValues(container, 'tipo_fuente'), [
    ['Video', 'Video'],
    ['null', 'Sin tipo']
  ]);
  // Contado solo: los dos ítems sin tipo (FUE-00018 y FUE-00019).
  assert.equal(
    container.querySelector('[data-filter-field="tipo_fuente"] input[value="null"] ~ .filter-option-count').textContent,
    '(2)'
  );
  assert.deepEqual(
    tl.allCards.map((c) => c.id),
    ['FUE-00018', 'FUE-00019']
  );
});

test('un `value` con varios valores es un checkbox que matchea cualquiera de ellos', () => {
  const container = resetDom();
  const tl = new Timeline({
    container,
    items: mockData.items,
    filters: [
      {
        field: 'descartado',
        label: 'Descartado',
        items: [
          { value: [false, null], label: 'Sin descartar ni pendiente', checked: true },
          { value: true, label: 'Descartado' }
        ]
      }
    ]
  });
  // Un solo checkbox con los dos valores en el `value`: así es como viaja al query param.
  const combined = container.querySelector('[data-filter-field="descartado"] input[value="false,null"]');
  assert.ok(combined, 'el checkbox debería llevar los dos valores en su value');
  assert.deepEqual(groupValues(container, 'descartado'), [
    ['false,null', 'Sin descartar ni pendiente'],
    ['true', 'Descartado']
  ]);
  // Todo lo que no está descartado: 17 ítems (false + null sobre los 19 del mock).
  assert.equal(tl.allCards.length, mockData.items.filter((i) => i.descartado !== true).length);
  // Agregar el otro valor parte el grupo en dos.
  container.querySelector('[data-filter-field="descartado"] input[value="true"]').click();
  assert.equal(tl.allCards.length, mockData.items.length);
  container.querySelector('[data-filter-field="descartado"] input[value="true"]').click();
  assert.equal(tl.allCards.length, mockData.items.filter((i) => i.descartado !== true).length);
});

test('un `items` que no se puede resolver descarta el grupo entero con un warning', () => {
  const casos = [
    { items: [], motivo: /items` vacío/ },
    { items: [{ value: 'a' }], motivo: /no tiene `label`/ },
    { items: [{ label: 'Sin valor' }], motivo: /no tiene `value`/ },
    { items: [{ value: [], label: 'Lista vacía' }], motivo: /no tiene `value`/ },
    {
      items: [
        { value: 'a', label: 'A' },
        { value: 'a', label: 'Otra A' }
      ],
      motivo: /repite el valor/
    },
    { items: [{ value: 'a,b', label: 'Con coma' }], motivo: /coma/ }
  ];
  casos.forEach(({ items, motivo }) => {
    const container = resetDom();
    const warnings = captureWarnings(() => {
      const tl = new Timeline({
        container,
        items: mockData.items,
        filters: [
          { field: 'tipo_fuente', label: 'Tipo de fuente', items },
          { field: 'tonos_sociales', label: 'Tono social' }
        ]
      });
      // Medio grupo declarado es peor que ninguno: se cae el grupo, no el ítem suelto.
      assert.deepEqual(
        tl.filters.map((f) => f.field),
        ['tonos_sociales']
      );
    });
    assert.equal(warnings.length, 1, `esperaba un warning por ${JSON.stringify(items)}`);
    assert.match(warnings[0], motivo);
    assert.match(warnings[0], /tipo_fuente/);
    assert.equal(container.querySelector('[data-filter-field="tipo_fuente"]'), null, 'el grupo no debería existir');
  });
});

test('un campo array se expande en un valor por elemento', () => {
  const container = resetDom();
  new Timeline({
    container,
    items: mockData.items,
    filters: [{ field: 'tonos_sociales', label: 'Tono social', maxVisible: 0 }]
  });
  assert.deepEqual(
    groupValues(container, 'tonos_sociales')
      .map(([v]) => v)
      .sort(),
    ['Negativo', 'Neutro', 'Positivo']
  );
});

test('un booleano se lee como "Sí"/"No" sin necesidad de `extract`', () => {
  const container = resetDom();
  const tl = new Timeline({
    container,
    items: mockData.items,
    filters: [{ field: 'es_oficial', label: 'Fuente oficial', maxVisible: 0 }]
  });
  assert.deepEqual(groupValues(container, 'es_oficial'), [
    ['true', 'Sí'],
    ['false', 'No']
  ]);
  // Y filtra: tildar solo los oficiales deja únicamente los oficiales.
  const oficial = container.querySelector('[data-filter-field="es_oficial"] input[value="true"]');
  oficial.click();
  assert.equal(tl.allCards.length, mockData.items.filter((i) => i.es_oficial === true).length);
  assert.ok(
    tl.allCards.every((c) => c.es_oficial === true),
    'no debería quedar ningún ítem no oficial'
  );
});

test('tildar un valor filtra la lista, y destildarlo la devuelve', () => {
  window.localStorage.clear();
  const container = resetDom();
  const tl = new Timeline({ container, items: mockData.items, filters: demoFilters, internalButtons: true });
  // Los defaults del demo (capturado, y descartado = sin descartar + pendiente) ya recortan la lista.
  const enUso = () => mockData.items.filter((i) => i.descartado !== true && i.capturado === true).length;
  // `descartado` parte "sin descartar" (false) y "pendiente" (null) en dos checkboxes: aflojar el
  // default del grupo es sacar los dos.
  const setDescartado = (checked) =>
    ['false', 'null'].forEach((v) => {
      const cb = container.querySelector(`[data-filter-field="descartado"] input[value="${v}"]`);
      if (cb.checked !== checked) cb.click();
    });
  assert.equal(tl.allCards.length, enUso());

  // El único ítem de tipo Video está descartado: con el default de estado sigue en uso, el
  // filtro de tipo lo deja en cero.
  const video = container.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]');
  assert.ok(video, 'debería existir el checkbox de "Video"');
  video.click();
  assert.equal(tl.allCards.length, 0);

  // Aflojar el default de descartado deja que `FUE-00014` (el tipo Video) vuelva al pool.
  setDescartado(false);
  assert.equal(tl.allCards.length, 1);
  assert.equal(tl.allCards[0].id, 'FUE-00014');

  // Destildar el tipo vuelve al pool recortado por los defaults de estado.
  video.click();
  assert.equal(
    tl.allCards.length,
    mockData.items.filter((i) => i.capturado === true).length,
    'descartado ya no filtra'
  );

  // Reponer el default de descartado (capturado sigue solo)...
  setDescartado(true);
  assert.equal(tl.allCards.length, 15, 'el default de capturado + el de descartado');
  // ...sacar capturado deja solo el recorte de descartado...
  container.querySelector('[data-filter-field="capturado"] input[value="true"]').click();
  assert.equal(tl.allCards.length, 17, 'solo el default de descartado sigue filtrando');
  // ...y sacar ese también devuelve el pool completo.
  setDescartado(false);
  assert.equal(tl.allCards.length, mockData.items.length, 'sin defaults ni filtros queda la lista completa');
});

test('`items` fijo mantiene el grupo visible aunque los datos no traigan esos valores', () => {
  const container = resetDom();
  new Timeline({
    container,
    items: mockData.items,
    filters: [
      {
        field: 'sin-dato',
        label: 'Sin datos',
        items: [
          { value: 'a', label: 'Opción A', checked: true },
          { value: 'b', label: 'Opción B' }
        ]
      }
    ]
  });
  const box = container.querySelector('[data-filter-field="sin-dato"]');
  assert.ok(box, 'el grupo debería existir');
  assert.equal(box.hidden, false, 'el grupo no debería estar oculto');
  assert.deepEqual(groupValues(container, 'sin-dato'), [
    ['a', 'Opción A'],
    ['b', 'Opción B']
  ]);
  // Todos los conteos en cero: ningún ítem trae el campo.
  assert.equal(container.querySelector('[data-filter-field="sin-dato"] .filter-option-count').textContent, '(0)');
  // El `checked` declarado manda aunque no haya nada que filtrar.
  assert.equal(container.querySelector('[data-filter-field="sin-dato"] input[value="a"]').checked, true);
  assert.equal(container.querySelector('[data-filter-field="sin-dato"] input[value="b"]').checked, false);
});

test('un grupo con un solo valor se oculta solo', () => {
  const container = resetDom();
  // Los tres primeros ítems, forjados al mismo tipo: un grupo de un solo valor no tiene nada
  // que decidir, así que se oculta entero.
  const unTipo = mockData.items.slice(0, 3).map((i) => ({ ...i, tipo_fuente: 'Video' }));
  new Timeline({ container, items: unTipo, filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente' }] });
  const box = container.querySelector('[data-filter-field="tipo_fuente"]');
  assert.equal(box.hidden, true, 'el grupo debería estar oculto');
  assert.equal(container.querySelector('.filter-section').hidden, true, 'la sección también');
  // Y con nada que filtrar, el botón del panel no se muestra.
  assert.equal(container.querySelector('#filter-toggle').style.display, 'none');
});

test('el corte "Ver más" ordena por el orden declarado, y por conteo solo en los grupos derivados', () => {
  const container = resetDom();
  new Timeline({
    container,
    items: mockData.items,
    // Grupo DERIVADO de `tipo_fuente` (7 valores en el mock): el corte pone los de mayor conteo.
    filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente', maxVisible: 2 }]
  });
  const box = container.querySelector('[data-filter-field="tipo_fuente"]');
  assert.equal(box.querySelectorAll('.filter-option').length, 6, 'los 6 tipos del mock');
  assert.equal(box.querySelectorAll('.filter-option-extra').length, 4);
  assert.equal(box.querySelector('.filter-more').textContent, 'Ver más (4)');
  const visibles = Array.from(box.querySelectorAll('.filter-option:not(.filter-option-extra)')).map(
    (el) => el.querySelector('input').value
  );
  assert.deepEqual(
    visibles,
    ['Sitio web o portal', 'Gacetilla o comunicado de prensa'],
    'los dos visibles son los de mayor conteo'
  );

  // El mismo grupo DECLARADO se trunca en su propio orden, aunque el conteo diga otra cosa
  // ("Red Social" tiene 3 ítems y se va detrás del corte, antes que "Decreto o norma").
  const container2 = resetDom();
  new Timeline({ container: container2, items: mockData.items, filters: [tipoFuenteDemo] });
  const box2 = container2.querySelector('[data-filter-field="tipo_fuente"]');
  assert.equal(box2.querySelectorAll('.filter-option').length, 7, 'los 7 valores declarados');
  assert.equal(box2.querySelectorAll('.filter-option-extra').length, 3);
  assert.equal(box2.querySelector('.filter-more').textContent, 'Ver más (3)');
  assert.deepEqual(
    Array.from(box2.querySelectorAll('.filter-option:not(.filter-option-extra)')).map(
      (el) => el.querySelector('input').value
    ),
    ['Sitio web o portal', 'Gacetilla o comunicado de prensa', 'Decreto o norma', 'Libro o publicación'],
    'los visibles son los primeros declarados'
  );
});

test('un grupo con `persist` sobrevive a los rebuilds y a la recarga', () => {
  window.localStorage.clear();
  const container = resetDom();
  const filters = [
    {
      field: 'tipo_fuente',
      label: 'Tipo de fuente',
      items: [
        { value: 'Video', label: 'Video', checked: true },
        { value: 'Decreto o norma', label: 'Decreto o norma' }
      ]
    },
    {
      field: 'validado',
      label: 'Validado',
      group: 'filtros_internos',
      items: [{ value: true, label: 'Validado', checked: true }],
      persist: true
    }
  ];
  const tl = new Timeline({ container, items: mockData.items, filters, internalButtons: true });
  // El `checked` declarado se aplica al construir.
  assert.ok(container.querySelector('[data-filter-field="validado"] input').checked);
  // El estado solo se escribe cuando el usuario lo toca: todavía no hay nada guardado, así que
  // una recarga re-aplicaría el default.
  assert.equal(window.localStorage.getItem('tv-filtros-internos-filters'), null);

  const validado = container.querySelector('[data-filter-field="validado"] input[value="true"]');
  validado.click();
  assert.equal(validado.checked, false);
  assert.deepEqual(JSON.parse(window.localStorage.getItem('tv-filtros-internos-filters')), { validado: [] });

  // Una instancia nueva arranca con el estado guardado, en vez de con el default.
  const container2 = resetDom();
  new Timeline({ container: container2, items: mockData.items, filters, internalButtons: true });
  assert.equal(container2.querySelector('[data-filter-field="validado"] input[value="true"]').checked, false);
  // Y el default del grupo que no persiste se vuelve a aplicar.
  assert.equal(container2.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]').checked, true);
  assert.equal(tl.allCards.length, mockData.items.filter((i) => i.tipo_fuente === 'Video').length);
});

test('cada botón se enciende solo por los grupos que contiene', () => {
  window.localStorage.clear();
  const container = resetDom();
  const filters = [
    { field: 'tipo_fuente', label: 'Tipo de fuente', items: [{ value: 'Video', label: 'Video' }] },
    {
      field: 'descartado',
      label: 'Descartado',
      group: 'filtros_internos',
      items: [{ value: false, label: 'Sin descartar', checked: true }]
    }
  ];
  new Timeline({ container, items: mockData.items, filters, internalButtons: true });
  const panel = container.querySelector('#filter-toggle');
  const internos = container.querySelector('#filtros-internos-toggle');
  // El default de estado está prendido: solo su flyout debería encenderse.
  assert.equal(internos.classList.contains('active'), true, 'el flyout de estado debería estar encendido');
  assert.equal(panel.classList.contains('active'), false, 'pero el del panel no: el filtro es de estado');

  // Prender un grupo del panel enciende el del panel y deja el de estado como estaba.
  container.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]').click();
  assert.equal(panel.classList.contains('active'), true);
  assert.equal(internos.classList.contains('active'), true, 'el default de estado sigue activo');

  // Apagar el único grupo de estado apaga su botón y no toca el del panel.
  container.querySelector('[data-filter-field="descartado"] input[value="false"]').click();
  assert.equal(internos.classList.contains('active'), false);
  assert.equal(panel.classList.contains('active'), true, 'el filtro del panel sigue puesto');
});

test('la búsqueda enciende su propio botón, no los de filtros', () => {
  const container = resetDom();
  const tl = new Timeline({ container, items: mockData.items, filters: demoFilters, internalButtons: true });
  const panel = container.querySelector('#filter-toggle');
  tl.searchInput.value = 'decreto';
  tl.searchInput.dispatchEvent(new window.Event('input'));
  assert.equal(container.querySelector('#search-toggle').classList.contains('active'), true);
  assert.equal(panel.classList.contains('active'), false, 'buscar no es filtrar');
  assert.equal(tl.searchTerm, 'decreto');
});

test('`group: "filtros_internos"` sin `internalButtons` no se renderiza, y el resto del panel sigue', () => {
  const container = resetDom();
  new Timeline({
    container,
    items: mockData.items,
    internalButtons: false,
    filters: demoFilters
  });
  assert.equal(container.querySelector('#filtros-internos-wrap'), null, 'sin toolbar interno no hay flyout');
  assert.equal(container.querySelectorAll('.filter-menu .filter-option').length > 0, true, 'el panel se arma igual');
  assert.equal(container.querySelectorAll('.filter-section').length, 5, 'los 5 grupos del panel');
});

test('el taxónomo activo recalcula los conteos del grupo declarado', () => {
  const container = resetDom();
  const tl = new Timeline({ container, content: mockData.content, filters: demoFilters });
  const select = container.querySelector('#taxonomy-select');
  const primeraTaxonomia = mockData.content[0].items.length;
  assert.equal(tl.allCards.length, primeraTaxonomia, 'arranca con la primera taxonomía');

  // Un grupo declarado no pierde valores al cambiar de taxonomía (el `Ver más` sigue mostrando
  // los mismos), pero sus conteos sí se recalculan sobre el pool activo.
  assert.deepEqual(
    Array.from(container.querySelectorAll('[data-filter-field="tipo_fuente"] .filter-option')).map(
      (el) => el.querySelector('input').value
    ),
    demoFilters.find((f) => f.field === 'tipo_fuente').items.map((i) => String(i.value))
  );

  // "Ver todo" recalcula los conteos sobre el pool completo.
  select.selectedIndex = select.options.length - 1;
  select.dispatchEvent(new window.Event('change'));
  assert.equal(tl.allCards.length, mockData.items.length);
  const conTodos = Number(
    container.querySelector('[data-filter-field="tipo_fuente"] .filter-option-count').textContent.replace(/\D/g, '')
  );
  assert.equal(
    conTodos,
    mockData.items.filter((i) => i.tipo_fuente === 'Sitio web o portal').length,
    'el conteo debería ser el del pool completo'
  );
});

test(
  'el panel no se renderiza en modo single (no hay timeline que filtrar)',
  { skip: 'singleId en jsdom deja timers de embeds que impiden que el runner salga; se cubre en la suite e2e' },
  () => {
    const container = resetDom();
    new Timeline({ container, items: mockData.items, filters: demoFilters, singleId: 'FUE-00001' });
    assert.equal(container.querySelector('.filter-wrap'), null, 'no debería haber panel de filtros');
    assert.equal(container.querySelector('.filter-menu'), null);
  }
);
