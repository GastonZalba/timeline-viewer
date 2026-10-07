import lightGallery from 'lightgallery';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_EMBED_URL = 'https://www.youtube.com/embed/';
const INSTAGRAM_REGEX = /(?:instagram\.com)\/(p|reels?|tv)\/([a-zA-Z0-9_-]+)/;
const INSTAGRAM_EMBED_BASE = 'https://www.instagram.com/';
const INSTAGRAM_EMBED_SCRIPT = 'https://www.instagram.com/embed.js';
const TWITTER_REGEX = /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/;
const TWITTER_EMBED_BASE = 'https://twitter.com/';
const TWITTER_WIDGETS_SCRIPT = 'https://platform.twitter.com/widgets.js';
const FACEBOOK_POST_REGEX = /(?:facebook\.com)\/([^/]+)\/posts\/(?:[^/]+\/)?(\d+)/;
const FACEBOOK_OTHER_REGEX = /(?:facebook\.com\/(?:[^/]+\/videos\/|permalink\.php|photo\.php|watch|story\.php)|fb\.watch)/;
const FACEBOOK_EMBED_BASE = 'https://www.facebook.com/';
const FACEBOOK_SDK_URL = 'https://connect.facebook.net/es_ES/sdk.js#xfbml=1&version=v20.0';
/**
 * Containers a `<video>` puede reproducir nativamente, para los links que apuntan al archivo y no
 * a una plataforma.
 *
 * `.ogg` queda afuera a propósito: casi siempre es audio (Vorbis), y meterlo en un `<video>` da un
 * player vacío. `.m3u8` también: es HLS y necesita una librería de streaming, que el módulo no
 * puede agregar (peer dependencies y cero dependencias runtime) — un `<video>` con un `.m3u8` sería
 * un reproductor roto.
 */
const VIDEO_FILE_EXTS = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];
/** Window of `_schedulePageReload`: coalesces a burst of search/filter/sort changes into one request */
const API_RELOAD_DEBOUNCE_MS = 300;
/**
 * `pageSize` asked for when `itemsPerPage` is 0 ("no pagination"): big enough to hold the whole
 * collection in a single response, so the server sends everything and there is nothing left to
 * ask for. Not a real limit, just a number no collection reaches.
 */
const API_UNBOUNDED_PAGE_SIZE = 1000000;
/** Links shown per taxonomy group before the "Ver más" toggle appears (single mode) */
const TAXONOMY_VISIBLE_LINKS = 3;
/**
 * Padding, in px, that `View.fit` leaves between the outermost points and the edge of the map
 * container. Without it the markers sit flush against the border and the outermost ones are
 * visually clipped by the `overflow: hidden` of the canvas.
 */
const TEMAS_MAP_FIT_PADDING = 28;
/**
 * Ceiling of the topics map, used everywhere a zoom is bounded: the fit of the opening (which only
 * matters for the degenerate extents —a single point, two identical points, or a column of points
 * with no width— where the extent has no size to divide by and `fit` would zoom in until it hits
 * its own limit), the fit that brings a clicked topic into view, the zoom a cluster click animates
 * to, and the `maxZoom` of the `View` itself, so the zoom controls and the pinch stop there too.
 * 15 is a street-level zoom, which is what "these topics happen in one place" should look like.
 */
const TEMAS_MAP_FIT_MAX_ZOOM = 15;
/**
 * `maxZoom` of the topics map `View`, i.e. the ceiling of the *interactive* zoom (the controls,
 * the pinch, the wheel). It is deliberately above `TEMAS_MAP_FIT_MAX_ZOOM`: programmatic moves
 * only ever need 15 (street level), but once there the user is still free to zoom further in by
 * hand, up to 20 — without this the View would climb to OpenLayers' own default (28) and "the max
 * zoom of this map" would stop meaning anything.
 */
const TEMAS_MAP_MAX_ZOOM = 20;
/**
 * Raster base of the topics map when the consumer does not pass one: the public OpenStreetMap
 * standard layer, whose XYZ template only needs `{z}/{x}/{y}` —the four placeholders `ol/uri.js`
 * actually substitutes are `{z}`, `{x}`, `{y}` and `{-y}`, so anything else (the `{r}` that Leaflet
 * uses for retina) ends up literal in the URL and 404s on every tile.
 *
 * Passing `temasMapTiles: ''` explicitly opts out and leaves the map with only its own points. It
 * used to be the default, and the base layer opt-in; the map was a blank canvas without it, which
 * read as broken rather than as minimal.
 *
 * The public layer is fine for low traffic, which is what its use policy asks for. A consumer with
 * real volume should point this at their own tile server instead —which is also why the component
 * cannot be the one that decides.
 */
const TEMAS_MAP_TILES_DEFAULT = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
/**
 * Radius of a topic's marker, in screen pixels. The markers are circles and not pins: the tone color
 * and the number are all the marker has to say, and the circle matches the reference badge of the
 * list above the map (`.tema-map-ref`, 18px across) instead of implying, as a pin's tip does, a
 * precise point the pipeline does not have.
 */
const TEMAS_MAP_MARKER_RADIUS = 9;
/**
 * Width of the white ring around a marker, in screen pixels. It is what separates a mid-tone marker
 * from whatever the raster map has under it, so it stays at 1px: thicker, it eats the tone color of
 * the 18px circle and starts to collide with the number painted in the middle.
 */
const TEMAS_MAP_MARKER_STROKE = 1;
/**
 * Font size, in px, of the number painted in the center of a marker
 */
const TEMAS_MAP_MARKER_FONT = 10;
/**
 * Nudge that puts the number optically in the center of its marker, in screen pixels.
 *
 * `textBaseline: 'middle'` is not the middle of the ink: canvas aligns it to the middle of the font's
 * **em box**, which sits above the visual center of a digit, because digits live in the cap height
 * and leave the descender half empty. At a 10px font that lands every number half a pixel above the
 * circle's center —measured in a browser, not estimated: all three markers of a four-topic card came
 * out at `dy = -0.5` against the true center. Half a pixel is invisible on its own, but it is the
 * difference between "centered" and "not quite" on an 18px circle, so it is corrected here rather
 * than left to every marker.
 */
const TEMAS_MAP_MARKER_TEXT_OFFSET_Y = 0.5;
/**
 * Extra pixels added to `TEMAS_MAP_MARKER_RADIUS` for the hover hit test, so an 18px circle is not a
 * pixel-perfect target. It only widens the pointer target: the marker itself keeps its radius.
 */
const TEMAS_MAP_MARKER_HIT_PADDING = 3;
/**
 * Marker color per social tone, matching the `--tv-tone-*` of the topic list. They are hardcoded
 * hexes and not the CSS variables because OpenLayers paints into a canvas, where a CSS variable does
 * not reach: the only thing that could keep them in sync is reading them back with
 * `getComputedStyle`, which would tie the marker color to a layout pass.
 */
const TEMAS_MAP_TONE_COLOR = {
    Positivo: '#22c55e',
    Negativo: '#ef4444',
    Neutro: '#94a3b8'
};
const TEMAS_MAP_TONE_FALLBACK = '#3792c4';
/**
 * Color of the number painted in a marker. Hardcoded for the same reason the tones are —it is painted
 * into a canvas— and dark on every tone, so the number stays legible.
 */
const TEMAS_MAP_MARKER_TEXT_COLOR = '#0e1116';
/**
 * White ring around a marker. Hardcoded for the same reason as the tones, and white on purpose: the
 * markers sit on top of a raster map instead of the dark card, and the ring is what separates a
 * mid-tone marker from whatever the tiles happen to have under it.
 */
const TEMAS_MAP_MARKER_RING_COLOR = '#ffffff';
/**
 * Screen distance, in pixels, below which two markers are considered overlapped and get spread
 * apart. It is the marker diameter —18px, so the two numbers already touch at this distance— plus a
 * few px of slack, because a ringer separation of one or two px still reads as a single blob while
 * the map keeps zooming out.
 *
 * It is also the **widest a group is allowed to get**: `declutter` merges a marker only when it sits
 * within this distance of every member of the group, so no spiderfy ring and no cluster ever stands
 * for more than this across (see the complete linkage in `declutter`).
 */
const TEMAS_MAP_SPIDER_THRESHOLD = TEMAS_MAP_MARKER_RADIUS * 2 + 4;
/**
 * Extra gap, in pixels, left between the rings of two neighboring markers when they are spread on a
 * circle. The distance between consecutive markers stays fixed at
 * `2 * (TEMAS_MAP_MARKER_RADIUS + TEMAS_MAP_SPIDER_GAP)` whatever their count: the radius of the
 * circle grows with the count, so the count never squeezes the neighbors, and the gap only has to
 * cover the ring itself —1px is where the white rings of two markers meet and nothing more.
 */
const TEMAS_MAP_SPIDER_GAP = 1;
/**
 * Width of the line that ties a displaced marker back to the topic's own coordinate, in screen
 * pixels. It is the only thing drawn back toward the real position: no arrowhead, no anchor dot.
 * The line runs from the coordinate to the center of the circle and is painted **before** it, so
 * the last `TEMAS_MAP_MARKER_RADIUS` px stay hidden under the marker's own fill — which is why it
 * does not need a gap at its tip the way an arrow would.
 */
const TEMAS_MAP_SPIDER_LINE_WIDTH = 1.5;
/**
 * Color of that line, white for the same reason as `TEMAS_MAP_MARKER_RING_COLOR`: it is drawn over
 * a raster map, and white is the one color that reads on any tile. The line does not need to carry
 * the topic's tone anymore — the marker it points to keeps the color and the number that identify
 * it — so it stays neutral and the tone colors are left to the circles.
 */
const TEMAS_MAP_SPIDER_LINE_COLOR = '#ffffff';
/**
 * Zoom below which overlapping markers are drawn as a single cluster marker —one circle carrying
 * the count of the topics it stands for— instead of being spread apart by the spiderfy. **This is
 * the knob for how far the spiderfy reaches**: below this zoom no group is ever spread — every
 * overlap becomes a count and only a lone topic keeps its own circle—, so a far view only ever
 * aggregates, and where the spiderfy comes back it is capped by `TEMAS_MAP_SPIDER_MAX_GROUP`.
 *
 * The breakage it prevents is screen-space, not geographic: at a far view hundreds of points land
 * inside a few dozen pixels, and the spiderfy answers with a ring whose radius grows with the count
 * (`(radius + gap) / sin(PI / n)` ≈ 3.2·n px) — an n of 200 is a 640px ring whose lines cross the
 * whole map. A cluster says the same thing ("there are n topics here") in one fixed 30px circle,
 * whatever the count.
 *
 * The threshold only picks the mode the far view starts in; what guarantees the spiderfy never
 * grows past a readable ring in the range where it is allowed back is its own cap,
 * `TEMAS_MAP_SPIDER_MAX_GROUP`. That pairing is why this value can be conservative: at 8 a 40px
 * cluster still stands for a couple of dozen km on the default view. Above
 * `TEMAS_MAP_NO_CLUSTER_MIN_ZOOM` the cap is off by design.
 */
const TEMAS_MAP_CLUSTER_MAX_ZOOM = 12;
/**
 * Screen distance, in pixels, below which two markers become one cluster at the far view. It is
 * wider than `TEMAS_MAP_SPIDER_THRESHOLD` on purpose: a cluster marker is a 30px circle (radius plus
 * ring), so clusters have to sit further apart than two 18px markers do, or two counts read as one
 * blob. Below this distance a pair of points merges into one icon with the total, which is the
 * standard reading of a general view — nothing is lost, the count says how many are in there.
 *
 * It is also the **widest a cluster is allowed to get across**, for the same reason its sibling
 * above caps the spiderfy: the grouping takes every pair of members within this distance, so the
 * far view trades one giant count —whose centroid can land half a screen away from any marker— for
 * several small ones sitting on the markers they stand for.
 */
const TEMAS_MAP_CLUSTER_DISTANCE = 40;
/**
 * Biggest group the spiderfy spreads before it draws a cluster instead, below
 * `TEMAS_MAP_NO_CLUSTER_MIN_ZOOM`. This is the safety net of `TEMAS_MAP_CLUSTER_MAX_ZOOM`: a
 * mis-set threshold —or a dataset denser than the one it was set for— would otherwise bring back
 * the giant ring, and the cap makes that failure impossible by construction. 12 is a ring of
 * ≈39px, about the size of a small cluster.
 */
const TEMAS_MAP_SPIDER_MAX_GROUP = 12;
/**
 * Zoom from which the spiderfy cap above stops applying: **every** group is spread on its ring,
 * however many points it has, and nothing is ever drawn as a count cluster again.
 *
 * The reason is clickability, and it is structural rather than cosmetic. A cluster answers a click
 * with a zoom-in animation (`TEMAS_MAP_CLUSTER_ZOOM_STEP`), which only dissolves it if the points
 * were merely close on screen —topics at (or near) the same coordinate never separate at any zoom—
 * and the animation stops at `TEMAS_MAP_FIT_MAX_ZOOM` anyway. At street level, then, a cluster is a
 * dead end: clicking it changes nothing and the points inside can never be reached. Past this zoom
 * the map is already saying "this exact place", so the honest reading is the spread one: every
 * topic visible and clickable, even when the ring grows large (accepted on purpose — a giant ring
 * at a close zoom is information, a count you cannot open is not).
 *
 * Below it nothing changes: the far view still clusters, and the spiderfy still caps its groups.
 *
 * It sits **exactly at** `TEMAS_MAP_FIT_MAX_ZOOM`, which is also the `maxZoom` of the `View`: a
 * threshold above the ceiling can never be reached and the rule becomes dead code.
 */
const TEMAS_MAP_NO_CLUSTER_MIN_ZOOM = 15;
/**
 * Radius of a cluster marker, in screen pixels: the 18px marker plus the room a count of up to
 * three digits needs at `TEMAS_MAP_CLUSTER_FONT`.
 */
const TEMAS_MAP_CLUSTER_RADIUS = 14;
/** Width of the white ring around a cluster marker, in screen pixels */
const TEMAS_MAP_CLUSTER_STROKE = 2;
/** Font size, in px, of the count painted in the center of a cluster marker */
const TEMAS_MAP_CLUSTER_FONT = 12;
/**
 * Fill of a cluster whose members do not share a tone. Dark for the same reason the marker's number
 * is: it is painted over a raster map, and a dark disc with white ink reads on any tile. The color
 * is the same `#0e1116` as `TEMAS_MAP_MARKER_TEXT_COLOR`, so the two kinds of circle feel like one
 * family.
 */
const TEMAS_MAP_CLUSTER_FILL_DARK = '#0e1116';
/** Color of the count painted on a cluster: white, over the tone color or over the dark fill */
const TEMAS_MAP_CLUSTER_TEXT_COLOR = '#ffffff';
/**
 * Zoom levels a click on a cluster adds to the view. Two steps dissolve a cluster from any
 * starting zoom below `TEMAS_MAP_NO_CLUSTER_MIN_ZOOM` —where clusters still exist— without the
 * dead click a `fit` to the members' extent would produce when that extent already fills the
 * viewport — a fit that would not zoom in looks like nothing happened.
 */
const TEMAS_MAP_CLUSTER_ZOOM_STEP = 2;
/**
 * Duration, in ms, of the zoom a click on a cluster animates. Not zero for the same reason as
 * `FULLMAP_FOCUS_DURATION`: the view is on screen, and the interpolation is what fires the
 * `moveend`s that re-run `declutter` on the way to the new zoom, dissolving the cluster as it goes.
 */
const TEMAS_MAP_CLUSTER_ZOOM_DURATION = 400;
/**
 * How much bigger the circle of the **selected** marker gets, in screen pixels, and how thick the ring
 * it grows around itself is.
 *
 * The selection is the point the article panel is showing, and it has to read at a glance over a
 * raster base layer where the marker might sit on a tone-colored tile. Growing the circle is what
 * separates it from its neighbors —the spiderfy already guarantees they are at least
 * `2 * (radius + gap)` apart, so this does not make two markers touch— and the ring is what holds the
 * shape together while it grows.
 *
 * The ring is **almost black**, not the tone color like the plain marker's white one: the fill already
 * is the tone color, so a ring of the same hue would only widen a solid blob of it instead of drawing
 * a marker. A dark outline is what separates the fill from whatever the tiles have under it, and it is
 * the same `#0e1116` as the number painted on top, so the selected circle reads as one object.
 */
const TEMAS_MAP_SELECTED_RADIUS_DELTA = 4;
const TEMAS_MAP_SELECTED_RING_WIDTH = 2;
const TEMAS_MAP_SELECTED_RING_COLOR = '#0e1116';
/**
 * Z index of the selected marker's style.
 *
 * The selected circle is the **largest** one, so without a z index it gets overlapped: the circles
 * around it are full-size and paint after it, and a tone-colored marker sitting on a tone-colored
 * tile or a tone-colored neighbor ends up eating the very ring that was supposed to say "this one".
 * OpenLayers sorts the styles of a vector layer by `zIndex`, so a single value above the default is
 * all it takes. The spiderfied variant needs it too —the displaced circle is a second style of the
 * same feature, built in the `declutter` pass— which is why the z index rides on the style and not on
 * the feature.
 */
const TEMAS_MAP_SELECTED_Z_INDEX = 1;
/**
 * Default of `temasMapAttribution`: the credit of the default base layer. The tile template is
 * opaque to the component (the consumer hands it over ready to use, key included), so the provider
 * cannot be derived from it, and the attribution of the data most such tiles carry —OpenStreetMap—
 * is the one declared here.
 *
 * A consumer on another provider has to override it, and to pass `''` when their tiles need no
 * credit, which takes the whole attribution control out of the map.
 *
 * It is markup, not plain text, because that is what the attribution is: the credit is a link to the
 * provider's terms. The default already is one, and the control renders it as HTML.
 */
const TEMAS_MAP_ATTRIBUTION_DEFAULT = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
/**
 * Icon of the button that opens the topics map: a folded map, three panels. It is inlined instead of
 * coming from an icon font or an external sprite because the component ships no assets and no extra
 * request for a glyph nobody would notice is missing.
 *
 * Two details are load-bearing and not style preferences:
 *
 * - `fill="currentColor"` on the root. Without it the paths take the SVG default, which is black — a
 *   black glyph on the dark card, invisible. Letting it inherit is what lets the button rest on
 *   `--tv-text-muted` and light up on `--tv-accent` with no change here.
 * - The `width`/`height` attributes are the *rendering* size and the `viewBox` the coordinate space.
 *   The component CSS overrides the two attributes, so those values are only the fallback for a
 *   consumer that loads the markup without the stylesheet; the `viewBox` is what keeps the glyph
 *   proportional at 28px.
 */
const TEMAS_MAP_TOGGLE_SVG = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 448" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M128 0c4.25 0 8 3.75 8 8v368c0 3-1.75 5.75-4.25 7l-120 64c-1.25 0.75-2.5 1-3.75 1-4.25 0-8-3.75-8-8v-368c0-3 1.75-5.75 4.25-7l120-64c1.25-0.75 2.5-1 3.75-1zM440 0c4.25 0 8 3.75 8 8v368c0 3-1.75 5.75-4.25 7l-120 64c-1.25 0.75-2.5 1-3.75 1-4.25 0-8-3.75-8-8v-368c0-3 1.75-5.75 4.25-7l120-64c1.25-0.75 2.5-1 3.75-1zM160 0c1.25 0 2.5 0.25 3.5 0.75l128 64c2.75 1.5 4.5 4.25 4.5 7.25v368c0 4.25-3.75 8-8 8-1.25 0-2.5-0.25-3.5-0.75l-128-64c-2.75-1.5-4.5-4.25-4.5-7.25v-368c0-4.25 3.75-8 8-8z"></path></svg>';
/**
 * Icon of a topic that has no usable point, shown in the list in place of the number while the map
 * is open: a crossed-out location pin, the same glyph the map would use to say "no location".
 *
 * `fill="currentColor"` for the same reason as the toggle's icon; here what it inherits is the muted
 * color of `.tema-map-ref-none`, which is what tells it apart from the colored number of a located
 * topic. The `viewBox` is the original 768×768 the glyph was drawn in, so the path data is untouched.
 */
const TEMAS_MAP_NO_GEOM_SVG = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="12" height="12" fill="currentColor" aria-hidden="true" focusable="false"><path d="M375 367.5q163.5 162 265.5 264l-40.5 40.5-108-106.5q-24 36-51 70.5t-42 51l-15 16.5q-9-10.5-24-27.75t-54-69-68.25-100.5-53.25-110.25-24-108q0-16.5 6-49.5l-102-102 40.5-40.5 267 267zM384 208.5q-34.5 0-58.5 27l-103.5-102q27-28.5 75-48.75t87-20.25q93 0 158.25 65.25t65.25 158.25q0 72-54 175.5l-115.5-117q25.5-22.5 25.5-58.5 0-33-23.25-56.25t-56.25-23.25z"></path></svg>';
/**
 * Chevron of the topics map toggle, pointing down while the map is closed: the same glyph and the same
 * stroke as the "Cargar más" arrow, so the two read as the same control.
 *
 * It is a constant (and not markup inline in `_buildTemasMapToggleHtml`) only because the two
 * attributes `width`/`height` and the class are load-bearing:
 *
 * - The class is what the component CSS targets, both to keep this arrow at 12px — the rule that sizes
 *   the map icon is a bare `svg` selector and would otherwise stretch this one to the icon's size —
 *   and to rotate it 180° when the button is open. It hangs off `aria-expanded`, so the state lives
 *   in the attribute the handler already writes for the icon tint and the labels.
 * - `fill="none"` + `stroke="currentColor"`: it is a stroked chevron, not a filled one, and letting
 *   the stroke inherit is what makes it follow the button's color across its three states (base,
 *   hover, open).
 * - `aria-hidden` for the same reason as the icon above: the action is in the `aria-label`/`title` of
 *   the button, so announcing the arrow would say the same thing twice.
 */
const TEMAS_MAP_TOGGLE_CHEVRON_SVG = '<svg class="card-temas-map-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="6,9 12,15 18,9"/></svg>';
/**
 * States of the general map (`showFullMap`), written as the `data-state` of `#fullmap-status` so the
 * SCSS can leave the box alone in the one state that has no text, and so the message is a single
 * attribute instead of three class names the TS would have to keep in sync.
 */
const FULLMAP_STATE_LOADING = 'loading';
const FULLMAP_STATE_EMPTY = 'empty';
const FULLMAP_STATE_ERROR = 'error';
/**
 * The one loading text of the general map, in the two moments there is one: the first open (the
 * map does not exist yet) and every `GET {url}/points` of API mode with the map already on screen
 * (the markers of the filter that just ended go away right away and this is what says why). Same
 * criterion as the list, where `_renderApiLoading` drops the cards for skeletons —just that a map
 * has no silhouette to placeholder, so the state is the message.
 */
const FULLMAP_LOADING_TEXT = 'Cargando elementos del mapa…';
/**
 * Los dos rótulos del botón del mapa general, y el ícono de cada estado.
 *
 * El botón cambia **de glifo**, no solo de color: con el mapa abierto ya no es "abrime el mapa" sino
 * "sacáme del mapa y mostrame el listado", y un ícono de mapa plegado sobre un mapa desplegado obliga
 * a leer el `title` para saber qué hace. El `X` va con `stroke` y no con `fill` porque una cruz son dos
 * trazos; el `viewBox` de 24 es el de los otros íconos de línea de la barra (la lupa).
 *
 * Los rótulos van en `title` **y** en `aria-label`: el primero es lo que se lee al pasar el mouse y el
 * segundo lo que anuncia el lector de pantalla, y son los mismos textos.
 */
const FULLMAP_OPEN_LABEL = 'Ver mapa';
const FULLMAP_EXIT_LABEL = 'Salir del mapa y ver como listado';
const FULLMAP_CLOSE_SVG = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg>';
/**
 * Values shown per filter group before the "Ver más (N)" toggle appears, when the `maxVisible`
 * of the group itself does not say otherwise. Below 2 the group is never collapsed.
 */
const DEFAULT_FILTER_MAX_VISIBLE = 5;
/** Control types a filter group can declare */
const SUPPORTED_FILTER_TYPES = ['checkboxes', 'select'];
/**
 * Values a `'select'` group needs before it shows the search box of its list. Below it the list is
 * short enough to scan, and a search box would be noise; a `searchable` option overrides the cutoff
 * in either direction.
 */
const FILTER_SELECT_SEARCH_MIN = 8;
/**
 * Rows a `'select'` list has at any moment. The list of a field with hundreds of values cannot be
 * all of it at once: a dropdown with 400 rows is a wall to scroll, and 400 rows of DOM is a cost on
 * the first open for no gain. So the list shows a window of it and grows it as the user scrolls (or
 * asks for more), while the *search* runs over every value, rendered or not.
 */
const FILTER_SELECT_WINDOW = 50;
/**
 * Token of the items that carry no value for a field (`null`, or the field missing): what
 * `_filterToken` gives both, and therefore the only way to reach them in a filter.
 */
const FILTER_EMPTY_VALUE = 'null';
/**
 * Label of the option a group with `allowEmpty` gets for that token. Fixed on purpose: the bucket
 * is the same everywhere (a missing type, a missing date), so it does not get a label per group.
 */
const FILTER_EMPTY_LABEL = 'Sin valor';
/**
 * The card field the `cardClickable` chips filter by today. The option itself is generic (any
 * group can declare it), but the card only knows how to render *this* field as chips, so this is
 * the one place that ties a `filters` declaration to a card slot.
 */
const CARD_CLICKABLE_FIELD = 'actores_principales';
/**
 * Actors rendered as chips before the "..." of the collapsed block. With `cardClickable` these are
 * the ones that fit in one line before the card gets taller, same cut the plain text has always had.
 */
const CARD_CLICKABLE_MAX = 3;
/** Label of the "Ver todo" option added to the taxonomy selector when there is more than one group */
const ALL_TAXONOMIES_LABEL = 'Ver todo';
/** `_contentIndex` value that means "every taxonomy" instead of a single group */
const ALL_TAXONOMIES_INDEX = -1;
/**
 * Result sets bigger than this get the count row **twice**: the one `_renderStatus` writes at the
 * end of the list, and a mirror of it at the top of it (right below the taxonomy row, when there
 * is one). Below that threshold the single row at the end is enough, which is how it always was.
 */
const STATUS_TOP_MIN_ITEMS = 3;
const RESIZE_MIN_HEIGHT = 180;
const RESIZE_MAX_HEIGHT = 1200;
const RESIZE_STEP = 24;
const RESIZE_STORAGE_KEY = 'tv-timeline-cards-height';
const WORK_NOTES_STORAGE_KEY = 'tv-work-notes-hidden';
/**
 * `localStorage` key of the state of the filters marked `persist`. The record inside is keyed by
 * `field`, not by a fixed list, so a filter declared later by the consumer persists like the ones
 * that were always there.
 */
const PERSISTED_FILTER_STORAGE_KEY = 'tv-filtros-internos-filters';
/**
 * Prefix of every query param the component owns in the browser URL with `stateInUrl`. The namespace
 * is what makes "clean the URL" safe: writing strips the `tv_*` keys it does not recognize (a filter
 * the consumer did not declare this time —an internal one, for a user without permissions—) and
 * leaves every other param alone, so the consumer keeps its own flags (`?api`, `?flat`, `?id`...).
 * A consumer that wants to reserve keys of its own has to stay out of this prefix.
 */
const URL_STATE_PREFIX = 'tv_';
/** The fixed params of the URL state, the ones that are not a filter field */
const URL_STATE_KEYS = {
    q: URL_STATE_PREFIX + 'q',
    sortBy: URL_STATE_PREFIX + 'sortBy',
    sort: URL_STATE_PREFIX + 'sort',
    taxonomy: URL_STATE_PREFIX + 'tax',
    page: URL_STATE_PREFIX + 'page'
};
const TONE_LABEL = { Positivo: 'Positivo', Negativo: 'Negativo', Neutro: 'Neutro' };
/**
 * The filter field whose active values the general map applies **per topic**, not per article.
 *
 * It is the article-level array of tones, and that is exactly the point: the same group that narrows
 * the list to "the articles with a negative topic" has to narrow the map to "the negative topics", or
 * the map draws every topic of those articles. Hardcoded, like the tone colors and the tone labels, and
 * for the same reason: it is part of the data model, not a per-consumer configuration. A group declared
 * on any other field keeps filtering per article only — which is all a topic knows about — and the map
 * follows it.
 */
const FULLMAP_TONE_FIELD = 'tonos_sociales';
/**
 * Milisegundos que dura el desplazamiento de la vista cuando se elige un tema desde la ficha.
 *
 * No es cero a propósito —a diferencia del `fit` de apertura, que tiene que estar listo antes del
 * primer pintado—: acá la vista ya está mostrando algo y el salto sería un corte. Con duración
 * OpenLayers interpola el centro y el zoom, que además dispara los `moveend` que re-declutterean los
 * markers en el camino.
 */
const FULLMAP_FOCUS_DURATION = 400;
/**
 * Ancho mínimo de viewport (px) a partir del cual la ficha del mapa general se saltea el clamp contra
 * la barra de herramientas y su alto puede llegar hasta arriba.
 *
 * Por debajo del umbral el panel se ancla al bottom real de `.featured-row` (`_syncFullMapDetailTop()`)
 * porque en pantallas angostas la barra ocupa el ancho completo y taparía el inicio de la ficha —y su
 * botón de cerrar—. Desde el umbral se escribe `0`, que es el mismo camino que ya usaba la ausencia de
 * barra, así que no hace falta ninguna regla nueva en el SCSS.
 */
const FULLMAP_DETAIL_TOP_MIN_WIDTH = 1700;
/**
 * Normalize a text so it can be searched as a plain substring: without accents and without case,
 * so "politica" finds "Política" and the other way around. Done **once per value**, when the list
 * of a `'select'` group is built, which is what keeps typing in the search box cheap on a field
 * with hundreds of values.
 */
function foldForSearch(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
/**
 * Cuánto zoomea la rueda por pixel de `deltaY`: el scale se multiplica por `1 - deltaY * RATE`, así
 * que `0.0015` es ~1.5% por pixel. Es una curva de pinza, no un paso fijo: un trackpad manda
 * `deltaY` chicos y una rueda de muescas manda ~100 de golpe, y con esta curva las dos se sienten
 * parecido.
 */
const LG_WHEEL_ZOOM_RATE = 0.0015;
/**
 * Ventana mínima entre dos zoomes de rueda, en ms. El trackpad sigue mandando eventos cuando uno
 * levanta los dedos (la inercia), y sin este corte un flick se comía los topes de un solo golpe.
 */
const LG_WHEEL_ZOOM_COOLDOWN = 60;
/** Cuántos píxeles vale una línea de `deltaY`, para `deltaMode === WheelEvent.DOM_DELTA_LINE` */
const LG_WHEEL_ZOOM_LINE_PX = 16;
/**
 * Zoom **de reserva** al que llega la rueda cuando la imagen no tiene nada más grande que su propia
 * caja: una captura de 400x800 (los screenshots del mock) o cualquier thumbnail que la galería ya
 * muestra 1:1, donde `getCurrentImageActualSizeScale()` da 1 y el techo real no dejaría mover nada.
 * Para una imagen grande el tope es su tamaño real y este 4 no entra.
 *
 * Antes este 4 era también el techo de las imágenes grandes, porque el tope se sacaba de
 * `getScale(LG_WHEEL_ZOOM_MAX)` y ese método **clampa por su argumento**: una captura de 1265x8012 en
 * un visor de 632 da `getScale(4) === 4` en vez de sus ~12.7x reales. De ahí el nombre.
 */
const LG_WHEEL_ZOOM_FALLBACK_MAX = 4;
/**
 * Plugin de lightGallery: **zoom con la rueda** sobre la imagen abierta.
 *
 * lightGallery 2.9 no lo trae. El plugin `zoom` maneja pinch (táctil), drag para panear y los
 * iconos +/−, pero no escucha `wheel`; y el `settings.mousewheel` del core, que sí escucha, es de
 * navegación entre slides con un throttle de 1s, no de zoom (por eso queda en `false`).
 *
 * En vez de reimplementar el transform, el handler llama la API pública del plugin `zoom`
 * (`beginZoom` + `zoomImage` + `getScale`), que es la misma que usan los íconos: el wrap y la
 * imagen los sigue moviendo lightGallery, así que el drag, el pinch y el reset al cambiar de slide
 * quedan exactamente igual. La instancia del zoom se busca en `core.plugins`, que es un array de
 * las instancias que el core construye en el constructor; el tipo del peer dep lo declara como
 * `any[]`, y acá se acota con `instanceof lgZoom`.
 *
 * El tope es el tamaño natural de la imagen (`getCurrentImageActualSizeScale()`), y si ese tamaño no es
 * mayor que el que ya se muestra —una imagen 1:1— el tope pasa a ser `LG_WHEEL_ZOOM_FALLBACK_MAX`,
 * para que la captura se pueda ampliar. Ojo con `getScale()`: clampa al valor que se le pasa, así que
 * usarlo para el tope lo convertía en el tope. Y `getCurrentImageActualSizeScale()` devuelve
 * `Infinity` si la imagen todavía no tiene layout (divide por `offsetWidth === 0`), de ahí el guard de
 * `containerRect` y el chequeo de `Number.isFinite` del handler.
 *
 * El punto desde el que se escala lo aporta `_anchorToCursor`, porque el ancla de `zoomImage()` no es un
 * parámetro sino estado del plugin.
 */
class LgWheelZoom {
    constructor(core) {
        this._zoom = null;
        this._lastWheelAt = 0;
        this._onWheel = (event) => {
            const zoom = this._zoom;
            if (!zoom || !zoom.isImageSlide(this._core.index))
                return;
            // La imagen todavía sin layout: `getScale()` dividiría por `offsetWidth === 0` y devolvería
            // Infinity. `containerRect` lo setea `setZoomEssentials()`, que corre cuando la slide carga.
            if (!zoom.containerRect)
                return;
            // Firefox mide la rueda en líneas y no en píxeles: sin esto el zoom de la rueda no se sentiría
            // igual en los dos navegadores.
            const delta = event.deltaMode === 1 ? event.deltaY * LG_WHEEL_ZOOM_LINE_PX : event.deltaY;
            if (!delta)
                return;
            // Con la galería abierta la página de atrás no scrollea (`html.lg-on` la congela), pero el
            // preventDefault evita el scroll-chaining igual, y de paso el zoom del navegador con
            // ctrl+wheel (pinza del trackpad) sobre el modal.
            event.preventDefault();
            const now = Date.now();
            if (now - this._lastWheelAt < LG_WHEEL_ZOOM_COOLDOWN)
                return;
            this._lastWheelAt = now;
            // Estado "tamaño real": acá el peer dep cambia de representación —el `.lg-image` queda con su
            // tamaño natural en layout y el `!important` de `lg-zoom.css` le fuerza `scale(1)`— y deja su
            // `scale` (el de la transformación) sin reconciliar, así que cualquier `zoomImage()` desde este
            // estado mueve la imagen sin reasonar la escala nueva (se ve como un salto). Por eso la rueda no
            // hace zoom acá: para arriba no hay nada más que ampliar (ya es 1:1) y para abajo devuelve al
            // ajuste. El reset es en dos pasos porque `resetZoom()` solo no alcanza: no saca la clase
            // `reset-transition-y` —el `!important` que manda el tamaño natural— ni los `width`/`height`
            // inline, y `resetImageTranslate()` solo no alcanza porque no limpia el `transform` inline ni
            // reinicia `scale`/`left`/`top`.
            if (this._atActualSize()) {
                if (delta < 0)
                    return;
                zoom.resetImageTranslate(this._core.index);
                zoom.resetZoom(this._core.index);
                return;
            }
            const prev = zoom.scale;
            // Techo: el tamaño real de la imagen, y el piso solo cuando no hay nada que ampliar, que es el
            // caso de una imagen que la galería muestra 1:1 (un screenshot chico, un thumbnail).
            //
            // La escala real sale de `getCurrentImageActualSizeScale()` y NO de `getScale(...)`: ese clampa al
            // valor que se le pasa, así que pedirle el techo a él lo convertía en el techo (una captura de
            // 1265x8012 en un visor de 632 se quedaba en 4x de sus ~12.7). Acá el 4 es el piso, y solo entra
            // cuando la imagen ya va 1:1. El `Number.isFinite` cubre el `Infinity` que devuelve el método si
            // la imagen todavía no tiene layout (divide por `offsetWidth === 0`).
            const realMax = zoom.getCurrentImageActualSizeScale();
            const max = realMax > 1 && Number.isFinite(realMax) ? realMax : LG_WHEEL_ZOOM_FALLBACK_MAX;
            const next = Math.min(Math.max(prev * (1 - delta * LG_WHEEL_ZOOM_RATE), 1), max);
            // Ya en el tope, o `zoomImage` no-op con `scaleDiff` 0: no se toca nada.
            if (!Number.isFinite(next) || Math.abs(next - prev) < 0.001)
                return;
            // El ancla va en el cursor: `zoomImage()` no la recibe como parámetro, la lee del estado del
            // plugin, y el peer dep la deja en el centro del modal al abrir (ver `_anchorToCursor`). Ir antes
            // del `beginZoom` no tiene trampa: `beginZoom` solo resetea el ancla cuando `next === 1`, y ahí
            // ya se llama a `resetZoom()`, que además pone `left`/`top` en 0, así que el transform final es
            // `translate3d(0, 0)` igual (el `setPageCords()` de ese reset deja el ancla en el centro).
            this._anchorToCursor(zoom, event);
            zoom.beginZoom(next);
            zoom.zoomImage(next, next - prev, true, false);
        };
        this._core = core;
    }
    /**
     * El core construye la estructura antes de inicializar los plugins (`initModules()` es lo último
     * de `buildStructure()`), así que el `.lg-outer` ya existe acá.
     */
    init() {
        this._zoom = this._core.plugins.find((plugin) => plugin instanceof lgZoom) ?? null;
        this._core.outer.get().addEventListener('wheel', this._onWheel, { passive: false });
    }
    /** Lo llama el core en `destroy()`, vía `destroyModules(true)` */
    destroy() {
        this._core.outer.get().removeEventListener('wheel', this._onWheel);
    }
    /** La imagen de la slide visible: la que miden el estado de tamaño real y el ancla del cursor */
    _currentImage() {
        return this._core.outer.get().querySelector('.lg-current .lg-image');
    }
    /**
     * Si el peer dep dejó la imagen en su representación de "tamaño real" (la que describe `_onWheel`).
     *
     * La clase `lg-actual-size` del `.lg-outer` es la que pone y saca el plugin, pero **no alcanza
     * sola**: entre aperturas queda pegada en el contenedor reutilizado, así que un primer tick con la
     * imagen todavía en su caja de ajuste caería en la rama equivocada. Se confirma con la geometría,
     * que en ese estado es la única que vale: el elemento con su tamaño natural en layout.
     */
    _atActualSize() {
        const image = this._currentImage();
        return (this._core.outer.get().classList.contains('lg-actual-size') &&
            !!image &&
            image.naturalWidth > 0 &&
            image.offsetWidth === image.naturalWidth);
    }
    /**
     * Ancla el zoom en el cursor en vez de en el centro del modal.
     *
     * `zoomImage()` no recibe un punto: arma el nuevo transform a partir de `pageX`/`pageY` del
     * plugin, y el peer dep los deja en el centro del modal al abrir, así que sin esto la rueda escala
     * siempre desde el medio. Se escriben los dos campos en vez de llamar a `setPageCords()` porque esa
     * hace `event.pageX || event.touches[0].pageX` y un `WheelEvent` no tiene `touches`: con `pageX` en
     * `0` reventaría. Los dos son públicos en el `.d.ts` del peer dep.
     *
     * El gate es el rect de la imagen y no el del `.lg-img-wrap` porque el wrap es `position: absolute`
     * con `left/right/top/bottom: 0` y `width/height: 100%`, o sea el rect del slide entero: daría
     * "dentro" siempre. Con el cursor fuera de la imagen (caption, barra de miniaturas) no se escribe
     * nada y el ancla sigue siendo el centro.
     *
     * Un detalle que no importa: el rect sale con la transición de 0.5s del peer dep a medio camino, así
     * que la elección cursor/centro puede quedar un frame desfasada justo en el borde de la imagen. El
     * ancla misma sale del evento y es exacta, y las dos opciones son legales.
     */
    _anchorToCursor(zoom, event) {
        const image = this._currentImage();
        if (!image)
            return;
        const rect = image.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right)
            return;
        if (event.clientY < rect.top || event.clientY > rect.bottom)
            return;
        // Coordenadas de página, que es el espacio con el que trabaja la fórmula del peer dep
        // (`containerRect` + `zoom.scrollTop`) y en el que el `dblclick` ya deja su ancla.
        zoom.pageX = event.pageX;
        zoom.pageY = event.pageY;
        // El drag y el pinch dejan `positionChanged` en `true`, y `zoomImage()` lo mira antes que
        // `pageX`/`pageY`: rehace el ancla desde `left`/`top` para no mover lo que quedó arrastrado. Por
        // eso hay que limpiarlo, o el primer tick de la rueda tras arrastrar vuelve al centro. El
        // `left`/`top` del drag entra igual en la fórmula, así que la posición alcanzada no se pierde.
        zoom.positionChanged = false;
    }
}
export default class Timeline {
    constructor(config) {
        this.searchTerm = '';
        this.container =
            typeof config.container === 'string'
                ? document.querySelector(config.container)
                : config.container;
        this.container.classList.add('publicaciones-container');
        this.items = config.items || [];
        this.content = this._normalizeContent(config.content);
        this._contentIndex = 0;
        this.featured_count = config.featuredCount || 6;
        this.lastUpdated = config.lastUpdated || '';
        this.itemsPerPage = config.itemsPerPage ?? 10;
        this.pagination = config.pagination === true;
        this.inlineImages = config.inlineImages || false;
        this.inlineAdjuntos = config.inlineAdjuntos || false;
        this.internalButtons = config.internalButtons || false;
        // `=== undefined` and not `||`: an explicit `''` is how a consumer turns the base off, and `||`
        // would swallow it and put the default tiles back on.
        this.temasMapTiles = config.temasMapTiles === undefined ? TEMAS_MAP_TILES_DEFAULT : config.temasMapTiles;
        // Same `=== undefined` as the tiles: an explicit `''` is how a consumer says "my layer needs no
        // credit", and `||` would swallow it and put the OpenStreetMap one back on — on a map that is
        // not showing a single OpenStreetMap tile.
        this.temasMapAttribution =
            config.temasMapAttribution === undefined ? TEMAS_MAP_ATTRIBUTION_DEFAULT : config.temasMapAttribution;
        this._olModules = null;
        this._temasMaps = new Map();
        this.showFullMap = config.showFullMap === true;
        this.fullMapToggle = null;
        this.fullMapView = null;
        this.fullMapCanvas = null;
        this.fullMapStatus = null;
        this.fullMapDetail = null;
        this._fullMapOpen = false;
        this._fullMapHandle = null;
        this._fullMapPoints = [];
        this._fullMapSeq = 0;
        this._fullMapCardId = null;
        this._fullMapSelectedKey = null;
        // The URL state is read here, before `_init()`, and not inside it: what it says has to be part of
        // the **first** render (the markup of the toolbar, the selected sorter, the taxonomy pill) and of
        // the first API request, or the shared link would open on the wrong view and then correct itself.
        // It is skipped in single mode, which has no list to share.
        this.stateInUrl = config.stateInUrl === true && !config.singleId;
        this._urlFilters = null;
        this._urlPage = 1;
        this._urlReady = false;
        this.fullpage = config.fullpage === true;
        this.filters = this._normalizeFilters(config.filters);
        this._filterExpanded = new Set();
        this.sorters = this._normalizeSorters(config.sorters);
        const defaultSorter = this.sorters.find((s) => s.default) || this.sorters[0];
        this._sortField = defaultSorter ? defaultSorter.field : 'fecha_publicacion';
        this._sortAsc = false;
        this.relatedLabel = config.relatedLabel || null;
        this.singleId = config.singleId ? config.singleId.replace(/^\/+/, '') : null;
        this.taxonomyRow = null;
        this.taxonomySelectWrap = null;
        this.taxonomySelectLabel = null;
        this.taxonomySelectCount = null;
        this.taxonomySelect = null;
        this._displayedCount = 0;
        this._page = 1;
        this.allCards = [];
        this._featuredCards = [];
        this._apiFeaturedCards = [];
        // El modo fullpage implica abierto: siempre expandido y sin opción de colapsar.
        this.isExpanded = this.fullpage || config.startExpanded === true;
        this.featuredContainer = null;
        this.featuredRow = null;
        this.timelineContainer = null;
        this.timelineCards = null;
        this.resizeHandle = null;
        this.expandToggle = null;
        this.remainingCount = null;
        this.expandIcon = null;
        this.sortToggle = null;
        this.sortMenu = null;
        this.workNotesToggle = null;
        this.filterToggle = null;
        this.filterMenu = null;
        this.filtrosInternosWrap = null;
        this.filtrosInternosToggle = null;
        this.filtrosInternosMenu = null;
        this.section = null;
        this.searchWrap = null;
        this.searchInput = null;
        this.searchTerm = '';
        this._lgInstance = null;
        this._lgContainer = null;
        this.api = config.api || null;
        this._apiPage = 1;
        this._apiTotal = 0;
        this._apiCollectionTotal = 0;
        this._apiFacets = {};
        this._apiFacetLabels = {};
        this._apiFacetsPromise = null;
        this._apiLoading = false;
        this._apiSeq = 0;
        this._apiReloadTimer = 0;
        this._apiFacetsLoaded = false;
        this._apiFacetsSettled = false;
        this._apiError = '';
        this._apiDetails = new Map();
        this._shareTimer = 0;
        // After every field above is in place: `_readUrlState` resolves the sort field and the taxonomy
        // against the normalized `sorters` and `content`, so it has to come last.
        this._readUrlState();
        this._init();
    }
    /**
     * Normalize the `content` option: drop groups without a label or without items.
     * An empty result means the component falls back to the legacy flat `items` list.
     */
    _normalizeContent(content) {
        if (!Array.isArray(content))
            return [];
        return content
            .filter((g) => !!g && typeof g.label === 'string' && g.label.trim() !== '')
            .map((g) => ({ label: g.label.trim(), items: Array.isArray(g.items) ? g.items : [] }))
            .filter((g) => g.items.length > 0);
    }
    /**
     * Normalize the `filters` option into the groups the panel renders.
     *
     * Nothing is hardcoded, so an absent or invalid option simply yields no groups: the panel and
     * its button are not rendered at all, and in API mode no filter param is sent. Entries that
     * cannot be rendered —no `field`, a `type` that is not supported yet, or a `field` already
     * declared— are dropped with a warning instead of breaking the mount, because a group that
     * renders nothing is far harder to notice than a line in the console.
     *
     * A missing or blank `label` is not one of them: the group is rendered without a header, which
     * is a decision the consumer took and not a broken declaration.
     *
     * The `'menu'` groups are then dealt out to the columns of the panel: the first half goes to
     * the first column and the rest to the second, which reads a declaration top to bottom down
     * the first column and then along the second. A `'select'` group is left out of that deal: it
     * does not live in a column but takes the full width above them, so the cut does not shift
     * because of it.
     */
    _normalizeFilters(filters) {
        if (!Array.isArray(filters) || filters.length === 0)
            return [];
        const declared = new Set();
        const defs = [];
        filters.forEach((f, i) => {
            if (!f || typeof f !== 'object') {
                this._warnFilter(i, 'no es un objeto');
                return;
            }
            if (typeof f.field !== 'string' || f.field.trim() === '') {
                this._warnFilter(i, 'no tiene `field`');
                return;
            }
            if (f.type !== undefined && !SUPPORTED_FILTER_TYPES.includes(f.type)) {
                this._warnFilter(i, `"${f.field}" declara type "${String(f.type)}", que no está soportado (soportado: ${SUPPORTED_FILTER_TYPES.join(', ')})`);
                return;
            }
            if (declared.has(f.field)) {
                this._warnFilter(i, `"${f.field}" ya está declarado en otro grupo`);
                return;
            }
            // Un grupo que declara `items` los resuelve acá: la validación es por ítem, pero un ítem
            // roto descarta el grupo entero (y avisa), porque medio grupo declarado es peor que
            // ninguno: dejar un valor sin checkbox lo saca de la declaración en silencio.
            let declaredItems;
            if (f.items !== undefined) {
                const resolved = this._resolveFilterItems(f.field, f.items);
                if (!resolved)
                    return;
                declaredItems = resolved;
            }
            declared.add(f.field);
            defs.push({
                field: f.field.trim(),
                // `label` es opcional y se normaliza a `''` (sin header) en vez de descartar el grupo.
                label: typeof f.label === 'string' ? f.label.trim() : '',
                type: f.type && SUPPORTED_FILTER_TYPES.includes(f.type) ? f.type : 'checkboxes',
                group: f.group === 'filtros_internos' ? 'filtros_internos' : 'menu',
                persist: f.persist === true,
                allowEmpty: f.allowEmpty === true,
                multiple: f.multiple !== false,
                searchable: typeof f.searchable === 'boolean' ? f.searchable : undefined,
                cardClickable: f.cardClickable === true,
                column: 0,
                extract: f.extract,
                formatLabel: f.formatLabel,
                sortValues: f.sortValues,
                declared: declaredItems,
                maxVisible: typeof f.maxVisible === 'number' ? f.maxVisible : undefined,
                options: null,
                active: new Set(),
                checkboxes: [],
                select: null
            });
        });
        // Solo las columnas se reparten: un `'select'` va a su propio bloque de ancho completo arriba
        // de ellas (ver `_buildFilterMenuHtml`), así que no puede ocupar media columna ni correrse el
        // corte de los grupos que sí van en columnas.
        const menuGroups = defs.filter((f) => f.group === 'menu' && f.type !== 'select');
        const half = Math.ceil(menuGroups.length / 2);
        menuGroups.forEach((f, i) => {
            f.column = i < half ? 0 : 1;
        });
        return defs;
    }
    /**
     * Resolve the `items` a filter group declares into the tokens the checkboxes carry. Returns
     * `null` (after warning) when the declaration is unusable: not a list, empty, an entry without a
     * `label` or without a `value`, or two entries that would share the same token.
     *
     * The token of an entry is what lands in the DOM (`input.value`) and in the query param of API
     * mode: the declared values joined by commas. The same values one by one are what an item is
     * compared against, so `[false, null]` is one checkbox that matches either.
     */
    _resolveFilterItems(field, items) {
        const reject = (reason) => {
            console.warn(`TimelineViewer: filtro "${field}" descartado: ${reason}.`);
            return null;
        };
        if (!Array.isArray(items) || items.length === 0)
            return reject('declara `items` vacío');
        const resolved = [];
        const seen = new Set();
        for (const item of items) {
            if (!item || typeof item !== 'object' || typeof item.label !== 'string' || item.label.trim() === '') {
                return reject('un ítem de `items` no tiene `label`');
            }
            const value = item.value;
            const isList = Array.isArray(value);
            if (value === undefined || (isList && value.length === 0)) {
                return reject(`el ítem "${item.label}" no tiene \`value\``);
            }
            const values = (isList ? value : [value]);
            if (values.some((v) => v === undefined)) {
                return reject(`el ítem "${item.label}" tiene un valor undefined`);
            }
            const tokens = values.map((v) => this._filterToken(v));
            const token = tokens.join(',');
            if (tokens.some((t) => t.includes(','))) {
                return reject(`el ítem "${item.label}" declara un valor con coma, que rompe el query param`);
            }
            if (seen.has(token))
                return reject(`el ítem "${item.label}" repite el valor "${token}"`);
            seen.add(token);
            resolved.push({ token, tokens, label: item.label.trim(), checked: item.checked === true });
        }
        return resolved;
    }
    /** Report a group of the `filters` option that was dropped, so a typo does not go unnoticed */
    _warnFilter(index, reason) {
        console.warn(`TimelineViewer: filtro #${index} de la opción "filters" descartado: ${reason}.`);
    }
    /**
     * Normalize the `sorters` option into the options the menu renders. Like `filters`, nothing is
     * hardcoded: an absent or invalid option simply yields no options, and then the component renders
     * **no sort UI at all** —the timeline keeps its built-in `fecha_publicacion` descending order—.
     *
     * Entries without a `field` or a `label`, and two entries sharing the same `field`, are dropped
     * with a warning instead of breaking the mount: a broken entry is a runtime typo far easier to
     * spot in the console than as an option that silently does not appear.
     */
    _normalizeSorters(sorters) {
        if (!Array.isArray(sorters) || sorters.length === 0)
            return [];
        const seen = new Set();
        const defs = [];
        sorters.forEach((s, i) => {
            if (!s || typeof s !== 'object') {
                console.warn(`TimelineViewer: sorter #${i} de la opción "sorters" descartado: no es un objeto.`);
                return;
            }
            if (typeof s.field !== 'string' || s.field.trim() === '') {
                console.warn(`TimelineViewer: sorter #${i} de la opción "sorters" descartado: no tiene \`field\`.`);
                return;
            }
            const field = s.field.trim();
            if (typeof s.label !== 'string' || s.label.trim() === '') {
                console.warn(`TimelineViewer: sorter "${field}" descartado: no tiene \`label\`.`);
                return;
            }
            if (seen.has(field)) {
                console.warn(`TimelineViewer: sorter "${field}" ya está declarado en otra entrada.`);
                return;
            }
            seen.add(field);
            defs.push({ field, label: s.label.trim(), default: s.default === true });
        });
        return defs;
    }
    /** Every item of every taxonomy, used by the featured stack, the counter and single mode */
    _allItems() {
        if (this.content.length === 0)
            return this.items;
        return this.content.flatMap((g) => g.items);
    }
    /**
     * Items of the currently selected taxonomy, or every taxonomy when "Ver todo" is selected.
     * Falls back to the legacy flat `items` list when no group is configured.
     */
    _scopeItems() {
        if (this.content.length === 0)
            return this.items;
        if (this._contentIndex === ALL_TAXONOMIES_INDEX)
            return this._allItems();
        return this.content[this._contentIndex]?.items || [];
    }
    /**
     * Order a copy of the items by the active sorter (`_sortField` + `_sortAsc`).
     *
     * The comparison is natural (`Intl.Collator` with `numeric`): ISO dates (`YYYY-MM-DD`) and
     * zero-padded ids (`FUE-00001`) both sort correctly as plain strings, so no per-field logic is
     * needed. An item that carries no value for the field is the smallest value, which puts it first
     * in `asc` and last in `desc` —the same places the undated items took before—. The sort is
     * stable, so ties keep their source order in **both** directions, exactly as the API server does.
     */
    _sortBy(items) {
        const collator = new Intl.Collator(undefined, { numeric: true });
        const cmp = (a, b) => (a === b ? 0 : a === '' ? -1 : b === '' ? 1 : collator.compare(a, b));
        const dir = this._sortAsc ? 1 : -1;
        return [...items].sort((a, b) => dir * cmp(this._sortValue(a), this._sortValue(b)));
    }
    /** Comparable text of an item for the active sorter; a missing value compares as `''` (smallest) */
    _sortValue(item) {
        const value = item[this._sortField];
        return value === null || value === undefined ? '' : String(value);
    }
    /**
     * Number of items of the active scope, shown next to the taxonomy label.
     * The selector is a scope, not a filter, so this is the raw size of the group
     * (or of the whole pool for "Ver todo") and never reacts to the checkboxes.
     */
    _scopeCount() {
        if (this.content.length === 0)
            return this.items.length;
        if (this._contentIndex === ALL_TAXONOMIES_INDEX)
            return this._allItems().length;
        return this.content[this._contentIndex]?.items.length || 0;
    }
    /**
     * Markup of a group of the `filters` option: a `.filter-section` with its optional header and
     * the empty `.filter-options` box the checkboxes are built into, tagged with the field it
     * belongs to.
     *
     * Both groups of the panel (`.filter-menu`) and the ones of the internal-filters flyout
     * (`.filtros-internos-menu`) render the same section, so a `filtros_internos` group shows its
     * `label` like a `'menu'` one. The header is emitted only when the declaration brings a label:
     * with `label: null` / `''` the group is drawn without it, which is what a single-group flyout
     * wants (the values speak for themselves under a button that already says what it is).
     *
     * The `id` is only a handle for debugging: the component looks the box up by the
     * `data-filter-field` attribute, so a `field` with characters that are not valid in a CSS
     * selector cannot break the wiring. `data-filter-field` is also the stable hook for a
     * consumer's own tests.
     *
     * A `'select'` group keeps the same `.filter-section` and the same header — it is the *control*
     * that changes, not how the group reads — and replaces the `.filter-options` box by the
     * `.filter-select` one, whose list is built later (`_ensureSelectOptions`).
     */
    _buildFilterOptionsHtml(f) {
        const slot = f.type === 'select'
            ? this._buildFilterSelectHtml(f)
            : `<div class="filter-options" id="filter-options-${this._escapeHtml(f.field)}" data-filter-field="${this._escapeHtml(f.field)}"></div>`;
        const header = f.label === '' ? '' : `<div class="filter-header">${this._escapeHtml(f.label)}</div>`;
        return `<div class="filter-section">
              ${header}
              ${slot}
            </div>`;
    }
    /**
     * Markup of the control of a `'select'` group: the trigger that opens the list and carries the
     * values the user picked, and the panel that holds the search box, the values and the footer.
     *
     * The list itself is **not** in here: a field with hundreds of values would put hundreds of
     * nodes in the DOM from the start, and they would sit there on every rebuild. `_ensureSelectOptions`
     * builds them on the first open, which is also why `f.values`/`f.counts` are held on the
     * `FilterSelect` and not re-derived from the DOM.
     *
     * `aria` is wired as a combobox that owns a listbox: the trigger says if it is open, and the
     * active values are `aria-selected` options. The search box is emitted without its own value
     * because whether it appears depends on how many values the group ends up with, which is only
     * known once they are resolved (`_setupSelectSearch`).
     */
    _buildFilterSelectHtml(f) {
        const id = this._escapeHtml(f.field);
        const label = f.label === '' ? 'Seleccionar' : f.label;
        return `<div class="filter-select" id="filter-select-${id}" data-filter-field="${id}">
              <div class="filter-select-trigger" role="combobox" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-controls="filter-select-list-${id}" aria-label="${this._escapeHtml(label)}">
                <span class="filter-select-value"></span>
                <svg class="filter-select-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6 9 12 15 18 9"/></svg>
              </div>
              <div class="filter-select-panel" hidden>
                <input class="filter-select-search" type="search" placeholder="Buscar..." autocomplete="off" aria-label="Buscar ${this._escapeHtml(label)}" hidden />
                <div class="filter-select-list" id="filter-select-list-${id}" role="listbox"${f.multiple ? ' aria-multiselectable="true"' : ''}></div>
                <div class="filter-select-empty" hidden>Sin resultados</div>
                <div class="filter-select-footer">
                  <button class="filter-select-clear" type="button">Limpiar</button>
                  <span class="filter-select-count"></span>
                </div>
              </div>
            </div>`;
    }
    /**
     * Markup of the filter panel, or an empty string when no group is declared for it: with no
     * `filters` option the component has no filter UI at all, not a hidden one.
     * The columns come from the `column` that `_normalizeFilters` dealt out, in the order the
     * groups were declared, so the declaration reads down the first column and then along the
     * second. A `'select'` group is not in a column: it goes in a full-width block above them, in
     * the order it was declared, because it is the control for a field with many values and it has
     * to read as the first thing in the panel rather than as one more group among the others.
     */
    _buildFilterMenuHtml() {
        const menuGroups = this.filters.filter((f) => f.group === 'menu');
        if (menuGroups.length === 0)
            return '';
        const selects = menuGroups.filter((f) => f.type === 'select');
        const columns = menuGroups.filter((f) => f.type !== 'select');
        const groups = [0, 1]
            .map((column) => columns.filter((f) => f.column === column).map((f) => this._buildFilterOptionsHtml(f)))
            .filter((sections) => sections.length > 0);
        const selectsHtml = selects.map((f) => this._buildFilterOptionsHtml(f)).join('');
        return `<div class="filter-wrap">
              <button class="filter-toggle" id="filter-toggle" title="Filtrar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <div class="filter-menu" id="filter-menu">
                ${selectsHtml ? `<div class="filter-selects">${selectsHtml}</div>` : ''}
                ${groups.map((sections) => `<div class="filter-column">${sections.join('')}</div>`).join('')}
              </div>
            </div>`;
    }
    /**
     * Markup of the sort control, or an empty string when the `sorters` option declares no entry:
     * without `sorters` the component has **no sort UI at all**, not a hidden one. The button opens
     * a menu shaped like the filter panel: one radio per sorter and one radio per direction. The
     * direction is global (not per sorter), so the two radios are a fixed pair, not a list.
     */
    _buildSortMenuHtml() {
        if (this.sorters.length === 0)
            return '';
        const items = this.sorters
            .map((s) => `<label class="sort-option"><input type="radio" name="tv-sort-field" value="${this._escapeHtml(s.field)}"${s.field === this._sortField ? ' checked' : ''} /> <span class="sort-option-label">${this._escapeHtml(s.label)}</span></label>`)
            .join('');
        const dir = (value, label) => `<label class="sort-option"><input type="radio" name="tv-sort-dir" value="${value}"${(value === 'asc') === this._sortAsc ? ' checked' : ''} /> <span class="sort-option-label">${label}</span></label>`;
        return `<div class="sort-wrap">
              <button class="sort-toggle" id="sort-toggle" title="Ordenar" aria-haspopup="true" aria-expanded="false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="17,9 12,4 7,9" fill="currentColor"/><polygon points="17,15 12,20 7,15" fill="none" stroke-width="1.5"/></svg>
              </button>
              <div class="sort-menu" id="sort-menu">
                <div class="sort-section">
                  <div class="sort-header">Ordenar por</div>
                  ${items}
                </div>
                <div class="sort-section">
                  <div class="sort-header">Dirección</div>
                  ${dir('desc', 'Más reciente primero')}
                  ${dir('asc', 'Más antiguo primero')}
                </div>
              </div>
            </div>`;
    }
    /**
     * Markup of the internal toolbar: the work-notes toggle plus, when at least one group is
     * declared for it, the `filtros_internos` flyout. Without the latter the button would open an
     * empty menu, so both of them are conditional on the `filters` option as well.
     *
     * A `'select'` group of the flyout gets the same full-width block above the checkbox groups
     * that it gets in the panel: the layout is a property of the control, not of the destination.
     */
    _buildInternalButtonsHtml() {
        if (!this.internalButtons)
            return '';
        const workNotesButton = `<button class="work-notes-toggle" id="work-notes-toggle" title="Ocultar notas de trabajo" aria-pressed="false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l5-5V5a2 2 0 0 0-2-2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>
            </button>`;
        const internalGroups = this.filters.filter((f) => f.group === 'filtros_internos');
        if (internalGroups.length === 0)
            return workNotesButton;
        const internalSelects = internalGroups.filter((f) => f.type === 'select');
        const internalChecks = internalGroups.filter((f) => f.type !== 'select');
        const selectsHtml = internalSelects.map((f) => this._buildFilterOptionsHtml(f)).join('');
        return `${workNotesButton}
            <div class="filtros-internos-wrap" id="filtros-internos-wrap">
              <button class="filtros-internos-toggle" id="filtros-internos-toggle" title="Filtros internos">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <div class="filtros-internos-menu" id="filtros-internos-menu">
                ${selectsHtml ? `<div class="filter-selects">${selectsHtml}</div>` : ''}
                ${internalChecks.map((f) => this._buildFilterOptionsHtml(f)).join('')}
              </div>
            </div>`;
    }
    /**
     * Botón de la vista de mapa general, en la barra de herramientas y al lado del buscador: es lo
     * único que cambia **qué** se muestra, y el buscador es lo que acota lo que el mapa muestra.
     *
     * Sin la opción no hay markup, como con `sorters` y `filters`: es el mismo patrón de "lo que no
     * se declara no existe". Reusa el ícono de mapa plegado del botón de la tarjeta
     * (`TEMAS_MAP_TOGGLE_SVG`) porque es la misma acción a otra escala.
     */
    _buildFullMapToggleHtml() {
        if (!this.showFullMap)
            return '';
        return `<div class="fullmap-wrap">
            <button type="button" class="fullmap-toggle" id="fullmap-toggle" aria-expanded="false" aria-controls="publicaciones-fullmap-section" title="${FULLMAP_OPEN_LABEL}" aria-label="${FULLMAP_OPEN_LABEL}">${TEMAS_MAP_TOGGLE_SVG}</button>
          </div>`;
    }
    /**
     * La vista del mapa general, hermana de `section.publicaciones-timeline-section` y no adentro del
     * timeline: `.timeline-container` lleva `max-height: 0` mientras está colapsado, así que un mapa
     * ahí no tendría alto en el modo normal. El canvas arranca vacío y sin mapa —`ol` no se importa
     * hasta el primer click— y `#fullmap-status` es donde se avisa que está cargando o que no hay nada
     * que mostrar.
     */
    _buildFullMapViewHtml() {
        if (!this.showFullMap)
            return '';
        return `<section class="publicaciones-fullmap-section" id="publicaciones-fullmap-section" hidden>
          <div class="fullmap-status" id="fullmap-status" hidden></div>
          <div class="fullmap-canvas" id="fullmap-canvas"></div>
          <div class="fullmap-detail" id="fullmap-detail" hidden></div>
        </section>`;
    }
    /** Build the main DOM layout and cache element references */
    _buildLayout() {
        const internalButtonsHtml = this._buildInternalButtonsHtml();
        const filterMenuHtml = this._buildFilterMenuHtml();
        const sortMenuHtml = this._buildSortMenuHtml();
        const fullMapHtml = this._buildFullMapToggleHtml();
        const fullMapViewHtml = this._buildFullMapViewHtml();
        this.container.innerHTML = `
      <section class="publicaciones-timeline-section" id="publicaciones-timeline-section">
        <div class="featured-row">
          <div class="toolbar-menu-top">
            <button class="expand-toggle" id="expand-toggle" aria-expanded="false" aria-controls="timeline-container">
              <span class="expand-text"><span id="remaining-count"></span> <span id="remaining-text">${this._relatedLabel(0)}</span></span>
              <span class="expand-icon" id="expand-icon"></span>
            </button>
            <div class="search-wrap" id="search-wrap">
              <span class="search-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input class="search-input" id="search-input" type="search" placeholder="Buscar..." autocomplete="off" aria-label="Buscar" />
            </div>
            ${filterMenuHtml}
            ${sortMenuHtml}
            ${internalButtonsHtml}
            ${fullMapHtml}
          </div>
          <div class="featured-cards" id="featured-cards" title="Expandir publicaciones"></div>
        </div>
        <div class="timeline-container" id="timeline-container">
          <div class="timeline-collapse-wrap">
            <div class="timeline-line"></div>
            <div class="taxonomy-row" id="taxonomy-row" hidden>
              <div class="taxonomy-row-spacer"></div>
              <div class="taxonomy-select-wrap" id="taxonomy-select-wrap">
                <span class="taxonomy-select-label" id="taxonomy-select-label" aria-hidden="true"></span>
                <span class="taxonomy-select-count" id="taxonomy-select-count" aria-hidden="true"></span>
                <select class="taxonomy-select" id="taxonomy-select" aria-label="Taxonomía"></select>
              </div>
            </div>
            <div class="timeline-content">
              <div class="timeline-cards-col">
                <div class="timeline-cards" id="timeline-cards"></div>
                ${this.fullpage ? '' : '<div class="timeline-resize-handle" id="timeline-resize-handle" role="slider" tabindex="0" aria-orientation="vertical" title="Ajustar la altura de la lista."></div>'}
              </div>
            </div>
          </div>
<div class="ai-disclaimer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 2.7a.9.9 0 0 1 1.7 0l1.4 4.2a.9.9 0 0 0 .6.6l4.2 1.4a.9.9 0 0 1 0 1.7l-4.2 1.4a.9.9 0 0 0-.6.6l-1.4 4.2a.9.9 0 0 1-1.7 0l-1.4-4.2a.9.9 0 0 0-.6-.6l-4.2-1.4a.9.9 0 0 1 0-1.7l4.2-1.4a.9.9 0 0 0 .6-.6l1.4-4.2a.9.9 0 0 1 0-1.7z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>
            <span>El contenido fue procesado con IA y puede contener imprecisiones</span>
          </div>
        </div>
      </section>
      ${fullMapViewHtml}
    `;
        this.section = this.container.querySelector('#publicaciones-timeline-section');
        this.featuredContainer = this.container.querySelector('#featured-cards');
        this.featuredRow = this.container.querySelector('.featured-row');
        this.timelineContainer = this.container.querySelector('#timeline-container');
        this.timelineCards = this.container.querySelector('#timeline-cards');
        this.expandToggle = this.container.querySelector('#expand-toggle');
        this.remainingCount = this.container.querySelector('#remaining-count');
        this.expandIcon = this.container.querySelector('#expand-icon');
        this.sortToggle = this.container.querySelector('#sort-toggle');
        this.sortMenu = this.container.querySelector('#sort-menu');
        this.workNotesToggle = this.container.querySelector('#work-notes-toggle');
        this.filterToggle = this.container.querySelector('#filter-toggle');
        this.filterMenu = this.container.querySelector('#filter-menu');
        this.filtrosInternosWrap = this.container.querySelector('#filtros-internos-wrap');
        this.filtrosInternosToggle = this.container.querySelector('#filtros-internos-toggle');
        this.filtrosInternosMenu = this.container.querySelector('#filtros-internos-menu');
        this.searchWrap = this.container.querySelector('#search-wrap');
        this.searchInput = this.container.querySelector('#search-input');
        this.taxonomyRow = this.container.querySelector('#taxonomy-row');
        this.taxonomySelectWrap = this.container.querySelector('#taxonomy-select-wrap');
        this.taxonomySelectLabel = this.container.querySelector('#taxonomy-select-label');
        this.taxonomySelectCount = this.container.querySelector('#taxonomy-select-count');
        this.taxonomySelect = this.container.querySelector('#taxonomy-select');
        this.fullMapToggle = this.container.querySelector('#fullmap-toggle');
        this.fullMapView = this.container.querySelector('#publicaciones-fullmap-section');
        this.fullMapCanvas = this.container.querySelector('#fullmap-canvas');
        this.fullMapStatus = this.container.querySelector('#fullmap-status');
        this.fullMapDetail = this.container.querySelector('#fullmap-detail');
        // La clase le dice al SCSS que reescriba el layout (barra sticky, sin límite de altura,
        // sin ícono). El botón de expandir queda como contador: sin colapso posible, así que se
        // marca deshabilitado en vez de bindear un click que no hace nada.
        if (this.fullpage) {
            this.section.classList.add('fullpage');
            this.expandToggle.setAttribute('aria-disabled', 'true');
        }
        this._buildTaxonomySelect();
        this._attachFilterOptions();
    }
    /**
     * Point every group of the `filters` option at the box `_buildLayout` rendered for it.
     * The lookup goes through the `data-filter-field` attribute rather than the id, so a `field`
     * that is not a valid CSS selector identifier still finds its box.
     *
     * The two controls are found the same way and land in different fields: a `'checkboxes'` group
     * in `f.options` (the box it fills with checkboxes), a `'select'` one in `f.select` (the DOM of
     * its control, cached once because every later step of it reads those refs).
     *
     * A group with no box is one whose container was not rendered: a `'filtros_internos'` group
     * without `internalButtons`, for instance. It keeps its configuration (so a later
     * `_buildFilterCheckboxes` just skips it) but has nowhere to draw, exactly as when the flyout did
     * not exist before.
     */
    _attachFilterOptions() {
        const slots = new Map();
        this.container.querySelectorAll('.filter-options[data-filter-field]').forEach((el) => {
            const field = el.dataset.filterField;
            if (field)
                slots.set(field, el);
        });
        this.container.querySelectorAll('.filter-select[data-filter-field]').forEach((el) => {
            const field = el.dataset.filterField;
            if (field)
                slots.set(field, el);
        });
        this.filters.forEach((f) => {
            const slot = slots.get(f.field);
            if (f.type === 'select')
                f.select = slot ? this._initFilterSelect(slot) : null;
            else
                f.options = slot;
        });
    }
    /**
     * Collect the refs of the control of a `'select'` group out of its markup, right after the
     * layout is built. They live on `f.select` instead of being looked up again on every keystroke
     * or click, because the box is never rebuilt: only its list is.
     */
    _initFilterSelect(root) {
        const panel = root.querySelector('.filter-select-panel');
        return {
            root,
            trigger: root.querySelector('.filter-select-trigger'),
            value: root.querySelector('.filter-select-value'),
            panel,
            options: new Map(),
            list: root.querySelector('.filter-select-list'),
            search: root.querySelector('.filter-select-search'),
            clear: root.querySelector('.filter-select-clear'),
            footerCount: root.querySelector('.filter-select-count'),
            empty: root.querySelector('.filter-select-empty'),
            values: [],
            counts: {},
            haystacks: [],
            matches: [],
            shown: 0,
            labels: new Map(),
            built: false,
            bound: false,
            query: '',
            cursor: ''
        };
    }
    /**
     * Populate the taxonomy selector with the labels of the `content` groups.
     * Nothing is rendered when there are no groups (legacy `items` option) or in API mode,
     * so the layout stays exactly as it was. With a single group the select is shown
     * but disabled, still displaying that group label. With two or more groups a trailing
     * "Ver todo" option is added, which scopes the timeline to the whole pool.
     */
    _buildTaxonomySelect() {
        const groups = this.content;
        const row = this.taxonomyRow;
        const select = this.taxonomySelect;
        if (!row || !select)
            return;
        if (groups.length === 0 || this.api) {
            row.remove();
            this.taxonomySelectWrap = null;
            this.taxonomySelectLabel = null;
            this.taxonomySelectCount = null;
            this.taxonomySelect = null;
            return;
        }
        select.innerHTML = '';
        groups.forEach((g) => {
            const opt = document.createElement('option');
            opt.value = g.label;
            opt.textContent = `${g.label} (${g.items.length})`;
            select.appendChild(opt);
        });
        if (groups.length > 1) {
            const all = document.createElement('option');
            all.value = ALL_TAXONOMIES_LABEL;
            all.textContent = `${ALL_TAXONOMIES_LABEL} (${this._allItems().length})`;
            select.appendChild(all);
        }
        // `_contentIndex` may have arrived from the URL (`stateInUrl`) before this ran, and it is its
        // owner from the constructor, so here it is only trimmed against what ended up in the select: a
        // "Ver todo" of a link to a deployment that had a single group falls back to the first one, and
        // so does any index that no longer exists.
        const hasAll = groups.length > 1;
        let index = this._contentIndex;
        if (index === ALL_TAXONOMIES_INDEX)
            index = hasAll ? ALL_TAXONOMIES_INDEX : 0;
        else if (index >= groups.length)
            index = 0;
        this._contentIndex = index;
        // "Ver todo" is not a group of `content`, so in the select it is the last option, not the `-1`
        // that `_contentIndex` uses for it.
        select.selectedIndex = index === ALL_TAXONOMIES_INDEX ? groups.length : index;
        select.disabled = groups.length === 1;
        row.hidden = false;
        this.section.classList.add('has-taxonomy');
        this._syncTaxonomyLabel();
    }
    /**
     * Sync the two visible spans of the custom select with the selected taxonomy.
     * The `<option>` text carries `label (N)` for screen readers and the native popup,
     * while the pill is split in two: the label crops with an ellipsis and the count
     * never shrinks (it wears the same pill style as `#remaining-count`), so a long
     * taxonomy still shows how many articles it holds.
     */
    _syncTaxonomyLabel() {
        const label = this._currentLabel();
        const count = this._scopeCount();
        if (this.taxonomySelectLabel)
            this.taxonomySelectLabel.textContent = label;
        if (this.taxonomySelectCount)
            this.taxonomySelectCount.textContent = String(count);
        if (!this.taxonomySelect)
            return;
        this.taxonomySelect.title = `${label} (${count})`;
        this.taxonomySelect.setAttribute('aria-label', label || 'Taxonomía');
    }
    /** Plain label of the selected taxonomy ("Ver todo" when the whole pool is selected) */
    _currentLabel() {
        if (this.content.length === 0)
            return ALL_TAXONOMIES_LABEL;
        return this._contentIndex === ALL_TAXONOMIES_INDEX
            ? ALL_TAXONOMIES_LABEL
            : this.content[this._contentIndex]?.label || '';
    }
    /** Re-scope the timeline, the filters and the counter to the taxonomy picked in the select */
    _onTaxonomyChange() {
        if (!this.taxonomySelect)
            return;
        const i = this.taxonomySelect.selectedIndex;
        this._contentIndex = i >= this.content.length ? ALL_TAXONOMIES_INDEX : i;
        this._syncTaxonomyLabel();
        this._buildFilterCheckboxes();
        this._applyFilters();
    }
    /** Format a date string (YYYY-MM-DD) to a locale display string */
    _formatDate(dateStr) {
        if (!dateStr)
            return 'Sin fecha';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    /** Format a full datetime string to a locale display string */
    _formatDateTime(dateStr) {
        if (!dateStr)
            return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    /** Parse a URL and return embed info based on the supported social platforms */
    _parseLinkWeb(url) {
        if (!url)
            return null;
        let m = url.match(YOUTUBE_REGEX);
        if (m)
            return { url: `${YOUTUBE_EMBED_URL}${m[1]}`, type: 'youtube' };
        m = url.match(INSTAGRAM_REGEX);
        if (m)
            return {
                url: `${INSTAGRAM_EMBED_BASE}${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/`,
                type: 'instagram'
            };
        m = url.match(TWITTER_REGEX);
        if (m)
            return { url: `${TWITTER_EMBED_BASE}${m[1]}/status/${m[2]}`, type: 'twitter' };
        m = url.match(FACEBOOK_POST_REGEX);
        if (m)
            return { url: `${FACEBOOK_EMBED_BASE}${m[1]}/posts/${m[2]}`, type: 'facebook' };
        m = url.match(FACEBOOK_OTHER_REGEX);
        if (m)
            return { url: url, type: 'facebook' };
        // Al final, no al principio: una plataforma reconocida gana siempre. El falso positivo de un
        // social con `.mp4` en el query ya lo descarta `_getFileExt` (que corta en el `?`), pero el
        // orden deja la regla semántica: el archivo directo es el fallback, no el detector.
        if (this._isDirectVideoUrl(url))
            return { url: url, type: 'video' };
        return null;
    }
    /**
     * True when the link points to a video file the browser can play itself, instead of to a platform
     * page. Reuses `_getFileExt`, so a CDN query string (`…/clip.mp4?token=…`) does not break it.
     */
    _isDirectVideoUrl(url) {
        return VIDEO_FILE_EXTS.includes(this._getFileExt(url));
    }
    /** Build the embed markup for a parsed link */
    _buildEmbed(embedUrl) {
        if (embedUrl.type === 'instagram') {
            return `<div class="card-iframe-wrap card-iframe-${embedUrl.type}" data-embed-url="${embedUrl.url}"><div class="card-iframe-shimmer"></div></div>`;
        }
        if (embedUrl.type === 'facebook') {
            return `<div class="card-iframe-wrap card-iframe-${embedUrl.type}"><div class="card-iframe-shimmer"></div><div class="fb-post" data-href="${embedUrl.url}" data-show-text="true" data-width="auto"></div></div>`;
        }
        if (embedUrl.type === 'twitter') {
            return `<div class="card-iframe-wrap card-iframe-${embedUrl.type}"><div class="card-iframe-shimmer"></div><blockquote class="twitter-tweet" data-dnt="true"><a href="${embedUrl.url}"></a></blockquote></div>`;
        }
        if (embedUrl.type === 'video') {
            // `loading="lazy"` es el que hace el trabajo: el bloque vive en un `display: none` mientras
            // la tarjeta está colapsada, y un elemento sin caja nunca intersecta, así que el browser
            // difiere el pedido hasta que la tarjeta se abre — no hace falta diferir el `src` a mano.
            // `preload="metadata"` trae solo los bytes necesarios para conocer duración y dimensiones
            // (que es lo que `_processCardEmbeds` usa para el ratio real), nunca el archivo. Sin
            // `autoplay` y sin `crossorigin`: este último cortaría la reproducción en los CDN que no
            // mandan headers CORS. El `url` sí se escapa, a diferencia de las ramas de arriba.
            return `<div class="card-iframe-wrap card-iframe-video"><video class="card-video" src="${this._escapeHtml(embedUrl.url)}" controls playsinline preload="metadata" loading="lazy"></video></div>`;
        }
        return `<div class="card-iframe-wrap card-iframe-${embedUrl.type}"><div class="card-iframe-shimmer"></div><iframe src="${embedUrl.url}" frameborder="0" allowfullscreen loading="lazy" title="Contenido embebido"></iframe></div>`;
    }
    /** Open a lightGallery modal with the provided images */
    _openLightGallery(images, title, showFileName, startIndex = 0) {
        if (!images || !images.length)
            return;
        if (this._lgInstance) {
            this._lgInstance.destroy();
            this._lgInstance = null;
        }
        if (!this._lgContainer) {
            this._lgContainer = document.createElement('div');
        }
        this._lgInstance = lightGallery(this._lgContainer, {
            addClass: 'timeline-gallery',
            dynamic: true,
            dynamicEl: images.map((imgInfo) => ({
                src: this._encodeFileName(imgInfo.full),
                thumb: this._encodeFileName(imgInfo.thumb),
                subHtml: title
                    ? `<div class="lg-caption">${showFileName ? `<p>${imgInfo.full.split('/').pop()}</p>` : ''}<h4>${title}</h4></div>`
                    : ''
            })),
            plugins: [lgZoom, lgThumbnail, LgWheelZoom],
            showZoomInOutIcons: true,
            actualSize: false
        });
        this._lgContainer.addEventListener('lgAfterClose', () => {
            if (this._lgInstance) {
                this._lgInstance.destroy();
                this._lgInstance = null;
            }
        }, { once: true });
        this._lgInstance.openGallery(startIndex);
    }
    /** HTML del icono de fuente oficial (edificio) sobre el círculo de acento */
    _oficialIconSvg() {
        return `<svg class="card-oficial" width="16" height="16" viewBox="0 0 199.34 223.41" fill="currentColor"><path d="M326.17,272.12c1.65-23.24,24.28-61.59,72-65.81,2.05-.1,3.55-.1,8.91-.1,45.23,4,68.94,39.6,72,65.91Z" transform="translate(-302.78 -206.21)"/><path d="M494,300.26H310.92V279.78H494Z" transform="translate(-302.78 -206.21)"/><path d="M302.78,429.62V412.78H502.11v16.84Z" transform="translate(-302.78 -206.21)"/><path d="M337.89,401.27H318.84V306h19.05Z" transform="translate(-302.78 -206.21)"/><path d="M412.12,401.32H392.89V306h19.23Z" transform="translate(-302.78 -206.21)"/><path d="M467.14,306h19.12v95.2H467.14Z" transform="translate(-302.78 -206.21)"/><path d="M356,401.21V305.73c5.89,0,11.6-.07,17.31.09.7,0,1.5,1.17,2,1.95.29.44.08,1.22.08,1.84q0,44,0,88c0,1.11-.11,2.21-.18,3.6Z" transform="translate(-302.78 -206.21)"/><path d="M449.05,401.36H429.87c-.08-1.36-.21-2.67-.21-4,0-29.22,0-58.43-.07-87.65,0-3,.68-4.24,3.9-4.1,5.08.24,10.18.07,15.56.07Z" transform="translate(-302.78 -206.21)"/></svg>`;
    }
    /** Extraer la extensión en minúsculas de una URL, o '' si no tiene */
    _getFileExt(url) {
        const clean = url.split('?')[0].split('#')[0];
        return clean.includes('.') ? clean.substring(clean.lastIndexOf('.') + 1).toLowerCase() : '';
    }
    /**
     * Escapar los caracteres especiales de HTML de un texto plano para poder
     * interpolarlo en markup o en un atributo. Los valores que provienen de la
     * config del consumidor se escapan siempre; para contenido con markup hay que
     * pasar un `HTMLElement`, que se inserta como nodo del DOM.
     */
    _escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    /** Codificar con encodeURIComponent el nombre de archivo de una URL, preservando el resto */
    _encodeFileName(url) {
        const qIdx = url.indexOf('?');
        const base = qIdx === -1 ? url : url.substring(0, qIdx);
        const tail = qIdx === -1 ? '' : url.substring(qIdx);
        const idx = base.lastIndexOf('/');
        if (idx === -1)
            return encodeURIComponent(base) + tail;
        return base.substring(0, idx + 1) + encodeURIComponent(base.substring(idx + 1)) + tail;
    }
    /** SVG del icono de archivo según su extensión (pdf vs genérico) */
    _fileIconSvg(ext) {
        const generic = '<svg class="card-inline-adjunto-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        if (ext === 'pdf') {
            return '<svg class="card-inline-adjunto-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="12" y="16.5" text-anchor="middle" font-size="6" font-weight="700" fill="currentColor">PDF</text></svg>';
        }
        return generic;
    }
    /** SVG del icono de enlace externo (el mismo que usa el botón "Visitar") */
    _externalLinkIconSvg() {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
    }
    /**
     * Resolver una URL del ítem contra la location actual. `link_view_entry` viene
     * del pipeline de scraping y puede venir relativa (`/articulos/FUE-00001`), así
     * que hay que absolutizarla para compartir. Si el valor no es una URL válida,
     * `new URL` lanza y se devuelve el valor crudo para no romper el render de la tarjeta.
     */
    _absoluteUrl(url) {
        try {
            return new URL(url, window.location.href).href;
        }
        catch {
            return url;
        }
    }
    /** SVG del icono de compartir (nodos) */
    _shareIconSvg() {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    }
    /** SVG del ícono de confirmación (visto al copiar al portapapeles) */
    _checkIconSvg() {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    }
    /**
     * Compartir la URL de la vista individual: usa la Web Share API cuando está
     * disponible y, si no, copia el enlace al portapapeles. `navigator.share()`
     * se invoca de forma síncrona dentro del click porque el navegador exige
     * activación del usuario para abrir el share sheet.
     */
    async _shareItem(url, title, btn) {
        if (navigator.share && (!navigator.canShare || navigator.canShare({ title, url }))) {
            try {
                await navigator.share({ title, url });
                return;
            }
            catch (err) {
                if (err instanceof Error && err.name === 'AbortError')
                    return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
        }
        catch {
            this._copyToClipboard(url);
        }
        this._flashCopied(btn);
    }
    /** Copiar al portapapeles sin la Clipboard API (contexto no seguro o sin permiso) */
    _copyToClipboard(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
    /** Mostrar el ícono de confirmación en el botón de compartir por 1.5s */
    _flashCopied(btn) {
        btn.innerHTML = this._checkIconSvg();
        this._showShareToast(btn);
        if (this._shareTimer)
            window.clearTimeout(this._shareTimer);
        this._shareTimer = window.setTimeout(() => {
            btn.innerHTML = this._shareIconSvg();
            this._shareTimer = 0;
        }, 1500);
    }
    /** Cartelito "Copiado al portapapeles!" debajo de los botones de la tarjeta */
    _showShareToast(btn) {
        const cardEl = btn.closest('.timeline-card');
        if (!cardEl)
            return;
        cardEl.querySelector('.card-share-toast')?.remove();
        const toast = document.createElement('div');
        toast.className = 'card-share-toast';
        toast.setAttribute('role', 'status');
        toast.textContent = 'Copiado al portapapeles!';
        cardEl.appendChild(toast);
        window.setTimeout(() => toast.remove(), 1500);
    }
    /** Render the featured (overlapping) cards row */
    _renderFeatured(cards) {
        // En fullpage el stack nunca se ve (`expanded` lo colapsa a height: 0), así que no se
        // construye. Es el único punto de corte: deja el contenedor vacío y todo lo demás que
        // lo consulta —los rAF que agregan `.visible`, la limpieza de skeletons, el click— es un
        // no-op natural sobre un `querySelectorAll` sin resultados.
        if (this.fullpage)
            return;
        this.featuredContainer.innerHTML = '';
        cards.forEach((card, i) => {
            const el = document.createElement('div');
            el.className = 'featured-card';
            const imgHtml = card.thumbnail
                ? `<div class="card-image-wrap"><img class="card-image" src="${card.thumbnail}" alt="${card.nombre_fuente}" loading="lazy"></div>`
                : '';
            el.innerHTML = `
        ${imgHtml}
        <div class="card-body">
          <div class="card-date">${this._formatDate(card.fecha_publicacion)}</div>
          <div class="card-title">${card.nombre_fuente}</div>
        </div>
      `;
            const featuredImg = el.querySelector('.card-image');
            if (featuredImg) {
                featuredImg.addEventListener('load', () => featuredImg.classList.add('loaded'));
                if (featuredImg.complete)
                    featuredImg.classList.add('loaded');
            }
            this.featuredContainer.appendChild(el);
        });
    }
    /** Create a single timeline card element with all its event listeners */
    _createTimelineItem(card, index) {
        const el = document.createElement('div');
        el.className = 'timeline-item';
        if (card.capturado !== true) {
            el.innerHTML = `
      <div class="timeline-date-col no-date">
        <div class="timeline-date" title="Fecha de publicación">${card.fecha_publicacion ? this._formatDate(card.fecha_publicacion) : ''}</div>
        <div class="timeline-dot"></div>
        <div class="timeline-hline"></div>
      </div>
      <div class="timeline-card no-image not-captured${card.descartado === true ? ' descartada' : ''}${card.validado !== true ? ' sin-validar' : ''}">
        <div class="card-status-badges">
          <span class="card-no-validado">Sin capturar</span>
          ${card.validado !== true ? '<span class="card-no-validado">Sin validar</span>' : ''}
          ${card.descartado === true ? '<span class="card-descartado">Descartado</span>' : ''}
        </div>
        <div class="card-body card-body-not-captured">
          <span class="card-not-captured-id"><span class="card-not-captured-strong">ID</span>${card.id}</span>
          ${card.link_web
                ? `<a class="card-not-captured-link" href="${card.link_web}" target="_blank" rel="noopener">${card.link_web}</a>`
                : '<span class="card-not-captured-link">Sin enlace</span>'}
          <div class="card-actions">
            <div class="card-actions-row">
              ${card.link_web
                ? `<a class="card-actions-btn card-open" href="${card.link_web}" target="_blank" rel="noopener">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Visitar
              </a>`
                : ''}
              ${this.internalButtons && card.link_edit_entry
                ? `<a class="card-actions-btn card-edit" href="${card.link_edit_entry}" target="_blank" rel="noopener">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                Editar
              </a>`
                : ''}
            </div>
          </div>
        </div>
      </div>
    `;
            return el;
        }
        const imgHtml = card.thumbnail
            ? `<div class="card-image-wrap"><img class="card-image" src="${card.thumbnail}" alt="${card.nombre_fuente}" loading="lazy"><div class="card-title">${card.nombre_fuente}${card.es_oficial ? `<span class="card-img-oficial card-oficial-wrap" title="Es fuente oficial">${this._oficialIconSvg()}</span>` : ''}</div></div>`
            : '';
        const summary = card;
        const hasDetail = this._hasDetail(card);
        const shareBtnHtml = card.link_view_entry
            ? `<button class="card-share-btn" data-share-url="${this._absoluteUrl(card.link_view_entry)}" title="Compartir" aria-label="Compartir">${this._shareIconSvg()}</button>`
            : '';
        el.innerHTML = `
      <div class="timeline-date-col${card.fecha_publicacion ? '' : ' no-date'}">
        <div class="timeline-date" title="Fecha de publicación">${this._formatDate(card.fecha_publicacion)}</div>
        <div class="timeline-dot"></div>
        <div class="timeline-hline"></div>
      </div>
      <div class="timeline-card${card.thumbnail ? '' : ' no-image'}${card.descartado === true ? ' descartada' : ''}${card.validado !== true ? ' sin-validar' : ''}">
        <div class="card-status-badges">
          ${card.validado !== true ? '<span class="card-no-validado">Sin validar</span>' : ''}
          ${card.descartado === true ? '<span class="card-descartado">Descartado</span>' : ''}
        </div>
        ${imgHtml}
        <div class="card-actions"></div>
        <div class="card-body">
          ${card.thumbnail
            ? ''
            : `<div class="card-title">${card.nombre_fuente}${card.es_oficial ? `<span class="card-img-oficial card-oficial-wrap" title="Es fuente oficial">${this._oficialIconSvg()}</span>` : ''}</div>`}
          <div class="card-fecha-pub" title="Fecha de publicación">${this._formatDate(card.fecha_publicacion)}</div>
          ${card.notas_de_trabajo ? `<div class="card-notas-trabajo">${card.notas_de_trabajo}</div>` : ''}
          <div class="card-desc-slot">${summary.resumen_ia ? `<div class="card-desc">${summary.resumen_ia}</div>` : ''}</div>
          ${card.tonos_sociales && card.tonos_sociales.length ? `<div class="card-tone-wrap">${card.tonos_sociales.map((t) => `<span class="card-tone tone-${t.toLowerCase()}">${TONE_LABEL[t] || t}</span>`).join('')}</div>` : ''}
          <div class="card-temas-slot"></div>
          <div class="card-hint"><span class="card-hint-arrow"></span></div>
          <button class="card-collapse" title="Colapsar"></button>
          <button class="card-info-btn" title="Información">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          ${shareBtnHtml}
          <div class="card-info-menu"></div>
          <div class="card-protag-fuente-slot"></div>
          <div class="card-media-slot"></div>
          <div class="card-embed-slot"></div>
          <div class="card-videos-slot"></div>
          <div class="card-taxonomies-slot"></div>
        </div>
      </div>
    `;
        const timelineImg = el.querySelector('.card-image');
        if (timelineImg) {
            timelineImg.addEventListener('load', () => timelineImg.classList.add('loaded'));
            if (timelineImg.complete)
                timelineImg.classList.add('loaded');
        }
        const cardEl = el.querySelector('.timeline-card');
        cardEl.addEventListener('click', (e) => {
            if (e.target &&
                e.target.closest('.card-open, .card-collapse, .card-info-btn, .card-info-menu, .card-share-btn, .card-adjuntos, .card-inline-images, .card-inline-adjuntos, .card-edit'))
                return;
            cardEl.classList.add('expanded');
            void this._ensureCardDetail(cardEl).then(() => {
                this._processCardEmbeds(cardEl);
            });
        });
        cardEl.querySelector('.card-collapse').addEventListener('click', (e) => {
            e.stopPropagation();
            cardEl.classList.remove('expanded');
            // Colapsar es solo quitar la clase, sin teardown, así que un `<video>` sigue sonando con la
            // tarjeta cerrada. Los iframes tienen el mismo problema y quedan fuera de alcance.
            cardEl.querySelectorAll('video').forEach((video) => video.pause());
        });
        cardEl.querySelector('.card-info-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            cardEl.querySelector('.card-info-menu').classList.toggle('open');
            const adjuntosMenu = cardEl.querySelector('.card-adjuntos-menu');
            if (adjuntosMenu)
                adjuntosMenu.classList.remove('open');
        });
        const shareBtn = el.querySelector('.card-share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                void this._shareItem(shareBtn.dataset.shareUrl || '', card.nombre_fuente, shareBtn);
            });
        }
        cardEl.dataset.cardId = String(card.id);
        if (hasDetail) {
            this._injectCardDetail(cardEl, card);
        }
        return el;
    }
    /** True if the card already carries its full detail payload (local mode) */
    _hasDetail(card) {
        return 'tipo_fuente' in card;
    }
    /** Build the "Actores principales" HTML block */
    _buildProtagonistaHtml(card) {
        const actors = card.actores_principales || [];
        const hasMore = actors.length > CARD_CLICKABLE_MAX;
        return actors.length
            ? `<div class="card-protagonista${hasMore ? ' has-more' : ''}" data-full="${this._escapeHtml(actors.join(', '))}">
          <span class="protagonista-label">Actores principales:</span>
          <span class="protagonista-list">${this._buildActorsHtml(actors, false)}</span>
         </div>`
            : `<div class="card-protagonista"><span class="protagonista-label">Actores principales:</span> -</div>`;
    }
    /**
     * The actor list of the block, for the collapsed and the expanded state of `has-more`.
     *
     * With a `cardClickable` group on the field the names are `<button>`s that filter on click (see
     * `_applyCardFilter`), and the token is the value of the group — the very same one the panel
     * filters by, so both stay in sync without the card knowing anything about filters. Without it
     * this is plain text, exactly what the block has always been (only escaped now: the actors come
     * from the scraping pipeline, and they were being interpolated raw).
     */
    _buildActorsHtml(actors, showAll) {
        const group = this._cardFilterGroup(CARD_CLICKABLE_FIELD);
        const list = showAll ? actors : actors.slice(0, CARD_CLICKABLE_MAX);
        const sep = '<span class="protagonista-sep">, </span>';
        const parts = list.map((actor) => {
            const text = this._escapeHtml(actor);
            if (!group)
                return text;
            const token = this._filterToken(actor);
            const label = this._filterOptionLabel(group, token);
            const active = group.active.size === 1 && group.active.has(token);
            return (`<button type="button" class="protagonista-actor${active ? ' active' : ''}"` +
                ` data-value="${this._escapeHtml(token)}" title="Filtrar por ${this._escapeHtml(label)}">${text}</button>`);
        });
        const more = actors.length > CARD_CLICKABLE_MAX && !showAll ? '...' : '';
        return parts.join(sep) + more;
    }
    /**
     * Bind the filtering chips of an actor list (the block itself, or a list a `has-more` toggle
     * just rebuilt: the nodes it throws away were bound too, and the new ones are not).
     */
    _bindActorChips(root) {
        root.querySelectorAll('.protagonista-actor').forEach((chip) => {
            chip.addEventListener('click', (e) => {
                // Sin este corte el click sube a `.timeline-card`, que expande o colapsa la tarjeta: el
                // filtro tendría que pelear con el gesto de abrir el detalle.
                e.stopPropagation();
                this._applyCardFilter(CARD_CLICKABLE_FIELD, chip.dataset.value ?? '');
            });
        });
    }
    /**
     * Bind what the "Actores principales" block has beyond its markup: the chips that filter, and
     * the `has-more` toggle, which swaps the first actors for all of them (re-rendering the list,
     * chips included, instead of writing the raw text like it used to).
     */
    _bindProtagonista(root, card) {
        this._bindActorChips(root);
        const prot = root.querySelector('.card-protagonista.has-more');
        if (!prot)
            return;
        prot.addEventListener('click', (e) => {
            e.stopPropagation();
            prot.classList.toggle('expanded');
            const list = prot.querySelector('.protagonista-list');
            const expanded = prot.classList.contains('expanded');
            list.innerHTML = this._buildActorsHtml(card.actores_principales || [], expanded);
            this._bindActorChips(list);
        });
    }
    /** Build the "Fuente" HTML block */
    _buildFuenteHtml(card) {
        return `<div class="card-fuente"><span class="fuente-label">Fuente:</span> ${card.fuente_institucional ?? '-'}${card.es_oficial ? `<span class="card-oficial-wrap" title="Es fuente oficial">${this._oficialIconSvg()}</span>` : ''}</div>`;
    }
    /**
     * Build the "Temas destacados" HTML block.
     *
     * The map toggle rides on the block's own header row, next to the subtitle, and the map itself
     * opens **between the header and the topics** — not after the list. Reading the block is
     * "here is where these topics are, and here they are on a map", so the two sit together at the
     * top; a map below a list of ten paragraphs is a scroll away from the title that opened it.
     */
    _buildTemasHtml(card, located) {
        if (!card.temas || !card.temas.length)
            return '';
        const toggleHtml = this._buildTemasMapToggleHtml(located);
        const bodyHtml = this._buildTemasMapBodyHtml(located);
        // The point of a topic, by the position it has in `card.temas`. It is what puts the reference
        // badge on the right list item: the located list skips the topics without a `geom`, so position
        // in one list is not position in the other (see `TemasMapPoint.temaIndex`).
        const byTema = new Map(located.map((p) => [p.temaIndex, p]));
        return `<div class="card-temas">
        <div class="card-temas-head">
          <div class="card-subtitle">Temas destacados (${card.temas.length})</div>
          ${toggleHtml}
        </div>
        ${bodyHtml}
        <div class="card-temas-list">
        ${card.temas
            .map((t, i) => {
            const point = byTema.get(i);
            // Every topic gets a badge while the map is open, so the list stays aligned: the ones with
            // a `geom` carry the number of their circle, the ones without carry the crossed-out pin icon
            // instead of a number or a hole. The badge is hidden by CSS until the map is expanded (see
            // `.card-temas-map-body.expanded ~ .card-temas-list`), so without the map the list looks
            // exactly as it did before. With the map open the tone chip is hidden, so the tone label
            // moves into the badge `title`: the value stays reachable without it competing with the map.
            const toneLabel = TONE_LABEL[t.tono_social];
            const ref = point
                ? `<span class="tema-map-ref" title="${toneLabel} · Punto ${point.index + 1} en el mapa">${point.index + 1}</span>`
                : `<span class="tema-map-ref tema-map-ref-none" title="${toneLabel} · Sin ubicación en el mapa">${TEMAS_MAP_NO_GEOM_SVG}</span>`;
            // `data-id-subtema` es la identidad de la fila: es lo que permite scrollear y resaltar un
            // tema desde fuera de la tarjeta (el mapa general abre la ficha en el tema del punto
            // clickeado), porque es el mismo campo que trae el punto. `data-tema-index` es la posición
            // en `card.temas`, la que usa el bind de clicks de la fila para encontrar el tema. Sin una
            // identidad estable el resaltado tendría que ir por texto, y dos temas con el mismo título
            // no son una excepción en estos datos. El id viene del pipeline, así que se escapa.
            //
            // El id además sale **como texto**, al final del título: es un dato de trabajo, no de
            // lectura, así que va en rojo y solo aparece con las herramientas internas encendidas.
            // Dos cortes en dos capas: sin `internalButtons` el span **no se emite** (mismo gate
            // que el botón "Editar"), y con ellas la visibilidad la manda el toggle de notas de
            // trabajo (CSS puro, `.tema-id` dentro del bloque `&.work-notes-hidden`, igual que
            // `.tema-notas-trabajo`), porque `_toggleWorkNotes` solo cambia una clase y no
            // re-renderiza. Sin `id_subtema` (backend que no lo manda) tampoco se emite, como el
            // `data-id-subtema` vacío de más arriba.
            return `
          <div class="tema-item tone-tema-${t.tono_social.toLowerCase()}" data-tema-index="${i}" data-id-subtema="${this._escapeHtml(t.id_subtema ?? '')}">
            ${ref}
            <div class="tema-content">
              <span class="tema-title"><span class="tema-tone">${TONE_LABEL[t.tono_social]}</span><span class="tema-title">${t.titulo}</span>${this.internalButtons && t.id_subtema ? `<span class="tema-id">${this._escapeHtml(t.id_subtema)}</span>` : ''}${t.fecha_narrativa ? `<span class="tema-fecha" title="Fecha narrativa">[ ${this._formatDate(t.fecha_narrativa)} ]</span>` : ''}</span>
              <span class="tema-desc">${t.resumen}</span>
              ${t.notas_de_trabajo ? `<div class="tema-notas-trabajo">${t.notas_de_trabajo}</div>` : ''}
            </div>
          </div>`;
        })
            .join('')}
        </div>
        </div>`;
    }
    /**
     * A topic's point, or `null` when it does not carry one **or carries a bad one**.
     *
     * The validation is not paranoia about types but about the extent: every point of the card
     * goes into a single `View.fit`, so one `lat: 999` or one `NaN` coming out of the scraping
     * pipeline would drag every other point out of view, not just fail to add one. Out of range
     * is treated exactly like missing, so the topic is still listed above and only skips its marker.
     *
     * The parameter is typed as "anything with a `geom`" and not as an `ItemTema` because it is the
     * same validator for the two sources of points: a topic of a card in memory and a topic of
     * `GET {url}/points`. Both are pipeline data, so both can arrive broken.
     */
    _temaGeomOf(tema) {
        const geom = tema?.geom;
        if (!geom || typeof geom !== 'object')
            return null;
        const { lat, lon } = geom;
        if (!Number.isFinite(lat) || !Number.isFinite(lon))
            return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180)
            return null;
        return { lat, lon };
    }
    /**
     * The topics of a card that carry a usable point, **in the order they are listed**, each with
     * the number it gets on the map (1-based) and the color of its tone.
     *
     * It is the single pass both the markup and the map are built from, which is what keeps the
     * number on a marker and the number in the legend meaning the same thing: they are indexes
     * into this one list.
     */
    _temasLocated(temas) {
        const out = [];
        temas.forEach((tema, temaIndex) => {
            const geom = this._temaGeomOf(tema);
            if (!geom)
                return;
            out.push({
                index: out.length,
                temaIndex,
                idSubtema: tema.id_subtema ?? '',
                lat: geom.lat,
                lon: geom.lon,
                titulo: tema.titulo,
                color: TEMAS_MAP_TONE_COLOR[tema.tono_social] || TEMAS_MAP_TONE_FALLBACK,
                tono_social: tema.tono_social
            });
        });
        return out;
    }
    /**
     * The button that opens the topics map, for the "Temas destacados" header row.
     *
     * Returns `''` when **no topic carries a usable `geom`**, so an article with nothing to place
     * leaves no dangling control on its header — the same reason the whole block returns `''` without
     * topics.
     *
     * The face of the button is the map icon and nothing else, so the action lives in `aria-label` +
     * `title`. That is not only for screen readers: with an icon-only button there is no visible text
     * left to change between the two states, so the two attributes are the whole state for anyone who
     * cannot see the glyph swap. They carry the action and no count: the number of topics is already
     * on the subtitle next to it, and on the badge each located topic gets.
     *
     * The chevron after the icon is the same arrow as the "Cargar más" button, and it is the only
     * thing on the face of the button that *does* change between states: the component CSS rotates it
     * 180° off the same `aria-expanded` that tints the icon, so the handler has nothing extra to
     * write and nothing to keep in sync. It carries no `aria-label` of its own (`aria-hidden`), since
     * the two text attributes of the button already say what the control does.
     *
     * Pure: it builds markup and binds nothing. The map itself is created on the first open
     * (`_bindTemasMapToggle`), which is what keeps OpenLayers out of the path of a page where nobody
     * ever opened a map.
     */
    _buildTemasMapToggleHtml(located) {
        if (!located.length)
            return '';
        return `<button type="button" class="card-temas-map-toggle" aria-expanded="false" aria-label="Ver mapa" title="Ver mapa">${TEMAS_MAP_TOGGLE_SVG}${TEMAS_MAP_TOGGLE_CHEVRON_SVG}</button>`;
    }
    /**
     * The body of the topics map: a small map with one numbered circle per located topic. Sits between the header
     * row and the topic list, hidden until the toggle opens it.
     *
     * There is no legend: the numbered reference of each topic is a badge on the topic itself, in the
     * list right below (`_buildTemasHtml`). A legend repeated the list one scroll away from it and
     * left the topic without its number where a reader looks for it.
     *
     * Returns `''` with no located topic, for the same reason as the toggle: the two are the same
     * "is there a map to show" decision, and emitting one without the other would leave a body that
     * nothing opens.
     */
    _buildTemasMapBodyHtml(located) {
        if (!located.length)
            return '';
        return `<div class="card-temas-map-body" hidden>
            <div class="card-temas-map-canvas"></div>
          </div>`;
    }
    /**
     * Bind the header of a topics map section so it shows and hides its body.
     *
     * Same shape as `_bindTaxonomyToggles`: `aria-expanded` is the source of truth for the state,
     * the `expanded` class on the body is what the component CSS keys on (the UA `[hidden]` rule
     * loses to any author `display`, which is why the SCSS needs its own override), and the `hidden`
     * attribute is kept in sync anyway for the case where the stylesheet is not loaded.
     *
     * Two things differ from the taxonomy toggles, both forced by where this row lives:
     *
     * - It calls `stopPropagation()`. It sits inside `.card-body`, so the click would otherwise
     *   reach the card-wide expand listener and re-expand a card the user had just collapsed. The
     *   taxonomy toggle does not need it only because its block is rendered *inside* an already
     *   expanded card.
     * - The body is not in the markup beyond its empty shell. The first open builds the map, which
     *   is also the first time OpenLayers is imported at all.
     */
    _bindTemasMapToggle(slot, located) {
        const toggle = slot.querySelector('.card-temas-map-toggle');
        const body = slot.querySelector('.card-temas-map-body');
        const canvas = slot.querySelector('.card-temas-map-canvas');
        if (!toggle || !body || !canvas || !located.length)
            return;
        const openLabel = 'Ver mapa';
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            body.hidden = expanded;
            body.classList.toggle('expanded', !expanded);
            toggle.setAttribute('aria-expanded', String(!expanded));
            // The face of the button is made of `<svg>`s (the map icon and the chevron), so the state goes in
            // the two text attributes and **never** in `textContent`: writing it would wipe both out of the
            // button. The chevron needs nothing here: its rotation is CSS, off this same `aria-expanded`.
            const nextLabel = expanded ? openLabel : 'Ocultar mapa';
            toggle.setAttribute('aria-label', nextLabel);
            toggle.setAttribute('title', nextLabel);
            if (expanded)
                return;
            // Built here, so a map nobody opened costs nothing. The frame is what lets the browser lay
            // the body out first: the `hidden` line above just took it out of `display: none`, and
            // OpenLayers measures its target when the map is created, which the fit below needs.
            requestAnimationFrame(() => {
                void this._mountTemasMap(canvas, located);
            });
        });
    }
    /**
     * Import OpenLayers, once. The promise is cached **even when it rejects**, like
     * `_ensureApiFacets`: a consumer without `ol` installed should not pay a failed import on every
     * click of a toggle, and the failure is reported in the map's own place instead.
     */
    _loadOpenLayers() {
        if (!this._olModules) {
            this._olModules = Promise.all([
                import('ol/Map.js'),
                import('ol/View.js'),
                import('ol/Feature.js'),
                import('ol/geom/Point.js'),
                import('ol/geom/LineString.js'),
                import('ol/Overlay.js'),
                import('ol/layer/Vector.js'),
                import('ol/source/Vector.js'),
                import('ol/layer/Tile.js'),
                import('ol/source/XYZ.js'),
                import('ol/style/Style.js'),
                import('ol/style/Circle.js'),
                import('ol/style/Fill.js'),
                import('ol/style/Stroke.js'),
                import('ol/style/Text.js'),
                import('ol/control/Zoom.js'),
                import('ol/control/Attribution.js'),
                import('ol/proj.js')
            ]).then(([map, view, feature, point, lineString, overlay, vLayer, vSource, tLayer, xyz, style, circle, fill, stroke, text, zoomCtl, attrCtl, proj]) => ({
                OlMap: map.default,
                OlView: view.default,
                OlFeature: feature.default,
                OlPoint: point.default,
                OlLineString: lineString.default,
                OlOverlay: overlay.default,
                VectorLayer: vLayer.default,
                VectorSource: vSource.default,
                TileLayer: tLayer.default,
                XYZ: xyz.default,
                Style: style.default,
                Circle: circle.default,
                Fill: fill.default,
                Stroke: stroke.default,
                Text: text.default,
                Zoom: zoomCtl.default,
                Attribution: attrCtl.default,
                fromLonLat: proj.fromLonLat,
                getProjection: proj.get
            }));
        }
        return this._olModules;
    }
    /**
     * Create the map of one card inside `canvas` — a circle per located topic, numbered like the badge
     * it has in the list and colored like its tone, pushed apart when they overlap — with the view
     * fitted to those points, and keep it in `_temasMaps` so it can be disposed when the card
     * goes away. The map itself is `_mountTemasMapOn`, shared with the general one.
     *
     * A card that already has a map is left alone: the toggle can be closed and reopened as many
     * times as wanted without rebuilding it, which would redownload the tiles and throw away
     * whatever pan or zoom the user had done.
     */
    async _mountTemasMap(canvas, located) {
        if (this._temasMaps.has(canvas))
            return;
        const handle = await this._mountTemasMapOn(canvas, located, {
            markerLabel: (p) => String(p.index + 1),
            hoverHtml: (p) => this._escapeHtml(p.titulo),
            tooltipClass: 'card-temas-map-tooltip',
            errorClass: 'card-temas-map-error',
            onMarkerClick: null,
            onMarkerMiss: null,
            isSelected: null
        });
        if (!handle)
            return;
        this._temasMaps.set(canvas, handle);
    }
    /**
     * Arma el mapa de una lista de puntos dentro de `canvas` y devuelve su handle, o `null` si no se
     * pudo armar (sin `ol`, o con el canvas ya desconectado).
     *
     * Es el cuerpo que compartían el mapa de cada tarjeta y el mapa general, y lo único que cambia
     * entre los dos son las cuatro cosas de `options`: el texto del marcador, el markup del hover y
     * las dos clases del canvas. Todo lo demás —capa base, crédito, el `updateSize` antes del `fit`,
     * el `renderSync` antes de agrupar, el agrupamiento de superpuestos y su línea, el hit test del
     * hover— es el mismo código, y duplicarlo es duplicar justo lo que más caro sale mantener: el
     * orden de esas cuatro llamadas.
     *
     * `points` es genérico a propósito: de acá solo se leen `lat`, `lon` y `color`, así que el mismo
     * método monta los `TemasMapPoint` de una tarjeta y los `FullMapPoint` del mapa general sin que
     * ninguno de los dos tenga que saber del otro.
     */
    async _mountTemasMapOn(canvas, points, options) {
        let ol;
        try {
            ol = await this._loadOpenLayers();
        }
        catch {
            canvas.innerHTML = `<div class="${options.errorClass}">No se pudo cargar el mapa.</div>`;
            return null;
        }
        // El owner del mapa pudo volverlo a renderizar —una búsqueda, un filtro, un cambio de página—
        // mientras tardaba el import, lo que deja este canvas desconectado, sin mapa al cual atarse y sin
        // nadie que lo lea.
        if (!canvas.isConnected || !points.length)
            return null;
        // One circle style per tone, shared by every marker of that tone. Unlike an `Icon`, a `Circle`
        // has no image to decode, so the cache only saves object churn.
        const circles = new Map();
        const circleOf = (color) => {
            let circle = circles.get(color);
            if (!circle) {
                circle = new ol.Circle({
                    radius: TEMAS_MAP_MARKER_RADIUS,
                    fill: new ol.Fill({ color }),
                    stroke: new ol.Stroke({ color: TEMAS_MAP_MARKER_RING_COLOR, width: TEMAS_MAP_MARKER_STROKE })
                });
                circles.set(color, circle);
            }
            return circle;
        };
        // El círculo del punto abierto: más grande y con un anillo casi negro, que es lo que dice "este es
        // el que elegiste" sin tener que inventar un ícono. Va en su propia caché y no agranda el de
        // `circleOf`: los markers no elegidos no pueden verse afectados.
        const selectedCircles = new Map();
        const selectedCircleOf = (color) => {
            let circle = selectedCircles.get(color);
            if (!circle) {
                circle = new ol.Circle({
                    radius: TEMAS_MAP_MARKER_RADIUS + TEMAS_MAP_SELECTED_RADIUS_DELTA,
                    fill: new ol.Fill({ color }),
                    stroke: new ol.Stroke({ color: TEMAS_MAP_SELECTED_RING_COLOR, width: TEMAS_MAP_SELECTED_RING_WIDTH })
                });
                selectedCircles.set(color, circle);
            }
            return circle;
        };
        // El número va solo si la vista lo necesita (ver `markerLabel`): en el mapa general no hay
        // lista a la que apunte, así que el círculo se pinta pelado y el hover queda de etiqueta.
        const markerText = (p) => {
            if (!options.markerLabel)
                return null;
            return new ol.Text({
                text: options.markerLabel(p),
                font: `700 ${TEMAS_MAP_MARKER_FONT}px system-ui, sans-serif`,
                textAlign: 'center',
                textBaseline: 'middle',
                // The nudge that makes `textBaseline: 'middle'` actually centered; see the constant.
                offsetY: TEMAS_MAP_MARKER_TEXT_OFFSET_Y,
                fill: new ol.Fill({ color: TEMAS_MAP_MARKER_TEXT_COLOR })
            });
        };
        // One circle per cluster color and one text per count, shared by every cluster that needs them.
        // The style function runs on every repaint of every feature, so without the cache a pan would
        // build a fresh `Circle` per cluster per frame —same reason as the `circleOf` caches above.
        const clusterCircles = new Map();
        const clusterCircleOf = (color) => {
            let circle = clusterCircles.get(color);
            if (!circle) {
                circle = new ol.Circle({
                    radius: TEMAS_MAP_CLUSTER_RADIUS,
                    fill: new ol.Fill({ color }),
                    stroke: new ol.Stroke({ color: TEMAS_MAP_MARKER_RING_COLOR, width: TEMAS_MAP_CLUSTER_STROKE })
                });
                clusterCircles.set(color, circle);
            }
            return circle;
        };
        const clusterTexts = new Map();
        const clusterTextOf = (count) => {
            let text = clusterTexts.get(count);
            if (!text) {
                text = new ol.Text({
                    text: String(count),
                    font: `700 ${TEMAS_MAP_CLUSTER_FONT}px system-ui, sans-serif`,
                    textAlign: 'center',
                    textBaseline: 'middle',
                    // Mismo nudge que el número del marker: la constante es la misma y por la misma razón.
                    offsetY: TEMAS_MAP_MARKER_TEXT_OFFSET_Y,
                    fill: new ol.Fill({ color: TEMAS_MAP_CLUSTER_TEXT_COLOR })
                });
                clusterTexts.set(count, text);
            }
            return text;
        };
        const featureOf = (p) => {
            const feature = new ol.OlFeature({
                geometry: new ol.OlPoint(ol.fromLonLat([p.lon, p.lat]))
            });
            // The plain marker: the circle centered on the feature's own coordinate —so the number is too,
            // no `offset`, unlike the pin's head which sat well above the point it marked.
            //
            // `style` is **not** a `Feature` constructor option: passed in the options object it lands as
            // an attribute property and `getStyle()` stays null, so the renderer falls back to the default
            // style — the cyan `#3399CC` circle. `setStyle()` is the only way to give a feature its style.
            //
            // It is a **function** and not a fixed style because a marker that overlaps another one is
            // displaced by `declutter` on every `moveend`, and the displacement brings the line that ties it
            // back to the topic's own coordinate: the function reads that displacement off the feature and,
            // when there is one, paints the line and the marker at the displaced point instead of at the
            // topic's own coordinate. The geometries live in the `spider` property, not in the feature's
            // own, because one feature paints two geometries that are not the same point.
            //
            // El `declutter` también decide si el feature **no se pinta**, y por el mismo motivo: en el
            // modo clúster el líder pinta el círculo con el conteo (geometría propia, en el centroide del
            // grupo) y los demás miembros devuelven `[]`, que el renderer lee como un array de estilos
            // vacío y no dibuja nada.
            //
            // El punto va en la propiedad `point` del feature y no cerrado en la función por lo mismo: la
            // selección se resuelve en cada repintado, así que la función tiene que poder leer el estado de
            // **ahora** y no el del momento en que se creó el feature.
            const connector = new ol.Stroke({ color: TEMAS_MAP_SPIDER_LINE_COLOR, width: TEMAS_MAP_SPIDER_LINE_WIDTH });
            feature.set('point', p);
            // El estilo "pelado" se cachea por `color + seleccionado` porque se resuelve en cada repintado de
            // cada marker: sin el cache, mover el mapa crearía un `Style` por feature por frame.
            const plainStyles = new Map();
            const plainStyle = (point) => {
                const selected = Boolean(options.isSelected?.(point));
                const key = `${point.color}|${selected ? 1 : 0}`;
                const hit = plainStyles.get(key);
                if (hit)
                    return hit;
                const style = new ol.Style({
                    image: selected ? selectedCircleOf(point.color) : circleOf(point.color),
                    text: markerText(point) || undefined,
                    // El z index solo en el seleccionado. Los demás se quedan en `undefined`, que OpenLayers
                    // ordena como 0, así que el orden entre ellos sigue siendo el que dejaría el `declutter`.
                    zIndex: selected ? TEMAS_MAP_SELECTED_Z_INDEX : undefined
                });
                plainStyles.set(key, style);
                return style;
            };
            feature.setStyle((f) => {
                const point = f.get('point') || p;
                // El clúster manda sobre lo demás: su círculo se pinta en el centroide del grupo (la
                // geometría vive en la propiedad, igual que la del spider) y nunca trae línea ni número de
                // marker. Un feature no puede ser líder y miembro a la vez: `declutter` pone las dos
                // propiedades en el mismo paso y el líder no recibe `hidden`.
                const cluster = f.get('cluster');
                if (cluster) {
                    return new ol.Style({
                        geometry: cluster.marker,
                        image: clusterCircleOf(cluster.color),
                        text: clusterTextOf(cluster.count)
                    });
                }
                // Miembro absorbido por un clúster: estilo vacío, o sea nada pintado (el renderer itera el
                // array y no tiene estilos que dibujar).
                if (f.get('hidden'))
                    return [];
                const base = plainStyle(point);
                const spider = f.get('spider');
                if (!spider)
                    return base;
                // The line first, so the marker is painted over its own end of it.
                return [
                    // La línea **no** sube de z index: si subiera, cruzaría por encima de los círculos
                    // vecinos en vez de meterse debajo de ellos, que es lo que se lee bien con el punto
                    // desplazado. El z index del círculo sí es el del `base`, porque es un segundo estilo del
                    // mismo feature y sin él el punto desplazado se quedaría atrás igual que el resto.
                    new ol.Style({ geometry: spider.line, stroke: connector }),
                    new ol.Style({
                        geometry: spider.marker,
                        image: base.getImage() || undefined,
                        text: base.getText() || undefined,
                        zIndex: base.getZIndex()
                    })
                ];
            });
            return feature;
        };
        // Todo lo que depende del set de puntos es **mutable**, porque el mapa general lo cambia en vivo al
        // cambiar un filtro (ver `updatePoints`). Lo que había antes era reconstruir el mapa entero, y eso
        // tiraba abajo dos cosas que el usuario no pidió que se movieran: la capa de tiles, que volvía a
        // pedir los PNG (el flash del fondo vacío) y el `View.fit`, que se llevaba la vista que el
        // usuario había dejado puesta. Ahora solo se reemplazan los features de la capa vectorial.
        let current = points;
        let features = current.map(featureOf);
        const source = new ol.VectorSource({ features, wrapX: false });
        const layers = [];
        // The credit belongs to the base layer, so it only exists when there is one: with no tiles there
        // is nothing to attribute. That is why the flag checks the tiles and not just the credit —and it
        // is what the map already did before the credit became an option, the attribution control having
        // nothing to render without a source that declares `attributions`. Both knobs are read at mount
        // time, like every other option of the map.
        const showAttribution = Boolean(this.temasMapTiles && this.temasMapAttribution);
        if (this.temasMapTiles) {
            layers.push(new ol.TileLayer({
                // `attributions` is omitted rather than passed empty: it is what the attribution control
                // reads, and an empty value would leave it rendering an empty box over the map.
                source: new ol.XYZ({
                    url: this.temasMapTiles,
                    wrapX: false,
                    ...(showAttribution ? { attributions: this.temasMapAttribution } : {})
                })
            }));
        }
        layers.push(new ol.VectorLayer({ source }));
        // The center is only a starting point: `fit` below overrides it. It cannot be left out
        // because a `View` with no center renders nothing until it gets one.
        const view = new ol.OlView({
            center: ol.fromLonLat([points[0].lon, points[0].lat]),
            zoom: TEMAS_MAP_FIT_MAX_ZOOM,
            // The ceiling has to live on the `View` too: without it the controls, the pinch and the
            // wheel climb to OpenLayers' own default (28) and "the max zoom of this map" stops meaning
            // anything — while every programmatic move (the opening fit, the focus of a clicked topic,
            // the zoom a cluster click animates to) is already clamped to `TEMAS_MAP_FIT_MAX_ZOOM`.
            maxZoom: TEMAS_MAP_MAX_ZOOM,
            // Limit the view to the world extent so we don't pan outside the planet and avoid
            // the black edges that appear when wrapX is disabled.
            extent: ol.getProjection('EPSG:3857')?.getExtent() || undefined
        });
        const map = new ol.OlMap({
            target: canvas,
            layers,
            view,
            // The default set would add `Rotate`, which has no place on a read-only map this small.
            // `Attribution` is conditional for the same reason the base layer is: it renders the
            // `attributions` the sources declare, so with none —`temasMapAttribution: ''`, or no tiles at
            // all— it would only paint an empty box where the credit goes.
            controls: showAttribution ? [new ol.Zoom(), new ol.Attribution({ collapsible: false })] : [new ol.Zoom()]
        });
        // **Before** the fit, and that order is the whole point: the target was `display: none` until
        // the toggle opened it, so the map still holds the 0x0 size of a hidden element, and fitting
        // the points into that viewport is what produces a broken view. Same lesson as the
        // `containerRect` guard of the wheel zoom in lightGallery.
        map.updateSize();
        const extent = source.getExtent();
        if (!extent) {
            // Only reachable with no features, which the empty `points` check above already rules out.
            // Disposed right away rather than left holding an empty map that nothing can ever fill.
            map.setTarget(undefined);
            map.dispose();
            return null;
        }
        view.fit(extent, {
            padding: [TEMAS_MAP_FIT_PADDING, TEMAS_MAP_FIT_PADDING, TEMAS_MAP_FIT_PADDING, TEMAS_MAP_FIT_PADDING],
            maxZoom: TEMAS_MAP_FIT_MAX_ZOOM,
            duration: 0
        });
        // **Before** `declutter()` below, and for the same kind of reason as the `updateSize()` above: the
        // render is asynchronous, so at this point the map has never painted and `getPixelFromCoordinate`
        // —which `declutter` reads every screen position from— returns `null` for every marker. A
        // `declutter` with no pixels groups nothing, so the spiderfy would only land on the next
        // `moveend`: with a base layer that came a few hundred ms later, when the tile requests resolved
        // and moved the view, but with `temasMapTiles: ''` nothing ever moves it and the markers stayed
        // piled up on top of each other (and, with the lines, on top of a pile of lines) for good.
        // `renderSync()` is the one public method that paints before returning.
        map.renderSync();
        // The tooltip element the hover floats over. Its markup comes from the caller on every
        // `pointermove`; the node itself is created once and reused for markers and clusters alike.
        const tooltip = document.createElement('div');
        // La clase viene de la opción y no es fija: el SCSS del globo de la tarjeta está scopeado bajo
        // `.card-temas-map-canvas`, así que en el mapa general no aplicaría y el texto quedaría blanco
        // sobre el fondo claro del mapa.
        tooltip.className = options.tooltipClass;
        const overlay = new ol.OlOverlay({
            element: tooltip,
            positioning: 'bottom-center',
            // The tooltip's bottom edge lands just above the circle's top edge, not on the coordinate.
            offset: [0, -TEMAS_MAP_MARKER_RADIUS],
            stopEvent: false
        });
        overlay.setMap(map);
        const clearHover = () => {
            overlay.setPosition(undefined);
            canvas.classList.remove('is-hover-marker');
        };
        // Every target the pointer can land on —a marker at the position it is painted, or a cluster at
        // its centroid— as `declutter` left it. It is what the hover and the click read: the hit test has
        // to point at what the user sees, not at the coordinate the topic would have without the
        // displacement, and in cluster mode most points are not painted at all. Rebuilt from scratch on
        // every `moveend` because both the positions and which points became a cluster depend on the
        // zoom; nothing else writes it.
        let targets = [];
        // Own coordinate of each topic, as a geometry ready to be reused. It is what the line of a
        // displaced marker starts at, and what the marker sits on while it is not displaced —`declutter`
        // resets every marker before grouping, so the geometry is only ever read, never accumulated: the
        // marker of a topic that no longer overlaps comes back to its real place.
        let ownPoints = current.map((p) => new ol.OlPoint(ol.fromLonLat([p.lon, p.lat])));
        /**
         * Decide, for the current zoom, how every overlapping group is drawn, and rebuild `targets`.
         *
         * Three modes: the first two picked by `TEMAS_MAP_CLUSTER_MAX_ZOOM`, the third by
         * `TEMAS_MAP_NO_CLUSTER_MIN_ZOOM`:
         *
         * - **Spiderfy** (near view, from `TEMAS_MAP_CLUSTER_MAX_ZOOM` up to
         *   `TEMAS_MAP_NO_CLUSTER_MIN_ZOOM`): every marker starts at its
         *   own coordinate, and the ones that sit closer than `TEMAS_MAP_SPIDER_THRESHOLD` to another
         *   are re-laid out on a circle around the group's centroid, each with the line back to its
         *   real coordinate. Unchanged from the original behavior, except that a group bigger than
         *   `TEMAS_MAP_SPIDER_MAX_GROUP` is no longer spread —that ring grows with the count and is
         *   what broke the far view— and is clustered instead.
         * - **Cluster** (far view, `zoom < TEMAS_MAP_CLUSTER_MAX_ZOOM`): every group within
         *   `TEMAS_MAP_CLUSTER_DISTANCE` becomes **one**
         *   marker —a circle with the count— at the group's centroid. The leader feature paints it, the
         *   rest paint nothing, and the only lines on screen are the ones the spiderfy still owns at a
         *   near view.
         * - **Close view** (`TEMAS_MAP_NO_CLUSTER_MIN_ZOOM` and up): the spiderfy with its cap off —
         *   every group is spread, however many points it has, and nothing clusters. A cluster at this
         *   zoom is a dead end (the click that would dissolve it is clamped by `TEMAS_MAP_FIT_MAX_ZOOM`,
         *   and same-coordinate points never separate anyway), so all the topics have to be on screen
         *   to be clickable. The ring growing past the canvas with a huge group is the accepted cost.
         *
         * In every mode the **selected** point of the general map is left out of every group: its row
         * says "it is here", and at a far view —where a click on a row does not change the zoom— it
         * would otherwise be buried inside a count. It paints alone, with its selected circle, on top.
         *
         * A displaced marker is painted from the `spider` property and not from the feature's own
         * geometry: one feature then paints two geometries that are not the same point —the line back to
         * the real coordinate and the circle at the displaced one—, which is the whole reason the style
         * is a function. The line is the only thing drawn back: no arrowhead, no anchor dot. Same for a
         * cluster: the count lives in the `cluster` property because the centroid is not the feature's
         * coordinate either.
         *
         * Runs on every `moveend` —and once right after the fit— because what overlaps changes with the
         * zoom: a far view groups markers that a near view separates back into place.
         */
        const declutter = () => {
            const n = current.length;
            const screens = current.map((p) => map.getPixelFromCoordinate(ol.fromLonLat([p.lon, p.lat])));
            const used = new Array(n).fill(false);
            // `getZoom()` is undefined only if the resolution maps to no zoom level, which the default
            // view never does; the fallback keeps the old behavior rather than the new one.
            const zoom = map.getView().getZoom();
            const clusterMode = (zoom ?? TEMAS_MAP_CLUSTER_MAX_ZOOM) < TEMAS_MAP_CLUSTER_MAX_ZOOM;
            // The cap of `TEMAS_MAP_SPIDER_MAX_GROUP` turns off at a close zoom, where a cluster could
            // not be dissolved by clicking it (see `TEMAS_MAP_NO_CLUSTER_MIN_ZOOM`). The two flags can
            // never be on together —8 vs 15—, so `clusterMode` below keeps deciding alone.
            const noCluster = (zoom ?? TEMAS_MAP_NO_CLUSTER_MIN_ZOOM) >= TEMAS_MAP_NO_CLUSTER_MIN_ZOOM;
            const threshold = clusterMode ? TEMAS_MAP_CLUSTER_DISTANCE : TEMAS_MAP_SPIDER_THRESHOLD;
            // Back to the own coordinate first: whatever was displaced or absorbed before this zoom may
            // not overlap anymore, and a feature keeps the last `spider`/`cluster`/`hidden` it was given.
            // Reset for **every** feature, even the ones with no pixel this pass: a point that left the
            // viewport would otherwise come back carrying the group it had when it left.
            clearHover();
            targets = [];
            for (let i = 0; i < n; i++) {
                features[i].set('spider', undefined);
                features[i].set('cluster', undefined);
                features[i].set('hidden', undefined);
            }
            // The open point never joins a group: marking it used keeps it out of the grouping loop below,
            // so it is
            // painted at its own coordinate —with its selected circle, which the z index puts over any
            // cluster next to it— and it gets its own point target at the end of this pass.
            for (let i = 0; i < n; i++) {
                if (screens[i] && options.isSelected?.(current[i]))
                    used[i] = true;
            }
            for (let i = 0; i < n; i++) {
                if (used[i] || !screens[i])
                    continue;
                // Complete-linkage growth: a marker joins only when it is within the threshold of **every**
                // member, never of just one of them, so no group can span more than the threshold from edge
                // to edge. The alternative —accepting a point near any member— chains: a row of markers
                // forty px apart would merge into a single group covering half the screen, with a centroid
                // that can land where there is no marker at all. Every pair of the group is checked, because
                // the distance is symmetric: when the later member is pushed it is measured against all the
                // ones already in, and a candidate rejected now would fail against any superset too — the
                // group only grows—, so it is left for a later group to seed.
                const group = [i];
                used[i] = true;
                for (let j = 0; j < n; j++) {
                    if (used[j] || !screens[j])
                        continue;
                    const b = screens[j];
                    let joins = true;
                    for (const k of group) {
                        const a = screens[k];
                        const dx = a[0] - b[0];
                        const dy = a[1] - b[1];
                        if (dx * dx + dy * dy > threshold * threshold) {
                            joins = false;
                            break;
                        }
                    }
                    if (joins) {
                        used[j] = true;
                        group.push(j);
                    }
                }
                // A lone marker is painted on its own coordinate and is left alone.
                if (group.length < 2)
                    continue;
                let cx = 0;
                let cy = 0;
                for (const k of group) {
                    cx += screens[k][0];
                    cy += screens[k][1];
                }
                cx /= group.length;
                cy /= group.length;
                if (clusterMode || (group.length > TEMAS_MAP_SPIDER_MAX_GROUP && !noCluster)) {
                    // One circle with the count, at the centroid. The color is dark neutral
                    const coord = map.getCoordinateFromPixel([cx, cy]);
                    const tone = current[group[0]].color;
                    const color = TEMAS_MAP_CLUSTER_FILL_DARK;
                    features[group[0]].set('cluster', {
                        count: group.length,
                        color,
                        marker: new ol.OlPoint(coord)
                    });
                    for (const k of group) {
                        if (k !== group[0])
                            features[k].set('hidden', true);
                    }
                    targets.push({
                        kind: 'cluster',
                        screen: [cx, cy],
                        coord,
                        radius: TEMAS_MAP_CLUSTER_RADIUS + TEMAS_MAP_MARKER_HIT_PADDING,
                        count: group.length
                    });
                    continue;
                }
                // Radius that keeps consecutive markers `2 * (radius + gap)` apart whatever their count;
                // the ring grows with the count instead of letting the numbers overlap again on it. Starts
                // at the top and goes clockwise, so the layout is stable between renders.
                const spread = (TEMAS_MAP_MARKER_RADIUS + TEMAS_MAP_SPIDER_GAP) / Math.sin(Math.PI / group.length);
                group.forEach((k, position) => {
                    const angle = -Math.PI / 2 + (2 * Math.PI * position) / group.length;
                    const displaced = [cx + Math.cos(angle) * spread, cy + Math.sin(angle) * spread];
                    const coord = map.getCoordinateFromPixel(displaced);
                    // The line goes from the topic's own coordinate to the center of the displaced circle: it
                    // ends under the marker's own fill, so there is nothing to trim at the tip and nothing to
                    // anchor at the origin.
                    features[k].set('spider', {
                        line: new ol.OlLineString([ownPoints[k].getCoordinates(), coord]),
                        marker: new ol.OlPoint(coord)
                    });
                    targets.push({
                        kind: 'point',
                        index: k,
                        screen: displaced,
                        coord,
                        radius: TEMAS_MAP_MARKER_RADIUS + TEMAS_MAP_MARKER_HIT_PADDING
                    });
                });
            }
            // Every point that ended up painted on its own: a lone marker, or the selected one the loops
            // above skipped. A leader is not one —it already pushed its cluster target— and neither is a
            // hidden member or a spiderfied marker, which pushed its displaced target already.
            for (let i = 0; i < n; i++) {
                if (!screens[i] || features[i].get('cluster') || features[i].get('hidden') || features[i].get('spider'))
                    continue;
                targets.push({
                    kind: 'point',
                    index: i,
                    screen: screens[i],
                    coord: ownPoints[i].getCoordinates(),
                    radius: TEMAS_MAP_MARKER_RADIUS + TEMAS_MAP_MARKER_HIT_PADDING
                });
            }
        };
        map.on('moveend', declutter);
        declutter();
        // Hover that names the topic under the pointer —or the size of the cluster it is over. The hit
        // test is a distance against each target's radius —plus a few px of slack— and not
        // `map.forEachFeatureAtPixel`, because with the markers being plain circles the manual test is
        // exact and needs no feature-to-point mapping.
        // It keeps the **closest** target within the radius instead of the first one: spread markers sit
        // `2 * (radius + gap)` apart, which is less than twice the hit radius, so their targets do
        // overlap and the pointer in the middle of two of them has to name the one the reader is over.
        const hitTest = (pixel) => {
            let closest = null;
            let closestDistance = Infinity;
            for (const target of targets) {
                const dx = pixel[0] - target.screen[0];
                const dy = pixel[1] - target.screen[1];
                const distance = dx * dx + dy * dy;
                if (distance <= target.radius * target.radius && distance < closestDistance) {
                    closest = target;
                    closestDistance = distance;
                }
            }
            return closest;
        };
        map.on('pointermove', (e) => {
            const target = hitTest(e.pixel);
            if (!target) {
                clearHover();
                return;
            }
            // `innerHTML` and not `textContent` because the general map writes two lines —the topic and the
            // headline of its article—. The markup is built by the caller and its texts come escaped; the
            // cluster's count is a number, so it needs no escaping of its own.
            tooltip.innerHTML =
                target.kind === 'cluster'
                    ? (options.clusterHoverHtml?.(target.count) ?? `${target.count} temas`)
                    : options.hoverHtml(current[target.index]);
            overlay.setPosition(target.coord);
            // The gap under the tooltip follows the circle it floats over, not a fixed radius: a cluster
            // is a 30px circle and the marker an 18px one, and with the marker's radius the tooltip would
            // sit inside the cluster. `HIT_PADDING` is what the target's radius adds over the painted
            // circle, so taking it back gives the visual radius of each.
            overlay.setOffset([0, -(target.radius - TEMAS_MAP_MARKER_HIT_PADDING)]);
            canvas.classList.add('is-hover-marker');
        });
        // The map stops firing `pointermove` the moment the pointer leaves it, so without this the
        // tooltip of the last marker would stay up over whatever the pointer moved on to. The node goes
        // away with the card, so this listener needs no teardown.
        canvas.addEventListener('pointerleave', clearHover);
        // Click sobre el mapa. Reusa el mismo hit test del hover, así que lo que se abre es exactamente
        // lo que el puntero nombraba —y no el primero que pasó por el radio—. El listener va
        // **siempre** bindeado, aunque el mapa no traiga callbacks: el click sobre un clúster es
        // navegación (acercar) y le corresponde a los dos mapas. El click en el vacío es un caso aparte:
        // no hay target, así que va por su propio callback y no con un punto `undefined` que cada
        // consumidor tendría que adivinar.
        map.on('singleclick', (e) => {
            const target = hitTest(e.pixel);
            if (!target) {
                options.onMarkerMiss?.();
                return;
            }
            if (target.kind === 'cluster') {
                const view = map.getView();
                const zoom = view.getZoom();
                if (zoom === undefined)
                    return;
                // Dos niveles por click disuelven el clúster desde cualquier zoom de partida sin el salto
                // que tendría un `fit` al extent de los miembros cuando ese extent ya llena el viewport.
                // El `moveend` del animate re-corre `declutter`, que va agrupando de nuevo en el camino.
                view.animate({
                    center: target.coord,
                    zoom: Math.min(zoom + TEMAS_MAP_CLUSTER_ZOOM_STEP, TEMAS_MAP_FIT_MAX_ZOOM),
                    duration: TEMAS_MAP_CLUSTER_ZOOM_DURATION
                });
                return;
            }
            options.onMarkerClick?.(current[target.index]);
        });
        /**
         * Reemplazar los puntos sin tocar la vista.
         *
         * Es el camino que usa el mapa general cuando cambia un filtro: **no** vuelve a armar el mapa. La
         * capa de tiles y el `View` son los mismos objetos, así que no hay flash del fondo ni `fit` que
         * se lleve el zoom y el paneo que el usuario dejó puestos —que es lo que se perdía reconstruyendo
         * el mapa entero en cada cambio de filtro.
         *
         * Lo único que se rehace son los features y el array de coordenadas propias que el `declutter`
         * lee, y en el mismo orden que al montar: primero `clearHover`, porque el target que el hover
         * tiene guardado pertenece al set viejo; después los features, y recién entonces el `declutter`,
         * que es el que vuelve a armar `targets` con los puntos nuevos.
         *
         * Un set vacío **sí** hace algo: borra los markers y deja la capa de tiles sola. Es lo que pasa
         * cuando cambia un filtro en API mientras se pide el nuevo set —los puntos del filtro que terminó
         * desaparecen de inmediato, igual que las tarjetas de la lista, y el cartelito de carga es lo que
         * explica por qué—. El estado final lo decide igual `_refreshFullMap`: si el set nuevo viene vacío
         * destruye el mapa y escribe el mensaje, si viene con puntos acá entran de una.
         */
        const updatePoints = (next) => {
            clearHover();
            current = next;
            features = current.map(featureOf);
            ownPoints = current.map((p) => new ol.OlPoint(ol.fromLonLat([p.lon, p.lat])));
            // `clear()` y no reemplazar la `source`: el `VectorLayer` —y con él la capa de tiles y el
            // `View`— queda siendo el mismo objeto, que es justo lo que hay que preservar.
            source.clear();
            source.addFeatures(features);
            // El render es asincrónico, así que sin esto el `declutter` leería píxeles de una vista que
            // todavía no se pintó con los features nuevos. Mismo corte que el `renderSync()` del montaje.
            map.renderSync();
            declutter();
        };
        /**
         * Repintar los markers para que `isSelected` se vuelva a leer, y re-agrupar. `changed()` por
         * feature es lo que hace que el renderer vuelva a llamar a la función de estilo; sin él, abrir o
         * cerrar la ficha no se vería en el mapa.
         *
         * El `declutter` va con eso porque la selección también cambia el **agrupamiento**: el punto
         * abierto queda fuera de los clústeres y de los grupos del spiderfy (es el que la fila de la
         * ficha dice "acá está"), así que sin re-agruparlo seguiría escondido adentro del clúster del
         * que acababa de salir —o, al cerrarlo, afuera de uno que ahora le correspondería.
         */
        const refreshStyles = () => {
            features.forEach((feature) => feature.changed());
            declutter();
        };
        return { map, overlay, updatePoints, refreshStyles };
    }
    /**
     * Dispose every live topics map. Called from the two places that empty `#timeline-cards`,
     * because dropping a card's DOM node does not dispose its map: OpenLayers keeps the canvas, the
     * listeners and the tile source alive, so without this every search, filter, sort or page change
     * would leak one map per card that had opened its topics map.
     *
     * The overlay is let go of explicitly: it is added to the map, not owned by it, and `Map.dispose()`
     * does not take the overlays with it.
     */
    _destroyTemasMaps() {
        this._temasMaps.forEach((handle, canvas) => {
            this._temasMaps.delete(canvas);
            handle.overlay.setMap(null);
            handle.map.setTarget(undefined);
            handle.map.dispose();
        });
    }
    /**
     * Bind the click of the general map's button. It is a switch between **two views**, not an expand:
     * the timeline goes `hidden` while the map is up and comes back exactly as it was, so nothing
     * about `isExpanded` is touched here —that state belongs to the timeline and only `_toggleExpand`
     * and its two helpers write it.
     * Its pan and zoom are what the user moved, so they are not touched: the map survives the toggle
     * hidden and the view stays where it was left.
     */
    _bindFullMapToggle() {
        if (!this.fullMapToggle)
            return;
        this.fullMapToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this._fullMapOpen = !this._fullMapOpen;
            this._applyFullMapState();
            if (!this._fullMapOpen)
                return;
            if (this._fullMapHandle) {
                // El mapa sigue vivo detrás del `hidden`, con el pan y el zoom que el usuario dejó. Lo único
                // que hay que reflotar es el tamaño: la caja cambió de `display: none` a visible.
                this._fullMapHandle.map.updateSize();
                return;
            }
            void this._refreshFullMap();
        });
    }
    /**
     * Keep the topic panel of the general map below the toolbar.
     *
     * The map view is absolutely pinned inside its section (`top/right/bottom/left: 0` plus an explicit
     * `height: 100vh`) and floats **under** `.featured-row` (the toolbar, `z-index: 2`), so a
     * `max-height` anchored to `100vh` clamps a tall panel right up against the top of the
     * viewport —under the bar, which covers its top and its close button and makes the card unusable.
     * The toolbar's height is not a constant (fullpage pill, collapsed panel, wrap on small screens), so
     * its live bottom is written into a CSS variable that the SCSS reads in the panel's `calc()`. Same
     * measurement as `_scrollToTimelineTop()`, which reads the same row for the scroll target.
     *
     * On a wide viewport (`FULLMAP_DETAIL_TOP_MIN_WIDTH`) the bar does not compete with the panel, so
     * the offset goes to zero and the panel's height is allowed to reach the top of the viewport.
     */
    _syncFullMapDetailTop() {
        const panel = this.fullMapDetail;
        if (!panel)
            return;
        // A zero bottom is the "no clamp" case, and it also covers the missing `featuredRow`.
        const toolbarBottom = window.innerWidth >= FULLMAP_DETAIL_TOP_MIN_WIDTH || !this.featuredRow
            ? 8
            : this.featuredRow.getBoundingClientRect().bottom;
        // Clamped so a toolbar scrolled out of view (or a `rect` above the viewport) never lifts the top
        // of the panel into negative space.
        panel.style.setProperty('--tv-fullmap-top', `${Math.max(toolbarBottom, 0)}px`);
    }
    /**
     * Reflect `_fullMapOpen` on the DOM: which of the two views is on screen, and what the button says.
     *
     * The timeline **and** the featured stack go down together: the stack is the collapsed form of the
     * same list, so leaving it up would show two views of the publications at once —and its click is
     * bound to `_toggleExpand`, whose whole job is to bring back the thing the map replaced.
     *
     * Both go with the **attribute**, so `.timeline-container` needs its own `display` rule in the SCSS
     * —the UA `[hidden]` yields to any author `display`, and that rule sets one (see
     * `.taxonomy-row[hidden]` and `.card-taxonomy-extra` for the same reason). `.featured-cards` has no
     * `display` of its own, so the UA rule covers it with no extra rule.
     */
    _applyFullMapState() {
        const open = this._fullMapOpen;
        this.timelineContainer.hidden = open;
        this.featuredContainer.hidden = open;
        if (this.fullMapView)
            this.fullMapView.hidden = !open;
        // La ficha del punto es parte de la vista del mapa: al cerrarlo se va con ella, o quedaría
        // flotando sobre el listado.
        if (!open)
            this._closeFullMapCard();
        // Con el mapa abierto, el orden y las notas de trabajo no tienen nada que ordenar ni que mostrar:
        // no hay lista, y ocultar el trabajo de un mapa es exactamente el modo "escondido" del botón. Se
        // apagan por `hidden` —no por clase— porque es el mismo estado que se leería al volver al listado,
        // y por lo tanto no puede quedar en un `display` que alguien tenga que rememberar.
        //
        // El panel de filtros y el buscador **no** se tocan: son los que acotan lo que el mapa muestra, y
        // para eso tienen que quedar accesibles desde arriba del mapa.
        const sortWrap = this.sortMenu ? this.sortMenu.closest('.sort-wrap') : null;
        if (sortWrap)
            sortWrap.hidden = open;
        if (this.workNotesToggle)
            this.workNotesToggle.hidden = open;
        if (open) {
            // El tope de la ficha del punto se mide con el mapa ya visible: la barra puede haber cambiado de
            // alto desde la última vez (wrap en móvil, apertura del buscador) y el `calc()` del SCSS lo lee.
            this._syncFullMapDetailTop();
            // Los menús flotantes se cierran siempre, y no solo los que se ocultan: sobre el mapa un panel
            // de filtros abierto queda flotando sin nada detrás. `_closeOtherMenus` no alcanza con un solo
            // `except` (deja abierto justamente el que se le pasa), así que los tres se cierran por su cuenta.
            if (this.filterMenu)
                this.filterMenu.classList.remove('open');
            this.filterToggle?.classList.remove('open');
            if (this.sortMenu)
                this.sortMenu.classList.remove('open');
            this.sortToggle?.classList.remove('open');
            this.sortToggle?.setAttribute('aria-expanded', 'false');
            if (this.filtrosInternosMenu)
                this.filtrosInternosMenu.classList.remove('open');
            this.filtrosInternosToggle?.classList.remove('open');
        }
        if (!this.fullMapToggle)
            return;
        this.fullMapToggle.setAttribute('aria-expanded', String(open));
        const label = open ? FULLMAP_EXIT_LABEL : FULLMAP_OPEN_LABEL;
        this.fullMapToggle.setAttribute('aria-label', label);
        this.fullMapToggle.setAttribute('title', label);
        // El ícono va con el estado: el del mapa cuando el listado es lo que se está viendo, la `X` cuando
        // lo que está en pantalla es el mapa. El `aria-hidden` del svg lo saca del árbol de accesibilidad,
        // así que el nombre del botón es solo el `aria-label` de arriba en los dos casos.
        this.fullMapToggle.innerHTML = open ? FULLMAP_CLOSE_SVG : TEMAS_MAP_TOGGLE_SVG;
    }
    /**
     * Resolve the points of the general map and paint them.
     *
     * It is the only trigger, and it runs in three situations: el primer click del botón, y cada
     * cambio del scope filtrado con el mapa ya en pantalla. Con el mapa cerrado no hace nada —ni
     * request, ni `ol`— porque abrirlo vuelve a llamarlo: es el mismo patrón lazy del mapa de la
     * tarjeta, aplicado a la vista entera.
     *
     * Each resolution goes through `_fullMapSeq`, for the same reason `_fetchPage` does it: the answer
     * to an old query arriving after a newer one would paint the map of a view that no longer exists.
     *
     * Con el mapa ya montado no se vuelve a montar: se le cambian los puntos al mapa vivo
     * (`updatePoints`). Reconstruirlo era lo que producía el flash —la capa de tiles se tiraba abajo y
     * volvía a pedir los PNG— y además se llevaba el `View.fit`, con lo que cada cambio de filtro
     * devolvía la vista al centro y perdía el pan y el zoom que el usuario había dejado.
     *
     * El estado de carga sí se escribe cuando ya hay un mapa en pantalla, y solo en API: es el mismo
     * criterio que la lista, donde las tarjetas desaparecen de inmediato y los skeletons toman su lugar
     * (`_renderApiLoading`). Acá no hay silueta que placeholderar, así que el estado es el cartelito
     * centrado de siempre (`FULLMAP_LOADING_TEXT`) y lo que desaparece son los markers: los del filtro
     * que terminó no significan nada para el que está por venir, y dejarlos mientras el server tarda
     * uno o dos segundos sería una mentira con forma de respuesta vieja. La capa de tiles y la vista
     * quedan —eso es justamente lo que `updatePoints` preserva—, así que se lee como "el mapa se está
     * actualizando" y no como "el mapa se rompió". Cierra además la ficha del punto abierto, porque su
     * marker acaba de irse. En modo local no hay nada que esperar (`_fullMapPointsFrom` es síncrono),
     * así que solo se escribe el mensaje si el mapa todavía no existe (ahí sí se espera `ol`).
     *
     * El error y el vacío sí se muestran en los dos casos —en esos dos no hay mapa que dejar en paz:
     * en el vacío hay que tirar los puntos viejos abajo—, y el vacío sigue siendo el único que
     * destruye el mapa.
     */
    async _refreshFullMap() {
        const canvas = this.fullMapCanvas;
        if (!canvas)
            return;
        const seq = ++this._fullMapSeq;
        const mounted = Boolean(this._fullMapHandle);
        const waiting = this.api;
        if (!mounted || waiting)
            this._setFullMapStatus(FULLMAP_STATE_LOADING, FULLMAP_LOADING_TEXT);
        if (mounted && waiting) {
            this._closeFullMapCard();
            this._fullMapHandle?.updatePoints([]);
        }
        const loaded = this.api ? await this._fetchApiPoints() : this._fullMapPointsFrom(this.allCards);
        // La vista pudo cerrarse, o el filtro cambiar otra vez, mientras se pedían los puntos.
        if (seq !== this._fullMapSeq || !this._fullMapOpen || !canvas.isConnected)
            return;
        if (loaded === null) {
            this._setFullMapStatus(FULLMAP_STATE_ERROR, 'No se pudieron cargar los puntos del mapa.');
            return;
        }
        this._fullMapPoints = loaded;
        if (!loaded.length) {
            // Sin puntos no hay mapa: los viejos no significan nada para el filtro actual. Se destruye
            // **una vez**, acá, y no en cada cambio como antes.
            this._destroyFullMap();
            this._setFullMapStatus(FULLMAP_STATE_EMPTY, 'Ninguna publicación del filtro actual tiene un tema ubicado.');
            return;
        }
        this._setFullMapStatus(null, '');
        if (this._fullMapHandle) {
            this._fullMapHandle.updatePoints(loaded);
            return;
        }
        this._fullMapHandle = await this._mountFullMap(canvas, loaded);
        // El mapa pudo montarse con los puntos de una query que ya no es la vigente: el cambio llegó
        // mientras `ol` se importaba, y el `seq` de arriba no alcanza a cortarlo porque el await del
        // import ocurre **después** del chequeo. Sin este segundo cierre los puntos viejos quedarían
        // pintados bajo el cartelito de carga hasta que responda el query nuevo.
        if (seq !== this._fullMapSeq)
            this._fullMapHandle?.updatePoints([]);
    }
    /**
     * The points of the general map out of the cards on screen, one per located topic.
     *
     * It reuses `_temasLocated`, so "which topic has a usable point, and what color is its tone" is
     * decided by the same pass in both maps: the general map cannot disagree with the cards about what
     * is located. A `capturado: false` item has no `temas` and so contributes nothing, without needing
     * a special case.
     */
    _fullMapPointsFrom(cards) {
        const tones = this._fullMapToneFilter();
        const out = [];
        cards.forEach((card) => {
            if (!card.temas || !card.temas.length)
                return;
            this._temasLocated(card.temas).forEach((point) => {
                // El filtro de tono acota por **subtema**, no por el artículo entero: el filtro ya dejó pasar
                // los artículos que tienen algún tema del tono pedido, y sin este segundo corte el mapa
                // mostraría también los subtemas de los otros tonos de esos mismos artículos. Con el corte,
                // "Negativo" son los subtemas negativos y solo ellos.
                if (tones && !tones.has(point.tono_social))
                    return;
                out.push({
                    itemId: card.id,
                    idSubtema: point.idSubtema,
                    lat: point.lat,
                    lon: point.lon,
                    titulo: point.titulo,
                    nombre_fuente: card.nombre_fuente,
                    color: point.color,
                    tono_social: point.tono_social
                });
            });
        });
        return out;
    }
    /**
     * Los tonos que el mapa general tiene que filtrar **por subtema**, o `null` si no hay filtro de tono
     * activo (o ni siquiera hay grupo de tono declarado).
     *
     * El filtro de la barra es un filtro de artículo —`tonos_sociales` es un array del ítem—: matchea por
     * "este artículo tiene algún tema negativo". Para la lista está bien, porque el artículo es lo que se
     * ve. Para el mapa no: el mapa **no** muestra artículos, muestra subtemas, así que el mismo token tiene
     * que acotar la lista de marcadores a los del tono, o el mapa queda mostrando los positivos y neutros
     * de los artículos negativos.
     *
     * El `Set` sale de `_filterActiveTokens` y no de `_filterActiveValues` a propósito: el segundo devuelve
     * los tokens tal como se declararon, que pueden ser un CSV (el `[null, false]` del "Sin descartar" es un
     * valor, pero varios pueden venir pegados), y comparar contra eso no filtraría nada. `_filterToken` ya
     * normaliza a `String`, así que el `has()` es directo contra el `tono_social` del subtema.
     */
    _fullMapToneFilter() {
        const group = this.filters.find((f) => f.field === FULLMAP_TONE_FIELD);
        if (!group)
            return null;
        const tokens = this._filterActiveTokens(group);
        if (!tokens.length)
            return null;
        return new Set(tokens);
    }
    /**
     * Los puntos del mapa general en modo API, con `GET {url}/points`.
     *
     * The list endpoint cannot answer this: its items are summaries that carry no `temas`, and the
     * geometry only travels with `GET {url}/:id` —so collecting it from the list would mean one request
     * per article. The dedicated endpoint returns one flat point per located topic of the filtered set
     * in a single request, which is the whole reason it exists.
     *
     * The query is the one from `_buildFilterQueryParams`: the search and the filters, with **no**
     * `page`/`pageSize` (there is no page: the map fits everything) and no `sort`/`sortBy` (the map
     * doesn't order). `null` means the request failed, which the caller shows apart from "the filter
     * matched nothing with a location".
     */
    async _fetchApiPoints() {
        let raw;
        try {
            const data = await this._apiFetch('/points', this._buildFilterQueryParams());
            raw = (data && data.points) || [];
        }
        catch {
            return null;
        }
        const tones = this._fullMapToneFilter();
        const out = [];
        raw.forEach((point) => {
            // A `null` here means a malformed response, not an empty one: skip that point, keep the rest.
            if (!point || typeof point !== 'object')
                return;
            const geom = this._temaGeomOf(point);
            if (!geom)
                return;
            const tone = point.tono_social;
            // Mismo corte por subtema que el modo local: el backend ya filtró por artículo, y este lado
            // acota los marcadores al tono. Va **después** de validar la geometría y antes de pintar, así
            // que un punto inválido se descarta por su motivo y no por el tono.
            if (tones && !tones.has(String(tone)))
                return;
            out.push({
                itemId: point.id,
                idSubtema: typeof point.id_subtema === 'string' ? point.id_subtema : '',
                lat: geom.lat,
                lon: geom.lon,
                titulo: typeof point.titulo === 'string' ? point.titulo : '',
                nombre_fuente: typeof point.nombre_fuente === 'string' ? point.nombre_fuente : '',
                color: TEMAS_MAP_TONE_COLOR[tone] || TEMAS_MAP_TONE_FALLBACK,
                tono_social: tone
            });
        });
        return out;
    }
    /**
     * Mount the general map itself. Same machinery as a card's, with the two differences the scale
     * forces: **no number** in the marker (a global index would point at no list) and a hover with two
     * lines, because without the card there is nothing under the map saying which article a topic
     * belongs to.
     *
     * Both texts are escaped: they come from the pipeline (locally) or from the backend (API), and
     * this is the one hover that goes through `innerHTML` instead of `textContent` —which is also why
     * `_mountTemasMap` escapes its own single title there.
     */
    async _mountFullMap(canvas, points) {
        return this._mountTemasMapOn(canvas, points, {
            markerLabel: null,
            hoverHtml: (p) => `<span class="fullmap-tooltip-topic">${this._escapeHtml(p.titulo)}</span>` +
                `<span class="fullmap-tooltip-source">${this._escapeHtml(p.nombre_fuente)}</span>`,
            tooltipClass: 'fullmap-tooltip',
            errorClass: 'fullmap-error',
            onMarkerClick: (p) => this._openFullMapCard(p),
            onMarkerMiss: () => this._closeFullMapCard(),
            // El punto abierto se reconoce por su key, no por su posición en el array: el click reordena
            // el mapa entero (`current`), así que un `índice === seleccionado` marcaría el punto equivocado
            // apenas cambia un filtro.
            isSelected: (p) => this._fullMapSelectedKey !== null && this._fullMapPointKey(p) === this._fullMapSelectedKey
        });
    }
    /**
     * Abrir la tarjeta de un punto del mapa general, en el panel sobre el mapa, y llevar el **tema** del punto a primer plano: la tarjeta se renderiza expandida y scrolleada hasta ese tema,
     * resaltado.
     *
     * "Expandida" y no la versión resumida porque el click dice "este tema": un panel colapsado
     * escondería justo lo que se pidió ver, y abrirlo a mano para después buscar el tema sería un
     * segundo paso. Sigue siendo la misma tarjeta del timeline —se reusa `_createTimelineItem` entero—
     * así que el panel no puede divergir de la lista (mismos badges, misma miniatura, mismo pie de
     * acciones).
     *
     * El id del click es el de la **tarjeta**, no el del tema: el panel muestra el artículo, y un
     * artículo con diez temas tiene un solo panel. En API los puntos solo traen el id, así que el
     * artículo entero se pide con `_fetchDetail` (que ya cachea en `_apiDetails`).
     *
     * Es además la única superficie de tarjetas alcanzable con el timeline **colapsado** (el botón del
     * mapa general no se esconde con el timeline cerrado), así que no puede depender de que
     * `_toggleExpand` o `_init` ya hayan corrido `_preloadEmbedLibraries()`: por eso lo llama ella misma.
     */
    async _openFullMapCard(point) {
        const panel = this.fullMapDetail;
        if (!panel)
            return;
        const id = String(point.itemId);
        const key = this._fullMapPointKey(point);
        // Un artículo con varios temas llega por el click de cualquiera de ellos: si el panel ya está
        // mostrando **ese** punto, no se vuelve a renderizar, para no perder el scroll de la ficha.
        const sameCard = this._fullMapCardId === id && !panel.hidden;
        if (sameCard && this._fullMapSelectedKey === key)
            return;
        this._fullMapCardId = id;
        this._fullMapSelectedKey = key;
        // El marcador clickeado se marca en el mapa, así que el mapa tiene que repintar aunque no haya
        // cambiado ningún punto. Va antes de cualquier `await`: abrir la ficha no puede dejar el círculo
        // viejo mientras viaja el request.
        this._fullMapHandle?.refreshStyles();
        panel.hidden = false;
        // Re-medir justo antes de mostrar: entre la apertura del mapa y el click en un punto la barra pudo
        // cambiar de alto, y el panel se ancla a su bottom real (ver `_syncFullMapDetailTop`).
        this._syncFullMapDetailTop();
        panel.innerHTML = `<div class="fullmap-detail-loading">Cargando la publicación…</div>`;
        let card = this.allCards.find((it) => String(it.id) === id) || null;
        if (!card && this.api)
            card = await this._fetchDetail(id);
        // El click en otro punto mientras se esperaba: la respuesta ya no pinta de nada.
        if (this._fullMapSelectedKey !== key)
            return;
        if (!card) {
            panel.innerHTML = `<div class="fullmap-detail-loading">No se encontró la publicación ${this._escapeHtml(id)}.</div>`;
            return;
        }
        const itemEl = this._createTimelineItem(card, 0);
        // La columna de fecha es de la línea de tiempo: acá no hay línea vertical ni dots, y sin la
        // fecha la cabecera de la tarjeta queda desalineada contra el panel.
        const dateCol = itemEl.querySelector('.timeline-date-col');
        if (dateCol)
            dateCol.remove();
        // El colapso no tiene sentido acá: la tarjeta se abre siempre expandida, y sin este botón tampoco
        // queda un "−" que la cerraría y dejaría el panel con el scroll perdido.
        const collapseBtn = itemEl.querySelector('.card-collapse');
        if (collapseBtn)
            collapseBtn.remove();
        itemEl.classList.add('visible');
        // Sin `.timeline-card` no hay nada que expandir, scrollear ni resaltar, y `_ensureCardDetail` no
        // tolera `null`: es la única forma de que `_createTimelineItem` devuelva una tarjeta sin la caja,
        // así que es un caso patológico y no vale la pena un panel con el "Cargando…" pegado.
        const cardEl = itemEl.querySelector('.timeline-card');
        if (!cardEl)
            return;
        cardEl.classList.add('expanded');
        panel.innerHTML = this._buildFullMapDetailHtml();
        panel.querySelector('.fullmap-detail-body')?.appendChild(itemEl);
        // El botón va **dentro** de la tarjeta y no en un header del panel: `.timeline-card` es
        // `position: relative`, así que el `top/right` del SCSS lo pegan a su esquina. Se agrega después
        // de `_createTimelineItem` porque hace falta el nodo de la tarjeta, y se sube con el mouse para
        // que el click no caiga en el listener de expandir de la tarjeta (que abriría el detalle otra vez
        // en vez de cerrar el panel).
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'fullmap-detail-close';
        closeBtn.title = 'Cerrar';
        closeBtn.setAttribute('aria-label', 'Cerrar la ficha');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._closeFullMapCard();
        });
        cardEl.appendChild(closeBtn);
        // El detalle (`_ensureCardDetail`) es lo que trae la lista de temas, así que el resaltado y el
        // scroll a un tema solo pueden salir **después** de que llegue: en local la lista ya está, pero en
        // API el artículo entero se acaba de pedir y no hay nada que resaltar todavía. Por eso el
        // resaltado va en su propio método, que corre con lo que haya (`null` si el backend no mandó
        // `id_subtema`, o si la lista de temas vino vacía) y no rompe la ficha que ya se ve.
        void this._ensureCardDetail(cardEl).then((detail) => {
            // La respuesta tardía es de otro punto: ya no se pinta nada.
            if (this._fullMapSelectedKey !== key)
                return;
            // El preload no puede depender de que el timeline se haya expandido antes: esta ficha es la
            // única superficie de tarjetas alcanzable con el timeline colapsado (el botón del mapa general
            // no se esconde y `_bindFullMapToggle` no toca `isExpanded`), y los otros dos caminos que lo
            // llaman no llegan acá — en local `_ensureCardDetail` corta en `!this.api`, y en api con el
            // artículo fuera de la página cargada el detalle se inyectó al crear la tarjeta, así que corta
            // por `detailLoaded`. Va antes de `_processCardEmbeds` porque el blockquote de Instagram nace
            // a los 150ms y su polling de `instgrm` dura 15s: el script tiene que estar en camino ya.
            this._preloadEmbedLibraries();
            this._processCardEmbeds(cardEl);
            // La lista de temas recién llegó, así que recién ahora se puede saber cuáles tienen punto y
            // volverlos clickeables: el bind va después del detalle, no antes. El objeto que se bindea es
            // **el mismo cuyo markup está en el DOM** y no el `card` de arriba: en api ese `card` es un
            // summary de `allCards` —sin `temas`— y contra eso no se bindea ninguna fila (los artículos
            // que no están en la página cargada sí traen el detalle entero, que es lo que hacía que el
            // fallo se viera solo en unos). En local `detail` es `null` y manda `card`, que ya es entero.
            this._bindFullMapCardTemas(cardEl, detail ?? card);
            this._revealFullMapTema(cardEl, point.idSubtema, true);
        });
    }
    /**
     * En modo mapa, volver clickeable cada tema de la ficha que tiene punto en el mapa.
     *
     * Solo los que tienen `geom` —`_temaGeomOf`—: un tema sin ubicación no tiene a dónde llevar la
     * vista, y un control que parece clickeable y no hace nada es peor que uno que no lo parece. Por
     * eso el binding va por `.tema-item` **con** coordenadas y no por todas las filas, y la clase
     * `.tema-locatable` es lo que le pone el puntero y el hover: el "es clickeable" es un dato, y el
     * SCSS lo lee de la clase en vez de repetir el criterio geométrico.
     *
     * Va después de `_ensureCardDetail` porque es el detalle el que trae la lista de temas: en local ya
     * estaba, y en API no hay nada a lo que bindear hasta que llega.
     */
    _bindFullMapCardTemas(cardEl, card) {
        const temas = card.temas || [];
        cardEl.querySelectorAll('.tema-item').forEach((el) => {
            const index = Number(el.dataset.temaIndex);
            const tema = temas[index];
            if (!tema || !this._temaGeomOf(tema))
                return;
            el.classList.add('tema-locatable');
            el.addEventListener('click', (e) => {
                // El card entero tiene un listener que expande y pide el detalle (ver `_createTimelineItem`).
                // Sin el corte, cada click en un tema haría las dos cosas.
                e.stopPropagation();
                this._focusFullMapTema(cardEl, card, index);
            });
        });
    }
    /**
     * Llevar la vista del mapa a un tema elegido desde la ficha, y dejarlo como punto seleccionado.
     *
     * Son dos gestos en un mismo click, y el orden importa: primero se selecciona —para que el círculo
     * crezca y quede arriba, que es lo que conecta la fila con el punto— y después se mueve la vista.
     *
     * **Toda fila clickeada acerca**: el gesto es "llévame hasta ahí", y repetirlo sobre otro tema de
     * la misma tarjeta hace exactamente lo mismo, centrando el nuevo punto. Antes solo el segundo click
     * —sobre el tema ya seleccionado— hacía `fit`, con lo cual clickear una fila nueva se quedaba en el
     * zoom viejo y no llegaba al punto elegido.
     */
    _focusFullMapTema(cardEl, card, temaIndex) {
        const tema = (card.temas || [])[temaIndex];
        const geom = tema ? this._temaGeomOf(tema) : null;
        const view = this._fullMapHandle?.map.getView() || null;
        if (!tema || !geom || !view)
            return;
        const key = `${String(card.id)}#${tema.id_subtema ?? ''}`;
        // El criterio es la **selección**, no "la última fila clickeada": un tema distinto al que ya
        // estaba marcado —venga del click en su punto o de su propia fila— es el que cambia el punto
        // seleccionado. El `fit` lo pide siempre, así que no hace falta un segundo campo para acordarse
        // de la última fila.
        const alreadySelected = this._fullMapSelectedKey === key;
        if (!alreadySelected) {
            this._fullMapCardId = String(card.id);
            this._fullMapSelectedKey = key;
            // El círculo tiene que crecer y subir **antes** de que se mueva la vista, o el usuario ve el
            // mapa viajar sin ver qué punto es el que lo provoke.
            this._fullMapHandle?.refreshStyles();
        }
        // Sin `scroll`: la fila se acaba de clickear, o sea que ya está a la vista. Scrollearla al centro
        // sería mover la lectura del usuario debajo del puntero sin que lo haya pedido.
        this._revealFullMapTema(cardEl, tema.id_subtema ?? '', false);
        // `_loadOpenLayers` cachea la promesa, así que acá solo es el `await` de algo ya resuelto (el
        // mapa general no puede estar montado sin que `ol` se haya cargado). Sin esto no hay forma
        // proyectar `lon`/`lat` a las coordenadas de la vista, que son EPSG:3857.
        void this._loadOpenLayers().then((ol) => {
            const center = ol.fromLonLat([geom.lon, geom.lat]);
            // El `fit` de un punto: el extent no tiene tamaño, así que la resolución sale del
            // `minResolution` de `maxZoom` — que es el tope que ya usa el `fit` de apertura — y el punto
            // queda centrado. El `duration` (y no `setCenter`) interpola el viaje y dispara los `moveend`
            // que re-declutterean los markers por el camino.
            view.fit(new ol.OlPoint(center), { maxZoom: TEMAS_MAP_FIT_MAX_ZOOM, duration: FULLMAP_FOCUS_DURATION });
        });
    }
    /**
     * Llevar el tema del punto clickeado a la vista: lo resalta y, si hace falta, scrollea el panel
     * hasta él.
     *
     * El resaltado es una clase en el `.tema-item` y **no** un elemento nuevo ni un scroll: el
     * resaltado tiene que viajar con el dato (es el mismo `.tema-item` que ya existe) para que
     * `_ensureCardDetail` pueda reescribir el detalle sin perderlo.
     *
     * Un `idSubtema` vacío —backend sin `id_subtema`— no hace nada: no hay forma de ubicar el tema, y
     * mejor la ficha entera a la vista que scrollear a un `.tema-item` equivocado.
     *
     * `scroll` es un parámetro y no una constante porque son los dos callers los que saben si el tema
     * estaba o no a la vista: viniendo de un click en el mapa **hay** que scrollear (la lista puede
     * tener veinte temas y el elegido ninguno), y viniendo de un click en la fila **no** —la fila está
     * delante del puntero, así que `scrollIntoView` la correría debajo sin que nadie lo pidiera, y en
     * `block: 'center'` hasta la deja en otro lugar del panel del que salió.
     */
    _revealFullMapTema(cardEl, idSubtema, scroll) {
        if (!cardEl || !idSubtema)
            return;
        const items = cardEl.querySelectorAll('.tema-item');
        // Por comparación de `dataset` y no por un selector `[data-id-subtema="…"]`: el id viene del
        // backend, y meter un valor sin validar en un selector es dejar la puerta abierta a un
        // `SyntaxError` (un `T-1"` cierra el atributo y rompe la consulta) o a inyección, si el backend
        // no cumpliera el contrato. Comparando el string, un id raro simplemente no encuentra nada.
        const target = Array.from(items).find((el) => el.dataset.idSubtema === idSubtema);
        if (!target)
            return;
        // El resaltado es de a uno, no acumulativo: si el usuario va saltando de tema en tema de la misma
        // tarjeta, el anterior tiene que apagarse o todos los clickeados quedan marcados.
        items.forEach((el) => el.classList.remove('tema-selected'));
        target.classList.add('tema-selected');
        if (scroll)
            target.scrollIntoView({ block: 'center' });
    }
    /**
     * La identidad de un punto para el panel: artículo + tema. Es lo que distingue dos puntos del
     * mismo artículo, y también lo que se usa para descartar una respuesta que llegó tarde y para el
     * predicado de selección del mapa.
     *
     * El id del tema va como `id_subtema`, no como título, porque dos temas de un artículo pueden
     * llamarse igual. Un backend sin `id_subtema` deja `''` y el key queda igual de único: los dos
     * puntos sin id de un mismo artículo no se distinguen, pero siguen siendo el mismo artículo, y lo
     * que la ficha muestra es el artículo.
     */
    _fullMapPointKey(point) {
        return `${String(point.itemId)}#${point.idSubtema}`;
    }
    /**
     * El panel del mapa general: solo la caja donde entra la tarjeta. El botón de cerrar **no** se
     * agrega acá sino dentro de la tarjeta, arriba a la derecha (`.timeline-card` es `position:
     * relative`), que es donde el ojo ya está: en un header aparte seemed to float, y con el panel sin
     * fondo propio quedaba pegado a la nada.
     *
     * El link a la vista individual tampoco va acá: la tarjeta ya lo trae en su propio menú de
     * información, donde el ID es un `<a target="_blank">` si el ítem trae `link_view_entry`.
     */
    _buildFullMapDetailHtml() {
        return `<div class="fullmap-detail-body"></div>`;
    }
    /**
     * Cerrar el panel de la tarjeta del mapa general. Va en el botón "×" de la ficha y también en el
     * click del mapa de fondo, que es lo que uno espera: clickear en el vacío cierra lo que está
     * abierto sin tener que buscar el botón.
     *
     * El orden importa: se limpia `_fullMapSelectedKey` **antes** de vaciar el panel, porque es la key
     * que usa el predicado del mapa para saber si algo está seleccionado. Vaciar el `innerHTML` después
     * no importa para eso —el predicado no lee el DOM—, pero sí para el resaltado del tema, que
     * desaparece con la tarjeta.
     */
    _closeFullMapCard() {
        const wasSelected = this._fullMapSelectedKey !== null;
        this._fullMapCardId = null;
        this._fullMapSelectedKey = null;
        // El círculo seleccionado vuelve al suyo: sin esto el mapa seguiría marcando un punto cuya ficha
        // ya no existe.
        if (wasSelected)
            this._fullMapHandle?.refreshStyles();
        if (!this.fullMapDetail)
            return;
        this.fullMapDetail.hidden = true;
        this.fullMapDetail.innerHTML = '';
    }
    /**
     * Dispose the general map. Same teardown as `_destroyTemasMaps` and for the same two reasons: the
     * overlay is added to the map, not owned by it, and dropping the DOM node would leave the canvas,
     * the listeners and the tile source vivos.
     *
     * It exists as its own method —and not as one more entry of `_temasMaps`— because
     * `_destroyTemasMaps` runs on every re-render of the timeline and this map has to survive all of
     * them: while the general map is on screen the cards are re-rendered anyway, and with a shared
     * registry the map would be thrown away on the first filter change.
     */
    _destroyFullMap() {
        const handle = this._fullMapHandle;
        if (!handle)
            return;
        this._fullMapHandle = null;
        handle.overlay.setMap(null);
        handle.map.setTarget(undefined);
        handle.map.dispose();
    }
    /**
     * Write (or clear) the message above the general map's canvas. `state` is the `data-state` the
     * SCSS keys on and `null` means "nothing to say", which also hides the box: with points on screen
     * it would take height away from the map for nothing.
     *
     * Every message is in Spanish because that is the language of the whole component, and all of them
     * are of the visible kind only in API mode, because in local mode the points are already in memory
     * and there is no request to wait for.
     *
     * The loading state also writes `aria-busy` on the canvas —the same flag `_renderApiLoading` puts on
     * the list—, and this is the only place that touches it: a flag kept next to the message it belongs
     * to cannot desync from it.
     */
    _setFullMapStatus(state, text) {
        const el = this.fullMapStatus;
        if (!el)
            return;
        if (state === null) {
            el.textContent = '';
            el.hidden = true;
            el.removeAttribute('data-state');
            this.fullMapCanvas?.removeAttribute('aria-busy');
            return;
        }
        el.textContent = text;
        el.setAttribute('data-state', state);
        el.hidden = false;
        if (state === FULLMAP_STATE_LOADING)
            this.fullMapCanvas?.setAttribute('aria-busy', 'true');
        else
            this.fullMapCanvas?.removeAttribute('aria-busy');
    }
    /** Build the "Videos vinculados" HTML block */
    _buildVideosHtml(card) {
        if (!card.links_videos || !card.links_videos.length)
            return '';
        return `<div class="card-videos"><div class="card-subtitle card-iframe-subtitle">Videos vinculados</div><div class="card-videos-list">${card.links_videos
            .map((link) => this._parseLinkWeb(link))
            .filter((parsed) => parsed !== null)
            .map((parsed) => this._buildEmbed(parsed))
            .join('')}</div></div>`;
    }
    /** Build the inline "Imágenes" HTML block */
    _buildInlineImagesHtml(card) {
        if (!this.inlineImages || !card.imagenes || !card.imagenes.length)
            return '';
        return `<div class="card-inline-images"><div class="card-subtitle">Imágenes</div><div class="card-inline-images-list">${card.imagenes
            .map((img, i) => `<button class="card-inline-thumb" data-index="${i}"><img src="${this._encodeFileName(img.thumb)}" alt="" loading="lazy"></button>`)
            .join('')}</div></div>`;
    }
    /**
     * Build the inline "Adjuntos" HTML block.
     *
     * El `download` va **sin valor** a propósito (el browser deriva el nombre del último segmento de la
     * URL, y así el atributo no suma otra interpolación al markup) y solo se respeta same-origin, así
     * que el `target="_blank"` se queda como fallback. El nombre se escapa siempre: `adjuntos` viene del
     * pipeline de scraping externo y va a un `title` y a texto de nodo.
     */
    _buildInlineAdjuntosHtml(card) {
        if (!this.inlineAdjuntos || !card.adjuntos || !card.adjuntos.length)
            return '';
        return `<div class="card-inline-adjuntos"><div class="card-subtitle">Adjuntos</div><div class="card-inline-adjuntos-list">${card.adjuntos
            .map((a) => {
            const ext = this._getFileExt(a);
            const name = a.substring(a.lastIndexOf('/') + 1);
            return `<a class="card-inline-adjunto${ext === 'pdf' ? ' card-inline-adjunto-pdf' : ''}" href="${this._encodeFileName(a)}" download target="_blank" rel="noopener" title="${this._escapeHtml(name)}">${this._fileIconSvg(ext)}<span class="card-inline-adjunto-name">${this._escapeHtml(name)}</span></a>`;
        })
            .join('')}</div></div>`;
    }
    /** Build the card actions bar (screenshot, imágenes, adjuntos, abrir, editar) */
    _buildActionsHtml(card) {
        const imgCount = (card.imagenes || []).length;
        const adjCount = (card.adjuntos || []).length;
        return `<div class="card-actions-row">
        ${card.screenshot
            ? '<button class="card-actions-btn card-screenshot-btn" title="Captura de pantallla de la fuente"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144.12 144" width="14" height="14"><path d="M78.64,116.38q-18.12,0-36.22,0c-6.27,0-10.66-4.39-10.66-10.68q0-22.31,0-44.61A10.44,10.44,0,0,1,36.23,52a1.13,1.13,0,0,0,.49-1.11c0-1.36,0-2.72,0-4.08,0-1.92.39-2.51,2.29-2.89a15.06,15.06,0,0,1,6.41,0c1.54.36,2.06,1.14,2.09,2.74,0,1.15-.5,2.67.23,3.32s2.13.17,3.24.18c1.68,0,3.36-.06,5,0,1,.05,1.27-.26,1.36-1.22a12.06,12.06,0,0,1,7.79-10.66,13.4,13.4,0,0,1,5.22-1.08c5.56,0,11.12-.11,16.67,0,6.25.14,11.68,3.88,12.91,10.5A2,2,0,0,1,100,48c.1.71-.16,1.74.35,2.05s1.55.15,2.34.15h12.48a10.13,10.13,0,0,1,10.48,10.25q.1,22.85,0,45.69a10.13,10.13,0,0,1-10.46,10.27Q96.93,116.4,78.64,116.38Zm0-61.24A26.93,26.93,0,1,0,79.23,109c14.27-.16,26.3-12.34,26.31-26.91A26.91,26.91,0,0,0,78.68,55.14Z" transform="translate(-6.66 -4.82)"/><path d="M31.12,4.82H49.24a6.16,6.16,0,0,1,6.17,6.37,6.24,6.24,0,0,1-6.16,6.55q-14.22,0-28.43,0c-.92,0-1.18.2-1.18,1.15,0,9.48,0,19,0,28.43,0,3.33-2.34,5.73-5.93,6.16a6.46,6.46,0,0,1-6.86-4.59,5.16,5.16,0,0,1-.12-1.3q0-18.48,0-36.95a5.88,5.88,0,0,1,5.78-5.8C18.72,4.81,24.92,4.82,31.12,4.82Z" transform="translate(-6.66 -4.82)"/><path d="M126.32,148.77c-6,0-12.08-.13-18.11,0a6.31,6.31,0,0,1-6.08-7.35c.62-3.77,2.86-5.62,6.65-5.62,9.27,0,18.55,0,27.83,0,1.07,0,1.19-.35,1.18-1.27q0-14.16,0-28.31c0-3.34,2.3-5.71,5.93-6.17a6.51,6.51,0,0,1,6.83,4.46,4.94,4.94,0,0,1,.15,1.42q0,18.42,0,36.83a5.9,5.9,0,0,1-5.89,5.93H126.32Z" transform="translate(-6.66 -4.82)"/><path d="M150.7,29.18c0,5.92-.24,11.85.07,17.75.26,4.79-5.22,8.24-9.85,5.68a5.75,5.75,0,0,1-3.15-5.37c0-9.44,0-18.87,0-28.31,0-1-.29-1.21-1.25-1.21q-14.16.06-28.31,0c-3.35,0-5.73-2.24-6.14-5.91A6.39,6.39,0,0,1,106.51,5a5.34,5.34,0,0,1,1.42-.16h36.94a5.92,5.92,0,0,1,5.82,5.88Q150.7,20,150.7,29.18Z" transform="translate(-6.66 -4.82)"/><path d="M6.74,124.42c0-5.92.25-11.85-.07-17.75-.26-4.78,5.22-8.25,9.85-5.68a5.75,5.75,0,0,1,3.15,5.37c0,9.44,0,18.87,0,28.31,0,1,.28,1.21,1.25,1.21q14.14-.06,28.3,0c3.36,0,5.73,2.23,6.15,5.91a6.39,6.39,0,0,1-4.41,6.85,4.94,4.94,0,0,1-1.42.15H12.57a5.93,5.93,0,0,1-5.82-5.88Q6.74,133.65,6.74,124.42Z" transform="translate(-6.66 -4.82)"/><path d="M94.38,82.05A15.66,15.66,0,1,1,78.72,66.26,15.72,15.72,0,0,1,94.38,82.05Z" transform="translate(-6.66 -4.82)"/></svg> Captura</button>'
            : ''}
        ${imgCount > 0 && !this.inlineImages
            ? '<button class="card-actions-btn card-images-btn" title="Ver imágenes"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Imágenes <span class="card-actions-count">' +
                imgCount +
                '</span></button>'
            : ''}
        ${adjCount > 0 && !this.inlineAdjuntos
            ? `<div class="card-adjuntos"><button class="card-actions-btn card-adjuntos-btn" title="Ver adjuntos"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Adjuntos <span class="card-actions-count">${adjCount}</span></button><div class="card-adjuntos-menu">${(card.adjuntos || [])
                .map((a) => `<a class="card-adjunto-link" href="${this._encodeFileName(a)}" download target="_blank" rel="noopener">${this._escapeHtml(a.substring(a.lastIndexOf('/') + 1))}</a>`)
                .join('')}</div></div>`
            : ''}
        ${card.link_web
            ? `<a class="card-actions-btn card-open" href="${card.link_web}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Visitar
        </a>`
            : ''}
        ${this.internalButtons && card.link_edit_entry
            ? `<a class="card-actions-btn card-edit" href="${card.link_edit_entry}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          Editar
        </a>`
            : ''}
      </div>`;
    }
    /** Build the "Información" menu rows (ID, Tipo, Oficial, Captura) */
    _buildInfoMenuHtml(card) {
        const viewEntry = card.link_view_entry;
        const idRow = viewEntry
            ? `<a class="card-info-link" href="${viewEntry}" target="_blank" rel="noopener" title="Ver en vista individual">
          <span class="card-info-value">${card.id}</span>${this._externalLinkIconSvg()}
        </a>`
            : `<span class="card-info-value">${card.id}</span>`;
        return `<div class="card-info-row">
        <span class="card-info-label">ID</span>
        ${idRow}
      </div>
      <div class="card-info-row">
        <span class="card-info-label">Tipo</span>
        <span class="card-info-value">${card.tipo_fuente || 'Sin tipo'}</span>
      </div>
      <div class="card-info-row">
        <span class="card-info-label">Oficial</span>
        <span class="card-info-value">${card.es_oficial ? 'Sí' : 'No'}</span>
      </div>
      <div class="card-info-row">
        <span class="card-info-label">Captura</span>
        <span class="card-info-value">${this._formatDateTime(card.fecha_scrapeo)}</span>
      </div>`;
    }
    /**
     * Build the taxonomy navigation block shown at the foot of the expanded card
     * (`item.taxonomias`, i.e. the field the detail endpoint returns). Every group
     * renders its label as a heading (cropped by CSS, with the full text in the
     * `title`) and its items as links.
     *
     * Groups with more than `TAXONOMY_VISIBLE_LINKS` links render only the first
     * ones: the rest go in the markup as hidden `li` and a "Ver más (N)" button
     * toggles them, so no link is lost and no extra fetch is needed.
     *
     * Groups with no label, no items, or items with no content/link are ignored,
     * and an empty string is returned when nothing is renderable so no orphan
     * markup is left in the DOM.
     */
    _buildTaxonomies(taxonomias) {
        if (!Array.isArray(taxonomias))
            return '';
        const groups = taxonomias
            .filter((tax) => tax && tax.label && Array.isArray(tax.items) && tax.items.length)
            .map((tax) => {
            const valid = tax.items.filter((item) => item && item.link && item.content);
            if (!valid.length)
                return '';
            const renderLink = (item) => `<a class="card-taxonomy-link" href="${this._escapeHtml(item.link)}" target="_blank" rel="noopener">${this._escapeHtml(item.content)}</a>`;
            const items = valid
                .slice(0, TAXONOMY_VISIBLE_LINKS)
                .map((item) => `<li>${renderLink(item)}</li>`)
                .join('');
            const overflow = valid.slice(TAXONOMY_VISIBLE_LINKS);
            const overflowItems = overflow
                .map((item) => `<li class="card-taxonomy-extra" hidden>${renderLink(item)}</li>`)
                .join('');
            const toggle = overflow.length
                ? `<li class="card-taxonomy-more-item"><button type="button" class="card-taxonomy-more" aria-expanded="false">Ver más (${overflow.length})</button></li>`
                : '';
            const label = this._escapeHtml(tax.label);
            return `<div class="card-taxonomy">
          <div class="card-taxonomy-label" title="${label}">${label}</div>
          <ul class="card-taxonomy-list">${items}${overflowItems}${toggle}</ul>
        </div>`;
        })
            .filter((group) => group !== '');
        if (!groups.length)
            return '';
        return `<div class="card-taxonomies">${groups.join('')}</div>`;
    }
    /**
     * Bind the "Ver más" toggles of the taxonomy navigation block rendered inside
     * `root` (the `.card-taxonomies-slot` of a card), for the groups that overflow
     * `TAXONOMY_VISIBLE_LINKS`. Each toggle is independent: it shows/hides only its
     * own group, adding `expanded` to the `ul` (the class is what the component
     * CSS keys on, the `hidden` attribute is kept in sync for the case where the
     * stylesheet is not loaded).
     */
    _bindTaxonomyToggles(root) {
        root.querySelectorAll('.card-taxonomy-more').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const button = e.currentTarget;
                const list = button.closest('.card-taxonomy-list');
                if (!list)
                    return;
                const extras = list.querySelectorAll('.card-taxonomy-extra');
                const expanded = button.getAttribute('aria-expanded') === 'true';
                list.classList.toggle('expanded', !expanded);
                extras.forEach((extra) => {
                    extra.hidden = expanded;
                });
                button.setAttribute('aria-expanded', String(!expanded));
                button.textContent = expanded ? `Ver más (${extras.length})` : 'Ver menos';
            });
        });
    }
    /** Fill the card detail slots and bind their interactions */
    _injectCardDetail(cardEl, card) {
        const actionsEl = cardEl.querySelector('.card-actions');
        const descSlot = cardEl.querySelector('.card-desc-slot');
        const temasSlot = cardEl.querySelector('.card-temas-slot');
        const protagFuenteSlot = cardEl.querySelector('.card-protag-fuente-slot');
        const mediaSlot = cardEl.querySelector('.card-media-slot');
        const videosSlot = cardEl.querySelector('.card-videos-slot');
        const taxonomiasSlot = cardEl.querySelector('.card-taxonomies-slot');
        if (actionsEl) {
            actionsEl.innerHTML = this._buildActionsHtml(card);
            const screenshotBtn = actionsEl.querySelector('.card-screenshot-btn');
            if (screenshotBtn) {
                screenshotBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._openLightGallery([{ thumb: card.screenshot, full: card.screenshot }], card.nombre_fuente, false, 0);
                });
            }
            const imagesBtn = actionsEl.querySelector('.card-images-btn');
            if (imagesBtn) {
                imagesBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (card.imagenes && card.imagenes.length) {
                        this._openLightGallery(card.imagenes, card.nombre_fuente, true);
                    }
                });
            }
            const adjuntosWrap = actionsEl.querySelector('.card-adjuntos');
            if (adjuntosWrap) {
                const adjuntosBtn = adjuntosWrap.querySelector('.card-adjuntos-btn');
                const adjuntosMenu = adjuntosWrap.querySelector('.card-adjuntos-menu');
                adjuntosBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    adjuntosMenu.classList.toggle('open');
                    const infoMenu = cardEl.querySelector('.card-info-menu');
                    if (infoMenu)
                        infoMenu.classList.remove('open');
                });
            }
        }
        if (descSlot && card.resumen_ia) {
            descSlot.innerHTML = `<div class="card-desc">${card.resumen_ia}</div>`;
        }
        if (temasSlot) {
            // The located list is computed once and shared: the markup numbers the legend from it and
            // the map numbers the markers from it, so both read the same indexes.
            const located = this._temasLocated(card.temas || []);
            temasSlot.innerHTML = this._buildTemasHtml(card, located);
            this._bindTemasMapToggle(temasSlot, located);
        }
        if (protagFuenteSlot) {
            protagFuenteSlot.innerHTML = this._buildProtagonistaHtml(card) + this._buildFuenteHtml(card);
            this._bindProtagonista(protagFuenteSlot, card);
        }
        if (mediaSlot) {
            mediaSlot.innerHTML = this._buildInlineImagesHtml(card) + this._buildInlineAdjuntosHtml(card);
            mediaSlot.querySelectorAll('.card-inline-thumb').forEach((thumb) => {
                const img = thumb.querySelector('img');
                if (img) {
                    img.addEventListener('load', () => thumb.classList.add('loaded'));
                    if (img.complete)
                        thumb.classList.add('loaded');
                }
            });
            const inlineImages = mediaSlot.querySelector('.card-inline-images');
            if (inlineImages) {
                inlineImages.addEventListener('click', (e) => {
                    const thumb = e.target.closest('.card-inline-thumb');
                    if (!thumb)
                        return;
                    e.stopPropagation();
                    const index = Number(thumb.dataset.index) || 0;
                    this._openLightGallery(card.imagenes, card.nombre_fuente, true, index);
                });
            }
        }
        if (videosSlot) {
            videosSlot.innerHTML = this._buildVideosHtml(card);
            videosSlot.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
                const iframe = wrap.querySelector('iframe');
                if (iframe) {
                    iframe.addEventListener('load', () => wrap.classList.add('loaded'));
                    if (iframe.contentDocument?.readyState === 'complete')
                        wrap.classList.add('loaded');
                }
            });
        }
        if (taxonomiasSlot) {
            taxonomiasSlot.innerHTML = this._buildTaxonomies(card.taxonomias);
            this._bindTaxonomyToggles(taxonomiasSlot);
        }
        const embedSlot = cardEl.querySelector('.card-embed-slot');
        if (embedSlot) {
            const embedUrl = card.link_web ? this._parseLinkWeb(card.link_web) : null;
            if (embedUrl) {
                embedSlot.innerHTML = `<div class="card-embed"><div class="card-subtitle card-iframe-subtitle">Publicación original</div>${this._buildEmbed(embedUrl)}</div>`;
                embedSlot.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
                    const iframe = wrap.querySelector('iframe');
                    if (iframe) {
                        iframe.addEventListener('load', () => wrap.classList.add('loaded'));
                        if (iframe.contentDocument?.readyState === 'complete')
                            wrap.classList.add('loaded');
                    }
                });
            }
        }
        const infoMenuEl = cardEl.querySelector('.card-info-menu');
        if (infoMenuEl) {
            infoMenuEl.innerHTML = this._buildInfoMenuHtml(card);
        }
        cardEl.dataset.detailLoaded = '1';
    }
    /**
     * Ensure the full detail of the card is present (fetches it when missing), and resolve with the
     * payload that was injected — `null` when nothing was injected (already loaded, no api, no id or
     * a failed fetch).
     *
     * The callers that only care about the side effect ignore the value; `_openFullMapCard` needs it
     * because in api mode the card it holds is a summary, which carries no `temas`.
     */
    async _ensureCardDetail(cardEl) {
        if (cardEl.dataset.detailLoaded)
            return null;
        if (!this.api)
            return null;
        const id = cardEl.dataset.cardId;
        if (!id)
            return null;
        const cached = this._apiDetails.get(id);
        if (cached) {
            this._injectCardDetail(cardEl, cached);
            return cached;
        }
        const detail = await this._fetchDetail(id);
        if (detail) {
            this._injectCardDetail(cardEl, detail);
            this._preloadEmbedLibraries();
            return detail;
        }
        return null;
    }
    /** Process the lazy social embeds (Instagram, Twitter, Facebook) once the card is expanded */
    _processCardEmbeds(cardEl) {
        const igWraps = cardEl.querySelectorAll('.card-iframe-instagram');
        if (igWraps.length) {
            setTimeout(() => {
                igWraps.forEach((igWrap) => {
                    if (!igWrap.querySelector('.instagram-media')) {
                        const embedUrl = igWrap.getAttribute('data-embed-url');
                        if (embedUrl) {
                            const blockquote = document.createElement('blockquote');
                            blockquote.className = 'instagram-media';
                            blockquote.setAttribute('data-instgrm-permalink', embedUrl);
                            blockquote.setAttribute('data-instgrm-version', '14');
                            blockquote.style.cssText =
                                'background:#FFF;border:0;border-radius:3px;margin:1px;max-width:100%;min-width:326px;padding:0;width:calc(100% - 2px)';
                            igWrap.insertAdjacentElement('afterbegin', blockquote);
                        }
                    }
                });
                if (typeof instgrm !== 'undefined' && instgrm.Embeds) {
                    instgrm.Embeds.process();
                }
                else if (!cardEl.querySelector('.card-iframe-instagram iframe')) {
                    const waitForInstgrm = setInterval(() => {
                        if (typeof instgrm !== 'undefined' && instgrm.Embeds) {
                            instgrm.Embeds.process();
                            clearInterval(waitForInstgrm);
                        }
                    }, 200);
                    setTimeout(() => clearInterval(waitForInstgrm), 15000);
                }
                igWraps.forEach((igWrap) => {
                    if (!igWrap.classList.contains('loaded')) {
                        const check = setInterval(() => {
                            const iframe = igWrap.querySelector('iframe');
                            if (!iframe)
                                return;
                            clearInterval(check);
                            iframe.addEventListener('load', () => igWrap.classList.add('loaded'), { once: true });
                            setTimeout(() => igWrap.classList.add('loaded'), 3000);
                        }, 100);
                        setTimeout(() => igWrap.classList.add('loaded'), 10000);
                    }
                });
            }, 150);
        }
        const twWraps = cardEl.querySelectorAll('.card-iframe-twitter');
        if (twWraps.length) {
            setTimeout(() => {
                twWraps.forEach((twWrap) => {
                    if (!twWrap.querySelector('iframe')) {
                        if (typeof twttr !== 'undefined' && twttr.widgets) {
                            twttr.widgets.load(twWrap);
                        }
                        else {
                            const waitForTwttr = setInterval(() => {
                                if (typeof twttr !== 'undefined' && twttr.widgets) {
                                    twttr.widgets.load(twWrap);
                                    clearInterval(waitForTwttr);
                                }
                            }, 200);
                            setTimeout(() => clearInterval(waitForTwttr), 15000);
                        }
                    }
                });
                twWraps.forEach((twWrap) => {
                    if (!twWrap.classList.contains('loaded')) {
                        const check = setInterval(() => {
                            const iframe = twWrap.querySelector('iframe');
                            if (!iframe)
                                return;
                            clearInterval(check);
                            iframe.addEventListener('load', () => twWrap.classList.add('loaded'), { once: true });
                            setTimeout(() => twWrap.classList.add('loaded'), 3000);
                        }, 100);
                        setTimeout(() => twWrap.classList.add('loaded'), 10000);
                    }
                });
            }, 150);
        }
        const fbWraps = cardEl.querySelectorAll('.card-iframe-facebook');
        if (fbWraps.length) {
            setTimeout(() => {
                fbWraps.forEach((fbWrap) => {
                    if (!fbWrap.querySelector('iframe')) {
                        if (typeof FB !== 'undefined' && FB.XFBML) {
                            FB.XFBML.parse(fbWrap);
                        }
                        else {
                            const waitForFB = setInterval(() => {
                                if (typeof FB !== 'undefined' && FB.XFBML) {
                                    FB.XFBML.parse(fbWrap);
                                    clearInterval(waitForFB);
                                }
                            }, 200);
                            setTimeout(() => clearInterval(waitForFB), 15000);
                        }
                    }
                });
                fbWraps.forEach((fbWrap) => {
                    if (!fbWrap.classList.contains('loaded')) {
                        const check = setInterval(() => {
                            const iframe = fbWrap.querySelector('iframe');
                            if (!iframe)
                                return;
                            clearInterval(check);
                            iframe.addEventListener('load', () => fbWrap.classList.add('loaded'), { once: true });
                            setTimeout(() => fbWrap.classList.add('loaded'), 3000);
                        }, 100);
                        setTimeout(() => fbWrap.classList.add('loaded'), 10000);
                    }
                });
            }, 150);
        }
        const videoWraps = cardEl.querySelectorAll('.card-iframe-video');
        if (videoWraps.length) {
            videoWraps.forEach((videoWrap) => {
                const video = videoWrap.querySelector('video');
                if (!video)
                    return;
                const applyRatio = () => {
                    const width = video.videoWidth;
                    const height = video.videoHeight;
                    if (width > 0 && height > 0) {
                        videoWrap.style.aspectRatio = `${width} / ${height}`;
                    }
                };
                // El ratio real viene de la metadata, que el browser pide solo cuando el `<video>` se
                // vuelve visible (por eso el `loading="lazy"` del markup). El `aspect-ratio: 16 / 9` del
                // SCSS es el fallback mientras tanto, y se pisa acá con el del archivo.
                if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
                    applyRatio();
                }
                video.addEventListener('loadedmetadata', applyRatio, { once: true });
            });
        }
    }
    /** Insert an element before the timeline footer, or append if no footer */
    _insertBeforeFooter(el) {
        const footer = this.timelineCards.querySelector('.timeline-footer-item');
        if (footer) {
            this.timelineCards.insertBefore(el, footer);
        }
        else {
            this.timelineCards.appendChild(el);
        }
    }
    /**
     * Insert an element at the end of the cards, that is: before the first element of the
     * trailing block (load-more button, paginator, status row, footer), which is what keeps the
     * append order identical to the one `_renderTimeline` + `_renderLoadMoreButton` + `_renderStatus`
     * build. `querySelector` returns the first match in document order, so the load-more button
     * or the paginator wins when one of them is there.
     */
    _insertBeforeTrailing(el) {
        const anchor = this.timelineCards.querySelector('.timeline-load-more-item, .timeline-paginator-item, .timeline-status-item, .timeline-footer-item');
        if (anchor) {
            this.timelineCards.insertBefore(el, anchor);
        }
        else {
            this.timelineCards.appendChild(el);
        }
    }
    /**
     * Render the timeline cards list, including the last-updated footer.
     *
     * `instant` is the mode API's: it says the list was replaced by skeleton placeholders that are
     * being taken down right now, so the cards land on the spot the placeholders already occupied
     * and must not replay the entrance transition. They are born with `visible`, exactly like the
     * placeholders are (`_appendTimelineSkeleton`), and because the class is there on their first
     * style resolution there is no previous computed value to transition from — same reason the
     * `requestAnimationFrame` in `_renderAll` is what makes the animation happen when it should.
     * The caller's only job is to not set up the observer for them: its whole effect is adding
     * `visible`, which they already have.
     */
    _renderTimeline(cards, instant = false) {
        // Before the wipe, not after: dropping the cards does not dispose the OpenLayers maps they
        // were holding. This and `_renderApiLoading` are the only two places that empty the list.
        this._destroyTemasMaps();
        this.timelineCards.innerHTML = '';
        if (cards.length === 0) {
            const el = document.createElement('div');
            el.className = 'timeline-item timeline-empty-item';
            el.innerHTML = `
        <div class="timeline-date-col"></div>
        <div class="timeline-empty-text">Sin publicaciones para mostrar</div>
      `;
            this.timelineCards.appendChild(el);
        }
        else {
            cards.forEach((card, i) => {
                const el = this._createTimelineItem(card, i);
                if (instant)
                    el.classList.add('visible');
                this.timelineCards.appendChild(el);
            });
        }
        this._renderLastUpdated();
    }
    /**
     * Add cards at the end of the list **without touching the ones already rendered**, and return
     * the created nodes so the entrance animation can be observed on them alone.
     *
     * This is the counterpart of `_renderTimeline` for pagination: that one wipes
     * `#timeline-cards` because its callers replaced the whole result set (page 1 after a
     * search/filter/sort change, a taxonomy re-scope), and a rebuild is the honest thing to do
     * when the articles on screen are no longer the ones in memory. "Cargar más" is not that:
     * the cards already on screen are still correct, and a rebuild would make every one of them
     * lose the `visible` class and replay its entrance transition (the whole list blinking on
     * each page), drop the detail injected in the expanded ones, and reload every image.
     */
    _appendTimelineItems(items, startIndex) {
        // `_renderTimeline` only writes the "nothing to show" placeholder when the list comes back
        // empty. Appending cards makes it untrue, so it goes before the first real one lands.
        if (items.length) {
            this.timelineCards.querySelectorAll('.timeline-empty-item').forEach((el) => el.remove());
        }
        const added = [];
        items.forEach((card, i) => {
            const el = this._createTimelineItem(card, startIndex + i);
            this._insertBeforeTrailing(el);
            added.push(el);
        });
        return added;
    }
    /**
     * Write (or rewrite) the last-updated footer at the end of the timeline. Extracted from
     * `_renderTimeline` because in API mode `lastUpdated` arrives with the facets response,
     * which is requested long after the page that rendered the timeline: patching the footer
     * avoids re-rendering the timeline and losing a card the user already expanded.
     */
    _renderLastUpdated() {
        this.timelineCards.querySelectorAll('.timeline-footer-item').forEach((f) => f.remove());
        if (!this.lastUpdated)
            return;
        const d = new Date(this.lastUpdated);
        const formatted = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) +
            ' a las ' +
            d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const el = document.createElement('div');
        el.className = 'timeline-item timeline-footer-item';
        el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-footer-dot"></div>
      </div>
      <div class="timeline-footer-text">Actualizado por última vez el ${formatted}.</div>
    `;
        this.timelineCards.appendChild(el);
    }
    /** Set up IntersectionObserver for the featured cards entrance animation */
    _setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const cards = this.featuredContainer.querySelectorAll('.featured-card');
                    cards.forEach((c) => c.classList.add('visible'));
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        observer.observe(this.section);
    }
    /**
     * Set up IntersectionObserver for the timeline items entrance animation.
     *
     * `items` narrows what gets observed, which is what pagination needs: after an append the
     * cards already on screen are visible and their own observer has already done its job, so
     * there is nothing to re-observe. Default is every `.timeline-item` in the container.
     */
    _setupTimelineObserver(items) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px 100px 0px' });
        const targets = items ?? this.container.querySelectorAll('.timeline-item');
        Array.from(targets).forEach((item) => {
            observer.observe(item);
        });
    }
    /**
     * Dynamically load social media embed scripts (Instagram, Twitter, Facebook) as needed.
     *
     * `'video'` no aparece en ningún branch: no hay SDK que cargar. Entra al set de tipos y ahí se
     * queda, igual que `'youtube'` (nativo, sin script).
     */
    _preloadEmbedLibraries() {
        const types = new Set();
        this.allCards.forEach((card) => {
            const urls = [];
            if (card.link_web)
                urls.push(card.link_web);
            if (card.links_videos && card.links_videos.length)
                urls.push(...card.links_videos);
            urls.forEach((url) => {
                const parsed = this._parseLinkWeb(url);
                if (parsed)
                    types.add(parsed.type);
            });
        });
        this.container.querySelectorAll('.card-iframe-wrap').forEach((wrap) => {
            const cls = wrap.classList;
            if (cls.contains('card-iframe-instagram'))
                types.add('instagram');
            else if (cls.contains('card-iframe-twitter'))
                types.add('twitter');
            else if (cls.contains('card-iframe-facebook'))
                types.add('facebook');
            else if (cls.contains('card-iframe-youtube'))
                types.add('youtube');
        });
        const _watchEmbeds = (selector) => {
            const scan = setInterval(() => {
                const wraps = document.querySelectorAll(selector);
                let pending = 0;
                wraps.forEach((wrap) => {
                    if (wrap.classList.contains('loaded'))
                        return;
                    const iframe = wrap.querySelector('iframe');
                    if (!iframe) {
                        pending++;
                        return;
                    }
                    iframe.addEventListener('load', () => wrap.classList.add('loaded'), { once: true });
                    pending++;
                });
                if (pending === 0)
                    clearInterval(scan);
            }, 200);
            setTimeout(() => clearInterval(scan), 15000);
        };
        const loadScript = (src) => {
            return new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = src;
                s.async = true;
                s.onload = () => resolve();
                s.onerror = () => resolve();
                document.head.appendChild(s);
            });
        };
        // Twitter can load in parallel (no conflict with other SDKs)
        if (types.has('twitter') && !document.querySelector('script[src*="platform.twitter.com/widgets.js"]')) {
            loadScript(TWITTER_WIDGETS_SCRIPT).then(() => {
                _watchEmbeds('.card-iframe-twitter');
            });
        }
        // Instagram must finish before Facebook, because Facebook's SDK
        // sets window.FB which causes Instagram's embed.js to skip its
        // initialization (embed.js checks: (window.FB && !window.FB.__buffer))
        const loadInstagram = types.has('instagram') && !document.querySelector('script[src*="instagram.com/embed.js"]')
            ? loadScript(INSTAGRAM_EMBED_SCRIPT).then(() => {
                _watchEmbeds('.card-iframe-instagram');
            })
            : Promise.resolve();
        loadInstagram.then(() => {
            if (types.has('facebook') && !document.querySelector('script[src*="connect.facebook.net"]')) {
                if (!document.getElementById('fb-root')) {
                    const fbRoot = document.createElement('div');
                    fbRoot.id = 'fb-root';
                    document.body.prepend(fbRoot);
                }
                const s = document.createElement('script');
                s.src = FACEBOOK_SDK_URL;
                s.async = true;
                s.defer = true;
                s.crossOrigin = 'anonymous';
                s.onload = () => {
                    _watchEmbeds('.card-iframe-facebook');
                };
                document.head.appendChild(s);
            }
        });
    }
    /**
     * Turn the expanded state on (classes, icon and aria) without flipping `isExpanded`.
     * Shared by the toggle and by `_init` when the `startExpanded` option is set, so the
     * initial state and a click end up with exactly the same DOM.
     */
    _applyExpandState() {
        this.section.classList.add('expanded');
        this.timelineContainer.classList.add('expanded');
        this.expandIcon.classList.add('rotated');
        this.expandToggle.setAttribute('aria-expanded', 'true');
    }
    /** Mirror of _applyExpandState for the collapsed state */
    _collapseExpandState() {
        this.section.classList.remove('expanded');
        this.timelineContainer.classList.remove('expanded');
        this.expandIcon.classList.remove('rotated');
        this.expandToggle.setAttribute('aria-expanded', 'false');
    }
    /** Toggle between expanded (timeline visible) and collapsed state */
    _toggleExpand(scrollTo = false) {
        // En fullpage el timeline no se colapsa nunca. El click del botón ya no se bindea, pero
        // esta guarda también cubre los otros dos caminos que llegan acá (#featured-cards y la
        // fila de arriba) sin tener que repetir la condición en cada listener.
        if (this.fullpage)
            return;
        // Con el mapa general en pantalla el timeline está `hidden`, así que colapsarlo o abrirlo no se
        // vería: lo que haría es dejar el estado cambiado a ciegas, y al cerrar el mapa el usuario se
        // encontraría con el timeline abierto sin haberlo pedido. Congelado queda, entonces, y al cerrar
        // el mapa reaparece exactamente como estaba.
        if (this._fullMapOpen)
            return;
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
            this._applyExpandState();
            requestAnimationFrame(() => {
                this._setupTimelineObserver();
            });
            // The facets (counts, collection total, lastUpdated) are already loaded at startup; this
            // is a cache hit that also covers the case where that request failed: no re-request.
            if (this.api)
                void this._ensureApiFacets();
            this._preloadEmbedLibraries();
        }
        else {
            const cards = this.featuredContainer.querySelectorAll('.featured-card');
            cards.forEach((c) => (c.style.transition = 'none'));
            cards.forEach((c) => c.classList.remove('visible'));
            void this.featuredContainer.offsetHeight;
            cards.forEach((c) => (c.style.transition = ''));
            this._collapseExpandState();
            this.container.querySelectorAll('.timeline-item').forEach((item) => {
                item.classList.remove('visible');
            });
            if (scrollTo)
                this._scrollToSection();
            setTimeout(() => {
                cards.forEach((c) => c.classList.add('visible'));
            }, 100);
        }
    }
    /**
     * The element that actually scrolls a given one, or `null` when it is the viewport.
     *
     * Walks up from `el` looking for the first box with a scrollable `overflow`, so it works both
     * when the page (or the window) is what scrolls and when the consumer mounts the component
     * inside a scrollable container of their own. Returns `null` instead of falling back to the
     * window, so each caller can scroll however it wants to (smoothly or not).
     */
    _findScrollContainer(el) {
        let node = el;
        while (node) {
            const style = getComputedStyle(node);
            if (style.overflowY === 'auto' ||
                style.overflowY === 'scroll' ||
                style.overflow === 'auto' ||
                style.overflow === 'scroll') {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    }
    /** Scroll the page/section to make the timeline container visible */
    _scrollToSection() {
        const offset = 60;
        const rect = this.section.getBoundingClientRect();
        const scroller = this._findScrollContainer(this.section.parentElement);
        if (scroller) {
            scroller.scrollTo({ top: scroller.scrollTop + rect.top - offset, behavior: 'smooth' });
            return;
        }
        window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'smooth' });
    }
    /**
     * Bring the timeline back to its first card, after the list was replaced (a page change, or a
     * search/filter/sort change that reset to page 1).
     *
     * In the default mode `#timeline-cards` is the scroll box itself (`max-height` + `overflow-y`),
     * so resetting its `scrollTop` is all it takes. **Fullpage is the exception**: the SCSS takes
     * the list out of its own scroll box (`max-height: none; overflow: visible`) and makes the
     * page scroll, so the same assignment is a no-op there — the timeline would keep the scroll
     * position of the page it was on, and landing on page 2 of 4 would show its middle. The scroll
     * therefore has to happen on whatever actually scrolls, found by walking up the ancestors
     * (`_findScrollContainer`), with the window as the last resort.
     *
     * The target is the top of the list right **under the sticky toolbar** (`.featured-row`, which
     * is `position: sticky` in fullpage), not the top of the scroller: scrolling all the way up
     * would leave the toolbar overlapping the first cards, and the offset is read from the live
     * `getBoundingClientRect()` of that row so it follows whatever height the toolbar ends up
     * having, including the consumer's own `--tv-sticky-top`.
     *
     * Instant, unlike `_scrollToSection`: the list the scroll would travel through was just
     * replaced, so animating it means scrolling across cards that are already gone.
     */
    _scrollToTimelineTop() {
        if (!this.fullpage) {
            this.timelineCards.scrollTop = 0;
            return;
        }
        const rect = this.timelineCards.getBoundingClientRect();
        const toolbarBottom = this.featuredRow ? this.featuredRow.getBoundingClientRect().bottom : 0;
        // How far the top of the list is from where it should sit under the toolbar: positive means
        // the list is too low and the scroller has to go down, negative means it is already scrolled
        // past it and the scroller has to come back up.
        const delta = rect.top - toolbarBottom;
        if (delta === 0)
            return;
        const scroller = this._findScrollContainer(this.timelineCards.parentElement);
        if (scroller) {
            scroller.scrollTop = scroller.scrollTop + delta;
        }
        else {
            window.scrollTo(0, window.scrollY + delta);
        }
    }
    /**
     * Apply the chosen sorter and direction, and refresh the list. Mirror of a filter change: in
     * local mode the pool is re-ordered in place, and in API mode the order is resolved by the
     * server, so it starts a page reload. The `asc` class keeps the button's icon pointing the same
     * way the direction does.
     */
    _applySort(field, asc) {
        this._sortField = field;
        this._sortAsc = asc;
        this.sortToggle?.classList.toggle('asc', asc);
        this._applyFilters(true);
    }
    /** Apply the persisted work-notes visibility state to the section and toggle button */
    _applyWorkNotesState() {
        if (!this.workNotesToggle)
            return;
        let hidden = false;
        try {
            hidden = window.localStorage.getItem(WORK_NOTES_STORAGE_KEY) === '1';
        }
        catch {
            /* localStorage unavailable */
        }
        this.section.classList.toggle('work-notes-hidden', hidden);
        this.workNotesToggle.classList.toggle('active', hidden);
        this.workNotesToggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
        this.workNotesToggle.title = hidden ? 'Mostrar notas de trabajo' : 'Ocultar notas de trabajo';
    }
    /** Toggle work-notes visibility and persist the state to localStorage */
    _toggleWorkNotes() {
        if (!this.workNotesToggle)
            return;
        const hidden = !this.section.classList.contains('work-notes-hidden');
        this.section.classList.toggle('work-notes-hidden', hidden);
        this.workNotesToggle.classList.toggle('active', hidden);
        this.workNotesToggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
        this.workNotesToggle.title = hidden ? 'Mostrar notas de trabajo' : 'Ocultar notas de trabajo';
        try {
            window.localStorage.setItem(WORK_NOTES_STORAGE_KEY, hidden ? '1' : '0');
        }
        catch {
            /* localStorage unavailable */
        }
    }
    /**
     * How many values the group `f` shows before the "Ver más (N)" toggle appears: its own
     * `maxVisible`, or the default when it declares none. Below 2 no group collapses.
     */
    _filterMaxVisible(f) {
        return typeof f.maxVisible === 'number' ? f.maxVisible : DEFAULT_FILTER_MAX_VISIBLE;
    }
    /**
     * The token a raw value is compared and sent as: its `String()`, with `null` / `undefined` both
     * read as `FILTER_EMPTY_VALUE` so an option declared with `value: null`, or the "Sin valor" of an
     * `allowEmpty` group, matches an item that does not carry the field.
     */
    _filterToken(value) {
        return value === undefined || value === null ? FILTER_EMPTY_VALUE : String(value);
    }
    /**
     * Values a group carries for a single item, as the tokens the code filters on:
     * what `extract` returns, or the `field` of the item itself (arrays expanded, everything
     * tokenized). An item with no value carries the empty token, which is a value of its own: it
     * matches the option that declares it (or the "Sin valor" of an `allowEmpty` group), and in a
     * derived group without `allowEmpty` it produces no value at all.
     */
    _filterValuesOf(f, item) {
        const v = f.extract ? f.extract(item) : item[f.field];
        if (v == null)
            return [FILTER_EMPTY_VALUE];
        return (Array.isArray(v) ? v : [v]).map((x) => this._filterToken(x));
    }
    /**
     * The values of the group the user has picked, as they travel: one entry per value, which is the
     * `value` its checkbox carries and the cell it takes in the query params and in `localStorage`.
     * Reads `f.active`, the single place the state of a group lives, so a `'select'` group is
     * indistinguishable from a `'checkboxes'` one for everything that is not the control.
     */
    _filterActiveValues(f) {
        return [...f.active];
    }
    /**
     * The tokens a group currently filters by: the values it has active, each split back into the
     * tokens it declared, so an option like `[false, null]` contributes both.
     */
    _filterActiveTokens(f) {
        return this._filterActiveValues(f).flatMap((token) => token.split(','));
    }
    /**
     * Label shown for a value of a group that derives its values: what `formatLabel` returns, or the
     * value itself — except the booleans, that would otherwise read as raw `true` / `false`.
     * A declared group carries the label in its own `items`, and the empty bucket of an `allowEmpty`
     * group has its own fixed label, so neither reaches this method.
     */
    _filterLabelOf(f, value) {
        if (f.formatLabel)
            return f.formatLabel(value);
        if (value === 'true')
            return 'Sí';
        if (value === 'false')
            return 'No';
        return value;
    }
    /**
     * The label the backend sent for a token of a field, in API mode, or `''` when there is none.
     * It is looked up by the same key the facets use —the raw token that gets filtered— so a server
     * can store a code and show a name without the two ever having to agree. A label that is not a
     * non-empty string counts as no label, so a backend that sends something else falls back to the
     * token instead of showing `undefined`.
     */
    _apiFacetLabel(field, token) {
        const label = this._apiFacetLabels[field]?.[token];
        if (typeof label !== 'string' || label.trim() === '')
            return '';
        return label.trim();
    }
    /**
     * The visible text of one value of a group, whichever control shows it: the label a declared
     * `items` brings, the fixed one of the `allowEmpty` bucket, the one the backend sent with the
     * facets in API mode, or `_filterLabelOf` for a value that came from the data. Both controls call
     * this so a value never reads differently in a select.
     *
     * The order is what makes the sources compose instead of fight: what the client declared wins
     * because it declared it explicitly, then the empty bucket (whose label is fixed in every field),
     * then the label of the backend —which only reaches the values it brought, so a declared group is
     * never renamed by it— and finally what the data says.
     */
    _filterOptionLabel(f, token) {
        const declaredItem = f.declared?.find((d) => d.token === token);
        if (declaredItem)
            return declaredItem.label;
        // El bucket vacío de un grupo `allowEmpty` tiene label fijo (y no pasa por `formatLabel`,
        // que es para los valores que el dato trae).
        if (f.allowEmpty && token === FILTER_EMPTY_VALUE)
            return FILTER_EMPTY_LABEL;
        const facetLabel = this._apiFacetLabel(f.field, token);
        if (facetLabel)
            return facetLabel;
        return this._filterLabelOf(f, token);
    }
    /**
     * Resolve the values of a group and how many items each one holds, the same way for every
     * control: the declared `items` (counted, in their order), or the ones derived from the items of
     * the active scope in local mode, or the ones the server sent in `GET {url}/facets` in API mode.
     *
     * Returns `null` when the group has nothing to decide and therefore has to hide itself: a
     * declared group always has something (it exists even with no data behind it), so only a derived
     * one can end up here. The exception is the `allowEmpty` group whose only value is the empty
     * bucket — the consumer asked for it, and filtering by it is a decision, not missing data.
     *
     * `overflow` is how many values a `'checkboxes'` group hides behind its "Ver más (N)"; it is 0
     * for a `'select'`, whose list scrolls and searches instead of truncating.
     */
    _resolveFilterValues(f, scope) {
        const declared = f.declared;
        let values;
        let counts;
        if (declared) {
            // Los valores ya están declarados: solo falta contarlos. En API mode salen de los facets
            // (y un valor que el server todavía no mandó cuenta 0 en vez de desaparecer).
            values = declared.map((d) => d.token);
            const facets = this.api ? this._apiFacets[f.field] || {} : null;
            counts = {};
            values.forEach((token) => {
                const item = declared.find((d) => d.token === token);
                if (facets) {
                    // Los facets son por token crudo, así que un valor declarado con varios tokens
                    // (`[false, null]`) no tiene una clave propia: se suman las de cada token, que es
                    // exacto mientras el campo tenga un solo valor por ítem (el caso normal) y cuenta de
                    // más solo cuando un ítem responde más de una vez al mismo checkbox.
                    counts[token] = (item?.tokens || []).reduce((sum, t) => sum + (facets[t] || 0), 0);
                }
                else {
                    counts[token] = scope.filter((c) => this._filterValuesOf(f, c).some((x) => item?.tokens.includes(x))).length;
                }
            });
        }
        else if (this.api) {
            // Derivados en API: las claves del facet que tienen algo detrás. El bucket vacío se
            // descarta igual que en local, salvo que el grupo lo pida con `allowEmpty`: los facets son
            // por token, así que la clave `"null"` es la que lo representa.
            const facetCounts = this._apiFacets[f.field] || {};
            values = Object.keys(facetCounts).filter((v) => (facetCounts[v] || 0) > 0 && (f.allowEmpty || v !== FILTER_EMPTY_VALUE));
            counts = facetCounts;
        }
        else {
            // Derivados: los tokens que traen los items. El bucket vacío (`'null'`) y `''` no generan
            // una opción por su cuenta: en un grupo sin `items` no hay a quién atribuírsela, salvo que
            // el grupo lo pida con `allowEmpty` (y entonces lo ofrece como "Sin valor").
            const tokens = [...new Set(scope.flatMap((c) => this._filterValuesOf(f, c)))].filter((v) => v !== '');
            values = f.allowEmpty ? tokens : tokens.filter((v) => v !== FILTER_EMPTY_VALUE);
            counts = {};
            values.forEach((val) => {
                counts[val] = scope.filter((c) => this._filterValuesOf(f, c).includes(val)).length;
            });
        }
        // Solo un grupo que deriva sus valores se puede quedar sin nada que decidir: uno declarado
        // existe siempre, aunque ningún item (o ningún facet) traiga sus valores. La excepción es el
        // grupo con `allowEmpty` que solo encontró el bucket vacío: el consumidor lo pidió, y filtrar
        // por él (dejar fuera los que sí tienen valor) es una decisión, no un dato vacío.
        const onlyEmpty = values.length === 1 && values[0] === FILTER_EMPTY_VALUE;
        if (!declared && values.length <= 1 && !(f.allowEmpty && onlyEmpty))
            return null;
        if (f.sortValues)
            values.sort(f.sortValues);
        // A group longer than its cut shows the first values of its declared order (or the one
        // `sortValues` gives it) and hides the rest behind a "Ver más (N)" toggle. Only a group that
        // declares neither is reordered by count, because that order is the useful one when the
        // values came from the data. `sort` is stable, so ties keep the order they had.
        // Un `'select'` no tiene corte, pero con cientos de valores el orden del pool es inútil, así que
        // aplica la misma regla sin que el corte la condicione: primero los que más filtran.
        const limit = f.type === 'select' ? Number.POSITIVE_INFINITY : this._filterMaxVisible(f);
        const overflow = limit >= 2 ? Math.max(0, values.length - limit) : 0;
        const reorderByCount = f.type === 'select' ? !declared && !f.sortValues : overflow > 0 && !declared && !f.sortValues;
        if (reorderByCount)
            values.sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
        // El bucket vacío va siempre al final, después de cualquier orden (declarado, `sortValues` o
        // por conteo): es la ausencia de un valor, no un valor más, y al final se lee como la
        // ás la excepción que es. El corte no cambia (mide cuántos valores hay, no cuáles), así que el
        // bucket puede caer en la cola del "Ver más (N)" — y si el usuario lo tilda, el grupo se abre solo.
        if (f.allowEmpty) {
            const emptyIndex = values.indexOf(FILTER_EMPTY_VALUE);
            if (emptyIndex > -1 && emptyIndex < values.length - 1)
                values.push(...values.splice(emptyIndex, 1));
        }
        return { values, counts, overflow };
    }
    /**
     * Reseed the values a group starts with: what the URL asked for, then the ones persisted by a
     * `persist` group, and otherwise the `checked` its declared `items` bring. An empty record wins
     * over those defaults, which is what lets the user clear a group and have it stay cleared across
     * the rebuilds.
     *
     * The URL comes first because a shared link is a more explicit "what to show" than a value this
     * browser happens to have stored, and it is the only one of the three that is not something the
     * consumer declared. That key **existing** is the signal, not it having values: `?tv_tipo_fuente=`
     * means "that group was cleared on purpose", which is a legitimate thing to share.
     *
     * This is also what keeps a shared filter from being wiped by a rebuild, since it reseeds on
     * every one of them (the API facets, a taxonomy re-scope) the way it does for a `persist` group.
     *
     * A saved value is matched **by tokens and not by string**, because the two places that carry it
     * are comma-separated (the URL param and the API one) and a declared value can be a list, whose
     * token is itself a CSV (`[null, false]` is `'null,false'`). Reading one back splits it, so a
     * whole-string comparison would lose it and filter the pool down to nothing.
     */
    _seedFilterActive(f, values, savedState) {
        const urlValues = this._urlFilters?.[f.field];
        const saved = urlValues ?? (f.persist ? savedState[f.field] : undefined);
        if (!saved) {
            f.active = new Set(values.filter((val) => f.declared?.find((d) => d.token === val)?.checked === true));
            return;
        }
        // Matched **by tokens, not by string**: a declared value can be a list, and the demo's
        // "Sin descartar" (`[null, false]`) is one single value whose token is `'null,false'` — the same
        // CSV the API param and the URL carry. Both of those are comma-separated, so reading one back
        // splits it into `'null'` and `'false'`, and a comparison of whole strings would leave that value
        // unchecked and filter the pool down to nothing. A value is active when **all** of its tokens came
        // in, which also gives the empty record its meaning: `?tv_campo=` asks for a cleared group.
        const flat = new Set(saved.flatMap((entry) => entry.split(',')));
        f.active = new Set(values.filter((val) => val.split(',').every((t) => flat.has(t))));
    }
    /**
     * Build the control of every group of the `filters` option out of the values it resolves: the
     * checkboxes of a `'checkboxes'` group, the trigger and list of a `'select'` one. The values come
     * from the items of the active scope in local mode, or from the ones the server sent in
     * `GET {url}/facets` in API mode. A group with no container to draw in is skipped, and so is the
     * whole method when no group was declared at all (nothing to build, nothing to show).
     */
    _buildFilterCheckboxes() {
        if (this.filters.length === 0)
            return;
        const savedState = this._loadPersistedFilterState();
        const scope = this._scopeItems();
        let anyFilterVisible = false;
        this.filters.forEach((f) => {
            const container = f.type === 'select' ? f.select?.root : f.options;
            if (!container)
                return;
            const resolved = this._resolveFilterValues(f, scope);
            if (!resolved) {
                // El grupo no tiene nada que decidir: se esconde entero, y en un select también se descarta
                // la lista, porque sus valores ya no son los que había (un rebuild los vuelve a resolver).
                if (f.type === 'select' && f.select)
                    this._resetFilterSelect(f.select);
                container.hidden = true;
                return;
            }
            container.hidden = false;
            // The `filtros_internos` groups live in the internal-filters flyout, which has a button of
            // its own: they must not be the reason the filter button of the panel shows up.
            if (f.group !== 'filtros_internos')
                anyFilterVisible = true;
            this._seedFilterActive(f, resolved.values, savedState);
            if (f.type === 'select')
                this._buildFilterSelect(f, resolved);
            else
                this._buildFilterCheckboxesGroup(f, resolved);
        });
        this.container.querySelectorAll('.filter-section').forEach((sectionEl) => {
            const section = sectionEl;
            const containers = Array.from(section.querySelectorAll('[data-filter-field]'));
            const hasOptions = containers.some((box) => this.filters.some((ef) => (ef.options === box || ef.select?.root === box) &&
                (ef.checkboxes.length > 0 || (ef.select?.values.length ?? 0) > 0)));
            section.hidden = containers.length > 0 && !hasOptions;
        });
        if (this.filtrosInternosWrap) {
            this.filtrosInternosWrap.style.display = '';
        }
        // En modo API el botón se muestra desde el arranque aunque todavía no haya facets: sin ellos
        // los grupos que derivan sus valores no tienen nada que mostrar, y esperar la respuesta deja el
        // toolbar incompleto y lo ensancha de golpe (muy notorio al iniciar con `startExpanded`). El
        // panel se arma con la respuesta, y hasta entonces el botón no tiene listener, así que no abre
        // nada. Cuando el pedido termina manda `anyFilterVisible`: si no hay nada que filtrar, se oculta
        // solo. Los grupos declarados existen igual (con los conteos en cero), así que la condición queda
        // como estaba en modo local.
        // El botón puede no existir: una declaración de filtros que solo tiene grupos
        // `filtros_internos` (o ninguna) no dibuja el panel, y entonces no hay nada que mostrar ni que
        // ocultar.
        const pendingFacets = !!this.api && !this._apiFacetsSettled;
        if (this.filterToggle)
            this.filterToggle.style.display = anyFilterVisible || pendingFacets ? '' : 'none';
    }
    /**
     * Draw the values of a `'checkboxes'` group: one label per value, with its checkbox and its
     * count, the ones past the cut already marked `filter-option-extra` for `_buildFilterMore` to
     * hide. The group's active values are already in `f.active` (seeded by `_seedFilterActive`), so a
     * checkbox only has to mirror them, and its `change` only has to write the new state.
     */
    _buildFilterCheckboxesGroup(f, resolved) {
        const { values, counts, overflow } = resolved;
        f.options.innerHTML = '';
        f.options.classList.remove('expanded');
        f.checkboxes = [];
        values.forEach((val, i) => {
            const isExtra = overflow > 0 && i >= values.length - overflow;
            const label = document.createElement('label');
            label.className = isExtra ? 'filter-option filter-option-extra' : 'filter-option';
            // Kept in sync with the class below for the case where the stylesheet is not loaded.
            label.hidden = isExtra;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = val;
            cb.checked = f.active.has(val);
            const span = document.createElement('span');
            span.className = 'filter-option-label';
            const display = this._filterOptionLabel(f, val);
            span.textContent = display;
            const countSpan = document.createElement('span');
            countSpan.className = 'filter-option-count';
            countSpan.textContent = `(${counts[val] || 0})`;
            label.title = display;
            label.appendChild(cb);
            label.appendChild(span);
            label.appendChild(countSpan);
            cb.addEventListener('change', () => {
                if (cb.checked)
                    f.active.add(val);
                else
                    f.active.delete(val);
                if (f.persist)
                    this._savePersistedFilterState();
                this._applyFilters(true);
            });
            f.options.appendChild(label);
            f.checkboxes.push(cb);
        });
        if (overflow)
            this._buildFilterMore(f, overflow);
    }
    /**
     * Draw the control of a `'select'` group: the chips (or the placeholder) of its active values,
     * the search box when it has enough values to earn one, and the footer.
     *
     * The list of values is **not** built here: `values` and `counts` are handed to the `FilterSelect`
     * and `_ensureSelectOptions` turns them into DOM on the first open. That is the whole reason the
     * control exists — a field with hundreds of values would otherwise put hundreds of nodes in the
     * document on every rebuild (the API facets, a taxonomy re-scope) whether the user ever opens it
     * or not.
     */
    _buildFilterSelect(f, resolved) {
        const select = f.select;
        if (!select)
            return;
        select.values = resolved.values;
        select.counts = resolved.counts;
        // El rebuild tiene que reiniciar la lista: los valores pueden ser otros, así que lo que quedó
        // de la resolución anterior ya no corresponde.
        this._resetFilterSelect(select);
        // La caja de búsqueda se decide por la cantidad de valores, que es el dato que la justifica:
        // con ocho o menos la lista se escanea sin ella, y con cientos es la única forma de usarla.
        const searchable = f.searchable ?? resolved.values.length > FILTER_SELECT_SEARCH_MIN;
        select.search.hidden = !searchable;
        if (!searchable && select.search.value)
            select.search.value = '';
        this._renderSelectTrigger(f);
        this._bindSelectEvents(f);
    }
    /**
     * Forget everything a built list of a `'select'` group holds, leaving the control as if it had
     * never been opened. Called on every rebuild (the values may have changed) and when the group
     * hides itself, which is also when its DOM has to stop being clickable.
     */
    _resetFilterSelect(select) {
        select.built = false;
        select.query = '';
        select.cursor = '';
        select.options.clear();
        select.matches = [];
        select.shown = 0;
        select.haystacks = [];
        select.labels.clear();
        select.list.innerHTML = '';
        select.search.value = '';
        select.empty.hidden = true;
        select.panel.hidden = true;
        select.trigger.classList.remove('open');
        select.trigger.setAttribute('aria-expanded', 'false');
    }
    /**
     * Write on the trigger of a `'select'` group what the user has picked: the placeholder when
     * nothing is, and a removable chip per active value. Rebuilt with `createElement` because the
     * chips are text that came from the data.
     */
    _renderSelectTrigger(f) {
        const select = f.select;
        if (!select)
            return;
        const box = select.value;
        box.innerHTML = '';
        const active = [...f.active];
        if (active.length === 0) {
            const placeholder = document.createElement('span');
            placeholder.className = 'filter-select-placeholder';
            placeholder.textContent = f.label === '' ? 'Seleccionar' : f.label;
            box.appendChild(placeholder);
        }
        else {
            // Todos los chips, sin un "+N" que resuma la cola: la selección completa tiene que poder leerse
            // (y deshacerse valor por valor) sin abrir la lista. El área de chips lleva su propio tope de
            // altura (`.filter-select-value`), así que una selección larga scrollea en vez de empujar el
            // panel entero hacia abajo.
            active.forEach((token) => box.appendChild(this._createSelectChip(f, token)));
        }
        // El trigger es el resumen, pero el texto largo también va en `title` para que el grupo se
        // pueda leer con el mouse cuando los chips no entran.
        box.title = active.map((token) => select.labels.get(token) ?? this._filterOptionLabel(f, token)).join(', ');
        this._renderSelectFooter(f);
    }
    /**
     * Build one chip of the trigger of a `'select'` group: the label, cut with `…` by CSS when it is
     * long, plus the button that drops the value.
     *
     * The button is nested inside the trigger, which is valid because the trigger is a
     * `div[role="combobox"]` and not a `<button>` (a button inside a button is not). It is
     * `tabindex="-1"` on purpose: a group can carry hundreds of values, and one tab stop per chip
     * would bury everything that comes after the trigger. Removing from the keyboard goes through the
     * list, which is the accessible path for it anyway.
     *
     * The label is its own span because the `…` has to be: `text-overflow: ellipsis` only works on a
     * block with a direct text node, and once the chip holds a button it is a flex container.
     */
    _createSelectChip(f, token) {
        const text = f.select?.labels.get(token) ?? this._filterOptionLabel(f, token);
        const chip = document.createElement('span');
        chip.className = 'filter-select-chip';
        const label = document.createElement('span');
        label.className = 'filter-select-chip-label';
        label.textContent = text;
        label.title = text;
        const remove = document.createElement('button');
        remove.className = 'filter-select-chip-remove';
        remove.type = 'button';
        remove.tabIndex = -1;
        remove.setAttribute('aria-label', `Quitar ${text}`);
        remove.title = `Quitar ${text}`;
        remove.innerHTML =
            '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        remove.addEventListener('click', (e) => {
            // Sin este corte el click sube al trigger, cuyo listener abre o cierra la lista: quitar un
            // valor desde el chip terminaría abriendo el desplegable.
            e.stopPropagation();
            this._toggleSelectValue(f, token);
        });
        chip.appendChild(label);
        chip.appendChild(remove);
        return chip;
    }
    /**
     * Write the footer of a `'select'` group: how many values are picked, and the "Limpiar" button
     * that drops them all. The count is left empty in a `multiple: false` group, where one is the most
     * there can ever be and the trigger already says it.
     */
    _renderSelectFooter(f) {
        const select = f.select;
        if (!select)
            return;
        const count = f.active.size;
        select.clear.disabled = count === 0;
        select.footerCount.textContent = f.multiple ? `${count} ${count === 1 ? 'seleccionado' : 'seleccionados'}` : '';
    }
    /**
     * Build what a `'select'` group needs to show its list, on its first open: the label and the
     * `haystack` of **every** value, and then the first window of rows.
     *
     * The index pass covers all the values but only builds nodes for `FILTER_SELECT_WINDOW` of them,
     * and that is the whole difference between a dropdown that works on a field with hundreds of
     * values and one that does not: 400 rows are 1.600 noditos para mirar y para scrollear, mientras
     * que el `haystack` de 400 valores es un array de strings. Los nodos de la cola se crean después,
     * al scrollear (`_appendSelectRows`).
     *
     * This is also where a remote value list would be requested (one day a `loadOptions` option would
     * fetch instead of reading `select.values`): the trigger has already shown the values it had, and
     * the request would not block the panel.
     */
    _ensureSelectOptions(f) {
        const select = f.select;
        if (!select || select.built)
            return;
        // Los labels declarados se indexan una vez: `_filterOptionLabel` los busca con un `find` por
        // token, que con cientos de valores declarados sería un `O(n²)` en el primer click.
        const declaredLabels = f.declared ? new Map(f.declared.map((d) => [d.token, d.label])) : null;
        select.labels.clear();
        select.haystacks = select.values.map((token) => {
            const display = declaredLabels?.get(token) ?? this._filterOptionLabel(f, token);
            select.labels.set(token, display);
            // El token entra en el `haystack` además de la etiqueta para que un valor con el label feo
            // ("Sí", "Sin valor", el id crudo) se encuentre también por el dato que representa.
            return foldForSearch(`${display} ${token}`);
        });
        select.built = true;
        this._filterSelectOptions(f, select.query);
        // Los valores ya puestos tienen que verse al abrir: si no, el trigger dice "2 seleccionados" y
        // la lista no muestra ninguno. `scrollIntoView` no existe fuera de un browser real (jsdom), así
        // que se comprueba antes de llamarlo en vez de asumirlo.
        select.options.forEach((opt, token) => {
            if (f.active.has(token) && typeof opt.el.scrollIntoView === 'function')
                opt.el.scrollIntoView({ block: 'nearest' });
        });
    }
    /**
     * Narrow the values of a `'select'` group to the ones the query matches, and lay out the first
     * window of them. The match is a substring of the folded label and token, so it forgives case and
     * accents.
     *
     * It goes over `haystacks` (all the values) and not over the rows (the ones in the window), which
     * is what lets a match that is not rendered yet be found and brought into the window. It does
     * rebuild the window from scratch, instead of hiding rows in place, because the number of matches
     * changes: hiding would leave a list of 50 rows con 400 en el medio y 3 al final.
     */
    _filterSelectOptions(f, query) {
        const select = f.select;
        if (!select)
            return;
        select.query = query;
        const needle = foldForSearch(query.trim());
        select.matches = needle
            ? select.values.filter((_, i) => select.haystacks[i].includes(needle))
            : select.values.slice();
        select.shown = Math.min(FILTER_SELECT_WINDOW, select.matches.length);
        // El cursor se descarta con cada búsqueda: la fila que estaba marcada puede ser una de las que
        // el `needle` acaba de dejar fuera.
        select.cursor = '';
        this._renderSelectWindow(f);
    }
    /**
     * Lay out the window of a `'select'` list: the rows of `matches[0..shown]` and the "Sin
     * resultados" line when nothing matched. Rebuilds the list node, so the caller is the one who
     * decides the scroll: the search wants the top, and the extension path appends instead of calling
     * this.
     */
    _renderSelectWindow(f) {
        const select = f.select;
        if (!select)
            return;
        select.list.innerHTML = '';
        select.options.clear();
        for (let i = 0; i < select.shown; i++)
            this._appendSelectRow(f, select.matches[i]);
        select.empty.hidden = select.matches.length > 0;
    }
    /** Add one row of a `'select'` list at its end, and remember it as rendered */
    _appendSelectRow(f, token) {
        const select = f.select;
        if (!select || select.options.has(token))
            return;
        const display = select.labels.get(token) ?? this._filterOptionLabel(f, token);
        const opt = document.createElement('div');
        opt.className = 'filter-select-option';
        opt.dataset.token = token;
        opt.setAttribute('role', 'option');
        const selected = f.active.has(token);
        opt.setAttribute('aria-selected', String(selected));
        if (selected)
            opt.classList.add('selected');
        const text = document.createElement('span');
        text.className = 'filter-select-option-label';
        text.textContent = display;
        const count = document.createElement('span');
        count.className = 'filter-select-option-count';
        count.textContent = `(${select.counts[token] || 0})`;
        opt.appendChild(text);
        opt.appendChild(count);
        opt.title = display;
        opt.addEventListener('click', () => this._toggleSelectValue(f, token));
        select.list.appendChild(opt);
        select.options.set(token, { el: opt });
    }
    /**
     * Grow the window of a `'select'` list by another `FILTER_SELECT_WINDOW` matches. It **appends**
     * instead of rebuilding, so the rows that were already there keep their identity and, more
     * importantly, the list keeps its `scrollTop`: rebuilding a long list while the scrollbar is at
     * the end would throw the viewport back to the top on every extension.
     */
    _extendSelectWindow(f) {
        const select = f.select;
        if (!select || !select.built)
            return;
        const before = select.shown;
        select.shown = Math.min(select.matches.length, select.shown + FILTER_SELECT_WINDOW);
        if (select.shown === before)
            return;
        for (let i = before; i < select.shown; i++)
            this._appendSelectRow(f, select.matches[i]);
    }
    /**
     * Grow the window when the list is scrolled to its end, so reaching the bottom of a long list
     * brings the next values instead of dead-ending. When there are more matches than the window
     * covers, the list always overflows (50 rows against a ~220px box), so the scroll is the mouse
     * path to every value; the keyboard reaches them too, through `_revealSelectCursor()`.
     */
    _maybeExtendSelectWindow(f) {
        const select = f.select;
        if (!select || select.shown >= select.matches.length)
            return;
        const list = select.list;
        if (list.scrollTop + list.clientHeight < list.scrollHeight - 24)
            return;
        this._extendSelectWindow(f);
    }
    /**
     * Add or drop one value of a `'select'` group, and apply. In a `multiple: false` group picking a
     * value replaces the previous one, and picking the one that is already active clears it: that is
     * what makes it behave like the classic `<select>`.
     */
    _toggleSelectValue(f, token) {
        const select = f.select;
        if (!select)
            return;
        if (f.active.has(token)) {
            f.active.delete(token);
        }
        else {
            if (!f.multiple)
                f.active.clear();
            f.active.add(token);
        }
        const opt = select.options.get(token);
        if (opt) {
            const selected = f.active.has(token);
            opt.el.setAttribute('aria-selected', String(selected));
            opt.el.classList.toggle('selected', selected);
        }
        if (!f.multiple && f.active.size === 1)
            this._syncSingleSelect(f);
        this._renderSelectTrigger(f);
        if (f.persist)
            this._savePersistedFilterState();
        this._applyFilters(true);
    }
    /**
     * A `multiple: false` group keeps one active value, so choosing another one has to drop the row
     * of the one that was active: nothing else knows about it, since no checkbox holds it.
     */
    _syncSingleSelect(f) {
        const select = f.select;
        if (!select)
            return;
        select.options.forEach((opt, token) => {
            const selected = f.active.has(token);
            opt.el.setAttribute('aria-selected', String(selected));
            opt.el.classList.toggle('selected', selected);
        });
    }
    /** Drop every active value of a `'select'` group and apply */
    _clearSelectValues(f) {
        const select = f.select;
        if (!select || f.active.size === 0)
            return;
        f.active.clear();
        this._syncSingleSelect(f);
        this._renderSelectTrigger(f);
        if (f.persist)
            this._savePersistedFilterState();
        this._applyFilters(true);
    }
    /**
     * The group a chip inside a card filters through, or `null` when there is none to filter by:
     * single mode has no panel at all (`_buildLayout` never runs there, so applying would throw),
     * and a field the consumer did not declare — or declared without `cardClickable` — keeps the
     * card exactly as it has always been, plain text.
     */
    _cardFilterGroup(field) {
        if (this.singleId)
            return null;
        return this.filters.find((f) => f.field === field && f.cardClickable) ?? null;
    }
    /**
     * Push `f.active` back into the DOM of its group. It exists for the one writer that changes the
     * set without going through a control — the chips inside a card —: the checkboxes of a group are
     * a view of that set, and a value that stays active inside the hidden tail of "Ver más" would be
     * an applied filter nobody can see, so that group opens too. A `'select'` group redraws its rows
     * and its trigger, which is what `_toggleSelectValue` does as well.
     */
    _syncFilterControl(f) {
        if (f.type === 'select') {
            this._syncSingleSelect(f);
            this._renderSelectTrigger(f);
            return;
        }
        let hiddenActive = false;
        f.checkboxes.forEach((cb) => {
            const on = f.active.has(cb.value);
            cb.checked = on;
            if (on && cb.closest('.filter-option-extra'))
                hiddenActive = true;
        });
        if (hiddenActive && f.options)
            f.options.classList.add('expanded');
    }
    /**
     * Filter from a value the user clicked inside a card: every other group **and** the search term
     * are dropped, and the clicked value becomes the only active one. Deliberately not a toggle —
     * clicking it again just applies the same state (see `TimelineFilter.cardClickable`).
     *
     * It goes through `_applyFilters(true)` like any other control, so the toggles, the URL, the
     * full map and the page reload of API mode all follow it without this method knowing about them.
     */
    _applyCardFilter(field, value) {
        const target = this._cardFilterGroup(field);
        if (!target)
            return;
        this.filters.forEach((g) => {
            if (g === target || g.active.size === 0)
                return;
            g.active.clear();
            this._syncFilterControl(g);
        });
        target.active.clear();
        target.active.add(value);
        this._syncFilterControl(target);
        // Un término escrito es un filtro en uso: sin esto la lista se filtraría por el actor y por
        // la búsqueda al mismo tiempo, y quedaría sin forma de ver qué está estrechando el resultado.
        if (this.searchTerm !== '' || this.searchInput.value !== '') {
            this.searchTerm = '';
            this.searchInput.value = '';
            this._closeSearch(true);
        }
        if (this.filters.some((g) => g.persist))
            this._savePersistedFilterState();
        this._applyFilters(true);
    }
    /** Open the list of a `'select'` group, building it the first time */
    _openSelect(f) {
        const select = f.select;
        if (!select)
            return;
        this._ensureSelectOptions(f);
        select.panel.hidden = false;
        select.trigger.classList.add('open');
        select.trigger.setAttribute('aria-expanded', 'true');
        if (!select.search.hidden) {
            select.search.focus();
            select.search.select();
        }
    }
    /** Close the list of a `'select'` group and send the focus back to its trigger */
    _closeSelect(f) {
        const select = f.select;
        if (!select)
            return;
        select.panel.hidden = true;
        select.trigger.classList.remove('open');
        select.trigger.setAttribute('aria-expanded', 'false');
        select.cursor = '';
    }
    /**
     * Bind the listeners of a `'select'` group, once. The trigger, the panel, the search box and the
     * footer are markup from `_buildLayout` that is never replaced, so binding them on the first build
     * is enough and the rebuilds of the values do not stack listeners.
     *
     * Keyboard: the trigger opens with `Enter` / `Space` / `?`, the list walks with the arrows and
     * toggles with `Enter`, and `Escape` closes the list without closing the whole panel (which is
     * what it would do otherwise, since the key bubbles to the same handler that closes the menu).
     */
    _bindSelectEvents(f) {
        const select = f.select;
        if (!select || select.bound)
            return;
        select.bound = true;
        select.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (select.panel.hidden)
                this._openSelect(f);
            else
                this._closeSelect(f);
        });
        select.trigger.addEventListener('keydown', (e) => {
            // La "x" de los chips es un <button> dentro del trigger. Después de un click queda enfocada en
            // algunos browsers, y el <kbd>Enter</kbd> que se le manda subiría hasta acá y reabriría la
            // lista. Cortar por `target` cubre ese caso y cualquier control anidado futuro, en vez de
            // parchear botón por botón.
            if (e.target !== select.trigger)
                return;
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                this._openSelect(f);
            }
        });
        select.panel.addEventListener('click', (e) => e.stopPropagation());
        select.search.addEventListener('input', () => this._filterSelectOptions(f, select.search.value));
        select.search.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                select.search.value = '';
                this._filterSelectOptions(f, '');
                select.trigger.focus();
                this._closeSelect(f);
            }
        });
        select.clear.addEventListener('click', () => this._clearSelectValues(f));
        // Scrollear al final de la lista agranda la ventana. Sin esto, una lista de cientos de valores
        // termina en un fondo sin nada: el scroll llega al tope de los 50 y no hay a dónde ir.
        select.list.addEventListener('scroll', () => this._maybeExtendSelectWindow(f));
        select.panel.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                select.trigger.focus();
                this._closeSelect(f);
                return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this._moveSelectCursor(f, e.key === 'ArrowDown' ? 1 : -1);
                return;
            }
            // <kbd>Home</kbd> / <kbd>End</kbd> van al primer y al último valor que matchea, sin tener que
            // recorrer los cientos de la lista de a un <kbd>?</kbd>.
            if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                this._jumpSelectCursor(f, e.key === 'End');
                return;
            }
            if (e.key === 'Enter') {
                const token = this._selectCursorToken(f);
                if (token !== null) {
                    e.preventDefault();
                    this._toggleSelectValue(f, token);
                }
                return;
            }
            // <kbd>Espacio</kbd> también alterna, como en cualquier listbox, pero solo cuando no hay
            // buscador: con la caja de búsqueda enfocada la barra espaciadora es una barra espaciadora.
            if (e.key === ' ' && select.search.hidden) {
                const token = this._selectCursorToken(f);
                if (token !== null) {
                    e.preventDefault();
                    this._toggleSelectValue(f, token);
                }
            }
        });
    }
    /**
     * Draw the keyboard cursor of a `'select'` group. It is a class and not a focus, because the
     * cursor only exists while the list is open and the rows are `div`s: moving it has to be visible,
     * or walking the list with the arrows would look like nothing happened.
     */
    _renderSelectCursor(f) {
        const select = f.select;
        if (!select)
            return;
        select.options.forEach((opt, token) => opt.el.classList.toggle('cursor', token === select.cursor));
    }
    /**
     * Move the cursor of a `'select'` group along the values that **match**, so the arrows walk what
     * the search left and never land on a value the search hid.
     */
    _moveSelectCursor(f, step) {
        const select = f.select;
        if (!select || !select.built)
            return;
        const total = select.matches.length;
        if (total === 0)
            return;
        const at = select.matches.indexOf(select.cursor);
        const next = at === -1 ? (step > 0 ? 0 : total - 1) : (at + step + total) % total;
        select.cursor = select.matches[next];
        this._revealSelectCursor(f);
    }
    /**
     * Put the cursor on the first or the last matching value (<kbd>Home</kbd> / <kbd>End</kbd>).
     * Without these, a group with hundreds of values is only reachable with hundreds of <kbd>?</kbd>:
     * the same dead-end the window avoids for the mouse, and this is the listbox behavior people
     * expect from the keys.
     */
    _jumpSelectCursor(f, last) {
        const select = f.select;
        if (!select || !select.built || select.matches.length === 0)
            return;
        select.cursor = select.matches[last ? select.matches.length - 1 : 0];
        this._revealSelectCursor(f);
    }
    /**
     * Make sure the row the cursor is on **exists**, growing the window until it does, and then draw
     * the cursor on it. The window always covers a prefix of `matches`, so a cursor past its end is
     * brought in by extending; the row is then scrolled into view, so the cursor is never off-screen.
     */
    _revealSelectCursor(f) {
        const select = f.select;
        if (!select)
            return;
        if (!select.options.has(select.cursor)) {
            const target = select.matches.indexOf(select.cursor);
            while (select.shown < target && select.shown < select.matches.length) {
                const before = select.shown;
                this._extendSelectWindow(f);
                if (select.shown === before)
                    break;
            }
            if (!select.options.has(select.cursor))
                this._appendSelectRow(f, select.cursor);
        }
        this._renderSelectCursor(f);
        // `scrollIntoView` no existe fuera de un browser real (jsdom), igual que en `_ensureSelectOptions`.
        const el = select.options.get(select.cursor)?.el;
        if (el && typeof el.scrollIntoView === 'function')
            el.scrollIntoView({ block: 'nearest' });
    }
    /** The value the cursor of a `'select'` group is on, or `null` when it is not on any */
    _selectCursorToken(f) {
        return f.select?.cursor || null;
    }
    /**
     * Add the "Ver más (N)" toggle at the end of a collapsed filter group and put the group in
     * its initial state. The hidden values are the `overflow` labels at the tail of
     * `f.options`, already marked `filter-option-extra`; what this decides is only whether
     * they show.
     *
     * A group with a checked value opens itself: a filter applied from a value the user can no
     * longer see is worse than a group one line longer, and the rebuilds (the API facets, a
     * taxonomy re-scope) always land on the visible state.
     *
     * The class is what the component CSS keys on, the `hidden` attribute is kept in sync for
     * the case where the stylesheet is not loaded, and the whole thing lives in the DOM: the
     * toggle is not a filter, so it does not call `_applyFilters` and the timeline does not
     * re-render.
     */
    _buildFilterMore(f, overflow) {
        const expanded = this._filterExpanded.has(f.field) || f.active.size > 0;
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'filter-more';
        more.setAttribute('aria-expanded', String(expanded));
        more.textContent = expanded ? 'Ver menos' : `Ver más (${overflow})`;
        more.addEventListener('click', () => {
            const open = more.getAttribute('aria-expanded') === 'true';
            if (open)
                this._filterExpanded.delete(f.field);
            else
                this._filterExpanded.add(f.field);
            f.options.classList.toggle('expanded', !open);
            f.options.querySelectorAll('.filter-option-extra').forEach((extra) => {
                extra.hidden = open;
            });
            more.setAttribute('aria-expanded', String(!open));
            more.textContent = open ? `Ver más (${overflow})` : 'Ver menos';
        });
        f.options.classList.toggle('expanded', expanded);
        f.options.querySelectorAll('.filter-option-extra').forEach((extra) => {
            extra.hidden = !expanded;
        });
        f.options.appendChild(more);
    }
    /**
     * Load the state of the filters marked `persist` from localStorage, keyed by `field`.
     * A group that declares no `persist` never reads it, which is what makes the rebuilds (the API
     * facets, a taxonomy re-scope) start over on those instead of silently keeping a value.
     */
    _loadPersistedFilterState() {
        try {
            const raw = window.localStorage.getItem(PERSISTED_FILTER_STORAGE_KEY);
            if (!raw)
                return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch {
            return {};
        }
    }
    /** Persist the active values of every group marked `persist` to localStorage */
    _savePersistedFilterState() {
        const state = {};
        this.filters
            .filter((f) => f.persist)
            .forEach((f) => {
            state[f.field] = this._filterActiveValues(f);
        });
        try {
            window.localStorage.setItem(PERSISTED_FILTER_STORAGE_KEY, JSON.stringify(state));
        }
        catch {
            /* localStorage unavailable */
        }
    }
    /** Normalize a string for accent- and case-insensitive search matching */
    _normalizeSearch(value) {
        return (value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }
    /** Check whether a card matches the current search term */
    _matchesSearch(card) {
        const q = this._normalizeSearch(this.searchTerm.trim());
        if (!q)
            return true;
        const haystacks = [
            String(card.id),
            card.nombre_fuente,
            card.fuente_institucional,
            card.actores_principales?.join(' ') ?? ''
        ];
        return haystacks.some((v) => this._normalizeSearch(v).includes(q));
    }
    /**
     * Page size used by the API mode. `itemsPerPage: 0` means "no pagination", so the request
     * asks for a page big enough to hold the whole collection in one response: the server only
     * slices what it gets, and a small `pageSize` there would silently leave the user with the
     * first few items and no way to ask for the rest.
     */
    _apiPageSize() {
        return this.itemsPerPage > 0 ? this.itemsPerPage : API_UNBOUNDED_PAGE_SIZE;
    }
    /**
     * Page size of the current mode: API mode asks the server for `_apiPageSize`, local mode slices
     * the pool it already holds. It is 0 in local mode with `itemsPerPage: 0`, which is how "no
     * pagination at all" is spelled there.
     */
    _pageSize() {
        return this.api ? this._apiPageSize() : this.itemsPerPage;
    }
    /**
     * Number of pages the current result set is split into, always at least 1. It counts up to
     * the total the mode knows about: the `total` the server sent in API mode, the filtered pool in
     * local mode.
     */
    _pageCount() {
        const size = this._pageSize();
        const total = this.api ? this._apiTotal : this.allCards.length;
        if (size <= 0)
            return 1;
        return Math.max(1, Math.ceil(total / size));
    }
    /** The page the user is on, 1-based. API mode reads the page the server was asked for */
    _currentPage() {
        return this.api ? this._apiPage : this._page;
    }
    /** True when there are more pages to load */
    _hasMorePages() {
        if (this.api)
            return this.allCards.length < this._apiTotal;
        return this.itemsPerPage > 0 && this._displayedCount < this.allCards.length;
    }
    /** Fetch a JSON resource from the API with the configured fetch implementation */
    async _apiFetch(path, params) {
        const cfg = this.api;
        const base = cfg.url.replace(/\/+$/, '');
        const qs = new URLSearchParams(params).toString();
        const fetchImpl = cfg.fetchImpl || window.fetch.bind(window);
        const response = await fetchImpl(`${base}${path}${qs ? '?' + qs : ''}`, {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok)
            throw new Error(`API request failed: ${response.status}`);
        return (await response.json());
    }
    /**
     * Read the state of the view the browser URL carries, once, from the constructor.
     *
     * It runs **before** `_init()` on purpose: what the URL says has to be part of the first render
     * (the markup of the toolbar, the sorter selected, the taxonomy pill, the text in the search box)
     * and of the **first** API request. A shared link has to open on the view it shares, not render
     * the default one and correct itself a frame later.
     *
     * Everything it cannot resolve is dropped in silence, which is the rule that makes the option safe
     * to hand to the public: a filter the consumer did not declare this time (the internal filters of
     * a link shared by someone who does have permissions), an order that is not offered anymore, a
     * taxonomy that was renamed, a page that no longer exists. None of it warns, none of it breaks,
     * and none of it filters: an unknown `tv_*` key survives in the URL untouched until the first
     * interaction, when `_syncUrlState()` strips it.
     */
    _readUrlState() {
        if (!this.stateInUrl)
            return;
        let params;
        try {
            params = new URLSearchParams(window.location.search);
        }
        catch {
            return;
        }
        const q = params.get(URL_STATE_KEYS.q);
        if (q)
            this.searchTerm = q;
        // Only a sorter the consumer declared (or the built-in default) is taken: an unknown field would
        // order the list by something that is not on offer, and there is no UI to show that in.
        const sortBy = params.get(URL_STATE_KEYS.sortBy);
        if (sortBy && (sortBy === this._sortField || this.sorters.some((s) => s.field === sortBy))) {
            this._sortField = sortBy;
        }
        const sort = params.get(URL_STATE_KEYS.sort);
        if (sort)
            this._sortAsc = sort.toLowerCase() === 'asc';
        // The taxonomy travels by **label** and not by index: the index depends on the order and the
        // amount of groups of that deployment, so a link would point somewhere else on the next deploy.
        const tax = params.get(URL_STATE_KEYS.taxonomy);
        if (tax !== null && this.content.length > 1) {
            if (tax === ALL_TAXONOMIES_LABEL) {
                this._contentIndex = ALL_TAXONOMIES_INDEX;
            }
            else {
                const idx = this.content.findIndex((g) => g.label === tax);
                if (idx >= 0)
                    this._contentIndex = idx;
            }
        }
        // Only the paginator has a page to share: with "Cargar más" what is on screen is a prefix that
        // grows, which is not a page of the result set.
        if (this.pagination) {
            const page = Number(params.get(URL_STATE_KEYS.page));
            if (Number.isInteger(page) && page >= 1)
                this._urlPage = page;
        }
        // Filter groups, keyed by the field the consumer declared. Undeclared fields are dropped right
        // here and never reach a filter, which is why no `console.warn` shows up: a shared link carries
        // the internal filters of whoever sent it, and whoever opens it may not be allowed to see them.
        const urlFilters = {};
        this.filters.forEach((f) => {
            const raw = params.get(URL_STATE_PREFIX + f.field);
            if (raw === null)
                return;
            // The CSV is the same one the API params use, token by token.
            urlFilters[f.field] = raw === '' ? [] : raw.split(',');
        });
        this._urlFilters = urlFilters;
    }
    /**
     * Seed the active values of every group from the URL, **without** crossing them against the
     * values the group resolves.
     *
     * It runs before `_buildFilterCheckboxes()` and that is the whole point: in API mode a derived
     * group gets its values out of `/facets`, which has not arrived yet, so seeding at that point
     * would leave the group empty and the **first** request would go out unfiltered — and the rebuild
     * that lands with the facets would find the list already on screen and never fix it. Assigning the
     * raw tokens here gets them into `_buildQueryParams()` from the very first page; the intersection
     * happens later, on that rebuild, when the values are known.
     */
    _applyUrlFilterState() {
        if (!this._urlFilters)
            return;
        this.filters.forEach((f) => {
            const tokens = this._urlFilters[f.field];
            if (tokens)
                f.active = new Set(tokens);
        });
    }
    /**
     * Land on the page the URL asked for, in local mode. It runs **after** `_applyFilters()` because
     * that is what resets the cursor (`_page = 1`): the search, the filters, the order and the taxonomy
     * all narrow or reorder the pool, so the page of the link may not even exist in the new one.
     *
     * Out of range is clamped, exactly like `_goToPage()` does: a link whose result set is now shorter
     * lands on the last page instead of an empty one.
     */
    _restoreUrlPage() {
        if (this._urlPage <= 1)
            return;
        const target = Math.min(this._urlPage, this._pageCount());
        if (target === this._page)
            return;
        this._page = target;
        this._renderAll();
        this._syncUrlState();
    }
    /**
     * Write the state of the view into the URL with `history.replaceState`.
     *
     * `replaceState` and not `pushState`: this is a snapshot of what is on screen, not a navigation
     * log, so there is nothing to go back to — and `pushState` would add an entry per keystroke in the
     * search box. For the same reason there is no `popstate` listener.
     *
     * The params of the consumer are left alone; only the `tv_` namespace belongs to the component, and
     * inside it the keys that are not in effect are dropped. That is what makes a link shared by
     * someone with internal filters come back clean for someone who does not have them: the declared
     * groups survive, the undeclared ones are gone, and no warning was ever printed.
     *
     * Called from the three places that change the view — `_applyFilters()`, `_goToPage()` and
     * `_fetchPage()` — and gated by `_urlReady`, so mounting never rewrites the URL it just read.
     */
    _syncUrlState() {
        if (!this.stateInUrl || !this._urlReady)
            return;
        try {
            const url = new URL(window.location.href);
            const params = url.searchParams;
            // Read **before** touching the params: `url.search` serializes them live, so comparing it
            // after the writes below would always find them equal and nothing would ever be replaced.
            const before = url.search;
            // Ours to clean first: every `tv_*` key, so what is not in effect below does not linger.
            Array.from(params.keys())
                .filter((key) => key.startsWith(URL_STATE_PREFIX))
                .forEach((key) => params.delete(key));
            const term = this.searchTerm.trim();
            if (term)
                params.set(URL_STATE_KEYS.q, term);
            params.set(URL_STATE_KEYS.sortBy, this._sortField);
            params.set(URL_STATE_KEYS.sort, this._sortAsc ? 'asc' : 'desc');
            // The taxonomy only exists with a selector on screen, which API mode never has (its groups
            // come from the server, so the list is not re-scoped here).
            if (this.taxonomySelect && this.content.length > 1) {
                params.set(URL_STATE_KEYS.taxonomy, this._currentLabel());
            }
            if (this.pagination)
                params.set(URL_STATE_KEYS.page, String(this._currentPage()));
            this.filters.forEach((f) => {
                const active = this._filterActiveValues(f);
                if (active.length === 0)
                    return;
                params.set(URL_STATE_PREFIX + f.field, active.join(','));
            });
            if ('?' + params.toString() === before)
                return;
            window.history.replaceState(window.history.state, '', url.toString());
        }
        catch {
            // `replaceState` can be unavailable (sandboxed document, `file://`, a consumer that stubs the
            // history): the view works either way, it just is not shareable.
        }
    }
    /**
     * Build the query string params for the list endpoint from the current UI state.
     * Each group sends the tokens of its checked checkboxes joined by commas, which is exactly the
     * `value` of those checkboxes: a declared `[false, null]` travels as `validado=false,null`.
     */
    _buildQueryParams(page) {
        const params = {
            ...this._buildFilterQueryParams(),
            page: String(page),
            pageSize: String(this._apiPageSize()),
            sort: this._sortAsc ? 'asc' : 'desc',
            sortBy: this._sortField
        };
        return params;
    }
    /**
     * The params that describe **what** the view is showing —the search term and the active tokens of
     * every filter group— with no cursor, no page size and no order. It is what narrows the set, and it
     * is the part that both the list and the general map's `GET {url}/points` need: the map fits every
     * point at once and has no order, so the three params of the cursor are the only ones it drops.
     *
     * Spread as the **base** of the object in `_buildQueryParams` instead of appended to it, so
     * `q` and the filters keep coming out in the same place of the query string and the params the
     * list sends don't change at all.
     */
    _buildFilterQueryParams() {
        const params = {};
        if (this.searchTerm.trim())
            params.q = this.searchTerm.trim();
        this.filters.forEach((f) => {
            const active = this._filterActiveValues(f);
            if (active.length === 0)
                return;
            params[f.field] = active.join(',');
        });
        return params;
    }
    /**
     * Fetch the filter facets (`GET {url}/facets`), at most once per instance.
     * They are static values over the whole collection (counts, total and lastUpdated), so they
     * never need to be re-requested. On failure the filter panel is still built (with empty
     * counts) and `_fetchPage` falls back to the legacy `facets` of the list response when the
     * server sends them: that is why a failed request must not clear facets that
     * `_adoptLegacyApiFacets` already took.
     */
    async _loadApiFacets() {
        try {
            const data = await this._apiFetch('/facets', {});
            // Los labels se adoptan junto a los conteos, con la misma regla: si el backend no los manda,
            // cada valor se muestra con su token, que es el comportamiento de siempre.
            this._apiFacetLabels = (data && data.labels) || {};
            if (data && data.facets) {
                this._apiFacets = data.facets;
                this._apiFacetsLoaded = true;
            }
            if (data && typeof data.total === 'number')
                this._apiCollectionTotal = data.total;
            if (data && data.lastUpdated && !this.lastUpdated)
                this.lastUpdated = data.lastUpdated;
        }
        catch {
            if (!this._apiFacetsLoaded)
                this._apiFacets = {};
        }
    }
    /**
     * Wrapper around `_loadApiFacets`: requested at startup in API mode (see `_init`), in parallel
     * with the first page. The promise is cached, so it is requested only once per instance even
     * if `_toggleExpand` calls it again on the first expand.
     * It also brings the static values that only the facets response carries: the `lastUpdated`
     * of the footer and the collection `total` of the expand button counter, so both can be
     * written without re-rendering the timeline.
     */
    _ensureApiFacets() {
        if (!this.api)
            return Promise.resolve();
        if (!this._apiFacetsPromise) {
            this._apiFacetsPromise = this._loadApiFacets().then(() => {
                // El pedido terminó, con facets o con fallo: a partir de acá la visibilidad del botón la
                // decide `_buildFilterCheckboxes` sola, y se le puede colgar el listener porque el panel
                // ya tiene los valores (o se confirmó que no hay).
                this._apiFacetsSettled = true;
                this._buildFilterCheckboxes();
                if (this.api)
                    this._bindFilterToggle();
                this._syncFilterToggleState();
                this._renderRelatedCount();
                this._renderLastUpdated();
            });
        }
        return this._apiFacetsPromise;
    }
    /**
     * Fetch a page of items from the API and (re)build the whole view.
     *
     * This is the one call behind every request that **replaces** the list — the first page, the
     * refetch a search/filter/sort change schedules and the page change of the numeric paginator —
     * so it is also where the skeletons go up: what is on screen is never what is being asked for,
     * and leaving it there under a "Cargando..." line would only show the previous answer longer.
     */
    async _fetchPage(page) {
        const seq = ++this._apiSeq;
        const prevPage = this._apiPage;
        this._apiPage = page;
        // The single trigger of `_renderApiLoading`: idempotent, so `_init` and `_applyFilters` can
        // show the placeholders earlier and get a no-op here, and synchronous, so the DOM is already
        // swapped by the time the caller yields.
        this._renderApiLoading();
        // The page the cursor is on is already decided, so the URL can follow it now: the page the link
        // asked for has to travel in the address bar even while the request is still in flight, and a
        // page change is not a history entry (`replaceState`), it is the same link, seen further down.
        this._syncUrlState();
        try {
            const data = await this._apiFetch('', this._buildQueryParams(page));
            if (seq !== this._apiSeq)
                return;
            this._apiTotal = typeof data.total === 'number' ? data.total : this.allCards.length;
            this._apiLoading = false;
            this.allCards = Array.isArray(data.items) ? data.items : [];
            this._displayedCount = this.allCards.length;
            this._apiDetails.clear();
            this._adoptLegacyApiFacets(data);
            this._renderAll();
            // Page 1 means the whole list was replaced by a search/filter/sort change: bring the
            // timeline back to its first card. "Cargar más" (`_appendPageItems`) appends instead of
            // re-rendering, so it never comes through here and the position survives on its own.
            // With the paginator every fetch is a page change, and the same reasoning applies to all
            // of them: the articles in memory are not the ones the user was reading.
            if (page === 1 || this.pagination)
                this._scrollToTimelineTop();
        }
        catch {
            if (seq !== this._apiSeq)
                return;
            this._apiLoading = false;
            this._apiError = 'No se pudieron cargar los datos. Intente nuevamente.';
            // The page that was on screen is gone (its cards left with the skeletons), so the cursor
            // goes back to the one that was there. Without this the paginator would count from a page
            // that never rendered and every retry would skip one.
            this._apiPage = prevPage;
            // The cursor is back where it was, so the URL goes with it: a link that says page 3 would
            // otherwise keep promising the page that just failed.
            this._syncUrlState();
            // No `_renderAll` here: the skeletons are what is on screen, and whatever is in memory is
            // either what the panel no longer matches (search/filter/sort) or the page the user just left,
            // so neither is rendered and the list is left empty with the error row.
            this._clearApiLoading();
            this._renderStatus();
        }
    }
    /**
     * Fallback for servers that do not implement `GET {url}/facets` and still send the facets
     * inside the list response. Runs at most once: after that `_apiFacets` is never reassigned.
     * The `labels` ride along here for the same reason `facets` does, so a legacy backend can rename
     * its values too.
     */
    _adoptLegacyApiFacets(data) {
        if (this._apiFacetsLoaded || !data.facets)
            return;
        this._apiFacets = data.facets;
        this._apiFacetLabels = data.labels || {};
        this._apiFacetsLoaded = true;
        this._buildFilterCheckboxes();
        this._syncFilterToggleState();
    }
    /** Fetch the next page of items and append them to the timeline */
    async _appendPageItems() {
        const seq = this._apiSeq;
        const nextPage = this._apiPage + 1;
        this._apiLoading = true;
        this._apiError = '';
        this._renderStatus();
        try {
            const data = await this._apiFetch('', this._buildQueryParams(nextPage));
            if (seq !== this._apiSeq)
                return;
            this._apiTotal = typeof data.total === 'number' ? data.total : this._apiTotal;
            this._apiPage = nextPage;
            this._apiLoading = false;
            const start = this.allCards.length;
            const fresh = (data.items || []);
            this.allCards.push(...fresh);
            this._displayedCount = this.allCards.length;
            // Only the new cards are added; `_renderAll` would rebuild the whole list and make every
            // card on screen replay its entrance animation. See `_appendTimelineItems`.
            const added = this._appendTimelineItems(fresh, start);
            // The load-more button is kept between pages (its handler reads `this._apiPage` live, so
            // one node serves every page) and only goes away when there is nothing left to ask for.
            if (!this._hasMorePages()) {
                this.timelineCards.querySelectorAll('.timeline-load-more-item').forEach((el) => el.remove());
            }
            this._renderRelatedCount();
            this._renderStatus();
            if (this.isExpanded) {
                requestAnimationFrame(() => this._setupTimelineObserver(added));
            }
        }
        catch {
            if (seq !== this._apiSeq)
                return;
            this._apiLoading = false;
            this._apiError = 'No se pudieron cargar más datos. Intente nuevamente.';
            this._renderStatus();
        }
    }
    /** Fetch the full detail of a single item by id */
    async _fetchDetail(id) {
        const seq = ++this._apiSeq;
        try {
            const data = await this._apiFetch(`/${encodeURIComponent(id)}`, {});
            if (seq !== this._apiSeq)
                return null;
            if (!data || data.id == null) {
                this._apiDetails.set(id, null);
                return null;
            }
            this._apiDetails.set(id, data);
            return data;
        }
        catch {
            if (seq !== this._apiSeq)
                return null;
            this._apiDetails.set(id, null);
            return null;
        }
    }
    /**
     * Debounce a full page reload triggered by filter/search/sort changes.
     *
     * Two shapes, because the triggers are not alike:
     * - `immediate` (a single discrete action: a checkbox, a sort option, Escape on the search
     *   input) has no burst to coalesce, so waiting the whole window is pure added latency: the
     *   request goes out on the leading edge and the window only swallows what comes next.
     * - without it (typing in the search input) the classic trailing debounce applies, because a
     *   leading request per keystroke would ask the server for every prefix of the term.
     *
     * A trigger that lands inside an open window always re-arms it with a request, so the last
     * state of a burst is always the one that lands last.
     */
    _schedulePageReload(immediate = false) {
        const reload = () => {
            this._apiReloadTimer = 0;
            void this._fetchPage(1);
        };
        if (this._apiReloadTimer) {
            window.clearTimeout(this._apiReloadTimer);
            this._apiReloadTimer = window.setTimeout(reload, API_RELOAD_DEBOUNCE_MS);
            return;
        }
        if (immediate) {
            void this._fetchPage(1);
            this._apiReloadTimer = window.setTimeout(() => {
                this._apiReloadTimer = 0;
            }, API_RELOAD_DEBOUNCE_MS);
            return;
        }
        this._apiReloadTimer = window.setTimeout(reload, API_RELOAD_DEBOUNCE_MS);
    }
    /**
     * Replace the list (and the featured stack) with skeleton placeholders while an API list
     * request is in flight.
     *
     * One trigger, one meaning: every API request that **replaces** the list. `_fetchPage` owns it —
     * the first page, the refetch a search/filter/sort change schedules and the page change of the
     * numeric paginator — so what is on screen is always missing or stale, and `_renderAll` puts the
     * real results back when the response lands. The two direct callers above it are conveniences,
     * not a second rule: `_init` shows them before the first page goes out, and `_applyFilters` does
     * it at the click so the placeholders are already up while the debounce window is open (and so
     * they survive into the fetch). "Cargar más" (`_appendPageItems`) does not come through here: it
     * keeps the list the user is reading, which is what a request that only adds to it should do.
     *
     * Idempotent, which is what lets those callers exist: a burst of keystrokes, or a `_fetchPage`
     * that lands on top of an already-showing one, shows the skeleton once. The state lives in the DOM
     * (a placeholder element), which is also what `_renderStatus` checks to stay out of the way, so
     * there is nothing to keep in sync when the render lands.
     *
     * The placeholders copy the silhouette of a real collapsed card (empty `.card-image-wrap` +
     * title + summary lines) so the list keeps its size when the data lands; see the
     * `.timeline-skeleton-item` rules for the sizes and for why the cards column has to grow.
     *
     * How many there are is not a constant: the list box is scrollable, so filling it with one
     * placeholder per item of the page would bury most of them out of sight behind a scrollbar
     * that is about to be replaced anyway. One placeholder is enough to measure the real stride,
     * and `_getCardsHeightPx` gives the height to divide it by (the inline height of the resize
     * handle, or the CSS `max-height`), so the count follows the box the user actually sees. The
     * result is capped at `_apiPageSize`, because a skeleton past that would be promising cards
     * the response does not carry.
     */
    _renderApiLoading() {
        if (this.timelineCards.querySelector('.timeline-skeleton-item'))
            return;
        this._apiLoading = true;
        this._apiError = '';
        this.timelineCards.setAttribute('aria-busy', 'true');
        // Same reason as in `_renderTimeline`: the cards about to be dropped may be holding an
        // OpenLayers map of their topics, and `dispose()` does not happen on its own.
        this._destroyTemasMaps();
        this.timelineCards.innerHTML = '';
        this.featuredContainer.innerHTML = '';
        const markup = `
        <div class="timeline-date-col">
          <div class="skeleton-block skeleton-date"></div>
          <div class="timeline-dot"></div>
        </div>
        <div class="timeline-card">
          <div class="card-image-wrap"></div>
          <div class="card-body">
            <div class="skeleton-block skeleton-title-line skeleton-w-100"></div>
            <div class="skeleton-block skeleton-title-line skeleton-w-80"></div>
            <div class="skeleton-block skeleton-desc-line skeleton-w-100"></div>
            <div class="skeleton-block skeleton-desc-line skeleton-w-100"></div>
            <div class="skeleton-block skeleton-desc-line skeleton-w-60"></div>
          </div>
        </div>
      `;
        const first = this._appendTimelineSkeleton(markup);
        const style = getComputedStyle(first);
        const stride = first.offsetHeight + (parseFloat(style.marginBottom) || 0);
        const total = Math.max(1, Math.min(this._apiPageSize(), Math.ceil(this._getCardsHeightPx() / stride)));
        for (let i = 1; i < total; i++)
            this._appendTimelineSkeleton(markup);
        // Ídem con los featured: en fullpage no se renderizan en ningún momento (ver `_renderFeatured`).
        // Con el paginador el stack está congelado en la página 1 (`_apiFeatured`), pero se reconstruye
        // desde ahí cuando llegan los datos, así que también puede placearse en un cambio de página.
        if (this.fullpage)
            return;
        for (let i = 0; i < this.featured_count; i++) {
            const el = document.createElement('div');
            el.className = 'featured-card featured-skeleton visible';
            el.setAttribute('aria-hidden', 'true');
            el.innerHTML = `
        <div class="card-image-wrap"></div>
        <div class="card-body">
          <div class="skeleton-block skeleton-desc-line skeleton-w-50"></div>
          <div class="skeleton-block skeleton-title-line skeleton-w-100"></div>
          <div class="skeleton-block skeleton-title-line skeleton-w-80"></div>
        </div>
      `;
            this.featuredContainer.appendChild(el);
        }
    }
    /**
     * One timeline placeholder, so the count loop and the measuring placeholder share the markup.
     * Returns the element because the caller measures the first one to size the rest.
     */
    _appendTimelineSkeleton(markup) {
        const el = document.createElement('div');
        el.className = 'timeline-item timeline-skeleton-item visible';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = markup;
        this.timelineCards.appendChild(el);
        return el;
    }
    /**
     * Take the loading state down without touching anything else, for the two paths where no
     * `_renderAll` follows: a failed request (so the list is left empty with the error row) and
     * the real render itself (which wipes both containers anyway, leaving only `aria-busy`).
     */
    _clearApiLoading() {
        this.timelineCards.removeAttribute('aria-busy');
        this.timelineCards.querySelectorAll('.timeline-skeleton-item').forEach((el) => el.remove());
        this.featuredContainer.querySelectorAll('.featured-skeleton').forEach((el) => el.remove());
    }
    /**
     * The **total** behind the count row (the "de Y" of "Mostrando A-B de Y"): what the whole
     * filtered result is, never what is on screen. API mode reads the `total` the server sent with
     * the page, local mode the filtered pool. Shared by the row at the end and by its mirror at the
     * top so the two can never disagree on it.
     */
    _statusTotal() {
        return this.api ? this._apiTotal : this.allCards.length;
    }
    /**
     * The count line of the status row: "Mostrando 11-20 de 55 publicaciones", or `''` when there is
     * nothing to count. A **range** of positions rather than a bare amount, because what is on screen
     * is always a slice of the result set and never the whole thing.
     *
     * Where the two numbers come from is the only real difference between the modes:
     *
     * - the **total**: in API mode the `total` the server sent (`_apiTotal`, i.e. search + filters),
     *   in local mode `allCards.length`, which is the filtered pool in its entirety.
     * - how much of it is on screen: in API mode `allCards` **is** the page (or everything loaded so
     *   far, with "Cargar más"), but in local mode `allCards` always holds the whole pool, so what is
     *   on screen is what `_localDisplayCards` returns — the same list `_renderTimeline` was given.
     * - where the range **starts**: with the paginator, the position the current page begins at, and
     *   with "Cargar más" always 1, since the list only grows downward. `itemsPerPage: 0` (no
     *   pagination) makes the page size 0, which collapses the start to 1 and puts the whole list on
     *   screen.
     *
     * The end is `start` plus what is in memory, clamped to the total because a server can return
     * more items than the page size asked for, and a range past the total reads as a bug. The two
     * guards are not decoration either: without the first a page that came back empty would render an
     * impossible range like "12-10/19", and without the second a result set of zero has no count to
     * show. The caller skips the row when this returns `''`.
     */
    _statusCountText() {
        const total = this._statusTotal();
        const count = this.api ? this.allCards.length : this._localDisplayCards().length;
        if (total <= 0 || count === 0)
            return '';
        const start = this.pagination ? (this._currentPage() - 1) * this._pageSize() + 1 : 1;
        const end = Math.min(start + count - 1, total);
        return `Mostrando ${start}-${end} de ${total} publicaciones`;
    }
    /**
     * Write (or take down) the count row at the **top** of the list: the mirror of the one
     * `_renderStatus` puts at its end, with the very same text, and only when the result set is
     * bigger than `STATUS_TOP_MIN_ITEMS`.
     *
     * It is inserted as the first child of `#timeline-cards`, which is exactly "below the taxonomy
     * row": that row lives right above `#timeline-cards` in the layout, so the two are neighbours
     * whether taxonomies exist or not.
     *
     * It deliberately carries neither `.timeline-item` nor `.timeline-status-item`:
     *
     * - Not `.timeline-item`, because every article selector —the ones in this repo's suites, and
     *   the documented pattern for consumers' ones— is `.timeline-item:not(<control rows>)`: a
     *   control row that is a `.timeline-item` without one of those extra classes reads as an
     *   article.
     * - Not `.timeline-status-item`, because the two helpers that own the bottom row look it up
     *   with `querySelector`, which returns the first match in document order — and this row is
     *   always the first child, so it would be the one `_renderStatus` removes on the next pass,
     *   and the anchor `_insertBeforeTrailing` would insert appended cards above it.
     *
     * It owns no state: it is rebuilt from `_statusCountText()` on every `_renderStatus`, so it can
     * never disagree with the row at the end, and it takes itself down when there is no count to
     * show (empty result, error, first API page still loading). While the skeletons are up
     * `_renderStatus` returns before getting here, and the list they replaced already took the row
     * with it.
     */
    _renderTopStatus() {
        this.timelineCards.querySelectorAll('.timeline-status-top').forEach((el) => el.remove());
        if (this._statusTotal() <= STATUS_TOP_MIN_ITEMS)
            return;
        const text = this._statusCountText();
        if (!text)
            return;
        const el = document.createElement('div');
        el.className = 'timeline-status-top';
        el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-footer-dot"></div>
      </div>
      <div class="timeline-status-text">${text}</div>
    `;
        this.timelineCards.insertBefore(el, this.timelineCards.firstChild);
    }
    /**
     * Render the status row (error / loading / count) at the end of the timeline.
     *
     * The error and the loading lines are API-only: the local mode has no request of its own to fail
     * or to wait for, so all it ever renders here is the count.
     *
     * With the numeric paginator the **loading** line never reaches this row even in API mode: the
     * request that changes the page is one of the replacing ones (`_fetchPage`), so it shows the
     * skeletons instead, and the guard below keeps `_renderStatus` out of the way while they are up.
     * What is left is the count, which the paginator does not replace: the paginator says which page
     * it is and how many pages there are, while the count says which slice of the filtered result is
     * on screen.
     */
    _renderStatus() {
        // The skeletons are the loading feedback while the list is being replaced, and their count
        // already matches the page that is coming. Adding a row on top of them would only pile a
        // second, wrong line ("Cargando más publicaciones...") under the placeholders.
        if (this.timelineCards.querySelector('.timeline-skeleton-item'))
            return;
        this._renderTopStatus();
        const prev = this.timelineCards.querySelector('.timeline-status-item');
        if (prev)
            prev.remove();
        let text = '';
        if (this._apiError)
            text = this._apiError;
        else if (this._apiLoading && this.allCards.length === 0)
            text = 'Cargando publicaciones...';
        // Only "Cargar más" (`_appendPageItems`) gets here with cards on screen, and it only exists
        // without the paginator: there the page being fetched is genuinely "more" of the current one.
        else if (this._apiLoading && this.allCards.length > 0)
            text = 'Cargando más publicaciones...';
        else
            text = this._statusCountText();
        if (!text)
            return;
        const el = document.createElement('div');
        el.className = 'timeline-item timeline-status-item';
        el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-footer-dot"></div>
      </div>
      <div class="timeline-status-text">${text}</div>
    `;
        this._insertBeforeFooter(el);
    }
    /**
     * Sync the active class on the search/filter/internal-filters toggle buttons.
     * Each button is lit by the groups **it** holds, not by any active filter: the `filtros_internos`
     * groups live in the flyout, so they only light the flyout button and never the one of the panel.
     */
    _syncFilterToggleState() {
        const isActive = (f) => f.active.size > 0;
        if (this.filterToggle)
            this.filterToggle.classList.toggle('active', this.filters.some((f) => f.group !== 'filtros_internos' && isActive(f)));
        const internosActive = this.filters.some((f) => f.group === 'filtros_internos' && isActive(f));
        if (this.filtrosInternosToggle)
            this.filtrosInternosToggle.classList.toggle('active', internosActive);
        this.searchWrap.classList.toggle('active', this.searchTerm.trim().length > 0);
    }
    /**
     * Apply active filters and re-render the full view (or reload from the API).
     * `immediate` only means something in API mode: it asks for the leading edge of
     * `_schedulePageReload`, for the discrete changes that have nothing to coalesce.
     */
    _applyFilters(immediate = false) {
        this._syncFilterToggleState();
        // El mapa general muestra **el mismo scope filtrado** que la lista, así que un cambio acá también
        // lo cambia a él. Va acá y no en `_renderAll` porque `_renderAll` también corre en un cambio de
        // página, que no narrowea nada: con el mapa abierto el filtro tiene que re-preguntar los puntos,
        // y con el mapa cerrado no hay ni request ni trabajo que hacer (abrirlo lo llama igual).
        if (this._fullMapOpen)
            void this._refreshFullMap();
        if (this.api) {
            // The results on screen no longer match the panel, so they go away right now instead of
            // sitting there stale until the response: `_renderApiLoading` puts the skeletons in their
            // place and `_fetchPage(1)` replaces them when the data lands.
            this._renderApiLoading();
            this._schedulePageReload(immediate);
            return;
        }
        const matches = (c) => this._matchesSearch(c) &&
            this.filters.every((f) => {
                const active = this._filterActiveTokens(f);
                if (active.length === 0)
                    return true;
                return this._filterValuesOf(f, c).some((x) => active.includes(x));
            });
        this.allCards = this._sortBy(this._scopeItems().filter(matches));
        this._featuredCards = this._sortBy(this._allItems().filter(matches));
        if (this.pagination) {
            // Search, filters, sort and taxonomy re-scope all narrow or reorder the pool, so the page
            // the user was on may not even exist in the new one: every one of them starts over at the
            // first page. The API branch above already gets this from `_fetchPage(1)`.
            this._page = 1;
        }
        else if (this.itemsPerPage > 0) {
            this._displayedCount = this.itemsPerPage;
        }
        this._renderAll();
        // The URL follows the view, and here it is already back on page 1: narrowing the pool starts
        // over, so the page of the previous link has to leave the address bar with it. The API branch
        // does not write here because its page cursor belongs to the request that is about to go out,
        // and that is `_fetchPage` who writes it when it lands.
        this._syncUrlState();
    }
    /** Label of the expand toggle; uses the custom function when provided, otherwise the Spanish singular/plural default */
    _relatedLabel(n) {
        if (this.relatedLabel)
            return this.relatedLabel(n);
        return n === 1 ? 'publicación relacionada' : 'publicaciones relacionadas';
    }
    /** Write the expand toggle label into `#remaining-text`; the label is injected as HTML, so it may contain markup */
    _setRelatedLabel(n) {
        const el = this.container.querySelector('#remaining-text');
        if (el)
            el.innerHTML = this._relatedLabel(n);
    }
    /**
     * Write the expand toggle counter and its label. Both count the **whole pool**, never the
     * filtered one: in local mode `_allItems().length`, in API mode the static `total` of
     * `/facets` (0 until that response lands, or forever if the endpoint doesn't send it).
     * Extracted from `_renderAll` so the facets response can patch the counter when it arrives
     * without re-rendering the timeline.
     */
    _renderRelatedCount() {
        const n = this.api ? this._apiCollectionTotal : this._allItems().length;
        this.remainingCount.textContent = String(n);
        this._setRelatedLabel(n);
    }
    /** Render featured cards, timeline, and load-more button if needed */
    _renderAll() {
        if (this.api) {
            // The placeholders are about to come down, so read the state before they do: it says
            // whether the cards that replace them have to show up in place instead of entering (see
            // `_renderTimeline`). The DOM is the source of truth for it, like it is for `_renderStatus`.
            const hadSkeletons = this.timelineCards.querySelector('.timeline-skeleton-item') !== null;
            this._clearApiLoading();
            this._renderRelatedCount();
            this._renderFeatured(this._apiFeatured());
            this._renderTimeline(this.allCards, hadSkeletons);
            if (this.pagination) {
                this._renderPaginator();
            }
            else if (this._hasMorePages()) {
                this._renderLoadMoreButton();
            }
            this._renderStatus();
            requestAnimationFrame(() => {
                this.featuredContainer.querySelectorAll('.featured-card').forEach((c) => c.classList.add('visible'));
            });
            if (this.isExpanded && !hadSkeletons) {
                requestAnimationFrame(() => this._setupTimelineObserver());
            }
            return;
        }
        const featured = this._featuredCards.filter((c) => c.capturado !== false).slice(0, this.featured_count);
        this._renderRelatedCount();
        this._renderFeatured(featured);
        this._renderTimeline(this._localDisplayCards());
        if (this.pagination) {
            this._renderPaginator();
        }
        else if (this.itemsPerPage > 0 && this._displayedCount < this.allCards.length) {
            this._renderLoadMoreButton();
        }
        this._renderStatus();
        requestAnimationFrame(() => {
            this.featuredContainer.querySelectorAll('.featured-card').forEach((c) => c.classList.add('visible'));
        });
        if (this.isExpanded) {
            requestAnimationFrame(() => this._setupTimelineObserver());
        }
    }
    /**
     * Cards shown in the local timeline, out of the filtered `allCards`.
     *
     * Two shapes for the same list, picked by the `pagination` option: the paginator takes the
     * window of the current page, while "Cargar más" takes everything loaded so far, which grows
     * with every click. `itemsPerPage: 0` means no pagination at all, so the whole list goes out
     * in both cases.
     */
    _localDisplayCards() {
        if (this.itemsPerPage <= 0)
            return this.allCards;
        if (!this.pagination)
            return this.allCards.slice(0, this._displayedCount);
        const start = (this._page - 1) * this.itemsPerPage;
        return this.allCards.slice(start, start + this.itemsPerPage);
    }
    /**
     * Featured stack in API mode, where it is built out of the items in memory — that is, out of
     * the page on screen.
     *
     * With the paginator that would make the stack follow the navigation: collapsing the timeline
     * on page 3 would show page 3's articles as "the" featured ones, even though the user never
     * asked for them. So the stack is captured on the first page and kept from then on, which is
     * also what the local mode does for free: there `_featuredCards` is the whole filtered pool,
     * so the paginator cannot move it either.
     */
    _apiFeatured() {
        const captured = this.allCards.filter((c) => c.capturado !== false).slice(0, this.featured_count);
        if (!this.pagination)
            return captured;
        if (this._apiPage > 1 && this._apiFeaturedCards.length > 0)
            return this._apiFeaturedCards;
        this._apiFeaturedCards = captured;
        return captured;
    }
    /** Render the "load more" button and wire its click handler */
    _renderLoadMoreButton() {
        const el = document.createElement('div');
        el.className = 'timeline-item timeline-load-more-item';
        el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-load-more-dot"></div>
      </div>
      <div class="timeline-load-more-wrap">
        <button class="timeline-load-more-btn">Cargar m&aacute;s <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,9 12,15 18,9"/></svg></button>
      </div>
    `;
        el.querySelector('.timeline-load-more-btn').addEventListener('click', () => {
            if (this.api) {
                if (!this._apiLoading)
                    void this._appendPageItems();
                return;
            }
            const start = this._displayedCount;
            const end = Math.min(start + this.itemsPerPage, this.allCards.length);
            const more = this.allCards.slice(start, end);
            el.remove();
            more.forEach((card, i) => {
                this._insertBeforeFooter(this._createTimelineItem(card, i));
            });
            this._displayedCount = end;
            if (this._displayedCount < this.allCards.length) {
                this._renderLoadMoreButton();
            }
            // The range grew with the list, and only the button is re-rendered by the click itself, so
            // the count row would keep saying "1-10 de 19" until the next full render.
            this._renderStatus();
            if (this.isExpanded) {
                requestAnimationFrame(() => this._setupTimelineObserver());
            }
        });
        this._insertBeforeFooter(el);
    }
    /**
     * Render the numeric paginator: "‹ Anterior | Página X de Y | Siguiente ›".
     *
     * The counterpart of `_renderLoadMoreButton`, and mutually exclusive with it (see `_renderAll`):
     * "Cargar más" grows one list downward, the paginator swaps one page for another, so it renders
     * "Página X de Y" instead of a growing counter and the two arrows go back and forth.
     *
     * It sits in the same trailing slot as the load-more button, which is the one `_insertBeforeTrailing`
     * looks for, so appending cards in "Cargar más" mode still lands above it.
     *
     * Nothing is rendered when there is a single page: a lone "Página 1 de 1" with both arrows dead
     * is noise. The handlers read `_currentPage` / `_pageCount` on click rather than closing over
     * the numbers of this render, so they stay correct after the arrows are re-rendered disabled.
     */
    _renderPaginator() {
        if (this.itemsPerPage <= 0)
            return;
        const total = this._pageCount();
        if (total <= 1)
            return;
        const current = this._currentPage();
        const el = document.createElement('div');
        el.className = 'timeline-item timeline-paginator-item';
        el.innerHTML = `
      <div class="timeline-date-col">
        <div class="timeline-dot timeline-paginator-dot"></div>
      </div>
      <div class="timeline-paginator-wrap">
        <button class="timeline-paginator-btn timeline-paginator-prev" ${current <= 1 ? 'disabled' : ''}>Anterior</button>
        <div class="timeline-paginator-text" aria-live="polite">P&aacute;gina ${current} de ${total}</div>
        <button class="timeline-paginator-btn timeline-paginator-next" ${current >= total ? 'disabled' : ''}>Siguiente</button>
      </div>
    `;
        el.querySelector('.timeline-paginator-prev').addEventListener('click', () => {
            void this._goToPage(this._currentPage() - 1);
        });
        el.querySelector('.timeline-paginator-next').addEventListener('click', () => {
            void this._goToPage(this._currentPage() + 1);
        });
        this._insertBeforeFooter(el);
    }
    /**
     * Go to a page of the current result set, in both modes.
     *
     * Both replace the list instead of appending to it, which is the whole difference with "Cargar
     * más": what is on screen after the change is not what was there before, so keeping the old
     * cards would be a lie. The API branch therefore reuses `_fetchPage`, the very same call the
     * search, the filters and the sort already make, and the local branch re-renders from
     * `allCards`, which always holds the whole filtered pool. Being a replacement, the API branch
     * also swaps the list for the skeletons on the click (inside `_fetchPage`), instead of leaving
     * the page being left on screen under a "Cargando página N..." line.
     *
     * Out-of-range pages are clamped rather than rejected, so a shorter result set (the filters
     * changed underneath, say) lands on the last page instead of an empty one.
     */
    async _goToPage(page) {
        const total = this._pageCount();
        const target = Math.max(1, Math.min(page, total));
        if (target === this._currentPage())
            return;
        if (this.api) {
            // `_fetchPage` bumps `_apiSeq`, so a page still in flight is dropped: the one that lands
            // last is the one on screen, and the paginator is re-rendered by its own `_renderAll`.
            const pending = this._fetchPage(target);
            // It puts the skeletons up before its first await, so the list is already the new (empty)
            // one here: scrolling now lands on the top of it instead of waiting for the response, which
            // matters in fullpage, where the page scrolls and `timelineCards.scrollTop` does nothing.
            // `_fetchPage` re-aligns when the data lands, so this is not the only chance.
            this._scrollToTimelineTop();
            await pending;
            return;
        }
        this._page = target;
        this._renderAll();
        this._syncUrlState();
        this._scrollToTimelineTop();
    }
    /** Read the current effective max-height of the timeline-cards in px */
    _getCardsHeightPx() {
        // En fullpage no hay caja con scroll: el `max-height` del SCSS es `none` y parsearlo
        // daría NaN -> el mínimo del resize handle, o sea un solo skeleton. Lo que el usuario ve
        // es el viewport (la página scrollea), así que se mide contra eso.
        if (this.fullpage)
            return window.innerHeight;
        const inline = this.timelineCards.style.maxHeight;
        const px = inline && inline.endsWith('px') ? parseFloat(inline) : NaN;
        if (Number.isFinite(px))
            return px;
        const computed = getComputedStyle(this.timelineCards).maxHeight;
        const match = computed ? parseFloat(computed) : NaN;
        return Number.isFinite(match) ? match : RESIZE_MIN_HEIGHT;
    }
    /** Clamp and apply a max-height (px) to the timeline-cards */
    _applyCardsHeight(value) {
        const clamped = Math.min(RESIZE_MAX_HEIGHT, Math.max(RESIZE_MIN_HEIGHT, Math.round(value)));
        this.timelineCards.style.maxHeight = clamped + 'px';
        this._syncResizeHandleA11y();
    }
    /** Persist the current height to localStorage */
    _persistCardsHeight() {
        try {
            window.localStorage.setItem(RESIZE_STORAGE_KEY, String(this._getCardsHeightPx()));
        }
        catch {
            /* localStorage unavailable */
        }
    }
    /** Keep the resize handle aria attributes in sync with the current height */
    _syncResizeHandleA11y() {
        this.resizeHandle.setAttribute('aria-valuemin', String(RESIZE_MIN_HEIGHT));
        this.resizeHandle.setAttribute('aria-valuemax', String(RESIZE_MAX_HEIGHT));
        this.resizeHandle.setAttribute('aria-valuenow', String(this._getCardsHeightPx()));
    }
    /** Set up the timeline-cards resize handle: drag, keyboard and localStorage persistence */
    _initResizeHandle() {
        this.resizeHandle = this.container.querySelector('#timeline-resize-handle');
        if (!this.resizeHandle)
            return;
        const onPointerDown = (e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = this._getCardsHeightPx();
            const onPointerMove = (ev) => {
                this._applyCardsHeight(startHeight + (ev.clientY - startY));
            };
            const onPointerUp = () => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);
                this.section.classList.remove('resizing');
                this._persistCardsHeight();
            };
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
            this.section.classList.add('resizing');
        };
        const onKeyDown = (e) => {
            let delta = 0;
            if (e.key === 'ArrowUp')
                delta = -RESIZE_STEP;
            else if (e.key === 'ArrowDown')
                delta = RESIZE_STEP;
            else if (e.key === 'Home')
                delta = -RESIZE_MAX_HEIGHT;
            else if (e.key === 'End')
                delta = RESIZE_MAX_HEIGHT;
            else
                return;
            e.preventDefault();
            this._applyCardsHeight(this._getCardsHeightPx() + delta);
            this._persistCardsHeight();
        };
        try {
            const raw = window.localStorage.getItem(RESIZE_STORAGE_KEY);
            if (raw !== null) {
                const value = Number(raw);
                if (Number.isFinite(value))
                    this._applyCardsHeight(value);
            }
        }
        catch {
            /* localStorage unavailable */
        }
        this._syncResizeHandleA11y();
        this.resizeHandle.addEventListener('pointerdown', onPointerDown);
        this.resizeHandle.addEventListener('keydown', onKeyDown);
    }
    /** Render a single already-expanded card without any timeline chrome when `singleId` is set */
    async _renderSingleCard() {
        const workNotesHtml = this.internalButtons
            ? `<div class="single-mode-toolbar">
            <button class="work-notes-toggle" id="work-notes-toggle" title="Ocultar notas de trabajo" aria-pressed="false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l5-5V5a2 2 0 0 0-2-2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>
            </button>
          </div>`
            : '';
        this.container.innerHTML = `<section class="publicaciones-timeline-section single-mode" id="publicaciones-timeline-section">${workNotesHtml}</section>`;
        this.section = this.container.querySelector('#publicaciones-timeline-section');
        this.workNotesToggle = this.container.querySelector('#work-notes-toggle');
        if (this.workNotesToggle) {
            this._applyWorkNotesState();
            this.workNotesToggle.addEventListener('click', () => this._toggleWorkNotes());
        }
        const id = this.singleId || '';
        let card;
        if (this.api) {
            card = this._apiDetails.get(id) || (await this._fetchDetail(id));
        }
        else {
            card = this._allItems().find((it) => String(it.id) === id) || null;
        }
        if (!card) {
            this.section.innerHTML = `<div class="single-mode-message">No se encontró el artículo ${id}.</div>`;
            return;
        }
        const itemEl = this._createTimelineItem(card, 0);
        const dateCol = itemEl.querySelector('.timeline-date-col');
        if (dateCol)
            dateCol.remove();
        const collapseBtn = itemEl.querySelector('.card-collapse');
        if (collapseBtn)
            collapseBtn.remove();
        itemEl.classList.add('visible');
        const cardEl = itemEl.querySelector('.timeline-card');
        cardEl.classList.add('expanded');
        this.section.appendChild(itemEl);
        await this._ensureCardDetail(cardEl);
        this._preloadEmbedLibraries();
        this._processCardEmbeds(cardEl);
    }
    /** Initialize the component: build layout, sort data, render, bind events */
    _init() {
        if (this.singleId) {
            void this._renderSingleCard();
            return;
        }
        this._buildLayout();
        // Applied before _applyFilters: the timeline observer is attached from _renderAll
        // (guarded by isExpanded), and it must find the container already open, otherwise
        // the items would intersect a collapsed (max-height: 0) container and never show.
        if (this.isExpanded)
            this._applyExpandState();
        // En fullpage la lista no tiene scroll propio, así que no hay nada que ajustar: tampoco se
        // lee el alto persistido, que escribiría un `max-height` inline sobre el `none` del SCSS.
        if (!this.fullpage)
            this._initResizeHandle();
        // A shared link opens with the term already written in the box: `_buildLayout` emits it empty,
        // and a search applied with an input that says nothing reads as a filter nobody can undo. The
        // wrap opens too, or the term would be typed (and hidden) behind the collapsed circle.
        if (this.searchTerm) {
            this.searchInput.value = this.searchTerm;
            this.searchWrap.classList.add('open');
        }
        if (this.api) {
            this._bindBaseEvents();
            this._renderApiLoading();
            // The checkboxes are built here, before the first page, so the values a group presets with
            // `checked` travel in the initial query just like in local mode. With no facets yet the
            // derived groups have nothing to show, so nothing can be checked before they arrive: the
            // panel is rebuilt with the counts by `_ensureApiFacets()`. A group that declares `items`
            // shows them right away (with the counts in zero) and the rebuild only fills the counts.
            // Same thing for a URL: its tokens are assigned before this, because the values they have to
            // be crossed with may only arrive with the facets, and by then the first page is already out.
            this._applyUrlFilterState();
            this._buildFilterCheckboxes();
            this._syncFilterToggleState();
            // The facets travel the static values of the collection (counts, total, lastUpdated) and
            // the expand toggle shows two of them before the user interacts, so they are requested
            // here, in parallel with the first page, and not on the first expand. They are requested
            // even with no filter group declared, because the total and the `lastUpdated` they carry
            // feed the expand counter and the footer. Waiting would gain nothing: the defaults of the
            // checkboxes above do not depend on the facets.
            void this._ensureApiFacets();
            // The URL is writable from here on. It was not before, so mounting leaves the query it just
            // read alone; the request below can now write the page it lands on (or the one it clamps to).
            this._urlReady = true;
            // The embed preload reads the rendered cards, so it waits for the first page. With
            // `stateInUrl` the first page is the one the link asked for.
            void this._fetchPage(this._urlPage).then(() => {
                // The link may ask for a page that does not exist anymore (a filter left fewer results than
                // that, the link is older than the filter): instead of opening on an empty list it falls
                // back to the first, like the clamp of `_goToPage()` does, and the `_syncUrlState()` of that
                // refetch leaves the URL corrected.
                if (this._urlPage > 1 && this.allCards.length === 0 && !this._apiError) {
                    void this._fetchPage(1);
                }
                if (this.isExpanded)
                    this._preloadEmbedLibraries();
            });
            return;
        }
        this._applyUrlFilterState();
        this._buildFilterCheckboxes();
        // The pagination cursor is reset by `_applyFilters` below, which is the only place that
        // decides it, so it does not have to be seeded here: `_restoreUrlPage`, right after, is what
        // puts back the page the URL asked for.
        this._applyFilters();
        // Writable from here on: `_restoreUrlPage` below is the first thing that can write the URL, and
        // it does it when it had to clamp the page of the link.
        this._urlReady = true;
        this._restoreUrlPage();
        if (this.isExpanded)
            this._preloadEmbedLibraries();
        requestAnimationFrame(() => {
            const cards = this.featuredContainer.querySelectorAll('.featured-card');
            cards.forEach((c) => c.classList.add('visible'));
        });
        this._bindBaseEvents();
    }
    /**
     * Close the toolbar's floating menus, leaving out the one that is about to open. Only one can be
     * open at a time: without this the filter panel and the sort menu overlap. `except` is the menu
     * the caller is about to toggle, so its own state is left alone —closing the others and then
     * toggling is what gives the "switch" behaviour—. The `select` list inside the filter panel is
     * not a menu of this group: it closes with the panel.
     */
    _closeOtherMenus(except) {
        if (except !== 'filter' && this.filterMenu) {
            this.filterMenu.classList.remove('open');
            this.filterToggle?.classList.remove('open');
        }
        if (except !== 'sort' && this.sortMenu) {
            this.sortMenu.classList.remove('open');
            this.sortToggle?.classList.remove('open');
            this.sortToggle?.setAttribute('aria-expanded', 'false');
        }
        if (except !== 'internal' && this.filtrosInternosMenu) {
            this.filtrosInternosMenu.classList.remove('open');
            this.filtrosInternosToggle?.classList.remove('open');
        }
    }
    /**
     * Bind the click of the filter toggle. Split out of `_bindBaseEvents` because in API mode the
     * button is on screen from the start but the panel has no values until the facets land: until
     * then there is nothing to open, so the click does nothing. Called from `_bindBaseEvents` in
     * local mode and from the `.then()` of `_ensureApiFacets` in API mode, which runs once.
     */
    _bindFilterToggle() {
        if (!this.filterToggle || !this.filterMenu)
            return;
        this.filterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this._closeOtherMenus('filter');
            this.filterMenu?.classList.toggle('open');
            this.filterToggle?.classList.toggle('open');
        });
    }
    /**
     * Bind the sort control: the button opens/closes the menu, and a change in any of its radios
     * applies the order. Without `sorters` there is no button and this is a no-op. The menu does not
     * close on change —picking a field and then a direction is two changes—, only on the same
     * outside click that closes the filter panel (see the `document` listener in `_bindBaseEvents`).
     * Unlike the filter panel, the sort menu has all its options from `_buildLayout`, so it is bound
     * once and not rebuilt when the facets land.
     */
    _bindSortToggle() {
        if (!this.sortToggle || !this.sortMenu)
            return;
        this.sortToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = !this.sortMenu?.classList.contains('open');
            this._closeOtherMenus('sort');
            this.sortMenu?.classList.toggle('open', open);
            this.sortToggle?.classList.toggle('open', open);
            this.sortToggle?.setAttribute('aria-expanded', String(open));
        });
        this.sortMenu.addEventListener('change', (e) => {
            const input = e.target;
            if (!input || input.type !== 'radio')
                return;
            if (input.name === 'tv-sort-field')
                this._applySort(input.value, this._sortAsc);
            else if (input.name === 'tv-sort-dir')
                this._applySort(this._sortField, input.value === 'asc');
        });
    }
    /**
     * Open the search field and put the caret in it.
     *
     * The field is a single element in both states —collapsed it is the magnifier circle, `open` it is
     * the pill— so the only way in is focusing it: the mouse click and the <kbd>Tab</kbd> both land
     * here, and there is no toggle button left to click.
     */
    _openSearch() {
        this.searchWrap.classList.add('open');
        this.searchInput.focus();
    }
    /**
     * Collapse the search field, but only when it isn't filtering. A term the user wrote is a filter
     * in use: collapsing it on the next outside click would hide the search that is narrowing the list
     * —and hide the only place where it can be taken off—. `Escape` clears the value first, so it does
     * close it: the caller that empties the field passes `force`.
     */
    _closeSearch(force = false) {
        if (!force && this.searchInput.value.trim().length > 0)
            return;
        this.searchWrap.classList.remove('open');
    }
    /** Bind the header/global event listeners shared by both local and API modes */
    _bindBaseEvents() {
        // En fullpage el botón de expandir es solo el contador: no se le bindea el colapso.
        if (!this.fullpage)
            this.expandToggle.addEventListener('click', () => this._toggleExpand());
        this.featuredContainer.addEventListener('click', () => this._toggleExpand());
        this.featuredRow.addEventListener('click', (e) => {
            if (this.isExpanded)
                return;
            if (e.target.closest('.expand-toggle, .featured-cards, .sort-wrap, .filter-toggle, .filter-menu, .search-wrap, .work-notes-toggle, .filtros-internos-toggle, .filtros-internos-wrap, .fullmap-toggle, .fullmap-wrap'))
                return;
            this._toggleExpand();
        });
        this._bindSortToggle();
        if (this.showFullMap)
            this._bindFullMapToggle();
        if (this.taxonomySelect) {
            this.taxonomySelect.addEventListener('change', () => this._onTaxonomyChange());
        }
        this._applyWorkNotesState();
        if (this.workNotesToggle)
            this.workNotesToggle.addEventListener('click', () => this._toggleWorkNotes());
        // En modo API el botón aparece desde el arranque (ver `_buildFilterCheckboxes`), pero sin
        // listener hasta que llegan los facets: antes de eso el panel no tiene nada que abrir. Por eso
        // el bind se hace acá solo en modo local, y en API lo hace el `.then()` de `_ensureApiFacets()`,
        // que es el único lugar que reconstruye el panel con valores. Corre una sola vez.
        if (!this.api)
            this._bindFilterToggle();
        if (this.filtrosInternosToggle) {
            this.filtrosInternosToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this._closeOtherMenus('internal');
                this.filtrosInternosMenu.classList.toggle('open');
                this.filtrosInternosToggle.classList.toggle('open');
            });
        }
        this.searchInput.addEventListener('focus', () => {
            if (!this.searchWrap.classList.contains('open'))
                this._openSearch();
        });
        this.searchInput.addEventListener('input', () => {
            // Escribir tiene que abrir el campo igual: <kbd>Esc</kbd> lo colapsa sin sacarle el foco, y
            // sin esto el término se escribiría a ciegas.
            this.searchWrap.classList.add('open');
            this.searchTerm = this.searchInput.value;
            // Not immediate, unlike the discrete changes: every keystroke is a prefix of the term, so
            // the request has to wait for the typing to settle.
            this._applyFilters();
        });
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.searchInput.value = '';
                this.searchTerm = '';
                this._closeSearch(true);
                this._applyFilters(true);
            }
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.card-info-btn, .card-info-menu')) {
                this.container.querySelectorAll('.card-info-menu.open').forEach((m) => m.classList.remove('open'));
            }
            if (!e.target.closest('.card-adjuntos-btn, .card-adjuntos-menu')) {
                this.container.querySelectorAll('.card-adjuntos-menu.open').forEach((m) => m.classList.remove('open'));
            }
            // Una lista de `select` abierta se cierra al clickear fuera de su propio grupo. Va antes que
            // el cierre del panel para que el click que cae en otra parte del panel (otra columna, el
            // buscador) no deje una lista colgando: el `hidden` lo pone `_closeSelect` y el `focus` no hace
            // falta, porque el click ya se está llevando la atención.
            if (!e.target.closest('.filter-select')) {
                this.filters.forEach((f) => {
                    if (f.select && !f.select.panel.hidden)
                        this._closeSelect(f);
                });
            }
            if (this.filterMenu && !e.target.closest('.filter-wrap')) {
                this.filterMenu.classList.remove('open');
                this.filterToggle?.classList.remove('open');
            }
            if (this.sortMenu && !e.target.closest('.sort-wrap')) {
                this.sortMenu.classList.remove('open');
                this.sortToggle?.classList.remove('open');
                this.sortToggle?.setAttribute('aria-expanded', 'false');
            }
            if (!e.target.closest('.filtros-internos-wrap') && this.filtrosInternosMenu) {
                this.filtrosInternosMenu.classList.remove('open');
                this.filtrosInternosToggle.classList.remove('open');
            }
            if (!e.target.closest('.search-wrap')) {
                this._closeSearch();
            }
        });
        // Con el mapa general abierto, la barra de herramientas puede cambiar de alto al redimensionar
        // (wrap en móvil, cambio de orientación): el panel del punto tiene que volver a medir su tope real.
        // Correr solo con el mapa abierto es lo que mantiene el listener en nada el resto del tiempo.
        window.addEventListener('resize', () => {
            if (this._fullMapOpen)
                this._syncFullMapDetailTop();
        });
    }
}
//# sourceMappingURL=TimelineViewer.js.map