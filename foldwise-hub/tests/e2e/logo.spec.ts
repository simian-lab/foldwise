import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { blockExternal } from './helpers';

const ISOTYPE_D = 'M15 42V27h-5l-2-2v-4l2-2h5V4h16l5 5v3H25v7h6l2 2v4l-2 2h-6v15z';
const FOLDS_D = 'M25 4v8 M15 19v8 M25 19v8';
// Real pages that render the mark components (the dev benches are gone).
const HUB = '/';
const MANUAL = '/marca';
const BOARD = '/marca/en-accion';
const COMPARE = '/marca/logo-animado';
const SHOP = '/tienda';

const VARIANT_COLORS: Record<string, { mark: string; folds: string }> = {
  crema: { mark: '#3A1D3F', folds: '#C8F25A' },
  ciruela: { mark: '#F6F1E7', folds: '#3A1D3F' },
  kraft: { mark: '#3A1D3F', folds: '#C8F25A' },
  lima: { mark: '#3A1D3F', folds: '#F6F1E7' },
};

test.describe('isotype', () => {
  test('renders the exact isotype path with dashed fold lines in every variant', async ({ page }) => {
    const blocked = await blockExternal(page);
    await page.goto(BOARD);

    for (const [variant, colors] of Object.entries(VARIANT_COLORS)) {
      // the board's "Logo" panel shows the isotype on all four backgrounds
      const mark = page.locator(`main [data-board-section="logo"] [data-isotype][role="img"][data-variant="${variant}"]`).first();
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
    await page.goto(MANUAL);
    const text = page.locator('main [data-wordmark] [data-wordmark-text]').first();
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
    await expect(page.locator('main [data-wordmark][data-with-isotype] [data-isotype]').first()).toBeVisible();
  });
});

type Tl = { isActive(): boolean; progress(): number };
const timelineOf = (page: Page, sel: string) =>
  page.locator(sel).first().evaluate((el) => {
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

/** Pauses a logo's timeline at t seconds and reads its pose. */
async function readAt(page: Page, sel: string, t: number) {
  return page.locator(sel).evaluate((el, t) => {
    const h = el as HTMLElement & { _timeline: { pause(): void; totalTime(v: number): void } };
    h.dataset.alfHeld = '';
    h._timeline.pause();
    h._timeline.totalTime(t);
    const g = (id: string) => el.querySelector(`[data-face="${id}"]`) as SVGGElement;
    const faces = Array.from(el.querySelectorAll<SVGGElement>('[data-face]'));
    return {
      state: h.dataset.state,
      lf: g('LF').getAttribute('transform'),
      lfFill: g('LF').querySelector('.alf-base')!.getAttribute('fill'),
      p4Fill: g('P4').querySelector('.alf-base')!.getAttribute('fill'),
      print: (el.querySelector('.alf-print') as SVGGElement | null)?.style.opacity ?? null,
      // panels never fade: each one stays fully opaque the whole time
      opacities: faces.filter((f) => !f.dataset.face!.includes('-')).map((f) => f.style.opacity || '1'),
      // board thickness bands on the free cut edges
      bands: faces.filter((f) => f.dataset.face!.includes('-e') && f.style.visibility !== 'hidden').length,
    };
  }, t);
}

test.describe('animated logo', () => {
  test('reaches the box state within 4 s when motion is allowed', async ({ page }) => {
    const blocked = await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(HUB);
    // The hub entry hero: a looping load logo. Looping logos pause offscreen.
    const logo = page.locator('main [data-hub-hero] [data-animated-logo][data-trigger="load"][data-loop="true"]');
    await logo.scrollIntoViewIfNeeded();
    await expect(logo).toHaveAttribute('data-state', /flat|folding/);
    // the true fold closes the box at 3.4 s
    await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 4_000 });
    expect(blocked).toEqual([]);
  });

  test('a looping load logo goes flat, folding, box, then unfolds back to the f', async ({ page }) => {
    test.setTimeout(25_000);
    const blocked = await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(COMPARE);
    const logo = page.locator('main [data-compare-row="crema"] [data-animated-logo][data-trigger="load"][data-loop="true"]');
    await logo.scrollIntoViewIfNeeded();
    await expect(logo).toHaveAttribute('data-state', /flat|folding/);
    await expect(logo).toHaveAttribute('data-state', 'folding', { timeout: 6_000 });
    await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 6_000 });
    await expect(logo).toHaveAttribute('data-state', 'flat', { timeout: 12_000 });
    expect(blocked).toEqual([]);
  });

  test('shows the static isotype and runs no timeline under reduced motion', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(HUB);
    const logo = page.locator('main [data-hub-hero] [data-animated-logo]');
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

  test('hover trigger stays flat until hovered, then plays', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(MANUAL);
    const logo = page.locator('main [data-animated-logo][data-trigger="hover"]').first();
    await logo.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1_200);
    await expect(logo).toHaveAttribute('data-state', 'flat');
    await logo.hover();
    await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 4_000 });
  });

  // Hover and view must play exactly once, even where the page passes `loop`
  // (the manual's view logos do), and come back to the flat isotype.
  for (const trigger of ['hover', 'view'] as const) {
    test(`${trigger} trigger plays once and rests on the flat isotype`, async ({ page }) => {
      test.setTimeout(30_000);
      await blockExternal(page);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(MANUAL);
      const sel = `main [data-animated-logo][data-trigger="${trigger}"]`;
      const logo = page.locator(sel).first();
      await logo.scrollIntoViewIfNeeded();
      if (trigger === 'hover') {
        await logo.hover();
        await page.mouse.move(0, 0);
      }
      await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 4_000 });
      await expect(logo).toHaveAttribute('data-state', 'flat', { timeout: 9_000 });
      await page.waitForTimeout(3_000); // longer than the 0.8 s flat intro: a loop would be folding by now
      await expect(logo).toHaveAttribute('data-state', 'flat');
      expect(await timelineOf(page, sel)).toEqual({ active: false, progress: 1 });
      // it rests on the complete isotype: the dashed folds are drawn
      const folds = await logo.evaluate(
        (el) => Array.from(el.querySelectorAll<SVGLineElement>('[data-crease]')).filter((l) => l.style.visibility !== 'hidden').length,
      );
      expect(folds).toBeGreaterThan(0);
    });
  }

  test('folds for real: panels turn in 3D, the material shows, no fades, board edges', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(COMPARE);
    const sel = 'main [data-compare-row="crema"] [data-animated-logo]';
    const flat = await readAt(page, sel, 0);
    expect(flat.state).toBe('flat');
    expect(flat.lfFill).toBe('#3A1D3F'); // the flat f is the isotype colour
    expect(flat.bands).toBe(0); // seen from above, the board's edges are edge-on
    const mid = await readAt(page, sel, 1.6);
    expect(mid.state).toBe('folding');
    expect(mid.lf).not.toBe(flat.lf); // the flap turned
    expect(mid.bands).toBeGreaterThan(3); // the cut edges show their thickness while folding
    const end = await readAt(page, sel, 5.85);
    expect(end.state).toBe('box');
    expect(Number(end.print)).toBeGreaterThan(0.95); // the f is printed on the box
    expect(end.bands).toBeGreaterThan(0);
    for (const s of [flat, mid, end]) expect(s.opacities).toEqual(Array(9).fill('1'));
  });

  test('both variants close into a kraft box printed with the plum f', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(COMPARE);
    const flats: Record<string, string> = { crema: '#3A1D3F', ciruela: '#F6F1E7' };
    const ends: string[] = [];
    for (const v of ['crema', 'ciruela']) {
      const sel = `main [data-compare-row="${v}"] [data-animated-logo]`;
      expect((await readAt(page, sel, 0)).lfFill).toBe(flats[v]); // the flat f matches the static isotype
      ends.push((await readAt(page, sel, 5.85)).p4Fill!);
      await expect(page.locator(`${sel} .alf-print path`).first()).toHaveAttribute('fill', '#3A1D3F');
      await expect(page.locator(`${sel} .alf-print path`).nth(1)).toHaveAttribute('stroke', '#C8F25A');
    }
    expect(ends[0]).toBe(ends[1]); // the same kraft front on both backgrounds
  });

  test('the header logo runs the compact fold and returns to the f', async ({ page }) => {
    test.setTimeout(20_000);
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(SHOP);
    const sel = 'header [data-animated-logo]';
    const logo = page.locator(sel);
    await expect(logo).toHaveAttribute('data-compact', '');
    await expect(logo).toHaveAttribute('data-trigger', 'hover');
    const bb = await logo.boundingBox();
    expect(Math.round(bb?.width ?? 0)).toBe(40);
    await expect(logo.locator('.alf-print')).toHaveCount(0); // too small to read: no printed f
    await expect(logo).toHaveAttribute('data-state', 'flat');
    await logo.hover();
    await page.mouse.move(0, 0);
    await expect(logo).toHaveAttribute('data-state', 'box', { timeout: 4_000 });
    await expect(logo).toHaveAttribute('data-state', 'flat', { timeout: 5_000 });
    expect(await timelineOf(page, sel)).toEqual({ active: false, progress: 1 });
    // a later hover plays it once more
    await logo.hover();
    await expect(logo).toHaveAttribute('data-state', /folding|box/, { timeout: 4_000 });
  });

  test('the comparison page loads offline with before and now on both backgrounds', async ({ page }) => {
    const errors = watchErrors(page);
    const blocked = await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(COMPARE);
    for (const v of ['crema', 'ciruela']) {
      const row = page.locator(`main [data-compare-row="${v}"]`);
      await expect(row.locator('[data-animated-logo-classic]')).toHaveCount(1);
      await expect(row.getByText('Antes', { exact: true })).toBeVisible();
      await expect(row.getByText('Ahora · pliegue real', { exact: true })).toBeVisible();
      const now = row.locator('[data-animated-logo]');
      await expect(now).toHaveCount(1);
      await expect(now).toHaveAttribute('data-variant', v);
      await expect(now).toHaveAttribute('role', 'img');
      await expect(now).toHaveAttribute('aria-label', 'Foldwise');
    }
    await page.waitForTimeout(1_500);
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('the comparison controls play, slow down and scrub both logos', async ({ page }) => {
    await blockExternal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(COMPARE);
    const now = page.locator('main [data-compare-row="ciruela"] [data-animated-logo]');
    const scrub = page.locator('[data-ctl-scrub]');
    await scrub.fill('0');
    await expect(now).toHaveAttribute('data-state', 'flat');
    await scrub.fill('500'); // halfway through the cycle: the closed box
    await expect(now).toHaveAttribute('data-state', 'box');
    await scrub.fill('1000'); // the end of the cycle: unfolded again
    await expect(now).toHaveAttribute('data-state', 'flat');

    const slow = page.getByRole('button', { name: 'Cámara lenta (0,25×)' });
    await slow.click();
    await expect(slow).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Reproducir' }).click();
    const speed = await now.evaluate((el) => (el as HTMLElement & { _timeline: { timeScale(): number } })._timeline.timeScale());
    expect(speed).toBeCloseTo(0.25, 5);
    await page.waitForTimeout(2_000); // 0.5 s of story: still flat at quarter speed
    await expect(now).toHaveAttribute('data-state', 'flat');
  });
});
