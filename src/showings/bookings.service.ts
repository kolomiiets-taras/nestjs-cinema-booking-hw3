import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Hall } from '../halls/schemas/hall.schema';
import { HallsService } from '../halls/halls.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto, SeatDto } from './dto/create-booking.dto';
import { Booking } from './schemas/booking.schema';
import { Showing } from './schemas/showing.schema';
import { ShowingsService } from './showings.service';

const seatKey = ({ row, seat }: SeatDto): string => `${row}:${seat}`;

/** What booking needs to know about the showing before the update. */
type ShowingForBooking = Pick<Showing, 'price'> & {
  _id: Types.ObjectId;
  hall: Pick<Hall, 'name' | 'rows' | 'seatsPerRow'> | null;
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Showing.name)
    private readonly showingModel: Model<Showing>,
    private readonly showingsService: ShowingsService,
    @Inject(forwardRef(() => HallsService))
    private readonly hallsService: HallsService,
  ) {}

  /**
   * Occupying the seats and saving the booking is ONE updateOne on the showing
   * document: its filter requires every requested seat to be free, so either
   * all seats are taken by this booking or the document is left untouched.
   * The seat array is never read and checked in code — between such a read and
   * the write another request could take the same seat.
   */
  async create(
    showingId: string,
    dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    // Existence, price and hall layout; the embedded arrays are not loaded.
    const showing = await this.showingModel
      .findById(showingId, { price: 1, hall: 1 })
      .populate<{ hall: ShowingForBooking['hall'] }>(
        'hall',
        'name rows seatsPerRow',
      )
      .lean<ShowingForBooking>();
    if (!showing) {
      throw this.showingsService.notFound(showingId);
    }
    const { hall } = showing;
    if (!hall) {
      throw new Error(`Showing "${showingId}" refers to a missing hall`);
    }

    // Checked before the update: its filter cannot tell a seat that does not
    // exist from a seat that is taken, so a seat outside the hall would become 409.
    const outside = dto.seats.filter(
      (seat) => !this.hallsService.hasSeat(hall, seat),
    );
    if (outside.length > 0) {
      throw new BadRequestException(
        `Seats do not exist in hall "${hall.name}" (${hall.rows} rows × ${hall.seatsPerRow} seats): ` +
          outside.map(seatKey).join(', '),
      );
    }
    // Repeated seats are rejected by CreateBookingDto (@ArrayUnique) before we get here:
    // two equal $elemMatch conditions are satisfied by one free seat.

    const seats = [...dto.seats]
      .sort((a, b) => a.row - b.row || a.seat - b.seat)
      .map(({ row, seat }) => ({ row, seat }));
    // The id is generated here: it is needed both in $set and in $push.
    const bookingId = new Types.ObjectId();
    const booking: Booking = {
      _id: bookingId,
      seats,
      totalPrice: showing.price * seats.length,
      createdAt: new Date(),
    };

    const result = await this.showingModel.updateOne(
      {
        _id: showing._id,
        $and: seats.map(({ row, seat }) => ({
          seats: { $elemMatch: { row, seat, bookingId: null } },
        })),
      },
      {
        $set: { 'seats.$[target].bookingId': bookingId },
        $push: { bookings: booking },
      },
      {
        arrayFilters: [
          {
            $or: seats.map(({ row, seat }) => ({
              'target.row': row,
              'target.seat': seat,
            })),
          },
        ],
      },
    );

    // The showing exists and every seat is in the hall, so no match means
    // at least one seat is already booked. modifiedCount is not used: it is 0
    // also when a document matched but nothing changed.
    if (result.matchedCount === 0) {
      throw new ConflictException(
        'One or more seats are already booked; no seat was booked',
      );
    }
    return BookingResponseDto.from(booking, showing._id);
  }

  /** Bookings live inside showings: they are collected from every showing document. */
  async findAll(): Promise<BookingResponseDto[]> {
    const rows = await this.showingModel.aggregate<{
      showingId: Types.ObjectId;
      booking: Booking;
    }>([
      { $match: { 'bookings.0': { $exists: true } } },
      { $unwind: '$bookings' },
      { $sort: { 'bookings.createdAt': 1, 'bookings._id': 1 } },
      { $project: { _id: 0, showingId: '$_id', booking: '$bookings' } },
    ]);
    return rows.map(({ booking, showingId }) =>
      BookingResponseDto.from(booking, showingId),
    );
  }

  async findByShowing(showingId: string): Promise<BookingResponseDto[]> {
    const showing = await this.showingModel
      .findById(showingId, { bookings: 1 })
      .lean<Pick<Showing, 'bookings'> & { _id: Types.ObjectId }>();
    if (!showing) {
      throw this.showingsService.notFound(showingId);
    }
    return showing.bookings.map((booking) =>
      BookingResponseDto.from(booking, showing._id),
    );
  }

  /**
   * The booking id does not say which showing it belongs to: the showing is
   * found by the embedded booking, and in the same single update its seats get
   * bookingId: null back and the booking is pulled from the array.
   */
  async remove(id: string): Promise<void> {
    const bookingId = new Types.ObjectId(id);
    const result = await this.showingModel.updateOne(
      { 'bookings._id': bookingId },
      {
        $set: { 'seats.$[target].bookingId': null },
        $pull: { bookings: { _id: bookingId } },
      },
      { arrayFilters: [{ 'target.bookingId': bookingId }] },
    );
    if (result.matchedCount === 0) {
      throw new NotFoundException(`Booking with id "${id}" not found`);
    }
  }
}
