// A-05 (e2e): alice books free A-10 for the full day (R-7, R-9, R-12).
import { expect, test } from '@playwright/test';
import { bookingsFor, ensureFree, seat, selectedDate, signIn, toast } from './helpers';

test('A-05 alice books A-10 and the seat turns mine with a toast', async ({ page }) => {
  await signIn(page, 'alice');
  await ensureFree(page, 'A-10');

  const a10 = seat(page, 'A-10');
  await a10.click();
  const card = page.getByTestId('seat-card');
  await expect(card).toContainText('A-10');
  await card.getByRole('button', { name: 'Book this seat' }).click();

  await expect(toast(page)).toContainText(/^Booked A-10 for \w{3} \d{1,2} \w{3}$/);
  await expect(a10).toHaveAttribute('data-status', 'mine');
  await expect(a10).toHaveAttribute('aria-label', 'A-10, Booked by you');
  await expect(card).toContainText('Booked by you');

  // Two slot rows exist (am, pm) with by = bookedBy = alice (R-9).
  const date = await selectedDate(page);
  const rows = (await bookingsFor(page, date)).filter((b) => b.seat === 'A-10');
  expect(rows.map((r) => r.slot).sort()).toEqual(['am', 'pm']);
  for (const r of rows) {
    expect(r.by).toBe('alice');
    expect(r.bookedBy).toBe('alice');
  }
  await expect(page.getByTestId('my-bookings')).toContainText('A-10');

  // Leave the fixture day as we found it.
  await card.getByRole('button', { name: 'Cancel my booking' }).click();
  await expect(a10).toHaveAttribute('data-status', 'free');
});
