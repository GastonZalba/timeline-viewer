/**
 * Filtros del demo, declarados con la opción `filters` de `Timeline`.
 *
 * La librería no trae ningún filtro hardcodeado: sin esta opción el componente no tiene panel de
 * filtros, ni botón, ni mandaría params de filtro en modo API. Es el consumidor el que declara
 * qué se filtra, con qué etiqueta y de qué manera, y la librería arma el panel, deriva los
 * valores y aplica el filtrado. Agregar un filtro es agregar una entrada acá.
 *
 * Cada entrada necesita `field` y `label`:
 *
 * - `field` es el nombre del campo. En modo local se lee del ítem (los arrays se expanden) o
 *   sale de `extract`; en modo API es la clave del facet en `GET /api/facets` y el query param.
 * - `label` es el header del grupo.
 * - `type` solo admite `'checkboxes'` (es el default) y está reservado para los próximos tipos.
 * - `group: 'estado'` manda el grupo al flyout rojo de "Estado interno" (necesita
 *   `internalButtons: true`) en vez de a una columna del panel.
 * - `values` fija los valores del grupo: existe aunque los datos no traigan ninguno, y es lo que
 *   permite que un grupo de dos opciones fijas se vea siempre.
 * - `defaultChecked` tilda valores al construir; en modo API viajan en la primera request.
 * - `persist` guarda el estado del grupo en `localStorage`, así sobrevive a los rebuilds del panel
 *   (los facets de la API, el cambio de taxonomía) y a las recargas.
 * - `extract` / `formatLabel` / `sortValues` ajustan los valores, sus etiquetas y su orden.
 *
 * El orden de la declaración es el orden de lectura: los primeros grupos `'menu'` van en la
 * primera columna del panel y el resto en la segunda.
 */
const filters = [
  // ---- Columna 1 --------------------------------------------------------
  {
    field: 'tonos_sociales',
    label: 'Tono social'
    // Campo array: los valores son los tonos que aparecen en los ítems, sin nada que extraer.
  },
  {
    field: 'fecha_publicacion',
    label: 'Año publicación',
    // `YYYY-MM-DD` reducido a su año; el año sin fecha tiene su propio valor en vez de desaparecer.
    extract: (item) => (item.fecha_publicacion ? item.fecha_publicacion.slice(0, 4) : 'sin-fecha'),
    formatLabel: (val) => (val === 'sin-fecha' ? 'Sin fecha' : val),
    // Orden deliberado (año más nuevo primero): el grupo se trunca sin reordenar por conteo, así
    // la lista de años no arranca por el año que casualmente tiene más artículos.
    sortValues: (a, b) => {
      if (a === 'sin-fecha') return 1;
      if (b === 'sin-fecha') return -1;
      return Number(b) - Number(a);
    }
  },
  {
    // Campo sintético: no es una propiedad del ítem, se arma con `extract` a partir de tres.
    // En modo API viaja igual, como el query param `contenido=adjuntos,video`.
    field: 'contenido',
    label: 'Contenido',
    extract: (item) => {
      const types = [];
      if ((item.adjuntos || []).length > 0) types.push('adjuntos');
      if (item.has_video) types.push('video');
      if ((item.imagenes || []).length > 0) types.push('imagenes');
      return types;
    },
    formatLabel: (val) => (val === 'adjuntos' ? 'Con adjuntos' : val === 'video' ? 'Con video' : 'Con imágenes')
  },

  // ---- Columna 2 --------------------------------------------------------
  {
    field: 'tipo_fuente',
    label: 'Tipo de fuente',
    extract: (item) => (item.tipo_fuente ? item.tipo_fuente : 'sin-tipo'),
    formatLabel: (val) => (val === 'sin-tipo' ? 'Sin tipo' : val)
  },
  {
    // Booleano: sin `extract` los valores serían los valores literales (`true` / `false`) y
    // quedarían fuera los ítems sin el campo. Acá se parte en dos valores nombrados.
    field: 'es_oficial',
    label: 'Fuente oficial',
    extract: (item) => (item.es_oficial ? 'oficial' : 'no-oficial'),
    formatLabel: (val) => (val === 'oficial' ? 'Sí' : 'No')
  },

  // ---- Flyout de "Estado interno" (requiere `internalButtons: true`) ----
  // Los tres son grupos de valores fijos, así que se ven siempre y con `null` incluido.
  {
    field: 'validado',
    label: 'Validado',
    group: 'estado',
    values: ['validado', 'no-validado'],
    extract: (item) => (item.validado === true ? ['validado'] : ['no-validado']),
    formatLabel: (val) => (val === 'validado' ? 'Validado' : 'Sin validar'),
    defaultChecked: ['validado', 'no-validado'],
    persist: true
  },
  {
    field: 'capturado',
    label: 'Capturado',
    group: 'estado',
    values: ['capturado', 'no-capturado'],
    extract: (item) => (item.capturado === true ? ['capturado'] : ['no-capturado']),
    formatLabel: (val) => (val === 'capturado' ? 'Capturado' : 'Sin capturar'),
    // Por defecto solo los capturados: el resto son detecciones sin procesar.
    defaultChecked: ['capturado'],
    persist: true
  },
  {
    field: 'descartado',
    label: 'Descartado',
    group: 'estado',
    values: ['descartado', 'no-descartado'],
    extract: (item) => (item.descartado === true ? ['descartado'] : ['no-descartado']),
    formatLabel: (val) => (val === 'descartado' ? 'Descartado' : 'Sin descartar'),
    // "Descartado" primero, y el grupo se truca sin reordenar por conteo.
    sortValues: (a, b) => (a === 'descartado' ? -1 : b === 'descartado' ? 1 : 0),
    // Por defecto se excluyen los descartados.
    defaultChecked: ['no-descartado'],
    persist: true
  }
];

export default filters;
