import type { LightGallery } from 'lightgallery/lightgallery';
import type OlMap from 'ol/Map.js';
import type OlView from 'ol/View.js';
import type OlFeature from 'ol/Feature.js';
import type OlPoint from 'ol/geom/Point.js';
import type OlLineString from 'ol/geom/LineString.js';
import type VectorLayer from 'ol/layer/Vector.js';
import type VectorSource from 'ol/source/Vector.js';
import type TileLayer from 'ol/layer/Tile.js';
import type XYZ from 'ol/source/XYZ.js';
import type OlStyle from 'ol/style/Style.js';
import type CircleStyle from 'ol/style/Circle.js';
import type OlFill from 'ol/style/Fill.js';
import type OlStroke from 'ol/style/Stroke.js';
import type TextStyle from 'ol/style/Text.js';
import type ZoomControl from 'ol/control/Zoom.js';
import type AttributionControl from 'ol/control/Attribution.js';
import type OlOverlay from 'ol/Overlay.js';
import type { fromLonLat as FromLonLat, get as GetProjection } from 'ol/proj.js';
export type TonoSocial = 'Positivo' | 'Negativo' | 'Neutro';
/**
 * Punto geográfico de un tema, en **EPSG:4326** (WGS84): latitud y longitud en
 * grados decimales, con la convención del campo (`lat` es latitud, `lon` es longitud).
 *
 * Es un objeto con campos nombrados y no una tupla `[lat, lon]` a propósito: los
 * números son negativos o de tres dígitos casi siempre, así que una tupla sería
 * indistinguible de un vistazo y es la fuente clásica de tener la ciudad al revés.
 * Para lo mismo el orden NO es el de GeoJSON (`[lon, lat]`).
 */
export interface TemaGeom {
    lat: number;
    lon: number;
}
/**
 * The constructors and the one function the topics map needs, unpacked from the lazily
 * imported OpenLayers modules (see `_loadOpenLayers`).
 */
interface TemasMapModules {
    OlMap: typeof OlMap;
    OlView: typeof OlView;
    OlFeature: new (options?: {
        geometry?: OlPoint;
    }) => OlFeature;
    OlPoint: typeof OlPoint;
    OlLineString: typeof OlLineString;
    OlOverlay: typeof OlOverlay;
    VectorLayer: typeof VectorLayer;
    VectorSource: typeof VectorSource;
    TileLayer: typeof TileLayer;
    XYZ: typeof XYZ;
    Style: typeof OlStyle;
    Circle: typeof CircleStyle;
    Fill: typeof OlFill;
    Stroke: typeof OlStroke;
    Text: typeof TextStyle;
    Zoom: typeof ZoomControl;
    Attribution: typeof AttributionControl;
    getProjection: typeof GetProjection;
    fromLonLat: typeof FromLonLat;
}
/**
 * A topic's point, resolved once and shared by the map and by the reference badge the topic gets in
 * the list above it.
 */
interface TemasMapPoint {
    /** 0-based position in the located list, which is what the marker is numbered with */
    index: number;
    /**
     * Position of the topic in `card.temas`. **Not** the same as `index`: the list can carry topics
     * without a `geom`, and those are listed but never located, so the two lists drift apart. The
     * reference badge in the list is placed by this one, the marker number by `index`.
     */
    temaIndex: number;
    /**
     * Primary key del subtema (`ItemTema.id_subtema`), que es lo que viaja al mapa general: la
     * posición sirve para emparejar contra `card.temas` de **esta** tarjeta, pero contra la ficha que
     * se abre en el panel hace falta una identidad que no dependa de en qué listado paró uno.
     * Vacío si el dato no lo trae, en cuyo caso el punto existe pero no se puede resaltar.
     */
    idSubtema: string;
    lat: number;
    lon: number;
    titulo: string;
    color: string;
    /**
     * El tono del **tema**, que es lo que el mapa general filtra y lo que el color de arriba sale.
     * Viaja como dato y no se deduce del color porque el filtro de tonos tiene que poder comparar
     * contra el tono real, y contra un `hex` no se puede.
     */
    tono_social: TonoSocial;
}
/**
 * One live map plus the overlay that was bound to it. Both have to be let go of when the card goes
 * away: the map because it keeps its canvas, listeners and tile source alive, and the overlay because
 * `Map.dispose()` does not take the overlays that were added to it with it.
 */
interface TemasMapHandle<P extends TemasMapPlottable = TemasMapPlottable> {
    map: OlMap;
    overlay: OlOverlay;
    /**
     * Reemplazar los puntos conservando la vista. El mapa de la tarjeta no lo usa (sus puntos son los
     * de la tarjeta, que no cambian sin que se rehaga la tarjeta): existe para el mapa general, que sí
     * cambia de set cuando cambia un filtro.
     *
     * Va declarado como **método** y no como propiedad con `=>` a propósito: los handles de las dos
     * vistas se guardan en campos de tipo `TemasMapHandle<TemasMapPlottable>` (el más ancho), y con la
     * firma de propiedad `strictFunctionTypes` haría el tipo invariante y no los aceptaría. Los métodos
     * son bivariantes, que es justo lo que hace falta acá.
     */
    updatePoints(points: P[]): void;
    /**
     * Repintar los markers para que el predicado `isSelected` se vuelva a evaluar, y re-agrupar lo
     * que la selección cambió (el punto abierto queda fuera de los clústeres y de los grupos del
     * spiderfy).
     *
     * El estilo de cada marker es una **función**, así que no alcanza con cambiar el estado: sin este
     * `changed()` los círculos seguirían siendo los del momento en que se creó el feature. Solo lo
     * necesita el mapa general (el de la tarjeta nunca selecciona nada) y por eso es un método
     * explícito y no una parte de `updatePoints`: abrir y cerrar la ficha no cambia los puntos.
     */
    refreshStyles(): void;
}
/**
 * Lo mínimo que un punto necesita para existir en un mapa: dónde está y de qué color se lo pinta.
 * Es lo que separa lo que las dos vistas comparten (todo el armadilio de `ol`) de lo que
 * distingue a cada una: el número y el `temaIndex` son de la tarjeta, el `nombre_fuente` es del mapa
 * general.
 */
interface TemasMapPlottable {
    lat: number;
    lon: number;
    color: string;
}
/**
 * Lo que las dos vistas del mapa le pasan distinto al mismo armadilio de OpenLayers
 * (`_mountTemasMapOn`). Sin esto habría que duplicar las ~200 líneas del agrupamiento de marcadores
 * superpuestos, que son las que más caro salen de mantener.
 */
interface TemasMapMountOptions<P> {
    /**
     * Texto pintado en el centro del marcador, o `null` para un círculo pelado. El mapa general pasa
     * `null`: su número global no apuntaría a ninguna lista visible, así que el hover pasa a ser la
     * única etiqueta y el círculo se deja más chico para el mismo espacio.
     */
    markerLabel: ((point: P) => string) | null;
    /** Markup del globo de hover sobre un marcador */
    hoverHtml: (point: P) => string;
    /**
     * Markup del globo de hover sobre un clúster, o `undefined` para el default `"N temas"`. Ninguna
     * de las dos vistas lo pasa hoy: el conteo se lee igual en los dos, pero la opción existe para un
     * consumidor que quiera sumarle el aviso de que el click acerca.
     */
    clusterHoverHtml?: (count: number) => string;
    /** Clase del globo de hover */
    tooltipClass: string;
    /** Clase del mensaje que se escribe en el canvas cuando no se pudo cargar `ol` */
    errorClass: string;
    /**
     * Click sobre un marcador, o `null` para un mapa que no reacciona al click. Lo usa solo el mapa
     * general: el de la tarjeta abre su propio detalle desde el botón de la tarjeta, así que ahí el
     * click no tiene nada que hacer y no se bindea (un listener que no hace nada tampoco es inocuo:
     * frena el drag del mapa).
     */
    onMarkerClick: ((point: P) => void) | null;
    /**
     * Click en el mapa que **no** cae sobre un marcador, o `null` si no hace falta. Va aparte de
     * `onMarkerClick` y no como un punto más porque "no hay punto" no es un punto: el mapa general lo
     * usa para cerrar el panel de la ficha, que es lo que uno espera al clickear el vacío.
     */
    onMarkerMiss: (() => void) | null;
    /**
     * Si el punto es el que está abierto en la ficha, o `false`/`null` si este mapa no marca ninguno.
     *
     * Va como **predicado**, no como un `Set` de ids, porque el estilo se resuelve por feature y en
     * cada repintado: con un `Set` el mapa habría que enterarse de los cambios a mano. Con el predicado,
     * abrir o cerrar la ficha es solo cambiar qué devuelve y pedir un repintado (`refreshStyles`).
     */
    isSelected?: ((point: P) => boolean) | null;
}
/**
 * Un punto del mapa general: un tema localizado más el artículo al que pertenece. Es la misma
 * unidad que `TemasMapPoint` más el `nombre_fuente`, que es lo que el hover necesita para nombrar de
 * dónde viene el tema —en el mapa de la tarjeta el titular ya está escrito justo arriba, y acá
 * no hay lista que lo diga—.
 */
interface FullMapPoint extends TemasMapPlottable {
    /** Id del artículo al que pertenece el tema */
    itemId: number | string;
    /**
     * Primary key del subtema, que es lo que permite scrollear la ficha hasta él y resaltarlo.
     * En local sale de `_temasLocated`; en API de `id_subtema` de `GET {url}/points`, y es `''` si el
     * backend no lo manda —en ese caso la ficha abre sin scrollear ni resaltar, que es el mismo
     * resultado que un backend viejo daba sin este campo—. Es **identidad**, no posición: la ficha se
     * abre con el detalle del artículo y el punto viene de otro listado (el mapa), y lo que los cruza
     * es una clave única del subtema y no un orden que los dos tendrían que compartir.
     */
    idSubtema: string;
    /** Título del tema (el dato que ya usaba el hover de la tarjeta) */
    titulo: string;
    /** Titular del artículo, la segunda línea del hover del mapa general */
    nombre_fuente: string;
    /**
     * El tono del **tema**, que es lo que el filtro de tonos acota punto por punto. Viaja como dato y no
     * se deduce del `color` porque contra un `hex` no se puede filtrar. Es el mismo valor que pinta el
     * `color`, así que los dos no pueden discrepar.
     */
    tono_social: TonoSocial;
}
export interface ItemTema {
    /**
     * Primary key del subtema, **único en toda la colección** (en el mock el formato es `T-000001`).
     *
     * Es la identidad con la que el mapa general empareja un punto con la fila de la ficha: viaja en
     * `GET {url}/points` como `id_subtema` y reemplaza a la posición dentro de `temas` (`tema_index`),
     * que entre dos listados distintos no identificaba nada. Sin él la ficha abre igual —el artículo
     * es el mismo—, solo sin scroll ni resaltado.
     */
    id_subtema: string;
    titulo: string;
    resumen: string;
    tono_social: TonoSocial;
    fecha_narrativa?: string | null;
    notas_de_trabajo?: string | null;
    /**
     * Dónde ocurre el tema. Opcional: un tema sin `geom` se lista igual pero no aporta
     * un punto al mapa, y la sección del mapa solo se renderiza si **algún** tema lo trae.
     *
     * Un punto se valida al renderizar (`_temaGeomOf`): fuera de rango o no finito se
     * descarta como si no viniera, porque el dato viene de un pipeline de scraping y
     * un `lat: 999` poisons el `View.fit()` de todos los puntos de la tarjeta.
     */
    geom?: TemaGeom | null;
}
export interface TimelineItem {
    id: number | string;
    nombre_fuente: string;
    resumen_ia: string | null;
    fecha_publicacion: string;
    /** Año de `fecha_publicacion` ya reducido a texto, o `null` si el ítem no tiene fecha */
    anio_publicacion: string | null;
    fecha_scrapeo: string;
    tonos_sociales: TonoSocial[];
    fuente_institucional: string | null;
    tipo_fuente: string | null;
    es_oficial: boolean;
    validado: boolean | null;
    capturado: boolean;
    descartado: boolean | null;
    thumbnail: string | null;
    link_web: string | null;
    actores_principales: string[] | null;
    adjuntos: string[];
    /** Contenido del ítem ya clasificado en tokens (`adjuntos`, `video`, `imagenes`...), listo para filtrar */
    contenido: string[];
    screenshot: string | null;
    imagenes: {
        thumb: string;
        full: string;
    }[] | null;
    links_videos?: string[] | null;
    has_video: boolean;
    link_edit_entry?: string;
    link_view_entry?: string;
    notas_de_trabajo?: string | null;
    /**
     * Grupos de links de navegación que se renderizan al pie de la tarjeta expandida.
     * Viaja en el detalle del ítem (`GET {url}/:id`), nunca en la lista paginada.
     */
    taxonomias?: SingleTaxonomy[];
    temas: ItemTema[];
}
export interface TimelineItemSummary {
    id: number | string;
    nombre_fuente: string;
    resumen_ia?: string | null;
    thumbnail: string | null;
    fecha_publicacion: string;
    tonos_sociales: TonoSocial[];
    es_oficial: boolean;
    validado: boolean | null;
    capturado: boolean;
    descartado: boolean | null;
    notas_de_trabajo?: string | null;
    link_web?: string | null;
    link_view_entry?: string;
}
export interface TimelineApiConfig {
    url: string;
    fetchImpl?: typeof fetch;
}
export interface TimelineApiPageResponse {
    items: TimelineItemSummary[];
    total: number;
    /**
     * Legacy: los facets se piden una sola vez con `GET {url}/facets`. Solo se lee de acá
     * cuando ese endpoint no está disponible, para no romper backends que todavía la mandan.
     */
    facets?: Record<string, Record<string, number>>;
    /** Legacy, con los facets: los labels que se muestran de cada token (ver `TimelineApiFacetsResponse`) */
    labels?: Record<string, Record<string, string>>;
}
/** Respuesta de `GET {url}/facets`: valores estáticos de la colección completa, sin `q` ni filtros */
export interface TimelineApiFacetsResponse {
    facets: Record<string, Record<string, number>>;
    /**
     * Texto a mostrar de cada valor, por campo y por token: la misma clave que en `facets` (el token
     * crudo que se filtra y viaja en el query param) con el texto lindo en el valor. Es lo que
     * permite que el backend guarde un código y la UI muestre el nombre.
     *
     * Es opcional y no cambia cómo se filtra: sin `labels` cada valor se muestra como su token, que es
     * lo que se hacía antes. Solo aplica a los valores que el backend aporta (los de un grupo sin
     * `items`); un valor declarado por el cliente con su propio `label` manda sobre el del backend.
     */
    labels?: Record<string, Record<string, string>>;
    /**
     * Total de la colección completa, sin `q` ni filtros: alimenta el contador y el label del
     * botón de expandir (mismo rol que `_allItems().length` en modo local). Es un valor estático,
     * por eso viaja acá y no en la lista, que cambia con la búsqueda y los filtros.
     * Si el endpoint no lo manda, el contador queda en 0.
     */
    total?: number;
    lastUpdated?: string;
}
/**
 * Un punto de `GET {url}/points`: un tema con ubicación, aplanado. Los mismos campos que el mapa de
 * la tarjeta usa, más el artículo al que pertenece, que es lo que permite nombrar el tema sin
 * volver a pedir el ítem entero.
 *
 * Solo viaja lo que el mapa dibuja: no es un `TimelineItem` reducido, es un tema suelto.
 */
export interface TimelineApiPoint {
    /**
     * Id del **artículo** al que pertenece el tema. El subtema tiene su propio id, que es el
     * `id_subtema` de abajo: acá viaja el del artículo porque el punto nombra de qué publicación es.
     */
    id: number | string;
    /**
     * Primary key del subtema (`ItemTema.id_subtema`), único en toda la colección. Opcional: es lo que
     * permite scrollear la ficha hasta el tema clickeado y resaltarlo. Un backend que no lo manda deja
     * el `''` y el mapa sigue funcionando —solo sin scrollear ni resaltar—, así que agregarlo no rompe
     * a nadie.
     */
    id_subtema?: string;
    titulo: string;
    nombre_fuente: string;
    tono_social: TonoSocial;
    geom: TemaGeom;
}
/**
 * Respuesta de `GET {url}/points`: los puntos de **todo** lo que matchea la consulta, no de una
 * página. Acepta los mismos params que la lista salvo los de paginación (`page`, `pageSize`) y los
 * de orden (`sort`, `sortBy`): el mapa los muestra todos a la vez y no los ordena, así que pedir
 * una página u ordenar son cosas que el endpoint no tiene dónde poner.
 */
