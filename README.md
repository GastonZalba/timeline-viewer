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
| `items`         | `Array`                        | `[]`       | Array of article card objects        |
| `api`           | `{ url: string; fetchImpl?: typeof fetch }` | — | Optional. Enables **API mode**: the component fetches the paginated list from `${url}/items` and the lazy detail of each card from `${url}/items/:id`. When set, `items` is ignored and filters, search, sort and pagination are resolved server-side. `fetchImpl` allows injecting a custom fetch (useful for tests or auth headers) |
| `featuredCount` | `number`                       | `6`        | Cards in the featured stack          |
| `itemsPerPage`  | `number`                       | `10`       | Items per page in timeline. `0` shows all items without pagination |
| `lastUpdated`   | `string` (ISO date)            | `''`       | Timestamp shown in the footer        |
| `inlineImages`  | `boolean`                      | `false`    | When `true`, shows the `imagenes` thumbnails inline inside each expanded card (below the summary, before the topics) and hides the "Imágenes" action button (the inline thumbs replace it). Clicking a thumbnail opens the gallery at that image |
| `inlineAdjuntos`| `boolean`                      | `false`    | When `true`, shows the `adjuntos` inline inside each expanded card (below the topics) as a list of file names with a type icon (PDF vs generic, inferred from the extension), and hides the "Adjuntos" action button |
| `internalButtons`| `boolean`                     | `false`    | When `true`, shows the internal work controls in the timeline toolbar: the red "work notes" toggle (hide/show `notas_de_trabajo` on cards and topics) and the red "Estado interno" filter button (validado / capturado / descartado). When `false` (default) those buttons are not rendered |

### Item fields

Each object in `items` supports these fields:

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
| `imagenes`             | `{ thumb: string; full: string }[]` | Image gallery with low-res `thumb` and full-res `full` URLs |
| `links_videos`         | `string[]` (URL)          | Optional. Related video links rendered as embeds in the "Videos vinculados" section when the card is expanded. Only supported platforms (YouTube, etc.) are embedded; others are ignored |
| `has_video`            | `boolean`                   | Indicates whether the item has audiovisual content: `true` when `links_videos` is non-empty or when `link_web` points to a video (e.g. YouTube, Instagram reel) |
| `notas_de_trabajo`     | `string` / `null`           | Optional. Working notes displayed as a red badge above the summary in both collapsed and expanded card states |
| `link_edit_entry`     | `string` (URL) / `null`     | Optional. URL to an edit form. When present, a red "Editar" button is shown next to the "Ir" button in the card actions |
| `temas`                | `{ titulo, resumen, tono_social, fecha_narrativa?, notas_de_trabajo? }[]` | Topics / themes within the article. `fecha_narrativa` is an optional `string` (`YYYY-MM-DD`) or `null`. `notas_de_trabajo` is an optional working note displayed as a red badge below the theme description |

> **Importante:** `example/mock-data.js` es la fuente de verdad para probar el componente. Cualquier campo que se agregue, renombre o elimine en el mock **debe** actualizarse en el mismo cambio en la interfaz `TimelineItem` (`src/TimelineViewer.ts`), en la declaración de tipos generada (`dist/TimelineViewer.d.ts` vía `npm run build`) y en esta tabla de campos. Los valores de `tipo_fuente` y los `tonos_sociales` se documentan según los que existen en el mock.

### Modo API (servidor)

Para volúmenes grandes se puede delegar el filtrado, la búsqueda, el orden y la paginación al servidor. En vez de `items`, se pasa una configuración `api`:

```js
new Timeline({
  container: '#my-container',
  api: { url: '/api' },
  itemsPerPage: 10,
  featuredCount: 6
});
```

En este modo el detalle pesado (resumen, temas, notas, imágenes, adjuntos, videos) **no viaja en la lista**: cada tarjeta muestra un esqueleto con shimmer y se obtiene completo al expandirla. `GET ${url}/items/:id` devuelve el artículo completo con el contrato de `TimelineItem`.

#### Endpoints

| Endpoint               | Uso                                                                 |
|------------------------|---------------------------------------------------------------------|
| `GET {url}/items`      | Lista paginada con búsqueda, filtros, orden, facets y destacadas    |
| `GET {url}/items/:id`  | Detalle completo de un artículo (cargado lazy al expandir la tarjeta) |

#### Parámetros de `GET {url}/items`

