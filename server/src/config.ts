// Runtime configuration. Sources: .env.example at the repo root, decisions 0004, 0007, 0008.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_OFFICE_TZ } from '@seat/shared';

export interface Config {
  port: number;
  databaseUrl: string;
  /** Decision 0007: only the dev provider is wired. */
  authMode: 'dev';
  /** Decision 0004 (open, option 1): configured admin list. */
  adminUsers: ReadonlySet<string>;
  /** R-25: users who may read but not write. */
  readonlyUsers: ReadonlySet<string>;
  /** R-30 */
  officeTz: string;
  /** C-2: docs/floor-plan.json is the source of truth. */
  floorPlanPath: string;
  cookieSecret: string;
  /** Decision 0009: serve the built client from this directory; unset in development. */
  clientDist: string | null;
  /** Decision 0009: behind the Fly proxy, trust X-Forwarded-* and mark cookies Secure. */
  trustProxy: boolean;
  secureCookies: boolean;
}

function list(v: string | undefined): Set<string> {
  return new Set(
    (v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const authMode = env.AUTH_MODE ?? 'dev';
  const production = env.NODE_ENV === 'production';
  if (authMode !== 'dev') {
    throw new Error(
      `AUTH_MODE=${authMode} is not implemented yet; only "dev" is wired (decision 0007).`,
    );
  }
  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL ?? 'file:./dev.db',
    authMode,
    adminUsers: list(env.ADMIN_USERS),
    readonlyUsers: list(env.READONLY_USERS),
    officeTz: env.OFFICE_TZ ?? DEFAULT_OFFICE_TZ,
    floorPlanPath: path.resolve(serverRoot, env.FLOOR_PLAN_PATH ?? '../docs/floor-plan.json'),
    cookieSecret: env.COOKIE_SECRET ?? 'dev-only-secret-change-in-deployment',
    clientDist: env.CLIENT_DIST ? path.resolve(serverRoot, env.CLIENT_DIST) : null,
    trustProxy: env.TRUST_PROXY ? env.TRUST_PROXY !== '0' : production,
    secureCookies: env.COOKIE_SECURE ? env.COOKIE_SECURE !== '0' : production,
  };
}
