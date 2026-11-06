/**
 * Pure isometric geometry for Foldwise boxes.
 *
 * World units are inches: x runs along the box length (l), y along its width
 * (w) and z up. The camera looks from +x +y +z (classic 30° isometric), so the
 * long "front" face (plane y = w) sits on the left of the screen, the end
 * "side" face (plane x = l) on the right, and the lid on top.
 *
 * `buildBox` returns a flat list of 2D parts in painter's order (back to
 * front, bottom to top), already fitted to `VIEWBOX`. The Astro component only
 * serialises them, so every proportion and every overlap is testable here.
 */
import type { BoxStyle } from '../../data/categories';
import { palette } from '../../data/brand';

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Colorway = 'kraft' | 'ciruela' | 'crema' | 'blanco';
export type Branding = 'foldwise' | 'cliente' | 'none';

export const BOX_STYLES: BoxStyle[] = [
  'rsc', 'mailer', 'easyfold', 'multidepth', 'file', 'sideloader', 'wine', 'retail', 'apparel',
];

export const VIEWBOX = { w: 400, h: 340 } as const;
const PAD = 22;

export const LIME = palette.lima;
const LIME_SHADE = '#A6CE3E';
const SHADOW = palette.ciruelaSombra;

export interface Palette {
  top: string;
  front: string;
  side: string;
  inner: string;
  edge: string;
  ink: string;
}

/** Four tones per colorway (top / front / side / inner) plus edge and print ink. */
// Derived shades: tones the shading needs beyond the eight brand tokens.
// Each is a darker or lighter step of a token, never a new hue.
const DERIVED = {
  kraftInner: '#8C6B49', // kraftSombra, one step darker (inside walls)
  kraftEdge: '#7E5E3E', // kraftSombra, two steps darker (outline)
  ciruelaInner: '#1D0D21', // ciruelaSombra, one step darker
  ciruelaEdge: '#160818', // ciruelaSombra, two steps darker
  cremaTop: '#FCFAF4', // crema lifted toward white (lit lid)
  cremaSide: '#DED2BC', // crema in shade
  cremaInner: '#C7B89D',
  cremaEdge: '#B3A386',
  blancoFront: '#F3F2EF',
  blancoSide: '#DEDDD8',
  blancoInner: '#C5C4BE',
  blancoEdge: '#ABAAA3',
} as const;

/** Four tones per colorway (top / front / side / inner) plus edge and print ink. */
export const COLORWAYS: Record<Colorway, Palette> = {
  kraft: { top: palette.kraftClaro, front: palette.kraft, side: palette.kraftSombra, inner: DERIVED.kraftInner, edge: DERIVED.kraftEdge, ink: palette.ciruela },
  ciruela: { top: palette.ciruelaClaro, front: palette.ciruela, side: palette.ciruelaSombra, inner: DERIVED.ciruelaInner, edge: DERIVED.ciruelaEdge, ink: palette.crema },
  crema: { top: DERIVED.cremaTop, front: palette.crema, side: DERIVED.cremaSide, inner: DERIVED.cremaInner, edge: DERIVED.cremaEdge, ink: palette.ciruela },
  blanco: { top: '#FFFFFF', front: DERIVED.blancoFront, side: DERIVED.blancoSide, inner: DERIVED.blancoInner, edge: DERIVED.blancoEdge, ink: palette.ciruela },
};

export interface Part {
  /** Subpaths in viewBox coordinates. */
  pts: Vec2[][];
  closed: boolean;
  fill?: string;
  stroke?: string;
  sw?: number;
  dash?: string;
  opacity?: number;
  part?: string;
  /** 'blur' is the wide ambient shadow blur, 'blur-s' the tight contact blur (shared page filters). */
  filter?: 'blur' | 'blur-s';
  /** Name of a clip region in `Scene.clips`. */
  clip?: string;
  evenodd?: boolean;
}

export interface LogoFrame {
  /** SVG matrix mapping face-local inches (u right, v down) to the viewBox. */
  matrix: [number, number, number, number, number, number];
  /** Region size in face-local inches. */
  width: number;
  height: number;
}

export interface Scene {
  parts: Part[];
  clips: { name: string; pts: Vec2[] }[];
  logo: LogoFrame | null;
  /** Pixels per inch after fitting. */
  scale: number;
}

export interface BoxOptions {
  style: BoxStyle;
  l: number;
  w: number;
  h: number;
  open: boolean;
  colorway: Colorway;
  branding: Branding;
}

// ───────────────────────── math ─────────────────────────

const C30 = Math.cos(Math.PI / 6);
const DEG = Math.PI / 180;

export function project([x, y, z]: Vec3): Vec2 {
  return [(x - y) * C30, (x + y) * 0.5 - z];
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

// ───────────────────────── colour ─────────────────────────

function hexToRgb(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]: Vec3): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Key light above, toward the front-left (the +y face), a touch toward +x.
const LIGHT = norm([0.25, 0.6, 1]);
const VIEW = norm([1, 1, 1]);
const B_SIDE = dot([1, 0, 0], LIGHT);
const B_FRONT = dot([0, 1, 0], LIGHT);
const B_TOP = dot([0, 0, 1], LIGHT);

/** Four-tone shading: facing decides the tone, inside surfaces sink toward `inner`. */
export function shade(normal: Vec3, pal: Palette, inside = false): string {
  let n = norm(normal);
  if (dot(n, VIEW) < 0) n = mul(n, -1);
  const b = dot(n, LIGHT);
  let c: string;
  if (b <= B_SIDE) c = mix(pal.inner, pal.side, Math.max(0, b / B_SIDE));
  else if (b <= B_FRONT) c = mix(pal.side, pal.front, (b - B_SIDE) / (B_FRONT - B_SIDE));
  else if (b <= B_TOP) c = mix(pal.front, pal.top, (b - B_FRONT) / (B_TOP - B_FRONT));
  else c = mix(pal.top, '#FFFFFF', Math.min(1, (b - B_TOP) * 2));
  return inside ? mix(c, pal.inner, 0.38) : c;
}

// ───────────────────────── scene builder ─────────────────────────

interface Frame {
  o: Vec3;
  u: Vec3;
  v: Vec3;
}
const fp = (F: Frame, s: number, t: number): Vec3 => add(add(F.o, mul(F.u, s)), mul(F.v, t));

type Style = Omit<Part, 'pts' | 'closed'>;

class Builder {
  parts: { pts3: Vec3[][]; closed: boolean; style: Style }[] = [];
  clips: { name: string; pts3: Vec3[] }[] = [];
  logo: { F: Frame; s0: number; t0: number; w: number; h: number } | null = null;
  constructor(public pal: Palette) {}

