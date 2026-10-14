// Behaviour added by the 2026-10-14 docs sync: office time zone from /api/me (R-30, R-2) and
// cancelling a seat booked for a colleague from the seat card (R-8, R-16, domain-model.md
// "Available actions per status").
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TODAY, meAs, mkBooking, renderApp, setupScenario, teardownScenario } from './harness';
import type { MockDb } from './harness';

function emptyDb(me: MockDb['me']): MockDb {
  return { me, bookings: [], releases: [], dedications: [] };
}

describe('Docs sync 2026-10-14', () => {
  afterEach(teardownScenario);

  it('R-30 the day picker starts on the office date reported by /api/me, not the UTC date', async () => {
    setupScenario(emptyDb(meAs('alice')));
    // 23:30 UTC on Wednesday is already Thursday 01:30 in Riga.
    vi.setSystemTime(new Date('2026-10-14T23:30:00Z'));
    await renderApp();
    const days = await screen.findAllByRole('button', { name: /^(Mon|Tue|Wed|Thu|Fri) \d+ \w+$/ });
    expect(days[0]).toHaveAccessibleName('Thu 15 Oct');
    expect(days[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Wed 14 Oct' })).toBeNull();
  });

  it('R-30 a different office zone from /api/me moves "today"', async () => {
    setupScenario(emptyDb({ ...meAs('alice'), officeTz: 'Pacific/Honolulu' }));
    // 09:00 UTC on Wednesday is still Tuesday 23:00 in Honolulu.
    await renderApp();
    const days = await screen.findAllByRole('button', { name: /^(Mon|Tue|Wed|Thu|Fri) \d+ \w+$/ });
    expect(days[0]).toHaveAccessibleName('Tue 13 Oct');
  });

  it('R-8 a taken seat I booked for a colleague offers "Cancel booking" and cancels both slots', async () => {
    const user = userEvent.setup();
    const { calls } = setupScenario({
      ...emptyDb(meAs('alice')),
      bookings: [
        mkBooking(TODAY, 'am', 'A-21', 'bob', { bookedBy: 'alice' }),
        mkBooking(TODAY, 'pm', 'A-21', 'bob', { bookedBy: 'alice' }),
        mkBooking(TODAY, 'am', 'A-22', 'bob'),
        mkBooking(TODAY, 'pm', 'A-22', 'bob'),
      ],
    });
    await renderApp();

    // Seat booked by bob himself: no cancel for alice.
    await user.click(await screen.findByRole('button', { name: 'A-22, Taken' }));
    let card = screen.getByTestId('seat-card');
    expect(within(card).queryByRole('button', { name: /cancel/i })).toBeNull();

    // Seat alice booked for bob: cancel is offered and deletes both slot rows.
    await user.click(screen.getByRole('button', { name: 'A-21, Taken' }));
    card = screen.getByTestId('seat-card');
    await user.click(within(card).getByRole('button', { name: 'Cancel booking' }));
    const deletes = calls
      .filter((c) => c.method === 'DELETE')
      .map((c) => c.path)
      .sort();
    expect(deletes).toEqual([`/api/bookings/${TODAY}_am_A-21`, `/api/bookings/${TODAY}_pm_A-21`]);
    expect(await screen.findByRole('status')).toHaveTextContent('Cancelled A-21 on Wed 14 Oct');
  });
});
