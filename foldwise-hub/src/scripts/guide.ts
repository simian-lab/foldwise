/**
 * Assembly-guide figure: a corrugated box that folds itself, step by step,
 * on a cutting mat.
 *
 * World units are inches (x along the length, y along the width, z up) and
 * share the camera of ../components/boxes/iso-geometry.ts (`project`, `shade`).
 * Each box kind is a set of panels hinged to each other (mailers) or a tube
 * with flaps (shipping box); a pose is a set of fold angles. `buildFrame`
 * turns any parameter set into painter-ordered SVG paths, so the server draws
 * the first paint and the browser tweens between poses with the same code.
 *
 * Painter's order is solved per frame: overlapping faces are ordered by
 * which side of each other's plane they sit (Newell's test), with depth as the
 * tie-break, because folding flaps defeat a plain centroid sort.
 */
import { project, shade, mix, COLORWAYS, type Palette } from '../components/boxes/iso-geometry';
import type { GuideKind } from '../data/guides';

type V3 = [number, number, number];
type V2 = [number, number];
export type Params = Record<string, number>;
export interface Dims {
  l: number;
  w: number;
  h: number;
}

export const LIME = '#C8F25A';
const BOARD = COLORWAYS.kraft;
const ITEM = COLORWAYS.crema;
const TAPE: Palette = { top: '#DDF88F', front: LIME, side: '#A6CE3E', inner: '#93B734', edge: '#7E9C2C', ink: '#3A1D3F' };
const CIRUELA = '#3A1D3F';
const DEG = Math.PI / 180;
const T = 0.15; // roll allowance, same as the dieline

