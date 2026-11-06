/**
 * Step-by-step assembly guides. Each step names a pose of the isometric box
 * (see src/scripts/guide.ts), so the copy and the drawing never drift apart.
 */
import type { Dims } from './dielines';

export const GUIDE_SLUGS = ['cajas-mailer', 'cajas-de-envio', 'mailers-faciles'] as const;
export type GuideSlug = (typeof GUIDE_SLUGS)[number];
export type GuideKind = 'mailer' | 'rsc' | 'easyfold';

export interface GuideStep {
  n: number;
  titulo: string;
  texto: string;
  pose: string;
}

export interface GuideInfo {
  kind: GuideKind;
  /** Page heading. */
  titulo: string;
  lede: string;
  /** Box drawn in the figure, inches (a real size of the family). */
  dims: Dims;
  sizeCode: string;
  minutos: string;
  necesitas: string[];
  /** Product page, when the family has one. */
  producto?: string;
}

export const guideInfo: Record<GuideSlug, GuideInfo> = {
  'cajas-mailer': {
    kind: 'mailer',
    titulo: 'Cómo armar tu caja mailer',
    lede: 'Seis pasos, sin cinta ni pegamento. La primera vez toma un minuto; a la décima ya lo haces sin mirar.',
    dims: { l: 12, w: 9, h: 4 },
    sizeCode: 'M-1209',
    minutos: '1 minuto',
    necesitas: ['Tu caja plana', 'Una mesa limpia', 'Tu producto'],
    producto: '/tienda/producto/cajas-mailer',
  },
  'cajas-de-envio': {
    kind: 'rsc',
    titulo: 'Cómo armar tu caja de envío',
    lede: 'La caja de siempre, bien armada: fondo firme, solapas parejas y cinta donde de verdad sostiene.',
    dims: { l: 16, w: 12, h: 12 },
    sizeCode: 'S-1612',
    minutos: '2 minutos',
    necesitas: ['Tu caja plegada', 'Cinta de embalaje de 2 in', 'Tu producto'],
    producto: '/tienda/producto/cajas-de-envio',
  },
  'mailers-faciles': {
    kind: 'easyfold',
    titulo: 'Cómo armar tu mailer fácil',
    lede: 'Un pliegue por lado y listo. Pensado para cuando tienes veinte pedidos por despachar antes del almuerzo.',
    dims: { l: 12, w: 10, h: 3 },
    sizeCode: 'EF-1210',
    minutos: '30 segundos',
    necesitas: ['Tu mailer plano', 'Tu producto'],
  },
};

export const guides: Record<GuideSlug, GuideStep[]> = {
  'cajas-mailer': [
    {
      n: 1,
      titulo: 'Despliega la plancha',
      texto: 'Pon la caja plana sobre la mesa con el lado impreso hacia abajo. Las líneas de pliegue ya vienen marcadas.',
      pose: 'flat',
    },
    {
      n: 2,
      titulo: 'Levanta las paredes',
      texto: 'Sube el frente y el fondo hasta que queden rectos. Dobla el frente sobre sí mismo para que quede doble.',
      pose: 'walls',
    },
    {
      n: 3,
      titulo: 'Dobla los laterales',
      texto: 'Lleva hacia adentro las orejitas de los costados del frente y del fondo. Van a quedar escondidas.',
      pose: 'ears',
    },
    {
      n: 4,
      titulo: 'Encaja las solapas',
      texto: 'Sube cada lateral, enróllalo hacia adentro sobre las orejitas y presiona hasta que las pestañas entren en la base.',
      pose: 'sides',
    },
    {
      n: 5,
      titulo: 'Coloca tu producto',
      texto: 'Acomoda tu producto en el centro. Si quieres, agrega papel de seda o una tarjeta de agradecimiento.',
      pose: 'product',
    },
    {
      n: 6,
      titulo: 'Cierra la tapa',
      texto: 'Dobla las solapitas de la tapa, bájala y mete la solapa de cierre detrás del frente. Listo para enviar.',
      pose: 'closed',
    },
  ],
  'cajas-de-envio': [
    {
      n: 1,
      titulo: 'Toma la caja plegada',
      texto: 'La caja llega plana y ya pegada en una esquina. Sujétala de pie, con las solapas largas arriba y abajo.',
      pose: 'kd',
    },
    {
      n: 2,
      titulo: 'Ábrela en cuadro',
      texto: 'Empuja las esquinas hasta que la caja forme un rectángulo. Si se resiste, marca los pliegues con la mano.',
      pose: 'open',
    },
    {
      n: 3,
      titulo: 'Dale la vuelta y dobla el fondo',
      texto: 'Pon la caja boca abajo y dobla hacia adentro las dos solapas cortas del fondo.',
      pose: 'bottomMinor',
    },
    {
      n: 4,
      titulo: 'Cierra el fondo con cinta',
      texto: 'Baja las solapas largas encima y pasa cinta por la unión central, con 2 in de sobra en cada lado.',
      pose: 'bottomMajor',
    },
    {
      n: 5,
      titulo: 'Coloca tu producto',
      texto: 'Vuelve a poner la caja de pie, coloca tu producto y rellena los huecos para que no se mueva en el viaje.',
      pose: 'product',
    },
    {
      n: 6,
      titulo: 'Cierra y sella',
      texto: 'Dobla las solapas cortas, luego las largas, y sella la unión con cinta. Tu envío está listo.',
      pose: 'closed',
    },
  ],
  'mailers-faciles': [
    {
      n: 1,
      titulo: 'Despliega el mailer',
      texto: 'Ponlo plano sobre la mesa con el lado impreso hacia abajo y la solapa de cierre lejos de ti.',
      pose: 'flat',
    },
    {
      n: 2,
      titulo: 'Sube frente y fondo',
      texto: 'Levanta las dos paredes largas y dobla sus orejitas hacia adentro, en ángulo recto.',
      pose: 'walls',
    },
    {
      n: 3,
      titulo: 'Cierra los extremos',
      texto: 'Sube cada extremo sobre las orejitas y dobla su borde hacia adentro para trabarlo. Un solo pliegue por lado.',
      pose: 'ends',
    },
    {
      n: 4,
      titulo: 'Coloca tu producto',
      texto: 'Acomoda tu producto plano en la base. Ideal para ropa doblada, libros o kits.',
      pose: 'product',
    },
    {
      n: 5,
      titulo: 'Cierra la tapa',
      texto: 'Baja la tapa y mete la solapa de cierre detrás del frente. Sin cinta y en segundos.',
      pose: 'closed',
    },
  ],
};

export function hasGuide(slug: string): slug is GuideSlug {
  return (GUIDE_SLUGS as readonly string[]).includes(slug);
}
