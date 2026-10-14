// A-27 (e2e): with prefers-color-scheme: dark the page background is the dark --bg and seat
// colours use the dark tokens (R-28, ui.md "Visual language").
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.use({ colorScheme: 'dark' });

test('A-27 dark scheme uses the dark tokens', async ({ page }) => {
  await signIn(page, 'alice');

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(15, 22, 29)'); // --bg dark #0f161d

  const freeStroke = await page
    .locator('.seat.free .cushion')
    .first()
    .evaluate((el) => getComputedStyle(el).stroke);
  expect(freeStroke).toBe('rgb(76, 196, 166)'); // --free dark #4cc4a6

  const offStroke = await page
    .locator('.seat.off .cushion')
    .first()
    .evaluate((el) => getComputedStyle(el).stroke);
  expect(offStroke).toBe('rgb(79, 95, 110)'); // --taken dark #4f5f6e
});
