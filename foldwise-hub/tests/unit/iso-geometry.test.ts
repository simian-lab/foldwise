import { describe, it, expect } from 'vitest';
import { project, buildBox, BOX_STYLES, COLORWAYS, luminance, VIEWBOX } from '../../src/components/boxes/iso-geometry';
import type { Part } from '../../src/components/boxes/iso-geometry';

function partBounds(p: Part) {
  const pts = p.pts.flat();
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

describe('project', () => {
  it('maps world axes to the isometric screen', () => {
    const c = Math.cos(Math.PI / 6);
    const [x1, y1] = project([1, 0, 0]);
    expect(x1).toBeCloseTo(c);
    expect(y1).toBeCloseTo(0.5);
    const [x2, y2] = project([0, 1, 0]);
    expect(x2).toBeCloseTo(-c);
    expect(y2).toBeCloseTo(0.5);
    const [x3, y3] = project([0, 0, 1]);
    expect(x3).toBeCloseTo(0);
    expect(y3).toBeCloseTo(-1);
  });
});

describe('buildBox', () => {
  it('keeps l/w/h proportions on the visible faces', () => {
    const scene = buildBox({ style: 'rsc', l: 24, w: 12, h: 18, open: false, colorway: 'kraft', branding: 'none' });
    const front = scene.parts.find((p) => p.part === 'front')!;
    const side = scene.parts.find((p) => p.part === 'side')!;
    const f = partBounds(front);
    const s = partBounds(side);
    // the front face spans l and the side face spans w along screen x
    expect((f.maxX - f.minX) / (s.maxX - s.minX)).toBeCloseTo(24 / 12, 1);
    const scale = (f.maxX - f.minX) / (24 * Math.cos(Math.PI / 6));
    const sideEdge = s.maxY - s.minY - 12 * 0.5 * scale;
    expect(sideEdge / scale).toBeCloseTo(18, 1);
  });

  it('fits the whole drawing inside the viewBox and fills it', () => {
    for (const [l, w, h] of [[24, 18, 18], [9, 6, 4], [36, 16, 12], [4, 4, 15]]) {
      for (const [style, open] of BOX_STYLES.flatMap((st) => [[st, false], [st, true]] as const)) {
        const scene = buildBox({ style, l, w, h, open, colorway: 'kraft', branding: 'none' });
        // real (unclamped) bounds of the solid geometry; blurred shadows may bleed into the padding
        const pts = scene.parts.filter((p) => !p.filter).flatMap((p) => p.pts.flat());
        const xs = pts.map((q) => q[0]);
        const ys = pts.map((q) => q[1]);
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...xs)).toBeLessThanOrEqual(VIEWBOX.w);
        expect(Math.max(...ys)).toBeLessThanOrEqual(VIEWBOX.h);
        const fillX = (Math.max(...xs) - Math.min(...xs)) / VIEWBOX.w;
        const fillY = (Math.max(...ys) - Math.min(...ys)) / VIEWBOX.h;
        expect(Math.max(fillX, fillY)).toBeGreaterThan(0.75);
      }
    }
  });

  it('builds every style closed and open with finite geometry', () => {
    for (const style of BOX_STYLES) {
      for (const open of [false, true]) {
        const scene = buildBox({ style, l: 12, w: 9, h: 6, open, colorway: 'ciruela', branding: 'foldwise' });
        expect(scene.parts.length).toBeGreaterThan(5);
        for (const p of scene.parts) {
          for (const q of p.pts.flat()) {
            expect(Number.isFinite(q[0]) && Number.isFinite(q[1])).toBe(true);
          }
        }
      }
    }
  });

  it('an open mailer exposes the inner face of its lid, a closed one does not', () => {
    const open = buildBox({ style: 'mailer', l: 12, w: 9, h: 4, open: true, colorway: 'kraft', branding: 'none' });
    const closed = buildBox({ style: 'mailer', l: 12, w: 9, h: 4, open: false, colorway: 'kraft', branding: 'none' });
    expect(open.parts.some((p) => p.part === 'lid-inner')).toBe(true);
    expect(closed.parts.some((p) => p.part === 'lid-inner')).toBe(false);
  });

  it('an open wine shipper has one divider cell per bottle', () => {
    const scene = buildBox({ style: 'wine', l: 16, w: 12, h: 16, open: true, colorway: 'kraft', branding: 'none' });
    expect(scene.parts.filter((p) => p.part === 'cell').length).toBe(12);
  });

  it('places a branding frame on the front face only when branded', () => {
    const none = buildBox({ style: 'rsc', l: 12, w: 12, h: 12, open: false, colorway: 'kraft', branding: 'none' });
    const brand = buildBox({ style: 'rsc', l: 12, w: 12, h: 12, open: false, colorway: 'kraft', branding: 'foldwise' });
    expect(none.logo).toBeNull();
    expect(brand.logo).not.toBeNull();
    expect(brand.logo!.matrix).toHaveLength(6);
  });
});

