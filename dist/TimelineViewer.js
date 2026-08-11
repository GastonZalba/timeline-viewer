import lightGallery from 'lightgallery';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_EMBED_URL = 'https://www.youtube.com/embed/';
const INSTAGRAM_REGEX = /(?:instagram\.com)\/(p|reel)\/([a-zA-Z0-9_-]+)/;
const INSTAGRAM_EMBED_BASE = 'https://www.instagram.com/';
const INSTAGRAM_EMBED_SCRIPT = 'https://www.instagram.com/embed.js';
const TWITTER_REGEX = /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/;
const TWITTER_EMBED_BASE = 'https://twitter.com/';
const TWITTER_WIDGETS_SCRIPT = 'https://platform.twitter.com/widgets.js';
const FACEBOOK_POST_REGEX = /(?:facebook\.com)\/([^/]+)\/posts\/(?:[^/]+\/)?(\d+)/;
const FACEBOOK_OTHER_REGEX = /(?:facebook\.com\/(?:[^/]+\/videos\/|permalink\.php|photo\.php|watch|story\.php)|fb\.watch)/;
const FACEBOOK_EMBED_BASE = 'https://www.facebook.com/';
const FACEBOOK_SDK_URL = 'https://connect.facebook.net/es_ES/sdk.js#xfbml=1&version=v20.0';
export default class Timeline {
    constructor(config) {
        this.sortAscending = false;
        this.searchTerm = '';
        this.container =
            typeof config.container === 'string'
                ? document.querySelector(config.container)
                : config.container;
        this.items = config.items || [];
        this.featured_count = config.featuredCount || 6;
        this.lastUpdated = config.lastUpdated || '';
        this.itemsPerPage = config.itemsPerPage || 10;
        this._displayedCount = 0;
        this.allCards = [];
        this.isExpanded = false;
        this.featuredContainer = null;
        this.featuredRow = null;
        this.timelineContainer = null;
        this.timelineCards = null;
        this.expandToggle = null;
        this.remainingCount = null;
        this.expandIcon = null;
        this.fabCollapse = null;
        this.sortToggle = null;
        this.filterToggle = null;
        this.filterMenu = null;
        this.section = null;
        this.filters = [];
        this.searchWrap = null;
        this.searchToggle = null;
        this.searchInput = null;
        this.searchTerm = '';
        this._lgInstance = null;
        this._lgContainer = null;
        this._originalCards = [];
        this._init();
    }
    /** Build the main DOM layout and cache element references */
    _buildLayout() {
        this.container.innerHTML = `
      <section class="publicaciones-section" id="publicaciones-section">
        <div class="featured-row">
          <div class="noticias-top">
            <button class="expand-toggle" id="expand-toggle">
              <span class="expand-text"><span id="remaining-count">0</span> <span id="remaining-text">publicaciones relacionadas</span></span>
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
                <div class="filter-section">
                  <div class="filter-header">Tono social</div>
                  <div class="filter-options" id="filter-options-tone"></div>
                </div>
                <div class="filter-section">
                  <div class="filter-header">Tipo de fuente</div>
                  <div class="filter-options" id="filter-options-source"></div>
                </div>
                <div class="filter-section">
                  <div class="filter-header">Estado</div>
                  <div class="filter-options" id="filter-options-validado"></div>
                </div>
              </div>
            </div>
            <button class="sort-toggle" id="sort-toggle" title="Invertir orden">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="17,9 12,4 7,9" fill="currentColor"/><polygon points="17,15 12,20 7,15" fill="none" stroke-width="1.5"/></svg>
            </button>
          </div>
          <div class="featured-cards" id="featured-cards" title="Expandir publicaciones"></div>
        </div>
        <div class="timeline-container" id="timeline-container">
          <div class="timeline-collapse-wrap">
            <div class="timeline-line"></div>
            <div class="timeline-content">
              <div class="timeline-cards" id="timeline-cards"></div>
              <div class="fab-sticky-wrap">
                <button class="fab-collapse" id="fab-collapse" title="Colapsar publicaciones">
                  <span class="fab-icon-stack">
                    <svg class="fab-chevron-right" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,4 17,12 9,20"/></svg>
                    <svg class="fab-chevron-left" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15,4 7,12 15,20"/></svg>
                  </span>
                  <span class="fab-label">Colapsar</span>
                </button>
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
        this.fabCollapse = this.container.querySelector('#fab-collapse');
        this.sortToggle = this.container.querySelector('#sort-toggle');
        this.filterToggle = this.container.querySelector('#filter-toggle');
        this.filterMenu = this.container.querySelector('#filter-menu');
        this.searchWrap = this.container.querySelector('#search-wrap');
        this.searchToggle = this.container.querySelector('#search-toggle');
        this.searchInput = this.container.querySelector('#search-input');
        this.filters = [
            {
                field: 'tonos_sociales',
                label: 'Tono social',
                options: this.container.querySelector('#filter-options-tone'),
                checkboxes: []
            },
            {
                field: 'tipo_fuente',
                label: 'Tipo de fuente',
                options: this.container.querySelector('#filter-options-source'),
                checkboxes: []
            },
            {
                field: 'validado',
                label: 'Validado',
                options: this.container.querySelector('#filter-options-validado'),
                checkboxes: [],
                extract: (item) => (item.validado === true ? 'validado' : 'no-validado'),
                formatLabel: (val) => (val === 'validado' ? 'Validado' : 'No validado')
            }
        ];
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
            return { url: `${INSTAGRAM_EMBED_BASE}${m[1]}/${m[2]}/`, type: 'instagram' };
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
    _openLightGallery(images, title, showFileName) {
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
                src: imgInfo.full,
                thumb: imgInfo.thumb,
                subHtml: title
                    ? `<div class="lg-caption">${showFileName ? `<p>${imgInfo.full.split('/').pop()}</p>` : ''}<h4>${title}</h4></div>`
                    : ''
            })),
            plugins: [lgThumbnail, lgZoom]
        });
        this._lgContainer.addEventListener('lgAfterClose', () => {
            if (this._lgInstance) {
                this._lgInstance.destroy();
                this._lgInstance = null;
            }
        }, { once: true });
        this._lgInstance.openGallery();
    }
    /** Render the featured (overlapping) cards row */
    _renderFeatured(cards) {
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
        el.style.transitionDelay = `${index * 0.08}s`;
        const imgHtml = card.thumbnail
            ? `<div class="card-image-wrap"><img class="card-image" src="${card.thumbnail}" alt="${card.nombre_fuente}" loading="lazy"><div class="card-title">${card.nombre_fuente}</div></div>`
            : '';
        const toneLabel = { Positivo: 'Positivo', Negativo: 'Negativo', Neutro: 'Neutro' };
        const toneLabelTema = { Positivo: 'Positivo', Negativo: 'Negativo', Neutro: 'Neutro' };
        const actors = card.actores_principales || [];
        const MAX_ACTORS = 3;
        const hasMore = actors.length > MAX_ACTORS;
        const protHtml = actors.length
            ? `<div class="card-protagonista${hasMore ? ' has-more' : ''}" data-full="${actors.join(', ')}">
          <span class="protagonista-label">Actores principales:</span>
          <span class="protagonista-list">${actors.slice(0, MAX_ACTORS).join(', ')}${hasMore ? '...' : ''}</span>
         </div>`
            : `<div class="card-protagonista"><span class="protagonista-label">Actores principales:</span> -</div>`;
        const embedUrl = card.link_web ? this._parseLinkWeb(card.link_web) : null;
        const embedHtml = embedUrl ? this._buildEmbed(embedUrl) : '';
        const iframeHtml = embedUrl
            ? `<div class="card-embed"><div class="card-subtitle card-iframe-subtitle">Publicación original</div>${embedHtml}</div>`
            : '';
        const videosHtml = card.links_videos && card.links_videos.length
            ? `<div class="card-videos"><div class="card-subtitle card-iframe-subtitle">Videos vinculados</div><div class="card-videos-list">${card.links_videos
                .map((link) => this._parseLinkWeb(link))
                .filter((parsed) => parsed !== null)
                .map((parsed) => this._buildEmbed(parsed))
                .join('')}</div></div>`
            : '';
        const temasHtml = card.temas && card.temas.length
            ? `<div class="card-temas">
        <div class="card-subtitle">Temas destacados</div>
        <div class="card-temas-list">
        ${card.temas
                .map((t) => `
          <div class="tema-item tone-tema-${t.tono_social.toLowerCase()}">
            <div class="tema-content">
              <span class="tema-title"><span class="tema-tone">${toneLabelTema[t.tono_social]}</span><span class="tema-title">${t.titulo}</span>${t.fecha_narrativa ? `<span class="tema-fecha" title="Fecha narrativa">[ ${this._formatDate(t.fecha_narrativa)} ]</span>` : ''}</span>
              <span class="tema-desc">${t.resumen}</span>
            </div>
          </div>`)
                .join('')}
        </div>
        </div>`
            : '';
        const actionsHtml = `<div class="card-actions">
      <div class="card-actions-row">
        ${card.screenshot ? '<button class="card-actions-btn card-screenshot-btn" title="Ver captura de la fuente"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Captura</button>' : ''}
        ${card.imagenes && card.imagenes.length ? '<button class="card-actions-btn card-images-btn" title="Ver imágenes"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Imágenes <span class="card-actions-count">' + card.imagenes.length + '</span></button>' : ''}
        ${card.adjuntos && card.adjuntos.length ? `<div class="card-adjuntos"><button class="card-actions-btn card-adjuntos-btn" title="Ver adjuntos"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Adjuntos <span class="card-actions-count">${card.adjuntos.length}</span></button><div class="card-adjuntos-menu">${card.adjuntos.map((a) => `<a class="card-adjunto-link" href="${a}" target="_blank" rel="noopener">${a.substring(a.lastIndexOf('/') + 1)}</a>`).join('')}</div></div>` : ''}
        <a class="card-actions-btn card-open"${card.link_web ? ` href="${card.link_web}"` : ''} target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Ir
        </a>
      </div>
    </div>`;
        el.innerHTML = `
      <div class="timeline-date-col${card.fecha_publicacion ? '' : ' no-date'}">
        <div class="timeline-date" title="Fecha de publicación">${this._formatDate(card.fecha_publicacion)}</div>
        <div class="timeline-dot"></div>
        <div class="timeline-hline"></div>
      </div>
      <div class="timeline-card${card.thumbnail ? '' : ' no-image'}">
        ${card.validado !== true ? '<span class="card-no-validado">No validado</span>' : ''}
        ${imgHtml}
        ${actionsHtml}
        <div class="card-body">
          ${card.thumbnail ? '' : `<div class="card-title">${card.nombre_fuente}</div>`}
          <div class="card-desc">${card.resumen_ia}</div>
          ${card.tonos_sociales && card.tonos_sociales.length ? `<div class="card-tone-wrap">${card.tonos_sociales.map((t) => `<span class="card-tone tone-${t.toLowerCase()}">${toneLabel[t] || t}</span>`).join('')}</div>` : ''}
          ${temasHtml}
          <div class="card-hint"><span class="card-hint-arrow"></span></div>
          <button class="card-collapse" title="Colapsar"></button>
          <button class="card-info-btn" title="Información">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          <div class="card-info-menu">
            <div class="card-info-row">
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
            </div>
          </div>
          ${protHtml}
          <div class="card-fuente"><span class="fuente-label">Fuente:</span> ${card.fuente_institucional}${card.es_oficial ? '<span class="card-oficial-wrap" title="Es fuente oficial"><svg class="card-oficial" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 7.5 10.5 16.5 4.5 11.5"/></svg></span>' : ''}</div>
          ${iframeHtml}
          ${videosHtml}
        </div>
      </div>
    `;
        const timelineImg = el.querySelector('.card-image');
        if (timelineImg) {
            timelineImg.addEventListener('load', () => timelineImg.classList.add('loaded'));
            if (timelineImg.complete)
                timelineImg.classList.add('loaded');
        }
        el.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
            const iframe = wrap.querySelector('iframe');
            if (iframe) {
                iframe.addEventListener('load', () => wrap.classList.add('loaded'));
                if (iframe.contentDocument?.readyState === 'complete')
                    wrap.classList.add('loaded');
            }
        });
        const cardEl = el.querySelector('.timeline-card');
        cardEl.addEventListener('click', (e) => {
            if (e.target &&
                e.target.closest('.card-open, .card-collapse, .card-info-btn, .card-info-menu, .card-adjuntos'))
                return;
            cardEl.classList.add('expanded');
            const igWrap = cardEl.querySelector('.card-iframe-instagram');
            if (igWrap) {
                setTimeout(() => {
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
                    if (typeof instgrm !== 'undefined' && instgrm.Embeds) {
                        instgrm.Embeds.process();
                    }
                    else if (!igWrap.querySelector('iframe')) {
                        const waitForInstgrm = setInterval(() => {
                            if (typeof instgrm !== 'undefined' && instgrm.Embeds) {
                                instgrm.Embeds.process();
                                clearInterval(waitForInstgrm);
                            }
                        }, 200);
                        setTimeout(() => clearInterval(waitForInstgrm), 15000);
                    }
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
                }, 150);
            }
            const twWrap = cardEl.querySelector('.card-iframe-twitter');
            if (twWrap) {
                setTimeout(() => {
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
                }, 150);
            }
            const fbWrap = cardEl.querySelector('.card-iframe-facebook');
            if (fbWrap) {
                setTimeout(() => {
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
                }, 150);
            }
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
        const screenshotBtn = el.querySelector('.card-screenshot-btn');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._openLightGallery([{ thumb: card.screenshot, full: card.screenshot }], card.nombre_fuente, false);
            });
        }
        const imagesBtn = el.querySelector('.card-images-btn');
        if (imagesBtn) {
            imagesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._openLightGallery(card.imagenes, card.nombre_fuente, true);
            });
        }
        const adjuntosWrap = el.querySelector('.card-adjuntos');
        if (adjuntosWrap) {
            const adjuntosBtn = adjuntosWrap.querySelector('.card-adjuntos-btn');
            const adjuntosMenu = adjuntosWrap.querySelector('.card-adjuntos-menu');
            adjuntosBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                adjuntosMenu.classList.toggle('open');
                const infoMenu = el.querySelector('.card-info-menu');
                if (infoMenu)
                    infoMenu.classList.remove('open');
            });
        }
        const prot = el.querySelector('.card-protagonista.has-more');
        if (prot) {
            prot.addEventListener('click', (e) => {
                e.stopPropagation();
                prot.classList.toggle('expanded');
                const list = prot.querySelector('.protagonista-list');
                if (prot.classList.contains('expanded')) {
                    list.textContent = prot.dataset.full || '';
                }
                else {
                    list.textContent = actors.slice(0, MAX_ACTORS).join(', ') + '...';
                }
            });
        }
        return el;
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
        if (this.lastUpdated) {
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
    /** Set up IntersectionObserver for the timeline items entrance animation */
    _setupTimelineObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px 100px 0px' });
        this.container.querySelectorAll('.timeline-item').forEach((item) => {
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
    /** Toggle between expanded (timeline visible) and collapsed state */
    _toggleExpand(scrollTo = false) {
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
            this.section.classList.add('expanded');
            this.timelineContainer.classList.add('expanded');
            this.expandIcon.classList.add('rotated');
            requestAnimationFrame(() => {
                this._setupTimelineObserver();
            });
            this._preloadEmbedLibraries();
        }
        else {
            const cards = this.featuredContainer.querySelectorAll('.featured-card');
            cards.forEach((c) => (c.style.transition = 'none'));
            cards.forEach((c) => c.classList.remove('visible'));
            void this.featuredContainer.offsetHeight;
            cards.forEach((c) => (c.style.transition = ''));
            this.section.classList.remove('expanded');
            this.timelineContainer.classList.remove('expanded');
            this.expandIcon.classList.remove('rotated');
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
    /** Scroll the page/section to make the timeline container visible */
    _scrollToSection() {
        const offset = 60;
        const rect = this.section.getBoundingClientRect();
        let el = this.section.parentElement;
        while (el) {
            const style = getComputedStyle(el);
            if (style.overflowY === 'auto' ||
                style.overflowY === 'scroll' ||
                style.overflow === 'auto' ||
                style.overflow === 'scroll') {
                el.scrollTo({ top: el.scrollTop + rect.top - offset, behavior: 'smooth' });
                return;
            }
            el = el.parentElement;
        }
        window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'smooth' });
    }
    /** Toggle timeline sort order between ascending and descending */
    _toggleSort() {
        this.sortAscending = !this.sortAscending;
        this.sortToggle.classList.toggle('asc', this.sortAscending);
        this._applyFilters();
    }
    /** Build filter checkboxes from the available filter values */
    _buildFilterCheckboxes() {
        this.filters.forEach((f) => {
            const values = [
                ...new Set(this.items.flatMap((c) => {
                    const v = f.extract ? f.extract(c) : c[f.field];
                    const arr = Array.isArray(v) ? v : [v];
                    return arr.map((x) => String(x));
                }))
            ];
            const counts = {};
            values.forEach((val) => {
                counts[val] = this.items.filter((c) => {
                    const v = f.extract ? f.extract(c) : c[f.field];
                    const arr = Array.isArray(v) ? v.map((x) => String(x)) : [String(v)];
                    return arr.includes(val);
                }).length;
            });
            f.options.innerHTML = '';
            f.checkboxes = [];
            values.forEach((val) => {
                const label = document.createElement('label');
                label.className = 'filter-option';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = val;
                cb.checked = false;
                const span = document.createElement('span');
                span.textContent = `${f.formatLabel ? f.formatLabel(val) : val} (${counts[val]})`;
                label.appendChild(cb);
                label.appendChild(span);
                cb.addEventListener('change', () => this._applyFilters());
                f.options.appendChild(label);
                f.checkboxes.push(cb);
            });
        });
    }
    /** Normalize a string for accent- and case-insensitive search matching */
    _normalizeSearch(value) {
        return value
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
            (card.actores_principales || []).join(' ')
        ];
        return haystacks.some((v) => this._normalizeSearch(v).includes(q));
    }
    /** Apply active filters and re-render the full view */
    _applyFilters() {
        const anyActive = this.filters.some((f) => f.checkboxes.some((cb) => cb.checked));
        this.filterToggle.classList.toggle('active', anyActive);
        this.searchToggle.classList.toggle('active', this.searchTerm.trim().length > 0);
        this.allCards = this._originalCards.filter((c) => this._matchesSearch(c) &&
            this.filters.every((f) => {
                const active = f.checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
                if (active.length === 0)
                    return true;
                const v = f.extract ? f.extract(c) : c[f.field];
                const arr = Array.isArray(v) ? v.map((x) => String(x)) : [String(v)];
                return arr.some((x) => active.includes(x));
            }));
        if (this.sortAscending)
            this.allCards.reverse();
        if (this.itemsPerPage > 0)
            this._displayedCount = this.itemsPerPage;
        this._renderAll();
    }
    /** Render featured cards, timeline, and load-more button if needed */
    _renderAll() {
        const featured = this.allCards.slice(0, this.featured_count);
        const n = this.allCards.length;
        this.remainingCount.textContent = String(this._originalCards.length);
        this.container.querySelector('#remaining-text').textContent =
            n === 1 ? 'publicación relacionada' : 'publicaciones relacionadas';
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
    /** Initialize the component: build layout, sort data, render, bind events */
    _init() {
        this._buildLayout();
        this._buildFilterCheckboxes();
        this._originalCards = [...this.items].sort((a, b) => {
            if (!a.fecha_publicacion)
                return 1;
            if (!b.fecha_publicacion)
                return -1;
            return new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime();
        });
        this.allCards = [...this._originalCards];
        if (this.itemsPerPage > 0)
            this._displayedCount = this.itemsPerPage;
        this._renderAll();
        if (this.allCards.length <= 3) {
            this.fabCollapse.style.display = 'none';
        }
        requestAnimationFrame(() => {
            const cards = this.featuredContainer.querySelectorAll('.featured-card');
            cards.forEach((c) => c.classList.add('visible'));
        });
        this.expandToggle.addEventListener('click', () => this._toggleExpand());
        this.fabCollapse.addEventListener('click', () => this._toggleExpand(true));
        this.featuredContainer.addEventListener('click', () => this._toggleExpand());
        this.featuredRow.addEventListener('click', (e) => {
            if (this.isExpanded)
                return;
            if (e.target.closest('.expand-toggle, .featured-cards, .sort-toggle, .filter-toggle, .filter-menu, .search-wrap'))
                return;
            this._toggleExpand();
        });
        this.sortToggle.addEventListener('click', () => this._toggleSort());
        this.filterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.filterMenu.classList.toggle('open');
            this.filterToggle.classList.toggle('open');
        });
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
            this._applyFilters();
        });
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.searchInput.value = '';
                this.searchTerm = '';
                this.searchWrap.classList.remove('open');
                this.searchToggle.classList.remove('open');
                this._applyFilters();
            }
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.card-info-btn, .card-info-menu')) {
                this.container.querySelectorAll('.card-info-menu.open').forEach((m) => m.classList.remove('open'));
            }
            if (!e.target.closest('.card-adjuntos-btn, .card-adjuntos-menu')) {
                this.container.querySelectorAll('.card-adjuntos-menu.open').forEach((m) => m.classList.remove('open'));
            }
            if (!e.target.closest('.filter-wrap')) {
                this.filterMenu.classList.remove('open');
                this.filterToggle.classList.remove('open');
            }
            if (!e.target.closest('.search-wrap')) {
                this.searchWrap.classList.remove('open');
                this.searchToggle.classList.remove('open');
            }
        });
    }
}
//# sourceMappingURL=TimelineViewer.js.map