// Single Zustand store for the one-page client (docs/ui.md). Holds session, floor plan,
// the chosen day and slot, the open-question switches (decisions 0001–0003, persisted per
// browser), the data for the chosen day, selection and team state, and the toast.
import { create } from 'zustand';
import {
  DEFAULT_SETTINGS,
  SIM_USER,
  bookingId,
  clampTeamSize,
  findTogether,
  loadFloorPlan,
  settingsSchema,
  slotsFor,
  DEFAULT_OFFICE_TZ,
  todayIso,
  workdays,
} from '@seat/shared';
import type {
  Booking,
  BookingEvent,
  CreateBookingsRequest,
  Dedication,
  DedicationEvent,
  IndexedFloorPlan,
  IsoDate,
  Me,
  Release,
  ReleaseEvent,
  Settings,
  UserProfile,
} from '@seat/shared';
import { ApiError, api } from './api';
import { SETTINGS_KEY, WORKDAY_COUNT } from './config';
import { derive } from './derive';
import { connectEvents, disconnectEvents } from './events';
import { TEXT } from './format';
import type { SlotChoice } from './format';
import { personName } from './names';

/** Mode pill states (ui.md "Mode pill"); `unauthenticated` shows the dev sign-in card. */
export type Mode = 'connecting' | 'shared' | 'readonly' | 'unauthenticated';

/** Who sits on a team seat (R-15): a colleague from the directory or a free-text label. */
export type Assignment = { kind: 'user'; id: string } | { kind: 'label'; label: string };

export interface Toast {
  id: number;
  text: string;
}

export interface AppData {
  me: Me | null;
  mode: Mode;
  floorPlan: IndexedFloorPlan | null;
  today: IsoDate;
  days: IsoDate[];
  date: IsoDate;
  slot: SlotChoice;
  settings: Settings;
  /** Bookings for `date`, keyed by `date_slot_seat`. */
  dayBookings: Record<string, Booking>;
  /** Releases for `date`, keyed by seat. */
  releases: Record<string, Release>;
  /** All dedications, keyed by seat. */
  dedications: Record<string, Dedication>;
  /** The current user's bookings, today or later (R-11). */
  myBookings: Booking[];
  selection: string | null;
  /** Seat the map should move keyboard focus to (My bookings "Show"). */
  focusSeat: string | null;
  team: string[];
  teamAssign: Record<string, Assignment | undefined>;
  profiles: Record<string, UserProfile>;
  toast: Toast | null;
}

export interface AppActions {
  boot: () => Promise<void>;
  signIn: (id: string) => Promise<void>;
  loadAll: () => Promise<void>;
  refreshDay: () => Promise<void>;
  refreshMine: () => Promise<void>;
  setDate: (date: IsoDate) => void;
  setSlot: (slot: SlotChoice) => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  selectSeat: (seat: string) => void;
  showBooking: (seat: string, date?: IsoDate) => void;
  clearFocus: () => void;
  showToast: (text: string) => void;
  hideToast: () => void;
  bookSeats: (items: CreateBookingsRequest['items']) => Promise<void>;
  cancelSeat: (seat: string) => Promise<void>;
  cancelBookings: (ids: string[], seat: string, date: IsoDate) => Promise<void>;
  releaseSeat: (seat: string) => Promise<void>;
  takeBack: (seat: string) => Promise<void>;
  dedicate: (seat: string, owner: string) => Promise<void>;
  undedicate: (seat: string) => Promise<void>;
  findTeam: (n: number) => void;
  assign: (seat: string, a: Assignment | undefined) => void;
  clearTeam: () => void;
  bookTeam: () => Promise<void>;
  applyBookingEvent: (e: BookingEvent) => void;
  applyReleaseEvent: (e: ReleaseEvent) => void;
  applyDedicationEvent: (e: DedicationEvent) => void;
  resolveProfiles: (ids: Iterable<string>) => Promise<void>;
  cacheProfile: (p: UserProfile) => void;
}

export type AppStore = AppData & AppActions;

/** Read the switches from localStorage, falling back to the defaults on anything odd. */
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = settingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage may be unavailable (private mode); the switch still works for this page view.
  }
}

function byKey<T>(items: readonly T[], key: (t: T) => string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const it of items) out[key(it)] = it;
  return out;
}

