/**
 * Foldwise animated logo: the true fold ("Pliegue real").
 *
 * One piece of board, never a crossfade. The flat "f" is a die-cut: each flap
 * turns in 3D on its own dashed crease and the stem wraps into the walls of a
 * small box (geometry in ./fold-geometry.ts). Every frame is computed from
 * the 3D pose: panels are projected with an orthographic camera that eases
 * from top-down (the flat isotype, pixel-exact) to the isometric 3/4 view,
 * and painted back to front with plane tests (Newell) on the overlapping
 * faces. Every free cut edge carries a band of board thickness.
 *
 *   0.0  the dashed folds draw on                    data-state="flat"
 *   0.8  crossbar flaps rise, the stem walls fold,
 *        the top tucks over (pushing the dust flap
 *        in), the end lid closes                      data-state="folding"
 *   3.4  the box is closed: lime tape seals the top
 *        edge, the f prints on the front, a small
 *        settle on its contact shadow                 data-state="box"
 *   5.85 the box unfolds back into the flat f         data-state="folding" -> "flat"
 *
 * Triggers (same contract as the earlier AnimatedLogo):
 *   load  plays on load; with `loop` it repeats (fold, hold, unfold, pause).
 *   hover plays once per hover and returns to the flat f.
 *   view  plays once, the first time it enters the viewport, and returns to
 *         the flat f.
 * Looping logos pause offscreen. Reduced motion builds no timeline and shows
 * the static isotype (data-state="static").
 *
 * Small sizes (data-compact, under COMPACT_BELOW px) drop the detail that
 * cannot read there: no fibre, stem scores, flute lines or printed f, no
 * settle, a shorter hold and a quicker unfold. The fold itself is identical.
 */
import { gsap } from 'gsap';
import {
  PANELS,
  CREASES,
  EDGES,
  TAPE_EDGE,
  CLOSED,
  BOARD,
  pose,
  apply,
  camera,
  project,
  affineOf,
  paintOrder,
  shade,
  mix,
  v3,
  applyR,
  rfPushed,
} from './fold-geometry';
import type { Tones, Vec3, Face, Pt } from './fold-geometry';

export type AnimatedLogoTrigger = 'load' | 'hover' | 'view';
export type AnimatedLogoState = 'static' | 'flat' | 'folding' | 'box';
type Variant = 'crema' | 'ciruela';

/** Below this rendered size (px) the logo runs its compact version. */
export const COMPACT_BELOW = 96;

/** Key times in seconds (of the fold itself; the unfold follows END). */
export const FOLD_TIMES = {
  ready: 0.8, // the flat isotype is complete (folds drawn)
  fold: 0.82,
  box: 3.4,
  end: 5.85,
  compactEnd: 4.45,
} as const;

/** The unfold back runs this much faster than the fold. */
const BACK_SPEED = { full: 1.35, compact: 1.6 } as const;

export interface FoldMaterial {
  outer: Tones;
  inner: Tones;
  /** Dashed creases on the inside face: the isotype's own fold colour. */
  creases: string;
  grain: number;
  shadow: string;
  shadowAlpha: number;
  rim: string;
}

const KRAFT: Tones = { top: '#E2C7A0', front: '#C9A27A', side: '#A9845E', inner: '#8C6B49', edge: '#7E5E3E' };

/**
 * `variant` names the background. Both close into a kraft box (the product)
 * printed with the plum f; only the inside face, the flat f, changes so it
 * matches the static isotype on that background: plum on crema, crema on
 * ciruela.
 */
export const FOLD_MATERIALS: Record<Variant, FoldMaterial> = {
  crema: {
    outer: KRAFT,
    inner: { top: '#3A1D3F', front: '#32193A', side: '#2A1430', inner: '#1D0D21', edge: '#160818' },
    creases: '#C8F25A',
    grain: 0.9,
    shadow: '#2A1430',
    shadowAlpha: 0.42,
    rim: '#FFF8EC',
  },
  ciruela: {
    outer: KRAFT,
    inner: { top: '#F6F1E7', front: '#E9DFCB', side: '#DED2BC', inner: '#C7B89D', edge: '#B3A386' },
    creases: '#3A1D3F',
    grain: 0.9,
    shadow: '#0E0411',
    shadowAlpha: 0.7,
    rim: '#FFF8EC',
  },
};

