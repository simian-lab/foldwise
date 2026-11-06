# Foldwise Brand Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, Spanish-language "Foldwise" brand hub (brand manual + brand-in-action board + branded box renders + a premium interactive e-commerce sample with dielines and assembly guides) to win the full branding project from the client.

**Architecture:** One static Astro site in `foldwise-hub/` with two doors: `/marca` (brand) and `/tienda` (e-commerce sample). Brand data (palette, categories, specs, prices, dielines) lives in typed TS modules under `src/data/`; every visual is an Astro component driven by that data. Isometric boxes, dielines and assembly guides are hand-built SVG (Anatomy skill); motion is GSAP with a `prefers-reduced-motion` fallback.

**Tech Stack:** Astro 5, TypeScript, GSAP 3.12, Vitest 2, Playwright 1.4x, Google Fonts self-hosted (Bricolage Grotesque, Figtree).

**Spec:** `docs/superpowers/specs/2026-11-06-foldwise-brand-hub-design.md` (read it fully before any task; it holds the "why" for every decision).

## Global Constraints

- All user-facing copy in **Spanish** (neutral, tuteo). Only the name "Foldwise" stays English. The string "ebiopacking" must never appear in the built site.
- Palette tokens, exact: crema `#F6F1E7`, kraft `#C9A27A`, ciruela `#3A1D3F`, lima `#C8F25A`; support: ciruela claro `#5A3360`, ciruela sombra `#2A1430`, kraft claro `#E2C7A0`, kraft sombra `#A9845E`.
- Visual rule **80% calma premium / 20% energía**: lime appears only on actions, highlights, fold lines, tape, celebrations.
- Isotype path (viewBox `0 0 46 46`), exact: `M15 42V27h-5l-2-2v-4l2-2h5V4h16l5 5v3H25v7h6l2 2v4l-2 2h-6v15z`; fold lines (dashed): `M25 4v8 M15 19v8 M25 19v8`.
- Wordmark: "foldwise", lowercase, Bricolage Grotesque 800, letter-spacing `-0.035em`.
- Fonts: Bricolage Grotesque (display), Figtree (text), self-hosted in `public/fonts/`.
- Taglines: principal "Pedidos pequeños. Cuidado enorme."; secundaria "Tu aliado de packaging desde la primera caja."
- Everything bundled locally: zero runtime requests to external hosts (fonts, images, scripts).
- No cart, no checkout, no login, no backend. Nosotros / Contacto / Blog are `href="#"` links.
- Product data: US-standard sizes in inches, flute types (B, C, E, BC), ECT 32/44; prices are illustrative USD; product pages show a small "Datos de muestra" note.
- Layout primary target 1440 px desktop; must work down to 375 px without horizontal scroll.
- Simian presence: discreet credit "Propuesta de marca por Simian" on hub entry and PDF cover; "Próximos pasos" closing in manual.
- Build order follows the spec's priority list; after each task the hub must still build and be presentable.
- Any task drawing isometric boxes, dielines or assembly steps MUST load the `anatomy` skill first.

## Review Focus

1. **Reduced motion:** with `prefers-reduced-motion: reduce`, the animated logo and hero box show a static final state and all content is readable → tests in Task 3 and Task 5.
2. **Offline meeting:** with network blocked except localhost, every page renders with correct fonts and images → test in Task 1 (helper) applied in Task 12.
3. **Quantity input abuse:** a quantity below the minimum, empty, non-numeric or absurdly large must clamp to `[minUnits, 100000]` and never show `NaN` → tests in Task 2 and Task 8.
4. **"Tu logo aquí" upload:** a non-image file or a file over 5 MB shows a Spanish message and keeps the default preview; PNG/JPG/SVG replace the preview → test in Task 8.
5. **Phone width:** at 375 px no page has horizontal scroll → test in Task 12 across all routes.

---

## File Structure