  poly(pts: Vec3[], style: Style) {
    this.parts.push({ pts3: [pts], closed: true, style });
  }
  multi(subs: Vec3[][], style: Style) {
    this.parts.push({ pts3: subs, closed: true, style });
  }
  line(pts: Vec3[], style: Style) {
    this.parts.push({ pts3: [pts], closed: false, style });
  }
  /**
   * A filled face shaded by its own normal. The edge is tonal (a darker step
   * of the face itself) rather than a drawn outline, so folds read as light.
   */
  face(pts: Vec3[], opts: { part?: string; inside?: boolean; fill?: string; clip?: string } = {}) {
    const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    const fill = opts.fill ?? shade(n, this.pal, opts.inside);
    this.poly(pts, {
      fill,
      stroke: mix(fill, this.pal.edge, 0.55),
      sw: 0.55,
      part: opts.part,
      clip: opts.clip,
    });
    return fill;
  }
  /** Paper-fibre texture over a board face (shared page pattern). */
  fiber(pts: Vec3[], clip?: string) {
    const o = FIBER[this.pal === COLORWAYS.kraft ? 'kraft' : this.pal === COLORWAYS.ciruela ? 'ciruela' : 'light'];
    this.poly(pts, { fill: 'url:fiber', opacity: o, clip });
  }
  /** Soft lighting gradient over a face (shared page gradient). */
  light(pts: Vec3[], grad: 'vshade' | 'front-light' | 'side-light' | 'top-light' | 'inner') {
    this.poly(pts, { fill: `url:${grad}` });
  }
}

/** Fibre strength per board: kraft shows its fibre, printed and bleached boards much less. */
const FIBER = { kraft: 1, ciruela: 0.55, light: 0.4 } as const;

/**
 * Flute line along a cut board edge: a wave running between the two liners,
 * from a to b, swinging ±amp along `across`. Pitch follows the board.
 */
function flute(b: Builder, a: Vec3, c: Vec3, across: Vec3, amp: number, pitch: number, opacity = 0.55) {
  const len = Math.hypot(...sub(c, a));
  const n = Math.max(6, Math.min(160, Math.round(len / pitch) * 2));
  const pts: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(add(add(a, mul(sub(c, a), t)), mul(across, (i % 2 ? 1 : -1) * amp)));
  }
  b.line(pts, { stroke: mix(b.pal.inner, '#000000', 0.15), sw: 0.45, opacity, part: 'flute' });
}

const rect = (F: Frame, s0: number, t0: number, s1: number, t1: number): Vec3[] => [
  fp(F, s0, t0), fp(F, s1, t0), fp(F, s1, t1), fp(F, s0, t1),
];

/** Rounded rectangle sampled on a face plane. */
function roundRect(F: Frame, s0: number, t0: number, s1: number, t1: number, r: number): Vec3[] {
  const rr = Math.min(r, (s1 - s0) / 2, (t1 - t0) / 2);
  const out: Vec3[] = [];
  const corner = (cs: number, ct: number, a0: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = (a0 + (i / 6) * 90) * DEG;
      out.push(fp(F, cs + Math.cos(a) * rr, ct + Math.sin(a) * rr));
    }
  };
  corner(s1 - rr, t0 + rr, 270);
  corner(s1 - rr, t1 - rr, 0);
  corner(s0 + rr, t1 - rr, 90);
  corner(s0 + rr, t0 + rr, 180);
  return out;
}

/** Ellipse arc on a face plane, angles in degrees (0 = +u, 90 = +v). */
function arc(F: Frame, cs: number, ct: number, rs: number, rt: number, a0: number, a1: number, n = 18): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    out.push(fp(F, cs + Math.cos(a) * rs, ct + Math.sin(a) * rt));
  }
  return out;
}

interface Dims {
  x0: number;
  y0: number;
  z0: number;
  L: number;
  W: number;
  H: number;
}
const frontFrame = (d: Dims): Frame => ({ o: [d.x0, d.y0 + d.W, d.z0 + d.H], u: [1, 0, 0], v: [0, 0, -1] });
const sideFrame = (d: Dims): Frame => ({ o: [d.x0 + d.L, d.y0 + d.W, d.z0 + d.H], u: [0, -1, 0], v: [0, 0, -1] });
const topFrame = (d: Dims): Frame => ({ o: [d.x0, d.y0, d.z0 + d.H], u: [1, 0, 0], v: [0, 1, 0] });

// ───────────────────────── primitives ─────────────────────────

function floorShadow(b: Builder, d: Dims, reach: number) {
  const g = reach * 0.35;
  const dx = reach * 0.55;
  const dy = -reach * 0.35;
  const z = d.z0;
  b.poly(
    [
      [d.x0 - g, d.y0 - g, z],
      [d.x0 + d.L + g + dx, d.y0 - g + dy, z],
      [d.x0 + d.L + g + dx, d.y0 + d.W + g + dy, z],
      [d.x0 - g, d.y0 + d.W + g, z],
    ],
    { fill: SHADOW, opacity: 0.17, filter: 'blur', part: 'shadow' },
  );
  // a tight, darker contact line right where the board meets the floor
  const k = reach * 0.04;
  b.poly(
    [
      [d.x0 - k, d.y0 - k, z],
      [d.x0 + d.L + k * 2, d.y0 - k, z],
      [d.x0 + d.L + k * 2, d.y0 + d.W + k, z],
      [d.x0 - k, d.y0 + d.W + k, z],
    ],
    { fill: SHADOW, opacity: 0.42, filter: 'blur-s', part: 'contact-shadow' },
  );
}

/** Highlight along the two lit top edges and the front vertical corner. */
function edgeLights(b: Builder, d: Dims) {
  const hi = mix(b.pal.top, '#FFFFFF', 0.45);
  const { x0, y0, z0, L, W, H } = d;
  b.line([[x0, y0 + W, z0 + H], [x0 + L, y0 + W, z0 + H], [x0 + L, y0, z0 + H]], {
    stroke: hi, sw: 0.9, opacity: 0.75, part: 'edge-light',
  });
  // the rounded front corner catches a little light, fading toward the floor
  b.line([[x0 + L, y0 + W, z0 + H], [x0 + L, y0 + W, z0 + H * 0.35]], { stroke: hi, sw: 0.7, opacity: 0.3 });
}

/** Closed rectangular solid: front, side and top faces with a soft vertical gradient. */
function shell(b: Builder, d: Dims, names = { front: 'front', side: 'side', top: 'top' }, lights = true) {
  const F = frontFrame(d);
  const S = sideFrame(d);
  const T = topFrame(d);
  walls(b, F, S, d.L, d.W, d.H, names);
  const top = rect(T, 0, 0, d.L, d.W);
  b.face(top, { part: names.top });
  b.light(top, 'top-light');
  b.fiber(top);
  if (lights) edgeLights(b, d);
  return { F, S, T };
}

