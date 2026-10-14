// Fastify application factory. Wires config, database, directory, event bus and routes.
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
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
  const app = Fastify({ logger: opts.logger ?? false });
  const ctx: AppContext = {
    config: opts.config,
    db: opts.db,
    directory: opts.directory,
    plan: opts.plan,
    bus: new EventBus(),
    now: opts.now ?? (() => new Date()),
  };

  app.register(cookie, { secret: opts.config.cookieSecret });

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

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ error: { code: 'not_found', message: 'No such route' } }),
  );

  app.register(
    async (api) => {
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