```
foldwise-hub/
  astro.config.mjs, package.json, tsconfig.json, vitest.config.ts, playwright.config.ts
  public/fonts/            self-hosted woff2
  public/img/              downloaded Unsplash/Pexels photos + CREDITS.md
  src/styles/tokens.css    CSS custom properties (palette, type scale, radii, spacing)
  src/styles/global.css    resets, base typography, print styles
  src/data/brand.ts        palette, taglines, voice principles
  src/data/categories.ts   the 12 categories with specs, sizes, tiers
  src/data/pricing.ts      clampQuantity, unitPrice, orderTotal
  src/data/dielines.ts     dieline geometry per category
  src/data/guides.ts       assembly steps for 3 boxes
  src/components/brand/    Isotype, Wordmark, AnimatedLogo, Icon, Pattern, Swatch
  src/components/boxes/    IsoBox, Dieline, AssemblyGuide, BoxLineup
  src/components/site/     ShopHeader, ShopFooter, CategoryCard, Configurator, LogoPreview, HeroBox
  src/components/hub/      HubNav, Section
  src/scripts/             animated-logo.ts, hero-box.ts, configurator.ts, guide.ts
  src/layouts/             HubLayout.astro, ShopLayout.astro
  src/pages/index.astro                     hub entry (two doors)
  src/pages/marca/index.astro               brand manual
  src/pages/marca/en-accion.astro           brand-in-action board
  src/pages/marca/cajas.astro               12 branded renders + lineup
  src/pages/tienda/index.astro              shop home
  src/pages/tienda/catalogo.astro           catalog
  src/pages/tienda/producto/[slug].astro    PDP (full for mailer, shipping)
  src/pages/tienda/guia/[slug].astro        assembly guide (mailer, shipping, easy-fold)
  scripts/export-pdf.ts                     Playwright PDF export
  tests/unit/*.test.ts                      Vitest
  tests/e2e/*.spec.ts                       Playwright
```

---

### Task 1: Scaffold, tokens, fonts, test harness

**Files:**
- Create: everything under `foldwise-hub/` config, `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/HubLayout.astro`, `src/pages/index.astro` (placeholder with Spanish title), `tests/e2e/helpers.ts`, `tests/e2e/smoke.spec.ts`, `.gitignore` (include `node_modules`, `dist`, `.superpowers/`)

**Interfaces:**
- Produces: CSS vars `--c-crema --c-kraft --c-ciruela --c-lima --c-ciruela-claro --c-ciruela-sombra --c-kraft-claro --c-kraft-sombra --f-display --f-text`; `HubLayout` props `{ title: string; description?: string }`; test helper `blockExternal(page: Page): Promise<string[]>` returning the list of blocked external URLs.

- [ ] **Step 1:** `git init` at project root; scaffold with `npm create astro@latest foldwise-hub -- --template minimal --typescript strict --no-git --install`; add `gsap@3.12.5`, `vitest@2`, `@playwright/test`; `npx playwright install chromium`.
- [ ] **Step 2:** Download Bricolage Grotesque (500/700/800) and Figtree (400/500/600/700) woff2 into `public/fonts/`, declare `@font-face` in `global.css`.
- [ ] **Step 3: Write failing test** `tests/e2e/smoke.spec.ts`:
  ```ts
  test('hub entry renders offline', async ({ page }) => {
    const blocked = await blockExternal(page);
    await page.goto('/');
    await expect(page).toHaveTitle(/Foldwise/);
    expect(await page.evaluate(() => document.fonts.check('800 32px "Bricolage Grotesque"'))).toBe(true);
    expect(blocked).toEqual([]);
  });
  ```
- [ ] **Step 4:** Run `npx playwright test smoke` → FAIL (no title/fonts).
- [ ] **Step 5:** Implement tokens, `HubLayout`, placeholder index. `playwright.config.ts` uses `webServer: npm run preview` after `npm run build`.
- [ ] **Step 6:** Run `npm run build && npx playwright test smoke` → PASS.
- [ ] **Step 7:** Commit `chore: scaffold foldwise hub with tokens, fonts and test harness`.

