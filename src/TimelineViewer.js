import lightGallery from '../node_modules/lightgallery/lightgallery.es5.js';
import lgThumbnail from '../node_modules/lightgallery/plugins/thumbnail/lg-thumbnail.es5.js';
import lgZoom from '../node_modules/lightgallery/plugins/zoom/lg-zoom.es5.js';

export default class Timeline {
  constructor(config) {
    this.container = typeof config.container === 'string'
      ? document.querySelector(config.container)
      : config.container;
    this.items = config.items || [];
    this.FEATURED_COUNT = config.featuredCount || 6;
    this.lastUpdated = config.lastUpdated || '';
    this.itemsPerPage = config.itemsPerPage !== undefined ? config.itemsPerPage : 10;
    this._displayedCount = 0;
    this.allCards = [];
    this.isExpanded = false;
    this.featuredContainer = null;
    this.timelineContainer = null;
    this.timelineCards = null;
    this.expandToggle = null;
    this.remainingCount = null;
    this.expandIcon = null;
    this.section = null;
    this._init();
  }

  // ====== Build layout ======
  _buildLayout() {
    this.container.innerHTML = `
      <section class="noticias-section" id="noticias-section">
        <div class="featured-row">
          <div class="noticias-top">
            <button class="expand-toggle" id="expand-toggle">
              <span class="expand-text"><span id="remaining-count">0</span> <span id="remaining-text">publicaciones relacionadas</span></span>
              <span class="expand-icon" id="expand-icon"></span>
            </button>
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
                  <span class="fab-icon-stack">&gt;&lt;</span>
                  <span class="fab-label">Colapsar</span>
                </button>
              </div>
              </div>
            </div>
          </div>
      </section>
    `;
    this.section = this.container.querySelector('#noticias-section');
    this.featuredContainer = this.container.querySelector('#featured-cards');
    this.timelineContainer = this.container.querySelector('#timeline-container');
    this.timelineCards = this.container.querySelector('#timeline-cards');
    this.expandToggle = this.container.querySelector('#expand-toggle');
    this.remainingCount = this.container.querySelector('#remaining-count');
    this.expandIcon = this.container.querySelector('#expand-icon');
    this.fabCollapse = this.container.querySelector('#fab-collapse');
    this.sortToggle = this.container.querySelector('#sort-toggle');
    this.sortAscending = false;
    this.filterToggle = this.container.querySelector('#filter-toggle');
    this.filterMenu = this.container.querySelector('#filter-menu');
    this.filters = [
      { field: 'tono_social', label: 'Tono social', options: this.container.querySelector('#filter-options-tone'), checkboxes: [] },
      { field: 'tipo_fuente', label: 'Tipo de fuente', options: this.container.querySelector('#filter-options-source'), checkboxes: [] },
    ];
  }

  // ====== Helpers ======
  _formatDate(dateStr) {
    if (!dateStr) return 'Sin fecha';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  _formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  _parseLinkWeb(url) {
    if (!url) return null;
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (m) return { url: `https://www.youtube.com/embed/${m[1]}`, type: 'youtube' };
    m = url.match(/(?:instagram\.com)\/(p|reel)\/([a-zA-Z0-9_-]+)/);
    if (m) return { url: `https://www.instagram.com/${m[1]}/${m[2]}/embed/`, type: 'instagram' };
    m = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    if (m) return { url: `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}`, type: 'twitter' };
    m = url.match(/(?:facebook\.com)\/([^/]+)\/posts\/(?:[^/]+\/)?(\d+)/);
    if (m) return { url: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(`https://www.facebook.com/${m[1]}/posts/${m[2]}`)}&show_text=true&width=500`, type: 'facebook' };
    m = url.match(/(?:facebook\.com\/(?:[^/]+\/videos\/|permalink\.php|photo\.php|watch|story\.php)|fb\.watch)/);
    if (m) return { url: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`, type: 'facebook' };
    return null;
  }

