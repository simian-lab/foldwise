import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

const CATALOG = '/tienda/catalogo';

test.describe('catalog', () => {
  test('lists the 12 families with one anchor per slug, no errors, no external requests', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const blocked = await blockExternal(page);
    await page.goto(CATALOG);

    // Light-DOM only: the dev toolbar ships its own headings in shadow roots.
    expect(await page.evaluate(() => document.querySelectorAll('h1').length)).toBe(1);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('[data-catalog-item]')).toHaveCount(12);
    for (const slug of ['cajas-mailer', 'cajas-de-envio', 'cajas-ropa', 'cajas-vino-botellas']) {
      await expect(page.locator(`main [id="${slug}"][data-catalog-item]`)).toHaveCount(1);
    }
    await expect(page.locator('[data-catalog-count]')).toContainText('12');
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('every catalog card shows its product photo with a Spanish alt', async ({ page }) => {
    await page.goto(CATALOG);
    const items = page.locator('[data-catalog-item]');
    await expect(items).toHaveCount(12);
    for (let i = 0; i < 12; i++) {
      const item = items.nth(i);
      const slug = await item.getAttribute('id');
      const img = item.locator('img[data-product-photo]');
      await expect(img).toHaveAttribute('src', `/img/products/${slug}.webp`);
      await expect(img).toHaveAttribute('alt', /de Foldwise en cartón corrugado/);
      await expect(img).toHaveAttribute('loading', 'lazy');
    }
  });

  test('estilo filter hides non-matching cards', async ({ page }) => {
    await page.goto(CATALOG);
    await page.locator('[data-filter-group="estilo"]').getByText('Mailers', { exact: true }).click();
    await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(2);
    await expect(page.locator('#cajas-mailer')).toBeVisible();
    await expect(page.locator('#mailers-faciles')).toBeVisible();
    await expect(page.locator('#cajas-de-envio')).toBeHidden();
    await expect(page.locator('[data-catalog-count]')).toContainText('2');
  });

  test('uso filter hides non-matching cards and combines with estilo', async ({ page }) => {
    await page.goto(CATALOG);
    await page.locator('[data-filter-group="uso"]').getByText('Moda y ropa', { exact: true }).click();
    await expect(page.locator('#cajas-ropa')).toBeVisible();
    await expect(page.locator('#cajas-vino-botellas')).toBeHidden();
    const n = await page.locator('[data-catalog-item]:visible').count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(12);

    // estilo "Con divisores" (wine only) AND uso "Moda y ropa": nothing matches, empty state shows.
    await page.locator('[data-filter-group="estilo"]').getByText('Con divisores', { exact: true }).click();
    await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(0);
    await expect(page.locator('[data-catalog-empty]')).toBeVisible();
    await page.locator('[data-catalog-empty]').getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(12);
  });

  test('featured cards link to their product page', async ({ page }) => {
    await page.goto(CATALOG);
    await expect(page.locator('#cajas-mailer a[href="/tienda/producto/cajas-mailer"]')).toHaveCount(1);
    await expect(page.locator('#cajas-de-envio a[href="/tienda/producto/cajas-de-envio"]')).toHaveCount(1);
  });

  test('non-featured cards do not self-link and say the sheet is coming', async ({ page }) => {
    await page.goto(CATALOG);
    const statics = page.locator('[data-category-card]:not(a)');
    await expect(statics).toHaveCount(10);
    await expect(page.locator('a[data-category-card]')).toHaveCount(2);
    await expect(page.locator('a[href^="/tienda/catalogo#"][data-category-card]')).toHaveCount(0);
    for (const card of await statics.all()) {
      expect(await card.getAttribute('href')).toBeNull();
      await expect(card).toContainText('Ficha próximamente');
    }
    // The easy mailer has an assembly guide: its static card links to it.
    const guide = page.locator('#mailers-faciles a', { hasText: 'Cómo se arma' });
    await expect(guide).toHaveAttribute('href', '/tienda/guia/mailers-faciles');
  });

  test('the footer links every assembly guide', async ({ page }) => {
    await page.goto(CATALOG);
    const links = page.locator('[data-footer-guides] a');
    expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual([
      '/tienda/guia/cajas-mailer',
      '/tienda/guia/cajas-de-envio',
      '/tienda/guia/mailers-faciles',
    ]);
  });

  test('works at 375 px without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(CATALOG);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
