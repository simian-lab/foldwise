/**
 * Runtime for the interactive mailer photo (src/components/site/HeroBox.astro).
 *
 * The button stacks three photos (closed, half-open, open); CSS crossfades
 * them from `data-open`. This script owns the state: it opens the box once
 * when it is first properly seen (unless the visitor already touched it),
 * toggles on click (Enter/Space come free with <button>), keeps the visible
 * frame the only one exposed to assistive tech, and reports `data-progress`
 * (0 or 1) once a transition settles. Under reduced motion it renders open and
 * every change is instant.
 */

/** Opening stagger in CSS: 0.22s delay + 0.42s fade. */
const SETTLE_MS = 680;

export function mountHeroBox(root: HTMLElement): void {
  const frames = Array.from(root.querySelectorAll<HTMLImageElement>('img[data-frame]'));
  if (!frames.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hint = root.closest('[data-hero-scope]')?.querySelector<HTMLElement>('[data-hero-hint]') ?? null;
  let userTouched = false;
  let settle = 0;

  // Warm the hidden frames so the first toggle never waits on the network.
  const warm = () => {
    for (const img of frames) {
      img.loading = 'eager';
      img.decode?.().catch(() => {});
    }
  };

  function expose(open: boolean) {
    const visible = open ? 'open' : 'closed';
    for (const img of frames) {
      if (img.dataset.frame === visible) img.removeAttribute('aria-hidden');
      else img.setAttribute('aria-hidden', 'true');
    }
  }

  function setOpen(open: boolean, animate: boolean) {
    root.dataset.open = open ? 'true' : 'false';
    root.setAttribute('aria-pressed', open ? 'true' : 'false');
    if (hint) hint.textContent = open ? 'Toca la caja para cerrarla' : 'Toca la caja para abrirla';
    expose(open);
    window.clearTimeout(settle);
    if (!animate) {
      root.dataset.progress = open ? '1' : '0';
      return;
    }
    root.dataset.moved = '';
    settle = window.setTimeout(() => {
      root.dataset.progress = open ? '1' : '0';
    }, SETTLE_MS);
  }

  root.addEventListener('click', () => {
    userTouched = true;
    warm();
    setOpen(root.dataset.open !== 'true', !reduce);
  });

  if (reduce) {
    root.dataset.motion = 'static';
    setOpen(true, false);
    return;
  }
  root.dataset.motion = 'animated';
  root.addEventListener('pointerenter', warm, { once: true });

  // Open once, the first time the box is properly seen.
  const inView = () => {
    const r = root.getBoundingClientRect();
    const vh = window.innerHeight;
    return r.height > 0 && r.bottom > vh * 0.2 && r.top < vh * 0.8;
  };
  let timer = 0;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        window.clearTimeout(timer);
        if (!e.isIntersecting || userTouched) continue;
        warm();
        timer = window.setTimeout(() => {
          if (userTouched || !inView()) return;
          io.disconnect();
          setOpen(true, true);
        }, 650);
      }
    },
    { threshold: [0, 0.5] },
  );
  io.observe(root);
}