/**
 * The f printed on the box: plum ink with lime folds (lime reads on plum where
 * a same-colour fold would vanish). The folds are finer than the isotype's
 * so they mark the creases without cutting the crossbars off the stem.
 */
export const PRINT = { ink: '#3A1D3F', folds: '#C8F25A', foldWidth: 1.2, foldDash: '2.2 2' } as const;

/**
 * Placement of the printed f on the front wall (P4: x 15..25, flat y 27 at
 * the floor to 34 at the top), left of the tape, as an SVG matrix in P4's
 * flat coordinates. y is flipped because the outside face is seen mirrored.
 */
export function printMatrix(): string {
  const K = 6 / 38; // the f is 38 tall on its 46 grid: 6 units on a 7-high wall
  const left = 18.25 - (28 * K) / 2; // centred between the wall's edge and the tape
  const top = 33.5;
  return `matrix(${K.toFixed(5)} 0 0 ${(-K).toFixed(5)} ${(left - 8 * K).toFixed(4)} ${(top + 4 * K).toFixed(4)})`;
}

/* ------------------------------------------------------------------ */
/* Fibre grain: one seeded tile, baked once per page                  */
/* ------------------------------------------------------------------ */

let grainUrl: string | null = null;
function grainTile(): string {
  if (grainUrl) return grainUrl;
  const N = 160;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  if (!g) return (grainUrl = '');
  let seed = 7;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // speckle
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const r = rnd();
    const dark = r < 0.5;
    img.data[i * 4] = dark ? 70 : 255;
    img.data[i * 4 + 1] = dark ? 46 : 249;
    img.data[i * 4 + 2] = dark ? 22 : 232;
    img.data[i * 4 + 3] = Math.round(rnd() * (dark ? 34 : 22));
  }
  g.putImageData(img, 0, 0);
  // fine fibres, mostly along the board's machine direction, wrapped
  g.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = rnd() * N;
    const y = rnd() * N;
    const len = 2 + rnd() * 7;
    const a = (rnd() - 0.5) * 0.9;
    const dark = rnd() < 0.6;
    g.strokeStyle = dark ? `rgba(78,52,26,${0.08 + rnd() * 0.14})` : `rgba(255,248,230,${0.07 + rnd() * 0.12})`;
    g.lineWidth = 0.5 + rnd() * 0.6;
    for (const ox of [-N, 0, N])
      for (const oy of [-N, 0, N]) {
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
        g.stroke();
      }
  }
  return (grainUrl = c.toDataURL('image/png'));
}

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

type FoldState = {
  cam: number;
  P1: number;
  P2: number;
  P4: number;
  P5: number;
  LF: number;
  RF: number;
  TF: number;
  TK: number;
  b0: number;
  b1: number;
  b2: number;
  score: number;
  tape: number;
  ink: number;
  lift: number;
};

const ZERO: FoldState = {
  cam: 0, P1: 0, P2: 0, P4: 0, P5: 0, LF: 0, RF: 0, TF: 0, TK: 0,
  b0: 0, b1: 0, b2: 0, score: 0, tape: 0, ink: 0, lift: 0,
};

const f2 = (n: number) => (Math.abs(n) < 1e-9 ? '0' : n.toFixed(3));
const pts = (p: Pt[]) => p.map((q) => `${f2(q[0])},${f2(q[1])}`).join(' ');
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clamp1 = (x: number) => Math.max(-1, Math.min(1, x));

/** Panels that end up inside the closed box. */
const INTERIOR = new Set(['P5', 'RF', 'TK']);

const TAPE = { x0: 21.4, x1: 23.4, topFrom: 8.4, top: 4.4, front: 3.4 } as const;

