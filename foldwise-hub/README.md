# Foldwise · hub de marca

Propuesta de marca para Foldwise: manual, marca en acción, cajas y el sitio de la tienda. Todo corre en local, sin conexión.

Brand proposal for Foldwise: manual, brand in use, boxes and the shop site. Everything runs locally, offline.

## Requisitos / Requirements

Node 22.12 o superior. Ejecuta `npm install` una vez. / Node 22.12+, run `npm install` once.

## Uso / Usage

| Comando | Qué hace / What it does |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `http://localhost:4321` / dev server |
| `npm run build` | Compila el sitio estático en `dist/` / static build |
| `npm run preview` | Sirve `dist/` en `http://localhost:4321` / serves the build |
| `npm run test:unit` | Pruebas unitarias (Vitest) / unit tests |
| `npm run test:e2e` | Pruebas end-to-end (Playwright); compila y sirve el sitio solo / builds and serves by itself |
| `npm run export:pdf` | Exporta los PDF (ver abajo) / exports the PDFs (see below) |

Para correr las e2e contra el servidor de desarrollo en otro puerto / e2e against the dev server on another port:

```sh
PORT=4409 E2E_DEV=1 npx playwright test
```

## PDF

`export:pdf` no compila nada: necesita un servidor corriendo (preview o dev). / It builds nothing: start a server first.

```sh
npm run build && npm run preview   # en otra terminal / in another terminal
npm run export:pdf                 # PORT=4321 por defecto / by default
```

Genera / writes:

- `exports/foldwise-manual.pdf`: manual de marca (`/marca`), A4 horizontal / landscape
- `exports/foldwise-catalogo.pdf`: catálogo (`/tienda/catalogo`), A4 horizontal / landscape

Las páginas se imprimen con movimiento reducido, así el logo animado sale en su versión estática. / Pages print with reduced motion, so the animated logo appears in its static form.

Deployment (Spacefast preview): see [../DEPLOY.md](../DEPLOY.md).
