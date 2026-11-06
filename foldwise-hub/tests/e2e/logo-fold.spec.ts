import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { blockExternal } from './helpers';

const ISOTYPE_D = 'M15 42V27h-5l-2-2v-4l2-2h5V4h16l5 5v3H25v7h6l2 2v4l-2 2h-6v15z';
const PAGE = '/marca/logo-animado';

type Tl = { isActive(): boolean; progress(): number };
const timelineOf = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => {
    const t = (el as HTMLElement & { _timeline?: Tl | null })._timeline;
    return t ? { active: t.isActive(), progress: t.progress() } : null;
  });

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test.describe('animated logo · true fold', () => {
  test('loads offline with both logos on both backgrounds and no console errors', async ({ page }) => {
    const errors = watchErrors(page);
    const blocked = await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(PAGE);
    for (const v of ['crema', 'ciruela']) {
      const row = page.locator(`main [data-compare-row="${v}"]`);
      await expect(row.locator('[data-animated-logo]')).toHaveCount(1);
      const fold = row.locator('[data-animated-logo-fold]');
      await expect(fold).toHaveAttribute('data-variant', v);
      await expect(fold).toHaveAttribute('role', 'img');
      await expect(fold).toHaveAttribute('aria-label', 'Foldwise');
    }
    await page.waitForTimeout(1_500);
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('a looping load logo goes flat, folding, then box within 6 s', async ({ page }) => {
    const blocked = await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(PAGE);
    const logo = page.locator('main [data-compare-row="crema"] [data-animated-logo-fold][data-trigger="load"][data-loop="true"]');
    await logo.scrollIntoViewIfNeeded();
    await expect(logo).toHaveAttribute('data-state', /flat|folding/);
    await expect(logo).toHaveAttribute('data-state', 'folding', { timeout: 6_000 });
    await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 6_000 });
    // the loop unfolds back to the flat f
    await expect(logo).toHaveAttribute('data-state', 'flat', { timeout: 12_000 });
    expect(blocked).toEqual([]);
  });

  test('folds for real: the panels turn in 3D and the material shows, no fades', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(PAGE);
    const sel = 'main [data-compare-row="crema"] [data-animated-logo-fold]';
    const read = (t: number) =>
      page.locator(sel).evaluate((el, t) => {
        const h = el as HTMLElement & { _timeline: { pause(): void; totalTime(v: number): void } };
        h.dataset.alfHeld = '';
        h._timeline.pause();
        h._timeline.totalTime(t);
        const g = (id: string) => el.querySelector(`[data-face="${id}"]`) as SVGGElement;
        return {
          state: h.dataset.state,
          lf: g('LF').getAttribute('transform'),
          lfFill: g('LF').querySelector('.alf-base')!.getAttribute('fill'),
          print: (el.querySelector('.alf-print') as SVGGElement).style.opacity,
          opacities: Array.from(el.querySelectorAll('[data-face]'))
            .filter((f) => !(f as SVGGElement).dataset.face!.includes('-'))
            .map((f) => (f as SVGGElement).style.opacity || '1'),
        };
      }, t);
    const flat = await read(0);
    expect(flat.state).toBe('flat');
    expect(flat.lfFill).toBe('#3A1D3F'); // the flat f is the isotype colour
    const mid = await read(1.6);
    expect(mid.state).toBe('folding');
    expect(mid.lf).not.toBe(flat.lf); // the flap turned
    const end = await read(5.85);
    expect(end.state).toBe('box');
    expect(Number(end.print)).toBeGreaterThan(0.9); // the f is printed on the box
    // panels never fade: each one stays fully opaque the whole time
    for (const s of [flat, mid, end]) expect(s.opacities).toEqual(Array(9).fill('1'));
  });

  test('shows the static isotype and runs no timeline under reduced motion', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
    const logo = page.locator('main [data-compare-row="crema"] [data-animated-logo-fold]');
    await expect(logo).toHaveAttribute('data-state', 'static');
    const shape = logo.locator('[data-isotype-shape]');
    await expect(shape).toHaveAttribute('d', ISOTYPE_D);
    await expect(shape).toBeVisible();
    await expect(logo.locator('.alf-scene')).toBeHidden();

    const snapshot = () =>
      logo.evaluate((el) =>
        Array.from(el.querySelectorAll('[data-al-part], [data-face]')).map(
          (part) => `${getComputedStyle(part).transform}|${getComputedStyle(part).opacity}|${part.getAttribute('transform')}`,
        ),
      );
    const before = await snapshot();
    await page.waitForTimeout(2_500);
    expect(await snapshot()).toEqual(before);
    await expect(logo).toHaveAttribute('data-state', 'static');
    expect(await logo.evaluate((el) => (el as HTMLElement & { _timeline?: unknown })._timeline ?? null)).toBeNull();
  });

  test('hover trigger stays flat until hovered, then folds into the box', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(PAGE);
    const logo = page.locator('main [data-animated-logo-fold][data-trigger="hover"]').first();
    await logo.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1_200);
    await expect(logo).toHaveAttribute('data-state', 'flat');
    await logo.hover();
    await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 6_000 });
  });

  // Hover and view play exactly once, even where the page passes `loop`.
  for (const trigger of ['hover', 'view'] as const) {
    test(`${trigger} trigger plays once and rests on the closed box`, async ({ page }) => {
      test.setTimeout(25_000);
      await blockExternal(page);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(PAGE);
      const sel = `main [data-animated-logo-fold][data-trigger="${trigger}"]`;
      const logo = page.locator(sel).first();
      await logo.scrollIntoViewIfNeeded();
      if (trigger === 'hover') {
        await logo.hover();
        await page.mouse.move(0, 0);
      }
      await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 6_000 });
      await expect.poll(() => timelineOf(page, sel), { timeout: 6_000 }).toEqual({ active: false, progress: 1 });
      if (trigger === 'hover') {
        await logo.hover(); // a second hover does not replay
        await page.mouse.move(0, 0);
      }
      await page.waitForTimeout(3_000);
      await expect(logo).toHaveAttribute('data-state', 'box');
      expect(await timelineOf(page, sel)).toEqual({ active: false, progress: 1 });
    });
  }

  test('the controls play, slow down and scrub both logos', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(PAGE);
    const fold = page.locator('main [data-compare-row="ciruela"] [data-animated-logo-fold]');
    const scrub = page.locator('[data-ctl-scrub]');
    await scrub.fill('0');
    await expect(fold).toHaveAttribute('data-state', 'flat');
    await scrub.fill('1000');
    await expect(fold).toHaveAttribute('data-state', 'box');

    const slow = page.getByRole('button', { name: 'Cámara lenta (0,25×)' });
    await slow.click();
    await expect(slow).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Reproducir' }).click();
    const speed = await fold.evaluate((el) => (el as HTMLElement & { _timeline: { timeScale(): number } })._timeline.timeScale());
    expect(speed).toBeCloseTo(0.25, 5);
    await page.waitForTimeout(2_000); // 0.5 s of story: still flat at quarter speed
    await expect(fold).toHaveAttribute('data-state', 'flat');
  });
});
