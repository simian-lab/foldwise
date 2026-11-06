/**
 * Geometry of the true-fold Foldwise logo ("A · Pliegue real").
 *
 * The isotype is read as a real die-cut: one piece of board whose panels are
 * hinged on creases. Coordinates are the isotype's own 46 x 46 grid ("flat"
 * coordinates, x right, y down, z = 0 when the piece lies flat). World space
 * is the same frame: the piece lies on the floor (z up), and the floor panel
 * P3 never moves. Every other panel is a rigid polygon placed by a chain of
 * hinge rotations, so the folding piece is always ONE connected board.
 *
 *   P1  stem y 4..12   tuck lid of the tube (top face)      parent P2, crease y=12
 *   P2  stem y12..19   north wall                           parent P3, crease y=19
 *   P3  stem y19..27   floor (fixed)
 *   P4  stem y27..34   south wall, the printed front         parent P3, crease y=27
 *   P5  stem y34..42   glue flap under the top               parent P4, crease y=34
 *   LF  left crossbar  west end closure                      parent P3, crease x=15
 *   RF  right crossbar east dust flap                        parent P3, crease x=25
 *   TF  top flap       east end lid                          parent P1, crease x=25
 *   TK  top flap tip   the tuck (chamfered tongue)           parent TF, crease x=32
 *
 * The closed box is 10 long (x 15..25), 8 deep (y 19..27) and 7 high. The
 * stem wraps into the tube (P2, P1/P5, P4 around P3), the crossbar flaps and
 * the top flap close its two ends, exactly along the isotype's dashed folds.
 * The right crossbar is 8 wide for a 7-high end, so it closes as a dust flap
 * leaning in until its tip meets the top: hidden behind the lid.
 *
 * The unfolded face (flat side up) is the board's inside, printed solid in
 * the isotype colour; the underside is the box material. Folding up reveals
 * the material: no crossfade anywhere.
 */

export type Vec3 = [number, number, number];
export type Pt = [number, number];

export type PanelId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'LF' | 'RF' | 'TF' | 'TK';

export interface PanelDef {
  id: PanelId;
  /** Outline in flat coordinates, counter-clockwise on screen when flat. */
  poly: Pt[];
  parent: PanelId | null;
  /** Hinge line: a point on the crease and the axis direction (right-hand rule lifts the panel). */
  hinge?: { p: Vec3; d: Vec3 };
  /** Tie-break when two panels end up coplanar: higher draws later. */
  layer: number;
  /** Key-light gradient over the material face, flat coords: lit point to shaded point. */
  light: [number, number, number, number];
}

export const PANELS: PanelDef[] = [
  { id: 'P3', poly: [[15, 19], [25, 19], [25, 27], [15, 27]], parent: null, layer: 0, light: [15, 19, 25, 27] },
  { id: 'P2', poly: [[15, 12], [25, 12], [25, 19], [15, 19]], parent: 'P3', hinge: { p: [15, 19, 0], d: [-1, 0, 0] }, layer: 1, light: [15, 12, 25, 19] },
  { id: 'P1', poly: [[15, 4], [25, 4], [25, 12], [15, 12]], parent: 'P2', hinge: { p: [15, 12, 0], d: [-1, 0, 0] }, layer: 4, light: [15, 12, 25, 4] },
  { id: 'P4', poly: [[15, 27], [25, 27], [25, 34], [15, 34]], parent: 'P3', hinge: { p: [15, 27, 0], d: [1, 0, 0] }, layer: 1, light: [15, 34, 25, 27] },
  { id: 'P5', poly: [[15, 34], [25, 34], [25, 42], [15, 42]], parent: 'P4', hinge: { p: [15, 34, 0], d: [1, 0, 0] }, layer: 2, light: [15, 34, 25, 42] },
  { id: 'LF', poly: [[15, 19], [15, 27], [10, 27], [8, 25], [8, 21], [10, 19]], parent: 'P3', hinge: { p: [15, 19, 0], d: [0, 1, 0] }, layer: 1, light: [8, 19, 15, 27] },
  { id: 'RF', poly: [[25, 19], [31, 19], [33, 21], [33, 25], [31, 27], [25, 27]], parent: 'P3', hinge: { p: [25, 19, 0], d: [0, -1, 0] }, layer: 1, light: [25, 19, 33, 27] },
  { id: 'TF', poly: [[25, 4], [31, 4], [32, 5], [32, 12], [25, 12]], parent: 'P1', hinge: { p: [25, 4, 0], d: [0, -1, 0] }, layer: 5, light: [25, 4, 32, 12] },
  { id: 'TK', poly: [[32, 5], [36, 9], [36, 12], [32, 12]], parent: 'TF', hinge: { p: [32, 4, 0], d: [0, -1, 0] }, layer: 3, light: [32, 5, 36, 12] },
];

