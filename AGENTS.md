# AGENTS.md — Instrucciones para agentes de código

## Qué es este proyecto

TimelineViewer es un **componente UI autónomo** que muestra artículos de noticias como un stack de tarjetas superpuestas con una vista de timeline expandible. Se distribuye como un paquete npm independiente.

## Filosofía: Módulo autónomo

**Este componente debe funcionar de forma completamente independiente.** No depende de ningún framework (React, Vue, Angular), no usa bundler (Webpack, Vite, Rollup), y su única  dependencia runtime obligatoria es lightgallery (es peer dependency, por lo que se espera que la aplicación principal la incorpore).

Esto significa:

- El consumidor importa un solo archivo JS y un solo CSS
- No hay side effects globales más allá de lo necesario para los embeds sociales
- El componente se monta en cualquier `<div>` del DOM del consumidor
- No asume nada sobre el entorno del consumidor más allá del DOM del browser

## Arquitectura

**Un solo archivo TypeScript** (`src/TimelineViewer.ts`, ~880 líneas) + **un solo archivo SCSS** (`src/styles.scss`, ~1400 líneas). No hay componentes separados, no hay archivos de utilidad, no hay módulos auxiliares.

### Por qué un solo archivo

El diseño es intencional: un componente autocontenido que se puede copiar, importar o incluir sin preocuparse por resolver paths de imports internos. Esto lo hace fácil de mantener, distribuir y consumir.

### Compilación

No hay bundler. El pipeline de build es: **Prettier** (format) → `tsc` (TS→JS) → `sass` (SCSS→CSS). El resultado en `dist/` es lo que se distribuye.


## Comandos

```bash
npm run build        # Formatea + Build completo (TS + plugin zoom + SCSS)
npm run build:ts     # Solo TypeScript
npm run build:css    # Solo SCSS
npm run format       # Formatea código con Prettier
npm run format:check # Verifica formato sin modificar
npm run watch          # Copia el plugin zoom + Watch mode + dev server en :3010
npm start            # Solo dev server en :3010
```

El `build` ejecuta Prettier automáticamente antes de compilar. **No hay tests configurados.**

## Qué NO hacer

Estas son restricciones críticas. Violarlas rompe la filosofía del módulo:

1. **NO agregar bundlers** (Webpack, Vite, Rollup, esbuild). La compilación es `tsc` + `sass` + un paso de copia del plugin zoom vendado (`build:lgzoom`).
2. **NO partir el archivo TS en múltiples archivos**. Todo va en `TimelineViewer.ts`.
3. **NO agregar frameworks** (React, Vue, Svelte, etc.). Es vanilla DOM.
4. **NO agregar dependencias runtime**. `lightgallery` es peer dependency, no se incluye en el bundle.
5. **NO cambiar el formato de salida**. El resultado es un ES module con default export de la clase `Timeline`.
6. **NO agregar side effects globales** al importar el módulo (salvo los SDKs de embed que se cargan bajo demanda).
7. **NO cambiar la interfaz pública** (`TimelineOptions`, `TimelineItem`, `ItemTema`) sin actualizar la documentación y los tipos.
8. **NO renombrar la clase exportada** `Timeline` ni cambiar el default export.
9. **NO modificar la estructura de datos** `TimelineItem` sin considerar que viene de un pipeline de scraping externo.
10. **NO agregar CSS que dependa de clases fuera de `.publicaciones-section`**. Todo el estilo está scoped.
11. **NO modificar manualmente los archivos de `dist/`**. Son artefactos generados por el build (`npm run build`). Cualquier cambio se hace en `src/` y se regenera.

## Convenciones de código

### Formato

Se usa **Prettier** con esta configuración (`.prettierrc`):
- Semicolons: siempre
- Quotes: single quotes
- Trailing commas: ninguna
- Indentación: 2 espacios
- Line width: 120

El `build` ejecuta `format` automáticamente. Para formateo manual: `npm run format`.

### TypeScript

