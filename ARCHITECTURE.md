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
     │                ├── featuredContainer → _toggleExpand()│
     │                ├── sortToggle → _toggleSort()  │ │
     │                ├── filterToggle → toggle menu  │ │
     │                └── document click → close menus│ │
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
| `_buildLayout()` | 426 | Inyecta el HTML skeleton completo, cachea 12+ referencias DOM |
| `_renderAll()` | 2476 | Renderiza featured + timeline + load-more. Método principal de "refresh" (rebuild completo) |
| `_renderFeatured(cards)` | 941 | Renderiza el stack de tarjetas superpuestas |
| `_renderTimeline(cards)` | 1608 | Renderiza la lista de tarjetas del timeline desde cero (`innerHTML = ''`) |
| `_appendTimelineItems(items, startIndex)` | 1639 | Agrega tarjetas al final **sin tocar las existentes** (paginación de API) y devuelve los nodos creados para observarlos |
| `_createTimelineItem(card, index)` | 971 | Crea una tarjeta individual con todos sus event listeners |
| `_renderLoadMoreButton()` | 2511 | Agrega el botón "Cargar más" al final del timeline |
| `_insertBeforeFooter(el)` | 1580 | Helper: inserta antes del footer o al final si no hay footer |
| `_insertBeforeTrailing(el)` | 1596 | Helper: inserta al final de las tarjetas, antes del bloque final (load-more / status / footer) |
| `_appendPageItems()` | 2193 | Modo API: pide la página siguiente y **agrega** las tarjetas nuevas, sin rebuild. Saca el botón de "Cargar más" si `_hasMorePages()` pasa a `false` |
| `_renderApiLoading()` | 2308 | Modo API: reemplaza lista y stack de destacadas por tarjetas fantasma (shimmer) mientras llega una respuesta que las va a sustituir |
| `_clearApiLoading()` | 2372 | Modo API: baja el estado de carga (skeletons + `aria-busy`) sin tocar nada más. La respuesta real lo llama desde `_renderAll`; el fallo, desde el `catch` de `_fetchPage` |
| `_renderStatus()` | 2379 | Fila de status al pie de la lista: cargando / error / "Mostrando X de Y". Se abstiene mientras hay skeletons |
| `_renderSingleCard()` | 2639 | Modo single (`singleId`): renderiza una única tarjeta ya expandida sin chrome de timeline |
| `_buildTaxonomies(taxonomias)` | 1217 | Modo single: markup del bloque de links de navegación que el propio ítem declara en `taxonomias`. Filtra grupos/items incompletos y devuelve `''` si no hay nada que renderizar |
| `_appendTaxonomies(taxonomias)` | 1244 | Inserta el bloque de taxonomías al final de la `.publicaciones-section` en modo single. Sin datos: no se invoca (en el camino de "article not found" no hay ítem del cual leerlas) |

### UI/Interacción

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_toggleExpand(scrollTo?)` | 678 | Alterna entre vista featured (colapsada) y timeline (expandida) |
| `_scrollToSection()` | 712 | Smooth scroll para hacer visible el timeline |
| `_toggleSort()` | 728 | Invierte orden ascendente/descendente por fecha |
| `_buildFilterCheckboxes()` | 735 | Construye checkboxes desde valores únicos de los datos |
| `_applyFilters()` | 2283 | Filtra datos y re-renderiza todo. En modo API el parámetro `immediate` pide el borde de entrada del debounce |

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
| `_getFileExt(url)` | — | Extrae la extensión de una URL en minúsculas |
| `_fileIconSvg(ext)` | — | SVG de icono de archivo según extensión (pdf vs genérico) |
| `_openLightGallery(images, title, showFileName, startIndex?)` | 228 | Abre modal lightGallery con galería de imágenes |
| `_absoluteUrl(url)` | 810 | Resuelve una URL del ítem contra `window.location.href` para poder compartirla (devuelve el valor crudo si no es una URL válida). Se usa con `link_view_entry` |
| `_escapeHtml(value)` | 773 | Escapa `& < > " '` para interpolar texto plano en markup o atributos. Se usa en los valores del dato de `taxonomias` (`content`, `link` y `label`), que siempre son texto plano |