export interface TimelineApiPointsResponse {
    points: TimelineApiPoint[];
    /** Cantidad de puntos devueltos. Opcional: el mapa no lo necesita, es dato informative */
    total?: number;
}
export interface SingleTaxonomyItem {
    content: string;
    link: string;
}
/** Grupo de links de navegación que se renderiza al pie de la tarjeta expandida (`item.taxonomias`) */
export interface SingleTaxonomy {
    label: string;
    items: SingleTaxonomyItem[];
}
/**
 * Media taxonomy: a labelled group of timeline items.
 * Each group becomes an option of the taxonomy selector shown above the timeline.
 */
export interface ContentGroup {
    label: string;
    items: TimelineItem[];
}
/**
 * One sort option of the toolbar, as declared by the `sorters` option of the constructor.
 * `field` is the `TimelineItem` field to order by —it orders the items in local mode and travels
 * as the `sortBy` param in API mode, where the server owns the order—, and `label` is the text the
 * menu shows. See [Orden configurable](#orden-configurable).
 */
export interface TimelineSorter {
    /** Field of `TimelineItem` to order by (e.g. `'fecha_publicacion'`, `'id'`). */
    field: string;
    /** Text of the option in the menu. Escaped before being injected into the markup. */
    label: string;
    /**
     * Selects this option on mount (default: false). Only one is honoured —the first marked one
     * wins—; with none marked, the first declared entry is. The direction always starts at
     * descending ("más reciente primero"), which the menu then lets the user flip.
     */
    default?: boolean;
}
export interface TimelineOptions {
    container: string | HTMLElement;
    /**
     * Items grouped by medium taxonomy. Takes precedence over `items`.
     * The labels of the groups are the options of the taxonomy selector; the timeline and
     * the filters are scoped to the selected group, while the related counter keeps showing
     * the total of every group. With two or more groups a trailing "Ver todo" option is
     * added, which scopes the timeline back to the whole pool.
     */
    content?: ContentGroup[];
    /**
     * Legacy flat list of items. When `content` is not provided the component behaves
     * exactly as before and no taxonomy selector is rendered.
     */
    items?: TimelineItem[];
    api?: TimelineApiConfig;
    featuredCount?: number;
    /**
     * Start the timeline already expanded instead of collapsed (default: false).
     * It only sets the initial state: the expand toggle keeps working normally and the
     * choice is not persisted, so every page load starts from this value. Ignored in
     * single mode (`singleId`), which always renders a single expanded card.
     */
    startExpanded?: boolean;
    /**
     * Fullpage mode (default: false): the timeline is always open and the page itself is
     * what scrolls. It implies `startExpanded`, makes the timeline non-collapsible (the
     * expand button keeps showing the related count but loses its chevron and its click),
     * drops the height limit of the list so `#timeline-cards` is never a scroll box on
     * its own, removes the resize handle, and pins the toolbar (counter, search, filters,
     * sort and internal buttons) to the top of the viewport. The featured stack is not
     * rendered at all, since it would never be seen, so `featuredCount` has no effect.
     * Ignored in single mode (`singleId`), which already renders a single expanded card.
     */
    fullpage?: boolean;
    /**
     * Filter groups of the panel, in display order. **Without this option the component has no
     * filters at all**: no panel, no filter button and no filter params in API mode. Nothing is
     * hardcoded, so a new filter is added here —or sent by a backend through `GET {url}/facets`—
     * without rebuilding the library.
     *
     * Each entry needs a `field` and a `label`; `type` picks the control (`'checkboxes'` by
     * default, or `'select'` for a field with many values, which takes the full width of the panel).
     * A group that declares `items` shows exactly those values, in that order, and
     * can preset them with `checked`; a group without them derives the values from the data (the
     * items of the selected taxonomy, or the facets in API mode). In both modes the values travel in
     * API mode as `field=<csv>` with the very tokens the checkboxes carry in the DOM. See
     * [TimelineFilter](#timelinefilter) and [Filtros configurables](#filtros-configurables).
     */
    filters?: TimelineFilter[];
    /**
     * Sort options of the toolbar, in display order. **Without this option the component renders no
     * sort UI at all** —no button, no menu—: like `filters`, nothing is hardcoded. The timeline is
     * still ordered by `fecha_publicacion` descending, which is the built-in default order.
     *
     * The button opens a menu with a radio per entry and a direction switch ("más reciente primero"
     * / "más antiguo primero"). One entry can be marked with `default: true` to be the one selected
     * on mount; without it the first declared entry is. The order is resolved locally in local mode,
     * and travels as the `sort` + `sortBy` params in API mode.
     */
    sorters?: TimelineSorter[];
    lastUpdated?: string;
    /**
     * Items shown per page. `0` disables the batch pagination: every matching item is rendered
     * at once and no "Cargar más" button is shown.
     */
    itemsPerPage?: number;
    /**
     * Numeric pagination (default: false). When `true` the "Cargar más" button is replaced by a
     * paginator — "‹ Anterior | Página X de Y | Siguiente ›" — that jumps between fixed-size pages
     * instead of appending them, in local mode and in API mode alike. `itemsPerPage` is the size
     * of every page, and `0` still means "no pagination" (no paginator, no button).
     *
     * Because the pages are disjoint, the current page always shows exactly `itemsPerPage` items
     * (less on the last one), which is what the API mode already sends per request.
     *
     * Ignored in single mode (`singleId`), which renders a single expanded card.
     */
    pagination?: boolean;
    inlineImages?: boolean;
    inlineAdjuntos?: boolean;
    internalButtons?: boolean;
    /**
     * Base raster del mapa de los temas, como plantilla de tiles XYZ con `{z}` / `{x}` / `{y}`.
     *
     * **Sin esta opción el mapa usa la capa estándar pública de OpenStreetMap.** Es lo que hace que
     * un mapa se vea como un mapa y no como un canvas vacío; el punto cae sobre el mismo fondo que
     * usa el resto del componente, que es indistinguible de un mapa roto. Para dejarlo sin base,
     * pasá `''` explícito.
     *
     * Ojo con los placeholders: `ol/uri.js` sustituye **solo** `{z}`, `{x}`, `{y}` y `{-y}`. El `{r}`
     * de retina que usan Leaflet y la documentación de Stadia no está, y queda literal en la URL — el
     * mapa pide `/5{r}.png` y cada tile da 404.
     *
     * La capa estándar es para tráfico bajo, que es lo que pide su política de uso. Un consumidor con
     * volumen real tiene que apuntar esto a su propio servidor de tiles —y es también lo que no puede
     * decidir el componente, que no pide ni pide saber una API key.
     *
     * Ej.: `'https://tiles.miservidor.com/tiles/{z}/{x}/{y}.png'`.
     *
     * Irrelevante para las tarjetas sin temas con `geom`: no hay sección que mostrar.
     */
    temasMapTiles?: string;
    /**
     * Crédito de la capa base del mapa de los temas, como texto (con HTML: el crédito es un link a las
     * condiciones del proveedor). Por defecto es el de OpenStreetMap.
     *
     * **Es la atribución de la capa que se está mostrando, no una etiqueta fija**: la capa base se
     * declara en `temasMapTiles`, así que la de OpenStreetMap solo corresponde mientras siga siendo la
     * que se usa. Un consumidor con su propio servidor de tiles tiene que poner acá su propio crédito
     * —o `''` explícito si su capa no necesita ninguno— porque si no queda la atribución de
     * OpenStreetMap creditando tiles que no son suyos.
     *
     * `''` **no muestra nada**: no es una cadena vacía en el pie del mapa, es directamente la ausencia
     * del control de atribución, para que tampoco quede el recuadro vacío de OpenLayers.
     *
     * Ojo: se inyecta como HTML (no se escapa), igual que el valor por defecto, para que el crédito
     * pueda ser un link.
     *
     * Irrelevante para las tarjetas sin temas con `geom`: no hay sección que mostrar. Con
     * `temasMapTiles: ''` tampoco: sin capa base no hay tiles que acreditar, así que no se muestra
     * (que es lo que ya pasaba antes de que existiera esta opción).
     */
    temasMapAttribution?: string;
    /**
     * Vista de mapa general (default: false): agrega un botón en la barra de herramientas que
     * reemplaza el timeline por **un solo mapa con los puntos de todo lo que hay en pantalla**, en
     * lugar de un mapa por tarjeta.
     *
     * El punto es un tema con `geom` —el mismo que el mapa de la tarjeta— y el color es el de su
     * tono, así que el mapa general se lee como la unión de los mapas de las tarjetas. Los puntos
     * corresponden al **scope filtrado**: búsqueda, filtros y taxonomía los narrowean igual que a la
     * lista, y por lo tanto un cambio de cualquiera de ellos vuelve a pedir los puntos y a ajustar la
     * vista. Un tema sin `geom` no aporta punto, como en el mapa de la tarjeta.
     *
     * Un círculo por tema, **sin número**: el número del mapa de la tarjeta apunta al badge del tema
     * en la lista de arriba, y acá no hay lista. El hover es lo que nombra cada punto, con el título
     * del tema y el titular del artículo.
     *
     * Los superpuestos se apartan con el mismo agrupamiento del mapa de la tarjeta, así que hacer
     * zoom separa lo que se ve amontonado.
     *
     * En modo API los puntos **no** salen de la lista paginada (que no lleva `temas`, solo llegan con
     * `GET {url}/:id`): se piden con `GET {url}/points`, un endpoint propio. Es el único punto donde
     * hace falta, así que sin la opción no hay request nuevo ni carga de `ol`.
     *
     * No tiene nada que ver con `fullpage`: se puede usar con o sin él. Combinado con `fullpage` el
     * mapa toma el alto que queda bajo la barra pegada; sin él, uno fijo.
     *
     * No aplica a single mode (`singleId`), que ya renderiza una única tarjeta expandida.
     */
    showFullMap?: boolean;
    /**
     * Keep the state of the view in the browser URL (default: false), so the address bar is a
     * shareable link: whoever opens it sees the same search, filters, order, taxonomy and page.
     *
     * It mirrors the query params of API mode, under the `tv_` prefix to stay clear of the params of
     * the consumer: `tv_q` for the search, `tv_<field>` per filter group with its active values as
     * CSV (the very tokens the API receives), `tv_sortBy` + `tv_sort`, `tv_tax` (the **label** of the
     * taxonomy, not its index, which is not stable across deploys) and `tv_page`, which only travels
     * with `pagination: true` because with "Cargar más" the loaded prefix is not a page.
     *
     * The URL is read **once**, before the first render, and written with `history.replaceState` after
     * every change: it is a snapshot of the view, not a navigation log, so there is no back button
     * and `popstate` is not listened to.
     *
     * What the URL says that this instance cannot do is **ignored, silently**: a filter the consumer
     * did not declare (the usual case: the shared link carries the internal filters of someone who has
     * permissions and the person opening it does not), a value that no longer exists, an order or a
     * taxonomy that is not there, a page out of range. Nothing is warned about and nothing breaks;
     * a group whose tokens leave nothing active simply does not filter, instead of matching nothing
     * and emptying the list.
     *
     * Ignored in single mode (`singleId`), which has no view to share.
     */
    stateInUrl?: boolean;
    /**
     * Label of the expand toggle for the given count.
     * The count is the total number of publications, independent of the selected taxonomy.
     * The returned string is injected as HTML (it is not escaped), so it can contain markup
     * (e.g. `'artículos relacionados sobre <b>Plan Integral</b>'`).
     * Escape any untrusted value before returning it.
     */
    relatedLabel?: (count: number) => string;
    singleId?: string;
}
interface ImageInfo {
    thumb: string;
    full: string;
}
interface LinkInfo {
    url: string;
    type: 'youtube' | 'instagram' | 'twitter' | 'facebook' | 'video';
}
/**
 * Controls a filter group can be rendered with.
 *
 * - `'checkboxes'`: one checkbox per value, with the "Ver más (N)" cut for the long lists.
 * - `'select'`: a trigger that carries the selected values and a searchable list opening below it.
 *   It takes the full width of the menu, above the columns, and it is the control to declare for a
 *   field with a long or open value list (hundreds of values).
 *
 * Both render the same values, resolved the same way (see `TimelineFilter`): only the control
 * changes. `maxVisible` is the one option that only applies to `'checkboxes'`.
 */
export type FilterType = 'checkboxes' | 'select';
/** Where a filter group is rendered: a column of the panel, or the internal-filters flyout */
export type FilterGroup = 'menu' | 'filtros_internos';
/**
 * A raw value of the column a filter group filters by: what the item actually holds, with its own
 * type. `null` is a value of its own ("the item does not carry this"), which is why an option can
 * declare `value: [false, null]` to group "no" and "nothing" into a single checkbox.
 */
export type FilterValue = string | number | boolean | null;
/** One checkbox of a filter group, as declared in `TimelineFilter.items` */
export interface TimelineFilterItem {
    /**
     * Value of the item column this checkbox matches, or an array of them to match any of several
     * (e.g. `[false, null]` for "Sin validar"). Both sides go through `String()`, so the declared
     * value only has to be the one the item carries: `true` matches `true` and `'true'`, and `null`
     * matches a `null` field and a field the item does not have at all.
     *
     * An array is joined by commas into the token the checkbox carries in the DOM and the query
     * param of API mode, so a declared value must not contain a comma.
     */
    value: FilterValue | FilterValue[];
    /** Text of the checkbox. Escaped before being injected into the markup. */
    label: string;
    /**
     * Checked when the group is built (default: false). It travels in the first request in API mode,
     * and a `persist` group starts from it until the user changes something.
     */
    checked?: boolean;
}
/**
 * One filter group of the panel, as declared by the `filters` option of the constructor.
 * See [TimelineOptions.filters](#timelineoptions) for how the values are resolved in each mode.
 */
