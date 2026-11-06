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

  test('works at 375 px without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(CATALOG);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
