// Prisma access (decision 0008).
import { PrismaClient } from '@prisma/client';

export type Db = PrismaClient;

export function createDb(databaseUrl: string): Db {
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
}

/** Prisma's unique-constraint violation code; the losing side of R-10. */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}