### Task 2: Brand and catalog data, pricing

**Files:**
- Create: `src/data/brand.ts`, `src/data/categories.ts`, `src/data/pricing.ts`, `tests/unit/pricing.test.ts`, `tests/unit/categories.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type BoxStyle = 'rsc' | 'mailer' | 'easyfold' | 'multidepth' | 'file' | 'sideloader' | 'wine' | 'retail' | 'apparel';
  interface PriceTier { minQty: number; unitPrice: number }        // USD
  interface Category {
    slug: string; nameEs: string; shortEs: string; ulineRef: string;
    style: BoxStyle; flute: 'B'|'C'|'E'|'BC'; ect: 32|44;
    sizes: { code: string; l: number; w: number; h: number }[];   // inches
    minUnits: number; tiers: PriceTier[]; featured: boolean;       // featured = full PDP
  }
  export const categories: Category[];                              // exactly 12, spec §4.7 order
  export function getCategory(slug: string): Category | undefined;
  export function clampQuantity(raw: unknown, min: number): number; // NaN/empty→min, <min→min, >100000→100000, floors decimals
  export function unitPrice(tiers: PriceTier[], qty: number): number;
  export function orderTotal(tiers: PriceTier[], qty: number): number; // rounded to cents
  ```
  `brand.ts` exports `palette`, `taglines`, `voice` (`{ si: string[]; no: string[]; ejemplos: {antes: string; despues: string}[] }`).
- Slugs, in order: `cajas-de-envio, cajas-reforzadas, cajas-mailer, mailers-faciles, cajas-livianas, cajas-multi-altura, cajas-de-archivo, cajas-de-mudanza, cajas-carga-lateral, cajas-vino-botellas, cajas-regalo-retail, cajas-ropa`. `featured: true` only for `cajas-mailer` and `cajas-de-envio`. Spanish names per spec §6.

- [ ] **Step 1: Write failing tests:**
  - `categories has 12 unique slugs in spec order`; `heavy duty uses ect 44 and flute BC`; every category has ≥3 sizes, ascending tiers, `minUnits >= 1`; no field contains "ebiopacking".
  - `clampQuantity('', 25) === 25`, `clampQuantity('abc', 25) === 25`, `clampQuantity(10, 25) === 25`, `clampQuantity(1e9, 25) === 100000`, `clampQuantity('120.7', 25) === 120`.
  - With tiers `[{minQty:25,unitPrice:1.85},{minQty:100,unitPrice:1.37},{minQty:500,unitPrice:0.98}]`: `unitPrice(t,99)===1.85`, `unitPrice(t,100)===1.37`, `orderTotal(t,500)===490`.
- [ ] **Step 2:** `npx vitest run` → FAIL.
- [ ] **Step 3:** Implement. Sizes/specs from common US standards (e.g. mailer 9×6×4, 12×9×4, 14×10×4; RSC 12×12×12, 16×12×12, 18×18×16). Use the spec's datos-de-muestra rule.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat: add brand, catalog and pricing data`.

### Task 3: Isotype, wordmark, animated logo

**Files:**
- Create: `src/components/brand/Isotype.astro`, `Wordmark.astro`, `AnimatedLogo.astro`, `src/scripts/animated-logo.ts`, `tests/e2e/logo.spec.ts`
- Reference (do not ship): `.superpowers/brainstorm/54035-1793974363/content/logo-anim-proto.html` (approved motion), `logo-dieline-f-v2.html` (variant "f-tuck")

**Interfaces:**
- Produces: `<Isotype variant="crema|ciruela|kraft|lima" size={number} />` (variant = background it sits on; colors per spec §4.5); `<Wordmark variant size withIsotype />`; `<AnimatedLogo size={number} loop={boolean} trigger="load|hover|view" />` rendering `[data-animated-logo]`; `initAnimatedLogo(el: HTMLElement, opts): gsap.core.Timeline`.

