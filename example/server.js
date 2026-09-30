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
 * Canonical filter values per field, for the fields that need them.
 *
 * A field is only listed here when the value it stores is not the value the client filters by: a
 * boolean split into two named buckets, a date reduced to its year, a synthetic field that is not
 * a property of the item. Everything else (`tipo_fuente`, `tonos_sociales`, or any field a
 * consumer adds later) is read by `readField` below, which is the generic counterpart: the client
 * declares the group in its `filters` option and the server just has to count and compare.
 */
const FIELD_EXTRACT = {
  tipo_fuente: (item) => (item.tipo_fuente ? [item.tipo_fuente] : ['sin-tipo']),
  validado: (item) => (item.validado === true ? ['validado'] : ['no-validado']),
  capturado: (item) => (item.capturado !== true ? ['no-capturado'] : ['capturado']),
  descartado: (item) => (item.descartado === true ? ['descartado'] : ['no-descartado']),
  es_oficial: (item) => (item.es_oficial ? ['oficial'] : ['no-oficial']),
  fecha_publicacion: (item) => (item.fecha_publicacion ? [item.fecha_publicacion.slice(0, 4)] : ['sin-fecha']),
  contenido: (item) => {
    const types = [];
    if ((item.adjuntos || []).length > 0) types.push('adjuntos');
    if (item.has_video) types.push('video');
    if ((item.imagenes || []).length > 0) types.push('imagenes');
    return types;
  }
};

/**
 * The fields this backend exposes facets for: the ones the demo UI declares in its `filters`
 * option (see `example/filters.js`). That is the whole contract between the two halves — the
 * client says which groups it has, the server answers with the values of each one — so a filter
 * added to the demo needs no change here to show up with its values and its counts.
 */
const FACET_FIELDS = filters.map((f) => f.field);

/** Query params that are not filters: the ones that drive the page, the search and the order. */
const RESERVED_PARAMS = new Set(['page', 'pageSize', 'sort', 'q']);

/**
 * Values an item carries for a field, in the shape the client filters on: always a list of
 * strings, with arrays expanded and `null` / `undefined` counting as no value at all. It falls
 * back to reading the field itself, so a group declared by the client for a field with no
 * canonical extractor still filters (and counts) correctly.
 */
function readField(item, field) {
  const extract = FIELD_EXTRACT[field];
  if (extract) return extract(item);
  const value = item[field];
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]).map((v) => String(v)).filter(Boolean);
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
 * Non-destructive sorted copy of the filtered items. The undated ones are part of the direction
 * and not a fixed bucket: `desc` (the default) leaves them last, `asc` brings them first. That is
 * what the client does in local mode — it reverses the descending array — so flipping only the
 * dated comparison would make the two modes disagree on where the undated land.
 */
function sortItems(items, sortAsc) {
  return [...items].sort((a, b) => {
    if (!a.fecha_publicacion) return !b.fecha_publicacion ? 0 : sortAsc ? -1 : 1;
    if (!b.fecha_publicacion) return sortAsc ? 1 : -1;
    const diff = new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime();
    return sortAsc ? -diff : diff;
  });
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
 * `sort` is the only ordering param and it carries the direction only (`asc` / `desc`), never a
 * field name: the field is `fecha_publicacion`. Anything other than `asc` falls back to `desc`.
 * `total` is the count of what the current query matches (it drives the "Cargar más" button and
 * the status row). The values that don't change with the query — the collection `total` and
 * `lastUpdated` — travel with the facets instead.
 */
function handleItems(url, res) {
  const params = Object.fromEntries(url.searchParams.entries());
  const q = normalize(params.q || '');
  const filters = parseFilters(params);
  const sortAsc = params.sort === 'asc';

  const filtered = poolItems(q, filters);
  const sorted = sortItems(filtered, sortAsc);

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
