/**
 * Node ESM resolution hook that teaches Node how to resolve the lightGallery specifiers the
 * component uses.
 *
 * `dist/TimelineViewer.js` imports `lightgallery`, `lightgallery/plugins/thumbnail` and
 * `lightgallery/plugins/zoom`. Those are **browser/bundler** specifiers: the example resolves
 * them through an import map, and a bundler would find them through package `exports`. Node's ESM
 * resolver does neither — it has no directory imports and, with lightGallery 2.9 shipping no
 * `exports` map for those subpaths, it fails with ERR_UNSUPPORTED_DIR_IMPORT.
 *
 * This is a test-only concern: it is not a defect of the component, and the fix is to give Node
 * the same mapping the browser already has, rather than to change what the component imports
 * (which would break the consumer contract documented in the README). The targets are the same
 * `.es5.js` builds the import map in `example/index.html` points at, so jsdom and the browser
 * exercise identical code.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const lightgallery = path.join(here, '..', '..', 'node_modules', 'lightgallery');

const MAPPING = {
  lightgallery: path.join(lightgallery, 'lightgallery.es5.js'),
  'lightgallery/plugins/thumbnail': path.join(lightgallery, 'plugins', 'thumbnail', 'lg-thumbnail.es5.js'),
  'lightgallery/plugins/zoom': path.join(lightgallery, 'plugins', 'zoom', 'lg-zoom.es5.js')
};

export async function resolve(specifier, context, nextResolve) {
  const target = MAPPING[specifier];
  if (target) {
    return { url: pathToFileURL(target).href, shortCircuit: true, format: 'module' };
  }
  return nextResolve(specifier, context);
}
