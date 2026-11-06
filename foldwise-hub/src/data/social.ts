/**
 * Instagram examples for the brand board and the manual's "Redes sociales"
 * chapter. Real copy only: no follower counts, testimonials, customers,
 * delivery times or certifications. The one number is the real minimum order.
 */
import { minOrderUnits } from './categories';
import { taglines } from './brand';

export const SOCIAL_HANDLE = 'foldwise';

/** Profile bio: the tagline plus the secondary line, nothing invented. */
export const SOCIAL_BIO = [taglines.principal, taglines.secundaria] as const;

export type SurfaceColor = 'crema' | 'ciruela' | 'kraft' | 'lima';

export type IgMedia =
  | { kind: 'photo'; src: string; alt: string; width: number; height: number; position?: string }
  | { kind: 'type'; text: string; sub?: string; bg: SurfaceColor }
  | { kind: 'pattern'; pattern: 'troquel' | 'flauta'; text: string; bg: SurfaceColor }
  | { kind: 'dieline'; text: string; sub: string }
  | { kind: 'slide'; text: string; sub?: string; art: 'flauta-cover' | 'flauta-wave' | 'flauta-layers' | 'isotype'; bg: SurfaceColor };

/** How the feed alternates: photo, type and pattern never sit side by side twice. */
export type Rhythm = 'foto' | 'tipografia' | 'patron';

export interface IgPostData {
  id: string;
  rhythm: Rhythm;
  media: IgMedia;
  caption: string;
  hashtags: string[];
  /** Carousel posts show the stack marker on the profile grid. */
  carousel?: boolean;
}

const photo = (src: string, alt: string, width = 1600, height = 1200, position?: string): IgMedia => ({
  kind: 'photo',
  src,
  alt,
  width,
  height,
  position,
});

export const flautaCarousel: { id: string; caption: string; hashtags: string[]; slides: IgMedia[] } = {
  id: 'flauta',
  caption: '¿Flauta? Es la onda del cartón, y ya. Desliza y te contamos para qué sirve.',
  hashtags: ['#packagingconmarca', '#aprendeconfoldwise'],
  slides: [
    { kind: 'slide', text: '¿Qué es la flauta?', sub: 'Desliza', art: 'flauta-cover', bg: 'kraft' },
    { kind: 'slide', text: 'Es la onda del cartón.', sub: 'La ves si miras la caja de canto.', art: 'flauta-wave', bg: 'crema' },
    {
      kind: 'slide',
      text: 'Va entre dos capas lisas.',
      sub: 'Así la caja resiste sin volverse pesada.',
      art: 'flauta-layers',
      bg: 'ciruela',
    },
    { kind: 'slide', text: 'Ahora ya sabes de cajas.', sub: 'Guarda este post para tu próximo pedido.', art: 'isotype', bg: 'crema' },
  ],
};

/** The 9-post profile grid, in reading order (three rows of three). */
export const feed: IgPostData[] = [
  {
    id: 'mailer',
    rhythm: 'foto',
    media: photo('/img/products/mailers-faciles.webp', 'Mailer kraft cerrada con el logo de Foldwise en la tapa'),
    caption: 'Tu marca, cerrada y lista para viajar. La mailer kraft lleva tu logo en la tapa desde el primer pedido.',
    hashtags: ['#packagingconmarca', '#emprendedores'],
  },
  {
    id: 'voz',
    rhythm: 'tipografia',
    media: { kind: 'type', text: 'Ser pequeño no te hace cliente secundario.', bg: 'ciruela' },
    caption: 'Pedir pocas cajas no te hace un pedido menos importante. Te atendemos igual desde la primera.',
    hashtags: ['#emprendedores', '#pequeñosnegocios'],
  },
  {
    id: 'envio',
    rhythm: 'foto',
    media: photo('/img/products/cajas-de-envio.webp', 'Caja de envío kraft con el logo de Foldwise y cinta lima en el cierre'),
    caption: 'Kraft natural, tu logo al frente y cinta lima en el cierre. La caja de todos los días, con tu marca encima.',
    hashtags: ['#cajasdeenvio', '#packagingconmarca'],
  },
  {
    id: 'troquel',
    rhythm: 'patron',
    media: { kind: 'pattern', pattern: 'troquel', text: 'Así se ve una caja antes de ser caja.', bg: 'crema' },
    caption: 'Las líneas punteadas se doblan y las sólidas se cortan. Este es nuestro troquel, convertido en patrón.',
    hashtags: ['#troquel', '#packaging'],
  },
  {
    id: 'unboxing',
    rhythm: 'foto',
    media: photo(
      '/img/products/mailer-abierta.webp',
      'Mailer ciruela abierta con papel de seda, un frasco y una tarjeta; en la tapa se lee «Lo pequeño se cuida en grande.»',
      1400,
      1120,
    ),
    caption: 'Lo primero que ve tu cliente al abrir. Que se note que lo empacaste pensando en él.',
    hashtags: ['#unboxing', '#packagingconmarca'],
  },
  {
    id: 'flauta',
    rhythm: 'tipografia',
    media: flautaCarousel.slides[0],
    caption: flautaCarousel.caption,
    hashtags: flautaCarousel.hashtags,
    carousel: true,
  },
  {
    id: 'regalo',
    rhythm: 'foto',
    media: photo('/img/products/cajas-regalo-retail.webp', 'Caja de regalo ciruela con tapa y el logo de Foldwise'),
    caption: 'Para regalar, ciruela. Una caja con tapa que se siente especial antes de abrirla.',
    hashtags: ['#cajasderegalo', '#emprendedores'],
  },
  {
    id: 'minimo',
    rhythm: 'tipografia',
    media: { kind: 'type', text: `Pide desde ${minOrderUnits} cajas.`, sub: 'Cuando crezcas, el precio baja contigo.', bg: 'lima' },
    caption: `Empieza con ${minOrderUnits} cajas. Cuando crezcas, el precio baja contigo.`,
    hashtags: ['#emprendedores', '#packagingconmarca'],
  },
  {
    id: 'armado',
    rhythm: 'patron',
    media: { kind: 'dieline', text: 'Dobla por lo punteado.', sub: 'Tip de armado' },
    caption: 'Tip de armado: las líneas punteadas son pliegues. Dóblalas antes de armar y todo encaja en su lugar.',
    hashtags: ['#tipsdeempaque', '#emprendedores'],
  },
];

export interface IgStoryData {
  id: string;
  label: string;
  /** Total frames in the story; the progress bar shows the first as current. */
  frames: number;
}

export const pollStory = {
  id: 'encuesta',
  label: 'Historia con encuesta: ¿Kraft o ciruela?',
  frames: 1,
  question: '¿Kraft o ciruela?',
  options: ['Kraft', 'Ciruela'] as const,
  left: photo('/img/products/cajas-de-envio.webp', 'Caja de envío kraft'),
  right: photo('/img/products/mailer-cerrada.webp', 'Mailer ciruela', 1400, 1120),
};

export const stepsStory = {
  id: 'detras',
  label: 'Historia Detrás de la caja, paso 1 de 3',
  frames: 3,
  title: 'Detrás de la caja',
  steps: ['Eliges tu caja y su medida.', 'Subes tu logo y lo revisamos contigo.', 'La empacamos y sale hacia ti.'],
  photo: photo('/img/shop-empacando.jpg', 'Dos personas empacando pedidos en cajas kraft', 1600, 1068, '40% 50%'),
};

/** Every caption with its hashtags, as it would be published. */
export const fullCaption = (p: { caption: string; hashtags: string[] }) => `${p.caption} ${p.hashtags.join(' ')}`;
