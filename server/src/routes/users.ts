// GET /api/users?q= and POST /api/users/resolve (api.md "Identity", R-24).
import type { FastifyInstance } from 'fastify';
import { resolveUsersSchema } from '@seat/shared';
import type { AppContext } from '../app.js';
import { requireUser } from '../auth.js';
import { parseOrThrow } from '../errors.js';

export function registerUserRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Querystring: { q?: string } }>('/users', async (request) => {
    const me = requireUser(request);
    const q = (request.query.q ?? '').trim();
    if (!q) return [];
    // R-24: at most 10, the caller marked as "(you)".
    return ctx.directory.search(q, 10).map((u) => ({ ...u, isMe: u.id === me.id }));
  });

  app.post('/users/resolve', async (request) => {
    requireUser(request);
    const { ids } = parseOrThrow(resolveUsersSchema, request.body);
    return ctx.directory.resolve(ids);
  });
}
