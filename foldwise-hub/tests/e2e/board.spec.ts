import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

const PAGE = '/marca/en-accion';

const SECTIONS = ['Paleta', 'Tipografía', 'Logo', 'Patrones e íconos', 'Aplicaciones', 'Voz de marca'];

const PRIMARY = [
  { name: 'Crema', hex: '#F6F1E7' },
  { name: 'Kraft', hex: '#C9A27A' },
  { name: 'Ciruela', hex: '#3A1D3F' },
  { name: 'Lima', hex: '#C8F25A' },
];

const APPLICATIONS = ['mailer', 'shipping-box', 'tape', 'thank-you-card', 'sticker', 'business-card', 'social-post', 'delivery-van'];

test.describe('brand-in-action board', () => {
  test('renders every board section, with no console errors or external requests', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    const blocked = await blockExternal(page);
    await page.goto(PAGE);

    await expect(page.locator('h1')).toBeVisible();
    for (const name of SECTIONS) {
      await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
    // dev mode inlines absolute file paths into <style> ids, so check what the visitor sees
    expect(await page.locator('body').innerText()).not.toContain('ebiopacking');
  });

  test('shows the 4 primary swatches with exact hex values', async ({ page }) => {
    await page.goto(PAGE);
    const primary = page.locator('[data-board-section="paleta"] [data-swatch][data-tier="primary"]');
    await expect(primary).toHaveCount(4);
    for (const [i, s] of PRIMARY.entries()) {
      const sw = primary.nth(i);
      await expect(sw).toHaveAttribute('data-hex', s.hex);
      await expect(sw).toContainText(s.name);
      await expect(sw).toContainText(s.hex);
      await expect(sw).toContainText('RGB');
      await expect(sw).toContainText('CMYK');
    }
  });

  test('shows the 8 applications, the mailer with its inner message', async ({ page }) => {
    await page.goto(PAGE);
    const apps = page.locator('[data-board-section="aplicaciones"] [data-application]');
    await expect(apps).toHaveCount(8);
    for (const kind of APPLICATIONS) {
      const app = page.locator(`[data-application="${kind}"]`);
      await expect(app).toHaveCount(1);
      await expect(app.locator('svg').first()).toBeVisible();
    }
    await expect(page.locator('[data-application="mailer"] [data-part="inner-message"]')).toContainText(
      'Esto lo empacamos pensando en ti',
    );
    await expect(page.locator('[data-application="shipping-box"] [data-part="band"]')).toHaveCount(1);
  });

  test('patterns are tileable SVG and the board has no horizontal scroll at 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(PAGE);
    for (const kind of ['troquel', 'flauta']) {
      await expect(page.locator(`[data-pattern="${kind}"] pattern`).first()).toHaveCount(1);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
