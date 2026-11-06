import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

const ISOTYPE_D = 'M15 42V27h-5l-2-2v-4l2-2h5V4h16l5 5v3H25v7h6l2 2v4l-2 2h-6v15z';
const FOLDS_D = 'M25 4v8 M15 19v8 M25 19v8';
const DEV_PAGE = '/dev/logo';

const VARIANT_COLORS: Record<string, { mark: string; folds: string }> = {
  crema: { mark: '#3A1D3F', folds: '#C8F25A' },
  ciruela: { mark: '#F6F1E7', folds: '#3A1D3F' },
  kraft: { mark: '#3A1D3F', folds: '#C8F25A' },
  lima: { mark: '#3A1D3F', folds: '#F6F1E7' },
};

test.describe('isotype', () => {
  test('renders the exact isotype path with dashed fold lines in every variant', async ({ page }) => {
    const blocked = await blockExternal(page);
    await page.goto(DEV_PAGE);

    for (const [variant, colors] of Object.entries(VARIANT_COLORS)) {
      const mark = page.locator(`[data-isotype][data-variant="${variant}"]`).first();
      await expect(mark).toBeVisible();
      await expect(mark).toHaveAttribute('role', 'img');
      await expect(mark).toHaveAttribute('viewBox', '0 0 46 46');

      const shape = mark.locator('[data-isotype-shape]');
      await expect(shape).toHaveAttribute('d', ISOTYPE_D);
      await expect(shape).toHaveAttribute('fill', colors.mark);

      const folds = mark.locator('[data-isotype-folds]');
      await expect(folds).toHaveAttribute('d', FOLDS_D);
      await expect(folds).toHaveAttribute('stroke', colors.folds);
      const dash = await folds.getAttribute('stroke-dasharray');
      expect(dash?.trim().length ?? 0).toBeGreaterThan(0);
    }
    expect(blocked).toEqual([]);
  });

  test('wordmark is lowercase foldwise in Bricolage Grotesque 800 with tight tracking', async ({ page }) => {
    await blockExternal(page);
    await page.goto(DEV_PAGE);
    const text = page.locator('[data-wordmark] [data-wordmark-text]').first();
    await expect(text).toHaveText('foldwise');
    const style = await text.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        family: cs.fontFamily,
        weight: cs.fontWeight,
        spacing: parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize),
      };
    });
    expect(style.family).toContain('Bricolage Grotesque');
    expect(style.weight).toBe('800');
    expect(style.spacing).toBeCloseTo(-0.035, 3);
    await expect(page.locator('[data-wordmark][data-with-isotype] [data-isotype]').first()).toBeVisible();
  });
});

test.describe('animated logo', () => {
  test('reaches the box state within 3 s when motion is allowed', async ({ page }) => {
    const blocked = await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(DEV_PAGE);
    // Looping load logos pause offscreen, so bring the top-of-page one into view first.
    const logo = page.locator('#stage-load [data-animated-logo][data-trigger="load"]');
    await logo.scrollIntoViewIfNeeded();
    await expect(logo).toHaveAttribute('data-state', /flat|folding/);
    await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 3_000 });
    expect(blocked).toEqual([]);
  });

  test('shows the static isotype and runs no timeline under reduced motion', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DEV_PAGE);
    const logo = page.locator('[data-animated-logo]').first();
    await expect(logo).toHaveAttribute('data-state', 'static');

    const shape = logo.locator('[data-isotype-shape]');
    await expect(shape).toHaveAttribute('d', ISOTYPE_D);
    await expect(shape).toBeVisible();

    const snapshot = () =>
      logo.evaluate((el) =>
        Array.from(el.querySelectorAll('[data-al-part]')).map(
          (part) => `${getComputedStyle(part).transform}|${getComputedStyle(part).opacity}`,
        ),
      );
    const before = await snapshot();
    await page.waitForTimeout(2_500);
    expect(await snapshot()).toEqual(before);
    await expect(logo).toHaveAttribute('data-state', 'static');
    expect(await logo.evaluate((el) => (el as HTMLElement & { _timeline?: unknown })._timeline ?? null)).toBeNull();
  });

  test('hover trigger stays flat until hovered, then plays', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(DEV_PAGE);
    const logo = page.locator('[data-animated-logo][data-trigger="hover"]').first();
    await logo.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1_200);
    await expect(logo).toHaveAttribute('data-state', 'flat');
    await logo.hover();
    await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 3_000 });
  });

  // The dev page renders these logos without `loop`, so they inherit loop=true:
  // hover and view must still play exactly once.
  for (const trigger of ['hover', 'view'] as const) {
    test(`${trigger} trigger plays once and rests on the flat isotype`, async ({ page }) => {
      test.setTimeout(20_000);
      await blockExternal(page);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(DEV_PAGE);
      const logo = page.locator(`[data-animated-logo][data-trigger="${trigger}"]`).first();
      await logo.scrollIntoViewIfNeeded();
      if (trigger === 'hover') {
        await logo.hover();
        await page.mouse.move(0, 0);
      }
      await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 3_000 });
      await expect(logo).toHaveAttribute('data-state', 'flat', { timeout: 6_000 });
      await page.waitForTimeout(3_000); // longer than the 0.8 s flat intro: a loop would be folding by now
      await expect(logo).toHaveAttribute('data-state', 'flat');
      const tl = await logo.evaluate((el) => {
        const t = (el as HTMLElement & { _timeline?: { isActive(): boolean; progress(): number } })._timeline;
        return t ? { active: t.isActive(), progress: t.progress() } : null;
      });
      expect(tl).toEqual({ active: false, progress: 1 });
    });
  }
});
