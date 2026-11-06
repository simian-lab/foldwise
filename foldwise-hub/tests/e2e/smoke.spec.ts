import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers';

test('hub entry renders offline', async ({ page }) => {
  const blocked = await blockExternal(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/Foldwise/);
  expect(
    await page.evaluate(() => document.fonts.check('800 32px "Bricolage Grotesque"')),
  ).toBe(true);
  expect(blocked).toEqual([]);
});