- [ ] **Step 1: Write failing tests:** isotype `path` `d` attribute equals the Global Constraints path exactly; fold lines present with dashed stroke; with `reducedMotion: 'reduce'` the `[data-animated-logo]` shows the static isotype (no running timeline, `data-state="static"`); with motion allowed it reaches `data-state="box"` within 3 s.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Load `anatomy` skill. Rebuild the approved sequence in GSAP (stylized fold, 3 flaps staggered, 3D tilt, morph to isometric box with overshoot, lime tape draws, isotype on side, return), ~7 s loop, setting `data-state` at `flat|folding|box`. Polish easing and shading beyond the prototype; same story.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add isotype, wordmark and animated logo`.

### Task 4: Isometric box renderer

**Files:**
- Create: `src/components/boxes/IsoBox.astro`, `tests/e2e/isobox.spec.ts`, temp test page `src/pages/_dev/boxes.astro` (excluded from nav; deleted in Task 12)

**Interfaces:**
- Consumes: `Category`, `BoxStyle` (Task 2), `Isotype` (Task 3).
- Produces: `<IsoBox style={BoxStyle} l w h colorway="kraft|ciruela|crema|blanco" branding="foldwise|cliente|none" open={boolean} clientLogo?={string} />` rendering an SVG with `data-style`, proportions from l/w/h, four-tone shading, painter's order correct; `branding="cliente"` shows a "Tu logo aquí" mark or `clientLogo` URL on the front face.

- [ ] **Step 1: Write failing test:** `_dev/boxes` renders 12 `svg[data-style]` (one per category) with non-zero bounding boxes and no console errors; `open` mailer shows inner face element `[data-part="lid-inner"]`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Load `anatomy` skill; implement per style (mailer with tuck lid, RSC with flaps/tape seam, wine with dividers, side loader opening, file box handle cutouts, etc.).
- [ ] **Step 4:** Run → PASS. Visually check `_dev/boxes` screenshot.
- [ ] **Step 5:** Commit `feat: add isometric box renderer`.

### Task 5: Shop shell and home with interactive hero box

**Files:**
- Create: `src/layouts/ShopLayout.astro`, `src/components/site/ShopHeader.astro`, `ShopFooter.astro`, `CategoryCard.astro`, `HeroBox.astro`, `src/scripts/hero-box.ts`, `src/components/brand/Icon.astro` (contract in Task 7), `src/pages/tienda/index.astro`, `tests/e2e/shop-home.spec.ts`; photos into `public/img/` + `public/img/CREDITS.md`

**Interfaces:**
- Consumes: `categories`, `taglines`, `AnimatedLogo`, `IsoBox`.
- Produces: `ShopLayout` props `{ title: string }`; header includes AnimatedLogo (`trigger="hover"`), search field (visual only), category nav, links Nosotros/Contacto/Blog `#`; `CategoryCard` props `{ category: Category }` linking to `/tienda/producto/{slug}` when `featured`, else `/tienda/catalogo#{slug}`.

- [ ] **Step 1: Write failing tests:** home shows H1 containing "Pedidos pequeños. Cuidado enorme."; 12 category cards; hero box `[data-hero-box]` toggles `data-open="true"` on click and on scroll into view; with reduced motion it renders open and static; section "Hecho para los que están arrancando" present; no "carrito" text or cart icon.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with Packbox-like structure (spec §3), Foldwise palette, 80/20. Hero box: mailer opens revealing tissue, thank-you card "¡Gracias por apoyar lo pequeño!" and product. Microinteractions: card hover lift + lime fold-corner, button press, scroll reveals.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add shop home with interactive hero box`.

### Task 6: Brand-in-action board

**Files:**
- Create: `src/pages/marca/en-accion.astro`, `src/components/brand/Swatch.astro`, `src/components/brand/Pattern.astro`, `tests/e2e/board.spec.ts`

**Interfaces:**
- Consumes: `palette`, `taglines`, `voice`, `Wordmark`, `Isotype`, `IsoBox`.
- Produces: `<Pattern kind="troquel|flauta" color bg />` (tileable SVG), `<Swatch name hex />` (also used by Task 7).

- [ ] **Step 1: Write failing test:** board contains sections Paleta, Tipografía, Logo, Patrones e íconos, Aplicaciones, Voz de marca; 4 primary swatches with exact hexes; 8 applications (mailer with inner message, kraft shipping box with band, lime tape, thank-you card, sticker, business card, social post, delivery van).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement as one brand-board composition (inspiración folder = format reference). Applications are SVG mockups; the social post may use a photo from `public/img`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add brand-in-action board`.

