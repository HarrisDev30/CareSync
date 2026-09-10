import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  statusCode: number;
  data: T;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((result) => {
        // If the handler already returned an envelope with statusCode and data, pass it through
        if (result && typeof result === 'object' && 'data' in result && 'statusCode' in result) {
          return result;
        }

        return {
          statusCode,
          data: result?.data !== undefined ? result.data : result,
          ...(result?.message ? { message: result.message } : {}),
        };
      }),
    );
  }
}