### Observers

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_setupObserver()` | 570 | IntersectionObserver para animación de entrada de featured cards |
| `_setupTimelineObserver(items?)` | 1698 | IntersectionObserver para animación de entrada de timeline items. `items` acota qué se observa (la paginación pasa solo las tarjetas nuevas); por defecto observa todas las `.timeline-item` del container |

## Estructura DOM

El componente inyecta la siguiente jerarquía en el `container` del consumidor:

```html
<section class="publicaciones-section" id="publicaciones-section">
  ├── .featured-row
  │   ├── .noticias-top
  │   │   ├── button.expand-toggle (#expand-toggle)
  │   │   │   ├── span.expand-text (contiene #remaining-count + #remaining-text; con taxonomías, #remaining-count se oculta al expandir)
  │   │   │   └── span.expand-icon (#expand-icon)
  │   │   ├── .filter-wrap
  │   │   │   ├── button.filter-toggle (#filter-toggle)
  │   │   │   └── div.filter-menu (#filter-menu)
  │   │   │       ├── .filter-header.filter-submenu-trigger.filter-submenu-trigger-top (Estado interno ▶)
  │   │   │       ├── .filter-column
  │   │   │       │   ├── .filter-section > .filter-header + .filter-options#filter-options-tone
  │   │   │       │   ├── .filter-section > .filter-header + .filter-options#filter-options-year
  │   │   │       │   └── .filter-section > .filter-header + .filter-options#filter-options-content
  │   │   │       ├── .filter-column
  │   │   │       │   ├── .filter-section > .filter-header + .filter-options#filter-options-source
  │   │   │       │   └── .filter-section > .filter-header + .filter-options#filter-options-oficial
  │   │   │       └── .filter-menu-sub (#filter-menu-sub)
  │   │   │           └── .filter-section
  │   │   │               ├── .filter-options#filter-options-validado
  │   │   │               ├── .filter-options#filter-options-capturado
  │   │   │               └── .filter-options#filter-options-descartado
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
│   │           ├── .card-temas > .tema-item × N
│   │           ├── .card-hint
│   │           ├── button.card-collapse
              │   │           ├── button.card-info-btn
              │   │           ├── button.card-share-btn (si `link_view_entry`, a la derecha del de info)
              │   │           ├── .card-share-toast (transitorio, al copiar al portapapeles)
              │   │           ├── .card-info-menu
              │   │           │   └── a.card-info-link (si `link_view_entry`) > span.card-info-value + svg


│   │           ├── .card-protagonista
│   │           ├── .card-fuente
│   │           ├── .card-iframe-wrap (YouTube/Instagram/Twitter/Facebook, publicación original)
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
└── .single-taxonomies (si la card declara `taxonomias` y hay algo renderizable)
    └── .single-taxonomy × N
        ├── .single-taxonomy-label (texto plano, crop con `...`, texto completo en `title`)
        └── .single-taxonomy-list
            └── li > a.single-taxonomy-link × N  (target=_blank, rel=noopener)
                └── texto escapado
```

El bloque de taxonomías se inserta al final de la sección con `_appendTaxonomies(card.taxonomias)`, **solo cuando la card se pudo cargar**: los grupos vienen en el propio ítem (en modo API viajan en el detalle de `GET {url}/:id`), así que en el camino de "article not found" no hay datos y no se inserta nada. Los grupos con `label` vacío, `items` vacío, o items sin `content`/`link` se descartan; si no queda ningún grupo, no se inyecta markup. Sus estilos viven dentro de `&.single-mode` en `styles.scss`, así que solo existen en este modo.

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

El rebuild es lo correcto cuando lo que hay en pantalla ya no son los artículos en memoria: `_fetchPage(1)` tras una búsqueda/filtro/orden y el re-scope de una taxonomía reemplazan el conjunto, y ahí `_renderTimeline()` hace falta. "Cargar más" es el caso contrario —las tarjetas visibles siguen siendo correctas— y un rebuild en cada página se notaba: `.timeline-item` nace en `opacity: 0` y solo aparece con `.visible`, así que al recrear los nodos **toda** la lista repetía su animación de entrada (el flash), se perdía el detalle ya inyectado en las expandidas y se recargaban todas las imágenes.

Detalles del append:

- El orden del DOM queda igual que con `_renderAll()`: `[tarjetas…, nuevas…, loadMore, status, footer]`. Para eso `_insertBeforeTrailing()` inserta antes del **primer** elemento del bloque final (`.timeline-load-more-item`, `.timeline-status-item` o `.timeline-footer-item`), mientras que `_insertBeforeFooter()` —usado por la fila de status y por el botón— solo mira el footer.
- El botón de "Cargar más" **se conserva** entre páginas: su handler lee `this._apiPage` y `this._apiLoading` en el momento del click, no por closure, así que un solo nodo sirve para todas. Solo se elimina cuando `_hasMorePages()` pasa a `false`. (En modo local sí hay que re-crearlo, porque ahí el handler captura `start`/`end`.)
- Las tarjetas nuevas se pasan solas a `_setupTimelineObserver(added)`, que acepta un scope opcional: las viejas ya están `visible` y las observable su propio observer, así que no hay que re-observarlas.
- El stack de featured **no** se re-renderiza: solo se ve con el timeline colapsado, y el botón "Cargar más" vive adentro del timeline (`max-height: 0` + `overflow: hidden` cuando está colapsado), así que es inalcanzable en ese estado. Además el stack debería reflejar la página 1, no la última.

## Estados de carga (modo API)

Solo existe en modo API, y se apoya en que una respuesta de lista **sustituye** lo que hay en pantalla:

| Camino | Qué muestra | Quién lo limpia |
|--------|-------------|-----------------|
| Primera página (`_init`) | skeletons | `_renderAll()` |
| Cambio de búsqueda / filtro / orden (`_applyFilters`) | skeletons, en el acto | `_renderAll()` |
| "Cargar más" (`_appendPageItems`) | las tarjetas que ya se están leyendo + la fila de status | `_appendTimelineItems` + `_renderStatus` |
| Request fallido | lista vacía + la fila de error | — |

- `_renderApiLoading()` es **idempotente**: se llama en cada tecla, así que una ráfaga muestra el skeleton una sola vez. El estado vive en el DOM (que el placeholder exista), y eso es lo que consulta `_renderStatus()` para no apilar una segunda línea ("Cargando más publicaciones...") debajo de los skeletons.
- `_schedulePageReload(immediate)` tiene dos formas porque los disparadores no son alike. Un trigger que cae dentro de una ventana abierta **siempre** rearma la ventana **con** request, así que el último estado de una ráfaga es siempre el último que llega. Con `immediate` (acciones discretas: checkbox, toggle de orden, Escape) el request sale en el acto y la ventana solo traga lo que venga; sin él (escribir en el buscador) es el debounce de cola clásico, porque un request por tecla le pediría al servidor todos los prefijos del término.
- El skeleton no es texto: son elementos `.timeline-skeleton-item` / `.featured-skeleton` con `aria-hidden="true"` y `aria-busy="true"` en `#timeline-cards`, animados con el mismo `@keyframes shimmer` de `.card-iframe-shimmer`. Llevan la clase `visible` desde el markup, que es lo que evita que esperen al IntersectionObserver.

## Sistema de filtros

Cinco filtros disponibles, generados dinámicamente desde los datos, distribuidos en dos columnas dentro del menú:

| Filtro | Campo | Descripción |
|--------|-------|-------------|
| Tono social | `tonos_sociales` | Array: Positivo / Negativo / Neutro |
| Año publicación | `fecha_publicacion` | Año extraído de `YYYY-MM-DD` (ordena descendente) |
| Tipo de fuente | `tipo_fuente` | Valores únicos presentes en los datos |
| Estado interno | `validado`, `capturado`, `descartado` | Validado / No validado · Capturado / Sin capturar · no descartado (por defecto) / Descartado. Se despliega en un submenu flyout a la derecha del menú (fondo con tinte rojizo). El submenu y su trigger se ocultan automáticamente si ninguno de los tres filtros tiene valores diversos entre los items |
| Contenido | `adjuntos`, `links_videos`, `imagenes` | Con adjuntos / Con video / Con imágenes |

Flujo:
1. `_buildFilterCheckboxes()` extrae valores únicos y crea checkboxes con conteo. En modo API los valores y los conteos salen de `GET {url}/facets`, que se pide una sola vez al iniciar, en paralelo con la primera página (conteos estáticos de la colección completa); los checkboxes se arman dos veces —sin conteos al iniciar, y otra vez con los conteos cuando llegan los facets—, nunca en cada página. La misma respuesta trae el `total` de la colección, que es lo que escribe el contador del botón de expandir en `_renderRelatedCount()`.
2. Al cambiar un checkbox, `_applyFilters(true)` filtra `_originalCards` con AND entre filtros
3. `_renderAll()` re-renderiza con los datos filtrados
4. El sort se re-aplica después del filtrado

En modo API, el paso 2 no filtra nada local: `_applyFilters()` delega en `_schedulePageReload()` (ver [Estados de carga](#estados-de-carga-modo-api)), y el `true` pide que el request salga en el acto en vez de esperar la ventana de 300 ms. El `input` del buscador es el único trigger que no lo pasa, porque cada tecla es un prefijo del término.

## Animaciones de entrada

Usan `IntersectionObserver` (sin librerías externas):

- **Featured cards**: Observer en `section.publicaciones-section` con threshold 0.1. Cuando es visible, agrega `.visible` a todas las featured cards.
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
| `inlineImages` | `boolean` | Muestra thumbnails de `imagenes` inline en la tarjeta expandida (opción del constructor) |
| `inlineAdjuntos` | `boolean` | Muestra `adjuntos` inline en la tarjeta expandida (nombre + icono por tipo) (opción del constructor) |
| `singleId` | `string \| null` | Cuando está seteado, renderiza una única tarjeta ya expandida (modo single) |
| `fullpage` | `boolean` | Modo fullpage (opción del constructor): fuerza `isExpanded`, bloquea el colapso, no emite el resize handle y no renderiza las featured cards |
| `lastUpdated` | `string` | Timestamp para el footer |
| `isExpanded` | `boolean` | Estado actual (featured vs timeline) |
| `sortAscending` | `boolean` | Dirección del sort |
| `filters` | `FilterDef[]` | Estado de los filtros |
| `section` | `HTMLElement` | `.publicaciones-section` |
| `featuredContainer` | `HTMLElement` | `#featured-cards` |
| `timelineContainer` | `HTMLElement` | `#timeline-container` |
| `timelineCards` | `HTMLElement` | `#timeline-cards` |
| `expandToggle` | `HTMLElement` | `#expand-toggle` |
| `remainingCount` | `HTMLElement` | `#remaining-count` |
| `expandIcon` | `HTMLElement` | `#expand-icon` |
| `sortToggle` | `HTMLElement` | `#sort-toggle` |
| `filterToggle` | `HTMLElement` | `#filter-toggle` |
| `filterMenu` | `HTMLElement` | `#filter-menu` |
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
| `.loaded` | `.card-iframe-wrap` | Iframe/embed cargado |
| `.open` | `.filter-menu` | Menú de filtros abierto |
| `.open` | `.card-info-menu` | Menú de info de tarjeta abierto |
| `tv-share-toast` | `.card-share-toast` | Animación del cartelito "Copiado al portapapeles!" (fade in/out, 1.5s) |
| `.active` | `.filter-toggle` | Filtros activos (al menos uno seleccionado) |
| `.asc` | `.sort-toggle` | Orden ascendente activo |
| `.rotated` | `.expand-icon` | Icono de expand rotado 180° |

## Artefactos de build (`dist/`)

`dist/` contiene solo salida compilada (JS, `.d.ts`, CSS). No se edita a mano: cualquier cambio se hace en `src/` y se regenera con `npm run build`.

## Mock ↔ Interfaces ↔ README

`example/mock-data.js` es la fuente de verdad de los datos. Todo cambio de campos en el mock (agregar, renombrar o eliminar) debe aplicarse en el mismo commit a la interfaz `TimelineItem` (`src/TimelineViewer.ts`), regenerar `dist/TimelineViewer.d.ts` (`npm run build`) y actualizar la tabla de campos de `README.md`. Ver también `AGENTS.md`.
