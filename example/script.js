import Timeline from '../dist/TimelineViewer.js';
import mockData from './mock-data.js';

// Uso: abrir index.html con ?api para probar el modo API contra el mock.
// ?id=FUE-0001 (opcional) renderiza solo esa tarjeta, ya expandida.
// ?flat renderiza la lista plana (alias legacy `items`) en lugar de `content`, para
// verificar que sin taxonomías no se agrega el selector y el layout queda igual.
// ?expanded arranca el timeline expandido (`startExpanded`), en vez de colapsado.
// El menú de información muestra el ID con el icono "Visitar" hacia la vista individual
// del propio ítem (`link_view_entry`, un campo de cada artículo), y aparece también
// el botón de compartir con esa misma URL.
// En el modo single, el bloque de links de navegación del pie de la tarjeta sale del
// campo `taxonomias` de cada artículo (ver FUE-00001 en mock-data.js), no de la config.
const useApi = new URLSearchParams(window.location.search).has('api');
const useFlat = new URLSearchParams(window.location.search).has('flat');
const useExpanded = new URLSearchParams(window.location.search).has('expanded');
const singleId = new URLSearchParams(window.location.search).get('id');

const baseOptions = {
  container: '#noticias-container',
  featuredCount: 10,
  itemsPerPage: 10,
  inlineImages: true,
  inlineAdjuntos: true,
  internalButtons: true,
  // Con ?expanded el timeline arranca abierto en vez de colapsado sobre las featured.
  startExpanded: useExpanded,
  relatedLabel: (count) => (count === 1 ? 'publicación relacionada' : 'publicaciones relacionadas'),
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
