# Cinema Booking API

REST API сервісу бронювання місць у кінотеатрі на NestJS: фільми, зали, сеанси й бронювання.
Дані зберігаються в PostgreSQL (TypeORM), схема бази створюється лише міграціями.

## Вимоги

- Node.js 22 LTS (22.13+) або новіший, npm
- Docker з Docker Compose (PostgreSQL 18 запускається в контейнері)

## Запуск

```bash
# 1. встановлення залежностей
npm install

# 2. змінні оточення (за потреби змініть значення)
cp .env.example .env

# 3. підняти PostgreSQL у Docker Compose (у фоні)
docker compose up -d

# 4. застосувати міграції — створює всі таблиці в порожній базі
npm run migration:run

# 5. (необов'язково) заповнити базу даними для перевірки
npm run seed

# 6. запуск у dev-режимі (з перезапуском при змінах)
npm run start:dev
```

Сервер: http://localhost:3000, документація Swagger: http://localhost:3000/docs

Зупинити базу: `docker compose down` (дані лишаються в іменованому volume `cinema-pgdata`);
`docker compose down -v` — зупинити й видалити дані.

### Змінні оточення (`.env`)

Приклад файлу `.env` (те саме лежить у `.env.example`):

```dotenv
PORT=3000
NODE_ENV=development

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=cinema
POSTGRES_PASSWORD=cinema
POSTGRES_DB=cinema
```

| Змінна | Опис | Приклад |
|---|---|---|
| `PORT` | Порт HTTP-сервера | `3000` |
| `NODE_ENV` | `development`, `production` або `test` | `development` |
| `POSTGRES_HOST` | Хост PostgreSQL (застосунок працює на хості, база — у контейнері) | `localhost` |
| `POSTGRES_PORT` | Порт PostgreSQL на хості; контейнер публікує свій `5432` саме на нього | `5432` |
| `POSTGRES_USER` | Користувач бази; образ Postgres створює його при першому старті | `cinema` |
| `POSTGRES_PASSWORD` | Пароль користувача | `cinema` |
| `POSTGRES_DB` | Назва бази | `cinema` |

Один `.env` читають і застосунок, і `docker-compose.yml`, і CLI TypeORM. Усі змінні обов'язкові: вони проходять
валідацію (`src/config/environment-variables.ts`, декоратори `class-validator`) — без параметрів підключення
до бази або з некоректним значенням застосунок не стартує й пише, яка змінна не пройшла перевірку.
Якщо порт `5432` на машині вже зайнятий, достатньо змінити `POSTGRES_PORT` (наприклад, на `5433`) і
перезапустити `docker compose up -d`.

## База даних

### Міграції

| Команда | Дія |
|---|---|
| `npm run migration:run` | застосувати всі нові міграції |
| `npm run migration:revert` | відкотити останню застосовану міграцію (метод `down`) |
| `npm run migration:show` | показати, які міграції застосовані |
| `npm run migration:generate -- src/migrations/Name` | згенерувати нову міграцію з різниці між сутностями й базою |

`synchronize` вимкнено: структуру бази змінюють лише міграції з папки `src/migrations`. Для CLI TypeORM
є окремий файл джерела даних `src/data-source.ts` (`uuidExtension: 'pgcrypto'`, тож `id` отримують
`DEFAULT gen_random_uuid()`). Міграції оборотні; застосовану міграцію не редагують — зміна схеми означає нову міграцію.

Поточна міграція: `1793728152933-InitialSchema` — таблиці `films`, `halls`, `showings`, `bookings`, `booking_seats`
з ключами, індексами й зовнішніми ключами.

### Засівання (`npm run seed`)

`src/seed.ts` запускається на базі після міграцій і додає 3 фільми, 2 зали, 4 сеанси в різні дати (15–18 січня 2027)
і 1 бронювання на 2 місця. Кожен запис спершу шукається за природним ключем (назва фільму, назва залу,
фільм + зал + час сеансу, заброньоване місце), тож повторний запуск не створює дублікатів.

### Схема

| Таблиця | Колонки | Обмеження |
|---|---|---|
| `films` | `id` uuid, `title` varchar(255), `duration_minutes` integer, `release_year` integer | PK, усі not null |
| `halls` | `id` uuid, `name` varchar(100), `rows` integer, `seats_per_row` integer | PK, `name` унікальна, усі not null |
| `showings` | `id` uuid, `film_id` uuid, `hall_id` uuid, `starts_at` timestamptz, `price` integer (копійки) | FK на `films` і `halls` з `ON DELETE RESTRICT`, усі not null |
| `bookings` | `id` uuid, `showing_id` uuid, `total_price` integer (копійки), `created_at` timestamptz `DEFAULT now()` | FK на `showings`, усі not null |
| `booking_seats` | `id` uuid, `booking_id` uuid, `showing_id` uuid, `row` integer, `seat` integer | FK на `bookings` з `ON DELETE CASCADE`, FK на `showings`; **унікальний індекс (`showing_id`, `row`, `seat`)** |

