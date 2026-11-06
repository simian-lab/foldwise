/**
 * Flat dielines (despieces) for every Foldwise box style, FEFCO-style.
 *
 * Coordinates are inches with y pointing down, the way a die-maker draws a
 * blank. Every proportion comes from the inside dimensions l × w × h, so a
 * bigger box draws a bigger blank. Cuts are solid, folds (creases) are dashed
 * red in the component, per die-making convention.
 *
 * Simplified on purpose: board-thickness allowances are folded into a single
 * roll allowance `T` and slot widths; a production die would add caliper
 * corrections per flute.
 */
import { categories, type BoxStyle } from './categories';

export interface Dims {
  l: number;
  w: number;
  h: number;
}

export interface DielineLabel {
  x: number;
  y: number;
  text: string;
  /** Rotate 90° for tall, narrow panels. */
  vertical?: boolean;
}

export interface DielineMeasure {
  axis: 'x' | 'y';
  from: number;
  to: number;
  /** Position of the dimension line on the other axis. */
  at: number;
  text: string;
}

export interface DielineData {
  style: BoxStyle;
  /** Solid cut paths. The first one is always the outer contour of the main blank. */
  cuts: string[];
  /** Dashed crease paths. */
  folds: string[];
  viewBox: string;
  dims: Dims;
  /** Overall size of the main blank, inches. */
  flat: { w: number; h: number };
  /** Glue-joint width (RSC families); 0 elsewhere. */
  glue: number;
  labels: DielineLabel[];
  measures: DielineMeasure[];
  /** Text size in viewBox units, scaled to the sheet. */
  fontSize: number;
  /** Structure shown in the caption: a real FEFCO code (0201, 0427) or a plain style name. */
  code: string;
  /** Spanish name of the construction. */
  name: string;
}

type Pt = [number, number];

