export const palette = {
  crema: '#F6F1E7',
  kraft: '#C9A27A',
  ciruela: '#3A1D3F',
  lima: '#C8F25A',
  ciruelaClaro: '#5A3360',
  ciruelaSombra: '#2A1430',
  kraftClaro: '#E2C7A0',
  kraftSombra: '#A9845E',
} as const;

export const taglines = {
  principal: 'Pedidos pequeños. Cuidado enorme.',
  secundaria: 'Tu aliado de packaging desde la primera caja.',
} as const;

export interface VoiceExample {
  antes: string;
  despues: string;
}

export const voice: { si: string[]; no: string[]; ejemplos: VoiceExample[] } = {
  si: [
    'Hablamos como un amigo que sabe de cajas: cercano, claro y sin rodeos.',
    'Celebramos tu primer pedido igual que el pedido mil.',
    'Explicamos lo técnico en simple: una flauta es la onda del cartón, y ya.',
    'Usamos frases cortas y verbos de acción: pide, arma, envía.',
    'Le damos energía a lo que importa y dejamos el resto en calma.',
  ],
  no: [
    'No usamos jerga de bodega que te deje afuera de la conversación.',
    'No hacemos sentir pequeño a quien pide pocas cajas.',
    'No prometemos lo que no podemos cumplir.',
    'No llenamos los textos de mayúsculas ni de signos de exclamación.',
    'No explicamos con aire de superioridad: nadie nació sabiendo de packaging.',
  ],
  ejemplos: [
    {
      antes: 'Pedido mínimo de 500 unidades por referencia.',
      despues: 'Empieza con 25 cajas. Cuando crezcas, el precio baja contigo.',
    },
    {
      antes: 'Su solicitud ha sido recibida y será procesada.',
      despues: '¡Listo! Ya tenemos tu pedido y lo estamos preparando con cuidado.',
    },
    {
      antes: 'Cartón corrugado de pared sencilla, flauta B, ECT 32.',
      despues: 'Cartón resistente y liviano, ideal para tus envíos de todos los días.',
    },
  ],
};
