import { ApiProperty } from '@nestjs/swagger';

export class ShowingFilm {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Dune: Part Two' })
  title: string;
}

export class ShowingHall {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Red Hall' })
  name: string;
}

/** Showing as it is returned to the client: with film title and hall name. */
export class ShowingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: ShowingFilm })
  film: ShowingFilm;

  @ApiProperty({ type: ShowingHall })
  hall: ShowingHall;

  @ApiProperty({
    example: '2026-12-01T18:30:00.000Z',
    description: 'Початок сеансу (ISO 8601, UTC)',
  })
  startsAt: string;

  @ApiProperty({ example: 12500, description: 'Ціна квитка в копійках' })
  price: number;
}
