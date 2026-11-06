import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isDuplicateKeyError } from '../common/database-errors';
import { ShowingsService } from '../showings/showings.service';
import { CreateHallDto } from './dto/create-hall.dto';
import {
  HallResponseDto,
  HallWithSeatsDto,
  SeatPositionDto,
} from './dto/hall-response.dto';
import { Hall, HallDocument } from './schemas/hall.schema';

/** Hall layout: the only fields needed to expand or check seats. */
type HallLayout = Pick<Hall, 'rows' | 'seatsPerRow'>;

@Injectable()
export class HallsService {
  constructor(
    @InjectModel(Hall.name)
    private readonly hallModel: Model<Hall>,
    // Showings depend on halls (existence, names, seat layout), and deleting a hall depends on showings.
    @Inject(forwardRef(() => ShowingsService))
    private readonly showingsService: ShowingsService,
  ) {}

  async create(dto: CreateHallDto): Promise<HallResponseDto> {
    try {
      const hall = await this.hallModel.create({
        name: dto.name,
        rows: dto.rows,
        seatsPerRow: dto.seatsPerRow,
      });
      return HallResponseDto.from(hall);
    } catch (error) {
      // The unique index on name (case-insensitive) decides, also for concurrent requests.
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          `Hall with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<HallResponseDto[]> {
    const halls = await this.hallModel.find().sort({ name: 1, _id: 1 }).lean();
    return halls.map((hall) => HallResponseDto.from(hall));
  }

  /** Returns the hall or null; used by other modules for domain checks. */
  find(id: string): Promise<HallDocument | null> {
    return this.hallModel.findById(id).exec();
  }

  async findOneWithSeats(id: string): Promise<HallWithSeatsDto> {
    const hall = await this.find(id);
    if (!hall) {
      throw this.notFound(id);
    }
    return Object.assign(new HallWithSeatsDto(), HallResponseDto.from(hall), {
      seats: this.getSeats(hall),
    });
  }

  /** Seats are not stored in the hall: they are derived from rows × seatsPerRow. */
  getSeats(hall: HallLayout): SeatPositionDto[] {
    const seats: SeatPositionDto[] = [];
    for (let row = 1; row <= hall.rows; row++) {
      for (let seat = 1; seat <= hall.seatsPerRow; seat++) {
        seats.push({ row, seat });
      }
    }
    return seats;
  }

  hasSeat(hall: HallLayout, { row, seat }: SeatPositionDto): boolean {
    return (
      row >= 1 && row <= hall.rows && seat >= 1 && seat <= hall.seatsPerRow
    );
  }

  /** There are no foreign keys in MongoDB: dependent showings are checked by a query. */
  async remove(id: string): Promise<void> {
    if (!(await this.hallModel.exists({ _id: id }))) {
      throw this.notFound(id);
    }
    if (await this.showingsService.existsForHall(id)) {
      throw new ConflictException(
        `Hall "${id}" cannot be deleted: it has scheduled showings`,
      );
    }
    await this.hallModel.deleteOne({ _id: id });
  }

  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Hall with id "${id}" not found`);
  }
}