/** Front and end walls with their lighting and fibre. */
function walls(b: Builder, F: Frame, S: Frame, L: number, W: number, H: number, names = { front: 'front', side: 'side' }) {
  const fr = rect(F, 0, 0, L, H);
  b.face(fr, { part: names.front });
  b.light(fr, 'front-light');
  b.light(fr, 'vshade');
  b.fiber(fr);
  const sd = rect(S, 0, 0, W, H);
  b.face(sd, { part: names.side });
  b.light(sd, 'side-light');
  b.light(sd, 'vshade');
  b.fiber(sd);
}

/**
 * Open-top tray with wall thickness t. `inside` paints contents between the
 * back inner walls and the front outer walls (painter's order).
 */
function tray(b: Builder, d: Dims, t: number, inside?: () => void, opts: { rimTone?: string } = {}) {
  const { x0, y0, z0, L, W, H } = d;
  const zi = z0 + t;
  const xi0 = x0 + t, xi1 = x0 + L - t, yi0 = y0 + t, yi1 = y0 + W - t;
  // floor
  const floorPts: Vec3[] = [[xi0, yi0, zi], [xi1, yi0, zi], [xi1, yi1, zi], [xi0, yi1, zi]];
  b.face(floorPts, { part: 'floor', inside: true });
  b.fiber(floorPts);
  // inner back wall (faces +y) and inner left wall (faces +x), darker toward the floor
  const ib: Vec3[] = [[xi1, yi0, z0 + H], [xi0, yi0, z0 + H], [xi0, yi0, zi], [xi1, yi0, zi]];
  b.face([[xi0, yi0, zi], [xi1, yi0, zi], [xi1, yi0, z0 + H], [xi0, yi0, z0 + H]], { part: 'inner-back', inside: true });
  b.light(ib, 'inner');
  b.fiber(ib);
  const il: Vec3[] = [[xi0, yi0, z0 + H], [xi0, yi1, z0 + H], [xi0, yi1, zi], [xi0, yi0, zi]];
  b.face([[xi0, yi0, zi], [xi0, yi1, zi], [xi0, yi1, z0 + H], [xi0, yi0, z0 + H]], { part: 'inner-left', inside: true });
  b.light(il, 'inner');
  b.fiber(il);
  // contact darkening where the floor meets the back walls
  const sw = Math.min(L, W) * 0.12;
  b.poly([[xi0, yi0, zi], [xi1, yi0, zi], [xi1, yi0 + sw, zi], [xi0 + sw, yi0 + sw, zi], [xi0 + sw, yi1, zi], [xi0, yi1, zi]], {
    fill: SHADOW, opacity: 0.14, filter: 'blur',
  });
  inside?.();
  const F = frontFrame(d);
  const S = sideFrame(d);
  walls(b, F, S, L, W, H);
  // rim: the cut board edge, drawn as a ring
  const zt = z0 + H;
  b.multi(
    [
      [[x0, y0, zt], [x0 + L, y0, zt], [x0 + L, y0 + W, zt], [x0, y0 + W, zt]],
      [[xi0, yi0, zt], [xi0, yi1, zt], [xi1, yi1, zt], [xi1, yi0, zt]],
    ],
    { fill: opts.rimTone ?? mix(b.pal.top, '#FFFFFF', 0.2), stroke: mix(b.pal.side, b.pal.edge, 0.5), sw: 0.45, evenodd: true, part: 'rim' },
  );
  // corrugation seen in the cut edge: a flute wave between the two liners
  const m = t / 2;
  const amp = t * 0.26;
  const pitch = Math.max(t * 1.1, Math.max(L, W) / 70);
  flute(b, [x0 + m, y0 + m, zt], [x0 + L - m, y0 + m, zt], [0, 1, 0], amp, pitch, 0.4);
  flute(b, [x0 + m, y0 + m, zt], [x0 + m, y0 + W - m, zt], [1, 0, 0], amp, pitch, 0.4);
  flute(b, [x0 + m, y0 + W - m, zt], [x0 + L - m, y0 + W - m, zt], [0, 1, 0], amp, pitch);
  flute(b, [x0 + L - m, y0 + m, zt], [x0 + L - m, y0 + W - m, zt], [1, 0, 0], amp, pitch);
  edgeLights(b, d);
  return { F, S };
}

/** A flat panel hinged on an edge: origin, along-hinge vector, outward direction. */
function flap(b: Builder, o: Vec3, along: Vec3, dir: Vec3, depth: number, part: string, insideSide: Vec3, chamfer = 0) {
  const len = Math.hypot(...along);
  const ua = mul(along, 1 / len);
  const c = Math.min(chamfer, len / 3, depth / 2);
  const pts: Vec3[] = [
    o,
    add(o, along),
    add(add(o, along), mul(dir, depth - c)),
    add(add(add(o, along), mul(ua, -c)), mul(dir, depth)),
    add(add(o, mul(ua, c)), mul(dir, depth)),
    add(o, mul(dir, depth - c)),
  ];
  const n = cross(along, dir);
  // The inner board side shows when the visible normal agrees with insideSide.
  const vis = dot(n, VIEW) >= 0 ? n : mul(n, -1);
  const inside = dot(vis, insideSide) > 0;
  b.face(pts, { part, inside });
  b.fiber(pts);
  // the free edge is a cut through the board: show its thickness and flutes
  const ud = norm(dir);
  if (dot(ud, VIEW) > 0.05) {
    const th = Math.min(0.24, depth * 0.06);
    const off = mul(norm(insideSide), th);
    const e0 = pts[4], e1 = pts[3];
    b.poly([e0, e1, add(e1, off), add(e0, off)], {
      fill: mix(b.pal.top, '#FFFFFF', 0.15), stroke: mix(b.pal.side, b.pal.edge, 0.5), sw: 0.4, part: 'cut-edge',
    });
    flute(b, add(e0, mul(off, 0.5)), add(e1, mul(off, 0.5)), off, 0.28, Math.max(th * 1.2, len / 60));
  }
}

/** Packing tape: slightly translucent film with a glossy sheen; clear tape tints the board amber. */
function tape(b: Builder, pts: Vec3[], vertical: boolean, lime: boolean) {
  if (lime) {
    b.poly(pts, { fill: vertical ? LIME_SHADE : LIME, opacity: 0.94, stroke: mix(LIME_SHADE, '#3A1D3F', 0.12), sw: 0.4, part: 'tape' });
  } else {
    b.poly(pts, { fill: mix(b.pal.front, '#B8894F', 0.5), opacity: 0.22, stroke: '#FFFFFF', sw: 0.4, part: 'tape' });
  }
  b.poly(pts, { fill: 'url:tape-gloss', opacity: vertical ? 0.55 : 0.85 });
}

/** Zig-zag cut end of a tape strip on a face frame, from s0 to s1 at depth t. */
function tapeTear(F: Frame, s0: number, s1: number, t: number, tooth: number): Vec3[] {
  const n = Math.max(4, Math.round((s1 - s0) / tooth));
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i++) out.push(fp(F, s0 + ((s1 - s0) * i) / n, t + (i % 2 ? tooth * 0.5 : 0)));
  return out;
}

