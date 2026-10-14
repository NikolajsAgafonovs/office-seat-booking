// GET /api/me (api.md "Identity", R-23, R-25).
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app.js';
import { requireUser } from '../auth.js';

export function registerMeRoutes(app: FastifyInstance, _ctx: AppContext): void {
  app.get('/me', async (request) => requireUser(request));
}
