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
      │        │       Checkboxes por cada grupo de la   │
      │        │       opción `filters`: valores         │
      │        │       derivados de los datos o facets   │
     │        │                                          │
     │        ├── _sortBy (sorter activo, DEF f.pub)     │
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
     │                ├── featuredContainer → _toggleExpand()│
      │                ├── sortToggle → _bindSortToggle()│ │
     │                ├── filterToggle → toggle menu  │ │
     │                └── document click → close menus│ │
     │                                                │ │
     └────────────────────────────────────────────────┘ │
              _applySort() y _applyFilters() ────────────┘
```

## Clase `Timeline` — Mapa de métodos

### Lifecycle

| Método | Línea | Descripción |
|--------|-------|-------------|
| `constructor(config)` | 101 | Recibe `TimelineOptions`, inicializa propiedades, lee el estado de la URL (`_readUrlState()`) y llama `_init()` |
| `_init()` | 3353 | Orquesta todo: layout → búsqueda → filtros → sort → render → eventos. Con `stateInUrl` siembra los filtros del link antes de los checkboxes y deja la URL escribible antes de restaurar la página |

### Rendering

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_buildLayout()` | 806 | Inyecta el HTML skeleton completo, cachea 12+ referencias DOM |
| `_renderAll()` | 3038 | Renderiza featured + timeline + load-more. Método principal de "refresh" (rebuild completo) |
| `_renderFeatured(cards)` | 1218 | Renderiza el stack de tarjetas superpuestas |
| `_renderTimeline(cards, instant = false)` | 1885 | Renderiza la lista de tarjetas del timeline desde cero (`innerHTML = ''`). Con `instant: true` (rama API con skeletons) las tarjetas nacen con `visible`, sin entrada por slide |
| `_appendTimelineItems(items, startIndex)` | 1916 | Agrega tarjetas al final **sin tocar las existentes** (paginación de API) y devuelve los nodos creados para observarlos |
| `_createTimelineItem(card, index)` | 1248 | Crea una tarjeta individual con todos sus event listeners |
| `_renderLoadMoreButton()` | 3165 | Agrega el botón "Cargar más" al final del timeline. Su rama local también llama a `_renderStatus()`: es el único click que hace crecer la lista sin pasar por `_renderAll()`, así que sin eso el conteo se quedaría en el rango anterior |
| `_insertBeforeFooter(el)` | 1857 | Helper: inserta antes del footer o al final si no hay footer |
| `_insertBeforeTrailing(el)` | 1873 | Helper: inserta al final de las tarjetas, antes del bloque final (load-more / status / footer) |
| `_appendPageItems()` | 2729 | Modo API: pide la página siguiente y **agrega** las tarjetas nuevas, sin rebuild. Saca el botón de "Cargar más" si `_hasMorePages()` pasa a `false` |
| `_renderApiLoading()` | 2848 | Modo API: reemplaza lista y stack de destacadas por tarjetas fantasma (shimmer) mientras llega una respuesta que las va a sustituir |
| `_clearApiLoading()` | 2914 | Modo API: baja el estado de carga (skeletons + `aria-busy`) sin tocar nada más. La respuesta real lo llama desde `_renderAll`; el fallo, desde el `catch` de `_fetchPage` |
| `_pageSize()` | 2580 | Tamaño de página del modo actual: `_apiPageSize()` en API, `itemsPerPage` en local (0 = sin paginación). Lo que usan `_pageCount()` y `_statusCountText()` |
| `_statusCountText()` | 2963 | Texto del conteo de la fila de status: "Mostrando A-B de Y publicaciones". El total y el "cuánto hay en pantalla" los saca de `_apiTotal`/`allCards` en API y de `allCards`/`_localDisplayCards()` en local; el `start` sale de `_currentPage()` con el paginador y es 1 fijo con "Cargar más" |
| `_renderStatus()` | 2985 | Fila de status al pie de la lista: cargando / error / conteo. El error y la carga son exclusivos de API; el conteo se emite en los dos modos y también con `pagination: true`, cuyo rango es el de la página en pantalla. Se abstiene mientras hay skeletons |
| `_renderSingleCard()` | 3312 | Modo single (`singleId`): renderiza una única tarjeta ya expandida sin chrome de timeline |
| `_buildTaxonomies(taxonomias)` | 1554 | Modo single: markup del bloque de links de navegación que el propio ítem declara en `taxonomias`. Filtra grupos/items incompletos y devuelve `''` si no hay nada que renderizar |
| `_bindTaxonomyToggles(root)` | 1593 | Modo single: bindea los "Ver más (N)" del bloque de links, en los grupos que superan `TAXONOMY_VISIBLE_LINKS`. Cada toggle es independiente: alterna la clase `expanded` de su `ul.card-taxonomy-list` (y su `aria-expanded`) |

