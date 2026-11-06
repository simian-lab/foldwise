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

  test('header follows the Packbox structure: promo bar, search row and category row, no cart or login', async ({ page }) => {
    await page.goto(HOME);
    const promo = page.locator('[data-shop-promo]');
    await expect(promo).toHaveText('Pide desde 25 cajas, con tu logo.');
    const header = page.locator('[data-shop-header]');
    // promo bar sits above the header, the search in row one, categories in row two below it
    const promoBox = (await promo.boundingBox())!;
    const searchBox = (await header.locator('input[type="search"]').boundingBox())!;
    const navBox = (await header.locator('[data-shop-nav]').boundingBox())!;
    expect(promoBox.y + promoBox.height).toBeLessThanOrEqual(searchBox.y);
    expect(searchBox.y + searchBox.height).toBeLessThanOrEqual(navBox.y);
    await expect(header.locator('[data-shop-nav] a').first()).toHaveText('Todas las cajas');
    await expect(header.getByRole('link', { name: 'Habla con un asesor' })).toBeVisible();
    const text = (await header.innerText()).toLowerCase();
    for (const bad of ['log in', 'iniciar sesión', 'ingresar', 'carrito', 'mi cuenta']) expect(text).not.toContain(bad);
  });

  test('hero is one panel with the H1, both buttons, ticks, the hero photo and the proof row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(HOME);
    const panel = page.locator('[data-hero-panel]');
    await expect(panel.locator('h1')).toHaveText('Pedidos pequeños. Cuidado enorme.');
    await expect(panel.getByRole('link', { name: 'Explora las cajas' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Personaliza tu mailer' })).toBeVisible();
    await expect(panel.locator('.hero__ticks li')).toHaveCount(3);
    const photo = panel.locator('img[data-hero-photo]');
    await expect(photo).toHaveAttribute('src', '/img/products/hero.webp');
    await expect(photo).toHaveAttribute('alt', /mailer Foldwise/);
    await expect(photo).toHaveAttribute('loading', 'eager');
    await expect(photo).toHaveAttribute('fetchpriority', 'high');
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    // photo on the right of the copy
    const h1 = (await panel.locator('h1').boundingBox())!;
    const pb = (await photo.boundingBox())!;
    expect(pb.x).toBeGreaterThan(h1.x);
    const proof = panel.locator('.hero__proof li');
    await expect(proof).toHaveText(['Desde 25 cajas', 'Con tu logo', 'Envíos en EE. UU.', 'Atención personalizada']);
    // the interactive mailer lives in its own section, not in the hero
    await expect(panel.locator('[data-hero-box]')).toHaveCount(0);
    const unbox = page.locator('main section', { has: page.getByRole('heading', { level: 2, name: 'Ábrela como la abre tu cliente' }) });
    await expect(unbox.locator('[data-hero-box]')).toHaveCount(1);
  });

  test('category cards show the product photo of each of the 12 families', async ({ page }) => {
    await page.goto(HOME);
    const cards = page.locator('[data-category-card]');
    await expect(cards).toHaveCount(12);
    const photos = await cards.evaluateAll((els) =>
      els.map((el) => {
        const img = el.querySelector<HTMLImageElement>('img[data-product-photo]');
        return { slug: el.getAttribute('data-slug'), src: img?.getAttribute('src'), alt: img?.alt ?? '', svg: el.querySelectorAll('svg[data-style]').length };
      }),
    );
    for (const p of photos) {
      expect(p.src).toBe(`/img/products/${p.slug}.webp`);
      expect(p.alt.length).toBeGreaterThan(10);
      expect(p.svg).toBe(0);
    }
  });

  test('header keeps search, category nav and dead links, and there is no cart', async ({ page }) => {
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
    // The mailer now has its own section below the hero: bring it into view.
    await box.scrollIntoViewIfNeeded();
    await expect(box).toHaveAttribute('data-open', 'true', { timeout: 5000 });
    await expect(box.locator('img[data-frame="open"]')).toHaveAttribute('alt', /¡Gracias por apoyar lo pequeño!/);

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

  test('hero box stacks three photo frames and shows the open one after toggling', async ({ page }) => {
    await page.goto(HOME);
    const box = page.locator('[data-hero-box]');
    const frames = box.locator('img[data-frame]');
    await expect(frames).toHaveCount(3);
    const keys = await frames.evaluateAll((els) => els.map((e) => e.getAttribute('data-frame')));
    expect(keys).toEqual(['closed', 'half', 'open']);
    for (const k of keys) {
      await expect(box.locator(`img[data-frame="${k}"]`)).toHaveAttribute('alt', /caja mailer/i);
    }
    await expect(box.locator('img[data-frame="closed"]')).toHaveAttribute('loading', 'eager');
    await expect(box.locator('img[data-frame="open"]')).toHaveAttribute('aria-hidden', 'true');

    await box.scrollIntoViewIfNeeded();
    // touch it before the scroll-open fires, then open it by hand
    await box.click();
    await expect(box).toHaveAttribute('data-open', 'true');
    const open = box.locator('img[data-frame="open"]');
    await expect(open).toHaveCSS('opacity', '1');
    await expect(open).not.toHaveAttribute('aria-hidden', 'true');
    await expect(box.locator('img[data-frame="closed"]')).toHaveAttribute('aria-hidden', 'true');
    await expect(box).toHaveAttribute('data-progress', '1');
    await expect.poll(() => open.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    await box.click();
    await expect(box).toHaveAttribute('data-open', 'false');
    await expect(open).toHaveCSS('opacity', '0');
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

  test('"Toda la familia" shows the family photo', async ({ page }) => {
    await page.goto(HOME);
    const section = page.locator('main section', { has: page.getByRole('heading', { level: 2, name: 'Toda la familia' }) });
    const photo = section.locator('img[data-family-photo]');
    await expect(photo).toHaveAttribute('src', '/img/products/familia.webp');
    await expect(photo).toHaveAttribute('alt', /12 cajas de Foldwise/);
    await photo.scrollIntoViewIfNeeded();
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test('hero box keeps one accessible name while it toggles', async ({ page }) => {
    await page.goto(HOME);
    const box = page.locator('[data-hero-box]');
    await expect(box).toHaveAttribute('aria-label', 'Abrir o cerrar la caja');
    await expect(box.locator('img[data-frame="half"]')).toHaveAttribute('aria-hidden', 'true');
    await box.scrollIntoViewIfNeeded();
    await expect(box).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });
    await expect(box).toHaveAttribute('aria-label', 'Abrir o cerrar la caja');
    await box.click();
    await expect(box).toHaveAttribute('aria-pressed', 'false');
    await expect(box).toHaveAttribute('aria-label', 'Abrir o cerrar la caja');
  });

  test('with reduced motion the hero box is open before any module script runs', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    // Block every script file: only what the server sent (and inline code) can draw the box.
    await page.route('**/*', (r) => (r.request().resourceType() === 'script' ? r.abort() : r.continue()));
    await page.goto(HOME);
    const box = page.locator('[data-hero-box]');
    await expect(box).toHaveAttribute('data-open', 'true');
    await expect(box).toHaveAttribute('aria-pressed', 'true');
    // the open photo is the one shown, and the only frame exposed to assistive tech
    await expect(box.locator('img[data-frame="open"]')).toHaveCSS('opacity', '1');
    await expect(box.locator('img[data-frame="open"]')).not.toHaveAttribute('aria-hidden', 'true');
    await expect(box.locator('img[data-frame="closed"]')).toHaveAttribute('aria-hidden', 'true');
    await ctx.close();
  });

  test('works at 375 px without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(HOME);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
