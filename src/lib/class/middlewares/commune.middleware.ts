import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { CustomRequest } from '@/lib/types/request.type';
import { isCommune, isCommuneAncienne } from '@/lib/utils/cog.utils';

@Injectable()
export class CommuneMiddleware implements NestMiddleware {
  async use(req: CustomRequest, res: Response, next: NextFunction) {
    if (
      (req.query?.allCommunes !== 'true' &&
        !isCommune(req.params.codeCommune)) ||
      (req.query?.allCommunes === 'true' &&
        !isCommune(req.params.codeCommune) &&
        !isCommuneAncienne(req.params.codeCommune))
    ) {
      throw new HttpException(
        `Le code commune n’existe pas`,
        HttpStatus.NOT_FOUND,
      );
    }

    req.codeCommune = req.params.codeCommune;
    next();
  }
}
