import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

/**
 * Global filter: every error response has the same shape
 * { statusCode, message, path, timestamp }.
 * Unexpected errors (e.g. database failures) become a generic 500 —
 * their internal text is logged, never sent to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as { message?: string | string[] }).message ??
            exception.message);
    } else {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseDto = {
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(status).json(body);
  }
}
