import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PG_FOREIGN_KEY_VIOLATION,
  isDatabaseError,
} from '../common/database-errors';
import { ShowingsService } from '../showings/showings.service';
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { Film } from './entities/film.entity';

@Injectable()
export class FilmsService {
  constructor(
    @InjectRepository(Film)
    private readonly filmsRepository: Repository<Film>,
    // Showings depend on films (existence, titles), and deleting a film depends on showings.
    @Inject(forwardRef(() => ShowingsService))
    private readonly showingsService: ShowingsService,
  ) {}

  create(dto: CreateFilmDto): Promise<Film> {
    return this.filmsRepository.save(this.filmsRepository.create(dto));
  }

  findAll(): Promise<Film[]> {
    return this.filmsRepository.find({ order: { title: 'ASC', id: 'ASC' } });
  }

  /** Returns the film or null; used by other modules for domain checks. */
  find(id: string): Promise<Film | null> {
    return this.filmsRepository.findOneBy({ id });
  }

  async findOne(id: string): Promise<Film> {
    const film = await this.find(id);
    if (!film) {
      throw new NotFoundException(`Film with id "${id}" not found`);
    }
    return film;
  }

  async update(id: string, dto: UpdateFilmDto): Promise<Film> {
    const film = await this.findOne(id);
    this.filmsRepository.merge(film, dto);
    return this.filmsRepository.save(film);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    if (await this.showingsService.existsForFilm(id)) {
      throw this.hasShowingsConflict(id);
    }
    try {
      await this.filmsRepository.delete({ id });
    } catch (error) {
      // A showing created between the check and the delete: the RESTRICT foreign key stops it.
      if (isDatabaseError(error, PG_FOREIGN_KEY_VIOLATION)) {
        throw this.hasShowingsConflict(id);
      }
      throw error;
    }
  }

  private hasShowingsConflict(id: string): ConflictException {
    return new ConflictException(
      `Film "${id}" cannot be deleted: it has scheduled showings`,
    );
  }
}
