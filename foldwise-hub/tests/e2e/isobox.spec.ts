import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

const DEV_PAGE = '/dev/boxes';
const ISOTYPE_D = 'M15 42V27h-5l-2-2v-4l2-2h5V4h16l5 5v3H25v7h6l2 2v4l-2 2h-6v15z';

test.describe('isometric boxes', () => {
  test('renders one box per category with real size and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    const blocked = await blockExternal(page);
    await page.goto(DEV_PAGE);

    const boxes = page.locator('[data-section="closed"] svg[data-style]');
    await expect(boxes).toHaveCount(12);
    for (let i = 0; i < 12; i++) {
      const bb = await boxes.nth(i).boundingBox();
      expect(bb?.width ?? 0).toBeGreaterThan(50);
      expect(bb?.height ?? 0).toBeGreaterThan(50);
      await expect(boxes.nth(i)).toHaveAttribute('role', 'img');
    }
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('an open mailer shows the inner face of its lid', async ({ page }) => {
    await page.goto(DEV_PAGE);
    const mailer = page.locator('[data-section="open"] svg[data-style="mailer"][data-open="true"]').first();
    await expect(mailer).toBeVisible();
    await expect(mailer.locator('[data-part="lid-inner"]')).toHaveCount(1);
  });

  test('branding marks the front face', async ({ page }) => {
    await page.goto(DEV_PAGE);
    const placeholder = page
      .locator('svg[data-branding="cliente"]:not([data-client-logo]) [data-part="logo-placeholder"]')
      .first();
    await expect(placeholder).toContainText('Tu logo aquí');
    const clientLogo = page.locator('svg[data-branding="cliente"][data-client-logo] image[data-part="client-logo"]');
    expect(await clientLogo.count()).toBeGreaterThan(0);
    const mark = page.locator('svg[data-branding="foldwise"] [data-part="brand"] [data-isotype-shape]').first();
    await expect(mark).toHaveAttribute('d', ISOTYPE_D);
  });

  test('every colorway renders', async ({ page }) => {
    await page.goto(DEV_PAGE);
    for (const c of ['kraft', 'ciruela', 'crema', 'blanco']) {
      await expect(page.locator(`svg[data-colorway="${c}"]`).first()).toBeVisible();
    }
  });
});
