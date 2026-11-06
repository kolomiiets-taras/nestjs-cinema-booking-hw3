import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsPositive, IsUUID, Max } from 'class-validator';

export class CreateShowingDto {
  @ApiProperty({ format: 'uuid', description: 'id наявного фільму' })
  @IsUUID()
  filmId: string;

  @ApiProperty({ format: 'uuid', description: 'id наявного залу' })
  @IsUUID()
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
