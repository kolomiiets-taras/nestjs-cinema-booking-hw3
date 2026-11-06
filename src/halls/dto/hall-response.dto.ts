import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_PATTERN } from '../../common/object-id';
import { Hall } from '../schemas/hall.schema';

/** Position of a seat in a hall: row and seat number, both from 1. */
export class SeatPositionDto {
  @ApiProperty({ example: 1, description: 'Номер ряду (з 1)' })
  row: number;

  @ApiProperty({ example: 5, description: 'Номер місця в ряду (з 1)' })
  seat: number;
}

/** Hall as it is returned to the client: `_id` becomes a string `id`. */
export class HallResponseDto {
  @ApiProperty({
    example: OBJECT_ID_EXAMPLE,
    pattern: OBJECT_ID_PATTERN.source,
    description: 'ObjectId залу рядком',
  })
  id: string;

  @ApiProperty({ example: 'Red Hall', description: 'Унікальна назва залу' })
  name: string;

  @ApiProperty({ example: 3 })
  rows: number;

  @ApiProperty({ example: 5 })
  seatsPerRow: number;

  static from(hall: Hall & { _id: Types.ObjectId }): HallResponseDto {
    return Object.assign(new HallResponseDto(), {
      id: hall._id.toHexString(),
      name: hall.name,
      rows: hall.rows,
      seatsPerRow: hall.seatsPerRow,
    });
  }
}

export class HallWithSeatsDto extends HallResponseDto {
  @ApiProperty({
    type: [SeatPositionDto],
    description: 'Усі місця залу: rows × seatsPerRow',
  })
  seats: SeatPositionDto[];
}