- **Target**: ES2020, módulos ES2020, `moduleResolution: "bundler"`
- **Modificadores**: Todos los métodos internos son `protected` con prefijo `_` (ej: `_buildLayout`, `_renderAll`). Esto permite subclasear si es necesario.
- **Propiedades de clase**: Se declaran en la clase (no en el constructor). Se inicializan en el constructor.
- **Templates HTML**: Se construyen con `innerHTML` y template literals. No se usa `createElement` encadenado.
- **Event listeners**: Se bindan en `_init()` o dentro de `_createTimelineItem()`. Se usan `addEventListener` directos.
- **Tipado estricto**: `strict: true` en tsconfig. No usar `any`.

### SCSS

- **Namespace CSS**: Todo está scoped bajo `.publicaciones-section`. Las propiedades CSS custom usan el prefijo `--tv-` (ej: `--tv-bg-primary`, `--tv-accent`).
- **Nomenclatura BEM-like**: `.card-body`, `.card-title`, `.timeline-date-col`, `.featured-card`.
- **Loop `@for`**: Las posiciones de las tarjetas featured se generan con `@for $i from 1 through 10` en SCSS.
- **Selectors modernos**: Se usa `:has()` para estilos condicionales.

### Strings

- **Todo el texto visible al usuario está en español** (`es-ES`). Fechas, labels, botones, mensajes vacíos.
- **Los nombres de campos del data model también están en español** (`nombre_fuente`, `resumen_ia`, `tonos_sociales`, etc.). Esto es porque el componente se integra con un pipeline de scraping en español.

## Modelo de datos

El componente consume **taxonomías medias**: un array de `ContentGroup`, cada una con un `label` y su propio listado de `TimelineItem`. Los `label` son las opciones del `<select>` que se muestra al expandir el timeline; el timeline, los filtros y la paginación quedan acotados al grupo seleccionado. El contador del botón de expandir y las featured cards colapsadas usan el **pool completo** (todas las taxonomías).

```typescript
interface ContentGroup {
  label: string;           // Nombre de la taxonomía (texto plano, opción del selector)
  items: TimelineItem[];   // Artículos de la taxonomía (mismo formato que la lista plana de siempre)
}
```

`TimelineOptions.content?: ContentGroup[]` tiene prioridad sobre `TimelineOptions.items?: TimelineItem[]`, que queda como **alias legacy**: sin `content` el componente se comporta exactamente como antes y **no renderiza ningún selector**. La estructura interna de `TimelineItem` es plana (no jerárquica), diseñada para un pipeline de scraping de noticias:

```typescript
interface TimelineItem {
  id: number | string;
  nombre_fuente: string;        // Titular del artículo
  resumen_ia: string | null;    // Resumen generado por IA (null = no se muestra)
  fecha_publicacion: string;    // YYYY-MM-DD
  fecha_scrapeo: string;        // ISO datetime
  tonos_sociales: string[];     // Tono(s) social(es) del artículo (valores únicos de temas)
  fuente_institucional: string | null; // Nombre del medio
  tipo_fuente: string;          // Tipo de fuente (ver valores en README)
  es_oficial: boolean;          // Indica si la fuente es oficial
  validado: boolean | null;     // Indica si el artículo fue validado (true/false/null = pendiente/desconocido)
  capturado: boolean;           // Indica si el artículo fue capturado (false = solo id y link_web disponibles, resto vacío)
  descartado: boolean | null;   // Indica si el artículo fue descartado (true = descartado, false = en uso, null = desconocido)
  thumbnail: string | null;     // URL de imagen principal
  link_web: string;             // URL del artículo original
  actores_principales: string[] | null;
  adjuntos: string[];            // Archivos/links adjuntos (puede estar vacío)
  screenshot: string | null;    // URL de captura de pantalla
  imagenes: { thumb: string; full: string }[] | null;  // El backend puede mandar null en vez de []
  links_videos?: string[] | null;      // Links de videos relacionados (se renderizan como embeds al expandir la tarjeta)
  has_video: boolean;           // Indica si el ítem tiene contenido audiovisual (links_videos o link_web de video)
  link_edit_entry?: string;     // URL de formulario de edición (muestra botón rojo "Editar" en la tarjeta)
  link_view_entry?: string;     // URL de la vista individual del ítem (vuelve el ID del menú de información un link y agrega el botón de compartir)
  taxonomias?: SingleTaxonomy[];  // Grupos de links de navegación del pie de la tarjeta en modo single. Opcional, y solo texto plano
  temas: ItemTema[];            // Subtemas del artículo
}
```

