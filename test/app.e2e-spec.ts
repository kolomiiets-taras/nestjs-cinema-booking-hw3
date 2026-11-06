import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Film } from '../src/films/schemas/film.schema';
import { Hall } from '../src/halls/schemas/hall.schema';
import { setupApp } from '../src/setup-app';
import { Showing } from '../src/showings/schemas/showing.schema';

const FUTURE = '2030-05-10';
// Well-formed ObjectId that belongs to no document.
const MISSING_ID = '000000000000000000000000';
const OBJECT_ID = /^[0-9a-f]{24}$/;

interface Entity {
  id: string;
}
interface ShowingBody extends Entity {
  film: { id: string; title: string };
  hall: { id: string; name: string };
  startsAt: string;
  price: number;
}
interface PageBody {
  items: ShowingBody[];
  total: number;
  page: number;
  limit: number;
}
interface SeatBody {
  row: number;
  seat: number;
  isBooked: boolean;
}
interface BookingBody extends Entity {
  showingId: string;
  seats: { row: number; seat: number }[];
  totalPrice: number;
  createdAt: string;
}
interface ErrorBody {
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}

const body = <T>(res: Response): T => res.body as T;
const ids = (res: Response): string[] =>
  body<PageBody>(res).items.map((item) => item.id);

describe('Cinema booking API (e2e)', () => {
  let app: INestApplication<App>;
  let showingModel: Model<Showing>;
  let http: () => ReturnType<typeof request>;

  let filmId: string;
  let otherFilmId: string;
  let hallId: string;
  let showingA: string;
  let showingB: string;
  let showingC: string;
  let bookingId: string;

  /** Bookings and occupied seats across all showing documents, read from the database. */
  const stored = async (): Promise<{
    bookings: number;
    bookedSeats: number;
  }> => {
    const [row] = await showingModel.aggregate<{
      bookings: number;
      bookedSeats: number;
    }>([
      {
        $group: {
          _id: null,
          bookings: { $sum: { $size: '$bookings' } },
          bookedSeats: {
            $sum: {
              $size: {
                $filter: {
                  input: '$seats',
                  cond: { $ne: ['$$this.bookingId', null] },
                },
              },
            },
          },
        },
      },
      { $project: { _id: 0 } },
    ]);
    return row ?? { bookings: 0, bookedSeats: 0 };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    showingModel = app.get<Model<Showing>>(getModelToken(Showing.name));
    const models: Model<any>[] = [
      app.get<Model<Film>>(getModelToken(Film.name)),
      app.get<Model<Hall>>(getModelToken(Hall.name)),
      showingModel,
    ];
    // The test database is empty; wait until the schema indexes (unique hall name) are built.
    await Promise.all(models.map((model) => model.init()));
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('films', () => {
    it('POST /films creates a film', async () => {
      const res = await http()
        .post('/films')
        .send({ title: 'Dune', durationMinutes: 166, releaseYear: 2024 })
        .expect(201);
      expect(res.body).toEqual({
        id: expect.stringMatching(OBJECT_ID) as string,
        title: 'Dune',
        durationMinutes: 166,
        releaseYear: 2024,
      });
      expect(res.body).not.toHaveProperty('_id');
      expect(res.body).not.toHaveProperty('__v');
      filmId = body<Entity>(res).id;

      const other = await http()
        .post('/films')
        .send({ title: 'Arrival', durationMinutes: 116, releaseYear: 2016 })
        .expect(201);
      otherFilmId = body<Entity>(other).id;
    });

    it('POST /films -> 400 on missing field / wrong type', async () => {
      await http()
        .post('/films')
        .send({ title: 'X', durationMinutes: 90 })
        .expect(400);
      await http()
        .post('/films')
        .send({ title: 'X', durationMinutes: '90', releaseYear: 2020 })
        .expect(400);
    });

    it('POST /films strips unknown fields', async () => {
      const res = await http()
        .post('/films')
        .send({
          title: 'Temp',
          durationMinutes: 90,
          releaseYear: 2020,
          hacked: true,
        })
        .expect(201);
      expect(res.body).not.toHaveProperty('hacked');
      await http()
        .delete(`/films/${body<Entity>(res).id}`)
        .expect(204);
    });

    it('GET /films, GET /films/:id, 404', async () => {
      const list = await http().get('/films').expect(200);
      expect(list.body).toHaveLength(2);
      expect(Object.keys(body<object[]>(list)[0]).sort()).toEqual([
        'durationMinutes',
        'id',
        'releaseYear',
        'title',
      ]);
      await http().get(`/films/${filmId}`).expect(200);
      await http().get(`/films/${MISSING_ID}`).expect(404);
    });

    it('PATCH /films/:id updates subset, 400 on type, 404', async () => {
      const res = await http()
        .patch(`/films/${filmId}`)
        .send({ title: 'Dune: Part Two' })
        .expect(200);
      expect(res.body).toMatchObject({
        title: 'Dune: Part Two',
        durationMinutes: 166,
      });
      await http()
        .patch(`/films/${filmId}`)
        .send({ releaseYear: 'soon' })
        .expect(400);
      await http()
        .patch(`/films/${filmId}`)
        .send({ durationMinutes: null })
        .expect(400);
      await http()
        .patch(`/films/${MISSING_ID}`)
        .send({ title: 'X' })
        .expect(404);
      const saved = await http().get(`/films/${filmId}`).expect(200);
      expect(saved.body).toMatchObject({
        title: 'Dune: Part Two',
        durationMinutes: 166,
      });
    });
  });

  describe('errors', () => {
    it('every error has the same structure: statusCode, message, path, timestamp', async () => {
      const notFound = await http().get(`/films/${MISSING_ID}`).expect(404);
      expect(body<ErrorBody>(notFound)).toEqual({
        statusCode: 404,
        message: `Film with id "${MISSING_ID}" not found`,
        path: `/films/${MISSING_ID}`,
        timestamp: expect.any(String) as string,
      });

      const invalid = await http().post('/films').send({}).expect(400);
      expect(body<ErrorBody>(invalid)).toMatchObject({
        statusCode: 400,
        path: '/films',
      });
      expect(Array.isArray(body<ErrorBody>(invalid).message)).toBe(true);

      const badId = await http().get('/films/not-an-id').expect(400);
      expect(body<ErrorBody>(badId)).toMatchObject({
        statusCode: 400,
        path: '/films/not-an-id',
      });
    });

    it('a malformed ObjectId -> 400 explaining the format, on every route with an id', async () => {
      const malformed = [
        ['get', '/films/123'],
        ['patch', '/films/123'],
        ['delete', '/films/123'],
        ['get', '/halls/123'],
        ['delete', '/halls/123'],
        ['get', '/showings/123'],
        ['get', '/showings/123/seats'],
        ['get', '/showings/123/bookings'],
        ['post', '/showings/123/bookings'],
        ['delete', '/bookings/123'],
        // 12 characters: accepted by ObjectId.isValid(), but not a 24-hex id.
        ['get', '/films/abcdefghijkl'],
        ['get', '/films/zzzzzzzzzzzzzzzzzzzzzzzz'],
      ] as const;
      for (const [method, url] of malformed) {
        const res = await http()
          [method](url)
          .send({ title: 'X', seats: [{ row: 1, seat: 1 }] });
        expect({ url, status: res.status }).toEqual({ url, status: 400 });
        expect(body<ErrorBody>(res).message).toContain(
          '24 hexadecimal characters',
        );
      }
    });
  });

  describe('halls', () => {
    it('POST /halls creates a hall, 409 on duplicate name, 400 on non-positive', async () => {
      const res = await http()
        .post('/halls')
        .send({ name: 'Red', rows: 3, seatsPerRow: 5 })
        .expect(201);
      hallId = body<Entity>(res).id;
      expect(body<Entity>(res).id).toMatch(OBJECT_ID);
      const duplicate = await http()
        .post('/halls')
        .send({ name: ' red ', rows: 2, seatsPerRow: 2 })
        .expect(409);
      expect(body<ErrorBody>(duplicate).message).toContain('already exists');
      await http()
        .post('/halls')
        .send({ name: 'Blue', rows: 0, seatsPerRow: 2 })
        .expect(400);
      await http()
        .post('/halls')
        .send({ name: 'Blue', rows: 2.5, seatsPerRow: 2 })
        .expect(400);
      await http().post('/halls').send({ rows: 2, seatsPerRow: 2 }).expect(400);
      await http()
        .post('/halls')
        .send({ name: '   ', rows: 2, seatsPerRow: 2 })
        .expect(400);
    });

    it('GET /halls/:id returns rows × seatsPerRow seats', async () => {
      const res = await http().get(`/halls/${hallId}`).expect(200);
      const seats = body<{ seats: SeatBody[] }>(res).seats;
      expect(seats).toHaveLength(15);
      expect(seats[0]).toEqual({ row: 1, seat: 1 });
      expect(seats[14]).toEqual({ row: 3, seat: 5 });
      await http().get(`/halls/${MISSING_ID}`).expect(404);
      await http().get('/halls').expect(200);
    });
  });

  describe('showings', () => {
    it('POST /showings creates showings with film title and hall name', async () => {
      const a = await http()
        .post('/showings')
        .send({ filmId, hallId, startsAt: `${FUTURE}T18:00:00Z`, price: 12500 })
        .expect(201);
      expect(body<ShowingBody>(a)).toEqual({
        id: expect.stringMatching(OBJECT_ID) as string,
        film: { id: filmId, title: 'Dune: Part Two' },
        hall: { id: hallId, name: 'Red' },
        startsAt: `${FUTURE}T18:00:00.000Z`,
        price: 12500,
      });
      showingA = body<Entity>(a).id;

      // The document itself holds all 15 seats of the 3 × 5 hall, all free, and no bookings.
      const doc = await showingModel.findById(showingA).lean();
      expect(doc?.seats).toHaveLength(15);
      expect(doc?.seats[0]).toEqual({ row: 1, seat: 1, bookingId: null });
      expect(doc?.seats[14]).toEqual({ row: 3, seat: 5, bookingId: null });
      expect(doc?.bookings).toEqual([]);
      expect(doc?.film).toBeInstanceOf(Types.ObjectId);

      const b = await http()
        .post('/showings')
        .send({
          filmId: otherFilmId,
          hallId,
          startsAt: `${FUTURE}T12:00:00Z`,
          price: 10000,
        })
        .expect(201);
      showingB = body<Entity>(b).id;

      const c = await http()
        .post('/showings')
        .send({ filmId, hallId, startsAt: '2030-05-11T10:00:00Z', price: 9000 })
        .expect(201);
      showingC = body<Entity>(c).id;
    });

    it('POST /showings -> 400 for missing film/hall, past or invalid date, bad price', async () => {
      const base = {
        filmId,
        hallId,
        startsAt: `${FUTURE}T18:00:00Z`,
        price: 100,
      };
      const missingFilm = await http()
        .post('/showings')
        .send({ ...base, filmId: MISSING_ID })
        .expect(400);
      expect(body<ErrorBody>(missingFilm).message).toContain('Film');
      const missingHall = await http()
        .post('/showings')
        .send({ ...base, hallId: MISSING_ID })
        .expect(400);
      expect(body<ErrorBody>(missingHall).message).toContain('Hall');
      const badFilmId = await http()
        .post('/showings')
        .send({ ...base, filmId: 'abc' })
        .expect(400);
      expect(body<ErrorBody>(badFilmId).message).toEqual([
        expect.stringContaining('filmId: expected a MongoDB ObjectId'),
      ]);
      await http()
        .post('/showings')
        .send({ ...base, hallId: '123' })
        .expect(400);
      await http()
        .post('/showings')
        .send({ ...base, startsAt: '2020-01-01T10:00:00Z' })
        .expect(400);
      await http()
        .post('/showings')
        .send({ ...base, startsAt: 'tomorrow' })
        .expect(400);
      await http()
        .post('/showings')
        .send({ ...base, price: 0 })
        .expect(400);
      await http()
        .post('/showings')
        .send({ ...base, price: 99.5 })
        .expect(400);
    });

    it('GET /showings returns a page { items, total, page, limit } with defaults', async () => {
      const res = await http().get('/showings').expect(200);
      expect(body<PageBody>(res)).toMatchObject({
        total: 3,
        page: 1,
        limit: 20,
      });
      expect(ids(res)).toEqual([showingB, showingA, showingC]);
      expect(body<PageBody>(res).items[0]).toEqual({
        id: showingB,
        film: { id: otherFilmId, title: 'Arrival' },
        hall: { id: hallId, name: 'Red' },
        startsAt: `${FUTURE}T12:00:00.000Z`,
        price: 10000,
      });
    });

    it('GET /showings filters by filmId and date (UTC day)', async () => {
      const byFilm = await http().get(`/showings?filmId=${filmId}`).expect(200);
      expect(ids(byFilm)).toEqual([showingA, showingC]);
      expect(body<PageBody>(byFilm).total).toBe(2);

      const byDate = await http().get(`/showings?date=${FUTURE}`).expect(200);
      expect(ids(byDate)).toEqual([showingB, showingA]);

      const both = await http()
        .get(`/showings?filmId=${filmId}&date=${FUTURE}`)
        .expect(200);
      expect(ids(both)).toEqual([showingA]);
      expect(body<PageBody>(both).total).toBe(1);

      const none = await http().get('/showings?date=2031-01-01').expect(200);
      expect(body<PageBody>(none)).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });

    it('GET /showings pages and sorts in the database', async () => {
      const first = await http().get('/showings?limit=2').expect(200);
      expect(ids(first)).toEqual([showingB, showingA]);
      expect(body<PageBody>(first)).toMatchObject({
        total: 3,
        page: 1,
        limit: 2,
      });

      const second = await http().get('/showings?limit=2&page=2').expect(200);
      expect(ids(second)).toEqual([showingC]);
      expect(body<PageBody>(second)).toMatchObject({
        total: 3,
        page: 2,
        limit: 2,
      });

      const beyond = await http().get('/showings?limit=2&page=5').expect(200);
      expect(body<PageBody>(beyond)).toMatchObject({ items: [], total: 3 });

      const desc = await http().get('/showings?sort=desc').expect(200);
      expect(ids(desc)).toEqual([showingC, showingA, showingB]);

      const descPage = await http()
        .get(`/showings?sort=desc&limit=1&page=2&filmId=${filmId}`)
        .expect(200);
      expect(ids(descPage)).toEqual([showingA]);
      expect(body<PageBody>(descPage).total).toBe(2);
    });

    it('GET /showings orders showings with the same start time by id', async () => {
      const startsAt = '2030-06-01T10:00:00Z';
      const created: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await http()
          .post('/showings')
          .send({ filmId: otherFilmId, hallId, startsAt, price: 5000 })
          .expect(201);
        created.push(body<Entity>(res).id);
      }
      const res = await http().get('/showings?date=2030-06-01').expect(200);
      // ObjectId hex strings of equal length sort in the same order as the ids.
      expect(ids(res)).toEqual([...created].sort());
      const desc = await http()
        .get('/showings?date=2030-06-01&sort=desc')
        .expect(200);
      expect(ids(desc)).toEqual([...created].sort());
      await showingModel.deleteMany({ _id: { $in: created } });
    });

    it('GET /showings -> 400 for invalid page, limit, date, sort, filmId', async () => {
      const invalid = [
        'page=0',
        'page=-1',
        'page=1.5',
        'page=abc',
        'limit=0',
        'limit=101',
        'limit=2.5',
        'limit=ten',
        'sort=up',
        'sort=ASC',
        'date=10-05-2030',
        'date=2030-02-30',
        'filmId=123',
        'filmId=not-an-object-id-at-all!',
      ];
      for (const query of invalid) {
        const res = await http().get(`/showings?${query}`);
        expect({ query, status: res.status }).toEqual({ query, status: 400 });
      }
      await http().get('/showings?limit=100&page=1&sort=asc').expect(200);
    });

    it('GET /showings/:id and /seats', async () => {
      const one = await http().get(`/showings/${showingA}`).expect(200);
      expect(body<ShowingBody>(one).film.title).toBe('Dune: Part Two');
      expect(body<ShowingBody>(one).hall.name).toBe('Red');
      expect(one.body).not.toHaveProperty('seats');
      expect(one.body).not.toHaveProperty('bookings');
      expect(one.body).not.toHaveProperty('_id');
      const seats = await http().get(`/showings/${showingA}/seats`).expect(200);
      expect(seats.body).toHaveLength(15);
      expect(body<SeatBody[]>(seats)[0]).toEqual({
        row: 1,
        seat: 1,
        isBooked: false,
      });
      expect(body<SeatBody[]>(seats).every((s) => !s.isBooked)).toBe(true);
      await http().get(`/showings/${MISSING_ID}`).expect(404);
      await http().get(`/showings/${MISSING_ID}/seats`).expect(404);
    });
  });

  describe('bookings', () => {
    it('POST /showings/:id/bookings books seats with total price', async () => {
      const res = await http()
        .post(`/showings/${showingA}/bookings`)
        .send({
          seats: [
            { row: 2, seat: 3 },
            { row: 2, seat: 4 },
          ],
        })
        .expect(201);
      expect(body<BookingBody>(res)).toEqual({
        id: expect.stringMatching(OBJECT_ID) as string,
        showingId: showingA,
        seats: [
          { row: 2, seat: 3 },
          { row: 2, seat: 4 },
        ],
        totalPrice: 25000,
        createdAt: expect.any(String) as string,
      });
      bookingId = body<Entity>(res).id;

      const seats = await http().get(`/showings/${showingA}/seats`).expect(200);
      expect(body<SeatBody[]>(seats).filter((s) => s.isBooked)).toEqual([
        { row: 2, seat: 3, isBooked: true },
        { row: 2, seat: 4, isBooked: true },
      ]);
      expect(await stored()).toEqual({ bookings: 1, bookedSeats: 2 });

      // seats[].bookingId points to the embedded booking with the same id.
      const doc = await showingModel.findById(showingA).lean();
      const booked = doc?.seats.filter((s) => s.bookingId !== null);
      expect(booked?.map((s) => s.bookingId?.toHexString())).toEqual([
        bookingId,
        bookingId,
      ]);
      expect(doc?.bookings[0]._id.toHexString()).toBe(bookingId);
    });

    it('validation errors -> 400, missing showing -> 404', async () => {
      const url = `/showings/${showingA}/bookings`;
      await http().post(url).send({ seats: [] }).expect(400);
      await http()
        .post(url)
        .send({ seats: [{ row: 1 }] })
        .expect(400);
      await http()
        .post(url)
        .send({
          seats: [
            { row: 1, seat: 1 },
            { row: 1, seat: 1 },
          ],
        })
        .expect(400);
      const outside = await http()
        .post(url)
        .send({ seats: [{ row: 9, seat: 1 }] })
        .expect(400);
      expect(body<ErrorBody>(outside).message).toContain('do not exist');
      await http()
        .post(url)
        .send({ seats: [{ row: 1, seat: 6 }] })
        .expect(400);
      await http()
        .post(url)
        .send({ seats: [{ row: 1, seat: 0 }] })
        .expect(400);
      await http()
        .post(url)
        .send({ seats: [{ row: 1.5, seat: 1 }] })
        .expect(400);
      await http()
        .post(`/showings/${MISSING_ID}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(404);
    });

    it('409 when any seat is taken, and nothing is written', async () => {
      const before = await stored();
      // An already booked seat in a hall-bounds-valid request is a conflict, not 400.
      await http()
        .post(`/showings/${showingA}/bookings`)
        .send({ seats: [{ row: 2, seat: 3 }] })
        .expect(409);

      const res = await http()
        .post(`/showings/${showingA}/bookings`)
        .send({
          seats: [
            { row: 1, seat: 1 },
            { row: 2, seat: 3 },
          ],
        })
        .expect(409);
      expect(body<ErrorBody>(res)).toMatchObject({
        statusCode: 409,
        path: `/showings/${showingA}/bookings`,
      });

      expect(await stored()).toEqual(before);
      const seats = await http().get(`/showings/${showingA}/seats`).expect(200);
      const seat11 = body<SeatBody[]>(seats).find(
        (s) => s.row === 1 && s.seat === 1,
      );
      expect(seat11?.isBooked).toBe(false);
    });

    it('the same seat is booked only once under concurrent requests (single-document update)', async () => {
      const before = await stored();
      const attempts = await Promise.all(
        Array.from({ length: 8 }, () =>
          http()
            .post(`/showings/${showingB}/bookings`)
            .send({
              seats: [
                { row: 3, seat: 1 },
                { row: 3, seat: 2 },
              ],
            }),
        ),
      );
      const statuses = attempts.map((res) => res.status).sort();
      expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
      expect(await stored()).toEqual({
        bookings: before.bookings + 1,
        bookedSeats: before.bookedSeats + 2,
      });

      // Two parallel requests for the same seat: exactly one wins.
      const pair = await Promise.all(
        [1, 2].map(() =>
          http()
            .post(`/showings/${showingB}/bookings`)
            .send({ seats: [{ row: 1, seat: 5 }] }),
        ),
      );
      expect(pair.map((res) => res.status).sort()).toEqual([201, 409]);
      const pairWinner = pair.find((res) => res.status === 201);
      await http()
        .delete(`/bookings/${body<Entity>(pairWinner as Response).id}`)
        .expect(204);

      const winner = attempts.find((res) => res.status === 201);
      await http()
        .delete(`/bookings/${body<Entity>(winner as Response).id}`)
        .expect(204);
    });

    it('lists bookings and cancels a booking, freeing its seats', async () => {
      const other = await http()
        .post(`/showings/${showingC}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(201);
      // GET /bookings collects the embedded bookings of every showing.
      const all = await http().get('/bookings').expect(200);
      expect(body<BookingBody[]>(all)).toHaveLength(2);
      expect(body<BookingBody[]>(all)[0]).toMatchObject({
        id: bookingId,
        showingId: showingA,
        seats: [
          { row: 2, seat: 3 },
          { row: 2, seat: 4 },
        ],
      });
      expect(body<BookingBody[]>(all)[1]).toMatchObject({
        showingId: showingC,
        totalPrice: 9000,
      });
      await http()
        .delete(`/bookings/${body<Entity>(other).id}`)
        .expect(204);

      const byShowing = await http()
        .get(`/showings/${showingA}/bookings`)
        .expect(200);
      expect(byShowing.body).toHaveLength(1);
      const otherShowing = await http()
        .get(`/showings/${showingC}/bookings`)
        .expect(200);
      // The booking of showing C was cancelled above.
      expect(otherShowing.body).toHaveLength(0);
      await http().get(`/showings/${MISSING_ID}/bookings`).expect(404);

      await http().delete(`/bookings/${bookingId}`).expect(204);
      await http().delete(`/bookings/${bookingId}`).expect(404);
      await http().delete(`/bookings/${MISSING_ID}`).expect(404);
      // One update freed the seats and pulled the booking from the array.
      expect(await stored()).toEqual({ bookings: 0, bookedSeats: 0 });
      const seats = await http().get(`/showings/${showingA}/seats`).expect(200);
      expect(body<SeatBody[]>(seats).some((s) => s.isBooked)).toBe(false);

      // The freed seats can be booked again.
      await http()
        .post(`/showings/${showingA}/bookings`)
        .send({ seats: [{ row: 2, seat: 3 }] })
        .expect(201);
    });
  });

  describe('deletion rules', () => {
    it('cannot delete film or hall with showings (409 with a reason), 404 for missing', async () => {
      const film = await http().delete(`/films/${filmId}`).expect(409);
      expect(body<ErrorBody>(film).message).toContain('showings');
      const hall = await http().delete(`/halls/${hallId}`).expect(409);
      expect(body<ErrorBody>(hall).message).toContain('showings');
      await http().delete(`/films/${MISSING_ID}`).expect(404);
      await http().delete(`/halls/${MISSING_ID}`).expect(404);
      // Nothing was cascaded.
      await http().get(`/showings/${showingA}`).expect(200);
    });

    it('can delete a hall without showings', async () => {
      const hall = await http()
        .post('/halls')
        .send({ name: 'Empty', rows: 1, seatsPerRow: 1 })
        .expect(201);
      await http()
        .delete(`/halls/${body<Entity>(hall).id}`)
        .expect(204);
      await http()
        .get(`/halls/${body<Entity>(hall).id}`)
        .expect(404);
    });
  });

  describe('swagger', () => {
    it('is served on /docs and describes the page response, query and ObjectId parameters', async () => {
      await http().get('/docs').expect(200);
      const res = await http().get('/docs-json').expect(200);
      const doc = body<{
        paths: Record<
          string,
          Record<
            string,
            {
              parameters?: {
                name: string;
                schema?: { pattern?: string };
              }[];
              responses: Record<
                string,
                { content?: Record<string, { schema: { $ref?: string } }> }
              >;
            }
          >
        >;
        components: { schemas: Record<string, unknown> };
      }>(res);
      const list = doc.paths['/showings'].get;
      expect(list.parameters?.map((p) => p.name)).toEqual(
        expect.arrayContaining(['filmId', 'date', 'page', 'limit', 'sort']),
      );
      expect(
        list.responses['200'].content?.['application/json'].schema,
      ).toEqual({ $ref: '#/components/schemas/ShowingsPageDto' });
      expect(doc.components.schemas).toHaveProperty('ErrorResponseDto');
      const idParam = doc.paths['/films/{id}'].get.parameters?.find(
        (p) => p.name === 'id',
      );
      expect(idParam?.schema?.pattern).toBe('^[0-9a-fA-F]{24}$');
      expect(Object.keys(doc.paths['/bookings/{id}'].delete.responses)).toEqual(
        expect.arrayContaining(['204', '400', '404']),
      );
    });
  });
});
