import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PG_UNIQUE_VIOLATION,
  isDatabaseError,
} from '../common/database-errors';
import { Seat } from '../halls/dto/hall-with-seats.dto';
import { HallsService } from '../halls/halls.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { SeatStateDto } from './dto/seat-state.dto';
import { BookingSeat } from './entities/booking-seat.entity';
import { Booking } from './entities/booking.entity';
import { ShowingsService } from './showings.service';

const seatKey = ({ row, seat }: Seat): string => `${row}:${seat}`;

@Injectable()
export class BookingsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(BookingSeat)
    private readonly bookingSeatsRepository: Repository<BookingSeat>,
    private readonly showingsService: ShowingsService,
    @Inject(forwardRef(() => HallsService))
    private readonly hallsService: HallsService,
  ) {}

  async create(
    showingId: string,
    dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const showing = await this.showingsService.findOne(showingId);
    const hall = await this.hallsService.findOne(showing.hallId);

    const outside = dto.seats.filter(
      (seat) => !this.hallsService.hasSeat(hall, seat),
    );
    if (outside.length > 0) {
      throw new BadRequestException(
        `Seats do not exist in hall "${hall.name}" (${hall.rows} rows × ${hall.seatsPerRow} seats): ` +
          outside.map(seatKey).join(', '),
      );
    }

    try {
      // The booking row and all its seat rows are written in one transaction:
      // if any insert fails, nothing of this booking stays in the database.
      const booking = await this.dataSource.transaction(async (manager) => {
        // Fast path with a readable message. It is not the guarantee: two concurrent
        // requests may both pass it, and then the unique index decides (see catch below).
        const taken = await manager.find(BookingSeat, {
          select: { row: true, seat: true },
          where: dto.seats.map(({ row, seat }) => ({ showingId, row, seat })),
        });
        if (taken.length > 0) {
          throw new ConflictException(
            `Seats are already booked: ${taken.map(seatKey).join(', ')}`,
          );
        }

        const created = await manager.save(
          manager.create(Booking, {
            showingId,
            totalPrice: showing.price * dto.seats.length,
          }),
        );
        created.seats = await manager.save(
          dto.seats.map(({ row, seat }) =>
            manager.create(BookingSeat, {
              bookingId: created.id,
              showingId,
              row,
              seat,
            }),
          ),
        );
        return created;
      });
      return this.toResponse(booking);
    } catch (error) {
      if (isDatabaseError(error, PG_UNIQUE_VIOLATION)) {
        // The transaction is already rolled back; the database error text is not exposed.
        throw new ConflictException('One or more seats are already booked');
      }
      throw error;
    }
  }

  async findAll(): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingsRepository.find({
      relations: { seats: true },
      order: {
        createdAt: 'ASC',
        id: 'ASC',
        seats: { row: 'ASC', seat: 'ASC' },
      },
    });
    return bookings.map((booking) => this.toResponse(booking));
  }

  async findByShowing(showingId: string): Promise<BookingResponseDto[]> {
    await this.showingsService.findOne(showingId);
    const bookings = await this.bookingsRepository.find({
      where: { showingId },
      relations: { seats: true },
      order: {
        createdAt: 'ASC',
        id: 'ASC',
        seats: { row: 'ASC', seat: 'ASC' },
      },
    });
    return bookings.map((booking) => this.toResponse(booking));
  }

  async getSeatMap(showingId: string): Promise<SeatStateDto[]> {
    const showing = await this.showingsService.findOne(showingId);
    const hall = await this.hallsService.findOne(showing.hallId);
    const bookedSeats = await this.bookingSeatsRepository.find({
      select: { row: true, seat: true },
      where: { showingId },
    });
    const booked = new Set(bookedSeats.map(seatKey));
    return this.hallsService
      .getSeats(hall)
      .map((seat) => ({ ...seat, isBooked: booked.has(seatKey(seat)) }));
  }

  /** Seats of the booking are removed by ON DELETE CASCADE on booking_seats.booking_id. */
  async remove(id: string): Promise<void> {
    const result = await this.bookingsRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Booking with id "${id}" not found`);
    }
  }

  private toResponse(booking: Booking): BookingResponseDto {
    return {
      id: booking.id,
      showingId: booking.showingId,
      seats: (booking.seats ?? []).map(({ row, seat }) => ({ row, seat })),
      totalPrice: booking.totalPrice,
      createdAt: booking.createdAt.toISOString(),
    };
  }
}