`link_view_entry` es un campo **por ítem**, no una opción del constructor: puede venir en relativa (`?id=FUE-00001`, `/articulos/FUE-00001`) y se absolutiza con `_absoluteUrl()` para compartir. También viaja en el `TimelineItemSummary` de modo API (va en `toSummary()` de `example/server.js`), porque el botón de compartir y el link del ID se renderizan en la tarjeta colapsada, antes de que exista el detalle.

`taxonomias` también es un campo **por ítem**, no una opción del constructor: el bloque de links de navegación del modo single sale del propio dato (`_appendTaxonomies(card.taxonomias)` en `_renderSingleCard`), nunca de la config. En modo API llega en el detalle (`GET {url}/:id`) y **no** en la lista paginada, porque solo se usa con `singleId`, donde el artículo ya se pide entero. `SingleTaxonomyItem.content` es `string` y siempre se escapa: el dato viene de la API (JSON), así que no admite markup ni nodos DOM. Si el detalle no se puede cargar, no hay ítem y por lo tanto no hay bloque que renderizar.

Cada grupo del bloque renderiza como máximo `TAXONOMY_VISIBLE_LINKS` (3) links: el resto se emite en el markup como `li.single-taxonomy-extra[hidden]` y un `button.single-taxonomy-more` ("Ver más (N)" ⇄ "Ver menos", con `aria-expanded`) los muestra/oculta **por grupo**, en `_appendTaxonomies` (después del `insertAdjacentHTML`). El handler agrega la clase `expanded` al `ul.single-taxonomy-list` de ese grupo: **la visibilidad la manda el SCSS del componente** (`.single-taxonomy-extra` hidden / `.single-taxonomy-list.expanded .single-taxonomy-extra` visible), no el atributo `hidden`, porque la regla UA `[hidden]` cede ante cualquier `display` de autor (mismo motivo que obliga a `.taxonomy-row[hidden] { display: none }`). El `hidden` se mantiene en sync igual. El estado vive solo en el DOM, sin campo en la clase; `_buildTaxonomias` es puro y no bindea eventos.

**No modificar esta interfaz** sin considerar que los datos vienen de un sistema externo.

`ContentGroup` **no** es lo mismo que `SingleTaxonomy` (que agrupa *links* de navegación bajo la tarjeta en modo single). No confundirlos ni mezclar sus campos: `ContentGroup` viene de la opción `content` y agrupa artículos del timeline; `SingleTaxonomy` viene del campo `taxonomias` del ítem y agrupa links.

Helpers que definen el scope de datos en `src/TimelineViewer.ts`:

- `_allItems()` → todos los items de todas las taxonomías. Se usa en single mode (buscar por `id`), para armar las featured cards, para el scope de "Ver todo" y para el total del contador (en modo API ese rol lo cumple `_apiCollectionTotal`, porque el pool no está en el cliente).
- `_scopeItems()` → items de la taxonomía activa, o el pool completo si `_contentIndex === ALL_TAXONOMIES_INDEX` ("Ver todo").
- `_sortByDateDesc()` → copia ordenada por fecha descendente (sin fecha al final). **Se aplica después de filtrar**: no existe un pool pre-filtrado ordenado.
- `_applyFilters()` calcula **los dos** conjuntos en una sola pasada: `allCards` (scope activo) y `_featuredCards` (pool completo). Las featured están ocultas en CSS cuando el timeline está expandido, así que nunca se re-renderizan al colapsar.
- `_renderRelatedCount()` → el único lugar que escribe el contador del botón de expandir (`#remaining-count` + `relatedLabel(count)`). Toma el pool sin filtrar: `_allItems().length` en local, `_apiCollectionTotal` en API. Se la llama desde `_renderAll()` y desde el `.then()` de `_ensureApiFacets()`, para poder parchear el contador cuando llegan los facets sin re-renderizar el timeline.

