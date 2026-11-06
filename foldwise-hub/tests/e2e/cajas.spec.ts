import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

test.describe('/marca/cajas', () => {
  test('12 branded renders, captioned, with the 80/20 colorway mix', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const blocked = await blockExternal(page);
    await page.goto('/marca/cajas');

    const cards = page.locator('[data-render]');
    await expect(cards).toHaveCount(12);
    for (let i = 0; i < 12; i++) {
      const card = cards.nth(i);
      const svg = card.locator('svg[data-style]');
      await expect(svg).toHaveAttribute('data-branding', 'foldwise');
      const caption = (await card.locator('figcaption').innerText()).replace(/\s+/g, ' ');
      expect(caption).toMatch(/\S+.*\d+(,\d+)? × \d+(,\d+)? × \d+(,\d+)? in/);
    }
    const colors = await cards
      .locator('svg[data-style]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-colorway')));
    expect(colors.filter((c) => c === 'kraft').length).toBeGreaterThanOrEqual(7);
    expect(colors).toContain('ciruela');
    expect(colors).toContain('crema');
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('lineup composes all 12 boxes in Foldwise branding', async ({ page }) => {
    await page.goto('/marca/cajas');
    const lineup = page.locator('[data-lineup]');
    await expect(lineup).toBeVisible();
    const boxes = lineup.locator('svg[data-style]');
    await expect(boxes).toHaveCount(12);
    for (let i = 0; i < 12; i++) await expect(boxes.nth(i)).toHaveAttribute('data-branding', 'foldwise');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
