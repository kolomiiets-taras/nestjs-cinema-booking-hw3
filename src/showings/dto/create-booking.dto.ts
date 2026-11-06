import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';

export class SeatDto {
  @ApiProperty({ example: 2, description: 'Номер ряду, ціле додатне число' })
  @IsInt()
  @IsPositive()
  row: number;

  @ApiProperty({
    example: 3,
    description: 'Номер місця в ряду, ціле додатне число',
  })
  @IsInt()
  @IsPositive()
  seat: number;
}

export class CreateBookingDto {
  @ApiProperty({
    type: [SeatDto],
    description: 'Непорожній масив місць без повторів (не більше 100)',
    maxItems: 100,
    example: [
      { row: 2, seat: 3 },
      { row: 2, seat: 4 },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ArrayUnique((seat: SeatDto) => `${seat?.row}:${seat?.seat}`, {
    message: 'seats must not contain the same seat more than once',
  })
  @ValidateNested({ each: true })
  @Type(() => SeatDto)
  seats: SeatDto[];
}
