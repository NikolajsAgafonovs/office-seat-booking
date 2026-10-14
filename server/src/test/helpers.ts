// Test app factory: fresh database per test file, frozen clock, fixture users (acceptance.md).
import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import { buildApp, type AppContext } from '../app.js';
import { DevDirectory, SESSION_COOKIE } from '../auth.js';
import type { Config } from '../config.js';
import { createDb } from '../db.js';
import { readFloorPlan } from '../floorPlan.js';
import { TEMPLATE_DB, TMP_DIR } from './globalSetup.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FLOOR_PLAN_PATH = path.join(serverRoot, '../docs/floor-plan.json');
export const FIXTURE_PATH = path.join(serverRoot, '../docs/fixtures/simulated-bookings.json');

/** "Today" is frozen to Wednesday 14 Oct 2026, 09:00 in Riga. */
export const WEDNESDAY = new Date('2026-10-14T09:00:00+03:00');
export const TODAY = '2026-10-14';
export const THURSDAY = '2026-10-15';
export const FRIDAY = '2026-10-16';
export const YESTERDAY = '2026-10-13';

export interface TestApp {
  app: FastifyInstance & { ctx: AppContext };
  ctx: AppContext;
  /** Inject a request as a fixture user (alice, bob, carol = admin, dan = read-only) or anonymous. */
  as(user: string | null, opts: InjectOptions): Promise<LightMyRequestResponse>;
  json<T = unknown>(res: LightMyRequestResponse): T;
  close(): Promise<void>;
}

export async function createTestApp(
  overrides: { now?: () => Date; clientDist?: string } = {},
): Promise<TestApp> {
  const dbFile = path.join(TMP_DIR, `${randomUUID()}.db`);
  copyFileSync(TEMPLATE_DB, dbFile);
  const config: Config = {
    port: 0,
    databaseUrl: `file:${dbFile.replace(/\\/g, '/')}`,
    authMode: 'dev',
    adminUsers: new Set(['carol']),
    readonlyUsers: new Set(['dan']),
    officeTz: 'Europe/Riga',
    floorPlanPath: FLOOR_PLAN_PATH,
    cookieSecret: 'test-secret',
    clientDist: overrides.clientDist ?? null,
    trustProxy: false,
    secureCookies: false,
  };
  const app = buildApp({
    config,
    db: createDb(config.databaseUrl),
    directory: new DevDirectory(),
    plan: readFloorPlan(FLOOR_PLAN_PATH),
    now: overrides.now ?? (() => WEDNESDAY),
  });
  await app.ready();
  return {
    app,
    ctx: app.ctx,
    as(user, opts) {
      const headers = { ...(opts.headers ?? {}) } as Record<string, string>;
      if (user) headers.cookie = `${SESSION_COOKIE}=${app.signCookie(user)}`;
      return app.inject({ ...opts, headers });
    },
    json<T>(res: LightMyRequestResponse): T {
      return res.json() as T;
    },
    close: () => app.close(),
  };
}

/** Shorthand to book `seat` for `user` on `date` with the given slots. */
export async function book(
  t: TestApp,
  user: string,
  date: string,
  seat: string,
  slots: Array<'am' | 'pm'> = ['am', 'pm'],
): Promise<LightMyRequestResponse> {
  return t.as(user, {
    method: 'POST',
    url: '/api/bookings',
    payload: { date, slots, items: [{ seat }] },
  });
}
