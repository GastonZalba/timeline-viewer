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
    }[];
    links_videos?: string[];
    has_video: boolean;
    link_edit_entry?: string;
    notas_de_trabajo?: string | null;
    temas: ItemTema[];
}
export interface TimelineOptions {
    container: string | HTMLElement;
    items?: TimelineItem[];
    featuredCount?: number;
    lastUpdated?: string;
    itemsPerPage?: number;
    inlineImages?: boolean;
    inlineAdjuntos?: boolean;
    internalButtons?: boolean;
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
    _displayedCount: number;
    allCards: TimelineItem[];
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
    _originalCards: TimelineItem[];
    constructor(config: TimelineOptions);
    /** Build the main DOM layout and cache element references */
    protected _buildLayout(): void;
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
    /** Codificar con encodeURIComponent el nombre de archivo de una URL, preservando el resto */
    protected _encodeFileName(url: string): string;
    /** SVG del icono de archivo según su extensión (pdf vs genérico) */
    protected _fileIconSvg(ext: string): string;
    /** Render the featured (overlapping) cards row */
    protected _renderFeatured(cards: TimelineItem[]): void;
    /** Create a single timeline card element with all its event listeners */
    protected _createTimelineItem(card: TimelineItem, index: number): HTMLElement;
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
    /** Build filter checkboxes from the available filter values */
    protected _buildFilterCheckboxes(): void;
    /** Load the persisted estado-interno filter state from localStorage */
    protected _loadEstadoFilterState(): Record<string, string[]>;
    /** Persist the current estado-interno filter state to localStorage */
    protected _saveEstadoFilterState(): void;
    /** Normalize a string for accent- and case-insensitive search matching */
    protected _normalizeSearch(value: string | null | undefined): string;
    /** Check whether a card matches the current search term */
    protected _matchesSearch(card: TimelineItem): boolean;
    /** Apply active filters and re-render the full view */
    protected _applyFilters(): void;
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
    /** Initialize the component: build layout, sort data, render, bind events */
    protected _init(): void;
}
export {};
//# sourceMappingURL=TimelineViewer.d.ts.map