// ───────────── path helpers ─────────────

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const poly = (pts: Pt[], close = true) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r3(x)} ${r3(y)}`).join(' ') + (close ? ' Z' : '');
const seg = (a: Pt, b: Pt) => poly([a, b], false);
const hLine = (y: number, x0: number, x1: number) => seg([x0, y], [x1, y]);
const vLine = (x: number, y0: number, y1: number) => seg([x, y0], [x, y1]);
const rectPts = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** A closed rounded slot (hand hole, lock slot) as a cut path, horizontal or vertical. */
function slot(cx: number, cy: number, w: number, h: number): string {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  if (w >= h) {
    const r = h / 2;
    return (
      `M${r3(x0 + r)} ${r3(y0)} L${r3(x1 - r)} ${r3(y0)} A${r3(r)} ${r3(r)} 0 0 1 ${r3(x1 - r)} ${r3(y1)} ` +
      `L${r3(x0 + r)} ${r3(y1)} A${r3(r)} ${r3(r)} 0 0 1 ${r3(x0 + r)} ${r3(y0)} Z`
    );
  }
  const r = w / 2;
  return (
    `M${r3(x1)} ${r3(y0 + r)} L${r3(x1)} ${r3(y1 - r)} A${r3(r)} ${r3(r)} 0 0 1 ${r3(x0)} ${r3(y1 - r)} ` +
    `L${r3(x0)} ${r3(y0 + r)} A${r3(r)} ${r3(r)} 0 0 1 ${r3(x1)} ${r3(y0 + r)} Z`
  );
}

/** Mirror the right half of a symmetric contour (top centre → bottom centre) into a full closed path. */
function mirrored(cx: number, right: Pt[]): Pt[] {
  const left = right
    .slice(1, -1)
    .reverse()
    .map(([x, y]) => [2 * cx - x, y] as Pt);
  return [...right, ...left];
}

/** A perforation: short cut dashes along a segment. */
function perforation(a: Pt, b: Pt, dash = 0.3, gap = 0.22): string[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const out: string[] = [];
  for (let s = 0; s < len - 0.01; s += dash + gap) {
    const e = Math.min(len, s + dash);
    out.push(seg([a[0] + ux * s, a[1] + uy * s], [a[0] + ux * e, a[1] + uy * e]));
  }
  return out;
}

const T = 0.15; // roll / double-score allowance
const SLOT = 0.25; // RSC flap slot width

// ───────────── inch formatting ─────────────

const FRACTIONS: Record<number, string> = { 1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞' };

/** 29.5 → "29 ½ in", rounded to the nearest eighth the way a die shop writes it. */
export function formatInches(v: number): string {
  const eighths = Math.round(v * 8);
  const whole = Math.floor(eighths / 8);
  const rest = eighths % 8;
  if (!rest) return `${whole} in`;
  return whole ? `${whole} ${FRACTIONS[rest]} in` : `${FRACTIONS[rest]} in`;
}

// ───────────── builders ─────────────

interface Net {
  cuts: string[];
  folds: string[];
  labels: DielineLabel[];
  /** Main blank bounds. */
  box: { x0: number; y0: number; x1: number; y1: number };
  /** Extra pieces (lid, partitions) to the right or below. */
  extra?: { x0: number; y0: number; x1: number; y1: number }[];
  glue?: number;
}

/**
 * Regular slotted container (FEFCO 0201): glue joint + four panels a, b, a, b
 * of height `body`, flaps of depth `flap` top and bottom, slots between flaps.
 */
function rscNet(a: number, b: number, body: number, flap: number): Net {
  const g = body >= 14 || a >= 18 ? 1.5 : 1.25;
  const xs = [g, g + a, g + a + b, g + 2 * a + b, g + 2 * a + 2 * b];
  const yT = flap, yB = flap + body, yE = 2 * flap + body;
  const s = SLOT / 2;
  const c = Math.min(0.5, flap * 0.25); // glue-tab taper
  const pts: Pt[] = [[0, yT + c], [g, yT], [g, 0]];
  for (let i = 1; i < 4; i++) pts.push([xs[i] - s, 0], [xs[i] - s, yT], [xs[i] + s, yT], [xs[i] + s, 0]);
  pts.push([xs[4], 0], [xs[4], yE]);
  for (let i = 3; i >= 1; i--) pts.push([xs[i] + s, yE], [xs[i] + s, yB], [xs[i] - s, yB], [xs[i] - s, yE]);
  pts.push([g, yE], [g, yB], [0, yB - c]);

  const folds: string[] = [vLine(g, yT, yB)];
  for (let i = 1; i < 4; i++) folds.push(vLine(xs[i], yT, yB));
  for (let i = 0; i < 4; i++) {
    const x0 = i === 0 ? xs[0] : xs[i] + s;
    const x1 = i === 3 ? xs[4] : xs[i + 1] - s;
    folds.push(hLine(yT, x0, x1), hLine(yB, x0, x1));
  }
  const names = ['Frente', 'Costado', 'Atrás', 'Costado'];
  const labels: DielineLabel[] = names.map((text, i) => ({ x: (xs[i] + xs[i + 1]) / 2, y: (yT + yB) / 2, text }));
  for (let i = 0; i < 4; i++) {
    labels.push({ x: (xs[i] + xs[i + 1]) / 2, y: yT / 2, text: 'Solapa' });
    labels.push({ x: (xs[i] + xs[i + 1]) / 2, y: (yB + yE) / 2, text: 'Solapa' });
  }
  labels.push({ x: g / 2, y: (yT + yB) / 2, text: 'Pestaña de pegue', vertical: true });
  return { cuts: [poly(pts)], folds, labels, box: { x0: 0, y0: 0, x1: xs[4], y1: yE }, glue: g };
}

/**
 * Roll-end tuck-front mailer (FEFCO 0427): base, double front and double
 * sides that roll inward and lock into the base, back wall, lid with dust
 * flaps and a tuck flap. `easy` drops the roll-overs (single walls, one-fold
 * ends with lips) for the easy-fold mailer.
 */
function mailerNet({ l, w, h }: Dims, easy: boolean): Net {
  const ht = Math.max(1.2, h * (easy ? 0.85 : 0.8)); // tuck depth
  const ear = Math.min(w * 0.42, h * 1.5); // dust ear length
  const lidEar = Math.max(0.8, h - 0.25);
  const sideW = easy ? h : h + T + (h - T - 0.05); // side, roll, inner side
  const lip = Math.min(h * 0.7, 1.1);
  const cx = sideW + l / 2;
  const xL = sideW, xR = sideW + l;
  const y0 = 0, y1 = ht, y2 = y1 + w, y3 = y2 + h + (easy ? 0.1 : T), y4 = y3 + w, y5 = y4 + h;
  const y6 = y5 + T, y7 = easy ? y5 : y6 + h - T - 0.05;
  const tabW = Math.min(1.4, w * 0.18);

  const right: Pt[] = [
    [cx, y0], [xR - 0.15 - 0.5, y0], [xR - 0.15, y0 + 0.5], [xR - 0.15, y1], [xR, y1],
    // lid dust flap (the easy-fold lid has none)
    ...(easy
      ? ([[xR, y2 - 0.15]] as Pt[])
      : ([[xR, y1 + 0.2], [xR + lidEar, y1 + 0.2 + lidEar * 0.6], [xR + lidEar, y2 - 0.35], [xR + lidEar * 0.6, y2 - 0.15], [xR, y2 - 0.15]] as Pt[])),
    // back ear, slotted free from the side panel below
    [xR, y2 + 0.15], [xR + ear * 0.7, y2 + 0.15], [xR + ear, y2 + 0.15 + ear * 0.35], [xR + ear, y3 - 0.12], [xR, y3 - 0.12],
    [xR, y3],
  ];
  if (easy) {
    // single end panel with a lip that tucks over the ears
    right.push(
      [xR + h, y3], [xR + h, y3 + 0.2], [xR + h + lip, y3 + 0.2 + lip * 0.6], [xR + h + lip, y4 - 0.2 - lip * 0.6], [xR + h, y4 - 0.2], [xR + h, y4],
    );
  } else {
    const xs = xR + sideW;
    const ya = y3 + w * 0.28 - tabW / 2, yb = y3 + w * 0.72 - tabW / 2;
    right.push([xR + h + T, y3], [xR + h + T, y3 + 0.1], [xs, y3 + 0.1]);
    for (const yt of [ya, yb]) right.push([xs, yt], [xs + 0.35, yt + 0.15], [xs + 0.35, yt + tabW - 0.15], [xs, yt + tabW]);
    right.push([xs, y4 - 0.1], [xR + h + T, y4 - 0.1], [xR + h + T, y4]);
  }
  right.push(
    [xR, y4],
    // front ear
    [xR, y4 + 0.12], [xR + ear, y4 + 0.12], [xR + ear, y5 - 0.15 - ear * 0.35], [xR + ear * 0.7, y5 - 0.15], [xR, y5 - 0.15],
  );
  if (easy) {
    // thumb notch in the middle of the front wall's top edge
    right.push([xR, y5], [cx + 1.1, y5]);
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      right.push([cx + 1.1 * Math.cos(a), y5 - 0.55 * Math.sin(a)]);
    }
  } else {
    right.push([xR, y6], [xR - 0.1, y6]);
    const xb = xL + l * 0.7 + tabW / 2; // the mirror adds the 30 % tab
    right.push([xR - 0.1, y7]);
    for (const xt of [xb]) right.push([xt, y7], [xt - 0.15, y7 + 0.35], [xt - tabW + 0.15, y7 + 0.35], [xt - tabW, y7]);
    right.push([cx, y7]);
  }
  const contour = mirrored(cx, right);

  const cuts = [poly(contour)];
  const folds: string[] = [
    hLine(y1, xL + 0.15, xR - 0.15), // tuck
    hLine(y2, xL, xR), // lid / back
    ...(easy ? [] : [vLine(xL, y1 + 0.2, y2 - 0.15), vLine(xR, y1 + 0.2, y2 - 0.15)]), // lid ears
    vLine(xL, y2 + 0.15, y3 - 0.12), vLine(xR, y2 + 0.15, y3 - 0.12), // back ears
    vLine(xL, y4 + 0.12, y5 - 0.15), vLine(xR, y4 + 0.12, y5 - 0.15), // front ears
    hLine(y3, xL, xR), hLine(y4, xL, xR), // base
    vLine(xL, y3, y4), vLine(xR, y3, y4), // sides
  ];
  const labels: DielineLabel[] = [
    { x: cx, y: (y1 + y2) / 2, text: 'Tapa' },
    { x: cx, y: (y3 + y4) / 2, text: 'Base' },
    { x: cx, y: (y2 + y3) / 2, text: 'Fondo' },
    { x: cx, y: (y4 + y5) / 2, text: 'Frente' },
    { x: cx, y: y1 / 2 + 0.1, text: 'Solapa de cierre' },
    { x: xL - h / 2, y: (y3 + y4) / 2, text: 'Lateral', vertical: true },
    { x: xR + h / 2, y: (y3 + y4) / 2, text: 'Lateral', vertical: true },
  ];
  if (easy) {
    folds.push(vLine(xL - h, y3 + 0.2, y4 - 0.2), vLine(xR + h, y3 + 0.2, y4 - 0.2));
  } else {
    // double scores where the walls roll over themselves
    for (const x of [xL - h, xL - h - T]) folds.push(vLine(x, y3 + 0.1, y4 - 0.1));
    for (const x of [xR + h, xR + h + T]) folds.push(vLine(x, y3 + 0.1, y4 - 0.1));
    folds.push(hLine(y5, xL, xR), hLine(y6, xL + 0.1, xR - 0.1));
    labels.push(
      { x: xL - h - T - (h - T) / 2, y: (y3 + y4) / 2, text: 'Lateral interior', vertical: true },
      { x: xR + h + T + (h - T) / 2, y: (y3 + y4) / 2, text: 'Lateral interior', vertical: true },
      { x: cx, y: (y6 + y7) / 2, text: 'Frente interior' },
    );
    // lock slots in the base for the roll-over tabs
    const sw = 0.14;
    for (const f of [0.28, 0.72]) {
      cuts.push(slot(xL + 0.3, y3 + w * f, sw, tabW - 0.2), slot(xR - 0.3, y3 + w * f, sw, tabW - 0.2));
    }
    for (const f of [0.3, 0.7]) cuts.push(slot(xL + l * f, y4 - 0.3, tabW - 0.2, sw));
  }
  return { cuts, folds, labels, box: { x0: Math.min(...contour.map((p) => p[0])), y0: 0, x1: Math.max(...contour.map((p) => p[0])), y1: Math.max(...contour.map((p) => p[1])) } };
}

/**
 * Tray with four walls and glued corner tabs (FEFCO 03 series), offset by
 * (ox, oy). Used for both pieces of two-piece boxes.
 */
function trayNet(ox: number, oy: number, l: number, w: number, h: number, name: string, handHoles = false): Net {
  const th = Math.min(h * 0.85, w * 0.4);
  const x0 = ox + h, x1 = x0 + l, y0 = oy + h, y1 = y0 + w;
  const cx = (x0 + x1) / 2;
  const right: Pt[] = [
    [cx, oy], [x1, oy],
    [x1, oy + 0.1], [x1 + th * 0.75, oy + 0.1], [x1 + th, oy + 0.1 + th * 0.3], [x1 + th, y0 - 0.12], [x1, y0 - 0.12],
    [x1, y0], [x1 + h, y0], [x1 + h, y1], [x1, y1],
    [x1, y1 + 0.12], [x1 + th, y1 + 0.12], [x1 + th, y1 + h - 0.1 - th * 0.3], [x1 + th * 0.75, y1 + h - 0.1], [x1, y1 + h - 0.1],
    [x1, y1 + h], [cx, y1 + h],
  ];
  const contour = mirrored(cx, right);
  const cuts = [poly(contour)];
  if (handHoles && h >= 3) {
    const hw = Math.min(w * 0.4, 3.75), hh = Math.min(1, h * 0.14);
    cuts.push(slot(x0 - h * 0.68, (y0 + y1) / 2, hh, hw), slot(x1 + h * 0.68, (y0 + y1) / 2, hh, hw));
  }
  const folds = [
    poly(rectPts(x0, y0, x1, y1)),
    vLine(x0, oy + 0.1, y0 - 0.12), vLine(x1, oy + 0.1, y0 - 0.12),
    vLine(x0, y1 + 0.12, y1 + h - 0.1), vLine(x1, y1 + 0.12, y1 + h - 0.1),
  ];
  const labels: DielineLabel[] = [{ x: cx, y: (y0 + y1) / 2, text: name }];
  return { cuts, folds, labels, box: { x0: ox, y0: oy, x1: x1 + h, y1: y1 + h } };
}

function twoPieceNet({ l, w, h }: Dims, lidH: number, handHoles: boolean): Net {
  const base = trayNet(0, 0, l, w, h, 'Base', handHoles);
  const gap = Math.max(1.5, l * 0.12);
  const ox = base.box.x1 + gap;
  const lid = trayNet(ox, 0, l + 0.25, w + 0.25, lidH, 'Tapa');
  return {
    cuts: [...base.cuts, ...lid.cuts],
    folds: [...base.folds, ...lid.folds],
    labels: [...base.labels, ...lid.labels],
    box: base.box,
    extra: [lid.box],
  };
}

/** Partition strips for bottle shippers: two strips that slot into each other. */
function partitions(ox: number, oy: number, l: number, w: number, h: number): { cuts: string[]; labels: DielineLabel[]; box: Net['box'] } {
  const ph = h * 0.92;
  const cuts: string[] = [];
  const labels: DielineLabel[] = [];
  const strip = (y: number, len: number, fromTop: boolean, n: number) => {
    const pts: Pt[] = [[ox, y]];
    const sw = 0.18;
    if (fromTop) {
      for (let i = 1; i <= n; i++) {
        const x = ox + (len * i) / (n + 1);
        pts.push([x - sw / 2, y], [x - sw / 2, y + ph / 2], [x + sw / 2, y + ph / 2], [x + sw / 2, y]);
      }
      pts.push([ox + len, y], [ox + len, y + ph], [ox, y + ph]);
    } else {
      pts.push([ox + len, y], [ox + len, y + ph]);
      for (let i = n; i >= 1; i--) {
        const x = ox + (len * i) / (n + 1);
        pts.push([x + sw / 2, y + ph], [x + sw / 2, y + ph / 2], [x - sw / 2, y + ph / 2], [x - sw / 2, y + ph]);
      }
      pts.push([ox, y + ph]);
    }
    cuts.push(poly(pts));
    labels.push({ x: ox + len / 2, y: y + ph * (fromTop ? 0.78 : 0.22), text: 'Divisor' });
  };
  const nl = Math.max(1, Math.round(l / 4) - 1);
  const nw = Math.max(1, Math.round(w / 4) - 1);
  strip(oy, l - 0.1, true, nw);
  strip(oy + ph + 0.8, w - 0.1, false, nl);
  return { cuts, labels, box: { x0: ox, y0: oy, x1: ox + Math.max(l, w), y1: oy + 2 * ph + 0.8 } };
}

// ───────────── per style ─────────────

const META: Record<BoxStyle, { code: string; name: string }> = {
  rsc: { code: 'FEFCO 0201', name: 'Caja regular ranurada (RSC)' },
  multidepth: { code: 'Caja multi-altura', name: 'Caja ranurada multi-altura' },
  wine: { code: 'Caja con divisores', name: 'Caja ranurada con divisores' },
  sideloader: { code: 'Caja de carga lateral', name: 'Caja ranurada de carga lateral' },
  mailer: { code: 'FEFCO 0427', name: 'Mailer con laterales dobles y solapa de cierre' },
  easyfold: { code: 'Diseño propio', name: 'Mailer de un pliegue con solapa de cierre' },
  file: { code: 'Base y tapa', name: 'Base y tapa con manijas' },
  retail: { code: 'Base y tapa', name: 'Base y tapa de regalo' },
  apparel: { code: 'Base y tapa', name: 'Base y tapa plana' },
};

function netFor(style: BoxStyle, d: Dims): Net {
  const { l, w, h } = d;
  switch (style) {
    case 'rsc':
      return rscNet(l, w, h, w / 2);
    case 'multidepth': {
      const net = rscNet(l, w, h, w / 2);
      const yT = w / 2;
      const g = net.glue!;
      const xs = [g, g + l, g + l + w, g + 2 * l + w, g + 2 * l + 2 * w];
      // extra height scores, and corner perforations down to the lowest one
      const scores = [0.25, 0.5].filter((f) => h * (1 - f) >= 2).map((f) => yT + h * f);
      for (const y of scores) net.folds.push(hLine(y, xs[0], xs[4]));
      // panel names sit below the lowest score so no crease runs through them
      for (const lb of net.labels) if (lb.text !== 'Solapa' && !lb.vertical) lb.y = yT + h * 0.75;
      const deepest = Math.max(yT, ...scores);
      for (let i = 1; i < 4; i++) net.cuts.push(...perforation([xs[i], yT], [xs[i], deepest]));
      return net;
    }
    case 'wine': {
      const net = rscNet(l, w, h, w / 2);
      const p = partitions(net.box.x1 + 1.5, 0, l, w, h);
      net.cuts.push(...p.cuts);
      net.labels.push(...p.labels);
      net.extra = [p.box];
      return net;
    }
    case 'sideloader': {
      // the tube wraps the long axis: panels w, h, w, h with length l; flaps close the w × h ends
      const net = rscNet(w, h, l, h / 2);
      return net;
    }
    case 'mailer':
      return mailerNet(d, false);
    case 'easyfold':
      return mailerNet(d, true);
    case 'file':
      return twoPieceNet(d, Math.min(2.5, h * 0.3), true);
    case 'retail':
      return twoPieceNet(d, Math.max(1, h * 0.6), false);
    case 'apparel':
      return twoPieceNet(d, h, false);
  }
}

/** Main size of a style: the first size of the first category that uses it. */
export function mainSize(style: BoxStyle): Dims {
  const cat = categories.find((c) => c.style === style);
  const s = cat?.sizes[0] ?? { l: 12, w: 9, h: 4 };
  return { l: s.l, w: s.w, h: s.h };
}

export function getDieline(style: BoxStyle, dims: Dims = mainSize(style)): DielineData {
  const net = netFor(style, dims);
  const { box } = net;
  const all = [box, ...(net.extra ?? [])];
  const minX = Math.min(...all.map((b) => b.x0));
  const minY = Math.min(...all.map((b) => b.y0));
  const maxX = Math.max(...all.map((b) => b.x1));
  const maxY = Math.max(...all.map((b) => b.y1));
  const span = Math.max(maxX - minX, maxY - minY);
  // size text for the sheet as drawn on a desktop page (≈1100 px wide, ≤600 px tall): about 13 px
  const pxPerIn = Math.min(1100 / ((maxX - minX) * 1.12), 600 / ((maxY - minY) * 1.12));
  const fontSize = r3(13 / pxPerIn);
  const m = fontSize * 3.2; // room for the dimension lines
  const fw = box.x1 - box.x0;
  const fh = box.y1 - box.y0;
  const measures: DielineMeasure[] = [
    { axis: 'x', from: box.x0, to: box.x1, at: minY - m * 0.55, text: formatInches(fw) },
    { axis: 'y', from: box.y0, to: box.y1, at: minX - m * 0.55, text: formatInches(fh) },
  ];
  // keep only labels whose panel fits the word
  const labels = net.labels.filter((lb) => lb.text.length * fontSize * 0.55 < span * 0.3);
  return {
    style,
    cuts: net.cuts,
    folds: net.folds,
    viewBox: [minX - m, minY - m, maxX - minX + m * 1.6, maxY - minY + m * 1.6].map(r3).join(' '),
    dims: { l: dims.l, w: dims.w, h: dims.h },
    flat: { w: r3(fw), h: r3(fh) },
    glue: net.glue ?? 0,
    labels,
    measures,
    fontSize,
    ...META[style],
  };
}
