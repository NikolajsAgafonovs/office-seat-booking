// Releases (api.md "Releases"; R-20; invariants 4, 6; decision 0002 open: server accepts writes).
import type { FastifyInstance } from 'fastify';
import { isoDateSchema, seatCodeSchema, todayIso } from '@seat/shared';
import type { AppContext } from '../app.js';
import { requireWriter } from '../auth.js';
import { errors, parseOrThrow } from '../errors.js';

type Params = { Params: { date: string; seat: string } };

export function registerReleaseRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.put<Params>('/releases/:date/:seat', async (request, reply) => {
    const me = requireWriter(request);
    const date = parseOrThrow(isoDateSchema, request.params.date);
    const seat = parseOrThrow(seatCodeSchema, request.params.seat);
    if (date < todayIso(ctx.config.officeTz, ctx.now())) {
      throw errors.invalid('date must be today or later');
    }
    const ded = await ctx.db.dedication.findUnique({ where: { seat } });
    // Invariant 4: only the current owner.
    if (!ded || ded.owner !== me.id)
      throw errors.forbidden('Only the owner can release this seat.');
    const id = `${date}_${seat}`;
    await ctx.db.release.upsert({
      where: { id },
      create: { id, date, seat, by: me.id },
      update: { by: me.id },
    });
    ctx.bus.publish('release', { op: 'set', date, seat, release: { date, seat, by: me.id } });
    return reply.status(204).send();
  });

  app.delete<Params>('/releases/:date/:seat', async (request, reply) => {
    const me = requireWriter(request);
    const date = parseOrThrow(isoDateSchema, request.params.date);
    const seat = parseOrThrow(seatCodeSchema, request.params.seat);
    const ded = await ctx.db.dedication.findUnique({ where: { seat } });
    if (!ded || ded.owner !== me.id)
      throw errors.forbidden('Only the owner can take this seat back.');
    // R-20: take back only while nobody else holds it that day.
    const other = await ctx.db.booking.findFirst({ where: { date, seat, NOT: { by: me.id } } });
    if (other) throw errors.conflict('Someone else has booked this seat for that day.');
    const id = `${date}_${seat}`;
    const existing = await ctx.db.release.findUnique({ where: { id } });
    if (existing) {
      await ctx.db.release.delete({ where: { id } });
      ctx.bus.publish('release', { op: 'delete', date, seat });
    }
    return reply.status(204).send();
  });
}
