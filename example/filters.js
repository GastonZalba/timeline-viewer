/**
 * Filtros del demo, declarados con la opción `filters` de `Timeline`.
 *
 * La librería no trae ningún filtro hardcodeado: sin esta opción el componente no tiene panel de
 * filtros, ni botón, ni mandaría params de filtro en modo API. Es el consumidor el que declara
 * qué se filtra, con qué etiqueta y con qué valores, y la librería arma el panel, cuenta, aplica
 * el filtrado y manda los params. Agregar un filtro es agregar una entrada acá.
 *
 * Este demo deriva del dato casi todos sus valores, así que no hay que mantenerlos sincronizados
 * con el mock: un grupo derivado se puede ocultar solo (si el dato le deja un único valor), ordena
 * por conteo cuando hay que truncarlo, y **no puede venir tildado** (`checked` solo existe en un
 * ítem declarado). Los grupos que quieren labels propios o un orden fijo —o un default de estado—
 * declaran `items`: `contenido` (tres valores fijos) y el `descartado` del flyout ("Sin descartar").
 *
 * Cada entrada necesita `field` y `label`:
 *
 * - `type` elige el control: `'checkboxes'` (default) o `'select'`. Un `select` es un multiselect
 *   con buscador que toma el **ancho completo** del panel, arriba del todo, y es el control para
 *   un campo con muchos valores. `multiple` (default `true`) y `searchable` (automático: la caja
 *   de búsqueda aparece sola si el grupo tiene más de 8 valores) son sus dos únicas opciones
 *   propias; el resto se resuelve igual que en un grupo de checkboxes.
 * - `field` es el nombre del campo. En modo local se lee del ítem (los arrays se expanden, y un
 *   `null` es el valor `'null'`); en modo API es la clave del facet en `GET /api/facets` y el query
 *   param. El demo **no usa `extract` ni campos sintéticos**: los ítems del mock ya traen los
 *   campos listos para filtrar (`tipo_fuente`, `contenido`, `anio_publicacion`...).
 * - `label` es el header del grupo.
 * - `items` es la lista de valores del grupo: `{ value, label, checked? }`. El grupo muestra
 *   exactamente esos valores, en ese orden, y existen aunque los datos no traigan ninguno. Sin
 *   `items` los valores se derivan del dato: el texto es el valor crudo, salvo los booleanos, que
 *   `_filterLabelOf()` muestra como "Sí" / "No".
 * - `value` acepta un valor solo o una lista. `[false, null]` es un valor que matchea cualquiera de
 *   los dos, útil para "No y pendiente" en un campo de tres estados. Sus valores viajan al servidor
 *   tal cual (`validado=false,null`), y un `null` matchea los ítems que no traen el campo.
 * - `label` de cada ítem es el texto visible del checkbox (el valor crudo puede no servir: `true`,
 *   `adjuntos`, `2026`...).
 * - `checked` tilda el valor al construir; en modo API viaja en la primera request y después manda
 *   el grupo (con `persist`) en `localStorage`, así sobrevive a los rebuilds del panel (los facets
 *   de la API, el cambio de taxonomía) y a las recargas. **Solo existe con `items`**: es lo que
 *   permite que un consumidor arranque con un filtro puesto.
 * - `allowEmpty` ofrece los ítems que no traen valor para el campo (token `'null'`, o el campo
 *   ausente) como un valor más, con el label fijo `"Sin valor"` y siempre al final, sea cual sea el
 *   orden de los demás. Es el reemplazo de "declarar el `null` a mano": en vez de un ítem con
 *   `{ value: null, label: 'Sin fecha' }` por grupo, una línea que no hay que upkeepar. Se ignora
 *   en silencio cuando el grupo declara `items` (ahí el bucket es un valor declarado, con el label
 *   que el consumidor quiera), y solo aparece si de verdad hay ítems sin valor: en `tonos_sociales`
 *   y `es_oficial` no lo hay, así que ahí la opción es inerte.
 * - `persist` guarda los valores tildados del grupo en `localStorage`, para que sobrevivan a los
 *   rebuilds del panel (los facets de la API, el cambio de taxonomía) y a las recargas. Los grupos
 *   de estado interno del demo lo usan; los del panel no, porque un recorte de contenido es un
 *   estado efímero de la sesión.
 * - `maxVisible` corta los valores detrás del "Ver más (N)" (default: 5). Un grupo con `items`
 *   muestra los primeros declarados; uno derivado se ordena por **mayor conteo** antes de truncar
 *   (si no, el corte escondería los valores que más filtran), salvo que declare `sortValues`, cuyo
 *   orden es intencional y solo se trunca. **No aplica a un `select`**: su lista scrollea y busca.
 * - `sortValues` es un comparador `(a, b) => number` sobre los **tokens**, y fija el orden de los
 *   valores del grupo. El único grupo del demo que lo declara es `anio_publicacion`, para que la
 *   lista de años empiece por el más nuevo en vez de seguir el orden del pool. Solo tiene efecto en
 *   grupos **sin `items`** (los declarados ya vienen en orden), y desactiva el orden por conteo,
 *   porque un orden deliberado es justo lo contrario de "primero los que más filtran".
 * - `group: 'filtros_internos'` manda el grupo al flyout rojo de "Filtros internos" (necesita
 *   `internalButtons: true`) en vez de a una columna del panel.
 *
 * El orden de la declaración es el orden de lectura: los grupos `'select'` van en su bloque de
 * ancho completo, arriba del todo, y los primeros grupos `'menu'` de checkboxes van en la primera
 * columna del panel y el resto en la segunda.
 */