### Task 7: Brand manual

**Files:**
- Create: `src/pages/marca/index.astro`, `src/components/hub/Section.astro`, `tests/e2e/manual.spec.ts` (Icon already exists from Task 5; complete the full set here)

**Interfaces:**
- Consumes: Tasks 2, 3, 6.
- Produces: `<Icon name="envio|personaliza|rapido|asesoria|pedido-pequeno|eco|medida|armado" size />` (rounded line, 2 px stroke, with dashed fold detail); `Section` props `{ id: string; num: string; title: string }`.

- [ ] **Step 1: Write failing test:** manual has sections in order: 01 La marca (historia, porqué del nombre, posicionamiento), 02 Nombre (Foldwise, Ridgeline descartado, nota legal USPTO serial 99663592), 03 Logo (versiones, zona de protección, tamaño mínimo, usos incorrectos), 04 Logo animado, 05 Color (hex/RGB/CMYK, regla 80/20), 06 Tipografía, 07 Íconos, 08 Patrones, 09 Voz de marca, 10 Direcciones exploradas, 11 Próximos pasos; credit "Propuesta de marca por Simian"; print stylesheet hides nav.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement as editorial manual (Cannify reference in `deseables/`). "Direcciones exploradas" shows palettes A/C and isotypes Fold/Flute from the brainstorm files, rebuilt as components.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add brand manual`.

### Task 8: Catalog and Mailer PDP

**Files:**
- Create: `src/pages/tienda/catalogo.astro`, `src/pages/tienda/producto/[slug].astro`, `src/components/site/Configurator.astro`, `LogoPreview.astro`, `src/scripts/configurator.ts`, `tests/e2e/pdp.spec.ts`

**Interfaces:**
- Consumes: `categories`, `clampQuantity`, `unitPrice`, `orderTotal`, `IsoBox`, `Dieline` (placeholder slot until Task 9).
- Produces: `getStaticPaths` only for `featured` categories; Configurator DOM contract: `select[name=size]`, `input[name=qty]`, `[data-unit-price]`, `[data-total]`, `input[type=file][name=logo]`, `[data-logo-error]`.

- [ ] **Step 1: Write failing tests:** catalog lists 12 with simple filters (estilo, uso) that hide non-matching cards; mailer PDP: qty `99` → unit `$1.85`; qty `100` → `$1.37`; qty `''`/`'abc'`/`5` → clamps to min; qty `1e9` → `100000`; no `NaN` ever; uploading `logo.png` updates preview; uploading `.txt` or a >5 MB file shows "Sube una imagen PNG, JPG o SVG de hasta 5 MB." and keeps default; "Datos de muestra" note visible; primary CTA is "Solicitar cotización" (no cart).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement (prices formatted `es-US` USD). Logo preview uses `URL.createObjectURL` into `IsoBox clientLogo`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add catalog and mailer product page`.

### Task 9: Dielines (12) and Mailer assembly guide

**Files:**
- Create: `src/data/dielines.ts`, `src/data/guides.ts`, `src/components/boxes/Dieline.astro`, `AssemblyGuide.astro`, `src/scripts/guide.ts`, `src/pages/tienda/guia/[slug].astro`, `tests/unit/dielines.test.ts`, `tests/e2e/guide.spec.ts`; Modify: PDP to show `Dieline`

