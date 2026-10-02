import type { LightGallery } from 'lightgallery/lightgallery';
export type TonoSocial = 'Positivo' | 'Negativo' | 'Neutro';
export interface ItemTema {
    titulo: string;
    resumen: string;
    tono_social: TonoSocial;
    fecha_narrativa?: string | null;
    notas_de_trabajo?: string | null;
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
     * Open the screenshot gallery at the image's real size, anchored to the top of the viewport
     * (default `true`).
     *
     * lightGallery centers a portrait image vertically when it shows it at 1:1, which is the wrong
     * place to land on a long screenshot: you open it in the middle. This zooms to the real size and
     * moves it to the top instead.
     *
     * Only applies to the screenshot (the one-image gallery), not to the `imagenes` grid, and only
     * when there is something to gain: a capture already shown at (or near) its real size — or under
     * `LG_ZOOM_ACTUAL_MIN_SCALE`, 2x — opens exactly as before.
     */
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
interface FilterDef extends Omit<TimelineFilter, 'type' | 'group' | 'persist' | 'items' | 'allowEmpty' | 'label' | 'multiple' | 'searchable'> {
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
    /** Build the "Fuente" HTML block */
    protected _buildFuenteHtml(card: TimelineItem): string;
    /** Build the "Temas destacados" HTML block */
    protected _buildTemasHtml(card: TimelineItem): string;
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
    /** Ensure the full detail of the card is present (fetches it when missing) */
    protected _ensureCardDetail(cardEl: HTMLElement): Promise<void>;
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
     * Reseed the values a group starts with: the ones persisted by a `persist` group, and otherwise
     * the `checked` its declared `items` bring. An empty persisted record wins over those defaults,
     * which is what lets the user clear a group and have it stay cleared across the rebuilds.
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
    /** Open the list of a `'select'` group, building it the first time */
    protected _openSelect(f: FilterDef): void;
    /** Close the list of a `'select'` group and send the focus back to its trigger */
    protected _closeSelect(f: FilterDef): void;
    /**
     * Bind the listeners of a `'select'` group, once. The trigger, the panel, the search box and the
     * footer are markup from `_buildLayout` that is never replaced, so binding them on the first build
     * is enough and the rebuilds of the values do not stack listeners.
     *
     * Keyboard: the trigger opens with `Enter` / `Space` / `↓`, the list walks with the arrows and
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
     * Without these, a group with hundreds of values is only reachable with hundreds of <kbd>↓</kbd>:
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
     * Build the query string params for the list endpoint from the current UI state.
     * Each group sends the tokens of its checked checkboxes joined by commas, which is exactly the
     * `value` of those checkboxes: a declared `[false, null]` travels as `validado=false,null`.
     */
    protected _buildQueryParams(page: number): Record<string, string>;
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