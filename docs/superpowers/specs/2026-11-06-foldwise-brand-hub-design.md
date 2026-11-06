# Foldwise — Hub de marca (prueba de concepto) · Documento de diseño

Fecha: 2026-11-06 · Estado: borrador para aprobación

## 1. Intención y porqué

ebiopacking (fabricante con materiales, maquinaria y experiencia en cartón corrugado) quiere lanzar una **marca nueva, totalmente desligada de su nombre**, para vender cajas de cartón corrugado preformadas (con pliegues marcados para armar) en el **mercado estadounidense**, donde ven gran demanda.

Simian presentará en una **reunión la próxima semana** los entregables de marca terminados. El objetivo de la reunión es que el cliente salga convencido de lo que Simian puede hacer y **les adjudique el proyecto completo de creación de marca**. Por lo tanto, cada pieza debe verse terminada, premium y real, y cada decisión debe venir acompañada de su porqué.

Todo es una **propuesta sujeta a aprobación**: nombre, colores y logo pueden pivotear.

## 2. Metas, no-metas y anti-metas

**Metas**
- Una identidad completa y coherente para Foldwise: nombre, logo, isotipo, logo animado, paleta, tipografía, íconos, patrones, tono de voz y la marca aplicada en contexto.
- Un sitio e-commerce de muestra, premium e interactivo, con microinteracciones, que deje ver hacia dónde va la marca (en el futuro será un e-commerce real).
- Despieces y guías de armado paso a paso para las cajas.
- Todo navegable desde un solo hub, para recorrerlo en pantalla durante la reunión.

**No-metas**
- No es un e-commerce funcional: no hay carrito, pagos, inventario, login ni backend.
- No es una presentación ni un deck. Los entregables son el producto final.
- No se publica por ahora (corre en local).
- Las páginas Nosotros, Contacto y Blog quedan solo como enlaces, sin desarrollar.

**Anti-metas** (sería un fracaso aunque funcione)
- Que se parezca a Packbox, Starbucks o cualquier referencia, en particular el verde bosque con amarillo de Packbox.
- Que se sienta como Uline: catálogo industrial, frío o de bodega.
- Que se sienta condescendiente con el negocio pequeño ("para negocitos").
- Que alguna pieza se vea como borrador o maqueta a medias.
- Que haya alguna relación visible con el nombre ebiopacking.

## 3. Restricciones

- **Plazo:** reunión la próxima semana.
- **Idioma:** **todo en español**, incluido el sitio e-commerce y los textos de marca. Si el cliente lo pide, más adelante se pasa a inglés. El nombre "Foldwise" se mantiene.
- **Stack:** Astro (estático) + GSAP para animaciones. La preferencia general de Simian es Next.js, pero Astro se aceptó para este concepto. Ejecución local, sin publicar.
- **Imágenes:** el cliente no tiene fotos. Se usan fotos libres de Unsplash y Pexels (estilo de vida, emprendedores empacando, contexto) y cajas isométricas en SVG hechas con la skill Anatomy (producto, despieces, guías y animaciones).
- **Referencias del usuario** (carpeta del proyecto):
  - `website/`: Packbox como referencia de **estructura** de e-commerce (header con buscador, navegación por sectores, catálogo con filtros laterales, ficha con selector de tamaño y cantidad y precio por unidad, tarjetas redondeadas, fotos de producto sobre fondo neutro). Se toma la estructura, no el estilo.
  - `deseables/`: despieces y troqueles, mockups de cajas con marca (mailer con mensaje interior, muro de cajas de colores), manual de marca editorial tipo Cannify, y la caja isométrica de Anatomy que se abre "como la recibe el cliente".
  - `inspiración/`: brand boards (Verde, Luné, Starbucks, Norva) como referencia del **tipo de entregable** ("marca en acción"), no del estilo.

### Orden de prioridad (fecha de reunión sin definir: construir en este orden para que siempre haya algo presentable)
1. Identidad central: logo, logo animado, paleta, tipografía y tono
2. Home del sitio con la caja interactiva
3. Lámina "marca en acción"
4. Manual de marca
5. Catálogo y ficha del Mailer Box, con su despiece y su guía de armado
6. Renders de las 12 cajas y el conjunto (mínimo aceptable: 6)
7. Guías de armado de Shipping Box y Easy-Fold Mailer, y ficha de Shipping Box
8. Exportación PDF (puede entregarse después de la reunión)

## 4. Decisiones tomadas (por el usuario)

### 4.1 Posicionamiento
- **Cliente objetivo:** pymes, pequeños comerciantes y tiendas en línea.
- **Diferenciales:** precio competitivo, pedidos pequeños, entrega rápida, atención personalizada, personalización (logo o identificativo del comerciante) y productos a la medida.
- **Posición:** entre Uline (catálogo amplio y sólido) y marcas cercanas para emprendedores, con la solidez del catálogo y la calidez del "hazla tuya".

