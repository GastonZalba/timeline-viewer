# TimelineViewer

WORK IN PROGRESS. Interactive timeline component that displays news articles as an overlapping card stack with an expandable full timeline view.

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
      link_portada: 'https://picsum.photos/seed/noticia1/600/400',
      link_web: 'https://dev.to/news/javascript-framework-2026',
      fecha_publicacion: '2026-06-25',
      fecha_scrapeo: '2026-06-25T14:30:00',
      tono_social: 'Positivo',
      fuente_institucional: 'Dev.to',
      tipo_medio: 'Digital',
      actores_principales: ['Ana García', 'Carlos Ruiz'],
      hasCapture: true,
      imagenes: [],
      temas: []
    }
  ],
  featuredCount: 6,
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
| `lastUpdated`   | `string` (ISO date)            | `''`       | Timestamp shown in the footer        |

### Item fields

Each object in `items` supports these fields:

| Field                  | Type                        | Description                              |
|------------------------|-----------------------------|------------------------------------------|
| `id`                   | `string`                    | Unique identifier (e.g. `FUE-00001`)    |
| `nombre_fuente`        | `string`                    | Article headline                         |
| `resumen_ia`           | `string`                    | AI-generated short summary               |
| `link_portada`         | `string` (URL) / `null`     | Main card image                          |
| `link_web`             | `string` (URL)              | External article link                    |
| `fecha_publicacion`    | `string` (YYYY-MM-DD)       | Publication date                         |
| `fecha_scrapeo`        | `string` (ISO)              | When it was crawled                      |
| `tono_social`          | `"Positivo"` / `"Negativo"` / `"Neutro"` | Overall sentiment       |
| `fuente_institucional` | `string`                    | Source / publication name                |
| `tipo_medio`           | `string`                    | Media type (e.g. `"Digital"`)            |
| `actores_principales`  | `string[]`                  | Key people or entities                   |
| `hasCapture`           | `boolean`                   | Screenshot capture available             |
| `imagenes`             | `string[]`                  | Additional image gallery URLs            |
| `temas`                | `{ titulo, resumen, tono_social }[]` | Topics / themes within the article |

## Development

```bash
npm start
```

Opens `http://localhost:3010` with a demo page — no build step required.

## Preview

![TimelineViewer screenshot 1](images/01.PNG)
![TimelineViewer screenshot 2](images/02.PNG)

---

*Vibecoded with [opencode](https://opencode.ai) and free AI models.*