/** Round box maker's certificate stamp printed on a face. */
function bmcStamp(b: Builder, F: Frame, cs: number, ct: number, r: number) {
  const ink = b.pal.ink;
  b.line(arc(F, cs, ct, r, r, 0, 360, 28), { stroke: ink, sw: 0.7, opacity: 0.45, part: 'stamp' });
  b.line(arc(F, cs, ct, r * 0.78, r * 0.78, 0, 360, 24), { stroke: ink, sw: 0.4, opacity: 0.35 });
  for (const k of [-0.32, 0, 0.32]) {
    const half = Math.sqrt(1 - (k / 0.78) ** 2) * r * 0.5;
    b.line([fp(F, cs - half, ct + k * r), fp(F, cs + half, ct + k * r)], { stroke: ink, sw: 0.5, opacity: 0.4 });
  }
}

/** Printed "this side up" arrow pair. */
function upArrows(b: Builder, F: Frame, cs: number, ct: number, size: number) {
  for (const off of [-0.45, 0.45]) {
    const x = cs + off * size;
    const a = size * 0.32;
    b.poly(
      [
        fp(F, x, ct - size * 0.5),
        fp(F, x + a, ct - size * 0.12),
        fp(F, x + a * 0.35, ct - size * 0.12),
        fp(F, x + a * 0.35, ct + size * 0.5),
        fp(F, x - a * 0.35, ct + size * 0.5),
        fp(F, x - a * 0.35, ct - size * 0.12),
        fp(F, x - a, ct - size * 0.12),
      ],
      { fill: b.pal.ink, opacity: 0.55, part: 'mark' },
    );
  }
  b.line([fp(F, cs - size * 0.8, ct + size * 0.68), fp(F, cs + size * 0.8, ct + size * 0.68)], {
    stroke: b.pal.ink, sw: 0.9, opacity: 0.55,
  });
}

/** Horizontal stadium cutout (hand hole) on a face. */
function handHole(b: Builder, F: Frame, cs: number, ct: number, wd: number, ht: number) {
  const r = ht / 2;
  const pts = [...arc(F, cs + wd / 2 - r, ct, r, r, -90, 90, 10), ...arc(F, cs - wd / 2 + r, ct, r, r, 90, 270, 10)];
  b.poly(pts, { fill: mix(b.pal.inner, '#000000', 0.45), stroke: b.pal.edge, sw: 0.6, part: 'hand-hole' });
  // the cut board edge catches light along the lower lip
  b.line(arc(F, cs - wd / 2 + r, ct, r, r, 90, 180, 6).reverse().concat(arc(F, cs + wd / 2 - r, ct, r, r, 0, 90, 6).reverse()), {
    stroke: mix(b.pal.top, '#FFFFFF', 0.3), sw: 0.9, opacity: 0.7,
  });
}

// ───────────────────────── styles ─────────────────────────

interface Ctx {
  b: Builder;
  l: number;
  w: number;
  h: number;
  open: boolean;
  lime: boolean;
  /** Board thickness drawn for this box. */
  t: number;
  branded: boolean;
}

/** Logo region on a front frame, in face-local inches. */
function setLogo(c: Ctx, F: Frame, s0: number, t0: number, w: number, h: number) {
  if (c.branded) c.b.logo = { F, s0, t0, w, h };
}

function rscFlapsOpen(c: Ctx, back: boolean) {
  const { b, l, w, h } = c;
  const fd = w / 2;
  const a = 50 * DEG;
  const g = Math.min(0.15, l * 0.02);
  const sa = Math.sin(a), ca = Math.cos(a);
  if (back) {
    flap(b, [g, 0, h], [l - 2 * g, 0, 0], [0, -sa, ca], fd, 'flap-back', [0, 1, 0]);
    flap(b, [0, w - g, h], [0, -(w - 2 * g), 0], [-sa, 0, ca], fd, 'flap-left', [1, 0, 0]);
  } else {
    flap(b, [l, g, h], [0, w - 2 * g, 0], [sa, 0, ca], fd, 'flap-right', [-1, 0, 0]);
    flap(b, [g, w, h], [l - 2 * g, 0, 0], [0, sa, ca], fd, 'flap-front', [0, -1, 0]);
  }
}

function rscClosedDetails(c: Ctx, F: Frame, S: Frame, T: Frame, withTape = true) {
  const { b, l, w, h } = c;
  // outer flaps meet along the centre of the lid
  b.line([fp(T, 0, w / 2), fp(T, l, w / 2)], { stroke: mix(b.pal.inner, '#000000', 0.2), sw: 1, part: 'seam' });
  // manufacturer's joint near the back corner of the end face
  const j = Math.min(1.25, w * 0.1);
  b.line([fp(S, w - j, 0), fp(S, w - j, h)], { stroke: b.pal.edge, sw: 0.6, opacity: 0.6 });
  if (withTape) {
    const tw = Math.min(2, w * 0.2);
    const drop = Math.min(3, h * 0.28);
    tape(b, [fp(T, 0, w / 2 - tw / 2), fp(T, l, w / 2 - tw / 2), fp(T, l, w / 2 + tw / 2), fp(T, 0, w / 2 + tw / 2)], false, c.lime);
    tape(b, [fp(S, w / 2 + tw / 2, 0), fp(S, w / 2 - tw / 2, 0), ...tapeTear(S, w / 2 - tw / 2, w / 2 + tw / 2, drop, tw / 14)], true, c.lime);
    b.line([fp(T, l * 0.04, w / 2), fp(T, l, w / 2)], { stroke: '#FFFFFF', sw: 0.6, opacity: 0.35 });
  }
  if (h > 5 && l > 8) bmcStamp(b, S, w * 0.22, h * 0.8, Math.min(1.2, h * 0.08, w * 0.1));
  setLogo(c, F, l * 0.12, h * 0.22, l * 0.76, h * 0.56);
}