export interface TimelineFilter {
    /**
     * Name of the field the group filters by. In local mode it is a field of `TimelineItem` (or a
     * synthetic name when `extract` is given); in API mode it is the key the server uses in
     * `GET {url}/facets`, which is also the query param the active values are sent in.
     */
    field: string;
    /**
     * Header of the group. Escaped before being injected into the markup.
     *
     * Optional: `null`, `''` and a blank string are the same thing — the group is declared and
     * rendered all the same, just without a header. A `'filtros_internos'` group with no label is
     * the normal case for a flyout that holds a single group (its values are self-explanatory, or
     * the button title already says what the flyout is).
     */
    label?: string | null;
    /** Control of the group. Defaults to `'checkboxes'`; any other value drops the group. */
    type?: FilterType;
    /**
     * Accept several values at once in a `'select'` group (default: true). With `false` it is a
     * classic single-value select: picking a value replaces the previous one, and picking it again
     * clears it.
     *
     * Only applies to `'select'`; a `'checkboxes'` group is multi-value by construction.
     */
    multiple?: boolean;
    /**
     * Search box on the list of a `'select'` group. By default it appears only when the group has
     * more values than `FILTER_SELECT_SEARCH_MIN`, which is the point of the control: with hundreds
     * of values the list is unusable without it. Force it either way with `true` / `false`.
     *
     * The search filters the values already in memory, so it costs nothing on a long list. Ignored
     * by a `'checkboxes'` group.
     */
    searchable?: boolean;
    /**
     * `'menu'` (default) renders the group in a column of the panel, `'filtros_internos'` renders it
     * in the internal-filters flyout, which is part of the internal toolbar and therefore needs
     * `internalButtons: true`. A `'filtros_internos'` group without it is not rendered.
     */
    group?: FilterGroup;
    /**
     * The values of the group, in the order they are rendered. When given, the group exists even if
     * no item (or no facet) carries a value for it, and its options are exactly these: a value the
     * data has and the declaration does not match no checkbox at all. Without it the values are
     * derived from the data (the items of the active scope, or the facets in API mode).
     */
    items?: TimelineFilterItem[];
    /**
     * Offer the items that carry no value for the field (`null`, or the field missing) as one more
     * value of a group that declares no `items` (default: false). It gets the fixed label
     * "Sin valor" and is always the last value of the group, whatever the order of the others
     * (`sortValues` and the count order included), so the bucket reads as a category of its own and
     * not as one more datum. Ignored when `items` declares the values: there the empty bucket is
     * just another declared item (`{ value: null, label: 'Sin tipo' }`).
     *
     * The option appears only when the data (or the facets, in API mode) has such items, and it
     * travels as any other value, so `field=null` in a query param and `null` in `localStorage`.
     */
    allowEmpty?: boolean;
    /**
     * Persist the checked values of the group in `localStorage` (default: false), so they survive
     * the rebuilds of the checkboxes (the API facets, a taxonomy re-scope) and the page loads.
     */
    persist?: boolean;
    /**
     * Values shown before the "Ver más (N)" toggle appears (default: 5). Below 2: all of them.
     * Ignored by a `'select'` group: its list scrolls and searches instead of truncating.
     */
    maxVisible?: number;
    /**
     * Values of the group carried by an item. Defaults to reading `item[field]`: arrays are
     * expanded, and `null` / `undefined` count as the `'null'` value (the option that declares it).
     * Use it for fields that need a canonical value (a boolean split in two, a date reduced to its
     * year) or for synthetic fields that are not a property of the item.
     */
    extract?: (item: TimelineItem) => string | string[];
    /**
     * Label shown for a value of a group that declares no `items` (a derived one). Defaults to the
     * value itself, except `true` → "Sí" and `false` → "No" so a boolean field does not read as
     * raw `true` / `false`.
     */
    formatLabel?: (val: string) => string;
    /**
     * Explicit order of the values. A group that declares one keeps it when the long list is
     * truncated (instead of leading with the values that filter the most).
     */
    sortValues?: (a: string, b: string) => number;
    /**
     * Render the values the card shows for `field` as clickable chips (default: false), so the user
     * can filter from the card itself. Clicking one drops **every** other active group **and the
     * search term**, and leaves only that value — it is not a toggle: clicking it again just applies
     * the same state, so a "filter by this actor" gesture always reads the same.
     *
     * The group itself still decides how the value reads (`items` labels, `allowEmpty`, the facets of
     * API mode...); the card only needs `field` to be the one its own chips come from (today,
     * `actores_principales`). A group without it keeps the card as plain text, and in single mode
     * there are no chips at all: there is no panel to sync with.
     */
    cardClickable?: boolean;
}
/** A `TimelineFilterItem` resolved: the token of the checkbox and the tokens it matches */
interface FilterDefItem {
    /** The DOM value and the query param value: the declared values joined by commas */
    token: string;
    /** The same values one by one, to compare against what an item carries */
    tokens: string[];
    label: string;
    checked: boolean;
}
/** A `TimelineFilter` normalized for rendering: defaults resolved and the DOM slot attached */
interface FilterDef extends Omit<TimelineFilter, 'type' | 'group' | 'persist' | 'items' | 'allowEmpty' | 'label' | 'multiple' | 'searchable' | 'cardClickable'> {
    type: FilterType;
    group: FilterGroup;
    persist: boolean;
    /** The header of the group, normalized: `''` when the declaration brings none (so no header renders) */
    label: string;
    /** Add the "Sin valor" option to a group that derives its values (see `TimelineFilter`) */
    allowEmpty: boolean;
    /** Several values at once in a `'select'` group. A no-op for `'checkboxes'`. */
    multiple: boolean;
    /** Search box of a `'select'` list. `undefined` = auto (only above `FILTER_SELECT_SEARCH_MIN`) */
    searchable: boolean | undefined;
    /** The card renders the values of this field as clickable chips (see `TimelineFilter.cardClickable`) */
    cardClickable: boolean;
    /** Column of the panel the group is rendered in. `0` for the `'filtros_internos'` flyout, ignored there */
    column: number;
    /** The `.filter-options` box of a `'checkboxes'` group, its container to draw the values in */
    options: HTMLElement;
    /**
     * Tokens of the group the user has picked, and the **only** source of truth for "is anything
     * active": the query params, the persisted state, the local match and the lit toggles all read
     * this, so a `'select'` group participates in them without pretending to have checkboxes.
     */
    active: Set<string>;
    /** The checkboxes of a `'checkboxes'` group, empty in a `'select'` one (whose control is not a list of boxes) */
    checkboxes: HTMLInputElement[];
    /** The declared options resolved, or `undefined` for a group that derives its values */
    declared?: FilterDefItem[];
    /** The control of a `'select'` group, or `null` for a `'checkboxes'` one */
    select: FilterSelect | null;
}
/** A `TimelineSorter` normalized for rendering: `default` resolved to a boolean */
interface SortDef {
    field: string;
    label: string;
    default: boolean;
}
/**
 * One row of the list of a `'select'` group. Just the node: what the search matches against is
 * `FilterSelect.haystacks`, which covers every value and not only the rendered ones.
 */