### 4.2 Nombre
- **Foldwise** = *fold* (doblar) + *-wise* (con inteligencia). "Doblar con inteligencia": el producto se arma con pliegues claros, y *wise* evoca al asesor que te orienta (atención personalizada, cajas a la medida).
- Alternativa descartada, documentada para el cliente: **Ridgeline** (por las crestas del corrugado; choca con la camioneta Honda Ridgeline).
- **Riesgo pendiente:** existe la solicitud USPTO "FOLDWISE" (serial 99663592, febrero de 2026, clase sin confirmar) y el registro "F FOLDWISE" (clase 20, muebles). Hay que verificarlo antes de la aprobación final. Una salida posible: "Foldwise Box Co." o "Foldwise Packaging". Esto se deja anotado en el manual como pendiente.

### 4.3 Personalidad y tono
- **Rol:** el aliado de packaging de los negocios que están arrancando. Promesa emocional: *ser pequeño no te hace cliente secundario*.
- **Rasgos:** amigable, cercana, joven, vibrante, con atención personalizada.
- **Principio visual:** base premium y acento vibrante, en proporción **80% calma premium y 20% energía**. El acento aparece donde hay acción o emoción.

### 4.4 Paleta (opción B, "Plum & Lime", ajustable)
| Rol | Nombre | Hex |
|---|---|---|
| Base | Crema | `#F6F1E7` |
| Base / material | Kraft | `#C9A27A` |
| Principal | Ciruela | `#3A1D3F` |
| Acento vibrante | Lima | `#C8F25A` |

Los tonos de apoyo usados en el prototipo (ciruela claro `#5A3360`, ciruela sombra `#2A1430`, kraft claro `#E2C7A0` y kraft sombra `#A9845E`) son una propuesta mía y se pueden refinar.

### 4.5 Logo e isotipo
- **Isotipo:** la "f" minúscula dibujada como despiece de caja, con **solapas con chaflán** de troquel (variante 3) y **líneas de pliegue punteadas** donde las solapas se unen al tronco.
- Geometría de referencia (viewBox 0 0 46 46), aprobada visualmente:
  - Forma: `M15 42V27h-5l-2-2v-4l2-2h5V4h16l5 5v3H25v7h6l2 2v4l-2 2h-6v15z`
  - Pliegues: `M25 4v8 M15 19v8 M25 19v8` (punteados)
- **Logotipo:** "foldwise" en minúsculas, peso extra bold, con interletrado ajustado.
- Versiones: sobre crema (ciruela con pliegues lima), sobre ciruela (crema con pliegues ciruela), sobre kraft y sobre lima.
- Los bocetos están en `.superpowers/brainstorm/*/content/logo-dieline-f-v2.html`.

### 4.6 Logo animado (aprobado como idea, pliegue estilizado)
Ciclo de unos 7 s:
1. Aparece la f plana y se dibujan los pliegues lima.
2. Las tres solapas se doblan sobre el tronco, de forma escalonada y con un leve giro 3D.
3. La f se transforma en una caja isométrica, con un rebote.
4. Se dibuja la cinta lima sobre la tapa y aparece el isotipo en el costado.
5. Vuelve a la f.

Es **estilizado**: no pretende ser un despiece geométricamente real. El prototipo validado está en `.superpowers/brainstorm/*/content/logo-anim-proto.html` y es desechable, así que la versión final se reconstruye pulida. Usos: intro y carga del sitio, hover del logo en el header, firma del manual. Para redes se puede exportar como video (opcional, si da el tiempo).

### 4.7 Catálogo: 12 categorías (curaduría sobre Uline, sin madera)
1. Shipping Boxes (caja clásica)
2. Heavy Duty Boxes
3. Mailer Boxes
4. Easy-Fold Mailers
5. Lightweight Boxes
6. Multi-Depth Boxes
7. Storage & File Boxes
8. Moving Boxes
9. Side Loader Boxes
10. Wine & Bottle Shippers
11. Retail & Gift Boxes
12. Apparel Boxes

Se excluyeron, con justificación: Wood Crates (pedido del usuario), Hazmat (requiere certificación), Insulated (no es solo corrugado), Corrugated Pads (no es caja), Bulk Cargo (industrial). Los nombres de categoría se traducen al español en el sitio (ver §6).

### 4.8 Sitio e-commerce (alcance aprobado)
- **Home:** hero con una caja Foldwise isométrica interactiva que se abre, propuesta de valor, las 12 categorías y la sección "hecho para los que están arrancando".
- **Catálogo:** las 12 categorías con filtros simples.
- **Ficha de producto:** una o dos completas, con selector de tamaño y cantidad, precio por unidad, vista previa "tu logo aquí" y el despiece.
- **Guía de armado:** la caja plegándose paso a paso (Anatomy).
- **Sin carrito.** Nosotros, Contacto y Blog quedan como enlaces muertos.
- Premium, interactivo y con microinteracciones. Estructura inspirada en Packbox.

### 4.9 Formato: hub de marca
Un solo sitio local con dos puertas:
- **"La marca":** manual (nombre e historia, logo y animación, paleta, tipografía, íconos, patrones, tono de voz), lámina de "marca en acción" y fotos de las cajas con la marca.
- **"El sitio":** el e-commerce navegable. Las fichas de producto enlazan a despieces y guías.
- El manual y el catálogo deben poder **exportarse a PDF** para dejárselos al cliente después de la reunión.