// ───────────── vector math ─────────────

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const VIEW: V3 = norm([1, 1, 1]);
const UP: V3 = [0, 0, 1];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Rigid transform: 3×3 rotation (row-major) plus translation. */
interface Mat {
  r: number[];
  t: V3;
}
const ID: Mat = { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
const rotV = (r: number[], p: V3): V3 => [
  r[0] * p[0] + r[1] * p[1] + r[2] * p[2],
  r[3] * p[0] + r[4] * p[1] + r[5] * p[2],
  r[6] * p[0] + r[7] * p[1] + r[8] * p[2],
];
const apply = (m: Mat, p: V3): V3 => add(rotV(m.r, p), m.t);
function compose(a: Mat, b: Mat): Mat {
  const r: number[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r.push(a.r[i * 3] * b.r[j] + a.r[i * 3 + 1] * b.r[3 + j] + a.r[i * 3 + 2] * b.r[6 + j]);
  return { r, t: add(rotV(a.r, b.t), a.t) };
}
/** Rotation by `deg` about the line through `o` along unit `a` (Rodrigues). */
function rotAbout(o: V3, a: V3, deg: number): Mat {
  const th = deg * DEG, c = Math.cos(th), s = Math.sin(th), k = 1 - c;
  const [x, y, z] = a;
  const r = [
    c + x * x * k, x * y * k - z * s, x * z * k + y * s,
    y * x * k + z * s, c + y * y * k, y * z * k - x * s,
    z * x * k - y * s, z * y * k + x * s, c + z * z * k,
  ];
  return { r, t: sub(o, rotV(r, o)) };
}

// ───────────── faces ─────────────

type Tone = 'board' | 'item' | 'tape' | 'label';
interface Poly {
  id: string;
  pts: V3[];
  /** Outside normal (printed side for board). */
  out: V3;
  tone: Tone;
  hinge?: [V3, V3];
  key?: string;
  hidden?: boolean;
  opacity?: number;
}

export interface Face {
  id: string;
  d: string;
  fill: string;
  hidden: boolean;
  opacity?: number;
  hinge?: string;
  active?: boolean;
  /** Board faces carry the shared paper-fibre texture. */
  tex?: boolean;
}

export interface GuideFrame {
  faces: Face[];
  shadow: string;
  shadowOpacity: number;
  /** Tight contact shadow right under the board (its footprint on the mat). */
  contact: string;
  contactOpacity: number;
}

// ───────────── hinge chains (mailers) ─────────────

interface PanelDef {
  id: string;
  poly: V2[];
  parent?: string;
  /** Hinge segment in the flat blank, on the parent's edge. */
  hinge?: [V2, V2];
  key?: string;
  /** Multiplier on the key's angle (roll-overs split 180° over two scores). */
  k?: number;
}

/** Positive angles always fold a panel toward the blank's top face, which is the inside of the box. */
function chain(defs: PanelDef[], p: Params, root: Mat = ID): Poly[] {
  const mats = new Map<string, Mat>();
  const out: Poly[] = [];
  for (const d of defs) {
    const parent = d.parent ? mats.get(d.parent)! : root;
    let local = ID;
    let hinge: [V3, V3] | undefined;
    if (d.hinge) {
      const A: V3 = [d.hinge[0][0], d.hinge[0][1], 0];
      const B: V3 = [d.hinge[1][0], d.hinge[1][1], 0];
      let axis = norm(sub(B, A));
      const c = d.poly.reduce<V3>((s, q) => add(s, [q[0] / d.poly.length, q[1] / d.poly.length, 0]), [0, 0, 0]);
      if (cross(axis, sub(c, A))[2] < 0) axis = mul(axis, -1);
      local = rotAbout(A, axis, (p[d.key ?? ''] ?? 0) * (d.k ?? 1));
      hinge = [apply(parent, A), apply(parent, B)];
    }
    const m = compose(parent, local);
    mats.set(d.id, m);
    out.push({
      id: d.id,
      pts: d.poly.map((q) => apply(m, [q[0], q[1], 0])),
      out: rotV(m.r, [0, 0, -1]),
      tone: 'board',
      hinge,
      key: d.key,
    });
  }
  return out;
}

const rect = (x0: number, y0: number, x1: number, y1: number): V2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const mirrorX = (L: number, pts: V2[]): V2[] => pts.map(([x, y]) => [L - x, y] as V2).reverse();

/** Mirror one side's panels to the other end (x → L − x); parents inside the set are renamed too. */
function mirrorDefs(L: number, defs: PanelDef[], suffix = 'R'): PanelDef[] {
  const own = new Set(defs.map((d) => d.id));
  return defs.map((d) => ({
    ...d,
    id: d.id + suffix,
    parent: d.parent && own.has(d.parent) ? d.parent + suffix : d.parent,
    poly: mirrorX(L, d.poly),
    hinge: d.hinge ? ([[L - d.hinge[1][0], d.hinge[1][1]], [L - d.hinge[0][0], d.hinge[0][1]]] as [V2, V2]) : undefined,
  }));
}

/** An ear: a trapezoid hanging off a wall's end edge x = 0 between y0 and y1, tapering away from the hinge. */
function ear(y0: number, y1: number, len: number, taperAt: 'start' | 'end'): V2[] {
  const tp = len * 0.35;
  return taperAt === 'start'
    ? [[0, y0], [0, y1], [-len, y1], [-len, y0 + tp]]
    : [[0, y0], [0, y1], [-len, y1 - tp], [-len, y0]];
}

function mailerDefs({ l: L, w: W, h: H }: Dims): PanelDef[] {
  const e = Math.min(W * 0.42, H * 1.5);
  const bh = H + 0.03; // back wall a touch taller so the lid rests above the roll edges
  const wl = W - T - 0.08; // lid reaches just inside the double front
  const inset = T + 0.04;
  const ht = Math.max(1.2, H * 0.8);
  const lidEar = Math.max(0.8, H - 0.25);
  const ly0 = -bh, ly1 = -bh - wl;
  const left: PanelDef[] = [
    { id: 'side', parent: 'base', poly: rect(-H, 0, 0, W), hinge: [[0, 0], [0, W]], key: 'sides' },
    { id: 'sideRoll', parent: 'side', poly: rect(-H - T, 0, -H, W), hinge: [[-H, 0], [-H, W]], key: 'sidesIn', k: 0.5 },
    { id: 'sideIn', parent: 'sideRoll', poly: rect(-2 * H + 0.05, 0.1, -H - T, W - 0.1), hinge: [[-H - T, 0.1], [-H - T, W - 0.1]], key: 'sidesIn', k: 0.5 },
    { id: 'frontEar', parent: 'front', poly: ear(W + 0.12, W + H - 0.15, e, 'end'), hinge: [[0, W], [0, W + H]], key: 'ears' },
    { id: 'backEar', parent: 'back', poly: ear(-bh + 0.15, -0.12, e, 'start'), hinge: [[0, -bh], [0, 0]], key: 'ears' },
    {
      id: 'lidEar',
      parent: 'lid',
      poly: [[inset, ly0 - 0.2], [inset - lidEar, ly0 - 0.2 - lidEar * 0.6], [inset - lidEar, ly1 + 0.35], [inset, ly1 + 0.15]],
      hinge: [[inset, ly0], [inset, ly1]],
      key: 'lidEars',
    },
  ];
  return [
    { id: 'base', poly: rect(0, 0, L, W) },
    { id: 'front', parent: 'base', poly: rect(0, W, L, W + H), hinge: [[0, W], [L, W]], key: 'walls' },
    { id: 'frontRoll', parent: 'front', poly: rect(0, W + H, L, W + H + T), hinge: [[0, W + H], [L, W + H]], key: 'frontIn', k: 0.5 },
    { id: 'frontIn', parent: 'frontRoll', poly: rect(0.1, W + H + T, L - 0.1, W + 2 * H - 0.05), hinge: [[0.1, W + H + T], [L - 0.1, W + H + T]], key: 'frontIn', k: 0.5 },
    { id: 'back', parent: 'base', poly: rect(0, -bh, L, 0), hinge: [[0, 0], [L, 0]], key: 'walls' },
    { id: 'lid', parent: 'back', poly: rect(inset, ly1, L - inset, ly0), hinge: [[inset, ly0], [L - inset, ly0]], key: 'lid' },
    {
      id: 'tuck',
      parent: 'lid',
      poly: [[inset + 0.15, ly1], [L - inset - 0.15, ly1], [L - inset - 0.15, ly1 - ht + 0.5], [L - inset - 0.65, ly1 - ht], [inset + 0.65, ly1 - ht], [inset + 0.15, ly1 - ht + 0.5]],
      hinge: [[inset + 0.15, ly1], [L - inset - 0.15, ly1]],
      key: 'tuck',
    },
    ...left,
    ...mirrorDefs(L, left),
  ];
}

function easyDefs({ l: L, w: W, h: H }: Dims): PanelDef[] {
  const e = Math.min(W * 0.42, H * 1.4);
  const bh = H + 0.03;
  const wl = W - 0.1;
  const ht = Math.max(1.2, H * 0.85);
  const lip = Math.min(H * 0.7, 1.1);
  const left: PanelDef[] = [
    { id: 'end', parent: 'base', poly: rect(-H, 0, 0, W), hinge: [[0, 0], [0, W]], key: 'ends' },
    {
      id: 'endLip',
      parent: 'end',
      poly: [[-H, 0.2], [-H, W - 0.2], [-H - lip, W - 0.2 - lip * 0.6], [-H - lip, 0.2 + lip * 0.6]],
      hinge: [[-H, 0.2], [-H, W - 0.2]],
      key: 'endLip',
    },
    { id: 'frontEar', parent: 'front', poly: ear(W + 0.12, W + H - 0.15, e, 'end'), hinge: [[0, W], [0, W + H]], key: 'ears' },
    { id: 'backEar', parent: 'back', poly: ear(-bh + 0.15, -0.12, e, 'start'), hinge: [[0, -bh], [0, 0]], key: 'ears' },
  ];
  return [
    { id: 'base', poly: rect(0, 0, L, W) },
    { id: 'front', parent: 'base', poly: rect(0, W, L, W + H), hinge: [[0, W], [L, W]], key: 'walls' },
    { id: 'back', parent: 'base', poly: rect(0, -bh, L, 0), hinge: [[0, 0], [L, 0]], key: 'walls' },
    { id: 'lid', parent: 'back', poly: rect(0, -bh - wl, L, -bh), hinge: [[0, -bh], [L, -bh]], key: 'lid' },
    {
      id: 'tuck',
      parent: 'lid',
      poly: [[0.2, -bh - wl], [L - 0.2, -bh - wl], [L - 0.2, -bh - wl - ht + 0.5], [L - 0.7, -bh - wl - ht], [0.7, -bh - wl - ht], [0.2, -bh - wl - ht + 0.5]],
      hinge: [[0.2, -bh - wl], [L - 0.2, -bh - wl]],
      key: 'tuck',
    },
    ...left,
    ...mirrorDefs(L, left),
  ];
}

// ───────────── shipping box (RSC tube with flaps) ─────────────

function rscPolys({ l, w, h }: Dims, p: Params): Poly[] {
  const f = w / 2;
  const phi = (p.phi ?? 90) * DEG;
  const z0 = 0;
  const u: V3 = [Math.cos(phi), Math.sin(phi), 0];
  const A: V3 = [0, 0, z0];
  const B: V3 = [l, 0, z0];
  const C = add(B, mul(u, w));
  const D = add(A, mul(u, w));
  const corners = [A, B, C, D];
  const names = ['back', 'right', 'front', 'left'];
  const out: Poly[] = [];
  const top = (v: V3) => add(v, [0, 0, h]);
  for (let i = 0; i < 4; i++) {
    const P = corners[i], Q = corners[(i + 1) % 4];
    const along = norm(sub(Q, P));
    const inward: V3 = [-along[1], along[0], 0];
    const outward = mul(inward, -1);
    const major = i % 2 === 0;
    out.push({ id: `wall-${names[i]}`, pts: [P, Q, top(Q), top(P)], out: outward, tone: 'board' });
    const inset = 0.12;
    const Pi = add(P, mul(along, inset)), Qi = add(Q, mul(along, -inset));
    for (const end of ['t', 'b'] as const) {
      const key = `${end}${major ? 'Major' : 'Minor'}`;
      const th = (p[key] ?? 0) * DEG;
      const vert = end === 't' ? UP : mul(UP, -1);
      const dir = add(mul(vert, Math.cos(th)), mul(inward, Math.sin(th)));
      const o = add(mul(outward, Math.cos(th)), mul(vert, Math.sin(th)));
      const a = end === 't' ? top(Pi) : Pi, b = end === 't' ? top(Qi) : Qi;
      out.push({
        id: `flap-${end}-${names[i]}`,
        pts: [a, b, add(b, mul(dir, f)), add(a, mul(dir, f))],
        out: o,
        tone: 'board',
        hinge: [a, b],
        key,
      });
    }
  }
  // tape over a seam and down the visible end; `bottom` tapes the underside
  const tapeOf = (id: string, amount: number, bottom: boolean) => {
    const tp = clamp01(amount);
    const zs = bottom ? z0 - 0.16 : z0 + h + 0.16;
    const ze = bottom ? z0 : z0 + h;
    const sgn = bottom ? 1 : -1;
    const run = tp * (l + 2.2);
    const tw = 1;
    const down = Math.max(0, run - l);
    out.push(
      {
        id: `${id}-seam`,
        pts: [[0, w / 2 - tw, zs], [Math.min(run, l), w / 2 - tw, zs], [Math.min(run, l), w / 2 + tw, zs], [0, w / 2 + tw, zs]],
        out: bottom ? mul(UP, -1) : UP,
        tone: 'tape',
        hidden: tp < 0.01,
      },
      {
        id: `${id}-end`,
        pts: [[l + 0.03, w / 2 - tw, ze], [l + 0.03, w / 2 + tw, ze], [l + 0.03, w / 2 + tw, ze + sgn * down], [l + 0.03, w / 2 - tw, ze + sgn * down]],
        out: [1, 0, 0],
        tone: 'tape',
        hidden: down < 0.05,
      },
    );
  };
  tapeOf('tape', p.tape ?? 0, false);
  tapeOf('tape-bottom', p.bTape ?? 0, true);

  // turn the box over its long axis, then let it rest on whatever touches the mat first
  const flip = rotAbout([0, w / 2, h / 2], [1, 0, 0], (p.flip ?? 0) * 180);
  for (const q of out) {
    q.pts = q.pts.map((v) => apply(flip, v));
    q.out = rotV(flip.r, q.out);
    if (q.hinge) q.hinge = [apply(flip, q.hinge[0]), apply(flip, q.hinge[1])];
  }
  const floor = Math.min(...out.filter((q) => q.tone === 'board').flatMap((q) => q.pts.map((v) => v[2])));
  for (const q of out) {
    q.pts = q.pts.map((v) => [v[0], v[1], v[2] - floor] as V3);
    if (q.hinge) q.hinge = q.hinge.map((v) => [v[0], v[1], v[2] - floor] as V3) as [V3, V3];
  }
  return out;
}

// ───────────── product (a small parcel dropped in) ─────────────

function itemPolys({ l, w, h }: Dims, p: Params, floor: number, kind: GuideKind): Poly[] {
  const s = clamp01(p.item ?? 0);
  const e = 1 - (1 - s) ** 3;
  const big = kind === 'rsc';
  const il = l * (big ? 0.66 : 0.5), iw = w * (big ? 0.64 : 0.46), ih = kind === 'easyfold' ? h * 0.5 : h * (big ? 0.7 : 0.55);
  const x0 = (l - il) / 2 + l * 0.04, y0 = (w - iw) / 2;
  const z0 = floor + 0.05 + (1 - e) * (h * 1.6 + 3);
  const hidden = s < 0.01;
  const opacity = clamp01(s * 4);
  const x1 = x0 + il, y1 = y0 + iw, z1 = z0 + ih;
  const lb = il * 0.32;
  return [
    { id: 'item-front', pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], out: [0, 1, 0], tone: 'item', hidden, opacity },
    { id: 'item-side', pts: [[x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x1, y1, z1]], out: [1, 0, 0], tone: 'item', hidden, opacity },
    { id: 'item-top', pts: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], out: UP, tone: 'item', hidden, opacity },
    // a label band printed across the lid of the parcel
    {
      id: 'item-label',
      pts: [[x0 + il / 2 - lb / 2, y0, z1 + 0.01], [x0 + il / 2 + lb / 2, y0, z1 + 0.01], [x0 + il / 2 + lb / 2, y1, z1 + 0.01], [x0 + il / 2 - lb / 2, y1, z1 + 0.01]],
      out: UP,
      tone: 'label',
      hidden,
      opacity,
    },
  ];
}

