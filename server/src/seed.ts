// Seeds simulated bookings from docs/fixtures/simulated-bookings.json (decision 0008).
// Idempotent: clears previous simulated rows first. Never attributes rows to a real user.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { SIM_USER, bookingId, slotSchema, todayIso, workdayOffset } from '@seat/shared';
import { loadConfig } from './config.js';
import { createDb, type Db } from './db.js';

const fixtureSchema = z.object({
  description: z.string(),
  bookings: z.array(
    z.object({
      workdayOffset: z.number().int().min(0),
      seat: z.string(),
      slots: z.array(slotSchema).min(1),
      label: z.string(),
    }),
  ),
});

export async function seed(
  db: Db,
  officeTz: string,
  fixturePath: string,
  now = new Date(),
): Promise<number> {
  const fixture = fixtureSchema.parse(JSON.parse(readFileSync(fixturePath, 'utf8')));
  const today = todayIso(officeTz, now);
  await db.booking.deleteMany({ where: { by: SIM_USER } });
  const rows = fixture.bookings.flatMap((b) => {
    const date = workdayOffset(today, b.workdayOffset);
    return b.slots.map((slot) => ({
      id: bookingId(date, slot, b.seat),
      date,
      slot,
      seat: b.seat,
      by: SIM_USER,
      bookedBy: SIM_USER,
      label: b.label,
    }));
  });
  let inserted = 0;
  for (const row of rows) {
    // Real bookings win over simulated ones: skip occupied keys.
    const r = await db.booking.createMany({ data: [row] }).catch(() => ({ count: 0 }));
    inserted += r.count;
  }
  return inserted;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const config = loadConfig();
  const db = createDb(config.databaseUrl);
  const fixturePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../docs/fixtures/simulated-bookings.json',
  );
  seed(db, config.officeTz, fixturePath)
    .then((n) => {
      console.log(`Seeded ${n} simulated slot bookings.`);
      return db.$disconnect();
    })
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    });
}
