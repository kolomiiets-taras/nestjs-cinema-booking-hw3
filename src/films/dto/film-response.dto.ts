import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_PATTERN } from '../../common/object-id';
import { Film } from '../schemas/film.schema';

/** Film as it is returned to the client: `_id` becomes a string `id`. */
export class FilmResponseDto {
  @ApiProperty({
    example: OBJECT_ID_EXAMPLE,
    pattern: OBJECT_ID_PATTERN.source,
    description: 'ObjectId фільму рядком',
  })
  id: string;

  @ApiProperty({ example: 'Dune: Part Two' })
  title: string;

  @ApiProperty({ example: 166, description: 'Тривалість у хвилинах' })
  durationMinutes: number;

  @ApiProperty({ example: 2024 })
  releaseYear: number;

  static from(film: Film & { _id: Types.ObjectId }): FilmResponseDto {
    return Object.assign(new FilmResponseDto(), {
      id: film._id.toHexString(),
      title: film.title,
      durationMinutes: film.durationMinutes,
      releaseYear: film.releaseYear,
    });
  }
}
