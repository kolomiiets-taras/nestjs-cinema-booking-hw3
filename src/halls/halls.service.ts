import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import {
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  isDatabaseError,
} from '../common/database-errors';
import { ShowingsService } from '../showings/showings.service';
import { CreateHallDto } from './dto/create-hall.dto';
import { HallWithSeatsDto, Seat } from './dto/hall-with-seats.dto';
import { Hall } from './entities/hall.entity';

@Injectable()
export class HallsService {
  constructor(
    @InjectRepository(Hall)
    private readonly hallsRepository: Repository<Hall>,
    // Showings depend on halls (existence, names, seat layout), and deleting a hall depends on showings.
    @Inject(forwardRef(() => ShowingsService))
    private readonly showingsService: ShowingsService,
  ) {}

  async create(dto: CreateHallDto): Promise<Hall> {
    const name = dto.name.trim();
    // The unique constraint on halls.name is case-sensitive; the API also treats
    // "Red Hall" and "red hall" as the same name.
    const duplicate = await this.hallsRepository.exists({
      where: {
        name: Raw((column) => `LOWER(${column}) = LOWER(:name)`, { name }),
      },
    });
    if (duplicate) {
      throw this.duplicateNameConflict(name);
    }
    try {
      return await this.hallsRepository.save(
        this.hallsRepository.create({
          name,
          rows: dto.rows,
          seatsPerRow: dto.seatsPerRow,
        }),
      );
    } catch (error) {
      // Two requests with the same name at the same time: the unique constraint decides.
      if (isDatabaseError(error, PG_UNIQUE_VIOLATION)) {
        throw this.duplicateNameConflict(name);
      }
      throw error;
    }
  }

  findAll(): Promise<Hall[]> {
    return this.hallsRepository.find({ order: { name: 'ASC', id: 'ASC' } });
  }

  /** Returns the hall or null; used by other modules for domain checks. */
  find(id: string): Promise<Hall | null> {
    return this.hallsRepository.findOneBy({ id });
  }

  async findOne(id: string): Promise<Hall> {
    const hall = await this.find(id);
    if (!hall) {
      throw new NotFoundException(`Hall with id "${id}" not found`);
    }
    return hall;
  }

  async findOneWithSeats(id: string): Promise<HallWithSeatsDto> {
    const hall = await this.findOne(id);
    return {
      id: hall.id,
      name: hall.name,
      rows: hall.rows,
      seatsPerRow: hall.seatsPerRow,
      seats: this.getSeats(hall),
    };
  }

  /** Seats are not stored: they are derived from rows × seatsPerRow. */
  getSeats(hall: Hall): Seat[] {
    const seats: Seat[] = [];
    for (let row = 1; row <= hall.rows; row++) {
      for (let seat = 1; seat <= hall.seatsPerRow; seat++) {
        seats.push({ row, seat });
      }
    }
    return seats;
  }

  hasSeat(hall: Hall, { row, seat }: Seat): boolean {
    return (
      row >= 1 && row <= hall.rows && seat >= 1 && seat <= hall.seatsPerRow
    );
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    if (await this.showingsService.existsForHall(id)) {
      throw this.hasShowingsConflict(id);
    }
    try {
      await this.hallsRepository.delete({ id });
    } catch (error) {
      // A showing created between the check and the delete: the RESTRICT foreign key stops it.
      if (isDatabaseError(error, PG_FOREIGN_KEY_VIOLATION)) {
        throw this.hasShowingsConflict(id);
      }
      throw error;
    }
  }

  private duplicateNameConflict(name: string): ConflictException {
    return new ConflictException(`Hall with name "${name}" already exists`);
  }

  private hasShowingsConflict(id: string): ConflictException {
    return new ConflictException(
      `Hall "${id}" cannot be deleted: it has scheduled showings`,
    );
  }
}
