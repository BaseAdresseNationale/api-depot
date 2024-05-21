import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { CustomRequest } from '@/lib/types/request.type';

@Injectable()
export class RevisionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: CustomRequest = context.getArgByIndex(0);

    if (req.revision.client.toString() !== req.client._id.toString()) {
      throw new HttpException(
        'Vous n’êtes pas autorisé à accéder à cette révision',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
