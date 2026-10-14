// Typed fetch wrapper over the HTTP contract in docs/api.md. Every call goes to the
// same-origin `/api` prefix with the session cookie (decision 0007).
import type {
  ApiError as ApiErrorEnvelope,
  ApiErrorCode,
  BookingsForDate,
  CreateBookingsRequest,
  CreateBookingsResponse,
  Dedication,
  IsoDate,
  Me,
  MyBookings,
  UserProfile,
} from '@seat/shared';

/** Thrown for any non-2xx response or network failure; `code` follows the api.md table. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | 'network' | 'unknown';
  constructor(status: number, code: ApiError['code'], message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, 'network', e instanceof Error ? e.message : 'network error');
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }
  if (!res.ok) {
    const env = data as Partial<ApiErrorEnvelope> | undefined;
    throw new ApiError(
      res.status,
      env?.error?.code ?? 'unknown',
      env?.error?.message ?? res.statusText,
    );
  }
  return data as T;
}

const enc = encodeURIComponent;

export const api = {
  /** GET /api/me */
  me: () => request<Me>('GET', '/me'),
  /** Dev identity provider (decision 0007, option 2). */
  devUsers: () => request<UserProfile[]>('GET', '/dev/users'),
  devLogin: (id: string) => request<void>('POST', '/dev/login', { id }),
  devLogout: () => request<void>('POST', '/dev/logout'),
  /** GET /api/floor-plan, validated by the caller with `loadFloorPlan` (C-2). */
  floorPlan: () => request<unknown>('GET', '/floor-plan'),
  /** GET /api/bookings?date= (R-3, R-5) */
  bookings: (date: IsoDate) => request<BookingsForDate>('GET', `/bookings?date=${enc(date)}`),
  /** GET /api/bookings/mine (R-11, R-19) */
  mine: () => request<MyBookings>('GET', '/bookings/mine'),
  /** POST /api/bookings (R-16, R-17) */
  createBookings: (body: CreateBookingsRequest) =>
    request<CreateBookingsResponse>('POST', '/bookings', body),
  /** DELETE /api/bookings/:id where id is `date_slot_seat` (R-8) */
  deleteBooking: (id: string) => request<void>('DELETE', `/bookings/${enc(id)}`),
  /** GET /api/dedications (R-18) */
  dedications: () => request<Dedication[]>('GET', '/dedications'),
  /** PUT /api/dedications/:seat, admin only (R-21) */
  putDedication: (seat: string, owner: string) =>
    request<unknown>('PUT', `/dedications/${enc(seat)}`, { owner }),
  deleteDedication: (seat: string) => request<void>('DELETE', `/dedications/${enc(seat)}`),
  /** PUT / DELETE /api/releases/:date/:seat, owner only (R-20) */
  putRelease: (date: IsoDate, seat: string) =>
    request<void>('PUT', `/releases/${enc(date)}/${enc(seat)}`),
  deleteRelease: (date: IsoDate, seat: string) =>
    request<void>('DELETE', `/releases/${enc(date)}/${enc(seat)}`),
  /** GET /api/users?q= directory search (R-24) */
  searchUsers: (q: string) => request<UserProfile[]>('GET', `/users?q=${enc(q)}`),
  /** POST /api/users/resolve for occupant and owner names (R-23) */
  resolveUsers: (ids: string[]) =>
    request<Record<string, UserProfile>>('POST', '/users/resolve', { ids }),
};
