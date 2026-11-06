import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsMongoId, IsPositive, Max } from 'class-validator';
import {
  OBJECT_ID_EXAMPLE,
  OBJECT_ID_FORMAT_HINT,
  OBJECT_ID_PATTERN,
} from '../../common/object-id';

export class CreateShowingDto {
  @ApiProperty({
    example: OBJECT_ID_EXAMPLE,
    pattern: OBJECT_ID_PATTERN.source,
    description: 'ObjectId наявного фільму',
  })
  @IsMongoId({ message: `filmId: ${OBJECT_ID_FORMAT_HINT}` })
  filmId: string;

  @ApiProperty({
    example: OBJECT_ID_EXAMPLE,
    pattern: OBJECT_ID_PATTERN.source,
    description: 'ObjectId наявного залу',
  })
  @IsMongoId({ message: `hallId: ${OBJECT_ID_FORMAT_HINT}` })
  hallId: string;

  @ApiProperty({
    example: '2026-12-01T18:30:00Z',
    description: 'Дата й час початку у форматі ISO 8601, не в минулому',
  })
  @IsISO8601(
    { strict: true, strictSeparator: true },
    { message: 'startsAt must be a valid ISO 8601 date-time' },
  )
  startsAt: string;

  @ApiProperty({
    example: 12500,
    maximum: 10_000_000,
    description: 'Ціна квитка в копійках, ціле додатне число (125 грн = 12500)',
  })
  @IsInt()
  @IsPositive()
  @Max(10_000_000)
  price: number;
}
