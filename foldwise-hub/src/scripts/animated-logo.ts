/**
 * Foldwise animated logo.
 *
 * The story (about 7 s per cycle, stylized rather than a literal dieline):
 *   1. the flat "f" draws its lime fold lines            data-state="flat"
 *   2. the three flaps fold over the stem, staggered,
 *      while the whole mark tilts in 3D                   data-state="folding"
 *   3. the f collapses into an isometric box that lands
 *      with an overshoot; lime tape runs along the lid
 *      seam and down the end, the isotype appears on
 *      the long side                                      data-state="box"
 *   4. the box lifts away and the flat f returns          data-state="flat"
 *
 * Reduced motion: no timeline is built and the root shows the static isotype
 * (data-state="static").
 *
 * `loop` applies only to trigger="load". Hover and view triggers always play
 * exactly once. A single play rests on the complete flat isotype (fold lines
 * drawn), because the story itself ends by returning to the f.
 */
import { gsap } from 'gsap';

export type AnimatedLogoTrigger = 'load' | 'hover' | 'view';
export type AnimatedLogoState = 'static' | 'flat' | 'folding' | 'box';

export interface AnimatedLogoOptions {
  loop?: boolean;
  trigger?: AnimatedLogoTrigger;
}

/* ------------------------------------------------------------------ */
/* Isometric box geometry (shared by the SSR markup and the timeline)  */
/* ------------------------------------------------------------------ */

type Pt = readonly [number, number];

const COS30 = Math.cos(Math.PI / 6);
const U_R: Pt = [COS30, 0.5]; // long axis, runs down to the right
const U_L: Pt = [-COS30, 0.5]; // short axis, runs down to the left

const add = (p: Pt, q: Pt): Pt => [p[0] + q[0], p[1] + q[1]];
const mul = (p: Pt, k: number): Pt => [p[0] * k, p[1] * k];
const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
const down = (p: Pt, h: number): Pt => [p[0], p[1] + h];
const fmt = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
export const pointsOf = (pts: readonly Pt[]) => pts.map(fmt).join(' ');

/** Box in a 200 x 200 viewBox: short side L, long side R, height H. */
export function boxGeometry() {
  const L = 56;
  const R = 74;
  const H = 58;
  const T: Pt = [92.2, 32];
  const Lc = add(T, mul(U_L, L));
  const Rc = add(T, mul(U_R, R));
  const F = add(Lc, mul(U_R, R));

  // Lid seam where the two major flaps meet, along the long axis.
  const seamA = mid(T, Lc);
  const seamB = mid(Rc, F);

  const tapeHalf = 6.2;
  const tapeDrop = 27;

  // Mark on the long (front-left) face, mapped onto the face plane.
  const markScale = 0.9;
  const markCenter = down(add(Lc, mul(U_R, R / 2)), H / 2 + 1);
  const a = U_R[0] * markScale;
  const b = U_R[1] * markScale;
  const d = markScale;
  const markMatrix = `matrix(${a.toFixed(4)} ${b.toFixed(4)} 0 ${d.toFixed(4)} ${(markCenter[0] - a * 22).toFixed(2)} ${(markCenter[1] - b * 22 - d * 23).toFixed(2)})`;

  const floorCenter = mid(down(Lc, H), down(Rc, H));

  return {
    L,
    R,
    H,
    top: [T, Rc, F, Lc] as Pt[],
    left: [Lc, F, down(F, H), down(Lc, H)] as Pt[],
    right: [F, Rc, down(Rc, H), down(F, H)] as Pt[],
    rimEdges: [Lc, F, Rc] as Pt[],
    cornerEdge: [F, down(F, H)] as Pt[],
    seam: [seamA, seamB] as Pt[],
    seamA,
    seamB,
    tapeHalf,
    tapeDrop,
    markMatrix,
    floorCenter,
    origin: `${floorCenter[0].toFixed(2)} ${floorCenter[1].toFixed(2)}`,
  };
}

