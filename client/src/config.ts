// Client-side constants that mirror server configuration.

// The office time zone (R-30) is not a constant here: it arrives in `GET /api/me` as
// `officeTz` and the store recomputes "today" and the day picker from it (api.md "Identity").

/** How many workdays the day picker offers (R-2). */
export const WORKDAY_COUNT = 10;

/** localStorage key for the open-question switches (domain-model.md "Per-user settings"). */
export const SETTINGS_KEY = 'seat.settings';

/** Toast auto-hide delay, "about 3 s" (ui.md Layout 6). */
export const TOAST_MS = 3200;
