import {
  DataSource,
  DeepPartial,
  EntityManager,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import dataSource from './data-source';
import { Film } from './films/entities/film.entity';
import { Hall } from './halls/entities/hall.entity';
import { BookingSeat } from './showings/entities/booking-seat.entity';
import { Booking } from './showings/entities/booking.entity';
import { Showing } from './showings/entities/showing.entity';

/**
 * Fills the database with a small data set for manual checks:
 * 3 films, 2 halls, 4 showings on different dates and 1 booking.
 * Run after migrations: `npm run seed`. Every record is looked up by its
 * natural key first, so running the script again creates no duplicates.
 */

const FILMS = [
  { title: 'Інтерстеллар', durationMinutes: 169, releaseYear: 2014 },
  { title: 'Тіні забутих предків', durationMinutes: 97, releaseYear: 1965 },
  { title: 'Oppenheimer', durationMinutes: 180, releaseYear: 2023 },
];

const HALLS = [
  { name: 'Зал 1', rows: 5, seatsPerRow: 8 },
  { name: 'Малий зал', rows: 3, seatsPerRow: 5 },
];

const SHOWINGS = [
  { film: 0, hall: 0, startsAt: '2027-01-15T18:00:00.000Z', price: 15000 },
  { film: 1, hall: 1, startsAt: '2027-01-16T16:30:00.000Z', price: 9000 },
  { film: 2, hall: 0, startsAt: '2027-01-17T19:00:00.000Z', price: 17500 },
  { film: 0, hall: 1, startsAt: '2027-01-18T12:00:00.000Z', price: 10000 },
];

const BOOKING = {
  showing: 0,
  seats: [
    { row: 3, seat: 4 },
    { row: 3, seat: 5 },
  ],
};

async function findOrCreate<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: new () => T,
  where: NoInfer<FindOptionsWhere<T>>,
  data: NoInfer<DeepPartial<T>>,
): Promise<{ record: T; created: boolean }> {
  const existing = await manager.findOneBy(entity, where);
  if (existing) {
    return { record: existing, created: false };
  }
  const record = await manager.save(entity, manager.create(entity, data));
  return { record, created: true };
}

async function seed(db: DataSource): Promise<void> {
  await db.transaction(async (manager) => {
    let created = 0;

    const films: Film[] = [];
    for (const data of FILMS) {
      const result = await findOrCreate(
        manager,
        Film,
        { title: data.title },
        data,
      );
      films.push(result.record);
      created += Number(result.created);
    }

    const halls: Hall[] = [];
    for (const data of HALLS) {
      const result = await findOrCreate(
        manager,
        Hall,
        { name: data.name },
        data,
      );
      halls.push(result.record);
      created += Number(result.created);
    }

    const showings: Showing[] = [];
    for (const data of SHOWINGS) {
      const key = {
        filmId: films[data.film].id,
        hallId: halls[data.hall].id,
        startsAt: new Date(data.startsAt),
      };
      const result = await findOrCreate(manager, Showing, key, {
        ...key,
        price: data.price,
      });
      showings.push(result.record);
      created += Number(result.created);
    }

    const showing = showings[BOOKING.showing];
    const alreadyBooked = await manager.existsBy(BookingSeat, {
      showingId: showing.id,
      row: BOOKING.seats[0].row,
      seat: BOOKING.seats[0].seat,
    });
    if (!alreadyBooked) {
      const booking = await manager.save(
        manager.create(Booking, {
          showingId: showing.id,
          totalPrice: showing.price * BOOKING.seats.length,
        }),
      );
      await manager.save(
        BOOKING.seats.map((seat) =>
          manager.create(BookingSeat, {
            bookingId: booking.id,
            showingId: showing.id,
            ...seat,
          }),
        ),
      );
      created += 1;
    }

    console.log(
      created > 0
        ? `Seed: created ${created} record(s).`
        : 'Seed: data already present, nothing to create.',
    );
  });
}

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await seed(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
