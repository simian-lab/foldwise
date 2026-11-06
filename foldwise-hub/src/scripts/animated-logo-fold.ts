/**
 * Foldwise animated logo, true fold ("A · Pliegue real").
 *
 * One piece of board, never a crossfade. The flat "f" is a die-cut: each flap
 * turns in 3D on its own dashed crease and the stem wraps into the walls of a
 * small box (geometry in ./fold-geometry.ts). Every frame is computed from
 * the 3D pose: panels are projected with an orthographic camera that eases
 * from top-down (the flat isotype, pixel-exact) to the isometric 3/4 view,
 * and painted back to front with plane tests (Newell) on the overlapping
 * faces.
 *
 *   0.0  the dashed folds draw on                    data-state="flat"
 *   0.8  crossbar flaps rise, the stem walls fold,
 *        the top tucks over, the end lid closes       data-state="folding"
 *   3.4  the box is closed: lime tape seals the top
 *        edge, the f prints on the front, a small
 *        settle on its contact shadow                 data-state="box"
 *   5.9  end of one play (a short hold included)
 *
 * Load + loop plays forward, holds, then unfolds back (yoyo). Hover and view
 * play once and rest on the closed box. Reduced motion builds no timeline and
 * shows the static isotype (data-state="static").
 */
import { gsap } from 'gsap';
import {
  PANELS,
  CREASES,
  STRIPS,
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
} from './fold-geometry';
import type { PanelId, Tones, Vec3, Face, Pt } from './fold-geometry';

export type FoldLogoTrigger = 'load' | 'hover' | 'view';
export type FoldLogoState = 'static' | 'flat' | 'folding' | 'box';
type Variant = 'crema' | 'ciruela';

/** Key times in seconds. */
export const FOLD_TIMES = {
  ready: 0.8, // the flat isotype is complete (folds drawn)
  fold: 0.82,
  box: 3.4,
  end: 5.85,
} as const;

export interface FoldMaterial {
  outer: Tones;
  inner: Tones;
  ink: string;
  inkFolds: string;
  creases: string;
  grain: number;
  shadow: string;
  shadowAlpha: number;
  rim: string;
}