// ───────────── kinds and poses ─────────────

interface KindDef {
  keys: string[];
  poses: Record<string, Params>;
  labels: Record<string, string>;
  polys(p: Params, d: Dims): Poly[];
}

const FOLD_LABEL = 'Pliegue';

const KINDS: Record<GuideKind, KindDef> = {
  mailer: {
    keys: ['walls', 'frontIn', 'ears', 'sides', 'sidesIn', 'item', 'lidEars', 'lid', 'tuck'],
    poses: {
      flat: {},
      walls: { walls: 90, frontIn: 180 },
      ears: { walls: 90, frontIn: 180, ears: 91 },
      sides: { walls: 90, frontIn: 180, ears: 91, sides: 90, sidesIn: 180 },
      product: { walls: 90, frontIn: 180, ears: 91, sides: 90, sidesIn: 180, item: 1 },
      closed: { walls: 90, frontIn: 180, ears: 91, sides: 90, sidesIn: 180, item: 1, lidEars: 90, lid: 90, tuck: 90 },
    },
    labels: { walls: 'Paredes', frontIn: 'Frente doble', ears: 'Orejas', sides: 'Laterales', sidesIn: 'Laterales', item: 'Producto', lidEars: 'Solapas', lid: 'Tapa', tuck: 'Cierre' },
    polys: (p, d) => [...chain(mailerDefs(d), p), ...itemPolys(d, p, 0, 'mailer')],
  },
  easyfold: {
    keys: ['walls', 'ears', 'ends', 'endLip', 'item', 'lid', 'tuck'],
    poses: {
      flat: {},
      walls: { walls: 90, ears: 91 },
      ends: { walls: 90, ears: 91, ends: 90, endLip: 90 },
      product: { walls: 90, ears: 91, ends: 90, endLip: 90, item: 1 },
      closed: { walls: 90, ears: 91, ends: 90, endLip: 90, item: 1, lid: 90, tuck: 90 },
    },
    labels: { walls: 'Paredes', ears: 'Orejas', ends: 'Extremos', endLip: 'Traba', item: 'Producto', lid: 'Tapa', tuck: 'Cierre' },
    polys: (p, d) => [...chain(easyDefs(d), p), ...itemPolys(d, p, 0, 'easyfold')],
  },
  rsc: {
    keys: ['phi', 'tMinor', 'tMajor', 'flip', 'bMinor', 'bMajor', 'bTape', 'item', 'tape'],
    poses: {
      kd: { phi: 8 },
      open: { phi: 90, tMinor: -28, tMajor: -28 },
      bottomMinor: { phi: 90, tMinor: -28, tMajor: -28, flip: 1, bMinor: 90 },
      bottomMajor: { phi: 90, tMinor: -28, tMajor: -28, flip: 1, bMinor: 90, bMajor: 89, bTape: 1 },
      product: { phi: 90, tMinor: -28, tMajor: -28, bMinor: 90, bMajor: 89, bTape: 1, item: 1 },
      closed: { phi: 90, tMinor: 90, tMajor: 89, bMinor: 90, bMajor: 89, bTape: 1, item: 1, tape: 1 },
    },
    labels: { phi: 'Escuadra', bMinor: 'Fondo', bMajor: 'Fondo', flip: 'Vuelta', item: 'Producto', tMinor: 'Solapas', tMajor: 'Solapas', tape: 'Cinta', bTape: 'Cinta' },
    polys: (p, d) => [...rscPolys(d, p), ...itemPolys(d, p, 0.05, 'rsc')],
  },
};

