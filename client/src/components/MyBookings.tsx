// "My bookings" card (ui.md, R-11, R-19): upcoming bookings grouped by date and seat,
// sorted by date, dedicated seats first; "Show" jumps to the seat, "Cancel" deletes slots.
import { formatLong } from '@seat/shared';
import type { Booking, IsoDate, Slot } from '@seat/shared';
import { halfName } from '../format';
import { useReadOnly } from '../hooks';
import { useStore } from '../store';

type Row =
  | { kind: 'ded'; seat: string }
  | { kind: 'booking'; seat: string; date: IsoDate; slots: Slot[]; ids: string[] };

/** Group slot rows into one row per (date, seat); drop past dates (R-11). */
function groupBookings(
  bookings: readonly Booking[],
  dedicatedSeats: readonly string[],
  today: IsoDate,
): Row[] {
  const groups = new Map<string, Extract<Row, { kind: 'booking' }>>();
  for (const b of bookings) {
    if (b.date < today) continue;
    const key = `${b.date}|${b.seat}`;
    const g = groups.get(key);
    if (g) {
      g.slots.push(b.slot);
      g.ids.push(b.id);
    } else
      groups.set(key, {
        kind: 'booking',
        seat: b.seat,
        date: b.date,
        slots: [b.slot],
        ids: [b.id],
      });
  }
  const list = [...groups.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.seat.localeCompare(b.seat),
  );
  const ded: Row[] = [...dedicatedSeats].sort().map((seat) => ({ kind: 'ded', seat }));
  return [...ded, ...list];
}

export function MyBookings() {
  const myBookings = useStore((s) => s.myBookings);
  const dedications = useStore((s) => s.dedications);
  const me = useStore((s) => s.me);
  const today = useStore((s) => s.today);
  const showBooking = useStore((s) => s.showBooking);
  const cancelBookings = useStore((s) => s.cancelBookings);
  const ro = useReadOnly();

  const mine = me
    ? Object.values(dedications)
        .filter((d) => d.owner === me.id)
        .map((d) => d.seat)
    : [];
  const rows = groupBookings(myBookings, mine, today);

  return (
    <div className="card" data-testid="my-bookings">
      <h3>My bookings</h3>
      {rows.length === 0 ? (
        <p className="empty">No upcoming bookings yet. Pick a free seat to make one.</p>
      ) : (
        <ul className="list">
          {rows.map((r) =>
            r.kind === 'ded' ? (
              <li key={`ded-${r.seat}`}>
                <span>
                  <span className="mono">{r.seat}</span> · dedicated to you
                </span>
                <button type="button" onClick={() => showBooking(r.seat)}>
                  Show
                </button>
              </li>
            ) : (
              <li key={`${r.date}-${r.seat}`}>
                <span>
                  <span className="mono">{r.seat}</span> · {formatLong(r.date)}
                  {r.slots.length === 1 && r.slots[0] ? `, ${halfName(r.slots[0])}` : ''}
                </span>
                <button type="button" onClick={() => showBooking(r.seat, r.date)}>
                  Show
                </button>
                <button
                  type="button"
                  disabled={ro}
                  onClick={() => void cancelBookings(r.ids, r.seat, r.date)}
                >
                  Cancel
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
