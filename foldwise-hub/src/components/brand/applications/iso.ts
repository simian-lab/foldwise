/**
 * Tiny isometric helpers for the board's application mockups. Same camera as
 * the box renderer (iso-geometry.ts): x runs down-right, y down-left, z up, so
 * the visible faces of a box are top (+z), left (+y) and right (+x).
 */
export type V3 = [number, number, number];
export type V2 = [number, number];

const C30 = Math.cos(Math.PI / 6);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Projects a world point to screen. */
export function iso([x, y, z]: V3): V2 {
  return [(x - y) * C30, (x + y) * 0.5 - z];
}

/** Projects a world direction (no translation). */
export function isoDir(v: V3): V2 {
  return iso(v);
}

/** Closed SVG path through world points. */
export function poly(pts: V3[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${r2(iso(p)[0])} ${r2(iso(p)[1])}`).join('') + 'Z';
}

/** Open SVG polyline through world points. */
export function line(pts: V3[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${r2(iso(p)[0])} ${r2(iso(p)[1])}`).join('');
}

/**
 * SVG matrix that maps face-local coordinates (s along `u`, t along `v`, both
 * world-unit vectors) onto the screen, anchored at world point `o`.
 */
export function faceMatrix(o: V3, u: V3, v: V3): string {
  const [ox, oy] = iso(o);
  const [ux, uy] = isoDir(u);
  const [vx, vy] = isoDir(v);
  return `matrix(${r2(ux)} ${r2(uy)} ${r2(vx)} ${r2(vy)} ${r2(ox)} ${r2(oy)})`;
}

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

/** viewBox string fitting every world point with padding. */
export function fit(pts: V3[], pad = 12): string {
  const s = pts.map(iso);
  const xs = s.map((p) => p[0]);
  const ys = s.map((p) => p[1]);
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  return `${r2(x0)} ${r2(y0)} ${r2(Math.max(...xs) - x0 + pad)} ${r2(Math.max(...ys) - y0 + pad)}`;
}

export const ISOTYPE_PATH = 'M15 42V27h-5l-2-2v-4l2-2h5V4h16l5 5v3H25v7h6l2 2v4l-2 2h-6v15z';
export const ISOTYPE_FOLDS = 'M25 4v8 M15 19v8 M25 19v8';

/** Face tones: top, left (+y), right (+x). */
export const TONES = {
  kraft: { top: '#DDBE94', left: '#C9A27A', right: '#A9845E', edge: '#8E6C48' },
  ciruela: { top: '#5A3360', left: '#3A1D3F', right: '#2A1430', edge: '#1E0E22' },
} as const;
