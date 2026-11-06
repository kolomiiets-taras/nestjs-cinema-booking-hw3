import {
  TEST_DB,
  migrationsDataSource,
  recreateDatabase,
} from './test-database';

/** A fresh, empty test database whose schema is built by the migrations. */
export default async function globalSetup(): Promise<void> {
  await recreateDatabase(TEST_DB);
  const dataSource = migrationsDataSource(TEST_DB);
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