export const POSES: Record<GuideKind, Record<string, Params>> = {
  mailer: KINDS.mailer.poses,
  easyfold: KINDS.easyfold.poses,
  rsc: KINDS.rsc.poses,
};

export const KEYS: Record<GuideKind, string[]> = {
  mailer: KINDS.mailer.keys,
  easyfold: KINDS.easyfold.keys,
  rsc: KINDS.rsc.keys,
};

/** Full parameter set of a pose: every key of the kind, zero when unset. */
export function poseParams(kind: GuideKind, pose: string): Params {
  const def = KINDS[kind];
  const src = def.poses[pose];
  if (!src) throw new Error(`Unknown pose "${pose}" for ${kind}`);
  const out: Params = {};
  for (const k of def.keys) out[k] = src[k] ?? 0;
  if (kind === 'rsc' && !('phi' in src)) out.phi = 90;
  return out;
}

/** Readout for the fold that is moving (or last moved). */
export function readout(kind: GuideKind, key: string | undefined, p: Params): string {
  if (!key) return kind === 'rsc' ? 'Caja plegada' : 'Plancha plana';
  const label = KINDS[kind].labels[key] ?? FOLD_LABEL;
  if (key === 'item') return p.item >= 0.99 ? 'Producto adentro' : 'Producto bajando';
  if (key === 'tape') return `Cinta ${Math.round(clamp01(p.tape) * 100)} %`;
  if (key === 'bTape') return `Cinta ${Math.round(clamp01(p.bTape) * 100)} %`;
  if (key === 'flip') return p.flip >= 0.99 ? 'Caja boca abajo' : p.flip <= 0.01 ? 'Caja boca arriba' : 'Dando la vuelta';
  if ((p[key] ?? 0) < 0) return 'Solapas abiertas';
  // poses overshoot a degree or two to clear neighbouring board; show the nominal fold
  const max = Math.max(...Object.values(KINDS[kind].poses).map((q) => q[key] ?? 0));
  const nominal = max > 100 ? 180 : 90;
  const deg = Math.round(((p[key] ?? 0) * nominal) / (max || 1));
  return `${label} ${deg}°`;
}

