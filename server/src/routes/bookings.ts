// Bookings (api.md "Bookings"; R-7 to R-11, R-16, R-17; domain-model invariants 1, 2, 3, 6, 7).
import type { FastifyInstance } from 'fastify';
import type { Booking as DbBooking } from '@prisma/client';
import {
  type Booking,
  type CreateBookingsResponse,
  type Slot,
  bookingId,
  createBookingsSchema,
  isoDateSchema,
  todayIso,
} from '@seat/shared';
import type { AppContext } from '../app.js';
import { requireUser, requireWriter } from '../auth.js';
import { isUniqueViolation } from '../db.js';
import { errors, parseOrThrow } from '../errors.js';

export function toBooking(row: DbBooking): Booking {
  return {
    id: row.id,
    date: row.date,
    slot: row.slot as Slot,
    seat: row.seat,
    by: row.by,
    bookedBy: row.bookedBy,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
  };
}

export function registerBookingRoutes(app: FastifyInstance, ctx: AppContext): void {
  // GET /api/bookings?date=  (R-3, R-5): one call paints the map.
  app.get<{ Querystring: { date?: string } }>('/bookings', async (request) => {
    requireUser(request);
    const date = parseOrThrow(isoDateSchema, request.query.date);
    const [bookings, releases] = await Promise.all([
      ctx.db.booking.findMany({ where: { date }, orderBy: { id: 'asc' } }),
      ctx.db.release.findMany({ where: { date } }),
    ]);
    return {
      bookings: bookings.map(toBooking),
      releases: releases.map((r) => ({ date: r.date, seat: r.seat, by: r.by })),
    };
  });

  // GET /api/bookings/mine (R-11, R-19): today or later, plus my dedications.
  app.get('/bookings/mine', async (request) => {
    const me = requireUser(request);
    const today = todayIso(ctx.config.officeTz, ctx.now());
    const [bookings, dedications] = await Promise.all([
      ctx.db.booking.findMany({
        where: { by: me.id, date: { gte: today } },
        orderBy: [{ date: 'asc' }, { seat: 'asc' }, { slot: 'asc' }],
      }),
      ctx.db.dedication.findMany({ where: { owner: me.id } }),
    ]);
    return {
      bookings: bookings.map(toBooking),
      dedications: dedications.map((d) => ({ seat: d.seat, owner: d.owner })),
    };
  });

  // POST /api/bookings (R-7, R-16, R-17): per-item atomic.
  app.post('/bookings', async (request, reply) => {
    const me = requireWriter(request);
    const body = parseOrThrow(createBookingsSchema, request.body);
    const today = todayIso(ctx.config.officeTz, ctx.now());
    // Invariant 6.
    if (body.date < today) throw errors.invalid('date must be today or later');
    const slots = [...new Set(body.slots)];

    // Validate every item before writing anything (invariants 2, 3, 7).
    const seats = new Set<string>();
    const dedications = new Map(
      (
        await ctx.db.dedication.findMany({ where: { seat: { in: body.items.map((i) => i.seat) } } })
      ).map((d) => [d.seat, d]),
    );
    const releases = new Set(
      (
        await ctx.db.release.findMany({
          where: { date: body.date, seat: { in: body.items.map((i) => i.seat) } },
        })
      ).map((r) => r.seat),
    );
    for (const item of body.items) {
      if (!ctx.plan.seatById.has(item.seat)) throw errors.invalid(`unknown seat ${item.seat}`);
      if (seats.has(item.seat)) throw errors.invalid(`seat ${item.seat} listed twice`);
      seats.add(item.seat);
      const by = item.by ?? me.id;
      if (item.label && by !== me.id) {
        throw errors.invalid('label is only allowed for seats held by the booker');
      }
      if (item.by && !ctx.directory.get(item.by)) throw errors.invalid(`unknown user ${item.by}`);
      const ded = dedications.get(item.seat);
      // Invariant 3: dedicated seats are only for their owner unless released for this date.
      // While decision 0002 is open the server honours an existing release regardless of the
      // client's switch.
      if (ded && ded.owner !== by && ded.owner !== me.id && !releases.has(item.seat)) {
        throw errors.conflict(`${item.seat} is dedicated to someone else`);
      }
    }

    const result: CreateBookingsResponse = { booked: [], lost: [] };
    const createdAt = ctx.now();
    for (const item of body.items) {
      const by = item.by ?? me.id;
      const got: Slot[] = [];
      for (const slot of slots) {
        const id = bookingId(body.date, slot, item.seat);
        try {
          // Uniqueness is the database's job (R-10, invariant 1): the loser sees P2002.
          const row = await ctx.db.booking.create({
            data: {
              id,
              date: body.date,
              slot,
              seat: item.seat,
              by,
              bookedBy: me.id,
              label: item.label ?? null,
              createdAt,
            },
          });
          got.push(slot);
          ctx.bus.publish('booking', { op: 'set', id, booking: toBooking(row) });
        } catch (e) {
          if (!isUniqueViolation(e)) throw e;
        }
      }
      if (got.length) result.booked.push({ seat: item.seat, slots: got });
      else result.lost.push(item.seat);
    }

    // api.md: a single-item request that obtained nothing is a 409 so the client can show the
    // seat-specific message either way.
    if (body.items.length === 1 && result.booked.length === 0) {
      throw errors.conflict(`${body.items[0]!.seat} was just taken by someone else`);
    }
    return reply.status(201).send(result);
  });

  // DELETE /api/bookings/:id (R-8): by or bookedBy may cancel. Idempotent.
  app.delete<{ Params: { id: string } }>('/bookings/:id', async (request, reply) => {
    const me = requireWriter(request);
    const row = await ctx.db.booking.findUnique({ where: { id: request.params.id } });
    if (!row) return reply.status(204).send();
    if (row.by !== me.id && row.bookedBy !== me.id) {
      throw errors.forbidden('You can only cancel bookings that are yours or that you made.');
    }
    await ctx.db.booking.delete({ where: { id: row.id } });
    ctx.bus.publish('booking', { op: 'delete', id: row.id });
    return reply.status(204).send();
  });
}
