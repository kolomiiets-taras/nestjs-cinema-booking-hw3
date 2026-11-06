import { dropTestDatabase } from './test-database';

/** Every run starts from an empty test database. */
export default async function globalSetup(): Promise<void> {
  await dropTestDatabase();
}