// ───────────── projection, painter's order, serialisation ─────────────

const r2 = (n: number) => Math.round(n * 100) / 100;
const P2 = (v: V3): V2 => project(v);
const dOf = (pts: V3[]) => pts.map((v, i) => { const [x, y] = P2(v); return `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`; }).join('') + 'Z';

/** Newell normal, robust for slightly non-planar or tiny polygons. */
function normalOf(pts: V3[]): V3 {
  let n: V3 = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    n = add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
  }
  return n;
}

function overlap2(a: V2[], b: V2[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const ax: V2 = [q[1] - p[1], p[0] - q[0]];
      const len = Math.hypot(ax[0], ax[1]);
      if (len < 1e-9) continue;
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const v of a) { const s = (v[0] * ax[0] + v[1] * ax[1]) / len; amin = Math.min(amin, s); amax = Math.max(amax, s); }
      for (const v of b) { const s = (v[0] * ax[0] + v[1] * ax[1]) / len; bmin = Math.min(bmin, s); bmax = Math.max(bmax, s); }
      if (amax - bmin < 0.02 || bmax - amin < 0.02) return false;
    }
  }
  return true;
}

const depth = (pts: V3[]) => pts.reduce((s, v) => s + dot(v, VIEW), 0) / pts.length;

/** -1: a is behind b (draw a first), 1: a in front, 0: unknown. */
function planeOrder(a: Poly, b: Poly): number {
  const eps = 1e-3;
  const side = (pts: V3[], ref: Poly) => {
    let n = normalOf(ref.pts);
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len < 1e-6) return null;
    n = mul(n, 1 / len);
    if (dot(n, VIEW) < 0) n = mul(n, -1);
    if (Math.abs(dot(n, VIEW)) < 1e-4) return null; // edge-on
    const o = ref.pts[0];
    let behind = true, front = true;
    for (const v of pts) {
      const s = dot(sub(v, o), n);
      if (s > eps) behind = false;
      if (s < -eps) front = false;
    }
    return behind && front ? 0 : behind ? -1 : front ? 1 : 0;
  };
  const ab = side(a.pts, b);
  if (ab) return ab;
  const ba = side(b.pts, a);
  if (ba) return -ba;
  return 0;
}

