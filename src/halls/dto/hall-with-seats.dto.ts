import { ApiProperty } from '@nestjs/swagger';
import { Hall } from '../entities/hall.entity';

export class Seat {
  @ApiProperty({ example: 1, description: 'Номер ряду (з 1)' })
  row: number;

  @ApiProperty({ example: 5, description: 'Номер місця в ряду (з 1)' })
  seat: number;
}

export class HallWithSeatsDto extends Hall {
  @ApiProperty({
    type: [Seat],
    description: 'Усі місця залу: rows × seatsPerRow',
  })
  seats: Seat[];
}
