import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

const PAGE = '/marca';

const SECTIONS = [
  { id: 'la-marca', num: '01', title: 'La marca' },
  { id: 'nombre', num: '02', title: 'Nombre' },
  { id: 'logo', num: '03', title: 'Logo' },
  { id: 'logo-animado', num: '04', title: 'Logo animado' },
  { id: 'color', num: '05', title: 'Color' },
  { id: 'tipografia', num: '06', title: 'Tipografía' },
  { id: 'iconos', num: '07', title: 'Íconos' },
  { id: 'patrones', num: '08', title: 'Patrones' },
  { id: 'voz', num: '09', title: 'Voz de marca' },
  { id: 'redes', num: '10', title: 'Redes sociales' },
  { id: 'direcciones', num: '11', title: 'Direcciones exploradas' },
  { id: 'proximos-pasos', num: '12', title: 'Próximos pasos' },
];

const ICONS = ['envio', 'personaliza', 'rapido', 'asesoria', 'pedido-pequeno', 'eco', 'medida', 'armado'];

const section = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`main [data-manual-section="${id}"]`);

test.describe('brand manual', () => {
  test('renders the 12 sections in order, offline and without console errors', async ({ page }) => {
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

    const ids = await main.locator('[data-manual-section]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-manual-section')),
    );
    expect(ids).toEqual(SECTIONS.map((s) => s.id));

    for (const s of SECTIONS) {
      const sec = section(page, s.id);
      await expect(sec.getByRole('heading', { level: 2, name: s.title, exact: true })).toBeVisible();
      await expect(sec.locator('[data-section-num]')).toHaveText(s.num);
    }

    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
    expect(await page.locator('body').innerText()).not.toContain('ebiopacking');
  });

  test('La marca covers the story, the name and the positioning', async ({ page }) => {
    await page.goto(PAGE);
    const sec = section(page, 'la-marca');
    for (const h of ['Historia', 'El porqué del nombre', 'Posicionamiento']) {
      await expect(sec.getByRole('heading', { level: 3, name: h, exact: true })).toBeVisible();
    }
    await expect(sec).toContainText(/ser pequeño no te hace cliente secundario/i);
  });

  test('Nombre documents Foldwise, the rejected Ridgeline and the USPTO note', async ({ page }) => {
    await page.goto(PAGE);
    const sec = section(page, 'nombre');
    await expect(sec).toContainText('Foldwise');
    await expect(sec.locator('[data-name="ridgeline"]')).toContainText('Ridgeline');
    await expect(sec.locator('[data-name="ridgeline"]')).toContainText('Descartado');
    const legal = sec.locator('[data-legal-note]');
    await expect(legal).toContainText('USPTO');
    await expect(legal).toContainText('99663592');
  });

  test('Logo shows versions, clear space, minimum size and incorrect uses', async ({ page }) => {
    await page.goto(PAGE);
    const sec = section(page, 'logo');
    for (const h of ['Versiones', 'Zona de protección', 'Tamaño mínimo', 'Usos incorrectos']) {
      await expect(sec.getByRole('heading', { level: 3, name: h, exact: true })).toBeVisible();
    }
    await expect(sec.locator('[data-logo-version]')).toHaveCount(4);
    expect(await sec.locator('[data-misuse]').count()).toBeGreaterThanOrEqual(4);
  });

  test('Logo animado embeds the animated logo', async ({ page }) => {
    await page.goto(PAGE);
    await expect(section(page, 'logo-animado').locator('[data-animated-logo]').first()).toBeVisible();
  });

  test('Color lists hex, RGB and CMYK and the 80/20 rule', async ({ page }) => {
    await page.goto(PAGE);
    const sec = section(page, 'color');
    const primary = sec.locator('[data-swatch][data-tier="primary"]');
    await expect(primary).toHaveCount(4);
    for (const hex of ['#F6F1E7', '#C9A27A', '#3A1D3F', '#C8F25A']) {
      await expect(sec.locator(`[data-swatch][data-hex="${hex}"]`)).toContainText(hex);
    }
    await expect(primary.first()).toContainText('RGB');
    await expect(primary.first()).toContainText('CMYK');
    await expect(sec.locator('[data-rule-8020]')).toContainText('80/20');
  });

  test('Tipografía, Íconos, Patrones and Voz show their exhibits', async ({ page }) => {
    await page.goto(PAGE);
    await expect(section(page, 'tipografia')).toContainText('Bricolage Grotesque');
    await expect(section(page, 'tipografia')).toContainText('Figtree');
    const icons = section(page, 'iconos').locator('[data-iconset] [data-icon]');
    await expect(icons).toHaveCount(8);
    for (const name of ICONS) {
      await expect(section(page, 'iconos').locator(`[data-iconset] [data-icon="${name}"]`)).toBeVisible();
    }
    for (const kind of ['troquel', 'flauta']) {
      await expect(section(page, 'patrones').locator(`[data-pattern="${kind}"]`).first()).toBeVisible();
    }
    const voz = section(page, 'voz');
    await expect(voz.locator('[data-voice="si"] li')).toHaveCount(5);
    await expect(voz.locator('[data-voice="no"] li')).toHaveCount(5);
    await expect(voz.locator('[data-voice-example]')).toHaveCount(3);
    await expect(voz).toContainText('Pedidos pequeños. Cuidado enorme.');
  });

  test('Direcciones exploradas rebuilds palettes A/C and isotypes Fold/Flute', async ({ page }) => {
    await page.goto(PAGE);
    const sec = section(page, 'direcciones');
    await expect(sec.locator('[data-direction="palette-a"]')).toContainText('Cobalt & Coral');
    await expect(sec.locator('[data-direction="palette-c"]')).toContainText('Ink & Tomato');
    await expect(sec.locator('[data-direction="isotype-fold"]')).toContainText('The Fold');
    await expect(sec.locator('[data-direction="isotype-flute"]')).toContainText('The Flute');
    for (const d of ['palette-a', 'palette-c', 'isotype-fold', 'isotype-flute']) {
      await expect(sec.locator(`[data-direction="${d}"] svg`).first()).toBeVisible();
    }
    await expect(sec.locator('[data-direction="chosen"]')).toContainText('Plum & Lime');
  });

  test('Redes sociales follows Voz de marca with rhythm, templates, caption tone and examples', async ({ page }) => {
    await page.goto(PAGE);
    const ids = await page.locator('main [data-manual-section]').evaluateAll((els) => els.map((el) => el.id));
    expect(ids.indexOf('redes')).toBe(ids.indexOf('voz') + 1);
    const sec = section(page, 'redes');
    for (const h of ['Ritmo del feed', 'Plantillas y zonas seguras', 'Color en redes', 'Tipografía en redes', 'Tono de los captions', 'Ejemplos']) {
      await expect(sec.getByRole('heading', { level: 3, name: h, exact: true })).toBeVisible();
    }
    const tiles = sec.locator('[data-ig-feed] [data-ig-tile]');
    await expect(tiles).toHaveCount(9);
    for (const r of ['foto', 'tipografia', 'patron']) {
      expect(await sec.locator(`[data-ig-tile][data-rhythm="${r}"]`).count()).toBeGreaterThanOrEqual(2);
    }
    for (const t of ['post-1x1', 'post-4x5', 'story', 'carousel']) {
      await expect(sec.locator(`[data-template="${t}"]`)).toBeVisible();
    }
    await expect(sec.locator('[data-template="story"]')).toContainText('1080 × 1920 px');
    await expect(sec.locator('[data-caption-example]')).toHaveCount(2);
    await expect(sec.locator('[data-caption-example]').first()).toContainText('Empieza con 25 cajas');
    await expect(sec.locator('[data-ig-post]').first()).toContainText('#');
    await expect(sec.locator('[data-ig-carousel] [data-ig-slide]')).toHaveCount(4);
    await expect(sec.locator('[data-ig-story]')).toHaveCount(2);
    await expect(sec.locator('[data-ig-story="encuesta"] [data-ig-poll]')).toContainText('Kraft');
    await expect(sec.locator('[data-ig-story="encuesta"] [data-ig-poll]')).not.toContainText('%');
  });


  test('Próximos pasos lists the next deliverables; Simian credit and sibling links are present', async ({ page }) => {
    await page.goto(PAGE);
    const steps = section(page, 'proximos-pasos').locator('[data-next-step]');
    expect(await steps.count()).toBeGreaterThanOrEqual(5);
    await expect(page.locator('main')).toContainText('Propuesta de marca por Simian');
    await expect(page.locator('main a[href="/marca/en-accion"]').first()).toBeVisible();
    await expect(page.locator('main a[href="/marca/cajas"]').first()).toBeVisible();
  });

  test('print stylesheet hides the nav and starts each section on a new page', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-manual-nav]')).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-manual-nav]')).toBeHidden();
    const breaks = await page
      .locator('main [data-manual-section]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).breakBefore));
    expect(breaks.every((b) => b === 'page')).toBe(true);
  });

  test('no horizontal scroll at 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(PAGE);
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
