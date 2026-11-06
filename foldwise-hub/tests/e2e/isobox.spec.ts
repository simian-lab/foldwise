import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

// Real pages that render the box renderer (the dev benches are gone).
const CAJAS = '/marca/cajas';
const BOARD = '/marca/en-accion';
const PDP = '/tienda/producto/cajas-mailer';
const ISOTYPE_D = 'M15 42V27h-5l-2-2v-4l2-2h5V4h16l5 5v3H25v7h6l2 2v4l-2 2h-6v15z';

test.describe('isometric boxes', () => {
  test('renders one box per category with real size and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    const blocked = await blockExternal(page);
    await page.goto(CAJAS);
    await page.locator('details[data-illustrated] summary').click();

    const boxes = page.locator('main [data-render-illustrated] svg[data-style]');
    await expect(boxes).toHaveCount(12);
    for (let i = 0; i < 12; i++) {
      const bb = await boxes.nth(i).boundingBox();
      expect(bb?.width ?? 0).toBeGreaterThan(50);
      expect(bb?.height ?? 0).toBeGreaterThan(50);
      await expect(boxes.nth(i)).toHaveAttribute('role', 'img');
    }
    // box ids (clips) and the shared materials (fibre, lighting, blurs, ink) never
    // collide, and the materials exist once however many boxes render
    const ids = await page.locator('svg.iso-box [id], #fw-materials, #fw-materials [id]').evaluateAll((els) => els.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    await expect(page.locator('#fw-materials')).toHaveCount(1);
    // no box carries its own filter: blurs, fibre and ink are the shared defs
    await expect(page.locator('svg.iso-box filter')).toHaveCount(0);
    expect(await page.locator('#fw-materials filter').count()).toBeLessThanOrEqual(4);
    const fills = await page.locator('svg.iso-box path[fill^="url(#fw-fiber)"]').count();
    expect(fills).toBeGreaterThan(12);
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('an open mailer shows the inner face of its lid', async ({ page }) => {
    await page.goto(BOARD);
    const mailer = page.locator('main svg[data-style="mailer"][data-open="true"]').first();
    await expect(mailer).toBeVisible();
    await expect(mailer.locator('[data-part="lid-inner"]')).toHaveCount(1);
  });

  // The uploaded client logo replacing the placeholder is covered in pdp.spec.ts.
  test('branding marks the front face', async ({ page }) => {
    await page.goto(PDP);
    const placeholder = page
      .locator('main svg[data-branding="cliente"]:not([data-client-logo]) [data-part="logo-placeholder"]')
      .first();
    await expect(placeholder).toContainText('Tu logo aquí');
    await page.goto(CAJAS);
    const mark = page.locator('main svg[data-branding="foldwise"] [data-part="brand"] [data-isotype-shape]').first();
    await expect(mark).toHaveAttribute('d', ISOTYPE_D);
  });

  // "blanco" exists in the renderer but no page uses it yet.
  test('every colorway used by the brand renders', async ({ page }) => {
    await page.goto(CAJAS);
    await page.locator('details[data-illustrated] summary').click();
    for (const c of ['kraft', 'ciruela', 'crema']) {
      await expect(page.locator(`svg[data-colorway="${c}"]`).first()).toBeVisible();
    }
  });
});
