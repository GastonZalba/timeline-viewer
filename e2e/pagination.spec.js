import { test, expect } from '@playwright/test';
import { openDemo, sel, articleIds, paginatorText, isDisabled } from './helpers/demo.js';

test.describe('paginador numerico en el navegador', () => {
  // `?flat` is the 19-item list. The default `content` mode opens on the first taxonomy, whose
  // largest group has 9 items — fewer than `itemsPerPage`, so it is a single page and correctly
  // renders no paginator at all. Scoping to "Ver todo" is what gives that mode several pages.
  test('modo local: recorre las paginas y las flechas se bloquean en los bordes', async ({ page }) => {
    await openDemo(page, 'flat&pagination&expanded');

    await expect(page.locator(sel.paginator)).toBeVisible();
    await expect(page.locator(sel.loadMore)).toHaveCount(0);
    expect(await paginatorText(page)).toBe('Página 1 de 2');
    expect(await isDisabled(page, sel.prev)).toBe(true);
    expect(await isDisabled(page, sel.next)).toBe(false);

    const page1 = await articleIds(page);
    expect(page1.length).toBeGreaterThan(0);

    await page.click(sel.next);
    expect(await paginatorText(page)).toBe('Página 2 de 2');
    expect(await isDisabled(page, sel.prev)).toBe(false);
    expect(await isDisabled(page, sel.next)).toBe(true);

    const page2 = await articleIds(page);
    expect(page2).not.toEqual(page1);
    // Disjoint pages, no accumulation: this is the whole difference against "Cargar más".
    expect(page1.filter((id) => page2.includes(id))).toEqual([]);

    await page.click(sel.prev);
    expect(await paginatorText(page)).toBe('Página 1 de 2');
    expect(await articleIds(page)).toEqual(page1);
  });

  test('modo local: una taxonomia que entra en una sola pagina no muestra paginador', async ({ page }) => {
    await openDemo(page, 'pagination&expanded');
    // First group: 9 items with itemsPerPage 10.
    await expect(page.locator(sel.paginator)).toHaveCount(0);
  });

  test('modo local: "Ver todo" abre el pool completo y pagina sobre el', async ({ page }) => {
    await openDemo(page, 'pagination&expanded');
    await expect(page.locator(sel.paginator)).toHaveCount(0);

    await page.selectOption('#taxonomy-select', 'Ver todo');
    await expect.poll(() => paginatorText(page)).toBe('Página 1 de 2');

    const page1 = await articleIds(page);
    await page.click(sel.next);
    expect(await paginatorText(page)).toBe('Página 2 de 2');
    const page2 = await articleIds(page);
    expect(page1.filter((id) => page2.includes(id))).toEqual([]);
  });

  test('modo API: el paginador pide la pagina al servidor y no acumula', async ({ page }) => {
    const pages = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.pathname === '/api') pages.push(url.searchParams.get('page'));
    });

    await openDemo(page, 'api&pagination&expanded');
    await expect(page.locator(sel.paginator)).toBeVisible();

    const first = await articleIds(page);
    await page.click(sel.next);
    await expect.poll(() => paginatorText(page)).toBe('Página 2 de 2');
    const second = await articleIds(page);

    expect(second).not.toEqual(first);
    expect(first.filter((id) => second.includes(id))).toEqual([]);
    // The server owns the order, so the component must ask for the page rather than re-sort.
    expect(pages).toEqual(['1', '2']);
  });

  test('modo API: el stack de destacadas queda congelado en la pagina 1', async ({ page }) => {
    await openDemo(page, 'api&pagination');
    const featuredOnPage1 = await page.$$eval('.featured-card', (els) =>
      els.map(
        (el) => el.querySelector('[data-card-id]')?.getAttribute('data-card-id') ?? el.textContent.trim().slice(0, 40)
      )
    );
    expect(featuredOnPage1.length).toBeGreaterThan(0);

    // Expand to reach the paginator, move to page 2, collapse again: the stack must be identical.
    await page.click('#expand-toggle');
    await expect(page.locator(sel.next)).toBeVisible();
    await page.click(sel.next);
    await expect.poll(() => paginatorText(page)).toBe('Página 2 de 2');
    await page.click('#expand-toggle');

    const featuredOnPage2 = await page.$$eval('.featured-card', (els) =>
      els.map(
        (el) => el.querySelector('[data-card-id]')?.getAttribute('data-card-id') ?? el.textContent.trim().slice(0, 40)
      )
    );
    expect(featuredOnPage2).toEqual(featuredOnPage1);
  });

  test('la busqueda reinicia a la pagina 1', async ({ page }) => {
    await openDemo(page, 'flat&pagination&expanded');
    await page.click(sel.next);
    expect(await paginatorText(page)).toBe('Página 2 de 2');

    // "FUE" is in every id, so the result set is the same 19 articles and the paginator stays
    // visible with 2 pages. That is what makes the assertion meaningful: if the search did not
    // reset the cursor, the control would still read "Página 2 de 2".
    await page.fill('#search-input', 'FUE');
    await expect.poll(() => paginatorText(page)).toBe('Página 1 de 2');
  });
});

