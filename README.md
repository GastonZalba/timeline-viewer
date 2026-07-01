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
      tono_social: 'Positivo',
      fuente_institucional: 'Dev.to',
      tipo_fuente: 'Digital',
      actores_principales: ['Ana García', 'Carlos Ruiz'],
      screenshot: 'https://picsum.photos/seed/captura/400/800',
      imagenes: [
        { 
          thumb: 'https://picsum.photos/seed/img1/300/200', 
          full: 'https://picsum.photos/seed/img1/600/400'
        }
      ],
      temas: []
    }
  ],
  featuredCount: 6,
  itemsPerPage: 10,
  lastUpdated: '2026-06-25T14:30:00'
});
```

## Options

The `Timeline` constructor accepts a single config object:

| Option          | Type                           | Default    | Description                          |
|-----------------|--------------------------------|------------|--------------------------------------|
| `container`     | `string` (CSS selector/Element)| **required** | DOM element to mount into          |
| `items`         | `Array`                        | `[]`       | Array of article card objects        |
| `featuredCount` | `number`                       | `6`        | Cards in the featured stack          |
| `itemsPerPage`  | `number`                       | `10`       | Items per page in timeline. `0` shows all items without pagination |
| `lastUpdated`   | `string` (ISO date)            | `''`       | Timestamp shown in the footer        |

### Item fields

Each object in `items` supports these fields:

| Field                  | Type                        | Description                              |
|------------------------|-----------------------------|------------------------------------------|
| `id`                   | `string`                    | Unique identifier (e.g. `FUE-00001`)    |
| `nombre_fuente`        | `string`                    | Article headline                         |
| `resumen_ia`           | `string`                    | AI-generated short summary               |
| `thumbnail`         | `string` (URL) / `null`     | Main card image                          |
| `link_web`             | `string` (URL)              | External article link                    |
| `fecha_publicacion`    | `string` (YYYY-MM-DD)       | Publication date                         |
| `fecha_scrapeo`        | `string` (ISO)              | When it was crawled                      |
| `tono_social`          | `"Positivo"` / `"Negativo"` / `"Neutro"` | Overall sentiment       |
| `fuente_institucional` | `string`                    | Source / publication name                |
| `tipo_fuente`           | `string`                    | Source type. One of: `Diario o nota periodística`, `Decreto o norma`, `Boletín oficial`, `Expediente`, `Libro o publicación`, `Sitio web o portal`, `Red social`, `Gacetilla o comunicado de prensa` |
| `actores_principales`  | `string[]`                  | Key people or entities                   |
| `screenshot`           | `string` (URL) / `null`     | Screenshot image URL                     |
| `imagenes`             | `{ thumb: string; full: string }[]` | Image gallery with low-res `thumb` and full-res `full` URLs |
| `temas`                | `{ titulo, resumen, tono_social }[]` | Topics / themes within the article |

### Embedded content

When the card is expanded, `link_web` is automatically parsed for supported platforms and rendered as an embedded iframe just above the card footer:

| Platform  | URL pattern                    | Example embed                                          |
|-----------|--------------------------------|--------------------------------------------------------|
| YouTube   | `/watch?v=`, `youtu.be/`, `/shorts/` | `youtube.com/embed/VIDEO_ID` (16:9)          |
| Instagram | `/p/`, `/reel/`                | `instagram.com/p/CODE/embed/` (min-height 420px)       |
| Twitter/X | `/username/status/ID`          | `platform.twitter.com/embed/Tweet.html?id=ID` (min-height 350px) |
| Facebook  | `/posts/`, `/videos/`, `/permalink.php`, `/photo.php`, `/watch`, `fb.watch` | `facebook.com/plugins/post.php?href=URL` (min-height 400px) |

Profile pages, channels, playlists and other non-content URLs are ignored.

## Development

```bash
npm start
```

Opens `http://localhost:3010` with a demo page — no build step required.

The demo page loads lightgallery JS and CSS from CDN via importmap. The source itself (`src/TimelineViewer.js`) imports from `node_modules/` — consumers are responsible for providing lightgallery as a peer dependency.

## Preview

![TimelineViewer screenshot 1](images/01.PNG)
![TimelineViewer screenshot 2](images/02.PNG)

---

*Vibecoded with [opencode](https://opencode.ai) and free AI models.*
