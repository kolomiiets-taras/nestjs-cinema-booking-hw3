import { MIGRATIONS_TEST_DB, TEST_DB, dropDatabase } from './test-database';

export default async function globalTeardown(): Promise<void> {
  await dropDatabase(TEST_DB);
  await dropDatabase(MIGRATIONS_TEST_DB);
}