describe('materials', () => {
  it('references shared page materials, never per-box filters', () => {
    for (const style of BOX_STYLES) {
      for (const open of [false, true]) {
        const scene = buildBox({ style, l: 12, w: 9, h: 6, open, colorway: 'kraft', branding: 'foldwise' });
        for (const p of scene.parts) {
          if (p.filter) expect(['blur', 'blur-s']).toContain(p.filter);
          for (const v of [p.fill, p.stroke]) {
            if (v?.startsWith('url:')) expect(['fiber', 'vshade', 'front-light', 'side-light', 'top-light', 'inner', 'deep', 'tape-gloss']).toContain(v.slice(4));
          }
        }
      }
    }
  });

  it('shows corrugation flutes on the cut rim of an open box and none on a closed one', () => {
    const open = buildBox({ style: 'rsc', l: 12, w: 9, h: 6, open: true, colorway: 'kraft', branding: 'none' });
    const closed = buildBox({ style: 'rsc', l: 12, w: 9, h: 6, open: false, colorway: 'kraft', branding: 'none' });
    expect(open.parts.filter((p) => p.part === 'flute').length).toBeGreaterThanOrEqual(4);
    expect(closed.parts.some((p) => p.part === 'flute')).toBe(false);
  });

  it('draws faces with tonal edges instead of the dark outline', () => {
    const scene = buildBox({ style: 'rsc', l: 12, w: 9, h: 6, open: false, colorway: 'kraft', branding: 'none' });
    const front = scene.parts.find((p) => p.part === 'front')!;
    expect(front.stroke).not.toBe(COLORWAYS.kraft.edge);
    expect(luminance(front.stroke!)).toBeGreaterThan(luminance(COLORWAYS.kraft.edge));
  });
});

describe('print and tape legibility', () => {
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  it('prints ink with clear contrast on every colorway', () => {
    for (const name of Object.keys(COLORWAYS) as (keyof typeof COLORWAYS)[]) {
      const c = COLORWAYS[name];
      expect(contrast(c.ink, c.front)).toBeGreaterThan(3);
    }
  });

  it('keeps branded tape pure, fully opaque lime on every colorway', () => {
    for (const colorway of Object.keys(COLORWAYS) as (keyof typeof COLORWAYS)[]) {
      const scene = buildBox({ style: 'rsc', l: 12, w: 9, h: 6, open: false, colorway, branding: 'foldwise' });
      const tape = scene.parts.filter((p) => p.part === 'tape');
      expect(tape.length).toBeGreaterThan(0);
      for (const t of tape) {
        expect(['#C8F25A', '#A6CE3E']).toContain(t.fill);
        expect(t.opacity).toBeUndefined();
      }
      expect(scene.logo).not.toBeNull();
    }
  });
});

describe('colorways', () => {
  it('shade top lighter than front lighter than side', () => {
    for (const name of Object.keys(COLORWAYS) as (keyof typeof COLORWAYS)[]) {
      const c = COLORWAYS[name];
      expect(luminance(c.top)).toBeGreaterThan(luminance(c.front));
      expect(luminance(c.front)).toBeGreaterThan(luminance(c.side));
    }
  });
});
