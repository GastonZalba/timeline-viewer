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
}
/** Respuesta de `GET {url}/facets`: valores estáticos de la colección completa, sin `q` ni filtros */
export interface TimelineApiFacetsResponse {
    facets: Record<string, Record<string, number>>;
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
     * Each entry needs a `field` and a `label`; `type` only accepts `'checkboxes'` today and
     * defaults to it. A group that declares `items` shows exactly those values, in that order, and
     * can preset them with `checked`; a group without them derives the values from the data (the
     * items of the selected taxonomy, or the facets in API mode). In both modes the values travel in
     * API mode as `field=<csv>` with the very tokens the checkboxes carry in the DOM. See
     * [TimelineFilter](#timelinefilter) and [Filtros configurables](#filtros-configurables).
     */
    filters?: TimelineFilter[];
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
    type: 'youtube' | 'instagram' | 'twitter' | 'facebook';
}
/** Controls a filter group can be rendered with. Only checkboxes are supported today. */
export type FilterType = 'checkboxes';
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
    /** Values shown before the "Ver más (N)" toggle appears (default: 5). Below 2: all of them. */
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
interface FilterDef extends Omit<TimelineFilter, 'type' | 'group' | 'persist' | 'items' | 'allowEmpty' | 'label'> {
    group: FilterGroup;
    persist: boolean;
    /** The header of the group, normalized: `''` when the declaration brings none (so no header renders) */
    label: string;
    /** Add the "Sin valor" option to a group that derives its values (see `TimelineFilter`) */
    allowEmpty: boolean;
    /** Column of the panel the group is rendered in. `0` for the `'filtros_internos'` flyout, ignored there. */
    column: number;
    options: HTMLElement;
    checkboxes: HTMLInputElement[];
    /** The declared options resolved, or `undefined` for a group that derives its values */
    declared?: FilterDefItem[];
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
    sortToggle: HTMLElement;
    sortAscending: boolean;
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
    searchToggle: HTMLElement;
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
     * the first column and then along the second.
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
    /** Every item of every taxonomy, used by the featured stack, the counter and single mode */
    protected _allItems(): TimelineItem[];
    /**
     * Items of the currently selected taxonomy, or every taxonomy when "Ver todo" is selected.
     * Falls back to the legacy flat `items` list when no group is configured.
     */
    protected _scopeItems(): TimelineItem[];
    /** Sorted copy: newest first, undated items last */
    protected _sortByDateDesc(items: TimelineItem[]): TimelineItem[];
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
     */
    protected _buildFilterOptionsHtml(f: FilterDef): string;
    /**
     * Markup of the filter panel, or an empty string when no group is declared for it: with no
     * `filters` option the component has no filter UI at all, not a hidden one.
     * The columns come from the `column` that `_normalizeFilters` dealt out, in the order the
     * groups were declared, so the declaration reads down the first column and then along the
     * second.
     */
    protected _buildFilterMenuHtml(): string;
    /**
     * Markup of the internal toolbar: the work-notes toggle plus, when at least one group is
     * declared for it, the `filtros_internos` flyout. Without the latter the button would open an
     * empty menu, so both of them are conditional on the `filters` option as well.
     */
    protected _buildInternalButtonsHtml(): string;
    /** Build the main DOM layout and cache element references */
    protected _buildLayout(): void;
    /**
     * Point every group of the `filters` option at the box `_buildLayout` rendered for it.
     * The lookup goes through the `data-filter-field` attribute rather than the id, so a `field`
     * that is not a valid CSS selector identifier still finds its box.
     *
     * A group with no box is one whose container was not rendered: a `'filtros_internos'` group
     * without `internalButtons`, for instance. It keeps its configuration (so a later
     * `_buildFilterCheckboxes` just skips it) but has nowhere to draw, exactly as when the flyout did
     * not exist before.
     */
    protected _attachFilterOptions(): void;
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
    /** Build the inline "Adjuntos" HTML block */
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
    /** Render the timeline cards list, including the last-updated footer */
    protected _renderTimeline(cards: TimelineItem[]): void;
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
    /** Dynamically load social media embed scripts (Instagram, Twitter, Facebook) as needed */
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
    /** Toggle timeline sort order between ascending and descending */
    protected _toggleSort(): void;
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
     * The tokens the checkboxes of the group currently filter by: the ones checked, each split back
     * into the values it declared, so an option like `[false, null]` contributes both.
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
     * Build the checkboxes of every group of the `filters` option out of the values it has:
     * the ones derived from the items of the active scope in local mode, the ones the server sent
     * in `GET {url}/facets` in API mode. A group with no container to draw in is skipped, and so
     * is the whole method when no group was declared at all (nothing to build, nothing to show).
     */
    protected _buildFilterCheckboxes(): void;
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
    /** Persist the checked values of every group marked `persist` to localStorage */
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
     * - `immediate` (a single discrete action: a checkbox, the sort toggle, Escape on the search
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
     * Bind the click of the filter toggle. Split out of `_bindBaseEvents` because in API mode the
     * button is on screen from the start but the panel has no values until the facets land: until
     * then there is nothing to open, so the click does nothing. Called from `_bindBaseEvents` in
     * local mode and from the `.then()` of `_ensureApiFacets` in API mode, which runs once.
     */
    protected _bindFilterToggle(): void;
    /** Bind the header/global event listeners shared by both local and API modes */
    protected _bindBaseEvents(): void;
}
export {};
//# sourceMappingURL=TimelineViewer.d.ts.map