function createRenderer(el: HTMLElement, mat: FoldMaterial) {
  const svg = el.querySelector<SVGSVGElement>('.alf-scene')!;
  const facesG = svg.querySelector<SVGGElement>('.alf-faces')!;
  const groups = new Map<string, SVGGElement>();
  facesG.querySelectorAll<SVGGElement>('[data-face]').forEach((g) => groups.set(g.dataset.face!, g));
  const grain = svg.querySelector<SVGImageElement>('.alf-grain-img');
  if (grain) grain.setAttribute('href', grainTile());

  const panel = PANELS.map((p) => {
    const g = groups.get(p.id)!;
    return {
      def: p,
      g,
      base: g.querySelector<SVGPolygonElement>('.alf-base')!,
      inner: g.querySelector<SVGGElement>('.alf-in')!,
      outer: g.querySelector<SVGGElement>('.alf-out')!,
      side: '' as '' | 'in' | 'out',
      fill: '',
    };
  });
  const creaseLines = Array.from(svg.querySelectorAll<SVGLineElement>('[data-crease]')).map((ln) => {
    const c = CREASES[Number(ln.dataset.crease)];
    const sgn = ln.dataset.half === 'c' ? 1 : -1;
    const w = Number(ln.dataset.w);
    const off: Pt = [c.toChild[0] * sgn * (w / 2), c.toChild[1] * sgn * (w / 2)];
    return { ln, c, off, idx: Number(ln.dataset.crease) };
  });
  const bands = EDGES.map((e) => {
    const g = groups.get(e.id)!;
    return {
      def: e,
      g,
      band: g.querySelector<SVGPolygonElement>('.alf-strip')!,
      flute: g.querySelector<SVGPolylineElement>('.alf-flute'),
      tape: g.querySelector<SVGPolygonElement>('.alf-tape-strip'),
      // a band shows over a coplanar face of a lower panel (the top's front
      // edge on the front wall) but never over the outside from a panel that
      // ends up inside the box (glue flap, dust flap, tuck)
      layer: PANELS.find((p) => p.id === e.panel)!.layer + (INTERIOR.has(e.panel) ? -1 : 0.5),
      shown: true,
      fill: '',
    };
  });
  const tapeTop = svg.querySelectorAll<SVGPolygonElement>('[data-tape="top"]');
  const tapeFront = svg.querySelectorAll<SVGPolygonElement>('[data-tape="front"]');
  const print = svg.querySelector<SVGGElement>('.alf-print');
  const rims = svg.querySelectorAll<SVGElement>('.alf-rim');
  const shContact = svg.querySelector<SVGPolygonElement>('.alf-shadow-contact')!;
  const shWide = svg.querySelector<SVGPolygonElement>('.alf-shadow-wide')!;
  const bandTones: Tones = {
    top: mix(mat.outer.side, mat.outer.edge, 0.2),
    front: mix(mat.outer.side, mat.outer.edge, 0.35),
    side: mat.outer.edge,
    inner: mix(mat.outer.edge, '#000000', 0.25),
    edge: mix(mat.outer.edge, '#000000', 0.35),
  };
  let lastOrder = '';

  return function render(S: FoldState) {
    const cam = camera(S.cam);
    // the closing top pushes the upright dust flap in
    const RF = Math.max(S.RF, rfPushed(S.P1));
    const angles = { P1: S.P1, P2: S.P2, P4: S.P4, P5: S.P5, LF: S.LF, RF, TF: S.TF, TK: S.TK };
    const T = pose(angles, S.lift);
    const faces: Face[] = [];
    /** How much each panel shows its inside face (+1) or outside (-1); 0 is edge-on. */
    const facing = new Map<string, number>();

    for (const p of panel) {
      const A = affineOf(cam, T[p.def.id]);
      p.g.setAttribute('transform', `matrix(${A.map(f2).join(' ')})`);
      const det = A[0] * A[3] - A[1] * A[2];
      const side = det >= 0 ? 'in' : 'out';
      const up = applyR(T[p.def.id].R, [0, 0, 1]);
      facing.set(p.def.id, v3.dot(up, cam.v));
      const n: Vec3 = side === 'in' ? up : v3.mul(up, -1);
      const tones = side === 'in' ? mat.inner : mat.outer;
      const fill = shade(n, tones);
      if (fill !== p.fill || side !== p.side) {
        p.fill = fill;
        p.base.setAttribute('fill', fill);
        // inside: a wide stroke in its own colour closes the antialiasing seams
        // between coplanar panels; outside: a darker tonal edge
        p.base.setAttribute('stroke', side === 'in' ? fill : mix(fill, tones.edge, 0.5));
      }
      if (side !== p.side) {
        p.side = side;
        p.inner.style.display = side === 'in' ? '' : 'none';
        p.outer.style.display = side === 'out' ? '' : 'none';
        p.base.setAttribute('stroke-width', side === 'in' ? '1.4' : '0.6');
      }
      faces.push({ key: p.def.id, layer: p.def.layer, pts: p.def.poly.map((q) => apply(T[p.def.id], [q[0], q[1], 0])) });
    }

    // dashed creases draw on from their first point
    const prog = [S.b0, S.b1, S.b2];
    for (const c of creaseLines) {
      const k = c.c.brand ? prog[c.idx] : S.score;
      const a = c.c.a;
      const b = c.c.b;
      c.ln.setAttribute('x1', f2(a[0] + c.off[0]));
      c.ln.setAttribute('y1', f2(a[1] + c.off[1]));
      c.ln.setAttribute('x2', f2(a[0] + (b[0] - a[0]) * k + c.off[0]));
      c.ln.setAttribute('y2', f2(a[1] + (b[1] - a[1]) * k + c.off[1]));
      // a crease folded shut hides inside the fold (no hairline at the seam)
      const shut = (angles[c.c.child as keyof typeof angles] ?? 0) > 75;
      c.ln.style.visibility = k > 0.001 && !shut ? '' : 'hidden';
    }

    // tape: along the top, over the cut edge, down the front
    const total = TAPE.top + BOARD + TAPE.front;
    const run = clamp01(S.tape) * total;
    const dTop = Math.min(run, TAPE.top);
    const dEdge = Math.max(0, Math.min(run - TAPE.top, BOARD));
    const dFront = Math.max(0, run - TAPE.top - BOARD);
    const y0 = TAPE.topFrom;
    const topQuad: Pt[] = [[TAPE.x0, y0], [TAPE.x1, y0], [TAPE.x1, y0 - dTop], [TAPE.x0, y0 - dTop]];
    const frontQuad: Pt[] = [[TAPE.x0, 34], [TAPE.x1, 34], [TAPE.x1, 34 - dFront], [TAPE.x0, 34 - dFront]];
    tapeTop.forEach((e) => {
      e.setAttribute('points', pts(topQuad));
      e.style.visibility = dTop > 0.01 ? '' : 'hidden';
    });
    tapeFront.forEach((e) => {
      e.setAttribute('points', pts(frontQuad));
      e.style.visibility = dFront > 0.01 ? '' : 'hidden';
    });

    // board thickness on every free cut edge. The band sits behind the face
    // the camera sees (no lip in front of it) and swaps sides smoothly as the
    // panel passes edge-on; it is drawn only when its outer side faces us.
    for (const s of bands) {
      const Tp = T[s.def.panel];
      const outW = applyR(Tp.R, [s.def.out[0], s.def.out[1], 0]);
      // a panel tucked inside the closed box shows none of its edges
      const id = s.def.panel as keyof typeof angles;
      const tucked = INTERIOR.has(id) && angles[id] >= CLOSED[id] - 4;
      const show = !tucked && v3.dot(outW, cam.v) > 0.015;
      if (show !== s.shown) {
        s.shown = show;
        s.g.style.visibility = show ? '' : 'hidden';
      }
      if (!show) continue;
      const k = clamp1((facing.get(s.def.panel) ?? 1) / 0.25);
      const lo = (-BOARD * (1 + k)) / 2;
      const hi = (BOARD * (1 - k)) / 2;
      // exactly on the edge, so a band lying in another panel's plane is
      // coplanar with it and the layer rule decides
      const eps = 0.03;
      const [ax, ay] = s.def.a;
      const [bx, by] = s.def.b;
      const quad3: Vec3[] = ([[ax, ay, lo], [bx, by, lo], [bx, by, hi], [ax, ay, hi]] as Vec3[]).map((q) => apply(Tp, q));
      s.band.setAttribute('points', pts(quad3.map((q) => project(cam, q))));
      const fill = shade(outW, bandTones);
      if (fill !== s.fill) {
        s.fill = fill;
        s.band.setAttribute('fill', fill);
      }
      if (s.flute) {
        // flute: a wave between the two liners
        const len = Math.hypot(bx - ax, by - ay);
        const nSeg = Math.max(4, Math.round(len / 0.32));
        const wave: Pt[] = [];
        for (let i = 0; i <= nSeg; i++) {
          const t = i / nSeg;
          const z = lo + (hi - lo) * (i % 2 ? 0.78 : 0.22);
          wave.push(project(cam, apply(Tp, [ax + (bx - ax) * t, ay + (by - ay) * t, z])));
        }
        s.flute.setAttribute('points', pts(wave));
      }
      if (s.tape) {
        // the tape wraps the top's front edge from the outside face inward
        const from = k < 0 ? lo : hi;
        const to = from + (k < 0 ? 1 : -1) * dEdge;
        const tq: Vec3[] = [
          [TAPE.x0, 4 - eps * 1.5, from],
          [TAPE.x1, 4 - eps * 1.5, from],
          [TAPE.x1, 4 - eps * 1.5, to],
          [TAPE.x0, 4 - eps * 1.5, to],
        ];
        s.tape.setAttribute('points', pts(tq.map((q) => project(cam, apply(Tp, q)))));
        s.tape.style.visibility = dEdge > 0.01 ? '' : 'hidden';
      }
      faces.push({ key: s.def.id, layer: s.layer, pts: quad3 });
    }

    if (print) print.style.opacity = f2(clamp01(S.ink));
    const rim = clamp01((S.TF - 70) / 20);
    rims.forEach((r) => (r.style.opacity = f2(rim * Number(r.dataset.rim ?? 0.3))));

    // painter's order (hidden bands keep their place at the back)
    const order = paintOrder(cam, faces);
    const key = order.join(',');
    if (key !== lastOrder) {
      lastOrder = key;
      for (const k of order) facesG.appendChild(groups.get(k)!);
    }

    // contact shadow: grows as the walls rise, spreads and fades on the lift
    const walls = clamp01((S.P2 + S.P4 + S.LF + Math.min(S.RF, 90)) / 360);
    const foot = (grow: number): Pt[] =>
      ([
        [15 - grow, 19 - grow, 0],
        [25 + grow, 19 - grow, 0],
        [25 + grow, 27 + grow, 0],
        [15 - grow, 27 + grow, 0],
      ] as Vec3[]).map((q) => project(cam, q));
    shContact.setAttribute('points', pts(foot(0.15 + S.lift * 0.5)));
    shContact.style.opacity = f2(walls * mat.shadowAlpha * (1 - S.lift * 0.7));
    shWide.setAttribute('points', pts(foot(1.3 + S.lift * 0.8)));
    shWide.style.opacity = f2(walls * mat.shadowAlpha * 0.55 * (1 - S.lift * 0.35));
  };
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

function stateAt(t: number): AnimatedLogoState {
  if (t < FOLD_TIMES.fold) return 'flat';
  if (t < FOLD_TIMES.box) return 'folding';
  return 'box';
}

export interface AnimatedLogoOptions {
  loop?: boolean;
  trigger?: AnimatedLogoTrigger;
}

/**
 * Builds the logo's timeline. The fold itself is one seekable timeline; the
 * returned master drives it forward to the closed box and back again, so a
 * single play always ends on the flat f.
 */
export function initAnimatedLogo(el: HTMLElement, opts: AnimatedLogoOptions = {}): gsap.core.Timeline {
  const trigger = opts.trigger ?? 'load';
  const loop = trigger === 'load' && (opts.loop ?? true);
  const variant = (el.dataset.variant === 'ciruela' ? 'ciruela' : 'crema') as Variant;
  const compact = el.dataset.compact !== undefined;
  const render = createRenderer(el, FOLD_MATERIALS[variant]);
  const S: FoldState = { ...ZERO };

  const fold = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut', immediateRender: false },
    onUpdate() {
      render(S);
      const st = stateAt(fold.time());
      if (el.dataset.state !== st) el.dataset.state = st;
    },
  });

  const to = (vars: Partial<FoldState>, at: number, dur: number, ease = 'power2.inOut') => {
    const from = Object.fromEntries(Object.keys(vars).map((k) => [k, S[k as keyof FoldState]]));
    fold.fromTo(S, from, { ...vars, duration: dur, ease }, at);
    Object.assign(S, vars);
  };

  // 1 · the isotype's dashed folds draw on, then the quieter stem scores
  to({ b0: 1 }, 0.08, 0.45, 'power3.out');
  to({ b1: 1 }, 0.2, 0.45, 'power3.out');
  to({ b2: 1 }, 0.32, 0.45, 'power3.out');
  to({ score: 1 }, 0.42, 0.38, 'power2.out');

  // 2 · camera: from top-down to the 3/4 view, pushing in as the box forms
  to({ cam: 1 }, 0.85, 2.65, 'power2.inOut');
  // the crossbar flaps turn on their creases; the right one stands upright
  // as a dust flap until the closing top pushes it in (see rfPushed)
  to({ LF: CLOSED.LF }, 0.85, 0.8);
  to({ RF: 90 }, 0.97, 0.9);
  // the stem folds into the walls
  to({ P2: CLOSED.P2, P4: CLOSED.P4 }, 1.35, 0.8);
  to({ P5: CLOSED.P5 }, 1.8, 0.65);
  to({ P1: CLOSED.P1 }, 2.4, 0.65);
  // the top flap closes the end and its tongue tucks in
  to({ TF: CLOSED.TF }, 2.6, 0.72);
  to({ TK: CLOSED.TK }, 3.0, 0.45, 'power2.out');

  // 3 · tape seals the edge; at full size the f prints and the box settles
  to({ tape: 1 }, 3.5, 0.6, 'power2.inOut');
  if (!compact) {
    to({ ink: 1 }, 4.0, 0.55, 'power2.out');
    to({ lift: 0.8 }, 4.4, 0.22, 'power2.out');
    to({ lift: 0 }, 4.62, 0.2, 'power2.in');
    to({ lift: 0.14 }, 4.82, 0.13, 'power1.out');
    to({ lift: 0 }, 4.95, 0.13, 'power1.in');
  }
  const end = compact ? FOLD_TIMES.compactEnd : FOLD_TIMES.end;
  fold.set({}, {}, end);

  // first frame: flat, nothing drawn yet
  Object.assign(S, ZERO);
  fold.totalTime(0);
  render(S);

  // master: fold forward, then unfold back (to the complete flat isotype for
  // a single play, to the blank start for a loop that redraws its folds)
  const back = compact ? BACK_SPEED.compact : BACK_SPEED.full;
  const home = loop ? 0 : FOLD_TIMES.ready;
  const head = { t: 0 };
  const drive = () => {
    fold.totalTime(head.t);
  };
  const master = gsap.timeline({ paused: true, repeat: loop ? -1 : 0, repeatDelay: loop ? 0.35 : 0 });
  master.to(head, { t: end, duration: end, ease: 'none', onUpdate: drive });
  master.to(head, { t: home, duration: (end - home) / back, ease: 'none', onUpdate: drive });
  master.addLabel('ready', FOLD_TIMES.ready);
  return master;
}

