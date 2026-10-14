// Viewing scenarios from docs/acceptance.md: A-01, A-02, A-03 (R-2, R-3, R-5, O-12).
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PLAN,
  TODAY,
  meAs,
  mkBooking,
  renderApp,
  setupScenario,
  teardownScenario,
} from './harness';
import type { MockDb } from './harness';

function emptyDb(me: MockDb['me']): MockDb {
  return { me, bookings: [], releases: [], dedications: [] };
}

describe('Viewing', () => {
  afterEach(teardownScenario);

  describe('A-01', () => {
    beforeEach(() => setupScenario(emptyDb(meAs('alice'))));

    it('A-01 offers 10 workdays, no weekends, the first being today (R-2)', async () => {
      await renderApp();
      const group = screen.getByRole('group', { name: 'Day' });
      const buttons = within(group).getAllByRole('button');
      expect(buttons).toHaveLength(10);
      for (const b of buttons) {
        const label = b.getAttribute('aria-label') ?? '';
        expect(label).not.toMatch(/^(Sat|Sun)/);
      }
      expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
      expect(buttons[0]).toHaveAttribute('data-date', TODAY);
      expect(buttons[0]).toHaveAccessibleName('Wed 14 Oct');
      // Thu 15, Fri 16, then Mon 19: the weekend is skipped.
      expect(buttons[2]).toHaveAttribute('data-date', '2026-10-16');
      expect(buttons[3]).toHaveAttribute('data-date', '2026-10-19');
    });
  });

  describe('A-02', () => {
    beforeEach(() => setupScenario(emptyDb(meAs('alice'))));

    it('A-02 counts 92 bookable seats under east with west seats off, 168 under all (R-5, O-12)', async () => {
      const user = userEvent.setup();
      await renderApp();
      expect(screen.getByTestId('stat-bookable')).toHaveTextContent('92 bookable');
      const westSeats = PLAN.seats.filter((s) => s.part === 'west');
      expect(westSeats).toHaveLength(76);
      for (const s of westSeats) {
        const el = document.querySelector(`[data-seat="${s.id}"]`);
        expect(el).toHaveAttribute('data-status', 'off');
        expect(el).toHaveAttribute('aria-label', `${s.id}, Not bookable`);
      }
      // Spot-check through the accessibility tree as well (R-6).
      expect(screen.getByRole('button', { name: 'B-01, Not bookable' })).toBeInTheDocument();
      expect(screen.getByTestId('off-zone')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Whole floor (≈ 168)' }));
      expect(screen.getByTestId('stat-bookable')).toHaveTextContent('168 bookable');
      expect(screen.getByRole('button', { name: 'B-01, Free' })).toHaveAttribute(
        'data-status',
        'free',
      );
      expect(screen.queryByTestId('off-zone')).not.toBeInTheDocument();
    });
  });

  describe('A-03', () => {
    const aliceHasA10 = () => [
      mkBooking(TODAY, 'am', 'A-10', 'alice'),
      mkBooking(TODAY, 'pm', 'A-10', 'alice'),
    ];

    it('A-03 shows A-10 as taken to bob (R-3)', async () => {
      setupScenario({ ...emptyDb(meAs('bob')), bookings: aliceHasA10() });
      await renderApp();
      const seat = await screen.findByRole('button', { name: 'A-10, Taken' });
      expect(seat.getAttribute('class')).toContain('taken');
      expect(seat).toHaveAttribute('data-status', 'taken');
      expect(screen.getByTestId('stat-taken')).toHaveTextContent('1 taken');
    });

    it('A-03 shows A-10 as mine to alice (R-3)', async () => {
      setupScenario({ ...emptyDb(meAs('alice')), bookings: aliceHasA10() });
      await renderApp();
      const seat = await screen.findByRole('button', { name: 'A-10, Booked by you' });
      expect(seat.getAttribute('class')).toContain('mine');
      expect(seat).toHaveAttribute('data-status', 'mine');
      // "Taken" includes the user's own (ui.md Map, Stats).
      expect(screen.getByTestId('stat-taken')).toHaveTextContent('1 taken');
    });
  });
});
