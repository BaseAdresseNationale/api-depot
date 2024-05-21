import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { CustomRequest } from 'src/lib/types/request.type';
import { isCommune } from '../../utils/cog';

@Injectable()
export class CommuneMiddleware implements NestMiddleware {
  async use(req: CustomRequest, res: Response, next: NextFunction) {
    if (!isCommune(req.params.codeCommune)) {
      throw new HttpException(
        `Le code commune n’existe pas`,
        HttpStatus.NOT_FOUND,
      );
    }

    req.codeCommune = req.params.codeCommune;
    next();
  }
}
