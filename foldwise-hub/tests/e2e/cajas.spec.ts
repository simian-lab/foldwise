import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

test.describe('/marca/cajas', () => {
  test('12 branded renders, captioned, with the 80/20 colorway mix', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const blocked = await blockExternal(page);
    await page.goto('/marca/cajas');

    // The photos are the primary renders.
    const cards = page.locator('[data-render]');
    await expect(cards).toHaveCount(12);
    for (let i = 0; i < 12; i++) {
      const card = cards.nth(i);
      const slug = await card.getAttribute('data-render');
      const img = card.locator('img');
      await expect(img).toHaveAttribute('src', `/img/products/${slug}.webp`);
      await expect(img).toHaveAttribute('alt', /Foldwise/);
      const caption = (await card.locator('figcaption').innerText()).replace(/\s+/g, ' ');
      expect(caption).toMatch(/\S+.*\d+(,\d+)? × \d+(,\d+)? × \d+(,\d+)? in/);
    }
    // The illustrated set stays available, branded, with the 80/20 colorway mix.
    const illus = page.locator('[data-render-illustrated]');
    await expect(illus).toHaveCount(12);
    for (let i = 0; i < 12; i++) {
      await expect(illus.nth(i).locator('svg[data-style]')).toHaveAttribute('data-branding', 'foldwise');
    }
    const colors = await illus
      .locator('svg[data-style]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-colorway')));
    expect(colors.filter((c) => c === 'kraft').length).toBeGreaterThanOrEqual(7);
    expect(colors).toContain('ciruela');
    expect(colors).toContain('crema');
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('the family photo leads, and the illustrated version opens on demand', async ({ page }) => {
    await page.goto('/marca/cajas');
    await expect(page.locator('img[data-family-photo]')).toHaveAttribute('src', '/img/products/familia.webp');
    const details = page.locator('details[data-illustrated]');
    await expect(details).not.toHaveAttribute('open', '');
    await expect(page.locator('[data-lineup]')).toBeHidden();
    await details.locator('summary').click();
    await expect(page.locator('[data-lineup]')).toBeVisible();
  });

  test('lineup composes all 12 boxes in Foldwise branding', async ({ page }) => {
    await page.goto('/marca/cajas');
    await page.locator('details[data-illustrated] summary').click();
    const lineup = page.locator('[data-lineup]');
    await expect(lineup).toBeVisible();
    const boxes = lineup.locator('svg[data-style]');
    await expect(boxes).toHaveCount(12);
    for (let i = 0; i < 12; i++) await expect(boxes.nth(i)).toHaveAttribute('data-branding', 'foldwise');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('lineup is one named group, with each of the first four marks uncovered', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/marca/cajas');
    await page.locator('details[data-illustrated] summary').click();
    const lineup = page.locator('[data-lineup]');
    await expect(lineup).toHaveAttribute('role', 'group');
    await expect(lineup).toHaveAttribute('aria-label', /familia/i);
    const boxes = lineup.locator('svg[data-style]');
    await expect(boxes).toHaveCount(12);
    // The group carries the name; the 12 renders stay out of the accessibility tree.
    const exposed = await boxes.evaluateAll((els) => els.filter((e) => !e.closest('[aria-hidden="true"]')).length);
    expect(exposed).toBe(0);

    await lineup.scrollIntoViewIfNeeded();
    // The printed mark of each of the back four boxes must be on top at its centre.
    const covered = await lineup.evaluate((root) => {
      const svgs = [...root.querySelectorAll('svg[data-style]')].slice(0, 4);
      return svgs
        .map((svg, i) => {
          const mark = svg.querySelector('[data-part="brand"]');
          if (!mark) return `box ${i}: no brand`;
          const r = mark.getBoundingClientRect();
          const hit = document
            .elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
            .find((el) => el instanceof SVGGeometryElement || el instanceof SVGTextContentElement);
          return hit && svg.contains(hit) ? null : `box ${i}`;
        })
        .filter(Boolean);
    });
    expect(covered).toEqual([]);
  });
});