**Interfaces:**
- Produces: `interface DielineData { style: BoxStyle; cuts: string[]; folds: string[]; viewBox: string }` (SVG path strings; cuts solid, folds dashed in red per industry convention, legend in Spanish); `getDieline(style: BoxStyle): DielineData`; `interface GuideStep { n: number; titulo: string; texto: string; pose: string }`; `guides: Record<'cajas-mailer'|'cajas-de-envio'|'mailers-faciles', GuideStep[]>`.

- [ ] **Step 1: Write failing tests:** every `BoxStyle` used by the 12 categories has dieline data with ≥1 cut and ≥1 fold; mailer guide has 5–7 steps; guide page has prev/next controls and keyboard arrows advance; each step animates the isometric box to its `pose`; reduced motion jumps between poses.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Load `anatomy` skill. Dielines based on `deseables/` references (FEFCO-like structures). Mailer guide steps: desplegar, doblar laterales, levantar paredes, encajar solapas, colocar producto, cerrar la tapa.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add dielines and mailer assembly guide`.

### Task 10: Branded box renders and lineup

**Files:**
- Create: `src/pages/marca/cajas.astro`, `src/components/boxes/BoxLineup.astro`, `tests/e2e/cajas.spec.ts`

**Interfaces:**
- Consumes: `categories`, `IsoBox`.
- Produces: `<BoxLineup />` (all 12 composed together, product-photo style on crema, soft shadows; reused on shop home "Toda la familia").

- [ ] **Step 1: Write failing test:** page shows 12 renders each captioned with Spanish name and size, plus the lineup; each render uses Foldwise branding with varied colorways (kraft majority, ciruela and crema accents).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Load `anatomy` skill; implement. Minimum acceptable per spec: 6 if time is short (keep the data-driven loop so remaining ones are just data).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add branded box renders and lineup`.

### Task 11: Shipping Box PDP and remaining guides

**Files:**
- Modify: `src/data/guides.ts`, PDP and guide pages only if needed (data-driven)
- Test: extend `tests/e2e/pdp.spec.ts`, `tests/e2e/guide.spec.ts`

- [ ] **Step 1: Write failing tests:** `/tienda/producto/cajas-de-envio` renders configurator with its own tiers; guides for `cajas-de-envio` and `mailers-faciles` have 5–7 steps each and run.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add data and any missing poses.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add shipping box page and remaining assembly guides`.

### Task 12: Hub entry, cross-navigation, global checks, PDF export

**Files:**
- Modify: `src/pages/index.astro`; Create: `src/components/hub/HubNav.astro`, `scripts/export-pdf.ts`, `tests/e2e/global.spec.ts`; Delete: `src/pages/_dev/`

**Interfaces:**
- Produces: `npm run export:pdf` → `exports/foldwise-manual.pdf`, `exports/foldwise-catalogo.pdf`.

- [ ] **Step 1: Write failing tests** in `global.spec.ts`, looping all routes (`/`, `/marca`, `/marca/en-accion`, `/marca/cajas`, `/tienda`, `/tienda/catalogo`, both PDPs, three guides): offline via `blockExternal` → `[]`; at 375 px `document.documentElement.scrollWidth <= 375`; no console errors; HTML has no "ebiopacking" (case-insensitive); hub entry shows AnimatedLogo, two doors "La marca" / "El sitio", and "Propuesta de marca por Simian".
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement hub entry and `HubNav` (persistent switch between doors); `export-pdf.ts` with Playwright `page.pdf` (A4 landscape for manual, print CSS).
- [ ] **Step 4:** Run full suite `npx vitest run && npm run build && npx playwright test` → PASS; run `npm run export:pdf` → two non-empty PDFs.
- [ ] **Step 5:** Commit `feat: add hub entry, global checks and pdf export`.
