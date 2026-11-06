import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilmsService } from '../films/films.service';
import { HallsService } from '../halls/halls.service';
import { CreateShowingDto } from './dto/create-showing.dto';
import { ShowingResponseDto } from './dto/showing-response.dto';
import { ShowingsPageDto } from './dto/showings-page.dto';
import { ShowingsQueryDto } from './dto/showings-query.dto';
import { Showing } from './entities/showing.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ShowingsService {
  constructor(
    @InjectRepository(Showing)
    private readonly showingsRepository: Repository<Showing>,
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

    const showing = await this.showingsRepository.save(
      this.showingsRepository.create({
        filmId: film.id,
        hallId: hall.id,
        startsAt,
        price: dto.price,
      }),
    );
    return this.toResponse({ ...showing, film, hall });
  }

  /**
   * Filtering, sorting and paging are done by one database query:
   * only the rows of the requested page are read, plus COUNT(*) for `total`.
   */
  async findAll(query: ShowingsQueryDto): Promise<ShowingsPageDto> {
    const { filmId, date, page, limit, sort } = query;

    const qb = this.showingsRepository
      .createQueryBuilder('showing')
      .innerJoin('showing.film', 'film')
      .addSelect(['film.id', 'film.title'])
      .innerJoin('showing.hall', 'hall')
      .addSelect(['hall.id', 'hall.name']);

    if (filmId) {
      qb.andWhere('showing.filmId = :filmId', { filmId });
    }
    if (date) {
      // Showings that start during this day (UTC): [date 00:00, next day 00:00).
      const from = new Date(`${date}T00:00:00.000Z`);
      const to = new Date(from.getTime() + DAY_MS);
      qb.andWhere('showing.startsAt >= :from AND showing.startsAt < :to', {
        from,
        to,
      });
    }

    // Both joins are many-to-one (one film and one hall per showing), so the
    // join never multiplies rows and plain OFFSET/LIMIT page the showings correctly.
    const [showings, total] = await qb
      .orderBy('showing.startsAt', sort === 'desc' ? 'DESC' : 'ASC')
      .addOrderBy('showing.id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return {
      items: showings.map((showing) => this.toResponse(showing)),
      total,
      page,
      limit,
    };
  }

  /** Stored showing without relations; throws 404 when it does not exist. */
  async findOne(id: string): Promise<Showing> {
    const showing = await this.showingsRepository.findOneBy({ id });
    if (!showing) {
      throw new NotFoundException(`Showing with id "${id}" not found`);
    }
    return showing;
  }

  async findOneView(id: string): Promise<ShowingResponseDto> {
    const showing = await this.showingsRepository.findOne({
      where: { id },
      relations: { film: true, hall: true },
    });
    if (!showing) {
      throw new NotFoundException(`Showing with id "${id}" not found`);
    }
    return this.toResponse(showing);
  }

  existsForFilm(filmId: string): Promise<boolean> {
    return this.showingsRepository.existsBy({ filmId });
  }

  existsForHall(hallId: string): Promise<boolean> {
    return this.showingsRepository.existsBy({ hallId });
  }

  private toResponse(showing: Showing): ShowingResponseDto {
    if (!showing.film || !showing.hall) {
      throw new Error(`Showing "${showing.id}" was loaded without film/hall`);
    }
    return {
      id: showing.id,
      film: { id: showing.film.id, title: showing.film.title },
      hall: { id: showing.hall.id, name: showing.hall.name },
      startsAt: showing.startsAt.toISOString(),
      price: showing.price,
    };
  }
}
