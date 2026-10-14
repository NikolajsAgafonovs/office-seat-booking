// Server-Sent Events subscription (docs/api.md "Live updates", R-26). The browser's
// EventSource is wrapped so reconnects use exponential backoff and the caller can refetch
// the current date after a gap.
import type { BookingEvent, DedicationEvent, ReleaseEvent } from '@seat/shared';

export interface EventHandlers {
  onBooking: (e: BookingEvent) => void;
  onRelease: (e: ReleaseEvent) => void;
  onDedication: (e: DedicationEvent) => void;
  /** Called once the stream is open again after an error. */
  onReconnect: () => void;
}

const MAX_DELAY_MS = 30_000;

let current: { close: () => void } | null = null;

function parse<T>(ev: Event): T | null {
  const data = (ev as MessageEvent<string>).data;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/** Open the stream; returns a function that closes it. Only one stream exists at a time. */
export function connectEvents(h: EventHandlers): () => void {
  current?.close();
  let es: EventSource | null = null;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let reconnecting = false;

  const open = () => {
    if (closed || typeof EventSource === 'undefined') return;
    es = new EventSource('/api/events');
    es.addEventListener('open', () => {
      attempt = 0;
      if (reconnecting) {
        reconnecting = false;
        h.onReconnect();
      }
    });
    es.addEventListener('booking', (ev) => {
      const d = parse<BookingEvent>(ev);
      if (d) h.onBooking(d);
    });
    es.addEventListener('release', (ev) => {
      const d = parse<ReleaseEvent>(ev);
      if (d) h.onRelease(d);
    });
    es.addEventListener('dedication', (ev) => {
      const d = parse<DedicationEvent>(ev);
      if (d) h.onDedication(d);
    });
    es.addEventListener('error', () => {
      es?.close();
      es = null;
      reconnecting = true;
      const delay = Math.min(MAX_DELAY_MS, 1000 * 2 ** attempt);
      attempt += 1;
      timer = setTimeout(open, delay);
    });
  };
  open();

  const handle = {
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      es?.close();
      es = null;
    },
  };
  current = handle;
  return () => {
    handle.close();
    if (current === handle) current = null;
  };
}

/** Close whatever stream is open (used on sign-out and in tests). */
export function disconnectEvents(): void {
  current?.close();
  current = null;
}
