import Timeline from '../dist/TimelineViewer.js';
import mockData from './mock-data.js';
import filters from './filters.js';
import sorters from './sorters.js';

// Uso: abrir index.html con ?api para probar el modo API contra el mock.
// ?id=FUE-0001 (opcional) renderiza solo esa tarjeta, ya expandida.
// ?flat renderiza la lista plana (alias legacy `items`) en lugar de `content`, para
// verificar que sin taxonomías no se agrega el selector y el layout queda igual.
// ?expanded arranca el timeline expandido (`startExpanded`), en vez de colapsado.
// ?full arranca en modo fullpage (`fullpage`): timeline siempre abierto, sin handle de
// resize, sin scroll interno (scrollea la página) y con la barra de herramientas pegada
// arriba. Implica `startExpanded` y subsume a `?expanded`.
// ?pagination cambia "Cargar más" por el paginador numérico (`pagination`): páginas
// disjuntas con Anterior/Siguiente, en vez de ir creciendo la lista hacia abajo.
// ?many agrega un campo sintético con 400 valores distintos y su filtro `select`, para ver el
// control en el caso para el que existe. El mock no lo trae: `tonos_sociales` resuelve a 3
// valores, muy por debajo del corte que hace aparecer el buscador, así que sin este flag el
// desplegable se ve como una lista corta y no dice nada sobre cómo se comporta con cientos.
// No aplica en modo API (los ítems los manda el servidor, no este archivo).
// El menú de información muestra el ID con el icono "Visitar" hacia la vista individual
// del propio ítem (`link_view_entry`, un campo de cada artículo), y aparece también
// el botón de compartir con esa misma URL.
// En el modo single, el bloque de links de navegación del pie de la tarjeta sale del
// campo `taxonomias` de cada artículo (ver FUE-00001 en mock-data.js), no de la config.
const useApi = new URLSearchParams(window.location.search).has('api');
const useFlat = new URLSearchParams(window.location.search).has('flat');
// ?full (modo fullpage) implica abierto, así que subsume a ?expanded.
const useExpanded = new URLSearchParams(window.location.search).has('expanded');
const useFull = new URLSearchParams(window.location.search).has('full');
const usePagination = new URLSearchParams(window.location.search).has('pagination');
// ?many: el caso de uso del filtro `select`. Solo tiene efecto en modo local (ver la nota de arriba).
const useMany = new URLSearchParams(window.location.search).has('many');
const singleId = new URLSearchParams(window.location.search).get('id');

/**
 * Campo sintético de `?many`: un campo con **cientos** de valores distintos, que es el caso para el
 * que existe el `select`. El mock tiene 19 ítems, así que repartir un tema por ítem daría 19 valores
 * y no probaría nada: cada ítem lleva una porción del pool, y entre todos cubren los 400. Los
 * sufijos van con tilde a propósito, para que se vea que el buscador las perdona.
 */
const MANY_SUFFIXES = [
  'Ámbito',
  'Política',
  'Región',
  'Información',
  'Análisis',
  'Educación',
  'Sanidad',
  'Energía',
  // Uno largo a propósito: los chips del trigger cortan con "…" a los 200px, y con todos los
  // valores cortos esa parte del control no se vería nunca en el demo.
  'Comunicación institucional'
];
const MANY_COUNT = 400;
/** Temas por ítem: 19 ítems × 21 = los 399 primeros del pool, sin repetir */
const MANY_PER_ITEM = Math.ceil(MANY_COUNT / mockData.items.length);
const manyTopics = Array.from(
  { length: MANY_COUNT },
  (_, i) => `Tema ${String(i + 1).padStart(3, '0')} ${MANY_SUFFIXES[i % MANY_SUFFIXES.length]}`
);

/** Los ítems del demo con el campo de `?many` ya puesto */
function withManyTopics(items) {
  return items.map((item, i) => ({
    ...item,
    topicos_demo: Array.from({ length: MANY_PER_ITEM }, (_, k) => manyTopics[(i * MANY_PER_ITEM + k) % MANY_COUNT])
  }));
}

/** Los filtros del demo con el grupo de `?many` adelante, para verlo arriba del panel */
function withManyFilter(groups) {
  return [{ field: 'topicos_demo', label: `Temas (${MANY_COUNT} valores)`, type: 'select' }, ...groups];
}

const baseOptions = {
  container: '#noticias-container',
  featuredCount: 10,
  itemsPerPage: 10,
  pagination: usePagination,
  inlineImages: true,
  inlineAdjuntos: true,
  internalButtons: true,
  // Con ?expanded el timeline arranca abierto en vez de colapsado sobre las featured.
  startExpanded: useExpanded,
  // Con ?full la página entera scrollea y la barra de filtros queda siempre visible.
  fullpage: useFull,
  relatedLabel: (count) => (count === 1 ? 'publicación relacionada' : 'publicaciones relacionadas'),
  // Los grupos del panel de filtros. Sin esta opción no hay filtros: la librería no trae ninguno
  // hardcodeado, los declara el consumidor (ver example/filters.js). En modo API los mismos
  // grupos se llenan con los valores que devuelve `GET /api/facets`.
  filters,
  // El menú de orden. Sin esta opción no hay UI de orden: la librería no trae ningún sorter
  // hardcodeado (ver example/sorters.js). En modo API los mismos campos viajan como `sortBy`.
  sorters,
  singleId
};

if (useApi) {
  new Timeline({
    ...baseOptions,
    api: { url: '/api' }
  });
} else {
  // `content` agrupa los artículos por taxonomía media: el label de cada grupo es la opción del
  // selector que se muestra al expandir el timeline; `items` es la lista plana (alias legacy).
  const data = useFlat ? { items: mockData.items } : { content: mockData.content };
  // `?many` suma el campo de muchos valores a los ítems y su `select` a los filtros. Se aplica a
  // `content` grupo por grupo, así que funciona con y sin `?flat`.
  if (useMany) {
    if (data.items) data.items = withManyTopics(data.items);
    else data.content = data.content.map((group) => ({ ...group, items: withManyTopics(group.items) }));
  }
  new Timeline({
    ...baseOptions,
    ...data,
    filters: useMany ? withManyFilter(filters) : filters,
    lastUpdated: mockData.lastUpdated
  });
}
