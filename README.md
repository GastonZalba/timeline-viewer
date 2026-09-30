# TimelineViewer

Interactive timeline component that displays news articles as an overlapping card stack with an expandable full timeline view.

## Installation

```bash
npm install https://github.com/GastonZalba/timeline-viewer
```

## Usage

```js
import Timeline from 'timeline-viewer';

new Timeline({
  container: '#my-container',
  content: [
    {
      label: 'Tecnología y herramientas',
      items: [
        {
          id: 'FUE-00001',
          nombre_fuente: 'Lanzamiento del nuevo framework de JavaScript',
          resumen_ia: 'El nuevo framework promete revolucionar la forma en que construimos aplicaciones web.',
          thumbnail: 'https://picsum.photos/seed/noticia1/600/400',
          link_web: 'https://dev.to/news/javascript-framework-2026',
          fecha_publicacion: '2026-06-25',
          fecha_scrapeo: '2026-06-25T14:30:00',
          tonos_sociales: ['Positivo'],
          fuente_institucional: 'Dev.to',
          tipo_fuente: 'Sitio web o portal',
          es_oficial: true,
          validado: true,
          adjuntos: [],
          actores_principales: ['Ana García', 'Carlos Ruiz'],
          screenshot: 'https://picsum.photos/seed/captura/400/800',
          imagenes: [
            {
              thumb: 'https://picsum.photos/seed/img1/300/200',
              full: 'https://picsum.photos/seed/img1/600/400'
            }
          ],
          links_videos: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
          temas: []
        }
      ]
    }
  ],
  featuredCount: 6,
  itemsPerPage: 10,
  inlineImages: true,
  inlineAdjuntos: true,
  lastUpdated: '2026-06-25T14:30:00'
});
```

## Options

The `Timeline` constructor accepts a single config object:

