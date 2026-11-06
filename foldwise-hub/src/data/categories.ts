import type { PriceTier } from './pricing';

export type BoxStyle =
  | 'rsc' | 'mailer' | 'easyfold' | 'multidepth' | 'file'
  | 'sideloader' | 'wine' | 'retail' | 'apparel';

export interface BoxSize {
  code: string;
  l: number; // inches
  w: number;
  h: number;
}

export interface Category {
  slug: string;
  nameEs: string;
  shortEs: string;
  ulineRef: string;
  style: BoxStyle;
  flute: 'B' | 'C' | 'E' | 'BC';
  ect: 32 | 44;
  sizes: BoxSize[];
  minUnits: number;
  tiers: PriceTier[];
  featured: boolean; // featured = full product page
}

const s = (code: string, l: number, w: number, h: number): BoxSize => ({ code, l, w, h });
const t = (minQty: number, unitPrice: number): PriceTier => ({ minQty, unitPrice });

// Sample data: common US-standard sizes, illustrative USD prices.
export const categories: Category[] = [
  {
    slug: 'cajas-de-envio',
    nameEs: 'Cajas de envío',
    shortEs: 'La caja clásica para despachar casi todo, resistente y lista para crecer contigo.',
    ulineRef: 'Shipping Boxes',
    style: 'rsc', flute: 'C', ect: 32,
    sizes: [s('S-1212', 12, 12, 12), s('S-1612', 16, 12, 12), s('S-1816', 18, 18, 16), s('S-2418', 24, 18, 18)],
    minUnits: 25,
    tiers: [t(25, 1.85), t(100, 1.37), t(500, 0.98)],
    featured: true,
  },
  {
    slug: 'cajas-reforzadas',
    nameEs: 'Cajas reforzadas',
    shortEs: 'Pared doble para lo pesado: cuando el envío no puede fallar.',
    ulineRef: 'Heavy Duty Boxes',
    style: 'rsc', flute: 'BC', ect: 44,
    sizes: [s('H-1212', 12, 12, 12), s('H-1814', 18, 18, 14), s('H-2418', 24, 18, 18), s('H-2424', 24, 24, 24)],
    minUnits: 25,
    tiers: [t(25, 3.4), t(100, 2.65), t(250, 2.1)],
    featured: false,
  },
  {
    slug: 'cajas-mailer',
    nameEs: 'Cajas mailer',
    shortEs: 'Se abren con una sonrisa: la caja que convierte tu envío en una experiencia.',
    ulineRef: 'Mailer Boxes',
    style: 'mailer', flute: 'E', ect: 32,
    sizes: [s('M-0906', 9, 6, 4), s('M-1209', 12, 9, 4), s('M-1410', 14, 10, 4), s('M-1612', 16, 12, 5)],
    minUnits: 25,
    tiers: [t(25, 1.65), t(100, 1.22), t(500, 0.89)],
    featured: true,
  },
  {
    slug: 'mailers-faciles',
    nameEs: 'Mailers fáciles de armar',
    shortEs: 'Un pliegue y listo: armado en segundos, sin cinta.',
    ulineRef: 'Easy-Fold Mailers',
    style: 'easyfold', flute: 'E', ect: 32,
    sizes: [s('EF-0806', 8, 6, 2), s('EF-1109', 11, 9, 2), s('EF-1210', 12, 10, 3), s('EF-1511', 15, 11, 3)],
    minUnits: 25,
    tiers: [t(25, 1.2), t(100, 0.88), t(500, 0.64)],
    featured: false,
  },
  {
    slug: 'cajas-livianas',
    nameEs: 'Cajas livianas',
    shortEs: 'Cartón ligero para envíos que no pesan y cuestan menos.',
    ulineRef: 'Lightweight Boxes',
    style: 'rsc', flute: 'B', ect: 32,
    sizes: [s('L-0804', 8, 6, 4), s('L-1008', 10, 8, 6), s('L-1210', 12, 10, 8), s('L-1412', 14, 12, 10)],
    minUnits: 25,
    tiers: [t(25, 0.95), t(100, 0.7), t(500, 0.51)],
    featured: false,
  },
  {
    slug: 'cajas-multi-altura',
    nameEs: 'Cajas multi-altura',
    shortEs: 'Con líneas de corte para ajustar la altura y usar una sola caja para varios productos.',
    ulineRef: 'Multi-Depth Boxes',
    style: 'multidepth', flute: 'C', ect: 32,
    sizes: [s('MD-0806', 8, 6, 6), s('MD-1209', 12, 9, 8), s('MD-1612', 16, 12, 12), s('MD-2016', 20, 16, 12)],
    minUnits: 25,
    tiers: [t(25, 2.1), t(100, 1.58), t(300, 1.2)],
    featured: false,
  },
  {
    slug: 'cajas-de-archivo',
    nameEs: 'Cajas de archivo',
    shortEs: 'Orden para tus documentos y tu inventario, con tapa y manijas.',
    ulineRef: 'Storage & File Boxes',
    style: 'file', flute: 'B', ect: 32,
    sizes: [s('F-1512', 15, 12, 10), s('F-1713', 17, 13, 10), s('F-2012', 20, 12, 10)],
    minUnits: 25,
    tiers: [t(25, 2.45), t(50, 1.89), t(200, 1.45)],
    featured: false,
  },
  {
    slug: 'cajas-de-mudanza',
    nameEs: 'Cajas de mudanza',
    shortEs: 'Para empacar toda una casa sin sustos, con tamaños pensados para cargar fácil.',
    ulineRef: 'Moving Boxes',
    style: 'rsc', flute: 'C', ect: 32,
    sizes: [s('MV-1612', 16, 12, 12), s('MV-1818', 18, 18, 16), s('MV-2420', 24, 18, 20), s('MV-2424', 24, 24, 24)],
    minUnits: 25,
    tiers: [t(25, 2.9), t(50, 2.3), t(200, 1.85)],
    featured: false,
  },
  {
    slug: 'cajas-carga-lateral',
    nameEs: 'Cajas de carga lateral',
    shortEs: 'Se cargan por el costado: ideales para productos largos o delicados.',
    ulineRef: 'Side Loader Boxes',
    style: 'sideloader', flute: 'C', ect: 44,
    sizes: [s('SL-2410', 24, 10, 8), s('SL-3012', 30, 12, 10), s('SL-3616', 36, 16, 12)],
    minUnits: 25,
    tiers: [t(25, 5.6), t(50, 4.35), t(150, 3.5)],
    featured: false,
  },
  {
    slug: 'cajas-vino-botellas',
    nameEs: 'Cajas para vino y botellas',
    shortEs: 'Divisores firmes para que cada botella llegue como salió.',
    ulineRef: 'Wine & Bottle Shippers',
    style: 'wine', flute: 'BC', ect: 44,
    sizes: [s('W-0412', 4, 4, 15), s('W-0815', 8, 8, 15), s('W-1215', 12, 8, 15), s('W-1616', 16, 12, 16)],
    minUnits: 25,
    tiers: [t(25, 4.2), t(50, 3.3), t(150, 2.7)],
    featured: false,
  },
  {
    slug: 'cajas-regalo-retail',
    nameEs: 'Cajas de regalo y retail',
    shortEs: 'Presentación bonita para que tu producto se luzca antes de abrirse.',
    ulineRef: 'Retail & Gift Boxes',
    style: 'retail', flute: 'E', ect: 32,
    sizes: [s('R-0606', 6, 6, 3), s('R-0808', 8, 8, 4), s('R-1210', 12, 10, 4), s('R-1414', 14, 14, 6)],
    minUnits: 25,
    tiers: [t(25, 1.55), t(100, 1.15), t(500, 0.84)],
    featured: false,
  },
  {
    slug: 'cajas-ropa',
    nameEs: 'Cajas para ropa',
    shortEs: 'Planas y elegantes para que tus prendas lleguen sin arrugas.',
    ulineRef: 'Apparel Boxes',
    style: 'apparel', flute: 'E', ect: 32,
    sizes: [s('A-1209', 12, 9, 2), s('A-1511', 15, 11, 3), s('A-1812', 18, 12, 4), s('A-2416', 24, 16, 4)],
    minUnits: 25,
    tiers: [t(25, 1.75), t(100, 1.3), t(500, 0.95)],
    featured: false,
  },
];

/** Lowest order minimum across all categories (the "Desde N cajas" figure). */
export const minOrderUnits = Math.min(...categories.map((c) => c.minUnits));

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
