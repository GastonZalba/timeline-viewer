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
npm run dev          # Watch mode + dev server en :3010
npm start            # Solo dev server en :3010
```

El `build` ejecuta Prettier automáticamente antes de compilar. **No hay tests configurados.**

## Qué NO hacer

Estas son restricciones críticas. Violarlas rompe la filosofía del módulo:

1. **NO agregar bundlers** (Webpack, Vite, Rollup, esbuild). La compilación es `tsc` + `sass`.
2. **NO partir el archivo TS en múltiples archivos**. Todo va en `TimelineViewer.ts`.
3. **NO agregar frameworks** (React, Vue, Svelte, etc.). Es vanilla DOM.
4. **NO agregar dependencias runtime**. `lightgallery` es peer dependency, no se incluye en el bundle.
5. **NO cambiar el formato de salida**. El resultado es un ES module con default export de la clase `Timeline`.
6. **NO agregar side effects globales** al importar el módulo (salvo los SDKs de embed que se cargan bajo demanda).
7. **NO cambiar la interfaz pública** (`TimelineOptions`, `TimelineItem`, `ItemTema`) sin actualizar la documentación y los tipos.
8. **NO renombrar la clase exportada** `Timeline` ni cambiar el default export.
9. **NO modificar la estructura de datos** `TimelineItem` sin considerar que viene de un pipeline de scraping externo.
10. **NO agregar CSS que dependa de clases fuera de `.noticias-section`**. Todo el estilo está scoped.

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

- **Namespace CSS**: Todo está scoped bajo `.noticias-section`. Las propiedades CSS custom usan el prefijo `--tv-` (ej: `--tv-bg-primary`, `--tv-accent`).
- **Nomenclatura BEM-like**: `.card-body`, `.card-title`, `.timeline-date-col`, `.featured-card`.
- **Loop `@for`**: Las posiciones de las tarjetas featured se generan con `@for $i from 1 through 10` en SCSS.
- **Selectors modernos**: Se usa `:has()` para estilos condicionales.

### Strings

- **Todo el texto visible al usuario está en español** (`es-ES`). Fechas, labels, botones, mensajes vacíos.
- **Los nombres de campos del data model también están en español** (`nombre_fuente`, `resumen_ia`, `tono_social`, etc.). Esto es porque el componente se integra con un pipeline de scraping en español.

## Modelo de datos

El componente consume un array de `TimelineItem`. La estructura es plana (no jerárquica), diseñada para un pipeline de scraping de noticias:

```typescript
interface TimelineItem {
  id: number | string;
  nombre_fuente: string;        // Titular del artículo
  resumen_ia: string;           // Resumen generado por IA
  fecha_publicacion: string;    // YYYY-MM-DD
  fecha_scrapeo: string;        // ISO datetime
  tono_social: 'Positivo' | 'Negativo' | 'Neutro';
  fuente_institucional: string; // Nombre del medio
  tipo_fuente: string;          // Tipo de fuente (ver valores en README)
  thumbnail: string | null;     // URL de imagen principal
  link_web: string;             // URL del artículo original
  actores_principales: string[];
  screenshot: string | null;    // URL de captura de pantalla
  imagenes: { thumb: string; full: string }[];
  temas: ItemTema[];            // Subtemas del artículo
}
```

**No modificar esta interfaz** sin considerar que los datos vienen de un sistema externo.

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

El consumidor debe proveer lightGallery en su bundle o via importmap (como hace `example/index.html`). El componente NO incluye lightGallery en su build.

Para testing local, el example usa CDN via importmap.

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
  mock-data.js         ← 17 artículos de ejemplo
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
- **Agregar un nuevo filtro**: Agregar entrada en `this.filters` array en `_buildFilterCheckboxes()`.
- **Modificar estilos**: Editar `src/styles.scss`. Todos los estilos están bajo `.noticias-section`. Las variables CSS custom están al inicio del archivo.
