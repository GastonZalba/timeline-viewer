import { test, expect } from '@playwright/test';
import { openDemo, sel } from './helpers/demo.js';

/**
 * Fullpage is the one mode where `#timeline-cards` is not the scroll box: the SCSS takes the list
 * out of it (`max-height: none; overflow: visible`) and lets the page scroll, so a plain
 * `scrollTop = 0` is a no-op. These tests pin the behaviour that replaced it — landing on the top
 * of the list, just under the sticky toolbar, on whichever element is actually scrolling.
 */

/** Distance between the bottom of the sticky toolbar and the top of the list. */
const gapUnderToolbar = (page) =>
  page.evaluate(() => {
    const toolbar = document.querySelector('.featured-row');
    const cards = document.querySelector('#timeline-cards');
    if (!toolbar || !cards) return null;
    return Math.round(cards.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom);
  });

test.describe('fullpage: el scroll va al inicio de la lista', () => {
  test('salta bajo la barra sticky y no al tope de la pagina', async ({ page }) => {
    await openDemo(page, 'flat&pagination&full');

    // Scroll well past the list so a no-op scroll would be visible in the assertion below.
    await page.evaluate(() => window.scrollTo(0, 2500));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

    await page.click(sel.next);
    await expect.poll(() => page.textContent(sel.paginatorText)).toBe('Página 2 de 2');

    await expect.poll(() => gapUnderToolbar(page)).toBe(0);
  });

  test('la barra sticky queda visible, no tapada por las tarjetas', async ({ page }) => {
    await openDemo(page, 'flat&pagination&full');
    await page.click(sel.next);
    await expect.poll(() => gapUnderToolbar(page)).toBe(0);

    const toolbar = await page.evaluate(() => {
      const el = document.querySelector('.featured-row');
      const rect = el.getBoundingClientRect();
      return { top: Math.round(rect.top), bottom: Math.round(rect.bottom), position: getComputedStyle(el).position };
    });
    expect(toolbar.position).toBe('sticky');
    expect(toolbar.top).toBeGreaterThanOrEqual(0);
  });

  test('con un contenedor propio scrolleable scrollea ese contenedor, no la pagina', async ({ page }) => {
    await openDemo(page, 'flat&pagination&full');

    // Mount the component inside a scrollable box of the consumer, which is the case a hardcoded
    // `window.scrollTo` gets wrong.
    await page.evaluate(() => {
      const host = document.getElementById('noticias-container');
      const wrapper = document.createElement('div');
      wrapper.id = 'consumer-scroll';
      wrapper.style.cssText = 'height: 400px; overflow-y: auto;';
      host.parentNode.insertBefore(wrapper, host);
      wrapper.appendChild(host);
      // The demo's own stylesheet centers its container vertically (`display: flex;
      // align-items: center`); inside a 400px box that pushes a 3000px list *above* the top
      // edge, which is a layout artefact of the demo page and not the case under test.
      host.style.height = 'auto';
      host.style.display = 'block';
      host.style.alignItems = 'normal';
      host.style.justifyContent = 'normal';
    });

    // Sanity: before the click the list is scrolled well past the toolbar, so a no-op scroll
    // cannot pass this test by accident.
    await page.evaluate(() => document.getElementById('consumer-scroll').scrollTo(0, 1200));
    expect(await page.evaluate(() => document.getElementById('consumer-scroll').scrollTop)).toBeGreaterThan(500);
    expect(await gapUnderToolbar(page)).toBeLessThan(-500);

    const windowBefore = await page.evaluate(() => window.scrollY);
    await page.click(sel.next);
    await expect.poll(() => page.textContent(sel.paginatorText)).toBe('Página 2 de 2');

    // The list top ends up right under the toolbar, measured inside the consumer's own box.
    await expect.poll(() => gapUnderToolbar(page)).toBe(0);
    // And the page itself was left alone.
    expect(await page.evaluate(() => window.scrollY)).toBe(windowBefore);
  });

  test('en fullpage no hay barra de resize y el toggle de expandir queda inerte', async ({ page }) => {
    await openDemo(page, 'flat&pagination&full');
    // `_buildLayout` does not emit the handle at all, and calling `_initResizeHandle` would write an
    // inline `max-height` that defeats the SCSS `max-height: none`.
    await expect(page.locator('.timeline-resize-handle')).toHaveCount(0);
    // The icon is in the markup but hidden by the fullpage SCSS block, and the toggle is
    // `pointer-events: none` so it cannot collapse the section back.
    await expect(page.locator('.expand-icon')).toBeHidden();
    expect(await page.$eval('.expand-toggle', (el) => getComputedStyle(el).pointerEvents)).toBe('none');
    await expect(page.locator(sel.paginator)).toBeVisible();
  });
});