/* ------------------------------------------------------------------ */
/* Mounting: triggers, visibility and reduced motion                   */
/* ------------------------------------------------------------------ */

type LogoHost = HTMLElement & { _timeline?: gsap.core.Timeline | null };

function mount(el: LogoHost) {
  const trigger = (el.dataset.trigger ?? 'load') as AnimatedLogoTrigger;
  const loop = trigger === 'load' && el.dataset.loop !== 'false';
  let ctx: gsap.Context | null = null;
  let io: IntersectionObserver | null = null;
  let onEnter: (() => void) | null = null;
  let viewed = false;

  const play = () => {
    const tl = el._timeline;
    if (!tl || tl.isActive()) return;
    if (trigger === 'load') {
      tl.restart();
      return;
    }
    // hover and view start from the complete flat isotype and come back to it
    tl.play('ready');
  };

  const start = () => {
    viewed = false;
    el.dataset.alfLive = '';
    el.dataset.state = 'flat';
    ctx = gsap.context(() => {
      const tl = initAnimatedLogo(el, { loop, trigger });
      // hover and view wait on the complete flat isotype
      if (trigger !== 'load') tl.seek('ready', false);
      el._timeline = tl;
    }, el);

    if (trigger === 'hover') {
      onEnter = play;
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('focusin', onEnter);
    }

    io = new IntersectionObserver(
      ([entry]) => {
        const tl = el._timeline;
        if (!tl) return;
        if (entry.isIntersecting) {
          if (trigger === 'view' && !viewed) {
            viewed = true;
            play();
          } else if (loop && tl.paused() && tl.progress() > 0 && el.dataset.alfHeld === undefined) tl.resume();
        } else if (loop && tl.isActive()) {
          tl.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    if (trigger === 'load') play();
  };

  const stop = () => {
    io?.disconnect();
    io = null;
    if (onEnter) {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('focusin', onEnter);
      onEnter = null;
    }
    ctx?.revert();
    ctx = null;
    el._timeline = null;
    delete el.dataset.alfLive;
    el.dataset.state = 'static';
  };

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (media.matches) stop();
  else start();
  media.addEventListener('change', (e) => (e.matches ? stop() : (stop(), start())));
}

/** Mounts every `[data-animated-logo]` on the page once. */
export function mountAnimatedLogos(root: ParentNode = document) {
  root.querySelectorAll<LogoHost>('[data-animated-logo]:not([data-alf-mounted])').forEach((el) => {
    el.dataset.alfMounted = '';
    mount(el);
  });
}
