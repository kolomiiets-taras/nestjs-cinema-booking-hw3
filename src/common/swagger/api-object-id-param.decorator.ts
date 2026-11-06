import { ApiParam } from '@nestjs/swagger';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_PATTERN } from '../object-id';

/** Documents an ObjectId route parameter: format, pattern and an example. */
export function ApiObjectIdParam(
  description: string,
  name = 'id',
): MethodDecorator {
  return ApiParam({
    name,
    description: `${description}. ObjectId — 24 шістнадцяткові символи, інакше 400`,
    schema: {
      type: 'string',
      pattern: OBJECT_ID_PATTERN.source,
      example: OBJECT_ID_EXAMPLE,
    },
  });
}