function paintOrder(polys: Poly[]): Poly[] {
  const n = polys.length;
  const scr = polys.map((q) => q.pts.map(P2));
  const dep = polys.map((q) => depth(q.pts));
  const after: number[][] = polys.map(() => []);
  const indeg = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!overlap2(scr[i], scr[j])) continue;
      let o = planeOrder(polys[i], polys[j]);
      if (!o) o = dep[i] <= dep[j] ? -1 : 1;
      const [first, second] = o < 0 ? [i, j] : [j, i];
      after[first].push(second);
      indeg[second]++;
    }
  }
  const done = new Array(n).fill(false);
  const res: Poly[] = [];
  for (let c = 0; c < n; c++) {
    let pick = -1;
    for (let i = 0; i < n; i++) if (!done[i] && indeg[i] === 0 && (pick < 0 || dep[i] < dep[pick])) pick = i;
    if (pick < 0) for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || dep[i] < dep[pick])) pick = i; // cycle: break it by depth
    done[pick] = true;
    res.push(polys[pick]);
    for (const k of after[pick]) indeg[k]--;
  }
  return res;
}

function fillOf(q: Poly): string {
  if (q.tone === 'label') return CIRUELA;
  const pal = q.tone === 'tape' ? TAPE : q.tone === 'item' ? ITEM : BOARD;
  const n = normalOf(q.pts);
  const outside = dot(q.out, VIEW) >= 0;
  // corrugated board: the inner liner is the same kraft, a step darker in shade
  return shade(n, pal, q.tone === 'board' && !outside);
}

/** Convex hull (monotone chain) for the floor shadow. */
function hull(pts: V2[]): V2[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const crossZ = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [];
  for (const v of p) { while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], v) <= 0) lower.pop(); lower.push(v); }
  const upper: V2[] = [];
  for (const v of [...p].reverse()) { while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], v) <= 0) upper.pop(); upper.push(v); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function buildFrame(kind: GuideKind, p: Params, dims: Dims, active: string[] = []): GuideFrame {
  const polys = KINDS[kind].polys(p, dims);
  const visible = polys.filter((q) => !q.hidden);
  const order = paintOrder(visible);
  const faces: Face[] = [];
  const toFace = (q: Poly, hidden: boolean): Face => ({
    id: q.id,
    d: dOf(q.pts),
    fill: fillOf(q),
    hidden,
    opacity: q.opacity,
    hinge: q.hinge ? `M${P2(q.hinge[0]).map(r2).join(' ')}L${P2(q.hinge[1]).map(r2).join(' ')}` : undefined,
    active: !!q.key && active.includes(q.key) && q.hinge !== undefined,
    tex: q.tone === 'board',
  });
  for (const q of order) faces.push(toFace(q, false));
  for (const q of polys) if (q.hidden) faces.push(toFace(q, true));
  // soft floor shadow: the footprint of the board pressed onto the mat
  const floorPts = visible.filter((q) => q.tone === 'board').flatMap((q) => q.pts.map((v) => P2([v[0] + 0.25, v[1] + 0.1, 0])));
  const hp = hull(floorPts);
  const shadow = hp.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`).join('') + 'Z';
  // a blank lying on the mat barely casts; a standing box casts more
  const top = Math.max(0, ...visible.filter((q) => q.tone === 'board').flatMap((q) => q.pts.map((v) => v[2])));
  const shadowOpacity = r2(0.05 + 0.15 * clamp01(top / Math.max(2, dims.h)));
  // contact: only what touches the mat, darker the more board stands on it
  const low = visible.filter((q) => q.tone === 'board').flatMap((q) => q.pts.filter((v) => v[2] < 0.3).map((v) => P2([v[0], v[1], 0])));
  const cp = low.length >= 3 ? hull(low) : hp;
  const contact = cp.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`).join('') + 'Z';
  const contactOpacity = r2(0.12 + 0.28 * clamp01(top / Math.max(2, dims.h)));
  return { faces, shadow, shadowOpacity, contact, contactOpacity };
}

// ───────────── camera ─────────────

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const ASPECT = 1.3;

