import { describe, it, expect } from 'vitest';
import { PANELS, PANEL, CLOSED, BOX, CREASES, EDGES, rfPushed, pose, apply, flat3, camera, project, paintOrder } from '../../src/scripts/fold-geometry';
import type { Vec3, PanelId } from '../../src/scripts/fold-geometry';

const close = (a: Vec3, b: Vec3) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));
const at = (id: PanelId, x: number, y: number, angles = CLOSED) => apply(pose(angles)[id], flat3([x, y]));

describe('fold geometry', () => {
  it('lies flat and unmoved with every angle at zero', () => {
    const T = pose({});
    for (const p of PANELS) for (const q of p.poly) close(apply(T[p.id], flat3(q)), [q[0], q[1], 0]);
  });

  it('closes into one 10 x 8 x 7 box along the isotype creases', () => {
    close(at('P1', 15, 4), [15, 27, 7]); // the tuck lid's free edge lands on the front top edge
    close(at('P1', 25, 12), [25, 19, 7]);
    close(at('P5', 15, 42), [15, 19, 7]); // glue flap reaches the back wall
    close(at('LF', 8, 23), [15, 23, 7]); // west end flap stands exactly 7 high
    close(at('TF', 32, 12), [25, 19, 0]); // the end lid comes down to the floor
    close(at('TK', 36, 9), [21, 22, 0]); // and its tuck slides in along the floor
    expect(at('RF', 33, 23)[2]).toBeCloseTo(7, 6); // the dust flap's tip meets the top
  });

  it('keeps every closed panel inside the box', () => {
    const T = pose(CLOSED);
    for (const p of PANELS)
      for (const q of p.poly) {
        const [x, y, z] = apply(T[p.id], flat3(q));
        expect(x).toBeGreaterThanOrEqual(BOX.x0 - 1e-6);
        expect(x).toBeLessThanOrEqual(BOX.x1 + 1e-6);
        expect(y).toBeGreaterThanOrEqual(BOX.y0 - 1e-6);
        expect(y).toBeLessThanOrEqual(BOX.y1 + 1e-6);
        expect(z).toBeGreaterThanOrEqual(-1e-6);
        expect(z).toBeLessThanOrEqual(BOX.h + 1e-6);
      }
  });

  it('starts on exactly the static isotype frame (46 grid, 12 % inset)', () => {
    const k = (200 * 0.76) / 46;
    const [x, y] = project(camera(0), [8, 42, 0]);
    expect(x).toBeCloseTo(24 + 8 * k, 6);
    expect(y).toBeCloseTo(24 + 42 * k, 6);
  });

  it('paints the lid over the glue flap and the end lid over the dust flap', () => {
    const T = pose(CLOSED);
    const faces = PANELS.map((p) => ({ key: p.id, layer: p.layer, pts: p.poly.map((q) => apply(T[p.id], flat3(q))) }));
    const order = paintOrder(camera(1), faces);
    expect(order.indexOf('P1')).toBeGreaterThan(order.indexOf('P5'));
    expect(order.indexOf('TF')).toBeGreaterThan(order.indexOf('RF'));
    expect(order.indexOf('P4')).toBeGreaterThan(order.indexOf('P3'));
    expect(PANEL.P3.parent).toBeNull();
  });

  it('gives every free cut edge a thickness band, and none to a crease', () => {
    // 25 outline edges are cut; the lid's 1.4-long shoulder chamfer is left as a crevice
    expect(EDGES).toHaveLength(24);
    expect(new Set(EDGES.map((e) => e.id)).size).toBe(EDGES.length);
    for (const e of EDGES) {
      const onCrease = CREASES.some(
        (c) =>
          (c.parent === e.panel || c.child === e.panel) &&
          [e.a, e.b].every((q) => Math.abs((c.b[0] - c.a[0]) * (q[1] - c.a[1]) - (c.b[1] - c.a[1]) * (q[0] - c.a[0])) < 1e-9),
      );
      expect(onCrease).toBe(false);
      // the outward direction points away from the panel's centre
      const p = PANEL[e.panel].poly;
      const cx = p.reduce((s, q) => s + q[0], 0) / p.length;
      const cy = p.reduce((s, q) => s + q[1], 0) / p.length;
      expect(e.out[0] * ((e.a[0] + e.b[0]) / 2 - cx) + e.out[1] * ((e.a[1] + e.b[1]) / 2 - cy)).toBeGreaterThan(0);
    }
  });

  it('keeps the upright dust flap under the closing top, ending on the closed lean', () => {
    expect(rfPushed(0)).toBe(0);
    expect(rfPushed(90)).toBeCloseTo(CLOSED.RF, 6);
    for (let p1 = 0; p1 <= 90; p1 += 2.5) {
      const rf = Math.max(90, rfPushed(p1));
      const T = pose({ P2: 90, P4: 90, P5: 90, LF: 90, P1: p1, RF: rf });
      const o = apply(T.P1, flat3([15, 12]));
      const ex = apply(T.P1, flat3([25, 12]));
      const ey = apply(T.P1, flat3([15, 4]));
      const u = [ex[0] - o[0], ex[1] - o[1], ex[2] - o[2]];
      const w = [ey[0] - o[0], ey[1] - o[1], ey[2] - o[2]];
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const side = (v: Vec3) => (v[0] - o[0]) * n[0] + (v[1] - o[1]) * n[1] + (v[2] - o[2]) * n[2];
      const inside = Math.sign(side([20, 23, 0]));
      for (const q of PANEL.RF.poly) expect(side(apply(T.RF, flat3(q))) * inside).toBeGreaterThan(-0.05);
    }
  });
});
