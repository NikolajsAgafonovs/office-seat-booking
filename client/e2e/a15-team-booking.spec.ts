// A-15 (e2e): team booking with a colleague picked from the directory and a free-text
// label (R-15, R-16). Seat 1 → alice, seat 2 → bob (bookedBy alice), seat 3 → label "Guest".
import { expect, test } from '@playwright/test';
import { bookingsFor, selectedDate, signIn, toast } from './helpers';

test('A-15 alice books three seats together for herself, bob and a guest', async ({
  page,
  browser,
}) => {
  await signIn(page, 'alice');

  await page.getByLabel('People').fill('3');
  await page.getByRole('button', { name: 'Find seats together' }).click();
  await expect(toast(page)).toContainText('Found 3 seats together');

  const rows = page.locator('.assign .a');
  await expect(rows).toHaveCount(3);
  const codes = await rows.locator('label').allTextContents();
  expect(codes).toHaveLength(3);

  // Seat 2: directory search for bob, pick from the dropdown.
  await rows.nth(1).locator('input').fill('bo');
  const option = page.getByRole('option').filter({ hasText: /bob/i }).first();
  await expect(option).toBeVisible();
  await option.getByRole('button').click();
  await expect(rows.nth(1).locator('input')).toHaveValue(/bob/i);

  // Seat 3: free-text label.
  await rows.nth(2).locator('input').fill('Guest');

  await page.getByRole('button', { name: 'Book 3 seats' }).click();
  await expect(toast(page)).toContainText('Booked 3 seats for');
  await expect(rows).toHaveCount(0); // the team set is cleared after booking

  const date = await selectedDate(page);
  const all = await bookingsFor(page, date);
  const bySeat = (code: string) => all.filter((b) => b.seat === code);
  const [s1, s2, s3] = codes as [string, string, string];

  expect(bySeat(s1)).toHaveLength(2);
  for (const b of bySeat(s1)) {
    expect(b.by).toBe('alice');
    expect(b.bookedBy).toBe('alice');
    expect(b.label ?? null).toBeNull();
  }
  expect(bySeat(s2)).toHaveLength(2);
  for (const b of bySeat(s2)) {
    expect(b.by).toBe('bob');
    expect(b.bookedBy).toBe('alice');
  }
  expect(bySeat(s3)).toHaveLength(2);
  for (const b of bySeat(s3)) {
    expect(b.by).toBe('alice');
    expect(b.bookedBy).toBe('alice');
    expect(b.label).toBe('Guest');
  }

  // Bob's "My bookings" shows seat 2.
  const bobContext = await browser.newContext();
  const bobPage = await bobContext.newPage();
  await signIn(bobPage, 'bob');
  await expect(bobPage.getByTestId('my-bookings')).toContainText(s2);
  await bobContext.close();

  // Cleanup: alice made all three bookings, so she may delete every slot row (R-8).
  for (const b of all.filter((x) => codes.includes(x.seat))) {
    const res = await page.request.delete(`/api/bookings/${encodeURIComponent(b.id)}`);
    expect(res.status()).toBe(204);
  }
});