const filters = [
  // ---- Bloque de ancho completo, arriba del panel -------------------------------
  {
    // El control `select`, a propósito sobre el campo con **muchos** valores, que es para lo que
    // existe: `tonos_sociales` es un array, así que un ítem responde por varios tonos a la vez
    // (OR dentro del grupo), y el buscador del desplegable es lo que vuelve usable una lista larga.
    // `multiple` es el default (`true`) y está declarado explícito solo para que se lea.
    //
    // No usa `maxVisible` (ni "Ver más"): la lista scrollea y se busca. Sus valores vienen por el
    // mismo camino que los de un grupo de checkboxes —del dato en local, de `GET /api/facets` en
    // modo API— así que tampoco hay nada que cambiar del lado del servidor para este tipo.
    //
    // El `allowEmpty` sigue siendo inerte con este mock (ningún ítem viene sin `tonos_sociales`:
    // el que trae el array vacío no genera token), y se conserva por ser la forma de no tener que
    // distinguir el caso cuando el pipeline empiece a mandar ítems sin tonos.
    field: 'tonos_sociales',
    label: 'Tono social',
    type: 'select',
    multiple: true,
    allowEmpty: true
  },

  // ---- Columna 1 --------------------------------------------------------
  {
    // Año ya reducido en el dato (`anio_publicacion`), así que tampoco necesita `extract`. Los tres
    // años que trae el mock más el bucket vacío son 4 valores: no hay corte (el default es 5), así
    // que sin `sortValues` se mostrarían en el orden en que aparecen en el pool, que no dice nada
    // (venían `2026, 2024, 2025`). El `sortValues` pone el año más nuevo primero, y como el orden
    // es intencional el grupo ya no se reordena por conteo (acá no hay corte, pero en un pool más
    // grande sí).
    //
    // El bucket vacío se manda al final en dos lugares, y a propósito: el comparador no tiene que
    // saber que el token `'null'` no es un año, y la librería lo mueve igual después de cualquier
    // sort (`_resolveFilterValues()`), así que el resultado no depende de cuál de los dos haga el
    // trabajo. Su label es el fijo "Sin valor" de `allowEmpty`, no uno propio del demo.
    field: 'anio_publicacion',
    label: 'Año publicación',
    allowEmpty: true,
    sortValues: (a, b) => {
      const x = Number.parseInt(a, 10);
      const y = Number.parseInt(b, 10);
      const noX = Number.isNaN(x);
      const noY = Number.isNaN(y);
      if (noX || noY) return noX === noY ? 0 : noX ? 1 : -1;
      return y - x;
    }
  },
  {
    // El único grupo del demo que declara `items`: el pipeline manda `contenido` ya clasificado y
    // el demo quiere los tres valores siempre, con los labels en español y en un orden fijo.
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
    // El grupo más largo del demo: los 6 tipos del mock más el bucket vacío son 7 valores, así que
    // `maxVisible: 4` los corta. Como el grupo es derivado, el corte ordena por mayor conteo: los
    // 4 visibles son los que más ítems agrupan y el "Ver más (3)" muestra la cola menos frecuente
    // (los tipos raros y el "Sin valor"), no una cola declarada.
    field: 'tipo_fuente',
    label: 'Tipo de fuente',
    maxVisible: 4,
    allowEmpty: true
  },
  {
    // Booleano: los valores literales (`true` / `false`) salen del dato y `_filterLabelOf()` los
    // muestra como "Sí" / "No", sin necesidad de declararlos. El `allowEmpty` es inerte con este
    // mock: los 19 ítems traen `es_oficial`.
    field: 'es_oficial',
    label: 'Fuente oficial',
    allowEmpty: true
  },

  // ---- Flyout de "Filtros internos" (requiere `internalButtons: true`) ----
  // `validado` y `capturado` derivan sus valores del dato y se ven porque cada uno tiene más de un
  // valor; el `allowEmpty` es el que les deja el estado `null` (el que antes era el ítem "Pendiente"),
  // con el label fijo "Sin valor". Los dos derivan, así que no pueden venir tildados.
  {
    field: 'validado',
    label: 'Validado',
    group: 'filtros_internos',
    persist: true,
    allowEmpty: true
  },
  {
    // Acá el `allowEmpty` es inerte: los 19 ítems del mock traen `capturado`.
    field: 'capturado',
    label: 'Capturado',
    group: 'filtros_internos',
    persist: true,
    allowEmpty: true
  },
  {
    // El único grupo del demo con `label` vacío: el flyout lo dibuja sin header (el `label` es
    // opcional), que es justo el caso para el que no hace falta un título. Sus valores sí se
    // declaran, porque acá se quieren labels propios en vez de los "Sí" / "No" / "Sin valor" que
    // salen del dato: `true` es "Descartado", y `[null, false]` es un solo checkbox que matchea
    // "no descartado **ni** pendiente" (los dos tokens viajan unidos en un solo CSV). Un `value`
    // con `checked` es el único modo de arrancar con un filtro puesto, y `persist` lo sobrevive a
    // las recargas.
    field: 'descartado',
    label: '',
    group: 'filtros_internos',
    persist: true,
    items: [
      { value: true, label: 'Descartado', checked: true },
      { value: [null, false], label: 'Sin descartar', checked: true }
    ]
  }
];

export default filters;