/** Fresh data state; also used by tests to reset between scenarios. */
export function initialData(): AppData {
  // Placeholder zone until GET /api/me supplies `officeTz` (R-30); `boot` recomputes.
  const today = todayIso(DEFAULT_OFFICE_TZ);
  const days = workdays(WORKDAY_COUNT, today);
  return {
    me: null,
    mode: 'connecting',
    floorPlan: null,
    today,
    days,
    date: days[0]!,
    slot: 'day',
    settings: loadSettings(),
    dayBookings: {},
    releases: {},
    dedications: {},
    myBookings: [],
    selection: null,
    focusSeat: null,
    team: [],
    teamAssign: {},
    profiles: {},
    toast: null,
  };
}

let toastSeq = 0;

export const useStore = create<AppStore>()((set, get) => {
  const deriveNow = () => {
    const s = get();
    return derive({
      plan: s.floorPlan,
      meId: s.me?.id ?? null,
      settings: s.settings,
      slot: s.slot,
      dayBookings: s.dayBookings,
      dedications: s.dedications,
      releases: s.releases,
    });
  };

  /** Map an error from a write to the toasts and mode switch in ui.md (R-25, R-10). */
  const handleWriteError = (e: unknown, conflictText?: string) => {
    const toast = get().showToast;
    if (e instanceof ApiError) {
      if (e.code === 'forbidden') {
        toast(TEXT.forbidden);
        set({ mode: 'readonly' });
        return;
      }
      if (e.code === 'unauthenticated') {
        disconnectEvents();
        set({ me: null, mode: 'unauthenticated' });
        return;
      }
      if (e.code === 'conflict') {
        toast(conflictText ?? TEXT.otherError);
        return;
      }
      if (e.code === 'quota_exceeded') {
        toast(TEXT.quota);
        return;
      }
    }
    toast(TEXT.otherError);
  };

  const afterWrite = () => Promise.all([get().refreshDay(), get().refreshMine()]);

  return {
    ...initialData(),

    // Session: GET /api/me decides between the app and the dev sign-in card (decision 0007).
    async boot() {
      set({ mode: 'connecting' });
      let me: Me;
      try {
        me = await api.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          set({ me: null, mode: 'unauthenticated' });
        } else {
          setTimeout(() => void get().boot(), 3000);
        }
        return;
      }
      // R-30 / R-2: "today" and the day picker follow the office zone the server reports.
      const today = todayIso(me.officeTz);
      const days = workdays(WORKDAY_COUNT, today);
      set((s) => ({
        me,
        mode: me.canWrite ? 'shared' : 'readonly',
        profiles: { ...s.profiles, [me.id]: me },
        today,
        days,
        date: days.includes(s.date) ? s.date : days[0]!,
      }));
      await get().loadAll();
      connectEvents({
        onBooking: (e) => get().applyBookingEvent(e),
        onRelease: (e) => get().applyReleaseEvent(e),
        onDedication: (e) => get().applyDedicationEvent(e),
        // R-26: after a gap, refetch the current date and "mine" rather than trust patches.
        onReconnect: () => void afterWrite(),
      });
    },

    async signIn(id) {
      try {
        await api.devLogin(id);
      } catch {
        get().showToast(TEXT.otherError);
        return;
      }
      set({ dayBookings: {}, releases: {}, dedications: {}, myBookings: [], selection: null });
      await get().boot();
    },

    async loadAll() {
      const { date, floorPlan } = get();
      try {
        const [planRaw, deds, day, mine] = await Promise.all([
          floorPlan ? null : api.floorPlan(),
          api.dedications(),
          api.bookings(date),
          api.mine(),
        ]);
        const plan = planRaw ? loadFloorPlan(planRaw) : floorPlan;
        const dedications = byKey([...deds, ...mine.dedications], (d) => d.seat);
        set({
          floorPlan: plan,
          dedications,
          dayBookings: byKey(day.bookings, (b) => b.id),
          releases: byKey(day.releases, (r) => r.seat),
          myBookings: mine.bookings,
        });
        void get().resolveProfiles([...day.bookings.map((b) => b.by), ...deds.map((d) => d.owner)]);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          set({ me: null, mode: 'unauthenticated' });
          return;
        }
        get().showToast(TEXT.otherError);
      }
    },

    async refreshDay() {
      const date = get().date;
      try {
        const day = await api.bookings(date);
        if (get().date !== date) return; // the user moved on; a newer fetch is in flight
        set({
          dayBookings: byKey(day.bookings, (b) => b.id),
          releases: byKey(day.releases, (r) => r.seat),
        });
        void get().resolveProfiles(day.bookings.map((b) => b.by));
      } catch {
        // Keep what we have; the SSE stream or the next refetch will catch up.
      }
    },

    async refreshMine() {
      try {
        const mine = await api.mine();
        set((s) => ({
          myBookings: mine.bookings,
          dedications: { ...s.dedications, ...byKey(mine.dedications, (d) => d.seat) },
        }));
      } catch {
        // See refreshDay.
      }
    },

    // R-2: picking a day reloads that day's bookings and drops any team in progress.
    setDate(date) {
      if (date === get().date) return;
      set({ date, team: [], teamAssign: {}, dayBookings: {}, releases: {} });
      void get().refreshDay();
    },

    setSlot(slot) {
      set({ slot });
    },

    // Decisions 0001–0003: switches persist per browser and take effect immediately.
    setSetting(key, value) {
      const settings = { ...get().settings, [key]: value };
      saveSettings(settings);
      const patch: Partial<AppData> = { settings };
      if (key === 'slotSize' && value === 'day') patch.slot = 'day';
      if (key === 'area' && value === 'east') {
        const plan = get().floorPlan;
        const sel = get().selection;
        if (sel && plan?.seatById.get(sel)?.part !== 'east') patch.selection = null;
        patch.team = get().team.filter((id) => plan?.seatById.get(id)?.part === 'east');
      }
      set(patch);
    },

    // R-4, O-12: an "off" seat explains itself instead of selecting.
    selectSeat(seat) {
      const st = deriveNow().status.get(seat);
      if (st === 'off') {
        get().showToast(TEXT.offSeat(seat));
        return;
      }
      set((s) => ({ selection: s.selection === seat ? null : seat }));
    },

    // R-11 "Show": switch the day, select the seat, focus it on the map.
    showBooking(seat, date) {
      if (date && date !== get().date) get().setDate(date);
      set({ selection: seat, focusSeat: seat });
    },

    clearFocus() {
      set({ focusSeat: null });
    },

    showToast(text) {
      toastSeq += 1;
      set({ toast: { id: toastSeq, text } });
    },

    hideToast() {
      set({ toast: null });
    },

    // R-7, R-16, R-17: POST once; the response says what was booked and what was lost.
    async bookSeats(items) {
      const { date, settings, slot, me } = get();
      if (!me || items.length === 0) return;
      const slots = [...slotsFor(settings.slotSize, slot)];
      const single = items.length === 1 ? items[0]!.seat : undefined;
      try {
        const res = await api.createBookings({ date, slots, items });
        if (res.lost.length) get().showToast(TEXT.lost(res.lost));
        else if (res.booked.length === 1)
          get().showToast(TEXT.bookedOne(res.booked[0]!.seat, date));
        else get().showToast(TEXT.bookedMany(res.booked.length, date));
        set({ team: [], teamAssign: {} });
        await afterWrite();
      } catch (e) {
        handleWriteError(e, single ? TEXT.lost([single]) : undefined);
      }
    },

    // R-8: cancel every slot of the current selection that I may delete.
    async cancelSeat(seat) {
      const { date, settings, slot, me, dayBookings } = get();
      if (!me) return;
      const ids = slotsFor(settings.slotSize, slot)
        .map((sl) => bookingId(date, sl, seat))
        .filter((id) => {
          const b = dayBookings[id];
          return b !== undefined && (b.by === me.id || b.bookedBy === me.id);
        });
      await get().cancelBookings(ids, seat, date);
    },

    async cancelBookings(ids, seat, date) {
      if (ids.length === 0) return;
      try {
        await Promise.all(ids.map((id) => api.deleteBooking(id)));
        get().showToast(TEXT.cancelled(seat, date));
        await afterWrite();
      } catch (e) {
        handleWriteError(e);
      }
    },

    // R-20 (decision 0002 "release"): owner opens the seat for the chosen day.
    async releaseSeat(seat) {
      const date = get().date;
      try {
        await api.putRelease(date, seat);
        get().showToast(TEXT.released(seat, date));
        await get().refreshDay();
      } catch (e) {
        handleWriteError(e);
      }
    },

    async takeBack(seat) {
      const date = get().date;
      try {
        await api.deleteRelease(date, seat);
        get().showToast(TEXT.takenBack(seat));
        await get().refreshDay();
      } catch (e) {
        handleWriteError(e, TEXT.takeBackBlocked);
      }
    },

    // R-21: admin only; the server enforces it, the card only shows the controls.
    async dedicate(seat, owner) {
      try {
        await api.putDedication(seat, owner);
        await get().resolveProfiles([owner]);
        const s = get();
        const name = personName({ by: owner }, { meId: s.me?.id ?? null, profiles: s.profiles });
        get().showToast(TEXT.dedicated(seat, name));
        set((st) => ({ dedications: { ...st.dedications, [seat]: { seat, owner } } }));
        await afterWrite();
      } catch (e) {
        handleWriteError(e);
      }
    },

    async undedicate(seat) {
      try {
        await api.deleteDedication(seat);
        get().showToast(TEXT.undedicated(seat));
        set((st) => {
          const next = { ...st.dedications };
          delete next[seat];
          return { dedications: next };
        });
        await afterWrite();
      } catch (e) {
        handleWriteError(e);
      }
    },

    // R-13, R-14: the shared finder does the search; this only wires status and area.
    findTeam(raw) {
      const n = clampTeamSize(raw);
      const plan = get().floorPlan;
      if (!plan) return;
      const status = deriveNow().status;
      const found = findTogether(
        n,
        plan.blocks,
        (id) => status.get(id) === 'free',
        get().settings.area,
      );
      if (!found) {
        get().showToast(TEXT.noGroup(n));
        return;
      }
      set({ team: found, teamAssign: {}, selection: null });
      get().showToast(TEXT.foundGroup(n, found[0]!, found[found.length - 1]!));
    },

    assign(seat, a) {
      set((s) => ({ teamAssign: { ...s.teamAssign, [seat]: a } }));
    },

    clearTeam() {
      set({ team: [], teamAssign: {} });
    },

    // R-15, R-16: colleague → by; label → held by me with the label; else me.
    async bookTeam() {
      const { team, teamAssign } = get();
      const items = team.map((seat) => {
        const a = teamAssign[seat];
        if (a?.kind === 'user') return { seat, by: a.id };
        if (a?.kind === 'label') return { seat, label: a.label };
        return { seat };
      });
      await get().bookSeats(items);
    },

    // R-26: patch local state from the stream; only the current date's rows matter for the map.
    applyBookingEvent(e) {
      const s = get();
      if (e.op === 'set') {
        const b = e.booking;
        const patch: Partial<AppData> = {};
        if (b.date === s.date) patch.dayBookings = { ...s.dayBookings, [b.id]: b };
        if (s.me && b.by === s.me.id && b.date >= s.today) {
          patch.myBookings = [...s.myBookings.filter((x) => x.id !== b.id), b];
        }
        set(patch);
        void get().resolveProfiles([b.by]);
      } else {
        const patch: Partial<AppData> = {};
        if (s.dayBookings[e.id]) {
          const next = { ...s.dayBookings };
          delete next[e.id];
          patch.dayBookings = next;
        }
        if (s.myBookings.some((b) => b.id === e.id)) {
          patch.myBookings = s.myBookings.filter((b) => b.id !== e.id);
        }
        set(patch);
      }
    },

    applyReleaseEvent(e) {
      const s = get();
      if (e.date !== s.date) return;
      const next = { ...s.releases };
      if (e.op === 'set') next[e.seat] = e.release;
      else delete next[e.seat];
      set({ releases: next });
    },

    applyDedicationEvent(e) {
      const next = { ...get().dedications };
      if (e.op === 'set') {
        next[e.seat] = e.dedication;
        void get().resolveProfiles([e.dedication.owner]);
      } else delete next[e.seat];
      set({ dedications: next });
    },

    // R-23: ids → names and avatars, cached for the session; simulated ids are never resolved.
    async resolveProfiles(ids) {
      const known = get().profiles;
      const want = [...new Set(ids)].filter((id) => id && id !== SIM_USER && !known[id]);
      if (want.length === 0) return;
      try {
        const got = await api.resolveUsers(want);
        set((s) => ({ profiles: { ...s.profiles, ...got } }));
      } catch {
        // Names fall back to "Someone" until the next attempt.
      }
    },

    cacheProfile(p) {
      set((s) => ({ profiles: { ...s.profiles, [p.id]: p } }));
    },
  };
});
