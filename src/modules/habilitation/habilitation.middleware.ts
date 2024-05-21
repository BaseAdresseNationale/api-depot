import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { CustomRequest } from '@/lib/types/request.type';
import { HabilitationService } from './habilitation.service';
import { Habilitation } from './habilitation.schema';

@Injectable()
export class HabilitationMiddleware implements NestMiddleware {
  constructor(private habilitationService: HabilitationService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { habilitationId } = req.params;
    if (habilitationId) {
      const habilitation: Habilitation =
        await this.habilitationService.findOneOrFail(habilitationId);
      req.habilitation = habilitation;
    }
    next();
  }
}
