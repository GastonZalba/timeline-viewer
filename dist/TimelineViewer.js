import lightGallery from 'lightgallery';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_EMBED_URL = 'https://www.youtube.com/embed/';
const INSTAGRAM_REGEX = /(?:instagram\.com)\/(p|reels?|tv)\/([a-zA-Z0-9_-]+)/;
const INSTAGRAM_EMBED_BASE = 'https://www.instagram.com/';
const INSTAGRAM_EMBED_SCRIPT = 'https://www.instagram.com/embed.js';
const TWITTER_REGEX = /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/;
const TWITTER_EMBED_BASE = 'https://twitter.com/';
const TWITTER_WIDGETS_SCRIPT = 'https://platform.twitter.com/widgets.js';
const FACEBOOK_POST_REGEX = /(?:facebook\.com)\/([^/]+)\/posts\/(?:[^/]+\/)?(\d+)/;
const FACEBOOK_OTHER_REGEX = /(?:facebook\.com\/(?:[^/]+\/videos\/|permalink\.php|photo\.php|watch|story\.php)|fb\.watch)/;
const FACEBOOK_EMBED_BASE = 'https://www.facebook.com/';
const FACEBOOK_SDK_URL = 'https://connect.facebook.net/es_ES/sdk.js#xfbml=1&version=v20.0';
/** Window of `_schedulePageReload`: coalesces a burst of search/filter/sort changes into one request */
const API_RELOAD_DEBOUNCE_MS = 300;
/**
 * `pageSize` asked for when `itemsPerPage` is 0 ("no pagination"): big enough to hold the whole
 * collection in a single response, so the server sends everything and there is nothing left to
 * ask for. Not a real limit, just a number no collection reaches.
 */
const API_UNBOUNDED_PAGE_SIZE = 1000000;
/** Links shown per taxonomy group before the "Ver más" toggle appears (single mode) */
const TAXONOMY_VISIBLE_LINKS = 3;
/**
 * Values shown per filter group before the "Ver más (N)" toggle appears, when the `maxVisible`
 * of the group itself does not say otherwise. Below 2 the group is never collapsed.
 */
const DEFAULT_FILTER_MAX_VISIBLE = 5;
/** Control types a filter group can declare. Checkboxes are the only one implemented so far. */
const SUPPORTED_FILTER_TYPES = ['checkboxes'];
/**
 * Token of the items that carry no value for a field (`null`, or the field missing): what
 * `_filterToken` gives both, and therefore the only way to reach them in a filter.
 */
const FILTER_EMPTY_VALUE = 'null';
/**
 * Label of the option a group with `allowEmpty` gets for that token. Fixed on purpose: the bucket
 * is the same everywhere (a missing type, a missing date), so it does not get a label per group.
 */
const FILTER_EMPTY_LABEL = 'Sin valor';
/** Label of the "Ver todo" option added to the taxonomy selector when there is more than one group */
const ALL_TAXONOMIES_LABEL = 'Ver todo';
/** `_contentIndex` value that means "every taxonomy" instead of a single group */
const ALL_TAXONOMIES_INDEX = -1;
const RESIZE_MIN_HEIGHT = 180;
const RESIZE_MAX_HEIGHT = 1200;
const RESIZE_STEP = 24;
const RESIZE_STORAGE_KEY = 'tv-timeline-cards-height';
const WORK_NOTES_STORAGE_KEY = 'tv-work-notes-hidden';
/**
 * `localStorage` key of the state of the filters marked `persist`. The record inside is keyed by
 * `field`, not by a fixed list, so a filter declared later by the consumer persists like the ones
 * that were always there.
 */
