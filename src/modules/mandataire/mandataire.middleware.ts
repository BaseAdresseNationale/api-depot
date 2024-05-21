import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { CustomRequest } from '@/lib/types/request.type';
import { Mandataire } from './mandataire.schema';
import { MandataireService } from './mandataire.service';

@Injectable()
export class MandataireMiddleware implements NestMiddleware {
  constructor(private mandataireService: MandataireService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { mandataireId } = req.params;
    if (mandataireId) {
      const mandataire: Mandataire =
        await this.mandataireService.findOneOrFail(mandataireId);
      req.mandataire = mandataire;
    }
    next();
  }
}
