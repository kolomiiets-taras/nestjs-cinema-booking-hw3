import { DataSource } from 'typeorm';
import {
  MIGRATIONS_TEST_DB,
  dropDatabase,
  migrationsDataSource,
  recreateDatabase,
} from './test-database';

const APP_TABLES = ['booking_seats', 'bookings', 'films', 'halls', 'showings'];

describe('Migrations (e2e)', () => {
  let dataSource: DataSource;

  const tables = async (): Promise<string[]> => {
    const rows: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );
    return rows.map((row) => row.table_name);
  };

  const columnTypes = async (
    table: string,
  ): Promise<Record<string, string>> => {
    const rows: {
      column_name: string;
      data_type: string;
      is_nullable: string;
    }[] = await dataSource.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    );
    return Object.fromEntries(
      rows.map((row) => [
        row.column_name,
        `${row.data_type}${row.is_nullable === 'NO' ? ' not null' : ''}`,
      ]),
    );
  };

  const revertAll = async (): Promise<void> => {
    for (;;) {
      const applied: unknown[] = await dataSource.query(
        'SELECT id FROM migrations',
      );
      if (applied.length === 0) {
        return;
      }
      await dataSource.undoLastMigration();
    }
  };

  beforeAll(async () => {
    await recreateDatabase(MIGRATIONS_TEST_DB);
    dataSource = migrationsDataSource(MIGRATIONS_TEST_DB);
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await dropDatabase(MIGRATIONS_TEST_DB);
  });

  it('build the whole schema from an empty database', async () => {
    expect(await tables()).toEqual([]);
    await dataSource.runMigrations();
    expect(await tables()).toEqual([...APP_TABLES, 'migrations'].sort());
  });

  it('create columns with the described types and constraints', async () => {
    expect(await columnTypes('showings')).toEqual({
      id: 'uuid not null',
      film_id: 'uuid not null',
      hall_id: 'uuid not null',
      starts_at: 'timestamp with time zone not null',
      price: 'integer not null',
    });
    expect(await columnTypes('bookings')).toEqual({
      id: 'uuid not null',
      showing_id: 'uuid not null',
      total_price: 'integer not null',
      created_at: 'timestamp with time zone not null',
    });
    expect(await columnTypes('booking_seats')).toEqual({
      id: 'uuid not null',
      booking_id: 'uuid not null',
      showing_id: 'uuid not null',
      row: 'integer not null',
      seat: 'integer not null',
    });

    const [index] = await dataSource.query<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'UQ_booking_seats_showing_row_seat'`,
    );
    expect(index.indexdef).toContain(
      'UNIQUE INDEX "UQ_booking_seats_showing_row_seat" ON public.booking_seats USING btree (showing_id, "row", seat)',
    );

    const [film] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO films (title, duration_minutes, release_year) VALUES ('X', 90, 2020) RETURNING id`,
    );
    expect(film.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('are reversible: down() returns the database to the empty state and up() works again', async () => {
    await revertAll();
    expect(await tables()).toEqual(['migrations']);
    await dataSource.runMigrations();
    expect(await tables()).toEqual([...APP_TABLES, 'migrations'].sort());
  });
});
