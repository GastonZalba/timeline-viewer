# ARCHITECTURE.md — Documentación técnica

## Diagrama de componentes

```
Consumer Code
     │
     ▼
new Timeline({ container, items, ... })
     │
     ├──► constructor()
     │        │
     │        ▼
     │    _init() ──────────────────────────────────────┐
     │        │                                          │
     │        ├── _buildLayout()                        │
     │        │       Inyecta HTML skeleton en el       │
     │        │       container y cachea referencias    │
     │        │       DOM en propiedades de clase       │
     │        │                                          │
     │        ├── _buildFilterCheckboxes()              │
     │        │       Genera checkboxes de filtro       │
     │        │       desde valores únicos de           │
      │        │       tonos_sociales y tipo_fuente      │
     │        │                                          │
     │        ├── Sort data (fecha_publicacion DESC)    │
     │        │                                          │
     │        ├── _renderAll() ◄──────────────────────┐ │
     │        │       │                               │ │
     │        │       ├── _renderFeatured()           │ │
     │        │       ├── _renderTimeline()           │ │
     │        │       │     └── _createTimelineItem() │ │
     │        │       └── _renderLoadMoreButton()     │ │
     │        │                                       │ │
     │        └── Bind event listeners                │ │
     │                │                               │ │
     │                ├── expandToggle → _toggleExpand()│
     │                ├── fabCollapse → _toggleExpand()│ │
     │                ├── featuredContainer → _toggleExpand()│
     │                ├── sortToggle → _toggleSort()  │ │
     │                ├── filterToggle → toggle menu  │ │
     │                ├── document click → close menus│ │
     │                └── scroll → scrolled state     │ │
     │                                                │ │
     └────────────────────────────────────────────────┘ │
              _toggleSort() y _applyFilters() ──────────┘
```

## Clase `Timeline` — Mapa de métodos

### Lifecycle

| Método | Línea | Descripción |
|--------|-------|-------------|
| `constructor(config)` | 101 | Recibe `TimelineOptions`, inicializa propiedades, llama `_init()` |
| `_init()` | 834 | Orquesta todo: layout → filtros → sort → render → eventos |

### Rendering

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_buildLayout()` | 131 | Inyecta el HTML skeleton completo, cachea 12+ referencias DOM |
| `_renderAll()` | 776 | Renderiza featured + timeline + load-more. Método principal de "refresh" |
| `_renderFeatured(cards)` | 256 | Renderiza el stack de tarjetas superpuestas |
| `_renderTimeline(cards)` | 537 | Renderiza la lista de tarjetas del timeline |
| `_createTimelineItem(card, index)` | 285 | Crea una tarjeta individual con todos sus event listeners |
| `_renderLoadMoreButton()` | 798 | Agrega el botón "Cargar más" al final del timeline |
| `_insertBeforeFooter(el)` | 527 | Helper: inserta antes del footer o al final si no hay footer |

### UI/Interacción

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_toggleExpand(scrollTo?)` | 678 | Alterna entre vista featured (colapsada) y timeline (expandida) |
| `_scrollToSection()` | 712 | Smooth scroll para hacer visible el timeline |
| `_toggleSort()` | 728 | Invierte orden ascendente/descendente por fecha |
| `_buildFilterCheckboxes()` | 735 | Construye checkboxes desde valores únicos de los datos |
| `_applyFilters()` | 761 | Filtra datos y re-renderiza todo |

### Embeds sociales

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_parseLinkWeb(url)` | 212 | Detecta URLs de YouTube/Instagram/Twitter/Facebook, retorna `LinkInfo` |
| `_preloadEmbedLibraries()` | 606 | Carga SDKs de redes sociales bajo demanda. **Instagram ANTES de Facebook** |

### Utilidades

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_formatDate(dateStr)` | 198 | Fecha YYYY-MM-DD → string locale `es-ES` |
| `_formatDateTime(dateStr)` | 205 | Datetime ISO → string locale `es-ES` |
| `_openLightGallery(images, title, showFileName)` | 228 | Abre modal lightGallery con galería de imágenes |

