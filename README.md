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
      id: 1,
      title: 'Example article',
      description: 'A short summary.',
      date: '2026-06-27',
      tone: 'positivo',
      fuente: 'My Source',
      image: 'https://picsum.photos/seed/example/600/400',
      link: 'https://example.com',
      protagonista: ['Someone'],
      hasPdf: false,
      images: [],
      temas: []
    }
  ],
  featuredCount: 6,
  lastUpdated: '2026-06-27T12:00:00'
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

| Field          | Type                        | Description                              |
|----------------|-----------------------------|------------------------------------------|
| `id`           | `number` / `string`         | Unique identifier                        |
| `title`        | `string`                    | Article headline                         |
| `description`  | `string`                    | Short summary                            |
| `date`         | `string` (YYYY-MM-DD)       | Publication date                         |
| `crawlDate`    | `string` (ISO)              | When it was crawled                      |
| `tone`         | `"positivo"` / `"negativo"` / `"neutro"` | Overall sentiment       |
| `fuente`       | `string`                    | Source / publication name                |
| `image`        | `string` (URL) / `null`     | Main card image                          |
| `link`         | `string` (URL)              | External article link                    |
| `protagonista` | `string[]`                  | Key people or entities                   |
| `hasPdf`       | `boolean`                   | PDF download available                   |
| `images`       | `string[]`                  | Additional image gallery URLs            |
| `temas`        | `{ title, desc, tone }[]`   | Topics / themes within the article       |

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
