/**
 * Filtros del demo, declarados con la opción `filters` de `Timeline`.
 *
 * La librería no trae ningún filtro hardcodeado: sin esta opción el componente no tiene panel de
 * filtros, ni botón, ni mandaría params de filtro en modo API. Es el consumidor el que declara
 * qué se filtra, con qué etiqueta y con qué valores, y la librería arma el panel, cuenta, aplica
 * el filtrado y manda los params. Agregar un filtro es agregar una entrada acá.
 *
 * Cada entrada necesita `field` y `label`:
 *
 * - `field` es el nombre del campo. En modo local se lee del ítem (los arrays se expanden, y un
 *   `null` es el valor `'null'`); en modo API es la clave del facet en `GET /api/facets` y el query
 *   param. El demo **no usa `extract` ni campos sintéticos**: los ítems del mock ya traen los
 *   campos listos para filtrar (`tipo_fuente`, `contenido`, `anio_publicacion`...).
 * - `label` es el header del grupo.
 * - `type` solo admite `'checkboxes'` (es el default) y está reservado para los próximos tipos.
 * - `items` es la lista de valores del grupo: `{ value, label, checked? }`. El grupo muestra
 *   exactamente esos valores, en ese orden, y existen aunque los datos no traigan ninguno.
 * - `value` acepta un valor solo o una lista. `[false, null]` es un valor que matchea cualquiera de
 *   los dos, útil para "No y pendiente" en un campo de tres estados. Sus valores viajan al servidor
 *   tal cual (`validado=false,null`), y un `null` matchea los ítems que no traen el campo.
 * - `label` de cada ítem es el texto visible del checkbox (el valor crudo puede no servir: `true`,
 *   `adjuntos`, `2026`...).
 * - `checked` tilda el valor al construir; en modo API viaja en la primera request y después manda
 *   el grupo (con `persist`) en `localStorage`, así sobrevive a los rebuilds del panel (los facets
 *   de la API, el cambio de taxonomía) y a las recargas.
 * - `maxVisible` corta los valores detrás del "Ver más (N)" (default: 5). El corte respeta el
 *   orden declarado, así que el botón "Ver más" muestra la cola de la lista, no un desorden por
 *   conteo. `sortValues` sigue existiendo para los grupos que no declaran `items`.
 * - `group: 'filtros_internos'` manda el grupo al flyout rojo de "Filtros internos" (necesita
 *   `internalButtons: true`) en vez de a una columna del panel.
 *
 * El orden de la declaración es el orden de lectura: los primeros grupos `'menu'` van en la
 * primera columna del panel y el resto en la segunda.
 */
const filters = [
  // ---- Columna 1 --------------------------------------------------------
  {
    // Campo array: los valores son los tonos que aparecen en los ítems, sin nada que extraer.
    field: 'tonos_sociales',
    label: 'Tono social',
    items: [
      { value: 'Positivo', label: 'Positivo' },
      { value: 'Neutro', label: 'Neutro' },
      { value: 'Negativo', label: 'Negativo' }
    ]
  },
  {
    // Año ya reducido en el dato (`anio_publicacion`), así que tampoco necesita `extract`: el
    // orden declarado (más nuevo primero) es el que se muestra y el que se trunca.
    field: 'anio_publicacion',
    label: 'Año publicación',
    items: [
      { value: '2026', label: '2026' },
      { value: '2025', label: '2025' },
      { value: '2024', label: '2024' },
      // El ítem sin fecha tiene su propio valor en vez de desaparecer.
      { value: null, label: 'Sin fecha' }
    ]
  },
  {
    // Campo sintético del scraping (`contenido`): qué tipo de material trae el artículo.
    field: 'contenido',
    label: 'Contenido',
    items: [
      { value: 'adjuntos', label: 'Con adjuntos' },
      { value: 'video', label: 'Con video' },
      { value: 'imagenes', label: 'Con imágenes' }
    ]
  },

  // ---- Columna 2 --------------------------------------------------------
  {
    // El grupo más largo del demo: 7 valores declarados, así que el "Ver más (3)" muestra la cola
    // que se haya declarado, no los tres valores que más filtran.
    field: 'tipo_fuente',
    label: 'Tipo de fuente',
    maxVisible: 4,
    items: [
      { value: 'Sitio web o portal', label: 'Sitio web o portal' },
      { value: 'Gacetilla o comunicado de prensa', label: 'Gacetilla o comunicado de prensa' },
      { value: 'Decreto o norma', label: 'Decreto o norma' },
      { value: 'Libro o publicación', label: 'Libro o publicación' },
      { value: 'Video', label: 'Video' },
      { value: 'Red Social', label: 'Red Social' },
      { value: null, label: 'Sin tipo' }
    ]
  },
  {
    // Booleano: los valores literales (`true` / `false`) con su etiqueta en español.
    field: 'es_oficial',
    label: 'Fuente oficial',
    items: [
      { value: true, label: 'Sí' },
      { value: false, label: 'No' }
    ]
  },

  // ---- Flyout de "Filtros internos" (requiere `internalButtons: true`) ----
  // Los tres son grupos de valores fijos, así que se ven siempre y con `null` incluido.
  {
    field: 'validado',
    label: 'Validado',
    group: 'filtros_internos',
    items: [
      // Los tres tildados: el grupo existe para que el usuario acote, no para filtrar solo.
      { value: true, label: 'Validado', checked: true },
      { value: false, label: 'Sin validar', checked: true },
      { value: null, label: 'Pendiente', checked: true }
    ],
    persist: true
  },
  {
    field: 'capturado',
    label: 'Capturado',
    group: 'filtros_internos',
    items: [
      { value: true, label: 'Capturado', checked: true },
      { value: false, label: 'Sin capturar' }
    ],
    persist: true
  },
  {
    field: 'descartado',
    label: 'Descartado',
    group: 'filtros_internos',
    items: [
      { value: true, label: 'Descartado' },
      // `false` y `null` tildados: "pendiente de descartar" no es lo mismo que descartado, pero
      // por defecto tampoco se esconde (la lista arranca con todo lo que no está descartado).
      { value: false, label: 'Sin descartar', checked: true },
      { value: null, label: 'Pendiente', checked: true }
    ],
    persist: true
  }
];

export default filters;
