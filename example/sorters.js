/**
 * Orden del demo, declarado con la opción `sorters` de `Timeline`.
 *
 * La librería no trae ningún orden hardcodeado: **sin esta opción el componente no tiene UI de
 * orden** —ni botón, ni menú—, y el timeline se queda con su orden interno por defecto
 * (`fecha_publicacion` descendente). Es el consumidor el que declara por qué campos se puede
 * ordenar y con qué etiqueta, y la librería arma el menú, aplica el orden y manda los params.
 * Agregar un orden es agregar una entrada acá.
 *
 * Cada entrada necesita `field` y `label`:
 *
 * - `field` es el nombre del campo de `TimelineItem` por el que se ordena. En modo local la
 *   comparación es **natural** (`Intl.Collator` con `numeric`), así que las fechas ISO
 *   (`YYYY-MM-DD`) y los ids con ceros a la izquierda (`FUE-00001`) ordenan bien como texto plano:
 *   no hace falta `extract` ni un comparador por campo. En modo API el campo viaja como el param
 *   `sortBy` y el orden lo resuelve el servidor.
 * - `label` es el texto de la opción en el menú.
 * - `default: true` marca la entrada que arranca seleccionada (solo una; si no hay ninguna, es la
 *   primera). La dirección siempre arranca en descendente ("Más reciente primero"), y el menú deja
 *   darla vuelta con la segunda sección de radios.
 *
 * El demo declara dos ejes distintos a propósito, para ver que el orden no está atado a una fecha:
 * la fecha de publicación (el orden por defecto de la librería) y el `id`, que es el orden de
 * creación del artículo. El mock tiene 3 ítems sin `fecha_publicacion` (ids 12, 18 y 19): con el
 * orden natural quedan **últimos** en descendente y **primeros** en ascendente.
 */
const sorters = [
  { field: 'fecha_publicacion', label: 'Fecha de la publicación', default: true },
  { field: 'id', label: 'Fecha de creación' }
];

export default sorters;
