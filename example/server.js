import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mockData from './mock-data.js';
import filters from './filters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3010;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

/** Normalize a string for accent- and case-insensitive matching (mirrors the client) */
function normalize(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * The fields this backend exposes facets for: the ones the demo UI declares in its `filters`
 * option (see `example/filters.js`). That is the whole contract between the two halves — the
 * client says which groups it has, the server answers with the values of each one — so a filter
 * added to the demo needs no change here to show up with its values and its counts.
 */
const FACET_FIELDS = filters.map((f) => f.field);

/** Query params that are not filters: the ones that drive the page, the search and the order. */
const RESERVED_PARAMS = new Set(['page', 'pageSize', 'sort', 'sortBy', 'q']);

/**
 * Values an item carries for a field, as the tokens the client filters on: always a list of
 * strings, with arrays expanded. This is the generic counterpart of the client's own
 * `_filterValuesOf`: the data arrives already classified (that is the whole point of the
 * `filters` option), so the backend has no per-field logic — it just counts and compares tokens.
 *
 * `null` / `undefined` tokenize as `'null'`, because the client offers "no value" as a value of its
 * own (`items: [{ value: null }]`): an item with a `null` field —or with no field at all— has to
 * land in that bucket instead of in none, exactly like in local mode, where a missing property
 * reads as `undefined` and `_filterValuesOf` tokenizes it the same way.
 */
function readField(item, field) {
  const value = item[field];
  if (value === null || value === undefined) return ['null'];
  return (Array.isArray(value) ? value : [value]).map((v) => (v === null || v === undefined ? 'null' : String(v)));
}

/** Check a single item against the full-text search term */
function matchesSearch(item, q) {
  if (!q) return true;
  const haystacks = [
    String(item.id),
    item.nombre_fuente,
    item.fuente_institucional,
    (item.actores_principales || []).join(' ')
  ];
  return haystacks.some((v) => normalize(v).includes(q));
}

/** Check whether an item matches the active values of a single filter field */
function matchesField(item, field, active) {
  return readField(item, field).some((v) => active.includes(v));
}

/**
 * Build { field: [active values] } from the query params. Every param that is not one of the
 * reserved ones is a filter, so the client can declare a group for a field this backend never
 * heard of and still get it applied (only its counts would be missing, since the facets only
 * cover the fields the client declared).
 */
function parseFilters(params) {
  const filters = {};
  Object.keys(params).forEach((field) => {
    if (RESERVED_PARAMS.has(field)) return;
    const active = params[field].split(',').filter(Boolean);
    if (active.length) filters[field] = active;
  });
  return filters;
}

/** Filter the mock dataset by search + filters */
function poolItems(q, activeFilters) {
  return mockData.items.filter((item) => {
    if (!matchesSearch(item, q)) return false;
    return Object.keys(activeFilters).every((field) => matchesField(item, field, activeFilters[field]));
  });
}

/** Compute the facet counts of every declared field over a pool of items */
function buildFacets(pool) {
  const facets = {};
  FACET_FIELDS.forEach((field) => {
    const counts = {};
    pool.forEach((item) => {
      readField(item, field).forEach((v) => {
        counts[v] = (counts[v] || 0) + 1;
      });
    });
    facets[field] = counts;
  });
  return facets;
}

/**
 * The mock dataset never changes at runtime, so the facets are counted once at startup over
 * the whole collection: they don't depend on `q` nor on the active filters, which is what lets
 * the client ask for them a single time (`GET /api/facets`) instead of on every page request.
 * The fields counted are the ones the demo UI declares in its `filters` option. `STATIC_TOTAL` is
 * the same idea for the count: the collection size for the expand button, which never moves with
 * the search, the filters or the page.
 */
const STATIC_FACETS = buildFacets(mockData.items);
const STATIC_TOTAL = mockData.items.length;

/**
 * The text to show for some facet values, keyed by field and then by the same token the facets
 * count: the client filters by the token (it is what travels in the query param) and shows the label
 * when there is one. A field with no entry here —or a token missing from its entry— falls back to
 * showing the token itself, which is what the demo did before this table existed.
 *
 * It is a static table and not logic per field because the demo vocabulary is small and fixed: the
 * point is to show the mechanism (a backend storing a long or coded value and displaying a short
 * one), not to be a real dictionary. Both fields are ones the demo derives from the data (no
 * `items`), so the labels are what decides the text; `tipo_fuente` is a checkbox group and
 * `tonos_sociales` the `select`, so the same table covers both controls.
 */
const FACET_LABELS = {
  // El dato guarda la descripción larga del pipeline; el panel muestra el nombre corto.
  tipo_fuente: {
    'Sitio web o portal': 'Sitio web',
    'Gacetilla o comunicado de prensa': 'Gacetilla',
    'Decreto o norma': 'Decreto',
    'Libro o publicación': 'Libro',
    'Red Social': 'Red social'
  },
  // El `select` de tonos: el token es el tono, el label lo muestra completo.
  tonos_sociales: {
    Positivo: 'Tono positivo',
    Neutro: 'Tono neutro',
    Negativo: 'Tono negativo'
  }
};

/**
 * Comparable text of an item for the requested sorter. A missing value compares as `''`, the
 * smallest, so an item without the field lands last in `desc` and first in `asc`. This is the
 * server counterpart of the client's `_sortValue`.
 */
function sortValue(item, field) {
  const value = item[field];
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Non-destructive sorted copy of the filtered items, ordered by `field` + direction. The natural
 * comparison (`Intl.Collator` with `numeric`) is the same one the client uses in local mode: ISO
 * dates and zero-padded ids both order correctly as plain strings, and ties keep their source
 * order because the sort is stable. The direction applies to the whole list —a missing value, the
 * smallest, goes last in `desc` and first in `asc`—, which is what makes the two modes agree on
 * where the items without a value land.
 */
function sortItems(items, field, sortAsc) {
  const collator = new Intl.Collator(undefined, { numeric: true });
  const cmp = (a, b) => (a === b ? 0 : a === '' ? -1 : b === '' ? 1 : collator.compare(a, b));
  const dir = sortAsc ? 1 : -1;
  return [...items].sort((a, b) => dir * cmp(sortValue(a, field), sortValue(b, field)));
}

/**
 * Lightweight card projection used by the list endpoint (only what the collapsed card renders).
 * `taxonomias` no viaja acá a propósito: solo se usa en modo single, donde el artículo se pide
 * entero con `GET /api/:id` (ver handleItem).
 */
function toSummary(item) {
  const summary = {
    id: item.id,
    nombre_fuente: item.nombre_fuente,
    resumen_ia: item.resumen_ia,
    thumbnail: item.thumbnail,
    fecha_publicacion: item.fecha_publicacion,
    tonos_sociales: item.tonos_sociales,
    es_oficial: item.es_oficial,
    validado: item.validado,
    capturado: item.capturado,
    descartado: item.descartado,
    notas_de_trabajo: item.notas_de_trabajo,
    link_view_entry: item.link_view_entry
  };
  if (item.capturado === false) {
    summary.link_web = item.link_web;
  }
  return summary;
}

/**
 * GET /api — paginated list with search, filters and sort.
 * The order is two params: `sort` carries the direction only (`asc` / `desc`, anything else falls
 * back to `desc`) and `sortBy` the field, defaulting to `fecha_publicacion`. The field is an open
 * string —the server does not validate it against a list— because the fields come from the
 * client's `sorters` option, exactly like the filter fields. `total` is the count of what the
 * current query matches (it drives the "Cargar más" button and the status row). The values that
 * don't change with the query — the collection `total` and `lastUpdated` — travel with the
 * facets instead.
 */
function handleItems(url, res) {
  const params = Object.fromEntries(url.searchParams.entries());
  const q = normalize(params.q || '');
  const filters = parseFilters(params);
  const sortAsc = params.sort === 'asc';
  const sortBy = params.sortBy || 'fecha_publicacion';

  const filtered = poolItems(q, filters);
  const sorted = sortItems(filtered, sortBy, sortAsc);

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 10);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      items: items.map(toSummary),
      total: filtered.length
    })
  );
}

