# Deploying a Foldwise preview

The Foldwise brand hub is a fully static Astro site. A preview is just the built
`foldwise-hub/dist/` folder published to **Spacefast**. There is no backend, no
database and no environment variables.

## What to deploy

| Version | Git ref | Notes |
|---|---|---|
| Realistic (current) | branch `feature/foldwise-realista` | Photo-based shop, board and manual, true-fold animated logo. **Use this for client previews.** |
| Illustrated (v1) | tag `v1-ilustrado` | Earlier SVG-illustrated version, kept for comparison. |

`master` only holds the initial spec and plan; the work lives on the branches above.

## Prerequisites

- **Node.js ≥ 22.12** (the project pins Astro 6; Astro 7 needs Node ≥ 22.23 — don't upgrade Astro without upgrading Node).
- **Spacefast CLI** (`sf`): `npm install -g spacefast`, then `sf --version`.
- A Spacefast account with access to the Simian team.

## 1. Build

```bash
git clone https://github.com/simian-lab/foldwise.git
cd foldwise
git checkout feature/foldwise-realista      # or: git checkout v1-ilustrado
cd foldwise-hub
npm ci
npm run build                               # outputs foldwise-hub/dist/
```

Optional local check before publishing:

```bash
npm run preview                             # http://localhost:4321
npx vitest run && npx playwright test       # unit + e2e (Playwright builds and serves on $PORT, default 4321)
```

## 2. Publish to Spacefast

Log in once (interactive):

```bash
sf auth login
```

Publish the built folder as a **preview** that only the team can open:

```bash
sf publish foldwise-hub/dist \
  --target preview \
  --access team \
  -m "Foldwise preview: feature/foldwise-realista"
```

- The command prints the preview URL — share that link with the client.
- Use `--access private` to keep it to yourself, or `--access public` only if the link may circulate freely.
- To publish the illustrated version for side-by-side comparison, build from `v1-ilustrado` and publish it as a separate space (e.g. `--name foldwise-v1`).

Alternatively, let Spacefast run the build itself:

```bash
sf publish foldwise-hub --build \
  --build-command "npm run build" \
  --output-directory dist \
  --target preview --access team
```

### From CI (non-interactive)

Create an API key (`sf api-keys create`) and expose it as `SPACEFAST_TOKEN`:

```bash
SPACEFAST_TOKEN=*** sf publish foldwise-hub/dist --target preview --access team --json
```

Never commit the token.

## 3. PDF exports (manual + catalog)

The PDFs are generated, not committed (`foldwise-hub/exports/` is git-ignored):

```bash
cd foldwise-hub
npm run build && npm run preview -- --port 4701 &
PORT=4701 npm run export:pdf                # writes exports/foldwise-manual.pdf and exports/foldwise-catalogo.pdf
```

Send the PDFs to the client separately, or copy them into `dist/` before publishing if they should be downloadable from the preview.

## Notes

- Everything (fonts, photos, scripts) is bundled locally; the site makes no external requests.
- Product photos and brand-board mockups are AI-generated with the exact brand marks composited afterwards; credits are in `foldwise-hub/public/img/CREDITS.md`.
- Product data and prices are sample data, labeled "Datos de muestra" on product pages.
- The client's reference folders (`website/`, `deseables/`, `inspiración/`) are intentionally **not** in the repository (third-party images).
