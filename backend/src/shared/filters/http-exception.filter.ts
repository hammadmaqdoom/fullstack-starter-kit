import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiEnvelope, ApiError } from '../types/api-envelope.type';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (!this.shouldEnvelope(request.url)) {
      const body =
        exception instanceof HttpException
          ? exception.getResponse()
          : { statusCode: status, message: 'Internal server error' };
      response.status(status).send(body);
      return;
    }

    const envelope: ApiEnvelope = {
      data: null,
      meta: {},
      errors: this.formatErrors(status, exception),
    };

    response.status(status).send(envelope);
  }

  private shouldEnvelope(url: string): boolean {
    return url.startsWith('/api/v1/');
  }

  private formatErrors(status: number, exception: unknown): ApiError[] {
    if (!(exception instanceof HttpException)) {
      return [
        {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          status,
        },
      ];
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return [
        {
          code: this.statusToCode(status),
          message: response,
          status,
        },
      ];
    }

    if (typeof response !== 'object' || response === null) {
      return [
        {
          code: this.statusToCode(status),
          message: exception.message,
          status,
        },
      ];
    }

    const body = response as Record<string, unknown>;
    const message = body.message;
    const errorCode =
      typeof body.errorCode === 'string' ? body.errorCode : undefined;

    if (Array.isArray(message)) {
      return message.map((entry) => this.mapValidationEntry(entry, status));
    }

    if (typeof message === 'string') {
      return [
        {
          code: errorCode ?? this.statusToCode(status),
          message,
          status,
        },
      ];
    }

    return [
      {
        code: errorCode ?? this.statusToCode(status),
        message: exception.message,
        status,
      },
    ];
  }

  private mapValidationEntry(entry: unknown, status: number): ApiError {
    if (typeof entry === 'string') {
      return {
        code: 'VALIDATION_ERROR',
        message: entry,
        status,
      };
    }

    if (typeof entry === 'object' && entry !== null) {
      const validation = entry as {
        property?: string;
        constraints?: Record<string, string>;
      };
      const constraintMessage = validation.constraints
        ? Object.values(validation.constraints)[0]
        : 'Validation failed';

      return {
        code: 'VALIDATION_ERROR',
        message: constraintMessage,
        field: validation.property,
        status,
      };
    }

    return {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      status,
    };
  }

  private statusToCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };

    return codes[status] ?? 'HTTP_ERROR';
  }
}