/** variant names the background: crema -> kraft box, ciruela -> plum box. */
export const FOLD_MATERIALS: Record<Variant, FoldMaterial> = {
  crema: {
    outer: { top: '#E2C7A0', front: '#C9A27A', side: '#A9845E', inner: '#8C6B49', edge: '#7E5E3E' },
    // the inside face is printed solid plum: the flat f is the isotype itself
    inner: { top: '#3A1D3F', front: '#32193A', side: '#2A1430', inner: '#1D0D21', edge: '#160818' },
    ink: '#3A1D3F',
    inkFolds: '#C8F25A',
    creases: '#C8F25A',
    grain: 0.9,
    shadow: '#2A1430',
    shadowAlpha: 0.42,
    rim: '#FFF8EC',
  },
  ciruela: {
    outer: { top: '#6A4270', front: '#4E2B55', side: '#341A39', inner: '#1D0D21', edge: '#160818' },
    inner: { top: '#F6F1E7', front: '#E9DFCB', side: '#DED2BC', inner: '#C7B89D', edge: '#B3A386' },
    ink: '#F6F1E7',
    inkFolds: '#3A1D3F',
    creases: '#3A1D3F',
    grain: 0.45,
    shadow: '#0E0411',
    shadowAlpha: 0.7,
    rim: '#F6F1E7',
  },
};

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
  const strips = STRIPS.map((s) => {
    const g = groups.get(s.id)!;
    return {
      def: s,
      g,
      band: g.querySelector<SVGPolygonElement>('.alf-strip')!,
      flute: g.querySelector<SVGPolylineElement>('.alf-flute')!,
      tape: g.querySelector<SVGPolygonElement>('.alf-tape-strip'),
    };
  });
  const tapeTop = svg.querySelectorAll<SVGPolygonElement>('[data-tape="top"]');
  const tapeFront = svg.querySelectorAll<SVGPolygonElement>('[data-tape="front"]');
  const print = svg.querySelector<SVGGElement>('.alf-print')!;
  const rims = svg.querySelectorAll<SVGElement>('.alf-rim');
  const shContact = svg.querySelector<SVGPolygonElement>('.alf-shadow-contact')!;
  const shWide = svg.querySelector<SVGPolygonElement>('.alf-shadow-wide')!;
  let lastOrder = '';

  return function render(S: FoldState) {
    const cam = camera(S.cam);
    const T = pose({ P1: S.P1, P2: S.P2, P4: S.P4, P5: S.P5, LF: S.LF, RF: S.RF, TF: S.TF, TK: S.TK }, S.lift);
    const faces: Face[] = [];

    for (const p of panel) {
      const A = affineOf(cam, T[p.def.id]);
      p.g.setAttribute('transform', `matrix(${A.map(f2).join(' ')})`);
      const det = A[0] * A[3] - A[1] * A[2];
      const side = det >= 0 ? 'in' : 'out';
      const up = applyR(T[p.def.id].R, [0, 0, 1]);
      const n: Vec3 = side === 'in' ? up : v3.mul(up, -1);
      const fill = shade(n, side === 'in' ? mat.inner : mat.outer);
      if (fill !== p.fill) {
        p.fill = fill;
        p.base.setAttribute('fill', fill);
        // inside: stroke in its own colour to close the seams between coplanar
        // panels; outside: a darker tonal edge, as in the box drawings
        p.base.setAttribute('stroke', side === 'in' ? fill : mix(fill, (side === 'in' ? mat.inner : mat.outer).edge, 0.5));
      }
      if (side !== p.side) {
        p.side = side;
        p.inner.style.display = side === 'in' ? '' : 'none';
        p.outer.style.display = side === 'out' ? '' : 'none';
        // a wide same-colour stroke closes antialiasing seams between coplanar panels
        p.base.setAttribute('stroke-width', side === 'in' ? '1.4' : '0.6');
        p.base.setAttribute('stroke', side === 'in' ? fill : mix(fill, (side === 'in' ? mat.inner : mat.outer).edge, 0.5));
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
      c.ln.style.visibility = k > 0.001 ? '' : 'hidden';
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

    // cut edges: flute strips on the two edges that show once closed
    for (const s of strips) {
      const Tp = T[s.def.panel];
      const eps = 0.04;
      const a: Vec3 = [s.def.a[0] + s.def.out[0] * eps, s.def.a[1] + s.def.out[1] * eps, 0];
      const b: Vec3 = [s.def.b[0] + s.def.out[0] * eps, s.def.b[1] + s.def.out[1] * eps, 0];
      const quad3: Vec3[] = [a, b, [b[0], b[1], BOARD], [a[0], a[1], BOARD]].map((q) => apply(Tp, q as Vec3));
      s.band.setAttribute('points', pts(quad3.map((q) => project(cam, q))));
      // flute: a wave between the two liners
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nSeg = Math.max(4, Math.round(len / 0.32));
      const wave: Pt[] = [];
      for (let i = 0; i <= nSeg; i++) {
        const t = i / nSeg;
        const z = BOARD * (i % 2 ? 0.78 : 0.22);
        wave.push(project(cam, apply(Tp, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z])));
      }
      s.flute.setAttribute('points', pts(wave));
      // the strip only reads once its panel has closed over the edge
      const closing = s.def.panel === 'P1' ? clamp01((S.P1 - 60) / 30) : clamp01((S.TF - 60) / 30);
      s.g.style.opacity = f2(closing);
      if (s.tape) {
        const tq: Vec3[] = [
          [TAPE.x0, 4 - eps * 1.5, 0],
          [TAPE.x1, 4 - eps * 1.5, 0],
          [TAPE.x1, 4 - eps * 1.5, dEdge],
          [TAPE.x0, 4 - eps * 1.5, dEdge],
        ];
        s.tape.setAttribute('points', pts(tq.map((q) => project(cam, apply(Tp, q)))));
        s.tape.style.visibility = dEdge > 0.01 ? '' : 'hidden';
      }
      faces.push({ key: s.def.id, layer: 9, pts: quad3 });
    }

    print.style.opacity = f2(clamp01(S.ink) * 0.95);
    const rim = clamp01((S.TF - 70) / 20);
    rims.forEach((r) => (r.style.opacity = f2(rim * Number(r.dataset.rim ?? 0.3))));

    // painter's order
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

function stateAt(t: number): FoldLogoState {
  if (t < FOLD_TIMES.fold) return 'flat';
  if (t < FOLD_TIMES.box) return 'folding';
  return 'box';
}

export interface FoldLogoOptions {
  loop?: boolean;
  trigger?: FoldLogoTrigger;
}

export function initAnimatedLogoFold(el: HTMLElement, opts: FoldLogoOptions = {}): gsap.core.Timeline {
  const trigger = opts.trigger ?? 'load';
  const loop = trigger === 'load' && (opts.loop ?? true);
  const variant = (el.dataset.variant === 'ciruela' ? 'ciruela' : 'crema') as Variant;
  const render = createRenderer(el, FOLD_MATERIALS[variant]);
  const S: FoldState = { ...ZERO };

  const tl = gsap.timeline({
    paused: true,
    repeat: loop ? -1 : 0,
    yoyo: loop,
    repeatDelay: loop ? 0.35 : 0,
    defaults: { ease: 'power2.inOut', immediateRender: false },
    onUpdate() {
      render(S);
      const st = stateAt(tl.time());
      if (el.dataset.state !== st) el.dataset.state = st;
    },
    onRepeat() {
      // the unfold back runs a little quicker than the fold
      const base = Number(el.dataset.alfSpeed ?? 1) || 1;
      tl.timeScale(base * (tl.iteration() % 2 === 1 ? 1.35 : 1));
    },
  });

  const to = (vars: Partial<FoldState>, at: number, dur: number, ease = 'power2.inOut') => {
    const from = Object.fromEntries(Object.keys(vars).map((k) => [k, S[k as keyof FoldState]]));
    tl.fromTo(S, from, { ...vars, duration: dur, ease }, at);
    Object.assign(S, vars);
  };

  // 1 · the isotype's dashed folds draw on, then the quieter stem scores
  to({ b0: 1 }, 0.08, 0.45, 'power3.out');
  to({ b1: 1 }, 0.2, 0.45, 'power3.out');
  to({ b2: 1 }, 0.32, 0.45, 'power3.out');
  to({ score: 1 }, 0.42, 0.38, 'power2.out');
  tl.addLabel('ready', FOLD_TIMES.ready);

  // 2 · camera: from top-down to the 3/4 view, pushing in as the box forms
  to({ cam: 1 }, 0.85, 2.65, 'power2.inOut');
  // the crossbar flaps turn on their creases
  to({ LF: CLOSED.LF }, 0.85, 0.8);
  to({ RF: CLOSED.RF }, 0.97, 0.9);
  // the stem folds into the walls
  to({ P2: CLOSED.P2, P4: CLOSED.P4 }, 1.35, 0.8);
  to({ P5: CLOSED.P5 }, 1.8, 0.65);
  to({ P1: CLOSED.P1 }, 2.4, 0.65);
  // the top flap closes the end and its tongue tucks in
  to({ TF: CLOSED.TF }, 2.85, 0.55);
  to({ TK: CLOSED.TK }, 3.05, 0.45, 'power2.out');

  // 3 · tape seals the edge, the f prints, a small settle
  to({ tape: 1 }, 3.5, 0.6, 'power2.inOut');
  to({ ink: 1 }, 4.0, 0.55, 'power2.out');
  to({ lift: 0.8 }, 4.4, 0.22, 'power2.out');
  to({ lift: 0 }, 4.62, 0.2, 'power2.in');
  to({ lift: 0.14 }, 4.82, 0.13, 'power1.out');
  to({ lift: 0 }, 4.95, 0.13, 'power1.in');
  tl.set({}, {}, FOLD_TIMES.end);

  // first frame: flat, nothing drawn yet
  Object.assign(S, ZERO);
  tl.progress(0, true);
  render(S);
  return tl;
}

/* ------------------------------------------------------------------ */
/* Mounting: triggers, visibility and reduced motion                   */
/* ------------------------------------------------------------------ */

type LogoHost = HTMLElement & { _timeline?: gsap.core.Timeline | null };

function mount(el: LogoHost) {
  const trigger = (el.dataset.trigger ?? 'load') as FoldLogoTrigger;
  const loop = trigger === 'load' && el.dataset.loop !== 'false';
  let ctx: gsap.Context | null = null;
  let io: IntersectionObserver | null = null;
  let onEnter: (() => void) | null = null;
  let played = false;

  const play = () => {
    const tl = el._timeline;
    if (!tl) return;
    if (trigger === 'load') {
      tl.restart();
      return;
    }
    // hover and view play exactly once and rest on the closed box
    if (played || tl.isActive()) return;
    played = true;
    tl.play('ready');
  };

  const start = () => {
    played = false;
    el.dataset.alfLive = '';
    el.dataset.state = 'flat';
    ctx = gsap.context(() => {
      const tl = initAnimatedLogoFold(el, { loop, trigger });
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
          if (trigger === 'view') play();
          else if (loop && tl.paused() && tl.progress() > 0 && !el.dataset.alfHeld) tl.resume();
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

/** Mounts every `[data-animated-logo-fold]` on the page once. */
export function mountAnimatedLogoFolds(root: ParentNode = document) {
  root.querySelectorAll<LogoHost>('[data-animated-logo-fold]:not([data-alf-mounted])').forEach((el) => {
    el.dataset.alfMounted = '';
    mount(el);
  });
}
