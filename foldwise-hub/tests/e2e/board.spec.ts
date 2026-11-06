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

    // scoped to <main>: the Astro dev toolbar injects its own headings in dev
    const main = page.locator('main');
    await expect(main.locator('h1')).toBeVisible();
    for (const name of SECTIONS) {
      await expect(main.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
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

  test('shows the 8 applications as photos, each with a loaded image and Spanish alt', async ({ page }) => {
    await page.goto(PAGE);
    const apps = page.locator('[data-board-section="aplicaciones"] [data-application]');
    await expect(apps).toHaveCount(8);
    for (const kind of APPLICATIONS) {
      const img = page.locator(`[data-application="${kind}"] img`);
      await expect(img).toHaveCount(1);
      await expect(img).toHaveAttribute('src', /^\/img\/board\/.+\.webp$/);
      await expect(img).toHaveAttribute('width', '1600');
      await expect(img).toHaveAttribute('height', '1200');
      await expect(img).toHaveAttribute('loading', 'lazy');
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1600);
    }
    await expect(page.locator('[data-application="mailer"] img')).toHaveAttribute('alt', /Esto lo empacamos pensando en ti/);
  });

  test('keeps the 8 illustrated mockups in a collapsed "Versión ilustrada" disclosure', async ({ page }) => {
    await page.goto(PAGE);
    const illus = page.locator('[data-board-section="aplicaciones"] details[data-illustrated]');
    await expect(illus).not.toHaveAttribute('open', /.*/);
    await expect(illus.locator('summary')).toContainText('Versión ilustrada');
    await illus.locator('summary').click();
    const figs = illus.locator('[data-application-illustrated]');
    await expect(figs).toHaveCount(8);
    for (const kind of APPLICATIONS) {
      await expect(illus.locator(`[data-application-illustrated="${kind}"] svg`).first()).toBeVisible();
    }
    await expect(illus.locator('[data-application-illustrated="mailer"] [data-part="inner-message"]')).toContainText(
      'Esto lo empacamos pensando en ti',
    );
    await expect(illus.locator('[data-application-illustrated="shipping-box"] [data-part="band"]')).toHaveCount(1);
  });

  test('the patterns panel shows the 8 brand icons', async ({ page }) => {
    await page.goto(PAGE);
    const icons = page.locator('[data-board-section="patrones"] [data-icons-slot] [data-icon]');
    await expect(icons).toHaveCount(8);
    for (let i = 0; i < 8; i++) await expect(icons.nth(i)).toBeVisible();
  });

  test('patterns are tileable SVG and the board has no horizontal scroll at 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(PAGE);
    // measure with the illustrated mockups expanded too
    await page.locator('details[data-illustrated] summary').click();
    for (const kind of ['troquel', 'flauta']) {
      await expect(page.locator(`[data-pattern="${kind}"] pattern`).first()).toHaveCount(1);
    }
    // nothing may hide overflow: the scroll width must be the real layout width
    const clips = await page.evaluate(() =>
      ['html', 'body', 'main'].map((s) => getComputedStyle(document.querySelector(s)!).overflowX),
    );
    expect(clips).toEqual(['visible', 'visible', 'visible']);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll('main *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .filter((el) => !el.closest('svg'))
        .map((el) => el.tagName + '.' + el.className),
    );
    expect(wide).toEqual([]);
  });
});
