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
  notas_de_trabajo?: string | null;
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

export interface TimelineOptions {
  container: string | HTMLElement;
  items?: TimelineItem[];
  api?: TimelineApiConfig;
  featuredCount?: number;
  lastUpdated?: string;
  itemsPerPage?: number;
  inlineImages?: boolean;
  inlineAdjuntos?: boolean;
  internalButtons?: boolean;
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
  relatedLabel: ((count: number) => string) | null;
  singleId: string | null;
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
  _originalCards: TimelineItem[];
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

  constructor(config: TimelineOptions) {
    this.container =
      typeof config.container === 'string'
        ? (document.querySelector(config.container) as HTMLElement)
        : config.container;
    this.items = config.items || [];
    this.featured_count = config.featuredCount || 6;
    this.lastUpdated = config.lastUpdated || '';
    this.itemsPerPage = config.itemsPerPage || 10;
    this.inlineImages = config.inlineImages || false;
    this.inlineAdjuntos = config.inlineAdjuntos || false;
    this.internalButtons = config.internalButtons || false;
    this.relatedLabel = config.relatedLabel || null;
    this.singleId = config.singleId ? config.singleId.replace(/^\/+/, '') : null;
    this._displayedCount = 0;
    this.allCards = [];
    this.isExpanded = false;
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
    this._originalCards = [];
    this.api = config.api || null;
    this._apiPage = 1;
    this._apiTotal = 0;
    this._apiTotalAll = 0;
    this._apiFacets = {};
    this._apiFeatured = [];
    this._apiLoading = false;
    this._apiSeq = 0;
    this._apiReloadTimer = 0;
    this._apiFacetsBuilt = false;
    this._apiError = '';
    this._apiDetails = new Map();
    this._init();
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
            <button class="expand-toggle" id="expand-toggle">
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
            <div class="timeline-content">
              <div class="timeline-cards-col">
                <div class="timeline-cards" id="timeline-cards"></div>
                <div class="timeline-resize-handle" id="timeline-resize-handle" role="slider" tabindex="0" aria-orientation="vertical" title="Ajustar la altura de la lista."></div>
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

  /** Render the featured (overlapping) cards row */
  protected _renderFeatured(cards: TimelineItem[]): void {
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
                Ir
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
          <div class="card-info-menu"></div>
          <div class="card-protag-fuente-slot"></div>
          <div class="card-media-slot"></div>
          <div class="card-embed-slot"></div>
          <div class="card-videos-slot"></div>
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
          '.card-open, .card-collapse, .card-info-btn, .card-info-menu, .card-adjuntos, .card-inline-images, .card-inline-adjuntos, .card-edit'
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
          Ir
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
    return `<div class="card-info-row">
        <span class="card-info-label">ID</span>
        <span class="card-info-value">${card.id}</span>
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

  /** Fill the card detail slots and bind their interactions */
  protected _injectCardDetail(cardEl: HTMLElement, card: TimelineItem): void {
    const actionsEl = cardEl.querySelector('.card-actions') as HTMLElement | null;
    const descSlot = cardEl.querySelector('.card-desc-slot') as HTMLElement | null;
    const temasSlot = cardEl.querySelector('.card-temas-slot') as HTMLElement | null;
    const protagFuenteSlot = cardEl.querySelector('.card-protag-fuente-slot') as HTMLElement | null;
    const mediaSlot = cardEl.querySelector('.card-media-slot') as HTMLElement | null;
    const videosSlot = cardEl.querySelector('.card-videos-slot') as HTMLElement | null;

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

    if (this.lastUpdated) {
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

  /** Set up IntersectionObserver for the timeline items entrance animation */
  protected _setupTimelineObserver(): void {
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

    this.container.querySelectorAll('.timeline-item').forEach((item) => {
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

  /** Toggle between expanded (timeline visible) and collapsed state */
  protected _toggleExpand(scrollTo = false): void {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this.section.classList.add('expanded');
      this.timelineContainer.classList.add('expanded');
      this.expandIcon.classList.add('rotated');
      requestAnimationFrame(() => {
        this._setupTimelineObserver();
      });
      this._preloadEmbedLibraries();
    } else {
      const cards = this.featuredContainer.querySelectorAll('.featured-card');
      cards.forEach((c) => ((c as HTMLElement).style.transition = 'none'));
      cards.forEach((c) => c.classList.remove('visible'));
      void this.featuredContainer.offsetHeight;
      cards.forEach((c) => ((c as HTMLElement).style.transition = ''));

      this.section.classList.remove('expanded');
      this.timelineContainer.classList.remove('expanded');
      this.expandIcon.classList.remove('rotated');
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
    this._applyFilters();
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

  /** Build filter checkboxes from the available filter values (local data or API facets) */
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
                this.items.flatMap((c) => {
                  const v = f.extract ? f.extract(c) : c[f.field];
                  const arr = v == null ? [] : Array.isArray(v) ? v : [v];
                  return arr.map((x) => String(x)).filter(Boolean);
                })
              )
            ];
        counts = {};
        values.forEach((val) => {
          counts[val] = this.items.filter((c) => {
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
          this._applyFilters();
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
    this.filterToggle.style.display = anyFilterVisible ? '' : 'none';
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
    if (this.featured_count > 0) params.featured = String(this.featured_count);
    return params;
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
      this._apiTotalAll = typeof data.totalAll === 'number' ? data.totalAll : this._apiTotal;
      this._apiFacets = data.facets || {};
      this._apiFeatured = Array.isArray(data.featured) ? data.featured : [];
      if (data.lastUpdated) this.lastUpdated = data.lastUpdated;
      this._apiLoading = false;
      this.allCards = Array.isArray(data.items) ? (data.items as unknown as TimelineItem[]) : [];
      this._displayedCount = this.allCards.length;
      this._apiDetails.clear();
      this._buildFilterCheckboxes();
      this._syncFilterToggleState();
      this._renderAll();
    } catch {
      if (seq !== this._apiSeq) return;
      this._apiLoading = false;
      this._apiError = 'No se pudieron cargar los datos. Intente nuevamente.';
      this._renderStatus();
    }
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
      if (data.lastUpdated) this.lastUpdated = data.lastUpdated;
      this._apiPage = nextPage;
      this._apiLoading = false;
      this.allCards.push(...((data.items || []) as unknown as TimelineItem[]));
      this._displayedCount = this.allCards.length;
      this._renderAll();
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

  /** Debounce a full page reload triggered by filter/search/sort changes */
  protected _schedulePageReload(): void {
    if (this._apiReloadTimer) window.clearTimeout(this._apiReloadTimer);
    this._apiReloadTimer = window.setTimeout(() => {
      this._apiReloadTimer = 0;
      void this._fetchPage(1);
    }, 300);
  }

  /** Render the API status row (loading / error / count) at the end of the timeline */
  protected _renderStatus(): void {
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

  /** Apply active filters and re-render the full view (or reload from the API) */
  protected _applyFilters(): void {
    this._syncFilterToggleState();
    if (this.api) {
      this._schedulePageReload();
      return;
    }
    this.allCards = this._originalCards.filter(
      (c) =>
        this._matchesSearch(c) &&
        this.filters.every((f) => {
          const active = f.checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
          if (active.length === 0) return true;
          const v = f.extract ? f.extract(c) : c[f.field];
          const arr = Array.isArray(v) ? v.map((x) => String(x)) : [v == null ? '' : String(v)];
          return arr.some((x) => active.includes(x));
        })
    );
    if (this.sortAscending) this.allCards.reverse();
    if (this.itemsPerPage > 0) this._displayedCount = this.itemsPerPage;
    this._renderAll();
  }

  /** Label of the expand toggle; uses the custom function when provided, otherwise the Spanish singular/plural default */
  protected _relatedLabel(n: number): string {
    if (this.relatedLabel) return this.relatedLabel(n);
    return n === 1 ? 'publicación relacionada' : 'publicaciones relacionadas';
  }

  /** Render featured cards, timeline, and load-more button if needed */
  protected _renderAll(): void {
    if (this.api) {
      const n = this._apiTotal;
      this.remainingCount.textContent = String(n);
      this.container.querySelector('#remaining-text')!.textContent = this._relatedLabel(n);
      this._renderFeatured(this._apiFeatured as unknown as TimelineItem[]);
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
    const featured = this.allCards.filter((c) => c.capturado !== false).slice(0, this.featured_count);
    const n = this.allCards.length;
    this.remainingCount.textContent = String(this._originalCards.length);
    this.container.querySelector('#remaining-text')!.textContent = this._relatedLabel(n);
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
      card = this.items.find((it) => String(it.id) === id) || null;
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
    this._initResizeHandle();
    if (this.api) {
      this._bindBaseEvents();
      this._renderStatus();
      void this._fetchPage(1);
      return;
    }
    this._buildFilterCheckboxes();
    this._originalCards = [...this.items].sort((a, b) => {
      if (!a.fecha_publicacion) return 1;
      if (!b.fecha_publicacion) return -1;
      return new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime();
    });
    if (this.itemsPerPage > 0) this._displayedCount = this.itemsPerPage;
    this._applyFilters();

    requestAnimationFrame(() => {
      const cards = this.featuredContainer.querySelectorAll('.featured-card');
      cards.forEach((c) => c.classList.add('visible'));
    });

    this._bindBaseEvents();
  }

  /** Bind the header/global event listeners shared by both local and API modes */
  protected _bindBaseEvents(): void {
    this.expandToggle.addEventListener('click', () => this._toggleExpand());
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
    this._applyWorkNotesState();
    if (this.workNotesToggle) this.workNotesToggle.addEventListener('click', () => this._toggleWorkNotes());
    this.filterToggle.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.filterMenu.classList.toggle('open');
      this.filterToggle.classList.toggle('open');
    });
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
      this._applyFilters();
    });
    this.searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.searchInput.value = '';
        this.searchTerm = '';
        this.searchWrap.classList.remove('open');
        this.searchToggle.classList.remove('open');
        this._applyFilters();
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
