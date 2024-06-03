import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as getRawBody from 'raw-body';
import { Request } from 'express';

export const MAX_BUFFER: number = 50000000;

@Injectable()
export class FileBinaryInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req: Request = context.switchToHttp().getRequest<Request>();
    (req as any).fileBuffer = await getRawBody(req, { limit: MAX_BUFFER });
    return next.handle();
  }
}