### Regla de oro: Mock ↔ Interfaces ↔ README

`example/mock-data.js` es la **fuente de verdad** para probar el componente. Cualquier cambio en el mock **obliga** a aplicar el mismo cambio en el mismo commit:

1. **Mock**: `example/mock-data.js` (agregar/renombrar/eliminar el campo en los 17 artículos).
2. **Interfaz**: `TimelineItem` en `src/TimelineViewer.ts`.
3. **Tipos distribuidos**: `dist/TimelineViewer.d.ts` (regenerado con `npm run build`).
4. **Documentación**: tabla de campos en `README.md` (y este documento).

No se puede modificar el mock sin actualizar interfaces y README en el mismo cambio, y viceversa.

El mock exporta **las dos formas**: `content` (los grupos por taxonomía, armados con `slice` sobre el listado completo) e `items` (la lista plana, usada por `example/server.js` para el modo API y por el flag `?flat` de `script.js`). `mockData.items` debe seguir siendo el listado completo.

## Embeds sociales — Dependencia crítica de carga

El componente carga SDKs de redes sociales **bajo demanda** cuando se expande una tarjeta. Existe una **dependencia de orden obligatoria**:

```
Instagram embed.js  →  DEBE cargarse ANTES de  Facebook SDK
```

**Por qué**: Facebook SDK setea `window.FB`. Instagram's embed.js verifica `(window.FB && !window.FB.__buffer)` al inicializar y se salta la inicialización si FB ya existe. Si se cargan en orden incorrecto, los embeds de Instagram no funcionan.

Twitter widgets.js se carga en paralelo (sin conflictos).

Ver `_preloadEmbedLibraries()` en `src/TimelineViewer.ts:606` para la implementación exacta.

## lightGallery

Es un **peer dependency** (`^2.9.0`). El componente importa:

```typescript
import lightGallery from 'lightgallery';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoomCustom from './lg-zoom-custom/lg-zoom.es5.js';
```

El plugin zoom usa una **copia vendada** en `src/lg-zoom-custom/` (basada en lightgallery 2.7.1) porque `TimelineViewer.ts` la modifica en runtime (scroll wheel zoom en `_openLightGallery`). `tsc` no copia `.js` a `dist/`, por eso `build:lgzoom` copia la carpeta `lg-zoom-custom` completa a `dist/`. No usar `lightgallery/plugins/zoom` (el import original) para el zoom.

El consumidor debe proveer lightGallery en su bundle o via importmap (como hace `example/index.html`). El componente NO incluye lightGallery en su build.

Para testing local, el example usa CDN via importmap.

## Estructura de archivos

```
src/
  TimelineViewer.ts    ← Toda la lógica (único archivo TS)
  styles.scss          ← Todos los estilos (único archivo SCSS)
  lg-zoom-custom/      ← Plugin zoom vendado de lightgallery (js + .d.ts)

dist/
  TimelineViewer.js    ← ES module compilado
  TimelineViewer.d.ts  ← Type declarations
  styles.css           ← CSS compilado
  lg-zoom-custom/      ← Copia del plugin zoom vendado (via build:lgzoom)

example/
  index.html           ← Demo page con importmap para lightGallery CDN
  script.js            ← Entry point del demo
  mock-data.js         ← 19 artículos de ejemplo agrupados en 3 taxonomías (`content`) + lista plana (`items`)
  server.js            ← HTTP server estático (:3010)
  base.css             ← Reset/base styles del demo
```

## Git

- Branch principal: `master`
- Remote: `https://github.com/GastonZalba/timeline-viewer`
- `.gitignore` excluye `package-lock.json` (no se commitea)
- No hay CI/CD configurado

