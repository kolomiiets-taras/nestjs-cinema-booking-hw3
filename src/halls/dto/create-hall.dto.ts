import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateHallDto {
  @ApiProperty({
    example: 'Red Hall',
    maxLength: 100,
    description: 'Назва залу, має бути унікальною',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 3,
    maximum: 100,
    description: 'Кількість рядів, ціле додатне число',
  })
  @IsInt()
  @IsPositive()
  @Max(100)
  rows: number;

  @ApiProperty({
    example: 5,
    maximum: 100,
    description: 'Кількість місць у ряду, ціле додатне число',
  })
  @IsInt()
  @IsPositive()
  @Max(100)
  seatsPerRow: number;
}
