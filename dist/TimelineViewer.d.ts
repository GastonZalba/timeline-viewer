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
    totalAll: number;
    featured: TimelineItemSummary[];
    lastUpdated?: string;
    facets: Record<string, Record<string, number>>;
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
    lastUpdated?: string;
    itemsPerPage?: number;
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
interface FilterDef {
    field: 'tonos_sociales' | 'tipo_fuente' | 'validado' | 'fecha_publicacion' | 'contenido' | 'es_oficial' | 'capturado' | 'descartado';
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
    inlineImages: boolean;
    inlineAdjuntos: boolean;
    internalButtons: boolean;
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
    allCards: TimelineItem[];
    _featuredCards: TimelineItem[];
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
    searchWrap: HTMLElement;
    searchToggle: HTMLElement;
    searchInput: HTMLInputElement;
    searchTerm: string;
    _lgInstance: LightGallery | null;
    _lgContainer: HTMLElement | null;
    api: TimelineApiConfig | null;
    _apiPage: number;
    _apiTotal: number;
    _apiTotalAll: number;
    _apiFacets: Record<string, Record<string, number>>;
    _apiFeatured: TimelineItemSummary[];
    _apiLoading: boolean;
    _apiSeq: number;
    _apiReloadTimer: number;
    _apiFacetsBuilt: boolean;
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
    /** Render the timeline cards list, including the last-updated footer */
    protected _renderTimeline(cards: TimelineItem[]): void;
    /** Set up IntersectionObserver for the featured cards entrance animation */
    protected _setupObserver(): void;
    /** Set up IntersectionObserver for the timeline items entrance animation */
    protected _setupTimelineObserver(): void;
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
    /** Scroll the page/section to make the timeline container visible */
    protected _scrollToSection(): void;
    /** Toggle timeline sort order between ascending and descending */
    protected _toggleSort(): void;
    /** Apply the persisted work-notes visibility state to the section and toggle button */
    protected _applyWorkNotesState(): void;
    /** Toggle work-notes visibility and persist the state to localStorage */
    protected _toggleWorkNotes(): void;
    /** Build filter checkboxes from the available filter values (local data or API facets) */
    protected _buildFilterCheckboxes(): void;
    /** Load the persisted estado-interno filter state from localStorage */
    protected _loadEstadoFilterState(): Record<string, string[]>;
    /** Persist the current estado-interno filter state to localStorage */
    protected _saveEstadoFilterState(): void;
    /** Normalize a string for accent- and case-insensitive search matching */
    protected _normalizeSearch(value: string | null | undefined): string;
    /** Check whether a card matches the current search term */
    protected _matchesSearch(card: TimelineItem): boolean;
    /** Page size used by the API mode (falls back to 6 when itemsPerPage is 0/unset) */
    protected _apiPageSize(): number;
    /** True when there are more pages to load */
    protected _hasMorePages(): boolean;
    /** Fetch a JSON resource from the API with the configured fetch implementation */
    protected _apiFetch<T>(path: string, params: Record<string, string>): Promise<T>;
    /** Build the query string params for the list endpoint from the current UI state */
    protected _buildQueryParams(page: number): Record<string, string>;
    /** Fetch a page of items from the API and (re)build the whole view */
    protected _fetchPage(page: number): Promise<void>;
    /** Fetch the next page of items and append them to the timeline */
    protected _appendPageItems(): Promise<void>;
    /** Fetch the full detail of a single item by id */
    protected _fetchDetail(id: string): Promise<TimelineItem | null>;
    /** Debounce a full page reload triggered by filter/search/sort changes */
    protected _schedulePageReload(): void;
    /** Render the API status row (loading / error / count) at the end of the timeline */
    protected _renderStatus(): void;
    /** Sync the active class on the search/filter/estado toggle buttons */
    protected _syncFilterToggleState(): void;
    /** Apply active filters and re-render the full view (or reload from the API) */
    protected _applyFilters(): void;
    /** Label of the expand toggle; uses the custom function when provided, otherwise the Spanish singular/plural default */
    protected _relatedLabel(n: number): string;
    /** Write the expand toggle label into `#remaining-text`; the label is injected as HTML, so it may contain markup */
    protected _setRelatedLabel(n: number): void;
    /** Render featured cards, timeline, and load-more button if needed */
    protected _renderAll(): void;
    /** Render the "load more" button and wire its click handler */
    protected _renderLoadMoreButton(): void;
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
    /** Bind the header/global event listeners shared by both local and API modes */
    protected _bindBaseEvents(): void;
}
export {};
//# sourceMappingURL=TimelineViewer.d.ts.map