function drawRsc(c: Ctx, variant: 'rsc' | 'multidepth' | 'wine') {
  const { b, l, w, h } = c;
  const d: Dims = { x0: 0, y0: 0, z0: 0, L: l, W: w, H: h };
  floorShadow(b, d, Math.max(l, w, h) * 0.12);
  const scoreSteps = variant === 'multidepth' ? [1, 2, 3].map((k) => h - k * Math.min(2, h / 4.5)) : [];
  const scores = (F: Frame, span: number, z0: number, opacity: number) => {
    for (const z of scoreSteps) {
      b.line([fp(F, 0, z0 - z), fp(F, span, z0 - z)], {
        stroke: b.pal.ink, sw: 0.8, dash: '3 2.5', opacity, part: 'score-line',
      });
    }
  };
  if (!c.open) {
    const { F, S, T } = shell(b, d);
    scores(F, l, h, 0.4);
    scores(S, w, h, 0.32);
    if (variant === 'multidepth') {
      // perforated corner cuts between the score heights
      for (const z of scoreSteps) {
        b.line([[l, w, z], [l, w, z + 0.5]], { stroke: mix(b.pal.inner, '#000000', 0.4), sw: 1.2 });
      }
    }
    rscClosedDetails(c, F, S, T);
    if (variant === 'wine') upArrows(b, S, w * 0.5, h * 0.25, Math.min(1.6, w * 0.22));
    return;
  }
  rscFlapsOpen(c, true);
  const { F, S } = tray(b, d, c.t, () => {
    if (variant === 'wine') wineDividers(c);
    if (variant === 'multidepth') {
      const IB: Frame = { o: [c.t, c.t, h], u: [1, 0, 0], v: [0, 0, -1] };
      scores(IB, l - 2 * c.t, h, 0.3);
    }
  });
  scores(F, l, h, 0.4);
  scores(S, w, h, 0.32);
  if (variant === 'wine') upArrows(b, S, w * 0.5, h * 0.3, Math.min(1.6, w * 0.22));
  setLogo(c, F, l * 0.12, h * 0.25, l * 0.76, h * 0.55);
  rscFlapsOpen(c, false);
}

function wineDividers(c: Ctx) {
  const { b, l, w, h, t } = c;
  const nx = Math.max(1, Math.round(l / 4));
  const ny = Math.max(1, Math.round(w / 4));
  const cw = (l - 2 * t) / nx;
  const cd = (w - 2 * t) / ny;
  const hd = h * 0.9;
  const dt = Math.max(0.1, t * 0.6);
  const cells: [number, number][] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) cells.push([i, j]);
  cells.sort((a, b2) => a[0] + a[1] - (b2[0] + b2[1]) || a[0] - b2[0]);
  for (const [i, j] of cells) {
    const xa = t + i * cw + (i > 0 ? dt / 2 : 0);
    const xb = t + (i + 1) * cw - (i < nx - 1 ? dt / 2 : 0);
    const ya = t + j * cd + (j > 0 ? dt / 2 : 0);
    const yb = t + (j + 1) * cd - (j < ny - 1 ? dt / 2 : 0);
    const z = t;
    b.face([[xa, ya, z], [xb, ya, z], [xb, yb, z], [xa, yb, z]], {
      part: 'cell', fill: mix(shade([0, 0, 1], b.pal, true), '#000000', 0.25),
    });
    const backTop = j === 0 ? h : hd;
    const leftTop = i === 0 ? h : hd;
    b.face([[xa, ya, z], [xb, ya, z], [xb, ya, backTop], [xa, ya, backTop]], { inside: true });
    b.face([[xa, ya, z], [xa, yb, z], [xa, yb, leftTop], [xa, ya, leftTop]], { inside: true });
    // depth: cells get darker toward the floor
    b.poly([[xa, ya, z], [xb, ya, z], [xb, yb, z], [xa, yb, z]], { fill: SHADOW, opacity: 0.25, filter: 'blur' });
    // the divider edges on the near sides of the cell
    const top = mix(b.pal.top, '#FFFFFF', 0.15);
    if (i < nx - 1) {
      b.poly([[xb, ya - (j > 0 ? dt / 2 : 0), hd], [xb + dt, ya - (j > 0 ? dt / 2 : 0), hd], [xb + dt, yb + dt, hd], [xb, yb + dt, hd]], {
        fill: top, stroke: b.pal.edge, sw: 0.5, part: 'divider',
      });
    }
    if (j < ny - 1) {
      b.poly([[xa - (i > 0 ? dt / 2 : 0), yb, hd], [xb + dt, yb, hd], [xb + dt, yb + dt, hd], [xa - (i > 0 ? dt / 2 : 0), yb + dt, hd]], {
        fill: top, stroke: b.pal.edge, sw: 0.5, part: 'divider',
      });
    }
  }
}

function drawMailer(c: Ctx, easy: boolean) {
  const { b, l, w, h } = c;
  const d: Dims = { x0: 0, y0: 0, z0: 0, L: l, W: w, H: h };
  floorShadow(b, d, Math.max(l, w) * 0.1);
  const lip = Math.min(0.4, h * 0.1);
  if (!c.open) {
    const { F, S, T } = shell(b, d);
    // lid lip on the front and the tapered lid side on the end face
    b.line([fp(F, 0, lip), fp(F, l, lip)], { stroke: b.pal.edge, sw: 0.7, opacity: 0.55, part: 'lid-lip' });
    b.line([fp(S, 0, lip), fp(S, w * 0.86, lip), fp(S, w, 0)], { stroke: b.pal.edge, sw: 0.8, opacity: 0.75, part: 'lid-side' });
    b.line([fp(S, 0, lip + 0.08), fp(S, w * 0.86, lip + 0.08)], { stroke: '#FFFFFF', sw: 0.5, opacity: 0.25 });
    if (!easy) {
      const r = Math.min(0.75, l * 0.06, h * 0.3);
      b.poly(arc(F, l / 2, 0, r, r, 0, 180, 16), {
        fill: mix(b.pal.side, b.pal.inner, 0.6), stroke: b.pal.edge, sw: 0.6, part: 'thumb-notch',
      });
    } else {
      // easy-fold: tuck score across the lid and the locking ear slots on the lid
      b.line([fp(T, 0, w - lip * 2.2), fp(T, l, w - lip * 2.2)], {
        stroke: c.lime ? LIME_SHADE : b.pal.edge, sw: 0.9, dash: '4 3', opacity: 0.9, part: 'fold-line',
      });
      for (const s of [l * 0.2, l * 0.8]) {
        b.poly(roundRect(T, s - l * 0.06, w - lip * 1.2, s + l * 0.06, w - lip * 0.6, 0.15), {
          fill: mix(b.pal.inner, '#000000', 0.2), part: 'lock-slot',
        });
      }
    }
    setLogo(c, F, l * 0.14, lip + (h - lip) * 0.2, l * 0.72, (h - lip) * 0.62);
    return;
  }
  // lid hinged on the back top edge, swung past vertical
  const a = 104 * DEG;
  const dir: Vec3 = [0, Math.cos(a), Math.sin(a)];
  const nIn: Vec3 = [0, Math.sin(a), -Math.cos(a)];
  const hinge = (x: number): Vec3 => [x, 0, h];
  const L = (x: number, v: number, u = 0): Vec3 => add(add(hinge(x), mul(dir, v)), mul(nIn, u));
  const sideDepth = h * 0.92;
  // far lid side flap (x = 0), hidden mostly behind the lid
  b.face([L(0, w * 0.1), L(0, w), L(0, w, sideDepth), L(0, w * 0.86, sideDepth)], { inside: true });
  // lid inner face
  b.face([L(0, 0), L(l, 0), L(l, w), L(0, w)], { part: 'lid-inner', inside: true });
  b.fiber([L(0, 0), L(l, 0), L(l, w), L(0, w)]);
  b.line([L(0, w - lip * 2), L(l, w - lip * 2)], { stroke: b.pal.edge, sw: 0.6, opacity: 0.5 });
  // tuck flap at the lid's far edge, folded toward the viewer
  const phi = 125 * DEG;
  const fdir = add(mul(dir, Math.cos(phi)), mul(nIn, Math.sin(phi)));
  const tuck = h * 0.85;
  const ear = Math.min(0.6, l * 0.05);
  const o = L(0, w);
  const tuckPts: Vec3[] = [
    add(o, [ear, 0, 0]),
    add(o, [l - ear, 0, 0]),
    add(add(o, [l - ear * 0.2, 0, 0]), mul(fdir, tuck * 0.3)),
    add(add(o, [l - ear * 1.8, 0, 0]), mul(fdir, tuck)),
    add(add(o, [ear * 1.8, 0, 0]), mul(fdir, tuck)),
    add(add(o, [ear * 0.2, 0, 0]), mul(fdir, tuck * 0.3)),
  ];
  b.face(tuckPts, { part: 'tuck-flap', inside: true });
  b.line([add(o, [ear, 0, 0]), add(o, [l - ear, 0, 0])], { stroke: c.lime ? LIME_SHADE : b.pal.edge, sw: 0.9, dash: c.lime ? '4 3' : undefined, part: 'fold-line' });
  // near lid side flap (x = l), the dust flap shape
  b.face([L(l, w * 0.1), L(l, w), L(l, w, sideDepth), L(l, w * 0.86, sideDepth)], { part: 'lid-side' });
  const { F } = tray(b, d, c.t * 1.4);
  // rolled double front wall: a second rim line inside the front
  b.line([[c.t * 0.7, w - c.t * 0.7, h], [l - c.t * 0.7, w - c.t * 0.7, h]], { stroke: b.pal.edge, sw: 0.5, opacity: 0.6 });
  setLogo(c, F, l * 0.14, h * 0.2, l * 0.72, h * 0.62);
}

