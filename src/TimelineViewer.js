export default class Timeline {
  constructor(config) {
    this.container = typeof config.container === 'string'
      ? document.querySelector(config.container)
      : config.container;
    this.items = config.items || [];
    this.FEATURED_COUNT = config.featuredCount || 6;
    this.lastUpdated = config.lastUpdated || '';
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
              <span class="expand-text"><span id="remaining-count">0</span> <span id="remaining-text">artículos relacionados</span></span>
              <span class="expand-icon" id="expand-icon"></span>
            </button>
          </div>
          <div class="featured-cards" id="featured-cards" title="Expandir artículos"></div>
        </div>
        <div class="timeline-container" id="timeline-container">
          <div class="timeline-collapse-wrap">
            <div class="timeline-line"></div>
            <div class="timeline-content">
              <div class="timeline-cards" id="timeline-cards"></div>
              <div class="fab-sticky-wrap">
                <button class="fab-collapse" id="fab-collapse" title="Ocultar timeline">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  <span class="fab-label">Ocultar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
    this.section = document.getElementById('noticias-section');
    this.featuredContainer = document.getElementById('featured-cards');
    this.timelineContainer = document.getElementById('timeline-container');
    this.timelineCards = document.getElementById('timeline-cards');
    this.expandToggle = document.getElementById('expand-toggle');
    this.remainingCount = document.getElementById('remaining-count');
    this.expandIcon = document.getElementById('expand-icon');
    this.fabCollapse = document.getElementById('fab-collapse');
  }

  // ====== Helpers ======
  _formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  _formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ====== Render featured (overlapping) cards ======
  _renderFeatured(cards) {
    this.featuredContainer.innerHTML = '';
    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'featured-card';
      const imgHtml = card.link_portada
        ? `<img class="card-image" src="${card.link_portada}" alt="${card.nombre_fuente}" loading="lazy">`
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
      this.featuredContainer.appendChild(el);
    });
  }

  // ====== Render timeline cards ======
  _renderTimeline(cards) {
    this.timelineCards.innerHTML = '';
    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'timeline-item';
      el.style.transitionDelay = `${i * 0.08}s`;
      const imgHtml = card.link_portada
        ? `<img class="card-image" src="${card.link_portada}" alt="${card.nombre_fuente}" loading="lazy">`
        : '';
      const toneLabel = { positivo: 'Positivo', negativo: 'Negativo', neutro: 'Neutro' };
      const toneLabelTema = { positivo: 'Positivo', negativo: 'Negativo', neutro: 'Neutro' };
      const protHtml = card.actores_principales && card.actores_principales.length
        ? `<div class="card-protagonista"><span class="protagonista-label">Actores principales:</span> ${card.actores_principales.join(', ')}</div>`
        : `<div class="card-protagonista"><span class="protagonista-label">Actores principales:</span> -</div>`;
      const temasHtml = card.temas && card.temas.length
        ? `<div class="card-temas">${card.temas.map(t => `
            <div class="tema-item tone-tema-${t.tono_social}">
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
          ${card.hasCapture ? '<button class="card-footer-btn" title="Descargar Captura de la fuente"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Captura</button>' : ''}
          ${card.imagenes && card.imagenes.length ? '<button class="card-footer-btn" title="Ver imágenes"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Imágenes <span class="card-footer-count">' + card.imagenes.length + '</span></button>' : ''}
          <button class="card-footer-btn card-open" title="Abrir enlace">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Ir
          </button>
        </div>
      </div>`;
      el.innerHTML = `
        <div class="timeline-date-col">
          <div class="timeline-date">${this._formatDate(card.fecha_publicacion)}</div>
          <div class="timeline-dot"></div>
          <div class="timeline-hline"></div>
        </div>
        <div class="timeline-card${card.link_portada ? '' : ' no-image'} tone-${card.tono_social}">
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
                <span class="card-info-value">${card.tipo_medio}</span>
              </div>
              <div class="card-info-row">
                <span class="card-info-label">Captura</span>
                <span class="card-info-value">${this._formatDateTime(card.crawlDate)}</span>
              </div>
            </div>
            ${protHtml}
            <div class="card-fuente">${card.fuente_institucional}</div>
            ${footerHtml}
          </div>
        </div>
      `;
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
      this.timelineCards.appendChild(el);
    });

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

    document.querySelectorAll('.timeline-item').forEach((item) => {
      observer.observe(item);
    });
  }

  // ====== Toggle expand / collapse ======
  _toggleExpand() {
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
      document.querySelectorAll('.timeline-item').forEach((item) => {
        item.classList.remove('visible');
      });

      setTimeout(() => {
        cards.forEach((c) => c.classList.add('visible'));
      }, 100);
    }
  }

  // ====== Init ======
  _init() {
    this._buildLayout();
    this.allCards = this.items;

    const featured = this.allCards.slice(0, this.FEATURED_COUNT);

    const n = this.allCards.length;
    this.remainingCount.textContent = n;
    document.getElementById('remaining-text').textContent = n === 1 ? 'artículo relacionado' : 'artículos relacionados';
    this._renderFeatured(featured);
    this._renderTimeline(this.allCards);

    if (this.allCards.length <= 3) {
      this.fabCollapse.style.display = 'none';
    }

    requestAnimationFrame(() => {
      const cards = this.featuredContainer.querySelectorAll('.featured-card');
      cards.forEach((c) => c.classList.add('visible'));
    });

    this.expandToggle.addEventListener('click', () => this._toggleExpand());
    this.fabCollapse.addEventListener('click', () => this._toggleExpand());
    this.featuredContainer.addEventListener('click', () => this._toggleExpand());

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.card-info-btn, .card-info-menu')) {
        document.querySelectorAll('.card-info-menu.open').forEach(m => m.classList.remove('open'));
      }
    });

    window.addEventListener('scroll', () => {
      if (!this.isExpanded) return;
      const rect = this.timelineContainer.getBoundingClientRect();
      this.section.classList.toggle('scrolled', rect.top < 0);
    }, { passive: true });
  }
}
