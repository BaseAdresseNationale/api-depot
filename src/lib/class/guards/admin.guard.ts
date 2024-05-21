import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';

import { CustomRequest } from '@/lib/types/request.type';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req: CustomRequest = context.getArgByIndex(0);

    const ADMIN_TOKEN: string = this.configService.get('ADMIN_TOKEN');
    const isAdmin =
      req.get('Authorization') === `Token ${ADMIN_TOKEN}` ||
      req.get('Authorization') === `Bearer ${ADMIN_TOKEN}`;

    if (!ADMIN_TOKEN || !isAdmin) {
      throw new HttpException(`Non autorisé`, HttpStatus.FORBIDDEN);
    }

    return isAdmin;
  }
}