/** Two-piece box: base plus a telescoping lid of depth lidD. */
function drawTwoPiece(c: Ctx, kind: 'file' | 'retail' | 'apparel') {
  const { b, l, w, h } = c;
  const e = Math.max(0.12, Math.max(l, w) * 0.01);
  const lidD = kind === 'file' ? Math.min(2.5, h * 0.25) : kind === 'retail' ? h * 0.36 : h * 0.78;
  const base: Dims = { x0: 0, y0: 0, z0: 0, L: l, W: w, H: kind === 'apparel' ? h - 0.05 : h };
  floorShadow(b, { ...base, x0: -e, y0: -e, L: l + 2 * e, W: w + 2 * e }, Math.max(l, w, h) * 0.11);
  const lift = c.open ? Math.max(h * 0.8, lidD * 2.6) : 0;
  const back = c.open ? w * 0.42 : 0;
  const lid: Dims = { x0: -e, y0: -e - back, z0: h - lidD + e + lift, L: l + 2 * e, W: w + 2 * e, H: lidD };
  const baseDetails = (S: Frame) => {
    if (kind === 'file') {
      const zc = Math.max(lidD + 1, h * 0.38 + lidD * 0.4);
      handHole(b, S, w / 2, zc, Math.min(4, w * 0.36), Math.min(1.1, h * 0.12));
    }
  };

  if (!c.open) {
    const { S } = shell(b, base, undefined, false);
    baseDetails(S);
  } else {
    const { F, S } = tray(b, base, c.t, () => {
      if (kind === 'file') fileFolders(c);
      if (kind === 'retail') tissue(c);
      if (kind === 'apparel') { tissue(c); garment(c); }
    });
    baseDetails(S);
    setLogo(c, F, l * 0.14, h * 0.2, l * 0.72, h * 0.6);
  }

  // lid
  const { F: LF, S: LS, T: LT } = shell(b, lid, { front: c.open ? 'lid-front' : 'front', side: 'lid-side', top: 'lid-top' });
  if (kind === 'file') {
    handHole(b, LS, lid.W / 2, lidD * 0.5, Math.min(3, w * 0.3), Math.min(0.7, lidD * 0.35));
    // printed index label on the lid band
    const lw = Math.min(l * 0.3, 5);
    b.poly(roundRect(LF, lid.L - lw - lid.L * 0.06, lidD * 0.22, lid.L - lid.L * 0.06, lidD * 0.78, 0.2), {
      fill: '#FFFFFF', opacity: 0.55, stroke: b.pal.ink, sw: 0.5, part: 'label',
    });
  }
  if (kind === 'retail') ribbon(c, lid, LF, LS, LT);
  if (kind === 'apparel') {
    const r = Math.min(0.8, lid.W * 0.08, lidD * 0.45);
    b.poly(arc(LS, lid.W / 2, lidD, r * 1.3, r, 180, 360, 16), {
      fill: mix(b.pal.side, b.pal.inner, 0.65), stroke: b.pal.edge, sw: 0.6, part: 'thumb-notch',
    });
  }
  if (!c.open) {
    if (kind === 'apparel') setLogo(c, LF, lid.L * 0.14, lidD * 0.18, lid.L * 0.72, lidD * 0.64);
    else if (kind === 'retail') setLogo(c, frontFrame(base), l * 0.08, lidD + (h - lidD) * 0.16, l * 0.6, (h - lidD) * 0.66);
    else setLogo(c, frontFrame(base), l * 0.14, lidD + (h - lidD) * 0.18, l * 0.72, (h - lidD) * 0.6);
  }
}

function fileFolders(c: Ctx) {
  const { b, l, w, h, t } = c;
  const n = Math.max(3, Math.round(l / 3));
  const colors = ['#F6F1E7', '#E2C7A0', '#F6F1E7', '#5A3360'];
  for (let i = 0; i < n; i++) {
    const x = t + 0.8 + ((l - 2 * t - 1.6) * i) / (n - 1);
    const zTop = h * 0.92;
    const pal: Palette = { ...COLORWAYS.crema, front: colors[i % 4], side: mix(colors[i % 4], '#000000', 0.12), top: mix(colors[i % 4], '#FFFFFF', 0.3) };
    const sideTone = shade([1, 0, 0], pal);
    b.poly([[x, t + 0.3, h * 0.35], [x, w - t - 0.3, h * 0.35], [x, w - t - 0.3, zTop], [x, t + 0.3, zTop]], {
      fill: sideTone, stroke: COLORWAYS.crema.edge, sw: 0.5, part: 'folder',
    });
    // index tab, one in lime as the only accent
    const ts = t + 0.6 + ((w - 2 * t - 3) * ((i * 0.37) % 1));
    b.poly([[x, ts, zTop], [x, ts + 2, zTop], [x, ts + 1.8, zTop + 0.7], [x, ts + 0.2, zTop + 0.7]], {
      fill: i === n - 2 && c.lime ? LIME_SHADE : sideTone, stroke: COLORWAYS.crema.edge, sw: 0.5,
    });
    // hanging rod hook
    b.line([[x, t, zTop - 0.3], [x, w - t, zTop - 0.3]], { stroke: '#7A7A7A', sw: 0.6, opacity: 0.5 });
  }
}

