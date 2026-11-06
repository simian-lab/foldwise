import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

const HOME = '/tienda';

test.describe('shop home', () => {
  test('shows the main tagline as H1 and the 12 category cards', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const blocked = await blockExternal(page);
    await page.goto(HOME);

    // Light-DOM only: the dev toolbar ships its own headings in shadow roots.
    expect(await page.evaluate(() => document.querySelectorAll('h1').length)).toBe(1);
    await expect(page.locator('main h1')).toContainText('Pedidos pequeños. Cuidado enorme.');
    await expect(page.locator('[data-category-card]')).toHaveCount(12);
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('category cards link to the product page when featured, else to the catalog', async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator('a[data-category-card][href="/tienda/producto/cajas-mailer"]')).toHaveCount(1);
    await expect(page.locator('a[data-category-card][href="/tienda/producto/cajas-de-envio"]')).toHaveCount(1);
    await expect(page.locator('a[data-category-card][href="/tienda/catalogo#cajas-ropa"]')).toHaveCount(1);
  });

  test('header has search, category nav and dead links, and there is no cart', async ({ page }) => {
    await page.goto(HOME);
    const header = page.locator('header');
    await expect(header.locator('input[type="search"]')).toHaveCount(1);
    for (const name of ['Nosotros', 'Contacto', 'Blog']) {
      await expect(header.getByRole('link', { name, exact: true })).toHaveAttribute('href', '#');
    }
    await expect(page.locator('[data-shop-nav] a')).not.toHaveCount(0);
    const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    expect(text).not.toContain('carrito');
    expect(text).not.toContain('ebiopacking');
    const cartBits = await page.evaluate(
      () =>
        document.querySelectorAll(
          '[class*="cart" i], [id*="cart" i], [data-cart], [aria-label*="cart" i], [aria-label*="carrito" i], [href*="cart" i], [href*="carrito" i]',
        ).length,
    );
    expect(cartBits).toBe(0);
  });

  test('has the "Hecho para los que están arrancando" section', async ({ page }) => {
    await page.goto(HOME);
    await expect(page.getByRole('heading', { name: 'Hecho para los que están arrancando' })).toBeVisible();
  });

  test('hero box is served closed, opens when seen and toggles on click', async ({ page, request }) => {
    const raw = await (await request.get(HOME)).text();
    expect(raw).toMatch(/data-hero-box[^>]*data-open="false"|data-open="false"[^>]*data-hero-box/);

    await page.goto(HOME);
    const box = page.locator('[data-hero-box]');
    await expect(box).toHaveAttribute('data-open', 'true', { timeout: 5000 });
    await expect(box.getByText('¡Gracias por apoyar lo pequeño!')).toHaveCount(1);

    await box.click();
    await expect(box).toHaveAttribute('data-open', 'false');
    await box.click();
    await expect(box).toHaveAttribute('data-open', 'true');
  });

  test('hero box opens on scroll into view when the page loads scrolled away', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${HOME}#categorias`);
    const box = page.locator('[data-hero-box]');
    await page.waitForTimeout(1200);
    await expect(box).toHaveAttribute('data-open', 'false');
    await box.scrollIntoViewIfNeeded();
    await expect(box).toHaveAttribute('data-open', 'true', { timeout: 5000 });
  });

  test('with reduced motion the hero box renders open and static', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(HOME);
    const box = page.locator('[data-hero-box]');
    await expect(box).toHaveAttribute('data-open', 'true');
    await expect(box).toHaveAttribute('data-motion', 'static');
    await expect(box).toHaveAttribute('data-progress', '1');
    await ctx.close();
  });

  test('works at 375 px without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(HOME);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
