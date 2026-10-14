// GET /api/events: Server-Sent Events (api.md "Live updates", R-26).
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app.js';
import { requireUser } from '../auth.js';

export function registerEventRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/events', (request, reply) => {
    requireUser(request);
    // Take over the socket; Fastify must not try to serialise a response.
    reply.hijack();
    ctx.bus.attach(reply.raw);
  });
}
