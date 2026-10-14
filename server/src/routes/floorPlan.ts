// GET /api/floor-plan (api.md "Floor plan", R-1, C-2).
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app.js';
import { requireUser } from '../auth.js';

export function registerFloorPlanRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/floor-plan', async (request, reply) => {
    requireUser(request);
    reply.header('Cache-Control', 'private, max-age=3600');
    const { seatById: _seatById, ...plan } = ctx.plan;
    return plan;
  });
}