### UI/Interacción

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_toggleExpand(scrollTo?)` | 2107 | Alterna entre vista featured (colapsada) y timeline (expandida) |
| `_scrollToSection()` | 2169 | Smooth scroll para hacer visible el timeline |
| `_applySort(field, asc)` | 2616 | Fija el sorter activo (`_sortField` + `_sortAsc`) y refresca la lista: re-ordena el pool en local y re-pide la página en API |
| `_bindSortToggle()` | 4463 | Bindea el menú de orden: el botón abre/cierra, y un `change` en sus radios llama a `_applySort()` |
| `_applyFilters(immediate)` | 2978 | Filtra datos y re-renderiza todo. En modo API el parámetro `immediate` pide el borde de entrada del debounce. El resto de los métodos de filtros viven en [Sistema de filtros](#sistema-de-filtros) |
| `_syncFilterToggleState()` | 2961 | Enciende `#filter-toggle` / `#filtros-internos-toggle` / `#search-wrap` según lo activo en cada dominio (los grupos `filtros_internos` solo encienden su propio botón, nunca el del panel) |
| `_openSearch()` / `_closeSearch(force)` | 4605 | Abre el buscador (`.open` + foco) y lo colapsa. El colapso se corta si el campo tiene texto: un término escrito es un filtro en uso, y esconderlo dejaría al filtro puesto sin forma de sacarlo. `force` lo usa <kbd>Esc</kbd>, que primero vacía el campo |
| `_readUrlState()` | ver [Estado en la URL](#estado-en-la-url) | Con `stateInUrl`: lee el link **una vez**, desde el constructor, y deja el término, el orden, la taxonomía y la página ya puestos antes del primer render |
| `_applyUrlFilterState()` | ídem | Siembra los tokens del link en `f.active` **antes** de `_buildFilterCheckboxes()`, sin cruzarlos contra los valores del grupo (que en API todavía no existen) |
| `_restoreUrlPage()` | ídem | Modo local: deja la página del link en pantalla, recortada a la última |
| `_syncUrlState()` | ídem | Escribe el estado de la vista con `history.replaceState`, borrando primero los `tv_*` que no están en efecto. Lo llaman `_applyFilters`, `_goToPage` y `_fetchPage` |

### Embeds sociales

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_parseLinkWeb(url)` | 1428 | Detecta URLs de YouTube/Instagram/Twitter/Facebook y archivos de video directo, retorna `LinkInfo` |
| `_isDirectVideoUrl(url)` | 1455 | True si la URL termina en `.mp4`/`.webm`/`.mov`/`.m4v`/`.ogv` (reusa `_getFileExt`, así el query string del CDN no molesta) |
| `_buildEmbed(embedUrl)` | 1460 | Arma el markup del embed. Los tipos con SDK llevan shimmer; `video` lleva un `<video controls playsinline preload="metadata" loading="lazy">` sin shimmer |
| `_processCardEmbeds(cardEl)` | 2192 | Procesa los embeds de la tarjeta al expandir. Para `video` no hay SDK: solo copia el `aspectRatio` real desde `videoWidth`/`videoHeight` en `loadedmetadata` |
| `_preloadEmbedLibraries()` | 2484 | Carga SDKs de redes sociales bajo demanda. **Instagram ANTES de Facebook**. `video` y `youtube` no cargan nada |

### Mapa de temas (OpenLayers)

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_buildTemasHtml(card, located)` | 2445 | Markup del bloque "Temas destacados": header con el subtítulo y el toggle, el body del mapa y la lista. Cada tema lleva un badge `.tema-map-ref` (número si está ubicado, ícono de pin tachado si no) |
| `_temaGeomOf(tema)` | 2496 | Valida el `geom` de un tema: devuelve `{ lat, lon }` o `null` si falta, no es objeto o está fuera de rango (`lat` ∉ [-90, 90], `lon` ∉ [-180, 180], `NaN`/`Infinity`). Un punto inválido se trata igual que ausente: el tema se lista y solo se saltea su marcador |
| `_temasLocated(temas)` | 2513 | Única pasada que filtra los temas con `geom` usable y les asigna `index` (1-based, el del mapa) + `temaIndex` (posición original en la lista) + `color` por tono. De acá salen tanto los badges como los círculos |
| `_buildTemasMapToggleHtml(located)` | 2547 | Botón (ícono del mapa + flechita, sin texto) que abre el mapa. `''` sin temas ubicados. Acción en `aria-label` + `title` ("Ver mapa"/"Ocultar mapa"); la flechita gira 180° por CSS desde el mismo `aria-expanded`; puro |
| `_buildTemasMapBodyHtml(located)` | 2564 | Body del mapa (`.card-temas-map-body` + `.card-temas-map-canvas`), oculto hasta el primer open. `''` sin temas ubicados |
| `_bindTemasMapToggle(slot, located)` | 2588 | Bindea el toggle (alterna `expanded`/`hidden`/`aria-expanded`/labels, con `stopPropagation`) y, en el primer open, monta el mapa en un `requestAnimationFrame` |
| `_loadOpenLayers()` | 2621 | `import()` dinámico de los módulos de `ol` (Map, View, geometrías, capas, fuentes, estilos, overlay, controles, proj) y del plugin de zoom. Cachea la promesa |
| `_mountTemasMap(canvas, located)` | 2700 | Crea el mapa, el overlay de tooltip y los features (círculos + texto, estilo por función), fuerza el `renderSync()` que hace posible el `declutter()`, corre `declutter()` (spiderfy: separa los markers que se solapan y guarda en `feature.spider` la línea de vuelta al origen y la geometría desplazada) en cada `moveend` y bindea el hit test de hover |
| `_destroyTemasMaps()` | 3000 | Suelta cada mapa guardado en `_temasMaps` (`overlay.setMap(null)` + `map.setTarget(undefined)` + `dispose()`). Se llama antes de vaciar la lista (`_renderTimeline`, `_renderApiLoading`) |

### Utilidades

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_formatDate(dateStr)` | 988 | Fecha YYYY-MM-DD → string locale `es-ES` |
| `_formatDateTime(dateStr)` | 995 | Datetime ISO → string locale `es-ES` |
| `_getFileExt(url)` | — | Extrae la extensión de una URL en minúsculas |
| `_fileIconSvg(ext)` | — | SVG de icono de archivo según extensión (pdf vs genérico) |
| `_openLightGallery(images, title, showFileName, startIndex?)` | 1042 | Abre modal lightGallery con galería de imágenes |
| `_absoluteUrl(url)` | 1140 | Resuelve una URL del ítem contra `window.location.href` para poder compartirla (devuelve el valor crudo si no es una URL válida). Se usa con `link_view_entry` |
| `_escapeHtml(value)` | 1100 | Escapa `& < > " '` para interpolar texto plano en markup o atributos. Se usa en los valores del dato de `taxonomias` (`content`, `link` y `label`), que siempre son texto plano |

### Observers

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_setupObserver()` | 1957 | IntersectionObserver para animación de entrada de featured cards |
| `_setupTimelineObserver(items?)` | 1980 | IntersectionObserver para animación de entrada de timeline items. `items` acota qué se observa (la paginación pasa solo las tarjetas nuevas); por defecto observa todas las `.timeline-item` del container |

## Estructura DOM

El componente inyecta la siguiente jerarquía en el `container` del consumidor:

```html
<section class="publicaciones-section" id="publicaciones-section">
  ├── .featured-row
  │   ├── .noticias-top
  │   │   ├── button.expand-toggle (#expand-toggle)
  │   │   │   ├── span.expand-text (contiene #remaining-count + #remaining-text; con taxonomías, #remaining-count se oculta al expandir)
  │   │   │   └── span.expand-icon (#expand-icon)
  │   │   ├── .search-wrap (#search-wrap) — un solo control: colapsado es el círculo de la lupa; con `.open` (o con un término escrito, que no se colapsa) es la píldora
  │   │   │   ├── span.search-icon (ícono decorativo, absolute + `pointer-events: none`, sin texto propio)
  │   │   │   └── input.search-input (#search-input) — el que recibe el foco para abrirse, y el que muestra el término
  │   │   ├── .filter-wrap (solo si la opción `filters` declara grupos `'menu'`)
  │   │   │   ├── button.filter-toggle (#filter-toggle)
  │   │   │   └── div.filter-menu (#filter-menu)
  │   │   │       ├── .filter-column × 2 (la declaración se parte por la mitad)
  │   │   │       │   └── .filter-section > .filter-header (si el grupo declara `label`) + .filter-options[data-filter-field] × N
  │   │   │       │       └── label.filter-option (+ .filter-option-extra ocultas) > input + span.filter-option-label + span.filter-option-count
  │   │   └── button.sort-toggle (#sort-toggle)
  │   │   └── (toolbar interno, solo `internalButtons: true`)
  │   │       ├── button.work-notes-toggle (#work-notes-toggle)
  │   │       └── .filtros-internos-wrap (#filtros-internos-wrap, solo si hay grupos `group: 'filtros_internos'`)
  │   │           ├── button.filtros-internos-toggle (#filtros-internos-toggle)
  │   │           └── div.filtros-internos-menu (#filtros-internos-menu)
  │   │               └── .filter-section × N (validado / capturado / descartado) > .filter-header (si el grupo declara `label`) + .filter-options[data-filter-field]
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
          ├── .taxonomy-row (solo con `content`; se elimina del DOM en legacy `items` y en modo API)
          │   ├── .taxonomy-row-spacer
          │   └── .taxonomy-select-wrap
          │       ├── span.taxonomy-select-label (label de la taxonomía, crop con `...`)
          │       ├── span.taxonomy-select-count (píldora con el total del scope activo)
          │       └── select.taxonomy-select (nativo, transparente, superpuesto al wrap)
          └── .timeline-content
              ├── .timeline-cards (#timeline-cards)
              │   ├── .timeline-item × N (generados por _createTimelineItem)
              │   │   ├── .timeline-date-col
              │   │   │   ├── .timeline-date
              │   │   │   ├── .timeline-dot
              │   │   │   └── .timeline-hline
              │   │   └── .timeline-card.tone-{positivo|negativo|neutro}
              │   │       ├── .card-image-wrap
              │   │       │   ├── img.card-image
              │   │       │   └── .card-title (sobre el thumbnail)
              │   │       ├── .card-actions (barra de acciones debajo del thumbnail, oculto salvo expandido)
              │   │       │   └── .card-actions-row
│   │       │   ├── button.card-screenshot-btn (si hay screenshot)
│   │       │   ├── button.card-images-btn (si hay imágenes)
│   │       │   ├── .card-adjuntos > button.card-adjuntos-btn + .card-adjuntos-menu (si hay adjuntos)
│   │       │   └── button.card-open (abrir enlace)
│   │       └── .card-body
│   │           ├── .card-desc (resumen_ia)
│   │           ├── .card-tone
│   │           ├── .card-temas (solo si `temas` no está vacío)
│   │           │   ├── .card-temas-head
│   │           │   │   ├── .card-subtitle ("Temas destacados (N)")
│   │           │   │   └── button.card-temas-map-toggle (solo si algún tema tiene `geom`; ícono del mapa + flechita que gira 180° con `aria-expanded='true'`, acción en aria-label/title)
│   │           │   ├── .card-temas-map-body[hidden] (solo con `geom`; `.expanded` lo muestra)
│   │           │   │   └── .card-temas-map-canvas (OpenLayers se monta acá en el primer open)
│   │           │   └── .card-temas-list
│   │           │       └── .tema-item × N
│   │           │           ├── span.tema-map-ref (número, o `.tema-map-ref-none` con el pin tachado; visible solo con el mapa abierto)
│   │           │           └── .tema-content > .tema-title / .tema-desc / .tema-notas-trabajo
│   │           ├── .card-hint
│   │           ├── button.card-collapse
              │   │           ├── button.card-info-btn
              │   │           ├── button.card-share-btn (si `link_view_entry`, a la derecha del de info)
              │   │           ├── .card-share-toast (transitorio, al copiar al portapapeles)
              │   │           ├── .card-info-menu
              │   │           │   └── a.card-info-link (si `link_view_entry`) > span.card-info-value + svg


│   │           ├── .card-protagonista
│   │           ├── .card-fuente
│   │           ├── .card-iframe-wrap (YouTube/Instagram/Twitter/Facebook/video, publicación original)
│   │           └── .card-videos > .card-videos-list > .card-iframe-wrap × N (links_videos)
              │   ├── .timeline-item.timeline-footer-item (si lastUpdated)
              │   ├── .timeline-item.timeline-load-more-item (si hay más páginas)
              │   └── .timeline-item.timeline-empty-item (si no hay resultados)

```

### Modo single (`singleId`)

Cuando `singleId` está seteado, `_init()` corta antes de `_buildLayout()` y delega en `_renderSingleCard()`, que monta un árbol mínimo: sin featured, sin filtros, sin búsqueda, sin sort, sin paginación ni footer. La `.timeline-date-col` y el `button.card-collapse` se eliminan y la tarjeta queda siempre expandida.

```
section.publicaciones-section.single-mode
├── .single-mode-toolbar (si internalButtons)
│   └── button.work-notes-toggle
├── .timeline-item.visible (sin .timeline-date-col)
│   └── .timeline-card.expanded   (misma estructura que en el timeline, ver arriba)
│   └── .card-taxonomies (dentro del .card-taxonomies-slot de la card, si declara `taxonomias` y hay algo renderizable)
        └── .card-taxonomy × N
            ├── .card-taxonomy-label (texto plano, crop con `...`, texto completo en `title`)
            └── ul.card-taxonomy-list
                ├── li > a.card-taxonomy-link × N  (target=_blank, rel=noopener)
                │   └── texto escapado
                ├── li.card-taxonomy-extra[hidden] × N  (la cola del "Ver más")
                └── li.card-taxonomy-more-item > button.card-taxonomy-more (solo si el grupo tiene cola)
```

El bloque de taxonomías se renderiza con `_buildTaxonomias(card.taxonomias)` dentro del `.card-taxonomies-slot` de la tarjeta, y sus toggles se bindean con `_bindTaxonomyToggles(slot)`, **solo cuando la card se pudo cargar**: los grupos vienen en el propio ítem (en modo API viajan en el detalle de `GET {url}/:id`), así que en el camino de "article not found" no hay datos y no se inserta nada. Los grupos con `label` vacío, `items` vacío, o items sin `content`/`link` se descartan; si no queda ningún grupo, no se inyecta markup. Sus estilos viven dentro de `&.single-mode` en `styles.scss`, así que solo existen en este modo.

**Render en una fase.** `_buildTaxonomies(taxonomias)` devuelve el markup completo como string: `content` y `label` son texto plano y se escapan con `_escapeHtml`, `link` va al `href`. No hay placeholders ni nodos que intercambiar (antes `content` aceptaba un `HTMLElement` que había que mover con `replaceWith`): el dato viene de la API, que solo puede mandar strings.

## Sistema de theming CSS

Todas las variables CSS custom están definidas al inicio de `styles.scss` bajo `.publicaciones-section`:

```scss
.publicaciones-section {
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
#mi-container .publicaciones-section {
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

En **modo API** el botón llama a `_appendPageItems()` en lugar de appendear en el DOM, pero el criterio es el mismo (`allCards.length < _apiTotal`, es decir el `total` de la respuesta de la lista). Esa llamada **solo agrega** las tarjetas nuevas: usa `_appendTimelineItems()` — el hermano de `_renderTimeline()` sin el `innerHTML = ''` — y **no** pasa por `_renderAll()`, que reconstruye la lista completa.

El rebuild es lo correcto cuando lo que hay en pantalla ya no son los artículos en memoria: `_fetchPage(1)` tras una búsqueda/filtro/orden, el re-scope de una taxonomía y el salto de página del paginador numérico (`_goToPage()` → `_fetchPage(page)`, porque las páginas son disjuntas) reemplazan el conjunto, y ahí `_renderTimeline()` hace falta. "Cargar más" es el caso contrario —las tarjetas visibles siguen siendo correctas— y un rebuild en cada página se notaba: `.timeline-item` nace en `opacity: 0` y solo aparece con `.visible`, así que al recrear los nodos **toda** la lista repetía su animación de entrada (el flash), se perdía el detalle ya inyectado en las expandidas y se recargaban todas las imágenes.

Detalles del append:

- El orden del DOM queda igual que con `_renderAll()`: `[tarjetas…, nuevas…, loadMore, status, footer]`. Para eso `_insertBeforeTrailing()` inserta antes del **primer** elemento del bloque final (`.timeline-load-more-item`, `.timeline-status-item` o `.timeline-footer-item`), mientras que `_insertBeforeFooter()` —usado por la fila de status y por el botón— solo mira el footer.
- El botón de "Cargar más" **se conserva** entre páginas: su handler lee `this._apiPage` y `this._apiLoading` en el momento del click, no por closure, así que un solo nodo sirve para todas. Solo se elimina cuando `_hasMorePages()` pasa a `false`. (En modo local sí hay que re-crearlo, porque ahí el handler captura `start`/`end`; y su rama local es la que refresca el conteo de la fila de status, porque el click no pasa por `_renderAll()`.)
- Las tarjetas nuevas se pasan solas a `_setupTimelineObserver(added)`, que acepta un scope opcional: las viejas ya están `visible` y las observable su propio observer, así que no hay que re-observarlas.
- El stack de featured **no** se re-renderiza: solo se ve con el timeline colapsado, y el botón "Cargar más" vive adentro del timeline (`max-height: 0` + `overflow: hidden` cuando está colapsado), así que es inalcanzable en ese estado. Además el stack debería reflejar la página 1, no la última.

## Estado en la URL (`stateInUrl`)

Con la opción activa la barra de direcciones es un link compartible de la vista. El estado viaja con el **mismo vocabulario que `_buildQueryParams()`** (la request de API), pero bajo el prefijo `tv_` para no pisar los params del consumidor:

| Param | Origen en el componente |
|-------|-------------------------|
| `tv_q` | `searchTerm` |
| `tv_<field>` | `_filterActiveValues(f)`, CSV de los tokens |
| `tv_sortBy` + `tv_sort` | `_sortField` + `_sortAsc` |
| `tv_tax` | `_currentLabel()` (el **label**, no el índice) |
| `tv_page` | `_currentPage()`, solo con `pagination: true` |

Cuatro métodos, y el orden entre ellos es lo que sostiene el resto:

1. `_readUrlState()`, desde el **constructor** y antes de `_init()`: deja `searchTerm`, `_sortField`/`_sortAsc`, `_contentIndex` y `_urlPage` ya puestos, para que el primer render y el primer request de API salgan con lo que el link pide. Lo que no puede resolver lo tira en silencio (un campo no declarado, un valor que ya no existe, un sorter o una taxonomía que no están, una página inválida) — sin `console.warn`, porque el caso real es el link de alguien con permisos que abre alguien que no los tiene.
2. `_applyUrlFilterState()`, en `_init()` y **antes** de `_buildFilterCheckboxes()`: pone los tokens crudos en `f.active`, sin cruzarlos contra los valores del grupo, que en API todavía no existen (vienen con `/facets`). Si el cruce se hiciera recién en `_buildFilterCheckboxes()`, la primera request saldría sin filtro y el rebuild de los facets ya no la corregiría.
3. `_restoreUrlPage()`, al final de `_init()` y solo en local: `_applyFilters()` resetea el cursor a la página 1, así que el link se aplica sobre el pool ya filtrado, y se recorta con el mismo clamp de `_goToPage()` (en API, en cambio, es `_fetchPage(this._urlPage)` en el arranque, con un refetch a la 1 si la página del link vuelve vacía).
4. `_syncUrlState()`, desde `_applyFilters()`, `_goToPage()` y `_fetchPage()`: borra **todas** las keys `tv_*` y reescribe las que están en efecto con `history.replaceState` (no `pushState`, y sin `popstate`: es una foto de la vista, no un historial). Los params del consumidor no se tocan. El `_urlReady` lo gatea para que **montar no reescriba el link que acaba de leer**.

La precedencia de los filtros queda en un solo lugar, `_seedFilterActive()`: **URL → `localStorage` (`persist`) → `checked` declarado**. La URL gana porque es lo más explícito y porque es la única que sobrevive a los rebuilds de los checkboxes; un CSV vacío (`tv_x=`) cuenta como "limpiado a propósito", y por eso importa que lo que decida sea si la **key existe**, no si trae valores.

El cruce contra los valores reales del grupo es **por tokens, no por cadenas enteras**, y es lo que hace que el viaje de ida y vuelta del que habla el punto 2 no pierda nada: un `value` declarado puede ser una lista (`[null, false]` es **un** valor cuyo token es `'null,false'`), y como el param de API y el `tv_*` viajan ese token como CSV, releerlo lo devuelve partido. Un valor queda activo cuando **todos** sus tokens llegaron, de modo que el CSV vacío deja el grupo vacío sin ser un caso especial.

## Estados de carga (modo API)

Solo existe en modo API, y se apoya en que una respuesta de lista **sustituye** lo que hay en pantalla:

| Camino | Qué muestra | Quién lo limpia |
|--------|-------------|-----------------|
| Primera página (`_init`) | skeletons | `_renderAll()` |
| Cambio de búsqueda / filtro / orden (`_applyFilters`) | skeletons, en el acto | `_renderAll()` |
| Cambio de página del paginador (`_goToPage` → `_fetchPage`) | skeletons, en el acto | `_renderAll()` |
| "Cargar más" (`_appendPageItems`) | las tarjetas que ya se están leyendo + la fila de status | `_appendTimelineItems` + `_renderStatus` |
| Request fallido | lista vacía + la fila de error | — |

- Un solo trigger: `_renderApiLoading()` se llama desde `_fetchPage()`, o sea en **todo** request que reemplaza la lista. `_init()` y `_applyFilters()` también la llaman, pero por comodidad: para que los placeholders ya estén en pantalla antes de que el request salga (el primero) y antes de que abra la ventana de debounce (el segundo).
- `_renderApiLoading()` es **idempotente**: se llama en cada tecla y varias veces sobre la misma carga, así que una ráfaga muestra el skeleton una sola vez. El estado vive en el DOM (que el placeholder exista), y eso es lo que consulta `_renderStatus()` para no apilar una segunda línea ("Cargando más publicaciones...") debajo de los skeletons. Con `pagination: true` esto también elimina la fila de carga del cambio de página (el "Cargando página N..." que se veía al pie con las cartas de la página anterior todavía en pantalla): los skeletons la reemplazan, así que `_renderStatus()` no vuelve a emitir una línea de carga. Lo que queda de esa fila con el paginador son el error y el conteo ("Mostrando 11-20 de 55"), porque el paginator no reemplaza al conteo: dice cuál es la página, no qué tranche del resultado está en pantalla.
- `_schedulePageReload(immediate)` tiene dos formas porque los disparadores no son alike. Un trigger que cae dentro de una ventana abierta **siempre** rearma la ventana **con** request, así que el último estado de una ráfaga es siempre el último que llega. Con `immediate` (acciones discretas: checkbox, toggle de orden, Escape) el request sale en el acto y la ventana solo traga lo que venga; sin él (escribir en el buscador) es el debounce de cola clásico, porque un request por tecla le pediría al servidor todos los prefijos del término.
- El skeleton no es texto: son elementos `.timeline-skeleton-item` / `.featured-skeleton` con `aria-hidden="true"` y `aria-busy="true"` en `#timeline-cards`, animados con el mismo `@keyframes shimmer` de `.card-iframe-shimmer`. Llevan la clase `visible` desde el markup, que es lo que evita que esperen al IntersectionObserver — y las cartas que llegan a reemplazarlos también nacen visibles, para que no reentren sobre el lugar que el placeholder ya ocupaba (ver "Animaciones de entrada").

## Sistema de filtros

Los filtros **no están hardcodeados**: salen enteros de la opción `filters` del constructor. Cada entrada declara su campo, su label, dónde vive (`group: 'menu'` en el panel, `group: 'filtros_internos'` en el flyout rojo de Filtros internos) y sus valores (declarados con `items`, o derivados del dato, en cuyo caso `allowEmpty` puede sumar el bucket vacío).

El bucket vacío de los filtros es el único valor que **nadie declara**: los ítems que no traen nada para el campo (o no traen el campo) no son un valor del grupo, así que no se ofrecen. Un grupo **sin `items`** que declara `allowEmpty: true` lo agrega como **un valor más**, con el token `'null'` (el mismo que produce `_filterToken()`) y el label fijo `"Sin valor"` (`FILTER_EMPTY_LABEL`, no configurable: el bucket es el mismo en todos los campos). En local sale de los ítems del scope activo; en API, de la clave `"null"` de `facets[field]`, que el backend no tiene que agregar: si el facet no la trae, no hay nada que ofrecer. Reglas:
- Va **siempre al final**, en `_buildFilterCheckboxes()`, que lo mueve ahí *después* del sort (por conteo o el `sortValues` del grupo): ni un grupo colapsado ni un orden deliberado lo dejan en medio.
- Participa del corte "Ver más" como cualquier otro valor, así que puede caer en la cola `filter-option-extra`.
- Es la **única excepción** a la regla de ocultar los grupos derivados con un solo valor: sin `allowEmpty`, un grupo cuyo único valor sería el vacío no se muestra (no hay nada que filtrar); con `allowEmpty` se muestra y filtrar por él deja solo los ítems sin valor.
- **Con `items` declarado se ignora en silencio**: ahí el bucket vacío es un valor declarado más (`{ value: null, label: 'Sin tipo' }`), con el label que el consumidor quiera.

El demo declara 8 grupos en `example/filters.js`, la mayoría derivados del dato (y ordenados por conteo cuando hay que truncarlos), con `allowEmpty: true` en los que ofrecen el bucket vacío: los cinco del panel (`tonos_sociales`, `anio_publicacion`, `contenido`, `tipo_fuente` con `maxVisible: 4`, `es_oficial`) y los tres del flyout (`validado`, `capturado`, `descartado`, los tres con `persist: true`). Un grupo derivado **nunca** puede venir tildado (`checked` solo existe en un ítem declarado), así que el recorte por estado lo aplica el usuario desde el flyout; el demo declara `items` —con o sin `checked`— en los grupos que quieren labels propios ("Sin descartar", "Sin fecha"...). El mock trae los campos ya clasificados (`contenido`, `anio_publicacion`, `tipo_fuente`), así que ni el demo ni `example/server.js` tienen lógica por campo.

Mapa de métodos (líneas actuales):

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_normalizeFilters(filters)` | 595 | Valida la opción `filters`, resuelve defaults (`group`, `persist`, `allowEmpty`, `column`) y normaliza el `label` a string (ausente / `null` / en blanco queda `''`, sin descartar el grupo), resuelve los `items` de cada grupo y reparte los grupos `'menu'` en dos columnas (la primera mitad de la declaración a la columna 0, el resto a la 1) |
| `_resolveFilterItems(field, items)` | 666 | Convierte los `items` declarados en los tokens de los checkboxes: `token` (los valores unidos por comas, que es el `input.value` y el query param) + `tokens` (uno por valor, para comparar contra el ítem), más `label` y `checked`. Devuelve `null` con warning si la declaración no se puede usar (vacía, un ítem sin `label` / sin `value`, tokens repetidos, un valor con coma) |
| `_buildFilterOptionsHtml(f)` | 752 | Markup del slot de un grupo: `.filter-section` + `.filter-header` (solo si `f.label` no está vacío) + `.filter-options[data-filter-field]`, **idéntico para los dos destinos**: el flyout de `filtros_internos` también muestra headers, y un grupo sin `label` se dibuja igual, solo que sin header. El `id` es solo un handle de debug: el wiring va por `data-filter-field`, así un `field` inválido como selector CSS no rompe nada |
| `_buildFilterMenuHtml()` | 768 | Markup del panel `.filter-wrap` (botón `#filter-toggle` + `#filter-menu`) con las dos columnas. `''` si no hay grupos `'menu'` |
| `_buildInternalButtonsHtml()` | 789 | Markup del toolbar interno: toggle de notas de trabajo +, si hay grupos `'filtros_internos'`, el `.filtros-internos-wrap` con `#filtros-internos-toggle` y `#filtros-internos-menu`. Ambos condicionales a `internalButtons` y a la opción `filters` |
| `_attachFilterOptions()` | 900 | Apunta cada `FilterDef.options` al slot que `_buildLayout` le renderizó (lookup por `data-filter-field`). Un grupo sin slot (ej. `'filtros_internos'` sin `internalButtons`) conserva su config y `_buildFilterCheckboxes` simplemente lo esquiva |
| `_filterToken(value)` | 2271 | El token de un valor crudo: `String(value)`, con `null` / `undefined` como `'null'`. Todo el matching y los query params pasan por acá |
| `_filterValuesOf(f, item)` | 2282 | Tokens que un ítem lleva para el grupo: lo que devuelve `extract`, o `item[field]` (arrays expandidos, todo tokenizado). Un `null` / `undefined` **es** el token `'null'`, así que matchea el valor que lo declara; un grupo derivado los descarta al armar la lista de valores, porque ahí no hay nadie a quien atribuírselos |
| `_filterActiveTokens(f)` | 2292 | Los tokens que el grupo está filtrando: los `input.value` de los checkboxes tildados, partidos por comas (un `value: [false, null]` aporta los dos). Lo usan tanto `_applyFilters()` como la cuenta de `_buildFilterCheckboxes()` |
| `_filterLabelOf(f, value)` | 2302 | Label de un valor de un grupo **derivado**: lo que devuelve `formatLabel`, o el valor mismo salvo `true` → "Sí" / `false` → "No". Un valor declarado trae su `label` en el `items` y no pasa por acá |
| `_filterMaxVisible(f)` | 2262 | Resuelve el corte "Ver más": `f.maxVisible`, o el default `DEFAULT_FILTER_MAX_VISIBLE = 5`. Debajo de 2 no hay corte |
| `_buildFilterCheckboxes()` | 2315 | Construye los checkboxes de cada grupo con sus valores y conteos (ver flujo abajo) y aplica el corte "Ver más". En la rama derivada también decide si ofrece el bucket vacío (`allowEmpty`), y en todo caso lo deja último |
| `_buildFilterMore(f, overflow)` | 2477 | Agrega el `button.filter-more` al final del grupo colapsado y lo deja en su estado inicial (abierto si el grupo tiene algún valor tildado) |
| `_loadPersistedFilterState()` | 2507 | Lee la key `tv-filtros-internos-filters` de `localStorage` (los valores son los `input.value`, o sea tokens) |
| `_savePersistedFilterState()` | 2519 | Escribe el estado de los grupos con `persist: true` (solo en el gesture del usuario) |
| `_seedFilterActive(f, values, savedState)` | 3195 | Con qué valores arranca un grupo en cada rebuild: **URL → `localStorage` (`persist`) → `checked` declarado**, en ese orden, y el cruce es **por tokens** (un valor declarado con lista es un solo token que es un CSV). Que la URL gane es lo que hace que un filtro compartido sobreviva a los rebuilds (los facets de API, un cambio de taxonomía) |
| `_buildQueryParams(page)` | 2605 | Arma los params de la request de lista: los tokens tildados de cada grupo unidos por comas (`validado=false,null`), más `page`/`pageSize`, `sort` (dirección) y `sortBy` (el sorter activo). Es el mismo vocabulario que usa la URL del navegador (ver [Estado en la URL](#estado-en-la-url)) |
| `_syncFilterToggleState()` | 2961 | Enciende los botones por dominio (ver arriba) |

Flujo:

1. `_normalizeFilters()` valida la opción (y `_resolveFilterItems()` resuelve los `items`) y `_buildLayout()` + `_attachFilterOptions()` crean los slots.
2. `_buildFilterCheckboxes()` obtiene valores y conteos por grupo, en dos ramas: un grupo **con `items`** muestra esos valores, en ese orden, y solo los cuenta (en local sobre el **scope activo**; en API sobre `GET {url}/facets`, con `(0)` para lo que el server todavía no mandó); un grupo **sin `items`** deriva los valores del dato (en local los tokens únicos del scope, en API las claves de los facets), descarta el token vacío salvo que declare `allowEmpty`, y los ordena por conteo cuando hay que truncarlo (el bucket vacío, si está, se mueve al final después de ese sort). En API los checkboxes se arman **dos veces y solo dos**: sin conteos al iniciar (para que los `checked` ya viajen en la primera request) y otra vez cuando llegan los facets — nunca en cada página, porque recrearlos borraría el estado de los grupos sin `persist`. Los grupos con `items` funcionan sin facets (con los conteos en cero); los derivados quedan ocultos hasta que llegan.
3. Al cambiar un checkbox, `_applyFilters(true)` filtra el scope activo con **AND entre grupos, OR dentro de cada uno** (además de la búsqueda), y `_renderAll()` re-renderiza. En modo API el paso no filtra nada local: `_applyFilters()` delega en `_schedulePageReload(immediate)` y el `true` pide el borde de entrada del debounce (el `input` del buscador es el único trigger que no lo pasa, porque cada tecla es un prefijo del término).

El texto que se muestra de cada valor no lo decide el control sino un solo lugar, `_filterOptionLabel()`: el `label` de un `items` declarado, el `"Sin valor"` fijo del bucket vacío de `allowEmpty`, el `labels` que el backend manda en `GET {url}/facets` (en API), o `_filterLabelOf()` con lo que deduzca del token. Por eso el mismo valor se lee igual en un checkbox, en una fila del `select`, en un chip y en un `title`, y por eso el `labels` del backend (que se busca por el token crudo, `_apiFacetLabel()`) alcanza los dos controles sin duplicar nada: el token sigue siendo lo que se filtra y lo que viaja en el query param, el label solo se lee.
4. El sort se re-aplica después del filtrado (`_sortBy()`): ordena por el sorter activo (`_sortField` + `_sortAsc`) con una comparación natural y estable. Un valor ausente es el más chico, así que en `desc` los ítems sin valor van **últimos** y en `asc` **primeros**, y los empates conservan el orden de origen.

El botón activo es **por dominio**: `_syncFilterToggleState()` enciende `#filter-toggle` solo con los grupos `group !== 'filtros_internos'` y `#filtros-internos-toggle` solo con los `'filtros_internos'`. El puntito del panel lo deciden los grupos del panel; un `validado`/`capturado`/`descartado` activo enciende únicamente el botón rojo del flyout.

En modo API el botón del panel aparece desde el arranque **pero inerte**: hasta que llegan los facets no tiene listener (`_bindFilterToggle` corre en el `.then()` de `_ensureApiFacets()`, una sola vez) y el panel no tiene nada que abrir. El `#filtros-internos-toggle`, en cambio, se bindea siempre en `_bindBaseEvents()`.

### Grupos largos: el toggle "Ver más (N)"

Un grupo con muchos valores (`tipo_fuente` con 7 en el demo) puede tener más de los que entran cómodo en el menú. `_buildFilterCheckboxes()` recorta con la resolución de `_filterMaxVisible(f)` y `_buildFilterMore()` agrega el botón:

- El corte se aplica **solo cuando el grupo lo supera**, y es **por grupo** (`maxVisible`, default `DEFAULT_FILTER_MAX_VISIBLE = 5`): la opción global `filtersMaxVisible` ya no existe.
- **El corte respeta el orden que el grupo ya tiene.** Un grupo con `items` muestra los primeros declarados y esconde la cola (el botón revela lo que el consumidor dejó afuera); un grupo derivado se ordena por conteo antes de truncar (`counts[b] - counts[a]`; `sort` es estable, así que los empates conservan el orden previo), salvo que declare `sortValues`, cuyo orden es intencional y solo se trunca.
- La cola se marca `label.filter-option.filter-option-extra` + `hidden`, y `_buildFilterMore()` pone al final del `.filter-options` el `button.filter-more` ("Ver más (N)" ⇄ "Ver menos", con `aria-expanded`).
- **La visibilidad la manda el SCSS**, no el atributo `hidden`: `.filter-menu .filter-option` tiene `display: flex` de autor, que le gana a la regla `[hidden]` de la UA (mismo motivo que obliga a `.taxonomy-row[hidden]`), así que hacen falta las reglas `.filter-option-extra { display: none }` y `.filter-options.expanded .filter-option-extra { display: flex }` al mismo peso. El `hidden` se mantiene igualado.
- **Un grupo con algún checkbox tildado nunca queda colapsado** (`f.checkboxes.some(cb => cb.checked)`): un filtro aplicado desde un valor invisible es peor que un grupo una línea más largo. También se reabre solo en los rebuilds.
- El estado de apertura vive en `_filterExpanded: Set<string>`, no en el DOM, porque los checkboxes se reconstruyen (facets de API, re-scope de taxonomía) y el estado tiene que sobrevivir, igual que los toggles de taxonomías. La key es el `field` del grupo.
- El click **no llama a `_applyFilters()`**: no es un filtro, es UI, y no debe re-renderizar el timeline.

## Animaciones de entrada

Son transiciones de clase, no `@keyframes`: el elemento nace en su estado inicial y una clase lo lleva al final. `.timeline-item` va de `opacity: 0` + `translateY(30px)` al estado visible en 0.3s; `.featured-card`, de `translateX(-40px) rotateX(8deg)` en 0.6s.

Usan `IntersectionObserver` (sin librerías externas):

- **Timeline items**: un observer por cada `.timeline-item`, con root en el **viewport** (no lleva `root`, así que `#timeline-cards` sigue siendo su propia caja con scroll), threshold 0.1 y rootMargin `0px 0px 100px 0px`. Agrega `.visible` y se desuscribe: es un latch de una sola vez.
- **Featured cards**: sin observer — la entrada la dispara un `requestAnimationFrame` en `_renderAll()` / `_init()`. `_setupObserver()` es código muerto. El efecto cascada no es un `index * 0.08s` calculado en JS: es la tabla `@for` de `nth-child` del SCSS, que reparte `transition-delay` (0s…0.9s), `left`, `z-index` y `scale` por posición.

El `requestAnimationFrame` no es decorativo: sin él la clase estaría presente en el mismo frame que la inserción y la transición no correría, porque el navegador no tendría un valor computado previo desde el cual transicionar.

**La excepción: los placeholders y las cartas que los reemplazan.** Los skeletons nacen con `visible` en el markup, así que no se animan. Y cuando `_renderAll()` los baja, `_renderTimeline()` recibe `instant` y las cartas reales nacen **también** con `visible`: el placeholder ya ocupaba ese lugar, así que un slide encima se leía como un glitch. `instant` sale de mirar el DOM antes de `_clearApiLoading()` (el mismo criterio que usa `_renderStatus()`), y cuando va en `true` el observer se saltea, porque su único efecto es agregar `visible`. Alcance: la rama API de `_renderAll()` —primera carga, búsqueda/filtro/orden y salto de página—, o sea todo lo que pasa por `_renderApiLoading()`. El stack featured conserva su slide escalonado, y "Cargar más" y el modo local también, porque ninguno de los dos tuvo skeletons.

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
| `inlineImages` | `boolean` | Muestra thumbnails de `imagenes` inline en la tarjeta expandida (opción del constructor) |
| `inlineAdjuntos` | `boolean` | Muestra `adjuntos` inline en la tarjeta expandida (nombre + icono por tipo) (opción del constructor) |
| `singleId` | `string \| null` | Cuando está seteado, renderiza una única tarjeta ya expandida (modo single) |
| `fullpage` | `boolean` | Modo fullpage (opción del constructor): fuerza `isExpanded`, bloquea el colapso, no emite el resize handle y no renderiza las featured cards |
| `temasMapTiles` | `string` | Plantilla `{z}/{x}/{y}` de la capa base del mapa de temas (default OpenStreetMap). `''` la apaga y deja solo los puntos |
| `temasMapAttribution` | `string` | Crédito de la capa base (default OpenStreetMap, como HTML). `''` no muestra atribución: sin capa base (`temasMapTiles: ''`) tampoco, porque no hay tiles que acreditar |
| `_temasMaps` | `Map<HTMLElement, TemasMapHandle>` | Mapas OpenLayers vivos por canvas, para poder destruirlos cuando la lista se rearma |
| `lastUpdated` | `string` | Timestamp para el footer |
| `isExpanded` | `boolean` | Estado actual (featured vs timeline) |
| `sorters` | `SortDef[]` | Sorters normalizados de la opción `sorters` (con `default` resuelto a boolean). Vacío = sin UI de orden |
| `_sortField` | `string` | Campo por el que se ordena (el sorter activo, o `fecha_publicacion` sin `sorters`) |
| `_sortAsc` | `boolean` | Dirección del orden (`false` = descendente, "más reciente primero") |
| `filters` | `FilterDef[]` | Grupos normalizados de la opción `filters` (defaults resueltos, `items` resueltos en `declared`, columnas repartidas, slots DOM y `checkboxes`). Vacío = sin filtros |
| `_filterExpanded` | `Set<string>` | Grupos de filtros (por `field`) con el "Ver más" abierto (sobrevive a los rebuilds de los checkboxes) |
| `stateInUrl` | `boolean` | Con la opción activa, la URL del navegador es un link compartible de la vista (ver [Estado en la URL](#estado-en-la-url)). No-op en modo single |
| `_urlFilters` | `Record<string, string[]> \| null` | Tokens del link por `field`, leídos una vez; `null` con la opción apagada. Vive fuera de los `FilterDef` a propósito: es lo que sobrevive a los rebuilds de los checkboxes |
| `_urlPage` | `number` | Página que pidió el link (1 si no pidió ninguna) |
| `_urlReady` | `boolean` | Si el componente ya montó. Lo gatea para que el arranque no reescriba la URL que acaba de leer |
| `section` | `HTMLElement` | `.publicaciones-section` |
| `featuredContainer` | `HTMLElement` | `#featured-cards` |
| `timelineContainer` | `HTMLElement` | `#timeline-container` |
| `timelineCards` | `HTMLElement` | `#timeline-cards` |
| `expandToggle` | `HTMLElement` | `#expand-toggle` |
| `remainingCount` | `HTMLElement` | `#remaining-count` |
| `expandIcon` | `HTMLElement` | `#expand-icon` |
| `sortToggle` | `HTMLElement \| null` | `#sort-toggle` (null cuando la opción `sorters` no declara ninguna entrada, y entonces no se renderiza) |
| `sortMenu` | `HTMLElement \| null` | `#sort-menu` (el desplegable del orden) |
| `filterToggle` | `HTMLElement \| null` | `#filter-toggle` (sus listeners/estilo se resguardan de `null`: sin grupos `'menu'` no se renderiza) |
| `filterMenu` | `HTMLElement \| null` | `#filter-menu` |
| `workNotesToggle` | `HTMLElement` | `#work-notes-toggle` (solo con `internalButtons: true`) |
| `filtrosInternosWrap` | `HTMLElement` | `.filtros-internos-wrap` (`#filtros-internos-wrap`) |
| `filtrosInternosToggle` | `HTMLElement` | `#filtros-internos-toggle` — el botón rojo del flyout de filtros internos |
| `filtrosInternosMenu` | `HTMLElement` | `#filtros-internos-menu` — el flyout con los grupos `group: 'filtros_internos'` |
| `_lgInstance` | `LightGallery \| null` | Instancia actual de lightGallery |
| `_shareTimer` | `number` | Timer del ícono de confirmación tras copiar al portapapeles (`0` = inactivo) |
| `_lgContainer` | `HTMLElement \| null` | Container para lightGallery |

## Estados CSS del componente

| Clase | Elemento | Descripción |
|-------|----------|-------------|
| `.expanded` | `.publicaciones-section` | Timeline visible, featured oculto |
| `.has-taxonomy` | `.publicaciones-section` | El selector de taxonomías está activo (`content` con grupos): con el timeline expandido oculta `#remaining-count` porque el contador pasa a verse en la píldora del selector |
| `.fullpage` | `.publicaciones-section` | Modo fullpage (`fullpage: true`): timeline siempre abierto y sin colapsar, sin handle de resize, sin scroll interno en `#timeline-cards` y con `.featured-row` pegada al top. Lo agrega `_buildLayout()` |
| `.expanded` | `.timeline-card` | Tarjeta individual expandida |
| `.visible` | `.featured-card` | Tarjeta featured animada (entró en viewport) |
| `.visible` | `.timeline-item` | Timeline item animado (entró en viewport) |
| `.loaded` | `.card-image` | Imagen cargada (quita shimmer) |
| `.loaded` | `.card-inline-thumb` | Thumbnail inline cargado (quita shimmer) |
| `.loaded` | `.card-iframe-wrap` | Iframe/embed cargado. Un `video` **nunca** recibe esta clase: no tiene shimmer que bajar |
| *(inline)* | `.card-iframe-video` | `style.aspectRatio` con el ratio real del archivo, copiado de `videoWidth`/`videoHeight` en `_processCardEmbeds()` |
| `.open` | `.filter-menu` | Menú de filtros abierto |
| `.open` | `.filtros-internos-menu` | Flyout de estado interno abierto (junto a `.open` en `#filtros-internos-toggle`) |
| `.expanded` | `.filter-options` | Grupo de filtros con el "Ver más" abierto: muestra los `label.filter-option-extra` (la visibilidad la decide esta clase, no el atributo `hidden`) |
| `.open` | `.card-info-menu` | Menú de info de tarjeta abierto |
| `tv-share-toast` | `.card-share-toast` | Animación del cartelito "Copiado al portapapeles!" (fade in/out, 1.5s) |
| `.active` | `.filter-toggle` | Filtros del panel activos (al menos un grupo `'menu'` con algún valor seleccionado; los `'filtros_internos'` no lo encienden) |
| `.active` | `.filtros-internos-toggle` | Filtros del flyout activos (algún grupo `'filtros_internos'` con algún valor seleccionado) |
| `.asc` | `.sort-toggle` | Orden ascendente activo |
| `.rotated` | `.expand-icon` | Icono de expand rotado 180° |

## Artefactos de build (`dist/`)

`dist/` contiene solo salida compilada (JS, `.d.ts`, CSS). No se edita a mano: cualquier cambio se hace en `src/` y se regenera con `npm run build`.

## Mock ↔ Interfaces ↔ README

`example/mock-data.js` es la fuente de verdad de los datos. Todo cambio de campos en el mock (agregar, renombrar o eliminar) debe aplicarse en el mismo commit a la interfaz `TimelineItem` (`src/TimelineViewer.ts`), regenerar `dist/TimelineViewer.d.ts` (`npm run build`) y actualizar la tabla de campos de `README.md`. Ver también `AGENTS.md`.