export const PANEL = Object.fromEntries(PANELS.map((p) => [p.id, p])) as Record<PanelId, PanelDef>;

/** Box size once closed. */
export const BOX = { x0: 15, x1: 25, y0: 19, y1: 27, h: 7 } as const;

/** Fold angles (degrees) of the closed box. */
export const CLOSED: Record<Exclude<PanelId, 'P3'>, number> = {
  P1: 90,
  P2: 90,
  P4: 90,
  P5: 90,
  LF: 90,
  // 8-wide dust flap on a 7-high end: lean in until the tip touches the top.
  RF: 180 - (Math.asin(7 / 8) * 180) / Math.PI,
  TF: 90,
  TK: 90,
};

export type Angles = Partial<Record<PanelId, number>>;

/** Creases: printed on the inside face, half on each side of the fold. */
export interface CreaseDef {
  a: Pt;
  b: Pt;
  parent: PanelId;
  child: PanelId;
  /** Unit vector in the flat plane, from the crease toward the child panel. */
  toChild: Pt;
  /** The isotype's own dashed folds; the others are the quieter stem scores. */
  brand: boolean;
}

export const CREASES: CreaseDef[] = [
  { a: [25, 4], b: [25, 12], parent: 'P1', child: 'TF', toChild: [1, 0], brand: true },
  { a: [15, 19], b: [15, 27], parent: 'P3', child: 'LF', toChild: [-1, 0], brand: true },
  { a: [25, 19], b: [25, 27], parent: 'P3', child: 'RF', toChild: [1, 0], brand: true },
  { a: [15, 12], b: [25, 12], parent: 'P2', child: 'P1', toChild: [0, -1], brand: false },
  { a: [15, 19], b: [25, 19], parent: 'P3', child: 'P2', toChild: [0, -1], brand: false },
  { a: [15, 27], b: [25, 27], parent: 'P3', child: 'P4', toChild: [0, 1], brand: false },
  { a: [15, 34], b: [25, 34], parent: 'P4', child: 'P5', toChild: [0, 1], brand: false },
  { a: [32, 5], b: [32, 12], parent: 'TF', child: 'TK', toChild: [1, 0], brand: false },
];

/** Cut edges that show once the box is closed: drawn as thin flute strips. */
export interface StripDef {
  id: string;
  panel: PanelId;
  a: Pt;
  b: Pt;
  /** In-plane outward direction (away from the panel), flat coords. */
  out: Pt;
}
export const STRIPS: StripDef[] = [
  { id: 'P1-edge', panel: 'P1', a: [15, 4], b: [25, 4], out: [0, -1] },
  { id: 'TF-edge', panel: 'TF', a: [25, 4], b: [31, 4], out: [0, -1] },
];
export const BOARD = 0.45; // board thickness, grid units

/* ---------------------------------------------------------------- */
/* Vectors and rigid transforms                                      */
/* ---------------------------------------------------------------- */

export const v3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a: Vec3): Vec3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};

/** Rigid transform: p -> R p + t (R row-major 3 x 3). */
export interface Rigid {
  R: number[];
  t: Vec3;
}
const IDENTITY: Rigid = { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };

export function applyR(R: number[], p: Vec3): Vec3 {
  return [R[0] * p[0] + R[1] * p[1] + R[2] * p[2], R[3] * p[0] + R[4] * p[1] + R[5] * p[2], R[6] * p[0] + R[7] * p[1] + R[8] * p[2]];
}
export function apply(T: Rigid, p: Vec3): Vec3 {
  return v3.add(applyR(T.R, p), T.t);
}
function mulR(A: number[], B: number[]): number[] {
  const o = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
  return o;
}
function compose(A: Rigid, B: Rigid): Rigid {
  return { R: mulR(A.R, B.R), t: v3.add(applyR(A.R, B.t), A.t) };
}
/** Rotation by deg about the line through p with direction d (Rodrigues). */
function hingeRot(p: Vec3, d: Vec3, deg: number): Rigid {
  const [x, y, z] = v3.norm(d);
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const C = 1 - c;
  const R = [
    c + x * x * C, x * y * C - z * s, x * z * C + y * s,
    y * x * C + z * s, c + y * y * C, y * z * C - x * s,
    z * x * C - y * s, z * y * C + x * s, c + z * z * C,
  ];
  return { R, t: v3.sub(p, applyR(R, p)) };
}

