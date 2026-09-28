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
| `container`     | `string` (CSS selector/Element)| **required** | DOM element to mount into          |
| `content`       | `ContentGroup[]`              | `[]`       | Optional. Array of `{ label, items }` groups: the **medium taxonomies**. The `label` of each group becomes an option of the selector shown above the expanded timeline, shown next to the number of articles of that group, and the timeline and the filters are scoped to the selected group (with 2+ groups a trailing **"Ver todo"** option scopes the timeline back to the whole pool). The counter in the expand button always shows the **total of every group**, regardless of the selected taxonomy. Takes precedence over `items`. Groups with no `label` or with an empty `items` array are ignored. When no group survives (or in API mode) **no selector is rendered and the layout is unchanged**. See [Content taxonomies](#content-taxonomies) |
| `items`         | `TimelineItem[]`              | `[]`       | Legacy flat list of article card objects. Ignored when `content` is set. Kept for backwards compatibility: with no `content` the component behaves exactly as before |
| `api`           | `{ url: string; fetchImpl?: typeof fetch }` | — | Optional. Enables **API mode**: the component fetches the paginated list from `{url}`, the filter counts from `{url}/facets` (**once at startup**) and the lazy detail of each card from `{url}/:id`. When set, `content` and `items` are ignored, **no taxonomy selector is rendered**, and filters, search, sort and pagination are resolved server-side. `fetchImpl` allows injecting a custom fetch (useful for tests or auth headers) |
| `featuredCount` | `number`                       | `6`        | Cards in the featured stack          |
| `startExpanded` | `boolean`                      | `false`    | When `true`, the timeline starts **already expanded** instead of collapsed on the featured stack. It only sets the initial state: the expand toggle keeps working and the choice is **not persisted**, so every page load starts from this value. Ignored in single mode (`singleId`), which always renders a single expanded card. |
| `itemsPerPage`  | `number`                       | `10`       | Items per page in timeline. `0` shows all items without pagination |
| `lastUpdated`   | `string` (ISO date)            | `''`       | Timestamp shown in the footer        |
| `inlineImages`  | `boolean`                      | `false`    | When `true`, shows the `imagenes` thumbnails inline inside each expanded card (below the summary, before the topics) and hides the "Imágenes" action button (the inline thumbs replace it). Clicking a thumbnail opens the gallery at that image |
| `inlineAdjuntos`| `boolean`                      | `false`    | When `true`, shows the `adjuntos` inline inside each expanded card (below the topics) as a list of file names with a type icon (PDF vs generic, inferred from the extension), and hides the "Adjuntos" action button |
| `internalButtons`| `boolean`                     | `false`    | When `true`, shows the internal work controls in the timeline toolbar: the red "work notes" toggle (hide/show `notas_de_trabajo` on cards and topics) and the red "Estado interno" filter button (validado / capturado / descartado). When `false` (default) those buttons are not rendered |
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
| `fecha_scrapeo`        | `string` (ISO)              | When it was crawled                      |
| `tonos_sociales`      | `string[]`                  | Overall sentiment(s) — unique tones present in the article's `temas` |
| `fuente_institucional` | `string` / `null`          | Source / publication name                |
| `tipo_fuente`           | `string`                    | Source type. One of: `Decreto o norma`, `Libro o publicación`, `Sitio web o portal`, `Red Social`, `Gacetilla o comunicado de prensa`, `Video` |
| `es_oficial`            | `boolean`                   | Whether the source is official (`true`) or not (`false`) |
| `validado`              | `boolean` / `null`          | Whether the article has been validated (`true`), not validated (`false`), or pending/unknown (`null`) |
| `capturado`             | `boolean`                   | Whether the article has been captured by the pipeline. When `false`, the entry is an unprocessed detection and only `id` and `link_web` are populated; all other fields are empty |
| `descartado`            | `boolean` / `null`          | Whether the article has been discarded (`true`), kept (`false`), or unknown (`null`). By default the filter excludes discarded articles |
| `adjuntos`              | `string[]`                  | Attached files/links — may be empty |
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

Al iniciar se hace **un solo** request: `GET {url}` (la primera página), que basta para el stack colapsado de destacadas. `GET {url}/facets` queda **postergado hasta la primera vez que se expande el timeline** (los facets solo los usa el panel de filtros), y se pide una única vez: de ahí en adelante cada cambio de búsqueda, filtro u orden vuelve a pegarle solo a la lista, sin volver a pedir los facets y conservando el estado de los checkboxes.

#### Endpoints

| Endpoint          | Uso                                                                    | Respuesta                    |
|-------------------|------------------------------------------------------------------------|------------------------------|
| `GET {url}`       | Lista paginada con búsqueda, filtros y orden                        | Objeto con `items` y `total` |
| `GET {url}/facets`| Conteos de los filtros. Se pide **una sola vez**, la primera vez que se expande el timeline | Objeto con `facets` y `lastUpdated` opcional |
| `GET {url}/:id`   | Detalle completo de un artículo (cargado lazy al expandir la tarjeta, y en single mode) | El `TimelineItem` completo, **sin envolver** (no lleva `{"item": ...}`) |

> El campo `items` de la respuesta es la lista paginada que devuelve el servidor y **no** tiene relación con la opción `content` ni con el alias legacy `items`. En modo API no se renderiza el selector de taxonomías.

> `GET {url}/facets` tiene prioridad sobre `GET {url}/:id`: una ruta `/facets` no puede ser un id de artículo.

#### Parámetros de `GET {url}`

| Parámetro          | Tipo      | Descripción                                                              |
|--------------------|-----------|--------------------------------------------------------------------------|
| `page`             | `number`  | Página solicitada, 1-indexed (default `1`)                               |
| `pageSize`         | `number`  | Ítems por página (default `10`)                                          |
| `sort`             | `asc`/`desc` | Orden por `fecha_publicacion`. `desc` (reciente primero) es el default |
| `q`                | `string`  | Texto libre. Coincide con `id`, `nombre_fuente`, `fuente_institucional` y `actores_principales`, sin distinguir acentos ni mayúsculas |
| `tonos_sociales`   | `string`  | CSV de tonos (`Positivo`, `Negativo`, `Neutro`) — OR dentro del campo    |
| `tipo_fuente`      | `string`  | CSV de tipos (`sin-tipo` para los que no declaran tipo)                  |
| `validado`         | `string`  | `validado`, `no-validado`                                                |
| `capturado`        | `string`  | `capturado`, `no-capturado`                                              |
| `descartado`       | `string`  | `descartado`, `no-descartado`                                            |
| `es_oficial`       | `string`  | `oficial`, `no-oficial`                                                  |
| `fecha_publicacion`| `string`  | CSV de años (`2026`) o `sin-fecha`                                       |
| `contenido`        | `string`  | CSV de `adjuntos`, `video`, `imagenes`                                   |

#### Respuesta de `GET {url}`

```jsonc
{
  "items": [ /* TimelineItemSummary[] */ ],
  "total": 123               // total de publicaciones que matchean búsqueda + filtros
}
```

> `total` es el único conteo de la lista: alimenta el número del botón de expandir (`relatedLabel(count)` recibe ese mismo valor), el status "Mostrando X de Y publicaciones" y la aparición del botón "Cargar más" (`Y` = `total`). No hay un `totalAll`: el total sin filtros no se pide.

> Las tarjetas destacadas (el stack colapsado) se arman con los **primeros `items` de la página** —las primeras con `capturado !== false`, hasta `featuredCount`—, así que el servidor no devuelve ningún campo `featured` ni recibe el parámetro `featured`.

> `lastUpdated` **no** viaja en la lista: llega con `GET {url}/facets` (o se pasa por la opción `lastUpdated`). Como los facets se piden al primer expandir, el pie "Actualizado por última vez el ..." del timeline se completa en ese momento, sin volver a renderizar las tarjetas.

#### Respuesta de `GET {url}/facets`

```jsonc
{
  "facets": {
    "tonos_sociales": { "Positivo": 15, "Negativo": 5, "Neutro": 8 },
    "tipo_fuente": { "Sitio web o portal": 9 },
    "validado": { "validado": 12, "no-validado": 7 },
    "capturado": { "capturado": 17, "no-capturado": 2 },
    "descartado": { "descartado": 3, "no-descartado": 16 },
    "es_oficial": { "oficial": 10, "no-oficial": 9 },
    "fecha_publicacion": { "2026": 15 },
    "contenido": { "adjuntos": 4, "video": 6, "imagenes": 8 }
  },
  "lastUpdated": "2026-06-25T14:30:00"  // opcional
}
```

Los `facets` se calculan sobre la **colección completa**, sin depender de `q` ni de los filtros activos, y por eso no cambian: se piden una sola vez, la primera vez que se expande el timeline, y el panel de filtros se reconstruye con ese único request (los checkboxes se crean de antemano sin conteos, así que los filtros de estado ya están defaulted y viajan en la primera request de la lista). Como consecuencia, los números entre paréntesis son el total de la colección y **no** el conteo de la búsqueda actual, y los valores de un filtro no desaparecen al filtrar (el grupo completo se oculta solo si la colección tiene un solo valor para ese campo). Las claves canónicas (`validado`, `no-validado`, `oficial`, `sin-tipo`, etc.) deben coincidir con las que devuelve cada campo.

Mientras los facets no llegan, el botón de filtros queda oculto (es el único consumidor de esos conteos) y el pie "Actualizado por última vez el ..." todavía no se muestra.

Cuatro detalles del ciclo de vida:

- Si `GET {url}/facets` falla, la lista se sigue mostrando y el panel de filtros queda sin los conteos (solo sobreviven los filtros de estado, que tienen valores fijos). No hay reintentos, y un fallo **no** borra unos facets que ya se hayan adoptado desde la lista.
- Por compat, si la respuesta de `GET {url}` todavía trae un campo `facets` y el endpoint dedicado no respondió, se usan esos valores. Sirve para backends que todavía no migraron; no hay que mandarlos en las páginas siguientes.
- Los filtros de estado arrancan con sus valores por defecto (`validado` + `no-validado`, `capturado`, `no-descartado`, persistidos en `localStorage`) y esos defaults viajan en la **primera** request, igual que en el modo local.

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
- **Expanded timeline** — a small pill-shaped selector appears right under the "publicaciones relacionadas" button, aligned just to the right of the timeline line (in the same column as the dates). Its options are the taxonomy labels, in the order they were passed, **each followed by the raw number of articles of that group** (`Tecnología y herramientas (9)`). The trailing "Ver todo" option shows the grand total (`Ver todo (19)`). These counts are static: the selector is a *scope*, not a filter, so they never react to the checkboxes.
- **The first taxonomy is selected by default** and the select displays its label.
- **With two or more taxonomies a trailing "Ver todo" option is added** (last in the list, never the default). Selecting it shows every article of every taxonomy at once — the same set the collapsed featured stack draws from. Internally the "all" state is `_contentIndex === -1`, and `_scopeItems()` falls back to the whole pool.
- **With a single taxonomy the label is still shown**, but the select is rendered **disabled** (muted, no dropdown arrow) and **no "Ver todo" option is added** — there is nothing to aggregate.
- **Selecting a taxonomy re-scopes the timeline**: the cards, the filter checkboxes and their `(N)` counts and the pagination are all computed over the items of the selected group only. The estado interno filters keep their `localStorage` state, the rest fall back to each filter's defaults. Both sets are sorted by date descending (undated last) and honour the sort toggle.
- **The number in the expand button never changes with the taxonomy**: it always shows the total of every group, and `relatedLabel(count)` receives that same total, so the singular/plural always matches. Narrowing a taxonomy changes *what* the timeline lists, not *how many* publications the section has.
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

Query flags of the demo page:

| Flag | Effect |
|------|--------|
| *(none)* | Local mode with `content`: 3 taxonomies, so the selector and the "Ver todo" option are visible |
| `?flat` | Local mode with the legacy `items` alias: verifies that no taxonomy selector is rendered and the layout is unchanged |
| `?expanded` | Starts the timeline expanded (`startExpanded: true`) instead of collapsed. Combinable with the other flags |
| `?api` | API mode against the mock server (`example/server.js`): no taxonomy selector, server-side filters |
| `?id=FUE-00001` | Single mode: renders just that card, already expanded, with the navigation block from the item's `taxonomias` (FUE-00001 has the three groups, one of them with 7 links to exercise the "Ver más (4)" toggle; FUE-00002 exercises the incomplete-group filtering, FUE-00005 a single column, the rest have no `taxonomias` and render no block) |

## Preview

![TimelineViewer screenshot 1](images/01.PNG)
![TimelineViewer screenshot 2](images/02.PNG)

---

*Vibecoded with [opencode](https://opencode.ai) and free AI models.*