## Cambios frecuentes

- **Agregar un nuevo tipo de embed social**: Agregar regex constante + caso en `_parseLinkWeb()` + HTML template en `_createTimelineItem()` + caso de carga en `_preloadEmbedLibraries()`. Verificar orden de carga.
- **Agregar un nuevo campo a TimelineItem**: Agregar a la interfaz `TimelineItem` + usar en `_createTimelineItem()` + actualizar `dist/TimelineViewer.d.ts` con build.
- **Modificar `example/mock-data.js`**: Aplicar el cambio en el mismo commit en la interfaz `TimelineItem`, regenerar los tipos distribuidos (`npm run build`) y actualizar la tabla de campos del README. Ver "Regla de oro: Mock ↔ Interfaces ↔ README".
- **Agregar un nuevo filtro**: Agregar entrada en `this.filters` array en `_buildFilterCheckboxes()`. En modo API hay que reflejar el campo en `FIELD_EXTRACT` de `example/server.js`, porque los valores y los conteos del panel salen de `GET {url}/facets`.
- **Tocar los facets (modo API)**: Los conteos son **estáticos**: se piden una sola vez con `GET {url}/facets` sobre la colección completa, sin `q` ni filtros, y `_apiFacets` no se vuelve a asignar. La lista (`GET {url}`) ya no los lleva; `_adoptLegacyApiFacets()` es el único fallback para backends que todavía los mandan en la respuesta. **El pedido es lazy y_cacheado**: nunca se llama a `_loadApiFacets()` directo, siempre a través de `_ensureApiFacets()`, que cachea la promesa en `_apiFacetsPromise` (incluso si el request falló, así que no hay reintentos). El enganche es **siempre en `_init()`**, en paralelo con la primera página: el facets no es solo del panel de filtros, también trae el `total` de la colección (contador del botón) y el `lastUpdated` (pie), y los dos se ven antes de que el usuario toque algo. El `if (this.api) void this._ensureApiFacets()` de `_toggleExpand()` queda como cache hit de seguridad, no como disparador. Los checkboxes se construyen **dos veces y solo dos**: una en `_init()` (sin conteos, para que los defaults de estado ya vayan en la primera request de la lista) y otra en el `.then()` de `_ensureApiFacets()` (que además parchea el contador con `_renderRelatedCount()` y el pie con `_renderLastUpdated()`, sin re-renderizar el timeline). Nunca en cada `_fetchPage()`: recrearlos en cada página borraría el estado de los filtros que no son de estado (`tonos_sociales`, `tipo_fuente`, `es_oficial`, `fecha_publicacion`, `contenido`), que no se persisten. El rebuild no pierde estado igual: sin facets los grupos sin `fixedValues` quedan ocultos (y con ellos `filterToggle`), así que no hay nada chequeable, y los de estado se restauran desde `localStorage`. El `catch` de `_loadApiFacets()` solo vacía `_apiFacets` si `_apiFacetsLoaded` es falso, para no pisar los facets legacy ya adoptados. El lado servidor vive en `example/server.js` (`STATIC_FACETS` + `STATIC_TOTAL` + `handleFacets`), y la ruta `/api/facets` tiene que declararse **antes** del branch `/api/:id`.
- **Cambiar el contrato de la API**: `example/server.js` es la fuente de verdad de los endpoints, igual que el mock para los datos. Todo cambio de request o respuesta se aplica en el mismo commit al servidor de ejemplo + las interfaces de `src/TimelineViewer.ts` (`TimelineApiPageResponse`, `TimelineApiFacetsResponse`) + los tipos distribuidos (`npm run build`) + la sección "Modo API (servidor)" del README. En modo API **no hay campo `featured`**: el stack colapsado se arma con los primeros `items` de la página (`allCards.filter(capturado !== false).slice(0, featured_count)` dentro de `_renderAll()`), así que el servidor tampoco recibe el parámetro `featured`. `_apiFeatured` ya no existe. **Hay dos totales y cada uno tiene su fuente**: el `total` de la lista (búsqueda + filtros) llena `_apiTotal` → el status "Mostrando X de Y publicaciones" y `_hasMorePages()`; el `total` de `GET {url}/facets` (colección completa, sin `q` ni filtros) llena `_apiCollectionTotal` → el contador y el `relatedLabel(count)` del botón de expandir, escrito por `_renderRelatedCount()`. Igual que en modo local, donde el contador es `_allItems().length` (pool sin filtrar) y la paginación corre sobre `allCards` ya filtrado. **No hay fallback**: si `/facets` no manda `total` (o falla), el contador queda en `0`; usar el `total` de la lista daría un número que se mueve con cada búsqueda, que es justo lo que el contador no debe hacer. **La lista tampoco devuelve `lastUpdated`**: ese campo llega solo con `GET {url}/facets` (o por la opción `lastUpdated` del constructor), por lo que `_fetchPage()` / `_appendPageItems()` no lo leen y el pie "Actualizado por última vez el ..." lo escribe `_renderLastUpdated()`, extraído de `_renderTimeline()` justamente para poder parchearlo cuando llegan los facets sin re-renderizar el timeline (re-renderizar perdería una tarjeta ya expandida).
- **Paginación en modo API — append, nunca rebuild**: `_appendPageItems()` **no** llama a `_renderAll()`. Agrega solo las tarjetas nuevas con `_appendTimelineItems()` (el hermano de `_renderTimeline()` sin el `innerHTML = ''`) y les pasa los nodos a `_setupTimelineObserver(added)`. La razón es que `.timeline-item` nace en `opacity: 0` y solo aparece con `.visible`: un rebuild en cada página hacía que **toda** la lista repitiera su animación de entrada (el flash que reportó el usuario), además de perder el detalle ya inyectado en las tarjetas expandidas y recargar todas las imágenes. Rebuild solo donde es semánticamente correcto, o sea cuando lo que hay en pantalla ya no son los artículos en memoria: `_fetchPage(1)` (búsqueda/filtro/orden) y el re-scope de taxonomía. Al agregar tarjetas nuevas hay que respetar el orden del bloque final (`[tarjetas…, nuevas…, loadMore, status, footer]`): `_insertBeforeTrailing()` inserta antes del primer elemento entre `.timeline-load-more-item`, `.timeline-status-item` y `.timeline-footer-item`; `_insertBeforeFooter()` (usada por la fila de status y el botón) solo mira el footer. El botón de "Cargar más" de API se **conserva** entre páginas (su handler lee `this._apiPage`/`this._apiLoading` en el momento del click, no por closure) y solo se elimina cuando `_hasMorePages()` pasa a `false`; el de modo local sí hay que re-crearlo, porque ahí el handler captura `start`/`end`. El stack de featured no se re-renderiza en el append: solo se ve con el timeline colapsado, y el botón vive adentro del timeline (`max-height: 0` cuando está colapsado), así que es inalcanzable en ese estado.
- **Tocar las featured**: en modo local salen de `_featuredCards` (pool completo, armado en `_applyFilters()`); en modo API salen de `allCards`, o sea los primeros items de la página actual.
- **Tocar el estado expandido/colapsado del timeline**: El estado vive en `isExpanded` y solo se refleja en el DOM por `_applyExpandState()` / `_collapseExpandState()` (clases `expanded` en `section` y `timelineContainer`, rotación de `expandIcon` y `aria-expanded` del botón). `_toggleExpand()` solo hace el flip de `isExpanded` y delega en esos dos helpers: no agregar `classList.add/remove('expanded')` en ningún otro lado. La opción `startExpanded` (default `false`, sin persistencia) se aplica en `_init()` **antes** de `_applyFilters()`, porque el IntersectionObserver del timeline se engancha desde `_renderAll` y debe encontrar el container ya abierto (`max-height: 99999px`) en lugar de colapsado (`max-height: 0`). El preload de embeds va **después** de los datos, porque `_preloadEmbedLibraries()` deduce los tipos leyendo `this.allCards`. En modo API va enganchado a la promesa de `_fetchPage(1)`, para no correr en cada re-render; esa rama de `_init()` pide la primera página y los facets (que arman los checkboxes con los conteos) **siempre y en paralelo**, porque el contador y el pie ya se ven colapsados. `startExpanded` vale para cualquier modo, no solo single, y no cambia qué se pide: solo el estado inicial del DOM. La clase `has-taxonomy` es independiente del estado expandido: la agrega `_buildTaxonomySelect()` (solo cuando la fila del selector se conserva) y el SCSS la combina con `expanded` para ocultar `#remaining-count`, de modo que con taxonomías el único contador visible al abrir el timeline sea el de la píldora del selector.
- **Tocar el modo fullpage** (`fullpage: true`): es el único modo donde el timeline no se puede colapsar, así que tiene **cuatro cortes explícitos** en el TS y el resto es SCSS. (1) El constructor fuerza `this.isExpanded = this.fullpage || config.startExpanded === true` (por eso `fullpage` se asigna **antes** que `isExpanded` en el mismo bloque de asignaciones). (2) `_toggleExpand()` arranca con `if (this.fullpage) return;`: es la única red de seguridad, y cubre los tres caminos que llegan ahí (`#expand-toggle`, `#featured-cards` y `.featured-row`), por lo que además `_bindBaseEvents()` **no** bindea el click del botón — no volver a agregar la condición en cada listener. (3) `_buildLayout()` **no emite** el `div.timeline-resize-handle` y `_init()` **no** llama a `_initResizeHandle()`: si se llamara, leería `tv-timeline-cards-height` de `localStorage` y escribiría un `max-height` inline que pisaría el `none` del SCSS. Si se toca el resize handle, revisar las dos líneas: son la misma decisión. (4) `_renderFeatured()` y el loop de featured skeletons de `_renderApiLoading()` hacen early-return: en fullpage el stack nunca se ve (`expanded` lo colapsa a `height: 0`), así que no se construye nunca y `_featuredCards` (que `_applyFilters()` sigue calculando, barato porque son solo referencias) queda sin consumidor. Todo lo demás que consulta `featuredContainer` —los rAF que agregan `.visible`, `_clearApiLoading`, el click— es no-op solo por tener el contenedor vacío, así que **no** hay que guardarlo ni eliminar el `div#featured-cards` del markup (sacarlo deja `this.featuredContainer` en `null` y obliga a proteger 6 call sites). El `_getCardsHeightPx()` tiene su propio early-return a `window.innerHeight`: sin él, el `max-height: none` da `parseFloat('none') === NaN` y los skeletons de `_renderApiLoading()` caen al `RESIZE_MIN_HEIGHT`, o sea **un solo** placeholder. El layout en sí (barra sticky con fondo opaco, `min-height: 0` de `.featured-row`, `margin-top: 0` de `.timeline-container`, sin `max-height` en `.timeline-cards`, sin `expand-icon`) es un único bloque `&.fullpage` del SCSS, que va **después** de `&.expanded` porque comparte especificidad con él y el orden en el fuente es lo que resuelve. El offset de la barra sale de `--tv-sticky-top` (`:root`), por si el consumidor tiene un header propio. No aplica a single mode: `_renderSingleCard()` no pasa por `_buildLayout()` y ya renderiza una única tarjeta expandida.
- **Cambiar el scope de los datos** (taxonomías): `_scopeItems()` para el timeline/filtros/paginación y `_allItems()` para las featured, el total del contador y el modo single. El selector vive en `_buildTaxonomySelect()` y su change en `_onTaxonomyChange()`. `_contentIndex === ALL_TAXONOMIES_INDEX` (`-1`) significa "Ver todo" y hace que `_scopeItems()` devuelva el pool completo. No agregar una tercera fuente de datos.
- **Modificar estilos**: Editar `src/styles.scss`. Todos los estilos están bajo `.publicaciones-section`. Las variables CSS custom están al inicio del archivo.
