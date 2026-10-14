// Dedications (api.md "Dedications"; R-18, R-21; invariant 5; decision 0004).
import type { FastifyInstance } from 'fastify';
import { putDedicationSchema, seatCodeSchema } from '@seat/shared';
import type { AppContext } from '../app.js';
import { requireAdmin, requireUser } from '../auth.js';
import { errors, parseOrThrow } from '../errors.js';

export function registerDedicationRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/dedications', async (request) => {
    requireUser(request);
    const rows = await ctx.db.dedication.findMany({ orderBy: { seat: 'asc' } });
    return rows.map((d) => ({ seat: d.seat, owner: d.owner }));
  });

  app.put<{ Params: { seat: string } }>('/dedications/:seat', async (request, reply) => {
    requireAdmin(request);
    const seat = parseOrThrow(seatCodeSchema, request.params.seat);
    if (!ctx.plan.seatById.has(seat)) throw errors.notFound(`unknown seat ${seat}`);
    const { owner } = parseOrThrow(putDedicationSchema, request.body);
    if (!ctx.directory.get(owner)) throw errors.invalid(`unknown user ${owner}`);
    const row = await ctx.db.dedication.upsert({
      where: { seat },
      create: { seat, owner },
      update: { owner },
    });
    const dedication = { seat: row.seat, owner: row.owner };
    ctx.bus.publish('dedication', { op: 'set', seat, dedication });
    return reply.status(200).send(dedication);
  });

  app.delete<{ Params: { seat: string } }>('/dedications/:seat', async (request, reply) => {
    requireAdmin(request);
    const seat = parseOrThrow(seatCodeSchema, request.params.seat);
    const existing = await ctx.db.dedication.findUnique({ where: { seat } });
    if (existing) {
      await ctx.db.dedication.delete({ where: { seat } });
      ctx.bus.publish('dedication', { op: 'delete', seat });
    }
    return reply.status(204).send();
  });
}
