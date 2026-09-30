/**
 * Network layer for the browser tests.
 *
 * `example/index.html` resolves lightGallery through an import map pointing at jsDelivr, and the
 * mock articles use `picsum.photos` images. That is fine for a human opening the demo, but it
 * would make the tests depend on the network: slow, flaky, and able to fail for reasons that have
 * nothing to do with the component.
 *
 * So: serve lightGallery from the very same `node_modules` the peer dependency resolves to, and
 * cut every other external request. The component then loads exactly the code a consumer would
 * install, with no internet.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lightgallery = path.join(root, 'node_modules', 'lightgallery');

/** jsDelivr URL fragment -> file inside node_modules/lightgallery. */
const LIGHTGALLERY = new Map([
  ['/lightgallery.es5.js', 'lightgallery.es5.js'],
  ['/plugins/thumbnail/lg-thumbnail.es5.js', path.join('plugins', 'thumbnail', 'lg-thumbnail.es5.js')],
  ['/plugins/zoom/lg-zoom.es5.js', path.join('plugins', 'zoom', 'lg-zoom.es5.js')],
  ['/css/lightgallery-bundle.min.css', path.join('css', 'lightgallery-bundle.min.css')]
]);

/** Attach the offline network to a page. Call before `page.goto`. */
export async function useOfflineNetwork(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();

    if (url.startsWith('http://localhost:3010')) {
      return route.continue();
    }

    if (url.includes('cdn.jsdelivr.net/npm/lightgallery')) {
      const pathname = new URL(url).pathname.replace('/npm/lightgallery@2.9.0', '');
      const file = LIGHTGALLERY.get(pathname);
      if (!file) return route.abort();
      const body = fs.readFileSync(path.join(lightgallery, file));
      const contentType = file.endsWith('.css') ? 'text/css' : 'text/javascript';
      return route.fulfill({ status: 200, contentType, body });
    }

    // Anything else external (article images, social SDKs) is irrelevant to these tests.
    return route.abort();
  });
}
