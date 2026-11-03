import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

/**
 * Wraps successful responses in the envelope both frontends expect:
 * `{ success: true, message, data, ...extra }`.
 *
 * Handlers return either a bare payload (wrapped as `data`) or an object of
 * the shape `{ data, message?, ...extra }` to set a custom message / add
 * top-level fields (e.g. pagination).
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const message =
      this.reflector.getAllAndOverride<string | undefined>(
        RESPONSE_MESSAGE_KEY,
        [context.getHandler(), context.getClass()],
      ) || 'Success';

    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'success' in payload &&
          !('data' in payload && payload.data === undefined)
        ) {
          return payload; // already enveloped by the handler
        }
        if (payload && typeof payload === 'object' && 'data' in payload) {
          const { data, message: customMessage, ...rest } = payload;
          return {
            success: true,
            message: customMessage ?? message,
            data,
            ...rest,
          };
        }
        return { success: true, message, data: payload ?? null };
      }),
    );
  }
}
