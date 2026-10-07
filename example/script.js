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
// Además le deja el campo a dos ítems como `null`, para que el "Sin valor" de `allowEmpty` tenga
// algo que representar: el bucket vacío solo existe si de verdad hay ítems sin valor.
// No aplica en modo API (los ítems los manda el servidor, no este archivo).
// ?sininternos saca los grupos de `filtros_internos` de la declaración, como si este usuario no
// tuviera permisos para ellos. Con `stateInUrl` (siempre activo en el demo) es el caso para el que
// existe el "fallar en silencio": un link que traiga `?tv_<campo interno>=...` se abre filtrado por
// todo lo demás, sin error y sin dejar el filtro colgado en la URL.
// ?fullmap agrega el botón de la vista de mapa general (`showFullMap`): baja el timeline y muestra
// un mapa con un punto por tema ubicado de todo lo que hay en el filtro actual. Es independiente de
// `?full`: el mapa se abre y se cierra igual con el timeline colapsado o expandido, y con `?full`
// toma lo que queda de la ventana bajo la barra pegada.
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
// ?sininternos: este usuario no tiene los filtros internos, así que no se declaran (ver la nota).
const useSinInternos = new URLSearchParams(window.location.search).has('sininternos');
// ?fullmap: la vista de mapa general (`showFullMap`), que no depende de ?full (ver la nota).
const useFullMap = new URLSearchParams(window.location.search).has('fullmap');
const singleId = new URLSearchParams(window.location.search).get('id');

/**
 * Campo sintético de `?many`: un campo con **cientos** de valores distintos, que es el caso para el
 * que existe el `select`. El mock tiene 19 ítems, así que repartir un tema por ítem daría 19 valores
 * y no probaría nada: cada ítem lleva una porción del pool, y entre todos cubren los 400. Los
 * sufijos van con tilde a propósito, para que se vea que el buscador las perdona.
 *
 * Los ítems de `MANY_WITHOUT_FIELD` quedan fuera de esa repartición, con el campo en `null`: son los
 * que hacen existir el bucket vacío del filtro (`allowEmpty`), que de otro modo no tendría nada que
 * ofrecer.
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
/**
 * Ítems a los que `?many` deja el campo en `null`: uno en la primera taxonomía —la que abre el demo
 * en modo `content`— y otro en la última, para que el "Sin valor" se vea sin cambiar de taxonomía.
 */
const MANY_WITHOUT_FIELD = ['FUE-00009', 'FUE-00019'];
/** Temas por ítem, contados solo sobre los que sí llevan el campo: 17 × 24 = 408, que al dar la vuelta cubren los 400 */
const MANY_PER_ITEM = Math.ceil(MANY_COUNT / (mockData.items.length - MANY_WITHOUT_FIELD.length));
const manyTopics = Array.from(
  { length: MANY_COUNT },
  (_, i) => `Tema ${String(i + 1).padStart(3, '0')} ${MANY_SUFFIXES[i % MANY_SUFFIXES.length]}`
);

/**
 * Los ítems del demo con el campo de `?many` ya puesto. El offset del pool corre sobre un contador
 * denso de los ítems que sí llevan el campo, y no sobre la posición en el array: como los de
 * `MANY_WITHOUT_FIELD` están en medio del listado, multiplicar la posición dejaría un hueco de
 * `MANY_PER_ITEM` temas sin cubrir y el desplegable mostraría menos de 400 valores.
 */
function withManyTopics(items) {
  let slot = 0;
  return items.map((item) => {
    if (MANY_WITHOUT_FIELD.includes(String(item.id))) return { ...item, topicos_demo: null };
    const topicos_demo = Array.from(
      { length: MANY_PER_ITEM },
      (_, k) => manyTopics[(slot * MANY_PER_ITEM + k) % MANY_COUNT]
    );
    slot++;
    return { ...item, topicos_demo };
  });
}

/**
 * Los filtros del demo con el grupo de `?many` adelante, para verlo arriba del panel. El
 * `allowEmpty` es lo que le agrega el "Sin valor" al final de los 400 temas: con la ventana de 50
 * filas queda fuera de la vista, así que se llega con la búsqueda del desplegable o con <kbd>End</kbd>.
 */
function withManyFilter(groups) {
  return [
    { field: 'topicos_demo', label: `Temas (${MANY_COUNT} valores)`, type: 'select', allowEmpty: true },
    ...groups
  ];
}

/**
 * Los filtros del demo sin los grupos de `filtros_internos`, que es lo que declara un consumidor
 * cuando este usuario no tiene permisos para ellos. El panel y el flyout quedan con el resto, así
 * que la única diferencia visible es que los grupos ausentes ni aparecen ni filtran.
 */
function withoutInternalFilters(groups) {
  return groups.filter((f) => f.group !== 'filtros_internos');
}

/** Los filtros del demo, ya sea completos (`?many` adelante) o sin los internos (`?sininternos`) */
function demoFilters() {
  const base = useMany ? withManyFilter(filters) : filters;
  return useSinInternos ? withoutInternalFilters(base) : base;
}

const baseOptions = {
  container: '#noticias-container',
  featuredCount: 10,
  itemsPerPage: 10,
  pagination: usePagination,
  inlineImages: true,
  inlineAdjuntos: true,
  internalButtons: true,
  // La barra de direcciones es un link compartible de la vista: búsqueda, filtros, orden,
  // taxonomía y página viajan en la URL con prefijo `tv_`. Siempre activo en el demo.
  stateInUrl: true,
  // Con ?expanded el timeline arranca abierto en vez de colapsado sobre las featured.
  startExpanded: useExpanded,
  // Con ?full la página entera scrollea y la barra de filtros queda siempre visible.
  fullpage: useFull,
  // Con ?fullmap el botón de la barra abre un mapa con todos los temas ubicados del filtro actual,
  // en vez del listado. En modo API los puntos salen de `GET /api/points`.
  showFullMap: useFullMap,
  relatedLabel: (count) => (count === 1 ? 'publicación relacionada' : 'publicaciones relacionadas'),
  // Los grupos del panel de filtros. Sin esta opción no hay filtros: la librería no trae ninguno
  // hardcodeado, los declara el consumidor (ver example/filters.js). En modo API los mismos
  // grupos se llenan con los valores que devuelve `GET /api/facets`.
  filters: demoFilters(),
  // El menú de orden. Sin esta opción no hay UI de orden: la librería no trae ningún sorter
  // hardcodeado (ver example/sorters.js). En modo API los mismos campos viajan como `sortBy`.
  sorters,
  singleId,
  // El mapa de "Temas destacados" usa la capa estándar de OpenStreetMap por defecto; para verlo sin
  // fondo alcanza con `temasMapTiles: ''`.
  temasMapTiles: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
  //temasMapAttribution: ''
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
    lastUpdated: mockData.lastUpdated
  });
}
