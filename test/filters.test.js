import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetDom, Timeline } from './helpers/dom.js';
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

test('la opción `filters` arma los grupos del panel, en el orden declarado', () => {
  const container = resetDom();
  new Timeline({ container, items: mockData.items, filters: demoFilters, internalButtons: true });

  const menu = container.querySelector('.filter-menu');
  assert.ok(menu, 'debería existir el panel de filtros');
  assert.equal(container.querySelectorAll('.filter-column').length, 2, 'esperaba 2 columnas');
  // La primera mitad de los grupos `menu` va en la primera columna, el resto en la segunda.
  assert.deepEqual(columnLabels(container, 0), ['Tono social', 'Año publicación', 'Contenido']);
  assert.deepEqual(columnLabels(container, 1), ['Tipo de fuente', 'Fuente oficial']);

  const estado = container.querySelector('#estado-menu');
  assert.ok(estado, 'debería existir el flyout de estado interno');
  assert.deepEqual(
    Array.from(estado.querySelectorAll('.filter-options')).map((el) => el.dataset.filterField),
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
  assert.equal(container.querySelector('#estado-wrap'), null, 'sin grupos de estado no hay flyout');
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

test('los valores se derivan del campo de los items, con su conteo', () => {
  const container = resetDom();
  // El grupo del demo, que declara el `extract` que nombra las fuentes sin tipo.
  const tl = new Timeline({ container, items: mockData.items, filters: [tipoFuenteDemo], filtersMaxVisible: 0 });
  const values = groupValues(container, 'tipo_fuente');
  // `tipo_fuente` es un campo de texto: los valores son los que aparecen en los datos, más el
  // bucket que el `extract` del demo les da a las fuentes que no declaran tipo.
  const expected = [...new Set(mockData.items.map((i) => i.tipo_fuente || 'sin-tipo'))].map((v) => [
    v,
    v === 'sin-tipo' ? 'Sin tipo' : v
  ]);
  assert.deepEqual(values, expected);
  assert.equal(values.length, 7, 'esperaba 6 tipos más el bucket "sin-tipo"');
  const counts = Array.from(container.querySelectorAll('[data-filter-field="tipo_fuente"] .filter-option-count')).map(
    (el) => el.textContent
  );
  const sinTipo = values.findIndex(([v]) => v === 'sin-tipo');
  assert.equal(counts[sinTipo], '(2)', 'el conteo debería ser el de los items sin tipo');
  assert.equal(tl.allCards.length, mockData.items.length, 'sin filtros chequeados no se descarta nada');
});

test('sin `extract`, un campo vacío no es un valor (los ítems que no lo tienen quedan fuera)', () => {
  const container = resetDom();
  new Timeline({
    container,
    items: mockData.items,
    filters: [{ field: 'tipo_fuente', label: 'Tipo de fuente' }],
    filtersMaxVisible: 0
  });
  // El mock tiene 7 valores distintos de `tipo_fuente`, pero uno es la cadena vacía: sin un
  // `extract` que la nombre, ese bucket no existe y los ítems sin tipo no matchean ningún valor.
  const values = groupValues(container, 'tipo_fuente').map(([v]) => v);
  assert.equal(values.length, 6);
  assert.equal(values.includes(''), false);
  assert.equal(values.includes('sin-tipo'), false);
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
  // Los defaults del demo (capturado + no-descartado) ya recortan la lista.
  const enUso = () => mockData.items.filter((i) => i.descartado !== true && i.capturado === true).length;
  assert.equal(tl.allCards.length, enUso());

  // El único ítem de tipo Video está descartado: con el default de estado sigue en uso, el
  // filtro de tipo lo deja en cero.
  const video = container.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]');
  assert.ok(video, 'debería existir el checkbox de "Video"');
  video.click();
  assert.equal(tl.allCards.length, 0);

  // Aflojar el default de descartado deja que `FUE-00014` (el tipo Video) vuelva al pool.
  container.querySelector('[data-filter-field="descartado"] input[value="no-descartado"]').click();
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
  container.querySelector('[data-filter-field="descartado"] input[value="no-descartado"]').click();
  assert.equal(tl.allCards.length, 15, 'el default de capturado + el de descartado');
  // ...sacar capturado deja solo el recorte de descartado...
  container.querySelector('[data-filter-field="capturado"] input[value="capturado"]').click();
  assert.equal(tl.allCards.length, 17, 'solo el default de descartado sigue filtrando');
  // ...y sacar ese también devuelve el pool completo.
  container.querySelector('[data-filter-field="descartado"] input[value="no-descartado"]').click();
  assert.equal(tl.allCards.length, mockData.items.length, 'sin defaults ni filtros queda la lista completa');
});

test('`values` fijo mantiene el grupo visible aunque los datos no traigan esos valores', () => {
  const container = resetDom();
  new Timeline({
    container,
    items: mockData.items,
    filters: [
      {
        field: 'sin-dato',
        label: 'Sin datos',
        values: ['a', 'b'],
        defaultChecked: ['a']
      }
    ]
  });
  const box = container.querySelector('[data-filter-field="sin-dato"]');
  assert.ok(box, 'el grupo debería existir');
  assert.equal(box.hidden, false, 'el grupo no debería estar oculto');
  assert.deepEqual(groupValues(container, 'sin-dato'), [
    ['a', 'a'],
    ['b', 'b']
  ]);
  // Todos los conteos en cero: ningún ítem trae el campo.
  assert.equal(container.querySelector('[data-filter-field="sin-dato"] .filter-option-count').textContent, '(0)');
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

test('`maxVisible` del grupo manda sobre `filtersMaxVisible`', () => {
  const container = resetDom();
  new Timeline({
    container,
    items: mockData.items,
    filters: [{ ...tipoFuenteDemo, maxVisible: 2 }],
    filtersMaxVisible: 0
  });
  // `tipo_fuente` tiene 7 valores en el mock: con corte 2 quedan 2 a la vista y 5 detrás.
  const box = container.querySelector('[data-filter-field="tipo_fuente"]');
  const options = box.querySelectorAll('.filter-option');
  assert.equal(options.length, 7);
  assert.equal(box.querySelectorAll('.filter-option-extra').length, 5);
  assert.equal(box.querySelector('.filter-more').textContent, 'Ver más (5)');
  // Los dos visibles son los de mayor conteo, y el resto va ordenado por el mismo criterio.
  const visibles = Array.from(box.querySelectorAll('.filter-option:not(.filter-option-extra)')).map(
    (el) => el.querySelector('.filter-option-count').textContent
  );
  assert.deepEqual(visibles, ['(5)', '(5)'], 'Sitio web o portal y Gacetilla son los dos tipos más comunes');
});

test('un grupo con `persist` sobrevive a los rebuilds y a la recarga', () => {
  window.localStorage.clear();
  const container = resetDom();
  const filters = [
    {
      field: 'tipo_fuente',
      label: 'Tipo de fuente',
      values: ['Video', 'Decreto o norma'],
      defaultChecked: ['Video']
    },
    {
      field: 'validado',
      label: 'Validado',
      group: 'estado',
      values: ['validado'],
      defaultChecked: ['validado'],
      persist: true
    }
  ];
  const tl = new Timeline({ container, items: mockData.items, filters, internalButtons: true });
  // El default se aplica al construir.
  assert.ok(container.querySelector('[data-filter-field="validado"] input').checked);
  // El estado solo se escribe cuando el usuario lo toca: todavía no hay nada guardado, así que
  // una recarga re-aplicaría el default.
  assert.equal(window.localStorage.getItem('tv-estado-filters'), null);

  const validado = container.querySelector('[data-filter-field="validado"] input[value="validado"]');
  validado.click();
  assert.equal(validado.checked, false);
  assert.deepEqual(JSON.parse(window.localStorage.getItem('tv-estado-filters')), { validado: [] });

  // Una instancia nueva arranca con el estado guardado, en vez de con el default.
  const container2 = resetDom();
  new Timeline({ container: container2, items: mockData.items, filters, internalButtons: true });
  assert.equal(container2.querySelector('[data-filter-field="validado"] input[value="validado"]').checked, false);
  // Y el default del grupo que no persiste se vuelve a aplicar.
  assert.equal(container2.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]').checked, true);
  assert.equal(tl.allCards.length, mockData.items.filter((i) => i.tipo_fuente === 'Video').length);
});

test('cada botón se enciende solo por los grupos que contiene', () => {
  window.localStorage.clear();
  const container = resetDom();
  const filters = [
    { field: 'tipo_fuente', label: 'Tipo de fuente', values: ['Video'], maxVisible: 0 },
    {
      field: 'descartado',
      label: 'Descartado',
      group: 'estado',
      values: ['no-descartado'],
      defaultChecked: ['no-descartado'],
      maxVisible: 0
    }
  ];
  new Timeline({ container, items: mockData.items, filters, internalButtons: true });
  const panel = container.querySelector('#filter-toggle');
  const estado = container.querySelector('#estado-toggle');
  // El default de estado está prendido: solo su flyout debería encenderse.
  assert.equal(estado.classList.contains('active'), true, 'el flyout de estado debería estar encendido');
  assert.equal(panel.classList.contains('active'), false, 'pero el del panel no: el filtro es de estado');

  // Prender un grupo del panel enciende el del panel y deja el de estado como estaba.
  container.querySelector('[data-filter-field="tipo_fuente"] input[value="Video"]').click();
  assert.equal(panel.classList.contains('active'), true);
  assert.equal(estado.classList.contains('active'), true, 'el default de estado sigue activo');

  // Apagar el único grupo de estado apaga su botón y no toca el del panel.
  container.querySelector('[data-filter-field="descartado"] input[value="no-descartado"]').click();
  assert.equal(estado.classList.contains('active'), false);
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

test('`group: "estado"` sin `internalButtons` no se renderiza, y el resto del panel sigue', () => {
  const container = resetDom();
  new Timeline({
    container,
    items: mockData.items,
    internalButtons: false,
    filters: demoFilters
  });
  assert.equal(container.querySelector('#estado-wrap'), null, 'sin toolbar interno no hay flyout');
  assert.equal(container.querySelectorAll('.filter-menu .filter-option').length > 0, true, 'el panel se arma igual');
  assert.equal(container.querySelectorAll('.filter-section').length, 5, 'los 5 grupos del panel');
});

test('el taxónomo activo re-deriva los valores y los conteos del grupo', () => {
  const container = resetDom();
  const tl = new Timeline({ container, content: mockData.content, filters: demoFilters });
  const select = container.querySelector('#taxonomy-select');
  const primeraTaxonomia = mockData.content[0].items.length;
  assert.equal(tl.allCards.length, primeraTaxonomia, 'arranca con la primera taxonomía');

  // "Ver todo" recalcula los valores sobre el pool completo.
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
