import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class ShowingsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Лише сеанси цього фільму',
  })
  @IsOptional()
  @IsUUID()
  filmId?: string;

  @ApiPropertyOptional({
    example: '2026-12-01',
    description: 'Лише сеанси, що починаються в цю добу (YYYY-MM-DD, UTC)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  @IsISO8601(
    { strict: true },
    { message: 'date must be a valid calendar date' },
  )
  date?: string;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    default: 1,
    description: 'Номер сторінки',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: 100,
    default: 20,
    description: 'Кількість сеансів на сторінці',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    enum: SORT_ORDERS,
    default: 'asc',
    description:
      'Порядок за часом початку; сеанси з однаковим часом — за id (за зростанням)',
  })
  @IsOptional()
  @IsIn(SORT_ORDERS, { message: 'sort must be one of: asc, desc' })
  sort: SortOrder = 'asc';
}
