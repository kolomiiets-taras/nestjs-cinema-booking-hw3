import { ApiProperty } from '@nestjs/swagger';

export class SeatStateDto {
  @ApiProperty({ example: 1 })
  row: number;

  @ApiProperty({ example: 3 })
  seat: number;

  @ApiProperty({ example: false })
  isBooked: boolean;
}