/** Tape polygons for a draw progress p in [0, 1]: along the lid, then down the end face. */
export function tapeAt(p: number) {
  const g = boxGeometry();
  const total = g.R + g.tapeDrop;
  const run = Math.max(0, Math.min(1, p)) * total;
  const along = Math.min(run, g.R);
  const drop = Math.max(0, run - g.R);
  const w = mul(U_L, g.tapeHalf);
  const nw = mul(U_L, -g.tapeHalf);
  const a0 = add(g.seamA, w);
  const a1 = add(g.seamA, nw);
  const end = add(g.seamA, mul(U_R, along));
  const top = [a0, a1, add(end, nw), add(end, w)] as Pt[];
  const side =
    drop > 0
      ? ([add(g.seamB, w), add(g.seamB, nw), down(add(g.seamB, nw), drop), down(add(g.seamB, w), drop)] as Pt[])
      : ([g.seamB, g.seamB, g.seamB, g.seamB] as Pt[]);
  const sheen = [add(g.seamA, mul(U_L, g.tapeHalf * 0.55)), add(end, mul(U_L, g.tapeHalf * 0.55))] as Pt[];
  return { top: pointsOf(top), side: pointsOf(side), sheen: pointsOf(sheen) };
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

/** Key times in seconds. */
export const TIMES = {
  fold: 0.8, // flaps start folding
  box: 2.15, // the box has landed enough to read as a box
  back: 5.85, // the box has left; the flat f is returning
  end: 7.0,
} as const;

function stateAt(t: number): AnimatedLogoState {
  if (t < TIMES.fold) return 'flat';
  if (t < TIMES.box) return 'folding';
  if (t < TIMES.back) return 'box';
  return 'flat';
}

function setState(el: HTMLElement, state: AnimatedLogoState) {
  if (el.dataset.state !== state) el.dataset.state = state;
}

/** Front face darkens as it turns away; at edge-on the kraft back shows, lit, then settles. */
type FoldTone = { shade: string; mid: string; end: string };

export function initAnimatedLogo(el: HTMLElement, opts: AnimatedLogoOptions = {}): gsap.core.Timeline {
  // Only load-triggered logos loop; hover and view always play once.
  const loop = (opts.trigger ?? 'load') === 'load' && (opts.loop ?? true);
  const q = <T extends Element = SVGElement>(sel: string) => el.querySelector(sel) as T;
  const qa = (sel: string) => Array.from(el.querySelectorAll(sel)) as SVGElement[];

  const flat = q<HTMLElement>('.al-flat');
  const whole = q('[data-isotype-shape]');
  const pieces = q('.al-pieces');
  const flaps = {
    top: q('.al-flap--top'),
    left: q('.al-flap--left'),
    right: q('.al-flap--right'),
  };
  const folds = qa('.al-fold');
  const box = q('.al-box-body');
  const shadow = q('.al-shadow');
  const tapeTop = q('.al-tape-top');
  const tapeSide = q('.al-tape-side');
  const tapeSheen = q('.al-tape-sheen');
  const seam = q('.al-seam');
  const mark = q('.al-mark');

  const g = boxGeometry();
  const markFill = getComputedStyle(flaps.top).fill;
  const tone: FoldTone = {
    shade: el.dataset.foldShade ?? '#2A1430',
    mid: el.dataset.foldMid ?? '#E2C7A0',
    end: el.dataset.foldEnd ?? '#C9A27A',
  };

  // Hinges in the 46 x 46 isotype grid.
  gsap.set(flaps.top, { svgOrigin: '25 8' });
  gsap.set(flaps.left, { svgOrigin: '15 23' });
  gsap.set(flaps.right, { svgOrigin: '25 23' });
  const foldOrigins = ['25 4', '15 19', '25 19'];
  folds.forEach((f, i) => gsap.set(f, { svgOrigin: foldOrigins[i] }));
  gsap.set(box, { svgOrigin: g.origin });
  gsap.set(shadow, { svgOrigin: g.origin });
  gsap.set(flat, { transformPerspective: 640, transformOrigin: '50% 55%' });

  const tape = { p: 0 };
  const drawTape = () => {
    const t = tapeAt(tape.p);
    tapeTop.setAttribute('points', t.top);
    tapeSide.setAttribute('points', t.side);
    tapeSheen.setAttribute('points', t.sheen);
  };

  const tl = gsap.timeline({
    paused: true,
    repeat: loop ? -1 : 0,
    defaults: { ease: 'power2.inOut' },
    onUpdate() {
      setState(el, stateAt(tl.time()));
    },
  });

  // 0 · reset everything the cycle touches, so every repeat starts clean.
  tl.set(flat, { autoAlpha: 1, scale: 1, rotationX: 0, rotationY: 0, y: 0 }, 0)
    .set(whole, { opacity: 1 }, 0)
    .set(pieces, { opacity: 0 }, 0)
    .set(Object.values(flaps), { scaleX: 1, skewY: 0, fill: markFill }, 0)
    .set(box, { opacity: 0, scale: 0.45, y: 16 }, 0)
    .set(shadow, { opacity: 0, scale: 0.6 }, 0)
    .set(mark, { opacity: 0, y: 3 }, 0)
    .set(seam, { opacity: 0.55 }, 0)
    .set(tape, { p: 0, onComplete: drawTape }, 0);

  // 1 · the fold lines draw, top to bottom, staggered.
  tl.fromTo(
    folds,
    { scaleY: 0, opacity: 1 },
    { scaleY: 1, duration: 0.5, ease: 'power3.out', stagger: 0.12 },
    0.08,
  );

  // 2 · flaps fold over the stem while the mark tilts into space.
  tl.addLabel('fold', TIMES.fold)
    .set(whole, { opacity: 0 }, 'fold')
    .set(pieces, { opacity: 1 }, 'fold')
    .to(flat, { rotationX: 18, rotationY: -26, scale: 0.96, duration: 1.0, ease: 'power2.inOut' }, 'fold')
    // the creases are consumed by the fold: each line retracts into its hinge
    .to(folds, { scaleY: 0, duration: 0.3, ease: 'power2.in', stagger: 0.12 }, 'fold+=0.02');

  const foldFlap = (flap: SVGElement, at: number, dir: 1 | -1) =>
    tl.to(
      flap,
      {
        keyframes: [
          { scaleX: 0, skewY: dir * 9, fill: tone.shade, duration: 0.36, ease: 'power2.in' },
          { fill: tone.mid, duration: 0 },
          { scaleX: -1, skewY: 0, fill: tone.end, duration: 0.42, ease: 'back.out(1.6)' },
        ],
      },
      at,
    );
  foldFlap(flaps.top, TIMES.fold + 0.1, -1);
  foldFlap(flaps.left, TIMES.fold + 0.28, 1);
  foldFlap(flaps.right, TIMES.fold + 0.44, -1);

  // 3 · collapse into the box, which lands with an overshoot.
  tl.to(flat, { scale: 0.5, autoAlpha: 0, y: 6, duration: 0.36, ease: 'power2.in' }, 1.82)
    .to(box, { opacity: 1, duration: 0.18, ease: 'none' }, 2.02)
    .to(box, { scale: 1, y: 0, duration: 0.8, ease: 'back.out(2.1)' }, 2.02)
    .to(shadow, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 2.08)
    // tape: along the lid seam, over the edge, down the end face
    .to(tape, { p: 1, duration: 0.75, ease: 'power2.inOut', onUpdate: drawTape }, 2.75)
    .to(seam, { opacity: 0, duration: 0.3, ease: 'none' }, 3.1)
    .to(mark, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 3.35)
    // a calm breath while it rests
    .to(box, { y: -3.5, duration: 0.85, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 3.95)
    .to(shadow, { scale: 0.92, opacity: 0.8, duration: 0.85, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 3.95)
    // 4 · the box lifts away, the f comes back
    .to(box, { opacity: 0, scale: 0.9, y: -6, duration: 0.42, ease: 'power2.in' }, 5.6)
    .to(shadow, { opacity: 0, scale: 0.7, duration: 0.42, ease: 'power2.in' }, 5.6)
    .set(Object.values(flaps), { scaleX: 1, skewY: 0, fill: markFill }, TIMES.back)
    .set(pieces, { opacity: 0 }, TIMES.back)
    .set(whole, { opacity: 1 }, TIMES.back)
    .set(folds, { scaleY: 0, opacity: 1 }, TIMES.back)
    .set(flat, { rotationX: 0, rotationY: 0, y: 4, scale: 0.9 }, TIMES.back)
    .to(flat, { autoAlpha: 1, scale: 1, y: 0, duration: 0.65, ease: 'power3.out' }, TIMES.back + 0.1)
    .set({}, {}, TIMES.end);

  return tl;
}

/* ------------------------------------------------------------------ */
/* Mounting: triggers, visibility and reduced motion                   */
/* ------------------------------------------------------------------ */

type LogoHost = HTMLElement & { _timeline?: gsap.core.Timeline | null };

function mount(el: LogoHost) {
  const trigger = (el.dataset.trigger ?? 'load') as AnimatedLogoTrigger;
  const loop = trigger === 'load' && el.dataset.loop !== 'false';
  const folds = Array.from(el.querySelectorAll('.al-fold')) as SVGElement[];
  let ctx: gsap.Context | null = null;
  let io: IntersectionObserver | null = null;
  let onEnter: (() => void) | null = null;
  let inView = false;

  const rest = () => {
    // After a single play, finish on the complete isotype: redraw the folds.
    // Created inside the context so stop() reverts and kills it too.
    ctx?.add(() => gsap.to(folds, { scaleY: 1, duration: 0.45, ease: 'power3.out', stagger: 0.1 }));
  };

  const play = () => {
    const tl = el._timeline;
    if (!tl || tl.isActive()) return;
    // Hover and view plays begin on a complete isotype, so skip the redraw intro.
    if (trigger === 'load') tl.restart();
    else tl.play('fold');
  };

  const start = () => {
    el.dataset.state = 'flat';
    ctx = gsap.context(() => {
      const tl = initAnimatedLogo(el, { loop, trigger });
      if (!loop) tl.eventCallback('onComplete', rest);
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
        inView = entry.isIntersecting;
        if (inView) {
          if (trigger === 'view' && tl.progress() === 0) play();
          else if (loop && tl.paused() && tl.progress() > 0) tl.resume();
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
    el.dataset.state = 'static';
  };

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (media.matches) stop();
  else start();
  media.addEventListener('change', (e) => (e.matches ? stop() : (stop(), start())));
}

/** Mounts every `[data-animated-logo]` on the page once. */
export function mountAnimatedLogos(root: ParentNode = document) {
  root.querySelectorAll<LogoHost>('[data-animated-logo]:not([data-al-mounted])').forEach((el) => {
    el.dataset.alMounted = '';
    mount(el);
  });
}