## 5. Inventario de entregables

| # | Entregable | Dónde vive |
|---|---|---|
| E1 | Nombre y su racional (más la alternativa Ridgeline y la nota legal) | Hub › La marca |
| E2 | Logo, isotipo, versiones, zona de protección, tamaños mínimos y usos incorrectos | Hub › La marca |
| E3 | Logo animado | Hub (intro y header) y manual |
| E4 | Paleta con hex, RGB y CMYK, y proporción 80/20 | Manual |
| E5 | Tipografía (titulares y texto) con jerarquía | Manual |
| E6 | Set de íconos propios | Manual y sitio |
| E7 | Patrones y gráficos de marca | Manual y aplicaciones |
| E8 | Tono de voz: principios, lo que sí y lo que no, ejemplos y taglines | Manual |
| E9 | Lámina "marca en acción" (formato brand board) | Hub › La marca |
| E10 | Cajas con la marca: render de cada una de las 12 + conjunto de todas juntas | Hub y sitio |
| E11 | Despieces (troqueles) | Fichas y manual |
| E12 | Guías de armado paso a paso | Sitio › Guía de armado |
| E13 | Sitio e-commerce (Home, Catálogo, Ficha, Guía) | Hub › El sitio |
| E14 | Exportación PDF del manual y del catálogo | Archivo |

## 6. Decisiones del builder (mis propuestas, revisables)

- **Tipografía:** titulares en **Bricolage Grotesque** (la usada en los bocetos, con carácter juvenil). Para texto, una sans neutra y legible (propuesta: Figtree o DM Sans). Las dos son de Google Fonts.
- **Taglines en español (propuesta):** principal *"Pedidos pequeños. Cuidado enorme."*; secundaria *"Tu aliado de packaging desde la primera caja."*
- **Nombres de categoría en español:** p. ej. "Cajas de envío", "Cajas reforzadas", "Cajas mailer", "Mailers fáciles de armar", "Cajas livianas", "Cajas multi-altura", "Cajas de archivo", "Cajas de mudanza", "Cajas de carga lateral", "Cajas para vino y botellas", "Cajas de regalo y retail", "Cajas para ropa".
- **Profundidad de despieces y guías:** despiece SVG (simplificado) para las 12 categorías, y guía de armado **completa paso a paso para 3**: Mailer Box, Shipping Box y Easy-Fold Mailer. Fichas completas: Mailer Box (la estrella) y Shipping Box.
- **"Fotos" de cajas con marca (E10):** para garantizar consistencia y que el logo se vea perfecto, las cajas con marca son **renders isométricos SVG (Anatomy)** con estética de foto de producto (fondo crema, sombra suave). Las fotos de Unsplash y Pexels se usan para estilo de vida y contexto, sin superponer el logo sobre fotos reales.
- **Aplicaciones en la lámina "marca en acción" (E9):** mailer box con mensaje interior, caja de envío kraft con banda, cinta de embalaje lima, tarjeta de agradecimiento, sticker o sello, tarjeta de presentación, post de redes y vehículo o furgoneta de reparto.
- **Íconos y patrones:** íconos de línea redondeada con un detalle de pliegue punteado. Patrones a partir de líneas de troquel punteadas y de la onda del corrugado (flauta).
- **Datos de producto:** el cliente no entregó fichas técnicas, así que tamaños, tipos de flauta (B, C, E, BC), resistencias (ECT 32/44, burst) y medidas se toman de **estándares comunes del mercado estadounidense** (Uline como referencia), con unidades en pulgadas. Son plausibles y coherentes para que un fabricante no detecte errores, pero quedan marcados como datos de muestra.
- **Precios de muestra:** ilustrativos en USD, con lógica de precio por volumen visible.
- **Direcciones exploradas:** el manual incluye una sección breve de "Direcciones exploradas" con las otras paletas (A, C), los otros conceptos de isotipo (Fold, Flute) y Ridgeline, para mostrar el proceso y reforzar que todo está sujeto a aprobación.
- **Presencia de Simian:** discreta. Un crédito "Propuesta de marca por Simian" en la entrada del hub y en la portada o colofón del PDF, y un cierre breve de "Próximos pasos" al final del manual. Nada de formato deck.
- **Entorno de presentación:** se asume laptop o proyector en escritorio (diseño primario a 1440 px, responsive hasta móvil). **Todo se empaqueta en local** (fuentes, fotos, scripts) para no depender de internet. Las animaciones deben ir fluidas en una laptop común.
- **Tono del copy:** tuteo, frases cortas, celebra al emprendedor y explica lo técnico simple. Sin jerga de bodega ni condescendencia.

## 7. Abierto para el builder

- Arquitectura del proyecto Astro, componentes y organización.
- Detalle de microinteracciones (hover, scroll, transiciones), siempre que respeten el 80/20 y se sientan premium.
- Selección concreta de fotos de Unsplash y Pexels.
- Método de exportación a PDF.
- Exportar el logo animado a video para redes (opcional).