const PERSISTED_FILTER_STORAGE_KEY = 'tv-filtros-internos-filters';
const TONE_LABEL = { Positivo: 'Positivo', Negativo: 'Negativo', Neutro: 'Neutro' };
export default class Timeline {
    constructor(config) {
        this.sortAscending = false;
        this.searchTerm = '';
        this.container =
            typeof config.container === 'string'
                ? document.querySelector(config.container)
                : config.container;
        this.items = config.items || [];
        this.content = this._normalizeContent(config.content);
        this._contentIndex = 0;
        this.featured_count = config.featuredCount || 6;
        this.lastUpdated = config.lastUpdated || '';
        this.itemsPerPage = config.itemsPerPage ?? 10;
        this.pagination = config.pagination === true;
        this.inlineImages = config.inlineImages || false;
        this.inlineAdjuntos = config.inlineAdjuntos || false;
        this.internalButtons = config.internalButtons || false;
        this.fullpage = config.fullpage === true;
        this.filters = this._normalizeFilters(config.filters);
        this._filterExpanded = new Set();
        this.relatedLabel = config.relatedLabel || null;
        this.singleId = config.singleId ? config.singleId.replace(/^\/+/, '') : null;
        this.taxonomyRow = null;
        this.taxonomySelectWrap = null;
        this.taxonomySelectLabel = null;
        this.taxonomySelectCount = null;
        this.taxonomySelect = null;
        this._displayedCount = 0;
        this._page = 1;
        this.allCards = [];
        this._featuredCards = [];
        this._apiFeaturedCards = [];
        // El modo fullpage implica abierto: siempre expandido y sin opción de colapsar.
        this.isExpanded = this.fullpage || config.startExpanded === true;
        this.featuredContainer = null;
        this.featuredRow = null;
        this.timelineContainer = null;
        this.timelineCards = null;
        this.resizeHandle = null;
        this.expandToggle = null;
        this.remainingCount = null;
        this.expandIcon = null;
        this.sortToggle = null;
        this.workNotesToggle = null;
        this.filterToggle = null;
        this.filterMenu = null;
        this.filtrosInternosWrap = null;
        this.filtrosInternosToggle = null;
        this.filtrosInternosMenu = null;
        this.section = null;
        this.searchWrap = null;
        this.searchToggle = null;
        this.searchInput = null;
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
    _normalizeContent(content) {
        if (!Array.isArray(content))
            return [];
        return content
            .filter((g) => !!g && typeof g.label === 'string' && g.label.trim() !== '')
            .map((g) => ({ label: g.label.trim(), items: Array.isArray(g.items) ? g.items : [] }))
            .filter((g) => g.items.length > 0);
    }
    /**
     * Normalize the `filters` option into the groups the panel renders.
     *
     * Nothing is hardcoded, so an absent or invalid option simply yields no groups: the panel and
     * its button are not rendered at all, and in API mode no filter param is sent. Entries that
     * cannot be rendered —no `field`, no `label`, a `type` that is not supported yet, or a `field`
     * already declared— are dropped with a warning instead of breaking the mount, because a group
     * that renders nothing is far harder to notice than a line in the console.
     *
     * The `'menu'` groups are then dealt out to the columns of the panel: the first half goes to
     * the first column and the rest to the second, which reads a declaration top to bottom down
     * the first column and then along the second.
     */
    _normalizeFilters(filters) {
        if (!Array.isArray(filters) || filters.length === 0)
            return [];
        const declared = new Set();
        const defs = [];
        filters.forEach((f, i) => {
            if (!f || typeof f !== 'object') {
                this._warnFilter(i, 'no es un objeto');
                return;
            }
            if (typeof f.field !== 'string' || f.field.trim() === '') {
                this._warnFilter(i, 'no tiene `field`');
                return;
            }
            if (typeof f.label !== 'string' || f.label.trim() === '') {
                this._warnFilter(i, `"${f.field}" no tiene \`label\``);
                return;
            }
            if (f.type !== undefined && !SUPPORTED_FILTER_TYPES.includes(f.type)) {
                this._warnFilter(i, `"${f.field}" declara type "${String(f.type)}", que no está soportado (soportado: ${SUPPORTED_FILTER_TYPES.join(', ')})`);
                return;
            }
            if (declared.has(f.field)) {
                this._warnFilter(i, `"${f.field}" ya está declarado en otro grupo`);
                return;
            }
            // Un grupo que declara `items` los resuelve acá: la validación es por ítem, pero un ítem
            // roto descarta el grupo entero (y avisa), porque medio grupo declarado es peor que
            // ninguno: dejar un valor sin checkbox lo saca de la declaración en silencio.
            let declaredItems;
            if (f.items !== undefined) {
                const resolved = this._resolveFilterItems(f.field, f.items);
                if (!resolved)
                    return;
                declaredItems = resolved;
            }
            declared.add(f.field);
            defs.push({
                field: f.field.trim(),
                label: f.label.trim(),
                group: f.group === 'filtros_internos' ? 'filtros_internos' : 'menu',
                persist: f.persist === true,
                allowEmpty: f.allowEmpty === true,
                column: 0,
                extract: f.extract,
                formatLabel: f.formatLabel,
                sortValues: f.sortValues,
                declared: declaredItems,
                maxVisible: typeof f.maxVisible === 'number' ? f.maxVisible : undefined,
                options: null,
                checkboxes: []
            });
        });
        const menuGroups = defs.filter((f) => f.group === 'menu');
        const half = Math.ceil(menuGroups.length / 2);
        menuGroups.forEach((f, i) => {
            f.column = i < half ? 0 : 1;
        });
        return defs;
    }
    /**
     * Resolve the `items` a filter group declares into the tokens the checkboxes carry. Returns
     * `null` (after warning) when the declaration is unusable: not a list, empty, an entry without a
     * `label` or without a `value`, or two entries that would share the same token.
     *
     * The token of an entry is what lands in the DOM (`input.value`) and in the query param of API
     * mode: the declared values joined by commas. The same values one by one are what an item is
     * compared against, so `[false, null]` is one checkbox that matches either.
     */
    _resolveFilterItems(field, items) {
        const reject = (reason) => {
            console.warn(`TimelineViewer: filtro "${field}" descartado: ${reason}.`);
            return null;
        };
        if (!Array.isArray(items) || items.length === 0)
            return reject('declara `items` vacío');
        const resolved = [];
        const seen = new Set();
        for (const item of items) {
            if (!item || typeof item !== 'object' || typeof item.label !== 'string' || item.label.trim() === '') {
                return reject('un ítem de `items` no tiene `label`');
            }
            const value = item.value;
            const isList = Array.isArray(value);
            if (value === undefined || (isList && value.length === 0)) {
                return reject(`el ítem "${item.label}" no tiene \`value\``);
            }
            const values = (isList ? value : [value]);
            if (values.some((v) => v === undefined)) {
                return reject(`el ítem "${item.label}" tiene un valor undefined`);
            }
            const tokens = values.map((v) => this._filterToken(v));
            const token = tokens.join(',');
            if (tokens.some((t) => t.includes(','))) {
                return reject(`el ítem "${item.label}" declara un valor con coma, que rompe el query param`);
            }
            if (seen.has(token))
                return reject(`el ítem "${item.label}" repite el valor "${token}"`);
            seen.add(token);
            resolved.push({ token, tokens, label: item.label.trim(), checked: item.checked === true });
        }
        return resolved;
    }
    /** Report a group of the `filters` option that was dropped, so a typo does not go unnoticed */
    _warnFilter(index, reason) {
        console.warn(`TimelineViewer: filtro #${index} de la opción "filters" descartado: ${reason}.`);
    }
    /** Every item of every taxonomy, used by the featured stack, the counter and single mode */
    _allItems() {
        if (this.content.length === 0)
            return this.items;
        return this.content.flatMap((g) => g.items);
    }
    /**
     * Items of the currently selected taxonomy, or every taxonomy when "Ver todo" is selected.
     * Falls back to the legacy flat `items` list when no group is configured.
     */
    _scopeItems() {
        if (this.content.length === 0)
            return this.items;
        if (this._contentIndex === ALL_TAXONOMIES_INDEX)
            return this._allItems();
        return this.content[this._contentIndex]?.items || [];
    }
    /** Sorted copy: newest first, undated items last */
    _sortByDateDesc(items) {
        return [...items].sort((a, b) => {
            if (!a.fecha_publicacion)
                return 1;
            if (!b.fecha_publicacion)
                return -1;
            return new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime();
        });
    }
    /**
     * Number of items of the active scope, shown next to the taxonomy label.
     * The selector is a scope, not a filter, so this is the raw size of the group
     * (or of the whole pool for "Ver todo") and never reacts to the checkboxes.
     */
    _scopeCount() {
        if (this.content.length === 0)
            return this.items.length;
        if (this._contentIndex === ALL_TAXONOMIES_INDEX)
            return this._allItems().length;
        return this.content[this._contentIndex]?.items.length || 0;
    }
    /**
     * Markup of a group of the `filters` option: an empty `.filter-options` box the checkboxes
     * are built into, tagged with the field it belongs to.
     *
     * The `id` is only a handle for debugging: the component looks the box up by the
     * `data-filter-field` attribute, so a `field` with characters that are not valid in a CSS
     * selector cannot break the wiring. `data-filter-field` is also the stable hook for a
     * consumer's own tests.
     *
     * A `'menu'` group is a section with its header inside the panel; a `'filtros_internos'` one is a
     * bare box, because the flyout has no headers of its own.
     */
    _buildFilterOptionsHtml(f) {
        const slot = `<div class="filter-options" id="filter-options-${this._escapeHtml(f.field)}" data-filter-field="${this._escapeHtml(f.field)}"></div>`;
        if (f.group === 'filtros_internos')
            return slot;
        return `<div class="filter-section">
              <div class="filter-header">${this._escapeHtml(f.label)}</div>
              ${slot}
            </div>`;
    }
    /**
     * Markup of the filter panel, or an empty string when no group is declared for it: with no
     * `filters` option the component has no filter UI at all, not a hidden one.
     * The columns come from the `column` that `_normalizeFilters` dealt out, in the order the
     * groups were declared, so the declaration reads down the first column and then along the
     * second.
     */
    _buildFilterMenuHtml() {
        const columns = this.filters.filter((f) => f.group === 'menu');
        if (columns.length === 0)
            return '';
        const groups = [0, 1]
            .map((column) => columns.filter((f) => f.column === column).map((f) => this._buildFilterOptionsHtml(f)))
            .filter((sections) => sections.length > 0);
        return `<div class="filter-wrap">
              <button class="filter-toggle" id="filter-toggle" title="Filtrar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <div class="filter-menu" id="filter-menu">
                ${groups.map((sections) => `<div class="filter-column">${sections.join('')}</div>`).join('')}
              </div>
            </div>`;
    }
    /**
     * Markup of the internal toolbar: the work-notes toggle plus, when at least one group is
     * declared for it, the `filtros_internos` flyout. Without the latter the button would open an
     * empty menu, so both of them are conditional on the `filters` option as well.
     */
    _buildInternalButtonsHtml() {
        if (!this.internalButtons)
            return '';
        const workNotesButton = `<button class="work-notes-toggle" id="work-notes-toggle" title="Ocultar notas de trabajo" aria-pressed="false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l5-5V5a2 2 0 0 0-2-2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>
            </button>`;
        const internalGroups = this.filters.filter((f) => f.group === 'filtros_internos');
        if (internalGroups.length === 0)
            return workNotesButton;
        return `${workNotesButton}
            <div class="filtros-internos-wrap" id="filtros-internos-wrap">
              <button class="filtros-internos-toggle" id="filtros-internos-toggle" title="Filtros internos">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <div class="filtros-internos-menu" id="filtros-internos-menu">${internalGroups.map((f) => this._buildFilterOptionsHtml(f)).join('')}</div>
            </div>`;
    }
    /** Build the main DOM layout and cache element references */
    _buildLayout() {
        const internalButtonsHtml = this._buildInternalButtonsHtml();
        const filterMenuHtml = this._buildFilterMenuHtml();
        this.container.innerHTML = `
      <section class="publicaciones-section" id="publicaciones-section">
        <div class="featured-row">
          <div class="noticias-top">
            <button class="expand-toggle" id="expand-toggle" aria-expanded="false" aria-controls="timeline-container">
              <span class="expand-text"><span id="remaining-count"></span> <span id="remaining-text">${this._relatedLabel(0)}</span></span>
              <span class="expand-icon" id="expand-icon"></span>
            </button>
            <div class="search-wrap" id="search-wrap">
              <button class="search-toggle" id="search-toggle" title="Buscar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <input class="search-input" id="search-input" type="search" placeholder="Buscar..." autocomplete="off" aria-label="Buscar" />
            </div>
            ${filterMenuHtml}
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
        this.section = this.container.querySelector('#publicaciones-section');
        this.featuredContainer = this.container.querySelector('#featured-cards');
        this.featuredRow = this.container.querySelector('.featured-row');
        this.timelineContainer = this.container.querySelector('#timeline-container');
        this.timelineCards = this.container.querySelector('#timeline-cards');
        this.expandToggle = this.container.querySelector('#expand-toggle');
        this.remainingCount = this.container.querySelector('#remaining-count');
        this.expandIcon = this.container.querySelector('#expand-icon');
        this.sortToggle = this.container.querySelector('#sort-toggle');
        this.workNotesToggle = this.container.querySelector('#work-notes-toggle');
        this.filterToggle = this.container.querySelector('#filter-toggle');
        this.filterMenu = this.container.querySelector('#filter-menu');
        this.filtrosInternosWrap = this.container.querySelector('#filtros-internos-wrap');
        this.filtrosInternosToggle = this.container.querySelector('#filtros-internos-toggle');
        this.filtrosInternosMenu = this.container.querySelector('#filtros-internos-menu');
        this.searchWrap = this.container.querySelector('#search-wrap');
        this.searchToggle = this.container.querySelector('#search-toggle');
        this.searchInput = this.container.querySelector('#search-input');
        this.taxonomyRow = this.container.querySelector('#taxonomy-row');
        this.taxonomySelectWrap = this.container.querySelector('#taxonomy-select-wrap');
        this.taxonomySelectLabel = this.container.querySelector('#taxonomy-select-label');
        this.taxonomySelectCount = this.container.querySelector('#taxonomy-select-count');
        this.taxonomySelect = this.container.querySelector('#taxonomy-select');
        // La clase le dice al SCSS que reescriba el layout (barra sticky, sin límite de altura,
        // sin ícono). El botón de expandir queda como contador: sin colapso posible, así que se
        // marca deshabilitado en vez de bindear un click que no hace nada.
        if (this.fullpage) {
            this.section.classList.add('fullpage');
            this.expandToggle.setAttribute('aria-disabled', 'true');
        }
        this._buildTaxonomySelect();
        this._attachFilterOptions();
    }
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
    _attachFilterOptions() {
        const slots = new Map();
        this.container.querySelectorAll('.filter-options[data-filter-field]').forEach((el) => {
            const field = el.dataset.filterField;
            if (field)
                slots.set(field, el);
        });
        this.filters.forEach((f) => {
            f.options = slots.get(f.field);
        });
    }
    /**
     * Populate the taxonomy selector with the labels of the `content` groups.
     * Nothing is rendered when there are no groups (legacy `items` option) or in API mode,
     * so the layout stays exactly as it was. With a single group the select is shown
     * but disabled, still displaying that group label. With two or more groups a trailing
     * "Ver todo" option is added, which scopes the timeline to the whole pool.
     */
    _buildTaxonomySelect() {
        const groups = this.content;
        const row = this.taxonomyRow;
        const select = this.taxonomySelect;
        if (!row || !select)
            return;
        if (groups.length === 0 || this.api) {
            row.remove();
            this.taxonomySelectWrap = null;
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
    _syncTaxonomyLabel() {
        const label = this._currentLabel();
        const count = this._scopeCount();
        if (this.taxonomySelectLabel)
            this.taxonomySelectLabel.textContent = label;
        if (this.taxonomySelectCount)
            this.taxonomySelectCount.textContent = String(count);
        if (!this.taxonomySelect)
            return;
        this.taxonomySelect.title = `${label} (${count})`;
        this.taxonomySelect.setAttribute('aria-label', label || 'Taxonomía');
    }
    /** Plain label of the selected taxonomy ("Ver todo" when the whole pool is selected) */
    _currentLabel() {
        if (this.content.length === 0)
            return ALL_TAXONOMIES_LABEL;
        return this._contentIndex === ALL_TAXONOMIES_INDEX
            ? ALL_TAXONOMIES_LABEL
            : this.content[this._contentIndex]?.label || '';
    }
    /** Re-scope the timeline, the filters and the counter to the taxonomy picked in the select */
    _onTaxonomyChange() {
        if (!this.taxonomySelect)
            return;
        const i = this.taxonomySelect.selectedIndex;
        this._contentIndex = i >= this.content.length ? ALL_TAXONOMIES_INDEX : i;
        this._syncTaxonomyLabel();
        this._buildFilterCheckboxes();
        this._applyFilters();
    }
    /** Format a date string (YYYY-MM-DD) to a locale display string */
    _formatDate(dateStr) {
        if (!dateStr)
            return 'Sin fecha';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    /** Format a full datetime string to a locale display string */
    _formatDateTime(dateStr) {
        if (!dateStr)
            return '';
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
    _parseLinkWeb(url) {
        if (!url)
            return null;
        let m = url.match(YOUTUBE_REGEX);
        if (m)
            return { url: `${YOUTUBE_EMBED_URL}${m[1]}`, type: 'youtube' };
        m = url.match(INSTAGRAM_REGEX);
        if (m)
            return {
                url: `${INSTAGRAM_EMBED_BASE}${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/`,
                type: 'instagram'
            };
        m = url.match(TWITTER_REGEX);
        if (m)
            return { url: `${TWITTER_EMBED_BASE}${m[1]}/status/${m[2]}`, type: 'twitter' };
        m = url.match(FACEBOOK_POST_REGEX);
        if (m)
            return { url: `${FACEBOOK_EMBED_BASE}${m[1]}/posts/${m[2]}`, type: 'facebook' };
        m = url.match(FACEBOOK_OTHER_REGEX);
        if (m)
            return { url: url, type: 'facebook' };
        return null;
    }
    /** Build the embed markup for a parsed link */
    _buildEmbed(embedUrl) {
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
    _openLightGallery(images, title, showFileName, startIndex = 0) {
        if (!images || !images.length)
            return;
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
            })),
            plugins: [lgZoom, lgThumbnail],
            showZoomInOutIcons: true,
            actualSize: false
        });
        this._lgContainer.addEventListener('lgAfterClose', () => {
            if (this._lgInstance) {
                this._lgInstance.destroy();
                this._lgInstance = null;
            }
        }, { once: true });
        this._lgInstance.openGallery(startIndex);
    }
    /** HTML del icono de fuente oficial (edificio) sobre el círculo de acento */
    _oficialIconSvg() {
        return `<svg class="card-oficial" width="16" height="16" viewBox="0 0 199.34 223.41" fill="currentColor"><path d="M326.17,272.12c1.65-23.24,24.28-61.59,72-65.81,2.05-.1,3.55-.1,8.91-.1,45.23,4,68.94,39.6,72,65.91Z" transform="translate(-302.78 -206.21)"/><path d="M494,300.26H310.92V279.78H494Z" transform="translate(-302.78 -206.21)"/><path d="M302.78,429.62V412.78H502.11v16.84Z" transform="translate(-302.78 -206.21)"/><path d="M337.89,401.27H318.84V306h19.05Z" transform="translate(-302.78 -206.21)"/><path d="M412.12,401.32H392.89V306h19.23Z" transform="translate(-302.78 -206.21)"/><path d="M467.14,306h19.12v95.2H467.14Z" transform="translate(-302.78 -206.21)"/><path d="M356,401.21V305.73c5.89,0,11.6-.07,17.31.09.7,0,1.5,1.17,2,1.95.29.44.08,1.22.08,1.84q0,44,0,88c0,1.11-.11,2.21-.18,3.6Z" transform="translate(-302.78 -206.21)"/><path d="M449.05,401.36H429.87c-.08-1.36-.21-2.67-.21-4,0-29.22,0-58.43-.07-87.65,0-3,.68-4.24,3.9-4.1,5.08.24,10.18.07,15.56.07Z" transform="translate(-302.78 -206.21)"/></svg>`;
    }
    /** Extraer la extensión en minúsculas de una URL, o '' si no tiene */
    _getFileExt(url) {
        const clean = url.split('?')[0].split('#')[0];
        return clean.includes('.') ? clean.substring(clean.lastIndexOf('.') + 1).toLowerCase() : '';
    }
    /**
     * Escapar los caracteres especiales de HTML de un texto plano para poder
     * interpolarlo en markup o en un atributo. Los valores que provienen de la
     * config del consumidor se escapan siempre; para contenido con markup hay que
     * pasar un `HTMLElement`, que se inserta como nodo del DOM.
     */
    _escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    /** Codificar con encodeURIComponent el nombre de archivo de una URL, preservando el resto */
    _encodeFileName(url) {
        const qIdx = url.indexOf('?');
        const base = qIdx === -1 ? url : url.substring(0, qIdx);
        const tail = qIdx === -1 ? '' : url.substring(qIdx);
        const idx = base.lastIndexOf('/');
        if (idx === -1)
            return encodeURIComponent(base) + tail;
        return base.substring(0, idx + 1) + encodeURIComponent(base.substring(idx + 1)) + tail;
    }
    /** SVG del icono de archivo según su extensión (pdf vs genérico) */
    _fileIconSvg(ext) {
        const generic = '<svg class="card-inline-adjunto-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        if (ext === 'pdf') {
            return '<svg class="card-inline-adjunto-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="12" y="16.5" text-anchor="middle" font-size="6" font-weight="700" fill="currentColor">PDF</text></svg>';
        }
        return generic;
    }
    /** SVG del icono de enlace externo (el mismo que usa el botón "Visitar") */
    _externalLinkIconSvg() {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
    }
    /**
     * Resolver una URL del ítem contra la location actual. `link_view_entry` viene
     * del pipeline de scraping y puede venir relativa (`/articulos/FUE-00001`), así
     * que hay que absolutizarla para compartir. Si el valor no es una URL válida,
     * `new URL` lanza y se devuelve el valor crudo para no romper el render de la tarjeta.
     */
    _absoluteUrl(url) {
        try {
            return new URL(url, window.location.href).href;
        }
        catch {
            return url;
        }
    }
    /** SVG del icono de compartir (nodos) */
    _shareIconSvg() {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    }
    /** SVG del ícono de confirmación (visto al copiar al portapapeles) */
    _checkIconSvg() {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    }
    /**
     * Compartir la URL de la vista individual: usa la Web Share API cuando está
     * disponible y, si no, copia el enlace al portapapeles. `navigator.share()`
     * se invoca de forma síncrona dentro del click porque el navegador exige
     * activación del usuario para abrir el share sheet.
     */
    async _shareItem(url, title, btn) {
        if (navigator.share && (!navigator.canShare || navigator.canShare({ title, url }))) {
            try {
                await navigator.share({ title, url });
                return;
            }
            catch (err) {
                if (err instanceof Error && err.name === 'AbortError')
                    return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
        }
        catch {
            this._copyToClipboard(url);
        }
        this._flashCopied(btn);
    }
    /** Copiar al portapapeles sin la Clipboard API (contexto no seguro o sin permiso) */
    _copyToClipboard(text) {
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
    _flashCopied(btn) {
        btn.innerHTML = this._checkIconSvg();
        this._showShareToast(btn);
        if (this._shareTimer)
            window.clearTimeout(this._shareTimer);
        this._shareTimer = window.setTimeout(() => {
            btn.innerHTML = this._shareIconSvg();
            this._shareTimer = 0;
        }, 1500);
    }
    /** Cartelito "Copiado al portapapeles!" debajo de los botones de la tarjeta */
    _showShareToast(btn) {
        const cardEl = btn.closest('.timeline-card');
        if (!cardEl)
            return;
        cardEl.querySelector('.card-share-toast')?.remove();
        const toast = document.createElement('div');
        toast.className = 'card-share-toast';
        toast.setAttribute('role', 'status');
        toast.textContent = 'Copiado al portapapeles!';
        cardEl.appendChild(toast);
        window.setTimeout(() => toast.remove(), 1500);
    }
    /** Render the featured (overlapping) cards row */
    _renderFeatured(cards) {
        // En fullpage el stack nunca se ve (`expanded` lo colapsa a height: 0), así que no se
        // construye. Es el único punto de corte: deja el contenedor vacío y todo lo demás que
        // lo consulta —los rAF que agregan `.visible`, la limpieza de skeletons, el click— es un
        // no-op natural sobre un `querySelectorAll` sin resultados.
        if (this.fullpage)
            return;
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
            const featuredImg = el.querySelector('.card-image');
            if (featuredImg) {
                featuredImg.addEventListener('load', () => featuredImg.classList.add('loaded'));
                if (featuredImg.complete)
                    featuredImg.classList.add('loaded');
            }
            this.featuredContainer.appendChild(el);
        });
    }
    /** Create a single timeline card element with all its event listeners */
    _createTimelineItem(card, index) {
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
          ${card.link_web
                ? `<a class="card-not-captured-link" href="${card.link_web}" target="_blank" rel="noopener">${card.link_web}</a>`
                : '<span class="card-not-captured-link">Sin enlace</span>'}
          <div class="card-actions">
            <div class="card-actions-row">
              ${card.link_web
                ? `<a class="card-actions-btn card-open" href="${card.link_web}" target="_blank" rel="noopener">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Visitar
              </a>`
                : ''}
              ${this.internalButtons && card.link_edit_entry
                ? `<a class="card-actions-btn card-edit" href="${card.link_edit_entry}" target="_blank" rel="noopener">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                Editar
              </a>`
                : ''}
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
        const summary = card;
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
          ${card.thumbnail
            ? ''
            : `<div class="card-title">${card.nombre_fuente}${card.es_oficial ? `<span class="card-img-oficial card-oficial-wrap" title="Es fuente oficial">${this._oficialIconSvg()}</span>` : ''}</div>`}
          <div class="card-fecha-pub" title="Fecha de publicación">${this._formatDate(card.fecha_publicacion)}</div>
          ${card.notas_de_trabajo ? `<div class="card-notas-trabajo">${card.notas_de_trabajo}</div>` : ''}
          <div class="card-desc-slot">${summary.resumen_ia ? `<div class="card-desc">${summary.resumen_ia}</div>` : ''}</div>
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
        const timelineImg = el.querySelector('.card-image');
        if (timelineImg) {
            timelineImg.addEventListener('load', () => timelineImg.classList.add('loaded'));
            if (timelineImg.complete)
                timelineImg.classList.add('loaded');
        }
        const cardEl = el.querySelector('.timeline-card');
        cardEl.addEventListener('click', (e) => {
            if (e.target &&
                e.target.closest('.card-open, .card-collapse, .card-info-btn, .card-info-menu, .card-share-btn, .card-adjuntos, .card-inline-images, .card-inline-adjuntos, .card-edit'))
                return;
            cardEl.classList.add('expanded');
            void this._ensureCardDetail(cardEl).then(() => {
                this._processCardEmbeds(cardEl);
            });
        });
        cardEl.querySelector('.card-collapse').addEventListener('click', (e) => {
            e.stopPropagation();
            cardEl.classList.remove('expanded');
        });
        cardEl.querySelector('.card-info-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            cardEl.querySelector('.card-info-menu').classList.toggle('open');
            const adjuntosMenu = cardEl.querySelector('.card-adjuntos-menu');
            if (adjuntosMenu)
                adjuntosMenu.classList.remove('open');
        });
        const shareBtn = el.querySelector('.card-share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
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
    _hasDetail(card) {
        return 'tipo_fuente' in card;
    }
    /** Build the "Actores principales" HTML block */
    _buildProtagonistaHtml(card) {
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
    _buildFuenteHtml(card) {
        return `<div class="card-fuente"><span class="fuente-label">Fuente:</span> ${card.fuente_institucional ?? '-'}${card.es_oficial ? `<span class="card-oficial-wrap" title="Es fuente oficial">${this._oficialIconSvg()}</span>` : ''}</div>`;
    }
    /** Build the "Temas destacados" HTML block */
    _buildTemasHtml(card) {
        if (!card.temas || !card.temas.length)
            return '';
        return `<div class="card-temas">
        <div class="card-subtitle">Temas destacados</div>
        <div class="card-temas-list">
        ${card.temas
            .map((t) => `
          <div class="tema-item tone-tema-${t.tono_social.toLowerCase()}">
            <div class="tema-content">
              <span class="tema-title"><span class="tema-tone">${TONE_LABEL[t.tono_social]}</span><span class="tema-title">${t.titulo}</span>${t.fecha_narrativa ? `<span class="tema-fecha" title="Fecha narrativa">[ ${this._formatDate(t.fecha_narrativa)} ]</span>` : ''}</span>
              <span class="tema-desc">${t.resumen}</span>
              ${t.notas_de_trabajo ? `<div class="tema-notas-trabajo">${t.notas_de_trabajo}</div>` : ''}
            </div>
          </div>`)
            .join('')}
        </div>
        </div>`;
    }
    /** Build the "Videos vinculados" HTML block */
    _buildVideosHtml(card) {
        if (!card.links_videos || !card.links_videos.length)
            return '';
        return `<div class="card-videos"><div class="card-subtitle card-iframe-subtitle">Videos vinculados</div><div class="card-videos-list">${card.links_videos
            .map((link) => this._parseLinkWeb(link))
            .filter((parsed) => parsed !== null)
            .map((parsed) => this._buildEmbed(parsed))
            .join('')}</div></div>`;
    }
    /** Build the inline "Imágenes" HTML block */
    _buildInlineImagesHtml(card) {
        if (!this.inlineImages || !card.imagenes || !card.imagenes.length)
            return '';
        return `<div class="card-inline-images"><div class="card-subtitle">Imágenes</div><div class="card-inline-images-list">${card.imagenes
            .map((img, i) => `<button class="card-inline-thumb" data-index="${i}"><img src="${this._encodeFileName(img.thumb)}" alt="" loading="lazy"></button>`)
            .join('')}</div></div>`;
    }
    /** Build the inline "Adjuntos" HTML block */
    _buildInlineAdjuntosHtml(card) {
        if (!this.inlineAdjuntos || !card.adjuntos || !card.adjuntos.length)
            return '';
        return `<div class="card-inline-adjuntos"><div class="card-subtitle">Adjuntos</div><div class="card-inline-adjuntos-list">${card.adjuntos
            .map((a) => {
            const ext = this._getFileExt(a);
            const name = a.substring(a.lastIndexOf('/') + 1);
            return `<a class="card-inline-adjunto${ext === 'pdf' ? ' card-inline-adjunto-pdf' : ''}" href="${this._encodeFileName(a)}" target="_blank" rel="noopener" title="${name}">${this._fileIconSvg(ext)}<span class="card-inline-adjunto-name">${name}</span></a>`;
        })
            .join('')}</div></div>`;
    }
    /** Build the card actions bar (screenshot, imágenes, adjuntos, abrir, editar) */
    _buildActionsHtml(card) {
        const imgCount = (card.imagenes || []).length;
        const adjCount = (card.adjuntos || []).length;
        return `<div class="card-actions-row">
        ${card.screenshot
            ? '<button class="card-actions-btn card-screenshot-btn" title="Captura de pantallla de la fuente"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144.12 144" width="14" height="14"><path d="M78.64,116.38q-18.12,0-36.22,0c-6.27,0-10.66-4.39-10.66-10.68q0-22.31,0-44.61A10.44,10.44,0,0,1,36.23,52a1.13,1.13,0,0,0,.49-1.11c0-1.36,0-2.72,0-4.08,0-1.92.39-2.51,2.29-2.89a15.06,15.06,0,0,1,6.41,0c1.54.36,2.06,1.14,2.09,2.74,0,1.15-.5,2.67.23,3.32s2.13.17,3.24.18c1.68,0,3.36-.06,5,0,1,.05,1.27-.26,1.36-1.22a12.06,12.06,0,0,1,7.79-10.66,13.4,13.4,0,0,1,5.22-1.08c5.56,0,11.12-.11,16.67,0,6.25.14,11.68,3.88,12.91,10.5A2,2,0,0,1,100,48c.1.71-.16,1.74.35,2.05s1.55.15,2.34.15h12.48a10.13,10.13,0,0,1,10.48,10.25q.1,22.85,0,45.69a10.13,10.13,0,0,1-10.46,10.27Q96.93,116.4,78.64,116.38Zm0-61.24A26.93,26.93,0,1,0,79.23,109c14.27-.16,26.3-12.34,26.31-26.91A26.91,26.91,0,0,0,78.68,55.14Z" transform="translate(-6.66 -4.82)"/><path d="M31.12,4.82H49.24a6.16,6.16,0,0,1,6.17,6.37,6.24,6.24,0,0,1-6.16,6.55q-14.22,0-28.43,0c-.92,0-1.18.2-1.18,1.15,0,9.48,0,19,0,28.43,0,3.33-2.34,5.73-5.93,6.16a6.46,6.46,0,0,1-6.86-4.59,5.16,5.16,0,0,1-.12-1.3q0-18.48,0-36.95a5.88,5.88,0,0,1,5.78-5.8C18.72,4.81,24.92,4.82,31.12,4.82Z" transform="translate(-6.66 -4.82)"/><path d="M126.32,148.77c-6,0-12.08-.13-18.11,0a6.31,6.31,0,0,1-6.08-7.35c.62-3.77,2.86-5.62,6.65-5.62,9.27,0,18.55,0,27.83,0,1.07,0,1.19-.35,1.18-1.27q0-14.16,0-28.31c0-3.34,2.3-5.71,5.93-6.17a6.51,6.51,0,0,1,6.83,4.46,4.94,4.94,0,0,1,.15,1.42q0,18.42,0,36.83a5.9,5.9,0,0,1-5.89,5.93H126.32Z" transform="translate(-6.66 -4.82)"/><path d="M150.7,29.18c0,5.92-.24,11.85.07,17.75.26,4.79-5.22,8.24-9.85,5.68a5.75,5.75,0,0,1-3.15-5.37c0-9.44,0-18.87,0-28.31,0-1-.29-1.21-1.25-1.21q-14.16.06-28.31,0c-3.35,0-5.73-2.24-6.14-5.91A6.39,6.39,0,0,1,106.51,5a5.34,5.34,0,0,1,1.42-.16h36.94a5.92,5.92,0,0,1,5.82,5.88Q150.7,20,150.7,29.18Z" transform="translate(-6.66 -4.82)"/><path d="M6.74,124.42c0-5.92.25-11.85-.07-17.75-.26-4.78,5.22-8.25,9.85-5.68a5.75,5.75,0,0,1,3.15,5.37c0,9.44,0,18.87,0,28.31,0,1,.28,1.21,1.25,1.21q14.14-.06,28.3,0c3.36,0,5.73,2.23,6.15,5.91a6.39,6.39,0,0,1-4.41,6.85,4.94,4.94,0,0,1-1.42.15H12.57a5.93,5.93,0,0,1-5.82-5.88Q6.74,133.65,6.74,124.42Z" transform="translate(-6.66 -4.82)"/><path d="M94.38,82.05A15.66,15.66,0,1,1,78.72,66.26,15.72,15.72,0,0,1,94.38,82.05Z" transform="translate(-6.66 -4.82)"/></svg> Captura</button>'
            : ''}
        ${imgCount > 0 && !this.inlineImages
            ? '<button class="card-actions-btn card-images-btn" title="Ver imágenes"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Imágenes <span class="card-actions-count">' +
                imgCount +
                '</span></button>'
            : ''}
        ${adjCount > 0 && !this.inlineAdjuntos
            ? `<div class="card-adjuntos"><button class="card-actions-btn card-adjuntos-btn" title="Ver adjuntos"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Adjuntos <span class="card-actions-count">${adjCount}</span></button><div class="card-adjuntos-menu">${(card.adjuntos || [])
                .map((a) => `<a class="card-adjunto-link" href="${this._encodeFileName(a)}" target="_blank" rel="noopener">${a.substring(a.lastIndexOf('/') + 1)}</a>`)
                .join('')}</div></div>`
            : ''}
        ${card.link_web
            ? `<a class="card-actions-btn card-open" href="${card.link_web}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Visitar
        </a>`
            : ''}
        ${this.internalButtons && card.link_edit_entry
            ? `<a class="card-actions-btn card-edit" href="${card.link_edit_entry}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          Editar
        </a>`
            : ''}
      </div>`;
    }
    /** Build the "Información" menu rows (ID, Tipo, Oficial, Captura) */
    _buildInfoMenuHtml(card) {
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
        <span class="card-info-value">${card.tipo_fuente || 'Sin tipo'}</span>
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
    _buildTaxonomies(taxonomias) {
        if (!Array.isArray(taxonomias))
            return '';
        const groups = taxonomias
            .filter((tax) => tax && tax.label && Array.isArray(tax.items) && tax.items.length)
            .map((tax) => {
            const valid = tax.items.filter((item) => item && item.link && item.content);
            if (!valid.length)
                return '';
            const renderLink = (item) => `<a class="card-taxonomy-link" href="${this._escapeHtml(item.link)}" target="_blank" rel="noopener">${this._escapeHtml(item.content)}</a>`;
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
        if (!groups.length)
            return '';
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
    _bindTaxonomyToggles(root) {
        root.querySelectorAll('.card-taxonomy-more').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const button = e.currentTarget;
                const list = button.closest('.card-taxonomy-list');
                if (!list)
                    return;
                const extras = list.querySelectorAll('.card-taxonomy-extra');
                const expanded = button.getAttribute('aria-expanded') === 'true';
                list.classList.toggle('expanded', !expanded);
                extras.forEach((extra) => {
                    extra.hidden = expanded;
                });
                button.setAttribute('aria-expanded', String(!expanded));
                button.textContent = expanded ? `Ver más (${extras.length})` : 'Ver menos';
            });
        });
    }
    /** Fill the card detail slots and bind their interactions */
    _injectCardDetail(cardEl, card) {
        const actionsEl = cardEl.querySelector('.card-actions');
        const descSlot = cardEl.querySelector('.card-desc-slot');
        const temasSlot = cardEl.querySelector('.card-temas-slot');
        const protagFuenteSlot = cardEl.querySelector('.card-protag-fuente-slot');
        const mediaSlot = cardEl.querySelector('.card-media-slot');
        const videosSlot = cardEl.querySelector('.card-videos-slot');
        const taxonomiasSlot = cardEl.querySelector('.card-taxonomies-slot');
        if (actionsEl) {
            actionsEl.innerHTML = this._buildActionsHtml(card);
            const screenshotBtn = actionsEl.querySelector('.card-screenshot-btn');
            if (screenshotBtn) {
                screenshotBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._openLightGallery([{ thumb: card.screenshot, full: card.screenshot }], card.nombre_fuente, false);
                });
            }
            const imagesBtn = actionsEl.querySelector('.card-images-btn');
            if (imagesBtn) {
                imagesBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (card.imagenes && card.imagenes.length) {
                        this._openLightGallery(card.imagenes, card.nombre_fuente, true);
                    }
                });
            }
            const adjuntosWrap = actionsEl.querySelector('.card-adjuntos');
            if (adjuntosWrap) {
                const adjuntosBtn = adjuntosWrap.querySelector('.card-adjuntos-btn');
                const adjuntosMenu = adjuntosWrap.querySelector('.card-adjuntos-menu');
                adjuntosBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    adjuntosMenu.classList.toggle('open');
                    const infoMenu = cardEl.querySelector('.card-info-menu');
                    if (infoMenu)
                        infoMenu.classList.remove('open');
                });
            }
        }
        if (descSlot && card.resumen_ia) {
            descSlot.innerHTML = `<div class="card-desc">${card.resumen_ia}</div>`;
        }
        if (temasSlot)
            temasSlot.innerHTML = this._buildTemasHtml(card);
        if (protagFuenteSlot) {
            protagFuenteSlot.innerHTML = this._buildProtagonistaHtml(card) + this._buildFuenteHtml(card);
            const prot = protagFuenteSlot.querySelector('.card-protagonista.has-more');
            if (prot) {
                prot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    prot.classList.toggle('expanded');
                    const list = prot.querySelector('.protagonista-list');
                    if (prot.classList.contains('expanded')) {
                        list.textContent = prot.dataset.full || '';
                    }
                    else {
                        list.textContent = (card.actores_principales || []).slice(0, 3).join(', ') + '...';
                    }
                });
            }
        }
        if (mediaSlot) {
            mediaSlot.innerHTML = this._buildInlineImagesHtml(card) + this._buildInlineAdjuntosHtml(card);
            mediaSlot.querySelectorAll('.card-inline-thumb').forEach((thumb) => {
                const img = thumb.querySelector('img');
                if (img) {
                    img.addEventListener('load', () => thumb.classList.add('loaded'));
                    if (img.complete)
                        thumb.classList.add('loaded');
                }
            });
            const inlineImages = mediaSlot.querySelector('.card-inline-images');
            if (inlineImages) {
                inlineImages.addEventListener('click', (e) => {
                    const thumb = e.target.closest('.card-inline-thumb');
                    if (!thumb)
                        return;
                    e.stopPropagation();
                    const index = Number(thumb.dataset.index) || 0;
                    this._openLightGallery(card.imagenes, card.nombre_fuente, true, index);
                });
            }
        }
        if (videosSlot) {
            videosSlot.innerHTML = this._buildVideosHtml(card);
            videosSlot.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
                const iframe = wrap.querySelector('iframe');
                if (iframe) {
                    iframe.addEventListener('load', () => wrap.classList.add('loaded'));
                    if (iframe.contentDocument?.readyState === 'complete')
                        wrap.classList.add('loaded');
                }
            });
        }
        if (taxonomiasSlot) {
            taxonomiasSlot.innerHTML = this._buildTaxonomies(card.taxonomias);
            this._bindTaxonomyToggles(taxonomiasSlot);
        }
        const embedSlot = cardEl.querySelector('.card-embed-slot');
        if (embedSlot) {
            const embedUrl = card.link_web ? this._parseLinkWeb(card.link_web) : null;
            if (embedUrl) {
                embedSlot.innerHTML = `<div class="card-embed"><div class="card-subtitle card-iframe-subtitle">Publicación original</div>${this._buildEmbed(embedUrl)}</div>`;
                embedSlot.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
                    const iframe = wrap.querySelector('iframe');
                    if (iframe) {
                        iframe.addEventListener('load', () => wrap.classList.add('loaded'));
                        if (iframe.contentDocument?.readyState === 'complete')
                            wrap.classList.add('loaded');
                    }
                });
            }
        }
        const infoMenuEl = cardEl.querySelector('.card-info-menu');
        if (infoMenuEl) {
            infoMenuEl.innerHTML = this._buildInfoMenuHtml(card);
        }
        cardEl.dataset.detailLoaded = '1';
    }
    /** Ensure the full detail of the card is present (fetches it when missing) */
    async _ensureCardDetail(cardEl) {
        if (cardEl.dataset.detailLoaded)
            return;
        if (!this.api)
            return;
        const id = cardEl.dataset.cardId;
        if (!id)
            return;
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
    _processCardEmbeds(cardEl) {
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
                }
                else if (!cardEl.querySelector('.card-iframe-instagram iframe')) {
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
                            if (!iframe)
                                return;
                            clearInterval(check);
                            iframe.addEventListener('load', () => igWrap.classList.add('loaded'), { once: true });
                            setTimeout(() => igWrap.classList.add('loaded'), 3000);
                        }, 100);
                        setTimeout(() => igWrap.classList.add('loaded'), 10000);
                    }
                });
            }, 150);
        }
        const twWraps = cardEl.querySelectorAll('.card-iframe-twitter');
        if (twWraps.length) {
            setTimeout(() => {
                twWraps.forEach((twWrap) => {
                    if (!twWrap.querySelector('iframe')) {
                        if (typeof twttr !== 'undefined' && twttr.widgets) {
                            twttr.widgets.load(twWrap);
                        }
                        else {
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
                            if (!iframe)
                                return;
                            clearInterval(check);
                            iframe.addEventListener('load', () => twWrap.classList.add('loaded'), { once: true });
                            setTimeout(() => twWrap.classList.add('loaded'), 3000);
                        }, 100);
                        setTimeout(() => twWrap.classList.add('loaded'), 10000);
                    }
                });
            }, 150);
        }
        const fbWraps = cardEl.querySelectorAll('.card-iframe-facebook');
        if (fbWraps.length) {
            setTimeout(() => {
                fbWraps.forEach((fbWrap) => {
                    if (!fbWrap.querySelector('iframe')) {
                        if (typeof FB !== 'undefined' && FB.XFBML) {
                            FB.XFBML.parse(fbWrap);
                        }
                        else {
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
                            if (!iframe)
                                return;
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
    _insertBeforeFooter(el) {
        const footer = this.timelineCards.querySelector('.timeline-footer-item');
        if (footer) {
            this.timelineCards.insertBefore(el, footer);
        }
        else {
            this.timelineCards.appendChild(el);
        }
    }
    /**
     * Insert an element at the end of the cards, that is: before the first element of the
     * trailing block (load-more button, paginator, status row, footer), which is what keeps the
     * append order identical to the one `_renderTimeline` + `_renderLoadMoreButton` + `_renderStatus`
     * build. `querySelector` returns the first match in document order, so the load-more button
     * or the paginator wins when one of them is there.
     */
    _insertBeforeTrailing(el) {
        const anchor = this.timelineCards.querySelector('.timeline-load-more-item, .timeline-paginator-item, .timeline-status-item, .timeline-footer-item');
        if (anchor) {
            this.timelineCards.insertBefore(el, anchor);
        }
        else {
            this.timelineCards.appendChild(el);
        }
    }
    /** Render the timeline cards list, including the last-updated footer */
    _renderTimeline(cards) {
        this.timelineCards.innerHTML = '';
        if (cards.length === 0) {
            const el = document.createElement('div');
            el.className = 'timeline-item timeline-empty-item';
            el.innerHTML = `
        <div class="timeline-date-col"></div>
        <div class="timeline-empty-text">Sin publicaciones para mostrar</div>
      `;
            this.timelineCards.appendChild(el);
        }
        else {
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
    _appendTimelineItems(items, startIndex) {
        // `_renderTimeline` only writes the "nothing to show" placeholder when the list comes back
        // empty. Appending cards makes it untrue, so it goes before the first real one lands.
        if (items.length) {
            this.timelineCards.querySelectorAll('.timeline-empty-item').forEach((el) => el.remove());
        }
        const added = [];
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
    _renderLastUpdated() {
        this.timelineCards.querySelectorAll('.timeline-footer-item').forEach((f) => f.remove());
        if (!this.lastUpdated)
            return;
        const d = new Date(this.lastUpdated);
        const formatted = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) +
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
    _setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const cards = this.featuredContainer.querySelectorAll('.featured-card');
                    cards.forEach((c) => c.classList.add('visible'));
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        observer.observe(this.section);
    }
    /**
     * Set up IntersectionObserver for the timeline items entrance animation.
     *
     * `items` narrows what gets observed, which is what pagination needs: after an append the
     * cards already on screen are visible and their own observer has already done its job, so
     * there is nothing to re-observe. Default is every `.timeline-item` in the container.
     */
    _setupTimelineObserver(items) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px 100px 0px' });
        const targets = items ?? this.container.querySelectorAll('.timeline-item');
        Array.from(targets).forEach((item) => {
            observer.observe(item);
        });
    }
    /** Dynamically load social media embed scripts (Instagram, Twitter, Facebook) as needed */
    _preloadEmbedLibraries() {
        const types = new Set();
        this.allCards.forEach((card) => {
            const urls = [];
            if (card.link_web)
                urls.push(card.link_web);
            if (card.links_videos && card.links_videos.length)
                urls.push(...card.links_videos);
            urls.forEach((url) => {
                const parsed = this._parseLinkWeb(url);
                if (parsed)
                    types.add(parsed.type);
            });
        });
        this.container.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
            const cls = wrap.classList;
            if (cls.contains('card-iframe-instagram'))
                types.add('instagram');
            else if (cls.contains('card-iframe-twitter'))
                types.add('twitter');
            else if (cls.contains('card-iframe-facebook'))
                types.add('facebook');
            else if (cls.contains('card-iframe-youtube'))
                types.add('youtube');
        });
        const _watchEmbeds = (selector) => {
            const scan = setInterval(() => {
                const wraps = document.querySelectorAll(selector);
                let pending = 0;
                wraps.forEach((wrap) => {
                    if (wrap.classList.contains('loaded'))
                        return;
                    const iframe = wrap.querySelector('iframe');
                    if (!iframe) {
                        pending++;
                        return;
                    }
                    iframe.addEventListener('load', () => wrap.classList.add('loaded'), { once: true });
                    pending++;
                });
                if (pending === 0)
                    clearInterval(scan);
            }, 200);
            setTimeout(() => clearInterval(scan), 15000);
        };
        const loadScript = (src) => {
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
        const loadInstagram = types.has('instagram') && !document.querySelector('script[src*="instagram.com/embed.js"]')
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
    _applyExpandState() {
        this.section.classList.add('expanded');
        this.timelineContainer.classList.add('expanded');
        this.expandIcon.classList.add('rotated');
        this.expandToggle.setAttribute('aria-expanded', 'true');
    }
    /** Mirror of _applyExpandState for the collapsed state */
    _collapseExpandState() {
        this.section.classList.remove('expanded');
        this.timelineContainer.classList.remove('expanded');
        this.expandIcon.classList.remove('rotated');
        this.expandToggle.setAttribute('aria-expanded', 'false');
    }
    /** Toggle between expanded (timeline visible) and collapsed state */
    _toggleExpand(scrollTo = false) {
        // En fullpage el timeline no se colapsa nunca. El click del botón ya no se bindea, pero
        // esta guarda también cubre los otros dos caminos que llegan acá (#featured-cards y la
        // fila de arriba) sin tener que repetir la condición en cada listener.
        if (this.fullpage)
            return;
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
            this._applyExpandState();
            requestAnimationFrame(() => {
                this._setupTimelineObserver();
            });
            // The facets (counts, collection total, lastUpdated) are already loaded at startup; this
            // is a cache hit that also covers the case where that request failed: no re-request.
            if (this.api)
                void this._ensureApiFacets();
            this._preloadEmbedLibraries();
        }
        else {
            const cards = this.featuredContainer.querySelectorAll('.featured-card');
            cards.forEach((c) => (c.style.transition = 'none'));
            cards.forEach((c) => c.classList.remove('visible'));
            void this.featuredContainer.offsetHeight;
            cards.forEach((c) => (c.style.transition = ''));
            this._collapseExpandState();
            this.container.querySelectorAll('.timeline-item').forEach((item) => {
                item.classList.remove('visible');
            });
            if (scrollTo)
                this._scrollToSection();
            setTimeout(() => {
                cards.forEach((c) => c.classList.add('visible'));
            }, 100);
        }
    }
    /**
     * The element that actually scrolls a given one, or `null` when it is the viewport.
     *
     * Walks up from `el` looking for the first box with a scrollable `overflow`, so it works both
     * when the page (or the window) is what scrolls and when the consumer mounts the component
     * inside a scrollable container of their own. Returns `null` instead of falling back to the
     * window, so each caller can scroll however it wants to (smoothly or not).
     */
    _findScrollContainer(el) {
        let node = el;
        while (node) {
            const style = getComputedStyle(node);
            if (style.overflowY === 'auto' ||
                style.overflowY === 'scroll' ||
                style.overflow === 'auto' ||
                style.overflow === 'scroll') {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    }
    /** Scroll the page/section to make the timeline container visible */
    _scrollToSection() {
        const offset = 60;
        const rect = this.section.getBoundingClientRect();
        const scroller = this._findScrollContainer(this.section.parentElement);
        if (scroller) {
            scroller.scrollTo({ top: scroller.scrollTop + rect.top - offset, behavior: 'smooth' });
            return;
        }
        window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'smooth' });
    }
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
    _scrollToTimelineTop() {
        if (!this.fullpage) {
            this.timelineCards.scrollTop = 0;
            return;
        }
        const rect = this.timelineCards.getBoundingClientRect();
        const toolbarBottom = this.featuredRow ? this.featuredRow.getBoundingClientRect().bottom : 0;
        // How far the top of the list is from where it should sit under the toolbar: positive means
        // the list is too low and the scroller has to go down, negative means it is already scrolled
        // past it and the scroller has to come back up.
        const delta = rect.top - toolbarBottom;
        if (delta === 0)
            return;
        const scroller = this._findScrollContainer(this.timelineCards.parentElement);
        if (scroller) {
            scroller.scrollTop = scroller.scrollTop + delta;
        }
        else {
            window.scrollTo(0, window.scrollY + delta);
        }
    }
    /** Toggle timeline sort order between ascending and descending */
    _toggleSort() {
        this.sortAscending = !this.sortAscending;
        this.sortToggle.classList.toggle('asc', this.sortAscending);
        this._applyFilters(true);
    }
    /** Apply the persisted work-notes visibility state to the section and toggle button */
    _applyWorkNotesState() {
        if (!this.workNotesToggle)
            return;
        let hidden = false;
        try {
            hidden = window.localStorage.getItem(WORK_NOTES_STORAGE_KEY) === '1';
        }
        catch {
            /* localStorage unavailable */
        }
        this.section.classList.toggle('work-notes-hidden', hidden);
        this.workNotesToggle.classList.toggle('active', hidden);
        this.workNotesToggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
        this.workNotesToggle.title = hidden ? 'Mostrar notas de trabajo' : 'Ocultar notas de trabajo';
    }
    /** Toggle work-notes visibility and persist the state to localStorage */
    _toggleWorkNotes() {
        if (!this.workNotesToggle)
            return;
        const hidden = !this.section.classList.contains('work-notes-hidden');
        this.section.classList.toggle('work-notes-hidden', hidden);
        this.workNotesToggle.classList.toggle('active', hidden);
        this.workNotesToggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
        this.workNotesToggle.title = hidden ? 'Mostrar notas de trabajo' : 'Ocultar notas de trabajo';
        try {
            window.localStorage.setItem(WORK_NOTES_STORAGE_KEY, hidden ? '1' : '0');
        }
        catch {
            /* localStorage unavailable */
        }
    }
    /**
     * How many values the group `f` shows before the "Ver más (N)" toggle appears: its own
     * `maxVisible`, or the default when it declares none. Below 2 no group collapses.
     */
    _filterMaxVisible(f) {
        return typeof f.maxVisible === 'number' ? f.maxVisible : DEFAULT_FILTER_MAX_VISIBLE;
    }
    /**
     * The token a raw value is compared and sent as: its `String()`, with `null` / `undefined` both
     * read as `FILTER_EMPTY_VALUE` so an option declared with `value: null`, or the "Sin valor" of an
     * `allowEmpty` group, matches an item that does not carry the field.
     */
    _filterToken(value) {
        return value === undefined || value === null ? FILTER_EMPTY_VALUE : String(value);
    }
    /**
     * Values a group carries for a single item, as the tokens the code filters on:
     * what `extract` returns, or the `field` of the item itself (arrays expanded, everything
     * tokenized). An item with no value carries the empty token, which is a value of its own: it
     * matches the option that declares it (or the "Sin valor" of an `allowEmpty` group), and in a
     * derived group without `allowEmpty` it produces no value at all.
     */
    _filterValuesOf(f, item) {
        const v = f.extract ? f.extract(item) : item[f.field];
        if (v == null)
            return [FILTER_EMPTY_VALUE];
        return (Array.isArray(v) ? v : [v]).map((x) => this._filterToken(x));
    }
    /**
     * The tokens the checkboxes of the group currently filter by: the ones checked, each split back
     * into the values it declared, so an option like `[false, null]` contributes both.
     */
    _filterActiveTokens(f) {
        return f.checkboxes.filter((cb) => cb.checked).flatMap((cb) => cb.value.split(','));
    }
    /**
     * Label shown for a value of a group that derives its values: what `formatLabel` returns, or the
     * value itself — except the booleans, that would otherwise read as raw `true` / `false`.
     * A declared group carries the label in its own `items`, and the empty bucket of an `allowEmpty`
     * group has its own fixed label, so neither reaches this method.
     */
    _filterLabelOf(f, value) {
        if (f.formatLabel)
            return f.formatLabel(value);
        if (value === 'true')
            return 'Sí';
        if (value === 'false')
            return 'No';
        return value;
    }
    /**
     * Build the checkboxes of every group of the `filters` option out of the values it has:
     * the ones derived from the items of the active scope in local mode, the ones the server sent
     * in `GET {url}/facets` in API mode. A group with no container to draw in is skipped, and so
     * is the whole method when no group was declared at all (nothing to build, nothing to show).
     */
    _buildFilterCheckboxes() {
        if (this.filters.length === 0)
            return;
        const savedState = this._loadPersistedFilterState();
        const scope = this._scopeItems();
        let anyFilterVisible = false;
        this.filters.forEach((f) => {
            if (!f.options)
                return;
            const inInternos = f.group === 'filtros_internos';
            const declared = f.declared;
            let values;
            let counts;
            if (declared) {
                // Los valores ya están declarados: solo falta contarlos. En API mode salen de los facets
                // (y un valor que el server todavía no mandó cuenta 0 en vez de desaparecer).
                values = declared.map((d) => d.token);
                const facets = this.api ? this._apiFacets[f.field] || {} : null;
                counts = {};
                values.forEach((token) => {
                    const item = declared.find((d) => d.token === token);
                    if (facets) {
                        // Los facets son por token crudo, así que un valor declarado con varios tokens
                        // (`[false, null]`) no tiene una clave propia: se suman las de cada token, que es
                        // exacto mientras el campo tenga un solo valor por ítem (el caso normal) y cuenta de
                        // más solo cuando un ítem responde más de una vez al mismo checkbox.
                        counts[token] = (item?.tokens || []).reduce((sum, t) => sum + (facets[t] || 0), 0);
                    }
                    else {
                        counts[token] = scope.filter((c) => this._filterValuesOf(f, c).some((x) => item?.tokens.includes(x))).length;
                    }
                });
            }
            else if (this.api) {
                // Derivados en API: las claves del facet que tienen algo detrás. El bucket vacío se
                // descarta igual que en local, salvo que el grupo lo pida con `allowEmpty`: los facets son
                // por token, así que la clave `"null"` es la que lo representa.
                const facetCounts = this._apiFacets[f.field] || {};
                values = Object.keys(facetCounts).filter((v) => (facetCounts[v] || 0) > 0 && (f.allowEmpty || v !== FILTER_EMPTY_VALUE));
                counts = facetCounts;
            }
            else {
                // Derivados: los tokens que traen los items. El bucket vacío (`'null'`) y `''` no generan
                // una opción por su cuenta: en un grupo sin `items` no hay a quién atribuírsela, salvo que
                // el grupo lo pida con `allowEmpty` (y entonces lo ofrece como "Sin valor").
                const tokens = [...new Set(scope.flatMap((c) => this._filterValuesOf(f, c)))].filter((v) => v !== '');
                values = f.allowEmpty ? tokens : tokens.filter((v) => v !== FILTER_EMPTY_VALUE);
                counts = {};
                values.forEach((val) => {
                    counts[val] = scope.filter((c) => this._filterValuesOf(f, c).includes(val)).length;
                });
            }
            // Solo un grupo que deriva sus valores se puede quedar sin nada que decidir: uno declarado
            // existe siempre, aunque ningún item (o ningún facet) traiga sus valores. La excepción es el
            // grupo con `allowEmpty` que solo encontró el bucket vacío: el consumidor lo pidió, y filtrar
            // por él (dejar fuera los que sí tienen valor) es una decisión, no un dato vacío.
            const onlyEmpty = values.length === 1 && values[0] === FILTER_EMPTY_VALUE;
            if (!declared && values.length <= 1 && !(f.allowEmpty && onlyEmpty)) {
                f.checkboxes = [];
                f.options.hidden = true;
                return;
            }
            f.options.hidden = false;
            // The `filtros_internos` groups live in the internal-filters flyout, which has a button of
            // its own: they must not be the reason the filter button of the panel shows up.
            if (!inInternos)
                anyFilterVisible = true;
            if (f.sortValues)
                values.sort(f.sortValues);
            // A group longer than its cut shows the first values of its declared order (or the one
            // `sortValues` gives it) and hides the rest behind a "Ver más (N)" toggle. Only a group that
            // declares neither is reordered by count, because that order is the useful one when the
            // values came from the data. `sort` is stable, so ties keep the order they had.
            const limit = this._filterMaxVisible(f);
            const overflow = limit >= 2 ? Math.max(0, values.length - limit) : 0;
            if (overflow && !declared && !f.sortValues)
                values.sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
            // El bucket vacío va siempre al final, después de cualquier orden (declarado, `sortValues` o
            // por conteo): es la ausencia de un valor, no un valor más, y al final se lee como la
            // ás la excepción que es. El corte no cambia (mide cuántos valores hay, no cuáles), así que el
            // bucket puede caer en la cola del "Ver más (N)" — y si el usuario lo tilda, el grupo se abre solo.
            if (f.allowEmpty) {
                const emptyIndex = values.indexOf(FILTER_EMPTY_VALUE);
                if (emptyIndex > -1 && emptyIndex < values.length - 1)
                    values.push(...values.splice(emptyIndex, 1));
            }
            f.options.innerHTML = '';
            f.options.classList.remove('expanded');
            f.checkboxes = [];
            values.forEach((val, i) => {
                const declaredItem = declared?.find((d) => d.token === val);
                const isExtra = overflow > 0 && i >= values.length - overflow;
                const label = document.createElement('label');
                label.className = isExtra ? 'filter-option filter-option-extra' : 'filter-option';
                // Kept in sync with the class below for the case where the stylesheet is not loaded.
                label.hidden = isExtra;
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = val;
                const savedValues = f.persist ? savedState[f.field] : undefined;
                cb.checked = savedValues ? savedValues.includes(val) : declaredItem?.checked === true;
                const span = document.createElement('span');
                span.className = 'filter-option-label';
                // El bucket vacío de un grupo `allowEmpty` tiene label fijo (y no pasa por `formatLabel`,
                // que es para los valores que el dato trae).
                const display = declaredItem
                    ? declaredItem.label
                    : f.allowEmpty && val === FILTER_EMPTY_VALUE
                        ? FILTER_EMPTY_LABEL
                        : this._filterLabelOf(f, val);
                span.textContent = display;
                const countSpan = document.createElement('span');
                countSpan.className = 'filter-option-count';
                countSpan.textContent = `(${counts[val] || 0})`;
                label.title = display;
                label.appendChild(cb);
                label.appendChild(span);
                label.appendChild(countSpan);
                cb.addEventListener('change', () => {
                    if (f.persist)
                        this._savePersistedFilterState();
                    this._applyFilters(true);
                });
                f.options.appendChild(label);
                f.checkboxes.push(cb);
            });
            if (overflow)
                this._buildFilterMore(f, overflow);
        });
        this.container.querySelectorAll('.filter-section').forEach((sectionEl) => {
            const section = sectionEl;
            const opts = Array.from(section.querySelectorAll('.filter-options'));
            const hasOptions = opts.some((o) => this.filters.some((ef) => ef.options === o && ef.checkboxes.length > 0));
            section.hidden = opts.length > 0 && !hasOptions;
        });
        if (this.filtrosInternosWrap) {
            this.filtrosInternosWrap.style.display = '';
        }
        // En modo API el botón se muestra desde el arranque aunque todavía no haya facets: sin ellos
        // los grupos que derivan sus valores no tienen nada que mostrar, y esperar la respuesta deja el
        // toolbar incompleto y lo ensancha de golpe (muy notorio al iniciar con `startExpanded`). El
        // panel se arma con la respuesta, y hasta entonces el botón no tiene listener, así que no abre
        // nada. Cuando el pedido termina manda `anyFilterVisible`: si no hay nada que filtrar, se oculta
        // solo. Los grupos declarados existen igual (con los conteos en cero), así que la condición queda
        // como estaba en modo local.
        // El botón puede no existir: una declaración de filtros que solo tiene grupos
        // `filtros_internos` (o ninguna) no dibuja el panel, y entonces no hay nada que mostrar ni que
        // ocultar.
        const pendingFacets = !!this.api && !this._apiFacetsSettled;
        if (this.filterToggle)
            this.filterToggle.style.display = anyFilterVisible || pendingFacets ? '' : 'none';
    }
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
    _buildFilterMore(f, overflow) {
        const expanded = this._filterExpanded.has(f.field) || f.checkboxes.some((cb) => cb.checked);
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'filter-more';
        more.setAttribute('aria-expanded', String(expanded));
        more.textContent = expanded ? 'Ver menos' : `Ver más (${overflow})`;
        more.addEventListener('click', () => {
            const open = more.getAttribute('aria-expanded') === 'true';
            if (open)
                this._filterExpanded.delete(f.field);
            else
                this._filterExpanded.add(f.field);
            f.options.classList.toggle('expanded', !open);
            f.options.querySelectorAll('.filter-option-extra').forEach((extra) => {
                extra.hidden = open;
            });
            more.setAttribute('aria-expanded', String(!open));
            more.textContent = open ? `Ver más (${overflow})` : 'Ver menos';
        });
        f.options.classList.toggle('expanded', expanded);
        f.options.querySelectorAll('.filter-option-extra').forEach((extra) => {
            extra.hidden = !expanded;
        });
        f.options.appendChild(more);
    }
    /**
     * Load the state of the filters marked `persist` from localStorage, keyed by `field`.
     * A group that declares no `persist` never reads it, which is what makes the rebuilds (the API
     * facets, a taxonomy re-scope) start over on those instead of silently keeping a value.
     */
    _loadPersistedFilterState() {
        try {
            const raw = window.localStorage.getItem(PERSISTED_FILTER_STORAGE_KEY);
            if (!raw)
                return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch {
            return {};
        }
    }
    /** Persist the checked values of every group marked `persist` to localStorage */
    _savePersistedFilterState() {
        const state = {};
        this.filters
            .filter((f) => f.persist)
            .forEach((f) => {
            state[f.field] = f.checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
        });
        try {
            window.localStorage.setItem(PERSISTED_FILTER_STORAGE_KEY, JSON.stringify(state));
        }
        catch {
            /* localStorage unavailable */
        }
    }
    /** Normalize a string for accent- and case-insensitive search matching */
    _normalizeSearch(value) {
        return (value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }
    /** Check whether a card matches the current search term */
    _matchesSearch(card) {
        const q = this._normalizeSearch(this.searchTerm.trim());
        if (!q)
            return true;
        const haystacks = [
            String(card.id),
            card.nombre_fuente,
            card.fuente_institucional,
            card.actores_principales?.join(' ') ?? ''
        ];
        return haystacks.some((v) => this._normalizeSearch(v).includes(q));
    }
    /**
     * Page size used by the API mode. `itemsPerPage: 0` means "no pagination", so the request
     * asks for a page big enough to hold the whole collection in one response: the server only
     * slices what it gets, and a small `pageSize` there would silently leave the user with the
     * first few items and no way to ask for the rest.
     */
    _apiPageSize() {
        return this.itemsPerPage > 0 ? this.itemsPerPage : API_UNBOUNDED_PAGE_SIZE;
    }
    /**
     * Number of pages the current result set is split into, always at least 1. It counts up to the
     * total the mode knows about: the `total` the server sent in API mode, the filtered pool in
     * local mode.
     */
    _pageCount() {
        const size = this.api ? this._apiPageSize() : this.itemsPerPage;
        const total = this.api ? this._apiTotal : this.allCards.length;
        if (size <= 0)
            return 1;
        return Math.max(1, Math.ceil(total / size));
    }
    /** The page the user is on, 1-based. API mode reads the page the server was asked for */
    _currentPage() {
        return this.api ? this._apiPage : this._page;
    }
    /** True when there are more pages to load */
    _hasMorePages() {
        if (this.api)
            return this.allCards.length < this._apiTotal;
        return this.itemsPerPage > 0 && this._displayedCount < this.allCards.length;
    }
    /** Fetch a JSON resource from the API with the configured fetch implementation */
    async _apiFetch(path, params) {
        const cfg = this.api;
        const base = cfg.url.replace(/\/+$/, '');
        const qs = new URLSearchParams(params).toString();
        const fetchImpl = cfg.fetchImpl || window.fetch.bind(window);
        const response = await fetchImpl(`${base}${path}${qs ? '?' + qs : ''}`, {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok)
            throw new Error(`API request failed: ${response.status}`);
        return (await response.json());
    }
    /**
     * Build the query string params for the list endpoint from the current UI state.
     * Each group sends the tokens of its checked checkboxes joined by commas, which is exactly the
     * `value` of those checkboxes: a declared `[false, null]` travels as `validado=false,null`.
     */
    _buildQueryParams(page) {
        const params = {
            page: String(page),
            pageSize: String(this._apiPageSize()),
            sort: this.sortAscending ? 'asc' : 'desc'
        };
        if (this.searchTerm.trim())
            params.q = this.searchTerm.trim();
        this.filters.forEach((f) => {
            const active = f.checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
            if (active.length === 0)
                return;
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
    async _loadApiFacets() {
        try {
            const data = await this._apiFetch('/facets', {});
            if (data && data.facets) {
                this._apiFacets = data.facets;
                this._apiFacetsLoaded = true;
            }
            if (data && typeof data.total === 'number')
                this._apiCollectionTotal = data.total;
            if (data && data.lastUpdated && !this.lastUpdated)
                this.lastUpdated = data.lastUpdated;
        }
        catch {
            if (!this._apiFacetsLoaded)
                this._apiFacets = {};
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
    _ensureApiFacets() {
        if (!this.api)
            return Promise.resolve();
        if (!this._apiFacetsPromise) {
            this._apiFacetsPromise = this._loadApiFacets().then(() => {
                // El pedido terminó, con facets o con fallo: a partir de acá la visibilidad del botón la
                // decide `_buildFilterCheckboxes` sola, y se le puede colgar el listener porque el panel
                // ya tiene los valores (o se confirmó que no hay).
                this._apiFacetsSettled = true;
                this._buildFilterCheckboxes();
                if (this.api)
                    this._bindFilterToggle();
                this._syncFilterToggleState();
                this._renderRelatedCount();
                this._renderLastUpdated();
            });
        }
        return this._apiFacetsPromise;
    }
    /**
     * Fetch a page of items from the API and (re)build the whole view.
     *
     * This is the one call behind every request that **replaces** the list — the first page, the
     * refetch a search/filter/sort change schedules and the page change of the numeric paginator —
     * so it is also where the skeletons go up: what is on screen is never what is being asked for,
     * and leaving it there under a "Cargando..." line would only show the previous answer longer.
     */
    async _fetchPage(page) {
        const seq = ++this._apiSeq;
        const prevPage = this._apiPage;
        this._apiPage = page;
        // The single trigger of `_renderApiLoading`: idempotent, so `_init` and `_applyFilters` can
        // show the placeholders earlier and get a no-op here, and synchronous, so the DOM is already
        // swapped by the time the caller yields.
        this._renderApiLoading();
        try {
            const data = await this._apiFetch('', this._buildQueryParams(page));
            if (seq !== this._apiSeq)
                return;
            this._apiTotal = typeof data.total === 'number' ? data.total : this.allCards.length;
            this._apiLoading = false;
            this.allCards = Array.isArray(data.items) ? data.items : [];
            this._displayedCount = this.allCards.length;
            this._apiDetails.clear();
            this._adoptLegacyApiFacets(data);
            this._renderAll();
            // Page 1 means the whole list was replaced by a search/filter/sort change: bring the
            // timeline back to its first card. "Cargar más" (`_appendPageItems`) appends instead of
            // re-rendering, so it never comes through here and the position survives on its own.
            // With the paginator every fetch is a page change, and the same reasoning applies to all
            // of them: the articles in memory are not the ones the user was reading.
            if (page === 1 || this.pagination)
                this._scrollToTimelineTop();
        }
        catch {
            if (seq !== this._apiSeq)
                return;
            this._apiLoading = false;
            this._apiError = 'No se pudieron cargar los datos. Intente nuevamente.';
            // The page that was on screen is gone (its cards left with the skeletons), so the cursor
            // goes back to the one that was there. Without this the paginator would count from a page
            // that never rendered and every retry would skip one.
            this._apiPage = prevPage;
            // No `_renderAll` here: the skeletons are what is on screen, and whatever is in memory is
            // either what the panel no longer matches (search/filter/sort) or the page the user just left,
            // so neither is rendered and the list is left empty with the error row.
            this._clearApiLoading();
            this._renderStatus();
        }
    }
    /**
     * Fallback for servers that do not implement `GET {url}/facets` and still send the facets
     * inside the list response. Runs at most once: after that `_apiFacets` is never reassigned.
     */
    _adoptLegacyApiFacets(data) {
        if (this._apiFacetsLoaded || !data.facets)
            return;
        this._apiFacets = data.facets;
        this._apiFacetsLoaded = true;
        this._buildFilterCheckboxes();
        this._syncFilterToggleState();
    }
    /** Fetch the next page of items and append them to the timeline */
    async _appendPageItems() {
        const seq = this._apiSeq;
        const nextPage = this._apiPage + 1;
        this._apiLoading = true;
        this._apiError = '';
        this._renderStatus();
        try {
            const data = await this._apiFetch('', this._buildQueryParams(nextPage));
            if (seq !== this._apiSeq)
                return;
            this._apiTotal = typeof data.total === 'number' ? data.total : this._apiTotal;
            this._apiPage = nextPage;
            this._apiLoading = false;
            const start = this.allCards.length;
            const fresh = (data.items || []);
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
        }
        catch {
            if (seq !== this._apiSeq)
                return;
            this._apiLoading = false;
            this._apiError = 'No se pudieron cargar más datos. Intente nuevamente.';
            this._renderStatus();
        }
    }
    /** Fetch the full detail of a single item by id */
    async _fetchDetail(id) {
        const seq = ++this._apiSeq;
        try {
            const data = await this._apiFetch(`/${encodeURIComponent(id)}`, {});
            if (seq !== this._apiSeq)
                return null;
            if (!data || data.id == null) {
                this._apiDetails.set(id, null);
                return null;
            }
            this._apiDetails.set(id, data);
            return data;
        }
        catch {
            if (seq !== this._apiSeq)
                return null;
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
    _schedulePageReload(immediate = false) {
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
    _renderApiLoading() {
        if (this.timelineCards.querySelector('.timeline-skeleton-item'))
            return;
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
        for (let i = 1; i < total; i++)
            this._appendTimelineSkeleton(markup);
        // Ídem con los featured: en fullpage no se renderizan en ningún momento (ver `_renderFeatured`).
        // Con el paginador el stack está congelado en la página 1 (`_apiFeatured`), pero se reconstruye
        // desde ahí cuando llegan los datos, así que también puede placearse en un cambio de página.
        if (this.fullpage)
            return;
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
    _appendTimelineSkeleton(markup) {
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
    _clearApiLoading() {
        this.timelineCards.removeAttribute('aria-busy');
        this.timelineCards.querySelectorAll('.timeline-skeleton-item').forEach((el) => el.remove());
        this.featuredContainer.querySelectorAll('.featured-skeleton').forEach((el) => el.remove());
    }
    /**
     * Render the API status row (error / loading / count) at the end of the timeline.
     *
     * With the numeric paginator only the **error** can reach this row: the request that changes the
     * page is one of the replacing ones (`_fetchPage`), so it shows the skeletons instead, which
     * also keeps `_renderStatus` out of the way. The count line is gone for a second reason —
     * "Mostrando 10 de 87" counts the page on screen, not everything the user went through, and the
     * paginator already says which page it is and how many there are.
     */
    _renderStatus() {
        // The skeletons are the loading feedback while the list is being replaced, and their count
        // already matches the page that is coming. Adding a row on top of them would only pile a
        // second, wrong line ("Cargando más publicaciones...") under the placeholders.
        if (this.timelineCards.querySelector('.timeline-skeleton-item'))
            return;
        const prev = this.timelineCards.querySelector('.timeline-status-item');
        if (prev)
            prev.remove();
        let text = '';
        if (this._apiError)
            text = this._apiError;
        else if (this._apiLoading && this.allCards.length === 0)
            text = 'Cargando publicaciones...';
        // Only "Cargar más" (`_appendPageItems`) gets here with cards on screen, and it only exists
        // without the paginator: there the page being fetched is genuinely "more" of the current one.
        else if (this._apiLoading && this.allCards.length > 0)
            text = 'Cargando más publicaciones...';
        else if (!this.pagination && this._apiTotal > 0)
            text = `Mostrando ${this.allCards.length} de ${this._apiTotal} publicaciones`;
        if (!text)
            return;
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
    /**
     * Sync the active class on the search/filter/internal-filters toggle buttons.
     * Each button is lit by the groups **it** holds, not by any active filter: the `filtros_internos`
     * groups live in the flyout, so they only light the flyout button and never the one of the panel.
     */
    _syncFilterToggleState() {
        const isActive = (f) => f.checkboxes.some((cb) => cb.checked);
        if (this.filterToggle)
            this.filterToggle.classList.toggle('active', this.filters.some((f) => f.group !== 'filtros_internos' && isActive(f)));
        const internosActive = this.filters.some((f) => f.group === 'filtros_internos' && isActive(f));
        if (this.filtrosInternosToggle)
            this.filtrosInternosToggle.classList.toggle('active', internosActive);
        this.searchToggle.classList.toggle('active', this.searchTerm.trim().length > 0);
    }
    /**
     * Apply active filters and re-render the full view (or reload from the API).
     * `immediate` only means something in API mode: it asks for the leading edge of
     * `_schedulePageReload`, for the discrete changes that have nothing to coalesce.
     */
    _applyFilters(immediate = false) {
        this._syncFilterToggleState();
        if (this.api) {
            // The results on screen no longer match the panel, so they go away right now instead of
            // sitting there stale until the response: `_renderApiLoading` puts the skeletons in their
            // place and `_fetchPage(1)` replaces them when the data lands.
            this._renderApiLoading();
            this._schedulePageReload(immediate);
            return;
        }
        const matches = (c) => this._matchesSearch(c) &&
            this.filters.every((f) => {
                const active = this._filterActiveTokens(f);
                if (active.length === 0)
                    return true;
                return this._filterValuesOf(f, c).some((x) => active.includes(x));
            });
        this.allCards = this._sortByDateDesc(this._scopeItems().filter(matches));
        this._featuredCards = this._sortByDateDesc(this._allItems().filter(matches));
        if (this.sortAscending) {
            this.allCards.reverse();
            this._featuredCards.reverse();
        }
        if (this.pagination) {
            // Search, filters, sort and taxonomy re-scope all narrow or reorder the pool, so the page
            // the user was on may not even exist in the new one: every one of them starts over at the
            // first page. The API branch above already gets this from `_fetchPage(1)`.
            this._page = 1;
        }
        else if (this.itemsPerPage > 0) {
            this._displayedCount = this.itemsPerPage;
        }
        this._renderAll();
    }
    /** Label of the expand toggle; uses the custom function when provided, otherwise the Spanish singular/plural default */
    _relatedLabel(n) {
        if (this.relatedLabel)
            return this.relatedLabel(n);
        return n === 1 ? 'publicación relacionada' : 'publicaciones relacionadas';
    }
    /** Write the expand toggle label into `#remaining-text`; the label is injected as HTML, so it may contain markup */
    _setRelatedLabel(n) {
        const el = this.container.querySelector('#remaining-text');
        if (el)
            el.innerHTML = this._relatedLabel(n);
    }
    /**
     * Write the expand toggle counter and its label. Both count the **whole pool**, never the
     * filtered one: in local mode `_allItems().length`, in API mode the static `total` of
     * `/facets` (0 until that response lands, or forever if the endpoint doesn't send it).
     * Extracted from `_renderAll` so the facets response can patch the counter when it arrives
     * without re-rendering the timeline.
     */
    _renderRelatedCount() {
        const n = this.api ? this._apiCollectionTotal : this._allItems().length;
        this.remainingCount.textContent = String(n);
        this._setRelatedLabel(n);
    }
    /** Render featured cards, timeline, and load-more button if needed */
    _renderAll() {
        if (this.api) {
            this._clearApiLoading();
            this._renderRelatedCount();
            this._renderFeatured(this._apiFeatured());
            this._renderTimeline(this.allCards);
            if (this.pagination) {
                this._renderPaginator();
            }
            else if (this._hasMorePages()) {
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
        this._renderTimeline(this._localDisplayCards());
        if (this.pagination) {
            this._renderPaginator();
        }
        else if (this.itemsPerPage > 0 && this._displayedCount < this.allCards.length) {
            this._renderLoadMoreButton();
        }
        requestAnimationFrame(() => {
            this.featuredContainer.querySelectorAll('.featured-card').forEach((c) => c.classList.add('visible'));
        });
        if (this.isExpanded) {
            requestAnimationFrame(() => this._setupTimelineObserver());
        }
    }
    /**
     * Cards shown in the local timeline, out of the filtered `allCards`.
     *
     * Two shapes for the same list, picked by the `pagination` option: the paginator takes the
     * window of the current page, while "Cargar más" takes everything loaded so far, which grows
     * with every click. `itemsPerPage: 0` means no pagination at all, so the whole list goes out
     * in both cases.
     */
    _localDisplayCards() {
        if (this.itemsPerPage <= 0)
            return this.allCards;
        if (!this.pagination)
            return this.allCards.slice(0, this._displayedCount);
        const start = (this._page - 1) * this.itemsPerPage;
        return this.allCards.slice(start, start + this.itemsPerPage);
    }
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
    _apiFeatured() {
        const captured = this.allCards.filter((c) => c.capturado !== false).slice(0, this.featured_count);
        if (!this.pagination)
            return captured;
        if (this._apiPage > 1 && this._apiFeaturedCards.length > 0)
            return this._apiFeaturedCards;
        this._apiFeaturedCards = captured;
        return captured;
    }
    /** Render the "load more" button and wire its click handler */
    _renderLoadMoreButton() {
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
        el.querySelector('.timeline-load-more-btn').addEventListener('click', () => {
            if (this.api) {
                if (!this._apiLoading)
                    void this._appendPageItems();
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
    _renderPaginator() {
        if (this.itemsPerPage <= 0)
            return;
        const total = this._pageCount();
        if (total <= 1)
            return;
        const current = this._currentPage();
        const el = document.createElement('div');
        el.className = 'timeline-item timeline-paginator-item';
        el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-paginator-dot"></div>
      </div>
      <div class="timeline-paginator-wrap">
        <button class="timeline-paginator-btn timeline-paginator-prev" ${current <= 1 ? 'disabled' : ''}>Anterior</button>
        <div class="timeline-paginator-text" aria-live="polite">P&aacute;gina ${current} de ${total}</div>
        <button class="timeline-paginator-btn timeline-paginator-next" ${current >= total ? 'disabled' : ''}>Siguiente</button>
      </div>
    `;
        el.querySelector('.timeline-paginator-prev').addEventListener('click', () => {
            void this._goToPage(this._currentPage() - 1);
        });
        el.querySelector('.timeline-paginator-next').addEventListener('click', () => {
            void this._goToPage(this._currentPage() + 1);
        });
        this._insertBeforeFooter(el);
    }
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
    async _goToPage(page) {
        const total = this._pageCount();
        const target = Math.max(1, Math.min(page, total));
        if (target === this._currentPage())
            return;
        if (this.api) {
            // `_fetchPage` bumps `_apiSeq`, so a page still in flight is dropped: the one that lands
            // last is the one on screen, and the paginator is re-rendered by its own `_renderAll`.
            const pending = this._fetchPage(target);
            // It puts the skeletons up before its first await, so the list is already the new (empty)
            // one here: scrolling now lands on the top of it instead of waiting for the response, which
            // matters in fullpage, where the page scrolls and `timelineCards.scrollTop` does nothing.
            // `_fetchPage` re-aligns when the data lands, so this is not the only chance.
            this._scrollToTimelineTop();
            await pending;
            return;
        }
        this._page = target;
        this._renderAll();
        this._scrollToTimelineTop();
    }
    /** Read the current effective max-height of the timeline-cards in px */
    _getCardsHeightPx() {
        // En fullpage no hay caja con scroll: el `max-height` del SCSS es `none` y parsearlo
        // daría NaN -> el mínimo del resize handle, o sea un solo skeleton. Lo que el usuario ve
        // es el viewport (la página scrollea), así que se mide contra eso.
        if (this.fullpage)
            return window.innerHeight;
        const inline = this.timelineCards.style.maxHeight;
        const px = inline && inline.endsWith('px') ? parseFloat(inline) : NaN;
        if (Number.isFinite(px))
            return px;
        const computed = getComputedStyle(this.timelineCards).maxHeight;
        const match = computed ? parseFloat(computed) : NaN;
        return Number.isFinite(match) ? match : RESIZE_MIN_HEIGHT;
    }
    /** Clamp and apply a max-height (px) to the timeline-cards */
    _applyCardsHeight(value) {
        const clamped = Math.min(RESIZE_MAX_HEIGHT, Math.max(RESIZE_MIN_HEIGHT, Math.round(value)));
        this.timelineCards.style.maxHeight = clamped + 'px';
        this._syncResizeHandleA11y();
    }
    /** Persist the current height to localStorage */
    _persistCardsHeight() {
        try {
            window.localStorage.setItem(RESIZE_STORAGE_KEY, String(this._getCardsHeightPx()));
        }
        catch {
            /* localStorage unavailable */
        }
    }
    /** Keep the resize handle aria attributes in sync with the current height */
    _syncResizeHandleA11y() {
        this.resizeHandle.setAttribute('aria-valuemin', String(RESIZE_MIN_HEIGHT));
        this.resizeHandle.setAttribute('aria-valuemax', String(RESIZE_MAX_HEIGHT));
        this.resizeHandle.setAttribute('aria-valuenow', String(this._getCardsHeightPx()));
    }
    /** Set up the timeline-cards resize handle: drag, keyboard and localStorage persistence */
    _initResizeHandle() {
        this.resizeHandle = this.container.querySelector('#timeline-resize-handle');
        if (!this.resizeHandle)
            return;
        const onPointerDown = (e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = this._getCardsHeightPx();
            const onPointerMove = (ev) => {
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
        const onKeyDown = (e) => {
            let delta = 0;
            if (e.key === 'ArrowUp')
                delta = -RESIZE_STEP;
            else if (e.key === 'ArrowDown')
                delta = RESIZE_STEP;
            else if (e.key === 'Home')
                delta = -RESIZE_MAX_HEIGHT;
            else if (e.key === 'End')
                delta = RESIZE_MAX_HEIGHT;
            else
                return;
            e.preventDefault();
            this._applyCardsHeight(this._getCardsHeightPx() + delta);
            this._persistCardsHeight();
        };
        try {
            const raw = window.localStorage.getItem(RESIZE_STORAGE_KEY);
            if (raw !== null) {
                const value = Number(raw);
                if (Number.isFinite(value))
                    this._applyCardsHeight(value);
            }
        }
        catch {
            /* localStorage unavailable */
        }
        this._syncResizeHandleA11y();
        this.resizeHandle.addEventListener('pointerdown', onPointerDown);
        this.resizeHandle.addEventListener('keydown', onKeyDown);
    }
    /** Render a single already-expanded card without any timeline chrome when `singleId` is set */
    async _renderSingleCard() {
        const workNotesHtml = this.internalButtons
            ? `<div class="single-mode-toolbar">
            <button class="work-notes-toggle" id="work-notes-toggle" title="Ocultar notas de trabajo" aria-pressed="false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l5-5V5a2 2 0 0 0-2-2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>
            </button>
          </div>`
            : '';
        this.container.innerHTML = `<section class="publicaciones-section single-mode" id="publicaciones-section">${workNotesHtml}</section>`;
        this.section = this.container.querySelector('#publicaciones-section');
        this.workNotesToggle = this.container.querySelector('#work-notes-toggle');
        if (this.workNotesToggle) {
            this._applyWorkNotesState();
            this.workNotesToggle.addEventListener('click', () => this._toggleWorkNotes());
        }
        const id = this.singleId || '';
        let card;
        if (this.api) {
            card = this._apiDetails.get(id) || (await this._fetchDetail(id));
        }
        else {
            card = this._allItems().find((it) => String(it.id) === id) || null;
        }
        if (!card) {
            this.section.innerHTML = `<div class="single-mode-message">No se encontró el artículo ${id}.</div>`;
            return;
        }
        const itemEl = this._createTimelineItem(card, 0);
        const dateCol = itemEl.querySelector('.timeline-date-col');
        if (dateCol)
            dateCol.remove();
        const collapseBtn = itemEl.querySelector('.card-collapse');
        if (collapseBtn)
            collapseBtn.remove();
        itemEl.classList.add('visible');
        const cardEl = itemEl.querySelector('.timeline-card');
        cardEl.classList.add('expanded');
        this.section.appendChild(itemEl);
        await this._ensureCardDetail(cardEl);
        this._preloadEmbedLibraries();
        this._processCardEmbeds(cardEl);
    }
    /** Initialize the component: build layout, sort data, render, bind events */
    _init() {
        if (this.singleId) {
            void this._renderSingleCard();
            return;
        }
        this._buildLayout();
        // Applied before _applyFilters: the timeline observer is attached from _renderAll
        // (guarded by isExpanded), and it must find the container already open, otherwise
        // the items would intersect a collapsed (max-height: 0) container and never show.
        if (this.isExpanded)
            this._applyExpandState();
        // En fullpage la lista no tiene scroll propio, así que no hay nada que ajustar: tampoco se
        // lee el alto persistido, que escribiría un `max-height` inline sobre el `none` del SCSS.
        if (!this.fullpage)
            this._initResizeHandle();
        if (this.api) {
            this._bindBaseEvents();
            this._renderApiLoading();
            // The checkboxes are built here, before the first page, so the values a group presets with
            // `checked` travel in the initial query just like in local mode. With no facets yet the
            // derived groups have nothing to show, so nothing can be checked before they arrive: the
            // panel is rebuilt with the counts by `_ensureApiFacets()`. A group that declares `items`
            // shows them right away (with the counts in zero) and the rebuild only fills the counts.
            this._buildFilterCheckboxes();
            this._syncFilterToggleState();
            // The facets travel the static values of the collection (counts, total, lastUpdated) and
            // the expand toggle shows two of them before the user interacts, so they are requested
            // here, in parallel with the first page, and not on the first expand. They are requested
            // even with no filter group declared, because the total and the `lastUpdated` they carry
            // feed the expand counter and the footer. Waiting would gain nothing: the defaults of the
            // checkboxes above do not depend on the facets.
            void this._ensureApiFacets();
            // The embed preload reads the rendered cards, so it waits for the first page.
            void this._fetchPage(1).then(() => {
                if (this.isExpanded)
                    this._preloadEmbedLibraries();
            });
            return;
        }
        this._buildFilterCheckboxes();
        // The pagination cursor is reset by `_applyFilters` below, which is the only place that
        // decides it, so it does not have to be seeded here.
        this._applyFilters();
        if (this.isExpanded)
            this._preloadEmbedLibraries();
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
    _bindFilterToggle() {
        if (!this.filterToggle || !this.filterMenu)
            return;
        this.filterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.filterMenu?.classList.toggle('open');
            this.filterToggle?.classList.toggle('open');
        });
    }
    /** Bind the header/global event listeners shared by both local and API modes */
    _bindBaseEvents() {
        // En fullpage el botón de expandir es solo el contador: no se le bindea el colapso.
        if (!this.fullpage)
            this.expandToggle.addEventListener('click', () => this._toggleExpand());
        this.featuredContainer.addEventListener('click', () => this._toggleExpand());
        this.featuredRow.addEventListener('click', (e) => {
            if (this.isExpanded)
                return;
            if (e.target.closest('.expand-toggle, .featured-cards, .sort-toggle, .filter-toggle, .filter-menu, .search-wrap, .work-notes-toggle, .filtros-internos-toggle, .filtros-internos-wrap'))
                return;
            this._toggleExpand();
        });
        this.sortToggle.addEventListener('click', () => this._toggleSort());
        if (this.taxonomySelect) {
            this.taxonomySelect.addEventListener('change', () => this._onTaxonomyChange());
        }
        this._applyWorkNotesState();
        if (this.workNotesToggle)
            this.workNotesToggle.addEventListener('click', () => this._toggleWorkNotes());
        // En modo API el botón aparece desde el arranque (ver `_buildFilterCheckboxes`), pero sin
        // listener hasta que llegan los facets: antes de eso el panel no tiene nada que abrir. Por eso
        // el bind se hace acá solo en modo local, y en API lo hace el `.then()` de `_ensureApiFacets()`,
        // que es el único lugar que reconstruye el panel con valores. Corre una sola vez.
        if (!this.api)
            this._bindFilterToggle();
        if (this.filtrosInternosToggle) {
            this.filtrosInternosToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.filtrosInternosMenu.classList.toggle('open');
                this.filtrosInternosToggle.classList.toggle('open');
            });
        }
        this.searchToggle.addEventListener('click', (e) => {
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
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.searchInput.value = '';
                this.searchTerm = '';
                this.searchWrap.classList.remove('open');
                this.searchToggle.classList.remove('open');
                this._applyFilters(true);
            }
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.card-info-btn, .card-info-menu')) {
                this.container.querySelectorAll('.card-info-menu.open').forEach((m) => m.classList.remove('open'));
            }
            if (!e.target.closest('.card-adjuntos-btn, .card-adjuntos-menu')) {
                this.container.querySelectorAll('.card-adjuntos-menu.open').forEach((m) => m.classList.remove('open'));
            }
            if (this.filterMenu && !e.target.closest('.filter-wrap')) {
                this.filterMenu.classList.remove('open');
                this.filterToggle?.classList.remove('open');
            }
            if (!e.target.closest('.filtros-internos-wrap') && this.filtrosInternosMenu) {
                this.filtrosInternosMenu.classList.remove('open');
                this.filtrosInternosToggle.classList.remove('open');
            }
            if (!e.target.closest('.search-wrap')) {
                this.searchWrap.classList.remove('open');
                this.searchToggle.classList.remove('open');
            }
        });
    }
}
//# sourceMappingURL=TimelineViewer.js.map