import { config } from 'dotenv';
import mongoose from 'mongoose';

/**
 * e2e tests never touch the development database: they use a separate
 * database `<db>_test` on the same MongoDB server, derived from MONGODB_URI in .env.
 */
config({ quiet: true });

const devUri = process.env.MONGODB_URI;
if (!devUri) {
  throw new Error('MONGODB_URI is not set (copy .env.example to .env)');
}

const url = new URL(devUri);
const devDb = url.pathname.replace(/^\//, '').replace(/_test$/, '') || 'test';
url.pathname = `/${devDb}_test`;

export const TEST_DB_URI = url.toString();

export async function dropTestDatabase(): Promise<void> {
  const connection = await mongoose.createConnection(TEST_DB_URI).asPromise();
  try {
    await connection.dropDatabase();
  } finally {
    await connection.close();
  }
}
