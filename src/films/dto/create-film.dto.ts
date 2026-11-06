import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFilmDto {
  @ApiProperty({ example: 'Dune: Part Two', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 166,
    maximum: 1000,
    description: 'Тривалість у хвилинах, ціле додатне число',
  })
  @IsInt()
  @IsPositive()
  @Max(1000)
  durationMinutes: number;

  @ApiProperty({ example: 2024, minimum: 1888, maximum: 2100 })
  @IsInt()
  @Min(1888)
  @Max(2100)
  releaseYear: number;
}
