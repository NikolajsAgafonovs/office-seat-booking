// Booking scenarios from docs/acceptance.md: A-11 (R-11) and the client half of A-09 (R-25).
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FRIDAY,
  TODAY,
  YESTERDAY,
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

describe('Booking', () => {
  afterEach(teardownScenario);

  describe('A-11', () => {
    it('A-11 groups upcoming bookings by date and seat, omits yesterday, and Show switches the day (R-11)', async () => {
      const user = userEvent.setup();
      setupScenario({
        ...emptyDb(meAs('alice')),
        bookings: [
          mkBooking(YESTERDAY, 'am', 'A-05', 'alice'),
          mkBooking(YESTERDAY, 'pm', 'A-05', 'alice'),
          // Listed out of order on purpose: the card sorts by date.
          mkBooking(FRIDAY, 'am', 'A-12', 'alice'),
          mkBooking(TODAY, 'am', 'A-10', 'alice'),
          mkBooking(TODAY, 'pm', 'A-10', 'alice'),
          mkBooking(TODAY, 'am', 'A-20', 'bob'),
        ],
      });
      await renderApp();

      const card = screen.getByTestId('my-bookings');
      const rows = await within(card).findAllByRole('listitem');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('A-10');
      expect(rows[0]).toHaveTextContent('Wed 14 Oct');
      expect(rows[0]).not.toHaveTextContent('morning');
      expect(rows[1]).toHaveTextContent('A-12');
      expect(rows[1]).toHaveTextContent('Fri 16 Oct, morning');
      expect(card).not.toHaveTextContent('A-05');
      expect(card).not.toHaveTextContent('A-20');

      await user.click(within(rows[1]!).getByRole('button', { name: 'Show' }));
      expect(screen.getByRole('button', { name: 'Fri 16 Oct' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Wed 14 Oct' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      const seatCard = screen.getByTestId('seat-card');
      expect(within(seatCard).getByText('A-12')).toBeInTheDocument();
      expect(seatCard).toHaveTextContent('Fri 16 Oct, full day');
      // Friday's bookings were fetched for the map: alice's half-day booking makes it hers.
      await screen.findByRole('button', { name: 'A-12, Booked by you' });
      expect(screen.getByRole('button', { name: 'A-12, Booked by you' })).toHaveFocus();
    });

    it('A-11 shows the empty state when nothing is upcoming (R-11)', async () => {
      setupScenario({
        ...emptyDb(meAs('alice')),
        bookings: [mkBooking(YESTERDAY, 'am', 'A-05', 'alice')],
      });
      await renderApp();
      expect(screen.getByTestId('my-bookings')).toHaveTextContent(
        'No upcoming bookings yet. Pick a free seat to make one.',
      );
    });
  });

  describe('A-09', () => {
    it('A-09 switches to read-only and disables write controls when a write is forbidden (R-25)', async () => {
      const user = userEvent.setup();
      setupScenario(emptyDb(meAs('alice')), (method, url) =>
        method === 'POST' && url.pathname === '/api/bookings'
          ? { status: 403, body: { error: { code: 'forbidden', message: 'read-only user' } } }
          : undefined,
      );
      await renderApp();
      expect(screen.getByTestId('mode-pill')).toHaveTextContent('Shared · live for everyone');

      await user.click(screen.getByRole('button', { name: 'A-10, Free' }));
      const book = screen.getByRole('button', { name: 'Book this seat' });
      expect(book).toBeEnabled();
      await user.click(book);

      expect(await screen.findByRole('status')).toHaveTextContent(
        'This page is read-only for you, so the booking was not saved.',
      );
      expect(screen.getByTestId('mode-pill')).toHaveTextContent('Read-only');
      expect(screen.getByRole('button', { name: 'Book this seat' })).toBeDisabled();
      expect(screen.getByTestId('seat-card')).toHaveTextContent(
        'You can look but not book: this view is read-only for you.',
      );
      // The seat is still free: nothing was saved.
      expect(screen.getByRole('button', { name: 'A-10, Free' })).toBeInTheDocument();
    });

    it('A-09 renders dan (read-only) with disabled write controls from the start (R-25)', async () => {
      const user = userEvent.setup();
      setupScenario(emptyDb(meAs('dan')));
      await renderApp();
      expect(screen.getByTestId('mode-pill')).toHaveTextContent('Read-only');
      await user.click(screen.getByRole('button', { name: 'A-10, Free' }));
      expect(screen.getByRole('button', { name: 'Book this seat' })).toBeDisabled();
      expect(screen.getByTestId('seat-card')).toHaveTextContent('read-only for you');
    });
  });
});
