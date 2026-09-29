import lightGallery from 'lightgallery';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';

import type { LightGallery } from 'lightgallery/lightgallery';
import type { GalleryItem } from 'lightgallery/lg-utils';

declare const instgrm: { Embeds: { process: () => void } } | undefined;
declare const twttr: { widgets: { load: (el?: HTMLElement) => void } } | undefined;
declare const FB: { XFBML: { parse: (el?: HTMLElement) => void } } | undefined;

const YOUTUBE_REGEX =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_EMBED_URL = 'https://www.youtube.com/embed/';

const INSTAGRAM_REGEX = /(?:instagram\.com)\/(p|reels?|tv)\/([a-zA-Z0-9_-]+)/;
const INSTAGRAM_EMBED_BASE = 'https://www.instagram.com/';
const INSTAGRAM_EMBED_SCRIPT = 'https://www.instagram.com/embed.js';

const TWITTER_REGEX = /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/;
const TWITTER_EMBED_BASE = 'https://twitter.com/';
const TWITTER_WIDGETS_SCRIPT = 'https://platform.twitter.com/widgets.js';

const FACEBOOK_POST_REGEX = /(?:facebook\.com)\/([^/]+)\/posts\/(?:[^/]+\/)?(\d+)/;
const FACEBOOK_OTHER_REGEX =
  /(?:facebook\.com\/(?:[^/]+\/videos\/|permalink\.php|photo\.php|watch|story\.php)|fb\.watch)/;
const FACEBOOK_EMBED_BASE = 'https://www.facebook.com/';
const FACEBOOK_SDK_URL = 'https://connect.facebook.net/es_ES/sdk.js#xfbml=1&version=v20.0';

const ESTADO_FILTER_FIELDS: string[] = ['validado', 'capturado', 'descartado'];

/** Window of `_schedulePageReload`: coalesces a burst of search/filter/sort changes into one request */
const API_RELOAD_DEBOUNCE_MS = 300;

/** Links shown per taxonomy group before the "Ver más" toggle appears (single mode) */
const TAXONOMY_VISIBLE_LINKS = 3;

/** Label of the "Ver todo" option added to the taxonomy selector when there is more than one group */
const ALL_TAXONOMIES_LABEL = 'Ver todo';
/** `_contentIndex` value that means "every taxonomy" instead of a single group */
const ALL_TAXONOMIES_INDEX = -1;

const RESIZE_MIN_HEIGHT = 180;
const RESIZE_MAX_HEIGHT = 1200;
const RESIZE_STEP = 24;
const RESIZE_STORAGE_KEY = 'tv-timeline-cards-height';
const WORK_NOTES_STORAGE_KEY = 'tv-work-notes-hidden';
const ESTADO_FILTER_STORAGE_KEY = 'tv-estado-filters';

