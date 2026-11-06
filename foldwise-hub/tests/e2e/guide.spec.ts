import { test, expect, type Page } from '@playwright/test';
import { blockExternal } from './helpers';

const GUIDES = [
  { slug: 'cajas-mailer', steps: 6 },
  { slug: 'cajas-de-envio', steps: 6 },
  { slug: 'mailers-faciles', steps: 5 },
];

/** Every face path of the figure, joined: a fingerprint of the drawn pose. */
const snapshot = (page: Page) =>
  page.locator('[data-guide-figure] > svg').evaluate((svg) =>
    [...svg.querySelectorAll('[data-face]')].map((p) => `${p.getAttribute('data-face')}:${p.getAttribute('d')}`).sort().join('|'),
  );

for (const g of GUIDES) {
  test.describe(`guide ${g.slug}`, () => {
    test('renders steps, counter, progress and prev/next controls', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const blocked = await blockExternal(page);
      await page.goto(`/tienda/guia/${g.slug}`);

      expect(await page.evaluate(() => document.querySelectorAll('h1').length)).toBe(1);
      await expect(page.locator('main h1')).toContainText('Cómo armar');
      await expect(page.locator('main [data-guide-step]')).toHaveCount(g.steps);
      await expect(page.locator('[data-guide-counter]')).toHaveText(`Paso 1 de ${g.steps}`);
      await expect(page.locator('[data-guide-prev]')).toBeDisabled();
      await expect(page.locator('[data-guide-next]')).toBeEnabled();
      await expect(page.locator('main [data-guide-step][aria-current="step"]')).toHaveCount(1);
      await expect(page.locator('[data-guide-figure] svg [data-face]').first()).toBeVisible();

      const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
      expect(text).not.toContain('ebiopacking');
      expect(errors).toEqual([]);
      expect(blocked).toEqual([]);
    });

    test('next/prev buttons and ← → keys move between steps and the box animates to each pose', async ({ page }) => {
      await page.goto(`/tienda/guia/${g.slug}`);
      const fig = page.locator('[data-guide-figure]');
      await expect(fig).toHaveAttribute('data-ready', 'true');
      const firstPose = await page.locator('main [data-guide-step]').nth(0).getAttribute('data-pose');
      const secondPose = await page.locator('main [data-guide-step]').nth(1).getAttribute('data-pose');
      await expect(fig).toHaveAttribute('data-pose', firstPose!);
      const start = await snapshot(page);

      await page.locator('[data-guide-next]').click();
      await expect(page.locator('[data-guide-counter]')).toHaveText(`Paso 2 de ${g.steps}`);
      await expect(fig).toHaveAttribute('data-pose', secondPose!);
      // Mid-flight: the drawing is tweening, not jumping.
      await expect(fig).toHaveAttribute('data-animating', 'true');
      const mid = await snapshot(page);
      await expect(fig).toHaveAttribute('data-animating', 'false', { timeout: 6000 });
      const end = await snapshot(page);
      expect(mid).not.toEqual(start);
      expect(end).not.toEqual(mid);
      await expect(page.locator('main [data-guide-step]').nth(1)).toHaveAttribute('aria-current', 'step');
      await expect(page.locator('[data-guide-progress]')).toHaveAttribute('aria-valuenow', '2');

      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-guide-counter]')).toHaveText(`Paso 3 de ${g.steps}`);
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('[data-guide-counter]')).toHaveText(`Paso 2 de ${g.steps}`);
      await page.locator('[data-guide-prev]').click();
      await expect(page.locator('[data-guide-counter]')).toHaveText(`Paso 1 de ${g.steps}`);
      await expect(fig).toHaveAttribute('data-animating', 'false', { timeout: 6000 });
      expect(await snapshot(page)).toEqual(start);
    });

    test('the last step celebrates and disables next', async ({ page }) => {
      await page.goto(`/tienda/guia/${g.slug}`);
      await page.locator('main [data-guide-step]').last().click();
      await expect(page.locator('[data-guide-counter]')).toHaveText(`Paso ${g.steps} de ${g.steps}`);
      await expect(page.locator('[data-guide-next]')).toBeDisabled();
      await expect(page.locator('[data-guide-figure]')).toHaveAttribute('data-done', 'true', { timeout: 8000 });
      await expect(page.locator('[data-guide-done]')).toBeVisible();
    });
  });
}

test('reduced motion jumps straight to each pose with no tween', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tienda/guia/cajas-mailer');
  const fig = page.locator('[data-guide-figure]');
  await expect(fig).toHaveAttribute('data-ready', 'true');
  const start = await snapshot(page);
  await page.locator('[data-guide-next]').click();
  await expect(page.locator('[data-guide-counter]')).toHaveText('Paso 2 de 6');
  const right = await snapshot(page);
  await page.waitForTimeout(1200);
  const later = await snapshot(page);
  expect(right).not.toEqual(start);
  expect(later).toEqual(right);
  await expect(fig).toHaveAttribute('data-animating', 'false');
});

test('guides exist only for the three families', async ({ request }) => {
  expect((await request.get('/tienda/guia/cajas-ropa')).status()).toBe(404);
});

test('guide works at 375 px without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/tienda/guia/cajas-de-envio');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
