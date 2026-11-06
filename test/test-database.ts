import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

/**
 * e2e tests never touch the development database: they use separate databases
 * on the same PostgreSQL server, named after POSTGRES_DB from .env.
 */
config({ quiet: true });

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set (copy .env.example to .env)`);
  }
  return value;
};

export const DEV_DB = required('POSTGRES_DB').replace(/_test$/, '');
export const TEST_DB = `${DEV_DB}_test`;
export const MIGRATIONS_TEST_DB = `${DEV_DB}_migrations_test`;

const connection = () => ({
  type: 'postgres' as const,
  host: required('POSTGRES_HOST'),
  port: Number(required('POSTGRES_PORT')),
  username: required('POSTGRES_USER'),
  password: required('POSTGRES_PASSWORD'),
});

/** Runs statements on the maintenance database "postgres" of the same server. */
async function onServer(...statements: string[]): Promise<void> {
  const server = new DataSource({ ...connection(), database: 'postgres' });
  await server.initialize();
  try {
    for (const statement of statements) {
      await server.query(statement);
    }
  } finally {
    await server.destroy();
  }
}

export function recreateDatabase(name: string): Promise<void> {
  return onServer(
    `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`,
    `CREATE DATABASE "${name}"`,
  );
}

export function dropDatabase(name: string): Promise<void> {
  return onServer(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}

/** Data source with the project migrations only — the schema comes from them, not from entities. */
export function migrationsDataSource(database: string): DataSource {
  return new DataSource({
    ...connection(),
    uuidExtension: 'pgcrypto',
    database,
    migrations: [join(__dirname, '..', 'src', 'migrations', '*.ts')],
  });
}
