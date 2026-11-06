import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { FilmsService } from '../films/films.service';
import { HallsService } from '../halls/halls.service';
import { CreateShowingDto } from './dto/create-showing.dto';
import { SeatStateDto } from './dto/seat-state.dto';
import {
  PopulatedShowing,
  ShowingResponseDto,
} from './dto/showing-response.dto';
import { ShowingsPageDto } from './dto/showings-page.dto';
import { ShowingsQueryDto } from './dto/showings-query.dto';
import { Showing } from './schemas/showing.schema';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Responses never carry the embedded arrays: they can hold hundreds of elements. */
const WITHOUT_ARRAYS = { seats: 0, bookings: 0 } as const;

/** populate() options: only the fields the response needs. */
const POPULATE_NAMES = [
  { path: 'film', select: 'title' },
  { path: 'hall', select: 'name' },
];

@Injectable()
export class ShowingsService {
  constructor(
    @InjectModel(Showing.name)
    private readonly showingModel: Model<Showing>,
    @Inject(forwardRef(() => FilmsService))
    private readonly filmsService: FilmsService,
    @Inject(forwardRef(() => HallsService))
    private readonly hallsService: HallsService,
  ) {}

  async create(dto: CreateShowingDto): Promise<ShowingResponseDto> {
    // Referenced records that do not exist make the request itself invalid -> 400, not 404.
    const film = await this.filmsService.find(dto.filmId);
    if (!film) {
      throw new BadRequestException(
        `Film with id "${dto.filmId}" does not exist`,
      );
    }
    const hall = await this.hallsService.find(dto.hallId);
    if (!hall) {
      throw new BadRequestException(
        `Hall with id "${dto.hallId}" does not exist`,
      );
    }
    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('startsAt must be in the future');
    }

    // The hall layout is expanded into the seats array once, at creation:
    // every seat starts free (bookingId: null), bookings start empty.
    const showing = await this.showingModel.create({
      film: film._id,
      hall: hall._id,
      startsAt,
      price: dto.price,
      seats: this.hallsService
        .getSeats(hall)
        .map((seat) => ({ ...seat, bookingId: null })),
      bookings: [],
    });
    await showing.populate<PopulatedShowing>(POPULATE_NAMES);
    return ShowingResponseDto.from(showing as unknown as PopulatedShowing);
  }

  /**
   * Filtering, sorting and paging are done by the database: only the documents
   * of the requested page are read, plus countDocuments() for `total`.
   */
  async findAll(query: ShowingsQueryDto): Promise<ShowingsPageDto> {
    const { filmId, date, page, limit, sort } = query;

    const filter: QueryFilter<Showing> = {};
    if (filmId) {
      filter.film = new Types.ObjectId(filmId);
    }
    if (date) {
      // Showings that start during this day (UTC): [date 00:00, next day 00:00).
      const from = new Date(`${date}T00:00:00.000Z`);
      const to = new Date(from.getTime() + DAY_MS);
      filter.startsAt = { $gte: from, $lt: to };
    }

    const [showings, total] = await Promise.all([
      this.showingModel
        .find(filter, WITHOUT_ARRAYS)
        .sort({ startsAt: sort === 'desc' ? -1 : 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate<PopulatedShowing>(POPULATE_NAMES)
        .lean<PopulatedShowing[]>(),
      this.showingModel.countDocuments(filter),
    ]);

    return {
      items: showings.map((showing) => ShowingResponseDto.from(showing)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ShowingResponseDto> {
    const showing = await this.showingModel
      .findById(id, WITHOUT_ARRAYS)
      .populate<PopulatedShowing>(POPULATE_NAMES)
      .lean<PopulatedShowing>();
    if (!showing) {
      throw this.notFound(id);
    }
    return ShowingResponseDto.from(showing);
  }

  /** Seat map of the showing: isBooked is derived from seats[].bookingId. */
  async getSeats(id: string): Promise<SeatStateDto[]> {
    const showing = await this.showingModel
      .findById(id, { seats: 1 })
      .lean<Pick<Showing, 'seats'>>();
    if (!showing) {
      throw this.notFound(id);
    }
    return showing.seats.map(({ row, seat, bookingId }) => ({
      row,
      seat,
      isBooked: bookingId !== null,
    }));
  }

  existsForFilm(filmId: string): Promise<boolean> {
    return this.exists({ film: new Types.ObjectId(filmId) });
  }

  existsForHall(hallId: string): Promise<boolean> {
    return this.exists({ hall: new Types.ObjectId(hallId) });
  }

  notFound(id: string): NotFoundException {
    return new NotFoundException(`Showing with id "${id}" not found`);
  }

  private async exists(filter: QueryFilter<Showing>): Promise<boolean> {
    return (await this.showingModel.exists(filter)) !== null;
  }
}
