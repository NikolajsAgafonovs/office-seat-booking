// React hooks over the store: the derived seat view and a read-only flag (R-25).
import { useMemo } from 'react';
import { derive } from './derive';
import type { Derived } from './derive';
import { useStore } from './store';

/** Statuses and counts for the chosen day and slot, recomputed only when inputs change. */
export function useDerived(): Derived {
  const plan = useStore((s) => s.floorPlan);
  const meId = useStore((s) => s.me?.id ?? null);
  const settings = useStore((s) => s.settings);
  const slot = useStore((s) => s.slot);
  const dayBookings = useStore((s) => s.dayBookings);
  const dedications = useStore((s) => s.dedications);
  const releases = useStore((s) => s.releases);
  return useMemo(
    () => derive({ plan, meId, settings, slot, dayBookings, dedications, releases }),
    [plan, meId, settings, slot, dayBookings, dedications, releases],
  );
}

/** True when every write control must be disabled (R-25). */
export function useReadOnly(): boolean {
  return useStore((s) => s.mode === 'readonly' || !s.me || !s.me.canWrite);
}
