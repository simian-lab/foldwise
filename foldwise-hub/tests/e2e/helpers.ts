import type { Page } from '@playwright/test';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Aborts every non-local request and returns the live list of blocked URLs. */
export async function blockExternal(page: Page): Promise<string[]> {
  const blocked: string[] = [];
  await page.route('**/*', (route) => {
    const url = route.request().url();
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      // unparsable URL: treated as external
    }
    if (url.startsWith('data:') || url.startsWith('blob:') || LOCAL_HOSTS.has(host)) {
      return route.continue();
    }
    blocked.push(url);
    return route.abort();
  });
  return blocked;
}
