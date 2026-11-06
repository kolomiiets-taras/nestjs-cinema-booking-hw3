import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShowingsService } from '../showings/showings.service';
import { CreateFilmDto } from './dto/create-film.dto';
import { FilmResponseDto } from './dto/film-response.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { Film, FilmDocument } from './schemas/film.schema';

@Injectable()
export class FilmsService {
  constructor(
    @InjectModel(Film.name)
    private readonly filmModel: Model<Film>,
    // Showings depend on films (existence, titles), and deleting a film depends on showings.
    @Inject(forwardRef(() => ShowingsService))
    private readonly showingsService: ShowingsService,
  ) {}

  async create(dto: CreateFilmDto): Promise<FilmResponseDto> {
    const film = await this.filmModel.create(dto);
    return FilmResponseDto.from(film);
  }

  async findAll(): Promise<FilmResponseDto[]> {
    const films = await this.filmModel.find().sort({ title: 1, _id: 1 }).lean();
    return films.map((film) => FilmResponseDto.from(film));
  }

  /** Returns the film or null; used by other modules for domain checks. */
  find(id: string): Promise<FilmDocument | null> {
    return this.filmModel.findById(id).exec();
  }

  async findOne(id: string): Promise<FilmResponseDto> {
    const film = await this.find(id);
    if (!film) {
      throw this.notFound(id);
    }
    return FilmResponseDto.from(film);
  }

  async update(id: string, dto: UpdateFilmDto): Promise<FilmResponseDto> {
    const film = await this.filmModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!film) {
      throw this.notFound(id);
    }
    return FilmResponseDto.from(film);
  }

  /** There are no foreign keys in MongoDB: dependent showings are checked by a query. */
  async remove(id: string): Promise<void> {
    if (!(await this.filmModel.exists({ _id: id }))) {
      throw this.notFound(id);
    }
    if (await this.showingsService.existsForFilm(id)) {
      throw new ConflictException(
        `Film "${id}" cannot be deleted: it has scheduled showings`,
      );
    }
    await this.filmModel.deleteOne({ _id: id });
  }

  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Film with id "${id}" not found`);
  }
}
