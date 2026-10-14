// Seat card (ui.md "Seat card", R-4): code, status chip, details, then the actions from
// docs/domain-model.md "Available actions per status". aria-live so selection is announced
// (R-29). Every write control is disabled in read-only mode (R-25).
import { useState } from 'react';
import { STATUS_TEXT, formatLong, partName, seatLabel } from '@seat/shared';
import type { Booking } from '@seat/shared';
import { halfName, slotSuffix } from '../format';
import { useDerived, useReadOnly } from '../hooks';
import { personName } from '../names';
import type { NameContext } from '../names';
import { useStore } from '../store';
import type { Assignment } from '../store';
import { PersonSearch } from './PersonSearch';

/** "Booked by" text, per half-day when the two halves differ (R-4). */
function bookedByText(bookings: readonly Booking[], slotCount: number, names: NameContext): string {
  const labelled = bookings.map((b) => ({ b, name: personName(b, names) }));
  const distinct = new Set(labelled.map((x) => x.name));
  if (distinct.size === 1 && labelled[0]) {
    const only = labelled[0];
    return bookings.length < slotCount ? `${only.name} (${halfName(only.b.slot)})` : only.name;
  }
  return labelled.map((x) => `${x.name} (${halfName(x.b.slot)})`).join(', ');
}

export function SeatCard() {
  const selection = useStore((s) => s.selection);
  const plan = useStore((s) => s.floorPlan);
  const me = useStore((s) => s.me);
  const date = useStore((s) => s.date);
  const slot = useStore((s) => s.slot);
  const dedRule = useStore((s) => s.settings.dedRule);
  const dedications = useStore((s) => s.dedications);
  const releases = useStore((s) => s.releases);
  const profiles = useStore((s) => s.profiles);
  const bookSeats = useStore((s) => s.bookSeats);
  const cancelSeat = useStore((s) => s.cancelSeat);
  const releaseSeat = useStore((s) => s.releaseSeat);
  const takeBack = useStore((s) => s.takeBack);
  const dedicate = useStore((s) => s.dedicate);
  const undedicate = useStore((s) => s.undedicate);
  const ro = useReadOnly();
  const derived = useDerived();
  const [owner, setOwner] = useState<Assignment | undefined>();
  const [picking, setPicking] = useState<string | null>(null);

  const seat = selection && plan ? plan.seatById.get(selection) : undefined;
  if (!seat) {
    return (
      <div className="card" aria-live="polite" data-testid="seat-card">
        <h3>Pick a seat</h3>
        <p className="empty">
          Select any seat on the map to see who has it and to book it. Your own seats are filled
          blue.
        </p>
      </div>
    );
  }

  const code = seatLabel(seat);
  const st = derived.status.get(seat.id) ?? 'free';
  const names: NameContext = { meId: me?.id ?? null, profiles };
  const ded = dedications[seat.id];
  const bookings = derived.bookingsBySeat.get(seat.id) ?? [];
  const isAdmin = me?.isAdmin === true;
  const isOwner = ded !== undefined && me !== null && ded.owner === me.id;
  const released = releases[seat.id] !== undefined;
  const othersHold = bookings.some((b) => me && b.by !== me.id);
  const pickingHere = picking === seat.id;

  return (
    <div className="card" aria-live="polite" data-testid="seat-card">
      <div className="seatbig">
        <span className="code">{code}</span>
        <span className={`chip ${st}`}>{STATUS_TEXT[st]}</span>
      </div>
      <dl className="kv">
        <dt>Area</dt>
        <dd>{partName(seat.part)}</dd>
        <dt>When</dt>
        <dd>
          {formatLong(date)}
          {slotSuffix(slot)}
        </dd>
        {ded && (
          <>
            <dt>Dedicated to</dt>
            <dd>{personName({ by: ded.owner }, names)}</dd>
          </>
        )}
        {bookings.length > 0 && (
          <>
            <dt>Booked by</dt>
            <dd>{bookedByText(bookings, derived.slots.length, names)}</dd>
          </>
        )}
      </dl>

      <div className="btns">
        {(st === 'free' || st === 'partial') && (
          <button
            type="button"
            className="btn primary"
            disabled={ro}
            onClick={() => void bookSeats([{ seat: seat.id }])}
          >
            {st === 'partial' ? 'Book the free half' : 'Book this seat'}
          </button>
        )}
        {st === 'mine' && (
          <button
            type="button"
            className="btn"
            disabled={ro}
            onClick={() => void cancelSeat(seat.id)}
          >
            Cancel my booking
          </button>
        )}
        {/* domain-model.md "Available actions per status": a taken seat I booked for a
            colleague can be cancelled by me (R-8, R-16). */}
        {st === 'taken' && me && bookings.some((b) => b.bookedBy === me.id) && (
          <button
            type="button"
            className="btn"
            disabled={ro}
            onClick={() => void cancelSeat(seat.id)}
          >
            Cancel booking
          </button>
        )}
        {/* R-20, decision 0002 "release": owner releases or takes back for this day. */}
        {isOwner &&
          dedRule === 'release' &&
          (released ? (
            <button
              type="button"
              className="btn ded"
              disabled={ro || othersHold}
              onClick={() => void takeBack(seat.id)}
            >
              Take my seat back
            </button>
          ) : (
            <button
              type="button"
              className="btn ded"
              disabled={ro}
              onClick={() => void releaseSeat(seat.id)}
            >
              Release for this day
            </button>
          ))}
        {/* R-21: admin dedication controls (O-2, O-7). */}
        {isAdmin && ded && (
          <button
            type="button"
            className="btn ded"
            disabled={ro}
            onClick={() => void undedicate(seat.id)}
          >
            Remove dedication
          </button>
        )}
        {isAdmin && !ded && st !== 'off' && !pickingHere && (
          <button
            type="button"
            className="btn ded"
            disabled={ro}
            onClick={() => {
              setOwner(undefined);
              setPicking(seat.id);
            }}
          >
            Make dedicated
          </button>
        )}
      </div>

      {isAdmin && !ded && pickingHere && (
        <div className="assign">
          <label htmlFor="ded-owner" className="hint">
            Dedicate {code} to
          </label>
          <PersonSearch
            inputId="ded-owner"
            placeholder="Search a colleague…"
            value={owner}
            onChange={setOwner}
            allowLabel={false}
            autoFocus
          />
          <div className="btns">
            <button
              type="button"
              className="btn primary"
              disabled={ro || owner?.kind !== 'user'}
              onClick={() => {
                if (owner?.kind === 'user') {
                  void dedicate(seat.id, owner.id);
                  setPicking(null);
                }
              }}
            >
              Dedicate
            </button>
            <button type="button" className="btn" onClick={() => setPicking(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {ro ? (
        <p className="hint">You can look but not book: this view is read-only for you.</p>
      ) : (
        isAdmin && (
          <p className="hint">Dedication controls show because you are an admin (O-2, O-7).</p>
        )
      )}
    </div>
  );
}
