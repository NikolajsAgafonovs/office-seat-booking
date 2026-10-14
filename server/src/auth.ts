// Identity: session cookie plus a user directory (R-22 to R-25, decision 0007).
// Only the development provider exists; it offers a fixed set of fixture users.
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Me, UserProfile } from '@seat/shared';
import type { Config } from './config.js';
import { errors } from './errors.js';

export const SESSION_COOKIE = 'seat_session';

/** What a directory must provide. An OIDC/Graph implementation would replace DevDirectory. */
export interface Directory {
  get(id: string): UserProfile | undefined;
  /** R-24: name search, at most `limit` results. */
  search(q: string, limit: number): UserProfile[];
  /** Used by POST /api/users/resolve. Unknown ids are omitted. */
  resolve(ids: readonly string[]): Record<string, UserProfile>;
  /** Dev provider only: everyone who can sign in. */
  all(): UserProfile[];
}

/** Inline SVG avatar with initials so the dev provider needs no network. */
export function initialsAvatar(name: string, hue: number): string {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="32" fill="hsl(${hue} 45% 45%)"/>` +
    `<text x="32" y="40" font-family="Segoe UI, sans-serif" font-size="26" font-weight="600" ` +
    `fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Fixture users; roles come from configuration (ADMIN_USERS, READONLY_USERS). */
export const DEV_USERS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'alice', name: 'Alice Andersen' },
  { id: 'bob', name: 'Bob Bērziņš' },
  { id: 'carol', name: 'Carol Kalniņa' },
  { id: 'dan', name: 'Dan Ozols' },
  { id: 'eve', name: 'Eve Eglīte' },
  { id: 'frank', name: 'Frank Liepiņš' },
];

export class DevDirectory implements Directory {
  private readonly users: Map<string, UserProfile>;

  constructor(users: ReadonlyArray<{ id: string; name: string }> = DEV_USERS) {
    this.users = new Map(
      users.map((u, i) => [
        u.id,
        { id: u.id, name: u.name, avatarUrl: initialsAvatar(u.name, (i * 67) % 360) },
      ]),
    );
  }
  get(id: string): UserProfile | undefined {
    return this.users.get(id);
  }
  search(q: string, limit: number): UserProfile[] {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return [...this.users.values()]
      .filter((u) => u.name.toLowerCase().includes(needle) || u.id.toLowerCase().includes(needle))
      .slice(0, limit);
  }
  resolve(ids: readonly string[]): Record<string, UserProfile> {
    const out: Record<string, UserProfile> = {};
    for (const id of new Set(ids)) {
      const u = this.users.get(id);
      if (u) out[id] = u;
    }
    return out;
  }
  all(): UserProfile[] {
    return [...this.users.values()];
  }
}

/** Build the `Me` view: identity plus permissions (R-25, decision 0004). */
export function toMe(profile: UserProfile, config: Config): Me {
  return {
    id: profile.id,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    canWrite: !config.readonlyUsers.has(profile.id),
    isAdmin: config.adminUsers.has(profile.id),
    officeTz: config.officeTz,
  };
}

/** Read the signed session cookie and resolve the user, or null. */
export function userFromRequest(
  request: FastifyRequest,
  directory: Directory,
  config: Config,
): Me | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  const profile = directory.get(unsigned.value);
  return profile ? toMe(profile, config) : null;
}

/** httpOnly, sameSite, path and secure come from the cookie plugin defaults (app.ts). */
export function setSession(reply: FastifyReply, userId: string): void {
  reply.setCookie(SESSION_COOKIE, userId, { signed: true });
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** Throws `unauthenticated` when there is no session. */
export function requireUser(request: FastifyRequest): Me {
  if (!request.user) throw errors.unauthenticated();
  return request.user;
}

/** Throws `forbidden` for read-only users (R-25). */
export function requireWriter(request: FastifyRequest): Me {
  const me = requireUser(request);
  if (!me.canWrite) throw errors.forbidden('This account is read-only.');
  return me;
}

/** Throws `forbidden` for non-admins (R-21, decision 0004). */
export function requireAdmin(request: FastifyRequest): Me {
  const me = requireWriter(request);
  if (!me.isAdmin) throw errors.forbidden('Only admins can manage dedicated seats.');
  return me;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: Me | null;
  }
}
