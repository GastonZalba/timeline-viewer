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
| `_toggleExpand(scrollTo?)` | 2005 | Alterna entre vista featured (colapsada) y timeline (expandida) |
| `_scrollToSection()` | 2067 | Smooth scroll para hacer visible el timeline |
| `_toggleSort()` | 2120 | Invierte orden ascendente/descendente por fecha |
| `_applyFilters(immediate)` | 2794 | Filtra datos y re-renderiza todo. En modo API el parámetro `immediate` pide el borde de entrada del debounce. El resto de los métodos de filtros viven en [Sistema de filtros](#sistema-de-filtros) |
| `_syncFilterToggleState()` | 2777 | Enciende `#filter-toggle` / `#estado-toggle` / `#search-toggle` según lo activo en cada dominio (los grupos `estado` solo encienden su propio botón, nunca el del panel) |

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
  │   │   ├── .filter-wrap (solo si la opción `filters` declara grupos `'menu'`)
  │   │   │   ├── button.filter-toggle (#filter-toggle)
  │   │   │   └── div.filter-menu (#filter-menu)
  │   │   │       ├── .filter-column × 2 (la declaración se parte por la mitad)
  │   │   │       │   └── .filter-section > .filter-header + .filter-options[data-filter-field] × N
  │   │   │       │       └── label.filter-option (+ .filter-option-extra ocultas) > input + span.filter-option-label + span.filter-option-count
  │   │   └── button.sort-toggle (#sort-toggle)
  │   │   └── (toolbar interno, solo `internalButtons: true`)
  │   │       ├── button.work-notes-toggle (#work-notes-toggle)
  │   │       └── .estado-wrap (#estado-wrap, solo si hay grupos `group: 'estado'`)
  │   │           ├── button.estado-toggle (#estado-toggle)
  │   │           └── div.estado-menu (#estado-menu)
  │   │               └── .filter-options[data-filter-field] × N (validado / capturado / descartado)
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

Los filtros **no están hardcodeados**: salen enteros de la opción `filters` del constructor. Cada entrada declara su campo, su label, dónde vive (`group: 'menu'` en el panel, `group: 'estado'` en el flyout rojo de Estado interno) y sus valores (fijos con `values`, o derivados). Sin la opción no hay panel, ni botones, ni params de API. Los grupos inválidos o duplicados se descartan con `console.warn` (`_warnFilter`), no rompen la opción entera: un typo se nota pero no tumba el toolbar.

El demo declara los 8 grupos en `example/filters.js`: los cinco del panel (`tonos_sociales`, `fecha_publicacion` con `extract` de año y `sortValues`, `contenido` sintético con `extract`, `tipo_fuente` con `sin-tipo`, `es_oficial` booleano partido en dos) y los tres del flyout (`validado`, `capturado`, `descartado`, todos con `values` fijos, `defaultChecked` y `persist: true`).

Mapa de métodos (líneas actuales):

| Método | Línea | Descripción |
|--------|-------|-------------|
| `_normalizeFilters(filters)` | 545 | Valida la opción `filters`, resuelve defaults (`group`, `persist`, `column`) y reparte los grupos `'menu'` en dos columnas (la primera mitad de la declaración a la columna 0, el resto a la 1) |
| `_buildFilterOptionsHtml(f)` | 651 | Markup del slot de un grupo: `.filter-section` + `.filter-header` (label) + `.filter-options[data-filter-field]` para los `'menu'`; un `.filter-options` pelado para los `'estado'` (el flyout no tiene headers). El `id` es solo un handle de debug: el wiring va por `data-filter-field`, así un `field` inválido como selector CSS no rompe nada |
| `_buildFilterMenuHtml()` | 667 | Markup del panel `.filter-wrap` (botón `#filter-toggle` + `#filter-menu`) con las dos columnas. `''` si no hay grupos `'menu'` |
| `_buildInternalButtonsHtml()` | 688 | Markup del toolbar interno: toggle de notas de trabajo +, si hay grupos `'estado'`, el `.estado-wrap` con `#estado-toggle` y `#estado-menu`. Ambos condicionales a `internalButtons` y a la opción `filters` |
| `_attachFilterOptions()` | 798 | Apunta cada `FilterDef.options` al slot que `_buildLayout` le renderizó (lookup por `data-filter-field`). Un grupo sin slot (ej. `'estado'` sin `internalButtons`) conserva su config y `_buildFilterCheckboxes` simplemente lo esquiva |
| `_filterValuesOf(f, item)` | 2177 | Valores que un ítem lleva para el grupo: lo que devuelve `extract`, o `item[field]` (arrays expandidos, todo stringificado). Un `null` / `undefined` es "sin valor": por eso un boolean necesita `extract` propio si "no hay valor" tiene que ser un valor |
| `_filterLabelOf(f, value)` | 2187 | Label de un valor: lo que devuelve `formatLabel`, o el valor mismo salvo `true` → "Sí" / `false` → "No" |
| `_filterMaxVisible(f)` | 2162 | Resuelve el corte "Ver más": `f.maxVisible` primero, luego `filtersMaxVisible` (número global o record por campo), y el default `DEFAULT_FILTER_MAX_VISIBLE = 5`. Debajo de 2 no hay corte |
| `_buildFilterCheckboxes()` | 2200 | Construye los checkboxes de cada grupo con sus valores y conteos (ver flujo abajo) y aplica el corte "Ver más" |
| `_buildFilterMore(f, overflow)` | 2312 | Agrega el `button.filter-more` al final del grupo colapsado y lo deja en su estado inicial (abierto si el grupo tiene algún valor tildado) |
| `_loadPersistedFilterState()` | 2342 | Lee la key histórica `tv-estado-filters` de `localStorage` |
| `_savePersistedFilterState()` | 2354 | Escribe el estado de los grupos con `persist: true` (solo en el gesture del usuario) |
| `_syncFilterToggleState()` | 2777 | Enciende los botones por dominio (ver arriba) |

Flujo:
1. `_normalizeFilters()` valida la opción y `_buildLayout()` + `_attachFilterOptions()` crean los slots.
2. `_buildFilterCheckboxes()` obtiene valores y conteos por grupo: en local, los valores únicos de `_filterValuesOf(f, ·)` sobre el **scope activo** (`f.values` fijos si el grupo los declara); en API, las claves de `GET {url}/facets` (o las mismas `f.values`). En API los checkboxes se arman **dos veces y solo dos**: sin conteos al iniciar (para que los `defaultChecked` ya viajen en la primera request) y otra vez cuando llegan los facets — nunca en cada página, porque recrearlos borraría el estado de los grupos sin `persist`. Los grupos con `f.values` funcionan sin facets; los que no los tienen quedan ocultos hasta que llegan.
3. Al cambiar un checkbox, `_applyFilters(true)` filtra el scope activo con **AND entre grupos, OR dentro de cada uno** (además de la búsqueda), y `_renderAll()` re-renderiza. En modo API el paso no filtra nada local: `_applyFilters()` delega en `_schedulePageReload(immediate)` y el `true` pide el borde de entrada del debounce (el `input` del buscador es el único trigger que no lo pasa, porque cada tecla es un prefijo del término).
4. El sort se re-aplica después del filtrado (`_sortByDateDesc()` + `reverse()`), así `asc` no re-ordena de verdad: invierte la lista descendente.

El botón activo es **por dominio**: `_syncFilterToggleState()` enciende `#filter-toggle` solo con los grupos `group !== 'estado'` y `#estado-toggle` solo con los `'estado'`. El puntito del panel lo deciden los grupos del panel; un `validado`/`capturado`/`descartado` activo enciende únicamente el botón rojo del flyout.

En modo API el botón del panel aparece desde el arranque **pero inerte**: hasta que llegan los facets no tiene listener (`_bindFilterToggle` corre en el `.then()` de `_ensureApiFacets()`, una sola vez) y el panel no tiene nada que abrir. El `estado-toggle`, en cambio, se bindea siempre en `_bindBaseEvents()`.

### Grupos largos: el toggle "Ver más (N)"

Un grupo con lista abierta (`tipo_fuente` con 7 valores, `tonos_sociales`, `contenido`) puede tener más valores de los que entran cómodo en el menú. `_buildFilterCheckboxes()` recorta con la resolución de `_filterMaxVisible(f)` y `_buildFilterMore()` agrega el botón:

- El corte se aplica **solo cuando el grupo lo supera**. **Los visibles son los de mayor conteo** (`counts[b] - counts[a]`; `sort` es estable, así que los empates conservan el orden previo), salvo los grupos con `sortValues` —`fecha_publicacion` (año más nuevo primero) y `descartado` ("Descartado" primero) en el demo—, cuyo orden es intencional y solo se trunca.
- La cola se marca `label.filter-option.filter-option-extra` + `hidden`, y `_buildFilterMore()` pone al final del `.filter-options` el `button.filter-more` ("Ver más (N)" ⇄ "Ver menos", con `aria-expanded`).
- **La visibilidad la manda el SCSS**, no el atributo `hidden`: `.filter-menu .filter-option` tiene `display: flex` de autor, que le gana a la regla `[hidden]` de la UA (mismo motivo que obliga a `.taxonomy-row[hidden]`), así que hacen falta las reglas `.filter-option-extra { display: none }` y `.filter-options.expanded .filter-option-extra { display: flex }` al mismo peso. El `hidden` se mantiene igualado.
- **Un grupo con algún checkbox tildado nunca queda colapsado** (`f.checkboxes.some(cb => cb.checked)`): un filtro aplicado desde un valor invisible es peor que un grupo una línea más largo. También se reabre solo en los rebuilds.
- El estado de apertura vive en `_filterExpanded: Set<string>`, no en el DOM, porque los checkboxes se reconstruyen (facets de API, re-scope de taxonomía) y el estado tiene que sobrevivir, igual que los toggles de taxonomías. La key es el `field` del grupo.
- El click **no llama a `_applyFilters()`**: no es un filtro, es UI, y no debe re-renderizar el timeline.

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
| `filtersMaxVisible` | `number \| Partial<Record<string, number>>` | Corte "Ver más" por grupo: número global, record por `field`, o el `maxVisible` del propio grupo (opción del constructor, default 5) |
| `filters` | `FilterDef[]` | Grupos normalizados de la opción `filters` (defaults resueltos, columnas repartidas, slots DOM y `checkboxes`). Vacío = sin filtros |
| `_filterExpanded` | `Set<string>` | Grupos de filtros (por `field`) con el "Ver más" abierto (sobrevive a los rebuilds de los checkboxes) |
| `section` | `HTMLElement` | `.publicaciones-section` |
| `featuredContainer` | `HTMLElement` | `#featured-cards` |
| `timelineContainer` | `HTMLElement` | `#timeline-container` |
| `timelineCards` | `HTMLElement` | `#timeline-cards` |
| `expandToggle` | `HTMLElement` | `#expand-toggle` |
| `remainingCount` | `HTMLElement` | `#remaining-count` |
| `expandIcon` | `HTMLElement` | `#expand-icon` |
| `sortToggle` | `HTMLElement` | `#sort-toggle` |
| `filterToggle` | `HTMLElement \| null` | `#filter-toggle` (sus listeners/estilo se resguardan de `null`: sin grupos `'menu'` no se renderiza) |
| `filterMenu` | `HTMLElement \| null` | `#filter-menu` |
| `workNotesToggle` | `HTMLElement` | `#work-notes-toggle` (solo con `internalButtons: true`) |
| `estadoWrap` | `HTMLElement` | `.estado-wrap` (`#estado-wrap`) |
| `estadoToggle` | `HTMLElement` | `#estado-toggle` — el botón rojo del flyout de estado |
| `estadoMenu` | `HTMLElement` | `#estado-menu` — el flyout con los grupos `group: 'estado'` |
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
| `.open` | `.estado-menu` | Flyout de estado interno abierto (junto a `.open` en `#estado-toggle`) |
| `.expanded` | `.filter-options` | Grupo de filtros con el "Ver más" abierto: muestra los `label.filter-option-extra` (la visibilidad la decide esta clase, no el atributo `hidden`) |
| `.open` | `.card-info-menu` | Menú de info de tarjeta abierto |
| `tv-share-toast` | `.card-share-toast` | Animación del cartelito "Copiado al portapapeles!" (fade in/out, 1.5s) |
| `.active` | `.filter-toggle` | Filtros del panel activos (al menos un grupo `'menu'` con algún valor seleccionado; los `'estado'` no lo encienden) |
| `.active` | `.estado-toggle` | Filtros del flyout activos (algún grupo `'estado'` con algún valor seleccionado) |
| `.asc` | `.sort-toggle` | Orden ascendente activo |
| `.rotated` | `.expand-icon` | Icono de expand rotado 180° |

## Artefactos de build (`dist/`)

`dist/` contiene solo salida compilada (JS, `.d.ts`, CSS). No se edita a mano: cualquier cambio se hace en `src/` y se regenera con `npm run build`.

## Mock ↔ Interfaces ↔ README

`example/mock-data.js` es la fuente de verdad de los datos. Todo cambio de campos en el mock (agregar, renombrar o eliminar) debe aplicarse en el mismo commit a la interfaz `TimelineItem` (`src/TimelineViewer.ts`), regenerar `dist/TimelineViewer.d.ts` (`npm run build`) y actualizar la tabla de campos de `README.md`. Ver también `AGENTS.md`.
