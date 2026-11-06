import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_PATTERN } from '../../common/object-id';
import { Film } from '../../films/schemas/film.schema';
import { Hall } from '../../halls/schemas/hall.schema';
import { Showing } from '../schemas/showing.schema';

const objectIdProperty = (description: string) =>
  ApiProperty({
    example: OBJECT_ID_EXAMPLE,
    pattern: OBJECT_ID_PATTERN.source,
    description,
  });

export class ShowingFilm {
  @objectIdProperty('ObjectId фільму рядком')
  id: string;

  @ApiProperty({ example: 'Dune: Part Two' })
  title: string;
}

export class ShowingHall {
  @objectIdProperty('ObjectId залу рядком')
  id: string;

  @ApiProperty({ example: 'Red Hall' })
  name: string;
}

/** Showing with film and hall replaced by their documents (populate). */
export type PopulatedShowing = Pick<Showing, 'startsAt' | 'price'> & {
  _id: Types.ObjectId;
  film: (Pick<Film, 'title'> & { _id: Types.ObjectId }) | null;
  hall: (Pick<Hall, 'name'> & { _id: Types.ObjectId }) | null;
};

/**
 * Showing as it is returned to the client: with film title and hall name,
 * without the seats and bookings arrays.
 */
export class ShowingResponseDto {
  @objectIdProperty('ObjectId сеансу рядком')
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

  static from(showing: PopulatedShowing): ShowingResponseDto {
    const { film, hall } = showing;
    if (!film || !hall) {
      throw new Error(
        `Showing "${showing._id.toHexString()}" refers to a missing film or hall`,
      );
    }
    return Object.assign(new ShowingResponseDto(), {
      id: showing._id.toHexString(),
      film: { id: film._id.toHexString(), title: film.title },
      hall: { id: hall._id.toHexString(), name: hall.name },
      startsAt: showing.startsAt.toISOString(),
      price: showing.price,
    });
  }
}