function rawBounds(kind: GuideKind, p: Params, dims: Dims) {
  const pts = KINDS[kind]
    .polys(p, dims)
    .filter((q) => q.tone === 'board' && !q.hidden)
    .flatMap((q) => q.pts.map(P2));
  const xs = pts.map((v) => v[0]), ys = pts.map((v) => v[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

const widest = new Map<string, number>();
function widestView(kind: GuideKind, dims: Dims): number {
  const k = `${kind}:${dims.l}:${dims.w}:${dims.h}`;
  if (!widest.has(k)) {
    let w = 0;
    for (const pose of Object.keys(KINDS[kind].poses)) {
      const b = rawBounds(kind, poseParams(kind, pose), dims);
      w = Math.max(w, b.x1 - b.x0, (b.y1 - b.y0) * ASPECT);
    }
    widest.set(k, w);
  }
  return widest.get(k)!;
}

/** View box that frames the box in this pose, never zooming in past 60 % of the widest pose. */
export function viewOf(kind: GuideKind, p: Params, dims: Dims): View {
  const b = rawBounds(kind, p, dims);
  const pad = 1.34;
  let w = Math.max(b.x1 - b.x0, (b.y1 - b.y0) * ASPECT) * pad;
  w = Math.max(w, widestView(kind, dims) * pad * 0.6);
  const h = w / ASPECT;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  return { x: r2(cx - w / 2), y: r2(cy - h / 2), w: r2(w), h: r2(h) };
}

// ───────────── cutting mat (static) ─────────────

export interface Mat2D {
  top: string;
  front: string;
  side: string;
  minor: string;
  major: string;
  ticks: string;
}

/** A self-healing cutting mat under the blank: inch grid, majors every 4 in, ruler ticks on the near edges. */
export function matOf(kind: GuideKind, dims: Dims): Mat2D {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const pose of Object.keys(KINDS[kind].poses)) {
    for (const q of KINDS[kind].polys(poseParams(kind, pose), dims)) {
      if (q.tone !== 'board') continue;
      for (const v of q.pts) { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); }
    }
  }
  const m = Math.max(3, (x1 - x0) * 0.12);
  x0 = Math.floor(x0 - m); x1 = Math.ceil(x1 + m); y0 = Math.floor(y0 - m); y1 = Math.ceil(y1 + m);
  const th = 0.4;
  const z = -0.01;
  const poly = (pts: V3[]) => dOf(pts);
  const line = (a: V3, b: V3) => `M${P2(a).map(r2).join(' ')}L${P2(b).map(r2).join(' ')}`;
  let minor = '', major = '', ticks = '';
  for (let x = x0 + 1; x < x1; x++) (x % 4 === 0 ? (s: string) => (major += s) : (s: string) => (minor += s))(line([x, y0 + 0.6, z], [x, y1 - 0.6, z]));
  for (let y = y0 + 1; y < y1; y++) (y % 4 === 0 ? (s: string) => (major += s) : (s: string) => (minor += s))(line([x0 + 0.6, y, z], [x1 - 0.6, y, z]));
  for (let x = x0 + 1; x < x1; x += 0.5) ticks += line([x, y1, z], [x, y1 - (Number.isInteger(x) ? 0.45 : 0.25), z]);
  for (let y = y0 + 1; y < y1; y += 0.5) ticks += line([x1, y, z], [x1 - (Number.isInteger(y) ? 0.45 : 0.25), y, z]);
  return {
    top: poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]),
    front: poly([[x0, y1, z], [x1, y1, z], [x1, y1, z - th], [x0, y1, z - th]]),
    side: poly([[x1, y1, z], [x1, y0, z], [x1, y0, z - th], [x1, y1, z - th]]),
    minor,
    major,
    ticks,
  };
}

export const MAT_COLORS = {
  top: mix('#F6F1E7', '#E2C7A0', 0.38),
  front: mix('#C9A27A', '#E2C7A0', 0.35),
  side: '#C9A27A',
  line: '#A9845E',
};

// ───────────── browser runtime ─────────────

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

interface Track {
  key: string;
  from: number;
  to: number;
  start: number;
  end: number;
}

/**
 * Wires a `[data-guide]` root: step buttons, prev / next, ← → keys, the
 * counter and the progress bar. Each step tweens the fold angles one after the
 * other with eased timing; under reduced motion the figure jumps to the pose.
 */
