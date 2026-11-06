import { QueryFailedError } from 'typeorm';

/** PostgreSQL error codes the services react to. */
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

export function isDatabaseError(error: unknown, code: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as { code?: string };
  return driverError.code === code;
}