  _openLightGallery(images) {
    if (this._lgInstance) {
      this._lgInstance.destroy();
      this._lgInstance = null;
    }
    if (!this._lgContainer) {
      this._lgContainer = document.createElement('div');
    }
    this._lgInstance = lightGallery(this._lgContainer, {
      dynamic: true,
      dynamicEl: images.map(imgInfo => ({
        src: imgInfo.full,
        thumb: imgInfo.thumb,
      })),
      plugins: [lgThumbnail, lgZoom],
    });
    this._lgContainer.addEventListener('lgAfterClose', () => {
      if (this._lgInstance) {
        this._lgInstance.destroy();
        this._lgInstance = null;
      }
    }, { once: true });
    this._lgInstance.openGallery();
  }

  // ====== Render featured (overlapping) cards ======
  _renderFeatured(cards) {
    this.featuredContainer.innerHTML = '';
    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'featured-card';
      const imgHtml = card.thumbnail
        ? `<div class="card-image-wrap"><img class="card-image" src="${card.thumbnail}" alt="${card.nombre_fuente}" loading="lazy"></div>`
        : '';
      const protHtml = card.actores_principales && card.actores_principales.length
        ? `<div class="card-protagonista"><span class="protagonista-label">Actores principales:</span> ${card.actores_principales.join(', ')}</div>`
        : `<div class="card-protagonista"><span class="protagonista-label">Actores principales:</span> -</div>`;
      el.innerHTML = `
        ${imgHtml}
        <div class="card-body">
          <div class="card-date">${this._formatDate(card.fecha_publicacion)}</div>
          <div class="card-title">${card.nombre_fuente}</div>
          ${protHtml}
        </div>
      `;
      const featuredImg = el.querySelector('.card-image');
      if (featuredImg) {
        featuredImg.addEventListener('load', () => featuredImg.classList.add('loaded'));
        if (featuredImg.complete) featuredImg.classList.add('loaded');
      }
      this.featuredContainer.appendChild(el);
    });
  }

  // ====== Create a single timeline item element ======
  _createTimelineItem(card, index) {
    const el = document.createElement('div');
    el.className = 'timeline-item';
    el.style.transitionDelay = `${index * 0.08}s`;
    const imgHtml = card.thumbnail
      ? `<div class="card-image-wrap"><img class="card-image" src="${card.thumbnail}" alt="${card.nombre_fuente}" loading="lazy"></div>`
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
    const iframeHtml = embedUrl
      ? `<div class="card-iframe-wrap card-iframe-${embedUrl.type}"><iframe src="${embedUrl.url}" frameborder="0" allowfullscreen loading="lazy" title="Contenido embebido"></iframe></div>`
      : '';
    const temasHtml = card.temas && card.temas.length
      ? `<div class="card-temas">${card.temas.map(t => `
          <div class="tema-item tone-tema-${t.tono_social.toLowerCase()}">
            <div class="tema-header">
              <span class="tema-title">${t.titulo}</span>
              <span class="tema-tone">${toneLabelTema[t.tono_social]}</span>
            </div>
            <div class="tema-desc">${t.resumen}</div>
          </div>`).join('')}</div>`
      : '';
    const footerHtml = `<div class="card-footer">
      <div class="card-footer-sep"></div>
      <div class="card-footer-actions">
        ${card.screenshot ? '<button class="card-footer-btn card-screenshot-btn" title="Ver captura de la fuente"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Ver captura</button>' : ''}
        ${card.imagenes && card.imagenes.length ? '<button class="card-footer-btn card-images-btn" title="Ver imágenes"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Imágenes <span class="card-footer-count">' + card.imagenes.length + '</span></button>' : ''}
        <button class="card-footer-btn card-open" title="Abrir enlace">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Ir
        </button>
      </div>
    </div>`;
    el.innerHTML = `
      <div class="timeline-date-col${card.fecha_publicacion ? '' : ' no-date'}">
        <div class="timeline-date">${this._formatDate(card.fecha_publicacion)}</div>
        <div class="timeline-dot"></div>
        <div class="timeline-hline"></div>
      </div>
      <div class="timeline-card${card.thumbnail ? '' : ' no-image'} tone-${card.tono_social.toLowerCase()}">
        ${imgHtml}
        <div class="card-body">
          <div class="card-title">${card.nombre_fuente}</div>
          <div class="card-desc">${card.resumen_ia}</div>
          <div class="card-tone">${toneLabel[card.tono_social]}</div>
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
              <span class="card-info-label">Captura</span>
              <span class="card-info-value">${this._formatDateTime(card.fecha_scrapeo)}</span>
            </div>
          </div>
          ${protHtml}
          <div class="card-fuente">${card.fuente_institucional}</div>
          ${iframeHtml}
          ${footerHtml}
        </div>
      </div>
    `;
    const timelineImg = el.querySelector('.card-image');
    if (timelineImg) {
      timelineImg.addEventListener('load', () => timelineImg.classList.add('loaded'));
      if (timelineImg.complete) timelineImg.classList.add('loaded');
    }
    const cardEl = el.querySelector('.timeline-card');
    cardEl.addEventListener('click', (e) => {
      if (e.target.closest('.card-open, .card-collapse, .card-info-btn, .card-info-menu')) return;
      cardEl.classList.add('expanded');
    });
    cardEl.querySelector('.card-collapse').addEventListener('click', (e) => {
      e.stopPropagation();
      cardEl.classList.remove('expanded');
    });
    cardEl.querySelector('.card-info-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      cardEl.querySelector('.card-info-menu').classList.toggle('open');
    });
    cardEl.querySelector('.card-open').addEventListener('click', (e) => {
      e.stopPropagation();
      if (card.link_web) window.open(card.link_web, '_blank', 'noopener');
    });
    const screenshotBtn = el.querySelector('.card-screenshot-btn');
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._openLightGallery([{ thumb: card.screenshot, full: card.screenshot }]);
      });
    }
    const imagesBtn = el.querySelector('.card-images-btn');
    if (imagesBtn) {
      imagesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._openLightGallery(card.imagenes);
      });
    }
    const prot = el.querySelector('.card-protagonista.has-more');
    if (prot) {
      prot.addEventListener('click', (e) => {
        e.stopPropagation();
        prot.classList.toggle('expanded');
        const list = prot.querySelector('.protagonista-list');
        if (prot.classList.contains('expanded')) {
          list.textContent = prot.dataset.full;
        } else {
          list.textContent = actors.slice(0, MAX_ACTORS).join(', ') + '...';
        }
      });
    }
    return el;
  }

  // ====== Insert element before timeline footer ======
  _insertBeforeFooter(el) {
    const footer = this.timelineCards.querySelector('.timeline-footer-item');
    if (footer) {
      this.timelineCards.insertBefore(el, footer);
    } else {
      this.timelineCards.appendChild(el);
    }
  }

  // ====== Render timeline cards ======
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
    } else {
      cards.forEach((card, i) => {
        this.timelineCards.appendChild(this._createTimelineItem(card, i));
      });
    }

    if (this.lastUpdated) {
      const d = new Date(this.lastUpdated);
      const formatted = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) +
        ' a las ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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

  // ====== Intersection Observer for featured cards ======
  _setupObserver() {
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

  // ====== Intersection Observer for timeline items ======
  _setupTimelineObserver() {
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

  // ====== Toggle expand / collapse ======
  _toggleExpand(scrollTo = false) {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this.section.classList.add('expanded');
      this.timelineContainer.classList.add('expanded');
      this.expandIcon.classList.add('rotated');
      requestAnimationFrame(() => {
        this._setupTimelineObserver();
      });
    } else {
      const cards = this.featuredContainer.querySelectorAll('.featured-card');
      cards.forEach((c) => c.style.transition = 'none');
      cards.forEach((c) => c.classList.remove('visible'));
      void this.featuredContainer.offsetHeight;
      cards.forEach((c) => c.style.transition = '');

      this.section.classList.remove('expanded', 'scrolled');
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

  _scrollToSection() {
    const offset = 60;
    const rect = this.section.getBoundingClientRect();
    let el = this.section.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
        el.scrollTo({ top: el.scrollTop + rect.top - offset, behavior: 'smooth' });
        return;
      }
      el = el.parentElement;
    }
    window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'smooth' });
  }

  // ====== Toggle timeline sort order ======
  _toggleSort() {
    this.sortAscending = !this.sortAscending;
    this.sortToggle.classList.toggle('asc', this.sortAscending);
    this._applyFilters();
  }

  // ====== Build filter checkboxes from data ======
  _buildFilterCheckboxes() {
    this.filters.forEach(f => {
      const values = [...new Set(this.items.map(c => c[f.field]))];
      f.options.innerHTML = '';
      f.checkboxes = [];
      values.forEach(val => {
        const label = document.createElement('label');
        label.className = 'filter-option';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = val;
        cb.checked = true;
        const span = document.createElement('span');
        span.textContent = val;
        label.appendChild(cb);
        label.appendChild(span);
        cb.addEventListener('change', () => this._applyFilters());
        f.options.appendChild(label);
        f.checkboxes.push(cb);
      });
    });
  }

  // ====== Filter by tone and source type ======
  _applyFilters() {
    const anyActive = this.filters.some(f => !f.checkboxes.every(cb => cb.checked));
    this.filterToggle.classList.toggle('active', anyActive);
    this.allCards = this._originalCards.filter(c =>
      this.filters.every(f => {
        const active = f.checkboxes.filter(cb => cb.checked).map(cb => cb.value);
        return active.length === f.checkboxes.length || active.includes(c[f.field]);
      })
    );
    if (this.sortAscending) this.allCards.reverse();
    if (this.itemsPerPage > 0) this._displayedCount = this.itemsPerPage;
    this._renderAll();
  }

  // ====== Render featured + timeline ======
  _renderAll() {
    const featured = this.allCards.slice(0, this.FEATURED_COUNT);
    const n = this.allCards.length;
    this.remainingCount.textContent = this._originalCards.length;
    this.container.querySelector('#remaining-text').textContent = n === 1 ? 'publicación relacionada' : 'publicaciones relacionadas';
    this._renderFeatured(featured);
    const displayCards = this.itemsPerPage > 0
      ? this.allCards.slice(0, this._displayedCount)
      : this.allCards;
    this._renderTimeline(displayCards);
    if (this.itemsPerPage > 0 && this._displayedCount < this.allCards.length) {
      this._renderLoadMoreButton();
    }
    requestAnimationFrame(() => {
      this.featuredContainer.querySelectorAll('.featured-card').forEach(c => c.classList.add('visible'));
    });
    if (this.isExpanded) {
      requestAnimationFrame(() => this._setupTimelineObserver());
    }
  }

  // ====== Render load more button ======
  _renderLoadMoreButton() {
    const el = document.createElement('div');
    el.className = 'timeline-item timeline-load-more-item';
    el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-load-more-dot"></div>
      </div>
      <div class="timeline-load-more-wrap">
        <button class="timeline-load-more-btn">Cargar m&aacute;s</button>
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

  // ====== Init ======
  _init() {
    this._buildLayout();
    this._buildFilterCheckboxes();
    this._originalCards = [...this.items].sort((a, b) => {
      if (!a.fecha_publicacion) return 1;
      if (!b.fecha_publicacion) return -1;
      return new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion);
    });
    this.allCards = [...this._originalCards];
    if (this.itemsPerPage > 0) this._displayedCount = this.itemsPerPage;
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
    this.sortToggle.addEventListener('click', () => this._toggleSort());
    this.filterToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.filterMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.card-info-btn, .card-info-menu')) {
        this.container.querySelectorAll('.card-info-menu.open').forEach(m => m.classList.remove('open'));
      }
      if (!e.target.closest('.filter-wrap')) {
        this.filterMenu.classList.remove('open');
      }
    });

    window.addEventListener('scroll', () => {
      if (!this.isExpanded) return;
      const rect = this.timelineContainer.getBoundingClientRect();
      this.section.classList.toggle('scrolled', rect.top < 0);
    }, { passive: true });
  }
}