test.describe('paginador en modo API: el estado de carga', () => {
  /**
   * Delay the list requests.
   *
   * Registered *after* `openDemo`, so page 1 has already landed (it would otherwise be delayed too,
   * and the wait for the paginator would be a race). Playwright matches routes in reverse
   * registration order, so this one wins over the catch-all of the offline network, which is the one
   * that lets the request through with `continue()`.
   */
  const delayList = (page, ms = 400) =>
    page.route(
      (url) => url.pathname === '/api',
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
        await route.continue();
      }
    );

  test('cambiar de pagina borra las cartas y las reemplaza por skeletons', async ({ page }) => {
    await openDemo(page, 'api&pagination&expanded');
    // The paginator only exists once the real list is rendered, so this is also the wait for
    // page 1 — before which the delay must not be installed.
    await expect(page.locator(sel.paginator)).toBeVisible();
    const first = await articleIds(page);
    expect(first.length).toBeGreaterThan(0);

    await delayList(page);
    await page.click(sel.next);

    // A page change replaces the list, so the page being left has to go: keeping it under a
    // "Cargando página 2..." line would show the previous answer as if it were the new one.
    await expect(page.locator(sel.skeleton).first()).toBeVisible();
    expect(await articleIds(page)).toEqual([]);
    await expect(page.locator(sel.status)).toHaveCount(0);

    await expect.poll(() => paginatorText(page)).toBe('Página 2 de 2');
    await expect(page.locator(sel.skeleton)).toHaveCount(0);
    const second = await articleIds(page);
    expect(second.length).toBeGreaterThan(0);
    expect(second).not.toEqual(first);
    // And the count row comes back with the page: the paginator says which page it is, the count
    // says which slice of the filtered result it holds. Page 2 of the 19-item mock starts at 11.
    await expect(page.locator(sel.status)).toHaveCount(1);
    await expect(page.locator(sel.status)).toContainText(`Mostrando 11-${10 + second.length} de 19 publicaciones`);
  });

  test('si el request de la pagina falla, la lista queda vacia con el error', async ({ page }) => {
    await openDemo(page, 'api&pagination&expanded');
    await expect(page.locator(sel.paginator)).toBeVisible();

    // Registered after `openDemo` so only the page-2 request fails, and page 1 rendered normally.
    await page.route(
      (url) => url.pathname === '/api' && url.searchParams.get('page') === '2',
      (route) => route.abort()
    );
    await page.click(sel.next);

    await expect(page.locator(sel.skeleton)).toHaveCount(0);
    expect(await articleIds(page)).toEqual([]);
    // Same contract as a failed search/filter: nothing stale is put back, only the error row.
    await expect(page.locator(sel.status)).toHaveCount(1);
    await expect(page.locator(sel.status)).toContainText('No se pudieron cargar los datos');
    await expect(page.locator(sel.paginator)).toHaveCount(0);
  });
});
