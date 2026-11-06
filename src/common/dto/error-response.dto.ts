import { ApiProperty } from '@nestjs/swagger';

/** Single error body produced by HttpExceptionFilter for every failed request. */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Showing with id "00000000-0000-4000-8000-000000000000" not found',
    description:
      'Причина помилки; для помилок валідації — масив повідомлень, по одному на кожне порушене правило',
  })
  message: string | string[];

  @ApiProperty({ example: '/showings/00000000-0000-4000-8000-000000000000' })
  path: string;

  @ApiProperty({ example: '2026-11-25T18:00:00.000Z' })
  timestamp: string;
}
