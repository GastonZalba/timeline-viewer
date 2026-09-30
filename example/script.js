import Timeline from '../dist/TimelineViewer.js';
import mockData from './mock-data.js';
import filters from './filters.js';

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
const singleId = new URLSearchParams(window.location.search).get('id');

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
  singleId
};

if (useApi) {
  new Timeline({
    ...baseOptions,
    api: { url: '/api' }
  });
} else {
  new Timeline({
    ...baseOptions,
    // `content` agrupa los artículos por taxonomía media: el label de cada grupo es la
    // opción del selector que se muestra al expandir el timeline.
    ...(useFlat ? { items: mockData.items } : { content: mockData.content }),
    lastUpdated: mockData.lastUpdated
  });
}
