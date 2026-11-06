import { mongo } from 'mongoose';

/** MongoDB error code of a unique index violation. */
export const MONGO_DUPLICATE_KEY = 11000;

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof mongo.MongoServerError &&
    error.code === MONGO_DUPLICATE_KEY
  );
}
