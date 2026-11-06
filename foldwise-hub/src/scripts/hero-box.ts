/**
 * Hero mailer box for the shop home: a ciruela-printed mailer whose lid
 * swings open on its back hinge, revealing tissue, a thank-you card that
 * pops up and a candle jar.
 *
 * World units are inches (x along the length, y along the width, z up) and
 * share the camera of ../components/boxes/iso-geometry.ts. `heroStatic()`
 * returns the parts that never move; `heroFrame(p)` returns the lid and the
 * card for an open progress p in [0, 1]. Both run on the server (first paint)
 * and in the browser (animation), so the two always agree.
 */
import { project, shade, mix, COLORWAYS } from '../components/boxes/iso-geometry';

type V3 = [number, number, number];
type V2 = [number, number];

export const L = 14;
export const W = 10;
export const H = 4.4;
const T = 0.28; // wall board
const LT = 0.28; // lid board
const LIP = 1.1; // front lip of the lid
const MAX_LID = 112; // degrees
const ZT = 1.4; // tissue bed height
const CARD = { x0: 1.0, w: 6.0, h: 3.6, y: 2.4, closed: 70, open: -14 };
const SEAL = { x: 4.2, y: 5.3 };
const JAR = { cx: 10.3, cy: 5.6, r: 1.75, z: ZT - 0.3, h: 2.6, capH: 0.55 };

const OUT = COLORWAYS.ciruela;
const IN = COLORWAYS.kraft;
export const LIME = '#C8F25A';
const EDGE_KRAFT = '#D8B48A';
// Tonal edges: a darker step of each board instead of a drawn outline.
const OUT_EDGE = mix(OUT.side, OUT.edge, 0.45);
const IN_EDGE = mix(IN.side, IN.edge, 0.35);
const FLUTE = mix(IN.inner, '#000000', 0.1);
// Shared page materials (../components/boxes/materials.astro).
const FIBER = 'url(#fw-fiber)';
const TISSUE = '#FBF8F1';

const S = 26; // px per projected inch
const PAD = 18;

const DEG = Math.PI / 180;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

// ───────────── lid & card kinematics ─────────────

function lidPt(x: number, dy: number, dz: number, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, dy * c - dz * s, H + dy * s + dz * c];
}

/** Lid angle in degrees for progress p, plus the hover peek (0..1). */
export function lidAngle(p: number, peek = 0): number {
  return Math.max(easeInOut(clamp01(p / 0.6)) * MAX_LID, peek * 14);
}
function cardLean(p: number): number {
  const t = easeOutBack(clamp01((p - 0.5) / 0.5));
  return CARD.closed + (CARD.open - CARD.closed) * t;
}
function cardBase(x: number): V3 {
  return [x, CARD.y, ZT];
}
function cardPt(u: number, v: number, phiDeg: number): V3 {
  const f = phiDeg * DEG;
  const b = cardBase(CARD.x0 + u);
  return [b[0], b[1] + v * Math.sin(f), b[2] + v * Math.cos(f)];
}

// ───────────── projection & fit ─────────────

const raw = (v: V3): V2 => {
  const [x, y] = project(v);
  return [x * S, y * S];
};

