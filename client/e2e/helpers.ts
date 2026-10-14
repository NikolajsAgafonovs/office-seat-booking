// Shared helpers for the (e2e) scenarios in docs/acceptance.md. Assumes the dev stack with
// seeded fixtures and the dev sign-in card (decision 0007, option 2).
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export type FixtureUser = 'alice' | 'bob' | 'carol' | 'dan';

/** Open the app and sign in through the dev provider; waits for the map to be on screen. */
export async function signIn(page: Page, user: FixtureUser): Promise<void> {
  await page.goto('/');
  await page.getByTestId(`dev-user-${user}`).click();
  await expect(page.getByTestId('stats')).toBeVisible();
  await expect(page.getByTestId('floor-map')).toBeVisible();
}

export function seat(page: Page, code: string): Locator {
  return page.locator(`[data-seat="${code}"]`);
}

export function toast(page: Page): Locator {
  return page.getByTestId('toast');
}

/** ISO date of the pressed day button (R-2). */
export async function selectedDate(page: Page): Promise<string> {
  const d = await page.locator('.day[aria-pressed="true"]').getAttribute('data-date');
  if (!d) throw new Error('no day selected');
  return d;
}

export interface ApiBooking {
  id: string;
  date: string;
  slot: 'am' | 'pm';
  seat: string;
  by: string;
  bookedBy: string;
  label?: string | null;
}

/** GET /api/bookings?date= through the page's session cookie. */
export async function bookingsFor(page: Page, date: string): Promise<ApiBooking[]> {
  const res = await page.request.get(`/api/bookings?date=${encodeURIComponent(date)}`);
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { bookings: ApiBooking[] };
  return body.bookings;
}

/** Make sure `code` is free for the pressed day, cancelling our own booking if needed. */
export async function ensureFree(page: Page, code: string): Promise<void> {
  const s = seat(page, code);
  const status = await s.getAttribute('data-status');
  if (status === 'mine') {
    await s.click();
    await page.getByTestId('seat-card').getByRole('button', { name: 'Cancel my booking' }).click();
    await expect(toast(page)).toContainText(`Cancelled ${code}`);
    await expect(s).toHaveAttribute('data-status', 'free');
    await s.click(); // deselect again
  } else if (status !== 'free') {
    throw new Error(`${code} is ${status}; the fixture day is not in the expected state`);
  }
}
