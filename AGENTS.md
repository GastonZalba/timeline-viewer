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
npm run build        # Formatea + Build completo (TS + SCSS)
npm run build:ts     # Solo TypeScript
npm run build:css    # Solo SCSS
npm run format       # Formatea código con Prettier
npm run format:check # Verifica formato sin modificar
npm run watch          # Watch mode (TS + SCSS) + dev server en :3010
npm start            # Solo dev server en :3010
npm test             # test:unit + test:e2e
npm run test:unit    # Build de TS + suite jsdom (node:test, sin browser)
npm run test:e2e     # Suite Playwright (Chromium) contra el server de ejemplo
```

El `build` ejecuta Prettier automáticamente antes de compilar.

### Tests

Hay dos suites, y la separación es deliberada:

| Suite | Runner | Corre | Qué cubre |
|---|---|---|---|
| `test/*.test.js` | `node:test` + jsdom | `npm run test:unit` | DOM, markup, estado y lógica: qué nodos existen, qué botones están deshabilitados, aritmética de páginas, resets de cursor, `_findScrollContainer` |
| `e2e/*.spec.js` | `@playwright/test` | `npm run test:e2e` | Lo que jsdom no puede: geometría real, offsets de scroll, sticky bajo `fullpage`, requests al servidor |

Reglas que costan descubrir y conviene no romper:

- **No escribir tests sin que lo pidan.** Un cambio de comportamiento se valida corriendo las suites que ya existen (`npm run test:unit`, `npm run test:e2e`) y reportando el resultado, no agregando casos: escribirlos cuesta mucho más que el cambio que los motivó. Los tests nuevos (o editar los existentes para cubrir algo nuevo) solo cuando el usuario los pide explícitamente. Si una suite queda en rojo por un cambio del consumidor —por ejemplo `example/filters.js`, que es suyo y se tunea seguido— avisarlo y preguntar, no "arreglar" el test por cuenta propia.
- **Los tests jsdom importan `dist/TimelineViewer.js`, no `src/`.** Se prueban los tipos distribuidos y el consumer real, y no hace falta transpilar TS para testear. Por eso `test:unit` corre `build:ts` antes: si se toca `src/` hay que rebuildar, y `dist/` nunca se edita a mano (ver "Qué NO hacer" #11).
- **El import de lightGallery necesita un hook de resolución.** `dist/TimelineViewer.js` importa `lightgallery/plugins/thumbnail` y `lightgallery/plugins/zoom`, que son specifiers de browser/bundler: el importmap del demo los resuelve, pero el resolver de Node no (sin `exports` map → `ERR_UNSUPPORTED_DIR_IMPORT`). `test/helpers/resolve-lightgallery.js` es un `resolve` hook que le da a Node el mismo mapeo, apuntando a los mismos `.es5.js`. **No cambiar esos imports para contentar al runner**: el contrato es del consumidor.
- **Los helpers viven en `test/helpers/`, así que `node --test test/` los reporta como dos "ok" sin subtests.** Es ruido esperado, no un test roto. (Por eso los specs de Playwright están en `e2e/` y no en `test/`: si colgaran de `test/`, el runner de Node los ejecutaría y fallarían fuera de su runner.)
- **`IntersectionObserver` no existe en jsdom** y se stubea en `test/helpers/dom.js`. El componente solo lo construye con el timeline expandido (`_setupTimelineObserver`); `_setupObserver` es código muerto y no se llama nunca.
- **jsdom no tiene motor de layout**: `getBoundingClientRect()` devuelve ceros y `scrollTop` es inerte. Por eso todo lo que es geometría o scroll vive en Playwright, no en la suite jsdom.
- **Los tests de Playwright son herméticos**: `e2e/helpers/network.js` intercepta el importmap de jsDelivr y sirve lightGallery desde el `node_modules` local, y aborta todo lo demás externo (imágenes de `picsum`). Corren sin internet.
- **En la suite jsdom, las filas de control también son `.timeline-item`.** El source arma cada fila como `'timeline-item timeline-<x>-item'`, así que los selectores de artículos tienen que excluir `.timeline-paginator-item`, `.timeline-status-item`, `.timeline-load-more-item` y `.timeline-footer-item` o se cuelan como artículos. El id de un artículo tampoco está en la fila: está en `.timeline-card[data-card-id]` (o, para los ítems `capturado: false`, en el texto de `.card-not-captured-id`).
- **`test-results/` y `playwright-report/` están en `.gitignore`.** El primer browser se baja una vez con `npx playwright install chromium`.
- Los tests del demo usan flags de `example/script.js`: `?flat`, `?pagination`, `?full`, `?expanded`, `?api`, `?many`. Ojo con `?pagination` **sin** `?flat`: el modo `content` arranca en la primera taxonomía, que tiene 9 ítems contra un `itemsPerPage` de 10, o sea una sola página y sin paginador (comportamiento correcto). Para ver paginación en modo local hay que ir a `?flat` o elegir "Ver todo" en el selector.
- **`?many` es el banco de pruebas del filtro `select`** (y es el motivo de que exista el flag): le agrega a cada ítem un campo sintético `topicos_demo` con 400 valores distintos y le inyecta el `select` de ese campo. El mock tiene solo 19 ítems, así que un tema por ítem daría 19 valores y no probaría nada: cada ítem lleva `MANY_PER_ITEM` temas del pool para que entre todos cubran los 400. Es **solo modo local** (en API los ítems los manda el server), y combinable con `?flat`/`?expanded`/`?full`. Sirve para ver la ventana de 50 filas, el scroll que la agranda, y la búsqueda con acentos/case y el teclado.

El `build` ejecuta Prettier automáticamente antes de compilar.

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
  tipo_fuente: string | null; // Tipo de fuente (null = sin tipo; ver valores en README)
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
  contenido: string[]; // Temas del contenido del artículo, ya clasificados (adjuntos / audio y video / imágenes). Campo sintético del pipeline
  anio_publicacion: string | null; // Año de `fecha_publicacion` ya separado (null = sin fecha). Campo sintético del pipeline
  temas: ItemTema[];            // Subtemas del artículo
}
```

`contenido` y `anio_publicacion` son los dos campos que `example/filters.js` filtra en lugar de `fecha_publicacion` a secas: el pipeline (o el mock) los manda **ya clasificados**, para que el filtro sea un `string` (o un `'null'`) contra un `string` y no dependa de un `extract`. Por eso no se derivan en el componente ni en `example/server.js`; si se agregan o se cambian, la regla de Mock ↔ Interfaces ↔ README los tiene que cubrir en el mismo commit.

`link_view_entry` es un campo **por ítem**, no una opción del constructor: puede venir en relativa (`?id=FUE-00001`, `/articulos/FUE-00001`) y se absolutiza con `_absoluteUrl()` para compartir. También viaja en el `TimelineItemSummary` de modo API (va en `toSummary()` de `example/server.js`), porque el botón de compartir y el link del ID se renderizan en la tarjeta colapsada, antes de que exista el detalle.

`taxonomias` también es un campo **por ítem**, no una opción del constructor: el bloque de links de navegación del modo single sale del propio dato (`_appendTaxonomies(card.taxonomias)` en `_renderSingleCard`), nunca de la config. En modo API llega en el detalle (`GET {url}/:id`) y **no** en la lista paginada, porque solo se usa con `singleId`, donde el artículo ya se pide entero. `SingleTaxonomyItem.content` es `string` y siempre se escapa: el dato viene de la API (JSON), así que no admite markup ni nodos DOM. Si el detalle no se puede cargar, no hay ítem y por lo tanto no hay bloque que renderizar.

Cada grupo del bloque renderiza como máximo `TAXONOMY_VISIBLE_LINKS` (3) links: el resto se emite en el markup como `li.card-taxonomy-extra[hidden]` y un `button.card-taxonomy-more` ("Ver más (N)" ⇄ "Ver menos", con `aria-expanded`) los muestra/oculta **por grupo**, en `_bindTaxonomyToggles(slot)` (después del `innerHTML` del `.card-taxonomies-slot`). El handler agrega la clase `expanded` al `ul.card-taxonomy-list` de ese grupo: **la visibilidad la manda el SCSS del componente** (`.card-taxonomy-extra` hidden / `.card-taxonomy-list.expanded .card-taxonomy-extra` visible), no el atributo `hidden`, porque la regla UA `[hidden]` cede ante cualquier `display` de autor (mismo motivo que obliga a `.taxonomy-row[hidden] { display: none }`). El `hidden` se mantiene en sync igual. El estado vive solo en el DOM, sin campo en la clase; `_buildTaxonomias` es puro y no bindea eventos.

**No modificar esta interfaz** sin considerar que los datos vienen de un sistema externo.

`ContentGroup` **no** es lo mismo que `SingleTaxonomy` (que agrupa _links_ de navegación bajo la tarjeta en modo single). No confundirlos ni mezclar sus campos: `ContentGroup` viene de la opción `content` y agrupa artículos del timeline; `SingleTaxonomy` viene del campo `taxonomias` del ítem y agrupa links.

Helpers que definen el scope de datos en `src/TimelineViewer.ts`:

- `_allItems()` → todos los items de todas las taxonomías. Se usa en single mode (buscar por `id`), para armar las featured cards, para el scope de "Ver todo" y para el total del contador (en modo API ese rol lo cumple `_apiCollectionTotal`, porque el pool no está en el cliente).
- `_scopeItems()` → items de la taxonomía activa, o el pool completo si `_contentIndex === ALL_TAXONOMIES_INDEX` ("Ver todo").
- `_sortBy()` → copia ordenada por el sorter activo (`_sortField` + `_sortAsc`). **Se aplica después de filtrar**: no existe un pool pre-filtrado ordenado. La comparación es **natural** (`Intl.Collator` con `numeric`, vía `_sortValue()`): las fechas ISO y los ids con ceros a la izquierda ordenan bien como texto plano, así que no hay lógica por campo. Un valor ausente es el más chico, así que en `desc` los sin valor van **últimos** y en `asc` **primeros**. El `sort` es **estable**, así que los empates conservan el orden de origen en las dos direcciones (ya **no** se hace `reverse()`: ese `reverse()` invertía el orden de los empates). Cualquier cambio acá hay que replicarlo en `sortItems()` + `sortValue()` de `example/server.js`, que es el lado servidor del mismo comportamiento (ver "Cambiar el contrato de la API").
- `_applyFilters()` calcula **los dos** conjuntos en una sola pasada: `allCards` (scope activo) y `_featuredCards` (pool completo). Las featured están ocultas en CSS cuando el timeline está expandido, así que nunca se re-renderizan al colapsar.
- `_renderRelatedCount()` → el único lugar que escribe el contador del botón de expandir (`#remaining-count` + `relatedLabel(count)`). Toma el pool sin filtrar: `_allItems().length` en local, `_apiCollectionTotal` en API. Se la llama desde `_renderAll()` y desde el `.then()` de `_ensureApiFacets()`, para poder parchear el contador cuando llegan los facets sin re-renderizar el timeline.

### Regla de oro: Mock ↔ Interfaces ↔ README

`example/mock-data.js` es la **fuente de verdad** para probar el componente. Cualquier cambio en el mock **obliga** a aplicar el mismo cambio en el mismo commit:

1. **Mock**: `example/mock-data.js` (agregar/renombrar/eliminar el campo en los 19 artículos).
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
import lgZoom from 'lightgallery/plugins/zoom';
```

Los tres specifiers son de browser/bundler: el consumidor los tiene que resolver (bundle propio o importmap, como hace `example/index.html`). El componente NO incluye lightGallery en su build, y `npm run build` no necesita copiar nada de `node_modules` a `dist/`.

El consumidor debe proveer lightGallery en su bundle o via importmap. Para los tests, el importmap del demo apunta a jsDelivr, pero `e2e/helpers/network.js` intercepta esas requests y sirve los mismos `.es5.js` desde el `node_modules` local, así que la suite corre sin internet.

## Estructura de archivos

```
src/
  TimelineViewer.ts    ← Toda la lógica (único archivo TS)
  styles.scss          ← Todos los estilos (único archivo SCSS)

dist/
  TimelineViewer.js    ← ES module compilado
  TimelineViewer.d.ts  ← Type declarations
  styles.css           ← CSS compilado

example/
  index.html           ← Demo page con importmap para lightGallery CDN
  script.js            ← Entry point del demo
  mock-data.js         ← 19 artículos de ejemplo agrupados en 3 taxonomías (`content`) + lista plana (`items`)
  filters.js           ← Grupos de la opción `filters` del demo (panel + flyout)
  sorters.js           ← Entradas de la opción `sorters` del demo (fecha de publicación + id)
  server.js            ← HTTP server estático (:3010)
  base.css             ← Reset/base styles del demo

test/                  ← Suite jsdom (node:test), sin browser
  *.test.js
  helpers/
    dom.js             ← jsdom + globals + stub de IntersectionObserver
    resolve-lightgallery.js ← Hook de resolución ESM para lightGallery

e2e/                   ← Suite Playwright (Chromium)
  *.spec.js
  helpers/
    demo.js            ← Abrir el demo y leer el DOM
    network.js         ← Importmap de jsDelivr servido desde node_modules

playwright.config.js   ← testDir ./e2e, webServer en :3010
```

## Git

- Branch principal: `master`
- Remote: `https://github.com/GastonZalba/timeline-viewer`
- `.gitignore` excluye `package-lock.json` (no se commitea), ni `test-results/` / `playwright-report/`
- No hay CI/CD configurado: los tests se corren a mano con `npm test`

## Cambios frecuentes

- **Agregar un nuevo tipo de embed social**: Agregar regex constante + caso en `_parseLinkWeb()` + HTML template en `_createTimelineItem()` + caso de carga en `_preloadEmbedLibraries()`. Verificar orden de carga.
- **Agregar un nuevo campo a TimelineItem**: Agregar a la interfaz `TimelineItem` + usar en `_createTimelineItem()` + actualizar `dist/TimelineViewer.d.ts` con build.
- **Modificar `example/mock-data.js`**: Aplicar el cambio en el mismo commit en la interfaz `TimelineItem`, regenerar los tipos distribuidos (`npm run build`) y actualizar la tabla de campos del README. Ver "Regla de oro: Mock ↔ Interfaces ↔ README".
- **Agregar un nuevo filtro**: Agregar la entrada en `example/filters.js` (`field`, `label`, y `items` si el consumidor quiere fijar los valores; si no, el grupo los deriva del dato) + el campo en el mock. No hay nada que tocar en el server: `readField()` tokeniza cualquier campo con `String()`, así que un filtro nuevo aparece con sus valores y conteos sin lógica por campo. En API los conteos salen de `GET {url}/facets` y `FACET_FIELDS` se arma solo con `filters.map(f => f.field)`.
- **Agregar un sorter**: Agregar la entrada en `example/sorters.js` (`field` + `label`, y `default: true` en una sola si el demo quiere que arranque otra) + el campo en el mock si no existe. No hay nada que tocar en el server: `sortItems()` + `sortValue()` leen cualquier campo con `String()` y comparan natural, así que un sorter nuevo ordena en local y en API sin lógica por campo. Sin la opción `sorters` no hay UI de orden y el timeline usa `fecha_publicacion` desc como orden interno; la opción pública es `TimelineSorter { field, label, default? }` y no comparte normalización con `filters` (`_normalizeSorters` descarta `field`/`label` vacíos y `field` duplicado con `console.warn`).
- **Entender la nueva forma de declarar valores (`items`)**: un grupo **con `items`** muestra exactamente esos valores, en ese orden, y existe aunque ningún dato los traiga; un grupo **sin `items`** los deriva del dato y puede llegar a esconder el grupo entero si solo hay un valor (salvo que declare `allowEmpty`, que es justamente el caso donde ese único valor es el bucket vacío). `_resolveFilterItems()` (invocado desde `_normalizeFilters()`) convierte cada entrada en un `FilterDefItem`: `token` (los valores unidos por comas, que **es** el `input.value` y el query param), `tokens` (uno por valor, para comparar contra el ítem), `label` y `checked`. **La comparación es por token**: `_filterToken()` le aplica `String()` y `null` / `undefined` pasan a `'null'`, así que un `value: null` declarado matchea los ítems que no traen el campo; los arrays del ítem se expanden, así que un ítem puede contestar varios valores del mismo grupo. Un `value` **no puede contener coma** (rompe el CSV), y una declaración inválida descarta el grupo entero con `console.warn`, no el ítem suelto.
- **El bucket vacío de un filtro (`allowEmpty`)**: solo aplica a un grupo **sin `items`** (con `items` se ignora en silencio, porque ahí el bucket vacío es un valor declarado, `{ value: null, label: 'Sin tipo' }`). Con la opción, los ítems que no traen valor para el campo —token `'null'`, que `_filterToken()` ya produce— se ofrecen como **un valor más**, con el label fijo `"Sin valor"` (`FILTER_EMPTY_LABEL`), y **siempre último**: la rama de valores derivados de `_buildFilterCheckboxes()` lo mueve al final *después* del sort (conteo o `sortValues`), de modo que ni un grupo colapsado ni un `sortValues` lo dejan en medio. **.filter-select**, que es un multiselect con buscador, toma la fila completa del panel (`flex: 1 0 100%`) y se scrollea con `max-height`, sin "Ver más". El bucket vacío se **agrega al final** y la caja de búsqueda aparece sola con más de `FILTER_SELECT_SEARCH_MIN` (8) valores; las filas se ocultan por atributo, no se borran del DOM. Ojo con esto al tocar tests: el bloque `.filter-selects` va **antes** de las columnas, así que cualquier selector `.filter-column:nth-child(n)` del panel se corrió una posición (indexar sobre el NodeList de `.filter-column` en su lugar, como ya hace el helper `columnLabels()` de `test/filters.test.js` y `e2e/filters.spec.js`). En modo API la clave `"null"` de `facets[field]` se filtra igual que en local, así que el backend no cambia (y sin esa clave no hay bucket vacío que ofrecer).
- **Enrutar un grupo de filtros (`group`)**: son dos destinos, y el rename de `'estado'` a `'filtros_internos'` es parte del contrato público, no un detalle interno. `group: 'menu'` (default) mete el grupo en una columna del panel —la primera mitad de la declaración a la `column: 0`, el resto a la 1, repartido en `_normalizeFilters()`—; `group: 'filtros_internos'` lo manda al flyout rojo, que vive en el **toolbar interno** y por eso necesita `internalButtons: true`: sin esa opción `_buildInternalButtonsHtml()` no emite el wrap, y entonces `_attachFilterOptions()` deja el grupo sin slot (conserva la config y `_buildFilterCheckboxes()` lo saltea, no lo descarta). El tipo público es `FilterGroup = 'menu' | 'filtros_internos'` y la normalización es **estricta**: cualquier otro valor —incluido un `'estado'` de una versión anterior— cae en `'menu'` **sin `console.warn`**, así que el error se ve como un grupo que aparece en el panel en vez de como un filtro que no aparece. Si hay que cambiar el nombre otra vez, el rename arrastra: los 3 selectores del SCSS (`.filtros-internos-wrap` / `.filtros-internos-toggle` / `.filtros-internos-menu`, con sus `#id`, que también aparecen en `e2e/filters.spec.js`), las 3 refs de clase (`filtrosInternosWrap` / `filtrosInternosToggle` / `filtrosInternosMenu`), la key de `localStorage` (`tv-filtros-internos-filters`: renombrarla **descarta** el estado ya persistido de los consumidores), el `title` del botón (texto visible, "Filtros internos") y el `FilterGroup` del `.d.ts` distribuido.
- **El `label` de un grupo es opcional, y el flyout también lleva headers**: es la única entrada de `TimelineFilter` que **no** descarta al grupo cuando falta (`field` vacío, `type` no soportado o `field` duplicado sí lo descartan, con `console.warn`). `_normalizeFilters()` lo normaliza a `string` (ausente, `null` o solo espacios quedan `''`) y `_buildFilterOptionsHtml()` emite el `.filter-section` **siempre**, con el `.filter-header` adentro solo si hay label. El markup es **idéntico para los dos destinos**: el flyout de `filtros_internos` usa el mismo `.filter-section`/`.filter-header` que una columna del panel (por eso un grupo de "Sí/No" sin label también se lee: se ve igual de agrupado, solo que sin título). El SCSS comparte el estilo del header (`.filter-menu .filter-header, .filtros-internos-menu .filter-header`) y el separador va por `.filter-section + .filter-section`, ya no por `.filter-options + .filter-options`. No volver a la versión anterior, que en el flyout emitía un `.filter-options` pelado: `test/filters.test.js` y `e2e/filters.spec.js` cubren las dos caras (headers presentes / grupo sin label).
- **Tocar el corte "Ver más" de los filtros** (`maxVisible` por grupo, default `5`; la opción global `filtersMaxVisible` ya no existe): todo vive en `_buildFilterCheckboxes()` + `_buildFilterMore()`. El corte se calcula **solo si el grupo se colapsa** (`values.length > limit`, con `limit >= 2` resuelto por `_filterMaxVisible(field)`, que resuelve el `maxVisible` del grupo o el default). **El corte respeta el orden que el grupo ya tiene**: un grupo con `items` muestra los primeros declarados y esconde la cola, y solo un grupo **sin `items` ni `sortValues`** se reordena por **mayor conteo** (`counts[b] - counts[a]`; `sort` es estable así que los empates conservan el orden previo). Los valores de la cola se marcan `filter-option filter-option-extra` + `hidden` y el botón `button.filter-more` ("Ver más (N)" ⇄ "Ver menos") va al final del `.filter-options`; su handler alterna la clase `expanded` de `f.options`, que es lo que el SCSS usa para mostrar la cola (`display: none` / `display: flex` a la misma especificidad que `.filter-menu .filter-option`, porque el `display: flex` de autor le gana a la regla `[hidden]` de la UA; el atributo se mantiene igualado). **Un grupo con algún valor activo nunca queda colapsado** (`f.active.size > 0`), para no esconder un filtro aplicado. El estado de apertura vive en `_filterExpanded: Set<FilterField>` y **no** en el DOM, porque los checkboxes se reconstruyen (facets de API, re-scope de taxonomía) y el estado debe sobrevivir, igual que los toggles de taxonomías. El botón no llama a `_applyFilters()`: no es un filtro, es UI, y no debe re-renderizar el timeline. El corte es solo de los grupos `checkboxes`: un `select` no lo tiene (ver el punto siguiente).
- **El filtro `select` (`type: 'select'`)**: es el control para un campo con **muchos** valores, y es el segundo tipo del `FilterType` (`'checkboxes' | 'select'`, default `'checkboxes'`; cualquier otro valor descarta el grupo con `console.warn`). Tres reglas que no son obvias y que costaría volver a romper: (1) **el estado activo ya no vive en los checkboxes**: la única fuente de verdad es `FilterDef.active: Set<string>`, y los `input` de los checkboxes son una vista de ese set (`_syncFilterOptions()` los refleja). Un `select` no tiene checkboxes, así que cualquier consumidor que lea `f.checkboxes` para saber qué está filtrando está leyendo la mitad de la historia; para eso está `_filterActiveValues(f)`, y por eso la persistencia, `_buildQueryParams()` y `_syncFilterToggleState()` pasan todos por ahí. (2) **Un `select` no está en una columna**: `_normalizeFilters()` le deja `column: -1`, y `_buildFilterMenuHtml()` / `_buildInternalButtonsHtml()` lo sacan de la repartición en dos columnas y lo emiten primero, dentro de un `.filter-selects` (full-width, arriba de las columnas, y del mismo bloque en el flyout). Es el mismo `.filter-section` que los checkboxes, así que hereda el header y el separador. (3) **la lista es lazy y windowed**: `_ensureSelectOptions()` la arma en el primer click desde `select.values` (que ya están resueltos en `_buildFilterSelect()`, con sus labels en `select.labels`), pero **no la renderiza entera**: arma un `haystack` por valor en `select.haystacks` y deja solo los primeros `FILTER_SELECT_WINDOW` (50) matches en el DOM. El resto entra por `_extendSelectWindow()` — desde el `scroll` de la lista (`_maybeExtendSelectWindow()`) o desde el cursor del teclado (`_revealSelectCursor()`) — y `_extendSelectWindow()` **agrega** en vez de re-renderizar, justamente para no perder el `scrollTop` de una lista larga. `_renderSelectWindow()` sí reconstruye, y es lo que llama la búsqueda (`_filterSelectOptions()`), que corre sobre `select.haystacks` (**todos** los valores, no las filas) y deja el resultado en `select.matches`. Corolario: `select.options` son solo las filas renderizadas, así que nada que necesite "todos los valores" puede iterar `select.options` — tiene que ir por `select.values`/`select.matches`. El cursor del teclado camina `select.matches` (no las filas) y `_revealSelectCursor()` agranda la ventana si hace falta, con lo que <kbd>Home</kbd>/<kbd>End</kbd> alcanzan el primer y el último valor de los 400. `_ensureSelectOptions()` es además el seam natural para una carga por AJAX de los valores: no hay ninguna hoy, y no hay que tocar nada más para agregarla. El trigger reescribe los chips en `_renderSelectTrigger()`, y los muestra **todos** — no hay un "+N" que resuma la cola. Cada chip lo arma `_createSelectChip()`: un `span` con el label (el `…` lo pone `.filter-select-chip-label`, porque `text-overflow` solo funciona sobre un bloque con un nodo de texto directo y el chip es flex) y un `button.filter-select-chip-remove` con `tabindex="-1"`. Las dos cosas que no son obvias de ese botón: (a) su click hace `stopPropagation()`, porque el listener del trigger abre/cierra la lista y sin el corte quitar un valor abriría el desplegable; (b) el keydown del trigger arranca con `if (e.target !== select.trigger) return`, porque después de un click el botón queda enfocado y un <kbd>Enter</kbd> que suba hasta el trigger reabriría la lista (el corte por `target` cubre cualquier control anidado futuro, no solo este). El `tabindex="-1"` es deliberado: con cientos de valores, un tab stop por chip taparía el resto del panel, así que quitar por teclado se hace en la lista. El `<button>` anidado es HTML válido porque el trigger es un `div[role="combobox"]` y no un `<button>`. El cursor del teclado es una clase `.cursor` sobre la fila (`_renderSelectCursor()`), no un `focus`, porque las filas son `div`s y sin la clase se camina a ciegas; <kbd>Espacio</kbd> solo alterna si no hay buscador (si lo hay, la barra espaciadora es una barra espaciadora). El cierre por click externo vive en el `document.addEventListener` de `_bindBaseEvents()` y **corre antes** del cierre del panel, para que el click que cae en otra parte del panel no deje una lista colgando.
- **Tocar los facets (modo API)**: Los conteos son **estáticos**: se piden una sola vez con `GET {url}/facets` sobre la colección completa, sin `q` ni filtros, y `_apiFacets` no se vuelve a asignar. La lista (`GET {url}`) ya no los lleva; `_adoptLegacyApiFacets()` es el único fallback para backends que todavía los mandan en la respuesta. **El pedido es lazy y_cacheado**: nunca se llama a `_loadApiFacets()` directo, siempre a través de `_ensureApiFacets()`, que cachea la promesa en `_apiFacetsPromise` (incluso si el request falló, así que no hay reintentos). El enganche es **siempre en `_init()`**, en paralelo con la primera página: el facets no es solo del panel de filtros, también trae el `total` de la colección (contador del botón) y el `lastUpdated` (pie), y los dos se ven antes de que el usuario toque algo. El `if (this.api) void this._ensureApiFacets()` de `_toggleExpand()` queda como cache hit de seguridad, no como disparador. Los checkboxes se construyen **dos veces y solo dos**: una en `_init()` (sin conteos, para que los defaults de estado ya vayan en la primera request de la lista) y otra en el `.then()` de `_ensureApiFacets()` (que además parchea el contador con `_renderRelatedCount()` y el pie con `_renderLastUpdated()`, sin re-renderizar el timeline). Nunca en cada `_fetchPage()`: recrearlos en cada página borraría el estado de los filtros que no son de estado (`tonos_sociales`, `tipo_fuente`, `es_oficial`, `anio_publicacion`, `contenido`), que no se persisten. El rebuild no pierde estado igual: sin facets los grupos que **derivan** sus valores quedan ocultos (y con ellos `filterToggle`), así que no hay nada chequeable, los declarados (`items`) se muestran con los conteos en cero, y los de estado se restauran desde `localStorage`. El `catch` de `_loadApiFacets()` solo vacía `_apiFacets` si `_apiFacetsLoaded` es falso, para no pisar los facets legacy ya adoptados. El lado servidor vive en `example/server.js` (`STATIC_FACETS` + `STATIC_TOTAL` + `handleFacets`), y la ruta `/api/facets` tiene que declararse **antes** del branch `/api/:id`.
- **Cambiar el contrato de la API**: `example/server.js` es la fuente de verdad de los endpoints, igual que el mock para los datos. Todo cambio de request o respuesta se aplica en el mismo commit al servidor de ejemplo + las interfaces de `src/TimelineViewer.ts` (`TimelineApiPageResponse`, `TimelineApiFacetsResponse`) + los tipos distribuidos (`npm run build`) + la sección "Modo API (servidor)" del README. En modo API **no hay campo `featured`**: el stack colapsado se arma con los primeros `items` de la página (`allCards.filter(capturado !== false).slice(0, featured_count)` dentro de `_renderAll()`), así que el servidor tampoco recibe el parámetro `featured`. `_apiFeatured` ya no existe. **Hay dos totales y cada uno tiene su fuente**: el `total` de la lista (búsqueda + filtros) llena `_apiTotal` → el status "Mostrando A-B de Y publicaciones" y `_hasMorePages()`; el `total` de `GET {url}/facets` (colección completa, sin `q` ni filtros) llena `_apiCollectionTotal` → el contador y el `relatedLabel(count)` del botón de expandir, escrito por `_renderRelatedCount()`. Igual que en modo local, donde el contador es `_allItems().length` (pool sin filtrar) y la paginación corre sobre `allCards` ya filtrado. **No hay fallback**: si `/facets` no manda `total` (o falla), el contador queda en `0`; usar el `total` de la lista daría un número que se mueve con cada búsqueda, que es justo lo que el contador no debe hacer. **La lista tampoco devuelve `lastUpdated`**: ese campo llega solo con `GET {url}/facets` (o por la opción `lastUpdated` del constructor), por lo que `_fetchPage()` / `_appendPageItems()` no lo leen y el pie "Actualizado por última vez el ..." lo escribe `_renderLastUpdated()`, extraído de `_renderTimeline()` justamente para poder parchearlo cuando llegan los facets sin re-renderizar el timeline (re-renderizar perdería una tarjeta ya expandida). **El orden es 100% del servidor**: los parámetros son `sort` (`asc`/`desc`, siempre enviado por `_buildQueryParams()`, y cualquier valor distinto de `asc` cae a `desc`) y `sortBy` (el campo, que es `_sortField`), y el componente **nunca ordena del lado del cliente en modo API** — renderiza la página tal cual la devuelve el endpoint. O sea que `sortItems(items, field, sortAsc)` + `sortValue()` de `example/server.js` tienen que reproducir exactamente el comportamiento del `_sortBy()` + `_sortValue()` local —comparación natural y estable por el campo activo—, en particular **los ítems sin valor para ese campo van al final en `desc` y al principio en `asc`**: invertir solo la comparación (y no el caso del valor ausente) pone los sin valor de un lado en modo local y del otro en modo API, que es la divergencia que replica la API de producción.
- **Paginación en modo API — append, nunca rebuild**: `_appendPageItems()` **no** llama a `_renderAll()`. Agrega solo las tarjetas nuevas con `_appendTimelineItems()` (el hermano de `_renderTimeline()` sin el `innerHTML = ''`) y les pasa los nodos a `_setupTimelineObserver(added)`. La razón es que `.timeline-item` nace en `opacity: 0` y solo aparece con `.visible`: un rebuild en cada página hacía que **toda** la lista repitiera su animación de entrada (el flash que reportó el usuario), además de perder el detalle ya inyectado en las tarjetas expandidas y recargar todas las imágenes. Rebuild solo donde es semánticamente correcto, o sea cuando lo que hay en pantalla ya no son los artículos en memoria: `_fetchPage(1)` (búsqueda/filtro/orden), el re-scope de taxonomía y —con `pagination`— cada salto de página. Al agregar tarjetas nuevas hay que respetar el orden del bloque final (`[tarjetas…, nuevas…, loadMore|paginator, status, footer]`): `_insertBeforeTrailing()` inserta antes del primer elemento entre `.timeline-load-more-item`, `.timeline-paginator-item`, `.timeline-status-item` y `.timeline-footer-item`; `_insertBeforeFooter()` (usada por la fila de status y los dos controles) solo mira el footer. El botón de "Cargar más" de API se **conserva** entre páginas (su handler lee `this._apiPage`/`this._apiLoading` en el momento del click, no por closure) y solo se elimina cuando `_hasMorePages()` pasa a `false`; el de modo local sí hay que re-crearlo, porque ahí el handler captura `start`/`end`. El stack de featured no se re-renderiza en el append: solo se ve con el timeline colapsado, y el botón vive adentro del timeline (`max-height: 0` cuando está colapsado), así que es inalcanzable en ese estado.
- **Paginación numérica (`pagination: true`) — el otro modo de paginar**: con la opción activa **no hay "Cargar más"**: el control del final es `_renderPaginator()` ("Anterior | Página X de Y | Siguiente"), y `_renderAll()` elige entre los dos por `if (this.pagination)`. El criterio que separa los dos modos es **si la lista crece o se reemplaza**: "Cargar más" acumula páginas hacia abajo, así que el append sin rebuild de arriba es lo correcto; el paginador muestra páginas disjuntas, así que lo que hay en pantalla después del click ya no es lo que había, y por lo tanto el rebuild sí es lo correcto (mismo criterio que la regla de `_appendTimelineItems`). De ahí que en API reutilice `_fetchPage(page)` —el mismo call que ya hacen búsqueda/filtros/orden— y en local re-renderice desde `allCards`, que siempre tiene el pool filtrado entero. Los dos cursores son distintos y no se mezclan: `_page` es local, `_apiPage` lo posee el servidor. Todo lo que re-scopea o reordena el pool (búsqueda, filtros, orden, taxonomía) vuelve a página 1 por `_applyFilters()` en local y por `_fetchPage(1)` en API; `_goToPage()` recorta el destino en vez de rechazarlo, así que un resultado más corto aterriza en la última página y no en una vacía. El scroll al inicio lo hace `_fetchPage` con `if (page === 1 || this.pagination)`, delegando en `_scrollToTimelineTop()` (que tiene su propio corte por `fullpage`, ver el punto 5 del modo fullpage), para que la ruta de filters no cambie; `_goToPage()` lo llama **además**, en el acto y antes de esperar el request, porque en `fullpage` el `scrollTop` de la lista no scrollea y esperar el response dejaría la vista en el medio de la página que se está dejando. No compite con el de `_fetchPage` (que lo re-arma cuando aterrizan los datos): `_renderApiLoading()` corre sincrónicamente, así que para cuando `_goToPage` scrollea la lista ya es la nueva. **El stack de featured se congela en la página 1** (`_apiFeatured()` + `_apiFeaturedCards`): en API sale de los items en memoria, o sea de la página en pantalla, así que sin esto colapsar en la página 3 mostraría "las destacadas" de esa página. En local no hace falta porque `_featuredCards` ya es el pool completo. Con `pagination`, la fila de status **no muestra la carga, pero sí el conteo** (las líneas de error y de carga son exclusivas de API, porque en local no hay request propio que falle o que esperar; lo único que la fila escribe en local es el conteo): la carga la cubren los skeletons, porque el cambio de página es un request que **reemplaza** la lista y `_renderApiLoading()` se llama desde `_fetchPage()`, el trigger único de ese estado. Antes esa cobertura no existía y el pie decía "Cargando página N...", con las cartas de la página anterior todavía en pantalla; por eso `_renderStatus()` no tiene rama de carga para la paginación y su única línea de carga es "Cargando más publicaciones...", de `_appendPageItems()`, que solo existe sin `pagination`. El conteo es un **rango de posiciones**, no una cantidad: "Mostrando 11-20 de 55 publicaciones", que es lo que dice `_statusCountText()` (la única fuente del texto; devuelve `''` si no hay total o si una página volvió vacía, y el `end` se clampa al total porque un server puede devolver más items de los pedidos). Sale en los **cuatro** modos (local/API × paginador/"Cargar más"), y lo único que cambia entre ellos es de dónde salen los tres números: el **total** es `_apiTotal` en API (búsqueda + filtros, los manda el server) y `allCards.length` en local (el pool filtrado entero); el **cuánto hay en pantalla** es `allCards.length` en API —donde `allCards` **es** la página, o lo acumulado con "Cargar más"— y `_localDisplayCards().length` en local, porque ahí `allCards` siempre tiene el pool completo (y `_localDisplayCards()` es la misma lista que se le pasó a `_renderTimeline`, así que no puede desincronizarse de lo que se ve); y el **start** sale de `(_currentPage() - 1) * _pageSize() + 1` con el paginador y es 1 fijo con "Cargar más", porque la lista solo crece hacia abajo. Con `itemsPerPage: 0` el tamaño es 0 y eso colapsa el start a 1, que es lo correcto: la lista entera está en pantalla. No es redundante con el "Página X de Y" del paginador — ese dice cuál es la página y cuántas hay, el conteo dice qué tranche del resultado filtrado está en pantalla. En local la fila se escribe en la rama local de `_renderAll()` y también en el click de "Cargar más" (el único camino que hace crecer la lista sin pasar por `_renderAll()`); en API la escriben `_renderAll()`, `_appendPageItems()` y el `catch` de `_fetchPage()`. Un request fallido deja la lista vacía con el error, también al cambiar de página: el paginador se va con las tarjetas y no se vuelve a la anterior, hay que reintentar o recargar. `_apiPageSize()` con `itemsPerPage: 0` pide `API_UNBOUNDED_PAGE_SIZE`: el 0 documentado ("sin paginación") tiene que traer todo en una sola respuesta, y pedir una página chica dejaría al usuario con los primeros items y sin forma de pedir el resto.
- **Tocar las featured**: en modo local salen de `_featuredCards` (pool completo, armado en `_applyFilters()`); en modo API salen de `allCards`, o sea los primeros items de la página actual —salvo con `pagination`, donde se congelan las de la página 1 (ver arriba).
- **Tocar el estado expandido/colapsado del timeline**: El estado vive en `isExpanded` y solo se refleja en el DOM por `_applyExpandState()` / `_collapseExpandState()` (clases `expanded` en `section` y `timelineContainer`, rotación de `expandIcon` y `aria-expanded` del botón). `_toggleExpand()` solo hace el flip de `isExpanded` y delega en esos dos helpers: no agregar `classList.add/remove('expanded')` en ningún otro lado. La opción `startExpanded` (default `false`, sin persistencia) se aplica en `_init()` **antes** de `_applyFilters()`, porque el IntersectionObserver del timeline se engancha desde `_renderAll` y debe encontrar el container ya abierto (`max-height: 99999px`) en lugar de colapsado (`max-height: 0`). El preload de embeds va **después** de los datos, porque `_preloadEmbedLibraries()` deduce los tipos leyendo `this.allCards`. En modo API va enganchado a la promesa de `_fetchPage(1)`, para no correr en cada re-render; esa rama de `_init()` pide la primera página y los facets (que arman los checkboxes con los conteos) **siempre y en paralelo**, porque el contador y el pie ya se ven colapsados. `startExpanded` vale para cualquier modo, no solo single, y no cambia qué se pide: solo el estado inicial del DOM. La clase `has-taxonomy` es independiente del estado expandido: la agrega `_buildTaxonomySelect()` (solo cuando la fila del selector se conserva) y el SCSS la combina con `expanded` para ocultar `#remaining-count`, de modo que con taxonomías el único contador visible al abrir el timeline sea el de la píldora del selector.
- **Tocar el modo fullpage** (`fullpage: true`): es el único modo donde el timeline no se puede colapsar, así que tiene **cuatro cortes explícitos** en el TS y el resto es SCSS. (1) El constructor fuerza `this.isExpanded = this.fullpage || config.startExpanded === true` (por eso `fullpage` se asigna **antes** que `isExpanded` en el mismo bloque de asignaciones). (2) `_toggleExpand()` arranca con `if (this.fullpage) return;`: es la única red de seguridad, y cubre los tres caminos que llegan ahí (`#expand-toggle`, `#featured-cards` y `.featured-row`), por lo que además `_bindBaseEvents()` **no** bindea el click del botón — no volver a agregar la condición en cada listener. (3) `_buildLayout()` **no emite** el `div.timeline-resize-handle` y `_init()` **no** llama a `_initResizeHandle()`: si se llamara, leería `tv-timeline-cards-height` de `localStorage` y escribiría un `max-height` inline que pisaría el `none` del SCSS. Si se toca el resize handle, revisar las dos líneas: son la misma decisión. (4) `_renderFeatured()` y el loop de featured skeletons de `_renderApiLoading()` hacen early-return: en fullpage el stack nunca se ve (`expanded` lo colapsa a `height: 0`), así que no se construye nunca y `_featuredCards` (que `_applyFilters()` sigue calculando, barato porque son solo referencias) queda sin consumidor. Todo lo demás que consulta `featuredContainer` —los rAF que agregan `.visible`, `_clearApiLoading`, el click— es no-op solo por tener el contenedor vacío, así que **no** hay que guardarlo ni eliminar el `div#featured-cards` del markup (sacarlo deja `this.featuredContainer` en `null` y obliga a proteger 6 call sites). El `_getCardsHeightPx()` tiene su propio early-return a `window.innerHeight`: sin él, el `max-height: none` da `parseFloat('none') === NaN` y los skeletons de `_renderApiLoading()` caen al `RESIZE_MIN_HEIGHT`, o sea **un solo** placeholder. El layout en sí (barra sticky con fondo opaco, `min-height: 0` de `.featured-row`, `margin-top: 0` de `.timeline-container`, sin `max-height` en `.timeline-cards`, sin `expand-icon`) es un único bloque `&.fullpage` del SCSS, que va **después** de `&.expanded` porque comparte especificidad con él y el orden en el fuente es lo que resuelve. El offset de la barra sale de `--tv-sticky-top` (`:root`), por si el consumidor tiene un header propio. No aplica a single mode: `_renderSingleCard()` no pasa por `_buildLayout()` y ya renderiza una única tarjeta expandida. (5) **El scroll del timeline no es el mismo en los dos modos**: en el normal `#timeline-cards` es la caja con scroll (`max-height` + `overflow-y: auto`), pero en fullpage el SCSS la saca de su scroll box (`max-height: none; overflow: visible`) y scrollea la página, así que **`this.timelineCards.scrollTop = 0` es un no-op** — el mismo bug que hace que un cambio de página aterrice en el medio de la lista. Por eso todo "volver arriba" pasa por `_scrollToTimelineTop()`, que en fullpage busca el ancestro scrolleable con `_findScrollContainer()` (mismo helper que usa `_scrollToSection()`, y que también cubre que el consumidor monte el componente dentro de un contenedor scrolleable propio, con `window` como último recurso) y scrollea hasta dejar la lista **justo debajo de la barra sticky**, leyendo el offset del `getBoundingClientRect().bottom` de `.featured-row` en vez de una constante. Los dos call sites son la línea `if (page === 1 || this.pagination)` de `_fetchPage()` y el final de `_goToPage()`; no volver a escribir `scrollTop = 0` en ninguno de los dos.
- **Cambiar el scope de los datos** (taxonomías): `_scopeItems()` para el timeline/filtros/paginación y `_allItems()` para las featured, el total del contador y el modo single. El selector vive en `_buildTaxonomySelect()` y su change en `_onTaxonomyChange()`. `_contentIndex === ALL_TAXONOMIES_INDEX` (`-1`) significa "Ver todo" y hace que `_scopeItems()` devuelva el pool completo. No agregar una tercera fuente de datos.
- **Modificar estilos**: Editar `src/styles.scss`. Todos los estilos están bajo `.publicaciones-section`. Las variables CSS custom están al inicio del archivo.
