import type { LightGallery } from 'lightgallery/lightgallery';
export type TonoSocial = 'Positivo' | 'Negativo' | 'Neutro';
export interface ItemTema {
    titulo: string;
    resumen: string;
    tono_social: TonoSocial;
    fecha_narrativa?: string | null;
}
export interface TimelineItem {
    id: number | string;
    nombre_fuente: string;
    resumen_ia: string;
    fecha_publicacion: string;
    fecha_scrapeo: string;
    tonos_sociales: TonoSocial[];
    fuente_institucional: string;
    tipo_fuente: string;
    es_oficial: boolean;
    validado: boolean | null;
    thumbnail: string | null;
    link_web: string;
    actores_principales: string[];
    adjuntos: string[];
    screenshot: string | null;
    imagenes: {
        thumb: string;
        full: string;
    }[];
    links_videos?: string[];
    temas: ItemTema[];
}
export interface TimelineOptions {
    container: string | HTMLElement;
    items?: TimelineItem[];
    featuredCount?: number;
    lastUpdated?: string;
    itemsPerPage?: number;
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
    field: 'tonos_sociales' | 'tipo_fuente' | 'validado';
    label: string;
    options: HTMLElement;
    checkboxes: HTMLInputElement[];
    extract?: (item: TimelineItem) => string | string[];
    formatLabel?: (val: string) => string;
}
export default class Timeline {
    container: HTMLElement;
    items: TimelineItem[];
    featured_count: number;
    lastUpdated: string;
    itemsPerPage: number;
    _displayedCount: number;
    allCards: TimelineItem[];
    isExpanded: boolean;
    featuredContainer: HTMLElement;
    featuredRow: HTMLElement;
    timelineContainer: HTMLElement;
    timelineCards: HTMLElement;
    expandToggle: HTMLElement;
    remainingCount: HTMLElement;
    expandIcon: HTMLElement;
    section: HTMLElement;
    fabCollapse: HTMLElement;
    sortToggle: HTMLElement;
    sortAscending: boolean;
    filterToggle: HTMLElement;
    filterMenu: HTMLElement;
    filters: FilterDef[];
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
    protected _openLightGallery(images: ImageInfo[], title: string, showFileName: boolean): void;
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
    /** Build filter checkboxes from the available filter values */
    protected _buildFilterCheckboxes(): void;
    /** Apply active filters and re-render the full view */
    protected _applyFilters(): void;
    /** Render featured cards, timeline, and load-more button if needed */
    protected _renderAll(): void;
    /** Render the "load more" button and wire its click handler */
    protected _renderLoadMoreButton(): void;
    /** Initialize the component: build layout, sort data, render, bind events */
    protected _init(): void;
}
export {};
//# sourceMappingURL=TimelineViewer.d.ts.map