| Parámetro          | Tipo      | Descripción                                                              |
|--------------------|-----------|--------------------------------------------------------------------------|
| `page`             | `number`  | Página solicitada, 1-indexed (default `1`)                               |
| `pageSize`         | `number`  | Ítems por página (default `10`)                                          |
| `sort`             | `asc`/`desc` | Orden por `fecha_publicacion`. `desc` (reciente primero) es el default |
| `q`                | `string`  | Texto libre. Coincide con `id`, `nombre_fuente`, `fuente_institucional` y `actores_principales`, sin distinguir acentos ni mayúsculas |
| `featured`         | `number`  | Cantidad de tarjetas destacadas a devolver (las primeras con `capturado !== false`) |
| `tonos_sociales`   | `string`  | CSV de tonos (`Positivo`, `Negativo`, `Neutro`) — OR dentro del campo    |
| `tipo_fuente`      | `string`  | CSV de tipos (`sin-tipo` para los que no declaran tipo)                  |
| `validado`         | `string`  | `validado`, `no-validado`                                                |
| `capturado`        | `string`  | `capturado`, `no-capturado`                                              |
| `descartado`       | `string`  | `descartado`, `no-descartado`                                            |
| `es_oficial`       | `string`  | `oficial`, `no-oficial`                                                  |
| `fecha_publicacion`| `string`  | CSV de años (`2026`) o `sin-fecha`                                       |
| `contenido`        | `string`  | CSV de `adjuntos`, `video`, `imagenes`                                   |

#### Respuesta de `GET {url}/items`

```jsonc
{
  "items": [ /* TimelineItemSummary[] */ ],
  "total": 123,            // total tras búsqueda + filtros + orden
  "totalAll": 1000,        // total de la colección completa (sin filtros)
  "featured": [ /* TimelineItemSummary[] */ ],
  "lastUpdated": "2026-06-25T14:30:00",  // opcional
  "facets": {
    "tonos_sociales": { "Positivo": 15, "Negativo": 5, "Neutro": 8 },
    "tipo_fuente": { "Sitio web o portal": 9 },
    "validado": { "validado": 12, "no-validado": 7 },
    "capturado": { "capturado": 17, "no-capturado": 2 },
    "descartado": { "descartado": 3, "no-descartado": 16 },
    "es_oficial": { "oficial": 10, "no-oficial": 9 },
    "fecha_publicacion": { "2026": 15 },
    "contenido": { "adjuntos": 4, "video": 6, "imagenes": 8 }
  }
}
```

Los `facets` se calculan sobre el conjunto búsqueda + filtros, ignorando el filtro del propio campo. Las claves canónicas (`validado`, `no-validado`, `oficial`, `sin-tipo`, etc.) deben coincidir con las que devuelve cada campo.

#### `TimelineItemSummary`

Los ítems de la lista usan una proyección liviana (los campos que la tarjeta colapsada muestra de inmediato). No incluyen `imagenes`, `adjuntos`, `temas`, `resumen_ia`, `links_videos`, ni `contenido`:

| Field                  | Type                        |
|------------------------|-----------------------------|
| `id`                   | `number` / `string`        |
| `nombre_fuente`        | `string`                    |
| `thumbnail`            | `string` (URL) / `null`     |
| `fecha_publicacion`    | `string` (YYYY-MM-DD)       |
| `fecha_scrapeo`        | `string` (ISO)              |
| `tonos_sociales`       | `string[]`                  |
| `tipo_fuente`          | `string`                    |
| `es_oficial`           | `boolean`                   |
| `validado`             | `boolean` / `null`          |
| `capturado`            | `boolean`                   |
| `descartado`           | `boolean` / `null`          |
| `link_web`             | `string` (URL) / `null`     |
| `link_edit_entry`      | `string` (URL) / `null` (opcional) |
| `notas_de_trabajo`     | `string` / `null` (opcional) |
| `has_video`            | `boolean`                   |
| `actores_principales`  | `string[]` / `null`        |
| `fuente_institucional` | `string` / `null`          |
| `screenshot`           | `string` (URL) / `null`     |
| `imagenes_count`       | `number`                    |
| `adjuntos_count`       | `number`                    |

> Los campos `imagenes_count` y `adjuntos_count` permiten mostrar los contadores de los botones de acción sin descargar el detalle completo.

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

## Preview

![TimelineViewer screenshot 1](images/01.PNG)
![TimelineViewer screenshot 2](images/02.PNG)

---

*Vibecoded with [opencode](https://opencode.ai) and free AI models.*
