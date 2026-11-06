import { test, expect, type Page } from '@playwright/test';
import { blockExternal } from './helpers';

const MAILER = '/tienda/producto/cajas-mailer';
const SHIPPING = '/tienda/producto/cajas-de-envio';
const ERROR = 'Sube una imagen PNG, JPG o SVG de hasta 5 MB.';
// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function setQty(page: Page, value: string) {
  const qty = page.locator('input[name="qty"]');
  await qty.fill(value);
  await qty.blur();
}

test.describe('mailer product page', () => {
  test('renders title, sample-data note, quote CTA, specs and dieline slot, with no cart', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const blocked = await blockExternal(page);
    await page.goto(MAILER);

    expect(await page.evaluate(() => document.querySelectorAll('h1').length)).toBe(1);
    await expect(page.locator('main h1')).toHaveText('Cajas mailer');
    await expect(page.locator('main').getByText('Datos de muestra')).toBeVisible();
    await expect(page.locator('[data-quote-cta]')).toHaveText('Solicitar cotización');
    const specs = page.locator('[data-specs]');
    await expect(specs).toContainText('Flauta');
    await expect(specs).toContainText('ECT 32');
    await expect(specs).toContainText('9 × 6 × 4 in');
    await expect(specs).toContainText('25 cajas');
    await expect(page.locator('main [data-dieline-slot] h2')).toHaveText('Despiece');

    const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    expect(text).not.toContain('carrito');
    expect(text).not.toContain('agregar al');
    expect(text).not.toContain('ebiopacking');
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('gallery shows the product photo first and the labelled live logo preview second', async ({ page }) => {
    await page.goto(MAILER);
    const media = page.locator('.pdp__media');
    const photo = media.locator('img[data-pdp-photo]');
    await expect(photo).toHaveAttribute('src', '/img/products/cajas-mailer.webp');
    await expect(photo).toHaveAttribute('alt', /Cajas mailer/);
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const preview = media.locator('[data-logo-preview]');
    await expect(preview.locator('[data-preview-label]')).toHaveText('Vista previa con tu logo');
    await expect(preview).toHaveAccessibleName('Vista previa con tu logo');
    const pb = (await photo.boundingBox())!;
    const vb = (await preview.boundingBox())!;
    expect(vb.y).toBeGreaterThanOrEqual(pb.y + pb.height - 1);
  });

  test('volume pricing follows the tiers (99 -> 1.65, 100 -> 1.22)', async ({ page }) => {
    await page.goto(MAILER);
    await setQty(page, '99');
    await expect(page.locator('[data-unit-price]')).toHaveText('US$ 1.65');
    await expect(page.locator('[data-total]')).toHaveText('US$ 163.35');
    await setQty(page, '100');
    await expect(page.locator('[data-unit-price]')).toHaveText('US$ 1.22');
    await expect(page.locator('[data-total]')).toHaveText('US$ 122.00');
  });

  test('quantity clamps: empty, text and below-min go to min; 1e9 caps at 100000; never NaN', async ({ page }) => {
    await page.goto(MAILER);
    const qty = page.locator('input[name="qty"]');
    for (const raw of ['', 'abc', '5']) {
      await setQty(page, '300');
      await setQty(page, raw);
      await expect(qty).toHaveValue('25');
      await expect(page.locator('[data-unit-price]')).toHaveText('US$ 1.65');
      await expect(page.locator('[data-total]')).toHaveText('US$ 41.25');
    }
    await setQty(page, '1e9');
    await expect(qty).toHaveValue('100000');
    await expect(page.locator('[data-total]')).toHaveText('US$ 89,000.00');

    // While typing garbage (before blur) the summary never shows NaN.
    await qty.fill('abc');
    expect(await page.locator('[data-configurator]').innerText()).not.toContain('NaN');
  });

  test('size select changes the previewed box', async ({ page }) => {
    await page.goto(MAILER);
    const select = page.locator('select[name="size"]');
    await expect(select.locator('option')).toHaveCount(4);
    await select.selectOption('M-1612');
    await expect(page.locator('[data-preview-size="M-1612"]')).toBeVisible();
    await expect(page.locator('[data-preview-size="M-0906"]')).toBeHidden();
    await expect(page.locator('[data-preview-dims]')).toContainText('16 × 12 × 5 in');
  });

  test('uploading a PNG swaps "Tu logo aquí" for the logo, via a blob: URL', async ({ page }) => {
    const blocked = await blockExternal(page);
    await page.goto(MAILER);
    const preview = page.locator('[data-preview-size]:visible');
    await expect(preview.locator('[data-part="logo-placeholder"]')).toBeVisible();

    await page.locator('input[type="file"][name="logo"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: PNG,
    });
    const img = preview.locator('image[data-part="client-logo"]');
    await expect(img).toHaveCount(1);
    expect(await img.getAttribute('href')).toMatch(/^blob:/);
    await expect(preview.locator('[data-part="logo-placeholder"]')).toBeHidden();
    await expect(page.locator('[data-logo-error]')).toBeHidden();
    expect(blocked).toEqual([]);
  });

  for (const bad of [
    { name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') },
    { name: 'enorme.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) },
  ]) {
    test(`rejects ${bad.name} with the exact message and keeps the default preview`, async ({ page }) => {
      await page.goto(MAILER);
      await page.locator('input[type="file"][name="logo"]').setInputFiles(bad);
      await expect(page.locator('[data-logo-error]')).toBeVisible();
      await expect(page.locator('[data-logo-error]')).toHaveText(ERROR);
      const preview = page.locator('[data-preview-size]:visible');
      await expect(preview.locator('[data-part="logo-placeholder"]')).toBeVisible();
      await expect(preview.locator('image[data-part="client-logo"]')).toHaveCount(0);
    });
  }

  test('works at 375 px without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(MAILER);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('product pages scope', () => {
  test('shipping box page uses its own tiers (99 -> 1.85, 100 -> 1.37)', async ({ page }) => {
    await page.goto(SHIPPING);
    await expect(page.locator('main h1')).toHaveText('Cajas de envío');
    await setQty(page, '99');
    await expect(page.locator('[data-unit-price]')).toHaveText('US$ 1.85');
    await setQty(page, '100');
    await expect(page.locator('[data-unit-price]')).toHaveText('US$ 1.37');
  });

  for (const slug of ['cajas-mailer', 'cajas-de-envio']) {
    test(`${slug}: the dieline renders in the slot, with cut and fold paths, and links to its guide`, async ({ page }) => {
      await page.goto(`/tienda/producto/${slug}`);
      const slot = page.locator('main [data-dieline-slot]');
      await expect(slot.locator('h2')).toHaveText('Despiece');
      const svg = slot.locator('svg[data-dieline]');
      await expect(svg).toBeVisible();
      expect(await svg.locator('path[data-cut]').count()).toBeGreaterThanOrEqual(1);
      expect(await svg.locator('path[data-fold]').count()).toBeGreaterThanOrEqual(1);
      await expect(slot.getByText('Corte', { exact: true })).toBeVisible();
      await expect(slot.getByText('Pliegue', { exact: true })).toBeVisible();
      const link = slot.getByRole('link', { name: 'Ver guía de armado' });
      await expect(link).toHaveAttribute('href', `/tienda/guia/${slug}`);
    });
  }

  test('non-featured families have no product page', async ({ request }) => {
    const res = await request.get('/tienda/producto/cajas-ropa');
    expect(res.status()).toBe(404);
  });
});
