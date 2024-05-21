import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { CustomRequest } from '@/lib/types/request.type';
import { ChefDeFile } from './chef_de_file.schema';
import { ChefDeFileService } from './chef_de_file.service';

@Injectable()
export class ChefDeFileMiddleware implements NestMiddleware {
  constructor(private chefDeFileService: ChefDeFileService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { chefDeFileId } = req.params;
    if (chefDeFileId) {
      const chefDeFile: ChefDeFile =
        await this.chefDeFileService.findOneOrFail(chefDeFileId);
      req.chefDeFile = chefDeFile;
    }
    next();
  }
}
