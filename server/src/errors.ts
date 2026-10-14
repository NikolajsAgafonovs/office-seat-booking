// Error envelope and status mapping. Source: docs/api.md "Errors" table.
import type { ApiErrorCode } from '@seat/shared';
import type { ZodType } from 'zod';

export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export const errors = {
  unauthenticated: () => new ApiHttpError(401, 'unauthenticated', 'Sign in to continue.'),
  forbidden: (message: string) => new ApiHttpError(403, 'forbidden', message),
  notFound: (message: string) => new ApiHttpError(404, 'not_found', message),
  conflict: (message: string) => new ApiHttpError(409, 'conflict', message),
  invalid: (message: string) => new ApiHttpError(400, 'invalid_argument', message),
  quota: () => new ApiHttpError(429, 'quota_exceeded', 'Storage or rate limit exceeded.'),
};

/** Validate with a shared Zod schema; the first issue becomes the `invalid_argument` message. */
export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
  throw errors.invalid(`${where}${issue?.message ?? 'invalid request'}`);
}