const TONE_LABEL: Record<string, string> = { Positivo: 'Positivo', Negativo: 'Negativo', Neutro: 'Neutro' };

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
  capturado: boolean; // Indica si el artículo ya fue capturado (si es false, solo se dispone de id y link_web)
  descartado: boolean | null; // Indica si el artículo fue descartado (true = descartado, false = en uso, null = desconocido)
  thumbnail: string | null;
  link_web: string | null;
  actores_principales: string[] | null;
  adjuntos: string[];
  contenido: string;
  screenshot: string | null;
  imagenes: { thumb: string; full: string }[] | null;
  links_videos?: string[] | null;
  has_video: boolean; // Indica si el ítem tiene contenido audiovisual (links_videos o link_web de video)
  link_edit_entry?: string;
  link_view_entry?: string; // URL de la vista individual del ítem (convierte el ID del menú de información en link y agrega el botón de compartir)
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
  field:
    | 'tonos_sociales'
    | 'tipo_fuente'
    | 'validado'
    | 'fecha_publicacion'
    | 'contenido'
    | 'es_oficial'
    | 'capturado'
    | 'descartado';
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
  sortAscending: boolean = false;
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
  searchTerm: string = '';
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

  constructor(config: TimelineOptions) {
    this.container =
      typeof config.container === 'string'
        ? (document.querySelector(config.container) as HTMLElement)
        : config.container;
    this.items = config.items || [];
    this.content = this._normalizeContent(config.content);
    this._contentIndex = 0;
    this.featured_count = config.featuredCount || 6;
    this.lastUpdated = config.lastUpdated || '';
    this.itemsPerPage = config.itemsPerPage || 10;
    this.inlineImages = config.inlineImages || false;
    this.inlineAdjuntos = config.inlineAdjuntos || false;
    this.internalButtons = config.internalButtons || false;
    this.fullpage = config.fullpage === true;
    this.relatedLabel = config.relatedLabel || null;
    this.singleId = config.singleId ? config.singleId.replace(/^\/+/, '') : null;
    this.taxonomyRow = null as unknown as HTMLElement;
    this.taxonomySelectWrap = null as unknown as HTMLElement;
    this.taxonomySelectLabel = null;
    this.taxonomySelectCount = null;
    this.taxonomySelect = null;
    this._displayedCount = 0;
    this.allCards = [];
    this._featuredCards = [];
    // El modo fullpage implica abierto: siempre expandido y sin opción de colapsar.
    this.isExpanded = this.fullpage || config.startExpanded === true;
    this.featuredContainer = null as unknown as HTMLElement;
    this.featuredRow = null as unknown as HTMLElement;
    this.timelineContainer = null as unknown as HTMLElement;
    this.timelineCards = null as unknown as HTMLElement;
    this.resizeHandle = null as unknown as HTMLElement;
    this.expandToggle = null as unknown as HTMLElement;
    this.remainingCount = null as unknown as HTMLElement;
    this.expandIcon = null as unknown as HTMLElement;
    this.sortToggle = null as unknown as HTMLElement;
    this.workNotesToggle = null as unknown as HTMLElement;
    this.filterToggle = null as unknown as HTMLElement;
    this.filterMenu = null as unknown as HTMLElement;
    this.estadoWrap = null as unknown as HTMLElement;
    this.estadoToggle = null as unknown as HTMLElement;
    this.estadoMenu = null as unknown as HTMLElement;
    this.section = null as unknown as HTMLElement;
    this.filters = [];
    this.searchWrap = null as unknown as HTMLElement;
    this.searchToggle = null as unknown as HTMLElement;
    this.searchInput = null as unknown as HTMLInputElement;
    this.searchTerm = '';
    this._lgInstance = null;
    this._lgContainer = null;
    this.api = config.api || null;
    this._apiPage = 1;
    this._apiTotal = 0;
    this._apiCollectionTotal = 0;
    this._apiFacets = {};
    this._apiFacetsPromise = null;
    this._apiLoading = false;
    this._apiSeq = 0;
    this._apiReloadTimer = 0;
    this._apiFacetsLoaded = false;
    this._apiFacetsSettled = false;
    this._apiError = '';
    this._apiDetails = new Map();
    this._shareTimer = 0;
    this._init();
  }

  /**
   * Normalize the `content` option: drop groups without a label or without items.
   * An empty result means the component falls back to the legacy flat `items` list.
   */
  protected _normalizeContent(content: ContentGroup[] | undefined): ContentGroup[] {
    if (!Array.isArray(content)) return [];
    return content
      .filter((g): g is ContentGroup => !!g && typeof g.label === 'string' && g.label.trim() !== '')
      .map((g) => ({ label: g.label.trim(), items: Array.isArray(g.items) ? g.items : [] }))
      .filter((g) => g.items.length > 0);
  }

  /** Every item of every taxonomy, used by the featured stack, the counter and single mode */
  protected _allItems(): TimelineItem[] {
    if (this.content.length === 0) return this.items;
    return this.content.flatMap((g) => g.items);
  }

  /**
   * Items of the currently selected taxonomy, or every taxonomy when "Ver todo" is selected.
   * Falls back to the legacy flat `items` list when no group is configured.
   */
  protected _scopeItems(): TimelineItem[] {
    if (this.content.length === 0) return this.items;
    if (this._contentIndex === ALL_TAXONOMIES_INDEX) return this._allItems();
    return this.content[this._contentIndex]?.items || [];
  }

  /** Sorted copy: newest first, undated items last */
  protected _sortByDateDesc(items: TimelineItem[]): TimelineItem[] {
    return [...items].sort((a, b) => {
      if (!a.fecha_publicacion) return 1;
      if (!b.fecha_publicacion) return -1;
      return new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime();
    });
  }

  /**
   * Number of items of the active scope, shown next to the taxonomy label.
   * The selector is a scope, not a filter, so this is the raw size of the group
   * (or of the whole pool for "Ver todo") and never reacts to the checkboxes.
   */
  protected _scopeCount(): number {
    if (this.content.length === 0) return this.items.length;
    if (this._contentIndex === ALL_TAXONOMIES_INDEX) return this._allItems().length;
    return this.content[this._contentIndex]?.items.length || 0;
  }

  /** Build the main DOM layout and cache element references */
  protected _buildLayout() {
    const internalButtonsHtml = this.internalButtons
      ? `<button class="work-notes-toggle" id="work-notes-toggle" title="Ocultar notas de trabajo" aria-pressed="false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l5-5V5a2 2 0 0 0-2-2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>
            </button>
            <div class="estado-wrap" id="estado-wrap">
              <button class="estado-toggle" id="estado-toggle" title="Estado interno">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <div class="estado-menu" id="estado-menu">
                <div class="filter-options" id="filter-options-validado"></div>
                <div class="filter-options" id="filter-options-capturado"></div>
                <div class="filter-options" id="filter-options-descartado"></div>
              </div>
            </div>`
      : '';
    this.container.innerHTML = `
      <section class="publicaciones-section" id="publicaciones-section">
        <div class="featured-row">
          <div class="noticias-top">
            <button class="expand-toggle" id="expand-toggle" aria-expanded="false" aria-controls="timeline-container">
              <span class="expand-text"><span id="remaining-count">0</span> <span id="remaining-text">${this._relatedLabel(0)}</span></span>
              <span class="expand-icon" id="expand-icon"></span>
            </button>
            <div class="search-wrap" id="search-wrap">
              <button class="search-toggle" id="search-toggle" title="Buscar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <input class="search-input" id="search-input" type="search" placeholder="Buscar..." autocomplete="off" aria-label="Buscar" />
            </div>
            <div class="filter-wrap">
              <button class="filter-toggle" id="filter-toggle" title="Filtrar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <div class="filter-menu" id="filter-menu">
                <div class="filter-column">
                  <div class="filter-section">
                    <div class="filter-header">Tono social</div>
                    <div class="filter-options" id="filter-options-tone"></div>
                  </div>
                  <div class="filter-section">
                    <div class="filter-header">Año publicación</div>
                    <div class="filter-options" id="filter-options-year"></div>
                  </div>
                  <div class="filter-section">
                    <div class="filter-header">Contenido</div>
                    <div class="filter-options" id="filter-options-content"></div>
                  </div>
                </div>
                <div class="filter-column">
                  <div class="filter-section">
                    <div class="filter-header">Tipo de fuente</div>
                    <div class="filter-options" id="filter-options-source"></div>
                  </div>
                  <div class="filter-section">
                    <div class="filter-header">Fuente oficial</div>
                    <div class="filter-options" id="filter-options-oficial"></div>
                  </div>
                </div>
              </div>
            </div>
            <button class="sort-toggle" id="sort-toggle" title="Invertir orden">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="17,9 12,4 7,9" fill="currentColor"/><polygon points="17,15 12,20 7,15" fill="none" stroke-width="1.5"/></svg>
            </button>
            ${internalButtonsHtml}
          </div>
          <div class="featured-cards" id="featured-cards" title="Expandir publicaciones"></div>
        </div>
        <div class="timeline-container" id="timeline-container">
          <div class="timeline-collapse-wrap">
            <div class="timeline-line"></div>
            <div class="taxonomy-row" id="taxonomy-row" hidden>
              <div class="taxonomy-row-spacer"></div>
              <div class="taxonomy-select-wrap" id="taxonomy-select-wrap">
                <span class="taxonomy-select-label" id="taxonomy-select-label" aria-hidden="true"></span>
                <span class="taxonomy-select-count" id="taxonomy-select-count" aria-hidden="true"></span>
                <select class="taxonomy-select" id="taxonomy-select" aria-label="Taxonomía"></select>
              </div>
            </div>
            <div class="timeline-content">
              <div class="timeline-cards-col">
                <div class="timeline-cards" id="timeline-cards"></div>
                ${this.fullpage ? '' : '<div class="timeline-resize-handle" id="timeline-resize-handle" role="slider" tabindex="0" aria-orientation="vertical" title="Ajustar la altura de la lista."></div>'}
              </div>
            </div>
          </div>
          <div class="ai-disclaimer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 2.7a.9.9 0 0 1 1.7 0l1.4 4.2a.9.9 0 0 0 .6.6l4.2 1.4a.9.9 0 0 1 0 1.7l-4.2 1.4a.9.9 0 0 0-.6.6l-1.4 4.2a.9.9 0 0 1-1.7 0l-1.4-4.2a.9.9 0 0 0-.6-.6l-4.2-1.4a.9.9 0 0 1 0-1.7l4.2-1.4a.9.9 0 0 0 .6-.6z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>
            <span>El contenido fue procesado con IA y puede contener imprecisiones</span>
          </div>
        </div>
      </section>
    `;
    this.section = this.container.querySelector('#publicaciones-section') as HTMLElement;
    this.featuredContainer = this.container.querySelector('#featured-cards') as HTMLElement;
    this.featuredRow = this.container.querySelector('.featured-row') as HTMLElement;
    this.timelineContainer = this.container.querySelector('#timeline-container') as HTMLElement;
    this.timelineCards = this.container.querySelector('#timeline-cards') as HTMLElement;
    this.expandToggle = this.container.querySelector('#expand-toggle') as HTMLElement;
    this.remainingCount = this.container.querySelector('#remaining-count') as HTMLElement;
    this.expandIcon = this.container.querySelector('#expand-icon') as HTMLElement;
    this.sortToggle = this.container.querySelector('#sort-toggle') as HTMLElement;
    this.workNotesToggle = this.container.querySelector('#work-notes-toggle') as HTMLElement;
    this.filterToggle = this.container.querySelector('#filter-toggle') as HTMLElement;
    this.filterMenu = this.container.querySelector('#filter-menu') as HTMLElement;
    this.estadoWrap = this.container.querySelector('#estado-wrap') as HTMLElement;
    this.estadoToggle = this.container.querySelector('#estado-toggle') as HTMLElement;
    this.estadoMenu = this.container.querySelector('#estado-menu') as HTMLElement;
    this.searchWrap = this.container.querySelector('#search-wrap') as HTMLElement;
    this.searchToggle = this.container.querySelector('#search-toggle') as HTMLElement;
    this.searchInput = this.container.querySelector('#search-input') as HTMLInputElement;
    this.taxonomyRow = this.container.querySelector('#taxonomy-row') as HTMLElement;
    this.taxonomySelectWrap = this.container.querySelector('#taxonomy-select-wrap') as HTMLElement;
    this.taxonomySelectLabel = this.container.querySelector('#taxonomy-select-label') as HTMLElement | null;
    this.taxonomySelectCount = this.container.querySelector('#taxonomy-select-count') as HTMLElement | null;
    this.taxonomySelect = this.container.querySelector('#taxonomy-select') as HTMLSelectElement | null;
    // La clase le dice al SCSS que reescriba el layout (barra sticky, sin límite de altura,
    // sin ícono). El botón de expandir queda como contador: sin colapso posible, así que se
    // marca deshabilitado en vez de bindear un click que no hace nada.
    if (this.fullpage) {
      this.section.classList.add('fullpage');
      this.expandToggle.setAttribute('aria-disabled', 'true');
    }
    this._buildTaxonomySelect();
    this.filters = [
      {
        field: 'tonos_sociales',
        label: 'Tono social',
        options: this.container.querySelector('#filter-options-tone') as HTMLElement,
        checkboxes: []
      },
      {
        field: 'tipo_fuente',
        label: 'Tipo de fuente',
        options: this.container.querySelector('#filter-options-source') as HTMLElement,
        checkboxes: [],
        extract: (item) => (item.tipo_fuente ? item.tipo_fuente : 'sin-tipo'),
        formatLabel: (val) => (val === 'sin-tipo' ? 'Sin tipo' : val)
      },
      {
        field: 'validado',
        label: 'Validado',
        options: this.container.querySelector('#filter-options-validado') as HTMLElement,
        checkboxes: [],
        extract: (item) => (item.validado === true ? 'validado' : 'no-validado'),
        formatLabel: (val) => (val === 'validado' ? 'Validado' : 'Sin validar'),
        defaultChecked: ['validado', 'no-validado'],
        fixedValues: ['validado', 'no-validado']
      },
      {
        field: 'capturado',
        label: 'Capturado',
        options: this.container.querySelector('#filter-options-capturado') as HTMLElement,
        checkboxes: [],
        extract: (item) => (item.capturado !== true ? 'no-capturado' : 'capturado'),
        formatLabel: (val) => (val === 'capturado' ? 'Capturado' : 'Sin capturar'),
        defaultChecked: ['capturado'],
        fixedValues: ['capturado', 'no-capturado']
      },
      {
        field: 'descartado',
        label: 'Descartado',
        options: this.container.querySelector('#filter-options-descartado') as HTMLElement,
        checkboxes: [],
        extract: (item) => (item.descartado === true ? 'descartado' : 'no-descartado'),
        formatLabel: (val) => (val === 'descartado' ? 'Descartado' : 'Sin descartar'),
        sortValues: (a, b) => (a === 'descartado' ? -1 : b === 'descartado' ? 1 : 0),
        defaultChecked: ['no-descartado'],
        fixedValues: ['descartado', 'no-descartado']
      },
      {
        field: 'es_oficial',
        label: 'Fuente oficial',
        options: this.container.querySelector('#filter-options-oficial') as HTMLElement,
        checkboxes: [],
        extract: (item) => (item.es_oficial ? 'oficial' : 'no-oficial'),
        formatLabel: (val) => (val === 'oficial' ? 'Sí' : 'No')
      },
      {
        field: 'fecha_publicacion',
        label: 'Año publicación',
        options: this.container.querySelector('#filter-options-year') as HTMLElement,
        checkboxes: [],
        extract: (item) => (item.fecha_publicacion ? item.fecha_publicacion.slice(0, 4) : 'sin-fecha'),
        formatLabel: (val) => (val === 'sin-fecha' ? 'Sin fecha' : val),
        sortValues: (a, b) => {
          if (a === 'sin-fecha') return 1;
          if (b === 'sin-fecha') return -1;
          return Number(b) - Number(a);
        }
      },
      {
        field: 'contenido',
        label: 'Contenido',
        options: this.container.querySelector('#filter-options-content') as HTMLElement,
        checkboxes: [],
        extract: (item) => {
          const types: string[] = [];
          if ((item.adjuntos || []).length > 0) types.push('adjuntos');
          if (item.has_video) types.push('video');
          if ((item.imagenes || []).length > 0) types.push('imagenes');
          return types;
        },
        formatLabel: (val) => (val === 'adjuntos' ? 'Con adjuntos' : val === 'video' ? 'Con video' : 'Con imágenes')
      }
    ];
  }

  /**
   * Populate the taxonomy selector with the labels of the `content` groups.
   * Nothing is rendered when there are no groups (legacy `items` option) or in API mode,
   * so the layout stays exactly as it was. With a single group the select is shown
   * but disabled, still displaying that group label. With two or more groups a trailing
   * "Ver todo" option is added, which scopes the timeline to the whole pool.
   */
  protected _buildTaxonomySelect(): void {
    const groups = this.content;
    const row = this.taxonomyRow;
    const select = this.taxonomySelect;
    if (!row || !select) return;
    if (groups.length === 0 || this.api) {
      row.remove();
      this.taxonomySelectWrap = null as unknown as HTMLElement;
      this.taxonomySelectLabel = null;
      this.taxonomySelectCount = null;
      this.taxonomySelect = null;
      return;
    }
    select.innerHTML = '';
    groups.forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g.label;
      opt.textContent = `${g.label} (${g.items.length})`;
      select.appendChild(opt);
    });
    if (groups.length > 1) {
      const all = document.createElement('option');
      all.value = ALL_TAXONOMIES_LABEL;
      all.textContent = `${ALL_TAXONOMIES_LABEL} (${this._allItems().length})`;
      select.appendChild(all);
    }
    this._contentIndex = 0;
    select.selectedIndex = 0;
    select.disabled = groups.length === 1;
    row.hidden = false;
    this.section.classList.add('has-taxonomy');
    this._syncTaxonomyLabel();
  }

  /**
   * Sync the two visible spans of the custom select with the selected taxonomy.
   * The `<option>` text carries `label (N)` for screen readers and the native popup,
   * while the pill is split in two: the label crops with an ellipsis and the count
   * never shrinks (it wears the same pill style as `#remaining-count`), so a long
   * taxonomy still shows how many articles it holds.
   */
  protected _syncTaxonomyLabel(): void {
    const label = this._currentLabel();
    const count = this._scopeCount();
    if (this.taxonomySelectLabel) this.taxonomySelectLabel.textContent = label;
    if (this.taxonomySelectCount) this.taxonomySelectCount.textContent = String(count);
    if (!this.taxonomySelect) return;
    this.taxonomySelect.title = `${label} (${count})`;
    this.taxonomySelect.setAttribute('aria-label', label || 'Taxonomía');
  }

  /** Plain label of the selected taxonomy ("Ver todo" when the whole pool is selected) */
  protected _currentLabel(): string {
    if (this.content.length === 0) return ALL_TAXONOMIES_LABEL;
    return this._contentIndex === ALL_TAXONOMIES_INDEX
      ? ALL_TAXONOMIES_LABEL
      : this.content[this._contentIndex]?.label || '';
  }

  /** Re-scope the timeline, the filters and the counter to the taxonomy picked in the select */
  protected _onTaxonomyChange(): void {
    if (!this.taxonomySelect) return;
    const i = this.taxonomySelect.selectedIndex;
    this._contentIndex = i >= this.content.length ? ALL_TAXONOMIES_INDEX : i;
    this._syncTaxonomyLabel();
    this._buildFilterCheckboxes();
    this._applyFilters();
  }

  /** Format a date string (YYYY-MM-DD) to a locale display string */
  protected _formatDate(dateStr: string): string {
    if (!dateStr) return 'Sin fecha';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** Format a full datetime string to a locale display string */
  protected _formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** Parse a URL and return embed info based on the supported social platforms */
  protected _parseLinkWeb(url: string): LinkInfo | null {
    if (!url) return null;
    let m = url.match(YOUTUBE_REGEX);
    if (m) return { url: `${YOUTUBE_EMBED_URL}${m[1]}`, type: 'youtube' };
    m = url.match(INSTAGRAM_REGEX);
    if (m)
      return {
        url: `${INSTAGRAM_EMBED_BASE}${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/`,
        type: 'instagram'
      };
    m = url.match(TWITTER_REGEX);
    if (m) return { url: `${TWITTER_EMBED_BASE}${m[1]}/status/${m[2]}`, type: 'twitter' };
    m = url.match(FACEBOOK_POST_REGEX);
    if (m) return { url: `${FACEBOOK_EMBED_BASE}${m[1]}/posts/${m[2]}`, type: 'facebook' };
    m = url.match(FACEBOOK_OTHER_REGEX);
    if (m) return { url: url, type: 'facebook' };
    return null;
  }

  /** Build the embed markup for a parsed link */
  protected _buildEmbed(embedUrl: LinkInfo): string {
    if (embedUrl.type === 'instagram') {
      return `<div class="card-iframe-wrap card-iframe-${embedUrl.type}" data-embed-url="${embedUrl.url}"><div class="card-iframe-shimmer"></div></div>`;
    }
    if (embedUrl.type === 'facebook') {
      return `<div class="card-iframe-wrap card-iframe-${embedUrl.type}"><div class="card-iframe-shimmer"></div><div class="fb-post" data-href="${embedUrl.url}" data-show-text="true" data-width="auto"></div></div>`;
    }
    if (embedUrl.type === 'twitter') {
      return `<div class="card-iframe-wrap card-iframe-${embedUrl.type}"><div class="card-iframe-shimmer"></div><blockquote class="twitter-tweet" data-dnt="true"><a href="${embedUrl.url}"></a></blockquote></div>`;
    }
    return `<div class="card-iframe-wrap card-iframe-${embedUrl.type}"><div class="card-iframe-shimmer"></div><iframe src="${embedUrl.url}" frameborder="0" allowfullscreen loading="lazy" title="Contenido embebido"></iframe></div>`;
  }

  /** Open a lightGallery modal with the provided images */
  protected _openLightGallery(
    images: ImageInfo[] | null | undefined,
    title: string,
    showFileName: boolean,
    startIndex = 0
  ): void {
    if (!images || !images.length) return;
    if (this._lgInstance) {
      this._lgInstance.destroy();
      this._lgInstance = null;
    }
    if (!this._lgContainer) {
      this._lgContainer = document.createElement('div');
    }
    this._lgInstance = lightGallery(this._lgContainer, {
      addClass: 'timeline-gallery',
      dynamic: true,
      dynamicEl: images.map((imgInfo) => ({
        src: this._encodeFileName(imgInfo.full),
        thumb: this._encodeFileName(imgInfo.thumb),
        subHtml: title
          ? `<div class="lg-caption">${showFileName ? `<p>${imgInfo.full.split('/').pop()}</p>` : ''}<h4>${title}</h4></div>`
          : ''
      })) as GalleryItem[],
      plugins: [lgZoom, lgThumbnail],
      showZoomInOutIcons: true,
      actualSize: false
    });
    this._lgContainer.addEventListener(
      'lgAfterClose',
      () => {
        if (this._lgInstance) {
          this._lgInstance.destroy();
          this._lgInstance = null;
        }
      },
      { once: true }
    );
    this._lgInstance.openGallery(startIndex);
  }

  /** HTML del icono de fuente oficial (edificio) sobre el círculo de acento */
  protected _oficialIconSvg(): string {
    return `<svg class="card-oficial" width="16" height="16" viewBox="0 0 199.34 223.41" fill="currentColor"><path d="M326.17,272.12c1.65-23.24,24.28-61.59,72-65.81,2.05-.1,3.55-.1,8.91-.1,45.23,4,68.94,39.6,72,65.91Z" transform="translate(-302.78 -206.21)"/><path d="M494,300.26H310.92V279.78H494Z" transform="translate(-302.78 -206.21)"/><path d="M302.78,429.62V412.78H502.11v16.84Z" transform="translate(-302.78 -206.21)"/><path d="M337.89,401.27H318.84V306h19.05Z" transform="translate(-302.78 -206.21)"/><path d="M412.12,401.32H392.89V306h19.23Z" transform="translate(-302.78 -206.21)"/><path d="M467.14,306h19.12v95.2H467.14Z" transform="translate(-302.78 -206.21)"/><path d="M356,401.21V305.73c5.89,0,11.6-.07,17.31.09.7,0,1.5,1.17,2,1.95.29.44.08,1.22.08,1.84q0,44,0,88c0,1.11-.11,2.21-.18,3.6Z" transform="translate(-302.78 -206.21)"/><path d="M449.05,401.36H429.87c-.08-1.36-.21-2.67-.21-4,0-29.22,0-58.43-.07-87.65,0-3,.68-4.24,3.9-4.1,5.08.24,10.18.07,15.56.07Z" transform="translate(-302.78 -206.21)"/></svg>`;
  }

  /** Extraer la extensión en minúsculas de una URL, o '' si no tiene */
  protected _getFileExt(url: string): string {
    const clean = url.split('?')[0].split('#')[0];
    return clean.includes('.') ? clean.substring(clean.lastIndexOf('.') + 1).toLowerCase() : '';
  }

  /**
   * Escapar los caracteres especiales de HTML de un texto plano para poder
   * interpolarlo en markup o en un atributo. Los valores que provienen de la
   * config del consumidor se escapan siempre; para contenido con markup hay que
   * pasar un `HTMLElement`, que se inserta como nodo del DOM.
   */
  protected _escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Codificar con encodeURIComponent el nombre de archivo de una URL, preservando el resto */
  protected _encodeFileName(url: string): string {
    const qIdx = url.indexOf('?');
    const base = qIdx === -1 ? url : url.substring(0, qIdx);
    const tail = qIdx === -1 ? '' : url.substring(qIdx);
    const idx = base.lastIndexOf('/');
    if (idx === -1) return encodeURIComponent(base) + tail;
    return base.substring(0, idx + 1) + encodeURIComponent(base.substring(idx + 1)) + tail;
  }

  /** SVG del icono de archivo según su extensión (pdf vs genérico) */
  protected _fileIconSvg(ext: string): string {
    const generic =
      '<svg class="card-inline-adjunto-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    if (ext === 'pdf') {
      return '<svg class="card-inline-adjunto-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="12" y="16.5" text-anchor="middle" font-size="6" font-weight="700" fill="currentColor">PDF</text></svg>';
    }
    return generic;
  }

  /** SVG del icono de enlace externo (el mismo que usa el botón "Visitar") */
  protected _externalLinkIconSvg(): string {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  }

  /**
   * Resolver una URL del ítem contra la location actual. `link_view_entry` viene
   * del pipeline de scraping y puede venir relativa (`/articulos/FUE-00001`), así
   * que hay que absolutizarla para compartir. Si el valor no es una URL válida,
   * `new URL` lanza y se devuelve el valor crudo para no romper el render de la tarjeta.
   */
  protected _absoluteUrl(url: string): string {
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  }

  /** SVG del icono de compartir (nodos) */
  protected _shareIconSvg(): string {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
  }

  /** SVG del ícono de confirmación (visto al copiar al portapapeles) */
  protected _checkIconSvg(): string {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }

  /**
   * Compartir la URL de la vista individual: usa la Web Share API cuando está
   * disponible y, si no, copia el enlace al portapapeles. `navigator.share()`
   * se invoca de forma síncrona dentro del click porque el navegador exige
   * activación del usuario para abrir el share sheet.
   */
  protected async _shareItem(url: string, title: string, btn: HTMLElement): Promise<void> {
    if (navigator.share && (!navigator.canShare || navigator.canShare({ title, url }))) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      this._copyToClipboard(url);
    }
    this._flashCopied(btn);
  }

  /** Copiar al portapapeles sin la Clipboard API (contexto no seguro o sin permiso) */
  protected _copyToClipboard(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  /** Mostrar el ícono de confirmación en el botón de compartir por 1.5s */
  protected _flashCopied(btn: HTMLElement): void {
    btn.innerHTML = this._checkIconSvg();
    this._showShareToast(btn);
    if (this._shareTimer) window.clearTimeout(this._shareTimer);
    this._shareTimer = window.setTimeout(() => {
      btn.innerHTML = this._shareIconSvg();
      this._shareTimer = 0;
    }, 1500);
  }

  /** Cartelito "Copiado al portapapeles!" debajo de los botones de la tarjeta */
  protected _showShareToast(btn: HTMLElement): void {
    const cardEl = btn.closest('.timeline-card') as HTMLElement | null;
    if (!cardEl) return;
    cardEl.querySelector('.card-share-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'card-share-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = 'Copiado al portapapeles!';
    cardEl.appendChild(toast);
    window.setTimeout(() => toast.remove(), 1500);
  }

  /** Render the featured (overlapping) cards row */
  protected _renderFeatured(cards: TimelineItem[]): void {
    // En fullpage el stack nunca se ve (`expanded` lo colapsa a height: 0), así que no se
    // construye. Es el único punto de corte: deja el contenedor vacío y todo lo demás que
    // lo consulta —los rAF que agregan `.visible`, la limpieza de skeletons, el click— es un
    // no-op natural sobre un `querySelectorAll` sin resultados.
    if (this.fullpage) return;
    this.featuredContainer.innerHTML = '';
    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'featured-card';
      const imgHtml = card.thumbnail
        ? `<div class="card-image-wrap"><img class="card-image" src="${card.thumbnail}" alt="${card.nombre_fuente}" loading="lazy"></div>`
        : '';
      el.innerHTML = `
        ${imgHtml}
        <div class="card-body">
          <div class="card-date">${this._formatDate(card.fecha_publicacion)}</div>
          <div class="card-title">${card.nombre_fuente}</div>
        </div>
      `;
      const featuredImg = el.querySelector('.card-image') as HTMLImageElement | null;
      if (featuredImg) {
        featuredImg.addEventListener('load', () => featuredImg.classList.add('loaded'));
        if (featuredImg.complete) featuredImg.classList.add('loaded');
      }
      this.featuredContainer.appendChild(el);
    });
  }

  /** Create a single timeline card element with all its event listeners */
  protected _createTimelineItem(card: TimelineItem, index: number): HTMLElement {
    const el = document.createElement('div');
    el.className = 'timeline-item';
    if (card.capturado !== true) {
      el.innerHTML = `
      <div class="timeline-date-col no-date">
        <div class="timeline-date" title="Fecha de publicación">${card.fecha_publicacion ? this._formatDate(card.fecha_publicacion) : ''}</div>
        <div class="timeline-dot"></div>
        <div class="timeline-hline"></div>
      </div>
      <div class="timeline-card no-image not-captured">
        <div class="card-status-badges">
          <span class="card-no-validado">Sin capturar</span>
          ${card.validado !== true ? '<span class="card-no-validado">Sin validar</span>' : ''}
          ${card.descartado === true ? '<span class="card-no-validado">Descartado</span>' : ''}
        </div>
        <div class="card-body card-body-not-captured">
          <span class="card-not-captured-id"><span class="card-not-captured-strong">ID</span>${card.id}</span>
          ${
            card.link_web
              ? `<a class="card-not-captured-link" href="${card.link_web}" target="_blank" rel="noopener">${card.link_web}</a>`
              : '<span class="card-not-captured-link">Sin enlace</span>'
          }
          <div class="card-actions">
            <div class="card-actions-row">
              ${
                card.link_web
                  ? `<a class="card-actions-btn card-open" href="${card.link_web}" target="_blank" rel="noopener">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Visitar
              </a>`
                  : ''
              }
              ${
                this.internalButtons && card.link_edit_entry
                  ? `<a class="card-actions-btn card-edit" href="${card.link_edit_entry}" target="_blank" rel="noopener">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                Editar
              </a>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;
      return el;
    }
    const imgHtml = card.thumbnail
      ? `<div class="card-image-wrap"><img class="card-image" src="${card.thumbnail}" alt="${card.nombre_fuente}" loading="lazy"><div class="card-title">${card.nombre_fuente}${card.es_oficial ? `<span class="card-img-oficial card-oficial-wrap" title="Es fuente oficial">${this._oficialIconSvg()}</span>` : ''}</div></div>`
      : '';
    const summary = card as unknown as TimelineItemSummary;
    const hasDetail = this._hasDetail(card);
    const shareBtnHtml = card.link_view_entry
      ? `<button class="card-share-btn" data-share-url="${this._absoluteUrl(card.link_view_entry)}" title="Compartir" aria-label="Compartir">${this._shareIconSvg()}</button>`
      : '';
    el.innerHTML = `
      <div class="timeline-date-col${card.fecha_publicacion ? '' : ' no-date'}">
        <div class="timeline-date" title="Fecha de publicación">${this._formatDate(card.fecha_publicacion)}</div>
        <div class="timeline-dot"></div>
        <div class="timeline-hline"></div>
      </div>
      <div class="timeline-card${card.thumbnail ? '' : ' no-image'}">
        <div class="card-status-badges">
          ${card.validado !== true ? '<span class="card-no-validado">Sin validar</span>' : ''}
          ${card.descartado === true ? '<span class="card-no-validado">Descartado</span>' : ''}
        </div>
        ${imgHtml}
        <div class="card-actions"></div>
        <div class="card-body">
          ${
            card.thumbnail
              ? ''
              : `<div class="card-title">${card.nombre_fuente}${card.es_oficial ? `<span class="card-img-oficial card-oficial-wrap" title="Es fuente oficial">${this._oficialIconSvg()}</span>` : ''}</div>`
          }
          <div class="card-fecha-pub" title="Fecha de publicación">${this._formatDate(card.fecha_publicacion)}</div>
          ${card.notas_de_trabajo ? `<div class="card-notas-trabajo">${card.notas_de_trabajo}</div>` : ''}
          <div class="card-desc-slot">${
            summary.resumen_ia ? `<div class="card-desc">${summary.resumen_ia}</div>` : ''
          }</div>
          ${card.tonos_sociales && card.tonos_sociales.length ? `<div class="card-tone-wrap">${card.tonos_sociales.map((t) => `<span class="card-tone tone-${t.toLowerCase()}">${TONE_LABEL[t] || t}</span>`).join('')}</div>` : ''}
          <div class="card-temas-slot"></div>
          <div class="card-hint"><span class="card-hint-arrow"></span></div>
          <button class="card-collapse" title="Colapsar"></button>
          <button class="card-info-btn" title="Información">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          ${shareBtnHtml}
          <div class="card-info-menu"></div>
          <div class="card-protag-fuente-slot"></div>
          <div class="card-media-slot"></div>
          <div class="card-embed-slot"></div>
          <div class="card-videos-slot"></div>
          <div class="card-taxonomies-slot"></div>
        </div>
      </div>
    `;
    const timelineImg = el.querySelector('.card-image') as HTMLImageElement | null;
    if (timelineImg) {
      timelineImg.addEventListener('load', () => timelineImg.classList.add('loaded'));
      if (timelineImg.complete) timelineImg.classList.add('loaded');
    }
    const cardEl = el.querySelector('.timeline-card') as HTMLElement;
    cardEl.addEventListener('click', (e: Event) => {
      if (
        e.target &&
        (e.target as HTMLElement).closest(
          '.card-open, .card-collapse, .card-info-btn, .card-info-menu, .card-share-btn, .card-adjuntos, .card-inline-images, .card-inline-adjuntos, .card-edit'
        )
      )
        return;
      cardEl.classList.add('expanded');
      void this._ensureCardDetail(cardEl).then(() => {
        this._processCardEmbeds(cardEl);
      });
    });
    (cardEl.querySelector('.card-collapse') as HTMLElement).addEventListener('click', (e: Event) => {
      e.stopPropagation();
      cardEl.classList.remove('expanded');
    });
    (cardEl.querySelector('.card-info-btn') as HTMLElement).addEventListener('click', (e: Event) => {
      e.stopPropagation();
      (cardEl.querySelector('.card-info-menu') as HTMLElement).classList.toggle('open');
      const adjuntosMenu = cardEl.querySelector('.card-adjuntos-menu') as HTMLElement | null;
      if (adjuntosMenu) adjuntosMenu.classList.remove('open');
    });
    const shareBtn = el.querySelector('.card-share-btn') as HTMLElement | null;
    if (shareBtn) {
      shareBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        void this._shareItem(shareBtn.dataset.shareUrl || '', card.nombre_fuente, shareBtn);
      });
    }
    cardEl.dataset.cardId = String(card.id);
    if (hasDetail) {
      this._injectCardDetail(cardEl, card);
    }
    return el;
  }

  /** True if the card already carries its full detail payload (local mode) */
  protected _hasDetail(card: TimelineItem | TimelineItemSummary): boolean {
    return 'tipo_fuente' in card;
  }

  /** Build the "Actores principales" HTML block */
  protected _buildProtagonistaHtml(card: TimelineItem): string {
    const actors = card.actores_principales || [];
    const max = 3;
    const hasMore = actors.length > max;
    return actors.length
      ? `<div class="card-protagonista${hasMore ? ' has-more' : ''}" data-full="${actors.join(', ')}">
          <span class="protagonista-label">Actores principales:</span>
          <span class="protagonista-list">${actors.slice(0, max).join(', ')}${hasMore ? '...' : ''}</span>
         </div>`
      : `<div class="card-protagonista"><span class="protagonista-label">Actores principales:</span> -</div>`;
  }

  /** Build the "Fuente" HTML block */
  protected _buildFuenteHtml(card: TimelineItem): string {
    return `<div class="card-fuente"><span class="fuente-label">Fuente:</span> ${card.fuente_institucional ?? '-'}${card.es_oficial ? `<span class="card-oficial-wrap" title="Es fuente oficial">${this._oficialIconSvg()}</span>` : ''}</div>`;
  }

  /** Build the "Temas destacados" HTML block */
  protected _buildTemasHtml(card: TimelineItem): string {
    if (!card.temas || !card.temas.length) return '';
    return `<div class="card-temas">
        <div class="card-subtitle">Temas destacados</div>
        <div class="card-temas-list">
        ${card.temas
          .map(
            (t) => `
          <div class="tema-item tone-tema-${t.tono_social.toLowerCase()}">
            <div class="tema-content">
              <span class="tema-title"><span class="tema-tone">${TONE_LABEL[t.tono_social]}</span><span class="tema-title">${t.titulo}</span>${t.fecha_narrativa ? `<span class="tema-fecha" title="Fecha narrativa">[ ${this._formatDate(t.fecha_narrativa)} ]</span>` : ''}</span>
              <span class="tema-desc">${t.resumen}</span>
              ${t.notas_de_trabajo ? `<div class="tema-notas-trabajo">${t.notas_de_trabajo}</div>` : ''}
            </div>
          </div>`
          )
          .join('')}
        </div>
        </div>`;
  }

  /** Build the "Videos vinculados" HTML block */
  protected _buildVideosHtml(card: TimelineItem): string {
    if (!card.links_videos || !card.links_videos.length) return '';
    return `<div class="card-videos"><div class="card-subtitle card-iframe-subtitle">Videos vinculados</div><div class="card-videos-list">${card.links_videos
      .map((link) => this._parseLinkWeb(link))
      .filter((parsed): parsed is LinkInfo => parsed !== null)
      .map((parsed) => this._buildEmbed(parsed))
      .join('')}</div></div>`;
  }

  /** Build the inline "Imágenes" HTML block */
  protected _buildInlineImagesHtml(card: TimelineItem): string {
    if (!this.inlineImages || !card.imagenes || !card.imagenes.length) return '';
    return `<div class="card-inline-images"><div class="card-subtitle">Imágenes</div><div class="card-inline-images-list">${card.imagenes
      .map(
        (img, i) =>
          `<button class="card-inline-thumb" data-index="${i}"><img src="${this._encodeFileName(img.thumb)}" alt="" loading="lazy"></button>`
      )
      .join('')}</div></div>`;
  }

  /** Build the inline "Adjuntos" HTML block */
  protected _buildInlineAdjuntosHtml(card: TimelineItem): string {
    if (!this.inlineAdjuntos || !card.adjuntos || !card.adjuntos.length) return '';
    return `<div class="card-inline-adjuntos"><div class="card-subtitle">Adjuntos</div><div class="card-inline-adjuntos-list">${card.adjuntos
      .map((a) => {
        const ext = this._getFileExt(a);
        const name = a.substring(a.lastIndexOf('/') + 1);
        return `<a class="card-inline-adjunto${ext === 'pdf' ? ' card-inline-adjunto-pdf' : ''}" href="${this._encodeFileName(a)}" target="_blank" rel="noopener" title="${name}">${this._fileIconSvg(ext)}<span class="card-inline-adjunto-name">${name}</span></a>`;
      })
      .join('')}</div></div>`;
  }

  /** Build the card actions bar (screenshot, imágenes, adjuntos, abrir, editar) */
  protected _buildActionsHtml(card: TimelineItem): string {
    const imgCount = (card.imagenes || []).length;
    const adjCount = (card.adjuntos || []).length;
    return `<div class="card-actions-row">
        ${
          card.screenshot
            ? '<button class="card-actions-btn card-screenshot-btn" title="Captura de pantallla de la fuente"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144.12 144" width="14" height="14"><path d="M78.64,116.38q-18.12,0-36.22,0c-6.27,0-10.66-4.39-10.66-10.68q0-22.31,0-44.61A10.44,10.44,0,0,1,36.23,52a1.13,1.13,0,0,0,.49-1.11c0-1.36,0-2.72,0-4.08,0-1.92.39-2.51,2.29-2.89a15.06,15.06,0,0,1,6.41,0c1.54.36,2.06,1.14,2.09,2.74,0,1.15-.5,2.67.23,3.32s2.13.17,3.24.18c1.68,0,3.36-.06,5,0,1,.05,1.27-.26,1.36-1.22a12.06,12.06,0,0,1,7.79-10.66,13.4,13.4,0,0,1,5.22-1.08c5.56,0,11.12-.11,16.67,0,6.25.14,11.68,3.88,12.91,10.5A2,2,0,0,1,100,48c.1.71-.16,1.74.35,2.05s1.55.15,2.34.15h12.48a10.13,10.13,0,0,1,10.48,10.25q.1,22.85,0,45.69a10.13,10.13,0,0,1-10.46,10.27Q96.93,116.4,78.64,116.38Zm0-61.24A26.93,26.93,0,1,0,79.23,109c14.27-.16,26.3-12.34,26.31-26.91A26.91,26.91,0,0,0,78.68,55.14Z" transform="translate(-6.66 -4.82)"/><path d="M31.12,4.82H49.24a6.16,6.16,0,0,1,6.17,6.37,6.24,6.24,0,0,1-6.16,6.55q-14.22,0-28.43,0c-.92,0-1.18.2-1.18,1.15,0,9.48,0,19,0,28.43,0,3.33-2.34,5.73-5.93,6.16a6.46,6.46,0,0,1-6.86-4.59,5.16,5.16,0,0,1-.12-1.3q0-18.48,0-36.95a5.88,5.88,0,0,1,5.78-5.8C18.72,4.81,24.92,4.82,31.12,4.82Z" transform="translate(-6.66 -4.82)"/><path d="M126.32,148.77c-6,0-12.08-.13-18.11,0a6.31,6.31,0,0,1-6.08-7.35c.62-3.77,2.86-5.62,6.65-5.62,9.27,0,18.55,0,27.83,0,1.07,0,1.19-.35,1.18-1.27q0-14.16,0-28.31c0-3.34,2.3-5.71,5.93-6.17a6.51,6.51,0,0,1,6.83,4.46,4.94,4.94,0,0,1,.15,1.42q0,18.42,0,36.83a5.9,5.9,0,0,1-5.89,5.93H126.32Z" transform="translate(-6.66 -4.82)"/><path d="M150.7,29.18c0,5.92-.24,11.85.07,17.75.26,4.79-5.22,8.24-9.85,5.68a5.75,5.75,0,0,1-3.15-5.37c0-9.44,0-18.87,0-28.31,0-1-.29-1.21-1.25-1.21q-14.16.06-28.31,0c-3.35,0-5.73-2.24-6.14-5.91A6.39,6.39,0,0,1,106.51,5a5.34,5.34,0,0,1,1.42-.16h36.94a5.92,5.92,0,0,1,5.82,5.88Q150.7,20,150.7,29.18Z" transform="translate(-6.66 -4.82)"/><path d="M6.74,124.42c0-5.92.25-11.85-.07-17.75-.26-4.78,5.22-8.25,9.85-5.68a5.75,5.75,0,0,1,3.15,5.37c0,9.44,0,18.87,0,28.31,0,1,.28,1.21,1.25,1.21q14.14-.06,28.3,0c3.36,0,5.73,2.23,6.15,5.91a6.39,6.39,0,0,1-4.41,6.85,4.94,4.94,0,0,1-1.42.15H12.57a5.93,5.93,0,0,1-5.82-5.88Q6.74,133.65,6.74,124.42Z" transform="translate(-6.66 -4.82)"/><path d="M94.38,82.05A15.66,15.66,0,1,1,78.72,66.26,15.72,15.72,0,0,1,94.38,82.05Z" transform="translate(-6.66 -4.82)"/></svg> Captura</button>'
            : ''
        }
        ${
          imgCount > 0 && !this.inlineImages
            ? '<button class="card-actions-btn card-images-btn" title="Ver imágenes"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Imágenes <span class="card-actions-count">' +
              imgCount +
              '</span></button>'
            : ''
        }
        ${
          adjCount > 0 && !this.inlineAdjuntos
            ? `<div class="card-adjuntos"><button class="card-actions-btn card-adjuntos-btn" title="Ver adjuntos"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Adjuntos <span class="card-actions-count">${adjCount}</span></button><div class="card-adjuntos-menu">${(
                card.adjuntos || []
              )
                .map(
                  (a) =>
                    `<a class="card-adjunto-link" href="${this._encodeFileName(a)}" target="_blank" rel="noopener">${a.substring(a.lastIndexOf('/') + 1)}</a>`
                )
                .join('')}</div></div>`
            : ''
        }
        ${
          card.link_web
            ? `<a class="card-actions-btn card-open" href="${card.link_web}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Visitar
        </a>`
            : ''
        }
        ${
          this.internalButtons && card.link_edit_entry
            ? `<a class="card-actions-btn card-edit" href="${card.link_edit_entry}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          Editar
        </a>`
            : ''
        }
      </div>`;
  }

  /** Build the "Información" menu rows (ID, Tipo, Oficial, Captura) */
  protected _buildInfoMenuHtml(card: TimelineItem): string {
    const viewEntry = card.link_view_entry;
    const idRow = viewEntry
      ? `<a class="card-info-link" href="${viewEntry}" target="_blank" rel="noopener" title="Ver en vista individual">
          <span class="card-info-value">${card.id}</span>${this._externalLinkIconSvg()}
        </a>`
      : `<span class="card-info-value">${card.id}</span>`;
    return `<div class="card-info-row">
        <span class="card-info-label">ID</span>
        ${idRow}
      </div>
      <div class="card-info-row">
        <span class="card-info-label">Tipo</span>
        <span class="card-info-value">${card.tipo_fuente}</span>
      </div>
      <div class="card-info-row">
        <span class="card-info-label">Oficial</span>
        <span class="card-info-value">${card.es_oficial ? 'Sí' : 'No'}</span>
      </div>
      <div class="card-info-row">
        <span class="card-info-label">Captura</span>
        <span class="card-info-value">${this._formatDateTime(card.fecha_scrapeo)}</span>
      </div>`;
  }

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
  protected _buildTaxonomies(taxonomias: SingleTaxonomy[] | undefined): string {
    if (!Array.isArray(taxonomias)) return '';
    const groups = taxonomias
      .filter((tax) => tax && tax.label && Array.isArray(tax.items) && tax.items.length)
      .map((tax) => {
        const valid = tax.items.filter((item) => item && item.link && item.content);
        if (!valid.length) return '';
        const renderLink = (item: SingleTaxonomyItem) =>
          `<a class="card-taxonomy-link" href="${this._escapeHtml(item.link)}" target="_blank" rel="noopener">${this._escapeHtml(item.content)}</a>`;
        const items = valid
          .slice(0, TAXONOMY_VISIBLE_LINKS)
          .map((item) => `<li>${renderLink(item)}</li>`)
          .join('');
        const overflow = valid.slice(TAXONOMY_VISIBLE_LINKS);
        const overflowItems = overflow
          .map((item) => `<li class="card-taxonomy-extra" hidden>${renderLink(item)}</li>`)
          .join('');
        const toggle = overflow.length
          ? `<li class="card-taxonomy-more-item"><button type="button" class="card-taxonomy-more" aria-expanded="false">Ver más (${overflow.length})</button></li>`
          : '';
        const label = this._escapeHtml(tax.label);
        return `<div class="card-taxonomy">
          <div class="card-taxonomy-label" title="${label}">${label}</div>
          <ul class="card-taxonomy-list">${items}${overflowItems}${toggle}</ul>
        </div>`;
      })
      .filter((group) => group !== '');
    if (!groups.length) return '';
    return `<div class="card-taxonomies">${groups.join('')}</div>`;
  }

  /**
   * Bind the "Ver más" toggles of the taxonomy navigation block rendered inside
   * `root` (the `.card-taxonomies-slot` of a card), for the groups that overflow
   * `TAXONOMY_VISIBLE_LINKS`. Each toggle is independent: it shows/hides only its
   * own group, adding `expanded` to the `ul` (the class is what the component
   * CSS keys on, the `hidden` attribute is kept in sync for the case where the
   * stylesheet is not loaded).
   */
  protected _bindTaxonomyToggles(root: HTMLElement): void {
    root.querySelectorAll('.card-taxonomy-more').forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const button = e.currentTarget as HTMLElement;
        const list = button.closest('.card-taxonomy-list');
        if (!list) return;
        const extras = list.querySelectorAll('.card-taxonomy-extra');
        const expanded = button.getAttribute('aria-expanded') === 'true';
        list.classList.toggle('expanded', !expanded);
        extras.forEach((extra) => {
          (extra as HTMLElement).hidden = expanded;
        });
        button.setAttribute('aria-expanded', String(!expanded));
        button.textContent = expanded ? `Ver más (${extras.length})` : 'Ver menos';
      });
    });
  }

  /** Fill the card detail slots and bind their interactions */
  protected _injectCardDetail(cardEl: HTMLElement, card: TimelineItem): void {
    const actionsEl = cardEl.querySelector('.card-actions') as HTMLElement | null;
    const descSlot = cardEl.querySelector('.card-desc-slot') as HTMLElement | null;
    const temasSlot = cardEl.querySelector('.card-temas-slot') as HTMLElement | null;
    const protagFuenteSlot = cardEl.querySelector('.card-protag-fuente-slot') as HTMLElement | null;
    const mediaSlot = cardEl.querySelector('.card-media-slot') as HTMLElement | null;
    const videosSlot = cardEl.querySelector('.card-videos-slot') as HTMLElement | null;
    const taxonomiasSlot = cardEl.querySelector('.card-taxonomies-slot') as HTMLElement | null;

    if (actionsEl) {
      actionsEl.innerHTML = this._buildActionsHtml(card);
      const screenshotBtn = actionsEl.querySelector('.card-screenshot-btn') as HTMLElement | null;
      if (screenshotBtn) {
        screenshotBtn.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          this._openLightGallery([{ thumb: card.screenshot!, full: card.screenshot! }], card.nombre_fuente, false);
        });
      }
      const imagesBtn = actionsEl.querySelector('.card-images-btn') as HTMLElement | null;
      if (imagesBtn) {
        imagesBtn.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          if (card.imagenes && card.imagenes.length) {
            this._openLightGallery(card.imagenes, card.nombre_fuente, true);
          }
        });
      }
      const adjuntosWrap = actionsEl.querySelector('.card-adjuntos') as HTMLElement | null;
      if (adjuntosWrap) {
        const adjuntosBtn = adjuntosWrap.querySelector('.card-adjuntos-btn') as HTMLElement;
        const adjuntosMenu = adjuntosWrap.querySelector('.card-adjuntos-menu') as HTMLElement;
        adjuntosBtn.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          adjuntosMenu.classList.toggle('open');
          const infoMenu = cardEl.querySelector('.card-info-menu') as HTMLElement | null;
          if (infoMenu) infoMenu.classList.remove('open');
        });
      }
    }

    if (descSlot && card.resumen_ia) {
      descSlot.innerHTML = `<div class="card-desc">${card.resumen_ia}</div>`;
    }
    if (temasSlot) temasSlot.innerHTML = this._buildTemasHtml(card);
    if (protagFuenteSlot) {
      protagFuenteSlot.innerHTML = this._buildProtagonistaHtml(card) + this._buildFuenteHtml(card);
      const prot = protagFuenteSlot.querySelector('.card-protagonista.has-more') as HTMLElement | null;
      if (prot) {
        prot.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          prot.classList.toggle('expanded');
          const list = prot.querySelector('.protagonista-list') as HTMLElement;
          if (prot.classList.contains('expanded')) {
            list.textContent = prot.dataset.full || '';
          } else {
            list.textContent = (card.actores_principales || []).slice(0, 3).join(', ') + '...';
          }
        });
      }
    }
    if (mediaSlot) {
      mediaSlot.innerHTML = this._buildInlineImagesHtml(card) + this._buildInlineAdjuntosHtml(card);
      mediaSlot.querySelectorAll('.card-inline-thumb').forEach((thumb) => {
        const img = thumb.querySelector('img') as HTMLImageElement | null;
        if (img) {
          img.addEventListener('load', () => thumb.classList.add('loaded'));
          if (img.complete) thumb.classList.add('loaded');
        }
      });
      const inlineImages = mediaSlot.querySelector('.card-inline-images') as HTMLElement | null;
      if (inlineImages) {
        inlineImages.addEventListener('click', (e: Event) => {
          const thumb = (e.target as HTMLElement).closest('.card-inline-thumb') as HTMLElement | null;
          if (!thumb) return;
          e.stopPropagation();
          const index = Number(thumb.dataset.index) || 0;
          this._openLightGallery(card.imagenes, card.nombre_fuente, true, index);
        });
      }
    }
    if (videosSlot) {
      videosSlot.innerHTML = this._buildVideosHtml(card);
      videosSlot.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
        const iframe = wrap.querySelector('iframe') as HTMLIFrameElement | null;
        if (iframe) {
          iframe.addEventListener('load', () => wrap.classList.add('loaded'));
          if (iframe.contentDocument?.readyState === 'complete') wrap.classList.add('loaded');
        }
      });
    }
    if (taxonomiasSlot) {
      taxonomiasSlot.innerHTML = this._buildTaxonomies(card.taxonomias);
      this._bindTaxonomyToggles(taxonomiasSlot);
    }
    const embedSlot = cardEl.querySelector('.card-embed-slot') as HTMLElement | null;
    if (embedSlot) {
      const embedUrl = card.link_web ? this._parseLinkWeb(card.link_web) : null;
      if (embedUrl) {
        embedSlot.innerHTML = `<div class="card-embed"><div class="card-subtitle card-iframe-subtitle">Publicación original</div>${this._buildEmbed(embedUrl)}</div>`;
        embedSlot.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
          const iframe = wrap.querySelector('iframe') as HTMLIFrameElement | null;
          if (iframe) {
            iframe.addEventListener('load', () => wrap.classList.add('loaded'));
            if (iframe.contentDocument?.readyState === 'complete') wrap.classList.add('loaded');
          }
        });
      }
    }
    const infoMenuEl = cardEl.querySelector('.card-info-menu') as HTMLElement | null;
    if (infoMenuEl) {
      infoMenuEl.innerHTML = this._buildInfoMenuHtml(card);
    }
    cardEl.dataset.detailLoaded = '1';
  }

  /** Ensure the full detail of the card is present (fetches it when missing) */
  protected async _ensureCardDetail(cardEl: HTMLElement): Promise<void> {
    if (cardEl.dataset.detailLoaded) return;
    if (!this.api) return;
    const id = cardEl.dataset.cardId;
    if (!id) return;
    const cached = this._apiDetails.get(id);
    if (cached) {
      this._injectCardDetail(cardEl, cached);
      return;
    }
    const detail = await this._fetchDetail(id);
    if (detail) {
      this._injectCardDetail(cardEl, detail);
      this._preloadEmbedLibraries();
    }
  }

  /** Process the lazy social embeds (Instagram, Twitter, Facebook) once the card is expanded */
  protected _processCardEmbeds(cardEl: HTMLElement): void {
    const igWraps = cardEl.querySelectorAll('.card-iframe-instagram');
    if (igWraps.length) {
      setTimeout(() => {
        igWraps.forEach((igWrap) => {
          if (!igWrap.querySelector('.instagram-media')) {
            const embedUrl = igWrap.getAttribute('data-embed-url');
            if (embedUrl) {
              const blockquote = document.createElement('blockquote');
              blockquote.className = 'instagram-media';
              blockquote.setAttribute('data-instgrm-permalink', embedUrl);
              blockquote.setAttribute('data-instgrm-version', '14');
              blockquote.style.cssText =
                'background:#FFF;border:0;border-radius:3px;margin:1px;max-width:100%;min-width:326px;padding:0;width:calc(100% - 2px)';
              igWrap.insertAdjacentElement('afterbegin', blockquote);
            }
          }
        });
        if (typeof instgrm !== 'undefined' && instgrm.Embeds) {
          instgrm.Embeds.process();
        } else if (!cardEl.querySelector('.card-iframe-instagram iframe')) {
          const waitForInstgrm = setInterval(() => {
            if (typeof instgrm !== 'undefined' && instgrm.Embeds) {
              instgrm.Embeds.process();
              clearInterval(waitForInstgrm);
            }
          }, 200);
          setTimeout(() => clearInterval(waitForInstgrm), 15000);
        }
        igWraps.forEach((igWrap) => {
          if (!igWrap.classList.contains('loaded')) {
            const check = setInterval(() => {
              const iframe = igWrap.querySelector('iframe');
              if (!iframe) return;
              clearInterval(check);
              iframe.addEventListener('load', () => igWrap.classList.add('loaded'), { once: true });
              setTimeout(() => igWrap.classList.add('loaded'), 3000);
            }, 100);
            setTimeout(() => igWrap.classList.add('loaded'), 10000);
          }
        });
      }, 150);
    }
    const twWraps = cardEl.querySelectorAll('.card-iframe-twitter') as NodeListOf<HTMLElement>;
    if (twWraps.length) {
      setTimeout(() => {
        twWraps.forEach((twWrap) => {
          if (!twWrap.querySelector('iframe')) {
            if (typeof twttr !== 'undefined' && twttr.widgets) {
              twttr.widgets.load(twWrap);
            } else {
              const waitForTwttr = setInterval(() => {
                if (typeof twttr !== 'undefined' && twttr.widgets) {
                  twttr.widgets.load(twWrap);
                  clearInterval(waitForTwttr);
                }
              }, 200);
              setTimeout(() => clearInterval(waitForTwttr), 15000);
            }
          }
        });
        twWraps.forEach((twWrap) => {
          if (!twWrap.classList.contains('loaded')) {
            const check = setInterval(() => {
              const iframe = twWrap.querySelector('iframe');
              if (!iframe) return;
              clearInterval(check);
              iframe.addEventListener('load', () => twWrap.classList.add('loaded'), { once: true });
              setTimeout(() => twWrap.classList.add('loaded'), 3000);
            }, 100);
            setTimeout(() => twWrap.classList.add('loaded'), 10000);
          }
        });
      }, 150);
    }
    const fbWraps = cardEl.querySelectorAll('.card-iframe-facebook') as NodeListOf<HTMLElement>;
    if (fbWraps.length) {
      setTimeout(() => {
        fbWraps.forEach((fbWrap) => {
          if (!fbWrap.querySelector('iframe')) {
            if (typeof FB !== 'undefined' && FB.XFBML) {
              FB.XFBML.parse(fbWrap);
            } else {
              const waitForFB = setInterval(() => {
                if (typeof FB !== 'undefined' && FB.XFBML) {
                  FB.XFBML.parse(fbWrap);
                  clearInterval(waitForFB);
                }
              }, 200);
              setTimeout(() => clearInterval(waitForFB), 15000);
            }
          }
        });
        fbWraps.forEach((fbWrap) => {
          if (!fbWrap.classList.contains('loaded')) {
            const check = setInterval(() => {
              const iframe = fbWrap.querySelector('iframe');
              if (!iframe) return;
              clearInterval(check);
              iframe.addEventListener('load', () => fbWrap.classList.add('loaded'), { once: true });
              setTimeout(() => fbWrap.classList.add('loaded'), 3000);
            }, 100);
            setTimeout(() => fbWrap.classList.add('loaded'), 10000);
          }
        });
      }, 150);
    }
  }

  /** Insert an element before the timeline footer, or append if no footer */
  protected _insertBeforeFooter(el: HTMLElement): void {
    const footer = this.timelineCards.querySelector('.timeline-footer-item');
    if (footer) {
      this.timelineCards.insertBefore(el, footer);
    } else {
      this.timelineCards.appendChild(el);
    }
  }

  /**
   * Insert an element at the end of the cards, that is: before the first element of the
   * trailing block (load-more button, status row, footer), which is what keeps the append
   * order identical to the one `_renderTimeline` + `_renderLoadMoreButton` + `_renderStatus`
   * build. `querySelector` returns the first match in document order, so the load-more button
   * wins when it is there.
   */
  protected _insertBeforeTrailing(el: HTMLElement): void {
    const anchor = this.timelineCards.querySelector(
      '.timeline-load-more-item, .timeline-status-item, .timeline-footer-item'
    );
    if (anchor) {
      this.timelineCards.insertBefore(el, anchor);
    } else {
      this.timelineCards.appendChild(el);
    }
  }

  /** Render the timeline cards list, including the last-updated footer */
  protected _renderTimeline(cards: TimelineItem[]): void {
    this.timelineCards.innerHTML = '';
    if (cards.length === 0) {
      const el = document.createElement('div');
      el.className = 'timeline-item timeline-empty-item';
      el.innerHTML = `
        <div class="timeline-date-col"></div>
        <div class="timeline-empty-text">Sin publicaciones para mostrar</div>
      `;
      this.timelineCards.appendChild(el);
    } else {
      cards.forEach((card, i) => {
        this.timelineCards.appendChild(this._createTimelineItem(card, i));
      });
    }

    this._renderLastUpdated();
  }

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
  protected _appendTimelineItems(items: TimelineItem[], startIndex: number): HTMLElement[] {
    // `_renderTimeline` only writes the "nothing to show" placeholder when the list comes back
    // empty. Appending cards makes it untrue, so it goes before the first real one lands.
    if (items.length) {
      this.timelineCards.querySelectorAll('.timeline-empty-item').forEach((el) => el.remove());
    }
    const added: HTMLElement[] = [];
    items.forEach((card, i) => {
      const el = this._createTimelineItem(card, startIndex + i);
      this._insertBeforeTrailing(el);
      added.push(el);
    });
    return added;
  }

  /**
   * Write (or rewrite) the last-updated footer at the end of the timeline. Extracted from
   * `_renderTimeline` because in API mode `lastUpdated` arrives with the facets response,
   * which is requested long after the page that rendered the timeline: patching the footer
   * avoids re-rendering the timeline and losing a card the user already expanded.
   */
  protected _renderLastUpdated(): void {
    this.timelineCards.querySelectorAll('.timeline-footer-item').forEach((f) => f.remove());
    if (!this.lastUpdated) return;
    const d = new Date(this.lastUpdated);
    const formatted =
      d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' a las ' +
      d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const el = document.createElement('div');
    el.className = 'timeline-item timeline-footer-item';
    el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-footer-dot"></div>
      </div>
      <div class="timeline-footer-text">Actualizado por última vez el ${formatted}.</div>
    `;
    this.timelineCards.appendChild(el);
  }

  /** Set up IntersectionObserver for the featured cards entrance animation */
  protected _setupObserver(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = this.featuredContainer.querySelectorAll('.featured-card');
            cards.forEach((c) => c.classList.add('visible'));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(this.section);
  }

  /**
   * Set up IntersectionObserver for the timeline items entrance animation.
   *
   * `items` narrows what gets observed, which is what pagination needs: after an append the
   * cards already on screen are visible and their own observer has already done its job, so
   * there is nothing to re-observe. Default is every `.timeline-item` in the container.
   */
  protected _setupTimelineObserver(items?: ArrayLike<Element>): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px 100px 0px' }
    );

    const targets = items ?? this.container.querySelectorAll('.timeline-item');
    Array.from(targets).forEach((item) => {
      observer.observe(item);
    });
  }

  /** Dynamically load social media embed scripts (Instagram, Twitter, Facebook) as needed */
  protected _preloadEmbedLibraries(): void {
    const types = new Set<string>();
    this.allCards.forEach((card) => {
      const urls: string[] = [];
      if (card.link_web) urls.push(card.link_web);
      if (card.links_videos && card.links_videos.length) urls.push(...card.links_videos);
      urls.forEach((url) => {
        const parsed = this._parseLinkWeb(url);
        if (parsed) types.add(parsed.type);
      });
    });
    this.container.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
      const cls = wrap.classList;
      if (cls.contains('card-iframe-instagram')) types.add('instagram');
      else if (cls.contains('card-iframe-twitter')) types.add('twitter');
      else if (cls.contains('card-iframe-facebook')) types.add('facebook');
      else if (cls.contains('card-iframe-youtube')) types.add('youtube');
    });

    const _watchEmbeds = (selector: string) => {
      const scan = setInterval(() => {
        const wraps = document.querySelectorAll(selector);
        let pending = 0;
        wraps.forEach((wrap) => {
          if (wrap.classList.contains('loaded')) return;
          const iframe = wrap.querySelector('iframe');
          if (!iframe) {
            pending++;
            return;
          }
          iframe.addEventListener('load', () => wrap.classList.add('loaded'), { once: true });
          pending++;
        });
        if (pending === 0) clearInterval(scan);
      }, 200);
      setTimeout(() => clearInterval(scan), 15000);
    };

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });
    };

    // Twitter can load in parallel (no conflict with other SDKs)
    if (types.has('twitter') && !document.querySelector('script[src*="platform.twitter.com/widgets.js"]')) {
      loadScript(TWITTER_WIDGETS_SCRIPT).then(() => {
        _watchEmbeds('.card-iframe-twitter');
      });
    }

    // Instagram must finish before Facebook, because Facebook's SDK
    // sets window.FB which causes Instagram's embed.js to skip its
    // initialization (embed.js checks: (window.FB && !window.FB.__buffer))
    const loadInstagram =
      types.has('instagram') && !document.querySelector('script[src*="instagram.com/embed.js"]')
        ? loadScript(INSTAGRAM_EMBED_SCRIPT).then(() => {
            _watchEmbeds('.card-iframe-instagram');
          })
        : Promise.resolve();

    loadInstagram.then(() => {
      if (types.has('facebook') && !document.querySelector('script[src*="connect.facebook.net"]')) {
        if (!document.getElementById('fb-root')) {
          const fbRoot = document.createElement('div');
          fbRoot.id = 'fb-root';
          document.body.prepend(fbRoot);
        }
        const s = document.createElement('script');
        s.src = FACEBOOK_SDK_URL;
        s.async = true;
        s.defer = true;
        s.crossOrigin = 'anonymous';
        s.onload = () => {
          _watchEmbeds('.card-iframe-facebook');
        };
        document.head.appendChild(s);
      }
    });
  }

  /**
   * Turn the expanded state on (classes, icon and aria) without flipping `isExpanded`.
   * Shared by the toggle and by `_init` when the `startExpanded` option is set, so the
   * initial state and a click end up with exactly the same DOM.
   */
  protected _applyExpandState(): void {
    this.section.classList.add('expanded');
    this.timelineContainer.classList.add('expanded');
    this.expandIcon.classList.add('rotated');
    this.expandToggle.setAttribute('aria-expanded', 'true');
  }

  /** Mirror of _applyExpandState for the collapsed state */
  protected _collapseExpandState(): void {
    this.section.classList.remove('expanded');
    this.timelineContainer.classList.remove('expanded');
    this.expandIcon.classList.remove('rotated');
    this.expandToggle.setAttribute('aria-expanded', 'false');
  }

  /** Toggle between expanded (timeline visible) and collapsed state */
  protected _toggleExpand(scrollTo = false): void {
    // En fullpage el timeline no se colapsa nunca. El click del botón ya no se bindea, pero
    // esta guarda también cubre los otros dos caminos que llegan acá (#featured-cards y la
    // fila de arriba) sin tener que repetir la condición en cada listener.
    if (this.fullpage) return;
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this._applyExpandState();
      requestAnimationFrame(() => {
        this._setupTimelineObserver();
      });
      // The facets (counts, collection total, lastUpdated) are already loaded at startup; this
      // is a cache hit that also covers the case where that request failed: no re-request.
      if (this.api) void this._ensureApiFacets();
      this._preloadEmbedLibraries();
    } else {
      const cards = this.featuredContainer.querySelectorAll('.featured-card');
      cards.forEach((c) => ((c as HTMLElement).style.transition = 'none'));
      cards.forEach((c) => c.classList.remove('visible'));
      void this.featuredContainer.offsetHeight;
      cards.forEach((c) => ((c as HTMLElement).style.transition = ''));

      this._collapseExpandState();
      this.container.querySelectorAll('.timeline-item').forEach((item) => {
        item.classList.remove('visible');
      });

      if (scrollTo) this._scrollToSection();

      setTimeout(() => {
        cards.forEach((c) => c.classList.add('visible'));
      }, 100);
    }
  }

  /** Scroll the page/section to make the timeline container visible */
  protected _scrollToSection(): void {
    const offset = 60;
    const rect = this.section.getBoundingClientRect();
    let el = this.section.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (
        style.overflowY === 'auto' ||
        style.overflowY === 'scroll' ||
        style.overflow === 'auto' ||
        style.overflow === 'scroll'
      ) {
        el.scrollTo({ top: el.scrollTop + rect.top - offset, behavior: 'smooth' });
        return;
      }
      el = el.parentElement;
    }
    window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'smooth' });
  }

  /** Toggle timeline sort order between ascending and descending */
  protected _toggleSort(): void {
    this.sortAscending = !this.sortAscending;
    this.sortToggle.classList.toggle('asc', this.sortAscending);
    this._applyFilters(true);
  }

  /** Apply the persisted work-notes visibility state to the section and toggle button */
  protected _applyWorkNotesState(): void {
    if (!this.workNotesToggle) return;
    let hidden = false;
    try {
      hidden = window.localStorage.getItem(WORK_NOTES_STORAGE_KEY) === '1';
    } catch {
      /* localStorage unavailable */
    }
    this.section.classList.toggle('work-notes-hidden', hidden);
    this.workNotesToggle.classList.toggle('active', hidden);
    this.workNotesToggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    this.workNotesToggle.title = hidden ? 'Mostrar notas de trabajo' : 'Ocultar notas de trabajo';
  }

  /** Toggle work-notes visibility and persist the state to localStorage */
  protected _toggleWorkNotes(): void {
    if (!this.workNotesToggle) return;
    const hidden = !this.section.classList.contains('work-notes-hidden');
    this.section.classList.toggle('work-notes-hidden', hidden);
    this.workNotesToggle.classList.toggle('active', hidden);
    this.workNotesToggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    this.workNotesToggle.title = hidden ? 'Mostrar notas de trabajo' : 'Ocultar notas de trabajo';
    try {
      window.localStorage.setItem(WORK_NOTES_STORAGE_KEY, hidden ? '1' : '0');
    } catch {
      /* localStorage unavailable */
    }
  }

  /** Build filter checkboxes from the available filter values (local data or the one-time API facets) */
  protected _buildFilterCheckboxes(): void {
    const savedEstado = this._loadEstadoFilterState();
    let anyFilterVisible = false;
    this.filters.forEach((f) => {
      if (!f.options) return;
      const isEstado = ESTADO_FILTER_FIELDS.includes(f.field);
      let values: string[];
      let counts: Record<string, number>;
      if (this.api) {
        const facetCounts = this._apiFacets[f.field] || {};
        values = f.fixedValues ? [...f.fixedValues] : Object.keys(facetCounts).filter((v) => (facetCounts[v] || 0) > 0);
        counts = facetCounts;
      } else {
        values = f.fixedValues
          ? [...f.fixedValues]
          : [
              ...new Set(
                this._scopeItems().flatMap((c) => {
                  const v = f.extract ? f.extract(c) : c[f.field];
                  const arr = v == null ? [] : Array.isArray(v) ? v : [v];
                  return arr.map((x) => String(x)).filter(Boolean);
                })
              )
            ];
        counts = {};
        values.forEach((val) => {
          counts[val] = this._scopeItems().filter((c) => {
            const v = f.extract ? f.extract(c) : c[f.field];
            const arr = Array.isArray(v) ? v.map((x) => String(x)) : [v == null ? '' : String(v)];
            return arr.includes(val);
          }).length;
        });
      }
      if (!f.fixedValues && values.length <= 1) {
        f.checkboxes = [];
        f.options.hidden = true;
        return;
      }
      f.options.hidden = false;
      if (!isEstado) anyFilterVisible = true;
      if (f.sortValues) values.sort(f.sortValues);
      f.options.innerHTML = '';
      f.checkboxes = [];
      values.forEach((val) => {
        const label = document.createElement('label');
        label.className = 'filter-option';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = val;
        const savedValues = ESTADO_FILTER_FIELDS.includes(f.field) ? savedEstado[f.field] : undefined;
        cb.checked = savedValues
          ? savedValues.includes(val)
          : f.defaultChecked
            ? f.defaultChecked.includes(val)
            : false;
        const span = document.createElement('span');
        span.className = 'filter-option-label';
        const display = f.formatLabel ? f.formatLabel(val) : val;
        span.textContent = display;
        const countSpan = document.createElement('span');
        countSpan.className = 'filter-option-count';
        countSpan.textContent = `(${counts[val] || 0})`;
        label.title = display;
        label.appendChild(cb);
        label.appendChild(span);
        label.appendChild(countSpan);
        cb.addEventListener('change', () => {
          if (ESTADO_FILTER_FIELDS.includes(f.field)) this._saveEstadoFilterState();
          this._applyFilters(true);
        });
        f.options.appendChild(label);
        f.checkboxes.push(cb);
      });
    });
    this.container.querySelectorAll('.filter-section').forEach((sectionEl) => {
      const section = sectionEl as HTMLElement;
      const opts = Array.from(section.querySelectorAll<HTMLElement>('.filter-options'));
      const hasOptions = opts.some((o) => this.filters.some((ef) => ef.options === o && ef.checkboxes.length > 0));
      section.hidden = opts.length > 0 && !hasOptions;
    });
    if (this.estadoWrap) {
      this.estadoWrap.style.display = '';
    }
    // En modo API el botón se muestra desde el arranque aunque todavía no haya facets: sin ellos
    // los grupos sin `fixedValues` no tienen valores, y esperar la respuesta deja el toolbar
    // incompleto y lo ensancha de golpe (muy notorio al iniciar con `startExpanded`). El panel se
    // arma con la respuesta, y hasta entonces el botón no tiene listener, así que no abre nada.
    // Cuando el pedido termina manda `anyFilterVisible`: si no hay nada que filtrar, se oculta
    // solo. En modo local los valores ya están, así que la condición queda como estaba.
    const pendingFacets = !!this.api && !this._apiFacetsSettled;
    this.filterToggle.style.display = anyFilterVisible || pendingFacets ? '' : 'none';
  }

  /** Load the persisted estado-interno filter state from localStorage */
  protected _loadEstadoFilterState(): Record<string, string[]> {
    try {
      const raw = window.localStorage.getItem(ESTADO_FILTER_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, string[]>) : {};
    } catch {
      return {};
    }
  }

  /** Persist the current estado-interno filter state to localStorage */
  protected _saveEstadoFilterState(): void {
    const state: Record<string, string[]> = {};
    ESTADO_FILTER_FIELDS.forEach((field) => {
      const f = this.filters.find((x) => x.field === field);
      if (f) state[field] = f.checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
    });
    try {
      window.localStorage.setItem(ESTADO_FILTER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* localStorage unavailable */
    }
  }

  /** Normalize a string for accent- and case-insensitive search matching */
  protected _normalizeSearch(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  /** Check whether a card matches the current search term */
  protected _matchesSearch(card: TimelineItem): boolean {
    const q = this._normalizeSearch(this.searchTerm.trim());
    if (!q) return true;
    const haystacks = [
      String(card.id),
      card.nombre_fuente,
      card.fuente_institucional,
      card.actores_principales?.join(' ') ?? ''
    ];
    return haystacks.some((v) => this._normalizeSearch(v).includes(q));
  }

  /** Page size used by the API mode (falls back to 6 when itemsPerPage is 0/unset) */
  protected _apiPageSize(): number {
    return this.itemsPerPage > 0 ? this.itemsPerPage : 6;
  }

  /** True when there are more pages to load */
  protected _hasMorePages(): boolean {
    if (this.api) return this.allCards.length < this._apiTotal;
    return this.itemsPerPage > 0 && this._displayedCount < this.allCards.length;
  }

  /** Fetch a JSON resource from the API with the configured fetch implementation */
  protected async _apiFetch<T>(path: string, params: Record<string, string>): Promise<T> {
    const cfg = this.api!;
    const base = cfg.url.replace(/\/+$/, '');
    const qs = new URLSearchParams(params).toString();
    const fetchImpl = cfg.fetchImpl || window.fetch.bind(window);
    const response = await fetchImpl(`${base}${path}${qs ? '?' + qs : ''}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return (await response.json()) as T;
  }

  /** Build the query string params for the list endpoint from the current UI state */
  protected _buildQueryParams(page: number): Record<string, string> {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(this._apiPageSize()),
      sort: this.sortAscending ? 'asc' : 'desc'
    };
    if (this.searchTerm.trim()) params.q = this.searchTerm.trim();
    this.filters.forEach((f) => {
      const active = f.checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
      if (active.length === 0) return;
      params[f.field] = active.join(',');
    });
    return params;
  }

  /**
   * Fetch the filter facets (`GET {url}/facets`), at most once per instance.
   * They are static values over the whole collection (counts, total and lastUpdated), so they
   * never need to be re-requested. On failure the filter panel is still built (with empty
   * counts) and `_fetchPage` falls back to the legacy `facets` of the list response when the
   * server sends them: that is why a failed request must not clear facets that
   * `_adoptLegacyApiFacets` already took.
   */
  protected async _loadApiFacets(): Promise<void> {
    try {
      const data = await this._apiFetch<TimelineApiFacetsResponse>('/facets', {});
      if (data && data.facets) {
        this._apiFacets = data.facets;
        this._apiFacetsLoaded = true;
      }
      if (data && typeof data.total === 'number') this._apiCollectionTotal = data.total;
      if (data && data.lastUpdated && !this.lastUpdated) this.lastUpdated = data.lastUpdated;
    } catch {
      if (!this._apiFacetsLoaded) this._apiFacets = {};
    }
  }

  /**
   * Wrapper around `_loadApiFacets`: requested at startup in API mode (see `_init`), in parallel
   * with the first page. The promise is cached, so it is requested only once per instance even
   * if `_toggleExpand` calls it again on the first expand.
   * It also brings the static values that only the facets response carries: the `lastUpdated`
   * of the footer and the collection `total` of the expand button counter, so both can be
   * written without re-rendering the timeline.
   */
  protected _ensureApiFacets(): Promise<void> {
    if (!this.api) return Promise.resolve();
    if (!this._apiFacetsPromise) {
      this._apiFacetsPromise = this._loadApiFacets().then(() => {
        // El pedido terminó, con facets o con fallo: a partir de acá la visibilidad del botón la
        // decide `_buildFilterCheckboxes` sola, y se le puede colgar el listener porque el panel
        // ya tiene los valores (o se confirmó que no hay).
        this._apiFacetsSettled = true;
        this._buildFilterCheckboxes();
        if (this.api) this._bindFilterToggle();
        this._syncFilterToggleState();
        this._renderRelatedCount();
        this._renderLastUpdated();
      });
    }
    return this._apiFacetsPromise;
  }

  /** Fetch a page of items from the API and (re)build the whole view */
  protected async _fetchPage(page: number): Promise<void> {
    const seq = ++this._apiSeq;
    this._apiPage = page;
    this._apiLoading = true;
    this._apiError = '';
    this._renderStatus();
    try {
      const data = await this._apiFetch<TimelineApiPageResponse>('', this._buildQueryParams(page));
      if (seq !== this._apiSeq) return;
      this._apiTotal = typeof data.total === 'number' ? data.total : this.allCards.length;
      this._apiLoading = false;
      this.allCards = Array.isArray(data.items) ? (data.items as unknown as TimelineItem[]) : [];
      this._displayedCount = this.allCards.length;
      this._apiDetails.clear();
      this._adoptLegacyApiFacets(data);
      this._renderAll();
      // Page 1 means the whole list was replaced by a search/filter/sort change: bring the
      // timeline back to its first card. "Cargar más" (`_appendPageItems`) appends instead of
      // re-rendering, so it never comes through here and the position survives on its own.
      if (page === 1) this.timelineCards.scrollTop = 0;
    } catch {
      if (seq !== this._apiSeq) return;
      this._apiLoading = false;
      this._apiError = 'No se pudieron cargar los datos. Intente nuevamente.';
      // No `_renderAll` here: the results in memory are the ones the panel no longer matches, so
      // they stay out and the list is left empty with the error row.
      this._clearApiLoading();
      this._renderStatus();
    }
  }

  /**
   * Fallback for servers that do not implement `GET {url}/facets` and still send the facets
   * inside the list response. Runs at most once: after that `_apiFacets` is never reassigned.
   */
  protected _adoptLegacyApiFacets(data: TimelineApiPageResponse): void {
    if (this._apiFacetsLoaded || !data.facets) return;
    this._apiFacets = data.facets;
    this._apiFacetsLoaded = true;
    this._buildFilterCheckboxes();
    this._syncFilterToggleState();
  }

  /** Fetch the next page of items and append them to the timeline */
  protected async _appendPageItems(): Promise<void> {
    const seq = this._apiSeq;
    const nextPage = this._apiPage + 1;
    this._apiLoading = true;
    this._apiError = '';
    this._renderStatus();
    try {
      const data = await this._apiFetch<TimelineApiPageResponse>('', this._buildQueryParams(nextPage));
      if (seq !== this._apiSeq) return;
      this._apiTotal = typeof data.total === 'number' ? data.total : this._apiTotal;
      this._apiPage = nextPage;
      this._apiLoading = false;
      const start = this.allCards.length;
      const fresh = (data.items || []) as unknown as TimelineItem[];
      this.allCards.push(...fresh);
      this._displayedCount = this.allCards.length;
      // Only the new cards are added; `_renderAll` would rebuild the whole list and make every
      // card on screen replay its entrance animation. See `_appendTimelineItems`.
      const added = this._appendTimelineItems(fresh, start);
      // The load-more button is kept between pages (its handler reads `this._apiPage` live, so
      // one node serves every page) and only goes away when there is nothing left to ask for.
      if (!this._hasMorePages()) {
        this.timelineCards.querySelectorAll('.timeline-load-more-item').forEach((el) => el.remove());
      }
      this._renderRelatedCount();
      this._renderStatus();
      if (this.isExpanded) {
        requestAnimationFrame(() => this._setupTimelineObserver(added));
      }
    } catch {
      if (seq !== this._apiSeq) return;
      this._apiLoading = false;
      this._apiError = 'No se pudieron cargar más datos. Intente nuevamente.';
      this._renderStatus();
    }
  }

  /** Fetch the full detail of a single item by id */
  protected async _fetchDetail(id: string): Promise<TimelineItem | null> {
    const seq = ++this._apiSeq;
    try {
      const data = await this._apiFetch<TimelineItem>(`/${encodeURIComponent(id)}`, {});
      if (seq !== this._apiSeq) return null;
      if (!data || data.id == null) {
        this._apiDetails.set(id, null);
        return null;
      }
      this._apiDetails.set(id, data);
      return data;
    } catch {
      if (seq !== this._apiSeq) return null;
      this._apiDetails.set(id, null);
      return null;
    }
  }

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
  protected _schedulePageReload(immediate = false): void {
    const reload = () => {
      this._apiReloadTimer = 0;
      void this._fetchPage(1);
    };
    if (this._apiReloadTimer) {
      window.clearTimeout(this._apiReloadTimer);
      this._apiReloadTimer = window.setTimeout(reload, API_RELOAD_DEBOUNCE_MS);
      return;
    }
    if (immediate) {
      void this._fetchPage(1);
      this._apiReloadTimer = window.setTimeout(() => {
        this._apiReloadTimer = 0;
      }, API_RELOAD_DEBOUNCE_MS);
      return;
    }
    this._apiReloadTimer = window.setTimeout(reload, API_RELOAD_DEBOUNCE_MS);
  }

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
  protected _renderApiLoading(): void {
    if (this.timelineCards.querySelector('.timeline-skeleton-item')) return;
    this._apiLoading = true;
    this._apiError = '';
    this.timelineCards.setAttribute('aria-busy', 'true');
    this.timelineCards.innerHTML = '';
    this.featuredContainer.innerHTML = '';
    const markup = `
        <div class="timeline-date-col">
          <div class="skeleton-block skeleton-date"></div>
          <div class="timeline-dot"></div>
        </div>
        <div class="timeline-card">
          <div class="card-image-wrap"></div>
          <div class="card-body">
            <div class="skeleton-block skeleton-title-line skeleton-w-100"></div>
            <div class="skeleton-block skeleton-title-line skeleton-w-80"></div>
            <div class="skeleton-block skeleton-desc-line skeleton-w-100"></div>
            <div class="skeleton-block skeleton-desc-line skeleton-w-100"></div>
            <div class="skeleton-block skeleton-desc-line skeleton-w-60"></div>
          </div>
        </div>
      `;
    const first = this._appendTimelineSkeleton(markup);
    const style = getComputedStyle(first);
    const stride = first.offsetHeight + (parseFloat(style.marginBottom) || 0);
    const total = Math.max(1, Math.min(this._apiPageSize(), Math.ceil(this._getCardsHeightPx() / stride)));
    for (let i = 1; i < total; i++) this._appendTimelineSkeleton(markup);
    // Ídem con los featured: en fullpage no se renderizan en ningún momento (ver `_renderFeatured`).
    if (this.fullpage) return;
    for (let i = 0; i < this.featured_count; i++) {
      const el = document.createElement('div');
      el.className = 'featured-card featured-skeleton visible';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `
        <div class="card-image-wrap"></div>
        <div class="card-body">
          <div class="skeleton-block skeleton-desc-line skeleton-w-50"></div>
          <div class="skeleton-block skeleton-title-line skeleton-w-100"></div>
          <div class="skeleton-block skeleton-title-line skeleton-w-80"></div>
        </div>
      `;
      this.featuredContainer.appendChild(el);
    }
  }

  /**
   * One timeline placeholder, so the count loop and the measuring placeholder share the markup.
   * Returns the element because the caller measures the first one to size the rest.
   */
  protected _appendTimelineSkeleton(markup: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'timeline-item timeline-skeleton-item visible';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = markup;
    this.timelineCards.appendChild(el);
    return el;
  }

  /**
   * Take the loading state down without touching anything else, for the two paths where no
   * `_renderAll` follows: a failed request (so the list is left empty with the error row) and
   * the real render itself (which wipes both containers anyway, leaving only `aria-busy`).
   */
  protected _clearApiLoading(): void {
    this.timelineCards.removeAttribute('aria-busy');
    this.timelineCards.querySelectorAll('.timeline-skeleton-item').forEach((el) => el.remove());
    this.featuredContainer.querySelectorAll('.featured-skeleton').forEach((el) => el.remove());
  }

  /** Render the API status row (loading / error / count) at the end of the timeline */
  protected _renderStatus(): void {
    // The skeletons are the loading feedback while the list is being replaced, and their count
    // already matches the page that is coming. Adding a row on top of them would only pile a
    // second, wrong line ("Cargando más publicaciones...") under the placeholders.
    if (this.timelineCards.querySelector('.timeline-skeleton-item')) return;
    const prev = this.timelineCards.querySelector('.timeline-status-item');
    if (prev) prev.remove();
    let text = '';
    if (this._apiError) text = this._apiError;
    else if (this._apiLoading && this.allCards.length === 0) text = 'Cargando publicaciones...';
    else if (this._apiLoading && this.allCards.length > 0) text = 'Cargando más publicaciones...';
    else if (this._apiTotal > 0) text = `Mostrando ${this.allCards.length} de ${this._apiTotal} publicaciones`;
    if (!text) return;
    const el = document.createElement('div');
    el.className = 'timeline-item timeline-status-item';
    el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-footer-dot"></div>
      </div>
      <div class="timeline-status-text">${text}</div>
    `;
    this._insertBeforeFooter(el);
  }

  /** Sync the active class on the search/filter/estado toggle buttons */
  protected _syncFilterToggleState(): void {
    const anyActive = this.filters
      .filter((f) => !ESTADO_FILTER_FIELDS.includes(f.field))
      .some((f) => f.checkboxes.some((cb) => cb.checked));
    this.filterToggle.classList.toggle('active', anyActive);
    const estadoActive = this.filters
      .filter((f) => ESTADO_FILTER_FIELDS.includes(f.field))
      .some((f) => f.checkboxes.some((cb) => cb.checked));
    if (this.estadoToggle) this.estadoToggle.classList.toggle('active', estadoActive);
    this.searchToggle.classList.toggle('active', this.searchTerm.trim().length > 0);
  }

  /**
   * Apply active filters and re-render the full view (or reload from the API).
   * `immediate` only means something in API mode: it asks for the leading edge of
   * `_schedulePageReload`, for the discrete changes that have nothing to coalesce.
   */
  protected _applyFilters(immediate = false): void {
    this._syncFilterToggleState();
    if (this.api) {
      // The results on screen no longer match the panel, so they go away right now instead of
      // sitting there stale until the response: `_renderApiLoading` puts the skeletons in their
      // place and `_fetchPage(1)` replaces them when the data lands.
      this._renderApiLoading();
      this._schedulePageReload(immediate);
      return;
    }
    const matches = (c: TimelineItem) =>
      this._matchesSearch(c) &&
      this.filters.every((f) => {
        const active = f.checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
        if (active.length === 0) return true;
        const v = f.extract ? f.extract(c) : c[f.field];
        const arr = Array.isArray(v) ? v.map((x) => String(x)) : [v == null ? '' : String(v)];
        return arr.some((x) => active.includes(x));
      });
    this.allCards = this._sortByDateDesc(this._scopeItems().filter(matches));
    this._featuredCards = this._sortByDateDesc(this._allItems().filter(matches));
    if (this.sortAscending) {
      this.allCards.reverse();
      this._featuredCards.reverse();
    }
    if (this.itemsPerPage > 0) this._displayedCount = this.itemsPerPage;
    this._renderAll();
  }

  /** Label of the expand toggle; uses the custom function when provided, otherwise the Spanish singular/plural default */
  protected _relatedLabel(n: number): string {
    if (this.relatedLabel) return this.relatedLabel(n);
    return n === 1 ? 'publicación relacionada' : 'publicaciones relacionadas';
  }

  /** Write the expand toggle label into `#remaining-text`; the label is injected as HTML, so it may contain markup */
  protected _setRelatedLabel(n: number): void {
    const el = this.container.querySelector('#remaining-text');
    if (el) el.innerHTML = this._relatedLabel(n);
  }

  /**
   * Write the expand toggle counter and its label. Both count the **whole pool**, never the
   * filtered one: in local mode `_allItems().length`, in API mode the static `total` of
   * `/facets` (0 until that response lands, or forever if the endpoint doesn't send it).
   * Extracted from `_renderAll` so the facets response can patch the counter when it arrives
   * without re-rendering the timeline.
   */
  protected _renderRelatedCount(): void {
    const n = this.api ? this._apiCollectionTotal : this._allItems().length;
    this.remainingCount.textContent = String(n);
    this._setRelatedLabel(n);
  }

  /** Render featured cards, timeline, and load-more button if needed */
  protected _renderAll(): void {
    if (this.api) {
      this._clearApiLoading();
      this._renderRelatedCount();
      this._renderFeatured(this.allCards.filter((c) => c.capturado !== false).slice(0, this.featured_count));
      this._renderTimeline(this.allCards);
      if (this._hasMorePages()) {
        this._renderLoadMoreButton();
      }
      this._renderStatus();
      requestAnimationFrame(() => {
        this.featuredContainer.querySelectorAll('.featured-card').forEach((c) => c.classList.add('visible'));
      });
      if (this.isExpanded) {
        requestAnimationFrame(() => this._setupTimelineObserver());
      }
      return;
    }
    const featured = this._featuredCards.filter((c) => c.capturado !== false).slice(0, this.featured_count);
    this._renderRelatedCount();
    this._renderFeatured(featured);
    const displayCards = this.itemsPerPage > 0 ? this.allCards.slice(0, this._displayedCount) : this.allCards;
    this._renderTimeline(displayCards);
    if (this.itemsPerPage > 0 && this._displayedCount < this.allCards.length) {
      this._renderLoadMoreButton();
    }
    requestAnimationFrame(() => {
      this.featuredContainer.querySelectorAll('.featured-card').forEach((c) => c.classList.add('visible'));
    });
    if (this.isExpanded) {
      requestAnimationFrame(() => this._setupTimelineObserver());
    }
  }

  /** Render the "load more" button and wire its click handler */
  protected _renderLoadMoreButton(): void {
    const el = document.createElement('div');
    el.className = 'timeline-item timeline-load-more-item';
    el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-load-more-dot"></div>
      </div>
      <div class="timeline-load-more-wrap">
        <button class="timeline-load-more-btn">Cargar m&aacute;s <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,9 12,15 18,9"/></svg></button>
      </div>
    `;
    (el.querySelector('.timeline-load-more-btn') as HTMLElement).addEventListener('click', () => {
      if (this.api) {
        if (!this._apiLoading) void this._appendPageItems();
        return;
      }
      const start = this._displayedCount;
      const end = Math.min(start + this.itemsPerPage, this.allCards.length);
      const more = this.allCards.slice(start, end);

      el.remove();

      more.forEach((card, i) => {
        this._insertBeforeFooter(this._createTimelineItem(card, i));
      });

      this._displayedCount = end;

      if (this._displayedCount < this.allCards.length) {
        this._renderLoadMoreButton();
      }

      if (this.isExpanded) {
        requestAnimationFrame(() => this._setupTimelineObserver());
      }
    });
    this._insertBeforeFooter(el);
  }

  /** Read the current effective max-height of the timeline-cards in px */
  protected _getCardsHeightPx(): number {
    // En fullpage no hay caja con scroll: el `max-height` del SCSS es `none` y parsearlo
    // daría NaN -> el mínimo del resize handle, o sea un solo skeleton. Lo que el usuario ve
    // es el viewport (la página scrollea), así que se mide contra eso.
    if (this.fullpage) return window.innerHeight;
    const inline = this.timelineCards.style.maxHeight;
    const px = inline && inline.endsWith('px') ? parseFloat(inline) : NaN;
    if (Number.isFinite(px)) return px;
    const computed = getComputedStyle(this.timelineCards).maxHeight;
    const match = computed ? parseFloat(computed) : NaN;
    return Number.isFinite(match) ? match : RESIZE_MIN_HEIGHT;
  }

  /** Clamp and apply a max-height (px) to the timeline-cards */
  protected _applyCardsHeight(value: number): void {
    const clamped = Math.min(RESIZE_MAX_HEIGHT, Math.max(RESIZE_MIN_HEIGHT, Math.round(value)));
    this.timelineCards.style.maxHeight = clamped + 'px';
    this._syncResizeHandleA11y();
  }

  /** Persist the current height to localStorage */
  protected _persistCardsHeight(): void {
    try {
      window.localStorage.setItem(RESIZE_STORAGE_KEY, String(this._getCardsHeightPx()));
    } catch {
      /* localStorage unavailable */
    }
  }

  /** Keep the resize handle aria attributes in sync with the current height */
  protected _syncResizeHandleA11y(): void {
    this.resizeHandle.setAttribute('aria-valuemin', String(RESIZE_MIN_HEIGHT));
    this.resizeHandle.setAttribute('aria-valuemax', String(RESIZE_MAX_HEIGHT));
    this.resizeHandle.setAttribute('aria-valuenow', String(this._getCardsHeightPx()));
  }

  /** Set up the timeline-cards resize handle: drag, keyboard and localStorage persistence */
  protected _initResizeHandle(): void {
    this.resizeHandle = this.container.querySelector('#timeline-resize-handle') as HTMLElement;
    if (!this.resizeHandle) return;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = this._getCardsHeightPx();
      const onPointerMove = (ev: PointerEvent) => {
        this._applyCardsHeight(startHeight + (ev.clientY - startY));
      };
      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        this.section.classList.remove('resizing');
        this._persistCardsHeight();
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      this.section.classList.add('resizing');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      let delta = 0;
      if (e.key === 'ArrowUp') delta = -RESIZE_STEP;
      else if (e.key === 'ArrowDown') delta = RESIZE_STEP;
      else if (e.key === 'Home') delta = -RESIZE_MAX_HEIGHT;
      else if (e.key === 'End') delta = RESIZE_MAX_HEIGHT;
      else return;
      e.preventDefault();
      this._applyCardsHeight(this._getCardsHeightPx() + delta);
      this._persistCardsHeight();
    };

    try {
      const raw = window.localStorage.getItem(RESIZE_STORAGE_KEY);
      if (raw !== null) {
        const value = Number(raw);
        if (Number.isFinite(value)) this._applyCardsHeight(value);
      }
    } catch {
      /* localStorage unavailable */
    }
    this._syncResizeHandleA11y();
    this.resizeHandle.addEventListener('pointerdown', onPointerDown);
    this.resizeHandle.addEventListener('keydown', onKeyDown);
  }

  /** Render a single already-expanded card without any timeline chrome when `singleId` is set */
  protected async _renderSingleCard(): Promise<void> {
    const workNotesHtml = this.internalButtons
      ? `<div class="single-mode-toolbar">
            <button class="work-notes-toggle" id="work-notes-toggle" title="Ocultar notas de trabajo" aria-pressed="false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l5-5V5a2 2 0 0 0-2-2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>
            </button>
          </div>`
      : '';
    this.container.innerHTML = `<section class="publicaciones-section single-mode" id="publicaciones-section">${workNotesHtml}</section>`;
    this.section = this.container.querySelector('#publicaciones-section') as HTMLElement;
    this.workNotesToggle = this.container.querySelector('#work-notes-toggle') as HTMLElement;
    if (this.workNotesToggle) {
      this._applyWorkNotesState();
      this.workNotesToggle.addEventListener('click', () => this._toggleWorkNotes());
    }
    const id = this.singleId || '';
    let card: TimelineItem | null;
    if (this.api) {
      card = this._apiDetails.get(id) || (await this._fetchDetail(id));
    } else {
      card = this._allItems().find((it) => String(it.id) === id) || null;
    }
    if (!card) {
      this.section.innerHTML = `<div class="single-mode-message">No se encontró el artículo ${id}.</div>`;
      return;
    }
    const itemEl = this._createTimelineItem(card, 0);
    const dateCol = itemEl.querySelector('.timeline-date-col') as HTMLElement | null;
    if (dateCol) dateCol.remove();
    const collapseBtn = itemEl.querySelector('.card-collapse') as HTMLElement | null;
    if (collapseBtn) collapseBtn.remove();
    itemEl.classList.add('visible');
    const cardEl = itemEl.querySelector('.timeline-card') as HTMLElement;
    cardEl.classList.add('expanded');
    this.section.appendChild(itemEl);
    await this._ensureCardDetail(cardEl);
    this._preloadEmbedLibraries();
    this._processCardEmbeds(cardEl);
  }

  /** Initialize the component: build layout, sort data, render, bind events */
  protected _init(): void {
    if (this.singleId) {
      void this._renderSingleCard();
      return;
    }
    this._buildLayout();
    // Applied before _applyFilters: the timeline observer is attached from _renderAll
    // (guarded by isExpanded), and it must find the container already open, otherwise
    // the items would intersect a collapsed (max-height: 0) container and never show.
    if (this.isExpanded) this._applyExpandState();
    // En fullpage la lista no tiene scroll propio, así que no hay nada que ajustar: tampoco se
    // lee el alto persistido, que escribiría un `max-height` inline sobre el `none` del SCSS.
    if (!this.fullpage) this._initResizeHandle();
    if (this.api) {
      this._bindBaseEvents();
      this._renderApiLoading();
      // The checkboxes are built here, before the first page, so the default checks (estado
      // filters) travel in the initial query just like in local mode. With no facets yet the
      // non-estado groups stay hidden, so nothing can be checked before they arrive: the
      // panel is rebuilt with the counts by `_ensureApiFacets()`.
      this._buildFilterCheckboxes();
      this._syncFilterToggleState();
      // The facets travel the static values of the collection (counts, total, lastUpdated) and
      // the expand toggle shows two of them before the user interacts, so they are requested
      // here, in parallel with the first page, and not on the first expand. Waiting would gain
      // nothing: the estado defaults of the checkboxes above do not depend on the facets.
      void this._ensureApiFacets();
      // The embed preload reads the rendered cards, so it waits for the first page.
      void this._fetchPage(1).then(() => {
        if (this.isExpanded) this._preloadEmbedLibraries();
      });
      return;
    }
    this._buildFilterCheckboxes();
    if (this.itemsPerPage > 0) this._displayedCount = this.itemsPerPage;
    this._applyFilters();
    if (this.isExpanded) this._preloadEmbedLibraries();

    requestAnimationFrame(() => {
      const cards = this.featuredContainer.querySelectorAll('.featured-card');
      cards.forEach((c) => c.classList.add('visible'));
    });

    this._bindBaseEvents();
  }

  /**
   * Bind the click of the filter toggle. Split out of `_bindBaseEvents` because in API mode the
   * button is on screen from the start but the panel has no values until the facets land: until
   * then there is nothing to open, so the click does nothing. Called from `_bindBaseEvents` in
   * local mode and from the `.then()` of `_ensureApiFacets` in API mode, which runs once.
   */
  protected _bindFilterToggle(): void {
    this.filterToggle.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.filterMenu.classList.toggle('open');
      this.filterToggle.classList.toggle('open');
    });
  }

  /** Bind the header/global event listeners shared by both local and API modes */
  protected _bindBaseEvents(): void {
    // En fullpage el botón de expandir es solo el contador: no se le bindea el colapso.
    if (!this.fullpage) this.expandToggle.addEventListener('click', () => this._toggleExpand());
    this.featuredContainer.addEventListener('click', () => this._toggleExpand());
    this.featuredRow.addEventListener('click', (e: Event) => {
      if (this.isExpanded) return;
      if (
        (e.target as HTMLElement).closest(
          '.expand-toggle, .featured-cards, .sort-toggle, .filter-toggle, .filter-menu, .search-wrap, .work-notes-toggle, .estado-toggle, .estado-wrap'
        )
      )
        return;
      this._toggleExpand();
    });
    this.sortToggle.addEventListener('click', () => this._toggleSort());
    if (this.taxonomySelect) {
      this.taxonomySelect.addEventListener('change', () => this._onTaxonomyChange());
    }
    this._applyWorkNotesState();
    if (this.workNotesToggle) this.workNotesToggle.addEventListener('click', () => this._toggleWorkNotes());
    // En modo API el botón aparece desde el arranque (ver `_buildFilterCheckboxes`), pero sin
    // listener hasta que llegan los facets: antes de eso el panel no tiene nada que abrir. Por eso
    // el bind se hace acá solo en modo local, y en API lo hace el `.then()` de `_ensureApiFacets()`,
    // que es el único lugar que reconstruye el panel con valores. Corre una sola vez.
    if (!this.api) this._bindFilterToggle();
    if (this.estadoToggle) {
      this.estadoToggle.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.estadoMenu.classList.toggle('open');
        this.estadoToggle.classList.toggle('open');
      });
    }
    this.searchToggle.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.searchWrap.classList.toggle('open');
      this.searchToggle.classList.toggle('open');
      if (this.searchWrap.classList.contains('open')) {
        this.searchInput.focus();
      }
    });
    this.searchInput.addEventListener('input', () => {
      this.searchTerm = this.searchInput.value;
      // Not immediate, unlike the discrete changes: every keystroke is a prefix of the term, so
      // the request has to wait for the typing to settle.
      this._applyFilters();
    });
    this.searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.searchInput.value = '';
        this.searchTerm = '';
        this.searchWrap.classList.remove('open');
        this.searchToggle.classList.remove('open');
        this._applyFilters(true);
      }
    });

    document.addEventListener('click', (e: Event) => {
      if (!(e.target as HTMLElement).closest('.card-info-btn, .card-info-menu')) {
        this.container.querySelectorAll('.card-info-menu.open').forEach((m) => m.classList.remove('open'));
      }
      if (!(e.target as HTMLElement).closest('.card-adjuntos-btn, .card-adjuntos-menu')) {
        this.container.querySelectorAll('.card-adjuntos-menu.open').forEach((m) => m.classList.remove('open'));
      }
      if (!(e.target as HTMLElement).closest('.filter-wrap')) {
        this.filterMenu.classList.remove('open');
        this.filterToggle.classList.remove('open');
      }
      if (!(e.target as HTMLElement).closest('.estado-wrap') && this.estadoMenu) {
        this.estadoMenu.classList.remove('open');
        this.estadoToggle.classList.remove('open');
      }
      if (!(e.target as HTMLElement).closest('.search-wrap')) {
        this.searchWrap.classList.remove('open');
        this.searchToggle.classList.remove('open');
      }
    });
  }
}
