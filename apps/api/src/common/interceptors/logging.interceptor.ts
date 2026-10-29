import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip } = req;
    const userId = req.user?.id;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - now;
          this.logger.log(
            `${method} ${url} ${res.statusCode} — ${duration}ms${userId ? ` [${userId.slice(0, 8)}]` : ''} (${ip})`,
          );
        },
        error: (err) => {
          const duration = Date.now() - now;
          this.logger.warn(`${method} ${url} ERR — ${duration}ms: ${err.message}`);
        },
      }),
    );
  }
}