function tissue(c: Ctx) {
  const { b, l, w, h, t } = c;
  const z = t + Math.min(0.4, h * 0.1);
  const T: Frame = { o: [t, t, z], u: [1, 0, 0], v: [0, 1, 0] };
  const L = l - 2 * t, W = w - 2 * t;
  b.poly([fp(T, 0, 0), fp(T, L, 0), fp(T, L, W), fp(T, 0, W)], { fill: '#FFFFFF', opacity: 0.9, stroke: '#E6E0D4', sw: 0.5, part: 'tissue' });
  // folded tissue flaps meeting off-centre
  b.poly([fp(T, 0, 0), fp(T, L * 0.55, W * 0.5), fp(T, 0, W)], { fill: '#F4F1EA', stroke: '#E1DACB', sw: 0.5 });
  b.line([fp(T, L * 0.2, W * 0.2), fp(T, L * 0.35, W * 0.5)], { stroke: '#DDD5C5', sw: 0.5 });
  b.line([fp(T, L * 0.55, W * 0.5), fp(T, L, W * 0.35)], { stroke: '#DDD5C5', sw: 0.5 });
  if (c.lime) {
    // a lime sticker sealing the tissue
    b.poly(arc(T, L * 0.55, W * 0.5, Math.min(0.9, L * 0.06), Math.min(0.9, L * 0.06), 0, 360, 20), { fill: LIME, stroke: LIME_SHADE, sw: 0.5, part: 'seal' });
  }
}

function garment(c: Ctx) {
  const { b, l, w, h, t } = c;
  const th = Math.min(0.6, h * 0.22);
  const z0 = t + Math.min(0.4, h * 0.1);
  const d: Dims = { x0: l * 0.2, y0: w * 0.16, z0, L: l * 0.6, W: w * 0.7, H: th };
  const pal: Palette = b.pal === COLORWAYS.ciruela ? COLORWAYS.crema : { ...COLORWAYS.ciruela, top: '#6B4171', front: '#4A2A50' };
  const gb = new Builder(pal);
  shell(gb, d, { front: 'garment', side: 'garment-side', top: 'garment-top' }, false);
  const T = topFrame(d);
  // collar and placket of a folded shirt
  gb.poly([...arc(T, d.L / 2, 0, d.L * 0.18, d.W * 0.12, 0, 180, 14)], { fill: mix(pal.inner, '#000000', 0.2), stroke: pal.edge, sw: 0.5 });
  gb.poly([fp(T, d.L * 0.32, 0), fp(T, d.L / 2, d.W * 0.16), fp(T, d.L * 0.4, d.W * 0.2)], { fill: pal.front, stroke: pal.edge, sw: 0.5 });
  gb.poly([fp(T, d.L * 0.68, 0), fp(T, d.L / 2, d.W * 0.16), fp(T, d.L * 0.6, d.W * 0.2)], { fill: pal.front, stroke: pal.edge, sw: 0.5 });
  gb.line([fp(T, d.L / 2, d.W * 0.16), fp(T, d.L / 2, d.W * 0.95)], { stroke: pal.edge, sw: 0.5 });
  for (const k of [0.4, 0.6, 0.8]) gb.poly(arc(T, d.L / 2 + 0.25, d.W * k, 0.12, 0.12, 0, 360, 8), { fill: pal.edge });
  gb.line([fp(T, d.L * 0.18, d.W * 0.05), fp(T, d.L * 0.18, d.W)], { stroke: pal.edge, sw: 0.5, opacity: 0.6 });
  gb.line([fp(T, d.L * 0.82, d.W * 0.05), fp(T, d.L * 0.82, d.W)], { stroke: pal.edge, sw: 0.5, opacity: 0.6 });
  b.parts.push(...gb.parts);
}

function ribbon(c: Ctx, lid: Dims, F: Frame, S: Frame, T: Frame) {
  const { b } = c;
  const rw = Math.max(0.5, Math.min(lid.L, lid.W) * 0.07);
  const xs = lid.L * 0.78;
  const ys = lid.W * 0.32;
  const top = c.lime ? LIME : mix(b.pal.ink, '#FFFFFF', 0.1);
  const vert = c.lime ? LIME_SHADE : mix(b.pal.ink, '#000000', 0.1);
  const H = lid.H;
  b.poly([fp(T, xs - rw / 2, 0), fp(T, xs + rw / 2, 0), fp(T, xs + rw / 2, lid.W), fp(T, xs - rw / 2, lid.W)], { fill: top, part: 'ribbon' });
  b.poly([fp(T, 0, ys - rw / 2), fp(T, lid.L, ys - rw / 2), fp(T, lid.L, ys + rw / 2), fp(T, 0, ys + rw / 2)], { fill: top, part: 'ribbon' });
  b.poly([fp(F, xs - rw / 2, 0), fp(F, xs + rw / 2, 0), fp(F, xs + rw / 2, H), fp(F, xs - rw / 2, H)], { fill: vert, part: 'ribbon' });
  const sy = lid.W - ys;
  b.poly([fp(S, sy - rw / 2, 0), fp(S, sy + rw / 2, 0), fp(S, sy + rw / 2, H), fp(S, sy - rw / 2, H)], { fill: mix(vert, '#000000', 0.12), part: 'ribbon' });
  // flat knot where the bands cross, with a soft sheen
  const k = rw * 0.85;
  b.poly(roundRect(T, xs - k, ys - k, xs + k, ys + k, k * 0.4), { fill: mix(top, '#000000', 0.08), stroke: mix(vert, '#000000', 0.15), sw: 0.5, part: 'knot' });
  b.line([fp(T, xs - k * 0.5, ys), fp(T, xs + k * 0.5, ys)], { stroke: '#FFFFFF', sw: 0.6, opacity: 0.5 });
}

