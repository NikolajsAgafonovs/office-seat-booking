// Development identity provider (decision 0007, option 2). Registered only when AUTH_MODE=dev.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../app.js';
import { clearSession, setSession } from '../auth.js';
import { errors, parseOrThrow } from '../errors.js';

const loginSchema = z.object({ id: z.string().min(1) });

export function registerDevRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/dev/users', async () => ctx.directory.all());

  app.post('/dev/login', async (request, reply) => {
    const { id } = parseOrThrow(loginSchema, request.body);
    if (!ctx.directory.get(id)) throw errors.notFound(`no fixture user ${id}`);
    setSession(reply, id);
    return reply.status(204).send();
  });

  app.post('/dev/logout', async (_request, reply) => {
    clearSession(reply);
    return reply.status(204).send();
  });
}
