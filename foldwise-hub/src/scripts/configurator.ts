/**
 * Client logic for the product configurator (Configurator.astro) and its
 * live preview (LogoPreview.astro). Pricing comes from ../data/pricing so the
 * page and the unit tests share one source of truth.
 *
 * Logo preview: IsoBox renders, inside each box's `front-print` group (already
 * carrying the front face's isometric matrix), a `logo-placeholder` group with
 * a dashed rect. We read that rect's box and insert an SVG <image> with a
 * local blob: URL in the same group, then hide the placeholder. Nothing leaves
 * the browser; the previous object URL is revoked on every change.
 */
import { clampQuantity, unitPrice, orderTotal, money, type PriceTier } from '../data/pricing';

export const LOGO_ERROR = 'Sube una imagen PNG, JPG o SVG de hasta 5 MB.';
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);
const LOGO_EXT = /\.(png|jpe?g|svg)$/i;
const SVG_NS = 'http://www.w3.org/2000/svg';

export { money };

/** Accepts PNG/JPG/SVG up to 5 MB (MIME type, or extension when the browser gives none). */
export function isAcceptedLogo(file: Pick<File, 'name' | 'type' | 'size'>): boolean {
  if (file.size <= 0 || file.size > MAX_LOGO_BYTES) return false;
  if (file.type) return LOGO_TYPES.has(file.type);
  return LOGO_EXT.test(file.name);
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function replay(el: Element, cls: string) {
  if (reduceMotion()) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

function setText(el: Element | null, text: string) {
  if (!el || el.textContent === text) return;
  el.textContent = text;
  replay(el, 'is-ticking');
}

/** Confirms the blob decodes as an image before showing it. */
function decodes(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function applyLogo(preview: Element, url: string | null) {
  preview.querySelectorAll('[data-part="front-print"]').forEach((group) => {
    const placeholder = group.querySelector<SVGGElement>('[data-part="logo-placeholder"]');
    const rect = placeholder?.querySelector('rect');
    let image = group.querySelector<SVGImageElement>('image[data-part="client-logo"]');
    const svg = group.closest('svg');
    if (!url) {
      image?.remove();
      if (placeholder) placeholder.style.display = '';
      svg?.removeAttribute('data-client-logo');
      return;
    }
    if (!rect) return;
    if (!image) {
      image = document.createElementNS(SVG_NS, 'image');
      image.setAttribute('data-part', 'client-logo');
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      // Ink printed on board: multiply lets the kraft show through light pixels.
      image.style.mixBlendMode = 'multiply';
      for (const a of ['x', 'y', 'width', 'height']) image.setAttribute(a, rect.getAttribute(a) ?? '0');
      group.appendChild(image);
    }
    image.setAttribute('href', url);
    if (placeholder) placeholder.style.display = 'none';
    svg?.setAttribute('data-client-logo', '');
  });
}

function initConfigurator(form: HTMLFormElement) {
  const tiers: PriceTier[] = JSON.parse(form.dataset.tiers ?? '[]');
  const min = Number(form.dataset.min);
  if (!tiers.length || !Number.isFinite(min)) return;

  const scope = form.closest('[data-pdp]') ?? document;
  const preview = scope.querySelector<HTMLElement>('[data-logo-preview]');
  const size = form.querySelector<HTMLSelectElement>('select[name="size"]')!;
  const qty = form.querySelector<HTMLInputElement>('input[name="qty"]')!;
  const unitEl = form.querySelector('[data-unit-price]');
  const totalEl = form.querySelector('[data-total]');
  const echo = form.querySelector('[data-qty-echo]');
  const hint = form.querySelector('[data-tier-hint]');
  const saving = form.querySelector<HTMLElement>('[data-saving]');
  const tierButtons = [...form.querySelectorAll<HTMLButtonElement>('[data-tier]')];
  const file = form.querySelector<HTMLInputElement>('input[type="file"][name="logo"]')!;
  const drop = form.querySelector<HTMLElement>('[data-logo-drop]');
  const nameEl = form.querySelector('[data-logo-name]');
  const thumb = form.querySelector<HTMLImageElement>('[data-logo-thumb]');
  const clear = form.querySelector<HTMLButtonElement>('[data-logo-clear]');
  const error = form.querySelector<HTMLElement>('[data-logo-error]');
  const previewHint = preview?.querySelector('[data-preview-hint]');
  const defaultName = nameEl?.textContent ?? '';
  const defaultHint = previewHint?.textContent ?? '';
  let logoUrl: string | null = null;

  // ── pricing ──
  const render = (n: number) => {
    const unit = unitPrice(tiers, n);
    setText(unitEl, money(unit));
    setText(totalEl, money(orderTotal(tiers, n)));
    if (echo) echo.textContent = `(${n.toLocaleString('es-US')} cajas)`;
    tierButtons.forEach((b) => b.setAttribute('aria-pressed', tiers[Number(b.dataset.tier)].unitPrice === unit ? 'true' : 'false'));
    const next = tiers.find((t) => t.minQty > n);
    if (hint) {
      const diff = next ? next.minQty - n : 0;
      hint.textContent = next
        ? `Con ${diff} ${diff === 1 ? 'caja' : 'cajas'} más, cada una baja a ${money(next.unitPrice)}.`
        : 'Ya tienes el mejor precio por volumen.';
    }
    if (saving) {
      const saved = Math.round((tiers[0].unitPrice - unit) * n * 100) / 100;
      saving.hidden = saved <= 0;
      if (saved > 0) saving.textContent = `Ahorras ${money(saved)} por volumen`;
    }
  };
  const commit = (n: number) => {
    const clamped = clampQuantity(n, min);
    qty.value = String(clamped);
    render(clamped);
  };

  qty.addEventListener('input', () => render(clampQuantity(qty.value, min)));
  qty.addEventListener('change', () => commit(clampQuantity(qty.value, min)));
  qty.addEventListener('blur', () => commit(clampQuantity(qty.value, min)));
  qty.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(clampQuantity(qty.value, min));
    }
  });
  form.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) =>
    b.addEventListener('click', () => commit(clampQuantity(qty.value, min) + Number(b.dataset.step) * min)),
  );
  tierButtons.forEach((b) => b.addEventListener('click', () => commit(Number(b.dataset.tierQty))));

  // ── size ──
  size.addEventListener('change', () => {
    if (!preview) return;
    let dims = '';
    preview.querySelectorAll<HTMLElement>('[data-preview-size]').forEach((box) => {
      const on = box.dataset.previewSize === size.value;
      box.hidden = !on;
      if (on) dims = box.dataset.dims ?? '';
    });
    const dimsEl = preview.querySelector('[data-preview-dims]');
    if (dimsEl) {
      dimsEl.innerHTML = '';
      const code = document.createElement('strong');
      code.textContent = size.value;
      dimsEl.append(code, ` ${dims}`);
    }
  });

  // ── logo ──
  const showError = (on: boolean) => {
    if (!error) return;
    error.hidden = !on;
    error.textContent = on ? LOGO_ERROR : '';
  };
  const setLogo = (url: string | null, name?: string) => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoUrl = url;
    if (preview) {
      applyLogo(preview, url);
      if (url) {
        replay(preview.querySelector('[data-preview-boxes]') ?? preview, 'is-stamped');
        // On narrow screens the preview sits above the form: bring it back into view.
        const r = preview.getBoundingClientRect();
        if (r.bottom < 80 || r.top > window.innerHeight) {
          preview.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
        }
      }
    }
    if (thumb) {
      thumb.hidden = !url;
      if (url) thumb.src = url;
      else thumb.removeAttribute('src');
    }
    drop?.classList.toggle('has-logo', !!url);
    if (nameEl) nameEl.textContent = url && name ? name : defaultName;
    if (previewHint) previewHint.textContent = url ? 'Vista previa con tu logo, impreso a una tinta' : defaultHint;
    if (clear) clear.hidden = !url;
  };
  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    if (!isAcceptedLogo(f)) {
      showError(true);
      return;
    }
    const url = URL.createObjectURL(f);
    if (!(await decodes(url))) {
      URL.revokeObjectURL(url);
      showError(true);
      return;
    }
    showError(false);
    setLogo(url, f.name);
  };

  file.addEventListener('change', () => {
    void handleFile(file.files?.[0]).finally(() => {
      file.value = '';
    });
  });
  clear?.addEventListener('click', () => {
    showError(false);
    setLogo(null);
    file.focus();
  });
  if (drop) {
    drop.addEventListener('dragenter', () => drop.classList.add('is-dragging'));
    drop.addEventListener('dragleave', () => drop.classList.remove('is-dragging'));
    drop.addEventListener('drop', () => drop.classList.remove('is-dragging'));
  }
  window.addEventListener('pagehide', () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
  });

  commit(clampQuantity(qty.value, min));
}

export function initConfigurators() {
  document.querySelectorAll<HTMLFormElement>('form[data-configurator]').forEach(initConfigurator);
}
