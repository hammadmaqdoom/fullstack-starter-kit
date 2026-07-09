import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiEnvelope,
  PaginatedServiceResult,
} from '../types/api-envelope.type';

@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ url?: string }>();
    const url = request.url ?? '';

    if (!this.shouldEnvelope(url)) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => this.wrap(data)));
  }

  private shouldEnvelope(url: string): boolean {
    return url.startsWith('/api/v1/');
  }

  private wrap(data: unknown): ApiEnvelope {
    if (this.isEnvelope(data)) {
      return data;
    }

    if (data === undefined) {
      return { data: null, meta: {}, errors: [] };
    }

    if (this.isPaginatedResult(data)) {
      const { items, meta } = data;
      return { data: items, meta, errors: [] };
    }

    return { data, meta: {}, errors: [] };
  }

  private isEnvelope(value: unknown): value is ApiEnvelope {
    return (
      value !== null &&
      typeof value === 'object' &&
      'data' in value &&
      'meta' in value &&
      'errors' in value
    );
  }

  private isPaginatedResult(
    value: unknown,
  ): value is PaginatedServiceResult<unknown> {
    return (
      value !== null &&
      typeof value === 'object' &&
      'items' in value &&
      'meta' in value &&
      Array.isArray((value as PaginatedServiceResult<unknown>).items)
    );
  }
}
