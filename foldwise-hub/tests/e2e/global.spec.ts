import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

const BRAND_ROUTES = ['/', '/marca', '/marca/en-accion', '/marca/cajas'];
const SHOP_ROUTES = ['/tienda', '/tienda/catalogo', '/tienda/producto/cajas-mailer', '/tienda/producto/cajas-de-envio'];
const GUIDE_ROUTES = ['/tienda/guia/cajas-mailer', '/tienda/guia/cajas-de-envio', '/tienda/guia/mailers-faciles'];
const ROUTES = [...BRAND_ROUTES, ...SHOP_ROUTES, ...GUIDE_ROUTES];

/** The door a route belongs to, as marked by the hub switch. */
const doorOf = (route: string) => (route.startsWith('/tienda') ? 'sitio' : route.startsWith('/marca') ? 'marca' : null);

test.describe('every route', () => {
  for (const route of ROUTES) {
    test(`${route} works offline at 375 px with no errors, no leaks and the hub switch`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      const blocked = await blockExternal(page);
      await page.setViewportSize({ width: 375, height: 800 });

      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await page.waitForLoadState('load');
      await page.waitForTimeout(300);

      // Visible text only: in dev mode the HTML carries absolute file paths.
      const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
      expect(text).not.toContain('ebiopacking');
      // No delivery-time number the client never committed to.
      expect(text).not.toContain('días hábiles');

      // Nothing may hide page-level overflow, and nothing may stick out.
      const clips = await page.evaluate(() =>
        ['html', 'body', 'main'].map((s) => getComputedStyle(document.querySelector(s)!).overflowX),
      );
      expect(clips).toEqual(['visible', 'visible', 'visible']);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
      const wide = await page.evaluate(() => {
        // An element inside a scroller or a clipped box is not page overflow;
        // the scroller or the box itself is still checked.
        const clipped = (el: Element) => {
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            if (getComputedStyle(a).overflowX !== 'visible') return true;
          }
          return false;
        };
        return [...document.body.querySelectorAll('*')]
          .filter((el) => !el.closest('svg') && !el.closest('astro-dev-toolbar'))
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
          .filter((el) => !clipped(el))
          .map((el) => `${el.tagName}.${el.getAttribute('class') ?? ''}`);
      });
      expect(wide).toEqual([]);

      // The persistent switch between the two doors.
      const nav = page.locator('[data-hub-nav]');
      await expect(nav).toHaveCount(1);
      await expect(nav.locator('a[data-hub-door="marca"]')).toHaveAttribute('href', '/marca');
      await expect(nav.locator('a[data-hub-door="sitio"]')).toHaveAttribute('href', '/tienda');
      const door = doorOf(route);
      if (door) await expect(nav.locator(`a[data-hub-door="${door}"]`)).toHaveAttribute('aria-current', 'true');
      await expect(nav.locator('a[aria-current]')).toHaveCount(door ? 1 : 0);

      expect(errors).toEqual([]);
      expect(blocked).toEqual([]);
    });
  }
});

test.describe('hub entry', () => {
  test('opens with a large animated logo, the two doors and the Simian credit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const main = page.locator('main');

    const logo = main.locator('[data-hub-hero] [data-animated-logo]');
    await expect(logo).toBeVisible();
    const bb = await logo.boundingBox();
    expect(bb?.width ?? 0).toBeGreaterThanOrEqual(280);

    const marca = main.locator('a[data-door="marca"]');
    await expect(marca).toHaveAttribute('href', '/marca');
    await expect(marca).toContainText('La marca');
    const sitio = main.locator('a[data-door="sitio"]');
    await expect(sitio).toHaveAttribute('href', '/tienda');
    await expect(sitio).toContainText('El sitio');

    const subs = main.locator('[data-door-links] a');
    expect(
      await subs.evaluateAll((els) => els.map((e) => [e.textContent?.trim(), e.getAttribute('href')])),
    ).toEqual([
      ['Manual', '/marca'],
      ['Marca en acción', '/marca/en-accion'],
      ['Cajas', '/marca/cajas'],
    ]);

    const guides = main.locator('[data-door-guides] a');
    expect(await guides.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual([
      '/tienda/guia/cajas-mailer',
      '/tienda/guia/cajas-de-envio',
      '/tienda/guia/mailers-faciles',
    ]);

    await expect(main.getByText('Propuesta de marca por Simian')).toBeVisible();
    expect(await page.evaluate(() => document.querySelectorAll('h1').length)).toBe(1);
  });

  test('describes itself with the principal tagline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Pedidos pequeños. Cuidado enorme.');
  });

  test('the dev test benches are gone', async ({ request }) => {
    for (const p of ['/dev/logo', '/dev/boxes']) expect((await request.get(p)).status()).toBe(404);
  });
});