const bounds = (() => {
  const pts: V3[] = [];
  for (const x of [0, L]) for (const y of [0, W + LT]) for (const z of [0, H]) pts.push([x, y, z]);
  for (const a of [0, 30, 60, 90, MAX_LID]) {
    for (const x of [0, L]) for (const dy of [0, W + LT]) for (const dz of [LT, LT - LIP]) pts.push(lidPt(x, dy, dz, a * DEG));
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    const [x, y] = raw(p);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
})();

export const VIEW = {
  w: Math.ceil(bounds.maxX - bounds.minX + PAD * 2),
  h: Math.ceil(bounds.maxY - bounds.minY + PAD * 2 + 26), // room for the floor shadow
};
const OX = PAD - bounds.minX;
const OY = PAD - bounds.minY;

const P = (v: V3): V2 => {
  const [x, y] = raw(v);
  return [x + OX, y + OY];
};
const r1 = (n: number) => Math.round(n * 10) / 10;
const dOf = (pts: V3[], closed = true) =>
  pts.map((p, i) => {
    const [x, y] = P(p);
    return `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
  }).join('') + (closed ? 'Z' : '');
const dMulti = (subs: V3[][]) => subs.map((s) => dOf(s)).join('');

/** Corrugation wave in a cut board edge: zig between the liners from a to b. */
function fluteD(a: V3, b: V3, across: V3, amp: number, pitch: number): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(6, Math.round(len / pitch) * 2);
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, k = (i % 2 ? 1 : -1) * amp;
    pts.push([a[0] + (b[0] - a[0]) * t + across[0] * k, a[1] + (b[1] - a[1]) * t + across[1] * k, a[2] + (b[2] - a[2]) * t + across[2] * k]);
  }
  return dOf(pts, false);
}

/** SVG matrix mapping face-local inches (u right, v down) onto the screen. */
function matrixOf(o: V3, u: V3, v: V3): string {
  const [ox, oy] = P(o);
  const pu = project(u);
  const pv = project(v);
  const n = (x: number) => Math.round(x * 1000) / 1000;
  return `matrix(${n(pu[0] * S)} ${n(pu[1] * S)} ${n(pv[0] * S)} ${n(pv[1] * S)} ${n(ox)} ${n(oy)})`;
}

const VIEW_DIR: V3 = [1, 1, 1];
const facing = (n: V3) => n[0] * VIEW_DIR[0] + n[1] * VIEW_DIR[1] + n[2] * VIEW_DIR[2] > 0;

// ───────────── static parts (tray and contents) ─────────────

export interface Shape {
  d: string;
  fill: string;
  stroke?: string;
  sw?: number;
  dash?: string;
  opacity?: number;
}

const rectX = (x: number, y0: number, y1: number, z0: number, z1: number): V3[] => [
  [x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1],
];
const rectY = (y: number, x0: number, x1: number, z0: number, z1: number): V3[] => [
  [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1],
];
const rectZ = (z: number, x0: number, x1: number, y0: number, y1: number): V3[] => [
  [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z],
];
const circle = (cx: number, cy: number, z: number, r: number, a0: number, a1: number, n = 28): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
  }
  return out;
};

/** Seeded wobble so the tissue crumple is the same on server and client. */
const wob = (i: number, k = 1) => Math.sin(i * 12.9898 + 4.1) * 0.5 * k;

function tissueBed(): V3[] {
  const pts: V3[] = [];
  const x0 = T + 0.05, x1 = L - T - 0.05, y0 = T + 0.05, y1 = W - T - 0.05;
  const n = 14;
  for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0, ZT + 0.12 + wob(i, 0.18)]);
  for (let i = 1; i <= n; i++) pts.push([x1, y0 + ((y1 - y0) * i) / n, ZT + 0.1 + wob(i + 20, 0.18)]);
  for (let i = 1; i <= n; i++) pts.push([x1 - ((x1 - x0) * i) / n, y1, ZT + 0.14 + wob(i + 40, 0.2)]);
  for (let i = 1; i < n; i++) pts.push([x0, y1 - ((y1 - y0) * i) / n, ZT + 0.1 + wob(i + 60, 0.18)]);
  return pts;
}
function tissueWall(axis: 'back' | 'left'): V3[] {
  const pts: V3[] = [];
  const n = 9;
  const top = (i: number) => ZT + 1.55 + wob(i + (axis === 'back' ? 80 : 90), 0.7);
  if (axis === 'back') {
    const y = T + 0.04;
    pts.push([T + 0.05, y, ZT]);
    for (let i = 0; i <= n; i++) pts.push([T + 0.05 + ((L - 2 * T - 0.1) * i) / n, y, top(i)]);
    pts.push([L - T - 0.05, y, ZT]);
  } else {
    const x = T + 0.04;
    pts.push([x, W - T - 0.05, ZT]);
    for (let i = 0; i <= n; i++) pts.push([x, W - T - 0.05 - ((W - 2 * T - 0.1) * i) / n, top(i)]);
    pts.push([x, T + 0.05, ZT]);
  }
  return pts;
}

function jarShapes(): Record<string, Shape> {
  const { cx, cy, r, z, h, capH } = JAR;
  const zt = z + h;
  const body: V3[] = [
    ...circle(cx, cy, z, r, -45, 135),
    ...circle(cx, cy, zt, r, 135, 315),
  ];
  const band = (za: number, zb: number): V3[] => [
    ...circle(cx, cy, za, r + 0.01, -45, 135),
    ...circle(cx, cy, zb, r + 0.01, 135, -45),
  ];
  const cr = r + 0.06;
  const cap: V3[] = [...circle(cx, cy, zt, cr, -45, 135), ...circle(cx, cy, zt + capH, cr, 135, 315)];
  const glint: V3[] = [...circle(cx, cy, z + 0.35, r + 0.02, 62, 76, 4), ...circle(cx, cy, zt - 0.2, r + 0.02, 76, 62, 4)];
  return {
    jarShadow: { d: dOf(circle(cx + 0.35, cy - 0.15, ZT + 0.16, r * 1.25, 0, 360)), fill: '#2A1430', opacity: 0.16 },
    jarBody: { d: dOf(body), fill: 'url(#hb-glass)', stroke: '#6E4F31', sw: 0.8 },
    jarLabel: { d: dOf(band(z + 0.75, z + 1.95)), fill: '#F6F1E7', stroke: '#C9A27A', sw: 0.6 },
    jarLabelLine: { d: dOf(circle(cx, cy, z + 1.2, r + 0.02, 5, 85, 10), false), fill: 'none', stroke: '#3A1D3F', sw: 1.4 },
    jarLabelLine2: { d: dOf(circle(cx, cy, z + 1.5, r + 0.02, 15, 75, 10), false), fill: 'none', stroke: '#C9A27A', sw: 1 },
    jarGlint: { d: dOf(glint), fill: '#FFF6E6', opacity: 0.45 },
    jarCap: { d: dOf(cap), fill: 'url(#hb-cap)', stroke: '#160818', sw: 0.8 },
    jarCapTop: { d: dOf(circle(cx, cy, zt + capH, cr, 0, 360)), fill: '#5E3664', stroke: '#160818', sw: 0.8 },
  };
}

export function heroStatic(): Record<string, Shape> {
  const sideFill = shade([1, 0, 0], OUT);
  const frontFill = shade([0, 1, 0], OUT);
  const xi0 = T, xi1 = L - T, yi0 = T, yi1 = W - T;
  const crease = (a: V3, b: V3, c: V3): string => dOf([a, b, c], false);
  return {
    shadow: {
      d: dOf([[-0.6, -0.4, 0], [L + 2.2, -1.2, 0], [L + 2.2, W + 0.2, 0], [-0.4, W + 0.9, 0]]),
      fill: '#2A1430',
      opacity: 0.2,
    },
    contact: { d: dOf(rectZ(0, -0.06, L + 0.14, -0.06, W + 0.08)), fill: '#2A1430', opacity: 0.45 },
    floor: { d: dOf(rectZ(T, xi0, xi1, yi0, yi1)), fill: shade([0, 0, 1], IN, true), stroke: IN_EDGE, sw: 0.5 },
    floorTex: { d: dOf(rectZ(T, xi0, xi1, yi0, yi1)), fill: FIBER },
    innerBack: { d: dOf(rectY(yi0, xi0, xi1, T, H)), fill: shade([0, 1, 0], IN, true), stroke: IN_EDGE, sw: 0.5 },
    innerBackShade: { d: dOf(rectY(yi0, xi0, xi1, T, H)), fill: 'url(#fw-inner)' },
    innerBackTex: { d: dOf(rectY(yi0, xi0, xi1, T, H)), fill: FIBER },
    innerLeft: { d: dOf(rectX(xi0, yi0, yi1, T, H)), fill: shade([1, 0, 0], IN, true), stroke: IN_EDGE, sw: 0.5 },
    innerLeftShade: { d: dOf(rectX(xi0, yi0, yi1, T, H)), fill: 'url(#fw-inner)' },
    innerLeftTex: { d: dOf(rectX(xi0, yi0, yi1, T, H)), fill: FIBER },
    tissueBack: { d: dOf(tissueWall('back')), fill: mix(TISSUE, '#C7B89D', 0.28), stroke: '#D9CDB6', sw: 0.6 },
    tissueLeft: { d: dOf(tissueWall('left')), fill: mix(TISSUE, '#C7B89D', 0.16), stroke: '#D9CDB6', sw: 0.6 },
    tissue: { d: dOf(tissueBed()), fill: TISSUE, stroke: '#DCD1BB', sw: 0.6 },
    tissueCreases: {
      d: [
        crease([1.2, 3.6, ZT + 0.14], [3.8, 4.4, ZT + 0.2], [6.2, 4.1, ZT + 0.14]),
        crease([2.0, 8.6, ZT + 0.14], [5.2, 7.2, ZT + 0.22], [8.4, 8.2, ZT + 0.14]),
        crease([7.4, 2.0, ZT + 0.14], [8.2, 5.0, ZT + 0.2], [7.6, 8.8, ZT + 0.14]),
        crease([12.8, 1.4, ZT + 0.14], [12.2, 3.2, ZT + 0.2], [13.2, 4.6, ZT + 0.14]),
      ].join(''),
      fill: 'none',
      stroke: '#CDBFA4',
      sw: 0.9,
    },
    seal: { d: dOf(circle(SEAL.x, SEAL.y, ZT + 0.24, 0.85, 0, 360)), fill: LIME, stroke: '#A6CE3E', sw: 0.8 },
    sealRing: { d: dOf(circle(SEAL.x, SEAL.y, ZT + 0.24, 0.6, 0, 360)), fill: 'none', stroke: '#3A1D3F', sw: 0.9, dash: '2 2' },
    ...jarShapes(),
    front: { d: dOf(rectY(W, 0, L, 0, H)), fill: frontFill, stroke: OUT_EDGE, sw: 0.6 },
    frontLight: { d: dOf(rectY(W, 0, L, 0, H)), fill: 'url(#fw-front-light)' },
    frontShade: { d: dOf(rectY(W, 0, L, 0, H)), fill: 'url(#hb-vshade)' },
    frontTex: { d: dOf(rectY(W, 0, L, 0, H)), fill: FIBER, opacity: 0.55 },
    side: { d: dOf(rectX(L, 0, W, 0, H)), fill: sideFill, stroke: OUT_EDGE, sw: 0.6 },
    sideLight: { d: dOf(rectX(L, 0, W, 0, H)), fill: 'url(#fw-side-light)' },
    sideShade: { d: dOf(rectX(L, 0, W, 0, H)), fill: 'url(#hb-vshade)' },
    sideTex: { d: dOf(rectX(L, 0, W, 0, H)), fill: FIBER, opacity: 0.55 },
    rim: {
      d: dMulti([rectZ(H, 0, L, 0, W), [...rectZ(H, xi0, xi1, yi0, yi1)].reverse()]),
      fill: EDGE_KRAFT,
      stroke: IN_EDGE,
      sw: 0.5,
    },
    rimFlute: {
      d: [
        fluteD([T / 2, T / 2, H], [L - T / 2, T / 2, H], [0, 1, 0], T * 0.24, 0.32),
        fluteD([T / 2, T / 2, H], [T / 2, W - T / 2, H], [1, 0, 0], T * 0.24, 0.32),
        fluteD([T / 2, W - T / 2, H], [L - T / 2, W - T / 2, H], [0, 1, 0], T * 0.24, 0.32),
        fluteD([L - T / 2, T / 2, H], [L - T / 2, W - T / 2, H], [1, 0, 0], T * 0.24, 0.32),
      ].join(''),
      fill: 'none',
      stroke: FLUTE,
      sw: 0.5,
      opacity: 0.5,
    },
    edgeLight: {
      d: dOf([[0, W, H], [L, W, H], [L, 0, H]], false),
      fill: 'none',
      stroke: mix(OUT.top, '#FFFFFF', 0.35),
      sw: 0.9,
      opacity: 0.6,
    },
    cornerLight: { d: dOf([[L, W, H], [L, W, H * 0.35]], false), fill: 'none', stroke: mix(OUT.top, '#FFFFFF', 0.3), sw: 0.7, opacity: 0.3 },
  };
}

export const STATIC_MATS = {
  front: matrixOf([0, W, H], [1, 0, 0], [0, 0, -1]),
  side: matrixOf([L, W, H], [0, -1, 0], [0, 0, -1]),
  seal: matrixOf([SEAL.x - 0.42, SEAL.y - 0.42, ZT + 0.25], [1, 0, 0], [0, 1, 0]),
};

// ───────────── dynamic parts (lid and card) ─────────────

export interface HeroFrame {
  angle: number;
  /** True while the lid is in front of the tray (angle under 90°). */
  lidFront: boolean;
  /** True while the printed outer face of the lid faces the camera. */
  outer: boolean;
  shapes: Record<string, Shape & { hidden?: boolean }>;
  mats: { lidOuter: string; lidInner: string; lip: string; card: string };
  cardFront: boolean;
}

export function heroFrame(p: number, peek = 0): HeroFrame {
  const angle = lidAngle(p, peek);
  const a = angle * DEG;
  const c = Math.cos(a), s = Math.sin(a);
  const outerN: V3 = [0, -s, c];
  const outer = facing(outerN);
  const lp = (x: number, dy: number, dz: number) => lidPt(x, dy, dz, a);

  const profile: [number, number][] = [[0, 0], [0, LT], [W + LT, LT], [W + LT, LT - LIP], [W, LT - LIP], [W, 0]];
  const lipBottomN: V3 = [0, s, -c];

  const phi = cardLean(p);
  const f = phi * DEG;
  const cardN: V3 = [0, Math.cos(f), -Math.sin(f)];
  const cardFront = facing(cardN);
  const card: V3[] = [cardPt(0, 0, phi), cardPt(CARD.w, 0, phi), cardPt(CARD.w, CARD.h, phi), cardPt(0, CARD.h, phi)];
  const up: V3 = [0, Math.sin(f), Math.cos(f)];

  const shapes: HeroFrame['shapes'] = {
    lidOuter: {
      d: dOf([lp(0, 0, LT), lp(L, 0, LT), lp(L, W + LT, LT), lp(0, W + LT, LT)]),
      fill: shade(outerN, OUT),
      stroke: OUT_EDGE,
      sw: 0.6,
      hidden: !outer,
    },
    lidOuterTex: {
      d: dOf([lp(0, 0, LT), lp(L, 0, LT), lp(L, W + LT, LT), lp(0, W + LT, LT)]),
      fill: FIBER,
      opacity: 0.55,
      hidden: !outer,
    },
    lidOuterShade: {
      d: dOf([lp(0, 0, LT), lp(L, 0, LT), lp(L, W + LT, LT), lp(0, W + LT, LT)]),
      fill: 'url(#hb-lidshade)',
      hidden: !outer,
    },
    lidInner: {
      d: dOf([lp(0, 0, 0), lp(L, 0, 0), lp(L, W, 0), lp(0, W, 0)]),
      fill: shade([0, s, -c], IN, true),
      stroke: IN_EDGE,
      sw: 0.5,
      hidden: outer,
    },
    lidInnerTex: {
      d: dOf([lp(0, 0, 0), lp(L, 0, 0), lp(L, W, 0), lp(0, W, 0)]),
      fill: FIBER,
      hidden: outer,
    },
    lidInnerShade: {
      d: dOf([lp(0, 0, 0), lp(L, 0, 0), lp(L, W, 0), lp(0, W, 0)]),
      fill: 'url(#fw-top-light)',
      hidden: outer,
    },
    lipBottom: {
      d: dOf([lp(0, W, LT - LIP), lp(L, W, LT - LIP), lp(L, W + LT, LT - LIP), lp(0, W + LT, LT - LIP)]),
      fill: EDGE_KRAFT,
      stroke: IN_EDGE,
      sw: 0.45,
      hidden: !facing(lipBottomN),
    },
    lip: {
      d: dOf([lp(0, W + LT, LT), lp(L, W + LT, LT), lp(L, W + LT, LT - LIP), lp(0, W + LT, LT - LIP)]),
      fill: shade([0, c, s], OUT),
      stroke: OUT_EDGE,
      sw: 0.6,
    },
    lidSide: {
      d: dOf(profile.map(([dy, dz]) => lp(L, dy, dz))),
      fill: EDGE_KRAFT,
      stroke: IN_EDGE,
      sw: 0.5,
    },
    // the lid's cut end: flutes along the panel, then down the front lip
    lidFlute: {
      d:
        fluteD(lp(L, 0.05, LT / 2), lp(L, W + LT / 2, LT / 2), [0, -s, c], LT * 0.24, 0.32) +
        fluteD(lp(L, W + LT / 2, LT / 2), lp(L, W + LT / 2, LT - LIP + 0.05), [0, c, s], LT * 0.24, 0.32).replace(/^M/, 'L'),
      fill: 'none',
      stroke: FLUTE,
      sw: 0.5,
      opacity: 0.5,
    },
    lidEdge: {
      d: dOf([lp(0, W + LT, LT), lp(L, W + LT, LT), lp(L, 0, LT)], false),
      fill: 'none',
      stroke: mix(OUT.top, '#FFFFFF', 0.4),
      sw: 1,
      opacity: 0.75,
      hidden: !outer,
    },
    hingeFold: {
      d: dOf([lp(0.6, 1.0, LT), lp(L - 0.6, 1.0, LT)], false),
      fill: 'none',
      stroke: LIME,
      sw: 1.6,
      dash: '5 4',
      hidden: !outer,
    },
    cardBack: { d: dOf(card), fill: '#E2C7A0', stroke: '#C4A47E', sw: 0.5, hidden: cardFront },
    cardFace: { d: dOf(card), fill: '#FBF8F1', stroke: '#E2D7C1', sw: 0.5, hidden: !cardFront },
    cardShadow: {
      d: dOf([cardPt(0.2, 0, phi), cardPt(CARD.w + 0.4, 0, phi), [CARD.x0 + CARD.w + 0.9, CARD.y + 1.1, ZT + 0.16], [CARD.x0 + 0.5, CARD.y + 1.1, ZT + 0.16]]),
      fill: '#2A1430',
      opacity: cardFront ? 0.12 : 0,
    },
  };

  const mats = {
    lidOuter: matrixOf(lp(0, 0, LT), [1, 0, 0], [0, c, s]),
    lidInner: matrixOf(lp(0, W, 0), [1, 0, 0], [0, -c, -s]),
    lip: matrixOf(lp(0, W + LT, LT), [1, 0, 0], [0, s, -c]),
    card: matrixOf(cardPt(0, CARD.h, phi), [1, 0, 0], [-up[0], -up[1], -up[2]]),
  };

  return { angle, lidFront: angle < 90, outer, shapes, mats, cardFront };
}

export const HERO_DIMS = { L, W, H, LT, LIP, card: CARD };

// ───────────── browser runtime ─────────────

const OPEN_SECONDS = 1.7;

/**
 * Wires a `[data-hero-box]` button: it opens once when scrolled into view,
 * toggles on click (or Enter/Space), peeks on hover and celebrates when open.
 * Under reduced motion it renders open and every change is instant.
 */
export function mountHeroBox(root: HTMLElement): void {
  const svg = root.querySelector('svg');
  if (!svg) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = new Map<string, SVGElement>();
  svg.querySelectorAll<SVGElement>('[data-k]').forEach((el) => els.set(el.dataset.k as string, el));
  const lid = svg.querySelector<SVGGElement>('[data-lid]');
  const slotBack = svg.querySelector<SVGGElement>('[data-slot="back"]');
  const slotFront = svg.querySelector<SVGGElement>('[data-slot="front"]');
  const mats = new Map<string, SVGGElement>();
  svg.querySelectorAll<SVGGElement>('[data-mat]').forEach((el) => mats.set(el.dataset.mat as string, el));
  const hint = root.closest('[data-hero-scope]')?.querySelector<HTMLElement>('[data-hero-hint]') ?? null;

  let p = 0;
  let target = 0;
  let peek = 0;
  let peekTarget = 0;
  let raf = 0;
  let last = 0;
  let userTouched = false;

  const fmt = (v: number) => (v >= 1 ? '1' : v <= 0 ? '0' : v.toFixed(2));

  function render() {
    const fr = heroFrame(p, peek);
    for (const [k, sh] of Object.entries(fr.shapes)) {
      const el = els.get(k);
      if (!el) continue;
      el.setAttribute('d', sh.d);
      el.setAttribute('fill', sh.fill);
      if (sh.opacity !== undefined) el.setAttribute('opacity', String(sh.opacity));
      el.style.display = sh.hidden ? 'none' : '';
    }
    const show = (k: string, on: boolean, m: string) => {
      const g = mats.get(k);
      if (!g) return;
      g.setAttribute('transform', m);
      g.style.display = on ? '' : 'none';
    };
    show('lidOuter', fr.outer, fr.mats.lidOuter);
    show('lidInner', !fr.outer, fr.mats.lidInner);
    show('lip', true, fr.mats.lip);
    show('card', fr.cardFront, fr.mats.card);
    const slot = fr.lidFront ? slotFront : slotBack;
    if (lid && slot && lid.parentNode !== slot) slot.appendChild(lid);
    root.dataset.progress = fmt(p);
  }

  function setOpen(open: boolean) {
    target = open ? 1 : 0;
    root.dataset.open = open ? 'true' : 'false';
    root.setAttribute('aria-pressed', open ? 'true' : 'false');
    if (hint) hint.textContent = open ? 'Toca la caja para cerrarla' : 'Toca la caja para abrirla';
    if (!open) root.dataset.celebrate = 'false';
    if (reduce) {
      p = target;
      render();
      return;
    }
    kick();
  }

  function step(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const dir = Math.sign(target - p);
    if (dir !== 0) {
      p += (dir * dt) / OPEN_SECONDS;
      if ((dir > 0 && p >= target) || (dir < 0 && p <= target)) {
        p = target;
        if (p === 1) root.dataset.celebrate = 'true';
      }
    }
    peek += (peekTarget - peek) * (1 - Math.exp(-dt * 9));
    if (Math.abs(peekTarget - peek) < 0.002) peek = peekTarget;
    render();
    raf = p !== target || peek !== peekTarget ? requestAnimationFrame(step) : 0;
  }
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(step);
  }

  root.addEventListener('click', () => {
    userTouched = true;
    setOpen(root.dataset.open !== 'true');
  });

  if (reduce) {
    root.dataset.motion = 'static';
    setOpen(true);
    return;
  }
  root.dataset.motion = 'animated';
  root.addEventListener('pointerenter', () => {
    peekTarget = 1;
    kick();
  });
  root.addEventListener('pointerleave', () => {
    peekTarget = 0;
    kick();
  });

  // Open once, the first time the box is properly seen.
  const inView = () => {
    const r = root.getBoundingClientRect();
    const vh = window.innerHeight;
    return r.height > 0 && r.bottom > vh * 0.2 && r.top < vh * 0.8;
  };
  let timer = 0;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        window.clearTimeout(timer);
        if (!e.isIntersecting || userTouched) continue;
        timer = window.setTimeout(() => {
          if (userTouched || !inView()) return;
          io.disconnect();
          setOpen(true);
        }, 650);
      }
    },
    { threshold: [0, 0.5] },
  );
  io.observe(root);
}
