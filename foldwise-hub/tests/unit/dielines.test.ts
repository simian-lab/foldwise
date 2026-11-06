import { describe, it, expect } from 'vitest';
import { categories, getCategory } from '../../src/data/categories';
import { getDieline, formatInches } from '../../src/data/dielines';
import { guides, guideInfo, GUIDE_SLUGS, hasGuide } from '../../src/data/guides';
import { POSES, buildFrame, poseParams, viewOf } from '../../src/scripts/guide';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('dielines', () => {
  const styles = [...new Set(categories.map((c) => c.style))];

  it('only cites real FEFCO codes (0201, 0427); other styles show a plain name', () => {
    for (const style of styles) {
      const { code } = getDieline(style);
      if (code.includes('FEFCO')) expect(['FEFCO 0201', 'FEFCO 0427'], style).toContain(code);
    }
    expect(getDieline('rsc').code).toBe('FEFCO 0201');
    expect(getDieline('mailer').code).toBe('FEFCO 0427');
  });

  it('covers every box style used by the 12 categories with at least one cut and one fold', () => {
    expect(categories).toHaveLength(12);
    for (const style of styles) {
      const d = getDieline(style);
      expect(d.style).toBe(style);
      expect(d.cuts.length, style).toBeGreaterThanOrEqual(1);
      expect(d.folds.length, style).toBeGreaterThanOrEqual(1);
      for (const p of [...d.cuts, ...d.folds]) {
        expect(p, style).toMatch(/^M/);
        expect(numbers(p).every(Number.isFinite), style).toBe(true);
      }
      const vb = d.viewBox.split(' ').map(Number);
      expect(vb).toHaveLength(4);
      expect(vb[2]).toBeGreaterThan(0);
      expect(vb[3]).toBeGreaterThan(0);
    }
  });

  it('defaults to the main (first) size of the style and labels it in inches', () => {
    const mailer = getCategory('cajas-mailer')!;
    const d = getDieline('mailer');
    expect(d.dims).toEqual({ l: mailer.sizes[0].l, w: mailer.sizes[0].w, h: mailer.sizes[0].h });
    expect(d.measures.length).toBeGreaterThanOrEqual(2);
    for (const m of d.measures) expect(m.text).toMatch(/ in$/);
  });

  it('drives proportions from l / w / h (RSC blank = glue + 2L + 2W wide, H + W tall)', () => {
    const d = getDieline('rsc', { l: 12, w: 10, h: 8 });
    expect(d.flat.w).toBeCloseTo(d.glue + 2 * 12 + 2 * 10, 5);
    expect(d.flat.h).toBeCloseTo(8 + 10, 5);
    const longer = getDieline('rsc', { l: 20, w: 10, h: 8 });
    expect(longer.flat.w - longer.glue - (d.flat.w - d.glue)).toBeCloseTo(16, 5);
    const taller = getDieline('mailer', { l: 12, w: 9, h: 6 });
    expect(taller.flat.h).toBeGreaterThan(getDieline('mailer', { l: 12, w: 9, h: 4 }).flat.h);
  });

  it('formats inches with fractions to the nearest eighth', () => {
    expect(formatInches(12)).toBe('12 in');
    expect(formatInches(29.5)).toBe('29 ½ in');
    expect(formatInches(9.25)).toBe('9 ¼ in');
    expect(formatInches(0.375)).toBe('⅜ in');
  });
});

describe('assembly guides', () => {
  it('has guides for exactly the three agreed families', () => {
    expect([...GUIDE_SLUGS].sort()).toEqual(['cajas-de-envio', 'cajas-mailer', 'mailers-faciles']);
    expect(Object.keys(guides).sort()).toEqual([...GUIDE_SLUGS].sort());
    expect(hasGuide('cajas-mailer')).toBe(true);
    expect(hasGuide('cajas-ropa')).toBe(false);
  });

  for (const slug of GUIDE_SLUGS) {
    it(`${slug}: 5 to 7 numbered Spanish steps, each with a known pose`, () => {
      const steps = guides[slug];
      expect(steps.length).toBeGreaterThanOrEqual(5);
      expect(steps.length).toBeLessThanOrEqual(7);
      steps.forEach((s, i) => {
        expect(s.n).toBe(i + 1);
        expect(s.titulo.length).toBeGreaterThan(3);
        expect(s.texto.length).toBeGreaterThan(20);
        expect(POSES[guideInfo[slug].kind]).toHaveProperty(s.pose);
      });
      // Every step moves something: consecutive poses differ.
      for (let i = 1; i < steps.length; i++) {
        const a = poseParams(guideInfo[slug].kind, steps[i - 1].pose);
        const b = poseParams(guideInfo[slug].kind, steps[i].pose);
        expect(a, `${slug} step ${i + 1}`).not.toEqual(b);
      }
    });

    it(`${slug}: every pose builds a finite isometric frame, and poses differ on screen`, () => {
      const { kind, dims } = guideInfo[slug];
      const ds = guides[slug].map((s) => {
        const fr = buildFrame(kind, poseParams(kind, s.pose), dims);
        expect(fr.faces.length).toBeGreaterThan(4);
        for (const f of fr.faces) expect(numbers(f.d).every(Number.isFinite)).toBe(true);
        const v = viewOf(kind, poseParams(kind, s.pose), dims);
        expect(v.w).toBeGreaterThan(0);
        return fr.faces.map((f) => f.d).join('|');
      });
      expect(new Set(ds).size).toBe(ds.length);
    });
  }

  it('the mailer guide follows the brief: unfold, walls, sides, flaps, product, lid', () => {
    const titles = guides['cajas-mailer'].map((s) => s.titulo.toLowerCase()).join(' | ');
    for (const word of ['despliega', 'paredes', 'laterales', 'solapas', 'producto', 'tapa']) {
      expect(titles).toContain(word);
    }
  });
});