Усі `id` — `uuid DEFAULT gen_random_uuid()`. Місця залу не зберігаються — перелік обчислюється з `rows × seats_per_row`.

Зв'язки (описані декораторами з обох боків): фільм 1 — N сеансів, зал 1 — N сеансів, сеанс 1 — N бронювань,
бронювання 1 — N заброньованих місць. Сутності лежать у папках `entities` своїх модулів.

## Перевірка

- `requests.http` — усі маршрути й усі описані помилки. Відкрити у VS Code з розширенням
  [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) і виконувати запити
  згори вниз на запущеному сервері; id підставляються автоматично зі змінних. Назви залів містять
  `{{$timestamp}}`, тому файл можна проганяти повторно на тій самій базі. Якщо сервер запущено на іншому порту,
  змініть `@baseUrl` на початку файлу.
- `npm run test:e2e` — автоматичні e2e-тести (потрібен запущений контейнер з базою). Тести не чіпають робочу базу:
  вони створюють окремі бази `<POSTGRES_DB>_test` і `<POSTGRES_DB>_migrations_test` на тому самому сервері,
  будують схему міграціями з порожньої бази, перевіряють типи колонок, унікальний індекс і повний відкат міграцій,
  а наприкінці видаляють ці бази.

## Маршрути

| Маршрут | Успіх | Помилки |
|---|---|---|
| `POST /films` | 201 | 400 |
| `GET /films` | 200 | — |
| `GET /films/:id` | 200 | 404 |
| `PATCH /films/:id` | 200 | 400, 404 |
| `DELETE /films/:id` | 204 | 404, 409 (є сеанси) |
| `POST /halls` | 201 | 400, 409 (назва зайнята) |
| `GET /halls` | 200 | — |
| `GET /halls/:id` | 200 + `seats` | 404 |
| `DELETE /halls/:id` | 204 | 404, 409 (є сеанси) |
| `POST /showings` | 201 | 400 (фільм/зал не існує, дата не ISO 8601 або в минулому, ціна) |
| `GET /showings?filmId=&date=YYYY-MM-DD&page=1&limit=20&sort=asc` | 200, `{ items, total, page, limit }` | 400 (`page`, `limit`, `date`, `sort`, `filmId`) |
| `GET /showings/:id` | 200 | 404 |
| `GET /showings/:id/seats` | 200 | 404 |
| `POST /showings/:id/bookings` | 201 | 400, 404, 409 (місце зайняте) |
| `GET /showings/:id/bookings` | 200 | 404 |
| `GET /bookings` | 200 | — |
| `DELETE /bookings/:id` | 204 | 404 |

Параметр `:id` у шляху має бути UUID, інакше — 400.

### `GET /showings`

Усі параметри необов'язкові й комбінуються:

| Параметр | Значення | За замовчуванням |
|---|---|---|
| `filmId` | UUID фільму | — |
| `date` | `YYYY-MM-DD` — сеанси, що починаються цієї доби (UTC) | — |
| `page` | ціле число від 1 | `1` |
| `limit` | ціле число від 1 до 100 | `20` |
| `sort` | `asc` або `desc` — порядок за часом початку | `asc` |

