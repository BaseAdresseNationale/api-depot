import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { CustomRequest } from '@/lib/types/request.type';
import { ClientService } from './client.service';
import { Client } from './client.schema';

@Injectable()
export class ClientMiddleware implements NestMiddleware {
  constructor(private clientService: ClientService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { clientId } = req.params;
    if (clientId) {
      const client: Client = await this.clientService.findOneOrFail(clientId);
      req.client = client;
    }
    next();
  }
}