function drawSideloader(c: Ctx) {
  const { b, l, w, h, t } = c;
  const d: Dims = { x0: 0, y0: 0, z0: 0, L: l, W: w, H: h };
  floorShadow(b, d, Math.max(l, w) * 0.1);
  const F = frontFrame(d);
  const S = sideFrame(d);
  const T = topFrame(d);
  const lw = Math.min(1.25, w * 0.1);
  if (!c.open) {
    shell(b, d);
    // end closure: major flaps meet on the middle of the end face
    b.line([fp(S, 0, h / 2), fp(S, w, h / 2)], { stroke: mix(b.pal.inner, '#000000', 0.2), sw: 1, part: 'seam' });
    const tw = Math.min(2, h * 0.3);
    tape(b, [fp(S, 0, h / 2 - tw / 2), fp(S, w, h / 2 - tw / 2), fp(S, w, h / 2 + tw / 2), fp(S, 0, h / 2 + tw / 2)], true, c.lime);
    const wrap = Math.min(3, l * 0.12);
    // the strip wraps round the corner onto the front face, ending in a torn edge
    const G: Frame = { o: F.o, u: F.v, v: F.u };
    tape(b, [fp(F, l, h / 2 - tw / 2), fp(F, l, h / 2 + tw / 2), ...tapeTear(G, h / 2 - tw / 2, h / 2 + tw / 2, l - wrap, tw / 14).reverse()], false, c.lime);
    // glued manufacturer's joint along the top
    b.line([fp(T, 0, lw), fp(T, l, lw)], { stroke: b.pal.edge, sw: 0.6, opacity: 0.6 });
    bmcStamp(b, F, l * 0.08, h * 0.72, Math.min(1.1, h * 0.12));
    setLogo(c, F, l * 0.16, h * 0.2, l * 0.62, h * 0.6);
    return;
  }
  // back minor flap, swung open behind the end
  const md = Math.min(w * 0.45, h);
  // minor flaps swung almost flat into the end plane, angled out a little
  const gm = 16 * DEG;
  flap(b, [l, 0, 0.1], [0, 0, h - 0.2], [Math.sin(gm), -Math.cos(gm), 0], md, 'flap-minor-back', [1, 0, 0]);
  shell(b, d, { front: 'front', side: 'side-hidden', top: 'top' });
  b.line([fp(T, 0, lw), fp(T, l, lw)], { stroke: b.pal.edge, sw: 0.6, opacity: 0.6 });
  // the end opening: interior seen through the board frame, clipped to the hole
  const hole = rect(S, t, t, w - t, h - t);
  b.clips.push({ name: 'end', pts3: hole });
  b.poly(hole, { fill: mix(b.pal.inner, '#000000', 0.5), part: 'opening' });
  b.face([[t, t, t], [t, w - t, t], [t, w - t, h - t], [t, t, h - t]], { inside: true, clip: 'end', fill: mix(b.pal.inner, '#000000', 0.35) });
  b.face([[t, t, t], [l, t, t], [l, t, h - t], [t, t, h - t]], { inside: true, clip: 'end' });
  b.face([[t, t, t], [l, t, t], [l, w - t, t], [t, w - t, t]], { inside: true, clip: 'end' });
  b.poly(hole, { fill: 'url:deep', clip: 'end' });
  b.multi([rect(S, 0, 0, w, h), [...hole].reverse()], { fill: mix(b.pal.top, '#FFFFFF', 0.15), stroke: b.pal.edge, sw: 0.6, evenodd: true, part: 'end-frame' });
  // top major flap standing up, bottom major flap lying on the floor
  const bt = 24 * DEG;
  flap(b, [l, 0.1, h], [0, w - 0.2, 0], [Math.sin(bt), 0, Math.cos(bt)], h / 2, 'flap-top', [-1, 0, 0]);
  flap(b, [l, 0.1, 0.02], [0, w - 0.2, 0], [Math.cos(6 * DEG), 0, Math.sin(6 * DEG)], h / 2, 'flap-bottom', [0, 0, 1]);
  flap(b, [l, w, 0.1], [0, 0, h - 0.2], [Math.sin(gm), Math.cos(gm), 0], md, 'flap-minor-front', [1, 0, 0]);
  setLogo(c, F, l * 0.12, h * 0.2, l * 0.62, h * 0.6);
}

// ───────────────────────── entry ─────────────────────────

export function buildBox(opts: BoxOptions): Scene {
  const pal = COLORWAYS[opts.colorway];
  const b = new Builder(pal);
  const l = Math.max(1, opts.l), w = Math.max(1, opts.w), h = Math.max(0.5, opts.h);
  const big = Math.max(l, w, h);
  const base = { rsc: 0.22, multidepth: 0.22, wine: 0.3, mailer: 0.25, easyfold: 0.22, file: 0.2, sideloader: 0.24, retail: 0.28, apparel: 0.16 }[opts.style];
  const c: Ctx = {
    b, l, w, h,
    open: opts.open,
    lime: opts.branding === 'foldwise',
    t: Math.max(base, big * 0.012),
    branded: opts.branding !== 'none',
  };
  switch (opts.style) {
    case 'rsc':
    case 'multidepth':
    case 'wine':
      drawRsc(c, opts.style);
      break;
    case 'mailer':
    case 'easyfold':
      drawMailer(c, opts.style === 'easyfold');
      break;
    case 'file':
    case 'retail':
    case 'apparel':
      drawTwoPiece(c, opts.style);
      break;
    case 'sideloader':
      drawSideloader(c);
      break;
  }
  return fit(b);
}

function fit(b: Builder): Scene {
  const raw = b.parts.map((p) => ({ ...p, pts2: p.pts3.map((s) => s.map(project)) }));
  // Fit on solid geometry; blurred shadows may bleed into the padding.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of raw) {
    if (p.style.filter) continue;
    for (const s of p.pts2) for (const [x, y] of s) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const scale = Math.min((VIEWBOX.w - 2 * PAD) / (maxX - minX), (VIEWBOX.h - 2 * PAD) / (maxY - minY));
  const ox = (VIEWBOX.w - (maxX - minX) * scale) / 2 - minX * scale;
  const oy = (VIEWBOX.h - (maxY - minY) * scale) / 2 - minY * scale;
  // No clamping: solid geometry fits by construction, and the unit test
  // checks the real bounds. Blurred shadows may bleed into the padding.
  const tf = ([x, y]: Vec2): Vec2 => [round(x * scale + ox), round(y * scale + oy)];
  const parts: Part[] = raw.map((p) => ({ ...p.style, pts: p.pts2.map((s) => s.map(tf)), closed: p.closed }));
  const clips = b.clips.map((cl) => ({ name: cl.name, pts: cl.pts3.map(project).map(tf) }));
  let logo: LogoFrame | null = null;
  if (b.logo) {
    const { F, s0, t0, w, h } = b.logo;
    const o = project(fp(F, s0, t0));
    const pu = project(F.u);
    const pv = project(F.v);
    logo = {
      matrix: [pu[0] * scale, pu[1] * scale, pv[0] * scale, pv[1] * scale, round(o[0] * scale + ox), round(o[1] * scale + oy)],
      width: w,
      height: h,
    };
  }
  return { parts, clips, logo, scale };
}

const round = (v: number) => Math.round(v * 100) / 100;

/** Serialises a part's subpaths to an SVG path `d`. */
export function pathD(p: Part): string {
  return p.pts
    .map((s) => s.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + (p.closed ? 'Z' : ''))
    .join('');
}