/** World transform of every panel for the given fold angles and box lift. */
export function pose(angles: Angles, lift = 0): Record<PanelId, Rigid> {
  const out = {} as Record<PanelId, Rigid>;
  const base: Rigid = { R: IDENTITY.R, t: [0, 0, lift] };
  for (const p of PANELS) {
    if (!p.parent || !p.hinge) {
      out[p.id] = base;
      continue;
    }
    out[p.id] = compose(out[p.parent], hingeRot(p.hinge.p, p.hinge.d, angles[p.id] ?? 0));
  }
  return out;
}

export const flat3 = (q: Pt, z = 0): Vec3 => [q[0], q[1], z];

/* ---------------------------------------------------------------- */
/* Camera: top-down at the start, isometric 3/4 at the end           */
/* ---------------------------------------------------------------- */

export const VIEW = 200; // viewBox size
/** The flat start matches the static isotype exactly: 46-grid inset 12 %. */
const S0 = (VIEW * 0.76) / 46;
const CAM0 = { elev: 90, az: 0, scale: S0, target: [23, 23, 0] as Vec3, center: [VIEW / 2, VIEW / 2] as Pt };
const CAM1 = { elev: 31, az: 36, scale: 9.1, target: [20, 23, 3.5] as Vec3, center: [VIEW / 2, VIEW / 2 + 4] as Pt };

export interface Camera {
  r: Vec3;
  u: Vec3;
  /** Toward the viewer. */
  v: Vec3;
  scale: number;
  target: Vec3;
  center: Pt;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function camera(k: number): Camera {
  const e = (lerp(CAM0.elev, CAM1.elev, k) * Math.PI) / 180;
  const f = (lerp(CAM0.az, CAM1.az, k) * Math.PI) / 180;
  const v: Vec3 = [Math.sin(f) * Math.cos(e), Math.cos(f) * Math.cos(e), Math.sin(e)];
  const r: Vec3 = [Math.cos(f), -Math.sin(f), 0];
  const u = v3.cross(r, v);
  return {
    r,
    u,
    v,
    // zoom in log space so the push-in feels even
    scale: Math.exp(lerp(Math.log(CAM0.scale), Math.log(CAM1.scale), k)),
    target: [0, 1, 2].map((i) => lerp(CAM0.target[i], CAM1.target[i], k)) as Vec3,
    center: [lerp(CAM0.center[0], CAM1.center[0], k), lerp(CAM0.center[1], CAM1.center[1], k)],
  };
}

export function project(cam: Camera, p: Vec3): Pt {
  const q = v3.sub(p, cam.target);
  return [cam.center[0] + cam.scale * v3.dot(q, cam.r), cam.center[1] - cam.scale * v3.dot(q, cam.u)];
}
export const depth = (cam: Camera, p: Vec3) => v3.dot(v3.sub(p, cam.target), cam.v);

/** Screen affine of a panel: flat (x, y) -> screen, as SVG matrix(a b c d e f). */
export function affineOf(cam: Camera, T: Rigid): [number, number, number, number, number, number] {
  const o = project(cam, apply(T, [0, 0, 0]));
  const ex = project(cam, apply(T, [1, 0, 0]));
  const ey = project(cam, apply(T, [0, 1, 0]));
  return [ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1], o[0], o[1]];
}

/* ---------------------------------------------------------------- */
/* Painter's order: Newell plane tests on overlapping convex faces    */
/* ---------------------------------------------------------------- */

export interface Face {
  key: string;
  /** World vertices (planar, convex). */
  pts: Vec3[];
  layer: number;
}

function overlap2(a: Pt[], b: Pt[], eps = 0.05): boolean {
  // Separating axis test on two convex polygons; touching counts as apart.
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const nx = q[1] - p[1];
      const ny = p[0] - q[0];
      const len = Math.hypot(nx, ny);
      if (len < 1e-6) continue;
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const s of a) {
        const d = (s[0] * nx + s[1] * ny) / len;
        amin = Math.min(amin, d);
        amax = Math.max(amax, d);
      }
      for (const s of b) {
        const d = (s[0] * nx + s[1] * ny) / len;
        bmin = Math.min(bmin, d);
        bmax = Math.max(bmax, d);
      }
      if (amax <= bmin + eps || bmax <= amin + eps) return false;
    }
  }
  return true;
}

