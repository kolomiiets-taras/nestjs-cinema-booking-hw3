import { ApiProperty } from '@nestjs/swagger';
import { Seat } from '../../halls/dto/hall-with-seats.dto';

export class BookingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  showingId: string;

  @ApiProperty({ type: [Seat] })
  seats: Seat[];

  @ApiProperty({
    example: 25000,
    description: 'Ціна сеансу × кількість місць, у копійках',
  })
  totalPrice: number;

  @ApiProperty({ example: '2026-11-25T18:00:00.000Z' })
  createdAt: string;
}