export function mountGuide(root: HTMLElement): void {
  const fig = root.querySelector<HTMLElement>('[data-guide-figure]');
  const svg = fig?.querySelector<SVGSVGElement>('svg');
  const layer = svg?.querySelector<SVGGElement>('[data-faces]');
  const shadowEl = svg?.querySelector<SVGPathElement>('[data-shadow]');
  const contactEl = svg?.querySelector<SVGPathElement>('[data-shadow-contact]');
  if (!fig || !svg || !layer) return;
  const kind = root.dataset.kind as GuideKind;
  const dims: Dims = JSON.parse(root.dataset.dims ?? '{}');
  const steps = [...root.querySelectorAll<HTMLButtonElement>('[data-guide-step]')];
  const poses = steps.map((b) => b.dataset.pose as string);
  const prev = root.querySelector<HTMLButtonElement>('[data-guide-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-guide-next]');
  const counter = root.querySelector<HTMLElement>('[data-guide-counter]');
  const progress = root.querySelector<HTMLElement>('[data-guide-progress]');
  const bar = root.querySelector<HTMLElement>('[data-guide-bar]');
  const read = root.querySelector<HTMLElement>('[data-guide-readout]');
  const live = root.querySelector<HTMLElement>('[data-guide-live]');
  const reduceQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  const groups = new Map<string, { g: SVGGElement; face: SVGPathElement; tex: SVGPathElement | null; hinge: SVGPathElement | null }>();
  layer.querySelectorAll<SVGGElement>('[data-poly]').forEach((g) => {
    groups.set(g.dataset.poly as string, {
      g,
      face: g.querySelector<SVGPathElement>('[data-face]')!,
      tex: g.querySelector<SVGPathElement>('[data-tex]'),
      hinge: g.querySelector<SVGPathElement>('[data-hinge]'),
    });
  });

  let index = 0;
  let cur = poseParams(kind, poses[0]);
  let active: string[] = [];
  let lastKey: string | undefined;
  let tracks: Track[] = [];
  let t0 = 0;
  let raf = 0;
  let doneTimer = 0;

  function draw() {
    const fr = buildFrame(kind, cur, dims, active);
    let prevG: Element | null = null;
    for (const f of fr.faces) {
      const g = groups.get(f.id);
      if (!g) continue;
      g.face.setAttribute('d', f.d);
      g.face.setAttribute('fill', f.fill);
      if (g.tex) g.tex.setAttribute('d', f.d);
      g.g.style.display = f.hidden ? 'none' : '';
      g.g.style.opacity = f.opacity !== undefined ? String(f.opacity) : '';
      if (g.hinge) {
        if (f.hinge) g.hinge.setAttribute('d', f.hinge);
        g.hinge.classList.toggle('is-active', !!f.active);
      }
      // keep DOM order equal to painter's order, moving only what changed
      const want: ChildNode | null = prevG ? prevG.nextSibling : layer!.firstChild;
      if (want !== g.g) layer!.insertBefore(g.g, want);
      prevG = g.g;
    }
    shadowEl?.setAttribute('d', fr.shadow);
    shadowEl?.setAttribute('opacity', String(fr.shadowOpacity));
    contactEl?.setAttribute('d', fr.contact);
    contactEl?.setAttribute('opacity', String(fr.contactOpacity));
    const v = viewOf(kind, cur, dims);
    svg!.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
    if (read) read.textContent = readout(kind, lastKey, cur);
  }

  function changedKeys(a: string, b: string): string[] {
    const pa = poseParams(kind, a), pb = poseParams(kind, b);
    return KEYS[kind].filter((k) => pa[k] !== pb[k]);
  }

  function settle() {
    fig!.dataset.animating = 'false';
    // at rest the readout names this step's fold, not whichever track ran last
    lastKey = active[active.length - 1];
    if (read) read.textContent = readout(kind, lastKey, cur);
    window.clearTimeout(doneTimer);
    if (index === steps.length - 1) {
      doneTimer = window.setTimeout(() => (fig!.dataset.done = 'true'), reduceQ.matches ? 0 : 120);
    }
  }

  function tick(now: number) {
    const t = (now - t0) / 1000;
    let running = false;
    for (const tr of tracks) {
      const s = clamp01((t - tr.start) / (tr.end - tr.start));
      if (s < 1) running = true;
      if (s > 0) lastKey = tr.key;
      cur[tr.key] = tr.from + (tr.to - tr.from) * easeInOut(s);
    }
    draw();
    if (running) raf = requestAnimationFrame(tick);
    else {
      raf = 0;
      settle();
    }
  }

  function go(i: number) {
    i = Math.max(0, Math.min(steps.length - 1, i));
    const forward = i >= index;
    index = i;
    steps.forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.dataset.state = k < i ? 'done' : k === i ? 'current' : 'todo';
    });
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === steps.length - 1;
    const label = `Paso ${i + 1} de ${steps.length}`;
    if (counter) counter.textContent = label;
    if (progress) progress.setAttribute('aria-valuenow', String(i + 1));
    if (bar) bar.style.transform = `scaleX(${(i + 1) / steps.length})`;
    if (live) live.textContent = `${label}: ${steps[i].querySelector('[data-step-title]')?.textContent ?? ''}`;
    fig!.dataset.pose = poses[i];
    fig!.dataset.done = 'false';
    window.clearTimeout(doneTimer);

    active = i > 0 ? changedKeys(poses[i - 1], poses[i]) : [];
    const target = poseParams(kind, poses[i]);
    const keys = KEYS[kind].filter((k) => Math.abs((cur[k] ?? 0) - target[k]) > 1e-6);
    if (forward === false) keys.reverse();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (!keys.length || reduceQ.matches) {
      cur = target;
      lastKey = active[active.length - 1];
      draw();
      settle();
      return;
    }
    // one key after another, overlapping; long jumps play faster
    const gap = 0.62;
    const unit = Math.min(0.95, 3 / (gap * (keys.length - 1) + 1));
    tracks = keys.map((key, k) => ({ key, from: cur[key] ?? 0, to: target[key], start: k * gap * unit, end: (k * gap + 1) * unit }));
    fig!.dataset.animating = 'true';
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  }

  steps.forEach((b, k) => b.addEventListener('click', () => go(k)));
  prev?.addEventListener('click', () => go(index - 1));
  next?.addEventListener('click', () => go(index + 1));
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
  });

  draw();
  fig.dataset.animating = 'false';
  fig.dataset.ready = 'true';
}