function planeOf(pts: Vec3[]): { n: Vec3; o: Vec3 } | null {
  let n: Vec3 = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    n = v3.add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
  }
  const l = Math.hypot(...n);
  if (l < 1e-9) return null;
  return { n: v3.mul(n, 1 / l), o: pts[0] };
}

/** +1: every vertex of `pts` is on the viewer's side of the plane, -1: all behind, 0: straddles or coplanar. */
function sideOf(pts: Vec3[], pl: { n: Vec3; o: Vec3 }, view: Vec3, eps = 1e-3): number {
  const s = v3.dot(pl.n, view) >= 0 ? 1 : -1;
  let front = 0, back = 0;
  for (const p of pts) {
    const d = v3.dot(v3.sub(p, pl.o), pl.n) * s;
    if (d > eps) front++;
    else if (d < -eps) back++;
  }
  if (front && !back) return 1;
  if (back && !front) return -1;
  if (!front && !back) return 2; // coplanar
  return 0;
}

/** Back-to-front order of the faces for this camera. */
export function paintOrder(cam: Camera, faces: Face[]): string[] {
  const n = faces.length;
  const scr = faces.map((f) => f.pts.map((p) => project(cam, p)));
  const pl = faces.map((f) => planeOf(f.pts));
  const dep = faces.map((f) => f.pts.reduce((s, p) => s + depth(cam, p), 0) / f.pts.length);
  // before[i] = set of j that must be drawn before i
  const before: Set<number>[] = faces.map(() => new Set());
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!overlap2(scr[i], scr[j])) continue;
      let order = 0; // -1: i first, +1: j first
      const pi = pl[i];
      const pj = pl[j];
      const iVsJ = pj ? sideOf(faces[i].pts, pj, cam.v) : 0;
      const jVsI = pi ? sideOf(faces[j].pts, pi, cam.v) : 0;
      if (iVsJ === 2 || jVsI === 2) order = faces[i].layer <= faces[j].layer ? -1 : 1;
      else if (iVsJ === -1 || jVsI === 1) order = -1;
      else if (iVsJ === 1 || jVsI === -1) order = 1;
      else order = dep[i] <= dep[j] ? -1 : 1;
      if (order < 0) before[j].add(i);
      else before[i].add(j);
    }
  }
  // Kahn's sort; a cycle (should not happen) falls back to depth.
  const done = new Array(n).fill(false);
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    let pick = -1;
    for (let i = 0; i < n; i++) {
      if (done[i]) continue;
      let ready = true;
      for (const j of before[i]) if (!done[j]) ready = false;
      if (ready && (pick < 0 || dep[i] < dep[pick])) pick = i;
    }
    if (pick < 0) {
      for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || dep[i] < dep[pick])) pick = i;
    }
    done[pick] = true;
    out.push(faces[pick].key);
  }
  return out;
}

/* ---------------------------------------------------------------- */
/* Shading (same four-tone rule as the box drawings, iso-geometry)   */
/* ---------------------------------------------------------------- */

export interface Tones {
  top: string;
  front: string;
  side: string;
  inner: string;
  edge: string;
}

function hexToRgb(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = (i: number) => Math.round(Math.max(0, Math.min(255, A[i] + (B[i] - A[i]) * t))).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`.toUpperCase();
}

// Key light from the upper left of the final view, as in iso-geometry.
const LIGHT = v3.norm([0.25, 0.6, 1]);
const B_SIDE = v3.dot([1, 0, 0], LIGHT);
const B_FRONT = v3.dot([0, 1, 0], LIGHT);
const B_TOP = v3.dot([0, 0, 1], LIGHT);

/** Tone of a face whose visible side has normal n (facing the viewer). */
export function shade(n: Vec3, t: Tones): string {
  const b = v3.dot(v3.norm(n), LIGHT);
  if (b <= B_SIDE) return mix(t.inner, t.side, Math.max(0, b / B_SIDE));
  if (b <= B_FRONT) return mix(t.side, t.front, (b - B_SIDE) / (B_FRONT - B_SIDE));
  if (b <= B_TOP) return mix(t.front, t.top, (b - B_FRONT) / (B_TOP - B_FRONT));
  return t.top;
}