interface FilterSelectOption {
    el: HTMLElement;
}
/** The DOM of a `'select'` group, plus the state that only it uses */
interface FilterSelect {
    /** The `.filter-select` box, the handle the component looks its group up by */
    root: HTMLElement;
    /** The button that opens the list and carries the chips of the active values */
    trigger: HTMLElement;
    /** Where the chips go, so `_renderSelectTrigger` only has to rewrite one box */
    value: HTMLElement;
    panel: HTMLElement;
    /**
     * The rendered rows, by token. **Not** every value: only the ones inside the window (see
     * `matches` / `shown`), because that is the point of the window.
     */
    options: Map<string, FilterSelectOption>;
    /** The list of the values, built on the first open instead of with the panel */
    list: HTMLElement;
    /** The search box, when the group has enough values for it to earn its place */
    search: HTMLInputElement;
    /** The "Limpiar" button and the "N seleccionados" text */
    clear: HTMLButtonElement;
    footerCount: HTMLElement;
    /** The "Sin resultados" line, shown when the search leaves nothing */
    empty: HTMLElement;
    /** Values to show, by token, from the last resolution. Held here because the list is lazy */
    values: string[];
    counts: Record<string, number>;
    /**
     * Folded `label + ' ' + token` of every value, parallel to `values`. Built on the first open and
     * kept for the whole life of the list, which is what lets the search match values that are not
     * rendered: without it, a match outside the window would be invisible to the search.
     */
    haystacks: string[];
    /** Values that match the current search, in display order. The window is a slice of this */
    matches: string[];
    /** How many of `matches` are rendered right now */
    shown: number;
    /** Labels of `values`, resolved on demand instead of up front */
    labels: Map<string, string>;
    /** False until the first open. The whole point of the control: 500 rows are not in the DOM yet */
    built: boolean;
    /** False until the listeners of the control are bound, which happens on the first build only */
    bound: boolean;
    /** The current search, so a rebuild of the list can apply it again */
    query: string;
    /** Token of the option the arrow keys are on, or `''` when they are not on any */
    cursor: string;
}
export default class Timeline {
    container: HTMLElement;
    items: TimelineItem[];
    featured_count: number;
    lastUpdated: string;
    itemsPerPage: number;
    pagination: boolean;
    inlineImages: boolean;
    inlineAdjuntos: boolean;
    internalButtons: boolean;
    /**
     * Template of the raster base layer of the topics map, `''` meaning no base at all. Defaults to
     * the public OpenStreetMap standard layer; read from the options, while the map itself is built
     * lazily, the first time someone opens one.
     */
    temasMapTiles: string;
    /**
     * Credit of the base layer, `''` meaning no attribution at all —and, with it, no attribution
     * control on the map. Read from the options along with the tiles, because it describes them: it
     * is the credit of *those* tiles, so the default (OpenStreetMap) only holds while the default
     * template does. It is empty for nothing by itself, it is just that a consumer whose tiles need
     * no credit is the one case the map cannot guess.
     */
    temasMapAttribution: string;
    /**
     * General map (`showFullMap`): whether the toolbar button that swaps the timeline for one map with
     * every point on screen is rendered at all.
     */
    showFullMap: boolean;
    /** Null when `showFullMap` is off, or in single mode: no button means no view either */
    fullMapToggle: HTMLElement | null;
    fullMapView: HTMLElement | null;
    fullMapCanvas: HTMLElement | null;
    fullMapStatus: HTMLElement | null;
    /** The panel that holds the summary card of the clicked point, over the map */
    fullMapDetail: HTMLElement | null;
    /**
     * Whether the general map is the thing on screen. It is the one state of the view that is neither
     * "collapsed" nor "expanded": the timeline is `hidden` while the map is up, and the toolbar keeps
     * working over it —which is the whole point, because the filters that scope the map are in the same
     * toolbar.
     */
    _fullMapOpen: boolean;
    /**
     * Live general map, if it is mounted. Kept apart from `_temasMaps` on purpose: that one is wiped
     * by `_destroyTemasMaps` on every re-render of the timeline, and this map has to survive all of
     * them —it is not on screen anymore to be rebuilt.
     */
    _fullMapHandle: TemasMapHandle | null;
    /** Last points resolved for the general map, kept only to tell "still loading" from "no points" */
    _fullMapPoints: FullMapPoint[];
    /**
     * Monotonic counter of the point resolutions, so a response that arrives after a newer filter
     * change does not paint the map of a view that no longer exists. Same trick as `_apiSeq`.
     */
    _fullMapSeq: number;
    /**
     * Id of the article whose card the general map panel is showing, or `null` when it is closed.
     *
     * Un *artículo*, no un punto: un artículo con varios temas ubicados llega por cualquiera de sus
     * markers y el panel muestra el artículo entero. Sirve para descartar la respuesta de una ficha
     * que ya no es la abierta (el artículo cambió mientras se esperaba la API) y para saber si hay algo
     * que cerrar. Lo que distingue un punto de otro del mismo artículo es `_fullMapSelectedKey`.
     */
    _fullMapCardId: string | null;
    /**
     * Key of the **topic** whose point is open in the panel, or `null`. It is lo que distingue "el mismo
     * artículo ya abierto" de "este artículo, en este tema": clickear dos puntos del mismo artículo no
     * puede ser un no-op, porque lo que cambia es el tema que se scrollea y resalta. La composición es el
     * id del artículo más el `id_subtema`, que es lo único que un backend puede no mandar (ausente →
     * `''`) y aun así ser único por punto.
     */
    _fullMapSelectedKey: string | null;
    /**
     * OpenLayers modules, loaded once the first time a topics map is opened. `null` until then:
     * **never imported eagerly**, so a page without topics that carry a `geom` does not resolve
     * the peer dependency at all — same reason the social embed SDKs are loaded on demand
     * (`_preloadEmbedLibraries`). The promise is cached even when it rejects, so a consumer
     * without `ol` installed does not retry the failed import on every click.
     */
    _olModules: Promise<TemasMapModules> | null;
    /**
     * Live topics maps, keyed by the container they render into. Needed because the cards are wiped on
     * every re-render (a search, a filter, a sort, a page change) and dropping the DOM node does
     * **not** dispose the map: it keeps its canvas, its listeners and its tile source alive.
     * `_destroyTemasMaps` is called from the two places that empty `#timeline-cards` for exactly that
     * reason. The handle carries the hover overlay too, which `Map.dispose()` does not take with it.
     */
    _temasMaps: Map<HTMLElement, TemasMapHandle>;
    stateInUrl: boolean;
    /**
     * Filter state read from the URL, keyed by `field`, with the same CSV the API params use. `null`
     * when `stateInUrl` is off. It outlives the read: `_seedFilterActive` consults it on every rebuild
     * of the checkboxes (the API facets, a taxonomy re-scope), which is what keeps a filter shared by
     * URL from being wiped by a rebuild the way a non-`persist` one is.
     */
    _urlFilters: Record<string, string[]> | null;
    /** Page asked for by the URL, 1-based. `1` when there is none to ask for */
    _urlPage: number;
    /** Whether the component already mounted, which is what gates writing the URL */
    _urlReady: boolean;
    fullpage: boolean;
    relatedLabel: ((count: number) => string) | null;
    singleId: string | null;
    content: ContentGroup[];
    /** Index of the selected group, or `ALL_TAXONOMIES_INDEX` when "Ver todo" is selected */
    _contentIndex: number;
    taxonomyRow: HTMLElement;
    taxonomySelectWrap: HTMLElement;
    taxonomySelectLabel: HTMLElement | null;
    taxonomySelectCount: HTMLElement | null;
    taxonomySelect: HTMLSelectElement | null;
    _displayedCount: number;
    /**
     * Current page of the numeric paginator, 1-based, in local mode. The API mode has its own
     * cursor (`_apiPage`), which the server owns, so it does not share this one.
     */
    _page: number;
    allCards: TimelineItem[];
    _featuredCards: TimelineItem[];
    /**
     * Featured stack of the first page in API mode + `pagination`, kept so that navigating away
     * from page 1 leaves the collapsed stack alone. In API mode the stack is built from the items
     * in memory, which with a paginator are the ones of the page being shown, so without this the
     * collapsed stack would silently become "the featured of whatever page you are on".
     */
    _apiFeaturedCards: TimelineItem[];
    isExpanded: boolean;
    featuredContainer: HTMLElement;
    featuredRow: HTMLElement;
    timelineContainer: HTMLElement;
    timelineCards: HTMLElement;
    resizeHandle: HTMLElement;
    expandToggle: HTMLElement;
    remainingCount: HTMLElement;
    expandIcon: HTMLElement;
    section: HTMLElement;
    /** Null when the `sorters` option declares no entry, in which case no sort button is rendered */
    sortToggle: HTMLElement | null;
    sortMenu: HTMLElement | null;
    sorters: SortDef[];
    /** Field the timeline is ordered by: the active sorter, or `fecha_publicacion` when there is none */
    _sortField: string;
    /** Direction of the order: `false` (default) is descending, "más reciente primero" */
    _sortAsc: boolean;
    workNotesToggle: HTMLElement;
    /** Null when the `filters` option declares no group, in which case the panel is not rendered */
    filterToggle: HTMLElement | null;
    filterMenu: HTMLElement | null;
    /** Null when `internalButtons` is off or no group is declared for the `filtros_internos` flyout */
    filtrosInternosWrap: HTMLElement;
    filtrosInternosToggle: HTMLElement;
    filtrosInternosMenu: HTMLElement;
    filters: FilterDef[];
    /**
     * Filter groups whose "Ver más" the user opened. Kept out of the DOM on purpose: the
     * checkboxes are rebuilt (once more when the API facets land, and on every taxonomy
     * re-scope), and the state should survive that the way the taxonomy toggles do.
     */
    _filterExpanded: Set<string>;
    searchWrap: HTMLElement;
    searchInput: HTMLInputElement;
    searchTerm: string;
    _lgInstance: LightGallery | null;
    _lgContainer: HTMLElement | null;
    api: TimelineApiConfig | null;
    _apiPage: number;
    /** Total filtrado de la última página pedida (`total` de la lista): paginación y status */
    _apiTotal: number;
    /** Total de la colección sin `q` ni filtros (`total` de `/facets`): contador del botón de expandir */
    _apiCollectionTotal: number;
    _apiFacets: Record<string, Record<string, number>>;
    /**
     * Texto a mostrar de cada valor de los facets, por campo y por token (el `labels` de `/facets`).
     * Vive aparte de `_apiFacets` porque contar y mostrar son dos cosas: el token es la clave que se
     * filtra y el label solo se lee, así que un backend puede mandar cualquiera de los dos. Vacío en
     * modo local, donde los labels salen de la declaración del cliente.
     */
    _apiFacetLabels: Record<string, Record<string, string>>;
    _apiFacetsPromise: Promise<void> | null;
    _apiLoading: boolean;
    _apiSeq: number;
    _apiReloadTimer: number;
    _apiFacetsLoaded: boolean;
    /**
     * El pedido de facets ya terminó, con respuesta o con fallo. Distingue "todavía no sabemos si
     * hay filtros que mostrar" de "ya sabemos que no hay": mientras es `false` el botón de filtros
     * se muestra igual, sin listener, para que el toolbar no cambie de ancho a mitad de carga.
     */
    _apiFacetsSettled: boolean;
    _apiError: string;
    _apiDetails: Map<string, TimelineItem | null>;
    _shareTimer: number;
    constructor(config: TimelineOptions);
    /**
     * Normalize the `content` option: drop groups without a label or without items.
     * An empty result means the component falls back to the legacy flat `items` list.
     */
    protected _normalizeContent(content: ContentGroup[] | undefined): ContentGroup[];
    /**
     * Normalize the `filters` option into the groups the panel renders.
     *
     * Nothing is hardcoded, so an absent or invalid option simply yields no groups: the panel and
     * its button are not rendered at all, and in API mode no filter param is sent. Entries that
     * cannot be rendered —no `field`, a `type` that is not supported yet, or a `field` already
     * declared— are dropped with a warning instead of breaking the mount, because a group that
     * renders nothing is far harder to notice than a line in the console.
     *
     * A missing or blank `label` is not one of them: the group is rendered without a header, which
     * is a decision the consumer took and not a broken declaration.
     *
     * The `'menu'` groups are then dealt out to the columns of the panel: the first half goes to
     * the first column and the rest to the second, which reads a declaration top to bottom down
     * the first column and then along the second. A `'select'` group is left out of that deal: it
     * does not live in a column but takes the full width above them, so the cut does not shift
     * because of it.
     */
    protected _normalizeFilters(filters: TimelineFilter[] | undefined): FilterDef[];
    /**
     * Resolve the `items` a filter group declares into the tokens the checkboxes carry. Returns
     * `null` (after warning) when the declaration is unusable: not a list, empty, an entry without a
     * `label` or without a `value`, or two entries that would share the same token.
     *
     * The token of an entry is what lands in the DOM (`input.value`) and in the query param of API
     * mode: the declared values joined by commas. The same values one by one are what an item is
     * compared against, so `[false, null]` is one checkbox that matches either.
     */
    protected _resolveFilterItems(field: string, items: TimelineFilterItem[]): FilterDefItem[] | null;
    /** Report a group of the `filters` option that was dropped, so a typo does not go unnoticed */
    protected _warnFilter(index: number, reason: string): void;
    /**
     * Normalize the `sorters` option into the options the menu renders. Like `filters`, nothing is
     * hardcoded: an absent or invalid option simply yields no options, and then the component renders
     * **no sort UI at all** —the timeline keeps its built-in `fecha_publicacion` descending order—.
     *
     * Entries without a `field` or a `label`, and two entries sharing the same `field`, are dropped
     * with a warning instead of breaking the mount: a broken entry is a runtime typo far easier to
     * spot in the console than as an option that silently does not appear.
     */
    protected _normalizeSorters(sorters: TimelineSorter[] | undefined): SortDef[];
    /** Every item of every taxonomy, used by the featured stack, the counter and single mode */
    protected _allItems(): TimelineItem[];
    /**
     * Items of the currently selected taxonomy, or every taxonomy when "Ver todo" is selected.
     * Falls back to the legacy flat `items` list when no group is configured.
     */
    protected _scopeItems(): TimelineItem[];
    /**
     * Order a copy of the items by the active sorter (`_sortField` + `_sortAsc`).
     *
     * The comparison is natural (`Intl.Collator` with `numeric`): ISO dates (`YYYY-MM-DD`) and
     * zero-padded ids (`FUE-00001`) both sort correctly as plain strings, so no per-field logic is
     * needed. An item that carries no value for the field is the smallest value, which puts it first
     * in `asc` and last in `desc` —the same places the undated items took before—. The sort is
     * stable, so ties keep their source order in **both** directions, exactly as the API server does.
     */
    protected _sortBy(items: TimelineItem[]): TimelineItem[];
    /** Comparable text of an item for the active sorter; a missing value compares as `''` (smallest) */
    protected _sortValue(item: TimelineItem): string;
    /**
     * Number of items of the active scope, shown next to the taxonomy label.
     * The selector is a scope, not a filter, so this is the raw size of the group
     * (or of the whole pool for "Ver todo") and never reacts to the checkboxes.
     */
    protected _scopeCount(): number;
    /**
     * Markup of a group of the `filters` option: a `.filter-section` with its optional header and
     * the empty `.filter-options` box the checkboxes are built into, tagged with the field it
     * belongs to.
     *
     * Both groups of the panel (`.filter-menu`) and the ones of the internal-filters flyout
     * (`.filtros-internos-menu`) render the same section, so a `filtros_internos` group shows its
     * `label` like a `'menu'` one. The header is emitted only when the declaration brings a label:
     * with `label: null` / `''` the group is drawn without it, which is what a single-group flyout
     * wants (the values speak for themselves under a button that already says what it is).
     *
     * The `id` is only a handle for debugging: the component looks the box up by the
     * `data-filter-field` attribute, so a `field` with characters that are not valid in a CSS
     * selector cannot break the wiring. `data-filter-field` is also the stable hook for a
     * consumer's own tests.
     *
     * A `'select'` group keeps the same `.filter-section` and the same header — it is the *control*
     * that changes, not how the group reads — and replaces the `.filter-options` box by the
     * `.filter-select` one, whose list is built later (`_ensureSelectOptions`).
     */
    protected _buildFilterOptionsHtml(f: FilterDef): string;
    /**
     * Markup of the control of a `'select'` group: the trigger that opens the list and carries the
     * values the user picked, and the panel that holds the search box, the values and the footer.
     *
     * The list itself is **not** in here: a field with hundreds of values would put hundreds of
     * nodes in the DOM from the start, and they would sit there on every rebuild. `_ensureSelectOptions`
     * builds them on the first open, which is also why `f.values`/`f.counts` are held on the
     * `FilterSelect` and not re-derived from the DOM.
     *
     * `aria` is wired as a combobox that owns a listbox: the trigger says if it is open, and the
     * active values are `aria-selected` options. The search box is emitted without its own value
     * because whether it appears depends on how many values the group ends up with, which is only
     * known once they are resolved (`_setupSelectSearch`).
     */
    protected _buildFilterSelectHtml(f: FilterDef): string;
    /**
     * Markup of the filter panel, or an empty string when no group is declared for it: with no
     * `filters` option the component has no filter UI at all, not a hidden one.
     * The columns come from the `column` that `_normalizeFilters` dealt out, in the order the
     * groups were declared, so the declaration reads down the first column and then along the
     * second. A `'select'` group is not in a column: it goes in a full-width block above them, in
     * the order it was declared, because it is the control for a field with many values and it has
     * to read as the first thing in the panel rather than as one more group among the others.
     */
    protected _buildFilterMenuHtml(): string;
    /**
     * Markup of the sort control, or an empty string when the `sorters` option declares no entry:
     * without `sorters` the component has **no sort UI at all**, not a hidden one. The button opens
     * a menu shaped like the filter panel: one radio per sorter and one radio per direction. The
     * direction is global (not per sorter), so the two radios are a fixed pair, not a list.
     */
    protected _buildSortMenuHtml(): string;
    /**
     * Markup of the internal toolbar: the work-notes toggle plus, when at least one group is
     * declared for it, the `filtros_internos` flyout. Without the latter the button would open an
     * empty menu, so both of them are conditional on the `filters` option as well.
     *
     * A `'select'` group of the flyout gets the same full-width block above the checkbox groups
     * that it gets in the panel: the layout is a property of the control, not of the destination.
     */
    protected _buildInternalButtonsHtml(): string;
    /**
     * Botón de la vista de mapa general, en la barra de herramientas y al lado del buscador: es lo
     * único que cambia **qué** se muestra, y el buscador es lo que acota lo que el mapa muestra.
     *
     * Sin la opción no hay markup, como con `sorters` y `filters`: es el mismo patrón de "lo que no
     * se declara no existe". Reusa el ícono de mapa plegado del botón de la tarjeta
     * (`TEMAS_MAP_TOGGLE_SVG`) porque es la misma acción a otra escala.
     */
    protected _buildFullMapToggleHtml(): string;
    /**
     * La vista del mapa general, hermana de `section.publicaciones-timeline-section` y no adentro del
     * timeline: `.timeline-container` lleva `max-height: 0` mientras está colapsado, así que un mapa
     * ahí no tendría alto en el modo normal. El canvas arranca vacío y sin mapa —`ol` no se importa
     * hasta el primer click— y `#fullmap-status` es donde se avisa que está cargando o que no hay nada
     * que mostrar.
     */
    protected _buildFullMapViewHtml(): string;
    /** Build the main DOM layout and cache element references */
    protected _buildLayout(): void;
    /**
     * Point every group of the `filters` option at the box `_buildLayout` rendered for it.
     * The lookup goes through the `data-filter-field` attribute rather than the id, so a `field`
     * that is not a valid CSS selector identifier still finds its box.
     *
     * The two controls are found the same way and land in different fields: a `'checkboxes'` group
     * in `f.options` (the box it fills with checkboxes), a `'select'` one in `f.select` (the DOM of
     * its control, cached once because every later step of it reads those refs).
     *
     * A group with no box is one whose container was not rendered: a `'filtros_internos'` group
     * without `internalButtons`, for instance. It keeps its configuration (so a later
     * `_buildFilterCheckboxes` just skips it) but has nowhere to draw, exactly as when the flyout did
     * not exist before.
     */
    protected _attachFilterOptions(): void;
    /**
     * Collect the refs of the control of a `'select'` group out of its markup, right after the
     * layout is built. They live on `f.select` instead of being looked up again on every keystroke
     * or click, because the box is never rebuilt: only its list is.
     */
    protected _initFilterSelect(root: HTMLElement): FilterSelect;
    /**
     * Populate the taxonomy selector with the labels of the `content` groups.
     * Nothing is rendered when there are no groups (legacy `items` option) or in API mode,
     * so the layout stays exactly as it was. With a single group the select is shown
     * but disabled, still displaying that group label. With two or more groups a trailing
     * "Ver todo" option is added, which scopes the timeline to the whole pool.
     */
    protected _buildTaxonomySelect(): void;
    /**
     * Sync the two visible spans of the custom select with the selected taxonomy.
     * The `<option>` text carries `label (N)` for screen readers and the native popup,
     * while the pill is split in two: the label crops with an ellipsis and the count
     * never shrinks (it wears the same pill style as `#remaining-count`), so a long
     * taxonomy still shows how many articles it holds.
     */
    protected _syncTaxonomyLabel(): void;
    /** Plain label of the selected taxonomy ("Ver todo" when the whole pool is selected) */
    protected _currentLabel(): string;
    /** Re-scope the timeline, the filters and the counter to the taxonomy picked in the select */
    protected _onTaxonomyChange(): void;
    /** Format a date string (YYYY-MM-DD) to a locale display string */
    protected _formatDate(dateStr: string): string;
    /** Format a full datetime string to a locale display string */
    protected _formatDateTime(dateStr: string): string;
    /** Parse a URL and return embed info based on the supported social platforms */
    protected _parseLinkWeb(url: string): LinkInfo | null;
    /**
     * True when the link points to a video file the browser can play itself, instead of to a platform
     * page. Reuses `_getFileExt`, so a CDN query string (`…/clip.mp4?token=…`) does not break it.
     */
    protected _isDirectVideoUrl(url: string): boolean;
    /** Build the embed markup for a parsed link */
    protected _buildEmbed(embedUrl: LinkInfo): string;
    /** Open a lightGallery modal with the provided images */
    protected _openLightGallery(images: ImageInfo[] | null | undefined, title: string, showFileName: boolean, startIndex?: number): void;
    /** HTML del icono de fuente oficial (edificio) sobre el círculo de acento */
    protected _oficialIconSvg(): string;
    /** Extraer la extensión en minúsculas de una URL, o '' si no tiene */
    protected _getFileExt(url: string): string;
    /**
     * Escapar los caracteres especiales de HTML de un texto plano para poder
     * interpolarlo en markup o en un atributo. Los valores que provienen de la
     * config del consumidor se escapan siempre; para contenido con markup hay que
     * pasar un `HTMLElement`, que se inserta como nodo del DOM.
     */
    protected _escapeHtml(value: string): string;
    /** Codificar con encodeURIComponent el nombre de archivo de una URL, preservando el resto */
    protected _encodeFileName(url: string): string;
    /** SVG del icono de archivo según su extensión (pdf vs genérico) */
    protected _fileIconSvg(ext: string): string;
    /** SVG del icono de enlace externo (el mismo que usa el botón "Visitar") */
    protected _externalLinkIconSvg(): string;
    /**
     * Resolver una URL del ítem contra la location actual. `link_view_entry` viene
     * del pipeline de scraping y puede venir relativa (`/articulos/FUE-00001`), así
     * que hay que absolutizarla para compartir. Si el valor no es una URL válida,
     * `new URL` lanza y se devuelve el valor crudo para no romper el render de la tarjeta.
     */
    protected _absoluteUrl(url: string): string;
    /** SVG del icono de compartir (nodos) */
    protected _shareIconSvg(): string;
    /** SVG del ícono de confirmación (visto al copiar al portapapeles) */
    protected _checkIconSvg(): string;
    /**
     * Compartir la URL de la vista individual: usa la Web Share API cuando está
     * disponible y, si no, copia el enlace al portapapeles. `navigator.share()`
     * se invoca de forma síncrona dentro del click porque el navegador exige
     * activación del usuario para abrir el share sheet.
     */
    protected _shareItem(url: string, title: string, btn: HTMLElement): Promise<void>;
    /** Copiar al portapapeles sin la Clipboard API (contexto no seguro o sin permiso) */
    protected _copyToClipboard(text: string): void;
    /** Mostrar el ícono de confirmación en el botón de compartir por 1.5s */
    protected _flashCopied(btn: HTMLElement): void;
    /** Cartelito "Copiado al portapapeles!" debajo de los botones de la tarjeta */
    protected _showShareToast(btn: HTMLElement): void;
    /** Render the featured (overlapping) cards row */
    protected _renderFeatured(cards: TimelineItem[]): void;
    /** Create a single timeline card element with all its event listeners */
    protected _createTimelineItem(card: TimelineItem, index: number): HTMLElement;
    /** True if the card already carries its full detail payload (local mode) */
    protected _hasDetail(card: TimelineItem | TimelineItemSummary): boolean;
    /** Build the "Actores principales" HTML block */
    protected _buildProtagonistaHtml(card: TimelineItem): string;
    /**
     * The actor list of the block, for the collapsed and the expanded state of `has-more`.
     *
     * With a `cardClickable` group on the field the names are `<button>`s that filter on click (see
     * `_applyCardFilter`), and the token is the value of the group — the very same one the panel
     * filters by, so both stay in sync without the card knowing anything about filters. Without it
     * this is plain text, exactly what the block has always been (only escaped now: the actors come
     * from the scraping pipeline, and they were being interpolated raw).
     */
    protected _buildActorsHtml(actors: string[], showAll: boolean): string;
    /**
     * Bind the filtering chips of an actor list (the block itself, or a list a `has-more` toggle
     * just rebuilt: the nodes it throws away were bound too, and the new ones are not).
     */
    protected _bindActorChips(root: HTMLElement): void;
    /**
     * Bind what the "Actores principales" block has beyond its markup: the chips that filter, and
     * the `has-more` toggle, which swaps the first actors for all of them (re-rendering the list,
     * chips included, instead of writing the raw text like it used to).
     */
    protected _bindProtagonista(root: HTMLElement, card: TimelineItem): void;
    /** Build the "Fuente" HTML block */
    protected _buildFuenteHtml(card: TimelineItem): string;
    /**
     * Build the "Temas destacados" HTML block.
     *
     * The map toggle rides on the block's own header row, next to the subtitle, and the map itself
     * opens **between the header and the topics** — not after the list. Reading the block is
     * "here is where these topics are, and here they are on a map", so the two sit together at the
     * top; a map below a list of ten paragraphs is a scroll away from the title that opened it.
     */
    protected _buildTemasHtml(card: TimelineItem, located: TemasMapPoint[]): string;
    /**
     * A topic's point, or `null` when it does not carry one **or carries a bad one**.
     *
     * The validation is not paranoia about types but about the extent: every point of the card
     * goes into a single `View.fit`, so one `lat: 999` or one `NaN` coming out of the scraping
     * pipeline would drag every other point out of view, not just fail to add one. Out of range
     * is treated exactly like missing, so the topic is still listed above and only skips its marker.
     *
     * The parameter is typed as "anything with a `geom`" and not as an `ItemTema` because it is the
     * same validator for the two sources of points: a topic of a card in memory and a topic of
     * `GET {url}/points`. Both are pipeline data, so both can arrive broken.
     */
    protected _temaGeomOf(tema: {
        geom?: TemaGeom | null;
    } | null | undefined): TemaGeom | null;
    /**
     * The topics of a card that carry a usable point, **in the order they are listed**, each with
     * the number it gets on the map (1-based) and the color of its tone.
     *
     * It is the single pass both the markup and the map are built from, which is what keeps the
     * number on a marker and the number in the legend meaning the same thing: they are indexes
     * into this one list.
     */
    protected _temasLocated(temas: ItemTema[]): TemasMapPoint[];
    /**
     * The button that opens the topics map, for the "Temas destacados" header row.
     *
     * Returns `''` when **no topic carries a usable `geom`**, so an article with nothing to place
     * leaves no dangling control on its header — the same reason the whole block returns `''` without
     * topics.
     *
     * The face of the button is the map icon and nothing else, so the action lives in `aria-label` +
     * `title`. That is not only for screen readers: with an icon-only button there is no visible text
     * left to change between the two states, so the two attributes are the whole state for anyone who
     * cannot see the glyph swap. They carry the action and no count: the number of topics is already
     * on the subtitle next to it, and on the badge each located topic gets.
     *
     * The chevron after the icon is the same arrow as the "Cargar más" button, and it is the only
     * thing on the face of the button that *does* change between states: the component CSS rotates it
     * 180° off the same `aria-expanded` that tints the icon, so the handler has nothing extra to
     * write and nothing to keep in sync. It carries no `aria-label` of its own (`aria-hidden`), since
     * the two text attributes of the button already say what the control does.
     *
     * Pure: it builds markup and binds nothing. The map itself is created on the first open
     * (`_bindTemasMapToggle`), which is what keeps OpenLayers out of the path of a page where nobody
     * ever opened a map.
     */
    protected _buildTemasMapToggleHtml(located: TemasMapPoint[]): string;
    /**
     * The body of the topics map: a small map with one numbered circle per located topic. Sits between the header
     * row and the topic list, hidden until the toggle opens it.
     *
     * There is no legend: the numbered reference of each topic is a badge on the topic itself, in the
     * list right below (`_buildTemasHtml`). A legend repeated the list one scroll away from it and
     * left the topic without its number where a reader looks for it.
     *
     * Returns `''` with no located topic, for the same reason as the toggle: the two are the same
     * "is there a map to show" decision, and emitting one without the other would leave a body that
     * nothing opens.
     */
    protected _buildTemasMapBodyHtml(located: TemasMapPoint[]): string;
    /**
     * Bind the header of a topics map section so it shows and hides its body.
     *
     * Same shape as `_bindTaxonomyToggles`: `aria-expanded` is the source of truth for the state,
     * the `expanded` class on the body is what the component CSS keys on (the UA `[hidden]` rule
     * loses to any author `display`, which is why the SCSS needs its own override), and the `hidden`
     * attribute is kept in sync anyway for the case where the stylesheet is not loaded.
     *
     * Two things differ from the taxonomy toggles, both forced by where this row lives:
     *
     * - It calls `stopPropagation()`. It sits inside `.card-body`, so the click would otherwise
     *   reach the card-wide expand listener and re-expand a card the user had just collapsed. The
     *   taxonomy toggle does not need it only because its block is rendered *inside* an already
     *   expanded card.
     * - The body is not in the markup beyond its empty shell. The first open builds the map, which
     *   is also the first time OpenLayers is imported at all.
     */
    protected _bindTemasMapToggle(slot: HTMLElement, located: TemasMapPoint[]): void;
    /**
     * Import OpenLayers, once. The promise is cached **even when it rejects**, like
     * `_ensureApiFacets`: a consumer without `ol` installed should not pay a failed import on every
     * click of a toggle, and the failure is reported in the map's own place instead.
     */
    protected _loadOpenLayers(): Promise<TemasMapModules>;
    /**
     * Create the map of one card inside `canvas` — a circle per located topic, numbered like the badge
     * it has in the list and colored like its tone, pushed apart when they overlap — with the view
     * fitted to those points, and keep it in `_temasMaps` so it can be disposed when the card
     * goes away. The map itself is `_mountTemasMapOn`, shared with the general one.
     *
     * A card that already has a map is left alone: the toggle can be closed and reopened as many
     * times as wanted without rebuilding it, which would redownload the tiles and throw away
     * whatever pan or zoom the user had done.
     */
    protected _mountTemasMap(canvas: HTMLElement, located: TemasMapPoint[]): Promise<void>;
    /**
     * Arma el mapa de una lista de puntos dentro de `canvas` y devuelve su handle, o `null` si no se
     * pudo armar (sin `ol`, o con el canvas ya desconectado).
     *
     * Es el cuerpo que compartían el mapa de cada tarjeta y el mapa general, y lo único que cambia
     * entre los dos son las cuatro cosas de `options`: el texto del marcador, el markup del hover y
     * las dos clases del canvas. Todo lo demás —capa base, crédito, el `updateSize` antes del `fit`,
     * el `renderSync` antes de agrupar, el agrupamiento de superpuestos y su línea, el hit test del
     * hover— es el mismo código, y duplicarlo es duplicar justo lo que más caro sale mantener: el
     * orden de esas cuatro llamadas.
     *
     * `points` es genérico a propósito: de acá solo se leen `lat`, `lon` y `color`, así que el mismo
     * método monta los `TemasMapPoint` de una tarjeta y los `FullMapPoint` del mapa general sin que
     * ninguno de los dos tenga que saber del otro.
     */
    protected _mountTemasMapOn<P extends TemasMapPlottable>(canvas: HTMLElement, points: P[], options: TemasMapMountOptions<P>): Promise<TemasMapHandle<P> | null>;
    /**
     * Dispose every live topics map. Called from the two places that empty `#timeline-cards`,
     * because dropping a card's DOM node does not dispose its map: OpenLayers keeps the canvas, the
     * listeners and the tile source alive, so without this every search, filter, sort or page change
     * would leak one map per card that had opened its topics map.
     *
     * The overlay is let go of explicitly: it is added to the map, not owned by it, and `Map.dispose()`
     * does not take the overlays with it.
     */
    protected _destroyTemasMaps(): void;
    /**
     * Bind the click of the general map's button. It is a switch between **two views**, not an expand:
     * the timeline goes `hidden` while the map is up and comes back exactly as it was, so nothing
     * about `isExpanded` is touched here —that state belongs to the timeline and only `_toggleExpand`
     * and its two helpers write it.
     * Its pan and zoom are what the user moved, so they are not touched: the map survives the toggle
     * hidden and the view stays where it was left.
     */
    protected _bindFullMapToggle(): void;
    /**
     * Keep the topic panel of the general map below the toolbar.
     *
     * The map view is absolutely pinned inside its section (`top/right/bottom/left: 0` plus an explicit
     * `height: 100vh`) and floats **under** `.featured-row` (the toolbar, `z-index: 2`), so a
     * `max-height` anchored to `100vh` clamps a tall panel right up against the top of the
     * viewport —under the bar, which covers its top and its close button and makes the card unusable.
     * The toolbar's height is not a constant (fullpage pill, collapsed panel, wrap on small screens), so
     * its live bottom is written into a CSS variable that the SCSS reads in the panel's `calc()`. Same
     * measurement as `_scrollToTimelineTop()`, which reads the same row for the scroll target.
     *
     * On a wide viewport (`FULLMAP_DETAIL_TOP_MIN_WIDTH`) the bar does not compete with the panel, so
     * the offset goes to zero and the panel's height is allowed to reach the top of the viewport.
     */
    protected _syncFullMapDetailTop(): void;
    /**
     * Reflect `_fullMapOpen` on the DOM: which of the two views is on screen, and what the button says.
     *
     * The timeline **and** the featured stack go down together: the stack is the collapsed form of the
     * same list, so leaving it up would show two views of the publications at once —and its click is
     * bound to `_toggleExpand`, whose whole job is to bring back the thing the map replaced.
     *
     * Both go with the **attribute**, so `.timeline-container` needs its own `display` rule in the SCSS
     * —the UA `[hidden]` yields to any author `display`, and that rule sets one (see
     * `.taxonomy-row[hidden]` and `.card-taxonomy-extra` for the same reason). `.featured-cards` has no
     * `display` of its own, so the UA rule covers it with no extra rule.
     */
    protected _applyFullMapState(): void;
    /**
     * Resolve the points of the general map and paint them.
     *
     * It is the only trigger, and it runs in three situations: el primer click del botón, y cada
     * cambio del scope filtrado con el mapa ya en pantalla. Con el mapa cerrado no hace nada —ni
     * request, ni `ol`— porque abrirlo vuelve a llamarlo: es el mismo patrón lazy del mapa de la
     * tarjeta, aplicado a la vista entera.
     *
     * Each resolution goes through `_fullMapSeq`, for the same reason `_fetchPage` does it: the answer
     * to an old query arriving after a newer one would paint the map of a view that no longer exists.
     *
     * Con el mapa ya montado no se vuelve a montar: se le cambian los puntos al mapa vivo
     * (`updatePoints`). Reconstruirlo era lo que producía el flash —la capa de tiles se tiraba abajo y
     * volvía a pedir los PNG— y además se llevaba el `View.fit`, con lo que cada cambio de filtro
     * devolvía la vista al centro y perdía el pan y el zoom que el usuario había dejado.
     *
     * El estado de carga sí se escribe cuando ya hay un mapa en pantalla, y solo en API: es el mismo
     * criterio que la lista, donde las tarjetas desaparecen de inmediato y los skeletons toman su lugar
     * (`_renderApiLoading`). Acá no hay silueta que placeholderar, así que el estado es el cartelito
     * centrado de siempre (`FULLMAP_LOADING_TEXT`) y lo que desaparece son los markers: los del filtro
     * que terminó no significan nada para el que está por venir, y dejarlos mientras el server tarda
     * uno o dos segundos sería una mentira con forma de respuesta vieja. La capa de tiles y la vista
     * quedan —eso es justamente lo que `updatePoints` preserva—, así que se lee como "el mapa se está
     * actualizando" y no como "el mapa se rompió". Cierra además la ficha del punto abierto, porque su
     * marker acaba de irse. En modo local no hay nada que esperar (`_fullMapPointsFrom` es síncrono),
     * así que solo se escribe el mensaje si el mapa todavía no existe (ahí sí se espera `ol`).
     *
     * El error y el vacío sí se muestran en los dos casos —en esos dos no hay mapa que dejar en paz:
     * en el vacío hay que tirar los puntos viejos abajo—, y el vacío sigue siendo el único que
     * destruye el mapa.
     */
    protected _refreshFullMap(): Promise<void>;
    /**
     * The points of the general map out of the cards on screen, one per located topic.
     *
     * It reuses `_temasLocated`, so "which topic has a usable point, and what color is its tone" is
     * decided by the same pass in both maps: the general map cannot disagree with the cards about what
     * is located. A `capturado: false` item has no `temas` and so contributes nothing, without needing
     * a special case.
     */
    protected _fullMapPointsFrom(cards: TimelineItem[]): FullMapPoint[];
    /**
     * Los tonos que el mapa general tiene que filtrar **por subtema**, o `null` si no hay filtro de tono
     * activo (o ni siquiera hay grupo de tono declarado).
     *
     * El filtro de la barra es un filtro de artículo —`tonos_sociales` es un array del ítem—: matchea por
     * "este artículo tiene algún tema negativo". Para la lista está bien, porque el artículo es lo que se
     * ve. Para el mapa no: el mapa **no** muestra artículos, muestra subtemas, así que el mismo token tiene
     * que acotar la lista de marcadores a los del tono, o el mapa queda mostrando los positivos y neutros
     * de los artículos negativos.
     *
     * El `Set` sale de `_filterActiveTokens` y no de `_filterActiveValues` a propósito: el segundo devuelve
     * los tokens tal como se declararon, que pueden ser un CSV (el `[null, false]` del "Sin descartar" es un
     * valor, pero varios pueden venir pegados), y comparar contra eso no filtraría nada. `_filterToken` ya
     * normaliza a `String`, así que el `has()` es directo contra el `tono_social` del subtema.
     */
    protected _fullMapToneFilter(): Set<string> | null;
    /**
     * Los puntos del mapa general en modo API, con `GET {url}/points`.
     *
     * The list endpoint cannot answer this: its items are summaries that carry no `temas`, and the
     * geometry only travels with `GET {url}/:id` —so collecting it from the list would mean one request
     * per article. The dedicated endpoint returns one flat point per located topic of the filtered set
     * in a single request, which is the whole reason it exists.
     *
     * The query is the one from `_buildFilterQueryParams`: the search and the filters, with **no**
     * `page`/`pageSize` (there is no page: the map fits everything) and no `sort`/`sortBy` (the map
     * doesn't order). `null` means the request failed, which the caller shows apart from "the filter
     * matched nothing with a location".
     */
    protected _fetchApiPoints(): Promise<FullMapPoint[] | null>;
    /**
     * Mount the general map itself. Same machinery as a card's, with the two differences the scale
     * forces: **no number** in the marker (a global index would point at no list) and a hover with two
     * lines, because without the card there is nothing under the map saying which article a topic
     * belongs to.
     *
     * Both texts are escaped: they come from the pipeline (locally) or from the backend (API), and
     * this is the one hover that goes through `innerHTML` instead of `textContent` —which is also why
     * `_mountTemasMap` escapes its own single title there.
     */
    protected _mountFullMap(canvas: HTMLElement, points: FullMapPoint[]): Promise<TemasMapHandle<FullMapPoint> | null>;
    /**
     * Abrir la tarjeta de un punto del mapa general, en el panel sobre el mapa, y llevar el **tema** del punto a primer plano: la tarjeta se renderiza expandida y scrolleada hasta ese tema,
     * resaltado.
     *
     * "Expandida" y no la versión resumida porque el click dice "este tema": un panel colapsado
     * escondería justo lo que se pidió ver, y abrirlo a mano para después buscar el tema sería un
     * segundo paso. Sigue siendo la misma tarjeta del timeline —se reusa `_createTimelineItem` entero—
     * así que el panel no puede divergir de la lista (mismos badges, misma miniatura, mismo pie de
     * acciones).
     *
     * El id del click es el de la **tarjeta**, no el del tema: el panel muestra el artículo, y un
     * artículo con diez temas tiene un solo panel. En API los puntos solo traen el id, así que el
     * artículo entero se pide con `_fetchDetail` (que ya cachea en `_apiDetails`).
     *
     * Es además la única superficie de tarjetas alcanzable con el timeline **colapsado** (el botón del
     * mapa general no se esconde con el timeline cerrado), así que no puede depender de que
     * `_toggleExpand` o `_init` ya hayan corrido `_preloadEmbedLibraries()`: por eso lo llama ella misma.
     */
    protected _openFullMapCard(point: FullMapPoint): Promise<void>;
    /**
     * En modo mapa, volver clickeable cada tema de la ficha que tiene punto en el mapa.
     *
     * Solo los que tienen `geom` —`_temaGeomOf`—: un tema sin ubicación no tiene a dónde llevar la
     * vista, y un control que parece clickeable y no hace nada es peor que uno que no lo parece. Por
     * eso el binding va por `.tema-item` **con** coordenadas y no por todas las filas, y la clase
     * `.tema-locatable` es lo que le pone el puntero y el hover: el "es clickeable" es un dato, y el
     * SCSS lo lee de la clase en vez de repetir el criterio geométrico.
     *
     * Va después de `_ensureCardDetail` porque es el detalle el que trae la lista de temas: en local ya
     * estaba, y en API no hay nada a lo que bindear hasta que llega.
     */
    protected _bindFullMapCardTemas(cardEl: HTMLElement, card: TimelineItem): void;
    /**
     * Llevar la vista del mapa a un tema elegido desde la ficha, y dejarlo como punto seleccionado.
     *
     * Son dos gestos en un mismo click, y el orden importa: primero se selecciona —para que el círculo
     * crezca y quede arriba, que es lo que conecta la fila con el punto— y después se mueve la vista.
     *
     * **Toda fila clickeada acerca**: el gesto es "llévame hasta ahí", y repetirlo sobre otro tema de
     * la misma tarjeta hace exactamente lo mismo, centrando el nuevo punto. Antes solo el segundo click
     * —sobre el tema ya seleccionado— hacía `fit`, con lo cual clickear una fila nueva se quedaba en el
     * zoom viejo y no llegaba al punto elegido.
     */
    protected _focusFullMapTema(cardEl: HTMLElement, card: TimelineItem, temaIndex: number): void;
    /**
     * Llevar el tema del punto clickeado a la vista: lo resalta y, si hace falta, scrollea el panel
     * hasta él.
     *
     * El resaltado es una clase en el `.tema-item` y **no** un elemento nuevo ni un scroll: el
     * resaltado tiene que viajar con el dato (es el mismo `.tema-item` que ya existe) para que
     * `_ensureCardDetail` pueda reescribir el detalle sin perderlo.
     *
     * Un `idSubtema` vacío —backend sin `id_subtema`— no hace nada: no hay forma de ubicar el tema, y
     * mejor la ficha entera a la vista que scrollear a un `.tema-item` equivocado.
     *
     * `scroll` es un parámetro y no una constante porque son los dos callers los que saben si el tema
     * estaba o no a la vista: viniendo de un click en el mapa **hay** que scrollear (la lista puede
     * tener veinte temas y el elegido ninguno), y viniendo de un click en la fila **no** —la fila está
     * delante del puntero, así que `scrollIntoView` la correría debajo sin que nadie lo pidiera, y en
     * `block: 'center'` hasta la deja en otro lugar del panel del que salió.
     */
    protected _revealFullMapTema(cardEl: HTMLElement | null, idSubtema: string, scroll: boolean): void;
    /**
     * La identidad de un punto para el panel: artículo + tema. Es lo que distingue dos puntos del
     * mismo artículo, y también lo que se usa para descartar una respuesta que llegó tarde y para el
     * predicado de selección del mapa.
     *
     * El id del tema va como `id_subtema`, no como título, porque dos temas de un artículo pueden
     * llamarse igual. Un backend sin `id_subtema` deja `''` y el key queda igual de único: los dos
     * puntos sin id de un mismo artículo no se distinguen, pero siguen siendo el mismo artículo, y lo
     * que la ficha muestra es el artículo.
     */
    protected _fullMapPointKey(point: FullMapPoint): string;
    /**
     * El panel del mapa general: solo la caja donde entra la tarjeta. El botón de cerrar **no** se
     * agrega acá sino dentro de la tarjeta, arriba a la derecha (`.timeline-card` es `position:
     * relative`), que es donde el ojo ya está: en un header aparte seemed to float, y con el panel sin
     * fondo propio quedaba pegado a la nada.
     *
     * El link a la vista individual tampoco va acá: la tarjeta ya lo trae en su propio menú de
     * información, donde el ID es un `<a target="_blank">` si el ítem trae `link_view_entry`.
     */
    protected _buildFullMapDetailHtml(): string;
    /**
     * Cerrar el panel de la tarjeta del mapa general. Va en el botón "×" de la ficha y también en el
     * click del mapa de fondo, que es lo que uno espera: clickear en el vacío cierra lo que está
     * abierto sin tener que buscar el botón.
     *
     * El orden importa: se limpia `_fullMapSelectedKey` **antes** de vaciar el panel, porque es la key
     * que usa el predicado del mapa para saber si algo está seleccionado. Vaciar el `innerHTML` después
     * no importa para eso —el predicado no lee el DOM—, pero sí para el resaltado del tema, que
     * desaparece con la tarjeta.
     */
    protected _closeFullMapCard(): void;
    /**
     * Dispose the general map. Same teardown as `_destroyTemasMaps` and for the same two reasons: the
     * overlay is added to the map, not owned by it, and dropping the DOM node would leave the canvas,
     * the listeners and the tile source vivos.
     *
     * It exists as its own method —and not as one more entry of `_temasMaps`— because
     * `_destroyTemasMaps` runs on every re-render of the timeline and this map has to survive all of
     * them: while the general map is on screen the cards are re-rendered anyway, and with a shared
     * registry the map would be thrown away on the first filter change.
     */
    protected _destroyFullMap(): void;
    /**
     * Write (or clear) the message above the general map's canvas. `state` is the `data-state` the
     * SCSS keys on and `null` means "nothing to say", which also hides the box: with points on screen
     * it would take height away from the map for nothing.
     *
     * Every message is in Spanish because that is the language of the whole component, and all of them
     * are of the visible kind only in API mode, because in local mode the points are already in memory
     * and there is no request to wait for.
     *
     * The loading state also writes `aria-busy` on the canvas —the same flag `_renderApiLoading` puts on
     * the list—, and this is the only place that touches it: a flag kept next to the message it belongs
     * to cannot desync from it.
     */
    protected _setFullMapStatus(state: string | null, text: string): void;
    /** Build the "Videos vinculados" HTML block */
    protected _buildVideosHtml(card: TimelineItem): string;
    /** Build the inline "Imágenes" HTML block */
    protected _buildInlineImagesHtml(card: TimelineItem): string;
    /**
     * Build the inline "Adjuntos" HTML block.
     *
     * El `download` va **sin valor** a propósito (el browser deriva el nombre del último segmento de la
     * URL, y así el atributo no suma otra interpolación al markup) y solo se respeta same-origin, así
     * que el `target="_blank"` se queda como fallback. El nombre se escapa siempre: `adjuntos` viene del
     * pipeline de scraping externo y va a un `title` y a texto de nodo.
     */
    protected _buildInlineAdjuntosHtml(card: TimelineItem): string;
    /** Build the card actions bar (screenshot, imágenes, adjuntos, abrir, editar) */
    protected _buildActionsHtml(card: TimelineItem): string;
    /** Build the "Información" menu rows (ID, Tipo, Oficial, Captura) */
    protected _buildInfoMenuHtml(card: TimelineItem): string;
    /**
     * Build the taxonomy navigation block shown at the foot of the expanded card
     * (`item.taxonomias`, i.e. the field the detail endpoint returns). Every group
     * renders its label as a heading (cropped by CSS, with the full text in the
     * `title`) and its items as links.
     *
     * Groups with more than `TAXONOMY_VISIBLE_LINKS` links render only the first
     * ones: the rest go in the markup as hidden `li` and a "Ver más (N)" button
     * toggles them, so no link is lost and no extra fetch is needed.
     *
     * Groups with no label, no items, or items with no content/link are ignored,
     * and an empty string is returned when nothing is renderable so no orphan
     * markup is left in the DOM.
     */
    protected _buildTaxonomies(taxonomias: SingleTaxonomy[] | undefined): string;
    /**
     * Bind the "Ver más" toggles of the taxonomy navigation block rendered inside
     * `root` (the `.card-taxonomies-slot` of a card), for the groups that overflow
     * `TAXONOMY_VISIBLE_LINKS`. Each toggle is independent: it shows/hides only its
     * own group, adding `expanded` to the `ul` (the class is what the component
     * CSS keys on, the `hidden` attribute is kept in sync for the case where the
     * stylesheet is not loaded).
     */
    protected _bindTaxonomyToggles(root: HTMLElement): void;
    /** Fill the card detail slots and bind their interactions */
    protected _injectCardDetail(cardEl: HTMLElement, card: TimelineItem): void;
    /**
     * Ensure the full detail of the card is present (fetches it when missing), and resolve with the
     * payload that was injected — `null` when nothing was injected (already loaded, no api, no id or
     * a failed fetch).
     *
     * The callers that only care about the side effect ignore the value; `_openFullMapCard` needs it
     * because in api mode the card it holds is a summary, which carries no `temas`.
     */
    protected _ensureCardDetail(cardEl: HTMLElement): Promise<TimelineItem | null>;
    /** Process the lazy social embeds (Instagram, Twitter, Facebook) once the card is expanded */
    protected _processCardEmbeds(cardEl: HTMLElement): void;
    /** Insert an element before the timeline footer, or append if no footer */
    protected _insertBeforeFooter(el: HTMLElement): void;
    /**
     * Insert an element at the end of the cards, that is: before the first element of the
     * trailing block (load-more button, paginator, status row, footer), which is what keeps the
     * append order identical to the one `_renderTimeline` + `_renderLoadMoreButton` + `_renderStatus`
     * build. `querySelector` returns the first match in document order, so the load-more button
     * or the paginator wins when one of them is there.
     */
    protected _insertBeforeTrailing(el: HTMLElement): void;
    /**
     * Render the timeline cards list, including the last-updated footer.
     *
     * `instant` is the mode API's: it says the list was replaced by skeleton placeholders that are
     * being taken down right now, so the cards land on the spot the placeholders already occupied
     * and must not replay the entrance transition. They are born with `visible`, exactly like the
     * placeholders are (`_appendTimelineSkeleton`), and because the class is there on their first
     * style resolution there is no previous computed value to transition from — same reason the
     * `requestAnimationFrame` in `_renderAll` is what makes the animation happen when it should.
     * The caller's only job is to not set up the observer for them: its whole effect is adding
     * `visible`, which they already have.
     */
    protected _renderTimeline(cards: TimelineItem[], instant?: boolean): void;
    /**
     * Add cards at the end of the list **without touching the ones already rendered**, and return
     * the created nodes so the entrance animation can be observed on them alone.
     *
     * This is the counterpart of `_renderTimeline` for pagination: that one wipes
     * `#timeline-cards` because its callers replaced the whole result set (page 1 after a
     * search/filter/sort change, a taxonomy re-scope), and a rebuild is the honest thing to do
     * when the articles on screen are no longer the ones in memory. "Cargar más" is not that:
     * the cards already on screen are still correct, and a rebuild would make every one of them
     * lose the `visible` class and replay its entrance transition (the whole list blinking on
     * each page), drop the detail injected in the expanded ones, and reload every image.
     */
    protected _appendTimelineItems(items: TimelineItem[], startIndex: number): HTMLElement[];
    /**
     * Write (or rewrite) the last-updated footer at the end of the timeline. Extracted from
     * `_renderTimeline` because in API mode `lastUpdated` arrives with the facets response,
     * which is requested long after the page that rendered the timeline: patching the footer
     * avoids re-rendering the timeline and losing a card the user already expanded.
     */
    protected _renderLastUpdated(): void;
    /** Set up IntersectionObserver for the featured cards entrance animation */
    protected _setupObserver(): void;
    /**
     * Set up IntersectionObserver for the timeline items entrance animation.
     *
     * `items` narrows what gets observed, which is what pagination needs: after an append the
     * cards already on screen are visible and their own observer has already done its job, so
     * there is nothing to re-observe. Default is every `.timeline-item` in the container.
     */
    protected _setupTimelineObserver(items?: ArrayLike<Element>): void;
    /**
     * Dynamically load social media embed scripts (Instagram, Twitter, Facebook) as needed.
     *
     * `'video'` no aparece en ningún branch: no hay SDK que cargar. Entra al set de tipos y ahí se
     * queda, igual que `'youtube'` (nativo, sin script).
     */
    protected _preloadEmbedLibraries(): void;
    /**
     * Turn the expanded state on (classes, icon and aria) without flipping `isExpanded`.
     * Shared by the toggle and by `_init` when the `startExpanded` option is set, so the
     * initial state and a click end up with exactly the same DOM.
     */
    protected _applyExpandState(): void;
    /** Mirror of _applyExpandState for the collapsed state */
    protected _collapseExpandState(): void;
    /** Toggle between expanded (timeline visible) and collapsed state */
    protected _toggleExpand(scrollTo?: boolean): void;
    /**
     * The element that actually scrolls a given one, or `null` when it is the viewport.
     *
     * Walks up from `el` looking for the first box with a scrollable `overflow`, so it works both
     * when the page (or the window) is what scrolls and when the consumer mounts the component
     * inside a scrollable container of their own. Returns `null` instead of falling back to the
     * window, so each caller can scroll however it wants to (smoothly or not).
     */
    protected _findScrollContainer(el: HTMLElement | null): HTMLElement | null;
    /** Scroll the page/section to make the timeline container visible */
    protected _scrollToSection(): void;
    /**
     * Bring the timeline back to its first card, after the list was replaced (a page change, or a
     * search/filter/sort change that reset to page 1).
     *
     * In the default mode `#timeline-cards` is the scroll box itself (`max-height` + `overflow-y`),
     * so resetting its `scrollTop` is all it takes. **Fullpage is the exception**: the SCSS takes
     * the list out of its own scroll box (`max-height: none; overflow: visible`) and makes the
     * page scroll, so the same assignment is a no-op there — the timeline would keep the scroll
     * position of the page it was on, and landing on page 2 of 4 would show its middle. The scroll
     * therefore has to happen on whatever actually scrolls, found by walking up the ancestors
     * (`_findScrollContainer`), with the window as the last resort.
     *
     * The target is the top of the list right **under the sticky toolbar** (`.featured-row`, which
     * is `position: sticky` in fullpage), not the top of the scroller: scrolling all the way up
     * would leave the toolbar overlapping the first cards, and the offset is read from the live
     * `getBoundingClientRect()` of that row so it follows whatever height the toolbar ends up
     * having, including the consumer's own `--tv-sticky-top`.
     *
     * Instant, unlike `_scrollToSection`: the list the scroll would travel through was just
     * replaced, so animating it means scrolling across cards that are already gone.
     */
    protected _scrollToTimelineTop(): void;
    /**
     * Apply the chosen sorter and direction, and refresh the list. Mirror of a filter change: in
     * local mode the pool is re-ordered in place, and in API mode the order is resolved by the
     * server, so it starts a page reload. The `asc` class keeps the button's icon pointing the same
     * way the direction does.
     */
    protected _applySort(field: string, asc: boolean): void;
    /** Apply the persisted work-notes visibility state to the section and toggle button */
    protected _applyWorkNotesState(): void;
    /** Toggle work-notes visibility and persist the state to localStorage */
    protected _toggleWorkNotes(): void;
    /**
     * How many values the group `f` shows before the "Ver más (N)" toggle appears: its own
     * `maxVisible`, or the default when it declares none. Below 2 no group collapses.
     */
    protected _filterMaxVisible(f: FilterDef): number;
    /**
     * The token a raw value is compared and sent as: its `String()`, with `null` / `undefined` both
     * read as `FILTER_EMPTY_VALUE` so an option declared with `value: null`, or the "Sin valor" of an
     * `allowEmpty` group, matches an item that does not carry the field.
     */
    protected _filterToken(value: FilterValue | undefined): string;
    /**
     * Values a group carries for a single item, as the tokens the code filters on:
     * what `extract` returns, or the `field` of the item itself (arrays expanded, everything
     * tokenized). An item with no value carries the empty token, which is a value of its own: it
     * matches the option that declares it (or the "Sin valor" of an `allowEmpty` group), and in a
     * derived group without `allowEmpty` it produces no value at all.
     */
    protected _filterValuesOf(f: FilterDef, item: TimelineItem): string[];
    /**
     * The values of the group the user has picked, as they travel: one entry per value, which is the
     * `value` its checkbox carries and the cell it takes in the query params and in `localStorage`.
     * Reads `f.active`, the single place the state of a group lives, so a `'select'` group is
     * indistinguishable from a `'checkboxes'` one for everything that is not the control.
     */
    protected _filterActiveValues(f: FilterDef): string[];
    /**
     * The tokens a group currently filters by: the values it has active, each split back into the
     * tokens it declared, so an option like `[false, null]` contributes both.
     */
    protected _filterActiveTokens(f: FilterDef): string[];
    /**
     * Label shown for a value of a group that derives its values: what `formatLabel` returns, or the
     * value itself — except the booleans, that would otherwise read as raw `true` / `false`.
     * A declared group carries the label in its own `items`, and the empty bucket of an `allowEmpty`
     * group has its own fixed label, so neither reaches this method.
     */
    protected _filterLabelOf(f: FilterDef, value: string): string;
    /**
     * The label the backend sent for a token of a field, in API mode, or `''` when there is none.
     * It is looked up by the same key the facets use —the raw token that gets filtered— so a server
     * can store a code and show a name without the two ever having to agree. A label that is not a
     * non-empty string counts as no label, so a backend that sends something else falls back to the
     * token instead of showing `undefined`.
     */
    protected _apiFacetLabel(field: string, token: string): string;
    /**
     * The visible text of one value of a group, whichever control shows it: the label a declared
     * `items` brings, the fixed one of the `allowEmpty` bucket, the one the backend sent with the
     * facets in API mode, or `_filterLabelOf` for a value that came from the data. Both controls call
     * this so a value never reads differently in a select.
     *
     * The order is what makes the sources compose instead of fight: what the client declared wins
     * because it declared it explicitly, then the empty bucket (whose label is fixed in every field),
     * then the label of the backend —which only reaches the values it brought, so a declared group is
     * never renamed by it— and finally what the data says.
     */
    protected _filterOptionLabel(f: FilterDef, token: string): string;
    /**
     * Resolve the values of a group and how many items each one holds, the same way for every
     * control: the declared `items` (counted, in their order), or the ones derived from the items of
     * the active scope in local mode, or the ones the server sent in `GET {url}/facets` in API mode.
     *
     * Returns `null` when the group has nothing to decide and therefore has to hide itself: a
     * declared group always has something (it exists even with no data behind it), so only a derived
     * one can end up here. The exception is the `allowEmpty` group whose only value is the empty
     * bucket — the consumer asked for it, and filtering by it is a decision, not missing data.
     *
     * `overflow` is how many values a `'checkboxes'` group hides behind its "Ver más (N)"; it is 0
     * for a `'select'`, whose list scrolls and searches instead of truncating.
     */
    protected _resolveFilterValues(f: FilterDef, scope: TimelineItem[]): {
        values: string[];
        counts: Record<string, number>;
        overflow: number;
    } | null;
    /**
     * Reseed the values a group starts with: what the URL asked for, then the ones persisted by a
     * `persist` group, and otherwise the `checked` its declared `items` bring. An empty record wins
     * over those defaults, which is what lets the user clear a group and have it stay cleared across
     * the rebuilds.
     *
     * The URL comes first because a shared link is a more explicit "what to show" than a value this
     * browser happens to have stored, and it is the only one of the three that is not something the
     * consumer declared. That key **existing** is the signal, not it having values: `?tv_tipo_fuente=`
     * means "that group was cleared on purpose", which is a legitimate thing to share.
     *
     * This is also what keeps a shared filter from being wiped by a rebuild, since it reseeds on
     * every one of them (the API facets, a taxonomy re-scope) the way it does for a `persist` group.
     *
     * A saved value is matched **by tokens and not by string**, because the two places that carry it
     * are comma-separated (the URL param and the API one) and a declared value can be a list, whose
     * token is itself a CSV (`[null, false]` is `'null,false'`). Reading one back splits it, so a
     * whole-string comparison would lose it and filter the pool down to nothing.
     */
    protected _seedFilterActive(f: FilterDef, values: string[], savedState: Record<string, string[]>): void;
    /**
     * Build the control of every group of the `filters` option out of the values it resolves: the
     * checkboxes of a `'checkboxes'` group, the trigger and list of a `'select'` one. The values come
     * from the items of the active scope in local mode, or from the ones the server sent in
     * `GET {url}/facets` in API mode. A group with no container to draw in is skipped, and so is the
     * whole method when no group was declared at all (nothing to build, nothing to show).
     */
    protected _buildFilterCheckboxes(): void;
    /**
     * Draw the values of a `'checkboxes'` group: one label per value, with its checkbox and its
     * count, the ones past the cut already marked `filter-option-extra` for `_buildFilterMore` to
     * hide. The group's active values are already in `f.active` (seeded by `_seedFilterActive`), so a
     * checkbox only has to mirror them, and its `change` only has to write the new state.
     */
    protected _buildFilterCheckboxesGroup(f: FilterDef, resolved: {
        values: string[];
        counts: Record<string, number>;
        overflow: number;
    }): void;
    /**
     * Draw the control of a `'select'` group: the chips (or the placeholder) of its active values,
     * the search box when it has enough values to earn one, and the footer.
     *
     * The list of values is **not** built here: `values` and `counts` are handed to the `FilterSelect`
     * and `_ensureSelectOptions` turns them into DOM on the first open. That is the whole reason the
     * control exists — a field with hundreds of values would otherwise put hundreds of nodes in the
     * document on every rebuild (the API facets, a taxonomy re-scope) whether the user ever opens it
     * or not.
     */
    protected _buildFilterSelect(f: FilterDef, resolved: {
        values: string[];
        counts: Record<string, number>;
        overflow: number;
    }): void;
    /**
     * Forget everything a built list of a `'select'` group holds, leaving the control as if it had
     * never been opened. Called on every rebuild (the values may have changed) and when the group
     * hides itself, which is also when its DOM has to stop being clickable.
     */
    protected _resetFilterSelect(select: FilterSelect): void;
    /**
     * Write on the trigger of a `'select'` group what the user has picked: the placeholder when
     * nothing is, and a removable chip per active value. Rebuilt with `createElement` because the
     * chips are text that came from the data.
     */
    protected _renderSelectTrigger(f: FilterDef): void;
    /**
     * Build one chip of the trigger of a `'select'` group: the label, cut with `…` by CSS when it is
     * long, plus the button that drops the value.
     *
     * The button is nested inside the trigger, which is valid because the trigger is a
     * `div[role="combobox"]` and not a `<button>` (a button inside a button is not). It is
     * `tabindex="-1"` on purpose: a group can carry hundreds of values, and one tab stop per chip
     * would bury everything that comes after the trigger. Removing from the keyboard goes through the
     * list, which is the accessible path for it anyway.
     *
     * The label is its own span because the `…` has to be: `text-overflow: ellipsis` only works on a
     * block with a direct text node, and once the chip holds a button it is a flex container.
     */
    protected _createSelectChip(f: FilterDef, token: string): HTMLElement;
    /**
     * Write the footer of a `'select'` group: how many values are picked, and the "Limpiar" button
     * that drops them all. The count is left empty in a `multiple: false` group, where one is the most
     * there can ever be and the trigger already says it.
     */
    protected _renderSelectFooter(f: FilterDef): void;
    /**
     * Build what a `'select'` group needs to show its list, on its first open: the label and the
     * `haystack` of **every** value, and then the first window of rows.
     *
     * The index pass covers all the values but only builds nodes for `FILTER_SELECT_WINDOW` of them,
     * and that is the whole difference between a dropdown that works on a field with hundreds of
     * values and one that does not: 400 rows are 1.600 noditos para mirar y para scrollear, mientras
     * que el `haystack` de 400 valores es un array de strings. Los nodos de la cola se crean después,
     * al scrollear (`_appendSelectRows`).
     *
     * This is also where a remote value list would be requested (one day a `loadOptions` option would
     * fetch instead of reading `select.values`): the trigger has already shown the values it had, and
     * the request would not block the panel.
     */
    protected _ensureSelectOptions(f: FilterDef): void;
    /**
     * Narrow the values of a `'select'` group to the ones the query matches, and lay out the first
     * window of them. The match is a substring of the folded label and token, so it forgives case and
     * accents.
     *
     * It goes over `haystacks` (all the values) and not over the rows (the ones in the window), which
     * is what lets a match that is not rendered yet be found and brought into the window. It does
     * rebuild the window from scratch, instead of hiding rows in place, because the number of matches
     * changes: hiding would leave a list of 50 rows con 400 en el medio y 3 al final.
     */
    protected _filterSelectOptions(f: FilterDef, query: string): void;
    /**
     * Lay out the window of a `'select'` list: the rows of `matches[0..shown]` and the "Sin
     * resultados" line when nothing matched. Rebuilds the list node, so the caller is the one who
     * decides the scroll: the search wants the top, and the extension path appends instead of calling
     * this.
     */
    protected _renderSelectWindow(f: FilterDef): void;
    /** Add one row of a `'select'` list at its end, and remember it as rendered */
    protected _appendSelectRow(f: FilterDef, token: string): void;
    /**
     * Grow the window of a `'select'` list by another `FILTER_SELECT_WINDOW` matches. It **appends**
     * instead of rebuilding, so the rows that were already there keep their identity and, more
     * importantly, the list keeps its `scrollTop`: rebuilding a long list while the scrollbar is at
     * the end would throw the viewport back to the top on every extension.
     */
    protected _extendSelectWindow(f: FilterDef): void;
    /**
     * Grow the window when the list is scrolled to its end, so reaching the bottom of a long list
     * brings the next values instead of dead-ending. When there are more matches than the window
     * covers, the list always overflows (50 rows against a ~220px box), so the scroll is the mouse
     * path to every value; the keyboard reaches them too, through `_revealSelectCursor()`.
     */
    protected _maybeExtendSelectWindow(f: FilterDef): void;
    /**
     * Add or drop one value of a `'select'` group, and apply. In a `multiple: false` group picking a
     * value replaces the previous one, and picking the one that is already active clears it: that is
     * what makes it behave like the classic `<select>`.
     */
    protected _toggleSelectValue(f: FilterDef, token: string): void;
    /**
     * A `multiple: false` group keeps one active value, so choosing another one has to drop the row
     * of the one that was active: nothing else knows about it, since no checkbox holds it.
     */
    protected _syncSingleSelect(f: FilterDef): void;
    /** Drop every active value of a `'select'` group and apply */
    protected _clearSelectValues(f: FilterDef): void;
    /**
     * The group a chip inside a card filters through, or `null` when there is none to filter by:
     * single mode has no panel at all (`_buildLayout` never runs there, so applying would throw),
     * and a field the consumer did not declare — or declared without `cardClickable` — keeps the
     * card exactly as it has always been, plain text.
     */
    protected _cardFilterGroup(field: string): FilterDef | null;
    /**
     * Push `f.active` back into the DOM of its group. It exists for the one writer that changes the
     * set without going through a control — the chips inside a card —: the checkboxes of a group are
     * a view of that set, and a value that stays active inside the hidden tail of "Ver más" would be
     * an applied filter nobody can see, so that group opens too. A `'select'` group redraws its rows
     * and its trigger, which is what `_toggleSelectValue` does as well.
     */
    protected _syncFilterControl(f: FilterDef): void;
    /**
     * Filter from a value the user clicked inside a card: every other group **and** the search term
     * are dropped, and the clicked value becomes the only active one. Deliberately not a toggle —
     * clicking it again just applies the same state (see `TimelineFilter.cardClickable`).
     *
     * It goes through `_applyFilters(true)` like any other control, so the toggles, the URL, the
     * full map and the page reload of API mode all follow it without this method knowing about them.
     */
    protected _applyCardFilter(field: string, value: string): void;
    /** Open the list of a `'select'` group, building it the first time */
    protected _openSelect(f: FilterDef): void;
    /** Close the list of a `'select'` group and send the focus back to its trigger */
    protected _closeSelect(f: FilterDef): void;
    /**
     * Bind the listeners of a `'select'` group, once. The trigger, the panel, the search box and the
     * footer are markup from `_buildLayout` that is never replaced, so binding them on the first build
     * is enough and the rebuilds of the values do not stack listeners.
     *
     * Keyboard: the trigger opens with `Enter` / `Space` / `?`, the list walks with the arrows and
     * toggles with `Enter`, and `Escape` closes the list without closing the whole panel (which is
     * what it would do otherwise, since the key bubbles to the same handler that closes the menu).
     */
    protected _bindSelectEvents(f: FilterDef): void;
    /**
     * Draw the keyboard cursor of a `'select'` group. It is a class and not a focus, because the
     * cursor only exists while the list is open and the rows are `div`s: moving it has to be visible,
     * or walking the list with the arrows would look like nothing happened.
     */
    protected _renderSelectCursor(f: FilterDef): void;
    /**
     * Move the cursor of a `'select'` group along the values that **match**, so the arrows walk what
     * the search left and never land on a value the search hid.
     */
    protected _moveSelectCursor(f: FilterDef, step: number): void;
    /**
     * Put the cursor on the first or the last matching value (<kbd>Home</kbd> / <kbd>End</kbd>).
     * Without these, a group with hundreds of values is only reachable with hundreds of <kbd>?</kbd>:
     * the same dead-end the window avoids for the mouse, and this is the listbox behavior people
     * expect from the keys.
     */
    protected _jumpSelectCursor(f: FilterDef, last: boolean): void;
    /**
     * Make sure the row the cursor is on **exists**, growing the window until it does, and then draw
     * the cursor on it. The window always covers a prefix of `matches`, so a cursor past its end is
     * brought in by extending; the row is then scrolled into view, so the cursor is never off-screen.
     */
    protected _revealSelectCursor(f: FilterDef): void;
    /** The value the cursor of a `'select'` group is on, or `null` when it is not on any */
    protected _selectCursorToken(f: FilterDef): string | null;
    /**
     * Add the "Ver más (N)" toggle at the end of a collapsed filter group and put the group in
     * its initial state. The hidden values are the `overflow` labels at the tail of
     * `f.options`, already marked `filter-option-extra`; what this decides is only whether
     * they show.
     *
     * A group with a checked value opens itself: a filter applied from a value the user can no
     * longer see is worse than a group one line longer, and the rebuilds (the API facets, a
     * taxonomy re-scope) always land on the visible state.
     *
     * The class is what the component CSS keys on, the `hidden` attribute is kept in sync for
     * the case where the stylesheet is not loaded, and the whole thing lives in the DOM: the
     * toggle is not a filter, so it does not call `_applyFilters` and the timeline does not
     * re-render.
     */
    protected _buildFilterMore(f: FilterDef, overflow: number): void;
    /**
     * Load the state of the filters marked `persist` from localStorage, keyed by `field`.
     * A group that declares no `persist` never reads it, which is what makes the rebuilds (the API
     * facets, a taxonomy re-scope) start over on those instead of silently keeping a value.
     */
    protected _loadPersistedFilterState(): Record<string, string[]>;
    /** Persist the active values of every group marked `persist` to localStorage */
    protected _savePersistedFilterState(): void;
    /** Normalize a string for accent- and case-insensitive search matching */
    protected _normalizeSearch(value: string | null | undefined): string;
    /** Check whether a card matches the current search term */
    protected _matchesSearch(card: TimelineItem): boolean;
    /**
     * Page size used by the API mode. `itemsPerPage: 0` means "no pagination", so the request
     * asks for a page big enough to hold the whole collection in one response: the server only
     * slices what it gets, and a small `pageSize` there would silently leave the user with the
     * first few items and no way to ask for the rest.
     */
    protected _apiPageSize(): number;
    /**
     * Page size of the current mode: API mode asks the server for `_apiPageSize`, local mode slices
     * the pool it already holds. It is 0 in local mode with `itemsPerPage: 0`, which is how "no
     * pagination at all" is spelled there.
     */
    protected _pageSize(): number;
    /**
     * Number of pages the current result set is split into, always at least 1. It counts up to
     * the total the mode knows about: the `total` the server sent in API mode, the filtered pool in
     * local mode.
     */
    protected _pageCount(): number;
    /** The page the user is on, 1-based. API mode reads the page the server was asked for */
    protected _currentPage(): number;
    /** True when there are more pages to load */
    protected _hasMorePages(): boolean;
    /** Fetch a JSON resource from the API with the configured fetch implementation */
    protected _apiFetch<T>(path: string, params: Record<string, string>): Promise<T>;
    /**
     * Read the state of the view the browser URL carries, once, from the constructor.
     *
     * It runs **before** `_init()` on purpose: what the URL says has to be part of the first render
     * (the markup of the toolbar, the sorter selected, the taxonomy pill, the text in the search box)
     * and of the **first** API request. A shared link has to open on the view it shares, not render
     * the default one and correct itself a frame later.
     *
     * Everything it cannot resolve is dropped in silence, which is the rule that makes the option safe
     * to hand to the public: a filter the consumer did not declare this time (the internal filters of
     * a link shared by someone who does have permissions), an order that is not offered anymore, a
     * taxonomy that was renamed, a page that no longer exists. None of it warns, none of it breaks,
     * and none of it filters: an unknown `tv_*` key survives in the URL untouched until the first
     * interaction, when `_syncUrlState()` strips it.
     */
    protected _readUrlState(): void;
    /**
     * Seed the active values of every group from the URL, **without** crossing them against the
     * values the group resolves.
     *
     * It runs before `_buildFilterCheckboxes()` and that is the whole point: in API mode a derived
     * group gets its values out of `/facets`, which has not arrived yet, so seeding at that point
     * would leave the group empty and the **first** request would go out unfiltered — and the rebuild
     * that lands with the facets would find the list already on screen and never fix it. Assigning the
     * raw tokens here gets them into `_buildQueryParams()` from the very first page; the intersection
     * happens later, on that rebuild, when the values are known.
     */
    protected _applyUrlFilterState(): void;
    /**
     * Land on the page the URL asked for, in local mode. It runs **after** `_applyFilters()` because
     * that is what resets the cursor (`_page = 1`): the search, the filters, the order and the taxonomy
     * all narrow or reorder the pool, so the page of the link may not even exist in the new one.
     *
     * Out of range is clamped, exactly like `_goToPage()` does: a link whose result set is now shorter
     * lands on the last page instead of an empty one.
     */
    protected _restoreUrlPage(): void;
    /**
     * Write the state of the view into the URL with `history.replaceState`.
     *
     * `replaceState` and not `pushState`: this is a snapshot of what is on screen, not a navigation
     * log, so there is nothing to go back to — and `pushState` would add an entry per keystroke in the
     * search box. For the same reason there is no `popstate` listener.
     *
     * The params of the consumer are left alone; only the `tv_` namespace belongs to the component, and
     * inside it the keys that are not in effect are dropped. That is what makes a link shared by
     * someone with internal filters come back clean for someone who does not have them: the declared
     * groups survive, the undeclared ones are gone, and no warning was ever printed.
     *
     * Called from the three places that change the view — `_applyFilters()`, `_goToPage()` and
     * `_fetchPage()` — and gated by `_urlReady`, so mounting never rewrites the URL it just read.
     */
    protected _syncUrlState(): void;
    /**
     * Build the query string params for the list endpoint from the current UI state.
     * Each group sends the tokens of its checked checkboxes joined by commas, which is exactly the
     * `value` of those checkboxes: a declared `[false, null]` travels as `validado=false,null`.
     */
    protected _buildQueryParams(page: number): Record<string, string>;
    /**
     * The params that describe **what** the view is showing —the search term and the active tokens of
     * every filter group— with no cursor, no page size and no order. It is what narrows the set, and it
     * is the part that both the list and the general map's `GET {url}/points` need: the map fits every
     * point at once and has no order, so the three params of the cursor are the only ones it drops.
     *
     * Spread as the **base** of the object in `_buildQueryParams` instead of appended to it, so
     * `q` and the filters keep coming out in the same place of the query string and the params the
     * list sends don't change at all.
     */
    protected _buildFilterQueryParams(): Record<string, string>;
    /**
     * Fetch the filter facets (`GET {url}/facets`), at most once per instance.
     * They are static values over the whole collection (counts, total and lastUpdated), so they
     * never need to be re-requested. On failure the filter panel is still built (with empty
     * counts) and `_fetchPage` falls back to the legacy `facets` of the list response when the
     * server sends them: that is why a failed request must not clear facets that
     * `_adoptLegacyApiFacets` already took.
     */
    protected _loadApiFacets(): Promise<void>;
    /**
     * Wrapper around `_loadApiFacets`: requested at startup in API mode (see `_init`), in parallel
     * with the first page. The promise is cached, so it is requested only once per instance even
     * if `_toggleExpand` calls it again on the first expand.
     * It also brings the static values that only the facets response carries: the `lastUpdated`
     * of the footer and the collection `total` of the expand button counter, so both can be
     * written without re-rendering the timeline.
     */
    protected _ensureApiFacets(): Promise<void>;
    /**
     * Fetch a page of items from the API and (re)build the whole view.
     *
     * This is the one call behind every request that **replaces** the list — the first page, the
     * refetch a search/filter/sort change schedules and the page change of the numeric paginator —
     * so it is also where the skeletons go up: what is on screen is never what is being asked for,
     * and leaving it there under a "Cargando..." line would only show the previous answer longer.
     */
    protected _fetchPage(page: number): Promise<void>;
    /**
     * Fallback for servers that do not implement `GET {url}/facets` and still send the facets
     * inside the list response. Runs at most once: after that `_apiFacets` is never reassigned.
     * The `labels` ride along here for the same reason `facets` does, so a legacy backend can rename
     * its values too.
     */
    protected _adoptLegacyApiFacets(data: TimelineApiPageResponse): void;
    /** Fetch the next page of items and append them to the timeline */
    protected _appendPageItems(): Promise<void>;
    /** Fetch the full detail of a single item by id */
    protected _fetchDetail(id: string): Promise<TimelineItem | null>;
    /**
     * Debounce a full page reload triggered by filter/search/sort changes.
     *
     * Two shapes, because the triggers are not alike:
     * - `immediate` (a single discrete action: a checkbox, a sort option, Escape on the search
     *   input) has no burst to coalesce, so waiting the whole window is pure added latency: the
     *   request goes out on the leading edge and the window only swallows what comes next.
     * - without it (typing in the search input) the classic trailing debounce applies, because a
     *   leading request per keystroke would ask the server for every prefix of the term.
     *
     * A trigger that lands inside an open window always re-arms it with a request, so the last
     * state of a burst is always the one that lands last.
     */
    protected _schedulePageReload(immediate?: boolean): void;
    /**
     * Replace the list (and the featured stack) with skeleton placeholders while an API list
     * request is in flight.
     *
     * One trigger, one meaning: every API request that **replaces** the list. `_fetchPage` owns it —
     * the first page, the refetch a search/filter/sort change schedules and the page change of the
     * numeric paginator — so what is on screen is always missing or stale, and `_renderAll` puts the
     * real results back when the response lands. The two direct callers above it are conveniences,
     * not a second rule: `_init` shows them before the first page goes out, and `_applyFilters` does
     * it at the click so the placeholders are already up while the debounce window is open (and so
     * they survive into the fetch). "Cargar más" (`_appendPageItems`) does not come through here: it
     * keeps the list the user is reading, which is what a request that only adds to it should do.
     *
     * Idempotent, which is what lets those callers exist: a burst of keystrokes, or a `_fetchPage`
     * that lands on top of an already-showing one, shows the skeleton once. The state lives in the DOM
     * (a placeholder element), which is also what `_renderStatus` checks to stay out of the way, so
     * there is nothing to keep in sync when the render lands.
     *
     * The placeholders copy the silhouette of a real collapsed card (empty `.card-image-wrap` +
     * title + summary lines) so the list keeps its size when the data lands; see the
     * `.timeline-skeleton-item` rules for the sizes and for why the cards column has to grow.
     *
     * How many there are is not a constant: the list box is scrollable, so filling it with one
     * placeholder per item of the page would bury most of them out of sight behind a scrollbar
     * that is about to be replaced anyway. One placeholder is enough to measure the real stride,
     * and `_getCardsHeightPx` gives the height to divide it by (the inline height of the resize
     * handle, or the CSS `max-height`), so the count follows the box the user actually sees. The
     * result is capped at `_apiPageSize`, because a skeleton past that would be promising cards
     * the response does not carry.
     */
    protected _renderApiLoading(): void;
    /**
     * One timeline placeholder, so the count loop and the measuring placeholder share the markup.
     * Returns the element because the caller measures the first one to size the rest.
     */
    protected _appendTimelineSkeleton(markup: string): HTMLElement;
    /**
     * Take the loading state down without touching anything else, for the two paths where no
     * `_renderAll` follows: a failed request (so the list is left empty with the error row) and
     * the real render itself (which wipes both containers anyway, leaving only `aria-busy`).
     */
    protected _clearApiLoading(): void;
    /**
     * The **total** behind the count row (the "de Y" of "Mostrando A-B de Y"): what the whole
     * filtered result is, never what is on screen. API mode reads the `total` the server sent with
     * the page, local mode the filtered pool. Shared by the row at the end and by its mirror at the
     * top so the two can never disagree on it.
     */
    protected _statusTotal(): number;
    /**
     * The count line of the status row: "Mostrando 11-20 de 55 publicaciones", or `''` when there is
     * nothing to count. A **range** of positions rather than a bare amount, because what is on screen
     * is always a slice of the result set and never the whole thing.
     *
     * Where the two numbers come from is the only real difference between the modes:
     *
     * - the **total**: in API mode the `total` the server sent (`_apiTotal`, i.e. search + filters),
     *   in local mode `allCards.length`, which is the filtered pool in its entirety.
     * - how much of it is on screen: in API mode `allCards` **is** the page (or everything loaded so
     *   far, with "Cargar más"), but in local mode `allCards` always holds the whole pool, so what is
     *   on screen is what `_localDisplayCards` returns — the same list `_renderTimeline` was given.
     * - where the range **starts**: with the paginator, the position the current page begins at, and
     *   with "Cargar más" always 1, since the list only grows downward. `itemsPerPage: 0` (no
     *   pagination) makes the page size 0, which collapses the start to 1 and puts the whole list on
     *   screen.
     *
     * The end is `start` plus what is in memory, clamped to the total because a server can return
     * more items than the page size asked for, and a range past the total reads as a bug. The two
     * guards are not decoration either: without the first a page that came back empty would render an
     * impossible range like "12-10/19", and without the second a result set of zero has no count to
     * show. The caller skips the row when this returns `''`.
     */
    protected _statusCountText(): string;
    /**
     * Write (or take down) the count row at the **top** of the list: the mirror of the one
     * `_renderStatus` puts at its end, with the very same text, and only when the result set is
     * bigger than `STATUS_TOP_MIN_ITEMS`.
     *
     * It is inserted as the first child of `#timeline-cards`, which is exactly "below the taxonomy
     * row": that row lives right above `#timeline-cards` in the layout, so the two are neighbours
     * whether taxonomies exist or not.
     *
     * It deliberately carries neither `.timeline-item` nor `.timeline-status-item`:
     *
     * - Not `.timeline-item`, because every article selector —the ones in this repo's suites, and
     *   the documented pattern for consumers' ones— is `.timeline-item:not(<control rows>)`: a
     *   control row that is a `.timeline-item` without one of those extra classes reads as an
     *   article.
     * - Not `.timeline-status-item`, because the two helpers that own the bottom row look it up
     *   with `querySelector`, which returns the first match in document order — and this row is
     *   always the first child, so it would be the one `_renderStatus` removes on the next pass,
     *   and the anchor `_insertBeforeTrailing` would insert appended cards above it.
     *
     * It owns no state: it is rebuilt from `_statusCountText()` on every `_renderStatus`, so it can
     * never disagree with the row at the end, and it takes itself down when there is no count to
     * show (empty result, error, first API page still loading). While the skeletons are up
     * `_renderStatus` returns before getting here, and the list they replaced already took the row
     * with it.
     */
    protected _renderTopStatus(): void;
    /**
     * Render the status row (error / loading / count) at the end of the timeline.
     *
     * The error and the loading lines are API-only: the local mode has no request of its own to fail
     * or to wait for, so all it ever renders here is the count.
     *
     * With the numeric paginator the **loading** line never reaches this row even in API mode: the
     * request that changes the page is one of the replacing ones (`_fetchPage`), so it shows the
     * skeletons instead, and the guard below keeps `_renderStatus` out of the way while they are up.
     * What is left is the count, which the paginator does not replace: the paginator says which page
     * it is and how many pages there are, while the count says which slice of the filtered result is
     * on screen.
     */
    protected _renderStatus(): void;
    /**
     * Sync the active class on the search/filter/internal-filters toggle buttons.
     * Each button is lit by the groups **it** holds, not by any active filter: the `filtros_internos`
     * groups live in the flyout, so they only light the flyout button and never the one of the panel.
     */
    protected _syncFilterToggleState(): void;
    /**
     * Apply active filters and re-render the full view (or reload from the API).
     * `immediate` only means something in API mode: it asks for the leading edge of
     * `_schedulePageReload`, for the discrete changes that have nothing to coalesce.
     */
    protected _applyFilters(immediate?: boolean): void;
    /** Label of the expand toggle; uses the custom function when provided, otherwise the Spanish singular/plural default */
    protected _relatedLabel(n: number): string;
    /** Write the expand toggle label into `#remaining-text`; the label is injected as HTML, so it may contain markup */
    protected _setRelatedLabel(n: number): void;
    /**
     * Write the expand toggle counter and its label. Both count the **whole pool**, never the
     * filtered one: in local mode `_allItems().length`, in API mode the static `total` of
     * `/facets` (0 until that response lands, or forever if the endpoint doesn't send it).
     * Extracted from `_renderAll` so the facets response can patch the counter when it arrives
     * without re-rendering the timeline.
     */
    protected _renderRelatedCount(): void;
    /** Render featured cards, timeline, and load-more button if needed */
    protected _renderAll(): void;
    /**
     * Cards shown in the local timeline, out of the filtered `allCards`.
     *
     * Two shapes for the same list, picked by the `pagination` option: the paginator takes the
     * window of the current page, while "Cargar más" takes everything loaded so far, which grows
     * with every click. `itemsPerPage: 0` means no pagination at all, so the whole list goes out
     * in both cases.
     */
    protected _localDisplayCards(): TimelineItem[];
    /**
     * Featured stack in API mode, where it is built out of the items in memory — that is, out of
     * the page on screen.
     *
     * With the paginator that would make the stack follow the navigation: collapsing the timeline
     * on page 3 would show page 3's articles as "the" featured ones, even though the user never
     * asked for them. So the stack is captured on the first page and kept from then on, which is
     * also what the local mode does for free: there `_featuredCards` is the whole filtered pool,
     * so the paginator cannot move it either.
     */
    protected _apiFeatured(): TimelineItem[];
    /** Render the "load more" button and wire its click handler */
    protected _renderLoadMoreButton(): void;
    /**
     * Render the numeric paginator: "‹ Anterior | Página X de Y | Siguiente ›".
     *
     * The counterpart of `_renderLoadMoreButton`, and mutually exclusive with it (see `_renderAll`):
     * "Cargar más" grows one list downward, the paginator swaps one page for another, so it renders
     * "Página X de Y" instead of a growing counter and the two arrows go back and forth.
     *
     * It sits in the same trailing slot as the load-more button, which is the one `_insertBeforeTrailing`
     * looks for, so appending cards in "Cargar más" mode still lands above it.
     *
     * Nothing is rendered when there is a single page: a lone "Página 1 de 1" with both arrows dead
     * is noise. The handlers read `_currentPage` / `_pageCount` on click rather than closing over
     * the numbers of this render, so they stay correct after the arrows are re-rendered disabled.
     */
    protected _renderPaginator(): void;
    /**
     * Go to a page of the current result set, in both modes.
     *
     * Both replace the list instead of appending to it, which is the whole difference with "Cargar
     * más": what is on screen after the change is not what was there before, so keeping the old
     * cards would be a lie. The API branch therefore reuses `_fetchPage`, the very same call the
     * search, the filters and the sort already make, and the local branch re-renders from
     * `allCards`, which always holds the whole filtered pool. Being a replacement, the API branch
     * also swaps the list for the skeletons on the click (inside `_fetchPage`), instead of leaving
     * the page being left on screen under a "Cargando página N..." line.
     *
     * Out-of-range pages are clamped rather than rejected, so a shorter result set (the filters
     * changed underneath, say) lands on the last page instead of an empty one.
     */
    protected _goToPage(page: number): Promise<void>;
    /** Read the current effective max-height of the timeline-cards in px */
    protected _getCardsHeightPx(): number;
    /** Clamp and apply a max-height (px) to the timeline-cards */
    protected _applyCardsHeight(value: number): void;
    /** Persist the current height to localStorage */
    protected _persistCardsHeight(): void;
    /** Keep the resize handle aria attributes in sync with the current height */
    protected _syncResizeHandleA11y(): void;
    /** Set up the timeline-cards resize handle: drag, keyboard and localStorage persistence */
    protected _initResizeHandle(): void;
    /** Render a single already-expanded card without any timeline chrome when `singleId` is set */
    protected _renderSingleCard(): Promise<void>;
    /** Initialize the component: build layout, sort data, render, bind events */
    protected _init(): void;
    /**
     * Close the toolbar's floating menus, leaving out the one that is about to open. Only one can be
     * open at a time: without this the filter panel and the sort menu overlap. `except` is the menu
     * the caller is about to toggle, so its own state is left alone —closing the others and then
     * toggling is what gives the "switch" behaviour—. The `select` list inside the filter panel is
     * not a menu of this group: it closes with the panel.
     */
    protected _closeOtherMenus(except: 'filter' | 'sort' | 'internal'): void;
    /**
     * Bind the click of the filter toggle. Split out of `_bindBaseEvents` because in API mode the
     * button is on screen from the start but the panel has no values until the facets land: until
     * then there is nothing to open, so the click does nothing. Called from `_bindBaseEvents` in
     * local mode and from the `.then()` of `_ensureApiFacets` in API mode, which runs once.
     */
    protected _bindFilterToggle(): void;
    /**
     * Bind the sort control: the button opens/closes the menu, and a change in any of its radios
     * applies the order. Without `sorters` there is no button and this is a no-op. The menu does not
     * close on change —picking a field and then a direction is two changes—, only on the same
     * outside click that closes the filter panel (see the `document` listener in `_bindBaseEvents`).
     * Unlike the filter panel, the sort menu has all its options from `_buildLayout`, so it is bound
     * once and not rebuilt when the facets land.
     */
    protected _bindSortToggle(): void;
    /**
     * Open the search field and put the caret in it.
     *
     * The field is a single element in both states —collapsed it is the magnifier circle, `open` it is
     * the pill— so the only way in is focusing it: the mouse click and the <kbd>Tab</kbd> both land
     * here, and there is no toggle button left to click.
     */
    protected _openSearch(): void;
    /**
     * Collapse the search field, but only when it isn't filtering. A term the user wrote is a filter
     * in use: collapsing it on the next outside click would hide the search that is narrowing the list
     * —and hide the only place where it can be taken off—. `Escape` clears the value first, so it does
     * close it: the caller that empties the field passes `force`.
     */
    protected _closeSearch(force?: boolean): void;
    /** Bind the header/global event listeners shared by both local and API modes */
    protected _bindBaseEvents(): void;
}
export {};
//# sourceMappingURL=TimelineViewer.d.ts.map