```json
{
  "items": [
    {
      "id": "…",
      "film": { "id": "…", "title": "Dune: Part Two" },
      "hall": { "id": "…", "name": "Red Hall" },
      "startsAt": "2030-05-10T18:00:00.000Z",
      "price": 12500
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

### Формат помилки

Глобальний фільтр винятків (`src/common/filters/http-exception.filter.ts`) повертає кожну помилку в одному форматі:

```json
{
  "statusCode": 404,
  "message": "Showing with id \"00000000-0000-4000-8000-000000000000\" not found",
  "path": "/showings/00000000-0000-4000-8000-000000000000",
  "timestamp": "2026-11-25T18:00:00.000Z"
}
```

Для помилок валідації `message` — масив повідомлень. Непередбачені помилки (наприклад, збій бази)
повертаються як 500 `Internal server error` без тексту помилки бази; деталі пишуться лише в лог сервера.

## Рішення

- **Бронювання — одна транзакція** (`DataSource.transaction`, усі записи через `manager`): рядок у `bookings`
  і по рядку в `booking_seats` на кожне місце. Якщо хоча б одне місце зайняте, транзакція відкочується, і в базі
  не лишається ні бронювання, ні жодного місця (409).
- **Унікальність місця гарантує база**: унікальний індекс (`showing_id`, `row`, `seat`) на `booking_seats`.
  Усередині транзакції сервіс спершу перевіряє зайняті місця, щоб відповісти зрозумілим повідомленням зі списком
  місць. Якщо два одночасні запити обидва побачили місце вільним, другий отримає від PostgreSQL порушення
  унікальності (`23505`) — воно перехоплюється навколо виклику транзакції й перетворюється на 409
  `One or more seats are already booked` без тексту помилки бази. `showing_id` навмисно продубльовано в
  `booking_seats`: індекс будується лише по колонках однієї таблиці.
- **Скасування бронювання** — одне `DELETE` з `bookings`; місця видаляє база через `ON DELETE CASCADE`.
- **Фільм або зал із сеансами** видалити не можна: сервіс перевіряє наявність сеансів і повертає 409 з поясненням;
  додатково зовнішні ключі `showings` мають `ON DELETE RESTRICT`, тож каскадного видалення сеансів немає навіть
  при одночасних запитах (порушення ключа теж перетворюється на 409).
- **Розклад** фільтрується, сортується й обрізається одним запитом Query Builder (`WHERE`, `ORDER BY`,
  `LIMIT/OFFSET`) і `COUNT(*)` для `total` — масив у застосунку не обрізається. Назви фільму й залу приєднуються
  `JOIN`-ами; обидва зв'язки «багато до одного», тож рядки не множаться. Сеанси з однаковим часом початку
  впорядковані за `id` за зростанням (для обох значень `sort`). Сторінка за межами даних — 200 з порожнім `items`.
- **Фільтр `date`** — доба за UTC: `starts_at >= date 00:00Z AND starts_at < наступна доба 00:00Z`.
  `startsAt` зберігається в `timestamptz` і повертається в UTC.
- **Ціни** зберігаються в копійках (цілі числа): `12500` = 125 грн. `totalPrice` = ціна сеансу × кількість місць.
- **Межі значень** відповідають колонкам `integer`/`varchar`: назва фільму до 255 символів, назва залу до 100,
  тривалість до 1000 хв, зал до 100 рядів × 100 місць, ціна до 10 000 000 копійок, у бронюванні до 100 місць —
  тож некоректні значення дають 400, а не помилку бази.
- **Назва залу** унікальна без урахування регістру й пробілів на краях: сервіс перевіряє `LOWER(name)`, а
  обмеження `UNIQUE` на колонці страхує від одночасних запитів.
- **Списки** `GET /films` і `GET /halls` впорядковані за назвою, `GET /bookings` — за часом створення.
- **Розподіл перевірок**: DTO з `class-validator` перевіряють форму запиту (наявність, тип, діапазон, формат,
  унікальність місць у масиві); сервіси — доменні правила (існування фільму/залу, межі залу, зайнятість місць,
  залежні сеанси при видаленні). `ValidationPipe` глобальний з `whitelist: true` — зайві поля відкидаються.
- **Конфігурація** читається лише через `ConfigService` (`ConfigModule.forRoot({ isGlobal: true, validate })`);
  підключення до бази — `TypeOrmModule.forRootAsync` з `autoLoadEntities`, сервіси працюють через репозиторії
  (`TypeOrmModule.forFeature`).
- **Swagger** описує сторінку розкладу окремим класом `ShowingsPageDto`, query-параметри `GET /showings`
  (`ShowingsQueryDto`) і формат помилки `ErrorResponseDto` для відповідей 400/404/409.

## Структура

```
src/
  config/        валідація змінних оточення
  common/        глобальний фільтр винятків, формат помилки, коди помилок PostgreSQL
  films/         FilmsModule    — фільми (entities/film.entity.ts)
  halls/         HallsModule    — зали та обчислення місць (entities/hall.entity.ts)
  showings/      ShowingsModule — сеанси, розклад, карта місць і бронювання
                 (entities/showing.entity.ts, booking.entity.ts, booking-seat.entity.ts)
  migrations/    міграції TypeORM
  data-source.ts джерело даних для CLI TypeORM і seed
  seed.ts        засівання бази
  setup-app.ts   глобальні ValidationPipe, фільтр винятків і Swagger
docker-compose.yml  PostgreSQL 18
```

Модулі звертаються один до одного лише через експортовані сервіси. Бронювання розміщено в модулі сеансів,
бо карта місць сеансу і бронювання залежать одне від одного. `films` і `halls` пов'язані з `showings` у дві
сторони (сеанс перевіряє існування фільму й залу, а видалення фільму чи залу перевіряє наявність сеансів) —
цю зустрічну залежність розв'язано через `forwardRef`.