### Observers

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_setupObserver()` | 570 | IntersectionObserver para animación de entrada de featured cards |
| `_setupTimelineObserver()` | 587 | IntersectionObserver para animación de entrada de timeline items |

## Estructura DOM

El componente inyecta la siguiente jerarquía en el `container` del consumidor:

```html
<section class="noticias-section" id="noticias-section">
  ├── .featured-row
  │   ├── .noticias-top
  │   │   ├── button.expand-toggle (#expand-toggle)
  │   │   │   ├── span.expand-text (contiene #remaining-count + #remaining-text)
  │   │   │   └── span.expand-icon (#expand-icon)
  │   │   ├── .filter-wrap
  │   │   │   ├── button.filter-toggle (#filter-toggle)
  │   │   │   └── div.filter-menu (#filter-menu)
  │   │   │       ├── .filter-section > .filter-header + .filter-options#filter-options-tone
  │   │   │       └── .filter-section > .filter-header + .filter-options#filter-options-source
  │   │   └── button.sort-toggle (#sort-toggle)
  │   └── .featured-cards (#featured-cards)
  │       └── .featured-card × N (generados por _renderFeatured)
  │           ├── .card-image-wrap > img.card-image
  │           └── .card-body
  │               ├── .card-date
  │               ├── .card-title
  │               └── .card-protagonista
  └── .timeline-container (#timeline-container)
      └── .timeline-collapse-wrap
          ├── .timeline-line
          └── .timeline-content
              ├── .timeline-cards (#timeline-cards)
              │   ├── .timeline-item × N (generados por _createTimelineItem)
              │   │   ├── .timeline-date-col
              │   │   │   ├── .timeline-date
              │   │   │   ├── .timeline-dot
              │   │   │   └── .timeline-hline
              │   │   └── .timeline-card.tone-{positivo|negativo|neutro}
              │   │       ├── .card-image-wrap > img.card-image
              │   │       ├── .card-body
              │   │       │   ├── .card-title
              │   │       │   ├── .card-desc (resumen_ia)
              │   │       │   ├── .card-tone
              │   │       │   ├── .card-temas > .tema-item × N
              │   │       │   ├── .card-hint
              │   │       │   ├── button.card-collapse
              │   │       │   ├── button.card-info-btn
              │   │       │   ├── .card-info-menu
              │   │       │   ├── .card-protagonista
              │   │       │   ├── .card-fuente
              │   │       │   ├── .card-iframe-wrap (YouTube/Instagram/Twitter/Facebook)
              │   │       │   └── .card-footer
              │   │       │       ├── .card-footer-actions
              │   │       │       │   ├── button.card-screenshot-btn (si hay screenshot)
              │   │       │       │   ├── button.card-images-btn (si hay imágenes)
              │   │       │       │   └── button.card-open (abrir enlace)
              │   │       │       └── .card-footer-sep
              │   ├── .timeline-item.timeline-footer-item (si lastUpdated)
              │   ├── .timeline-item.timeline-load-more-item (si hay más páginas)
              │   └── .timeline-item.timeline-empty-item (si no hay resultados)
              └── .fab-sticky-wrap
                  └── button.fab-collapse (#fab-collapse)
```

## Sistema de theming CSS

Todas las variables CSS custom están definidas al inicio de `styles.scss` bajo `.noticias-section`:

```scss
.noticias-section {
  --tv-bg-primary: #1a2025;
  --tv-bg-secondary: #1a1a1a;
  --tv-bg-card: #1d2633;
  --tv-bg-overlay: rgba(96, 165, 250, 0.07);
  --tv-bg-hover: rgba(0, 0, 0, 0.5);
  --tv-border-card: #0e1116;
  --tv-border-section: #2a2a2a;
  --tv-text-primary: #e0e0e0;
  --tv-text-secondary: #999;
  --tv-text-muted: #a4a4a4;
  --tv-text-dark: #444;
  --tv-text-on-primary: #fff;
  --tv-accent: #3b82f6;
  --tv-accent-light: #60a5fa;
  --tv-tone-positive: #22c55e;
  --tv-tone-negative: #ef4444;
  --tv-tone-neutral: #94a3b8;
  --tv-shadow-card: rgba(0, 0, 0, 0.541);
}
```

El consumidor puede personalizar estos valores sobreescribiéndolos en CSS:

```css
#mi-container .noticias-section {
  --tv-accent: #ff6b6b;
  --tv-bg-card: #2d2d2d;
}
```

## Featured cards — Stack superpuesto

Las tarjetas featured se apilan visualmente con un efecto de desplazamiento horizontal. Las posiciones se generan con un loop SCSS `@for`:

```scss
@for $i from 1 through 10 {
  .featured-card:nth-child(#{$i}) {
    left: #{$i * 28}px;
    z-index: #{$i};
    transition-delay: #{$i * 0.05}s;
    transform: scale(1 - $i * 0.015);
  }
}
```

Esto genera 10 posiciones con offsets crecientes, z-indexes crecientes, delays progresivos y scales decrecientes.

## Paginación

El sistema de paginación es **manual** (no infinito scroll):

1. `_displayedCount` rastrea cuántos items se están mostrando
2. `_renderAll()` renderiza `allCards.slice(0, _displayedCount)`
3. Si `_displayedCount < allCards.length`, se muestra el botón "Cargar más"
4. Al hacer click, se agregan los siguientes `itemsPerPage` items usando `_insertBeforeFooter()`
5. Si `itemsPerPage === 0`, se muestran todos los items sin paginación

## Sistema de filtros

Dos filtros disponibles, generados dinámicamente desde los datos:

| Filtro | Campo | Descripción |
|--------|-------|-------------|
| Tono social | `tonos_sociales` | Array: Positivo / Negativo / Neutro |
| Tipo de fuente | `tipo_fuente` | Valores únicos presentes en los datos |

Flujo:
1. `_buildFilterCheckboxes()` extrae valores únicos y crea checkboxes con conteo
2. Al cambiar un checkbox, `_applyFilters()` filtra `_originalCards` con AND entre filtros
3. `_renderAll()` re-renderiza con los datos filtrados
4. El sort se re-aplica después del filtrado

## Animaciones de entrada

Usan `IntersectionObserver` (sin librerías externas):

- **Featured cards**: Observer en `section.noticias-section` con threshold 0.1. Cuando es visible, agrega `.visible` a todas las featured cards.
- **Timeline items**: Observer individual por cada `.timeline-item` con threshold 0.1 y rootMargin `0px 0px 100px 0px`. Cada item se anima individualmente al entrar en viewport.

Las transiciones CSS usan `transition-delay` escalonado (`index * 0.08s`) para crear un efecto cascada.

## Propiedades de clase — Referencia

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `container` | `HTMLElement` | Elemento DOM del consumidor |
| `items` | `TimelineItem[]` | Datos originales recibidos |
| `_originalCards` | `TimelineItem[]` | Copia ordenada de items (antes de filtros) |
| `allCards` | `TimelineItem[]` | Items filtrados y/o ordenados |
| `_displayedCount` | `number` | Cantidad de items visibles (paginación) |
| `featured_count` | `number` | Cantidad de cards en el stack featured |
| `itemsPerPage` | `number` | Items por página (0 = sin paginación) |
| `lastUpdated` | `string` | Timestamp para el footer |
| `isExpanded` | `boolean` | Estado actual (featured vs timeline) |
| `sortAscending` | `boolean` | Dirección del sort |
| `filters` | `FilterDef[]` | Estado de los filtros |
| `section` | `HTMLElement` | `.noticias-section` |
| `featuredContainer` | `HTMLElement` | `#featured-cards` |
| `timelineContainer` | `HTMLElement` | `#timeline-container` |
| `timelineCards` | `HTMLElement` | `#timeline-cards` |
| `expandToggle` | `HTMLElement` | `#expand-toggle` |
| `remainingCount` | `HTMLElement` | `#remaining-count` |
| `expandIcon` | `HTMLElement` | `#expand-icon` |
| `fabCollapse` | `HTMLElement` | `#fab-collapse` |
| `sortToggle` | `HTMLElement` | `#sort-toggle` |
| `filterToggle` | `HTMLElement` | `#filter-toggle` |
| `filterMenu` | `HTMLElement` | `#filter-menu` |
| `_lgInstance` | `LightGallery \| null` | Instancia actual de lightGallery |
| `_lgContainer` | `HTMLElement \| null` | Container para lightGallery |

## Estados CSS del componente

| Clase | Elemento | Descripción |
|-------|----------|-------------|
| `.expanded` | `.noticias-section` | Timeline visible, featured oculto |
| `.scrolled` | `.noticias-section` | Timeline scrolled más allá del top |
| `.expanded` | `.timeline-card` | Tarjeta individual expandida |
| `.visible` | `.featured-card` | Tarjeta featured animada (entró en viewport) |
| `.visible` | `.timeline-item` | Timeline item animado (entró en viewport) |
| `.loaded` | `.card-image` | Imagen cargada (quita shimmer) |
| `.loaded` | `.card-iframe-wrap` | Iframe/embed cargado |
| `.open` | `.filter-menu` | Menú de filtros abierto |
| `.open` | `.card-info-menu` | Menú de info de tarjeta abierto |
| `.active` | `.filter-toggle` | Filtros activos (al menos uno seleccionado) |
| `.asc` | `.sort-toggle` | Orden ascendente activo |
| `.rotated` | `.expand-icon` | Icono de expand rotado 180° |

## Artefactos de build (`dist/`)

`dist/` contiene solo salida compilada (JS, `.d.ts`, CSS). No se edita a mano: cualquier cambio se hace en `src/` y se regenera con `npm run build`.