| Option          | Type                           | Default    | Description                          |
|-----------------|--------------------------------|------------|--------------------------------------|
| `container` | `string` (CSS selector/Element) | **required** | DOM element to mount into |
| `content`       | `ContentGroup[]`              | `[]`       | Optional. Array of `{ label, items }` groups: the **medium taxonomies**. The `label` of each group becomes an option of the selector shown above the expanded timeline, shown next to the number of articles of that group, and the timeline and the filters are scoped to the selected group (with 2+ groups a trailing **"Ver todo"** option scopes the timeline back to the whole pool). The counter in the expand button always shows the **total of every group**, regardless of the selected taxonomy. Takes precedence over `items`. Groups with no `label` or with an empty `items` array are ignored. When no group survives (or in API mode) **no selector is rendered and the layout is unchanged**. See [Content taxonomies](#content-taxonomies) |
| `items`         | `TimelineItem[]`              | `[]`       | Legacy flat list of article card objects. Ignored when `content` is set. Kept for backwards compatibility: with no `content` the component behaves exactly as before |
| `api`           | `{ url: string; fetchImpl?: typeof fetch }` | — | Optional. Enables **API mode**: the component fetches the paginated list from `{url}`, the static collection values (filter counts, total, `lastUpdated`) from `{url}/facets` (**once, at startup**) and the lazy detail of each card from `{url}/:id`. When set, `content` and `items` are ignored, **no taxonomy selector is rendered**, and filters, search, sort and pagination are resolved server-side. `fetchImpl` allows injecting a custom fetch (useful for tests or auth headers) |
| `featuredCount` | `number`                       | `6`        | Cards in the featured stack          |
| `startExpanded` | `boolean`                      | `false`    | When `true`, the timeline starts **already expanded** instead of collapsed on the featured stack. It only sets the initial state: the expand toggle keeps working and the choice is **not persisted**, so every page load starts from this value. Ignored in single mode (`singleId`), which always renders a single expanded card. |
| `fullpage`    | `boolean`                      | `false`    | When `true`, renders in **fullpage mode**: the timeline is always open and the **page itself is what scrolls**. It implies `startExpanded`, makes the timeline non-collapsible (the expand button keeps showing the related count but loses its chevron and its click), removes the height limit of the list (so `#timeline-cards` is never a scroll box on its own), removes the **resize handle**, and **pins the toolbar** (counter, search, filters, sort and internal buttons) to the top of the viewport. The featured stack is not rendered at all, since it would never be seen, so `featuredCount` has no effect. Ignored in single mode (`singleId`), which already renders a single expanded card. See [Fullpage mode](#fullpage-mode) |
| `filters` | `TimelineFilter[]` | — | Optional. Declares the **filter groups** of the toolbar: each one has a `field`, a `label`, a `group` (`'menu'` panel column or `'filtros_internos'` internal-filters flyout) and its `items` (the values it offers, with their label and whether they start checked). Both the toolbar and the query parameters of API mode come from here, so without the option there is **no filter UI at all** (no button, no panel, no params). A group without `items` derives its values from the data. Groups with a missing `field`/`label`, an unsupported `type`, a duplicated `field` or an unusable `items` are dropped with a `console.warn`. See [Configurable filters](#configurable-filters) |
| `itemsPerPage`  | `number`                       | `10`       | Items per page in timeline. `0` shows all items without pagination |
| `pagination`    | `boolean`                      | `false`    | When `true`, the **"Cargar más" button is replaced by a paginator** — "‹ Anterior &#124; Página X de Y &#124; Siguiente ›" — that jumps between fixed-size pages instead of appending them, in local mode and in API mode alike. `itemsPerPage` is the size of every page, so the current page always shows exactly that many articles (less on the last one), which is what the API mode already sends per request. `0` still means "no pagination" (no paginator, no button). Because the pages are disjoint, a page change **replaces** the list rather than adding to it, and the timeline scrolls back to the top; in API mode the outgoing cards are swapped for the loading placeholders right away, since they are no longer what was asked for. The featured stack stays on the first page's, so collapsing the timeline always brings back the same articles. Works together with the search, the filters, the sort and the taxonomy selector: any of them starts over at page 1. Ignored in single mode (`singleId`) |
| `lastUpdated`   | `string` (ISO date)            | `''`       | Timestamp shown in the footer        |
| `inlineImages`  | `boolean`                      | `false`    | When `true`, shows the `imagenes` thumbnails inline inside each expanded card (below the summary, before the topics) and hides the "Imágenes" action button (the inline thumbs replace it). Clicking a thumbnail opens the gallery at that image |
| `inlineAdjuntos` | `boolean` | `false` | When `true`, shows the `adjuntos` inline inside each expanded card (below the topics) as a list of file names with a type icon (PDF vs generic, inferred from the extension), and hides the "Adjuntos" action button |
| `internalButtons` | `boolean` | `false` | When `true`, shows the internal work controls in the timeline toolbar: the red "work notes" toggle (hide/show `notas_de_trabajo` on cards and topics) and the red "Filtros internos" flyout button. The flyout only renders when the `filters` option declares at least one group with `group: 'filtros_internos'` (validado / capturado / descartado in the demo). When `false` (default) those buttons are not rendered |
| `relatedLabel`   | `(count: number) => string`    | —          | Optional. Function that returns the expand button label ("publicaciones relacionadas") for the given count. When unset, the default Spanish label is used with singular/plural logic. `count` is the **total number of publications, independent of the selected taxonomy** (the same number shown next to the label), which keeps the singular/plural grammatical. The returned string is injected as **HTML (not escaped)**, so it can contain markup (e.g. `'artículos relacionados sobre <b>Plan Integral</b>'`); escape any untrusted value before returning it |
| `singleId`       | `string`                       | —          | Optional. When set (e.g. `'/FUE-0001'` or `'FUE-0001'`), renders a **single already-expanded card** with its full detail and no timeline chrome (no featured stack, filters, search, sort, pagination or status bar). The card cannot be collapsed. With `internalButtons: true`, a toolbar with the red work-notes toggle is shown above the card. Works in both local (`items`) and API mode. The navigation links block under the card is not configured here: it comes from the item's own `taxonomias` field. See [Single view taxonomies](#single-view-taxonomies) |

### Item fields

Each object in `content[].items` (or in the legacy `items`) supports these fields:

| Field                  | Type                        | Description                              |
|------------------------|-----------------------------|------------------------------------------|
| `id`                   | `string`                    | Unique identifier (e.g. `FUE-00001`)    |
| `nombre_fuente`        | `string`                    | Article headline                         |
| `resumen_ia`           | `string` / `null`          | AI-generated short summary. Hidden (not rendered) when `null` |
| `thumbnail`         | `string` (URL) / `null`     | Main card image                          |
| `link_web`             | `string` (URL)              | External article link                    |
| `fecha_publicacion`    | `string` (YYYY-MM-DD)       | Publication date                         |
| `anio_publicacion` | `string` / `null` | Year of `fecha_publicacion` already reduced to text, or `null` when the item has no date. Precomputed by the pipeline so a year filter needs no `extract` |
| `fecha_scrapeo`        | `string` (ISO)              | When it was crawled                      |
| `tonos_sociales`      | `string[]`                  | Overall sentiment(s) — unique tones present in the article's `temas` |
| `fuente_institucional` | `string` / `null`          | Source / publication name                |
| `tipo_fuente` | `string` / `null` | Source type. One of: `Decreto o norma`, `Libro o publicación`, `Sitio web o portal`, `Red Social`, `Gacetilla o comunicado de prensa`, `Video`, or `null` when the detection has no type yet |
| `es_oficial`            | `boolean`                   | Whether the source is official (`true`) or not (`false`) |
| `validado`              | `boolean` / `null`          | Whether the article has been validated (`true`), not validated (`false`), or pending/unknown (`null`) |
| `capturado`             | `boolean`                   | Whether the article has been captured by the pipeline. When `false`, the entry is an unprocessed detection and only `id` and `link_web` are populated; all other fields are empty |
| `descartado`            | `boolean` / `null`          | Whether the article has been discarded (`true`), kept (`false`), or unknown (`null`). By default the filter excludes discarded articles |
| `adjuntos`              | `string[]`                  | Attached files/links — may be empty |
| `contenido` | `string[]` | Content types the item carries, preclassified for filtering: `adjuntos`, `video`, `imagenes` (any combination, possibly empty) |
| `actores_principales`  | `string[]` / `null`        | Key people or entities                   |
| `screenshot`           | `string` (URL) / `null`     | Screenshot image URL                     |
| `imagenes`             | `{ thumb: string; full: string }[]` / `null` | Image gallery with low-res `thumb` and full-res `full` URLs. `null` is accepted and treated as an empty gallery |
| `links_videos`         | `string[]` (URL) / `null`  | Optional. Related video links rendered as embeds in the "Videos vinculados" section when the card is expanded. Only supported platforms (YouTube, etc.) are embedded; others are ignored |
| `has_video`            | `boolean`                   | Indicates whether the item has audiovisual content: `true` when `links_videos` is non-empty or when `link_web` points to a video (e.g. YouTube, Instagram reel) |
| `notas_de_trabajo`     | `string` / `null`           | Optional. Working notes displayed as a red badge above the summary in both collapsed and expanded card states |
| `link_edit_entry`     | `string` (URL) / `null`     | Optional. URL to an edit form. When present, a red "Editar" button is shown next to the "Visitar" button in the card actions |
| `link_view_entry`     | `string` (URL)               | Optional. URL of the item's own **individual view** (the one `singleId` renders). Two things are built from it: the "Información" menu shows the `ID` value as a link with the external-link icon (opened in a new tab, `target="_blank"`), and a floating share button appears below the card's info button. Relative URLs are resolved against the current page (e.g. `'?id=FUE-00001'` or `'/articulos/FUE-00001'`). When the field is absent, the `ID` is plain text and no share button is rendered. The share button uses the [Web Share API](https://developer.mozilla.org/docs/Web/API/Navigator/share) (`{ title, url }`) when available — mobile and Safari; where it is not available (e.g. desktop Chrome) it copies the absolute URL to the clipboard, the icon turns into a checkmark and a small "Copiado al portapapeles!" toast appears under the card buttons for 1.5s |
| `temas`                | `{ titulo, resumen, tono_social, fecha_narrativa?, notas_de_trabajo? }[]` | Topics / themes within the article. `fecha_narrativa` is an optional `string` (`YYYY-MM-DD`) or `null`. `notas_de_trabajo` is an optional working note displayed as a red badge below the theme description |
| `taxonomias`           | `{ label: string, items: { content: string, link: string }[] }[]` | Optional. Groups of navigation links rendered as a block **under the card in single mode** (`singleId`), each group in its own column. See [Single view taxonomies](#single-view-taxonomies) |

> **Importante:** `example/mock-data.js` es la fuente de verdad para probar el componente. Cualquier campo que se agregue, renombre o elimine en el mock **debe** actualizarse en el mismo cambio en la interfaz `TimelineItem` (`src/TimelineViewer.ts`), en la declaración de tipos generada (`dist/TimelineViewer.d.ts` vía `npm run build`) y en esta tabla de campos. Los valores de `tipo_fuente` y los `tonos_sociales` se documentan según los que existen en el mock.

### Modo API (servidor)

Para volúmenes grandes se puede delegar el filtrado, la búsqueda, el orden y la paginación al servidor. En vez de `content` (o `items`), se pasa una configuración `api`:

```js
new Timeline({
  container: '#my-container',
  api: { url: '/api' },
  itemsPerPage: 10,
  featuredCount: 6
});
```

En este modo la lista viaja solo lo que la tarjeta colapsada muestra de inmediato (título, resumen, thumbnail, badges, tonos, fecha y `link_view_entry` para el botón de compartir). El resto — barra de acciones (captura, imágenes, adjuntos, abrir, editar), embed de la publicación original, menú de información, actores, fuente, temas, media, videos y los grupos de `taxonomias` del modo single — se obtiene con `GET {url}/:id`, que devuelve el contrato completo de `TimelineItem`.

Al iniciar se hacen **dos** requests, en paralelo: `GET {url}` (la primera página, que basta para el stack colapsado de destacadas) y `GET {url}/facets`, que trae los **valores estáticos de la colección** —los conteos de los filtros, el total y el `lastUpdated`— y por eso se piden una única vez: de ahí en adelante cada cambio de búsqueda, filtro u orden vuelve a pegarle solo a la lista, sin volver a pedir los facets y conservando el estado de los checkboxes.

Mientras una respuesta de lista está en vuelo, el componente muestra **tarjetas fantasma con shimmer** en vez de los resultados anteriores: los que están en pantalla ya no corresponden a lo pedido, así que se van en el acto y se reponen cuando llegan los datos, con la lista nuevamente arriba. Es lo que corresponde a todo request que **reemplaza** la lista: el inicial, los de búsqueda / filtros / orden y también el cambio de página del paginador numérico (`pagination: true`), que muestra los skeletons en el acto en vez de dejar la página que se está dejando en pantalla. Las acciones discretas (un checkbox, el botón de orden, `Esc` en el buscador) disparan su request **sin espera**; el texto del buscador espera 300 ms a que se termine de escribir, para no pedirle al servidor un request por tecla. "Cargar más" no hace nada de esto: deja las tarjetas que ya estás leyendo y solo agrega la línea "Cargando más publicaciones..." al pie. Con el paginador, esa fila de status solo puede mostrar el **error**: la carga la cubren los skeletons y el conteo ("Mostrando X de Y") lo reemplaza el "Página X de Y" del propio paginador. Si un request falla, la lista queda vacía con el mensaje de error — también al cambiar de página, sin volver a la página anterior: hay que reintentar la acción o recargar.

#### Endpoints

| Endpoint          | Uso                                                                    | Respuesta                    |
|-------------------|------------------------------------------------------------------------|------------------------------|
| `GET {url}`       | Lista paginada con búsqueda, filtros y orden                        | Objeto con `items` y `total` |
| `GET {url}/facets` | Valores estáticos de la colección completa: conteos de los filtros, total y `lastUpdated`. Se pide **una sola vez**, al iniciar, en paralelo con la primera página | Objeto con `facets`, `total` y `lastUpdated` opcional |
| `GET {url}/:id`   | Detalle completo de un artículo (cargado lazy al expandir la tarjeta, y en single mode) | El `TimelineItem` completo, **sin envolver** (no lleva `{"item": ...}`) |

> El campo `items` de la respuesta es la lista paginada que devuelve el servidor y **no** tiene relación con la opción `content` ni con el alias legacy `items`. En modo API no se renderiza el selector de taxonomías.

> `GET {url}/facets` tiene prioridad sobre `GET {url}/:id`: una ruta `/facets` no puede ser un id de artículo.

#### Parámetros de `GET {url}`

Los parámetros de filtro son los **grupos declarados** en la opción `filters`, con los valores activos como CSV. Los del modo local y del API son idénticos: el servidor los acepta aunque la colección no tenga valores para un campo. Los del demo (declarado en `example/filters.js`):

| Parámetro          | Tipo      | Descripción                                                              |
|--------------------|-----------|--------------------------------------------------------------------------|
| `page`             | `number`  | Página solicitada, 1-indexed (default `1`). Es el cursor del servidor: el componente nunca pagina del lado del cliente en modo API, así que cada salto de página es un request a este endpoint |
| `pageSize`         | `number`  | Ítems por página (default `10`). Con `itemsPerPage: 0` ("sin paginación") el componente manda un `pageSize` enorme para traer la colección entera en una sola respuesta, así que el server no tiene que reconocer un modo "todo" aparte |
| `sort`             | `asc`/`desc` | Orden por `fecha_publicacion` (el campo es fijo, el parámetro solo lleva la dirección). `desc` (reciente primero) es el default; cualquier valor distinto de `asc` cae a `desc`. Los ítems **sin fecha van al final en `desc` y al principio en `asc`**, que es lo que hace el componente en modo local |
| `q`                | `string`  | Texto libre. Coincide con `id`, `nombre_fuente`, `fuente_institucional` y `actores_principales`, sin distinguir acentos ni mayúsculas |
| `tonos_sociales`   | `string`  | CSV de tonos (`Positivo`, `Negativo`, `Neutro`) — OR dentro del campo    |
| `tipo_fuente` | `string` | CSV de tipos (`Sitio web o portal`, ...) o `null` para los que no declaran tipo |
| `anio_publicacion` | `string` | CSV de años (`2026`, ...) o `null` para el ítem sin fecha |
| `contenido`        | `string`  | CSV de `adjuntos`, `video`, `imagenes`                                   |
| `validado` | `string` | CSV de `true`, `false`, `null` (los tres tildados por defecto) |
| `capturado` | `string` | `true` (por defecto) o `false` |
| `descartado` | `string` | `false,null` (por defecto) o `true` |
| `es_oficial` | `string` | `true` / `false` |

> **Los valores viajan tal como los declara el consumidor.** El `value` de cada ítem es el token que se manda: `true` viaja como `true`, `false` como `false` y `null` como `null` (el string de cuatro letras, no ausencia). Cuando un ítem declara varios valores, viajan unidos por comas en el mismo param: `{ value: [false, null] }` se manda como `descartado=false,null`, y el servidor lo parte por comas como cualquier otro CSV. Por eso un `value` no puede contener una coma: `_normalizeFilters()` descarta el grupo entero con un `console.warn`. En el lado del ítem la comparación es por token: un `null` matchea los ítems que no traen el campo (o lo traen en `null`), y un valor que el ítem trae en un array cuenta (`tonos_sociales`, `contenido`).

> **Dónde caen los ítems sin fecha.** El bucket de los que no tienen `fecha_publicacion` **es parte de la dirección**, no un grupo fijo: en `desc` quedan al final y en `asc` quedan al principio. No alcanza con invertir la comparación de fechas, hay que invertir también ese caso. Es el comportamiento del modo local, que ordena descendente y después da vuelta el array (`_sortByDateDesc()` + `reverse()` en `_applyFilters()`), así que un backend que lo haga de otra forma muestra los sin fecha en un lado en un modo y en el otro en el otro, y el componente no tiene forma de corregirlo: en modo API nunca ordena del lado del cliente, renderiza la página tal cual la devuelve el servidor.

#### Respuesta de `GET {url}`

```jsonc
{
  "items": [/* TimelineItemSummary[] */],
  "total": 123               // total de publicaciones que matchean búsqueda + filtros
}
```

> Hay **dos** totales y no son lo mismo: el `total` de la lista es lo que matchea búsqueda + filtros, y alimenta la paginación —el status "Mostrando X de Y publicaciones" y la aparición del botón "Cargar más" (`Y` = `total`), o el "Página X de Y" del paginador cuando `pagination: true`—; el `total` de `GET {url}/facets` es el de la colección completa, sin `q` ni filtros, y alimenta el número y el `relatedLabel` del botón de expandir. Igual que en modo local, donde el contador es `_allItems().length` (pool sin filtrar) y la paginación corre sobre los items ya filtrados. Por eso el contador no se mueve al buscar o filtrar.

> Las tarjetas destacadas (el stack colapsado) se arman con los **primeros `items` de la página** —las primeras con `capturado !== false`, hasta `featuredCount`—, así que el servidor no devuelve ningún campo `featured` ni recibe el parámetro `featured`. Con `pagination: true` se capturan en la **primera** página y no cambian al navegar: colapsar el timeline en la página 3 vuelve a mostrar las destacadas de la primera, no las de la que se está viendo.

> `lastUpdated` **no** viaja en la lista: llega con `GET {url}/facets` (o se pasa por la opción `lastUpdated`). Como los facets se piden al iniciar, el pie "Actualizado por última vez el ..." del timeline ya está completo en el primer render, sin volver a renderizar las tarjetas.

#### Respuesta de `GET {url}/facets`

```jsonc
{
  "facets": {
    "tonos_sociales": { "Positivo": 15, "Negativo": 5, "Neutro": 8 },
    "tipo_fuente": { "Sitio web o portal": 9, "null": 2 },
    "anio_publicacion": { "2026": 15, "null": 2 },
    "contenido": { "adjuntos": 4, "video": 6, "imagenes": 8 },
    "validado": { "true": 12, "false": 3, "null": 4 },
    "capturado": { "true": 17, "false": 2 },
    "descartado": { "true": 2, "false": 12, "null": 5 },
    "es_oficial": { "true": 10, "false": 9 }
  },
  "total": 19,                              // total de la colección, sin q ni filtros
  "lastUpdated": "2026-06-25T14:30:00"     // opcional
}
```

Los `facets` y el `total` se calculan sobre la **colección completa**, sin depender de `q` ni de los filtros activos, y por eso no cambian: se piden una sola vez, al iniciar, y tanto el panel de filtros como el contador del botón de expandir se reconstruyen con ese único request (los checkboxes se crean de antemano sin conteos, así que los `checked` declarados —o los `filtros_internos` ya persistidos— viajan en la primera request de la lista). Como consecuencia, los números entre paréntesis son el total de la colección y **no** el conteo de la búsqueda actual, y los valores de un filtro no desaparecen al filtrar (un grupo que deriva sus valores se oculta solo si la colección tiene un solo valor para ese campo; uno que declara `items` no se oculta nunca). **Las claves de los facets son los mismos tokens que los `value` declarados**: como la comparación es por token, `"null"` cuenta los ítems sin valor y `"true"` los que traen el booleano, así que el servidor no renombra nada (`example/server.js` ya no tiene lógica por campo: solo tokeniza con `String()`).

Mientras los facets no llegan, el botón de filtros queda **visible pero inerte**: se muestra igual para que la barra no cambie de ancho a mitad de carga, sin listener y con el panel sin nada que abrir — salvo los grupos que declaran `items`, que ya muestran sus checkboxes sin conteos (en cero). El contador del botón de expandir muestra `0` y el pie "Actualizado por última vez el ..." todavía no se muestra.

Cuatro detalles del ciclo de vida:

- Si `GET {url}/facets` falla, la lista se sigue mostrando y el panel de filtros queda sin los conteos (los grupos que declaran `items` siguen con `(0)`). No hay reintentos, y un fallo **no** borra unos facets que ya se hayan adoptado desde la lista.
- Si la respuesta no trae `total`, el contador del botón de expandir queda en `0`: no se usa como fallback el `total` de la lista (que cambia con la búsqueda y los filtros y daría un número que se movería). El `lastUpdated` sí acepta la opción `lastUpdated` del constructor como fuente.
- Por compat, si la respuesta de `GET {url}` todavía trae un campo `facets` y el endpoint dedicado no respondió, se usan esos valores. Sirve para backends que todavía no migraron; no hay que mandarlos en las páginas siguientes.
- Los grupos con `items` arrancan con los `checked` que declaran (el demo: `capturado`, `descartado` = `false,null`, y `validado` con los tres; los `filtros_internos` además se persisten en `localStorage`) y esos valores viajan en la **primera** request, igual que en el modo local.
- Un grupo **derivado** en modo API no ofrece la clave `"null"` del facet (igual que en local, donde los ítems sin valor no generan ningún valor), salvo que declare `allowEmpty: true`: entonces aparece como `"Sin valor"` al final, y tildarla manda `campo=null` en la lista, que el servidor tiene que resolver contra los ítems que no traen el campo.

#### `TimelineItemSummary`

Los ítems de la lista llevan solo los campos que la tarjeta colapsada muestra de inmediato. Todo lo que aparece al expandir (barra de acciones, embed de `link_web`, menú de información, actores, fuente, temas, imágenes, adjuntos y videos) se carga con `GET {url}/:id`.

| Field                  | Type                        |
|------------------------|-----------------------------|
| `id`                   | `number` / `string`        |
| `nombre_fuente`        | `string`                    |
| `resumen_ia`           | `string` / `null` (opcional) |
| `thumbnail`            | `string` (URL) / `null`     |
| `fecha_publicacion`    | `string` (YYYY-MM-DD)       |
| `tonos_sociales`       | `string[]`                  |
| `es_oficial`           | `boolean`                   |
| `validado`             | `boolean` / `null`          |
| `capturado`            | `boolean`                   |
| `descartado`           | `boolean` / `null`          |
| `notas_de_trabajo`     | `string` / `null` (opcional) |
| `link_view_entry`      | `string` (URL) (opcional) |

`link_web` solo se incluye cuando `capturado === false` (esos ítems no son expandibles y muestran únicamente su `id` y enlace). `link_view_entry` sí viaja en la lista, porque el botón de compartir y el link del `ID` se renderizan en la tarjeta colapsada.

El campo `taxonomias` **no viaja en la lista**: solo se usa debajo de la tarjeta en modo single, y en ese modo el artículo ya se pide entero con `GET {url}/:id`.

### Embedded content

When the card is expanded, `link_web` is automatically parsed for supported platforms and embedded just above the card actions:

| Platform  | URL pattern                    | Method                                                  |
|-----------|--------------------------------|---------------------------------------------------------|
| YouTube   | `/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/` | Direct `<iframe>` with 16:9 aspect ratio          |
| Instagram | `/p/`, `/reel/`, `/tv/`        | Official [embed.js](https://www.instagram.com/embed.js) via `<blockquote class="instagram-media">` |
| Twitter/X | `/username/status/ID`          | Official [Twitter Widgets](https://platform.twitter.com/widgets.js) via `<blockquote class="twitter-tweet">` |
| Facebook  | `/posts/`, `/videos/`, `/permalink.php`, `/photo.php`, `/watch`, `/story.php`, `fb.watch` | Official [Facebook SDK](https://connect.facebook.net/es_ES/sdk.js) via `<div class="fb-post">` |

Instagram, Twitter/X, and Facebook use **their official embed SDKs** instead of raw iframes. The scripts are loaded **lazily**.

Profile pages, channels, playlists and other non-content URLs are ignored.

### Content taxonomies

The `content` option groups the articles by **medium taxonomy**. Each group is a `{ label, items }` pair, where `label` is the name of the taxonomy and `items` is a regular list of `TimelineItem`.

```js
new Timeline({
  container: '#noticias-container',
  content: [
    {
      label: 'Tecnología y herramientas',
      items: [/* TimelineItem[] */]
    },
    {
      label: 'Taxonomías y fuentes consultadas durante la verificación de este artículo',
      items: [/* TimelineItem[] */]
    }
  ]
});
```

Behaviour:

- **Collapsed timeline — nothing changes.** The featured stack keeps showing the first `featuredCount` captured items of **the whole pool**, mixing every taxonomy, and no selector is visible.
- **Expanded timeline** — a small pill-shaped selector appears right under the "publicaciones relacionadas" button, aligned just to the right of the timeline line (in the same column as the dates). Its options are the taxonomy labels, in the order they were passed, **each followed by the raw number of articles of that group** (`Tecnología y herramientas (9)`). The trailing "Ver todo" option shows the grand total (`Ver todo (19)`). These counts are static: the selector is a _scope_, not a filter, so they never react to the checkboxes.
- **The first taxonomy is selected by default** and the select displays its label.
- **With two or more taxonomies a trailing "Ver todo" option is added** (last in the list, never the default). Selecting it shows every article of every taxonomy at once — the same set the collapsed featured stack draws from. Internally the "all" state is `_contentIndex === -1`, and `_scopeItems()` falls back to the whole pool.
- **With a single taxonomy the label is still shown**, but the select is rendered **disabled** (muted, no dropdown arrow) and **no "Ver todo" option is added** — there is nothing to aggregate.
- **Selecting a taxonomy re-scopes the timeline**: the cards, the filter checkboxes and their `(N)` counts and the pagination are all computed over the items of the selected group only. The `filtros_internos` groups keep their `localStorage` state, the rest fall back to each filter's defaults. Both sets are sorted by date and honour the sort toggle: descending leaves the **undated last**, ascending puts them **first** (the toggle reverses the descending array rather than re-sorting). The same placement applies in API mode, where the direction travels to the server in the `sort` param.
- **The number in the expand button never changes with the taxonomy**: it always shows the total of every group, and `relatedLabel(count)` receives that same total, so the singular/plural always matches. Narrowing a taxonomy changes _what_ the timeline lists, not _how many_ publications the section has.
- The selector is **not rendered at all** when: `content` is not set, every group is invalid, the legacy `items` alias is used, or the component runs in API mode. In those cases the layout is byte-for-byte the previous one.
- Group `label`s are plain text (no HTML). A label longer than the pill crops with a real ellipsis (`...`) while its **`(N)` count always stays visible**, because the pill is a flex row where only the label shrinks. The pill is capped at `max-width: 240px` and its full width is `shrink-to-content`, so it narrows on short labels. Hovering shows the complete `label (N)` in a tooltip.
- `content` takes precedence over `items`; `items` is kept as a legacy alias and simply behaves like before (one implicit group, no selector).

> Not to be confused with [`item.taxonomias`](#single-view-taxonomies), which is a block of navigation links rendered under the card in **single mode**. `ContentGroup` groups the articles of the timeline; `SingleTaxonomy` groups links around a single article.

### Single view taxonomies

In single mode (`singleId`) the item's own `taxonomias` field renders a navigation block under the card. It is meant for the link groups a single-article page needs around the article: official sources, topic indexes, related portals, etc.

The block is **not a constructor option**: it comes from the data, so every article declares its own groups and the server can vary them per article (e.g. only the ones relevant to it). In API mode the field arrives in the item detail (`GET {url}/:id`, which single mode already fetches); in local mode it is read straight from the `TimelineItem` passed in `content`/`items`.

```js
{
  id: 'FUE-00001',
  nombre_fuente: 'Lanzamiento del nuevo framework de JavaScript',
  // ...
  taxonomias: [
    {
      label: 'Fuentes oficiales',
      items: [
        { content: 'Boletín Oficial', link: '/boletin-oficial' },
        { content: 'Infoleg', link: 'https://www.infoleg.gob.ar/' }
      ]
    },
    {
      label: 'También en',
      items: [{ content: 'Cronista', link: 'https://www.cronista.com/' }]
    },
    {
      label: 'Taxonomías y fuentes consultadas durante la verificación de este artículo',
      items: [{ content: 'Salud & Bienestar', link: '/salud' }]
    }
  ]
}
```

- The block is only rendered in single mode. In timeline mode `taxonomias` is ignored and nothing changes. This is unrelated to the [`content`](#content-taxonomies) option, which groups timeline articles by taxonomy.
- **`content` is a `string` and is always escaped**, so `'A < B & C'` shows literally and can never break the markup. There is no way to inject markup or a DOM node: the field is plain data, and the API sends JSON. A tag with markup cannot be a taxonomy link.
- **`link`** is used verbatim as the `href` (escaped for the attribute context) — there is no placeholder substitution. Build the URLs on the producer side. Every link opens in a new tab (`target="_blank"`, `rel="noopener"`).
- **The group `label` is plain text** and is cropped with `...` when the column is too narrow; the full text is always available in the native tooltip (`title`), and the text stays complete in the DOM for screen readers.
- Layout is a responsive grid: one column per taxonomy (`auto-fit`, min 160px), 480px max width so it lines up with the card, and a top border separating it from the article. Each taxonomy label is an uppercase muted heading, its items are a vertical list of accent-colored links that wrap on long content.
- **Groups with more than 3 links are collapsed**: the first 3 are shown and the rest follow a muted, italic **"Ver más (N)"** button (N = hidden links) that expands them in place and turns into **"Ver menos"** to collapse them back. The state lives in the DOM (the `expanded` class on the group's list, `aria-expanded` on the button and `hidden` on the extra links, all kept in sync), is independent per group, and resets on re-render. No link is ever dropped: the hidden items are in the markup, just not shown. The threshold is the `TAXONOMY_VISIBLE_LINKS` constant in the source, not a public option.
- Groups with no `label`, with an empty `items` array, or with items missing `content`/`link` are skipped. If nothing is renderable, no markup is added at all.
- When the field is absent, or when the detail request fails and the card is not found, **no block is rendered at all**: there are no links to show.

### Fullpage mode

`fullpage: true` turns the section into a full-height list: the timeline is always open, the **page itself does the scrolling**, and the toolbar stays visible at the top while you read.

```js
new Timeline({
  container: '#noticias-container',
  content: [/* ContentGroup[] */],
  fullpage: true
});
```

What changes:

- **Always open, never collapsible.** The timeline starts expanded and the expand button loses its chevron and its click — it becomes a plain counter pill, marked `aria-disabled="true"`. Clicking the toolbar, the featured area or the button does nothing.
- **The page scrolls, not the list.** `#timeline-cards` loses its `max-height: 650px` and its `overflow-y: auto`, so the cards flow with the rest of the page instead of living in a fixed-height box with its own scrollbar.
- **The resize handle is gone** — and not just hidden: the element is never emitted, so the persisted height in `localStorage` is not read either and no inline `max-height` is written.
- **The toolbar sticks to the top.** `.featured-row` becomes `position: sticky` with an opaque `--tv-bg-primary` background (it is transparent while expanded, which would let the cards show through as they pass underneath). The filter dropdown keeps its `z-index: 20` and opens above the cards, so it is fully usable while the bar is stuck.
- **The featured stack is not rendered at all.** It would only ever be invisible, so the DOM is never built and `featuredCount` has no effect.

Everything else is unchanged: filters, search, sort, taxonomy selector, pagination ("Cargar más" or the numeric paginator), the card detail embeds and the entrance animations all work as usual. The taxonomy selector is **not** sticky, so it scrolls away with the list.

When the list is **replaced** — a page change in the paginator, or a search/filter/sort change that resets to page 1 — the timeline is scrolled back to its first card, just under the sticky toolbar. Because in this mode the list has no scroll box of its own, the component walks up to whichever ancestor actually scrolls (your page, or a scrollable container the component is mounted into) and moves that one instead, measuring the toolbar's live height so the first cards never end up hidden under it.

If the host page already has a fixed header of its own, raise the sticky offset so the toolbar lands below it:

```css
:root {
  --tv-sticky-top: 56px;
}
```

Sticky positioning needs no scroll container between the section and the page, and no ancestor with `overflow: hidden` — if the toolbar does not stick, check that first.

### Configurable filters

The filter toolbar is driven entirely by the `filters` option: declare the groups and the component builds the panel (or the "Filtros internos" flyout), derives or fetches the values and applies them. Without the option there is no filter UI — not a hidden one, none at all.

```js
new Timeline({
  container: '#noticias-container',
  content: [/* ContentGroup[] */],
  filters: [
    {
      // No `items`: the values come from the data (the items of the selected taxonomy, or the
      // facets in API mode). Perfect for an open list like the source types.
      field: 'tipo_fuente',
      label: 'Tipo de fuente',
      maxVisible: 4 // this group's own "Ver más" cut (default 5)
    },
    {
      field: 'es_oficial',
      label: 'Fuente oficial',
      // `items`: the group shows exactly these values, in this order, even if no item (or no
      // facet) carries them. `value` is the token that is compared and sent to the server; `label`
      // is the visible text; `checked` is the initial state.
      items: [
        { value: true, label: 'Sí' },
        { value: false, label: 'No' }
      ]
    },
    {
      field: 'descartado',
      label: 'Descartado',
      group: 'filtros_internos', // lives in the "Filtros internos" flyout (needs `internalButtons: true`)
      items: [
        { value: true, label: 'Descartado' },
        // Several values in one checkbox: it matches either, and travels as `descartado=false,null`.
        // Both checked here, so the default list hides only the discarded ones.
        { value: [false, null], label: 'Sin descartar', checked: true }
      ],
      persist: true                          // its checked state survives reloads in localStorage
    }
  ]
});
```

#### `TimelineFilter`

| Field            | Type                                        | Default    | Description                              |
|------------------|---------------------------------------------|------------|------------------------------------------|
| `field`          | `string`                                    | **required** | Name of the field the group filters by. In local mode it is read from each item (or produced by `extract`); in API mode it is the key the server uses in `GET {url}/facets`, which is also the query parameter the active values are sent in |
| `label` | `string` | **required** | Header of the group in the panel. Escaped before being injected. The `filtros_internos` flyout has no headers |
| `type`           | `'checkboxes'`                              | `'checkboxes'` | Control of the group. Only checkboxes exist today; a different value drops the group with a `console.warn` |
| `group` | `'menu' \| 'filtros_internos'` | `'menu'` | `'menu'` renders the group in a column of the panel; `'filtros_internos'` renders it in the internal-filters flyout, which is part of the internal toolbar and needs `internalButtons: true`. Any other value is treated as `'menu'` |
| `items` | `{ value, label, checked? }[]` | — | The values of the group, in display order. When given, the group exists even if no item (or no facet) carries a value for it, and the list is the order the panel shows (and the one the "Ver más" cut truncates). Without it, the values come from the data: in local mode the unique `extract`/`field` values of the active scope, in API mode the keys of `facets[field]` |
| `allowEmpty` | `boolean` | `false` | Offers the items that carry **no value** for the field (`null`, or the field missing) as one more value of a group **without** `items`, labelled `"Sin valor"`, and always as its **last** value (whatever the order of the others). It appears only when the data —or the `facets`, in API mode— has such items, and it travels like any other value (`?campo=null`). Ignored when `items` declares the values: there the empty bucket is one declared item, `{ value: null, label: 'Sin tipo' }` |
| `persist`        | `boolean`                                   | `false`    | Keeps the checked values of the group in `localStorage`, so they survive the checkbox rebuilds (the API facets, a taxonomy re-scope) and the page loads. Saving only happens on a user gesture |
| `maxVisible` | `number` | `5` | Values shown before the "Ver más (N)" toggle of the group. Below 2 the group never collapses |
| `extract` | `(item) => string \| string[]` | — | Values a single item carries. Defaults to reading `item[field]`: arrays are expanded and `null` / `undefined` count as the `'null'` token. Use it for fields that need a canonical value (a boolean split in two, a date reduced to its year) or a synthetic field that is not a property of the item |
| `formatLabel` | `(val: string) => string` | — | Label shown for a value of a group **without** `items` (one that derives them). Defaults to the value itself, except `true` → "Sí" and `false` → "No" so a boolean field does not read as raw `true` / `false`. A declared value carries its own `label`, so it never goes through here |
| `sortValues` | `(a: string, b: string) => number` | — | Deliberate order of the values. A group without `items` that declares one keeps it when the long list is truncated, instead of leading with the values that filter the most |

#### `TimelineFilterItem`

| Field | Type | Default | Description |
| ----------------------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value` | `string \| number \| boolean \| null \| (string \| number \| boolean \| null)[]` | **required** | The token(s) this option matches and sends. A list is one checkbox that matches any of them (and travels as a CSV in the query param); `null` matches the items that do not carry the field, and travels as the `'null'` string. Cannot contain a comma |
| `label` | `string` | **required** | Visible text of the checkbox. Free text: it never has to be the value (`{ value: true, label: 'Sí' }`) |
| `checked` | `boolean` | `false` | Whether the option starts checked. It travels in the first request of API mode, and a `persist` group starts from it until the user changes something |

Details worth knowing:

- **Two buckets, two buttons.** `group: 'menu'` groups fill the drop-down panel, dealt out in two columns (the first half of the declaration goes to the first column, the rest to the second). `group: 'filtros_internos'` groups fill the flyout of the internal "Filtros internos" button. Each toggle lights up only with the groups it owns: an active panel value lights `#filter-toggle`, an active flyout value lights `#filtros-internos-toggle`, never the other way around.
- **One value per checkbox.** A checked group means "any of these values" (OR inside a group); groups combine with **AND**, and with the search.
- **Everything is compared as a token.** A value is matched with `String(value)`, and `null` / `undefined` both read as `'null'`, so a declared `value: null` catches the items that do not carry the field. Arrays on the item are expanded, so one item can answer several values of the same group (`tonos_sociales`, `contenido`).
- **The empty bucket needs no declaration.** A group without `items` never offers the items that carry no value (nobody declared that bucket), which is what `allowEmpty: true` is for: it adds them as a last value labelled `"Sin valor"`, so `{ field: 'tipo_fuente', label: 'Tipo de fuente', allowEmpty: true }` is a complete group — no `items` to keep in sync with the data, and no "Sin tipo" / "Sin fecha" label to invent per field. The label is fixed on purpose (the bucket is the same everywhere), the value goes last whatever the order of the others, it can sit behind the "Ver más" toggle like any other, and a group whose only value is that bucket still shows up (filtering by it is what drops everything that *does* have a value). With `items` declared, `allowEmpty` is ignored: express it as `{ value: null, label: 'Sin tipo' }` and keep your own label.
- **`(N)` counts.** In local mode they are computed over the active scope (which is why they change when you switch taxonomy). In API mode they come from `GET {url}/facets`, so they are the collection totals and do not move with the search.
- **The value list is shared with the server.** In API mode each group sends `field=<csv>` to `GET {url}`, made of the very tokens the checkboxes carry in the DOM, and the keys `/facets` returns are the same tokens. A group with `items` works even before the facets land (with the counts in zero); a group without them needs the facets to exist at all.
- **A derived group hides the `"null"` facet.** The items with no value for the field are not a value of the group unless it declares `allowEmpty: true`, which turns that bucket into a last value labelled `"Sin valor"` and sends `field=null` when it is checked — the server resolves it against the items that do not carry the field, same as in local mode.
- **A dropped group is loud.** A missing `field` or `label`, an unsupported `type`, a duplicated `field` or an `items` that cannot be resolved (empty, an entry without `value` / `label`, two entries with the same token, a value with a comma) discards that group with a `console.warn` instead of failing the whole option, so a typo does not go unnoticed.

### Filter "Ver más"

Filter groups with a long value list can get out of hand. Each group shows 5 values and hides the rest behind a "Ver más (N)" toggle that swaps to "Ver menos":

```js
new Timeline({
  container: '#noticias-container',
  content: [/* ContentGroup[] */],
  filters: [
    {
      field: 'tipo_fuente',
      label: 'Tipo de fuente',
      maxVisible: 4 // 4 shown, "Ver más (3)"
    },
    {
      field: 'tonos_sociales',
      label: 'Tono social',
      maxVisible: 0 // every value, no toggle (as is any value below 2)
    }
  ]
});
```

The cut is **per group**, through `maxVisible`, and it keeps the order the group already has:

- A group that declares `items` shows the **first values of its declaration** and hides the tail, so the toggle reveals exactly what you left out.
- A group that derives its values from the data leads with the **ones that filter the most** (the counts come from the items of the active taxonomy, or from the facets in API mode). Give it a `sortValues` comparator to lead with a deliberate order instead — that is how a year list can start at the newest year.
- **A group with a checked value never collapses**, so a filter you applied is never hidden behind the toggle. It also reopens by itself on the rebuilds (when the API facets land, and when you switch taxonomy).
- **The toggle is not a filter**: it does not touch the results and does not re-render the timeline, so opening and closing it is instant. Whether the group is open is kept in memory for the session (not in `localStorage`; only the groups with `persist: true` are persisted).
- A group that derives its values is hidden entirely when the data has one or zero of them. A group with `items` never hides itself: it is a decision the consumer took, and it keeps being offered even with nothing behind it.

## Build

```bash
npm run build
```

Compiles TypeScript (`src/TimelineViewer.ts`) and SCSS (`src/styles.scss`) into `dist/`. The resulting JS, type declarations, and CSS are ready for distribution.

> **Nota:** Los archivos de `dist/` se generan automáticamente con el build. No los edites a mano — haz los cambios en `src/` y ejecuta `npm run build`.

Run only the TypeScript compilation:

```bash
npm run build:ts
```

## Development

```bash
npm run watch
```

Starts the dev server at `http://localhost:3010` with a demo page, and automatically recompiles TypeScript and SCSS on every change. No need to manually build.

To run the server without the file watchers:

```bash
npm start
```

The demo page loads lightgallery JS and CSS from CDN via importmap. Consumers are responsible for providing lightgallery as a peer dependency.

The demo declares its filters in `example/filters.js` and passes them through the `filters` option, so the toolbar you see is built from that config — tweak a group there to see the panel change without touching the library. All eight groups declare their `items`, and the mock ships the fields already classified for them (`tipo_fuente`, `contenido`, `anio_publicacion`), so the demo needs no `extract`: `example/server.js` tokenizes with `String()` and has no per-field logic either.

Query flags of the demo page:

| Flag | Effect |
| -------------------------------- | ------------ |
| _(none)_ | Local mode with `content`: 3 taxonomies, so the selector and the "Ver todo" option are visible. The **Tipo de fuente** group has 7 values, so it shows the 5 with the most results plus a "Ver más (2)" toggle |
| `?flat` | Local mode with the legacy `items` alias: verifies that no taxonomy selector is rendered and the layout is unchanged |
| `?expanded` | Starts the timeline expanded (`startExpanded: true`) instead of collapsed. Combinable with the other flags |
| `?full` | Fullpage mode (`fullpage: true`): always expanded, no resize handle, the page does the scrolling and the toolbar sticks to the top. Subsumes `?expanded`. Combinable with the other flags |
| `?api` | API mode against the mock server (`example/server.js`): no taxonomy selector, server-side filters |
| `?pagination` | Numeric pagination (`pagination: true`): replaces "Cargar más" with ‹ Previous \| Page X of Y \| Next ›. Note that without `?flat` the first taxonomy has 9 items against `itemsPerPage: 10`, which is a single page, so no paginator is rendered — combine it with `?flat` or pick "Ver todo" in the selector |
| `?id=FUE-00001` | Single mode: renders just that card, already expanded, with the navigation block from the item's `taxonomias` (FUE-00001 has the three groups, one of them with 7 links to exercise the "Ver más (4)" toggle; FUE-00002 exercises the incomplete-group filtering, FUE-00005 a single column, the rest have no `taxonomias` and render no block) |

## Tests

```bash
npm test            # both suites
npm run test:unit   # jsdom only (no browser)
npm run test:e2e    # Playwright only
```

There are two suites, split by what each can actually verify:

- **`test/` — `node:test` + jsdom.** DOM, markup and logic: which nodes exist, which buttons are disabled, page arithmetic, cursor resets, `_findScrollContainer`. It imports `dist/TimelineViewer.js` (not `src/`), so `test:unit` runs the TypeScript build first — that is also why a change in `src/` is never tested until `dist/` is rebuilt.
- **`e2e/` — Playwright (Chromium)** against the example server. What jsdom cannot do: real layout geometry, scroll offsets, the sticky toolbar in fullpage mode, and the requests the component makes to the server.

The configurable-filters feature has a dedicated pair of suites: `test/filters.test.js` for the jsdom-side logic (panel markup, derivation of values, persistence, active buttons) and `e2e/filters.spec.js` for what needs a real browser (a click actually reordering the list, the "Ver más" toggle, and the filter travelling as a query param in API mode).

The browser tests are hermetic: `e2e/helpers/network.js` intercepts the demo's jsDelivr import map and serves lightgallery from the local `node_modules`, and aborts every other external request, so the suite runs without internet. Chromium is downloaded once with:

```bash
npx playwright install chromium
```

Both are dev-only dependencies; nothing here is needed to consume the component.

## Preview

![TimelineViewer screenshot 1](images/01.PNG)
![TimelineViewer screenshot 2](images/02.PNG)

---

_Vibecoded with [opencode](https://opencode.ai) and free AI models._
