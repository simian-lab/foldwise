/**
 * Exports the brand manual and the catalog to PDF.
 *
 * Builds nothing: it expects a server already running (`npm run preview`
 * after `npm run build`, or `npm run dev`) on PORT (default 4321), then writes
 *   exports/foldwise-manual.pdf   (/marca, A4 landscape)
 *   exports/foldwise-catalogo.pdf (/tienda/catalogo, A4 landscape)
 *
 * Pages render with reduced motion, so every animated logo is printed in its
 * final static state instead of being caught mid-fold.
 *
 * Run: PORT=4321 npm run export:pdf
 */
import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 4321);
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = resolve(process.cwd(), 'exports');

const JOBS = [
  // The manual ships its own print layout (one chapter per sheet).
  { route: '/marca', file: 'foldwise-manual.pdf', scale: 1 },
  // The catalog is a screen page: print it smaller so it keeps its desktop grid.
  { route: '/tienda/catalogo', file: 'foldwise-catalogo.pdf', scale: 0.72 },
] as const;

/** Print-only fixes: drop screen chrome and keep figures whole across pages. */
const PRINT_CSS = `
  astro-dev-toolbar { display: none !important; }
  @media print {
    [data-hub-nav], [data-manual-nav] { display: none !important; }
    figure, img, [data-render], [data-category-card] { break-inside: avoid; }
    h2, h3 { break-after: avoid; }
  }
`;

async function serverUp(): Promise<boolean> {
  try {
    const res = await fetch(BASE, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Loads every image before printing: lazy images are switched to eager (print
 * layout never scrolls them into view) and the page is scrolled once, then we
 * wait until each image has decoded, so no photo prints as a blank box.
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
      img.loading = 'eager';
    });
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      [...document.images].map((img) => (img.complete ? img.decode().catch(() => null) : null)),
    );
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? null
          : new Promise((r) => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
            }),
      ),
    );
    await document.fonts.ready;
  });
}

async function pageCount(path: string): Promise<number> {
  const raw = (await readFile(path)).toString('latin1');
  return (raw.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

async function main(): Promise<void> {
  if (!(await serverUp())) {
    console.error(`No server on ${BASE}. Start one first (npm run build && npm run preview, or npm run dev), or set PORT.`);
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    // A4 landscape at 96 dpi is about 1123 px wide: lay the page out at that width.
    const context = await browser.newContext({ viewport: { width: 1123, height: 794 }, reducedMotion: 'reduce' });
    for (const job of JOBS) {
      const page = await context.newPage();
      // Lay the page out at the width the printed sheet will show.
      await page.setViewportSize({ width: Math.round(1123 / job.scale), height: 794 });
      const res = await page.goto(BASE + job.route, { waitUntil: 'networkidle' });
      if (!res?.ok()) throw new Error(`${job.route} answered ${res?.status()}`);
      await page.addStyleTag({ content: PRINT_CSS });
      await settle(page);
      const blank = await page.evaluate(() => [...document.images].filter((img) => !img.naturalWidth).map((img) => img.src));
      if (blank.length) console.warn(`${job.route}: ${blank.length} images did not load: ${blank.join(', ')}`);
      const path = resolve(OUT_DIR, job.file);
      await page.pdf({
        path,
        format: 'A4',
        landscape: true,
        printBackground: true,
        scale: job.scale,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      console.log(`${job.file}: ${await pageCount(path)} pages`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
