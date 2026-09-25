import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mockData from './mock-data.js';

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

/** Canonical filter values per field (mirrors TimelineViewer._buildFilterCheckboxes extracts) */
const FIELD_EXTRACT = {
  tonos_sociales: (item) => item.tonos_sociales || [],
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
  return FIELD_EXTRACT[field](item).some((v) => active.includes(v));
}

/** Build { field: [active values] } from the query params */
function parseFilters(params) {
  const filters = {};
  Object.keys(FIELD_EXTRACT).forEach((field) => {
    if (params[field]) filters[field] = params[field].split(',').filter(Boolean);
  });
  return filters;
}

/** Filter the mock dataset by search + filters (optionally ignoring one field for its own facet) */
function poolItems(q, filters, ignoreField) {
  return mockData.items.filter((item) => {
    if (!matchesSearch(item, q)) return false;
    return Object.keys(filters).every((field) => {
      if (field === ignoreField) return true;
      return matchesField(item, field, filters[field]);
    });
  });
}

/** Compute the facet counts per field over a pool of items */
function buildFacets(pool) {
  const facets = {};
  Object.keys(FIELD_EXTRACT).forEach((field) => {
    const counts = {};
    pool.forEach((item) => {
      FIELD_EXTRACT[field](item).forEach((v) => {
        counts[v] = (counts[v] || 0) + 1;
      });
    });
    facets[field] = counts;
  });
  return facets;
}

/** Non-destructive sorted copy of the filtered items */
function sortItems(items, sortAsc) {
  return [...items].sort((a, b) => {
    if (!a.fecha_publicacion) return 1;
    if (!b.fecha_publicacion) return -1;
    const diff = new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime();
    return sortAsc ? -diff : diff;
  });
}

/** Lightweight card projection used by the list endpoint (only what the collapsed card renders) */
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
    notas_de_trabajo: item.notas_de_trabajo
  };
  if (item.capturado === false) {
    summary.link_web = item.link_web;
  }
  return summary;
}

/** GET /api/items — paginated list with search, filters, sort, facets and featured */
function handleItems(url, res) {
  const params = Object.fromEntries(url.searchParams.entries());
  const q = normalize(params.q || '');
  const filters = parseFilters(params);
  const sortAsc = params.sort === 'asc';

  const filtered = poolItems(q, filters);
  const sorted = sortItems(filtered, sortAsc);

  const featuredCount = Math.max(0, Number(params.featured) || 0);
  const featured = sorted.filter((item) => item.capturado !== false).slice(0, featuredCount);

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 10);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize);

  const facets = {};
  Object.keys(FIELD_EXTRACT).forEach((field) => {
    facets[field] = buildFacets(poolItems(q, filters, field))[field];
  });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      items: items.map(toSummary),
      total: filtered.length,
      totalAll: mockData.items.length,
      featured: featured.map(toSummary),
      lastUpdated: mockData.lastUpdated,
      facets
    })
  );
}

/** GET /api/items/:id — full detail of a single item */
function handleItem(id, res) {
  const item = mockData.items.find((i) => String(i.id) === id);
  if (!item) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Item not found' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ item }));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    if (req.method === 'GET' && pathname === '/api/items') return handleItems(url, res);
    const detailMatch = pathname.match(/^\/api\/items\/([^/]+)$/);
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
  console.log(`Mock API available at http://localhost:${PORT}/api/items`);
});
