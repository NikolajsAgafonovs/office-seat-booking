// App bar (ui.md Layout 1): product name, environment note, mode pill, current user (R-23).
import { useStore } from '../store';
import type { Mode } from '../store';

/** Pill texts from ui.md "Mode pill". `unauthenticated` is not in the table; see report. */
const PILL: Record<Mode, string> = {
  shared: 'Shared · live for everyone',
  readonly: 'Read-only',
  connecting: 'Connecting…',
  unauthenticated: 'Signed out',
};

export function AppBar() {
  const mode = useStore((s) => s.mode);
  const me = useStore((s) => s.me);
  return (
    <header className="bar">
      <div className="brand">
        <h1>Office seat booking</h1>
        <p>Draft floor plan · development build with simulated bookings · one floor</p>
      </div>
      <div className="who">
        <span className={`mode-pill ${mode}`} data-testid="mode-pill">
          {PILL[mode]}
        </span>
        {me && (
          <>
            <img src={me.avatarUrl} alt="" />
            <span className="muted">{me.name}</span>
          </>
        )}
      </div>
    </header>
  );
}
