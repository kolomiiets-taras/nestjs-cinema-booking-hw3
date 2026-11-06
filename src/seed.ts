import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from './app.module';
import { Film } from './films/schemas/film.schema';
import { HallsService } from './halls/halls.service';
import { Hall } from './halls/schemas/hall.schema';
import { Showing } from './showings/schemas/showing.schema';

/**
 * Fills the database with a small data set for manual checks:
 * 3 films, 2 halls, 4 showings on different dates and 1 booking.
 * Run with `npm run seed` (the MongoDB container must be up). The script boots
 * the application context, so it uses the same validated config and models.
 * Films, halls and showings are upserted by their natural keys, and the booking
 * is written with the same "all seats free" condition as the API — running the
 * script again creates no duplicates.
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

interface Upserted {
  _id: Types.ObjectId;
  created: boolean;
}

/** Inserts the document only when no document matches the key. */
async function upsert<T>(
  model: Model<T>,
  key: Record<string, unknown>,
  insert: Record<string, unknown>,
): Promise<Upserted> {
  const result = await model.updateOne(
    key,
    { $setOnInsert: insert },
    { upsert: true },
  );
  if (result.upsertedId) {
    return { _id: result.upsertedId, created: true };
  }
  const existing = await model
    .findOne(key, { _id: 1 })
    .lean<{ _id: Types.ObjectId }>();
  if (!existing) {
    throw new Error(`Seed: document ${JSON.stringify(key)} not found`);
  }
  return { _id: existing._id, created: false };
}

async function seed(app: INestApplicationContext): Promise<void> {
  const filmModel = app.get<Model<Film>>(getModelToken(Film.name));
  const hallModel = app.get<Model<Hall>>(getModelToken(Hall.name));
  const showingModel = app.get<Model<Showing>>(getModelToken(Showing.name));
  const hallsService = app.get(HallsService);

  // The unique index on hall names must exist before the halls are written.
  await Promise.all([filmModel.init(), hallModel.init(), showingModel.init()]);

  let created = 0;

  const films: Upserted[] = [];
  for (const film of FILMS) {
    const result = await upsert(filmModel, { title: film.title }, film);
    films.push(result);
    created += Number(result.created);
  }

  const halls: Upserted[] = [];
  for (const hall of HALLS) {
    const result = await upsert(hallModel, { name: hall.name }, hall);
    halls.push(result);
    created += Number(result.created);
  }

  const showings: Upserted[] = [];
  for (const data of SHOWINGS) {
    const hall = HALLS[data.hall];
    const result = await upsert(
      showingModel,
      {
        film: films[data.film]._id,
        hall: halls[data.hall]._id,
        startsAt: new Date(data.startsAt),
      },
      {
        price: data.price,
        seats: hallsService
          .getSeats(hall)
          .map((seat) => ({ ...seat, bookingId: null })),
        bookings: [],
      },
    );
    showings.push(result);
    created += Number(result.created);
  }

  // Same single update as POST /showings/:id/bookings: when the seats are
  // already taken (a previous run), the filter matches nothing.
  const showing = SHOWINGS[BOOKING.showing];
  const bookingId = new Types.ObjectId();
  const booking = await showingModel.updateOne(
    {
      _id: showings[BOOKING.showing]._id,
      $and: BOOKING.seats.map(({ row, seat }) => ({
        seats: { $elemMatch: { row, seat, bookingId: null } },
      })),
    },
    {
      $set: { 'seats.$[target].bookingId': bookingId },
      $push: {
        bookings: {
          _id: bookingId,
          seats: BOOKING.seats,
          totalPrice: showing.price * BOOKING.seats.length,
          createdAt: new Date(),
        },
      },
    },
    {
      arrayFilters: [
        {
          $or: BOOKING.seats.map(({ row, seat }) => ({
            'target.row': row,
            'target.seat': seat,
          })),
        },
      ],
    },
  );
  created += booking.matchedCount;

  console.log(
    created > 0
      ? `Seed: created ${created} record(s).`
      : 'Seed: data already present, nothing to create.',
  );
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    await seed(app);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
