import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_PATTERN } from '../../common/object-id';
import { SeatPositionDto } from '../../halls/dto/hall-response.dto';
import { Booking } from '../schemas/booking.schema';

export class BookingResponseDto {
  @ApiProperty({
    example: OBJECT_ID_EXAMPLE,
    pattern: OBJECT_ID_PATTERN.source,
    description: 'ObjectId бронювання рядком',
  })
  id: string;

  @ApiProperty({
    example: OBJECT_ID_EXAMPLE,
    pattern: OBJECT_ID_PATTERN.source,
    description: 'ObjectId сеансу, у документі якого лежить бронювання',
  })
  showingId: string;

  @ApiProperty({ type: [SeatPositionDto] })
  seats: SeatPositionDto[];

  @ApiProperty({
    example: 25000,
    description: 'Ціна сеансу × кількість місць, у копійках',
  })
  totalPrice: number;

  @ApiProperty({ example: '2026-11-25T18:00:00.000Z' })
  createdAt: string;

  static from(booking: Booking, showingId: Types.ObjectId): BookingResponseDto {
    return Object.assign(new BookingResponseDto(), {
      id: booking._id.toHexString(),
      showingId: showingId.toHexString(),
      seats: booking.seats.map(({ row, seat }) => ({ row, seat })),
      totalPrice: booking.totalPrice,
      createdAt: booking.createdAt.toISOString(),
    });
  }
}