/** GET /api/facets — static values of the whole collection (requested once, at startup) */
function handleFacets(res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      facets: STATIC_FACETS,
      labels: FACET_LABELS,
      total: STATIC_TOTAL,
      lastUpdated: mockData.lastUpdated
    })
  );
}

/** GET /api/:id — full detail of a single item */
function handleItem(id, res) {
  const item = mockData.items.find((i) => String(i.id) === id);
  if (!item) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Item not found' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(item));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname === '/api' || pathname === '/api/') {
    if (req.method === 'GET') return handleItems(url, res);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Must be matched before the /api/:id branch below, otherwise "facets" would be read as an id.
  if (pathname === '/api/facets' || pathname === '/api/facets/') {
    if (req.method === 'GET') return handleFacets(res);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  if (pathname.startsWith('/api/')) {
    const detailMatch = pathname.match(/^\/api\/([^/]+)$/);
    if (req.method === 'GET' && detailMatch) return handleItem(decodeURIComponent(detailMatch[1]), res);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const urlPath = (pathname === '/' ? '/index.html' : pathname).split('?')[0];
  let filePath = path.join(__dirname, urlPath);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '..', urlPath);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Mock API available at http://localhost:${PORT}/api`);
  console.log(`Static facets available at http://localhost:${PORT}/api/facets`);
});
