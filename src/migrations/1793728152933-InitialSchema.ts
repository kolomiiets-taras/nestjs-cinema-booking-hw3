import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema: films, halls, showings, bookings and booking_seats.
 * Seats of a hall are not stored — they are derived from rows × seats_per_row.
 * gen_random_uuid() is built into PostgreSQL 13+ (uuidExtension: 'pgcrypto').
 */
export class InitialSchema1793728152933 implements MigrationInterface {
  name = 'InitialSchema1793728152933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "films" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(255) NOT NULL, "duration_minutes" integer NOT NULL, "release_year" integer NOT NULL, CONSTRAINT "PK_697487ada088902377482c970d1" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "halls" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "rows" integer NOT NULL, "seats_per_row" integer NOT NULL, CONSTRAINT "UQ_46711ac8c7003abe9f974263bfb" UNIQUE ("name"), CONSTRAINT "PK_4665c2f3b1e718e12b06278bae8" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "showings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "film_id" uuid NOT NULL, "hall_id" uuid NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "price" integer NOT NULL, CONSTRAINT "PK_b9b94e86f112c69c3012959cd51" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_showings_film_id" ON "showings" ("film_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_showings_hall_id" ON "showings" ("hall_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_showings_starts_at_id" ON "showings" ("starts_at", "id")`,
    );
    // Films and halls with showings cannot be deleted (no cascade).
    await queryRunner.query(
      `ALTER TABLE "showings" ADD CONSTRAINT "FK_f466787e0a7c6d00ca553573a7c" FOREIGN KEY ("film_id") REFERENCES "films"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "showings" ADD CONSTRAINT "FK_c1e6cac97305ceb1b70b72e56c5" FOREIGN KEY ("hall_id") REFERENCES "halls"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "showing_id" uuid NOT NULL, "total_price" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_showing_id" ON "bookings" ("showing_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_8815ee8ca8bf44326ed49b459fa" FOREIGN KEY ("showing_id") REFERENCES "showings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "booking_seats" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "showing_id" uuid NOT NULL, "row" integer NOT NULL, "seat" integer NOT NULL, CONSTRAINT "PK_a4d929dea33a0153ba9bc253db1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_seats_booking_id" ON "booking_seats" ("booking_id")`,
    );
    // One seat of one showing can be booked only once.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_booking_seats_showing_row_seat" ON "booking_seats" ("showing_id", "row", "seat")`,
    );
    // Deleting a booking deletes its seats.
    await queryRunner.query(
      `ALTER TABLE "booking_seats" ADD CONSTRAINT "FK_25c8b5c1e010af1cd2f699c5926" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_seats" ADD CONSTRAINT "FK_509c870b65f67f2123118f693ae" FOREIGN KEY ("showing_id") REFERENCES "showings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order; indexes and foreign keys are dropped together with their tables.
    await queryRunner.query(`DROP TABLE "booking_seats"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "showings"`);
    await queryRunner.query(`DROP TABLE "halls"`);
    await queryRunner.query(`DROP TABLE "films"`);
  }
}
