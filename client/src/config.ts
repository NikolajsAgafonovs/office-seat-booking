// Client-side constants that mirror server configuration.
import { DEFAULT_OFFICE_TZ } from '@seat/shared';

/**
 * Office time zone for "today" and the workday picker (R-30, R-2). The server reads
 * OFFICE_TZ from its environment; api.md exposes no endpoint for it, so the client uses the
 * shared default. Flagged in the sync report.
 */
export const OFFICE_TZ = DEFAULT_OFFICE_TZ;

/** How many workdays the day picker offers (R-2). */
export const WORKDAY_COUNT = 10;

/** localStorage key for the open-question switches (domain-model.md "Per-user settings"). */
export const SETTINGS_KEY = 'seat.settings';

/** Toast auto-hide delay, "about 3 s" (ui.md Layout 6). */
export const TOAST_MS = 3200;
