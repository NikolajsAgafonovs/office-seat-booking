// Controls row (ui.md Layout 2): day picker and time picker.
import { dayNumber, formatLong, formatWeekday, toUtcNoon } from '@seat/shared';
import { useStore } from '../store';

function monthShort(iso: string): string {
  return toUtcNoon(iso).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
}

/** R-2: the next 10 workdays as toggle buttons with aria-pressed (R-29). */
export function DayPicker() {
  const days = useStore((s) => s.days);
  const date = useStore((s) => s.date);
  const setDate = useStore((s) => s.setDate);
  return (
    <div className="field field-days">
      <span className="label" id="daysLabel">
        Day
      </span>
      <div className="days" role="group" aria-labelledby="daysLabel">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            className="day"
            aria-pressed={d === date}
            aria-label={formatLong(d)}
            data-date={d}
            onClick={() => setDate(d)}
          >
            <small>{formatWeekday(d)}</small>
            <b>{dayNumber(d)}</b>
            <small>{monthShort(d)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Decision 0001: Morning/Afternoon are only enabled when the switch is `half`. */
export function SlotPicker() {
  const slot = useStore((s) => s.slot);
  const half = useStore((s) => s.settings.slotSize === 'half');
  const setSlot = useStore((s) => s.setSlot);
  return (
    <div className="field">
      <span className="label" id="slotLabel">
        Time
      </span>
      <div className="seg" role="group" aria-labelledby="slotLabel">
        <button type="button" aria-pressed={slot === 'day'} onClick={() => setSlot('day')}>
          Full day
        </button>
        <button
          type="button"
          aria-pressed={slot === 'am'}
          disabled={!half}
          onClick={() => setSlot('am')}
        >
          Morning
        </button>
        <button
          type="button"
          aria-pressed={slot === 'pm'}
          disabled={!half}
          onClick={() => setSlot('pm')}
        >
          Afternoon
        </button>
      </div>
    </div>
  );
}

export function Controls() {
  return (
    <div className="controls">
      <DayPicker />
      <SlotPicker />
    </div>
  );
}
