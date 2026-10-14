// A-26 (e2e): at 375 px the map scrolls sideways, the side panel stacks below it, and the
// page itself has no horizontal scroll (R-27).
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

test('A-26 phone viewport: scrollable map, stacked side panel, no page scroll', async ({
  page,
}) => {
  await signIn(page, 'alice');

  const pageScrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(pageScrolls).toBe(false);

  const wrapScrolls = await page
    .getByTestId('map-wrap')
    .evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(wrapScrolls).toBe(true);

  const mapBox = await page.getByTestId('map-card').boundingBox();
  const sideBox = await page.getByTestId('side-panel').boundingBox();
  expect(mapBox).not.toBeNull();
  expect(sideBox).not.toBeNull();
  expect(sideBox!.y).toBeGreaterThanOrEqual(mapBox!.y + mapBox!.height - 1);
});
