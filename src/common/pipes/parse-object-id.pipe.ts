import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { OBJECT_ID_FORMAT_HINT, isObjectId } from '../object-id';

/**
 * Checks a route parameter before any database call: a malformed id is a 400
 * with an explanation of the format, a well-formed id of a missing document
 * reaches the service and becomes a 404 there.
 * Types.ObjectId.isValid() is not used: it also accepts any 12-character string.
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<unknown, string> {
  transform(value: unknown, metadata: ArgumentMetadata): string {
    if (!isObjectId(value)) {
      const name = metadata.data ?? 'id';
      throw new BadRequestException(
        `Invalid ${name} "${String(value)}": ${OBJECT_ID_FORMAT_HINT}`,
      );
    }
    return value;
  }
}
