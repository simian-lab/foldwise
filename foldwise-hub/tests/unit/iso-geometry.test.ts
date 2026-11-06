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
      for (const open of [false, true]) {
        const scene = buildBox({ style: 'rsc', l, w, h, open, colorway: 'kraft', branding: 'none' });
        const pts = scene.parts.flatMap((p) => p.pts.flat());
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

describe('colorways', () => {
  it('shade top lighter than front lighter than side', () => {
    for (const name of Object.keys(COLORWAYS) as (keyof typeof COLORWAYS)[]) {
      const c = COLORWAYS[name];
      expect(luminance(c.top)).toBeGreaterThan(luminance(c.front));
      expect(luminance(c.front)).toBeGreaterThan(luminance(c.side));
    }
  });
});
