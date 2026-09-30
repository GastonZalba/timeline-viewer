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
    fecha_scrapeo: string;
    tonos_sociales: TonoSocial[];
    fuente_institucional: string | null;
    tipo_fuente: string;
    es_oficial: boolean;
    validado: boolean | null;
    capturado: boolean;
    descartado: boolean | null;
    thumbnail: string | null;
    link_web: string | null;
    actores_principales: string[] | null;
    adjuntos: string[];
    contenido: string;
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
     * Values a filter group shows before collapsing the rest behind a "Ver más (N)" toggle
     * (default: 5). A number applies to every group; a record tunes single ones and the
     * groups left out keep the default, e.g. `{ tipo_fuente: 8 }`. `0` (or any value below
     * 2) shows every value and renders no toggle.
     *
     * Which values stay visible: the ones with the most results, except in the groups with
     * an explicit order (Año publicación, Descartado), which keep it and are just truncated.
     * A group with a checked value never collapses, so an active filter is never hidden.
     */
    filtersMaxVisible?: number | Partial<Record<FilterField, number>>;
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
/** Field names that the filter panel knows how to build a group for */
export type FilterField = 'tonos_sociales' | 'tipo_fuente' | 'validado' | 'fecha_publicacion' | 'contenido' | 'es_oficial' | 'capturado' | 'descartado';
interface FilterDef {
    field: FilterField;
    label: string;
    options: HTMLElement;
    checkboxes: HTMLInputElement[];
    extract?: (item: TimelineItem) => string | string[];
    formatLabel?: (val: string) => string;
    sortValues?: (a: string, b: string) => number;
    defaultChecked?: string[];
    fixedValues?: string[];
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
    filtersMaxVisible: number | Partial<Record<FilterField, number>>;
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
    filterToggle: HTMLElement;
    filterMenu: HTMLElement;
    estadoWrap: HTMLElement;
    estadoToggle: HTMLElement;
    estadoMenu: HTMLElement;
    filters: FilterDef[];
    /**
     * Filter groups whose "Ver más" the user opened. Kept out of the DOM on purpose: the
     * checkboxes are rebuilt (once more when the API facets land, and on every taxonomy
     * re-scope), and the state should survive that the way the taxonomy toggles do.
     */
    _filterExpanded: Set<FilterField>;
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
    /** Build the main DOM layout and cache element references */
    protected _buildLayout(): void;
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
     * How many values the group of `field` shows before the "Ver más (N)" toggle appears:
     * the per-field entry of `filtersMaxVisible` when the option is a record, its number
     * when it is a plain one, and the default otherwise. Below 2 no group collapses.
     */
    protected _filterMaxVisible(field: FilterField): number;
    /** Build filter checkboxes from the available filter values (local data or the one-time API facets) */
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
    /** Load the persisted estado-interno filter state from localStorage */
    protected _loadEstadoFilterState(): Record<string, string[]>;
    /** Persist the current estado-interno filter state to localStorage */
    protected _saveEstadoFilterState(): void;
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
     * Number of pages the current result set is split into, always at least 1. It counts up to the
     * total the mode knows about: the `total` the server sent in API mode, the filtered pool in
     * local mode.
     */
    protected _pageCount(): number;
    /** The page the user is on, 1-based. API mode reads the page the server was asked for */
    protected _currentPage(): number;
    /** True when there are more pages to load */
    protected _hasMorePages(): boolean;
    /** Fetch a JSON resource from the API with the configured fetch implementation */
    protected _apiFetch<T>(path: string, params: Record<string, string>): Promise<T>;
    /** Build the query string params for the list endpoint from the current UI state */
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
    /** Fetch a page of items from the API and (re)build the whole view */
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
     * Two callers: the first page (`_init`) and the page-1 refetch that a search/filter/sort
     * change schedules (`_applyFilters`). In both the results on screen are either missing or no
     * longer match the panel, and `_renderAll` puts the real ones back when the response lands.
     * "Cargar más" (`_appendPageItems`) does not come through here: it keeps the list the user is
     * reading, which is what a request that only adds to it should do.
     *
     * Idempotent, because it runs on every keystroke: a burst of them shows the skeleton once.
     * The state lives in the DOM (a placeholder element), which is also what `_renderStatus`
     * checks to stay out of the way, so there is nothing to keep in sync when the render lands.
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
     * Render the API status row (error / loading / count) at the end of the timeline.
     *
     * With the numeric paginator the row is only half used: the error and loading lines stay,
     * because the request can still fail and there is no other feedback, but the count line goes
     * away — "Mostrando 10 de 87" counts the page on screen, not everything the user went
     * through, and the paginator already says which page it is and how many there are.
     */
    protected _renderStatus(): void;
    /** Sync the active class on the search/filter/estado toggle buttons */
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
     * `allCards`, which always holds the whole filtered pool.
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