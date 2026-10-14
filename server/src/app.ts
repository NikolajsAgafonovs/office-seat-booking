// Fastify application factory. Wires config, database, directory, event bus and routes.
import { existsSync } from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import type { IndexedFloorPlan } from '@seat/shared';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { type Directory, userFromRequest } from './auth.js';
import { EventBus } from './events.js';
import { ApiHttpError } from './errors.js';
import { registerMeRoutes } from './routes/me.js';
import { registerUserRoutes } from './routes/users.js';
import { registerFloorPlanRoutes } from './routes/floorPlan.js';
import { registerBookingRoutes } from './routes/bookings.js';
import { registerDedicationRoutes } from './routes/dedications.js';
import { registerReleaseRoutes } from './routes/releases.js';
import { registerEventRoutes } from './routes/events.js';
import { registerDevRoutes } from './routes/dev.js';

export interface AppContext {
  config: Config;
  db: Db;
  directory: Directory;
  plan: IndexedFloorPlan;
  bus: EventBus;
  /** Injectable clock so tests can freeze "today" (acceptance.md fixtures). */
  now: () => Date;
}

export interface AppOptions {
  config: Config;
  db: Db;
  directory: Directory;
  plan: IndexedFloorPlan;
  now?: () => Date;
  logger?: boolean;
}

export function buildApp(opts: AppOptions): FastifyInstance & { ctx: AppContext } {
  const app = Fastify({ logger: opts.logger ?? false, trustProxy: opts.config.trustProxy });
  const ctx: AppContext = {
    config: opts.config,
    db: opts.db,
    directory: opts.directory,
    plan: opts.plan,
    bus: new EventBus(),
    now: opts.now ?? (() => new Date()),
  };

  app.register(cookie, {
    secret: opts.config.cookieSecret,
    // Defaults for every setCookie (decision 0009: Secure behind the TLS-terminating proxy).
    parseOptions: { httpOnly: true, sameSite: 'lax', path: '/', secure: opts.config.secureCookies },
  });

  // Decision 0009: one image serves the built client. Hashed assets are immutable; index.html is not.
  const clientDist = opts.config.clientDist;
  const serveClient = clientDist !== null && existsSync(clientDist);
  if (serveClient) {
    // Vite's hashed files: cache for a year.
    app.register(fastifyStatic, {
      root: path.join(clientDist, 'assets'),
      prefix: '/assets/',
      maxAge: '1y',
      immutable: true,
      decorateReply: false,
    });
    // index.html and anything else at the root: always revalidate. Uses the `/*` wildcard so
    // the `/assets/*` route above stays more specific; misses fall through to the not-found
    // handler below.
    app.register(fastifyStatic, {
      root: clientDist,
      index: ['index.html'],
      maxAge: 0,
    });
  }

  app.decorateRequest('user', null);
  app.addHook('onRequest', async (request) => {
    request.user = userFromRequest(request, ctx.directory, ctx.config);
  });

  // One error envelope for everything (api.md "Errors").
  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof ApiHttpError) {
      return reply.status(err.status).send({ error: { code: err.code, message: err.message } });
    }
    const fastifyErr = err as { statusCode?: number; message?: string };
    if (fastifyErr.statusCode && fastifyErr.statusCode < 500) {
      return reply.status(fastifyErr.statusCode).send({
        error: { code: 'invalid_argument', message: fastifyErr.message ?? 'Bad request' },
      });
    }
    app.log.error(err);
    return reply.status(500).send({ error: { code: 'internal', message: 'Unexpected error' } });
  });

  // Unknown /api paths get the JSON envelope; anything else is the single-page client
  // (api.md "Operations", decision 0009).
  app.setNotFoundHandler((request, reply) => {
    const isApi = request.url === '/api' || request.url.startsWith('/api/');
    const isPage = request.method === 'GET' || request.method === 'HEAD';
    if (serveClient && !isApi && isPage) return reply.sendFile('index.html');
    return reply.status(404).send({ error: { code: 'not_found', message: 'No such route' } });
  });

  app.register(
    async (api) => {
      // Public liveness check for the host (decision 0009).
      api.get('/health', async () => ({ ok: true }));
      registerMeRoutes(api, ctx);
      registerUserRoutes(api, ctx);
      registerFloorPlanRoutes(api, ctx);
      registerBookingRoutes(api, ctx);
      registerDedicationRoutes(api, ctx);
      registerReleaseRoutes(api, ctx);
      registerEventRoutes(api, ctx);
      if (ctx.config.authMode === 'dev') registerDevRoutes(api, ctx);
    },
    { prefix: '/api' },
  );

  app.addHook('onClose', async () => {
    ctx.bus.closeAll();
    await ctx.db.$disconnect();
  });

  return Object.assign(app, { ctx });
}
